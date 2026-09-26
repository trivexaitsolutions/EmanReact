import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack, useFocusEffect } from "expo-router";
import { Check, MapPin, X } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import RazorpayCheckout from "react-native-razorpay";
import { API_URL } from "../../constants/api";
import BookingStepHeader from "../../components/ui/booking-step-header";

const RAZORPAY_KEY_ID = "rzp_test_SouUYINcIpP7iB";

type BookingDraft = {
  skillId?: number;
  skillName?: string;
  minRating?: number;
  workerCount?: number;
  selectedNakas?: any[];
  nakaIds?: number[];
  addressId?: number;
  assignmentMode?: "AUTO" | "CUSTOMER_SELECT";
  selectedWorkerIds?: number[];
  selectedWorkers?: {
    id: number;
    name?: string;
    averageRating?: number;
  }[];
  workLatitude?: number;
  workLongitude?: number;
  workAddress?: string;
  serviceRadiusKm?: number;
  serviceRadiusMeters?: number;
};

export default function BookWorkerStep3() {
  const { height } = useWindowDimensions();

  const isSmallScreen = height < 760;
  const isVerySmallScreen = height < 680;

  const [isLoading, setIsLoading] = useState(true);

  const [isPaying, setIsPaying] = useState(false);

  const [customer, setCustomer] = useState<any>(null);

  const [draft, setDraft] = useState<BookingDraft>({});

  const [addresses, setAddresses] = useState<any[]>([]);

  const [selectedAddress, setSelectedAddress] = useState<any>(null);

  const [showAddressModal, setShowAddressModal] = useState(false);

  const [unitPrice, setUnitPrice] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadPageData();
      // Page data intentionally refreshes whenever this route receives focus.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const loadPageData = async () => {
    try {
      setIsLoading(true);

      const session = await AsyncStorage.getItem("customerSession");

      const savedDraft = await AsyncStorage.getItem("newBookingDraft");

      if (!session) {
        Alert.alert("Session Error", "Please login again.");

        router.replace("/");
        return;
      }

      if (!savedDraft) {
        Alert.alert(
          "Booking Details Missing",
          "Please start your booking again.",
        );

        router.replace("/user/book-worker-step1");

        return;
      }

      const parsedCustomer = JSON.parse(session);

      const parsedDraft = JSON.parse(savedDraft);

      setCustomer(parsedCustomer);
      setDraft(parsedDraft);

      const [addressResponse, optionResponse] = await Promise.all([
        axios.get(`${API_URL}/user/customer-addresses/${parsedCustomer.id}`),

        axios.get(`${API_URL}/user/booking-options`),
      ]);

      if (addressResponse.data.success) {
        const addressList = addressResponse.data.addresses || [];

        setAddresses(addressList);

        const draftAddress = addressList.find(
          (item: any) => Number(item.id) === Number(parsedDraft.addressId),
        );

        const defaultAddress = addressList.find((item: any) => item.isDefault);

        const initialAddress =
          draftAddress || defaultAddress || addressList[0] || null;

        setSelectedAddress(initialAddress);

        if (initialAddress) {
          const updatedDraft = {
            ...parsedDraft,
            addressId: Number(initialAddress.id),
          };

          setDraft(updatedDraft);

          await AsyncStorage.setItem(
            "newBookingDraft",
            JSON.stringify(updatedDraft),
          );
        }
      }

      if (optionResponse.data.success) {
        calculateRate(optionResponse.data.skills || [], parsedDraft);
      }
    } catch (error: any) {
      console.log("Step 3 load error:", error?.response?.data || error);

      Alert.alert("Error", "Booking details load nahi ho payi.");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateRate = (skills: any[], bookingDraft: BookingDraft) => {
    const currentSkill = skills.find(
      (skill: any) => Number(skill.id) === Number(bookingDraft.skillId),
    );

    if (!currentSkill) {
      setUnitPrice(0);
      return;
    }

    const rates = Array.isArray(currentSkill.rates) ? currentSkill.rates : [];

    if (rates.length === 0) {
      setUnitPrice(0);
      return;
    }

    const selectedRating = Number(bookingDraft.minRating || 0);

    if (selectedRating > 0) {
      const exactRate = rates.find(
        (rate: any) => Number(rate.star) === selectedRating,
      );

      if (exactRate) {
        setUnitPrice(Number(exactRate.rate || 0));

        return;
      }
    }

    const sortedRates = [...rates].sort(
      (a: any, b: any) => Number(a.rate) - Number(b.rate),
    );

    setUnitPrice(Number(sortedRates[0]?.rate || 0));
  };

  const handleSelectAddress = async (address: any) => {
    setSelectedAddress(address);
    setShowAddressModal(false);

    try {
      const savedDraft = await AsyncStorage.getItem("newBookingDraft");

      const oldDraft = savedDraft ? JSON.parse(savedDraft) : {};

      const updatedDraft = {
        ...oldDraft,
        addressId: Number(address.id),
      };

      await AsyncStorage.setItem(
        "newBookingDraft",
        JSON.stringify(updatedDraft),
      );

      setDraft(updatedDraft);
    } catch (error) {
      console.log("Address draft save error:", error);
    }
  };

  const cancelPendingBookingSafely = async (
    bookingId: number,
    customerId: number,
  ) => {
    try {
      await axios.post(`${API_URL}/user/cancel-pending-booking`, {
        bookingId,
        customerId,
      });
    } catch (error: any) {
      console.log(
        "Pending booking cancellation error:",
        error?.response?.data || error,
      );
    }
  };

  const handleProceedToPayment = async () => {
    if (isPaying) {
      return;
    }

    if (!customer?.id) {
      Alert.alert(
        "Session Error",
        "Customer session not found. Please login again.",
      );

      return;
    }

    if (!selectedAddress?.id) {
      Alert.alert("Select Address", "Please select your work address.");

      return;
    }

    if (!draft.skillId) {
      Alert.alert("Skill Missing", "Please select a worker skill.");

      return;
    }

    if (
      !Number.isFinite(Number(draft.workLatitude)) ||
      !Number.isFinite(Number(draft.workLongitude))
    ) {
      Alert.alert(
        "Work Location Missing",
        "Please confirm the exact work location on map.",
        [
          {
            text: "Confirm Location",
            onPress: () => router.push("/user/book-worker-step2"),
          },
        ],
      );

      return;
    }

    if (draft.assignmentMode === "CUSTOMER_SELECT") {
      const selectedWorkerIds = Array.isArray(draft.selectedWorkerIds)
        ? draft.selectedWorkerIds
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id > 0)
        : [];

      if (selectedWorkerIds.length !== Number(draft.workerCount || 1)) {
        Alert.alert(
          "Select Workers",
          "Please select the required number of workers before payment.",
          [
            {
              text: "Select Workers",
              onPress: () =>
                router.push("/user/book-worker-select-workers"),
            },
          ],
        );

        return;
      }
    }

    let createdBookingId: number | null = null;

    let paymentCompleted = false;

    try {
      setIsPaying(true);

      /*
       * Step 1:
       * Backend booking create karega,
       * workers lock karega aur Razorpay
       * order return karega.
       */
      const initiateResponse = await axios.post(
        `${API_URL}/user/initiate-booking`,
        {
          customerId: Number(customer.id),

          skillId: Number(draft.skillId),

          workerCount: Number(draft.workerCount || 1),

          minRating: Number(draft.minRating || 0),

          addressId: Number(selectedAddress.id),

          workLatitude: Number(draft.workLatitude),

          workLongitude: Number(draft.workLongitude),

          workLocationText: draft.workAddress || "",

          selectedWorkerIds:
            draft.assignmentMode === "CUSTOMER_SELECT"
              ? (draft.selectedWorkerIds || []).map((id) => Number(id))
              : [],
        },
      );

      if (!initiateResponse.data.success) {
        throw new Error(
          initiateResponse.data.message || "Booking initiate nahi ho payi.",
        );
      }

      createdBookingId = Number(initiateResponse.data.bookingId);

      const razorpayOrder = initiateResponse.data.razorpayOrder;

      if (!createdBookingId || !razorpayOrder?.id || !razorpayOrder?.amount) {
        throw new Error("Invalid payment order received.");
      }

      /*
       * Step 2:
       * Razorpay popup open karo.
       */
      const paymentData: any = await RazorpayCheckout.open({
        key: RAZORPAY_KEY_ID,

        order_id: razorpayOrder.id,

        amount: razorpayOrder.amount,

        currency: razorpayOrder.currency || "INR",

        name: "E-MAN",

        description: `${draft.skillName || "Worker"} booking`,

        theme: {
          color: "#16863A",
        },

        prefill: {
          name: customer.name || "",

          email: customer.email || "",

          contact: customer.phone || "",
        },

        notes: {
          bookingId: String(createdBookingId),

          selectedNakas: (draft.nakaIds || []).join(","),
        },
      });

      /*
       * Razorpay result mil gaya,
       * iska matlab payment attempt successful
       * side tak pahunch gaya.
       */
      paymentCompleted = true;

      /*
       * Step 3:
       * Backend signature verification.
       */
      const verifyResponse = await axios.post(
        `${API_URL}/user/verify-payment`,
        {
          razorpay_payment_id: paymentData.razorpay_payment_id,

          razorpay_order_id: paymentData.razorpay_order_id,

          razorpay_signature: paymentData.razorpay_signature,

          bookingId: createdBookingId,
        },
      );

      if (!verifyResponse.data.success) {
        throw new Error(
          verifyResponse.data.message || "Payment verification failed.",
        );
      }

      /*
       * Booking complete hone ke baad
       * old draft remove karo.
       */
      await AsyncStorage.removeItem("newBookingDraft");

      router.replace("/user/active-booking");
    } catch (error: any) {
      console.log(
        "Booking payment error:",
        error?.response?.data || error?.description || error,
      );

      /*
       * Payment se pehle popup cancel/fail hua,
       * to pending booking delete karke
       * workers release karo.
       */
      if (createdBookingId && !paymentCompleted) {
        await cancelPendingBookingSafely(createdBookingId, Number(customer.id));
      }

      /*
       * Payment ho chuka ho lekin verification
       * fail hui ho to booking delete nahi karni.
       */
      if (paymentCompleted) {
        Alert.alert(
          "Payment Verification Pending",
          "Payment complete hua hai, lekin verification me dikkat aayi. Dobara payment mat karein. Please admin se contact karein.",
        );

        return;
      }

      const errorCode = error?.response?.data?.code;

      if (
        errorCode === "WORKERS_NO_LONGER_AVAILABLE" ||
        errorCode === "SELECTED_WORKERS_INVALID"
      ) {
        Alert.alert(
          "Worker No Longer Available",
          error?.response?.data?.message ||
            "Selected worker ab available nahi hai. Please worker dobara select karein.",
          [
            {
              text: "Select Worker",
              onPress: () =>
                router.replace("/user/book-worker-select-workers"),
            },
          ],
        );

        return;
      }

      if (errorCode === "NO_NAKAS_IN_RADIUS") {
        Alert.alert(
          "Service Area Changed",
          error?.response?.data?.message ||
            "Is work location ke nearby verified Naka nahi mila.",
          [
            {
              text: "Change Location",
              onPress: () => router.replace("/user/book-worker-step2"),
            },
          ],
        );

        return;
      }

      const errorMessage =
        error?.response?.data?.message ||
        error?.description ||
        error?.message ||
        "Payment complete nahi ho paya.";

      Alert.alert("Payment Cancelled", errorMessage);
    } finally {
      setIsPaying(false);
    }
  };

  const workerCount = Number(draft.workerCount || 1);

  const totalAmount = unitPrice * workerCount;

  const ratingText =
    Number(draft.minRating || 0) === 0
      ? "Any rating"
      : `${draft.minRating}★ & above`;

  const selectedNakaNames = Array.isArray(draft.selectedNakas)
    ? draft.selectedNakas
        .map((naka: any) => naka.name)
        .filter(Boolean)
        .join(", ")
    : "";

  const selectedWorkerNames = Array.isArray(draft.selectedWorkers)
    ? draft.selectedWorkers
        .map((worker: any) => worker.name)
        .filter(Boolean)
        .join(", ")
    : "";

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#16863A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.screen}>
        <BookingStepHeader step={3} disabled={isPaying} />

        <View
          style={[
            styles.content,
            isSmallScreen && styles.contentSmall,
            isVerySmallScreen && styles.contentVerySmall,
          ]}
        >
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Booking Details</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Skill</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {draft.skillName || "-"}
              </Text>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Minimum Rating</Text>
              <Text style={styles.detailValue}>{ratingText}</Text>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Workers</Text>
              <Text style={styles.detailValue}>{workerCount}</Text>
            </View>

            {draft.assignmentMode === "CUSTOMER_SELECT" ? (
              <>
                <View style={styles.rowDivider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Selected Workers</Text>
                  <Text
                    style={[styles.detailValue, styles.longValue]}
                    numberOfLines={2}
                  >
                    {selectedWorkerNames || "-"}
                  </Text>
                </View>
              </>
            ) : null}

            <View style={styles.rowDivider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Nearby Nakas</Text>
              <Text
                style={[styles.detailValue, styles.longValue]}
                numberOfLines={2}
              >
                {selectedNakaNames || "-"}
              </Text>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text
                style={[styles.detailValue, styles.longValue]}
                numberOfLines={2}
              >
                {draft.workAddress || "Confirmed on map"}
              </Text>
            </View>
          </View>

          <View style={styles.amountCard}>
            <Text style={styles.amountTitle}>Estimated Amount</Text>
            <Text style={styles.amountValue}>₹{totalAmount}</Text>
          </View>
        </View>

        <View style={[styles.footer, isSmallScreen && styles.footerSmall]}>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isPaying || !selectedAddress || unitPrice <= 0}
            style={[
              styles.paymentButton,
              (!selectedAddress || unitPrice <= 0 || isPaying) &&
                styles.paymentButtonDisabled,
            ]}
            onPress={handleProceedToPayment}
          >
            {isPaying ? (
              <View style={styles.paymentLoadingRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.paymentButtonText}>Please Wait...</Text>
              </View>
            ) : (
              <Text style={styles.paymentButtonText}>Proceed to Payment</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    height: 96,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerSmall: {
    height: 72,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#171717",
  },
  stepText: {
    minWidth: 82,
    textAlign: "right",
    fontSize: 15,
    fontWeight: "800",
    color: "#16863A",
  },
  progressContainer: {
    height: 68,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  progressContainerSmall: {
    height: 52,
  },
  progressLineActive: {
    flex: 2,
    height: 4,
    backgroundColor: "#16863A",
  },
  progressLineInactive: {
    flex: 0.7,
    height: 4,
    backgroundColor: "#E4E4E4",
    borderRadius: 10,
  },
  progressCircleDone: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E7E7E7",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 4,
  },
  progressCircleActive: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#16863A",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 4,
  },
  progressDoneText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#8E8E8E",
  },
  progressActiveText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  divider: {
    height: 1,
    backgroundColor: "#E7E7E7",
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 12,
    gap: 14,
  },
  contentSmall: {
    paddingTop: 12,
    gap: 10,
  },
  contentVerySmall: {
    paddingTop: 8,
    gap: 8,
  },
  detailsCard: {
    borderWidth: 1,
    borderColor: "#E1E1E1",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#171717",
    marginBottom: 6,
  },
  detailRow: {
    minHeight: 43,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  detailLabel: {
    flexShrink: 0,
    fontSize: 13,
    color: "#747474",
    fontWeight: "500",
  },
  detailValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    color: "#171717",
    fontWeight: "700",
  },
  longValue: {
    maxWidth: "64%",
    lineHeight: 18,
  },
  rowDivider: {
    height: 1,
    backgroundColor: "#EEEEEE",
  },
  amountCard: {
    borderWidth: 1,
    borderColor: "#D9EADD",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: "#F6FFF8",
  },
  amountTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4A4A4A",
  },
  amountValue: {
    marginTop: 3,
    fontSize: 32,
    fontWeight: "900",
    color: "#16863A",
    letterSpacing: -0.6,
  },
  footer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EFEFEF",
  },
  footerSmall: {
    paddingTop: 8,
    paddingBottom: 10,
  },
  paymentButton: {
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: "#16863A",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentButtonDisabled: {
    opacity: 0.5,
  },
  paymentButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  paymentLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
});
