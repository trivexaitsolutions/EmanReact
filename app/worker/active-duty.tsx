// app/worker/active-duty.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, Stack } from "expo-router";
import { CheckCircle2, MapPin, QrCode, XCircle } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { API_URL } from "../../constants/api";

const workerIssueReasons = [
  "Client location par nahi hai",
  "Client phone receive nahi kar raha",
  "Wrong location",
  "Unsafe work condition",
  "Work different hai",
  "Payment issue",
  "Other",
];

export default function ActiveDuty() {
  const [dutyData, setDutyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scanned, setScanned] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedIssueReason, setSelectedIssueReason] = useState("");
  const [otherIssueText, setOtherIssueText] = useState("");
  const [continueWork, setContinueWork] = useState(true);

  useEffect(() => {
    fetchCurrentDuty();
  }, []);

  const fetchCurrentDuty = async () => {
    try {
      const session = await AsyncStorage.getItem("workerSession");
      if (session) {
        const parsedWorker = JSON.parse(session);
        // Note: Backend me hume ek api banani hogi jo worker ki ASSIGNED duty laye

        // Puraana: `${API_URL}/worker/current-duty/${parsedWorker.id}`
        const response = await axios.get(
          `${API_URL}/user/worker/current-duty/${parsedWorker.id}`,
        );
        if (response.data.success) {
          setDutyData(response.data.duty);
        } else {
          // Agar koi active duty nahi hai toh dashboard bhej do
          router.replace("/worker/dashboard");
        }
      }
    } catch (error) {
      console.log("Error fetching duty", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBarCodeScanned = async ({ type, data }: any) => {
    setScanned(true);
    setShowScanner(false);

    try {
      const qrData = JSON.parse(data);
      // Agar Customer ke QR me wahi bookingId hai jo worker ko assign hui hai
      // console.log("Scanned QR Data:", qrData);
      // console.l("Current Duty Data:", dutyData);
      if (
        // qrData.bookingId === dutyData.id &&
        qrData.action === "VERIFY_ARRIVAL"
      ) {
        const session = await AsyncStorage.getItem("workerSession");
        let parsedWorker;
        if (session) {
          parsedWorker = JSON.parse(session);
        } else {
          parsedWorker = null;
        }
        // Backend ko API call karenge 'status' update karne ke liye
        // Puraana: `${API_URL}/worker/verify-qr`
        const verifyRes = await axios.post(`${API_URL}/user/worker/verify-qr`, {
          bookingId: dutyData.id,
          workerId: parsedWorker.id, // Naya: Apna khud ka ID bhejo
        });

        console.log("verifyRes.data", verifyRes.data);

        if (verifyRes.data.success) {
          // Alert.alert(
          //   "Duty Started!",
          //   "Aapka kaam shuru ho gaya hai. Best of luck!",
          // );
          // Yahan se worker ko 'Work In Progress' screen par bhej sakte hain
          router.replace("/worker/duty-in-progress");
        }
      } else {
        Alert.alert("Invalid QR", "Yeh QR code is booking ka nahi hai 234.");
      }
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Sahi QR code scan karein.");
    }
  };

  const openCamera = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert(
          "Permission Required",
          "QR scan karne ke liye camera permission zaroori hai.",
        );
        return;
      }
    }
    setShowScanner(true);
    setScanned(false);
  };

  const handleSubmitWorkerIssue = async () => {
    if (!selectedIssueReason) {
      Alert.alert("Reason Required", "Please select cancellation reason.");
      return;
    }

    if (selectedIssueReason === "Other" && !otherIssueText.trim()) {
      Alert.alert("Description Required", "Please describe your issue.");
      return;
    }

    try {
      const session = await AsyncStorage.getItem("workerSession");

      if (!session) {
        Alert.alert("Session Error", "Please login again.");
        return;
      }

      const parsedWorker = JSON.parse(session);

      const issuePayload = {
        bookingId: dutyData.id,
        workerId: parsedWorker.id,
        raisedBy: "WORKER",
        reason: selectedIssueReason,
        description: selectedIssueReason === "Other" ? otherIssueText : "",
        continueWork,
        requestedAction: continueWork ? "CONTINUE_WORK" : "CANCEL_DUTY",
        penaltyAmount: continueWork ? 0 : 100,
      };

      console.log("WORKER ISSUE PAYLOAD:", issuePayload);

      const response = await axios.post(
        `${API_URL}/user/conflicts/create`,
        issuePayload,
      );

      if (response.data.success) {
        setShowIssueModal(false);
        setSelectedIssueReason("");
        setOtherIssueText("");
        setContinueWork(true);

        if (continueWork) {
          Alert.alert(
            "Issue Raised",
            "Your issue has been raised. You can continue your duty.",
          );
        } else {
          Alert.alert(
            "Duty Cancel Request Raised",
            "Your issue has been raised. ₹100 penalty note will be reviewed by admin.",
            [
              {
                text: "OK",
                onPress: () => router.replace("/worker/available"),
              },
            ],
          );
        }
      } else {
        Alert.alert(
          "Failed",
          response.data.message || "Issue raise nahi ho paya.",
        );
      }
    } catch (error: any) {
      console.log("Worker Issue Error:", error?.response?.data || error);

      Alert.alert(
        "Server Error",
        error?.response?.data?.message || "Server error while raising issue.",
      );
    }
  };

  if (isLoading)
    return <ActivityIndicator size="large" color="#000" style={{ flex: 1 }} />;
  if (!dutyData) return null;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Full Screen Scanner Overlay */}
      {showScanner && (
        <View style={StyleSheet.absoluteFillObject}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          />
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerBox} />
            <Text style={styles.scannerText}>
              Customer ka QR code is box me layen
            </Text>
            <TouchableOpacity
              style={styles.closeScannerBtn}
              onPress={() => setShowScanner(false)}
            >
              <XCircle color="#fff" size={40} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!showScanner && (
        <>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>New Duty Assigned</Text>
          </View>

          <View style={styles.content}>
            <View style={styles.alertBox}>
              <CheckCircle2 color="#fff" size={32} />
              <View style={{ marginLeft: 15 }}>
                <Text style={styles.alertTitle}>You have a new task!</Text>
                <Text style={styles.alertSub}>
                  Please reach the location ASAP.
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Customer Details</Text>
              <Text style={styles.customerName}>
                {dutyData.customer?.name || "Customer"}
              </Text>

              <View style={styles.divider} />

              <Text style={styles.label}>Naka / Location</Text>
              <View style={styles.row}>
                <MapPin color="#6B7280" size={20} />
                <Text style={styles.addressText}>
                  {dutyData.naka?.name || "Location"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.workerCancelBtn}
              onPress={() => setShowIssueModal(true)}
            >
              <Text style={styles.workerCancelBtnText}>
                Cancel / Raise Issue
              </Text>
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            {/* BIG ACTION BUTTON */}
            <TouchableOpacity style={styles.scanBtn} onPress={openCamera}>
              <QrCode color="#fff" size={24} style={{ marginRight: 10 }} />
              <Text style={styles.scanBtnText}>SCAN QR TO START</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <Modal
        visible={showIssueModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowIssueModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              <Text style={styles.modalTitle}>Cancel / Raise Issue</Text>

              <Text style={styles.modalSubTitle}>
                Please select why you want to cancel or raise an issue.
              </Text>

              <View style={styles.penaltyBox}>
                <Text style={styles.penaltyTitle}>Penalty Notice</Text>
                <Text style={styles.penaltyText}>
                  Agar worker duty cancel karta hai, to account se ₹100 penalty
                  fee deduct ho sakti hai.
                </Text>
              </View>

              <View style={styles.reasonList}>
                {workerIssueReasons.map((reason) => {
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
            </ScrollView>

            <View style={styles.continueBox}>
              <Text style={styles.continueTitle}>
                Do you want to continue this duty?
              </Text>

              <View style={styles.continueOptions}>
                <TouchableOpacity
                  style={[
                    styles.continueOption,
                    continueWork && styles.continueOptionSelected,
                  ]}
                  onPress={() => setContinueWork(true)}
                >
                  <Text
                    style={[
                      styles.continueOptionText,
                      continueWork && styles.continueOptionTextSelected,
                    ]}
                  >
                    Yes, Continue Work
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.continueOption,
                    !continueWork && styles.cancelOptionSelected,
                  ]}
                  onPress={() => setContinueWork(false)}
                >
                  <Text
                    style={[
                      styles.continueOptionText,
                      !continueWork && styles.cancelOptionTextSelected,
                    ]}
                  >
                    No, Cancel Duty
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowIssueModal(false);
                  setSelectedIssueReason("");
                  setOtherIssueText("");
                  setContinueWork(true);
                }}
              >
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSubmitWorkerIssue}
              >
                <Text style={styles.modalSubmitText}>Submit Issue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  content: { flex: 1, padding: 20 },

  alertBox: {
    backgroundColor: "#000",
    padding: 20,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  alertTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  alertSub: { color: "#9CA3AF", fontSize: 13, marginTop: 4 },

  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 5,
  },
  customerName: { fontSize: 22, fontWeight: "900", color: "#111827" },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 15 },
  row: { flexDirection: "row", alignItems: "center" },
  addressText: {
    fontSize: 16,
    color: "#4B5563",
    marginLeft: 8,
    fontWeight: "500",
  },

  scanBtn: {
    backgroundColor: "#10B981",
    paddingVertical: 20,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  scanBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
  },

  // Scanner UI
  scannerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  scannerBox: {
    width: 250,
    height: 250,
    borderWidth: 4,
    borderColor: "#10B981",
    backgroundColor: "transparent",
    borderRadius: 20,
  },
  scannerText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 30,
    fontWeight: "600",
  },
  closeScannerBtn: { position: "absolute", bottom: 50 },
  workerCancelBtn: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 16,
  },
  workerCancelBtnText: {
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
    maxHeight: "90%",
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
    marginBottom: 14,
    lineHeight: 20,
  },
  penaltyBox: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    padding: 14,
    borderRadius: 18,
    marginBottom: 16,
  },
  penaltyTitle: {
    color: "#C2410C",
    fontWeight: "900",
    fontSize: 14,
  },
  penaltyText: {
    color: "#9A3412",
    fontWeight: "700",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  reasonList: {
    gap: 10,
  },
  reasonOption: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    paddingVertical: 13,
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
    minHeight: 90,
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
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
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
  continueBox: {
    marginTop: 16,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    padding: 14,
  },
  continueTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 12,
  },
  continueOptions: {
    gap: 10,
  },
  continueOption: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 15,
  },
  continueOptionSelected: {
    borderColor: "#10B981",
    backgroundColor: "#ECFDF5",
  },
  cancelOptionSelected: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  continueOptionText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#374151",
    textAlign: "center",
  },
  continueOptionTextSelected: {
    color: "#047857",
  },
  cancelOptionTextSelected: {
    color: "#DC2626",
  },
});
