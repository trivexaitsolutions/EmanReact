// app/worker/active-duty.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack, useFocusEffect } from "expo-router";
import { CheckCircle2, MapPin } from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
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
import QRCode from "react-native-qrcode-svg";
import { API_URL } from "../../constants/api";

const MITRA_HOLD_DURATION_MS = 3000;

export default function ActiveDuty() {
  const [dutyData, setDutyData] = useState<any>(null);
  const [workerSession, setWorkerSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHoldingMitra, setIsHoldingMitra] = useState(false);
  const [mitraHoldProgress, setMitraHoldProgress] = useState(0);
  const [isConnectingMitra, setIsConnectingMitra] = useState(false);

  const mitraHoldTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mitraHoldIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mitraHoldCompletedRef = useRef(false);
  const cancellationRequestedRef = useRef(false);
  const navigationStartedRef = useRef(false);

  const clearMitraHoldTimers = useCallback(() => {
    if (mitraHoldTimeoutRef.current) {
      clearTimeout(mitraHoldTimeoutRef.current);
      mitraHoldTimeoutRef.current = null;
    }

    if (mitraHoldIntervalRef.current) {
      clearInterval(mitraHoldIntervalRef.current);
      mitraHoldIntervalRef.current = null;
    }
  }, []);

  const fetchCurrentDuty = useCallback(async () => {
    if (cancellationRequestedRef.current) return;

    try {
      const session = await AsyncStorage.getItem("workerSession");
      if (!session) {
        router.replace("/");
        return;
      }

      const parsedWorker = JSON.parse(session);
      setWorkerSession(parsedWorker);

      const response = await axios.get(
        `${API_URL}/user/worker/current-duty/${parsedWorker.id}`,
      );

      // A cancellation may complete while this request is still in flight.
      // In that case this old response must not trigger another navigation.
      if (cancellationRequestedRef.current) return;

      if (!response.data.success || !response.data.duty) {
        if (!navigationStartedRef.current) {
          navigationStartedRef.current = true;
          router.replace("/worker/dashboard");
        }
        return;
      }

      const latestDuty = response.data.duty;
      setDutyData(latestDuty);

      let arrivedWorkerIds: number[] = [];
      try {
        arrivedWorkerIds = JSON.parse(latestDuty.arrivedWorkerIds || "[]");
      } catch {
        arrivedWorkerIds = [];
      }

      if (arrivedWorkerIds.map(Number).includes(Number(parsedWorker.id))) {
        if (!navigationStartedRef.current) {
          navigationStartedRef.current = true;
          router.replace("/worker/duty-in-progress");
        }
      }
    } catch (error) {
      console.log("Error fetching duty", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      navigationStartedRef.current = false;
      void fetchCurrentDuty();

      const dutyPoller = setInterval(() => {
        void fetchCurrentDuty();
      }, 3000);

      return () => {
        clearInterval(dutyPoller);
        clearMitraHoldTimers();
      };
    }, [clearMitraHoldTimers, fetchCurrentDuty]),
  );

  const connectMitraAndCancelDuty = async () => {
    if (cancellationRequestedRef.current || isConnectingMitra) return;

    try {
      cancellationRequestedRef.current = true;
      setIsConnectingMitra(true);

      const session = await AsyncStorage.getItem("workerSession");
      if (!session) {
        cancellationRequestedRef.current = false;
        Alert.alert("Session Error", "Please login again.");
        return;
      }

      const parsedWorker = JSON.parse(session);
      const response = await axios.post(`${API_URL}/user/conflicts/create`, {
        bookingId: dutyData.id,
        workerId: parsedWorker.id,
        raisedBy: "WORKER",
        reason: "Worker requested Mitra assistance",
        description: "Direct request raised through the worker app.",
        continueWork: false,
        requestedAction: "CANCEL_DUTY",
      });

      if (!response.data.success) {
        cancellationRequestedRef.current = false;
        Alert.alert(
          "Failed",
          response.data.message || "Mitra request create nahi ho payi.",
        );
        return;
      }

      Alert.alert(
        "Mitra Connected",
        "Duty cancel ho gayi hai aur Mitra ko request bhej di gayi hai.",
        [
          {
            text: "OK",
            onPress: () => {
              if (navigationStartedRef.current) return;
              navigationStartedRef.current = true;
              router.replace("/worker/dashboard");
            },
          },
        ],
      );
    } catch (error: any) {
      cancellationRequestedRef.current = false;
      console.log("Worker Mitra Request Error:", error?.response?.data || error);
      Alert.alert(
        "Server Error",
        error?.response?.data?.message || "Mitra se connect nahi ho paya.",
      );
    } finally {
      setIsConnectingMitra(false);
      setIsHoldingMitra(false);
      setMitraHoldProgress(0);
      mitraHoldCompletedRef.current = false;
    }
  };

  const startMitraHold = () => {
    if (cancellationRequestedRef.current || isConnectingMitra || isHoldingMitra) {
      return;
    }

    clearMitraHoldTimers();
    mitraHoldCompletedRef.current = false;
    setIsHoldingMitra(true);
    setMitraHoldProgress(0);

    const holdStartedAt = Date.now();
    mitraHoldIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartedAt;
      setMitraHoldProgress(
        Math.min(100, (elapsed / MITRA_HOLD_DURATION_MS) * 100),
      );
    }, 50);

    mitraHoldTimeoutRef.current = setTimeout(() => {
      mitraHoldCompletedRef.current = true;
      clearMitraHoldTimers();
      setMitraHoldProgress(100);
      setIsHoldingMitra(false);
      void connectMitraAndCancelDuty();
    }, MITRA_HOLD_DURATION_MS);
  };

  const cancelMitraHold = () => {
    if (mitraHoldCompletedRef.current) return;

    clearMitraHoldTimers();
    setIsHoldingMitra(false);
    setMitraHoldProgress(0);
  };

  if (isLoading) {
    return <ActivityIndicator size="large" color="#000" style={{ flex: 1 }} />;
  }

  if (!dutyData) return null;

  const workerQrData = JSON.stringify({
    action: "VERIFY_WORKER_ARRIVAL",
    bookingId: Number(dutyData.id),
    workerId: Number(workerSession?.id),
  });

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>New Duty Assigned</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.alertBox}>
          <CheckCircle2 color="#fff" size={32} />
          <View style={styles.alertTextWrap}>
            <Text style={styles.alertTitle}>You have a new task!</Text>
            <Text style={styles.alertSub}>Please reach the location ASAP.</Text>
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

        <View style={styles.workerQrCard}>
          <Text style={styles.workerQrTitle}>Your Arrival QR</Text>
          <Text style={styles.workerQrDescription}>
            Location par pahunchne ke baad customer ko ye QR scan karne dein.
          </Text>
          <View style={styles.workerQrWrapper}>
            <QRCode
              value={workerQrData}
              size={170}
              color="#111827"
              backgroundColor="#FFFFFF"
            />
          </View>
          <Text style={styles.workerQrHint}>
            Booking #{dutyData.id} · Worker #{workerSession?.id}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.workerCancelBtn}
          activeOpacity={0.9}
          disabled={isConnectingMitra || cancellationRequestedRef.current}
          onPressIn={startMitraHold}
          onPressOut={cancelMitraHold}
        >
          <View
            pointerEvents="none"
            style={[
              styles.workerCancelProgress,
              { width: `${mitraHoldProgress}%` as `${number}%` },
            ]}
          />
          <View style={styles.workerCancelContent}>
            {isConnectingMitra ? (
              <ActivityIndicator color="#B91C1C" size="small" />
            ) : null}
            <Text style={styles.workerCancelBtnText}>
              Any issue, Connect Mitra
            </Text>
            <Text style={styles.workerCancelHint}>
              {isConnectingMitra
                ? "Sending request..."
                : isHoldingMitra
                  ? "Keep holding..."
                  : "Hold for 3 seconds"}
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
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
  content: { flexGrow: 1, padding: 20, paddingBottom: 36 },
  alertBox: {
    backgroundColor: "#000",
    padding: 20,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  alertTextWrap: { marginLeft: 15 },
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
    flex: 1,
    fontSize: 16,
    color: "#4B5563",
    marginLeft: 8,
    fontWeight: "500",
  },
  workerQrCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#A7F3D0",
    borderRadius: 24,
    borderWidth: 1.5,
    marginTop: 16,
    padding: 18,
  },
  workerQrTitle: { color: "#111827", fontSize: 19, fontWeight: "900" },
  workerQrDescription: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    marginTop: 6,
    maxWidth: 280,
    textAlign: "center",
  },
  workerQrWrapper: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginVertical: 15,
    padding: 12,
  },
  workerQrHint: { color: "#047857", fontSize: 12, fontWeight: "800" },
  workerCancelBtn: {
    position: "relative",
    overflow: "hidden",
    minHeight: 66,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  workerCancelProgress: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#FECACA",
  },
  workerCancelContent: {
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  workerCancelBtnText: {
    color: "#B91C1C",
    fontWeight: "900",
    fontSize: 15,
    letterSpacing: 0.2,
  },
  workerCancelHint: {
    color: "#991B1B",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
});
