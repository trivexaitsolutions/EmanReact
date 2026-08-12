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
  const { width } = useWindowDimensions();
  const isNarrow = width < 375;
  const remainingSecondsRef = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number | null>(null);
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
      setElapsedSeconds((previous) =>
        previous === null ? previous : previous + 1,
      );

      if (remainingSecondsRef.current !== null) {
        remainingSecondsRef.current = Math.max(
          0,
          remainingSecondsRef.current - 1,
        );

        if (remainingSecondsRef.current === 0) {
          if (!autoOfflineDoneRef.current) {
            autoOfflineDoneRef.current = true;
            stopAvailability(true);
          }
        }
      }
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
        remainingSecondsRef.current = response.data.remainingSeconds || 0;
        setElapsedSeconds(
          Number.isFinite(Number(response.data.elapsedSeconds))
            ? Math.max(0, Number(response.data.elapsedSeconds))
            : Math.max(
                0,
                Math.floor(
                  (Date.now() -
                    new Date(response.data.availabilityStart).getTime()) /
                    1000,
                ),
              ),
        );
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

  const formatElapsedTime = (seconds: number | null) => {
    const safeSeconds = Math.max(0, seconds || 0);
    const hours = String(Math.floor(safeSeconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((safeSeconds % 3600) / 60)).padStart(
      2,
      "0",
    );
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

  const getFormattedDate = () => {
    const date = new Date();
    const dateOptions: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    const dayOptions: Intl.DateTimeFormatOptions = { weekday: "long" };

    const dateString = date.toLocaleDateString("en-US", dateOptions);
    const dayString = date.toLocaleDateString("en-US", dayOptions);
    return `${dateString} • ${dayString}`;
  };

  if (isLoadingPool) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#187A46" />
        <Text style={styles.loaderText}>Loading pool status...</Text>
      </View>
    );
  }

  const workerFullName =
    workerSession?.name || workerSession?.fullName || "Worker";
  const { hours, minutes, secs } = formatElapsedTime(elapsedSeconds);
  const displayDate = getFormattedDate();

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.content}>
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <View style={styles.headerRow}>
            <View style={styles.headerTextGroup}>
              <Text style={styles.greeting}>Good Morning,</Text>
              <Text
                adjustsFontSizeToFit
                numberOfLines={1}
                style={[
                  styles.workerName,
                  isNarrow && styles.workerNameCompact,
                ]}
              >
                {workerFullName}
              </Text>
            </View>
            <View style={styles.poolBadge}>
              <View style={styles.poolDot} />
              <Text style={styles.poolBadgeText}>In Pool</Text>
            </View>
          </View>
          <Text style={styles.dateText}>{displayDate}</Text>
        </View>

        {/* Timer Card Section */}
        <View style={styles.timerCard}>
          <View style={styles.iconOuter}>
            <View style={styles.iconInner}>
              <UsersRound color="#187A46" size={32} strokeWidth={2.5} />
            </View>
          </View>

          <Text style={styles.timerTitle}>Time Pass</Text>

          <View style={styles.timerWrapper}>
            <Text
              style={[
                styles.timerNumberText,
                isNarrow && styles.timerNumberTextNarrow,
              ]}
            >
              {hours !== "00"
                ? `${hours}:${minutes}:${secs}`
                : `${minutes}:${secs}`}
            </Text>

            <View style={styles.timerLabelsRow}>
              {hours !== "00" && (
                <>
                  <Text style={styles.timerLabel}>HH</Text>
                  <Text style={styles.timerLabelDivider}>|</Text>
                </>
              )}
              <Text style={styles.timerLabel}>MM</Text>
              <Text style={styles.timerLabelDivider}>|</Text>
              <Text style={styles.timerLabel}>SS</Text>
            </View>
          </View>

          <View style={styles.poolStarted}>
            <Clock3 color="#187A46" size={20} strokeWidth={2.5} />
            <Text style={styles.poolStartedText}>
              Pool started at {formatDisplayTime(poolInfo?.availabilityStart)}
            </Text>
          </View>
        </View>

        {/* Offline Button */}
        <TouchableOpacity
          activeOpacity={0.88}
          disabled={isStopping}
          onPress={handleStopAvailability}
          style={styles.offlineButton}
        >
          {isStopping ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Power color="#FFFFFF" size={24} strokeWidth={2.5} />
              <Text style={styles.offlineButtonText}>Go Offline</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <BottomNavItem
          active
          icon={<House color="#187A46" size={26} strokeWidth={2.5} />}
          label="Home"
        />
        <BottomNavItem
          icon={<BriefcaseBusiness color="#6B7280" size={26} strokeWidth={2} />}
          label="Bookings"
          onPress={() => router.push("/worker/history")}
        />
        <BottomNavItem
          icon={<Wallet color="#6B7280" size={26} strokeWidth={2} />}
          label="Earnings"
        />
        <BottomNavItem
          icon={<CircleUserRound color="#6B7280" size={26} strokeWidth={2} />}
          label="Profile"
        />
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
      style={[styles.bottomNavItem, active && styles.bottomNavItemActive]}
    >
      {icon}
      <Text
        style={[styles.bottomNavLabel, active && styles.bottomNavLabelActive]}
      >
        {label}
      </Text>
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
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Header Styles
  headerContainer: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTextGroup: {
    flex: 1,
    paddingRight: 15,
  },
  greeting: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  workerName: {
    color: "#187A46",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  workerNameCompact: {
    fontSize: 28,
  },
  dateText: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "500",
    marginTop: 8,
  },
  poolBadge: {
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    borderColor: "#A5D6B8",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  poolDot: {
    backgroundColor: "#187A46",
    borderRadius: 6,
    height: 10,
    marginRight: 6,
    width: 10,
  },
  poolBadgeText: {
    color: "#187A46",
    fontSize: 13,
    fontWeight: "700",
  },

  // Timer Card Styles
  timerCard: {
    alignItems: "center",
    backgroundColor: "#187A46",
    borderRadius: 24,
    padding: 24,
    width: "100%",
  },
  iconOuter: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 50,
    padding: 8,
  },
  iconInner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 50,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  timerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "600",
    marginTop: 16,
  },
  timerWrapper: {
    alignItems: "center",
    marginVertical: 20,
  },
  timerNumberText: {
    color: "#FFFFFF",
    fontSize: 78,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    letterSpacing: -1.5,
    includeFontPadding: false,
  },
  timerNumberTextNarrow: {
    fontSize: 62,
  },
  timerLabelsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -5,
  },
  timerLabel: {
    color: "#A5D6B8",
    fontSize: 16,
    fontWeight: "600",
    width: 45,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  timerLabelDivider: {
    color: "#A5D6B8",
    fontSize: 16,
    marginHorizontal: 15,
  },
  poolStarted: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 18,
    width: "100%",
    marginTop: 10,
  },
  poolStartedText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 10,
  },

  // Offline Button Styles
  offlineButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#187A46",
    borderRadius: 16,
    paddingVertical: 18,
    marginTop: 24,
  },
  offlineButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 12,
  },

  // Bottom Navigation Styles
  bottomNavigation: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    paddingBottom: 25,
    paddingTop: 15,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  bottomNavItem: {
    alignItems: "center",
    flex: 1,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bottomNavItemActive: {
    backgroundColor: "#E8F5E9",
  },
  bottomNavLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  bottomNavLabelActive: {
    color: "#187A46",
    fontWeight: "700",
  },
});
