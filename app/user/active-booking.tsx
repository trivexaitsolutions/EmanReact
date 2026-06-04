// app/user/active-booking.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack } from "expo-router";
import { CheckCircle2, Phone, XCircle } from "lucide-react-native";
// import React, { useEffect, useState } from "react";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { API_URL } from "../../constants/api";

const clientIssueReasons = [
  "Worker late hai",
  "Worker location par nahi aaya",
  "Wrong worker assigned",
  "Mujhe ab worker ki zarurat nahi hai",
  "Payment issue",
  "Other",
];

export default function ActiveBooking() {
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedIssueReason, setSelectedIssueReason] = useState("");
  const [otherIssueText, setOtherIssueText] = useState("");
  const [continueWork, setContinueWork] = useState(true);
  const [cancelType, setCancelType] = useState<"BOOKING" | "WORKER">("BOOKING");
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<number[]>([]);
  const [showWorkerCancelModal, setShowWorkerCancelModal] = useState(false);
  const [cancelledWorkerAlert, setCancelledWorkerAlert] = useState<any>(null);
  const shownCancelledConflictIdsRef = useRef<number[]>([]);
  const [bookingCancelledByUser, setBookingCancelledByUser] = useState(false);
  const bookingCancelledByUserRef = useRef(false);

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
          const latestBooking = response.data.booking;

          console.log("Active Booking Data:", latestBooking.arrivedWorkerIds);
          console.log(
            "Cancelled Worker Data:",
            latestBooking.cancelledConflictInfo,
          );

          setBooking(latestBooking);

          if (
            latestBooking.cancelledConflictInfo &&
            latestBooking.cancelledConflictInfo.length > 0
          ) {
            const latestCancelled = latestBooking.cancelledConflictInfo[0];

            if (latestCancelled?.conflictId) {
              const conflictId = Number(latestCancelled.conflictId);

              const alreadyShown =
                shownCancelledConflictIdsRef.current.includes(conflictId);

              if (!alreadyShown) {
                shownCancelledConflictIdsRef.current.push(conflictId);

                setCancelledWorkerAlert(latestCancelled);
                setShowWorkerCancelModal(true);
              }
            }
          }
        } else {
          // Agar user ne khud booking cancel ki hai to dashboard auto redirect mat karo
          if (bookingCancelledByUserRef.current) {
            return;
          }

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
        // router.replace("/user/dashboard");
        router.replace({
          pathname: "/user/rating",
          params: {
            bookingId: String(booking.id),
          },
        });
      }
    } catch (error) {
      console.log("Error completing work", error);
    }
  };

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const toggleWorkerSelection = (workerId: number) => {
    setSelectedWorkerIds((prev) => {
      if (prev.includes(workerId)) {
        return prev.filter((id) => id !== workerId);
      }

      return [...prev, workerId];
    });
  };

  const handleSubmitIssue = async () => {
    if (!selectedIssueReason) {
      alert("Please select cancellation reason.");
      return;
    }

    if (selectedIssueReason === "Other" && !otherIssueText.trim()) {
      alert("Please describe your issue.");
      return;
    }

    if (cancelType === "WORKER" && selectedWorkerIds.length === 0) {
      alert("Please select at least one worker.");
      return;
    }

    try {
      const description = selectedIssueReason === "Other" ? otherIssueText : "";

      // Case 1: Whole booking cancel / issue
      if (cancelType === "BOOKING") {
        const issuePayload = {
          bookingId: booking.id,
          raisedBy: "CLIENT",
          reason: selectedIssueReason,
          description,
          continueWork: false,
          requestedAction: "CANCEL_BOOKING",
        };

        console.log("CLIENT BOOKING CANCEL PAYLOAD:", issuePayload);

        const response = await axios.post(
          `${API_URL}/user/conflicts/create`,
          issuePayload,
        );

        if (!response.data.success) {
          alert(response.data.message || "Booking cancel request failed.");
          return;
        }

        setShowIssueModal(false);
        setSelectedIssueReason("");
        setOtherIssueText("");
        setContinueWork(true);
        setCancelType("BOOKING");
        setSelectedWorkerIds([]);

        bookingCancelledByUserRef.current = true;
        setBookingCancelledByUser(true);

        setBooking({
          ...booking,
          status: "CANCELLED",
          cancelledWorkerIds: JSON.stringify(
            booking.workers.map((worker: any) => Number(worker.id)),
          ),
        });

        alert("Your booking cancellation request has been raised.");
        return;
      }

      // Case 2: Specific worker cancel
      if (cancelType === "WORKER") {
        for (const workerId of selectedWorkerIds) {
          const issuePayload = {
            bookingId: booking.id,
            workerId,
            raisedBy: "CLIENT",
            reason: selectedIssueReason,
            description,
            continueWork: true,
            requestedAction: "CANCEL_WORKER",
          };

          console.log("CLIENT WORKER CANCEL PAYLOAD:", issuePayload);

          const response = await axios.post(
            `${API_URL}/user/conflicts/create`,
            issuePayload,
          );

          if (!response.data.success) {
            alert(response.data.message || "Worker cancel request failed.");
            return;
          }
        }
      }

      setShowIssueModal(false);
      setSelectedIssueReason("");
      setOtherIssueText("");
      setContinueWork(true);
      setCancelType("BOOKING");
      setSelectedWorkerIds([]);

      await fetchActiveBooking();

      alert(
        cancelType === "BOOKING"
          ? "Your booking cancellation request has been raised."
          : "Selected worker cancellation request has been raised.",
      );
    } catch (error: any) {
      console.log("Client Issue Error:", error?.response?.data || error);

      alert(
        error?.response?.data?.message ||
          "Server error while raising cancellation request.",
      );
    }
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

  let cancelledList: any[] = [];

  try {
    cancelledList = JSON.parse(booking.cancelledWorkerIds || "[]");
  } catch (e) {
    cancelledList = [];
  }

  const cancelledIds = cancelledList.map(Number);

  const activeWorkers = booking.workers.filter(
    (worker: any) => !cancelledIds.includes(Number(worker.id)),
  );

  const allWorkersCancelled =
    booking.workers.length > 0 && activeWorkers.length === 0;

  const isBookingCancelled =
    booking.status === "CANCELLED" || bookingCancelledByUser;

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

        <TouchableOpacity
          style={styles.raiseIssueBtn}
          onPress={() => setShowIssueModal(true)}
        >
          <Text style={styles.raiseIssueBtnText}>Cancel / Raise Issue</Text>
        </TouchableOpacity>

        {/* WORKER LIST */}
        <Text style={styles.sectionTitle}>
          Assigned Workers ({booking.workers.length})
        </Text>

        {/* Worker List ke andar Tick mark dikhane ke liye */}
        {booking.workers.map((worker: any) => {
          let arrivedList: any[] = [];
          let cancelledList: any[] = [];

          try {
            arrivedList = JSON.parse(booking.arrivedWorkerIds || "[]");
          } catch (e) {
            arrivedList = [];
          }

          try {
            cancelledList = JSON.parse(booking.cancelledWorkerIds || "[]");
          } catch (e) {
            cancelledList = [];
          }

          const hasArrived = arrivedList
            .map(Number)
            .includes(Number(worker.id));
          const isCancelled = cancelledList
            .map(Number)
            .includes(Number(worker.id));

          return (
            <View
              key={worker.id}
              style={[
                styles.workerCard,
                isCancelled && styles.workerCardCancelled,
              ]}
            >
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
              {isCancelled ? (
                <View style={styles.cancelledBadge}>
                  <XCircle color="#fff" size={15} />
                  <Text style={styles.cancelledBadgeText}>Cancelled</Text>
                </View>
              ) : hasArrived ? (
                <View style={styles.arrivedBadge}>
                  <Text style={styles.arrivedBadgeText}>Arrived ✅</Text>
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
        {/* QR Code vs Complete Button Logic */}
        {/* QR Code vs Complete Button Logic */}
        {isBookingCancelled ? (
          <View style={styles.allCancelledCard}>
            <Text style={styles.allCancelledTitle}>Booking Cancelled</Text>

            <Text style={styles.allCancelledDesc}>
              Aapki booking cancellation request submit ho gayi hai. Aap
              dashboard par ja sakte hain ya new booking create kar sakte hain.
            </Text>

            <View style={styles.cancelledActions}>
              <TouchableOpacity
                style={styles.dashboardBtn}
                onPress={() => router.replace("/user/dashboard")}
              >
                <Text style={styles.dashboardBtnText}>Go to Dashboard</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.newBookingBtn}
                onPress={() => router.replace("/user/create-booking")}
              >
                <Text style={styles.newBookingBtnText}>New Booking</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : allWorkersCancelled ? (
          <View style={styles.allCancelledCard}>
            <Text style={styles.allCancelledTitle}>All Workers Cancelled</Text>

            <Text style={styles.allCancelledDesc}>
              Is booking ke saare workers cancel ho chuke hain. Aap new booking
              create kar sakte hain ya dashboard par wapas ja sakte hain.
            </Text>

            <View style={styles.cancelledActions}>
              <TouchableOpacity
                style={styles.dashboardBtn}
                onPress={() => router.replace("/user/dashboard")}
              >
                <Text style={styles.dashboardBtnText}>Go to Dashboard</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.newBookingBtn}
                onPress={() => router.replace("/user/create-booking")}
              >
                <Text style={styles.newBookingBtnText}>New Booking</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : booking.status === "IN_PROGRESS" ? (
          <View style={styles.completeCard}>
            <Text style={styles.qrTitle}>Work in Progres</Text>
            <Text style={styles.qrDesc}>
              Active workers have arrived and started their duty.
            </Text>

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

      <Modal
        visible={showIssueModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowIssueModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancel / Raise Issue</Text>
            <Text style={styles.modalSubTitle}>
              Please select why you want to cancel or raise an issue.
            </Text>

            <View style={styles.cancelTypeBox}>
              <Text style={styles.cancelTypeTitle}>
                What do you want to cancel?
              </Text>

              <View style={styles.cancelTypeOptions}>
                <TouchableOpacity
                  style={[
                    styles.cancelTypeOption,
                    cancelType === "BOOKING" && styles.cancelTypeOptionSelected,
                  ]}
                  onPress={() => {
                    setCancelType("BOOKING");
                    setSelectedWorkerIds([]);
                  }}
                >
                  <Text
                    style={[
                      styles.cancelTypeText,
                      cancelType === "BOOKING" && styles.cancelTypeTextSelected,
                    ]}
                  >
                    Whole Booking
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.cancelTypeOption,
                    cancelType === "WORKER" && styles.cancelTypeOptionSelected,
                  ]}
                  onPress={() => setCancelType("WORKER")}
                >
                  <Text
                    style={[
                      styles.cancelTypeText,
                      cancelType === "WORKER" && styles.cancelTypeTextSelected,
                    ]}
                  >
                    Specific Worker
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {cancelType === "WORKER" && (
              <View style={styles.workerSelectBox}>
                <Text style={styles.workerSelectTitle}>
                  Select worker(s) to cancel
                </Text>

                {booking.workers.map((worker: any) => {
                  const isSelected = selectedWorkerIds.includes(
                    Number(worker.id),
                  );

                  return (
                    <TouchableOpacity
                      key={worker.id}
                      style={[
                        styles.workerSelectItem,
                        isSelected && styles.workerSelectItemSelected,
                      ]}
                      onPress={() => toggleWorkerSelection(Number(worker.id))}
                    >
                      <View>
                        <Text
                          style={[
                            styles.workerSelectName,
                            isSelected && styles.workerSelectNameSelected,
                          ]}
                        >
                          {worker.name || "Worker"}
                        </Text>

                        <Text style={styles.workerSelectSub}>
                          Tap to {isSelected ? "remove" : "select"}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.workerSelectCheck,
                          isSelected && styles.workerSelectCheckSelected,
                        ]}
                      >
                        {isSelected ? "✓" : "+"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={styles.reasonList}>
              {clientIssueReasons.map((reason) => {
                const isSelected = selectedIssueReason === reason;

                return (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.reasonOption,
                      isSelected && styles.reasonOptionSelected,
                    ]}
                    onPress={() => setSelectedIssueReason(reason)}
                  >
                    <Text
                      style={[
                        styles.reasonText,
                        isSelected && styles.reasonTextSelected,
                      ]}
                    >
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedIssueReason === "Other" && (
              <TextInput
                style={styles.issueTextArea}
                placeholder="Describe your issue..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                value={otherIssueText}
                onChangeText={setOtherIssueText}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowIssueModal(false);
                  setSelectedIssueReason("");
                  setOtherIssueText("");
                  setContinueWork(true);
                  setCancelType("BOOKING");
                  setSelectedWorkerIds([]);
                }}
              >
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSubmitIssue}
              >
                <Text style={styles.modalSubmitText}>Submit Issue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showWorkerCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWorkerCancelModal(false)}
      >
        <View style={styles.workerCancelModalOverlay}>
          <View style={styles.workerCancelModalCard}>
            <View style={styles.cancelIconCircle}>
              <Text style={styles.cancelIconText}>×</Text>
            </View>

            <Text style={styles.workerCancelModalTitle}>
              Worker Cancelled Duty
            </Text>

            <Text style={styles.workerCancelModalDesc}>
              {cancelledWorkerAlert?.workerName || "Worker"} ne duty cancel ki
              hai.
            </Text>

            <View style={styles.cancelInfoBox}>
              <View style={styles.cancelInfoRow}>
                <Text style={styles.cancelInfoLabel}>Reason</Text>
                <Text style={styles.cancelInfoValue}>
                  {cancelledWorkerAlert?.reason || "-"}
                </Text>
              </View>

              <View style={styles.cancelInfoRow}>
                <Text style={styles.cancelInfoLabel}>Worker Amount</Text>
                <Text style={styles.cancelInfoAmount}>
                  ₹{cancelledWorkerAlert?.amount || 0}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.workerCancelModalBtn}
              onPress={() => setShowWorkerCancelModal(false)}
            >
              <Text style={styles.workerCancelModalBtnText}>Okay, Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  raiseIssueBtn: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 25,
  },
  raiseIssueBtnText: {
    color: "#DC2626",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 0.5,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    padding: 22,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
  },
  modalSubTitle: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 6,
    marginBottom: 18,
    lineHeight: 20,
  },
  reasonList: {
    gap: 10,
  },
  reasonOption: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  reasonOptionSelected: {
    borderColor: "#10B981",
    backgroundColor: "#ECFDF5",
  },
  reasonText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "800",
  },
  reasonTextSelected: {
    color: "#047857",
  },
  issueTextArea: {
    marginTop: 14,
    minHeight: 110,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    padding: 14,
    textAlignVertical: "top",
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  modalCancelText: {
    color: "#374151",
    fontWeight: "900",
  },
  modalSubmitBtn: {
    flex: 1.4,
    backgroundColor: "#EF4444",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  modalSubmitText: {
    color: "#fff",
    fontWeight: "900",
  },

  workerCardCancelled: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
  },

  arrivedBadge: {
    backgroundColor: "#10B981",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 20,
  },

  arrivedBadgeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },

  cancelledBadge: {
    backgroundColor: "#EF4444",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  cancelledBadgeText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },

  allCancelledCard: {
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 24,
    alignItems: "center",
    marginTop: 15,
    borderWidth: 2,
    borderColor: "#EF4444",
  },
  allCancelledTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#DC2626",
  },
  allCancelledDesc: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: 14,
    marginVertical: 12,
    lineHeight: 21,
  },
  cancelledActions: {
    width: "100%",
    gap: 12,
    marginTop: 10,
  },
  dashboardBtn: {
    backgroundColor: "#111827",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  dashboardBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },
  newBookingBtn: {
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  newBookingBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },

  workerCancelModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
  },
  workerCancelModalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
  },
  cancelIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  cancelIconText: {
    fontSize: 44,
    lineHeight: 48,
    color: "#DC2626",
    fontWeight: "900",
  },
  workerCancelModalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },
  workerCancelModalDesc: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "700",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 18,
  },
  cancelInfoBox: {
    width: "100%",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
  },
  cancelInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
  },
  cancelInfoLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#6B7280",
  },
  cancelInfoValue: {
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
    textAlign: "right",
    flex: 1,
    marginLeft: 15,
  },
  cancelInfoAmount: {
    fontSize: 16,
    fontWeight: "900",
    color: "#DC2626",
  },
  workerCancelModalBtn: {
    width: "100%",
    backgroundColor: "#EF4444",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  workerCancelModalBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  cancelTypeBox: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  cancelTypeTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 12,
  },
  cancelTypeOptions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelTypeOption: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingVertical: 13,
    borderRadius: 15,
    alignItems: "center",
  },
  cancelTypeOptionSelected: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  cancelTypeText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#374151",
  },
  cancelTypeTextSelected: {
    color: "#DC2626",
  },

  workerSelectBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  workerSelectTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 12,
  },
  workerSelectItem: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    padding: 13,
    borderRadius: 15,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  workerSelectItemSelected: {
    borderColor: "#10B981",
    backgroundColor: "#ECFDF5",
  },
  workerSelectName: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },
  workerSelectNameSelected: {
    color: "#047857",
  },
  workerSelectSub: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    marginTop: 3,
  },
  workerSelectCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
    color: "#374151",
    textAlign: "center",
    lineHeight: 28,
    fontWeight: "900",
  },
  workerSelectCheckSelected: {
    backgroundColor: "#10B981",
    color: "#FFFFFF",
  },
});
