import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Location from "expo-location";
import { router, Stack } from "expo-router";
import { ArrowLeft, Grid2X2, LocateFixed, MapPin, X } from "lucide-react-native";
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

const DEFAULT_RADIUS_METERS = 5000;

type NakaOption = {
  id: number;
  name: string;
  pincode?: string | null;
  landmark?: string | null;
  latitude: number;
  longitude: number;
  distanceKm: number;
  distanceMeters?: number;
  city?: {
    id: number;
    name: string;
  } | null;
};

type BookingDraft = {
  skillId?: number;
  skillName?: string;
  minRating?: number;
  workerCount?: number;
  assignmentMode?: "AUTO" | "CUSTOMER_SELECT";
  workLatitude?: number;
  workLongitude?: number;
  workAddress?: string;
  serviceRadiusKm?: number;
  serviceRadiusMeters?: number;
  selectedNakas?: NakaOption[];
  nakaIds?: number[];
  selectedWorkerIds?: number[];
  selectedWorkers?: unknown[];
};

type MapSettings = {
  radiusMeters: number;
};

const formatDistance = (naka: NakaOption) => {
  if (naka.distanceMeters != null && naka.distanceMeters < 1000) {
    return `${naka.distanceMeters} m`;
  }

  return `${Number(naka.distanceKm || 0).toFixed(1)} km`;
};

export default function BookWorkerStep2() {
  const nearbyRequestRef = useRef(0);
  const addressRequestRef = useRef(0);

  const [draft, setDraft] = useState<BookingDraft>({});
  const [workLocation, setWorkLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [workAddress, setWorkAddress] = useState("");
  const [nearbyNakas, setNearbyNakas] = useState<NakaOption[]>([]);
  const [systemNakas, setSystemNakas] = useState<NakaOption[]>([]);
  const [mapSettings, setMapSettings] = useState<MapSettings>({
    radiusMeters: DEFAULT_RADIUS_METERS,
  });
  const [isLocating, setIsLocating] = useState(false);
  const [isLoadingNakas, setIsLoadingNakas] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [nakaModalVisible, setNakaModalVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initialise = async () => {
      try {
        try {
          const optionResponse = await axios.get(
            `${API_URL}/user/booking-options`,
          );

          if (isMounted) {
            setMapSettings({
              radiusMeters:
                Number(optionResponse.data?.mapSettings?.radiusMeters) ||
                DEFAULT_RADIUS_METERS,
            });
          }
        } catch (settingError) {
          console.log("Booking location setting load error:", settingError);
        }

        const savedDraft = await AsyncStorage.getItem("newBookingDraft");
        const parsedDraft: BookingDraft = savedDraft
          ? JSON.parse(savedDraft)
          : {};

        if (!isMounted) return;
        setDraft(parsedDraft);

        const latitude = Number(parsedDraft.workLatitude);
        const longitude = Number(parsedDraft.workLongitude);

        if (
          Number.isFinite(latitude) &&
          Number.isFinite(longitude) &&
          latitude >= -90 &&
          latitude <= 90 &&
          longitude >= -180 &&
          longitude <= 180
        ) {
          await applyWorkLocation(
            { latitude, longitude },
            parsedDraft.workAddress || "",
          );
        } else {
          await fetchCurrentLocation(false);
        }
      } catch (error) {
        console.log("Work location initialise error:", error);
      }
    };

    initialise();

    return () => {
      isMounted = false;
      nearbyRequestRef.current += 1;
    };
    // Initialisation intentionally runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadNearbyNakas = async (coordinate: {
    latitude: number;
    longitude: number;
  }) => {
    const requestId = nearbyRequestRef.current + 1;
    nearbyRequestRef.current = requestId;

    try {
      setIsLoadingNakas(true);
      setNearbyNakas([]);
      setSystemNakas([]);

      const response = await axios.post(`${API_URL}/user/nakas/nearby`, {
        workLatitude: coordinate.latitude,
        workLongitude: coordinate.longitude,
      });

      if (requestId !== nearbyRequestRef.current) return;

      setNearbyNakas(response.data.nearbyNakas || []);
      setSystemNakas(response.data.selectedNakas || []);
      setMapSettings({
        radiusMeters:
          Number(response.data.mapSettings?.radiusMeters) ||
          Number(response.data.radiusMeters) ||
          DEFAULT_RADIUS_METERS,
      });
    } catch (error: any) {
      if (requestId !== nearbyRequestRef.current) return;

      console.log("Nearby Nakas error:", error?.response?.data || error);
      setNearbyNakas([]);
      setSystemNakas([]);

      Alert.alert(
        "Nearby Nakas",
        error?.response?.data?.message ||
          "Nearby Nakas load nahi ho paye. Please try again.",
      );
    } finally {
      if (requestId === nearbyRequestRef.current) {
        setIsLoadingNakas(false);
      }
    }
  };

  const resolveAddress = async (coordinate: {
    latitude: number;
    longitude: number;
  }) => {
    try {
      const addressList = await Location.reverseGeocodeAsync(coordinate);
      const address = addressList[0];

      if (!address) return "";

      return [
        address.name,
        address.street,
        address.district,
        address.city,
        address.region,
        address.postalCode,
      ]
        .filter(Boolean)
        .filter((value, index, values) => values.indexOf(value) === index)
        .join(", ");
    } catch (error) {
      console.log("Reverse geocode error:", error);
      return "";
    }
  };

  const applyWorkLocation = async (
    coordinate: { latitude: number; longitude: number },
    existingAddress = "",
  ) => {
    const addressRequestId = addressRequestRef.current + 1;
    addressRequestRef.current = addressRequestId;

    setWorkLocation(coordinate);
    setWorkAddress(
      existingAddress ||
        `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`,
    );

    void loadNearbyNakas(coordinate);

    if (!existingAddress) {
      const resolvedAddress = await resolveAddress(coordinate);
      if (resolvedAddress && addressRequestId === addressRequestRef.current) {
        setWorkAddress(resolvedAddress);
      }
    }
  };

  const fetchCurrentLocation = async (showAlert: boolean) => {
    try {
      setIsLocating(true);
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        if (showAlert) {
          Alert.alert(
            "Location Permission Required",
            "Please allow location permission and try again.",
          );
        }
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      await applyWorkLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (error) {
      console.log("Current location error:", error);

      if (showAlert) {
        Alert.alert("Location Error", "Current location fetch nahi ho payi.");
      }
    } finally {
      setIsLocating(false);
    }
  };

  const handleContinue = async () => {
    if (!workLocation) {
      Alert.alert("Work Location", "Please work location confirm karein.");
      return;
    }

    if (systemNakas.length === 0) {
      Alert.alert(
        "Service Unavailable",
        `Is location ke ${mapSettings.radiusMeters / 1000} km radius me koi verified Naka nahi mila.`,
      );
      return;
    }

    try {
      setIsContinuing(true);
      const optionResponse = await axios.get(`${API_URL}/user/booking-options`);
      const assignmentMode: "AUTO" | "CUSTOMER_SELECT" =
        optionResponse.data.assignmentMode === "CUSTOMER_SELECT"
          ? "CUSTOMER_SELECT"
          : "AUTO";

      const nextDraft: BookingDraft = {
        ...draft,
        assignmentMode,
        workLatitude: workLocation.latitude,
        workLongitude: workLocation.longitude,
        workAddress,
        serviceRadiusKm: mapSettings.radiusMeters / 1000,
        serviceRadiusMeters: mapSettings.radiusMeters,
        selectedNakas: systemNakas,
        nakaIds: systemNakas.map((naka) => naka.id),
        selectedWorkerIds: [],
        selectedWorkers: [],
      };

      await AsyncStorage.setItem("newBookingDraft", JSON.stringify(nextDraft));

      router.push(
        assignmentMode === "CUSTOMER_SELECT"
          ? "/user/book-worker-select-workers"
          : "/user/book-worker-step3",
      );
    } catch (error: any) {
      console.log("Work location continue error:", error?.response?.data || error);
      Alert.alert(
        "Unable to Continue",
        error?.response?.data?.message || "Please try again.",
      );
    } finally {
      setIsContinuing(false);
    }
  };

  const visibleNakas = nearbyNakas.slice(0, 3);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>BOOK WORKER • STEP 2</Text>
          <Text style={styles.title}>Work location</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressLineStart} />
        <View style={styles.progressCircleDone}>
          <Text style={styles.progressDoneText}>1</Text>
        </View>
        <View style={styles.progressLineActive} />
        <View style={styles.progressCircleActive}>
          <Text style={styles.progressActiveText}>2</Text>
        </View>
        <View style={styles.progressLineInactive} />
        <View style={styles.progressCircleInactive}>
          <Text style={styles.progressInactiveText}>3</Text>
        </View>
        <View style={styles.progressLineEnd} />
      </View>

      <View style={styles.divider} />

      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby Nakas</Text>
          <TouchableOpacity
            style={styles.locateButton}
            onPress={() => void fetchCurrentLocation(true)}
            disabled={isLocating}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color="#16863A" />
            ) : (
              <LocateFixed size={20} color="#16863A" />
            )}
          </TouchableOpacity>
        </View>

        {isLoadingNakas ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#16863A" />
          </View>
        ) : nearbyNakas.length > 0 ? (
          <View style={styles.nakaGrid}>
            {visibleNakas.map((naka) => (
              <View key={naka.id} style={styles.nakaCard}>
                <View style={styles.nakaIconWrap}>
                  <MapPin size={22} color="#16863A" />
                </View>
                <Text style={styles.nakaName} numberOfLines={2}>
                  {naka.name}
                </Text>
                <Text style={styles.nakaDistance}>{formatDistance(naka)}</Text>
              </View>
            ))}

            {nearbyNakas.length > 3 ? (
              <TouchableOpacity
                style={[styles.nakaCard, styles.viewAllCard]}
                activeOpacity={0.82}
                onPress={() => setNakaModalVisible(true)}
              >
                <View style={styles.nakaIconWrap}>
                  <Grid2X2 size={23} color="#16863A" />
                </View>
                <Text style={styles.viewAllText}>View All</Text>
                <Text style={styles.nakaDistance}>
                  +{nearbyNakas.length - 3} more
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.emptyBox}
            activeOpacity={0.82}
            onPress={() => void fetchCurrentLocation(true)}
          >
            <MapPin size={24} color="#64748B" />
            <Text style={styles.emptyText}>No nearby Nakas. Tap to retry.</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!workLocation ||
              systemNakas.length === 0 ||
              isLoadingNakas ||
              isContinuing) &&
              styles.continueButtonDisabled,
          ]}
          activeOpacity={0.86}
          disabled={
            !workLocation ||
            systemNakas.length === 0 ||
            isLoadingNakas ||
            isContinuing
          }
          onPress={() => void handleContinue()}
        >
          {isContinuing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.continueButtonText}>Confirm & Continue</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={nakaModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent={false}
        onRequestClose={() => setNakaModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.nakaModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nearby Nakas</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setNakaModalVisible(false)}
              >
                <X size={23} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalGrid}
            >
              {nearbyNakas.slice(3).map((naka) => (
                <View key={naka.id} style={styles.modalNakaCard}>
                  <View style={styles.modalNakaTop}>
                    <MapPin size={19} color="#16863A" />
                    <Text style={styles.modalDistance}>
                      {formatDistance(naka)}
                    </Text>
                  </View>
                  <Text style={styles.modalNakaName} numberOfLines={2}>
                    {naka.name}
                  </Text>
                  <Text style={styles.modalNakaMeta} numberOfLines={1}>
                    {naka.city?.name || naka.landmark || "Verified Naka"}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalDoneButton}
              onPress={() => setNakaModalVisible(false)}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 7,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerCopy: {
    marginLeft: 13,
  },
  eyebrow: {
    color: "#16863A",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  title: {
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 2,
  },
  progressContainer: {
    height: 52,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  progressLineStart: {
    flex: 0.7,
    height: 3,
    borderRadius: 10,
    backgroundColor: "#E4E4E4",
  },
  progressLineActive: {
    flex: 2,
    height: 3,
    backgroundColor: "#16863A",
  },
  progressLineInactive: {
    flex: 2,
    height: 3,
    backgroundColor: "#E4E4E4",
  },
  progressLineEnd: {
    flex: 0.7,
    height: 3,
    borderRadius: 10,
    backgroundColor: "#E4E4E4",
  },
  progressCircleDone: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
    backgroundColor: "#E7E7E7",
  },
  progressCircleActive: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
    backgroundColor: "#16863A",
  },
  progressCircleInactive: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
    backgroundColor: "#E7E7E7",
  },
  progressDoneText: {
    color: "#8E8E8E",
    fontSize: 15,
    fontWeight: "600",
  },
  progressActiveText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  progressInactiveText: {
    color: "#8E8E8E",
    fontSize: 15,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#ECECEC",
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
  },
  locateButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
  },
  loadingBox: {
    height: 250,
    alignItems: "center",
    justifyContent: "center",
  },
  nakaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  nakaCard: {
    width: "48.4%",
    minHeight: 128,
    borderRadius: 20,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDE7E1",
  },
  viewAllCard: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  nakaIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
    marginBottom: 10,
  },
  nakaName: {
    minHeight: 38,
    color: "#1E293B",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
  },
  nakaDistance: {
    color: "#16863A",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 5,
  },
  viewAllText: {
    minHeight: 38,
    color: "#16863A",
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "900",
  },
  emptyBox: {
    minHeight: 150,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  emptyText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F0",
    backgroundColor: "#FFFFFF",
  },
  continueButton: {
    minHeight: 55,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F172A",
  },
  continueButtonDisabled: {
    backgroundColor: "#94A3B8",
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.42)",
  },
  nakaModal: {
    height: "72%",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "900",
  },
  modalClose: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  modalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingBottom: 10,
    rowGap: 12,
  },
  modalNakaCard: {
    width: "48.3%",
    minHeight: 112,
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  modalNakaTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  modalDistance: {
    color: "#16863A",
    fontSize: 10,
    fontWeight: "800",
  },
  modalNakaName: {
    color: "#1E293B",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },
  modalNakaMeta: {
    color: "#64748B",
    fontSize: 10,
    marginTop: 5,
  },
  modalDoneButton: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16863A",
    marginTop: 8,
  },
  modalDoneText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
});
