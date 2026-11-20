import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack, useFocusEffect } from "expo-router";
import { Check, MapPin, X } from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import RazorpayCheckout from "react-native-razorpay";
import { API_URL } from "../../constants/api";
import BookingStepHeader from "../../components/ui/booking-step-header";


type BookingDraft = {
  skillId?: number;
  skillName?: string;
  minRating?: number;
  workerCount?: number;
  duration?: "FULL_DAY" | "2" | "3" | "4";
  selectedNakas?: any[];
  nakaIds?: number[];
  addressId?: number;
  assignmentMode?: "AUTO" | "CUSTOMER_SELECT";
  selectedWorkerIds?: number[];
  selectedWorkers?: {
    id: number;
    name?: string;
    averageRating?: number;
    effectiveRate?: number | null;
    poolNumber?: number | null;
  }[];
  workLatitude?: number;
  workLongitude?: number;
  workAddress?: string;
  serviceRadiusKm?: number;
  serviceRadiusMeters?: number;
};

const distanceBetween = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLng = radians(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) *
    Math.cos(radians(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
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

        const candidate = draftAddress || defaultAddress || addressList[0] || null;
        // A saved address in another area must not silently replace the
        // work-site coordinates used to match the selected workers.
        const candidateLat = candidate?.latitude == null ? NaN : Number(candidate.latitude);
        const candidateLng = candidate?.longitude == null ? NaN : Number(candidate.longitude);
        const workLat = Number(parsedDraft.workLatitude);
        const workLng = Number(parsedDraft.workLongitude);
        const differentSite = candidate && Number.isFinite(candidateLat) && Number.isFinite(candidateLng) &&
          Number.isFinite(workLat) && Number.isFinite(workLng) &&
          distanceBetween({ latitude: candidateLat, longitude: candidateLng },
            { latitude: workLat, longitude: workLng }) > 250;
        const initialAddress = differentSite ? null : candidate;

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
    setShowAddressModal(false);
    const addressLat = address?.latitude == null ? NaN : Number(address.latitude);
    const addressLng = address?.longitude == null ? NaN : Number(address.longitude);
    if (!Number.isFinite(addressLat) || !Number.isFinite(addressLng)) {
      Alert.alert("GPS Location Needed", "Is address mein coordinates missing hain. Edit karke location capture karein.", [
        { text: "Update Address", onPress: () => router.push({ pathname: "/user/manage-addresses", params: { fromBooking: "1" } }) },
      ]);
      return;
    }
    try {
      const savedDraft = await AsyncStorage.getItem("newBookingDraft");
      const oldDraft = savedDraft ? JSON.parse(savedDraft) : {};
      const currentLat = Number(oldDraft.workLatitude);
      const currentLng = Number(oldDraft.workLongitude);
      const needsRematch = !Number.isFinite(currentLat) || !Number.isFinite(currentLng) ||
        distanceBetween({ latitude: currentLat, longitude: currentLng },
          { latitude: addressLat, longitude: addressLng }) > 250;
      const updatedDraft = {
        ...oldDraft,
        addressId: Number(address.id),
        workLatitude: addressLat,
        workLongitude: addressLng,
        workAddress: [address.addressLine, address.mapAddress].filter(Boolean).join(" · ") || oldDraft.workAddress,
        ...(needsRematch ? { selectedWorkerIds: [], selectedWorkers: [], selectedNakas: [], nakaIds: [] } : {}),
      };
      await AsyncStorage.setItem("newBookingDraft", JSON.stringify(updatedDraft));
      setDraft(updatedDraft);
      setSelectedAddress(address);
      if (needsRematch) {
        Alert.alert("Work Site Changed", "Nayi address location ke nearby workers dobara check karne hain.", [
          { text: "Continue", onPress: () => router.replace("/user/book-worker-step2") },
        ]);
      }
    } catch (error) {
      console.log("Address draft save error:", error);
      Alert.alert("Error", "Work address select nahi ho paya.");
    }
  };

  const paymentInProgressRef = useRef(false);

  const cancelPendingBookingSafely = async (
    bookingId: number,
    customerId: number,
  ): Promise<{ cancelled: boolean; code?: string; message?: string }> => {
    try {
      const response = await axios.post(`${API_URL}/user/cancel-pending-booking`, {
        bookingId,
        customerId,
      });
      return {
        cancelled: response.data?.success === true,
        message: response.data?.message,
      };
    } catch (error: any) {
      console.log("Pending booking cancellation error:", error?.response?.data || error);
      return {
        cancelled: false,
        code: error?.response?.data?.code || "CANCEL_FAILED",
        message: error?.response?.data?.message,
      };
    }
  };

  const handleProceedToPayment = async () => {
    if (isPaying || paymentInProgressRef.current) {
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
      Alert.alert("Select Address", "Please select or add your work address before payment.", [
        { text: "Add / Choose Address", onPress: () => setShowAddressModal(true) },
      ]);
      return;
    }

    if (!draft.skillId) {
      Alert.alert("Skill Missing", "Please select a worker skill.");

      return;
    }

    if (!Number.isFinite(Number(unitPrice)) || Number(unitPrice) <= 0) {
      Alert.alert(
        "Rate Missing",
        "Selected skill ka rate load nahi hua hai. Please previous step par jaake skill/rating dobara select karein.",
      );

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

    paymentInProgressRef.current = true;
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
          duration: draft.duration || "FULL_DAY",

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

      // Backend is the pricing source of truth. If the pool rate changed
      // after the selection page was opened, do not charge a different amount
      // without the customer first seeing the updated worker-wise prices.
      if (
        draft.assignmentMode === "CUSTOMER_SELECT" &&
        Array.isArray(draft.selectedWorkers) &&
        draft.selectedWorkers.length > 0 &&
        Math.abs(Number(initiateResponse.data.totalAmount) - totalAmount) > 0.01
      ) {
        const priceError: any = new Error("Worker rate or availability changed. Please review the latest worker prices before paying.");
        priceError.code = "POOL_RATE_CHANGED";
        throw priceError;
      }

      const razorpayOrder = initiateResponse.data.razorpayOrder;

      if (draft.assignmentMode !== "CUSTOMER_SELECT" && Math.abs(Number(initiateResponse.data.totalAmount) - totalAmount) > 0.01) {
        const confirmed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            "Confirm Final Worker Price",
            `Selected workers total: ₹${Number(initiateResponse.data.totalAmount).toFixed(2)}\nEstimated amount: ₹${totalAmount.toFixed(2)}\n\nProceed with the exact backend-verified worker rate?`,
            [
              { text: "Cancel Booking", style: "cancel", onPress: () => resolve(false) },
              { text: "Proceed to Pay", onPress: () => resolve(true) },
            ],
            { cancelable: false },
          );
        });
        if (!confirmed) throw new Error("Booking cancelled before payment.");
      }

      if (!createdBookingId || !razorpayOrder?.id || !razorpayOrder?.amount || !initiateResponse.data.razorpayKeyId) {
        throw new Error("Invalid payment order received.");
      }

      /*
       * Step 2:
       * Razorpay popup open karo.
       */
      const paymentData: any = await RazorpayCheckout.open({
        key: initiateResponse.data.razorpayKeyId,

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
        const cancellation = await cancelPendingBookingSafely(
          createdBookingId, Number(customer.id)
        );
        if (cancellation.code === "PAYMENT_RECEIVED") {
          Alert.alert("Payment Confirmed", "Gateway par payment mil gaya hai. Aapki booking open kar rahe hain.");
          router.replace("/user/active-booking");
          return;
        }
        if (!cancellation.cancelled) {
          Alert.alert(
            "Booking Status Uncertain",
            cancellation.message || "Worker reservation release confirm nahi hui. Dobara payment na karein; booking status check karein."
          );
          return;
        }
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

      const errorCode = error?.code || error?.response?.data?.code;

      if (errorCode === "POOL_RATE_CHANGED") {
        Alert.alert(
          "Pool Rate Updated",
          "Worker ke pool rates change hue hain. Payment se pehle updated price check karein.",
          [{ text: "Review Prices", onPress: () => router.replace("/user/book-worker-select-workers") }],
        );
        return;
      }

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

      Alert.alert(createdBookingId ? "Payment Cancelled" : "Booking Could Not Start", errorMessage);
    } finally {
      setIsPaying(false);
      paymentInProgressRef.current = false;
    }
  };

  const workerCount = Number(draft.workerCount || 1);

  const selectedWorkerTotal = Array.isArray(draft.selectedWorkers)
    ? draft.selectedWorkers.reduce((sum, worker) => {
        const amount = Number(worker.effectiveRate || 0);
        return sum + (Number.isFinite(amount) && amount > 0 ? amount : 0);
      }, 0)
    : 0;

  const selectedDuration = draft.duration || "FULL_DAY";
  const durationLabel = selectedDuration === "FULL_DAY" ? "Full Day" : `${selectedDuration} Hours`;
  const estimatePerWorker = selectedDuration === "FULL_DAY"
    ? unitPrice
    : Math.round(unitPrice * Number(selectedDuration) / 8 * 100) / 100;
  const totalAmount =
    draft.assignmentMode === "CUSTOMER_SELECT" && selectedWorkerTotal > 0
      ? Number(selectedWorkerTotal.toFixed(2))
      : Number((estimatePerWorker * workerCount).toFixed(2));

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

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.scrollBody,
            isSmallScreen && styles.contentSmall,
            isVerySmallScreen && styles.contentVerySmall,
          ]}
          showsVerticalScrollIndicator={false}
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
            <View style={styles.rowDivider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Work Duration</Text>
              <Text style={styles.detailValue}>{durationLabel}</Text>
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

          <TouchableOpacity
            accessibilityRole="button"
            style={styles.addressCard}
            onPress={() => setShowAddressModal(true)}
            disabled={isPaying}
          >
            <View style={styles.addressCardHeader}>
              <MapPin color="#16863A" size={19} />
              <Text style={styles.addressTitle}>Work Address *</Text>
              <Text style={styles.addressLink}>{selectedAddress ? "Change" : "Add / Choose"}</Text>
            </View>
            <Text style={styles.addressSummary} numberOfLines={3}>
              {selectedAddress
                ? [selectedAddress.addressLine, selectedAddress.city, selectedAddress.pincode].filter(Boolean).join(", ")
                : "No work address selected. Tap here to add one before payment."}
            </Text>
          </TouchableOpacity>

          <View style={styles.amountCard}>
            <Text style={styles.amountTitle}>{draft.assignmentMode === "CUSTOMER_SELECT" ? "Worker Total" : "Estimated Amount (confirmed before payment)"}</Text>
            <Text style={styles.amountValue}>₹{totalAmount}</Text>
          </View>
        </ScrollView>

        <Modal visible={showAddressModal} transparent animationType="slide" onRequestClose={() => setShowAddressModal(false)}>
          <View style={styles.addressOverlay}>
            <View style={styles.addressModal}>
              <View style={styles.addressModalHeader}>
                <Text style={styles.addressTitle}>Choose Work Address</Text>
                <TouchableOpacity onPress={() => setShowAddressModal(false)}><X size={22} color="#111827" /></TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 350 }}>
                {addresses.map((address) => (
                  <TouchableOpacity key={address.id} style={styles.addressOption} onPress={() => void handleSelectAddress(address)}>
                    <Text style={styles.addressOptionTitle}>{address.title || "Work Site"} {address.isDefault ? "· Default" : ""}</Text>
                    <Text style={styles.addressSummary}>{[address.addressLine, address.city, address.pincode].filter(Boolean).join(", ")}</Text>
                    {!(address.latitude && address.longitude) && <Text style={styles.addressMissingGps}>GPS missing — update required</Text>}
                  </TouchableOpacity>
                ))}
                {!addresses.length && <Text style={styles.addressSummary}>No saved address found. Add a work-site address using GPS.</Text>}
              </ScrollView>
              <TouchableOpacity
                style={styles.addressAddButton}
                onPress={() => {
                  setShowAddressModal(false);
                  router.push({ pathname: "/user/manage-addresses", params: { fromBooking: "1" } });
                }}
              >
                <Text style={styles.addressAddText}>+ Add / Manage Work Addresses</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <View style={[styles.footer, isSmallScreen && styles.footerSmall]}>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isPaying}
            style={[
              styles.paymentButton,
              isPaying && styles.paymentButtonDisabled,
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
  scrollBody: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 20, gap: 12 },
  addressCard: { backgroundColor: "#FFFFFF", borderRadius: 15, borderColor: "#B7E3C5", borderWidth: 1.4, padding: 13 },
  addressCardHeader: { flexDirection: "row", alignItems: "center", gap: 7 },
  addressTitle: { color: "#111827", fontSize: 15, fontWeight: "800", flex: 1 },
  addressLink: { color: "#16863A", fontSize: 12, fontWeight: "800" },
  addressSummary: { fontSize: 13, color: "#4B5563", lineHeight: 19, marginTop: 8 },
  addressOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.52)" },
  addressModal: { backgroundColor: "#FFFFFF", borderTopRightRadius: 23, borderTopLeftRadius: 23, padding: 19 },
  addressModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  addressOption: { borderColor: "#E5E7EB", borderWidth: 1, borderRadius: 12, marginVertical: 6, padding: 12 },
  addressOptionTitle: { fontSize: 14, fontWeight: "800", color: "#111827" },
  addressMissingGps: { fontSize: 11, fontWeight: "700", color: "#B45309", marginTop: 5 },
  addressAddButton: { backgroundColor: "#16863A", padding: 15, borderRadius: 13, marginTop: 14, alignItems: "center" },
  addressAddText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
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
