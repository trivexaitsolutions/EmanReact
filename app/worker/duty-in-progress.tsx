// app/worker/duty-in-progress.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack } from "expo-router";
import { CheckCircle, Clock, MapPin } from "lucide-react-native";
import React, { useEffect, useState } from "react";
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

export default function DutyInProgress() {
  const [dutyData, setDutyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    fetchCurrentDuty();
  }, []);

  const fetchCurrentDuty = async () => {
    try {
      const session = await AsyncStorage.getItem("workerSession");
      if (session) {
        const parsedWorker = JSON.parse(session);
        const response = await axios.get(
          `${API_URL}/user/worker/current-duty/${parsedWorker.id}`,
        );

        // Check kijiye ki status IN_PROGRESS hai ya nahi
        if (response.data.success) {
          setDutyData(response.data.duty);
        } else {
          // Agar 404 ya koi data nahi mila, tabhi dashboard bhejien
          console.log("No duty found, staying put for a moment...");
          router.replace("/worker/dashboard"); // Isko filhaal comment kar dijiye testing ke liye
        }
      }
    } catch (error) {
      console.log("Error fetching duty", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Timer Logic
  useEffect(() => {
    let interval: any;
    if (dutyData && dutyData.updatedAt) {
      const startTime = new Date(dutyData.updatedAt).getTime();

      interval = setInterval(() => {
        const now = new Date().getTime();
        setSecondsElapsed(Math.floor((now - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [dutyData]);

  // Format Time to HH:MM:SS
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
              Alert.alert("Duty Completed", "Please rate the client.", [
                {
                  text: "Rate Client",
                  onPress: () =>
                    router.replace({
                      pathname: "/worker/rate-client",
                      params: {
                        bookingId: String(dutyData.id),
                      },
                    }),
                },
              ]);
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

  if (isLoading)
    return <ActivityIndicator size="large" color="#000" style={{ flex: 1 }} />;
  if (!dutyData) return null;

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

        {/* TIMER CARD */}
        <View style={styles.timerCard}>
          <Clock color="#10B981" size={40} style={{ marginBottom: 10 }} />
          <Text style={styles.timerLabel}>Time Elapsed</Text>
          <Text style={styles.timerText}>{formatTime(secondsElapsed)}</Text>
        </View>

        <View style={{ flex: 1 }} />

        {/* COMPLETE DUTY BUTTON */}
        <TouchableOpacity
          style={styles.completeBtn}
          onPress={handleCompleteDuty}
        >
          <CheckCircle color="#fff" size={24} style={{ marginRight: 10 }} />
          <Text style={styles.completeBtnText}>MARK AS COMPLETE</Text>
        </TouchableOpacity>
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

  completeBtn: {
    backgroundColor: "#000",
    width: "100%",
    paddingVertical: 20,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  completeBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
