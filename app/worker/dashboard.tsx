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
  useWindowDimensions,
  View,
} from "react-native";
import { API_URL } from "../../constants/api";
import { registerForPushNotificationsAsync } from "../../utils/pushToken";

const SLOT_OPTIONS = [2, 3, 4];

export default function WorkerDashboard() {
  const { height } = useWindowDimensions();
  // Keep one compact composition on phones. Only tablet-sized windows get the
  // more spacious variant, so a phone's pixel density cannot change the UI.
  const isCompact = height < 1200;
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
        <ActivityIndicator size="large" color="#009A56" />
        <Text style={styles.loaderText}>Loading your dashboard...</Text>
      </View>
    );
  }

  const firstName = workerData?.name?.split(" ")[0] || "Worker";
  const weeklyEarning = Number(workerData?.weeklyEarning || 0);
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.content, isCompact && styles.contentCompact]}>
        <View style={[styles.headerRow, isCompact && styles.headerRowCompact]}>
          <Text style={styles.brand}>E-MAN</Text>
          <TouchableOpacity
            accessibilityLabel="Log out"
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            <LogOut color="#5B6472" size={20} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        <View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            numberOfLines={1}
            style={[styles.greeting, isCompact && styles.greetingCompact]}
          >
            Good Morning, <Text style={styles.greetingName}>{firstName}</Text>
            <Text> 👋</Text>
          </Text>
          <Text style={[styles.dateText, isCompact && styles.dateTextCompact]}>
            {dateLabel}
          </Text>
        </View>

        <View style={[styles.statusStrip, isCompact && styles.statusStripCompact]}>
          <View style={styles.statusDot} />
          <Text style={styles.statusLabel}>Status:</Text>
          <Text style={styles.statusValue}>Not in pool</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.92}
          delayLongPress={0}
          onPressIn={startFullDayHold}
          onPressOut={cancelFullDayHold}
          style={[styles.fullDayCard, isCompact && styles.fullDayCardCompact]}
        >
          <View style={styles.fullDayGlowLarge} />
          <View style={styles.fullDayGlowSmall} />

          <View style={[styles.fullDayTextSide, isCompact && styles.fullDayTextSideCompact]}>
            <Text style={[styles.fullDayPrompt, isCompact && styles.fullDayPromptCompact]}>
              {isHolding ? "Keep holding..." : "Hold 3 sec to go Available"}
            </Text>
            <Text style={[styles.fullDayTitle, isCompact && styles.fullDayTitleCompact]}>
              Full Day Pool
            </Text>
            <Text
              style={[
                styles.fullDaySubtitle,
                isCompact && styles.fullDaySubtitleCompact,
              ]}
            >
              Be visible for full-day work
            </Text>
          </View>

          <View
            style={[
              styles.holdCircle,
              isCompact && styles.holdCircleCompact,
              isHolding && styles.holdCircleActive,
            ]}
          >
            <View style={styles.holdCircleInner}>
              <MousePointerClick
                color="#FFFFFF"
                size={isCompact ? 33 : 47}
                strokeWidth={2.1}
              />
              <Text
                style={[styles.holdCircleText, isCompact && styles.holdCircleTextCompact]}
              >
                {isHolding ? `${holdProgress}%` : "Hold to"}
              </Text>
              <Text
                style={[styles.holdCircleText, isCompact && styles.holdCircleTextCompact]}
              >
                {isHolding ? "Activating" : "Activate"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setIsSlotModalOpen(true)}
          style={[styles.someHoursCard, isCompact && styles.someHoursCardCompact]}
        >
          <View style={[styles.lightIconCircle, isCompact && styles.lightIconCircleCompact]}>
            <Clock3 color="#009A56" size={isCompact ? 28 : 39} strokeWidth={2.15} />
          </View>
          <View style={styles.someHoursCopy}>
            <Text style={[styles.someHoursTitle, isCompact && styles.someHoursTitleCompact]}>
              Some Hours Work
            </Text>
            <Text style={[styles.someHoursSubtitle, isCompact && styles.someHoursSubtitleCompact]}>
              Quick slots
            </Text>
          </View>
          <ChevronRight color="#009A56" size={isCompact ? 25 : 32} strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={[styles.quickActionRow, isCompact && styles.quickActionRowCompact]}>
          <QuickAction
            compact={isCompact}
            icon={<Wallet color="#009A56" size={38} strokeWidth={2.1} />}
            title="Earnings"
            subtitle={`₹${weeklyEarning.toLocaleString("en-IN")}`}
            onPress={() => router.push("/worker/history")}
          />
          <QuickAction
            compact={isCompact}
            icon={<Wallet color="#009A56" size={38} strokeWidth={2.1} />}
            title="Wallet"
            subtitle="View balance"
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          style={[styles.todayCard, isCompact && styles.todayCardCompact]}
          onPress={() => router.push("/worker/history")}
        >
          <View style={[styles.lightIconCircle, isCompact && styles.lightIconCircleCompact]}>
            <CalendarX color="#009A56" size={isCompact ? 27 : 35} strokeWidth={2.1} />
          </View>
          <View>
            <Text style={[styles.todayTitle, isCompact && styles.todayTitleCompact]}>
              Today
            </Text>
            <Text style={[styles.todaySubtitle, isCompact && styles.todaySubtitleCompact]}>
              No duty assigned
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomNavigation}>
        <BottomNavItem active icon={<House color="#009A56" size={27} />} label="Home" />
        <BottomNavItem
          icon={<BriefcaseBusiness color="#5B6472" size={27} />}
          label="Jobs"
          onPress={() => router.push("/worker/history")}
        />
        <BottomNavItem icon={<Wallet color="#5B6472" size={27} />} label="Wallet" />
        <BottomNavItem
          icon={<CircleUserRound color="#5B6472" size={27} />}
          label="Profile"
        />
      </View>

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
                <ChevronRight color="#009A56" size={25} />
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
  compact = false,
  icon,
  title,
  subtitle,
  onPress,
}: {
  compact?: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      style={[styles.quickActionCard, compact && styles.quickActionCardCompact]}
    >
      <View style={[styles.quickActionIcon, compact && styles.quickActionIconCompact]}>
        {icon}
      </View>
      <Text style={[styles.quickActionTitle, compact && styles.quickActionTitleCompact]}>
        {title}
      </Text>
      <View style={[styles.quickActionFooter, compact && styles.quickActionFooterCompact]}>
        <Text
          numberOfLines={1}
          style={[styles.quickActionSubtitle, compact && styles.quickActionSubtitleCompact]}
        >
          {subtitle}
        </Text>
        <ChevronRight color="#009A56" size={compact ? 17 : 22} strokeWidth={2.5} />
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
      <Text style={[styles.bottomNavLabel, active && styles.bottomNavLabelActive]}>
        {label}
      </Text>
      {active ? <View style={styles.activeIndicator} /> : null}
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
    color: "#657080",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  contentCompact: {
    paddingHorizontal: 16,
    paddingTop: 9,
    paddingBottom: 5,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerRowCompact: {
    minHeight: 31,
  },
  brand: {
    color: "#009A56",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  logoutButton: {
    alignItems: "center",
    backgroundColor: "#F4F7F5",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  greeting: {
    color: "#111B2B",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1.15,
    lineHeight: 41,
  },
  greetingCompact: {
    fontSize: 27,
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  greetingName: {
    color: "#009A56",
  },
  dateText: {
    color: "#687282",
    fontSize: 18,
    fontWeight: "500",
    marginTop: 5,
  },
  dateTextCompact: {
    fontSize: 14,
    marginTop: 2,
  },
  statusStrip: {
    alignItems: "center",
    backgroundColor: "#F3F8F6",
    borderRadius: 22,
    flexDirection: "row",
    paddingHorizontal: 22,
    paddingVertical: 21,
  },
  statusStripCompact: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statusDot: {
    backgroundColor: "#009A56",
    borderRadius: 8,
    height: 12,
    marginRight: 12,
    width: 12,
  },
  statusLabel: {
    color: "#009A56",
    fontSize: 16,
    fontWeight: "800",
    marginRight: 12,
  },
  statusValue: {
    color: "#121928",
    fontSize: 16,
    fontWeight: "600",
  },
  fullDayCard: {
    backgroundColor: "#009A56",
    borderRadius: 27,
    flexDirection: "row",
    minHeight: 340,
    overflow: "hidden",
    padding: 26,
  },
  fullDayCardCompact: {
    borderRadius: 20,
    height: 158,
    minHeight: 0,
    padding: 16,
  },
  fullDayGlowLarge: {
    backgroundColor: "rgba(5, 112, 66, 0.44)",
    borderRadius: 200,
    bottom: -175,
    height: 390,
    position: "absolute",
    right: -134,
    width: 390,
  },
  fullDayGlowSmall: {
    backgroundColor: "rgba(97, 218, 152, 0.14)",
    borderRadius: 130,
    height: 260,
    position: "absolute",
    right: -56,
    top: -105,
    width: 260,
  },
  fullDayTextSide: {
    alignSelf: "center",
    flex: 1,
    paddingBottom: 12,
    zIndex: 1,
  },
  fullDayTextSideCompact: {
    flex: 1,
    paddingBottom: 0,
  },
  fullDayPrompt: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 23,
    marginBottom: 25,
  },
  fullDayPromptCompact: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  fullDayTitle: {
    color: "#FFFFFF",
    fontSize: 35,
    fontWeight: "800",
    letterSpacing: -0.9,
    lineHeight: 42,
  },
  fullDayTitleCompact: {
    fontSize: 23,
    letterSpacing: -0.5,
    lineHeight: 27,
  },
  fullDaySubtitle: {
    color: "#E5FFF1",
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 23,
    marginTop: 31,
  },
  fullDaySubtitleCompact: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 12,
  },
  holdCircle: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderColor: "rgba(217, 255, 233, 0.5)",
    borderRadius: 105,
    borderWidth: 13,
    height: 188,
    justifyContent: "center",
    marginLeft: 6,
    width: 188,
    zIndex: 1,
  },
  holdCircleCompact: {
    borderRadius: 70,
    borderWidth: 7,
    height: 120,
    marginLeft: 6,
    width: 120,
  },
  holdCircleActive: {
    borderColor: "#FFFFFF",
  },
  holdCircleInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  holdCircleText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
  },
  holdCircleTextCompact: {
    fontSize: 12,
    lineHeight: 15,
  },
  someHoursCard: {
    alignItems: "center",
    backgroundColor: "#F3F9F6",
    borderRadius: 27,
    flexDirection: "row",
    paddingHorizontal: 25,
    paddingVertical: 29,
  },
  someHoursCardCompact: {
    borderRadius: 18,
    paddingHorizontal: 17,
    paddingVertical: 13,
  },
  lightIconCircle: {
    alignItems: "center",
    backgroundColor: "#DFF4E9",
    borderRadius: 37,
    height: 74,
    justifyContent: "center",
    width: 74,
  },
  lightIconCircleCompact: {
    borderRadius: 25,
    height: 50,
    width: 50,
  },
  someHoursCopy: {
    flex: 1,
    marginLeft: 22,
  },
  someHoursTitle: {
    color: "#101928",
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -0.55,
  },
  someHoursTitleCompact: {
    fontSize: 19,
    letterSpacing: -0.35,
  },
  someHoursSubtitle: {
    color: "#6F7888",
    fontSize: 17,
    fontWeight: "500",
    marginTop: 6,
  },
  someHoursSubtitleCompact: {
    fontSize: 13,
    marginTop: 2,
  },
  quickActionRow: {
    flexDirection: "row",
    gap: 16,
  },
  quickActionRowCompact: {
    gap: 12,
  },
  quickActionCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#EDF0EF",
    borderRadius: 27,
    borderWidth: 1,
    flex: 1,
    minHeight: 220,
    padding: 21,
    shadowColor: "#263448",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 13,
    elevation: 3,
  },
  quickActionCardCompact: {
    borderRadius: 18,
    minHeight: 106,
    padding: 13,
  },
  quickActionIcon: {
    alignItems: "center",
    backgroundColor: "#E6F7EE",
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  quickActionIconCompact: {
    borderRadius: 25,
    height: 50,
    width: 50,
  },
  quickActionTitle: {
    color: "#111A2A",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 19,
  },
  quickActionTitleCompact: {
    fontSize: 18,
    letterSpacing: -0.3,
    marginTop: 8,
  },
  quickActionFooter: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 7,
  },
  quickActionFooterCompact: {
    marginTop: 2,
  },
  quickActionSubtitle: {
    color: "#6A7485",
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  quickActionSubtitleCompact: {
    fontSize: 11,
  },
  todayCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#EDF0EF",
    borderRadius: 27,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 25,
    paddingVertical: 28,
    shadowColor: "#263448",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 13,
    elevation: 3,
  },
  todayCardCompact: {
    borderRadius: 18,
    paddingHorizontal: 17,
    paddingVertical: 12,
  },
  todayTitle: {
    color: "#111A2A",
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -0.55,
    marginLeft: 22,
  },
  todayTitleCompact: {
    fontSize: 19,
    letterSpacing: -0.3,
    marginLeft: 14,
  },
  todaySubtitle: {
    color: "#6A7485",
    fontSize: 17,
    fontWeight: "500",
    marginLeft: 22,
    marginTop: 6,
  },
  todaySubtitleCompact: {
    fontSize: 13,
    marginLeft: 14,
    marginTop: 2,
  },
  bottomNavigation: {
    backgroundColor: "#FFFFFF",
    borderColor: "#EEF1F0",
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 4,
    marginHorizontal: 9,
    paddingBottom: 5,
    paddingTop: 8,
    shadowColor: "#243144",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 11,
    elevation: 5,
  },
  bottomNavItem: {
    alignItems: "center",
    flex: 1,
    minHeight: 50,
  },
  bottomNavLabel: {
    color: "#5B6472",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
  bottomNavLabelActive: {
    color: "#009A56",
    fontWeight: "800",
  },
  activeIndicator: {
    backgroundColor: "#009A56",
    borderRadius: 5,
    bottom: -5,
    height: 4,
    position: "absolute",
    width: 46,
  },
  modalOverlay: {
    backgroundColor: "rgba(7, 18, 30, 0.43)",
    flex: 1,
    justifyContent: "flex-end",
  },
  slotModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 31,
    borderTopRightRadius: 31,
    padding: 23,
    paddingBottom: 34,
  },
  modalHandle: {
    alignSelf: "center",
    backgroundColor: "#DCE3E0",
    borderRadius: 3,
    height: 5,
    marginBottom: 22,
    width: 49,
  },
  slotModalTitle: {
    color: "#111A2A",
    fontSize: 23,
    fontWeight: "800",
  },
  slotModalSubtitle: {
    color: "#6A7485",
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 20,
    marginTop: 6,
  },
  slotOption: {
    alignItems: "center",
    backgroundColor: "#F2F9F5",
    borderColor: "#D9F0E4",
    borderRadius: 19,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 11,
    paddingHorizontal: 18,
    paddingVertical: 17,
  },
  slotOptionTitle: {
    color: "#087C49",
    fontSize: 17,
    fontWeight: "800",
  },
  slotOptionSubtitle: {
    color: "#5C7D6B",
    fontSize: 13,
    marginTop: 4,
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: "#F3F5F4",
    borderRadius: 18,
    marginTop: 5,
    paddingVertical: 15,
  },
  cancelButtonText: {
    color: "#424B59",
    fontSize: 15,
    fontWeight: "800",
  },
});
