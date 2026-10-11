// app/worker/active-duty.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack, useFocusEffect } from "expo-router";
import { CheckCircle2, MapPin, PhoneCall } from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { API_URL } from "../../constants/api";

export default function ActiveDuty() {
  const [dutyData, setDutyData] = useState<any>(null);
  const [workerSession, setWorkerSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCallingMitra, setIsCallingMitra] = useState(false);

  const navigationStartedRef = useRef(false);

  const fetchCurrentDuty = useCallback(async () => {
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
      };
    }, [fetchCurrentDuty]),
  );

  const callAssignedMitra = async () => {
    if (isCallingMitra) return;

    try {
      setIsCallingMitra(true);

      let workerId = Number(workerSession?.id || 0);
      if (!workerId) {
        const session = await AsyncStorage.getItem("workerSession");
        if (session) {
          workerId = Number(JSON.parse(session)?.id || 0);
        }
      }

      if (!workerId) {
        Alert.alert("Error", "Worker session missing hai.");
        return;
      }

      const response = await axios.get(`${API_URL}/worker/profile/${workerId}`);
      const phone = response.data?.worker?.mitra?.phone;

      if (!response.data?.success || !phone) {
        Alert.alert("Mitra Not Found", "Assigned Mitra ka mobile number available nahi hai.");
        return;
      }

      const dialNumber = String(phone).replace(/[^\d+]/g, "");
      const dialUrl = `tel:${dialNumber}`;
      await Linking.openURL(dialUrl);
    } catch (error: any) {
      console.log("Call Mitra error:", error?.response?.data || error);
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Mitra ka number load nahi ho paya.",
      );
    } finally {
      setIsCallingMitra(false);
    }
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

          <View style={styles.manualCodeBox}>
            <Text style={styles.manualCodeLabel}>OR USE 6 DIGIT CODE</Text>
            <Text style={styles.manualCodeValue}>
              {String(dutyData.arrivalCode || "------")}
            </Text>
            <Text style={styles.manualCodeHint}>
              Camera problem ho to customer ye code enter kare. Code har 10 minute mein badalta hai.
            </Text>
          </View>

          <View style={styles.bookingChip}>
            <Text style={styles.bookingChipText}>Booking #{dutyData.id}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.callButton}
          activeOpacity={0.85}
          disabled={isCallingMitra}
          onPress={callAssignedMitra}
        >
          <View style={styles.callIconWrap}>
            {isCallingMitra ? (
              <ActivityIndicator color="#047857" size="small" />
            ) : (
              <PhoneCall color="#047857" size={25} />
            )}
          </View>
          <View style={styles.callTextWrap}>
            <Text style={styles.callTitle}>Call Mitra</Text>
            <Text style={styles.callSub}>Need help? Tap to call</Text>
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
  manualCodeBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  manualCodeLabel: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  manualCodeValue: {
    color: "#0B7A55",
    fontSize: 34,
    lineHeight: 42,
    fontWeight: "900",
    letterSpacing: 8,
    marginTop: 4,
  },
  manualCodeHint: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 2,
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
  callButton: {
    minHeight: 78,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  callIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  callTextWrap: {
    flex: 1,
  },
  callTitle: {
    color: "#111827",
    fontSize: 19,
    fontWeight: "900",
  },
  callSub: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
});
