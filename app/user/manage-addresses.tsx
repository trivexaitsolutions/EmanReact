import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack } from "expo-router";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Edit3,
  MapPin,
  Plus,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { API_URL } from "../../constants/api";

export default function ManageAddresses() {
  const [customer, setCustomer] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [nakas, setNakas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showNakaModal, setShowNakaModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);

  const [title, setTitle] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [landmark, setLandmark] = useState("");

  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [selectedNakaId, setSelectedNakaId] = useState<number | null>(null);

  const [city, setCity] = useState("");
  const [nakaName, setNakaName] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const session = await AsyncStorage.getItem("customerSession");

      if (session) {
        const parsed = JSON.parse(session);
        setCustomer(parsed);
        await fetchAddresses(parsed.id);
      }

      await fetchBookingOptions();
    } catch (error) {
      console.log("Initial load error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBookingOptions = async () => {
    try {
      const response = await axios.get(`${API_URL}/user/booking-options`);

      if (response.data.success) {
        setCities(response.data.cities || []);
        setNakas(response.data.nakas || []);
      }
    } catch (error: any) {
      console.log("Booking options error:", error?.response?.data || error);
    }
  };

  const fetchAddresses = async (customerId: number) => {
    try {
      const response = await axios.get(
        `${API_URL}/user/customer-addresses/${customerId}`,
      );

      if (response.data.success) {
        setAddresses(response.data.addresses || []);
      }
    } catch (error: any) {
      console.log("Fetch addresses error:", error?.response?.data || error);
    }
  };

  const resetForm = () => {
    setEditingAddress(null);
    setTitle("");
    setFullName("");
    setPhone("");
    setAddressLine("");
    setLandmark("");
    setSelectedCityId(null);
    setSelectedNakaId(null);
    setCity("");
    setNakaName("");
    setStateName("");
    setPincode("");
    setIsDefault(false);
  };

  const openAddModal = () => {
    resetForm();
    setFullName(customer?.name || "");
    setPhone(customer?.phone || "");
    setShowModal(true);
  };

  const openEditModal = (address: any) => {
    const matchedCity = cities.find(
      (c: any) =>
        String(c.name || "")
          .toLowerCase()
          .trim() ===
        String(address.city || "")
          .toLowerCase()
          .trim(),
    );

    const matchedNaka = nakas.find(
      (n: any) =>
        String(n.name || "")
          .toLowerCase()
          .trim() ===
        String(address.nakaName || "")
          .toLowerCase()
          .trim(),
    );

    setEditingAddress(address);
    setTitle(address.title || "");
    setFullName(address.fullName || "");
    setPhone(address.phone || "");
    setAddressLine(address.addressLine || "");
    setLandmark(address.landmark || "");

    setSelectedCityId(address.cityId || matchedCity?.id || null);
    setSelectedNakaId(address.nakaId || matchedNaka?.id || null);

    setCity(address.city || matchedCity?.name || "");
    setNakaName(address.nakaName || matchedNaka?.name || "");
    setStateName(address.state || "");
    setPincode(address.pincode || "");
    setIsDefault(!!address.isDefault);
    setShowModal(true);
  };

  const handleSelectCity = (item: any) => {
    setSelectedCityId(item.id);
    setCity(item.name || "");
    setSelectedNakaId(null);
    setNakaName("");
    setShowCityModal(false);
  };

  const handleSelectNaka = (item: any) => {
    setSelectedNakaId(item.id);
    setNakaName(item.name || "");
    setShowNakaModal(false);
  };

  const handleSaveAddress = async () => {
    if (!addressLine.trim()) {
      Alert.alert("Required", "Please enter full address.");
      return;
    }

    if (!selectedCityId || !city.trim()) {
      Alert.alert("Required", "Please select city.");
      return;
    }

    if (!selectedNakaId || !nakaName.trim()) {
      Alert.alert("Required", "Please select nearest naka.");
      return;
    }

    try {
      const payload = {
        customerId: customer.id,
        title,
        fullName,
        phone,
        addressLine,
        landmark,

        // Backend me abhi city string save hoga.
        // Next backend update me cityId/nakaId/nakaName bhi save karenge.
        cityId: selectedCityId,
        city,
        nakaId: selectedNakaId,
        nakaName,

        state: stateName,
        pincode,
        isDefault,
      };

      let response;

      if (editingAddress) {
        response = await axios.put(
          `${API_URL}/user/customer-addresses/${editingAddress.id}`,
          payload,
        );
      } else {
        response = await axios.post(
          `${API_URL}/user/customer-addresses`,
          payload,
        );
      }

      if (response.data.success) {
        setShowModal(false);
        resetForm();
        await fetchAddresses(customer.id);
      } else {
        Alert.alert("Failed", response.data.message || "Address save failed.");
      }
    } catch (error: any) {
      console.log("Save address error:", error?.response?.data || error);
      Alert.alert(
        "Server Error",
        error?.response?.data?.message || "Address save nahi ho paya.",
      );
    }
  };

  const handleDeleteAddress = (addressId: number) => {
    Alert.alert(
      "Delete Address",
      "Are you sure you want to delete this address?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await axios.delete(
                `${API_URL}/user/customer-addresses/${addressId}`,
              );

              if (response.data.success) {
                await fetchAddresses(customer.id);
              }
            } catch (error: any) {
              console.log(
                "Delete address error:",
                error?.response?.data || error,
              );
              Alert.alert("Error", "Address delete nahi ho paya.");
            }
          },
        },
      ],
    );
  };

  const handleSetDefault = async (address: any) => {
    try {
      const response = await axios.put(
        `${API_URL}/user/customer-addresses/${address.id}`,
        {
          ...address,
          customerId: customer.id,
          isDefault: true,
        },
      );

      if (response.data.success) {
        await fetchAddresses(customer.id);
      }
    } catch (error: any) {
      console.log("Set default error:", error?.response?.data || error);
      Alert.alert("Error", "Default address update nahi ho paya.");
    }
  };

  const filteredNakas = nakas.filter(
    (naka: any) => Number(naka.cityId) === Number(selectedCityId),
  );

  const selectedCityObj = cities.find(
    (item: any) => Number(item.id) === Number(selectedCityId),
  );

  const selectedNakaObj = nakas.find(
    (item: any) => Number(item.id) === Number(selectedNakaId),
  );

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

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color="#111827" size={22} />
        </TouchableOpacity>

        <View>
          <Text style={styles.headerTitle}>Saved Addresses</Text>
          <Text style={styles.headerSub}>City aur naka wise addresses</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Plus color="#fff" size={22} />
          <Text style={styles.addBtnText}>Add New Address</Text>
        </TouchableOpacity>

        {addresses.length === 0 ? (
          <View style={styles.emptyBox}>
            <MapPin color="#9CA3AF" size={44} />
            <Text style={styles.emptyTitle}>No addresses added</Text>
            <Text style={styles.emptySub}>
              Add address once, then use it quickly while booking.
            </Text>
          </View>
        ) : (
          addresses.map((item) => (
            <View key={item.id} style={styles.addressCard}>
              <View style={styles.addressTop}>
                <View style={styles.addressIcon}>
                  <MapPin color="#10B981" size={22} />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.addressTitle}>
                      {item.title || "Address"}
                    </Text>

                    {item.isDefault ? (
                      <View style={styles.defaultBadge}>
                        <CheckCircle2 color="#047857" size={13} />
                        <Text style={styles.defaultBadgeText}>Default</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.addressName}>
                    {item.fullName || customer?.name || "User"}
                  </Text>

                  <Text style={styles.addressText}>{item.addressLine}</Text>

                  {item.landmark ? (
                    <Text style={styles.addressSub}>
                      Landmark: {item.landmark}
                    </Text>
                  ) : null}

                  <Text style={styles.addressSub}>
                    City: {item.city || "-"}
                  </Text>

                  {item.nakaName ? (
                    <Text style={styles.addressSub}>Naka: {item.nakaName}</Text>
                  ) : null}

                  <Text style={styles.addressSub}>
                    {[item.state, item.pincode].filter(Boolean).join(", ")}
                  </Text>

                  {item.phone ? (
                    <Text style={styles.addressPhone}>{item.phone}</Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.cardActions}>
                {!item.isDefault ? (
                  <TouchableOpacity
                    style={styles.defaultBtn}
                    onPress={() => handleSetDefault(item)}
                  >
                    <Text style={styles.defaultBtnText}>Set Default</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ flex: 1 }} />
                )}

                <TouchableOpacity
                  style={styles.iconActionBtn}
                  onPress={() => openEditModal(item)}
                >
                  <Edit3 color="#111827" size={17} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteAddress(item.id)}
                >
                  <Trash2 color="#EF4444" size={17} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ADD / EDIT ADDRESS MODAL */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>
                    {editingAddress ? "Edit Address" : "Add New Address"}
                  </Text>
                  <Text style={styles.modalSub}>
                    Booking me city match hone par ye address selectable hoga.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  <X color="#111827" size={22} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Title eg. Home, Office, Site"
                placeholderTextColor="#9CA3AF"
                value={title}
                onChangeText={setTitle}
              />

              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#9CA3AF"
                value={fullName}
                onChangeText={setFullName}
              />

              <TextInput
                style={styles.input}
                placeholder="Phone"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <Text style={styles.fieldLabel}>Select City</Text>
              <TouchableOpacity
                style={styles.dropdownBtn}
                onPress={() => setShowCityModal(true)}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    !selectedCityId && { color: "#9CA3AF" },
                  ]}
                >
                  {selectedCityObj?.name || city || "Choose city"}
                </Text>
                <ChevronDown color="#6B7280" size={20} />
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Select Nearest Naka</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownBtn,
                  !selectedCityId && { opacity: 0.6 },
                ]}
                onPress={() => {
                  if (!selectedCityId) {
                    Alert.alert("Select City", "Please select city first.");
                    return;
                  }

                  setShowNakaModal(true);
                }}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    !selectedNakaId && { color: "#9CA3AF" },
                  ]}
                >
                  {selectedNakaObj?.name || nakaName || "Choose naka"}
                </Text>
                <ChevronDown color="#6B7280" size={20} />
              </TouchableOpacity>

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Full Address"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                value={addressLine}
                onChangeText={setAddressLine}
              />

              <TextInput
                style={styles.input}
                placeholder="Landmark"
                placeholderTextColor="#9CA3AF"
                value={landmark}
                onChangeText={setLandmark}
              />

              <View style={styles.rowInputs}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Pincode"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  value={pincode}
                  onChangeText={setPincode}
                />
              </View>

              <TouchableOpacity
                style={styles.defaultCheck}
                onPress={() => setIsDefault(!isDefault)}
              >
                <View
                  style={[
                    styles.checkBox,
                    isDefault && styles.checkBoxSelected,
                  ]}
                >
                  {isDefault ? <Text style={styles.checkMark}>✓</Text> : null}
                </View>

                <Text style={styles.defaultCheckText}>
                  Make this default address
                </Text>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveAddress}
                >
                  <Text style={styles.saveBtnText}>
                    {editingAddress ? "Update" : "Save"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* CITY MODAL */}
      <Modal visible={showCityModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.selectModalCard}>
            <View style={styles.selectHeader}>
              <Text style={styles.selectTitle}>Select City</Text>
              <TouchableOpacity onPress={() => setShowCityModal(false)}>
                <X color="#111827" size={24} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={cities}
              keyExtractor={(item: any) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.selectItem,
                    selectedCityId === item.id && styles.selectItemActive,
                  ]}
                  onPress={() => handleSelectCity(item)}
                >
                  <Text
                    style={[
                      styles.selectItemText,
                      selectedCityId === item.id && styles.selectItemTextActive,
                    ]}
                  >
                    {item.name}
                  </Text>

                  {selectedCityId === item.id ? (
                    <CheckCircle2 color="#10B981" size={20} />
                  ) : null}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* NAKA MODAL */}
      <Modal visible={showNakaModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.selectModalCard}>
            <View style={styles.selectHeader}>
              <Text style={styles.selectTitle}>Select Naka</Text>
              <TouchableOpacity onPress={() => setShowNakaModal(false)}>
                <X color="#111827" size={24} />
              </TouchableOpacity>
            </View>

            {filteredNakas.length === 0 ? (
              <View style={styles.noNakaBox}>
                <Text style={styles.noNakaTitle}>No nakas found</Text>
                <Text style={styles.noNakaSub}>
                  Selected city ke liye naka available nahi hai.
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredNakas}
                keyExtractor={(item: any) => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.selectItem,
                      selectedNakaId === item.id && styles.selectItemActive,
                    ]}
                    onPress={() => handleSelectNaka(item)}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <MapPin
                        color={
                          selectedNakaId === item.id ? "#10B981" : "#6B7280"
                        }
                        size={20}
                      />
                      <Text
                        style={[
                          styles.selectItemText,
                          selectedNakaId === item.id &&
                            styles.selectItemTextActive,
                        ]}
                      >
                        {item.name}
                      </Text>
                    </View>

                    {selectedNakaId === item.id ? (
                      <CheckCircle2 color="#10B981" size={20} />
                    ) : null}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    backgroundColor: "#FFFFFF",
    paddingTop: 50,
    paddingHorizontal: 18,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { color: "#111827", fontSize: 22, fontWeight: "900" },
  headerSub: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },

  content: { padding: 18 },

  addBtn: {
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
  },
  addBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },

  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginTop: 12,
  },
  emptySub: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 5,
    lineHeight: 19,
  },

  addressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  addressTop: { flexDirection: "row", alignItems: "flex-start" },
  addressIcon: {
    width: 45,
    height: 45,
    borderRadius: 16,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
  },
  addressTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  defaultBadge: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  defaultBadgeText: { fontSize: 10, color: "#047857", fontWeight: "900" },
  addressName: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "900",
    marginTop: 2,
  },
  addressText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "600",
    marginTop: 4,
    lineHeight: 19,
  },
  addressSub: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 3,
  },
  addressPhone: {
    fontSize: 13,
    color: "#059669",
    fontWeight: "900",
    marginTop: 5,
  },

  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  defaultBtn: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 11,
    borderRadius: 13,
    alignItems: "center",
  },
  defaultBtnText: { fontSize: 12, color: "#374151", fontWeight: "900" },
  iconActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    maxHeight: "94%",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 22,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 16,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { fontSize: 22, fontWeight: "900", color: "#111827" },
  modalSub: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
    maxWidth: 270,
  },

  fieldLabel: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "900",
    marginBottom: 6,
    marginTop: 2,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  textArea: { minHeight: 95, textAlignVertical: "top" },
  rowInputs: { flexDirection: "row", gap: 12 },

  dropdownBtn: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  defaultCheck: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
    marginBottom: 16,
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  checkBoxSelected: { backgroundColor: "#10B981", borderColor: "#10B981" },
  checkMark: { color: "#FFFFFF", fontWeight: "900" },
  defaultCheckText: { fontSize: 14, color: "#374151", fontWeight: "800" },

  modalActions: { flexDirection: "row", gap: 12, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  cancelBtnText: { color: "#374151", fontWeight: "900" },
  saveBtn: {
    flex: 1.4,
    backgroundColor: "#10B981",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  saveBtnText: { color: "#FFFFFF", fontWeight: "900" },

  selectModalCard: {
    backgroundColor: "#FFFFFF",
    maxHeight: "75%",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
  },
  selectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    marginBottom: 10,
  },
  selectTitle: { fontSize: 20, fontWeight: "900", color: "#111827" },
  selectItem: {
    paddingVertical: 15,
    paddingHorizontal: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectItemActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
  },
  selectItemText: { color: "#374151", fontWeight: "900", fontSize: 14 },
  selectItemTextActive: { color: "#047857" },

  noNakaBox: {
    padding: 30,
    alignItems: "center",
  },
  noNakaTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  noNakaSub: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 5,
    textAlign: "center",
  },
});
