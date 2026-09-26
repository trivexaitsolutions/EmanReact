import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Stack, router, useFocusEffect } from "expo-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  WalletCards,
} from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
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

const PAGE_SIZE = 5;

export default function WorkerWallet() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const workerIdRef = useRef<number | null>(null);
  const loadingMoreRef = useRef(false);

  const fetchPage = useCallback(async (targetPage: number, reset = false) => {
    if (targetPage > 1) {
      if (loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      let workerId = workerIdRef.current;
      if (!workerId) {
        const session = await AsyncStorage.getItem("workerSession");
        if (!session) {
          router.replace("/");
          return;
        }
        workerId = Number(JSON.parse(session).id);
        workerIdRef.current = workerId;
      }

      const response = await axios.get(`${API_URL}/worker/wallet/${workerId}`, {
        params: { page: targetPage, limit: PAGE_SIZE },
      });

      if (!response.data.success) return;

      const incoming = response.data.transactions || [];
      setTransactions((current) =>
        reset ? incoming : [...current, ...incoming],
      );
      setSummary(response.data.summary || null);
      setHasMore(Boolean(response.data.pagination?.hasMore));
      setPage(targetPage);
    } catch (error) {
      console.log("Wallet fetch error:", error);
    } finally {
      loadingMoreRef.current = false;
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setTransactions([]);
      setPage(1);
      setHasMore(false);
      void fetchPage(1, true);
    }, [fetchPage]),
  );

  const loadMore = () => {
    if (!hasMore || isLoadingMore || isLoading) return;
    void fetchPage(page + 1, false);
  };

  const formatRange = () => {
    if (!summary?.from || !summary?.to) return "This week";
    const from = new Date(summary.from);
    const to = new Date(new Date(summary.to).getTime() - 1);
    return `${from.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} - ${to.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
  };

  const renderTransaction = ({ item }: any) => {
    const isDeduction = item.type === "DEDUCTION";

    return (
      <View style={styles.transactionCard}>
        <View
          style={[
            styles.transactionIcon,
            isDeduction ? styles.deductionIcon : styles.earningIcon,
          ]}
        >
          {isDeduction ? (
            <ArrowUpRight color="#DC2626" size={22} />
          ) : (
            <ArrowDownLeft color="#087C49" size={22} />
          )}
        </View>

        <View style={styles.transactionCopy}>
          <Text style={styles.transactionTitle}>{item.title}</Text>
          <Text numberOfLines={2} style={styles.transactionDescription}>
            {item.description}
          </Text>
          <Text style={styles.transactionDate}>
            {new Date(item.occurredAt).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>

        <Text
          style={[
            styles.transactionAmount,
            isDeduction ? styles.amountDeduction : styles.amountEarning,
          ]}
        >
          {isDeduction ? "-" : "+"}₹{Number(item.amount || 0).toLocaleString("en-IN")}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace("/worker/dashboard")}
          style={styles.backButton}
        >
          <ChevronLeft color="#111827" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#087C49" />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.35}
          ListHeaderComponent={
            <>
              <View style={styles.balanceCard}>
                <View style={styles.walletIconWrap}>
                  <WalletCards color="#087C49" size={28} />
                </View>
                <Text style={styles.balanceLabel}>This week balance</Text>
                <Text style={styles.balanceAmount}>
                  ₹{Number(summary?.balance || 0).toLocaleString("en-IN")}
                </Text>
                <Text style={styles.rangeText}>{formatRange()}</Text>

                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Earnings</Text>
                    <Text style={styles.earningSummary}>
                      +₹{Number(summary?.grossEarning || 0).toLocaleString("en-IN")}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Deductions</Text>
                    <Text style={styles.deductionSummary}>
                      -₹{Number(summary?.totalDeductions || 0).toLocaleString("en-IN")}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Transactions</Text>
              <Text style={styles.sectionSub}>
                Earnings and finalized deductions for this week.
              </Text>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <WalletCards color="#CBD5E1" size={48} />
              <Text style={styles.emptyTitle}>No wallet activity</Text>
              <Text style={styles.emptyText}>
                This week ke earnings aur deductions yahan dikhengi.
              </Text>
            </View>
          }
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator
                size="small"
                color="#087C49"
                style={styles.moreLoader}
              />
            ) : null
          }
        />
      )}

      <WorkerBottomNav active="wallet" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomColor: "#E5E7EB",
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  backButton: { marginRight: 10, padding: 4 },
  headerTitle: { color: "#111827", fontSize: 22, fontWeight: "900" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { flex: 1 },
  listContent: { padding: 18, paddingBottom: 30 },
  balanceCard: {
    backgroundColor: "#0B7A49",
    borderRadius: 24,
    padding: 22,
    marginBottom: 24,
  },
  walletIconWrap: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  balanceLabel: { color: "#D1FAE5", fontSize: 14, fontWeight: "700", marginTop: 20 },
  balanceAmount: { color: "#FFFFFF", fontSize: 38, fontWeight: "900", marginTop: 5 },
  rangeText: { color: "#BBF7D0", fontSize: 13, fontWeight: "600", marginTop: 5 },
  summaryRow: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    flexDirection: "row",
    marginTop: 22,
    paddingVertical: 14,
  },
  summaryItem: { flex: 1, paddingHorizontal: 14 },
  summaryLabel: { color: "#D1FAE5", fontSize: 12, fontWeight: "700" },
  earningSummary: { color: "#FFFFFF", fontSize: 17, fontWeight: "900", marginTop: 4 },
  deductionSummary: { color: "#FEE2E2", fontSize: 17, fontWeight: "900", marginTop: 4 },
  summaryDivider: { backgroundColor: "rgba(255,255,255,0.2)", height: 42, width: 1 },
  sectionTitle: { color: "#111827", fontSize: 20, fontWeight: "900" },
  sectionSub: { color: "#6B7280", fontSize: 13, marginBottom: 14, marginTop: 4 },
  transactionCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 12,
    padding: 15,
  },
  transactionIcon: { alignItems: "center", borderRadius: 14, height: 46, justifyContent: "center", width: 46 },
  earningIcon: { backgroundColor: "#ECFDF5" },
  deductionIcon: { backgroundColor: "#FEF2F2" },
  transactionCopy: { flex: 1, marginHorizontal: 12 },
  transactionTitle: { color: "#111827", fontSize: 15, fontWeight: "800" },
  transactionDescription: { color: "#6B7280", fontSize: 12, marginTop: 3 },
  transactionDate: { color: "#9CA3AF", fontSize: 11, fontWeight: "600", marginTop: 5 },
  transactionAmount: { fontSize: 15, fontWeight: "900" },
  amountEarning: { color: "#087C49" },
  amountDeduction: { color: "#DC2626" },
  emptyState: { alignItems: "center", paddingHorizontal: 30, paddingVertical: 45 },
  emptyTitle: { color: "#374151", fontSize: 17, fontWeight: "800", marginTop: 12 },
  emptyText: { color: "#9CA3AF", fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: "center" },
  moreLoader: { marginVertical: 18 },
});
