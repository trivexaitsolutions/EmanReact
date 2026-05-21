// app/worker/dashboard.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack } from "expo-router";
import {
  AlertTriangle,
  Award,
  ChevronRight,
  Clock,
  LogOut,
  PhoneCall,
  ShieldCheck,
  Star,
  Sun,
  Zap,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
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
import { registerForPushNotificationsAsync } from "../../utils/pushToken";

export default function WorkerDashboard() {
  const [workerData, setWorkerData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();

    // PURANA LOGIC: Push Notification Setup
    const setupNotifications = async () => {
      try {
        const session = await AsyncStorage.getItem("workerSession");
        if (!session) return;
        const parsedData = JSON.parse(session);
        const currentWorkerId = parsedData.id;

        const token = await registerForPushNotificationsAsync();

        if (token) {
          console.log("Dashboard ko token mil gaya: ", token);
          const response = await axios.post(
            `${API_URL}/worker/save-push-token`,
            {
              workerId: currentWorkerId,
              pushToken: token,
            },
          );
          if (response.data.success) {
            console.log("✅ Token successfully Database me save ho gaya!");
          }
        }
      } catch (error: any) {
        console.log("Token lene me error aaya: " + error.message);
      }
    };

    setupNotifications();
  }, []);

  // PURANA LOGIC + NAYA BACKEND: Session se ID nikal kar Dashboard data lana
  const fetchDashboardData = async () => {
    try {
      const session = await AsyncStorage.getItem("workerSession");
      if (session) {
        const parsedData = JSON.parse(session);
        // Using our new dashboard API to get earnings and UI stats
        const response = await axios.get(
          `${API_URL}/worker/dashboard/${parsedData.id}`,
        );
        if (response.data.success) setWorkerData(response.data.data);
      }
    } catch (error) {
      console.log("Dashboard fetch error", error);
    } finally {
      setIsLoading(false);
    }
  };

  // PURANA LOGIC: '3-sec hold' ki jagah ab is function par click hoga
  // PURANA LOGIC + SMART ROUTING
  const handleGoOnline = async () => {
    try {
      const session = await AsyncStorage.getItem("workerSession");
      if (!session) return;
      const parsedData = JSON.parse(session);
      const workerId = parsedData.id;

      // 1. Worker ki availability TRUE karo
      const response = await axios.post(`${API_URL}/worker/update-status`, {
        workerId: workerId,
        status: true,
      });

      if (response.data.success) {
        // 2. Check karo ki kya worker ka koi active kaam chal raha hai?
        try {
          const dutyResponse = await axios.get(
            `${API_URL}/worker/current-duty/${workerId}`,
          );

          if (dutyResponse.data.success && dutyResponse.data.duty) {
            // Agar pehle se koi duty ASSIGNED ya IN_PROGRESS hai
            Alert.alert("Duty Active", "Aapka ek kaam pehle se chal raha hai!");
            router.replace("/worker/active-duty");
          } else {
            // Agar koi duty nahi hai, toh Pool me wait karne bhejo
            Alert.alert("Kaam Shuru", "Aap pool mein add ho gaye hain!");
            router.push("/worker/available");
          }
        } catch (dutyError) {
          console.log("Duty check error", dutyError);
          // Agar check fail ho jaye, toh as a fallback available screen bhej do
          router.push("/worker/available");
        }
      }
    } catch (error) {
      Alert.alert("Error", "Server se connect nahi ho paya");
    }
  };

  if (isLoading || !workerData) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* APP BAR WITH LOGOUT (Purana logic retained) */}
      <View style={styles.appBar}>
        <Text style={styles.logo}>E-MAN</Text>
        <TouchableOpacity
          onPress={() =>
            Alert.alert("Logout", "Logout karein?", [
              { text: "Nahi" },
              {
                text: "Haan",
                onPress: async () => {
                  await AsyncStorage.clear();
                  router.replace("/");
                },
              },
            ])
          }
          style={styles.logoutBtn}
        >
          <LogOut color="#EF4444" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* GREETING CARD */}
        <View style={styles.greetingCard}>
          <View style={styles.greetingRow}>
            <View>
              <Text style={styles.workerName}>
                Namaste, {workerData?.name?.split(" ")[0] || "Worker"} 🙏
              </Text>
              <Text style={styles.workerId}>
                {workerData?.emanId || "EMN-MUM-XXXX"}
              </Text>
              <View style={styles.starsRow}>
                <Star color="#FFA500" fill="#FFA500" size={14} />
                <Text style={styles.scoreText}>
                  {" "}
                  {workerData?.score || "4.2"}
                </Text>
              </View>
            </View>
            <View style={styles.badge}>
              <Award color="#fff" size={12} />
              <Text style={styles.badgeText}>
                {workerData?.level || "Silver"}
              </Text>
            </View>
          </View>
        </View>

        {/* INSURANCE BANNER */}
        <TouchableOpacity style={styles.insuranceBadge}>
          <ShieldCheck color="#fff" size={28} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.insureTitle}>Beema ACTIVE</Text>
            <Text style={styles.insureSub}>Free ₹3 lakh accident cover</Text>
          </View>
        </TouchableOpacity>

        {/* WALLET CARD */}
        <View style={styles.walletCard}>
          <Text style={styles.walletLabel}>💰 This Week's Earning</Text>
          <Text style={styles.walletAmount}>
            ₹{workerData?.weeklyEarning || "0"}
          </Text>
          <Text style={styles.walletMeta}>Sunday payout · 3 days left</Text>
          <View style={styles.walletBtnRow}>
            <TouchableOpacity style={styles.walletBtn}>
              <Text style={styles.walletBtnText}>📊 Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.walletBtn}>
              <Text style={styles.walletBtnText}>⚡ Pay Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* JOB MODES */}

        {/* THE MAGIC BUTTON: Triggers the old API and routing logic */}
        <TouchableOpacity
          style={[styles.modeCard, styles.modePrimary]}
          onPress={handleGoOnline}
        >
          <View style={styles.modeHeaderRow}>
            <Sun color="#0a0e27" size={20} />
            <Text style={styles.modeTitle}>Pure Din Kaam</Text>
          </View>
          <Text style={styles.modeDesc}>
            Full day · Start your active duty instantly
          </Text>
          <View style={styles.modeBtnPrimary}>
            <Text style={styles.modeBtnPrimaryText}>I'M AVAILABLE TODAY</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.modeCard}>
          <View style={styles.modeHeaderRow}>
            <Zap color="#0a0e27" size={20} />
            <Text style={styles.modeTitle}>Chote Kaam</Text>
          </View>
          <Text style={styles.modeDesc}>1-2 hour quick jobs nearby</Text>
          <View style={styles.modeBtnSecondary}>
            <Text style={styles.modeBtnSecondaryText}>GO ONLINE NOW</Text>
          </View>
        </TouchableOpacity>

        {/* MENU LIST */}
        <View style={styles.menuList}>
          <MenuItem
            icon={<Star color="#16a34a" size={20} />}
            title={`My E-MAN Score (${workerData?.score || "4.2"})`}
          />
          <MenuItem
            icon={<ShieldCheck color="#16a34a" size={20} />}
            title="My Insurance"
          />
          <MenuItem
            icon={<Clock color="#16a34a" size={20} />}
            title="Work History"
          />
          <MenuItem
            icon={<AlertTriangle color="#dc2626" size={20} />}
            title="Raise an Issue"
          />
          <MenuItem
            icon={<PhoneCall color="#16a34a" size={20} />}
            title="Support 24/7"
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const MenuItem = ({ icon, title }: { icon: any; title: string }) => (
  <TouchableOpacity style={styles.menuItem}>
    <View style={styles.menuItemLeft}>
      {icon}
      <Text style={styles.menuItemText}>{title}</Text>
    </View>
    <ChevronRight color="#cbd5e1" size={20} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f7" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  appBar: {
    backgroundColor: "#FFD700",
    padding: 15,
    paddingTop: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    elevation: 3,
  },
  logo: { fontSize: 18, fontWeight: "900", color: "#0a0e27" },
  logoutBtn: { padding: 10, backgroundColor: "#FEE2E2", borderRadius: 12 }, // Purana logout button style
  content: { padding: 16 },

  greetingCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  greetingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  workerName: { fontSize: 18, fontWeight: "800", color: "#0a0e27" },
  workerId: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
    fontFamily: "monospace",
  },
  starsRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  scoreText: { color: "#FFA500", fontSize: 13, fontWeight: "700" },
  badge: {
    backgroundColor: "#C0C0C0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "bold", marginLeft: 4 },

  insuranceBadge: {
    backgroundColor: "#059669",
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  insureTitle: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  insureSub: { color: "#d1fae5", fontSize: 11, marginTop: 2 },

  walletCard: {
    backgroundColor: "#1e293b",
    padding: 20,
    borderRadius: 14,
    marginBottom: 12,
  },
  walletLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  walletAmount: {
    color: "#FFD700",
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 4,
  },
  walletMeta: { color: "rgba(255,255,255,0.7)", fontSize: 11 },
  walletBtnRow: { flexDirection: "row", gap: 10, marginTop: 15 },
  walletBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,215,0,0.3)",
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  walletBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  modeCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  modePrimary: { borderColor: "#FFD700", backgroundColor: "#fffbeb" },
  modeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0a0e27",
    marginLeft: 8,
  },
  modeDesc: { fontSize: 12, color: "#666", marginBottom: 14 },
  modeBtnPrimary: {
    backgroundColor: "#FFD700",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  modeBtnPrimaryText: { color: "#0a0e27", fontWeight: "900", fontSize: 14 },
  modeBtnSecondary: {
    backgroundColor: "#f1f5f9",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  modeBtnSecondaryText: { color: "#475569", fontWeight: "900", fontSize: 14 },

  menuList: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginTop: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#f1f5f9",
  },
  menuItemLeft: { flexDirection: "row", alignItems: "center" },
  menuItemText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: "600",
    color: "#0a0e27",
  },
});
