// app/user/booking-details.tsx
import axios from "axios";
import { router, Stack, useLocalSearchParams } from "expo-router";
import {
    Calendar,
    ChevronLeft,
    IndianRupee,
    MapPin,
    Star,
    User,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { API_URL } from "../../constants/api";

export default function BookingDetails() {
  const { id } = useLocalSearchParams(); // History page se jo ID aayi hai
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchBookingDetails();
    }
  }, [id]);

  const fetchBookingDetails = async () => {
    try {
      // Backend me ek nayi API banani hogi jo ID se single booking laaye
      const response = await axios.get(`${API_URL}/user/booking/${id}`);
      if (response.data.success) {
        setBooking(response.data.booking);
      }
    } catch (error) {
      console.log("Error fetching booking details", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!booking)
    return (
      <Text style={{ textAlign: "center", marginTop: 50 }}>
        Booking not found
      </Text>
    );

  // Check if rating is already given (Backend se isRated aayega, ya rating check karenge)
  // Abhi ke liye hum assume kar rahe hain ki backend `isRated` boolean bhej raha hai
  const isRated = booking.isRated || false;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color="#000" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking #{booking.id}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* STATUS BANNER */}
        <View
          style={[
            styles.statusBanner,
            {
              backgroundColor:
                booking.status === "COMPLETED" ? "#ECFDF5" : "#FEF3C7",
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: booking.status === "COMPLETED" ? "#059669" : "#D97706" },
            ]}
          >
            Status: {booking.status}
          </Text>
        </View>

        {/* BASIC DETAILS CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Job Summary</Text>

          <View style={styles.detailRow}>
            <Calendar color="#6B7280" size={20} />
            <View style={styles.detailTextGroup}>
              <Text style={styles.detailLabel}>Date & Time</Text>
              <Text style={styles.detailValue}>
                {new Date(booking.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <MapPin color="#6B7280" size={20} />
            <View style={styles.detailTextGroup}>
              <Text style={styles.detailLabel}>Source Naka</Text>
              <Text style={styles.detailValue}>
                {booking.naka?.name || "General Naka"}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <IndianRupee color="#6B7280" size={20} />
            <View style={styles.detailTextGroup}>
              <Text style={styles.detailLabel}>Total Paid</Text>
              <Text style={styles.detailValue}>₹{booking.totalAmount}</Text>
            </View>
          </View>
        </View>

        {/* WORKERS LIST CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Workers on Duty ({booking.workers?.length || 0})
          </Text>

          {booking.workers?.map((worker: any, index: number) => (
            <View
              key={worker.id}
              style={[
                styles.workerRow,
                index !== booking.workers.length - 1 && styles.borderBottom,
              ]}
            >
              <View style={styles.avatar}>
                <User color="#10B981" size={20} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.workerName}>
                  {worker.name || "Verified Worker"}
                </Text>
                <Text style={styles.workerPhone}>{worker.phone}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* RATING SECTION (The Magic Button) */}
        <View style={styles.ratingSection}>
          {isRated ? (
            <>
              <Text style={styles.ratingMsg}>
                Aapne is duty ke liye rating de di hai. 🙏
              </Text>
              <TouchableOpacity
                style={[
                  styles.ratingBtn,
                  {
                    backgroundColor: "#F3F4F6",
                    borderWidth: 1,
                    borderColor: "#D1D5DB",
                  },
                ]}
                onPress={() =>
                  router.push({
                    pathname: "/user/rating",
                    params: { bookingId: booking.id, edit: "true" },
                  })
                }
              >
                <Star color="#F59E0B" size={20} fill="#F59E0B" />
                <Text
                  style={[
                    styles.ratingBtnText,
                    { color: "#374151", marginLeft: 8 },
                  ]}
                >
                  Edit Your Rating
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.ratingMsg}>
                Workers ki mehnat ko star dein!
              </Text>
              <TouchableOpacity
                style={styles.ratingBtn}
                onPress={() =>
                  router.push({
                    pathname: "/user/rating",
                    params: { bookingId: booking.id },
                  })
                }
              >
                <Star color="#fff" size={20} />
                <Text style={[styles.ratingBtnText, { marginLeft: 8 }]}>
                  Give Rating
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#111827" },

  content: { padding: 20, paddingBottom: 50 },

  statusBanner: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: "center",
  },
  statusText: {
    fontWeight: "800",
    textTransform: "uppercase",
    fontSize: 14,
    letterSpacing: 1,
  },

  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 15,
    textTransform: "uppercase",
  },

  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  detailTextGroup: { marginLeft: 15 },
  detailLabel: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  detailValue: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "800",
    marginTop: 2,
  },

  workerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  borderBottom: { borderBottomWidth: 1, borderColor: "#F3F4F6" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
  },
  workerName: { fontSize: 15, fontWeight: "800", color: "#111827" },
  workerPhone: { fontSize: 12, color: "#6B7280", marginTop: 2 },

  ratingSection: { marginTop: 10, alignItems: "center", paddingHorizontal: 10 },
  ratingMsg: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  ratingBtn: {
    flexDirection: "row",
    backgroundColor: "#10B981",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  ratingBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 1,
  },
});
