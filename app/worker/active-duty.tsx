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
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { API_URL } from "../../constants/api";

export default function ActiveDuty() {
  const [dutyData, setDutyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scanned, setScanned] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

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
      if (
        qrData.bookingId === dutyData.id &&
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

        if (verifyRes.data.success) {
          // Alert.alert(
          //   "Duty Started!",
          //   "Aapka kaam shuru ho gaya hai. Best of luck!",
          // );
          // Yahan se worker ko 'Work In Progress' screen par bhej sakte hain
          router.replace("/worker/duty-in-progress");
        }
      } else {
        Alert.alert("Invalid QR", "Yeh QR code is booking ka nahi hai.");
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

            <View style={{ flex: 1 }} />

            {/* BIG ACTION BUTTON */}
            <TouchableOpacity style={styles.scanBtn} onPress={openCamera}>
              <QrCode color="#fff" size={24} style={{ marginRight: 10 }} />
              <Text style={styles.scanBtnText}>SCAN QR TO START</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
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
});
