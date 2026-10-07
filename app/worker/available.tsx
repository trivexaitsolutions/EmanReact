import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack } from "expo-router";
import { Clock3, Power, UsersRound } from "lucide-react-native";
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

        if (
          remainingSecondsRef.current === 0 &&
          !autoOfflineDoneRef.current
        ) {
          autoOfflineDoneRef.current = true;
          stopAvailability(true);
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

  if (isLoadingPool) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#087C49" />
        <Text style={styles.loaderText}>Loading pool status...</Text>
      </View>
    );
  }

  const workerFullName =
    workerSession?.name || workerSession?.fullName || "Worker";
  const firstName = String(workerFullName).trim().split(" ")[0] || "Worker";
  const { hours, minutes, secs } = formatElapsedTime(elapsedSeconds);
  const isHalfDay = poolInfo?.availabilityType === "SHORT_PERIOD";
  const availabilityTypeLabel = isHalfDay ? "Half Day" : "Full Day";
  const availabilityHours = Math.max(0, Number(poolInfo?.availabilityHours || 0));

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.topNav}>
        <View>
          <Text style={styles.navEyebrow}>WORKER</Text>
          <Text style={styles.navTitle}>Available</Text>
        </View>

        <View style={styles.poolBadge}>
          <View style={styles.poolDot} />
          <Text style={styles.poolBadgeText}>In Pool</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.banner}>
          <Text style={styles.bannerHello}>Hi {firstName}</Text>
          <Text style={styles.bannerTitle}>YOU ARE IN POOL</Text>
          <Text style={styles.bannerSub}>Stay ready for your next job</Text>
        </View>

        <View style={styles.availabilityCard}>
          <View>
            <Text style={styles.availabilityLabel}>AVAILABILITY TYPE</Text>
            <Text style={styles.availabilityValue}>{availabilityTypeLabel}</Text>
          </View>

          {isHalfDay && (
            <View style={styles.hoursBadge}>
              <Clock3 color="#087C49" size={18} strokeWidth={2.5} />
              <Text style={styles.hoursBadgeText}>
                {availabilityHours} {availabilityHours === 1 ? "Hour" : "Hours"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.timerCard}>
          <View style={styles.timerHeaderRow}>
            <View style={styles.timerIconWrap}>
              <UsersRound color="#087C49" size={24} strokeWidth={2.5} />
            </View>
            <View style={styles.timerHeaderText}>
              <Text style={styles.timerLabelTop}>POOL TIME</Text>
              <Text style={styles.timerHint}>Time since you became available</Text>
            </View>
          </View>

          <View style={styles.timerArea}>
            <Text
              adjustsFontSizeToFit
              numberOfLines={1}
              style={[styles.timerValue, isNarrow && styles.timerValueNarrow]}
            >
              {hours}:{minutes}:{secs}
            </Text>

            <View style={styles.timerUnits}>
              <Text style={styles.timerUnit}>HH</Text>
              <Text style={styles.timerDivider}>|</Text>
              <Text style={styles.timerUnit}>MM</Text>
              <Text style={styles.timerDivider}>|</Text>
              <Text style={styles.timerUnit}>SS</Text>
            </View>
          </View>

          <View style={styles.startedCard}>
            <View style={styles.startedIcon}>
              <Clock3 color="#087C49" size={18} strokeWidth={2.5} />
            </View>
            <View style={styles.startedTextWrap}>
              <Text style={styles.startedLabel}>Pool started</Text>
              <Text style={styles.startedValue}>
                {formatDisplayTime(poolInfo?.availabilityStart)}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          disabled={isStopping}
          onPress={handleStopAvailability}
          style={[styles.offlineButton, isStopping && styles.offlineButtonBusy]}
        >
          {isStopping ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <View style={styles.offlineButtonContent}>
              <Power color="#FFFFFF" size={22} strokeWidth={2.5} />
              <Text style={styles.offlineButtonText}>Go Offline</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F3F4F6",
    flex: 1,
  },
  loader: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    flex: 1,
    justifyContent: "center",
  },
  loaderText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
  },
  topNav: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 14,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  navEyebrow: {
    color: "#9CA3AF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  navTitle: {
    color: "#111827",
    fontSize: 21,
    fontWeight: "900",
  },
  poolBadge: {
    alignItems: "center",
    backgroundColor: "#EAF7F0",
    borderColor: "#B7E4CC",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  poolDot: {
    backgroundColor: "#087C49",
    borderRadius: 5,
    height: 10,
    marginRight: 7,
    width: 10,
  },
  poolBadgeText: {
    color: "#087C49",
    fontSize: 13,
    fontWeight: "800",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  banner: {
    alignItems: "center",
    backgroundColor: "#FFD23F",
    borderRadius: 18,
    marginBottom: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  bannerHello: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 3,
  },
  bannerTitle: {
    color: "#111827",
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  bannerSub: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  availabilityCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#D1FAE5",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    minHeight: 88,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  availabilityLabel: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  availabilityValue: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 3,
  },
  hoursBadge: {
    alignItems: "center",
    backgroundColor: "#EAF7F0",
    borderColor: "#B7E4CC",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  hoursBadgeText: {
    color: "#087C49",
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 7,
  },
  timerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    elevation: 2,
    padding: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  timerHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  timerIconWrap: {
    alignItems: "center",
    backgroundColor: "#EAF7F0",
    borderRadius: 14,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  timerHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  timerLabelTop: {
    color: "#087C49",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  timerHint: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  timerArea: {
    alignItems: "center",
    marginBottom: 20,
    marginTop: 24,
  },
  timerValue: {
    color: "#111827",
    fontSize: 58,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
    includeFontPadding: false,
    letterSpacing: -1.5,
  },
  timerValueNarrow: {
    fontSize: 48,
  },
  timerUnits: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 4,
  },
  timerUnit: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "800",
    minWidth: 30,
    textAlign: "center",
  },
  timerDivider: {
    color: "#D1D5DB",
    fontSize: 12,
    marginHorizontal: 10,
  },
  startedCard: {
    alignItems: "center",
    backgroundColor: "#EAF7F0",
    borderColor: "#B7E4CC",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  startedIcon: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  startedTextWrap: {
    marginLeft: 11,
  },
  startedLabel: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "700",
  },
  startedValue: {
    color: "#065F46",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 1,
  },
  offlineButton: {
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 16,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 58,
    paddingHorizontal: 18,
  },
  offlineButtonBusy: {
    opacity: 0.72,
  },
  offlineButtonContent: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  offlineButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    marginLeft: 10,
  },
});
