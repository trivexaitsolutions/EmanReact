import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack, useFocusEffect } from "expo-router";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  MapPin,
  RefreshCw,
  Star,
  User,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
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

type WorkerOption = {
  id: number;
  name?: string | null;
  photoUrl?: string | null;
  age?: number | null;
  gender?: string | null;
  qualification?: string | null;
  averageRating?: number;
  ratingCount?: number;
  mehnatRating?: number;
  vyavhaarRating?: number;
  nakas?: {
    id: number;
    name?: string | null;
    pincode?: string | null;
    city?: {
      id: number;
      name?: string | null;
    } | null;
  }[];
  skills?: {
    id: number;
    name?: string | null;
  }[];
};

type BookingDraft = {
  skillId?: number;
  skillName?: string;
  minRating?: number;
  workerCount?: number;
  nakaIds?: number[];
  selectedNakas?: any[];
  assignmentMode?: "AUTO" | "CUSTOMER_SELECT";
  selectedWorkerIds?: number[];
  selectedWorkers?: WorkerOption[];
  workLatitude?: number;
  workLongitude?: number;
  workAddress?: string;
  serviceRadiusKm?: number;
  serviceRadiusMeters?: number;
};

const formatRadius = (draft: BookingDraft) => {
  const meters = Number(
    draft.serviceRadiusMeters || Number(draft.serviceRadiusKm || 5) * 1000,
  );
  return meters >= 1000
    ? `${Number((meters / 1000).toFixed(1))} km`
    : `${meters} m`;
};

export default function BookWorkerSelectWorkers() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);

  const [draft, setDraft] = useState<BookingDraft>({});
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<number[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadAvailableWorkers(false);
    }, []),
  );

  const loadAvailableWorkers = async (manualRefresh: boolean) => {
    try {
      if (manualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const savedDraft = await AsyncStorage.getItem("newBookingDraft");

      if (!savedDraft) {
        Alert.alert(
          "Booking Details Missing",
          "Please start your booking again.",
        );
        router.replace("/user/book-worker-step1");
        return;
      }

      const parsedDraft: BookingDraft = JSON.parse(savedDraft);
      const workerCount = Number(parsedDraft.workerCount || 1);
      const workLatitude = Number(parsedDraft.workLatitude);
      const workLongitude = Number(parsedDraft.workLongitude);

      if (
        !parsedDraft.skillId ||
        !Number.isFinite(workLatitude) ||
        !Number.isFinite(workLongitude)
      ) {
        Alert.alert(
          "Booking Details Missing",
          "Please select skill and confirm work location again.",
        );
        router.replace("/user/book-worker-step1");
        return;
      }

      const response = await axios.post(
        `${API_URL}/user/available-workers`,
        {
          workLatitude,
          workLongitude,
          skillId: Number(parsedDraft.skillId),
          minRating: Number(parsedDraft.minRating || 0),
        },
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Available workers load nahi ho paye.",
        );
      }

      const availableWorkers: WorkerOption[] = response.data.workers || [];
      const availableWorkerIds = new Set(
        availableWorkers.map((worker) => Number(worker.id)),
      );

      const previouslySelected = Array.isArray(parsedDraft.selectedWorkerIds)
        ? parsedDraft.selectedWorkerIds
            .map((id) => Number(id))
            .filter((id) => availableWorkerIds.has(id))
            .slice(0, workerCount)
        : [];

      const updatedDraft: BookingDraft = {
        ...parsedDraft,
        assignmentMode: "CUSTOMER_SELECT",
        selectedNakas: response.data.selectedNakas || [],
        nakaIds: (response.data.selectedNakas || []).map(
          (naka: any) => Number(naka.id),
        ),
        selectedWorkerIds: previouslySelected,
        selectedWorkers: availableWorkers.filter((worker) =>
          previouslySelected.includes(Number(worker.id)),
        ),
      };

      setDraft(updatedDraft);
      setWorkers(availableWorkers);
      setSelectedWorkerIds(previouslySelected);

      await AsyncStorage.setItem(
        "newBookingDraft",
        JSON.stringify(updatedDraft),
      );
    } catch (error: any) {
      const errorCode = error?.response?.data?.code;

      console.log(
        "Available workers load error:",
        error?.response?.data || error,
      );

      if (errorCode === "WORKER_SELECTION_DISABLED") {
        const savedDraft = await AsyncStorage.getItem("newBookingDraft");
        const oldDraft = savedDraft ? JSON.parse(savedDraft) : {};

        await AsyncStorage.setItem(
          "newBookingDraft",
          JSON.stringify({
            ...oldDraft,
            assignmentMode: "AUTO",
            selectedWorkerIds: [],
            selectedWorkers: [],
          }),
        );

        Alert.alert(
          "Booking Mode Changed",
          "Admin ne automatic worker assignment enable kiya hai. Booking automatically continue hogi.",
          [
            {
              text: "Continue",
              onPress: () => router.replace("/user/book-worker-step3"),
            },
          ],
        );
        return;
      }

      Alert.alert(
        "Workers Not Available",
        error?.response?.data?.message ||
          error?.message ||
          "Available workers load nahi ho paye.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const requiredCount = Number(draft.workerCount || 1);

  const toggleWorker = (workerId: number) => {
    const parsedWorkerId = Number(workerId);

    if (selectedWorkerIds.includes(parsedWorkerId)) {
      setSelectedWorkerIds((current) =>
        current.filter((id) => Number(id) !== parsedWorkerId),
      );
      return;
    }

    if (selectedWorkerIds.length >= requiredCount) {
      Alert.alert(
        "Selection Complete",
        `You can select only ${requiredCount} worker${
          requiredCount === 1 ? "" : "s"
        }.`,
      );
      return;
    }

    setSelectedWorkerIds((current) => [...current, parsedWorkerId]);
  };

  const handleNext = async () => {
    if (isContinuing) {
      return;
    }

    if (selectedWorkerIds.length !== requiredCount) {
      Alert.alert(
        "Select Workers",
        `Please select exactly ${requiredCount} worker${
          requiredCount === 1 ? "" : "s"
        } to continue.`,
      );
      return;
    }

    try {
      setIsContinuing(true);

      const selectedWorkers = workers.filter((worker) =>
        selectedWorkerIds.includes(Number(worker.id)),
      );

      const updatedDraft: BookingDraft = {
        ...draft,
        assignmentMode: "CUSTOMER_SELECT",
        selectedWorkerIds,
        selectedWorkers,
      };

      await AsyncStorage.setItem(
        "newBookingDraft",
        JSON.stringify(updatedDraft),
      );

      router.push("/user/book-worker-step3");
    } catch (error) {
      console.log("Selected workers save error:", error);
      Alert.alert("Error", "Selected workers save nahi ho paye.");
    } finally {
      setIsContinuing(false);
    }
  };

  const nearbyNakaCount = useMemo(
    () => (Array.isArray(draft.selectedNakas) ? draft.selectedNakas.length : 0),
    [draft.selectedNakas],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#16863A" />
        <Text style={styles.loaderText}>Finding available workers...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={30} color="#16863A" strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Select Workers</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {draft.skillName || "Worker"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          disabled={isRefreshing}
          onPress={() => loadAvailableWorkers(true)}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color="#16863A" />
          ) : (
            <RefreshCw size={23} color="#16863A" />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryTopRow}>
          <View>
            <Text style={styles.summaryLabel}>Workers required</Text>
            <Text style={styles.summaryValue}>{requiredCount}</Text>
          </View>

          <View style={styles.selectedBadge}>
            <Text style={styles.selectedBadgeText}>
              {selectedWorkerIds.length}/{requiredCount} selected
            </Text>
          </View>
        </View>

        <View style={styles.summaryInfoRow}>
          <MapPin size={16} color="#5B6470" />
          <Text style={styles.summaryInfoText} numberOfLines={1}>
            {nearbyNakaCount} nearby Naka{nearbyNakaCount === 1 ? "" : "s"} • {formatRadius(draft)} service area
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {workers.length === 0 ? (
          <View style={styles.emptyCard}>
            <User size={42} color="#A3A3A3" />
            <Text style={styles.emptyTitle}>No workers available</Text>
            <Text style={styles.emptyText}>
              Is work location ke {formatRadius(draft)} area me is skill ke available workers nahi mile.
            </Text>
            <TouchableOpacity
              style={styles.changeNakaButton}
              onPress={() => router.back()}
            >
              <Text style={styles.changeNakaButtonText}>Change Work Location</Text>
            </TouchableOpacity>
          </View>
        ) : (
          workers.map((worker) => {
            const selected = selectedWorkerIds.includes(Number(worker.id));
            const nakaText = (worker.nakas || [])
              .map((naka) => naka.name)
              .filter(Boolean)
              .join(", ");

            return (
              <TouchableOpacity
                key={worker.id}
                activeOpacity={0.82}
                style={[styles.workerCard, selected && styles.workerCardSelected]}
                onPress={() => toggleWorker(worker.id)}
              >
                <View style={styles.avatar}>
                  <User size={25} color="#16863A" />
                </View>

                <View style={styles.workerDetails}>
                  <View style={styles.workerNameRow}>
                    <Text style={styles.workerName} numberOfLines={1}>
                      {worker.name || "Worker"}
                    </Text>

                    <View style={styles.ratingBadge}>
                      <Star size={14} color="#F59E0B" fill="#F59E0B" />
                      <Text style={styles.ratingText}>
                        {Number(worker.averageRating || 0).toFixed(1)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <BriefcaseBusiness size={15} color="#6B7280" />
                    <Text style={styles.infoText} numberOfLines={1}>
                      {worker.qualification || draft.skillName || "Skilled Worker"}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <MapPin size={15} color="#6B7280" />
                    <Text style={styles.infoText} numberOfLines={1}>
                      {nakaText || "Selected Naka"}
                    </Text>
                  </View>

                  <Text style={styles.ratingCountText}>
                    {Number(worker.ratingCount || 0)} rating
                    {Number(worker.ratingCount || 0) === 1 ? "" : "s"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.checkCircle,
                    selected && styles.checkCircleSelected,
                  ]}
                >
                  {selected ? (
                    <Check size={18} color="#FFFFFF" strokeWidth={3} />
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.86}
          disabled={
            isContinuing ||
            workers.length === 0 ||
            selectedWorkerIds.length !== requiredCount
          }
          style={[
            styles.nextButton,
            (isContinuing ||
              workers.length === 0 ||
              selectedWorkerIds.length !== requiredCount) &&
              styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
        >
          {isContinuing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.nextButtonText}>Continue to Address</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9F7" },
  loaderContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: { marginTop: 14, color: "#5B6470", fontWeight: "600" },
  header: {
    minHeight: 92,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E7E7E7",
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
  },
  headerCenter: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "#171717" },
  headerSubtitle: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "700",
    color: "#16863A",
  },
  refreshButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  summaryCard: {
    marginHorizontal: 18,
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDE8E0",
  },
  summaryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: { fontSize: 13, color: "#6B7280", fontWeight: "700" },
  summaryValue: {
    marginTop: 2,
    fontSize: 24,
    color: "#003B1F",
    fontWeight: "900",
  },
  selectedBadge: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#ECF8EF",
  },
  selectedBadgeText: { color: "#16863A", fontWeight: "800" },
  summaryInfoRow: {
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  summaryInfoText: { flex: 1, color: "#5B6470", fontWeight: "600" },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 18, paddingTop: 14 },
  workerCard: {
    minHeight: 118,
    padding: 15,
    marginBottom: 12,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E4E2",
    flexDirection: "row",
    alignItems: "center",
  },
  workerCardSelected: {
    borderWidth: 2,
    borderColor: "#16863A",
    backgroundColor: "#F2FAF4",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E9F7ED",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },
  workerDetails: { flex: 1, minWidth: 0 },
  workerNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  workerName: {
    flex: 1,
    fontSize: 17,
    color: "#171717",
    fontWeight: "900",
  },
  ratingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#FFF7E5",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: { color: "#92400E", fontSize: 12, fontWeight: "900" },
  infoRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: { flex: 1, color: "#606870", fontSize: 13, fontWeight: "600" },
  ratingCountText: {
    marginTop: 7,
    color: "#8A8F95",
    fontSize: 12,
    fontWeight: "600",
  },
  checkCircle: {
    width: 30,
    height: 30,
    marginLeft: 10,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#C7CCC9",
    justifyContent: "center",
    alignItems: "center",
  },
  checkCircleSelected: { borderColor: "#16863A", backgroundColor: "#16863A" },
  emptyCard: {
    minHeight: 270,
    padding: 24,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E1E4E2",
  },
  emptyTitle: {
    marginTop: 13,
    fontSize: 20,
    fontWeight: "900",
    color: "#202124",
  },
  emptyText: {
    marginTop: 8,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  changeNakaButton: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#ECF8EF",
  },
  changeNakaButtonText: { color: "#16863A", fontWeight: "800" },
  bottomSpace: { height: 110 },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 13,
    paddingBottom: 24,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  nextButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: "#16863A",
    justifyContent: "center",
    alignItems: "center",
  },
  nextButtonDisabled: { backgroundColor: "#9DC7A8" },
  nextButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" },
});
