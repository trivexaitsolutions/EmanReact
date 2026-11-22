import { useI18n } from '../../i18n';
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
  AppState,
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
  const { t } = useI18n();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'weekly' | 'payments'>('weekly');
  const [error, setError] = useState(false);
  const requestRef = useRef(0);
  const workerIdRef = useRef<number | null>(null);
  const loadingMoreRef = useRef(false);

  const fetchPage = useCallback(async (targetPage: number, reset = false, requestedView: 'weekly' | 'payments' = 'weekly') => {
    if (targetPage > 1) {
      if (loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setIsLoadingMore(false);
      setError(false);
    }
    const request = ++requestRef.current;
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
        params: { page: targetPage, limit: PAGE_SIZE, view: requestedView },
      });

      if (request !== requestRef.current) return;
      if (!response.data.success) throw new Error("Wallet request failed");

      const incoming = response.data.transactions || [];
      setTransactions((current) =>
        reset ? incoming : [...current, ...incoming],
      );
      setSummary(response.data.summary || null);
      setHasMore(Boolean(response.data.pagination?.hasMore));
      setPage(targetPage);
    } catch (error) {
      if (request === requestRef.current) setError(true);
    } finally {
      if (request === requestRef.current) {
        loadingMoreRef.current = false;
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setTransactions([]);
      setPage(1);
      setHasMore(false);
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
      setSummary(null);
      void fetchPage(1, true, view);
      const subscription=AppState.addEventListener('change',state=>{
        if(state==='active'){loadingMoreRef.current=false;void fetchPage(1,true,view);}
      });
      return () => { subscription.remove(); requestRef.current++; loadingMoreRef.current = false; };
    }, [fetchPage, view]),
  );

  const loadMore = () => {
    if (!hasMore || isLoadingMore || isLoading) return;
    void fetchPage(page + 1, false, view);
  };

  const formatRange = () => {
    if (!summary?.from || !summary?.to) return t("This week");
    const from = new Date(summary.from);
    const to = new Date(new Date(summary.to).getTime() - 1);
    return `${from.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} - ${to.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
  };

  const renderTransaction = ({ item }: any) => {
    const isPayout = item.type === "PAYOUT";
    const isDeduction = item.type === "DEDUCTION" || isPayout;
    const method = ({CASH: "Cash", UPI: "UPI", BANK: "Bank transfer", OTHER: "Other"} as Record<string, string>)[item.method] || "Other";

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
          <Text style={styles.transactionTitle}>{isPayout ? t("Manual payout") : item.title}</Text>
          <Text numberOfLines={2} style={styles.transactionDescription}>
            {isPayout ? `${t(method)}${item.reference ? ` · ${item.reference}` : ""}` : item.description}
          </Text>
          <Text style={styles.transactionDate}>
            {new Date(item.occurredAt).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
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
          {isPayout && view === "payments" ? "" : isDeduction ? "-" : "+"}₹{Number(item.amount || 0).toLocaleString("en-IN")}
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
        <Text style={styles.headerTitle}>{t("Wallet")}</Text>
      </View>

      <View style={styles.tabs}>
        {(['weekly','payments'] as const).map(tab => (
          <TouchableOpacity key={tab} accessibilityRole="tab" accessibilityState={{selected:view===tab}} onPress={() => setView(tab)} style={[styles.tab, view===tab && styles.selectedTab]}>
            <Text style={[styles.tabText, view===tab && styles.selectedTabText]}>{t(tab==='weekly'?'Weekly activity':'Payment History')}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#087C49" />
        </View>
      ) : error && !summary ? (
        <View style={styles.loader}><Text style={styles.emptyText}>{t("Unable to load wallet. Please try again.")}</Text><TouchableOpacity style={styles.retry} onPress={() => void fetchPage(1,true,view)}><Text style={styles.selectedTabText}>{t("Retry")}</Text></TouchableOpacity></View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={() => { loadingMoreRef.current=false; void fetchPage(1, true, view); }}
          refreshing={isLoading}
          onEndReached={loadMore}
          onEndReachedThreshold={0.35}
          ListHeaderComponent={
            <>
              <View style={styles.balanceCard}>
                <View style={styles.walletIconWrap}>
                  <WalletCards color="#087C49" size={28} />
                </View>
                <Text style={styles.balanceLabel}>{t("Pending payout")}</Text>
                <Text style={styles.balanceAmount}>
                  ₹{Number(summary?.balance || 0).toLocaleString("en-IN")}
                </Text>
                <Text style={styles.rangeText}>{t("All-time balance, including previous weeks.")}</Text>
                <Text style={styles.rangeText}>{t("Total paid")}: ₹{Number(summary?.totalPaid || 0).toLocaleString("en-IN")}</Text>
                <Text style={styles.rangeText}>{formatRange()}</Text>

                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>{t("This week earnings")}</Text>
                    <Text style={styles.earningSummary}>
                      +₹{Number(summary?.grossEarning || 0).toLocaleString("en-IN")}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>{t("Deductions")}</Text>
                    <Text style={styles.deductionSummary}>
                      -₹{Number(summary?.totalDeductions || 0).toLocaleString("en-IN")}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.sectionTitle}>{t(view==='payments'?'Payment History':'Transactions')}</Text>
              {view==='weekly' && <Text style={styles.sectionSub}>{t("Earnings and finalized deductions for this week.")}</Text>}
              {error && <TouchableOpacity style={styles.retry} onPress={()=>void fetchPage(1,true,view)}><Text style={styles.selectedTabText}>{t("Retry")}</Text></TouchableOpacity>}
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <WalletCards color="#CBD5E1" size={48} />
              <Text style={styles.emptyTitle}>{t(view === "payments" ? "No payouts recorded yet." : "No wallet activity")}</Text>
              {view === "weekly" && <Text style={styles.emptyText}>{t("This week ke earnings aur deductions yahan dikhengi.")}</Text>}
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
  tabs: { flexDirection: "row", gap: 8, padding: 12, backgroundColor:"#FFFFFF" },
  tab: { flex: 1, minHeight: 44, borderRadius: 12, padding: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  selectedTab: { backgroundColor:"#087C49" },
  tabText: { color:"#374151", fontSize:14, fontWeight:"700", textAlign:"center" },
  selectedTabText: { color:"#FFFFFF", fontWeight:"700", textAlign:"center" },
  retry: { backgroundColor:"#087C49", padding:12, borderRadius:10, margin:12 },
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
