import { useI18n } from '../../i18n';
// app/user/dashboard.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack } from "expo-router";
import {
  ArrowRight,
  Bell,
  Clock,
  History,
  Home,
  PhoneCall,
  PlusSquare,
  Settings,
  User,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { API_URL } from "../../constants/api";
import LanguageQuickSwitcher from "../../components/language-quick-switcher";
import { useMitraCall } from "../../utils/useMitraCall";

const parseIdList = (value: any): number[] => {
  try {
    return JSON.parse(value || "[]").map(Number);
  } catch {
    return [];
  }
};

const isTrackableActiveBooking = (booking: any) => {
  if (!booking) return false;

  // Dashboard par sirf genuinely active bookings dikhni chahiye.
  if (!["ASSIGNED", "IN_PROGRESS"].includes(String(booking.status))) {
    return false;
  }

  const workers = Array.isArray(booking.workers) ? booking.workers : [];
  const cancelledIds = parseIdList(booking.cancelledWorkerIds);

  // ASSIGNED/IN_PROGRESS status stale reh sakta hai even after every worker
  // has cancelled. In that case booking ko active banner me mat dikhana.
  if (workers.length > 0) {
    const activeWorkers = workers.filter(
      (worker: any) => !cancelledIds.includes(Number(worker.id)),
    );
    return activeWorkers.length > 0;
  }

  return false;
};

const getBookingStatusLabel = (booking: any) => {
  if (!booking) return "No active booking";

  if (booking.status === "IN_PROGRESS") return "Work in progress";
  if (booking.status === "COMPLETED" && !booking.isRated) {
    return "Completed · Rating pending";
  }

  if (booking.status === "ASSIGNED") {
    const cancelledIds = parseIdList(booking.cancelledWorkerIds);
    const arrivedIds = parseIdList(booking.arrivedWorkerIds);
    const activeWorkers = (booking.workers || []).filter(
      (worker: any) => !cancelledIds.includes(Number(worker.id)),
    );
    const arrivedCount = activeWorkers.filter((worker: any) =>
      arrivedIds.includes(Number(worker.id)),
    ).length;

    return arrivedCount > 0 ? "Workers arriving" : "Workers assigned";
  }

  return String(booking.status || "Active").replace(/_/g, " ");
};

const getBookingStatusSubtitle = (booking: any) => {
  if (!booking) return "";

  if (booking.status === "IN_PROGRESS") {
    return "Your booking is currently in progress.";
  }

  if (booking.status === "COMPLETED" && !booking.isRated) {
    return "Work completed. Please rate your workers.";
  }

  if (booking.status === "ASSIGNED") {
    const cancelledIds = parseIdList(booking.cancelledWorkerIds);
    const arrivedIds = parseIdList(booking.arrivedWorkerIds);
    const activeWorkers = (booking.workers || []).filter(
      (worker: any) => !cancelledIds.includes(Number(worker.id)),
    );
    const arrivedCount = activeWorkers.filter((worker: any) =>
      arrivedIds.includes(Number(worker.id)),
    ).length;

    return arrivedCount > 0
      ? `${arrivedCount}/${activeWorkers.length} worker(s) arrived.`
      : `${activeWorkers.length || booking.workerCount || 0} worker(s) assigned.`;
  }

  return "Track your current booking.";
};

export default function CustomerDashboard() {
  const { t, entityText } = useI18n();
  const { callMitra, busy } = useMitraCall("customer");
  const [userData, setUserData] = useState<any>(null);
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const startNewBooking = async () => {
    try {
      /*
       * Dashboard se Book New Workers start karna
       * hamesha ek fresh booking maana jayega.
       *
       * Step 2/Step 3 se Back aane par draft preserve
       * rahega, kyunki clear sirf dashboard button se hoga.
       */
      await AsyncStorage.removeItem("newBookingDraft");

      router.push("/user/book-worker-step1");
    } catch (error) {
      console.log("New booking draft reset error:", error);

      // Storage clear fail hone par bhi booking page open rakho.
      router.push("/user/book-worker-step1");
    }
  };

  const fetchDashboardData = async () => {
    try {
      const session = await AsyncStorage.getItem("customerSession");
      if (session) {
        const parsedData = JSON.parse(session);
        setUserData(parsedData);

        // Fetch Active Booking
        try {
          const activeRes = await axios.get(
            `${API_URL}/user/current-booking/${parsedData.id}`,
          );
          if (
            activeRes.data.success &&
            isTrackableActiveBooking(activeRes.data.booking)
          ) {
            setActiveBooking(activeRes.data.booking);
          } else {
            setActiveBooking(null);
          }
        } catch (e) {
          console.log("No active booking");
        }

        // Fetch History
        try {
          const historyRes = await axios.get(
            `${API_URL}/user/booking-history/${parsedData.id}`,
          );
          if (historyRes.data.success) {
            setRecentBookings(historyRes.data.history.slice(0, 2)); // Sirf top 2 dikhayenge
          }
        } catch (e) {
          console.log("No history found");
        }
      }
    } catch (error) {
      console.log("Error loading dashboard", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* GREEN HEADER SECTION */}
        <View style={styles.headerBackground}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
              <Text style={styles.greetingText} numberOfLines={1} adjustsFontSizeToFit>{t("Hi, ")}{userData?.name || "User"}! 👋
              </Text>
            </View>
            <View style={styles.headerIcons}>
              <LanguageQuickSwitcher onDark />
              <View style={[styles.profileCircle, { marginLeft: 6 }]}>
                <Text style={styles.profileInitial}>
                  {userData?.name ? userData.name.charAt(0).toUpperCase() : "S"}
                </Text>
              </View>
              <TouchableOpacity style={styles.bellIcon}>
                <Bell color="#fff" size={24} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ACTIVE BOOKING BANNER (Sirf tab dikhega jab booking ON ho) */}
          {activeBooking && (
            <TouchableOpacity
              style={styles.activeBanner}
              onPress={() => router.push("/user/active-booking")}
            >
              <View style={styles.activeBannerRow}>
                <Clock color="#10B981" size={24} />
                <View style={{ marginLeft: 15, flex: 1 }}>
                  <Text style={styles.activeBannerTitle}>{t("Booking #")}{activeBooking.id} · {t(getBookingStatusLabel(activeBooking))}
                  </Text>
                  <Text style={styles.activeBannerSub}>
                    {t(getBookingStatusSubtitle(activeBooking))}
                  </Text>
                </View>
              </View>
              <Text style={styles.trackStatusText}>{t("Track Status")}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* MAIN CONTENT SECTION */}
        <View style={styles.mainContent}>
          {/* CREATE BOOKING CARD */}
          <View style={styles.bookCard}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.bookCardTitle}>{t("Book New Workers")}</Text>
              <Text style={styles.bookCardSub}>{t("Find skilled help instantly for your needs.")}</Text>
              <TouchableOpacity
                style={styles.getStartedBtn}
                onPress={startNewBooking}
              >
                <Text style={styles.getStartedText}>{t("Get Started")}</Text>
                <ArrowRight color="#fff" size={16} style={{ marginLeft: 5 }} />
              </TouchableOpacity>
            </View>
            <View style={styles.bookCardGraphic}>
              <UsersPlaceholder />
            </View>
          </View>

          {/* QUICK LINKS GRID */}
          <View style={styles.gridContainer}>
            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => router.push("/user/history")}
            >
              <History color="#10B981" size={24} />
              <View style={styles.gridText}>
                <Text style={styles.gridItemTitle}>{t("History")}</Text>
                <Text style={styles.gridItemSub}>{t("Past Bookings")}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.gridItem} onPress={callMitra} disabled={busy} accessibilityRole="button">
              <PhoneCall color="#10B981" size={24} />
              <View style={styles.gridText}>
                <Text style={styles.gridItemTitle}>{t("Support")}</Text>
                <Text style={styles.gridItemSub}>{t("Call Field Agent")}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.gridItem} onPress={() => router.push("/user/profile")} accessibilityRole="button">
              <Settings color="#10B981" size={24} />
              <View style={styles.gridText}>
                <Text style={styles.gridItemTitle}>{t("Settings")}</Text>
                <Text style={styles.gridItemSub}>{t("Preferences")}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* RECENT BOOKINGS */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t("Recent Bookings")}</Text>
            <TouchableOpacity onPress={() => router.push("/user/history")}>
              <Text style={styles.viewAllText}>{t("View All")}</Text>
            </TouchableOpacity>
          </View>

          {recentBookings.length > 0 ? (
            recentBookings.map((booking: any) => (
              <View key={booking.id} style={styles.recentCard}>
                <View style={styles.recentIconBox}>
                  <User color="#10B981" size={20} />
                  <Text style={styles.recentWorkerCount}>
                    {booking.workerCount} W
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 15 }}>
                  <Text style={styles.recentCardTitle}>
                    {booking.naka?.name || t("General Booking")}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginTop: 4,
                    }}
                  >
                    <Text style={styles.recentCardSub}>
                      {new Date(booking.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </Text>
                    <Text style={styles.recentCardAmount}>
                      ₹{booking.totalAmount}
                    </Text>
                  </View>
                </View>
                <Text style={styles.statusTextDone}>{t("Completed")}</Text>
              </View>
            ))
          ) : (
            <Text
              style={{ textAlign: "center", color: "#9CA3AF", marginTop: 20 }}
            >{t("No recent bookings found.")}</Text>
          )}
        </View>
      </ScrollView>

      {/* BOTTOM NAVIGATION BAR */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Home color="#10B981" size={24} />
          <Text style={[styles.navText, { color: "#10B981" }]}>{t("Home")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={startNewBooking}
        >
          <PlusSquare color="#9CA3AF" size={24} />
          <Text style={styles.navText}>{t("Book")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/user/history")}
        >
          <History color="#9CA3AF" size={24} />
          <Text style={styles.navText}>{t("History")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/user/profile")}
        >
          <User color="#9CA3AF" size={24} />
          <Text style={styles.navText}>{t("Profile")}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Chhota sa graphic placeholder button ke side ke liye
const UsersPlaceholder = () => (
  <View
    style={{
      width: 80,
      height: 80,
      backgroundColor: "#ECFDF5",
      borderRadius: 40,
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <User color="#10B981" size={40} />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },

  headerBackground: {
    backgroundColor: "#10B981",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 5,
  },

  headerIcons: { flexDirection: "row", alignItems: "center" },
  profileCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fff",
    marginRight: 15,
  },
  profileInitial: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  bellIcon: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-end",
  },

  activeBanner: {
    backgroundColor: "#ECFDF5",
    marginTop: 25,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  activeBannerRow: { flexDirection: "row", alignItems: "center" },
  activeBannerTitle: { fontSize: 16, fontWeight: "800", color: "#065F46" },
  activeBannerSub: { fontSize: 13, color: "#047857", marginTop: 2 },
  trackStatusText: {
    color: "#10B981",
    fontWeight: "800",
    marginTop: 15,
    textDecorationLine: "underline",
  },

  mainContent: { paddingHorizontal: 20, marginTop: -20 },

  bookCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 25,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 5,
    marginBottom: 20,
  },
  bookCardTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 5,
  },
  bookCardSub: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 15,
    lineHeight: 18,
  },
  getStartedBtn: {
    backgroundColor: "#10B981",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  getStartedText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  bookCardGraphic: { paddingLeft: 10 },

  gridContainer: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    marginBottom: 25,
  },
  gridItem: {
    backgroundColor: "#fff",
    flex: 1,
    minWidth: 0,
    padding: 10,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  gridText: { alignSelf: "stretch", marginTop: 6, minWidth: 0 },
  gridItemTitle: { textAlign: "center", fontSize: 13, fontWeight: "800", color: "#111827" },
  gridItemSub: { textAlign: "center", fontSize: 11, color: "#6B7280", marginTop: 2 },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#111827" },
  viewAllText: { color: "#10B981", fontWeight: "700", fontSize: 14 },

  recentCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  recentIconBox: {
    backgroundColor: "#ECFDF5",
    padding: 10,
    borderRadius: 12,
    alignItems: "center",
    width: 55,
  },
  recentWorkerCount: {
    fontSize: 10,
    fontWeight: "800",
    color: "#10B981",
    marginTop: 4,
  },
  recentCardTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },
  recentCardSub: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
  recentCardAmount: { fontSize: 13, color: "#111827", fontWeight: "800" },
  statusTextDone: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 10,
  },

  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 15,
    paddingBottom: 25,
    borderTopWidth: 1,
    borderColor: "#F3F4F6",
  },
  navItem: { alignItems: "center" },
  navText: { fontSize: 12, fontWeight: "600", marginTop: 4, color: "#9CA3AF" },
});
