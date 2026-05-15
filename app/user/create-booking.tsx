// app/user/dashboard.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Stack, router } from "expo-router";
import { ChevronDown, MapPin, Star, X } from "lucide-react-native";
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
import RazorpayCheckout from "react-native-razorpay";
import { API_URL } from "../../constants/api";

export default function CustomerDashboard() {
  const [customer, setCustomer] = useState<any>(null);
  const [skills, setSkills] = useState([]);
  const [cities, setCities] = useState([]);
  const [nakas, setNakas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- SELECTIONS ---
  const [selectedSkill, setSelectedSkill] = useState<number | null>(null);
  const [workerCount, setWorkerCount] = useState(1);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [selectedNakas, setSelectedNakas] = useState<number[]>([]); // Array for Multi-select
  const [minRating, setMinRating] = useState<number>(0); // 0 to 5
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");

  // --- MODAL CONTROLS ---
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [isNakaModalOpen, setIsNakaModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const session = await AsyncStorage.getItem("customerSession");
      if (session) setCustomer(JSON.parse(session));

      const response = await axios.get(`${API_URL}/user/booking-options`);
      if (response.data.success) {
        setSkills(response.data.skills);
        setNakas(response.data.nakas);
        if (response.data.cities) setCities(response.data.cities);
      }
    } catch (error) {
      console.log("Error loading dashboard data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("customerSession");
    router.replace("/");
  };

  const toggleNakaSelection = (id: number) => {
    if (selectedNakas.includes(id)) {
      setSelectedNakas(selectedNakas.filter((nakaId) => nakaId !== id));
    } else {
      setSelectedNakas([...selectedNakas, id]);
    }
  };

  // --- DYNAMIC RATE CALCULATION ENGINE ---
  let unitPrice = 0;
  const currentSkillData: any = skills.find((s: any) => s.id === selectedSkill);

  if (
    currentSkillData &&
    currentSkillData.rates &&
    currentSkillData.rates.length > 0
  ) {
    // Exact star match dhoondo
    const matchedRate = currentSkillData.rates.find(
      (r: any) => r.star === minRating,
    );
    if (matchedRate) {
      unitPrice = matchedRate.rate;
    } else {
      // Agar exact star nahi mila, toh fallback ke liye lowest price le lo
      const sortedRates = [...currentSkillData.rates].sort(
        (a, b) => a.rate - b.rate,
      );
      unitPrice = sortedRates[0].rate;
    }
  } else if (currentSkillData) {
    unitPrice = 600; // Fallback agar rates DB me na hon
  }

  const totalAmount = workerCount * unitPrice;

  const handlePaymentInitiation = async () => {
    // 1. Validation
    if (
      !selectedSkill ||
      !selectedCityId ||
      selectedNakas.length === 0 ||
      !address
    ) {
      Alert.alert(
        "Zaroori Details",
        "Kripya Kaam, City, Naka aur apna Address zaroor bharein!",
      );
      return;
    }

    setIsLoading(true);
    try {
      // 2. Backend ko bolo "Workers Lock karo aur Order ID do"
      const initResponse = await axios.post(
        `${API_URL}/user/initiate-booking`,
        {
          customerId: customer.id,
          nakaId: selectedNakas[0], // Abhi 1st selected naka bhej rahe hain
          skillId: selectedSkill,
          workerCount: workerCount,
          totalAmount: totalAmount,
        },
      );

      if (initResponse.data.success) {
        const orderData = initResponse.data.razorpayOrder;
        const bookingId = initResponse.data.bookingId;

        // 3. Razorpay Popup Open Karo
        var options = {
          description: `Booking for ${workerCount} workers`,
          image: "https://your-company-logo-url.com/logo.png", // TrivexaIT ka logo daal sakte hain
          currency: "INR",
          key: "rzp_test_SouUYINcIpP7iB", // Aapki Test Key ID
          amount: orderData.amount,
          name: "E-MAN",
          order_id: orderData.id,
          theme: { color: "#000000" },
        };

        RazorpayCheckout.open(options)
          .then(async (data: any) => {
            // 4. Payment Success hone par backend ko batao
            Alert.alert("Payment Success!", "Payment verify ho rahi hai...");

            const verifyResponse = await axios.post(
              `${API_URL}/user/verify-payment`,
              {
                razorpay_payment_id: data.razorpay_payment_id,
                razorpay_order_id: data.razorpay_order_id,
                razorpay_signature: data.razorpay_signature,
                bookingId: bookingId,
              },
            );

            if (verifyResponse.data.success) {
              router.replace("/user/active-booking");
              // Yahan se user ko 'Live Tracking' ya 'My Bookings' page par bhej sakte hain
            }
          })
          .catch((error: any) => {
            // Agar payment fail hui ya user ne back daba diya
            Alert.alert("Payment Cancelled", "Aapka payment pura nahi hua.");
            // Ideal: Backend ko bolo ki "Booking cancel karo aur workers ko wapas free (Available) karo"
          });
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Booking initiate nahi ho payi.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  const selectedCityObj: any = cities.find((c: any) => c.id === selectedCityId);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingText}>Welcome back,</Text>
          <Text style={styles.nameText}>{customer?.name || "User"}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.mainTitle}>Book your workers instantly</Text>

        {/* 1. SKILL CARD */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. What do you need?</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
          >
            {skills.map((skill: any) => (
              <TouchableOpacity
                key={skill.id}
                style={[
                  styles.skillChip,
                  selectedSkill === skill.id && styles.skillChipActive,
                ]}
                onPress={() => setSelectedSkill(skill.id)}
              >
                <Text
                  style={[
                    styles.skillText,
                    selectedSkill === skill.id && styles.skillTextActive,
                  ]}
                >
                  {skill.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 2. REQUIREMENT CARD (Quantity & Rating) */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2. Worker Requirements</Text>

          <View style={styles.rowBetween}>
            <Text style={styles.label}>Number of Workers</Text>
            <View style={styles.counterBox}>
              <TouchableOpacity
                style={styles.mathBtn}
                onPress={() =>
                  workerCount > 1 && setWorkerCount(workerCount - 1)
                }
              >
                <Text style={styles.mathText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.numberText}>{workerCount}</Text>
              <TouchableOpacity
                style={styles.mathBtn}
                onPress={() =>
                  workerCount < 10 && setWorkerCount(workerCount + 1)
                }
              >
                <Text style={styles.mathText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.label}>
            Minimum Rating (
            {minRating === 0 ? "Any Rating" : `${minRating} Stars & above`})
          </Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setMinRating(minRating === star ? 0 : star)}
                style={styles.starBtn}
              >
                <Star
                  color={star <= minRating ? "#F59E0B" : "#D1D5DB"}
                  fill={star <= minRating ? "#F59E0B" : "transparent"}
                  size={32}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 3. LOCATION CARD (City & Naka Dropdowns) */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>3. Service Location</Text>

          <Text style={styles.label}>Select City</Text>
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => setIsCityModalOpen(true)}
          >
            <Text
              style={[
                styles.dropdownText,
                !selectedCityId && { color: "#9CA3AF" },
              ]}
            >
              {selectedCityId ? selectedCityObj?.name : "Choose your city"}
            </Text>
            <ChevronDown color="#6B7280" />
          </TouchableOpacity>

          {selectedCityId && (
            <>
              <Text style={[styles.label, { marginTop: 15 }]}>
                Select Nakas (Multiple allowed)
              </Text>
              <TouchableOpacity
                style={styles.dropdownBtn}
                onPress={() => setIsNakaModalOpen(true)}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    selectedNakas.length === 0 && { color: "#9CA3AF" },
                  ]}
                >
                  {selectedNakas.length > 0
                    ? `${selectedNakas.length} Naka(s) Selected`
                    : "Choose nearby nakas"}
                </Text>
                <ChevronDown color="#6B7280" />
              </TouchableOpacity>
            </>
          )}

          <Text style={[styles.label, { marginTop: 15 }]}>Exact Address</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Flat No, Building, Street Name..."
            multiline
            numberOfLines={3}
            value={address}
            onChangeText={setAddress}
            textAlignVertical="top"
          />
          <TextInput
            style={styles.input}
            placeholder="Landmark (Optional)"
            value={landmark}
            onChangeText={setLandmark}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* BOTTOM PAYMENT BAR */}
      <View style={styles.footer}>
        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>Amount Payable</Text>
          <Text style={styles.priceText}>₹{totalAmount}</Text>
          {selectedSkill && (
            <Text style={styles.calcText}>
              (₹{unitPrice} x {workerCount} workers)
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.payButton}
          onPress={handlePaymentInitiation}
        >
          <Text style={styles.payButtonText}>PAY NOW</Text>
        </TouchableOpacity>
      </View>

      {/* --- MODALS --- */}

      {/* CITY SELECT MODAL */}
      <Modal visible={isCityModalOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select City</Text>
              <TouchableOpacity onPress={() => setIsCityModalOpen(false)}>
                <X color="#000" size={24} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={cities}
              keyExtractor={(item: any) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    selectedCityId === item.id && styles.modalItemActive,
                  ]}
                  onPress={() => {
                    setSelectedCityId(item.id);
                    setSelectedNakas([]); // City badalne par purane nakas clear
                    setIsCityModalOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedCityId === item.id && styles.modalItemTextActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* NAKA MULTI-SELECT MODAL */}
      <Modal visible={isNakaModalOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Nearby Nakas</Text>
              <TouchableOpacity onPress={() => setIsNakaModalOpen(false)}>
                <X color="#000" size={24} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={nakas.filter((n: any) => n.cityId === selectedCityId)}
              keyExtractor={(item: any) => item.id.toString()}
              renderItem={({ item }) => {
                const isSelected = selectedNakas.includes(item.id);
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      isSelected && styles.modalItemActive,
                    ]}
                    onPress={() => toggleNakaSelection(item.id)}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <MapPin
                        color={isSelected ? "#fff" : "#6B7280"}
                        size={20}
                      />
                      <Text
                        style={[
                          styles.modalItemText,
                          isSelected && styles.modalItemTextActive,
                        ]}
                      >
                        {item.name}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.checkbox,
                        isSelected && styles.checkboxActive,
                      ]}
                    />
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => setIsNakaModalOpen(false)}
            >
              <Text style={styles.doneBtnText}>DONE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    padding: 24,
    paddingTop: 50,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingText: { fontSize: 14, color: "#6B7280" },
  nameText: { fontSize: 24, fontWeight: "800", color: "#111827" },
  logoutBtn: {
    backgroundColor: "#FEE2E2",
    padding: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  logoutText: { color: "#EF4444", fontWeight: "700", fontSize: 12 },

  content: { flex: 1, padding: 20 },
  mainTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 20,
    letterSpacing: -0.5,
  },

  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 24,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 15,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 8,
    textTransform: "uppercase",
  },

  chipScroll: { flexDirection: "row", paddingBottom: 5 },
  skillChip: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 10,
  },
  skillChipActive: { backgroundColor: "#000" },
  skillText: { fontSize: 15, fontWeight: "600", color: "#4B5563" },
  skillTextActive: { color: "#fff" },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  counterBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  mathBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  mathText: { fontSize: 20, fontWeight: "600", color: "#111827" },
  numberText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#000",
    paddingHorizontal: 15,
  },

  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 20 },

  starRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  starBtn: { padding: 5 },

  dropdownBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    borderRadius: 12,
  },
  dropdownText: { fontSize: 16, color: "#111827", fontWeight: "500" },

  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 10,
  },
  textArea: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    height: 100,
  },

  footer: {
    flexDirection: "row",
    padding: 20,
    paddingBottom: 30,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceBox: { flex: 1 },
  priceLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  priceText: { fontSize: 28, color: "#111827", fontWeight: "900" },
  calcText: { fontSize: 12, color: "#9CA3AF", fontWeight: "500" },
  payButton: {
    backgroundColor: "#000",
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  payButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalItemActive: {
    backgroundColor: "#000",
    borderRadius: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0,
    marginVertical: 4,
  },
  modalItemText: { fontSize: 16, fontWeight: "600", color: "#4B5563" },
  modalItemTextActive: { color: "#fff" },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
  },
  checkboxActive: { backgroundColor: "#10B981", borderColor: "#10B981" },
  doneBtn: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 20,
  },
  doneBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
