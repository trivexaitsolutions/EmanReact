// app/worker/rate-client.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import {
  router,
  Stack,
  useLocalSearchParams,
  useNavigation,
} from "expo-router";
import { CommonActions } from "@react-navigation/native";
import {
    CheckCircle2,
    ChevronLeft,
    MapPin,
    MessageSquareText,
    Smile,
    Star,
    UserRound,
} from "lucide-react-native";
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
    loadData();
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

          setRating(existing.rating || 5);
          setBehaviour(existing.behaviour || 5);
          setLocationAccuracy(existing.locationAccuracy || 5);
          setCoordination(existing.coordination || 5);
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
        behaviour,
        locationAccuracy,
        coordination,
        comment: comment.trim(),
      });

      if (response.data.success) {
        Alert.alert("Thank You", "Client rating submit ho gayi.", [
          {
            text: "OK",
            onPress: () => {
              navigation.dispatch(
                CommonActions.reset({
                  index: 1,
                  routes: [
                    {
                      name: "worker/dashboard",
                    },
                    {
                      name: "worker/history",
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
    onChange: (rating: number) => void;
  }) => (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((item) => (
        <TouchableOpacity
          key={item}
          onPress={() => onChange(item)}
          activeOpacity={0.8}
          style={styles.starBtn}
        >
          <Star
            size={32}
            color="#F59E0B"
            fill={item <= value ? "#F59E0B" : "transparent"}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const RatingItem = ({
    icon,
    title,
    subTitle,
    value,
    onChange,
  }: {
    icon: any;
    title: string;
    subTitle: string;
    value: number;
    onChange: (rating: number) => void;
  }) => (
    <View style={styles.ratingItem}>
      <View style={styles.ratingHeader}>
        <View style={styles.ratingIcon}>{icon}</View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ratingTitle}>{title}</Text>
          <Text style={styles.ratingSub}>{subTitle}</Text>
        </View>
        <Text style={styles.ratingValue}>{value}/5</Text>
      </View>

      <StarSelector value={value} onChange={onChange} />
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

      <View style={styles.topBg}>
        <View style={styles.appBar}>
          <TouchableOpacity
            onPress={() =>
              router.replace({
                pathname: "/worker/booking-details",
                params: { id: String(bookingId) },
              })
            }
            style={styles.backBtn}
          >
            <ChevronLeft color="#FFFFFF" size={26} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Rate Client</Text>
            <Text style={styles.headerSub}>Share your work experience</Text>
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
        <View style={styles.mainRatingCard}>
          <Text style={styles.mainRatingTitle}>Overall Experience</Text>
          <Text style={styles.mainRatingSub}>
            Client ke saath kaam karne ka overall experience kaisa tha?
          </Text>

          <StarSelector value={rating} onChange={setRating} />

          <Text style={styles.mainRatingScore}>{rating}.0 / 5</Text>
        </View>

        <RatingItem
          icon={<Smile color="#10B981" size={22} />}
          title="Client Behaviour"
          subTitle="Client ka behaviour kaisa tha?"
          value={behaviour}
          onChange={setBehaviour}
        />

        <RatingItem
          icon={<MapPin color="#10B981" size={22} />}
          title="Location Accuracy"
          subTitle="Location clear aur correct thi?"
          value={locationAccuracy}
          onChange={setLocationAccuracy}
        />

        <RatingItem
          icon={<MessageSquareText color="#10B981" size={22} />}
          title="Coordination"
          subTitle="Communication aur coordination kaisa tha?"
          value={coordination}
          onChange={setCoordination}
        />

        <View style={styles.commentCard}>
          <Text style={styles.commentTitle}>Add Comment</Text>
          <Text style={styles.commentSub}>Optional feedback</Text>

          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Write something about this client..."
            placeholderTextColor="#9CA3AF"
            multiline
            style={styles.commentInput}
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

        <View style={{ height: 35 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },

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

  topBg: {
    backgroundColor: "#047857",
    paddingBottom: 30,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },

  appBar: {
    paddingTop: 44,
    paddingHorizontal: 18,
    paddingBottom: 18,
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
    fontSize: 20,
    fontWeight: "900",
  },

  headerSub: {
    color: "#A7F3D0",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },

  clientCard: {
    marginHorizontal: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  clientIcon: {
    width: 60,
    height: 60,
    borderRadius: 21,
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
    fontSize: 19,
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

  mainRatingCard: {
    marginTop: -28,
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },

  mainRatingTitle: {
    fontSize: 20,
    color: "#111827",
    fontWeight: "900",
  },

  mainRatingSub: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 5,
    lineHeight: 19,
  },

  starRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },

  starBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },

  mainRatingScore: {
    marginTop: 10,
    color: "#F59E0B",
    fontSize: 16,
    fontWeight: "900",
  },

  ratingItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },

  ratingHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  ratingIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  ratingTitle: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "900",
  },

  ratingSub: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 2,
  },

  ratingValue: {
    color: "#F59E0B",
    fontSize: 13,
    fontWeight: "900",
  },

  commentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },

  commentTitle: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "900",
  },

  commentSub: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 2,
    marginBottom: 11,
  },

  commentInput: {
    minHeight: 105,
    backgroundColor: "#F9FAFB",
    borderRadius: 18,
    padding: 14,
    textAlignVertical: "top",
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  submitBtn: {
    backgroundColor: "#10B981",
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
    shadowColor: "#10B981",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  skipBtn: {
    paddingVertical: 15,
    alignItems: "center",
  },

  skipBtnText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "900",
  },
});
