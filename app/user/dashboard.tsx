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
  MapPin,
  PhoneCall,
  PlusSquare,
  Settings,
  User,
  Wallet,
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

export default function CustomerDashboard() {
  const [userData, setUserData] = useState<any>(null);
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
          if (activeRes.data.success) {
            setActiveBooking(activeRes.data.booking);
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
            <View>
              <Text style={styles.greetingText}>
                Hi, {userData?.name || "User"}! 👋
              </Text>
              <View style={styles.locationRow}>
                <MapPin color="#fff" size={14} />
                <Text style={styles.locationText}>Dombivli, MH</Text>
              </View>
            </View>
            <View style={styles.headerIcons}>
              <View style={styles.profileCircle}>
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
                  <Text style={styles.activeBannerTitle}>
                    1 Active Booking In-Progress
                  </Text>
                  <Text style={styles.activeBannerSub}>
                    Workers are on-site.
                  </Text>
                </View>
              </View>
              <Text style={styles.trackStatusText}>Track Status</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* MAIN CONTENT SECTION */}
        <View style={styles.mainContent}>
          {/* CREATE BOOKING CARD */}
          <View style={styles.bookCard}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.bookCardTitle}>Book New Workers</Text>
              <Text style={styles.bookCardSub}>
                Find skilled help instantly for your needs.
              </Text>
              <TouchableOpacity
                style={styles.getStartedBtn}
                onPress={() => router.push("/user/create-booking")}
              >
                <Text style={styles.getStartedText}>Get Started</Text>
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
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.gridItemTitle}>History</Text>
                <Text style={styles.gridItemSub}>Past Bookings</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.gridItem}>
              <Wallet color="#10B981" size={24} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.gridItemTitle}>Wallet</Text>
                <Text style={styles.gridItemSub}>Payments</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.gridItem}>
              <PhoneCall color="#10B981" size={24} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.gridItemTitle}>Support</Text>
                <Text style={styles.gridItemSub}>Help & Contact</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.gridItem}>
              <Settings color="#10B981" size={24} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.gridItemTitle}>Settings</Text>
                <Text style={styles.gridItemSub}>Preferences</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* RECENT BOOKINGS */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Bookings</Text>
            <TouchableOpacity onPress={() => router.push("/user/history")}>
              <Text style={styles.viewAllText}>View All</Text>
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
                    {booking.naka?.name || "General Booking"}
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
                <Text style={styles.statusTextDone}>Completed</Text>
              </View>
            ))
          ) : (
            <Text
              style={{ textAlign: "center", color: "#9CA3AF", marginTop: 20 }}
            >
              No recent bookings found.
            </Text>
          )}
        </View>
      </ScrollView>

      {/* BOTTOM NAVIGATION BAR */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Home color="#10B981" size={24} />
          <Text style={[styles.navText, { color: "#10B981" }]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/user/create-booking")}
        >
          <PlusSquare color="#9CA3AF" size={24} />
          <Text style={styles.navText}>Book</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/user/history")}
        >
          <History color="#9CA3AF" size={24} />
          <Text style={styles.navText}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/user/profile")}
        >
          <User color="#9CA3AF" size={24} />
          <Text style={styles.navText}>Profile</Text>
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
  locationRow: { flexDirection: "row", alignItems: "center" },
  locationText: {
    color: "#ECFDF5",
    fontSize: 14,
    marginLeft: 5,
    fontWeight: "600",
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
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  gridItem: {
    backgroundColor: "#fff",
    width: "48%",
    padding: 15,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  gridItemTitle: { fontSize: 14, fontWeight: "800", color: "#111827" },
  gridItemSub: { fontSize: 11, color: "#6B7280", marginTop: 2 },

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
