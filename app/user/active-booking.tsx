// app/user/active-booking.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack } from "expo-router";
import { CheckCircle2, Phone } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { API_URL } from "../../constants/api";

export default function ActiveBooking() {
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchActiveBooking();

    // Test ke liye: Har 5 second me auto-check karega
    const interval = setInterval(() => {
      fetchActiveBooking();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchActiveBooking = async () => {
    try {
      const session = await AsyncStorage.getItem("customerSession");
      if (session) {
        const parsedData = JSON.parse(session);
        const response = await axios.get(
          `${API_URL}/user/current-booking/${parsedData.id}`,
        );

        if (response.data.success) {
          setBooking(response.data.booking);
        } else {
          // Agar koi booking nahi hai toh wapas dashboard bhej do
          router.replace("/user/dashboard");
        }
      }
    } catch (error) {
      console.log("Error fetching booking", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteWork = async () => {
    try {
      console.log("Completing work for booking:", booking.id);
      const response = await axios.post(`${API_URL}/user/complete-booking`, {
        bookingId: booking.id,
      });

      if (response.data.success) {
        // Kaam khatam, Customer ko wapas dashboard bhej do
        router.replace("/user/dashboard");
      }
    } catch (error) {
      console.log("Error completing work", error);
    }
  };

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "bold",
            color: "#EF4444",
            marginBottom: 10,
          }}
        >
          Oops! Booking details nahi mili.
        </Text>
        <Text
          style={{ textAlign: "center", color: "#6B7280", marginBottom: 20 }}
        >
          Shayad payment verify hone mein time lag raha hai ya server connect
          nahi ho paya.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/user/dashboard")}
          style={{ backgroundColor: "#000", padding: 15, borderRadius: 10 }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>
            Dashboard par wapas jayen
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // QR Code ke andar ka data (Worker scan karke verify karega)
  const qrData = JSON.stringify({
    bookingId: booking.id,
    action: "VERIFY_ARRIVAL",
  });

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Tracking</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* SUCCESS BANNER */}
        <View style={styles.banner}>
          <CheckCircle2 color="#fff" size={32} />
          <View style={{ marginLeft: 15 }}>
            <Text style={styles.bannerTitle}>Booking Confirmed!</Text>
            <Text style={styles.bannerSub}>
              Workers are on their way to your location.
            </Text>
          </View>
        </View>

        {/* WORKER LIST */}
        <Text style={styles.sectionTitle}>
          Assigned Workers ({booking.workers.length})
        </Text>

        {/* Worker List ke andar Tick mark dikhane ke liye */}
        {booking.workers.map((worker: any) => {
          const arrivedList = JSON.parse(booking.arrivedWorkerIds || "[]");
          const hasArrived = arrivedList.includes(worker.id);

          return (
            <View key={worker.id} style={styles.workerCard}>
              <View style={styles.workerInfo}>
                <View style={styles.avatarPlaceholder}>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "bold",
                      color: "#9CA3AF",
                    }}
                  >
                    {worker.name ? worker.name.charAt(0).toUpperCase() : "W"}
                  </Text>
                </View>
                <View style={styles.workerTextGroup}>
                  <Text style={styles.workerName}>
                    {worker.name || "Worker"}
                  </Text>
                  <Text style={styles.workerRole}>
                    ⭐ Verified Professional
                  </Text>
                </View>
              </View>

              {/* Naya Logic: Tick Mark ya Call Button */}
              {hasArrived ? (
                <View
                  style={{
                    backgroundColor: "#10B981",
                    padding: 8,
                    borderRadius: 20,
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}
                  >
                    Arrived ✅
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => handleCall(worker.phone)}
                >
                  <Phone color="#fff" size={20} />
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* QR Code vs Complete Button Logic */}
        {booking.status === "IN_PROGRESS" ? (
          <View style={styles.completeCard}>
            <Text style={styles.qrTitle}>Work in Progress</Text>
            <Text style={styles.qrDesc}>
              All assigned workers have arrived and started their duty.
            </Text>

            {/* Puraana Code: onPress={() => console.log("Complete Work API call later")} */}

            <TouchableOpacity
              style={styles.completeWorkBtn}
              onPress={handleCompleteWork}
            >
              <Text style={styles.completeBtnText}>MARK WORK COMPLETE</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>Worker Verification</Text>
            <Text style={styles.qrDesc}>
              Show this QR code to the workers when they arrive at your location
              to start the duty.
            </Text>

            <View style={styles.qrWrapper}>
              <QRCode
                value={qrData}
                size={180}
                color="#000"
                backgroundColor="#fff"
              />
            </View>
            <Text style={styles.bookingIdText}>Booking ID: #{booking.id}</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  content: { padding: 20 },

  banner: {
    backgroundColor: "#10B981",
    padding: 20,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  bannerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  bannerSub: { color: "#ECFDF5", fontSize: 13, marginTop: 4, paddingRight: 20 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#374151",
    marginBottom: 15,
    textTransform: "uppercase",
  },

  workerCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  workerInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  workerTextGroup: { marginLeft: 15, flex: 1 },
  workerName: { fontSize: 16, fontWeight: "800", color: "#111827" },
  workerRole: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "600",
    marginTop: 2,
  },

  callBtn: {
    backgroundColor: "#000",
    width: 45,
    height: 45,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
  },

  qrCard: {
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 24,
    alignItems: "center",
    marginTop: 15,
    borderWidth: 2,
    borderColor: "#000",
    borderStyle: "dashed",
  },
  qrTitle: { fontSize: 20, fontWeight: "900", color: "#111827" },
  qrDesc: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: 14,
    marginVertical: 10,
    paddingHorizontal: 10,
  },
  qrWrapper: {
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginVertical: 15,
  },
  bookingIdText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#9CA3AF",
    letterSpacing: 1,
  },

  // NEW STYLES
  completeCard: {
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 24,
    alignItems: "center",
    marginTop: 15,
    borderWidth: 2,
    borderColor: "#10B981",
  },
  completeWorkBtn: {
    backgroundColor: "#10B981",
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginTop: 15,
    width: "100%",
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  completeBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 1,
  },
});
