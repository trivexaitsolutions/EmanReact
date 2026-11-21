import { useI18n } from '../../i18n';
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Location from "expo-location";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { ArrowLeft, CheckCircle2, Edit3, LocateFixed, MapPin, Plus, Trash2, X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Modal, SafeAreaView, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { API_URL } from "../../constants/api";

type Coordinate = { latitude: number; longitude: number };
type BookingDraft = {
  addressId?: number;
  workLatitude?: number;
  workLongitude?: number;
  workAddress?: string;
  selectedWorkerIds?: number[];
  selectedWorkers?: unknown[];
  selectedNakas?: unknown[];
  nakaIds?: number[];
  [key: string]: unknown;
};

const validCoordinate = (lat: unknown, lng: unknown): Coordinate | null => {
  if (lat === null || lat === undefined || lng === null || lng === undefined ||
      String(lat).trim() === "" || String(lng).trim() === "") return null;
  const latitude = Number(lat), longitude = Number(lng);
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
    Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
    ? { latitude, longitude } : null;
};
// Native Google Maps is intentionally not used on this screen. GPS and
// reverse-geocoding are best-effort; a network/location failure must not
// prevent a customer from saving the address description.
async function withTimeout<T>(promise: Promise<T>, delayMs: number): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error("Location request timed out")), delayMs);
      }),
    ]);
  } finally {
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
  }
}

const distanceMeters = (a: Coordinate, b: Coordinate) => {
  const rad = (v: number) => v * Math.PI / 180;
  const dLat = rad(b.latitude - a.latitude), dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) *
    Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

export default function ManageAddresses() {
  const { t, entityText } = useI18n();
  const { fromBooking } = useLocalSearchParams<{ fromBooking?: string }>();
  const bookingMode = fromBooking === "1";
  const [customer, setCustomer] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  const [mapAddress, setMapAddress] = useState("");
  const [coordinate, setCoordinate] = useState<Coordinate | null>(null);
  const [manualLatitude, setManualLatitude] = useState("");
  const [manualLongitude, setManualLongitude] = useState("");
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locationSource, setLocationSource] = useState("CURRENT_LOCATION");
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const locationRequest = useRef(0);

  const fetchAddresses = async (customerId: number) => {
    const response = await axios.get(`${API_URL}/user/customer-addresses/${customerId}`);
    if (response.data.success) setAddresses(response.data.addresses || []);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("customerSession");
        if (!stored) return;
        const parsed = JSON.parse(stored);
        if (!mounted) return;
        setCustomer(parsed);
        await fetchAddresses(parsed.id);
      } catch (error) {
        console.log("Load addresses error:", error);
        Alert.alert(t("Error"), t("Saved addresses load nahi ho paye."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; locationRequest.current += 1; };
  }, []);

  const resetForm = () => {
    locationRequest.current += 1;
    setEditingAddress(null);
    setTitle(""); setFullName(customer?.name || ""); setPhone(customer?.phone || "");
    setAddressLine(""); setLandmark(""); setCity(""); setStateName("");
    setPincode(""); setMapAddress(""); setCoordinate(null); setAccuracy(null);
    setManualLatitude(""); setManualLongitude("");
    setLocationError(""); setLocationSource("CURRENT_LOCATION"); setIsDefault(false);
  };

  const applyCoordinate = async (position: Coordinate, source: string, gpsAccuracy: number | null = null) => {
    const requestId = ++locationRequest.current;
    setCoordinate(position);
    setManualLatitude(position.latitude.toFixed(6));
    setManualLongitude(position.longitude.toFixed(6));
    setLocationSource(source);
    setAccuracy(gpsAccuracy);
    setLocationError("");
    try {
      const results = await withTimeout(Location.reverseGeocodeAsync(position), 5500);
      if (requestId !== locationRequest.current) return;
      const place = results[0];
      if (!place) return;
      setCity(place.city || place.subregion || place.district || "");
      setStateName(place.region || "");
      setPincode(place.postalCode || "");
      setMapAddress([
        place.name, place.street, place.district || place.subregion,
        place.city, place.region, place.postalCode,
      ].filter(Boolean).filter((value, idx, values) => values.indexOf(value) === idx).join(", "));
    } catch (error) {
      if (requestId === locationRequest.current) {
        console.log("Address reverse geocoding unavailable (manual fields enabled):", error);
        // GPS coordinates remain valid even when city/state/pincode lookup fails.
      }
    }
  };

  const captureLocation = async () => {
    if (isLocating) return;
    setIsLocating(true);
    setLocationError("");
    try {
      const permission = await withTimeout(Location.requestForegroundPermissionsAsync(), 8000);
      if (permission.status !== "granted") {
        setLocationError("Location permission nahi mili. Address manually save kar sakte hain; nearby worker matching ke liye coordinates chahiye.");
        return;
      }
      let gpsPosition: Location.LocationObject | null = null;
      try {
        gpsPosition = await withTimeout(
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), 12000,
        );
      } catch (gpsError) {
        console.log("Fresh GPS unavailable, checking recent location:", gpsError);
        try {
          gpsPosition = await withTimeout(Location.getLastKnownPositionAsync({ maxAge: 120000 }), 5000);
        } catch (lastKnownError) {
          console.log("Last known location unavailable:", lastKnownError);
        }
      }
      const point = gpsPosition && validCoordinate(gpsPosition.coords.latitude, gpsPosition.coords.longitude);
      if (!point) {
        setLocationError("GPS location nahi mili. Niche manual address dal sakte hain, ya latitude/longitude paste karke use karein.");
        return;
      }
      await applyCoordinate(point, "CURRENT_LOCATION", gpsPosition?.coords.accuracy ?? null);
    } catch (error) {
      console.log("Location permission/service unavailable:", error);
      setLocationError("Location service unavailable hai. Manual address entry use karein; app bina map ke chalegi.");
    } finally {
      setIsLocating(false);
    }
  };

  const useManualCoordinates = async () => {
    const point = validCoordinate(manualLatitude, manualLongitude);
    if (!point) {
      Alert.alert(t("Invalid Coordinates"), t("Latitude (-90 to 90) aur longitude (-180 to 180) dono sahi enter karein."));
      return;
    }
    try {
      setIsLocating(true);
      await applyCoordinate(point, "MANUAL");
    } catch (error) {
      // applyCoordinate is best-effort, but keep a guard for unexpected errors.
      console.log("Manual coordinates fallback:", error);
      setCoordinate(point);
      setLocationSource("MANUAL");
    } finally {
      setIsLocating(false);
    }
  };

  const openAddModal = async () => {
    resetForm();
    setIsDefault(addresses.length === 0);
    setShowModal(true);
    if (bookingMode) {
      try {
        const stored = await AsyncStorage.getItem("newBookingDraft");
        const draft: BookingDraft = stored ? JSON.parse(stored) : {};
        const savedPoint = validCoordinate(draft.workLatitude, draft.workLongitude);
        if (savedPoint) {
          // Reuse the exact booking work-site point, not the customer's house GPS.
          await applyCoordinate(savedPoint, "MANUAL");
          return;
        }
      } catch (error) { console.log("Booking work-site prefilling:", error); }
    }
    await captureLocation();
  };

  const openEditModal = async (address: any) => {
    resetForm();
    setEditingAddress(address);
    setTitle(address.title || ""); setFullName(address.fullName || "");
    setPhone(address.phone || ""); setAddressLine(address.addressLine || "");
    setLandmark(address.landmark || ""); setCity(address.city || "");
    setStateName(address.state || ""); setPincode(address.pincode || "");
    setMapAddress(address.mapAddress || ""); setIsDefault(!!address.isDefault);
    setLocationSource(address.locationSource || "MANUAL");
    setShowModal(true);
    const storedPoint = validCoordinate(address.latitude, address.longitude);
    if (storedPoint) {
      setCoordinate(storedPoint);
      setManualLatitude(storedPoint.latitude.toFixed(6));
      setManualLongitude(storedPoint.longitude.toFixed(6));
    }
    else await captureLocation();
  };

  const closeEditor = () => { setShowModal(false); resetForm(); };

  const useAddressForBooking = async (address: any) => {
    const point = validCoordinate(address.latitude, address.longitude);
    if (!point) {
      Alert.alert(t("GPS Location Needed"), t("Is address mein coordinates nahi hain. Edit karke GPS retry karein ya latitude/longitude manually enter karein."), [
        { text: t("Cancel"), style: "cancel" },
        { text: t("Edit Address"), onPress: () => void openEditModal(address) },
      ]);
      return;
    }
    try {
      const stored = await AsyncStorage.getItem("newBookingDraft");
      const draft: BookingDraft = stored ? JSON.parse(stored) : {};
      const previous = validCoordinate(draft.workLatitude, draft.workLongitude);
      // If work site changed materially, update coordinates and redo nearby matching.
      const requiresRematch = !previous || distanceMeters(previous, point) > 250;
      const updated: BookingDraft = {
        ...draft,
        addressId: Number(address.id),
        workLatitude: point.latitude,
        workLongitude: point.longitude,
        workAddress: [address.addressLine, address.mapAddress].filter(Boolean).join(" · ") || draft.workAddress,
      };
      if (requiresRematch) {
        updated.selectedWorkerIds = [];
        updated.selectedWorkers = [];
        updated.selectedNakas = [];
        updated.nakaIds = [];
      }
      await AsyncStorage.setItem("newBookingDraft", JSON.stringify(updated));
      if (requiresRematch) {
        Alert.alert(t("Work Location Updated"), t("Address location badli hai. Nearby workers dobara check karna zaroori hai."), [
          { text: t("Continue"), onPress: () => router.replace("/user/book-worker-step2") },
        ]);
      } else router.back();
    } catch (error) {
      console.log("Booking address selection error:", error);
      Alert.alert(t("Error"), t("Booking address select nahi ho paya."));
    }
  };

  const handleSaveAddress = async () => {
    if (isSaving) return;
    if (addressLine.trim().length < 5) { Alert.alert(t("Address Required"), t("Plot, flat, road aur landmark ke saath complete address likhein.")); return; }
    if (pincode.trim() && !/^\d{6}$/.test(pincode.trim())) { Alert.alert(t("Invalid Pincode"), t("Pincode 6 digits ka hona chahiye.")); return; }
    // Manual coordinates also work when the user taps Save directly without
    // tapping "Use Entered Coordinates" first.
    const manualEntered = manualLatitude.trim() !== "" || manualLongitude.trim() !== "";
    const typedCoordinate = manualEntered ? validCoordinate(manualLatitude, manualLongitude) : null;
    if (manualEntered && !typedCoordinate) {
      Alert.alert(t("Invalid Coordinates"), t("Valid latitude aur longitude dono enter karein, ya dono fields blank rakhein."));
      return;
    }
    const savedPoint = typedCoordinate || coordinate;
    const wasEditedManually = !!typedCoordinate && (!coordinate ||
      typedCoordinate.latitude !== coordinate.latitude || typedCoordinate.longitude !== coordinate.longitude);
    if (!customer?.id) { Alert.alert(t("Session Error"), t("Please login again.")); return; }
    try {
      setIsSaving(true);
      const payload = {
        customerId: customer.id, title: title.trim(), fullName: fullName.trim(),
        phone: phone.trim(), addressLine: addressLine.trim(),
        addressDetail: addressLine.trim(), mapAddress: mapAddress.trim(),
        landmark: landmark.trim(), city: city.trim(), state: stateName.trim(),
        pincode: pincode.trim(), latitude: savedPoint?.latitude ?? null,
        longitude: savedPoint?.longitude ?? null,
        locationSource: savedPoint && !wasEditedManually ? locationSource : "MANUAL",
        // No manual Naka needed. Remove stale legacy Naka from edited addresses.
        cityId: null, nakaId: null, nakaName: null, isDefault,
      };
      const response = editingAddress
        ? await axios.put(`${API_URL}/user/customer-addresses/${editingAddress.id}`, payload)
        : await axios.post(`${API_URL}/user/customer-addresses`, payload);
      if (!response.data.success) throw new Error(response.data.message || "Address save failed.");
      const savedAddress = response.data.address;
      closeEditor();
      await fetchAddresses(customer.id);
      if (bookingMode && savedAddress) {
        if (validCoordinate(savedAddress.latitude, savedAddress.longitude)) {
          await useAddressForBooking(savedAddress);
        } else {
          Alert.alert(t("Address Saved"), t("Address save ho gaya. Booking ke nearby workers match karne ke liye GPS retry karein ya latitude/longitude manually enter karein."));
        }
      }
    } catch (error: any) {
      console.log("Save address error:", error?.response?.data || error);
      Alert.alert(t("Address Save Failed"), error?.response?.data?.message || error.message || "Please retry.");
    } finally { setIsSaving(false); }
  };

  const handleDeleteAddress = (addressId: number) => {
    Alert.alert(t("Delete Address"), t("Is saved address ko delete karna hai?"), [
      { text: t("Cancel"), style: "cancel" },
      { text: t("Delete"), style: "destructive", onPress: async () => {
        try {
          await axios.delete(`${API_URL}/user/customer-addresses/${addressId}`);
          await fetchAddresses(customer.id);
        } catch (error: any) {
          Alert.alert(t("Error"), error?.response?.data?.message || "Address delete nahi ho paya.");
        }
      } },
    ]);
  };

  const handleSetDefault = async (address: any) => {
    try {
      const response = await axios.put(`${API_URL}/user/customer-addresses/${address.id}`, {
        customerId: customer.id, isDefault: true,
      });
      if (response.data.success) await fetchAddresses(customer.id);
    } catch (error: any) {
      Alert.alert(t("Error"), error?.response?.data?.message || "Default address update failed.");
    }
  };

  if (isLoading) return <View style={styles.loader}><ActivityIndicator size="large" color="#059669" /></View>;
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><ArrowLeft color="#111827" size={22} /></TouchableOpacity>
        <View style={{ flex: 1 }}><Text style={styles.headerTitle}>{t("Saved Addresses")}</Text>
          <Text style={styles.muted}>{t(bookingMode ? "Select address for this booking" : "GPS based work-site addresses")}</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.addBtn} onPress={() => void openAddModal()}>
          <Plus color="#fff" size={21} /><Text style={styles.addBtnText}>{t("Add Work Address")}</Text>
        </TouchableOpacity>
        {!addresses.length && <View style={styles.card}><MapPin size={30} color="#059669" />
          <Text style={styles.cardTitle}>{t("No address added")}</Text>
          <Text style={styles.muted}>{t("GPS use karein, ya address manually enter karein.")}</Text></View>}
        {addresses.map(address => (
          <View key={address.id} style={styles.card}>
            <View style={styles.cardHeading}>
              <Text style={styles.cardTitle}>{address.title || "Work Address"}</Text>
              {address.isDefault && <Text style={styles.badge}>{t("Default")}</Text>}
            </View>
            <Text style={styles.addressText}>{address.addressLine}</Text>
            {!!address.mapAddress && <Text style={styles.muted}>{address.mapAddress}</Text>}
            <Text style={styles.muted}>{[address.city,address.state,address.pincode].filter(Boolean).join(", ")}</Text>
            <Text style={styles.muted}>{t(validCoordinate(address.latitude,address.longitude) ? "✓ Work-site coordinates saved" : "Coordinates not set (manual address only)")}</Text>
            <View style={styles.actionRow}>
              {bookingMode && <TouchableOpacity style={styles.useBtn} onPress={() => void useAddressForBooking(address)}>
                <Text style={styles.useText}>{t("Use for Booking")}</Text></TouchableOpacity>}
              {!address.isDefault && <TouchableOpacity style={styles.actionBtn} onPress={() => void handleSetDefault(address)}>
                <Text style={styles.actionText}>{t("Set Default")}</Text></TouchableOpacity>}
              <TouchableOpacity style={styles.iconBtn} onPress={() => void openEditModal(address)}><Edit3 size={19} color="#111827" /></TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => handleDeleteAddress(address.id)}><Trash2 size={19} color="#DC2626" /></TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={closeEditor}>
        <View style={styles.overlay}><View style={styles.modalCard}>
          <View style={styles.editorHeader}>
            <View style={{flex: 1}}><Text style={styles.modalTitle}>{t(editingAddress ? "Edit Work Address" : "New Work Address")}</Text>
              <Text style={styles.muted}>{t("GPS optional — manual address bhi save kar sakte hain")}</Text></View>
            <TouchableOpacity onPress={closeEditor}><X size={24} color="#111827" /></TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.locationBox}>
              <View style={styles.cardHeading}>
                <Text style={styles.cardTitle}>{t("Work Site Location (optional GPS)")}</Text>
                <TouchableOpacity style={styles.refreshBtn} disabled={isLocating} onPress={() => void captureLocation()}>
                  {isLocating ? <ActivityIndicator size="small" color="#065F46" /> : <LocateFixed size={16} color="#065F46" />}
                  <Text style={styles.refreshText}>{t("Refresh GPS")}</Text>
                </TouchableOpacity>
              </View>
              {coordinate ? <>
                <Text style={styles.coordinateText}>{t("Latitude: ")}{coordinate.latitude.toFixed(6)}{t(" | Longitude: ")}{coordinate.longitude.toFixed(6)}</Text>
                {accuracy != null && <Text style={styles.muted}>{t("GPS accuracy approximately ")}{Math.round(accuracy)}{t(" meters")}</Text>}
                {!!mapAddress && <Text style={styles.addressText}>{mapAddress}</Text>}
                <View style={styles.successRow}><CheckCircle2 size={16} color="#047857" />
                  <Text style={styles.successText}>{t("Work-site coordinates captured")}</Text></View>
              </> : <TouchableOpacity style={styles.locationPrompt} onPress={() => void captureLocation()}>
                {isLocating ? <ActivityIndicator color="#047857" /> : <LocateFixed size={26} color="#047857" />}
                <Text style={styles.addressText}>{t("Tap to fetch work-site location")}</Text>
              </TouchableOpacity>}
              {!!locationError && <Text style={styles.errorText}>{locationError}</Text>}
              {!coordinate && <Text style={styles.muted}>{t("GPS optional hai: address manual save ho jayega. Nearby workers dhoondhne ke liye valid coordinates zaroori hain.")}</Text>}
              <Text style={styles.label}>{t("Manual Latitude / Longitude (optional)")}</Text>
              <View style={styles.coordinateInputs}>
                <TextInput style={[styles.input, styles.coordinateInput]} keyboardType="numbers-and-punctuation"
                  placeholder={t("Latitude")} placeholderTextColor="#9CA3AF" value={manualLatitude} onChangeText={setManualLatitude} />
                <TextInput style={[styles.input, styles.coordinateInput]} keyboardType="numbers-and-punctuation"
                  placeholder={t("Longitude")} placeholderTextColor="#9CA3AF" value={manualLongitude} onChangeText={setManualLongitude} />
              </View>
              <TouchableOpacity style={styles.manualBtn} disabled={isLocating} onPress={() => void useManualCoordinates()}>
                <Text style={styles.manualBtnText}>{t("Use Entered Coordinates")}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>{t("Address Name")}</Text>
            <TextInput style={styles.input} placeholder={t("Home, Shop, Site")} placeholderTextColor="#9CA3AF" value={title} onChangeText={setTitle} />
            <Text style={styles.label}>{t("Full Address / Site Description *")}</Text>
            <TextInput style={[styles.input, styles.textArea]} multiline placeholder={t("Plot, room, building, road, area aur nearby landmark")} placeholderTextColor="#9CA3AF" value={addressLine} onChangeText={setAddressLine} />
            <Text style={styles.label}>{t("Landmark (optional)")}</Text>
            <TextInput style={styles.input} placeholder={t("Near landmark")} placeholderTextColor="#9CA3AF" value={landmark} onChangeText={setLandmark} />
            <Text style={styles.label}>{t("City / Area (GPS se auto)")}</Text>
            <TextInput style={styles.input} placeholder={t("City")} placeholderTextColor="#9CA3AF" value={city} onChangeText={setCity} />
            <Text style={styles.label}>{t("State (GPS se auto)")}</Text>
            <TextInput style={styles.input} placeholder={t("State")} placeholderTextColor="#9CA3AF" value={stateName} onChangeText={setStateName} />
            <Text style={styles.label}>{t("Pincode (GPS se auto)")}</Text>
            <TextInput style={styles.input} keyboardType="number-pad" maxLength={6} placeholder={t("6 digit pincode")} placeholderTextColor="#9CA3AF" value={pincode} onChangeText={setPincode} />
            <Text style={styles.label}>{t("Contact Name")}</Text>
            <TextInput style={styles.input} placeholder={t("Name")} placeholderTextColor="#9CA3AF" value={fullName} onChangeText={setFullName} />
            <Text style={styles.label}>{t("Contact Phone")}</Text>
            <TextInput style={styles.input} keyboardType="phone-pad" placeholder={t("Phone number")} placeholderTextColor="#9CA3AF" value={phone} onChangeText={setPhone} />
            <TouchableOpacity style={styles.checkRow} onPress={() => setIsDefault(!isDefault)}>
              <CheckCircle2 color={isDefault ? "#059669" : "#9CA3AF"} size={22} />
              <Text style={styles.addressText}>{t("Make default work address")}</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={isSaving || isLocating} style={[styles.addBtn, (isSaving || isLocating) && { opacity: 0.5 }]} onPress={() => void handleSaveAddress()}>
              {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.addBtnText}>{t(editingAddress ? "Update Address" : "Save Address")}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18,
    paddingTop: 48, paddingBottom: 16, backgroundColor: "#FFFFFF" },
  backBtn: { padding: 11, borderRadius: 13, backgroundColor: "#F3F4F6" },
  headerTitle: { fontSize: 22, color: "#111827", fontWeight: "900" },
  muted: { color: "#6B7280", fontSize: 12, lineHeight: 18, marginTop: 4 },
  content: { padding: 18, paddingBottom: 45 },
  addBtn: { paddingVertical: 16, borderRadius: 14, flexDirection: "row", justifyContent: "center",
    alignItems: "center", gap: 8, backgroundColor: "#059669", marginBottom: 18 },
  addBtnText: { fontSize: 15, color: "#FFFFFF", fontWeight: "800" },
  card: { borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB",
    padding: 17, marginBottom: 12, gap: 6 },
  cardHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardTitle: { fontSize: 15, color: "#111827", fontWeight: "800", flexShrink: 1 },
  badge: { color: "#047857", fontSize: 11, fontWeight: "700", backgroundColor: "#D1FAE5", padding: 5 },
  addressText: { color: "#374151", fontSize: 13, fontWeight: "600", lineHeight: 19 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 11, flexWrap: "wrap" },
  useBtn: { backgroundColor: "#D1FAE5", borderRadius: 9, padding: 11 },
  useText: { color: "#065F46", fontWeight: "800", fontSize: 12 },
  actionBtn: { borderRadius: 9, backgroundColor: "#F3F4F6", padding: 11 },
  actionText: { color: "#374151", fontWeight: "700", fontSize: 12 },
  iconBtn: { backgroundColor: "#F3F4F6", borderRadius: 9, padding: 11 },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" },
  modalCard: { backgroundColor: "#FFFFFF", borderTopRightRadius: 24, borderTopLeftRadius: 24,
    padding: 18, maxHeight: "95%" },
  editorHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  modalTitle: { fontSize: 21, fontWeight: "900", color: "#111827" },
  locationBox: { borderWidth: 1, borderColor: "#BFDBFE", backgroundColor: "#EFF6FF",
    padding: 13, borderRadius: 16, gap: 9, marginBottom: 15 },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 5, padding: 8,
    borderWidth: 1, borderColor: "#A7F3D0", borderRadius: 10, backgroundColor: "#FFFFFF" },
  refreshText: { fontSize: 11, color: "#065F46", fontWeight: "800" },
  coordinateText: { fontSize: 12, color: "#1E40AF", fontWeight: "700" },
  coordinateInputs: { flexDirection: "row", gap: 8 },
  coordinateInput: { flex: 1, minWidth: 0, marginBottom: 0 },
  manualBtn: { padding: 12, borderRadius: 10, backgroundColor: "#DBEAFE", alignItems: "center" },
  manualBtnText: { color: "#1E40AF", fontWeight: "800", fontSize: 12 },
  successRow: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#D1FAE5", padding: 10, borderRadius: 10 },
  successText: { color: "#047857", fontWeight: "700", fontSize: 12 },
  locationPrompt: { minHeight: 150, alignItems: "center", justifyContent: "center", gap: 10 },
  errorText: { color: "#B91C1C", fontSize: 12 },
  label: { color: "#374151", fontWeight: "800", fontSize: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 12, paddingHorizontal: 13,
    paddingVertical: 12, marginBottom: 14, color: "#111827", backgroundColor: "#F9FAFB", fontSize: 14 },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18 },
});
