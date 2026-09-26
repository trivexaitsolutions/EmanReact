import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack, useFocusEffect } from "expo-router";
import {
  BriefcaseBusiness,
  CalendarX,
  ChevronRight,
  Clock3,
  LogOut,
  MousePointerClick,
  Wallet,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  const fetchDashboardData = useCallback(async (silent = false) => {
    try {
      if (silent) setIsRefreshing(true);

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
      if (!silent) {
        Alert.alert("Unable to load", "Dashboard data load nahi ho paya.");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchDashboardData(true);
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
      const payload: {
        workerId: number;
        status: boolean;
        availabilityType: "FULL_DAY" | "SHORT_PERIOD";
        availabilityHours?: number;
      } = {
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

      if (!response.data.success) return;

      router.replace("/worker/available");
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Server se connect nahi ho paya.",
      );
    }
  };

  const operationalStatus: OperationalStatus =
    workerData?.operationalStatus || {
      type: "IDLE",
      label: "Not in pool",
      actionLabel: "Join Full Day Pool",
      returnScreen: null,
    };

  const isIdle = operationalStatus.type === "IDLE";
  const isPool = operationalStatus.type === "POOL";
  const isBooking = operationalStatus.type === "BOOKING";

  const returnToCurrentWork = () => {
    if (isPool) {
      router.replace("/worker/available");
      return;
    }

    if (isBooking) {
      if (operationalStatus.returnScreen === "duty-in-progress") {
        router.replace("/worker/duty-in-progress");
      } else {
        router.replace("/worker/active-duty");
      }
    }
  };

  const startFullDayHold = () => {
    if (!isIdle || isHolding) return;

    holdCompletedRef.current = false;
    setIsHolding(true);
    setHoldProgress(0);

    let progress = 0;
    holdIntervalRef.current = setInterval(() => {
      progress += 1;
      if (progress <= 100) setHoldProgress(progress);
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
    Alert.alert("Logout", "Logout karein?", [
      { text: "Nahi", style: "cancel" },
      {
        text: "Haan",
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
        <ActivityIndicator size="large" color="#087C49" />
        <Text style={styles.loaderText}>Loading your dashboard...</Text>
      </View>
    );
  }

  const firstName = workerData?.name?.split(" ")[0] || "Worker";
  const walletBalance = Number(workerData?.walletBalance || 0);
  const dateObj = new Date();
  const dateLabel = `${dateObj.toLocaleDateString("en-US", { weekday: "long" })}, ${dateObj.getDate()} ${dateObj.toLocaleDateString("en-US", { month: "long" })}`;

  const primaryPrompt = isBooking
    ? `Booking #${operationalStatus.bookingId || ""}`
    : isPool
      ? "You are already available today"
      : "Hold 3 sec to go Available";

  const primaryTitle = isBooking
    ? "Return to\nBooking"
    : isPool
      ? "Return to\nPool"
      : "Full Day\nPool";

  const primarySubtitle = isBooking
    ? operationalStatus.label
    : isPool
      ? "Continue waiting for work"
      : "Be visible for full day work";

  const circleText = isIdle
    ? isHolding
      ? `${holdProgress}%`
      : "Hold to\nActivate"
    : "Tap to\nReturn";

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.greeting}>
              Good Morning, <Text style={styles.greetingName}>{firstName}</Text>{" "}
              👋
            </Text>
            <Text style={styles.dateText}>{dateLabel}</Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Log out"
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            <LogOut color="#6B7280" size={22} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.statusStrip}>
          <View
            style={[
              styles.statusDot,
              isBooking && styles.statusDotBooking,
              isIdle && styles.statusDotIdle,
            ]}
          />
          <Text style={styles.statusLabel}>
            Status: <Text style={styles.statusValue}>{operationalStatus.label}</Text>
          </Text>
          {isRefreshing ? (
            <ActivityIndicator size="small" color="#087C49" />
          ) : null}
        </View>

        <TouchableOpacity
          activeOpacity={0.92}
          delayLongPress={0}
          onPress={isIdle ? undefined : returnToCurrentWork}
          onPressIn={isIdle ? startFullDayHold : undefined}
          onPressOut={isIdle ? cancelFullDayHold : undefined}
          style={styles.fullDayCard}
        >
          <View style={styles.fullDayTextSide}>
            <Text style={styles.fullDayPrompt}>{primaryPrompt}</Text>
            <Text style={styles.fullDayTitle}>{primaryTitle}</Text>
            <Text style={styles.fullDaySubtitle}>{primarySubtitle}</Text>
          </View>

          <View style={styles.holdCircleContainer}>
            <View
              style={[
                styles.holdCircleBorder,
                isHolding && {
                  borderColor: `rgba(255, 255, 255, ${0.3 + (holdProgress / 100) * 0.7})`,
                },
              ]}
            >
              <View style={styles.holdCircleIndicator} />
              <MousePointerClick color="#FFFFFF" size={32} strokeWidth={2} />
              <Text style={styles.holdCircleText}>{circleText}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={isIdle ? 0.88 : 1}
          disabled={!isIdle}
          onPress={() => setIsSlotModalOpen(true)}
          style={[styles.rowCard, !isIdle && styles.rowCardDisabled]}
        >
          <View style={styles.lightIconContainer}>
            <Clock3 color="#087C49" size={26} strokeWidth={2.2} />
          </View>
          <View style={styles.rowCardCopy}>
            <Text style={styles.rowCardTitle}>Some Hours Work</Text>
            <Text style={styles.rowCardSubtitle}>
              {isIdle ? "Quick slots" : "Finish/leave current status first"}
            </Text>
          </View>
          <ChevronRight color="#087C49" size={24} strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.gridRow}>
          <QuickAction
            icon={<BriefcaseBusiness color="#087C49" size={24} strokeWidth={2.2} />}
            title="My Jobs"
            subtitle="View booking history"
            onPress={() => router.push("/worker/history")}
          />
          <QuickAction
            icon={<Wallet color="#087C49" size={24} strokeWidth={2.2} />}
            title="Wallet"
            subtitle={`₹${walletBalance.toLocaleString("en-IN")}`}
            onPress={() => router.push("/worker/wallet")}
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.rowCardBordered}
          onPress={isBooking ? returnToCurrentWork : () => router.push("/worker/history")}
        >
          <View style={styles.outlineIconContainer}>
            <CalendarX color="#087C49" size={24} strokeWidth={2.2} />
          </View>
          <View style={styles.rowCardCopy}>
            <Text style={styles.rowCardTitle}>Today</Text>
            <Text style={styles.rowCardSubtitle}>
              {isBooking
                ? `Booking #${operationalStatus.bookingId} · ${operationalStatus.label}`
                : isPool
                  ? operationalStatus.label
                  : "No duty assigned"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <WorkerBottomNav active="home" />

      <Modal
        visible={isSlotModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSlotModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.slotModal}>
            <View style={styles.modalHandle} />
            <Text style={styles.slotModalTitle}>Choose your work hours</Text>
            <Text style={styles.slotModalSubtitle}>
              Select how long you would like to be available today.
            </Text>

            {SLOT_OPTIONS.map((hours) => (
              <TouchableOpacity
                key={hours}
                activeOpacity={0.85}
                onPress={async () => {
                  setIsSlotModalOpen(false);
                  await handleGoOnline("SHORT_PERIOD", hours);
                }}
                style={styles.slotOption}
              >
                <View>
                  <Text style={styles.slotOptionTitle}>Next {hours} Hours</Text>
                  <Text style={styles.slotOptionSubtitle}>
                    Join the quick-work pool
                  </Text>
                </View>
                <ChevronRight color="#087C49" size={24} />
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

function QuickAction({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      style={styles.gridCard}
    >
      <View style={styles.gridIconContainer}>{icon}</View>
      <Text style={styles.gridTitle}>{title}</Text>
      <View style={styles.gridFooter}>
        <Text numberOfLines={1} style={styles.gridSubtitle}>
          {subtitle}
        </Text>
        <ChevronRight color="#087C49" size={16} strokeWidth={2.5} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  loaderText: { color: "#6B7280", fontSize: 14, fontWeight: "600", marginTop: 12 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTextGroup: { flex: 1 },
  greeting: { color: "#111827", fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  greetingName: { color: "#087C49" },
  dateText: { color: "#6B7280", fontSize: 15, fontWeight: "500", marginTop: 4 },
  logoutButton: { padding: 8, backgroundColor: "#F3F4F6", borderRadius: 20 },
  statusStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5FAF7",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  statusDot: { backgroundColor: "#087C49", borderRadius: 6, height: 10, width: 10, marginRight: 10 },
  statusDotBooking: { backgroundColor: "#2563EB" },
  statusDotIdle: { backgroundColor: "#9CA3AF" },
  statusLabel: { color: "#087C49", fontSize: 15, fontWeight: "600", flex: 1 },
  statusValue: { color: "#111827", fontWeight: "700" },
  fullDayCard: {
    backgroundColor: "#087C49",
    borderRadius: 24,
    flexDirection: "row",
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  fullDayTextSide: { flex: 1, paddingRight: 10 },
  fullDayPrompt: { color: "#E8F5E9", fontSize: 14, fontWeight: "500", marginBottom: 12 },
  fullDayTitle: { color: "#FFFFFF", fontSize: 32, fontWeight: "800", letterSpacing: -0.5, lineHeight: 38 },
  fullDaySubtitle: { color: "#E8F5E9", fontSize: 14, fontWeight: "500", marginTop: 12 },
  holdCircleContainer: { alignItems: "center", justifyContent: "center" },
  holdCircleBorder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  holdCircleIndicator: { position: "absolute", top: -4, width: 24, height: 4, backgroundColor: "#FFFFFF", borderRadius: 4 },
  holdCircleText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600", textAlign: "center", marginTop: 8 },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5FAF7",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  rowCardDisabled: { opacity: 0.55 },
  rowCardBordered: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#F3F4F6",
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  lightIconContainer: { backgroundColor: "#E8F5E9", borderRadius: 30, height: 52, width: 52, alignItems: "center", justifyContent: "center" },
  outlineIconContainer: { backgroundColor: "#FFFFFF", borderColor: "#E8F5E9", borderWidth: 2, borderRadius: 30, height: 52, width: 52, alignItems: "center", justifyContent: "center" },
  rowCardCopy: { flex: 1, marginLeft: 16 },
  rowCardTitle: { color: "#111827", fontSize: 18, fontWeight: "700" },
  rowCardSubtitle: { color: "#6B7280", fontSize: 14, fontWeight: "500", marginTop: 4 },
  gridRow: { flexDirection: "row", gap: 16, marginBottom: 16 },
  gridCard: { flex: 1, backgroundColor: "#FFFFFF", borderColor: "#F3F4F6", borderWidth: 1.5, borderRadius: 20, padding: 16 },
  gridIconContainer: { backgroundColor: "#F5FAF7", borderRadius: 16, height: 48, width: 48, alignItems: "center", justifyContent: "center" },
  gridTitle: { color: "#111827", fontSize: 18, fontWeight: "700", marginTop: 16 },
  gridFooter: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  gridSubtitle: { color: "#6B7280", fontSize: 13, fontWeight: "500", marginRight: 4, flex: 1 },
  modalOverlay: { backgroundColor: "rgba(0, 0, 0, 0.4)", flex: 1, justifyContent: "flex-end" },
  slotModal: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 34 },
  modalHandle: { alignSelf: "center", backgroundColor: "#E5E7EB", borderRadius: 3, height: 5, marginBottom: 24, width: 48 },
  slotModalTitle: { color: "#111827", fontSize: 22, fontWeight: "800" },
  slotModalSubtitle: { color: "#6B7280", fontSize: 15, lineHeight: 21, marginBottom: 24, marginTop: 8 },
  slotOption: { alignItems: "center", backgroundColor: "#F5FAF7", borderColor: "#E8F5E9", borderRadius: 16, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", marginBottom: 12, padding: 18 },
  slotOptionTitle: { color: "#111827", fontSize: 17, fontWeight: "800" },
  slotOptionSubtitle: { color: "#6B7280", fontSize: 13, fontWeight: "500", marginTop: 4 },
  cancelButton: { alignItems: "center", borderRadius: 14, marginTop: 8, paddingVertical: 15 },
  cancelButtonText: { color: "#6B7280", fontSize: 16, fontWeight: "700" },
});
