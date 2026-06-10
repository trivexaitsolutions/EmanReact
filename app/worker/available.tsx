// app/worker/available.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack } from "expo-router";
import {
  Activity,
  BellRing,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  MapPin,
  PowerOff,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Timer,
  Wifi,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
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
import { API_URL } from "../../constants/api";

export default function WorkerAvailable() {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isStopping, setIsStopping] = useState(false);
  const [isLoadingPool, setIsLoadingPool] = useState(true);
  const [workerSession, setWorkerSession] = useState<any>(null);
  const [poolInfo, setPoolInfo] = useState<any>(null);

  const autoOfflineDoneRef = useRef(false);

  useEffect(() => {
    loadInitialData();

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null) return prev;

        if (prev <= 1) {
          if (!autoOfflineDoneRef.current) {
            autoOfflineDoneRef.current = true;
            stopAvailability(true);
          }

          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const loadInitialData = async () => {
    try {
      const session = await AsyncStorage.getItem("workerSession");

      if (!session) {
        router.replace("/");
        return;
      }

      const parsedSession = JSON.parse(session);
      setWorkerSession(parsedSession);

      await loadPoolStatus(parsedSession.id);
    } catch (error) {
      console.log("Initial data load error:", error);
      Alert.alert("Error", "Pool data load nahi ho paya.");
    } finally {
      setIsLoadingPool(false);
    }
  };

  const loadPoolStatus = async (workerId: number) => {
    try {
      const response = await axios.get(
        `${API_URL}/worker/pool-status/${workerId}`,
      );

      if (response.data.success && response.data.isAvailable) {
        setPoolInfo(response.data);
        setRemainingSeconds(response.data.remainingSeconds || 0);
      } else {
        Alert.alert(
          "Pool Ended",
          response.data.message || "Aap currently available nahi ho.",
        );
        router.replace("/worker/dashboard");
      }
    } catch (error: any) {
      console.log("Pool status error:", error);
      const message =
        error?.response?.data?.message || "Pool status fetch nahi ho paya.";
      Alert.alert("Error", message);
      router.replace("/worker/dashboard");
    }
  };

  const formatRemainingTime = (seconds: number | null) => {
    const safeSeconds = Math.max(0, seconds || 0);

    const h = String(Math.floor(safeSeconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((safeSeconds % 3600) / 60)).padStart(2, "0");
    const s = String(safeSeconds % 60).padStart(2, "0");

    return `${h}:${m}:${s}`;
  };

  const formatDisplayTime = (dateValue?: string) => {
    if (!dateValue) return "--";

    return new Date(dateValue).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleRefreshDuty = async () => {
    try {
      const session = await AsyncStorage.getItem("workerSession");
      if (!session) return;

      const parsedData = JSON.parse(session);
      const workerId = parsedData.id;

      await loadPoolStatus(workerId);

      const response = await axios.get(
        `${API_URL}/worker/current-duty/${workerId}`,
      );

      if (response.data.success && response.data.duty) {
        Alert.alert("Duty Found", "Aapko ek active duty assign hui hai.");
        router.replace("/worker/active-duty");
      } else {
        Alert.alert("Still Waiting", "Abhi koi booking assign nahi hui hai.");
      }
    } catch (error) {
      console.log("Refresh duty error:", error);
      Alert.alert("Error", "Duty check nahi ho paya.");
    }
  };

  const handleStopAvailability = () => {
    Alert.alert("Go Offline?", "Aap pool se bahar nikalna chahte ho?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Go Offline",
        style: "destructive",
        onPress: () => stopAvailability(false),
      },
    ]);
  };

  const stopAvailability = async (isAutoOffline = false) => {
    try {
      setIsStopping(true);

      const session = await AsyncStorage.getItem("workerSession");

      if (!session) {
        router.replace("/worker/dashboard");
        return;
      }

      const parsedData = JSON.parse(session);

      await axios.post(`${API_URL}/worker/update-status`, {
        workerId: parsedData.id,
        status: false,
      });

      if (isAutoOffline) {
        Alert.alert(
          "Pool Ended",
          "Aaj ka pool time khatam ho gaya. Aap automatically offline ho gaye ho.",
        );
      } else {
        Alert.alert("Offline", "Aap ab available pool se bahar ho.");
      }

      router.replace("/worker/dashboard");
    } catch (error) {
      console.log("Stop availability error:", error);
      Alert.alert("Error", "Status update nahi ho paya.");
    } finally {
      setIsStopping(false);
    }
  };

  if (isLoadingPool) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loaderText}>Loading pool status...</Text>
      </View>
    );
  }

  const firstName =
    workerSession?.name?.split(" ")[0] ||
    workerSession?.fullName?.split(" ")[0] ||
    "Worker";

  const isShortPeriod = poolInfo?.availabilityType === "SHORT_PERIOD";

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.topBg}>
        <View style={styles.appBar}>
          <TouchableOpacity
            onPress={() => router.replace("/worker/dashboard")}
            style={styles.backBtn}
          >
            <ChevronLeft color="#FFFFFF" size={26} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Today&apos;s Pool</Text>
            <Text style={styles.headerSub}>You are visible for new jobs</Text>
          </View>

          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.onlineIcon}>
              <Wifi color="#10B981" size={28} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>You are Online</Text>
              <Text style={styles.heroSub}>
                Hi {firstName}, booking milte hi notification aayegi.
              </Text>
            </View>
          </View>

          <View style={styles.timerBox}>
            <Text style={styles.timerLabel}>
              {isShortPeriod
                ? `${poolInfo?.availabilityHours || ""} Hours Slot Ends In`
                : "Full Day Pool Ends In"}
            </Text>

            <Text style={styles.timerValue}>
              {formatRemainingTime(remainingSeconds)}
            </Text>

            <Text style={styles.timerEndText}>
              Ends at {formatDisplayTime(poolInfo?.availabilityUntil)}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.matchingCard}>
          <View style={styles.matchingIcon}>
            <Activity color="#10B981" size={24} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.matchingTitle}>Searching for bookings</Text>
            <Text style={styles.matchingSub}>
              {isShortPeriod
                ? `Aap next ${poolInfo?.availabilityHours} hours ke liye available ho.`
                : "Aap full day ke liye available ho. System nearby bookings match karega."}
            </Text>
          </View>
        </View>

        <View style={styles.statusGrid}>
          <View style={styles.smallStatusCard}>
            <Clock3 color="#059669" size={24} />
            <Text style={styles.smallStatusTitle}>
              {isShortPeriod
                ? `${poolInfo?.availabilityHours} Hours`
                : "Full Day"}
            </Text>
            <Text style={styles.smallStatusSub}>Availability</Text>
          </View>

          <View style={styles.smallStatusCard}>
            <ShieldCheck color="#059669" size={24} />
            <Text style={styles.smallStatusTitle}>Verified</Text>
            <Text style={styles.smallStatusSub}>Profile</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <BriefcaseBusiness color="#059669" size={21} />
            </View>
            <View>
              <Text style={styles.cardTitle}>Pool Status</Text>
              <Text style={styles.cardSub}>Current matching setup</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Availability Type</Text>
            <Text style={styles.statValue}>
              {isShortPeriod ? "Some Hours" : "Full Day"}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Start Time</Text>
            <Text style={styles.statValue}>
              {formatDisplayTime(poolInfo?.availabilityStart)}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>End Time</Text>
            <Text style={styles.statValue}>
              {formatDisplayTime(poolInfo?.availabilityUntil)}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Status</Text>
            <Text style={[styles.statValue, { color: "#059669" }]}>Online</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <MapPin color="#059669" size={21} />
            </View>
            <View>
              <Text style={styles.cardTitle}>Your Work Areas</Text>
              <Text style={styles.cardSub}>
                Bookings can be assigned from your nakas
              </Text>
            </View>
          </View>

          <View style={styles.nakaItem}>
            <View>
              <Text style={styles.nakaTitle}>Assigned Nakas</Text>
              <Text style={styles.nakaSub}>As per your worker profile</Text>
            </View>

            <View style={styles.readyBadge}>
              <CheckCircle2 color="#047857" size={14} />
              <Text style={styles.readyBadgeText}>Ready</Text>
            </View>
          </View>

          <View style={styles.infoLine}>
            <Sparkles color="#F59E0B" size={17} />
            <Text style={styles.infoLineText}>
              High demand areas me booking jaldi mil sakti hai.
            </Text>
          </View>
        </View>

        <View style={styles.notificationCard}>
          <View style={styles.notificationIcon}>
            <BellRing color="#FFFFFF" size={24} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.notificationTitle}>Keep phone nearby</Text>
            <Text style={styles.notificationSub}>
              Booking assign hone par notification aur active duty screen open
              hogi.
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.refreshBtn}
            onPress={handleRefreshDuty}
          >
            <RefreshCcw color="#111827" size={18} />
            <Text style={styles.refreshBtnText}>Check Duty</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.stopBtn}
            onPress={handleStopAvailability}
            disabled={isStopping}
          >
            {isStopping ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <PowerOff color="#FFFFFF" size={18} />
                <Text style={styles.stopBtnText}>Go Offline</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.tipBox}>
          <Timer color="#92400E" size={18} />
          <Text style={styles.tipText}>
            Tip: Phone internet ON rakho. Booking assign hone par turant
            response dena important hai.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },

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
    paddingBottom: 32,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },

  appBar: {
    paddingTop: 44,
    paddingHorizontal: 18,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.16)",
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },

  headerSub: {
    color: "#A7F3D0",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },

  liveBadge: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#A7F3D0",
  },

  liveBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },

  heroCard: {
    marginHorizontal: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  onlineIcon: {
    width: 60,
    height: 60,
    borderRadius: 21,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  heroTitle: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "900",
  },

  heroSub: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 4,
  },

  timerBox: {
    marginTop: 18,
    backgroundColor: "#111827",
    borderRadius: 22,
    paddingVertical: 18,
    alignItems: "center",
  },

  timerLabel: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  timerValue: {
    color: "#A7F3D0",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 2,
    marginTop: 4,
    fontVariant: ["tabular-nums"],
  },

  timerEndText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 5,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
  },

  matchingCard: {
    marginTop: -28,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },

  matchingIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  matchingTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
  },

  matchingSub: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 3,
  },

  statusGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },

  smallStatusCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },

  smallStatusTitle: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 9,
  },

  smallStatusSub: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  cardTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
  },

  cardSub: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },

  statRow: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  statLabel: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "700",
  },

  statValue: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "900",
  },

  nakaItem: {
    backgroundColor: "#F9FAFB",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  nakaTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },

  nakaSub: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },

  readyBadge: {
    backgroundColor: "#ECFDF5",
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  readyBadgeText: {
    color: "#047857",
    fontSize: 11,
    fontWeight: "900",
  },

  infoLine: {
    marginTop: 12,
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  infoLineText: {
    flex: 1,
    color: "#92400E",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },

  notificationCard: {
    backgroundColor: "#0F172A",
    borderRadius: 24,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  notificationIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  notificationTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  notificationSub: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 3,
  },

  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },

  refreshBtn: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  refreshBtnText: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "900",
  },

  stopBtn: {
    flex: 1,
    backgroundColor: "#EF4444",
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },

  stopBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },

  tipBox: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 18,
    padding: 13,
    flexDirection: "row",
    gap: 9,
  },

  tipText: {
    flex: 1,
    color: "#92400E",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
});
