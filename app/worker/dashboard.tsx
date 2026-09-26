import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack, useFocusEffect } from "expo-router";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  LogOut
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import WorkerBottomNav from "../../components/worker-bottom-nav";
import { API_URL } from "../../constants/api";
import { registerForPushNotificationsAsync } from "../../utils/pushToken";

const SLOT_OPTIONS = [2, 3, 4];

type OperationalStatus = {
  type: "IDLE" | "POOL" | "BOOKING";
  label: string;
  actionLabel: string;
  bookingId?: number | null;
  bookingStatus?: string | null;
  returnScreen?: "available" | "active-duty" | "duty-in-progress" | null;
  availabilityType?: string | null;
};

export default function WorkerDashboard() {
  const [workerData, setWorkerData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdCompletedRef = useRef(false);

  const clearHoldTimers = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      const session = await AsyncStorage.getItem("workerSession");
      if (!session) {
        router.replace("/");
        return;
      }
      const parsedData = JSON.parse(session);
      const response = await axios.get(
        `${API_URL}/worker/dashboard/${parsedData.id}`,
      );

      if (response.data.success) {
        setWorkerData(response.data.data);
      }
    } catch (error) {
      console.log("Dashboard fetch error", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchDashboardData();
      return clearHoldTimers;
    }, [clearHoldTimers, fetchDashboardData]),
  );

  useEffect(() => {
    setupNotifications();
    return clearHoldTimers;
  }, [clearHoldTimers]);

  const setupNotifications = async () => {
    try {
      const session = await AsyncStorage.getItem("workerSession");
      if (!session) return;
      const parsedData = JSON.parse(session);
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await axios.post(`${API_URL}/worker/save-push-token`, {
          workerId: parsedData.id,
          pushToken: token,
        });
      }
    } catch (error: any) {
      console.log("Push token setup error:", error.message);
    }
  };

  const handleGoOnline = async (
    availabilityType: "FULL_DAY" | "SHORT_PERIOD" = "FULL_DAY",
    availabilityHours?: number,
  ) => {
    try {
      const session = await AsyncStorage.getItem("workerSession");
      if (!session) return;

      const parsedData = JSON.parse(session);
      const payload: any = {
        workerId: parsedData.id,
        status: true,
        availabilityType,
      };

      if (availabilityType === "SHORT_PERIOD") {
        payload.availabilityHours = availabilityHours;
      }

      const response = await axios.post(
        `${API_URL}/worker/update-status`,
        payload,
      );
      if (response.data.success) {
        router.replace("/worker/available");
      }
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.message || "Server error.");
    }
  };

  const operationalStatus: OperationalStatus =
    workerData?.operationalStatus || {
      type: "IDLE",
      label: "Not in pool",
    };

  const isIdle = operationalStatus.type === "IDLE";
  const isPool = operationalStatus.type === "POOL";
  const isBooking = operationalStatus.type === "BOOKING";

  const returnToCurrentWork = () => {
    if (isPool) router.replace("/worker/available");
    else if (isBooking) {
      if (operationalStatus.returnScreen === "duty-in-progress")
        router.replace("/worker/duty-in-progress");
      else router.replace("/worker/active-duty");
    }
  };

  const startFullDayHold = () => {
    if (!isIdle || isHolding) return;
    holdCompletedRef.current = false;
    setIsHolding(true);
    setHoldProgress(0);

    const holdStartedAt = Date.now();
    holdIntervalRef.current = setInterval(() => {
      const elapsedMs = Date.now() - holdStartedAt;
      const progress = Math.min(100, (elapsedMs / 3000) * 100);
      setHoldProgress(progress);
    }, 30);

    holdTimerRef.current = setTimeout(async () => {
      holdCompletedRef.current = true;
      clearHoldTimers();
      setHoldProgress(100);
      setIsHolding(false);
      await handleGoOnline();
    }, 3000);
  };

  const cancelFullDayHold = () => {
    if (!isIdle || holdCompletedRef.current) return;
    clearHoldTimers();
    setIsHolding(false);
    setHoldProgress(0);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.clear();
          router.replace("/");
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  // --- MOCK FALLBACKS FOR DEMO UI ---
  const firstName = workerData?.name?.split(" ")[0] || "Worker";
  const profilePic = workerData?.photoUrl || null;
  const ratingScore = workerData?.rating?.averageRating || 4.2; // Demo Data
  const nakasList =
    workerData?.nakas?.length > 0
      ? workerData.nakas
      : [
          { name: "Ambernath (E)" },
          { name: "Ambernath (W)" },
          { name: "Ladi Naka" },
        ]; // Demo Data
  const validityDate = workerData?.validity || "01/07/2024 - 01/07/2025"; // Demo Data

  // Gauge Logic
  let ratingLabel = "Excellent";
  let ratingColor = "#10B981";
  let indicatorPosition = "85%";

  if (ratingScore < 2) {
    ratingLabel = "Poor";
    ratingColor = "#EF4444";
    indicatorPosition = "12%";
  } else if (ratingScore < 3.5) {
    ratingLabel = "Fair";
    ratingColor = "#F97316";
    indicatorPosition = "37%";
  } else if (ratingScore < 4.5) {
    ratingLabel = "Good";
    ratingColor = "#EAB308";
    indicatorPosition = "62%";
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Fixed Logout Top Bar */}
      <View style={styles.topNav}>
        <Text style={styles.navTitle}>Dashboard</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <LogOut color="#EF4444" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        scrollEnabled={!isHolding}
      >
        {/* 1. Header Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerText}>WANT TO EARN?</Text>
          <Text style={styles.bannerTextBold}>BE READY</Text>
        </View>

        {/* 2. Profile & Rating */}
        <View style={styles.profileRow}>
          <View style={styles.avatarContainer}>
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{firstName.charAt(0)}</Text>
              </View>
            )}
          </View>

          <View style={styles.ratingContainer}>
            <View style={styles.ratingHeader}>
              <Text style={styles.ratingTitle}>Performance</Text>
              <Text style={[styles.ratingLabel, { color: ratingColor }]}>
                {ratingLabel} ({ratingScore})
              </Text>
            </View>

            {/* Custom Modern Gauge */}
            <View style={styles.gaugeTrack}>
              <View
                style={[styles.gaugeSegment, { backgroundColor: "#EF4444" }]}
              />
              <View
                style={[styles.gaugeSegment, { backgroundColor: "#F97316" }]}
              />
              <View
                style={[styles.gaugeSegment, { backgroundColor: "#EAB308" }]}
              />
              <View
                style={[styles.gaugeSegment, { backgroundColor: "#10B981" }]}
              />

              {/* Pointer */}
              <View
                style={[styles.gaugePointer, { left: indicatorPosition }]}
              />
            </View>
            <View style={styles.gaugeLabels}>
              <Text style={styles.gLabel}>Poor</Text>
              <Text style={styles.gLabel}>Exc</Text>
            </View>
          </View>
        </View>

        {/* 3. Decided Nakas */}
        <View style={styles.nakaCard}>
          <View style={styles.cardHeader}>
            <CheckCircle2 color="#047857" size={20} />
            <Text style={styles.nakaTitle}>MY DECIDED NAKA</Text>
          </View>
          <View style={styles.nakaList}>
            {nakasList.map((naka: any, index: number) => (
              <Text key={index} style={styles.nakaItem}>
                <Text style={styles.nakaBullet}>{index + 1}.</Text> {naka.name}
              </Text>
            ))}
          </View>
        </View>

        {/* 5. 3 Second Long Press Button */}
        <TouchableOpacity
          activeOpacity={0.9}
          delayLongPress={0}
          onPress={isIdle ? undefined : returnToCurrentWork}
          onPressIn={isIdle ? startFullDayHold : undefined}
          onPressOut={isIdle ? cancelFullDayHold : undefined}
          style={styles.longPressContainer}
        >
          <View style={styles.longPressBackground}>
            {/* Progress Fill */}
            {isHolding && (
              <View
                style={[styles.longPressFill, { width: `${holdProgress}%` }]}
              />
            )}

            <View style={styles.longPressContent}>
              <View style={styles.longPressCircle}>
                <View style={styles.longPressInnerCircle} />
              </View>
              <Text style={styles.longPressText}>
                {isIdle
                  ? isHolding
                    ? "Hold to Activate..."
                    : "3 second Long Press"
                  : "Return to Work"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* 6. Some Hours Work Button */}
        <TouchableOpacity
          activeOpacity={isIdle ? 0.8 : 1}
          disabled={!isIdle}
          onPress={() => setIsSlotModalOpen(true)}
          style={[styles.hoursButton, !isIdle && styles.disabledOption]}
        >
          <Clock3 color="#10B981" size={22} />
          <View style={styles.hoursBtnContent}>
            <Text style={styles.hoursBtnTitle}>Some Hours Work</Text>
            <Text style={styles.hoursBtnSub}>
              {isIdle ? "Select short shifts" : "Complete active duty first"}
            </Text>
          </View>
          <ChevronRight color="#9CA3AF" size={20} />
        </TouchableOpacity>
      </ScrollView>

      <WorkerBottomNav active="home" />

      {/* Slots Modal */}
      <Modal
        visible={isSlotModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsSlotModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.slotModal}>
            <View style={styles.modalHandle} />
            <Text style={styles.slotModalTitle}>Select Work Hours</Text>

            {SLOT_OPTIONS.map((hours) => (
              <TouchableOpacity
                key={hours}
                activeOpacity={0.8}
                onPress={async () => {
                  setIsSlotModalOpen(false);
                  await handleGoOnline("SHORT_PERIOD", hours);
                }}
                style={styles.slotOption}
              >
                <Text style={styles.slotOptionTitle}>{hours} Hours</Text>
                <ChevronRight color="#10B981" size={20} />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setIsSlotModalOpen(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: "#FFF",
  },
  navTitle: { fontSize: 20, fontWeight: "800", color: "#111" },
  logoutBtn: { padding: 8, backgroundColor: "#FEF2F2", borderRadius: 10 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  // Banner
  banner: {
    backgroundColor: "#FFD23F",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  bannerText: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "600",
    letterSpacing: 1,
  },
  bannerTextBold: {
    fontSize: 22,
    color: "#111827",
    fontWeight: "900",
    letterSpacing: 1.5,
    marginTop: 4,
  },

  // Profile & Rating
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 20,
    marginBottom: 20,
  },
  avatarContainer: { marginRight: 16 },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#E5E7EB",
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { color: "#FFF", fontSize: 28, fontWeight: "bold" },
  ratingContainer: { flex: 1 },
  ratingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  ratingTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
  },
  ratingLabel: { fontSize: 14, fontWeight: "800" },
  gaugeTrack: {
    flexDirection: "row",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    position: "relative",
  },
  gaugeSegment: { flex: 1 },
  gaugePointer: {
    position: "absolute",
    top: -3,
    width: 4,
    height: 18,
    backgroundColor: "#111",
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "#FFF",
  },
  gaugeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  gLabel: { fontSize: 10, color: "#9CA3AF", fontWeight: "600" },

  // Nakas
  nakaCard: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  nakaTitle: {
    color: "#047857",
    fontSize: 15,
    fontWeight: "800",
    marginLeft: 8,
  },
  nakaList: { marginTop: 4 },
  nakaItem: {
    fontSize: 16,
    color: "#065F46",
    fontWeight: "600",
    marginBottom: 6,
  },
  nakaBullet: { fontWeight: "800", color: "#10B981", marginRight: 5 },

  // Validity
  validityCard: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    alignItems: "center",
  },
  validityTitle: {
    color: "#B91C1C",
    fontSize: 15,
    fontWeight: "800",
    marginLeft: 8,
  },
  validityDate: {
    fontSize: 16,
    color: "#991B1B",
    fontWeight: "700",
    marginTop: 8,
  },

  // Long Press Button
  longPressContainer: {
    marginBottom: 16,
    overflow: "hidden",
    borderRadius: 100,
  },
  longPressBackground: {
    backgroundColor: "#111827",
    height: 65,
    borderRadius: 100,
    position: "relative",
    justifyContent: "center",
  },
  longPressFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#EF4444",
    borderRadius: 100,
  },
  longPressContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  longPressCircle: {
    width: 45,
    height: 45,
    borderRadius: 25,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  longPressInnerCircle: {
    width: 35,
    height: 35,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  longPressText: {
    flex: 1,
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    paddingRight: 45,
  },

  // Hours Button
  hoursButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  disabledOption: { opacity: 0.6 },
  hoursBtnContent: { flex: 1, marginLeft: 16 },
  hoursBtnTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  hoursBtnSub: { fontSize: 13, color: "#6B7280", marginTop: 2 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  slotModal: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: "#D1D5DB",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 20,
  },
  slotModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
    marginBottom: 20,
  },
  slotOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  slotOptionTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
  cancelButton: { marginTop: 10, padding: 15, alignItems: "center" },
  cancelButtonText: { color: "#6B7280", fontSize: 16, fontWeight: "700" },
});
