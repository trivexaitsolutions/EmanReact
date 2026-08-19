// app/worker/booking-details.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack, useLocalSearchParams } from "expo-router";
import {
    Calendar,
    ChevronLeft,
    IndianRupee,
    MapPin,
    Phone,
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

export default function WorkerBookingDetails() {
  const { id } = useLocalSearchParams();

  const [booking, setBooking] = useState<any>(null);
  const [workerSession, setWorkerSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBookingDetails();
  }, [id]);

  const fetchBookingDetails = async () => {
    try {
      const session = await AsyncStorage.getItem("workerSession");

      if (!session) {
        router.replace("/");
        return;
      }

      const parsedWorker = JSON.parse(session);
      setWorkerSession(parsedWorker);

      if (!id) return;

      const response = await axios.get(
        `${API_URL}/worker/booking-details/${id}/${parsedWorker.id}`,
      );

      if (response.data.success) {
        setBooking(response.data.booking);
      }
    } catch (error) {
      console.log("Error fetching worker booking details", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (value: string) => {
    if (!value) return "--";

    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getAmount = () => {
    return booking?.workerShare || booking?.amount || booking?.totalAmount || 0;
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
      <Text style={{ textAlign: "center", marginTop: 50 }}>
        Booking not found
      </Text>
    );
  }

  const isClientRated = booking.isClientRated || false;
  const clientRating = booking.clientRating || null;
  const isCancelled = booking.status === "CANCELLED";
  const isCompleted = booking.status === "COMPLETED";

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace("/worker/history")}
          style={styles.backBtn}
        >
          <ChevronLeft color="#000" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job #{booking.id}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View
          style={[
            styles.statusBanner,
            {
              backgroundColor:
                isCompleted ? "#ECFDF5" : isCancelled ? "#FEF2F2" : "#FEF3C7",
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: isCompleted ? "#059669" : isCancelled ? "#DC2626" : "#D97706" },
            ]}
          >
            Status: {booking.status}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Job Summary</Text>

          <View style={styles.detailRow}>
            <Calendar color="#6B7280" size={20} />
            <View style={styles.detailTextGroup}>
              <Text style={styles.detailLabel}>Date & Time</Text>
              <Text style={styles.detailValue}>
                {formatDate(booking.createdAt)}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <MapPin color="#6B7280" size={20} />
            <View style={styles.detailTextGroup}>
              <Text style={styles.detailLabel}>Work Location</Text>
              <Text style={styles.detailValue}>
                {booking.workLocationText ||
                  booking.naka?.name ||
                  booking.nakaName ||
                  "Location confirmed by customer"}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <IndianRupee color="#6B7280" size={20} />
            <View style={styles.detailTextGroup}>
              <Text style={styles.detailLabel}>
                {isCancelled ? "Original Job Share" : "Your Earning"}
              </Text>
              <Text style={styles.detailValue}>₹{getAmount()}</Text>
            </View>
          </View>
        </View>

        {isCancelled && (
          <View style={styles.fineCard}>
            <View style={styles.fineTitleRow}>
              <Text style={styles.fineCardTitle}>Cancellation Fine</Text>
              <Text style={styles.fineAmount}>
                {booking.fineStatus === "PENDING"
                  ? "Pending"
                  : `₹${Number(booking.fineAmount || 0)}`}
              </Text>
            </View>

            {booking.fineStatus === "PENDING" ? (
              <Text style={styles.fineDescription}>
                Mitra ne fine amount abhi finalize nahi kiya hai.
              </Text>
            ) : (
              <Text style={styles.fineDescription}>
                Ye Mitra ke final conflict decision ke hisab se fine hai.
              </Text>
            )}

            {booking.cancellationReason ? (
              <Text style={styles.fineReason}>
                Reason: {booking.cancellationReason}
              </Text>
            ) : null}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Client Details</Text>

          <View style={styles.workerRow}>
            <View style={styles.avatar}>
              <User color="#10B981" size={20} />
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.workerName}>
                {booking.customer?.name || booking.customerName || "Client"}
              </Text>
              <Text style={styles.workerPhone}>
                {booking.customer?.phone ||
                  booking.customerPhone ||
                  "Phone not available"}
              </Text>
            </View>
          </View>

          {(booking.customer?.phone || booking.customerPhone) && (
            <View style={styles.phoneBox}>
              <Phone color="#059669" size={17} />
              <Text style={styles.phoneText}>
                {booking.customer?.phone || booking.customerPhone}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Assigned Workers</Text>

          <View style={styles.detailRow}>
            <User color="#6B7280" size={20} />
            <View style={styles.detailTextGroup}>
              <Text style={styles.detailLabel}>Worker Count</Text>
              <Text style={styles.detailValue}>
                {booking.workerCount || booking.workers?.length || 1} Worker(s)
              </Text>
            </View>
          </View>
        </View>

        {isCompleted && (
          <View style={styles.ratingSection}>
          {isClientRated ? (
            <>
              <Text style={styles.ratingMsg}>
                Aapne is client ko rating de di hai. Aap rating update bhi kar
                sakte ho.
              </Text>

              <View style={styles.oldRatingBox}>
                <Star color="#F59E0B" size={18} fill="#F59E0B" />
                <Text style={styles.oldRatingText}>
                  Current Rating: {clientRating?.rating || 5}/5
                </Text>
              </View>

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
                    pathname: "/worker/rate-client",
                    params: {
                      bookingId: booking.id,
                      edit: "true",
                    },
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
                  Update Client Rating
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.ratingMsg}>
                Client ke saath kaam kaisa raha? Rating dein.
              </Text>

              <TouchableOpacity
                style={styles.ratingBtn}
                onPress={() =>
                  router.push({
                    pathname: "/worker/rate-client",
                    params: { bookingId: booking.id },
                  })
                }
              >
                <Star color="#fff" size={20} />
                <Text style={[styles.ratingBtnText, { marginLeft: 8 }]}>
                  Rate Client
                </Text>
              </TouchableOpacity>
            </>
          )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

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

  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },

  content: {
    padding: 20,
    paddingBottom: 50,
  },

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

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  detailTextGroup: {
    marginLeft: 15,
  },

  detailLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },

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

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
  },

  workerName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  workerPhone: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  phoneBox: {
    marginTop: 10,
    backgroundColor: "#ECFDF5",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  phoneText: {
    color: "#059669",
    fontWeight: "800",
    marginLeft: 8,
  },

  fineCard: {
    backgroundColor: "#FEF2F2",
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  fineTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  fineCardTitle: {
    color: "#7F1D1D",
    fontSize: 16,
    fontWeight: "900",
  },

  fineAmount: {
    color: "#DC2626",
    fontSize: 22,
    fontWeight: "900",
  },

  fineDescription: {
    color: "#991B1B",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },

  fineReason: {
    marginTop: 8,
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },

  ratingSection: {
    marginTop: 10,
    alignItems: "center",
    paddingHorizontal: 10,
  },

  ratingMsg: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 15,
    fontWeight: "600",
    textAlign: "center",
  },

  oldRatingBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 14,
  },

  oldRatingText: {
    color: "#92400E",
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 7,
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
