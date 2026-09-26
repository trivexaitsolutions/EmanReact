// app/user/rating.tsx
import { CommonActions } from "@react-navigation/native";
import axios from "axios";
import {
  router,
  Stack,
  useLocalSearchParams,
  useNavigation,
} from "expo-router";
import { ChevronLeft, Star, User } from "lucide-react-native";
import React, { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { API_URL } from "../../constants/api";

// Reusable Star Component
const StarRating = ({
  label,
  rating,
  onRate,
}: {
  label: string;
  rating: number;
  onRate: (val: number) => void;
}) => {
  return (
    <View style={styles.starRow}>
      <Text style={styles.starLabel}>{label}</Text>
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onRate(star)}
            style={{ padding: 4 }}
          >
            <Star
              color={star <= rating ? "#F59E0B" : "#D1D5DB"}
              fill={star <= rating ? "#F59E0B" : "transparent"}
              size={28}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default function RateWorkers() {
  const navigation = useNavigation();
  const { bookingId, edit } = useLocalSearchParams();
  const [booking, setBooking] = useState<any>(null);
  const [ratings, setRatings] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchWorkersToRate();
  }, [bookingId]);

  // app/user/rating.tsx ke andar
  const fetchWorkersToRate = async () => {
    try {
      const response = await axios.get(`${API_URL}/user/booking/${bookingId}`);
      if (response.data.success) {
        const fetchedBooking = response.data.booking;
        setBooking(fetchedBooking);

        let initialRatings: any = {};

        fetchedBooking.workers.forEach((worker: any) => {
          // 🚀 NAYA LOGIC: Check karo kya is worker ki koi purani rating aayi hai backend se?
          const existingRating = fetchedBooking.ratings?.find(
            (r: any) => r.workerId === worker.id,
          );

          // Agar existing rating hai toh wo set karo, warna 0 set karo
          initialRatings[worker.id] = {
            mehnat: existingRating ? existingRating.mehnat : 0,
            vyavhaar: existingRating ? existingRating.vyavhaar : 0,
          };
        });

        setRatings(initialRatings);
      }
    } catch (error) {
      console.log("Errors fetching booking for rating", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRate = (
    workerId: number,
    type: "mehnat" | "vyavhaar",
    value: number,
  ) => {
    setRatings((prev: any) => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        [type]: value,
      },
    }));
  };

  const submitRatings = async (isSkip: boolean = false) => {
    setIsSubmitting(true);

    try {
      let payloadRatings = [];

      if (isSkip) {
        // Skip kiya toh sabko default 4 star (As per Product Spec)
        payloadRatings = booking.workers.map((w: any) => ({
          workerId: w.id,
          mehnat: 4,
          vyavhaar: 4,
        }));
      } else {
        // Check karo ki sabko rating di hai ya nahi
        let allRated = true;
        Object.keys(ratings).forEach((key) => {
          if (ratings[key].mehnat === 0 || ratings[key].vyavhaar === 0)
            allRated = false;
        });

        if (!allRated) {
          Alert.alert(
            "Incomplete",
            "Kripya sabhi workers ko rating dein, ya 'Skip' dabayein.",
          );
          setIsSubmitting(false);
          return;
        }

        payloadRatings = Object.keys(ratings).map((key) => ({
          workerId: parseInt(key),
          mehnat: ratings[key].mehnat,
          vyavhaar: ratings[key].vyavhaar,
        }));
      }

      // Backend API Call
      const response = await axios.post(`${API_URL}/user/submit-rating`, {
        bookingId: booking.id,
        ratings: payloadRatings,
      });

      if (response.data.success) {
        Alert.alert("Success!", "Rating save ho gayi hai. Shukriya! 🙏", [
          {
            text: "OK",
            onPress: () => {
              navigation.dispatch(
                CommonActions.reset({
                  index: 1,
                  routes: [
                    {
                      name: "user/dashboard",
                    },
                    {
                      name: "user/history",
                    },
                  ],
                }),
              );
            },
          },
        ]);
      }
    } catch (error) {
      console.log("Rating submit error", error);
      Alert.alert("Error", "Rating save karne mein problem hui.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color="#000" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {edit ? "Edit Ratings" : "Rate Workers"}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.pageSubtitle}>
          Help us improve worker quality. Aapka feedback zaroori hai!
        </Text>

        {booking?.workers.map((worker: any) => (
          <View key={worker.id} style={styles.workerCard}>
            <View style={styles.workerHeader}>
              <View style={styles.avatar}>
                <User color="#10B981" size={20} />
              </View>
              <Text style={styles.workerName}>{worker.name || "Worker"}</Text>
            </View>

            <View style={styles.divider} />

            <StarRating
              label="Mehnat (Hard Work)"
              rating={ratings[worker.id]?.mehnat || 0}
              onRate={(val) => handleRate(worker.id, "mehnat", val)}
            />

            <StarRating
              label="Vyavhaar (Behavior)"
              rating={ratings[worker.id]?.vyavhaar || 0}
              onRate={(val) => handleRate(worker.id, "vyavhaar", val)}
            />
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* BOTTOM ACTION BAR */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => submitRatings(true)}
          disabled={isSubmitting}
        >
          <Text style={styles.skipBtnText}>Skip (Default 4★)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={() => submitRatings(false)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>
              {edit ? "Update Ratings" : "Submit All"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
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

  content: { padding: 20 },
  pageSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
    fontWeight: "500",
    textAlign: "center",
  },

  workerCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  workerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  workerName: { fontSize: 16, fontWeight: "800", color: "#111827" },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginBottom: 15 },

  starRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  starLabel: { fontSize: 14, fontWeight: "700", color: "#374151" },
  starsContainer: { flexDirection: "row" },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    flexDirection: "row",
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "space-between",
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    marginRight: 10,
  },
  skipBtnText: { color: "#4B5563", fontWeight: "700", fontSize: 15 },
  submitBtn: {
    flex: 1.5,
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  submitBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 1,
  },
});
