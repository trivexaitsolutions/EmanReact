import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack, useFocusEffect } from "expo-router";
import { ArrowLeft, Check, MapPin, X } from "lucide-react-native";
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
  selectedWorkers?: Array<{
    id: number;
    name?: string;
    averageRating?: number;
  }>;
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

    if (!Array.isArray(draft.nakaIds) || draft.nakaIds.length === 0) {
      Alert.alert("Naka Missing", "Please select at least one nearby Naka.");

      return;
    }

    if (draft.nakaIds.length > 3) {
      Alert.alert("Invalid Naka Selection", "You can select maximum 3 Nakas.");

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

          nakaIds: draft.nakaIds.map((id) => Number(id)),

          skillId: Number(draft.skillId),

          workerCount: Number(draft.workerCount || 1),

          minRating: Number(draft.minRating || 0),

          addressId: Number(selectedAddress.id),

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

          selectedNakas: draft.nakaIds.join(","),
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

  const visibleAddresses = addresses.slice(0, 4);

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
        {/* HEADER */}

        <View style={[styles.header, isSmallScreen && styles.headerSmall]}>
          <TouchableOpacity
            style={styles.backButton}
            disabled={isPaying}
            onPress={() => router.back()}
          >
            <ArrowLeft size={30} color="#16863A" strokeWidth={2.5} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Book a Worker</Text>

          <Text style={styles.stepText}>Step 3 of 3</Text>
        </View>

        {/* PROGRESS */}

        <View
          style={[
            styles.progressContainer,
            isSmallScreen && styles.progressContainerSmall,
          ]}
        >
          <View style={styles.progressLineInactive} />

          <View style={styles.progressCircleDone}>
            <Text style={styles.progressDoneText}>1</Text>
          </View>

          <View style={styles.progressLineActive} />

          <View style={styles.progressCircleDone}>
            <Text style={styles.progressDoneText}>2</Text>
          </View>

          <View style={styles.progressLineActive} />

          <View style={styles.progressCircleActive}>
            <Text style={styles.progressActiveText}>3</Text>
          </View>

          <View style={styles.progressLineInactive} />
        </View>

        <View style={styles.divider} />

        {/* CONTENT */}

        <View
          style={[
            styles.content,
            isSmallScreen && styles.contentSmall,
            isVerySmallScreen && styles.contentVerySmall,
          ]}
        >
          <Text
            style={[styles.pageTitle, isSmallScreen && styles.pageTitleSmall]}
          >
            Confirm Address & Pay
          </Text>

          {/* ADDRESS */}

          {selectedAddress ? (
            <View
              style={[
                styles.addressCard,
                isSmallScreen && styles.addressCardSmall,
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  {selectedAddress.isDefault
                    ? "Default Address"
                    : "Work Address"}
                </Text>

                {addresses.length > 1 ? (
                  <TouchableOpacity
                    disabled={isPaying}
                    onPress={() => setShowAddressModal(true)}
                  >
                    <Text style={styles.changeText}>Change</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.addressTitleRow}>
                <View style={styles.addressBadge}>
                  <Text style={styles.addressBadgeText}>
                    {selectedAddress.title || "Address"}
                  </Text>
                </View>
              </View>

              <Text
                style={styles.addressText}
                numberOfLines={isSmallScreen ? 2 : 3}
              >
                {[
                  selectedAddress.addressLine,
                  selectedAddress.landmark,
                  selectedAddress.city,
                  selectedAddress.state,
                  selectedAddress.pincode,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </Text>

              <Text style={styles.addressStatus}>Using selected address</Text>
            </View>
          ) : (
            <View
              style={[
                styles.emptyAddressCard,
                isSmallScreen && styles.addressCardSmall,
              ]}
            >
              <MapPin size={25} color="#16863A" />

              <View style={styles.emptyAddressContent}>
                <Text style={styles.emptyAddressTitle}>No saved address</Text>

                <Text style={styles.emptyAddressText}>
                  Add a work address to continue.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.addAddressButton}
                onPress={() => router.push("/user/manage-addresses")}
              >
                <Text style={styles.addAddressButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* OVERVIEW */}

          <View
            style={[
              styles.overviewCard,
              isSmallScreen && styles.overviewCardSmall,
            ]}
          >
            <Text style={styles.cardTitle}>Booking Overview</Text>

            <View style={styles.overviewRow}>
              <Text style={styles.overviewLabel}>Skill</Text>

              <Text style={styles.overviewValue} numberOfLines={1}>
                {draft.skillName || "-"}
              </Text>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.overviewRow}>
              <Text style={styles.overviewLabel}>Minimum Rating</Text>

              <Text style={styles.overviewValue}>{ratingText}</Text>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.overviewRow}>
              <Text style={styles.overviewLabel}>Workers</Text>

              <Text style={styles.overviewValue}>{workerCount}</Text>
            </View>

            {draft.assignmentMode === "CUSTOMER_SELECT" ? (
              <>
                <View style={styles.rowDivider} />

                <View style={styles.overviewRow}>
                  <Text style={styles.overviewLabel}>Selected Workers</Text>

                  <Text
                    style={[styles.overviewValue, styles.nakaValue]}
                    numberOfLines={2}
                  >
                    {selectedWorkerNames || "-"}
                  </Text>
                </View>
              </>
            ) : null}

            <View style={styles.rowDivider} />

            <View style={styles.overviewRow}>
              <Text style={styles.overviewLabel}>Selected Nakas</Text>

              <Text
                style={[styles.overviewValue, styles.nakaValue]}
                numberOfLines={2}
              >
                {selectedNakaNames || "-"}
              </Text>
            </View>
          </View>

          {/* AMOUNT */}

          <View
            style={[styles.amountCard, isSmallScreen && styles.amountCardSmall]}
          >
            <Text style={styles.amountTitle}>Estimated Amount</Text>

            <Text style={styles.amountValue}>₹{totalAmount}</Text>

            <Text style={styles.amountHelper}>
              ₹{unitPrice} × {workerCount}{" "}
              {workerCount === 1 ? "worker" : "workers"}
            </Text>
          </View>
        </View>

        {/* FOOTER */}

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

      {/* ADDRESS MODAL */}

      <Modal
        visible={showAddressModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Address</Text>

              <TouchableOpacity onPress={() => setShowAddressModal(false)}>
                <X size={25} color="#171717" />
              </TouchableOpacity>
            </View>

            {visibleAddresses.map((address: any) => {
              const isSelected =
                Number(selectedAddress?.id) === Number(address.id);

              return (
                <TouchableOpacity
                  key={address.id}
                  style={[
                    styles.modalAddressItem,
                    isSelected && styles.modalAddressItemActive,
                  ]}
                  onPress={() => handleSelectAddress(address)}
                >
                  <View style={styles.modalAddressTextBox}>
                    <Text
                      style={[
                        styles.modalAddressTitle,
                        isSelected && styles.modalAddressTitleActive,
                      ]}
                    >
                      {address.title || "Saved Address"}
                    </Text>

                    <Text style={styles.modalAddressText} numberOfLines={2}>
                      {[address.addressLine, address.city, address.pincode]
                        .filter(Boolean)
                        .join(", ")}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.modalCheckCircle,
                      isSelected && styles.modalCheckCircleActive,
                    ]}
                  >
                    {isSelected ? (
                      <Check size={17} color="#FFFFFF" strokeWidth={3} />
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}

            {addresses.length > 4 ? (
              <Text style={styles.moreAddressText}>
                Showing first 4 addresses.
              </Text>
            ) : null}

            <TouchableOpacity
              style={styles.manageAddressButton}
              onPress={() => {
                setShowAddressModal(false);

                router.push("/user/manage-addresses");
              }}
            >
              <Text style={styles.manageAddressButtonText}>
                Manage Addresses
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    height: 105,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerSmall: {
    height: 78,
  },

  backButton: {
    width: 55,
    height: 55,
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#171717",
  },

  stepText: {
    minWidth: 90,
    textAlign: "right",
    fontSize: 17,
    fontWeight: "800",
    color: "#16863A",
  },

  progressContainer: {
    height: 75,
    paddingHorizontal: 26,
    flexDirection: "row",
    alignItems: "center",
  },

  progressContainerSmall: {
    height: 55,
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
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#E7E7E7",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 4,
  },

  progressCircleActive: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#16863A",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 4,
  },

  progressDoneText: {
    fontSize: 20,
    fontWeight: "500",
    color: "#8E8E8E",
  },

  progressActiveText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  divider: {
    height: 1,
    backgroundColor: "#E7E7E7",
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 10,
    justifyContent: "space-between",
  },

  contentSmall: {
    paddingTop: 13,
    paddingBottom: 6,
  },

  contentVerySmall: {
    paddingTop: 8,
  },

  pageTitle: {
    fontSize: 34,
    fontWeight: "900",
    color: "#003B1F",
    letterSpacing: -1,
  },

  pageTitleSmall: {
    fontSize: 27,
  },

  addressCard: {
    borderWidth: 1,
    borderColor: "#DEDEDE",
    borderRadius: 18,
    padding: 20,
    minHeight: 170,
  },

  addressCardSmall: {
    minHeight: 125,
    padding: 14,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  cardTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#171717",
  },

  changeText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#16863A",
  },

  addressTitleRow: {
    marginTop: 14,
  },

  addressBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#E8F7EC",
  },

  addressBadgeText: {
    fontSize: 15,
    color: "#16863A",
    fontWeight: "600",
  },

  addressText: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 23,
    color: "#272727",
  },

  addressStatus: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "700",
    color: "#16863A",
  },

  emptyAddressCard: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#DEDEDE",
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  emptyAddressContent: {
    flex: 1,
    marginLeft: 12,
  },

  emptyAddressTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#171717",
  },

  emptyAddressText: {
    fontSize: 13,
    color: "#777777",
    marginTop: 4,
  },

  addAddressButton: {
    paddingHorizontal: 17,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#16863A",
  },

  addAddressButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  overviewCard: {
    borderWidth: 1,
    borderColor: "#DEDEDE",
    borderRadius: 18,
    padding: 20,
    minHeight: 260,
  },

  overviewCardSmall: {
    padding: 14,
    minHeight: 205,
  },

  overviewRow: {
    minHeight: 45,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  overviewLabel: {
    fontSize: 15,
    color: "#555555",
  },

  overviewValue: {
    flex: 1,
    marginLeft: 20,
    textAlign: "right",
    fontSize: 15,
    fontWeight: "600",
    color: "#171717",
  },

  nakaValue: {
    fontSize: 13,
    lineHeight: 18,
  },

  rowDivider: {
    height: 1,
    backgroundColor: "#E7E7E7",
  },

  amountCard: {
    borderWidth: 1,
    borderColor: "#DEDEDE",
    borderRadius: 18,
    padding: 20,
    minHeight: 130,
    justifyContent: "center",
  },

  amountCardSmall: {
    padding: 14,
    minHeight: 98,
  },

  amountTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#171717",
  },

  amountValue: {
    marginTop: 7,
    fontSize: 36,
    fontWeight: "900",
    color: "#16863A",
  },

  amountHelper: {
    marginTop: 3,
    fontSize: 13,
    color: "#747474",
  },

  footer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 11,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#E7E7E7",
  },

  footerSmall: {
    paddingTop: 8,
    paddingBottom: 14,
  },

  paymentButton: {
    height: 63,
    borderRadius: 15,
    backgroundColor: "#16863A",
    alignItems: "center",
    justifyContent: "center",
  },

  paymentButtonDisabled: {
    opacity: 0.5,
  },

  paymentLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  paymentButtonText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 22,
  },

  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#171717",
  },

  modalAddressItem: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: "#DEDEDE",
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
  },

  modalAddressItemActive: {
    borderWidth: 2,
    borderColor: "#16863A",
    backgroundColor: "#F1FAF4",
  },

  modalAddressTextBox: {
    flex: 1,
    paddingRight: 12,
  },

  modalAddressTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#171717",
  },

  modalAddressTitleActive: {
    color: "#16863A",
  },

  modalAddressText: {
    fontSize: 12,
    lineHeight: 17,
    color: "#777777",
    marginTop: 4,
  },

  modalCheckCircle: {
    width: 31,
    height: 31,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#BDBDBD",
    alignItems: "center",
    justifyContent: "center",
  },

  modalCheckCircleActive: {
    borderColor: "#16863A",
    backgroundColor: "#16863A",
  },

  moreAddressText: {
    fontSize: 11,
    lineHeight: 16,
    color: "#777777",
    textAlign: "center",
    marginTop: 2,
  },

  manageAddressButton: {
    height: 48,
    marginTop: 12,
    borderRadius: 13,
    backgroundColor: "#F1FAF4",
    alignItems: "center",
    justifyContent: "center",
  },

  manageAddressButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#16863A",
  },
});
