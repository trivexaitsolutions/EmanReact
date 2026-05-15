// app/user/history.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Stack, router } from "expo-router";
import {
    Calendar,
    ChevronLeft,
    Clock,
    IndianRupee,
    Users,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { API_URL } from "../../constants/api";

export default function BookingHistory() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const session = await AsyncStorage.getItem("customerSession");
      if (session) {
        const parsedData = JSON.parse(session);
        const response = await axios.get(
          `${API_URL}/user/booking-history/${parsedData.id}`,
        );
        if (response.data.success) {
          setHistory(response.data.history);
        }
      }
    } catch (error) {
      console.log("Error fetching history", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderBookingItem = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.dateContainer}>
          <Calendar color="#6B7280" size={16} />
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.status === "COMPLETED" ? "#ECFDF5" : "#FEF3C7",
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: item.status === "COMPLETED" ? "#059669" : "#D97706" },
            ]}
          >
            {item.status}
          </Text>
        </View>
      </View>

      <Text style={styles.nakaName}>
        {item.naka?.name || "General Booking"}
      </Text>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Users color="#6B7280" size={18} />
          <Text style={styles.detailValue}>
            {item.workerCount || item.workers?.length} Workers
          </Text>
        </View>
        <View style={styles.detailItem}>
          <IndianRupee color="#6B7280" size={18} />
          <Text style={styles.detailValue}>₹{item.totalAmount}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color="#000" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking History</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#000" style={{ flex: 1 }} />
      ) : history.length > 0 ? (
        <FlatList
          data={history}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Clock color="#D1D5DB" size={60} />
          <Text style={styles.emptyText}>
            Abhi tak koi bookings nahi ki hain.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#111827" },
  listContent: { padding: 20 },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dateContainer: { flexDirection: "row", alignItems: "center" },
  dateText: {
    marginLeft: 6,
    color: "#6B7280",
    fontWeight: "600",
    fontSize: 13,
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  nakaName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 15,
  },
  detailsRow: { flexDirection: "row", justifyContent: "space-between" },
  detailItem: { flexDirection: "row", alignItems: "center" },
  detailValue: {
    marginLeft: 8,
    fontSize: 15,
    color: "#4B5563",
    fontWeight: "700",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: "#9CA3AF",
    textAlign: "center",
    fontWeight: "600",
  },
});
