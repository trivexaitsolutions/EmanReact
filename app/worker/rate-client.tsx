// app/worker/rate-client.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CommonActions } from "@react-navigation/native";
import axios from "axios";
import {
  router,
  Stack,
  useLocalSearchParams,
  useNavigation,
} from "expo-router";
import { CheckCircle2, ChevronLeft, Star, UserRound } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { API_URL } from "../../constants/api";

export default function RateClientScreen() {
  const navigation = useNavigation();
  const { bookingId } = useLocalSearchParams();

  const [workerSession, setWorkerSession] = useState<any>(null);
  const [bookingData, setBookingData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [rating, setRating] = useState(5);
  const [behaviour, setBehaviour] = useState(5);
  const [locationAccuracy, setLocationAccuracy] = useState(5);
  const [coordination, setCoordination] = useState(5);
  const [comment, setComment] = useState("");

  useEffect(() => {
    void loadData();
  }, [bookingId]);

  const loadData = async () => {
    try {
      const session = await AsyncStorage.getItem("workerSession");

      if (!session) {
        router.replace("/");
        return;
      }

      const parsedWorker = JSON.parse(session);
      setWorkerSession(parsedWorker);

      if (!bookingId) {
        Alert.alert("Error", "Booking ID missing");
        router.replace("/worker/dashboard");
        return;
      }

      const response = await axios.get(
        `${API_URL}/worker/client-rating-status/${bookingId}/${parsedWorker.id}`,
      );

      if (response.data.success) {
        setBookingData(response.data.booking);

        if (response.data.isRated && response.data.rating) {
          const existing = response.data.rating;
          const initialRating = existing.rating || 5;

          setRating(initialRating);
          setBehaviour(existing.behaviour || initialRating);
          setLocationAccuracy(existing.locationAccuracy || initialRating);
          setCoordination(existing.coordination || initialRating);
          setComment(existing.comment || "");
        }
      }
    } catch (error: any) {
      console.log("Rating status error:", error);
      const message =
        error?.response?.data?.message || "Rating data load nahi ho paya.";
      Alert.alert("Error", message);
      router.replace("/worker/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOverallRatingChange = (value: number) => {
    setRating(value);
    setBehaviour(value);
    setLocationAccuracy(value);
    setCoordination(value);
  };

  const submitRating = async () => {
    try {
      if (!workerSession?.id || !bookingId) {
        Alert.alert("Error", "Worker ya booking data missing hai.");
        return;
      }

      setIsSubmitting(true);

      const response = await axios.post(`${API_URL}/worker/rate-client`, {
        bookingId: Number(bookingId),
        workerId: workerSession.id,
        rating,
        behaviour: behaviour || rating,
        locationAccuracy: locationAccuracy || rating,
        coordination: coordination || rating,
        comment: comment.trim(),
      });

      if (response.data.success) {
        Alert.alert("Thank You", "Client rating submit ho gayi.", [
          {
            text: "OK",
            onPress: () => {
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [
                    {
                      name: "worker/dashboard",
                    },
                  ],
                }),
              );
            },
          },
        ]);
      }
    } catch (error: any) {
      console.log("Submit client rating error:", error);
      const message =
        error?.response?.data?.message || "Rating submit nahi ho payi.";
      Alert.alert("Error", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarSelector = ({
    value,
    onChange,
  }: {
    value: number;
    onChange: (selectedRating: number) => void;
  }) => (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((item) => (
        <TouchableOpacity
          key={item}
          onPress={() => onChange(item)}
          activeOpacity={0.85}
          style={styles.starBtn}
        >
          <Star
            size={40}
            color="#F59E0B"
            fill={item <= value ? "#F59E0B" : "transparent"}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loaderText}>Loading rating screen...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.topSection}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() =>
              router.replace({
                pathname: "/worker/booking-details",
                params: { id: String(bookingId) },
              })
            }
            style={styles.backBtn}
          >
            <ChevronLeft color="#FFFFFF" size={24} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Rate Client</Text>
            <Text style={styles.headerSub}>Sirf rating do</Text>
          </View>
        </View>

        <View style={styles.clientCard}>
          <View style={styles.clientIcon}>
            <UserRound color="#10B981" size={30} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.clientLabel}>Client</Text>
            <Text style={styles.clientName}>
              {bookingData?.customerName || "Client"}
            </Text>
            <Text style={styles.clientMeta}>
              Booking #{bookingData?.id || bookingId}
            </Text>
          </View>

          <View style={styles.completedBadge}>
            <CheckCircle2 color="#047857" size={15} />
            <Text style={styles.completedText}>Completed</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.ratingCard}>
          <Text style={styles.ratingTitle}>How was the client?</Text>
          <Text style={styles.ratingSub}>
            Neeche stars par tap karke rating select karo.
          </Text>

          <StarSelector value={rating} onChange={handleOverallRatingChange} />

          <View style={styles.scorePill}>
            <Text style={styles.scorePillText}>{rating}/5 Rating</Text>
          </View>
        </View>

        <View style={styles.hiddenSection}>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Optional comment"
            style={styles.hiddenInput}
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={submitRating}
          disabled={isSubmitting}
          style={styles.submitBtn}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Rating</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [
                  {
                    name: "worker/dashboard",
                  },
                ],
              }),
            );
          }}
          style={styles.skipBtn}
        >
          <Text style={styles.skipBtnText}>Skip for now</Text>
        </TouchableOpacity>

        <View style={{ height: 28 }} />
      </ScrollView>
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
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    marginTop: 10,
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "700",
  },
  topSection: {
    backgroundColor: "#0B7A55",
    paddingBottom: 26,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerRow: {
    paddingTop: 44,
    paddingHorizontal: 18,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.16)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  headerSub: {
    color: "#D1FAE5",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  clientCard: {
    marginHorizontal: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  clientIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },
  clientLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "900",
    textTransform: "uppercase",
  },
  clientName: {
    fontSize: 22,
    color: "#111827",
    fontWeight: "900",
    marginTop: 2,
  },
  clientMeta: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
    marginTop: 3,
  },
  completedBadge: {
    backgroundColor: "#ECFDF5",
    borderRadius: 18,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  completedText: {
    color: "#047857",
    fontSize: 11,
    fontWeight: "900",
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  ratingCard: {
    marginTop: -20,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  ratingTitle: {
    fontSize: 26,
    color: "#111827",
    fontWeight: "900",
    textAlign: "center",
  },
  ratingSub: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 7,
    lineHeight: 20,
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    flexWrap: "wrap",
  },
  starBtn: {
    paddingHorizontal: 5,
    paddingVertical: 5,
  },
  scorePill: {
    marginTop: 16,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  scorePillText: {
    color: "#047857",
    fontSize: 13,
    fontWeight: "900",
  },
  hiddenSection: {
    display: "none",
  },
  hiddenInput: {
    height: 0,
    width: 0,
    opacity: 0,
  },
  submitBtn: {
    backgroundColor: "#10B981",
    borderRadius: 22,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 18,
    shadowColor: "#10B981",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  skipBtn: {
    paddingVertical: 16,
    alignItems: "center",
  },
  skipBtnText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "900",
  },
});
