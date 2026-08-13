import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Location from "expo-location";
import { router, Stack } from "expo-router";
import {
  ArrowLeft,
  CheckCircle2,
  LocateFixed,
  MapPin,
  Navigation,
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
  useWindowDimensions,
  View,
} from "react-native";
import MapView, {
  Circle,
  Marker,
  type LatLng,
  type Region,
} from "react-native-maps";
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
  showMap: boolean;
  radiusMeters: number;
  apiKey?: string | null;
};

const DEFAULT_REGION: Region = {
  latitude: 19.076,
  longitude: 72.8777,
  latitudeDelta: 0.13,
  longitudeDelta: 0.13,
};

const regionFor = (coordinate: LatLng): Region => ({
  ...coordinate,
  latitudeDelta: 0.115,
  longitudeDelta: 0.115,
});

const formatRadius = (radiusMeters: number) =>
  radiusMeters >= 1000
    ? `${Number((radiusMeters / 1000).toFixed(1))} km`
    : `${radiusMeters} m`;

export default function BookWorkerStep2() {
  const { height } = useWindowDimensions();
  const mapRef = useRef<MapView | null>(null);
  const nearbyRequestRef = useRef(0);
  const addressRequestRef = useRef(0);

  const [draft, setDraft] = useState<BookingDraft>({});
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [workLocation, setWorkLocation] = useState<LatLng | null>(null);
  const [workAddress, setWorkAddress] = useState("");
  const [nearbyNakas, setNearbyNakas] = useState<NakaOption[]>([]);
  const [systemNakas, setSystemNakas] = useState<NakaOption[]>([]);
  const [mapSettings, setMapSettings] = useState<MapSettings>({
    showMap: false,
    radiusMeters: DEFAULT_RADIUS_METERS,
    apiKey: null,
  });
  const [isLocating, setIsLocating] = useState(false);
  const [isLoadingNakas, setIsLoadingNakas] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [locationPermissionDenied, setLocationPermissionDenied] =
    useState(false);

  const mapHeight = Math.max(260, Math.min(390, height * 0.43));

  useEffect(() => {
    let isMounted = true;

    const initialise = async () => {
      try {
        try {
          const optionResponse = await axios.get(
            `${API_URL}/user/booking-options`,
          );
          const optionMapSettings = optionResponse.data?.mapSettings;

          if (isMounted) {
            setMapSettings({
              showMap: Boolean(optionMapSettings?.showMap),
              radiusMeters:
                Number(optionMapSettings?.radiusMeters) ||
                DEFAULT_RADIUS_METERS,
              apiKey: optionMapSettings?.apiKey || null,
            });
          }
        } catch (settingError) {
          console.log("Booking map setting load error:", settingError);
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
            false,
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
    // Initialisation must run only once; callbacks use state setters safely.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadNearbyNakas = async (coordinate: LatLng) => {
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
        showMap: Boolean(response.data.mapSettings?.showMap),
        radiusMeters:
          Number(response.data.mapSettings?.radiusMeters) ||
          Number(response.data.radiusMeters) ||
          DEFAULT_RADIUS_METERS,
        apiKey: response.data.mapSettings?.apiKey || null,
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

  const resolveAddress = async (coordinate: LatLng) => {
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
    coordinate: LatLng,
    existingAddress = "",
    animate = true,
  ) => {
    const nextRegion = regionFor(coordinate);
    const addressRequestId = addressRequestRef.current + 1;
    addressRequestRef.current = addressRequestId;
    setWorkLocation(coordinate);
    setRegion(nextRegion);

    if (animate) {
      mapRef.current?.animateToRegion(nextRegion, 450);
    }

    setWorkAddress(
      existingAddress ||
        `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`,
    );

    void loadNearbyNakas(coordinate);

    if (!existingAddress) {
      const resolvedAddress = await resolveAddress(coordinate);
      if (
        resolvedAddress &&
        addressRequestId === addressRequestRef.current
      ) {
        setWorkAddress(resolvedAddress);
      }
    }
  };

  const fetchCurrentLocation = async (showAlert: boolean) => {
    try {
      setIsLocating(true);
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        setLocationPermissionDenied(true);

        if (showAlert) {
          Alert.alert(
            "Location Permission Required",
            mapSettings.showMap
              ? "Current location use karne ke liye app settings me location permission allow karein. Aap map par tap karke bhi work location set kar sakte hain."
              : "Work location use karne ke liye app settings me location permission allow karein.",
          );
        }
        return;
      }

      setLocationPermissionDenied(false);
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
        Alert.alert(
          "Location Error",
          mapSettings.showMap
            ? "Current location fetch nahi ho payi. GPS on karke dobara try karein, ya map par location set karein."
            : "Current location fetch nahi ho payi. GPS on karke dobara try karein.",
        );
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
        `Is location ke ${formatRadius(mapSettings.radiusMeters)} radius me koi verified Naka nahi mila. Please work location change karein.`,
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

      await AsyncStorage.setItem(
        "newBookingDraft",
        JSON.stringify(nextDraft),
      );

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>BOOK WORKER • STEP 2</Text>
          <Text style={styles.title}>Confirm work location</Text>
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

      <View style={styles.progressDivider} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          Work location confirm karein. {formatRadius(mapSettings.radiusMeters)}
          {" "}ke andar ke saare verified Nakas system automatically use karega.
        </Text>

        {mapSettings.showMap ? (
          <View style={[styles.mapCard, { height: mapHeight }]}>
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              region={region}
              showsCompass
              showsUserLocation={!locationPermissionDenied}
              showsMyLocationButton={false}
              onPress={(event) =>
                void applyWorkLocation(event.nativeEvent.coordinate)
              }
            >
              {workLocation ? (
                <>
                  <Circle
                    center={workLocation}
                    radius={mapSettings.radiusMeters}
                    fillColor="rgba(5, 150, 105, 0.12)"
                    strokeColor="rgba(5, 150, 105, 0.72)"
                    strokeWidth={2}
                  />
                  <Marker
                    coordinate={workLocation}
                    draggable
                    pinColor="#059669"
                    title="Work location"
                    description="Drag this pin to change the location"
                    onDragEnd={(event) =>
                      void applyWorkLocation(
                        event.nativeEvent.coordinate,
                        "",
                        false,
                      )
                    }
                  />
                </>
              ) : null}

              {nearbyNakas.map((naka) => (
                <Marker
                  key={naka.id}
                  stopPropagation
                  coordinate={{
                    latitude: Number(naka.latitude),
                    longitude: Number(naka.longitude),
                  }}
                  pinColor="#F59E0B"
                  title={naka.name}
                  description={`${naka.distanceKm.toFixed(1)} km away${
                    naka.city?.name ? ` • ${naka.city.name}` : ""
                  }`}
                />
              ))}
            </MapView>

            <View style={styles.mapHint}>
              <Navigation size={14} color="#065F46" />
              <Text style={styles.mapHintText}>Tap map or drag green pin</Text>
            </View>

            {isLoadingNakas ? (
              <View style={styles.mapLoader}>
                <ActivityIndicator color="#059669" />
                <Text style={styles.mapLoaderText}>Finding nearby Nakas…</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.nakaListCard}>
            <View style={styles.nakaListHeader}>
              <View>
                <Text style={styles.nakaListEyebrow}>NEARBY VERIFIED NAKAS</Text>
                <Text style={styles.nakaListTitle}>
                  {isLoadingNakas
                    ? "Finding Nakas…"
                    : `${nearbyNakas.length} Naka${nearbyNakas.length === 1 ? "" : "s"} found`}
                </Text>
              </View>
              {isLoadingNakas ? (
                <ActivityIndicator color="#059669" />
              ) : (
                <MapPin size={22} color="#059669" />
              )}
            </View>

            {!isLoadingNakas && nearbyNakas.length === 0 ? (
              <Text style={styles.emptyNakaText}>
                Is work location ke aas-paas koi verified Naka nahi mila.
              </Text>
            ) : null}

            {nearbyNakas.map((naka, index) => (
              <View
                key={naka.id}
                style={[
                  styles.nakaListRow,
                  index === nearbyNakas.length - 1 && styles.nakaListRowLast,
                ]}
              >
                <View style={styles.nakaIndexBadge}>
                  <Text style={styles.nakaIndexText}>{index + 1}</Text>
                </View>
                <View style={styles.nakaListCopy}>
                  <Text style={styles.nakaName}>{naka.name}</Text>
                  <Text style={styles.nakaMeta} numberOfLines={1}>
                    {[naka.city?.name, naka.pincode, naka.landmark]
                      .filter(Boolean)
                      .join(" • ") || "Verified Naka"}
                  </Text>
                </View>
                <Text style={styles.nakaDistance}>
                  {naka.distanceMeters != null && naka.distanceMeters < 1000
                    ? `${naka.distanceMeters} m`
                    : `${naka.distanceKm.toFixed(1)} km`}
                </Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.locationButton}
          activeOpacity={0.85}
          disabled={isLocating}
          onPress={() => void fetchCurrentLocation(true)}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <LocateFixed size={20} color="#FFFFFF" />
          )}
          <Text style={styles.locationButtonText}>
            {isLocating ? "Fetching location…" : "Use My Current Location"}
          </Text>
        </TouchableOpacity>

        <View style={styles.locationCard}>
          <View style={styles.locationIcon}>
            <MapPin size={20} color="#059669" />
          </View>
          <View style={styles.locationCopy}>
            <Text style={styles.locationLabel}>CONFIRMED WORK LOCATION</Text>
            <Text style={styles.locationValue} numberOfLines={2}>
              {workLocation ? workAddress : "Location not selected"}
            </Text>
          </View>
        </View>

        <View style={styles.radiusCard}>
          <View style={styles.radiusTopRow}>
            <View>
              <Text style={styles.radiusLabel}>
                {formatRadius(mapSettings.radiusMeters).toUpperCase()} SERVICE AREA
              </Text>
              <Text style={styles.radiusCount}>
                {isLoadingNakas
                  ? "Checking verified Nakas…"
                  : `${nearbyNakas.length} verified Naka${
                      nearbyNakas.length === 1 ? "" : "s"
                    } found`}
              </Text>
            </View>

            {systemNakas.length > 0 ? (
              <CheckCircle2 size={24} color="#059669" />
            ) : null}
          </View>

          <Text style={styles.radiusNote}>
            {nearbyNakas.length > 0
              ? `${mapSettings.showMap ? "Orange pins" : "Yeh list"} sirf information ke liye hai. Selection ki zaroorat nahi—system saare ${nearbyNakas.length} nearby Naka${nearbyNakas.length === 1 ? "" : "s"} automatically use karega.`
              : `Is ${formatRadius(mapSettings.radiusMeters)} area me verified Naka nahi mila. Please current work location dobara fetch karein${mapSettings.showMap ? " ya map pin move karein" : ""}.`}
          </Text>
        </View>

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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7FAF8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
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
    color: "#059669",
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
    height: 58,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
    backgroundColor: "#E7E7E7",
  },
  progressCircleActive: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
    backgroundColor: "#16863A",
  },
  progressCircleInactive: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
    backgroundColor: "#E7E7E7",
  },
  progressDoneText: {
    color: "#8E8E8E",
    fontSize: 17,
    fontWeight: "500",
  },
  progressActiveText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  progressInactiveText: {
    color: "#8E8E8E",
    fontSize: 17,
    fontWeight: "500",
  },
  progressDivider: {
    height: 1,
    backgroundColor: "#E7E7E7",
    marginBottom: 10,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 30,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 13,
  },
  mapCard: {
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: "#E2E8F0",
    borderWidth: 1,
    borderColor: "#DDE7E1",
  },
  mapHint: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  mapHintText: {
    color: "#065F46",
    fontSize: 11,
    fontWeight: "700",
  },
  mapLoader: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    paddingVertical: 11,
    backgroundColor: "rgba(255,255,255,0.96)",
  },
  mapLoaderText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
  },
  nakaListCard: {
    overflow: "hidden",
    borderRadius: 22,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDE7E1",
  },
  nakaListHeader: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#ECF1EE",
  },
  nakaListEyebrow: {
    color: "#059669",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  nakaListTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
  },
  emptyNakaText: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    paddingVertical: 18,
  },
  nakaListRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ECF1EE",
  },
  nakaListRowLast: {
    borderBottomWidth: 0,
  },
  nakaIndexBadge: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
  },
  nakaIndexText: {
    color: "#047857",
    fontSize: 12,
    fontWeight: "900",
  },
  nakaListCopy: {
    flex: 1,
    marginLeft: 11,
    marginRight: 8,
  },
  nakaName: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "800",
  },
  nakaMeta: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 3,
  },
  nakaDistance: {
    color: "#047857",
    fontSize: 11,
    fontWeight: "800",
  },
  locationButton: {
    minHeight: 52,
    marginTop: 13,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: "#059669",
  },
  locationButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  locationCard: {
    marginTop: 12,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  locationIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
  },
  locationCopy: {
    flex: 1,
    marginLeft: 12,
  },
  locationLabel: {
    color: "#059669",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  locationValue: {
    color: "#1E293B",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 3,
  },
  radiusCard: {
    marginTop: 12,
    borderRadius: 18,
    padding: 15,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  radiusTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  radiusLabel: {
    color: "#047857",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  radiusCount: {
    color: "#064E3B",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 3,
  },
  radiusNote: {
    color: "#3F6759",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 9,
  },
  continueButton: {
    minHeight: 55,
    borderRadius: 17,
    marginTop: 14,
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
});
