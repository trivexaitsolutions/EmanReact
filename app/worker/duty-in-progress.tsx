// app/worker/duty-in-progress.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack } from "expo-router";
import { CheckCircle, Clock, MapPin } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { API_URL } from "../../constants/api";

const ENABLE_WORKER_COMPLETE_DUTY = false;
const MITRA_HOLD_DURATION_MS = 3000;

export default function DutyInProgress() {
  const [dutyData, setDutyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isHoldingMitra, setIsHoldingMitra] = useState(false);
  const [mitraHoldProgress, setMitraHoldProgress] = useState(0);
  const [isConnectingMitra, setIsConnectingMitra] = useState(false);

  const bookingIdRef = useRef<number | null>(null);
  const isRedirectingRef = useRef(false);
  const isRequestRunningRef = useRef(false);
  const cancellationRequestedRef = useRef(false);
  const mitraHoldCompletedRef = useRef(false);
  const mitraHoldTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mitraHoldIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearMitraHoldTimers = () => {
    if (mitraHoldTimeoutRef.current) {
      clearTimeout(mitraHoldTimeoutRef.current);
      mitraHoldTimeoutRef.current = null;
    }

    if (mitraHoldIntervalRef.current) {
      clearInterval(mitraHoldIntervalRef.current);
      mitraHoldIntervalRef.current = null;
    }
  };

  useEffect(() => {
    fetchCurrentDuty(false);

    // Customer completion ko detect karne ke liye har 3 second status check.
    const statusInterval = setInterval(() => {
      fetchCurrentDuty(true);
    }, 3000);

    return () => {
      clearInterval(statusInterval);
      clearMitraHoldTimers();
    };
    // Screen lifetime poller; request guards prevent overlapping calls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openClientRating = (bookingId: number) => {
    if (isRedirectingRef.current) {
      return;
    }

    isRedirectingRef.current = true;

    router.replace({
      pathname: "/worker/rate-client",
      params: {
        bookingId: String(bookingId),
      },
    });
  };

  const checkCompletedBooking = async (bookingId: number) => {
    try {
      const response = await axios.get(`${API_URL}/user/booking/${bookingId}`);

      if (!response.data.success) {
        return;
      }

      const latestBooking = response.data.booking;

      if (latestBooking?.status === "COMPLETED") {
        openClientRating(bookingId);
      }
    } catch (error: any) {
      console.log(
        "Completed booking status check error:",
        error?.response?.data || error,
      );
    }
  };

  const fetchCurrentDuty = async (silent = false) => {
    if (
      isRequestRunningRef.current ||
      isRedirectingRef.current ||
      cancellationRequestedRef.current
    ) {
      return;
    }

    isRequestRunningRef.current = true;

    try {
      const session = await AsyncStorage.getItem("workerSession");

      if (!session) {
        if (!silent) {
          Alert.alert("Error", "Worker session missing hai.");
          router.replace("/worker/login");
        }
        return;
      }

      const parsedWorker = JSON.parse(session);

      const response = await axios.get(
        `${API_URL}/user/worker/current-duty/${parsedWorker.id}`,
      );

      if (response.data.success && response.data.duty) {
        const currentDuty = response.data.duty;

        bookingIdRef.current = Number(currentDuty.id);
        setDutyData(currentDuty);
        return;
      }

      /*
       * Customer ne booking COMPLETED kar di to current-duty API us booking ko
       * return nahi karegi, kyunki wo sirf ASSIGNED / IN_PROGRESS leti hai.
       * Isliye last known booking ko separately check karte hain.
       */
      if (bookingIdRef.current) {
        await checkCompletedBooking(bookingIdRef.current);
        return;
      }

      if (!silent) {
        router.replace("/worker/dashboard");
      }
    } catch (error: any) {
      console.log("Error fetching duty:", error?.response?.data || error);
    } finally {
      isRequestRunningRef.current = false;

      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  // Timer Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (dutyData?.updatedAt) {
      const startTime = new Date(dutyData.updatedAt).getTime();

      const updateTimer = () => {
        const now = Date.now();
        setSecondsElapsed(Math.max(0, Math.floor((now - startTime) / 1000)));
      };

      updateTimer();
      interval = setInterval(updateTimer, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [dutyData]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((totalSeconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");

    return `${h}:${m}:${s}`;
  };

  const handleCompleteDuty = () => {
    Alert.alert("Confirm", "Kya aapka kaam khatam ho gaya hai?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes, Complete Duty",
        onPress: async () => {
          try {
            if (!dutyData?.id) {
              Alert.alert("Error", "Booking ID missing hai.");
              return;
            }

            const session = await AsyncStorage.getItem("workerSession");

            if (!session) {
              Alert.alert("Error", "Worker session missing hai.");
              return;
            }

            const parsedWorker = JSON.parse(session);

            const response = await axios.post(
              `${API_URL}/user/worker/complete-duty`,
              {
                bookingId: dutyData.id,
                workerId: parsedWorker.id,
              },
            );

            if (response.data.success) {
              openClientRating(Number(dutyData.id));
            } else {
              Alert.alert(
                "Failed",
                response.data.message || "Duty complete nahi ho payi.",
              );
            }
          } catch (error: any) {
            console.log("Complete duty error:", error?.response?.data || error);
            Alert.alert(
              "Error",
              error?.response?.data?.message ||
                "Server error while completing duty.",
            );
          }
        },
      },
    ]);
  };

  const connectMitraAndCancelDuty = async () => {
    if (cancellationRequestedRef.current || isConnectingMitra) return;

    try {
      cancellationRequestedRef.current = true;
      setIsConnectingMitra(true);

      if (!dutyData?.id) {
        cancellationRequestedRef.current = false;
        Alert.alert("Error", "Booking ID missing hai.");
        return;
      }

      const session = await AsyncStorage.getItem("workerSession");
      if (!session) {
        cancellationRequestedRef.current = false;
        Alert.alert("Session Error", "Please login again.");
        return;
      }

      const parsedWorker = JSON.parse(session);
      const response = await axios.post(`${API_URL}/user/conflicts/create`, {
        bookingId: dutyData.id,
        workerId: parsedWorker.id,
        raisedBy: "WORKER",
        reason: "Worker requested Mitra assistance",
        description: "Direct request raised during an active duty.",
        continueWork: false,
        requestedAction: "CANCEL_DUTY",
      });

      if (!response.data.success) {
        cancellationRequestedRef.current = false;
        Alert.alert(
          "Failed",
          response.data.message || "Mitra request create nahi ho payi.",
        );
        return;
      }

      Alert.alert(
        "Mitra Connected",
        "Duty cancel ho gayi hai aur Mitra ko request bhej di gayi hai.",
        [
          {
            text: "OK",
            onPress: () => {
              if (isRedirectingRef.current) return;
              isRedirectingRef.current = true;
              router.replace("/worker/dashboard");
            },
          },
        ],
      );
    } catch (error: any) {
      cancellationRequestedRef.current = false;
      console.log("Worker Mitra Request Error:", error?.response?.data || error);
      Alert.alert(
        "Server Error",
        error?.response?.data?.message || "Mitra se connect nahi ho paya.",
      );
    } finally {
      setIsConnectingMitra(false);
      setIsHoldingMitra(false);
      setMitraHoldProgress(0);
      mitraHoldCompletedRef.current = false;
    }
  };

  const startMitraHold = () => {
    if (cancellationRequestedRef.current || isConnectingMitra || isHoldingMitra) {
      return;
    }

    clearMitraHoldTimers();
    mitraHoldCompletedRef.current = false;
    setIsHoldingMitra(true);
    setMitraHoldProgress(0);

    const holdStartedAt = Date.now();
    mitraHoldIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartedAt;
      setMitraHoldProgress(
        Math.min(100, (elapsed / MITRA_HOLD_DURATION_MS) * 100),
      );
    }, 50);

    mitraHoldTimeoutRef.current = setTimeout(() => {
      mitraHoldCompletedRef.current = true;
      clearMitraHoldTimers();
      setMitraHoldProgress(100);
      setIsHoldingMitra(false);
      void connectMitraAndCancelDuty();
    }, MITRA_HOLD_DURATION_MS);
  };

  const cancelMitraHold = () => {
    if (mitraHoldCompletedRef.current) return;

    clearMitraHoldTimers();
    setIsHoldingMitra(false);
    setMitraHoldProgress(0);
  };

  if (isLoading) {
    return <ActivityIndicator size="large" color="#000" style={{ flex: 1 }} />;
  }

  if (!dutyData) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>ON DUTY</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.customerName}>
          {dutyData.customer?.name || "Customer"}
        </Text>

        <View style={styles.row}>
          <MapPin color="#6B7280" size={16} />
          <Text style={styles.addressText}>
            {dutyData.naka?.name || "Work Location"}
          </Text>
        </View>

        <View style={styles.timerCard}>
          <Clock color="#10B981" size={40} style={{ marginBottom: 10 }} />
          <Text style={styles.timerLabel}>Time Elapsed</Text>
          <Text style={styles.timerText}>{formatTime(secondsElapsed)}</Text>
        </View>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          style={styles.mitraButton}
          activeOpacity={0.9}
          disabled={isConnectingMitra || cancellationRequestedRef.current}
          onPressIn={startMitraHold}
          onPressOut={cancelMitraHold}
        >
          <View
            pointerEvents="none"
            style={[
              styles.mitraButtonProgress,
              { width: `${mitraHoldProgress}%` as `${number}%` },
            ]}
          />
          <View style={styles.mitraButtonContent}>
            {isConnectingMitra ? (
              <ActivityIndicator color="#B91C1C" size="small" />
            ) : null}
            <Text style={styles.mitraButtonText}>Any issue, Connect Mitra</Text>
            <Text style={styles.mitraButtonHint}>
              {isConnectingMitra
                ? "Sending request..."
                : isHoldingMitra
                  ? "Keep holding..."
                  : "Hold for 3 seconds"}
            </Text>
          </View>
        </TouchableOpacity>

        {ENABLE_WORKER_COMPLETE_DUTY && (
          <TouchableOpacity
            style={styles.completeBtn}
            onPress={handleCompleteDuty}
          >
            <CheckCircle color="#fff" size={24} style={{ marginRight: 10 }} />
            <Text style={styles.completeBtnText}>MARK AS COMPLETE</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { padding: 20, paddingTop: 50, alignItems: "center" },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
    marginRight: 8,
  },
  liveText: { color: "#10B981", fontWeight: "900", letterSpacing: 1 },

  content: { flex: 1, padding: 20, alignItems: "center" },
  customerName: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 5,
  },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 40 },
  addressText: { fontSize: 16, color: "#6B7280", marginLeft: 5 },

  timerCard: {
    backgroundColor: "#fff",
    width: "100%",
    padding: 40,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  timerLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  timerText: {
    fontSize: 48,
    fontWeight: "900",
    color: "#111827",
    marginTop: 5,
    fontVariant: ["tabular-nums"],
  },

  mitraButton: {
    position: "relative",
    overflow: "hidden",
    width: "100%",
    minHeight: 68,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  mitraButtonProgress: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#FECACA",
  },
  mitraButtonContent: {
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  mitraButtonText: {
    color: "#B91C1C",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  mitraButtonHint: {
    color: "#991B1B",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },

  completeBtn: {
    backgroundColor: "#000",
    width: "100%",
    paddingVertical: 20,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  completeBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
