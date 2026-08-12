import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack } from "expo-router";
import {
  BriefcaseBusiness,
  CalendarX,
  ChevronRight,
  CircleUserRound,
  Clock3,
  House,
  LogOut,
  MousePointerClick,
  Wallet,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
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
import { API_URL } from "../../constants/api";
import { registerForPushNotificationsAsync } from "../../utils/pushToken";

const SLOT_OPTIONS = [2, 3, 4];

export default function WorkerDashboard() {
  const [workerData, setWorkerData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdCompletedRef = useRef(false);

  useEffect(() => {
    fetchDashboardData();
    setupNotifications();

    return clearHoldTimers;
  }, []);

  const clearHoldTimers = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

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

  const fetchDashboardData = async () => {
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
      Alert.alert("Unable to load", "Dashboard data load nahi ho paya.");
    } finally {
      setIsLoading(false);
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

      try {
        const dutyResponse = await axios.get(
          `${API_URL}/user/worker/current-duty/${parsedData.id}`,
        );

        if (dutyResponse.data.success && dutyResponse.data.duty) {
          Alert.alert("Duty Active", "Aapka ek kaam pehle se chal raha hai!");
          router.replace("/worker/active-duty");
          return;
        }
      } catch (dutyError) {
        console.log("Duty check error", dutyError);
      }

      Alert.alert(
        "You are Online",
        response.data.message || "Aap pool mein add ho gaye hain.",
      );
      router.push("/worker/available");
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Server se connect nahi ho paya.",
      );
    }
  };

  const startFullDayHold = () => {
    if (isHolding) return;

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
    if (holdCompletedRef.current) return;

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
  const weeklyEarning = Number(workerData?.weeklyEarning || 0);

  const dateObj = new Date();
  const dateLabel = `${dateObj.toLocaleDateString("en-US", { weekday: "long" })}, ${dateObj.getDate()} ${dateObj.toLocaleDateString("en-US", { month: "long" })}`;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.content}>
        {/* Header Section */}
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

        {/* Status Strip */}
        <View style={styles.statusStrip}>
          <View style={styles.statusDot} />
          <Text style={styles.statusLabel}>
            Status: <Text style={styles.statusValue}>Not in pool</Text>
          </Text>
        </View>

        {/* Full Day Hold Card */}
        <TouchableOpacity
          activeOpacity={0.92}
          delayLongPress={0}
          onPressIn={startFullDayHold}
          onPressOut={cancelFullDayHold}
          style={styles.fullDayCard}
        >
          <View style={styles.fullDayTextSide}>
            <Text style={styles.fullDayPrompt}>Hold 3 sec to go Available</Text>
            <Text style={styles.fullDayTitle}>Full Day Pool</Text>
            <Text style={styles.fullDaySubtitle}>
              Be visible for full day work
            </Text>
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
              <Text style={styles.holdCircleText}>
                {isHolding ? `${holdProgress}%` : "Hold to\nActivate"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Some Hours Card */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setIsSlotModalOpen(true)}
          style={styles.rowCard}
        >
          <View style={styles.lightIconContainer}>
            <Clock3 color="#087C49" size={26} strokeWidth={2.2} />
          </View>
          <View style={styles.rowCardCopy}>
            <Text style={styles.rowCardTitle}>Some Hours Work</Text>
            <Text style={styles.rowCardSubtitle}>Quick slots</Text>
          </View>
          <ChevronRight color="#087C49" size={24} strokeWidth={2} />
        </TouchableOpacity>

        {/* Quick Actions Grid */}
        <View style={styles.gridRow}>
          <QuickAction
            icon={<Wallet color="#087C49" size={24} strokeWidth={2.2} />}
            title="Earnings"
            subtitle={
              weeklyEarning > 0
                ? `₹${weeklyEarning.toLocaleString("en-IN")}`
                : "View details"
            }
            onPress={() => router.push("/worker/history")}
          />
          <QuickAction
            icon={<Wallet color="#087C49" size={24} strokeWidth={2.2} />}
            title="Wallet"
            subtitle="View balance"
          />
        </View>

        {/* Today Card */}
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.rowCardBordered}
          onPress={() => router.push("/worker/history")}
        >
          <View style={styles.outlineIconContainer}>
            <CalendarX color="#087C49" size={24} strokeWidth={2.2} />
          </View>
          <View style={styles.rowCardCopy}>
            <Text style={styles.rowCardTitle}>Today</Text>
            <Text style={styles.rowCardSubtitle}>No duty assigned</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <BottomNavItem
          active
          icon={<House color={true ? "#087C49" : "#6B7280"} size={26} />}
          label="Home"
        />
        <BottomNavItem
          icon={<BriefcaseBusiness color="#6B7280" size={26} />}
          label="Jobs"
          onPress={() => router.push("/worker/history")}
        />
        <BottomNavItem
          icon={<Wallet color="#6B7280" size={26} />}
          label="Wallet"
        />
        <BottomNavItem
          icon={<CircleUserRound color="#6B7280" size={26} />}
          label="Profile"
        />
      </View>

      {/* Slot Modal */}
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

function BottomNavItem({
  active = false,
  icon,
  label,
  onPress,
}: {
  active?: boolean;
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.78 : 1}
      onPress={onPress}
      style={styles.bottomNavItem}
    >
      {icon}
      <Text
        style={[styles.bottomNavLabel, active && styles.bottomNavLabelActive]}
      >
        {label}
      </Text>
      {active && <View style={styles.activeIndicatorLine} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  loaderText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },

  // Header Styles
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTextGroup: {
    flex: 1,
  },
  greeting: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  greetingName: {
    color: "#087C49",
  },
  dateText: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "500",
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
  },

  // Status Strip Styles
  statusStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5FAF7",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  statusDot: {
    backgroundColor: "#087C49",
    borderRadius: 6,
    height: 10,
    width: 10,
    marginRight: 10,
  },
  statusLabel: {
    color: "#087C49",
    fontSize: 15,
    fontWeight: "600",
  },
  statusValue: {
    color: "#111827",
    fontWeight: "600",
  },

  // Full Day Card Styles
  fullDayCard: {
    backgroundColor: "#087C49",
    borderRadius: 24,
    flexDirection: "row",
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  fullDayTextSide: {
    flex: 1,
    paddingRight: 10,
  },
  fullDayPrompt: {
    color: "#E8F5E9",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 12,
  },
  fullDayTitle: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  fullDaySubtitle: {
    color: "#E8F5E9",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 12,
  },
  holdCircleContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
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
  holdCircleIndicator: {
    position: "absolute",
    top: -4,
    width: 24,
    height: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
  },
  holdCircleText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },

  // Row Card (Some Hours & Today) Styles
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5FAF7",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
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
  lightIconContainer: {
    backgroundColor: "#E8F5E9",
    borderRadius: 30,
    height: 52,
    width: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineIconContainer: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E8F5E9",
    borderWidth: 2,
    borderRadius: 30,
    height: 52,
    width: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCardCopy: {
    flex: 1,
    marginLeft: 16,
  },
  rowCardTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "700",
  },
  rowCardSubtitle: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 4,
  },

  // Grid / Quick Action Styles
  gridRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  gridCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderColor: "#F3F4F6",
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
  },
  gridIconContainer: {
    backgroundColor: "#F5FAF7",
    borderRadius: 16,
    height: 48,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  gridTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
  },
  gridFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  gridSubtitle: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "500",
    marginRight: 4,
  },

  // Bottom Navigation Styles
  bottomNavigation: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    paddingBottom: 25,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  bottomNavItem: {
    alignItems: "center",
    flex: 1,
    position: "relative",
  },
  bottomNavLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  bottomNavLabelActive: {
    color: "#087C49",
    fontWeight: "700",
  },
  activeIndicatorLine: {
    backgroundColor: "#087C49",
    height: 3,
    width: 24,
    borderRadius: 2,
    position: "absolute",
    bottom: -10,
  },

  // Modal Styles
  modalOverlay: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    flex: 1,
    justifyContent: "flex-end",
  },
  slotModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 34,
  },
  modalHandle: {
    alignSelf: "center",
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    height: 5,
    marginBottom: 24,
    width: 48,
  },
  slotModalTitle: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "800",
  },
  slotModalSubtitle: {
    color: "#6B7280",
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 24,
    marginTop: 8,
  },
  slotOption: {
    alignItems: "center",
    backgroundColor: "#F5FAF7",
    borderColor: "#E8F5E9",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  slotOptionTitle: {
    color: "#087C49",
    fontSize: 17,
    fontWeight: "700",
  },
  slotOptionSubtitle: {
    color: "#4B5563",
    fontSize: 13,
    marginTop: 4,
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    marginTop: 8,
    paddingVertical: 16,
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "700",
  },
});
