// app/worker/duty-in-progress.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack } from "expo-router";
import { CheckCircle, Clock3, MapPin } from "lucide-react-native";
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
    void fetchCurrentDuty(false);

    const statusInterval = setInterval(() => {
      void fetchCurrentDuty(true);
    }, 3000);

    return () => {
      clearInterval(statusInterval);
      clearMitraHoldTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openClientRating = (bookingId: number) => {
    if (isRedirectingRef.current) return;

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
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!dutyData) {
    return null;
  }

  const workAddress =
    dutyData.workLocationText ||
    dutyData.address?.mapAddress ||
    dutyData.address?.addressLine ||
    "Work Location";

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>On Duty</Text>
          </View>

          <Text style={styles.headerName}>
            {dutyData.customer?.name || "Customer"}
          </Text>

          <View style={styles.locationRow}>
            <MapPin color="#D1FAE5" size={18} />
            <Text style={styles.locationText}>{workAddress}</Text>
          </View>
        </View>

        <View style={styles.timerCard}>
          <View style={styles.timerIconWrap}>
            <Clock3 color="#10B981" size={34} />
          </View>
          <Text style={styles.timerLabel}>Time Elapsed</Text>
          <Text style={styles.timerText}>{formatTime(secondsElapsed)}</Text>
        </View>

        <View style={styles.footerActions}>
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
              <CheckCircle color="#fff" size={22} style={{ marginRight: 10 }} />
              <Text style={styles.completeBtnText}>Mark as Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  content: {
    flex: 1,
    padding: 18,
    paddingTop: 18,
  },
  headerCard: {
    backgroundColor: "#0B7A55",
    borderRadius: 28,
    padding: 20,
  },
  liveBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 7,
    marginBottom: 14,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  liveText: {
    color: "#047857",
    fontWeight: "900",
    fontSize: 12,
  },
  headerName: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 12,
  },
  locationText: {
    flex: 1,
    color: "#D1FAE5",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    marginLeft: 8,
  },
  timerCard: {
    marginTop: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingVertical: 34,
    paddingHorizontal: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  timerIconWrap: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  timerLabel: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  timerText: {
    color: "#111827",
    fontSize: 46,
    fontWeight: "900",
    marginTop: 6,
    fontVariant: ["tabular-nums"],
  },
  footerActions: {
    marginTop: "auto",
    paddingTop: 18,
  },
  mitraButton: {
    position: "relative",
    overflow: "hidden",
    minHeight: 72,
    borderRadius: 20,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    justifyContent: "center",
  },
  mitraButtonProgress: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: "#FECACA",
  },
  mitraButtonContent: {
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  mitraButtonText: {
    color: "#B91C1C",
    fontSize: 17,
    fontWeight: "900",
  },
  mitraButtonHint: {
    color: "#991B1B",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  completeBtn: {
    backgroundColor: "#111827",
    width: "100%",
    paddingVertical: 18,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  completeBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
});
