import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack, useFocusEffect } from "expo-router";
import {
  CheckCircle2,
  Clock3,
  LogOut,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
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
  const [holdingSlot, setHoldingSlot] = useState<number | null>(null);
  const [slotHoldProgress, setSlotHoldProgress] = useState(0);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdCompletedRef = useRef(false);
  const slotHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slotHoldIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slotHoldCompletedRef = useRef(false);

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

  const clearSlotHoldTimers = useCallback(() => {
    if (slotHoldTimerRef.current) {
      clearTimeout(slotHoldTimerRef.current);
      slotHoldTimerRef.current = null;
    }
    if (slotHoldIntervalRef.current) {
      clearInterval(slotHoldIntervalRef.current);
      slotHoldIntervalRef.current = null;
    }
  }, []);

  const clearAllHoldTimers = useCallback(() => {
    clearHoldTimers();
    clearSlotHoldTimers();
  }, [clearHoldTimers, clearSlotHoldTimers]);

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
      return clearAllHoldTimers;
    }, [clearAllHoldTimers, fetchDashboardData]),
  );

  useEffect(() => {
    setupNotifications();
    return clearAllHoldTimers;
  }, [clearAllHoldTimers]);

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
    if (!isIdle || isHolding || holdingSlot !== null) return;
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


  const startShortPeriodHold = (hours: number) => {
    if (!isIdle || isHolding || holdingSlot !== null) return;

    clearSlotHoldTimers();
    slotHoldCompletedRef.current = false;
    setHoldingSlot(hours);
    setSlotHoldProgress(0);

    const holdStartedAt = Date.now();
    slotHoldIntervalRef.current = setInterval(() => {
      const elapsedMs = Date.now() - holdStartedAt;
      const progress = Math.min(100, (elapsedMs / 3000) * 100);
      setSlotHoldProgress(progress);
    }, 30);

    slotHoldTimerRef.current = setTimeout(async () => {
      slotHoldCompletedRef.current = true;
      clearSlotHoldTimers();
      setSlotHoldProgress(100);
      setHoldingSlot(null);
      await handleGoOnline("SHORT_PERIOD", hours);
    }, 3000);
  };

  const cancelShortPeriodHold = () => {
    if (!isIdle || slotHoldCompletedRef.current) return;

    clearSlotHoldTimers();
    setHoldingSlot(null);
    setSlotHoldProgress(0);
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

      <View style={styles.scrollContent}>
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

        {/* 4. Full Day Availability */}
        <Text style={styles.availabilitySectionLabel}>Full Day</Text>

        <TouchableOpacity
          activeOpacity={0.9}
          delayLongPress={0}
          onPress={isIdle ? undefined : returnToCurrentWork}
          onPressIn={isIdle ? startFullDayHold : undefined}
          onPressOut={isIdle ? cancelFullDayHold : undefined}
          style={styles.longPressContainer}
        >
          <View style={styles.longPressBackground}>
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
                    ? "Keep Holding..."
                    : "Hold 3 Seconds"
                  : "Return to Work"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* 5. Short Period Availability */}
        <Text style={styles.shortWorkLabel}>Some Hours Work</Text>
        <View style={styles.slotGrid}>
          {SLOT_OPTIONS.map((hours) => {
            const isThisSlotHolding = holdingSlot === hours;

            return (
              <TouchableOpacity
                key={hours}
                activeOpacity={0.9}
                delayLongPress={0}
                disabled={!isIdle}
                onPressIn={() => startShortPeriodHold(hours)}
                onPressOut={cancelShortPeriodHold}
                style={[
                  styles.slotCard,
                  !isIdle && styles.disabledOption,
                ]}
              >
                {isThisSlotHolding && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.slotProgressFill,
                      { height: `${slotHoldProgress}%` },
                    ]}
                  />
                )}

                <View style={styles.slotCardContent}>
                  <View style={styles.slotIconWrap}>
                    <Clock3 color="#10B981" size={24} />
                  </View>
                  <Text style={styles.slotHoursNumber}>{hours}</Text>
                  <Text style={styles.slotHoursText}>Hours</Text>
                  <Text style={styles.slotHoldHint}>
                    {isThisSlotHolding ? "Keep Holding..." : "Hold 3 sec"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <WorkerBottomNav active="home" />

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
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: "#FFF",
  },
  navTitle: { fontSize: 20, fontWeight: "800", color: "#111" },
  logoutBtn: { padding: 8, backgroundColor: "#FEF2F2", borderRadius: 10 },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },

  // Banner
  banner: {
    backgroundColor: "#FFD23F",
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  bannerText: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "600",
    letterSpacing: 1,
  },
  bannerTextBold: {
    fontSize: 20,
    color: "#111827",
    fontWeight: "900",
    letterSpacing: 1.5,
    marginTop: 2,
  },

  // Profile & Rating
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 18,
    marginBottom: 12,
  },
  avatarContainer: { marginRight: 12 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E5E7EB",
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { color: "#FFF", fontSize: 25, fontWeight: "bold" },
  ratingContainer: { flex: 1 },
  ratingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
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
    height: 10,
    borderRadius: 5,
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
    marginTop: 2,
  },
  gLabel: { fontSize: 10, color: "#9CA3AF", fontWeight: "600" },

  // Nakas
  nakaCard: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  nakaTitle: {
    color: "#047857",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 8,
  },
  nakaList: { marginTop: 2 },
  nakaItem: {
    fontSize: 14,
    color: "#065F46",
    fontWeight: "600",
    marginBottom: 3,
  },
  nakaBullet: { fontWeight: "800", color: "#10B981", marginRight: 5 },

  // Availability controls
  availabilitySectionLabel: {
    fontSize: 17,
    color: "#111827",
    fontWeight: "900",
    marginBottom: 6,
  },
  longPressContainer: {
    marginBottom: 12,
    overflow: "hidden",
    borderRadius: 100,
  },
  longPressBackground: {
    backgroundColor: "#111827",
    height: 58,
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
    width: 40,
    height: 40,
    borderRadius: 18,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  longPressInnerCircle: {
    width: 31,
    height: 31,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  longPressText: {
    flex: 1,
    color: "#FFF",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
    paddingRight: 40,
  },

  shortWorkLabel: {
    fontSize: 17,
    color: "#111827",
    fontWeight: "900",
    marginBottom: 6,
  },
  slotGrid: {
    flexDirection: "row",
    gap: 8,
  },
  slotCard: {
    flex: 1,
    minHeight: 112,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#D1FAE5",
    overflow: "hidden",
    position: "relative",
  },
  slotProgressFill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#D1FAE5",
  },
  slotCardContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    zIndex: 1,
  },
  slotIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  slotHoursNumber: {
    color: "#111827",
    fontSize: 26,
    lineHeight: 28,
    fontWeight: "900",
  },
  slotHoursText: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 1,
  },
  slotHoldHint: {
    color: "#047857",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 5,
    textAlign: "center",
  },
  disabledOption: {
    opacity: 0.45,
  },
});
