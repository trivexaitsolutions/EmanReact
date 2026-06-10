// app/worker/dashboard.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack } from "expo-router";
import {
  AlertTriangle,
  Award,
  BriefcaseBusiness,
  ChevronRight,
  Headphones,
  History,
  LogOut,
  Power,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  Wallet,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { API_URL } from "../../constants/api";
import { registerForPushNotificationsAsync } from "../../utils/pushToken";

export default function WorkerDashboard() {
  const [workerData, setWorkerData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);

  const holdTimerRef = useRef<any>(null);
  const holdIntervalRef = useRef<any>(null);
  const holdCompletedRef = useRef(false);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const SLOT_OPTIONS = [2, 3, 4];

  useEffect(() => {
    fetchDashboardData();
    setupNotifications();

    return () => {
      clearHoldTimers();
    };
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
      const currentWorkerId = parsedData.id;

      const token = await registerForPushNotificationsAsync();

      if (token) {
        console.log("Dashboard ko token mil gaya: ", token);

        const response = await axios.post(`${API_URL}/worker/save-push-token`, {
          workerId: currentWorkerId,
          pushToken: token,
        });

        if (response.data.success) {
          console.log("✅ Token successfully Database me save ho gaya!");
        }
      }
    } catch (error: any) {
      console.log("Token lene me error aaya: " + error.message);
    }
  };

  const isSlotAllowed = (hours: number) => {
    return true;
  };

  const handleSelectSlot = async (hours: number) => {
    if (!isSlotAllowed(hours)) {
      Alert.alert(
        "Slot Not Available",
        `${hours} hours slot currently available nahi hai.`,
      );
      return;
    }

    setIsSlotModalOpen(false);
    await handleGoOnline("SHORT_PERIOD", hours);
  };

  const fetchDashboardData = async () => {
    try {
      const session = await AsyncStorage.getItem("workerSession");

      if (session) {
        const parsedData = JSON.parse(session);

        const response = await axios.get(
          `${API_URL}/worker/dashboard/${parsedData.id}`,
        );

        if (response.data.success) {
          setWorkerData(response.data.data);
        }
      }
    } catch (error) {
      console.log("Dashboard fetch error", error);
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
      const workerId = parsedData.id;

      const payload: any = {
        workerId,
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
        try {
          const dutyResponse = await axios.get(
            `${API_URL}/worker/current-duty/${workerId}`,
          );

          if (dutyResponse.data.success && dutyResponse.data.duty) {
            Alert.alert("Duty Active", "Aapka ek kaam pehle se chal raha hai!");
            router.replace("/worker/active-duty");
          } else {
            Alert.alert(
              "You are Online",
              response.data.message || "Aap pool mein add ho gaye hain.",
            );
            router.push("/worker/available");
          }
        } catch (dutyError) {
          console.log("Duty check error", dutyError);
          router.push("/worker/available");
        }
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Server se connect nahi ho paya";

      Alert.alert("Error", message);
    }
  };

  const startFullDayHold = () => {
    holdCompletedRef.current = false;
    setIsHolding(true);
    setHoldProgress(0);

    let progress = 0;

    holdIntervalRef.current = setInterval(() => {
      progress += 1;

      if (progress <= 100) {
        setHoldProgress(progress);
      }
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

  const handleSomeHoursAvailable = () => {
    setIsSlotModalOpen(true);
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

  if (isLoading || !workerData) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loaderText}>Loading your dashboard...</Text>
      </View>
    );
  }

  const firstName = workerData?.name?.split(" ")[0] || "Worker";
  const score = workerData?.score || "4.2";
  const level = workerData?.level || "Silver";
  const weeklyEarning = workerData?.weeklyEarning || "0";
  const emanId = workerData?.emanId || "EMN-MUM-XXXX";

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.topBg}>
        <View style={styles.appBar}>
          <View>
            <Text style={styles.logo}>E-MAN Worker</Text>
            <Text style={styles.logoSub}>Field Partner Dashboard</Text>
          </View>

          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <LogOut color="#EF4444" size={21} />
          </TouchableOpacity>
        </View>

        <View style={styles.greetingBox}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {String(firstName).charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.greetingSmall}>Namaste 👋</Text>
            <Text style={styles.workerName}>{firstName}</Text>

            <View style={styles.idRow}>
              <Text style={styles.workerId}>{emanId}</Text>
              <View style={styles.dot} />
              <Star color="#FBBF24" fill="#FBBF24" size={13} />
              <Text style={styles.scoreText}>{score}</Text>
            </View>
          </View>

          <View style={styles.levelBadge}>
            <Award color="#FFFFFF" size={13} />
            <Text style={styles.levelText}>{level}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.statusCard}>
          <View style={styles.statusIconBox}>
            <Sparkles color="#10B981" size={24} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>Ready to work today?</Text>
            <Text style={styles.statusSub}>
              Hold full-day button for 3 seconds to go online.
            </Text>
          </View>
        </View>

        {/* AVAILABILITY SECTION */}
        <View style={styles.availabilitySection}>
          <Text style={styles.sectionTitle}>Availability</Text>

          <TouchableOpacity
            activeOpacity={0.92}
            onPressIn={startFullDayHold}
            onPressOut={cancelFullDayHold}
            style={[
              styles.fullDayButton,
              isHolding && styles.fullDayButtonHolding,
            ]}
          >
            {isHolding && (
              <View
                style={[
                  styles.fullDayProgressOverlay,
                  { width: `${holdProgress}%` },
                ]}
              />
            )}

            <View style={styles.fullDayContent}>
              <View style={styles.fullDayIcon}>
                <Power color="#FFFFFF" size={26} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.fullDayTitle}>I am available</Text>
                <Text style={styles.fullDaySub}>For full day</Text>
                <Text style={styles.fullDayHint}>
                  {isHolding
                    ? "Keep holding..."
                    : "Press and hold for 3 seconds"}
                </Text>
              </View>

              <View style={styles.holdBadge}>
                <Text style={styles.holdBadgeText}>
                  {isHolding ? `${holdProgress}%` : "HOLD"}
                </Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${holdProgress}%` }]}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleSomeHoursAvailable}
            style={styles.someHoursButton}
          >
            <View style={styles.someHoursIcon}>
              <Timer color="#059669" size={24} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.someHoursTitle}>I am available</Text>
              <Text style={styles.someHoursSub}>For some hours</Text>
            </View>

            <View style={styles.selectPill}>
              <Text style={styles.selectPillText}>Select</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* EARNING / WALLET */}
        <View style={styles.moneyRow}>
          <View style={styles.earningCard}>
            <View style={styles.cardTopRow}>
              <View style={styles.walletIconBox}>
                <Wallet color="#FFFFFF" size={22} />
              </View>
              <Text style={styles.moneyLabel}>This Week</Text>
            </View>

            <Text style={styles.moneyAmount}>₹{weeklyEarning}</Text>
            <Text style={styles.moneySub}>Sunday payout · 3 days left</Text>
          </View>

          <View style={styles.quickWalletCard}>
            <View style={styles.quickWalletIcon}>
              <BriefcaseBusiness color="#059669" size={24} />
            </View>
            <Text style={styles.quickWalletTitle}>Wallet</Text>
            <Text style={styles.quickWalletSub}>Payments</Text>
          </View>
        </View>

        <View style={styles.insuranceCard}>
          <View style={styles.insuranceIcon}>
            <ShieldCheck color="#FFFFFF" size={24} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.insuranceTitle}>Insurance Active</Text>
            <Text style={styles.insuranceSub}>Free ₹3 lakh accident cover</Text>
          </View>

          <ChevronRight color="#A7F3D0" size={22} />
        </View>

        {/* OTHER OPTIONS */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Other Options</Text>

          <View style={styles.menuList}>
            <MenuItem
              icon={<Star color="#10B981" size={20} />}
              title={`My E-MAN Score (${score})`}
              subTitle="Rating and performance"
            />

            <MenuItem
              icon={<ShieldCheck color="#10B981" size={20} />}
              title="My Insurance"
              subTitle="Coverage and documents"
            />

            <MenuItem
              icon={<History color="#10B981" size={20} />}
              title="Work History"
              subTitle="Past bookings and duty records"
              onPress={() => router.push("/worker/history")}
            />

            <MenuItem
              icon={<AlertTriangle color="#EF4444" size={20} />}
              title="Raise an Issue"
              subTitle="Report duty or payment issue"
            />

            <MenuItem
              icon={<Headphones color="#10B981" size={20} />}
              title="Support 24/7"
              subTitle="Call or message support team"
            />
          </View>
        </View>

        <View style={{ height: 35 }} />
      </ScrollView>
      <Modal
        visible={isSlotModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSlotModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.slotModal}>
            <Text style={styles.slotModalTitle}>Select Availability Slot</Text>
            <Text style={styles.slotModalSub}>
              Choose how many hours you want to stay in the pool.
            </Text>

            {SLOT_OPTIONS.map((hours) => {
              const allowed = isSlotAllowed(hours);

              return (
                <TouchableOpacity
                  key={hours}
                  activeOpacity={allowed ? 0.85 : 1}
                  disabled={!allowed}
                  onPress={() => handleSelectSlot(hours)}
                  style={[
                    styles.slotOption,
                    !allowed && styles.slotOptionDisabled,
                  ]}
                >
                  <View>
                    <Text
                      style={[
                        styles.slotOptionTitle,
                        !allowed && styles.slotOptionTitleDisabled,
                      ]}
                    >
                      Next {hours} Hours
                    </Text>
                    <Text
                      style={[
                        styles.slotOptionSub,
                        !allowed && styles.slotOptionSubDisabled,
                      ]}
                    >
                      {allowed
                        ? `Available for next ${hours} hours`
                        : "Not available"}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.slotOptionAction,
                      !allowed && styles.slotOptionActionDisabled,
                    ]}
                  >
                    {allowed ? "Select" : "Closed"}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.cancelSlotBtn}
              onPress={() => setIsSlotModalOpen(false)}
            >
              <Text style={styles.cancelSlotText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const MenuItem = ({
  icon,
  title,
  subTitle,
  onPress,
}: {
  icon: any;
  title: string;
  subTitle?: string;
  onPress?: () => void;
}) => (
  <TouchableOpacity
    style={styles.menuItem}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <View style={styles.menuIcon}>{icon}</View>

    <View style={{ flex: 1 }}>
      <Text style={styles.menuItemText}>{title}</Text>
      {subTitle ? <Text style={styles.menuItemSub}>{subTitle}</Text> : null}
    </View>

    <ChevronRight color="#CBD5E1" size={20} />
  </TouchableOpacity>
);

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

  loaderText: {
    marginTop: 10,
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "700",
  },

  topBg: {
    backgroundColor: "#047857",
    paddingBottom: 28,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },

  appBar: {
    paddingTop: 42,
    paddingHorizontal: 18,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  logo: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  logoSub: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A7F3D0",
    marginTop: 2,
  },

  logoutBtn: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  greetingBox: {
    marginHorizontal: 18,
    backgroundColor: "rgba(255,255,255,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 26,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  avatarCircle: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  avatarText: {
    fontSize: 27,
    fontWeight: "900",
    color: "#047857",
  },

  greetingSmall: {
    fontSize: 12,
    color: "#D1FAE5",
    fontWeight: "800",
  },

  workerName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 2,
  },

  idRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
  },

  workerId: {
    fontSize: 11,
    color: "#A7F3D0",
    fontWeight: "800",
  },

  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#A7F3D0",
    marginHorizontal: 7,
  },

  scoreText: {
    color: "#FDE68A",
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 3,
  },

  levelBadge: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  levelText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },

  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    marginTop: -28,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  statusIconBox: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  statusTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },

  statusSub: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 3,
  },

  availabilitySection: {
    marginBottom: 18,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },

  fullDayButton: {
    backgroundColor: "#10B981",
    borderRadius: 26,
    minHeight: 112,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 6,
  },

  fullDayButtonHolding: {
    backgroundColor: "#059669",
  },

  fullDayProgressOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.13)",
  },

  fullDayContent: {
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 2,
  },

  fullDayIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  fullDayTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },

  fullDaySub: {
    color: "#ECFDF5",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },

  fullDayHint: {
    color: "#D1FAE5",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 5,
  },

  holdBadge: {
    backgroundColor: "rgba(0,0,0,0.17)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  holdBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },

  progressTrack: {
    height: 7,
    backgroundColor: "rgba(255,255,255,0.18)",
  },

  progressFill: {
    height: 7,
    backgroundColor: "#A7F3D0",
  },

  someHoursButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1FAE5",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  someHoursIcon: {
    width: 54,
    height: 54,
    borderRadius: 19,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  someHoursTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
  },

  someHoursSub: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },

  selectPill: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
  },

  selectPillText: {
    color: "#047857",
    fontSize: 12,
    fontWeight: "900",
  },

  moneyRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },

  earningCard: {
    flex: 1.5,
    backgroundColor: "#111827",
    borderRadius: 26,
    padding: 17,
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  walletIconBox: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  moneyLabel: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },

  moneyAmount: {
    color: "#FFFFFF",
    fontSize: 31,
    fontWeight: "900",
  },

  moneySub: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },

  quickWalletCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },

  quickWalletIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 9,
  },

  quickWalletTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },

  quickWalletSub: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
    marginTop: 3,
  },

  insuranceCard: {
    backgroundColor: "#047857",
    borderRadius: 24,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  insuranceIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  insuranceTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  insuranceSub: {
    color: "#D1FAE5",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },

  menuSection: {
    marginTop: 2,
  },

  menuList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 10,
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
  },

  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  menuItemText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },

  menuItemSub: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  slotModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    paddingBottom: 28,
  },

  slotModalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },

  slotModalSub: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 5,
    marginBottom: 16,
  },

  slotOption: {
    backgroundColor: "#ECFDF5",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },

  slotOptionDisabled: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },

  slotOptionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#047857",
  },

  slotOptionTitleDisabled: {
    color: "#9CA3AF",
  },

  slotOptionSub: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
    marginTop: 3,
  },

  slotOptionSubDisabled: {
    color: "#9CA3AF",
  },

  slotOptionAction: {
    fontSize: 12,
    fontWeight: "900",
    color: "#047857",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },

  slotOptionActionDisabled: {
    color: "#9CA3AF",
  },

  cancelSlotBtn: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 4,
  },

  cancelSlotText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },
});
