import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack } from "expo-router";
import {
  BriefcaseBusiness,
  CircleUserRound,
  Clock3,
  House,
  Power,
  UsersRound,
  Wallet,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { API_URL } from "../../constants/api";

export default function WorkerAvailable() {
  const { height } = useWindowDimensions();
  const isCompact = height < 1200;
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isStopping, setIsStopping] = useState(false);
  const [isLoadingPool, setIsLoadingPool] = useState(true);
  const [workerSession, setWorkerSession] = useState<any>(null);
  const [poolInfo, setPoolInfo] = useState<any>(null);

  const autoOfflineDoneRef = useRef(false);
  const dutyCheckInProgressRef = useRef(false);
  const dutyOpenedRef = useRef(false);

  useEffect(() => {
    loadInitialData();

    const timer = setInterval(() => {
      setRemainingSeconds((previous) => {
        if (previous === null) return previous;

        if (previous <= 1) {
          if (!autoOfflineDoneRef.current) {
            autoOfflineDoneRef.current = true;
            stopAvailability(true);
          }
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    const dutyPoller = setInterval(async () => {
      try {
        if (dutyOpenedRef.current) return;

        const session = await AsyncStorage.getItem("workerSession");
        if (!session) return;

        const parsedSession = JSON.parse(session);
        await checkForAssignedDuty(Number(parsedSession.id));
      } catch (error) {
        console.log("Automatic duty poll error:", error);
      }
    }, 3000);

    return () => {
      clearInterval(timer);
      clearInterval(dutyPoller);
    };
    // The pool session should be initialized only once when this screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadInitialData = async () => {
    try {
      const session = await AsyncStorage.getItem("workerSession");
      if (!session) {
        router.replace("/");
        return;
      }

      const parsedSession = JSON.parse(session);
      setWorkerSession(parsedSession);

      const dutyFound = await checkForAssignedDuty(Number(parsedSession.id));
      if (!dutyFound) {
        await loadPoolStatus(parsedSession.id);
      }
    } catch (error) {
      console.log("Initial data load error:", error);
      Alert.alert("Error", "Pool data load nahi ho paya.");
    } finally {
      setIsLoadingPool(false);
    }
  };

  const loadPoolStatus = async (workerId: number) => {
    try {
      const response = await axios.get(
        `${API_URL}/worker/pool-status/${workerId}`,
      );

      if (response.data.success && response.data.isAvailable) {
        setPoolInfo(response.data);
        setRemainingSeconds(response.data.remainingSeconds || 0);
        return;
      }

      Alert.alert(
        "Pool Ended",
        response.data.message || "Aap currently available nahi ho.",
      );
      router.replace("/worker/dashboard");
    } catch (error: any) {
      console.log("Pool status error:", error);
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Pool status fetch nahi ho paya.",
      );
      router.replace("/worker/dashboard");
    }
  };

  const checkForAssignedDuty = async (workerId: number): Promise<boolean> => {
    if (dutyOpenedRef.current || dutyCheckInProgressRef.current) {
      return dutyOpenedRef.current;
    }

    try {
      dutyCheckInProgressRef.current = true;
      const response = await axios.get(
        `${API_URL}/user/worker/current-duty/${workerId}`,
      );

      if (response.data.success && response.data.duty) {
        dutyOpenedRef.current = true;
        router.replace("/worker/active-duty");
        return true;
      }

      return false;
    } catch (error: any) {
      console.log(
        "Duty check error:",
        error?.response?.data || error?.message || error,
      );
      return false;
    } finally {
      dutyCheckInProgressRef.current = false;
    }
  };

  const stopAvailability = async (isAutoOffline = false) => {
    try {
      setIsStopping(true);
      const session = await AsyncStorage.getItem("workerSession");

      if (!session) {
        router.replace("/worker/dashboard");
        return;
      }

      const parsedData = JSON.parse(session);
      await axios.post(`${API_URL}/worker/update-status`, {
        workerId: parsedData.id,
        status: false,
      });

      Alert.alert(
        isAutoOffline ? "Pool Ended" : "Offline",
        isAutoOffline
          ? "Aaj ka pool time khatam ho gaya. Aap automatically offline ho gaye ho."
          : "Aap ab available pool se bahar ho.",
      );
      router.replace("/worker/dashboard");
    } catch (error) {
      console.log("Stop availability error:", error);
      Alert.alert("Error", "Status update nahi ho paya.");
    } finally {
      setIsStopping(false);
    }
  };

  const handleStopAvailability = () => {
    Alert.alert("Go Offline?", "Aap pool se bahar nikalna chahte ho?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Go Offline",
        style: "destructive",
        onPress: () => stopAvailability(false),
      },
    ]);
  };

  const formatRemainingTime = (seconds: number | null) => {
    const safeSeconds = Math.max(0, seconds || 0);
    const hours = String(Math.floor(safeSeconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((safeSeconds % 3600) / 60)).padStart(2, "0");
    const secs = String(safeSeconds % 60).padStart(2, "0");
    return { hours, minutes, secs };
  };

  const formatDisplayTime = (dateValue?: string) => {
    if (!dateValue) return "--";

    return new Date(dateValue).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (isLoadingPool) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#009A56" />
        <Text style={styles.loaderText}>Loading pool status...</Text>
      </View>
    );
  }

  const firstName =
    workerSession?.name?.split(" ")[0] ||
    workerSession?.fullName?.split(" ")[0] ||
    "Worker";
  const displayDate = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    weekday: "long",
  }).format(new Date());
  const { hours, minutes, secs } = formatRemainingTime(remainingSeconds);
  const showsHours = hours !== "00";
  const timerValue = showsHours ? `${hours}:${minutes}` : `${minutes}:${secs}`;
  const timerUnits = showsHours ? "HH                 MM" : "MM                 SS";

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.content}>
        <View style={styles.greetingBlock}>
          <Text style={[styles.greeting, isCompact && styles.greetingCompact]}>
            Good Morning,
          </Text>
          <View style={styles.nameStatusRow}>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              numberOfLines={1}
              style={[styles.workerName, isCompact && styles.workerNameCompact]}
            >
              {firstName}
            </Text>
            <View style={styles.poolBadge}>
              <View style={styles.poolDot} />
              <Text style={styles.poolBadgeText}>In Pool</Text>
            </View>
          </View>
          <Text style={styles.dateText}>{displayDate}</Text>
        </View>

        <View style={[styles.timerCard, isCompact && styles.timerCardCompact]}>
          <View style={styles.timerGlowLarge} />
          <View style={styles.timerGlowSmall} />

          <View style={[styles.peopleIcon, isCompact && styles.peopleIconCompact]}>
            <UsersRound color="#008A4B" size={isCompact ? 31 : 38} strokeWidth={2.1} />
          </View>
          <Text style={[styles.timerTitle, isCompact && styles.timerTitleCompact]}>
            Time Pass
          </Text>
          <Text style={[styles.timerValue, isCompact && styles.timerValueCompact]}>
            {timerValue}
          </Text>
          <Text style={[styles.timerUnits, isCompact && styles.timerUnitsCompact]}>
            {timerUnits}
          </Text>

          <View style={[styles.poolStarted, isCompact && styles.poolStartedCompact]}>
            <View style={styles.poolStartedIcon}>
              <Clock3 color="#009A56" size={isCompact ? 21 : 25} />
            </View>
            <Text style={[styles.poolStartedText, isCompact && styles.poolStartedTextCompact]}>
              Pool started at {formatDisplayTime(poolInfo?.availabilityStart)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          disabled={isStopping}
          onPress={handleStopAvailability}
          style={[styles.offlineButton, isCompact && styles.offlineButtonCompact]}
        >
          {isStopping ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Power color="#FFFFFF" size={isCompact ? 27 : 31} strokeWidth={2.1} />
              <Text style={[styles.offlineButtonText, isCompact && styles.offlineButtonTextCompact]}>
                Go Offline
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.bottomNavigation}>
        <BottomNavItem active icon={<House color="#009A56" size={25} />} label="Home" />
        <BottomNavItem
          icon={<BriefcaseBusiness color="#5B6472" size={25} />}
          label="Bookings"
          onPress={() => router.push("/worker/history")}
        />
        <BottomNavItem icon={<Wallet color="#5B6472" size={25} />} label="Earnings" />
        <BottomNavItem icon={<CircleUserRound color="#5B6472" size={25} />} label="Profile" />
      </View>
    </SafeAreaView>
  );
}

function BottomNavItem({
  active = false,
  icon,
  label,
  onPress,
}: {
  active?: boolean;
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.8 : 1}
      onPress={onPress}
      style={styles.bottomNavItem}
    >
      {icon}
      <Text style={[styles.bottomNavLabel, active && styles.bottomNavLabelActive]}>
        {label}
      </Text>
      {active ? <View style={styles.activeIndicator} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    flex: 1,
  },
  loader: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    flex: 1,
    justifyContent: "center",
  },
  loaderText: {
    color: "#657080",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: 12,
    paddingHorizontal: 22,
    paddingTop: 28,
  },
  greetingBlock: {
    paddingTop: 2,
  },
  greeting: {
    color: "#111B2B",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: 37,
  },
  greetingCompact: {
    fontSize: 25,
    lineHeight: 30,
  },
  nameStatusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
  },
  workerName: {
    color: "#008D4E",
    flex: 1,
    fontSize: 43,
    fontWeight: "900",
    letterSpacing: -1.5,
    lineHeight: 51,
  },
  workerNameCompact: {
    fontSize: 33,
    letterSpacing: -1.1,
    lineHeight: 39,
  },
  poolBadge: {
    alignItems: "center",
    backgroundColor: "#E8F8EC",
    borderColor: "#91D8A8",
    borderRadius: 21,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  poolDot: {
    backgroundColor: "#009A56",
    borderRadius: 7,
    height: 14,
    marginRight: 8,
    width: 14,
  },
  poolBadgeText: {
    color: "#008A4B",
    fontSize: 16,
    fontWeight: "800",
  },
  dateText: {
    color: "#6A7381",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 5,
  },
  timerCard: {
    alignItems: "center",
    backgroundColor: "#008D4E",
    borderRadius: 24,
    height: 345,
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 22,
  },
  timerCardCompact: {
    borderRadius: 20,
    height: 270,
    paddingHorizontal: 16,
  },
  timerGlowLarge: {
    backgroundColor: "rgba(2, 103, 56, 0.48)",
    borderRadius: 210,
    bottom: -190,
    height: 410,
    position: "absolute",
    right: -120,
    width: 410,
  },
  timerGlowSmall: {
    backgroundColor: "rgba(112, 225, 159, 0.13)",
    borderRadius: 165,
    height: 330,
    left: -190,
    position: "absolute",
    top: -210,
    width: 330,
  },
  peopleIcon: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(174, 250, 203, 0.48)",
    borderRadius: 39,
    borderWidth: 8,
    height: 78,
    justifyContent: "center",
    width: 78,
  },
  peopleIconCompact: {
    borderRadius: 31,
    borderWidth: 6,
    height: 62,
    width: 62,
  },
  timerTitle: {
    color: "#FFFFFF",
    fontSize: 31,
    fontWeight: "800",
    marginTop: 11,
  },
  timerTitleCompact: {
    fontSize: 24,
    marginTop: 7,
  },
  timerValue: {
    color: "#FFFFFF",
    fontSize: 112,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
    letterSpacing: -4,
    lineHeight: 127,
    marginTop: 1,
  },
  timerValueCompact: {
    fontSize: 80,
    letterSpacing: -3,
    lineHeight: 91,
  },
  timerUnits: {
    color: "#A7E5C0",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 1.8,
    marginTop: -4,
  },
  timerUnitsCompact: {
    fontSize: 12,
    letterSpacing: 1.2,
    marginTop: -3,
  },
  poolStarted: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    bottom: 24,
    flexDirection: "row",
    left: 22,
    paddingHorizontal: 18,
    paddingVertical: 13,
    position: "absolute",
    right: 22,
  },
  poolStartedCompact: {
    borderRadius: 13,
    bottom: 15,
    left: 16,
    paddingHorizontal: 13,
    paddingVertical: 9,
    right: 16,
  },
  poolStartedIcon: {
    alignItems: "center",
    backgroundColor: "#E7F8ED",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    marginRight: 12,
    width: 44,
  },
  poolStartedText: {
    color: "#135A35",
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
  },
  poolStartedTextCompact: {
    fontSize: 13,
  },
  offlineButton: {
    alignItems: "center",
    backgroundColor: "#078C4E",
    borderRadius: 18,
    flexDirection: "row",
    height: 77,
    justifyContent: "center",
    shadowColor: "#0B5B36",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  offlineButtonCompact: {
    borderRadius: 15,
    height: 61,
  },
  offlineButtonText: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
    marginLeft: 17,
  },
  offlineButtonTextCompact: {
    fontSize: 20,
    marginLeft: 12,
  },
  bottomNavigation: {
    backgroundColor: "#FFFFFF",
    borderColor: "#EDF0EF",
    borderRadius: 25,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 4,
    marginHorizontal: 9,
    paddingBottom: 5,
    paddingTop: 8,
    shadowColor: "#243144",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 11,
    elevation: 5,
  },
  bottomNavItem: {
    alignItems: "center",
    flex: 1,
    minHeight: 50,
  },
  bottomNavLabel: {
    color: "#5B6472",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
  bottomNavLabelActive: {
    color: "#009A56",
    fontWeight: "800",
  },
  activeIndicator: {
    backgroundColor: "#009A56",
    borderRadius: 5,
    bottom: -5,
    height: 4,
    position: "absolute",
    width: 46,
  },
});
