// app/worker/duty-in-progress.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack } from "expo-router";
import { CheckCircle, Clock3, MapPin, PhoneCall } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { API_URL } from "../../constants/api";

const ENABLE_WORKER_COMPLETE_DUTY = false;

export default function DutyInProgress() {
  const [dutyData, setDutyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isCallingMitra, setIsCallingMitra] = useState(false);

  const bookingIdRef = useRef<number | null>(null);
  const isRedirectingRef = useRef(false);
  const isRequestRunningRef = useRef(false);

  useEffect(() => {
    void fetchCurrentDuty(false);

    const statusInterval = setInterval(() => {
      void fetchCurrentDuty(true);
    }, 3000);

    return () => {
      clearInterval(statusInterval);
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
    if (isRequestRunningRef.current || isRedirectingRef.current) {
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

      if (response.data.completed && response.data.bookingId) {
        openClientRating(Number(response.data.bookingId));
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

  const callAssignedMitra = async () => {
    if (isCallingMitra) return;

    try {
      setIsCallingMitra(true);

      const session = await AsyncStorage.getItem("workerSession");
      if (!session) {
        Alert.alert("Error", "Worker session missing hai.");
        return;
      }

      const parsedWorker = JSON.parse(session);
      const workerId = Number(parsedWorker?.id || 0);

      if (!workerId) {
        Alert.alert("Error", "Worker session missing hai.");
        return;
      }

      const response = await axios.get(`${API_URL}/worker/profile/${workerId}`);
      const phone = response.data?.worker?.mitra?.phone;

      if (!response.data?.success || !phone) {
        Alert.alert("Mitra Not Found", "Assigned Mitra ka mobile number available nahi hai.");
        return;
      }

      const dialNumber = String(phone).replace(/[^\d+]/g, "");
      const dialUrl = `tel:${dialNumber}`;
      await Linking.openURL(dialUrl);
    } catch (error: any) {
      console.log("Call Mitra error:", error?.response?.data || error);
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Mitra ka number load nahi ho paya.",
      );
    } finally {
      setIsCallingMitra(false);
    }
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
            style={styles.callButton}
            activeOpacity={0.85}
            disabled={isCallingMitra}
            onPress={callAssignedMitra}
          >
            <View style={styles.callIconWrap}>
              {isCallingMitra ? (
                <ActivityIndicator color="#047857" size="small" />
              ) : (
                <PhoneCall color="#047857" size={25} />
              )}
            </View>
            <View style={styles.callTextWrap}>
              <Text style={styles.callTitle}>Call Mitra</Text>
              <Text style={styles.callSub}>Need help? Tap to call</Text>
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
  callButton: {
    minHeight: 78,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  callIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  callTextWrap: {
    flex: 1,
  },
  callTitle: {
    color: "#111827",
    fontSize: 19,
    fontWeight: "900",
  },
  callSub: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
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
