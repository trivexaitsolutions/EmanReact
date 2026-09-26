// app/worker/history.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Stack, router } from "expo-router";
import {
    Calendar,
    ChevronLeft,
    Clock,
    IndianRupee,
    Star,
    User,
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
import WorkerBottomNav from "../../components/worker-bottom-nav";
import { API_URL } from "../../constants/api";

export default function WorkerHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const session = await AsyncStorage.getItem("workerSession");

      if (!session) {
        router.replace("/");
        return;
      }

      const parsedData = JSON.parse(session);

      const response = await axios.get(
        `${API_URL}/worker/history/${parsedData.id}`,
      );

      if (response.data.success) {
        setHistory(response.data.history || []);
        setSummary(response.data.summary || null);
      }
    } catch (error) {
      console.log("Error fetching worker history", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAmount = (item: any) => {
    return item.workerShare || item.amount || item.totalAmount || 0;
  };

  const renderBookingItem = ({ item }: any) => {
    const isCompleted = item.status === "COMPLETED";
    const isCancelled = item.status === "CANCELLED";

    const statusBackground = isCompleted
      ? "#ECFDF5"
      : isCancelled
        ? "#FEF2F2"
        : "#FEF3C7";

    const statusColor = isCompleted
      ? "#059669"
      : isCancelled
        ? "#DC2626"
        : "#D97706";

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => {
          router.push({
            pathname: "/worker/booking-details",
            params: { id: item.id },
          });
        }}
      >
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
              { backgroundColor: statusBackground },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <Text style={styles.nakaName}>
          {item.customerName || "Client Booking"}
        </Text>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <User color="#6B7280" size={18} />
            <Text style={styles.detailValue}>
              {item.customerPhone || "Client"}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <IndianRupee color="#6B7280" size={18} />
            <Text style={styles.detailValue}>₹{getAmount(item)}</Text>
          </View>
        </View>

        {isCancelled && (
          <View style={styles.fineBox}>
            <View style={styles.fineHeaderRow}>
              <Text style={styles.fineLabel}>Cancellation Fine</Text>
              <Text style={styles.fineValue}>
                {item.fineStatus === "PENDING"
                  ? "Pending"
                  : `₹${Number(item.fineAmount || 0)}`}
              </Text>
            </View>

            {item.fineStatus === "PENDING" ? (
              <Text style={styles.fineHint}>
                Mitra ne fine abhi finalize nahi kiya hai.
              </Text>
            ) : null}

            {item.cancellationReason ? (
              <Text style={styles.cancelReason}>
                Reason: {item.cancellationReason}
              </Text>
            ) : null}
          </View>
        )}

        {isCompleted && (
          <View
            style={[
              styles.ratingMiniBadge,
              {
                backgroundColor: item.isClientRated ? "#ECFDF5" : "#FEF3C7",
              },
            ]}
          >
            <Star
              color={item.isClientRated ? "#059669" : "#D97706"}
              size={14}
              fill={item.isClientRated ? "#059669" : "transparent"}
            />
            <Text
              style={[
                styles.ratingMiniText,
                { color: item.isClientRated ? "#059669" : "#D97706" },
              ]}
            >
              {item.isClientRated ? "Client Rated" : "Client Rating Pending"}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace("/worker/dashboard")}
          style={styles.backBtn}
        >
          <ChevronLeft color="#000" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Work History</Text>
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
          ListHeaderComponent={
            summary ? (
              <View style={styles.summaryCard}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {summary.completedJobs || 0}
                  </Text>
                  <Text style={styles.summaryLabel}>Completed Jobs</Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    ₹{summary.totalEarning || 0}
                  </Text>
                  <Text style={styles.summaryLabel}>Total Earning</Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {summary.pendingRatings || 0}
                  </Text>
                  <Text style={styles.summaryLabel}>Pending Ratings</Text>
                </View>
              </View>
            ) : null
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Clock color="#D1D5DB" size={60} />
          <Text style={styles.emptyText}>
            Abhi tak koi work history nahi hai.
          </Text>
        </View>
      )}

      <WorkerBottomNav active="jobs" />
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

  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },

  listContent: {
    padding: 20,
    paddingBottom: 28,
  },

  summaryCard: {
    backgroundColor: "#111827",
    padding: 18,
    borderRadius: 20,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  summaryItem: {
    flex: 1,
    alignItems: "center",
  },

  summaryValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },

  summaryLabel: {
    color: "#CBD5E1",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },

  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.18)",
  },

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

  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  dateText: {
    marginLeft: 6,
    color: "#6B7280",
    fontWeight: "600",
    fontSize: 13,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  nakaName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 15,
  },

  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  detailItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  detailValue: {
    marginLeft: 8,
    fontSize: 15,
    color: "#4B5563",
    fontWeight: "700",
  },

  fineBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  fineHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  fineLabel: {
    color: "#7F1D1D",
    fontSize: 13,
    fontWeight: "800",
  },

  fineValue: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "900",
  },

  fineHint: {
    marginTop: 6,
    color: "#991B1B",
    fontSize: 12,
    fontWeight: "600",
  },

  cancelReason: {
    marginTop: 6,
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
  },

  ratingMiniBadge: {
    marginTop: 14,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },

  ratingMiniText: {
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 6,
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
