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
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!dutyData) return null;

  const workerQrData = JSON.stringify({
    action: "VERIFY_WORKER_ARRIVAL",
    bookingId: Number(dutyData.id),
    workerId: Number(workerSession?.id),
  });

  const workAddress =
    dutyData.workLocationText ||
    dutyData.address?.mapAddress ||
    dutyData.address?.addressLine ||
    "Location confirmed by customer";

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.headerCard}>
          <View style={styles.statusBadge}>
            <CheckCircle2 color="#047857" size={16} />
            <Text style={styles.statusBadgeText}>New Duty</Text>
          </View>

          <Text style={styles.headerTitle}>Reach Location</Text>
          <Text style={styles.headerSub}>
            Customer ko QR scan karna hai jab aap location par pahunch jao.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Customer</Text>
            <Text style={styles.infoValue}>
              {dutyData.customer?.name || "Customer"}
            </Text>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Location</Text>
            <View style={styles.locationRow}>
              <MapPin color="#10B981" size={18} />
              <Text style={styles.locationText}>{workAddress}</Text>
            </View>
          </View>
        </View>

        <View style={styles.qrCard}>
          <Text style={styles.cardTitle}>Arrival QR</Text>
          <Text style={styles.cardSub}>Customer ko ye QR scan karne dein.</Text>

          <View style={styles.qrWrapper}>
            <QRCode
              value={workerQrData}
              size={190}
              color="#111827"
              backgroundColor="#FFFFFF"
            />
          </View>

          <View style={styles.bookingChip}>
            <Text style={styles.bookingChipText}>Booking #{dutyData.id}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.issueButton}
          activeOpacity={0.9}
          disabled={isConnectingMitra || cancellationRequestedRef.current}
          onPressIn={startMitraHold}
          onPressOut={cancelMitraHold}
        >
          <View
            pointerEvents="none"
            style={[
              styles.issueProgress,
              { width: `${mitraHoldProgress}%` as `${number}%` },
            ]}
          />
          <View style={styles.issueContent}>
            {isConnectingMitra ? (
              <ActivityIndicator color="#B91C1C" size="small" />
            ) : null}
            <Text style={styles.issueTitle}>Any issue, Connect Mitra</Text>
            <Text style={styles.issueHint}>
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
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  content: {
    padding: 18,
    paddingTop: 18,
    paddingBottom: 34,
  },
  headerCard: {
    backgroundColor: "#0B7A55",
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
  },
  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#ECFDF5",
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 14,
    gap: 6,
  },
  statusBadgeText: {
    color: "#047857",
    fontSize: 12,
    fontWeight: "900",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900",
  },
  headerSub: {
    color: "#D1FAE5",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },
  infoBlock: {},
  infoLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  infoValue: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 28,
  },
  infoDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 16,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  locationText: {
    flex: 1,
    color: "#374151",
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "700",
    marginLeft: 8,
  },
  qrCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 18,
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "900",
  },
  cardSub: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 6,
  },
  qrWrapper: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    marginTop: 18,
    marginBottom: 14,
  },
  bookingChip: {
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bookingChipText: {
    color: "#047857",
    fontSize: 12,
    fontWeight: "900",
  },
  issueButton: {
    position: "relative",
    minHeight: 72,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    justifyContent: "center",
  },
  issueProgress: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: "#FECACA",
  },
  issueContent: {
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  issueTitle: {
    color: "#B91C1C",
    fontSize: 17,
    fontWeight: "900",
  },
  issueHint: {
    color: "#991B1B",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
});
