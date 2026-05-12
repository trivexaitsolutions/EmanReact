// app/user/dashboard.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Stack, router } from "expo-router";
import React, { useEffect, useState } from "react";
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

export default function CustomerDashboard() {
  const [customer, setCustomer] = useState<any>(null);
  const [skills, setSkills] = useState([]);
  const [nakas, setNakas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // User Selections
  const [selectedSkill, setSelectedSkill] = useState<number | null>(null);
  const [selectedNaka, setSelectedNaka] = useState<number | null>(null);
  const [workerCount, setWorkerCount] = useState(1);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 1. Session se customer ka naam nikalo
      const session = await AsyncStorage.getItem("customerSession");
      if (session) setCustomer(JSON.parse(session));

      // 2. Backend se Nakas aur Skills fetch karo
      const response = await axios.get(`${API_URL}/user/booking-options`);
      if (response.data.success) {
        setSkills(response.data.skills);
        setNakas(response.data.nakas);
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

  const handleSearch = async () => {
    if (!selectedSkill || !selectedNaka) {
      Alert.alert(
        "Zaroori Hai",
        "Kripya pehle Kaam (Skill) aur Jagah (Naka) select karein!",
      );
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/user/book-workers`, {
        customerId: customer.id,
        nakaId: selectedNaka,
        skillId: selectedSkill,
        workerCount: workerCount,
      });

      if (response.data.success) {
        // Kitne log book hue unka naam dikhayenge
        const assignedNames = response.data.booking.workers
          .map((w: any) => w.name)
          .join(", ");

        Alert.alert(
          "🎉 Booking Confirm!",
          `Aapke ${workerCount} worker(s) assign ho gaye hain:\n\n👷 ${assignedNames}\n\nJald hi yeh aapse contact karenge.`,
        );
        // Reset karein selections
        setSelectedSkill(null);
        setWorkerCount(1);
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message ||
        "Booking nahi ho payi, baad me try karein.";
      Alert.alert("Error", errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0052CC" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Modern Clean Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingText}>Hello,</Text>
          <Text style={styles.nameText}>{customer?.name || "User"}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.mainTitle}>Aapko kya kaam karwana hai?</Text>

        {/* 1. SKILL SELECTION */}
        <Text style={styles.sectionTitle}>1. Kaam Chunein (Select Skill)</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipContainer}
        >
          {skills.map((skill: any) => (
            <TouchableOpacity
              key={skill.id}
              style={[
                styles.chip,
                selectedSkill === skill.id && styles.chipSelected,
              ]}
              onPress={() => setSelectedSkill(skill.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedSkill === skill.id && styles.chipTextSelected,
                ]}
              >
                {skill.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 2. NAKA SELECTION */}
        <Text style={styles.sectionTitle}>
          2. Kahan Bulana Hai? (Select Naka)
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipContainer}
        >
          {nakas.map((naka: any) => (
            <TouchableOpacity
              key={naka.id}
              style={[
                styles.chip,
                selectedNaka === naka.id && styles.chipSelected,
              ]}
              onPress={() => setSelectedNaka(naka.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedNaka === naka.id && styles.chipTextSelected,
                ]}
              >
                📍 {naka.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 3. QUANTITY SELECTION */}
        <Text style={styles.sectionTitle}>
          3. Kitne Log Chahiye? (Quantity)
        </Text>
        <View style={styles.counterBox}>
          <TouchableOpacity
            style={styles.mathBtn}
            onPress={() => workerCount > 1 && setWorkerCount(workerCount - 1)}
          >
            <Text style={styles.mathText}>-</Text>
          </TouchableOpacity>

          <Text style={styles.numberText}>{workerCount}</Text>

          <TouchableOpacity
            style={styles.mathBtn}
            onPress={() => workerCount < 10 && setWorkerCount(workerCount + 1)}
          >
            <Text style={styles.mathText}>+</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* BOTTOM SEARCH BUTTON */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>SEARCH WORKERS</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  greetingText: { fontSize: 14, color: "#6B7280" },
  nameText: { fontSize: 24, fontWeight: "bold", color: "#111827" },
  logoutBtn: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: { color: "#EF4444", fontWeight: "bold" },

  content: { flex: 1, padding: 24 },
  mainTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0052CC",
    marginBottom: 30,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 12,
    marginTop: 10,
  },
  chipContainer: { flexDirection: "row", marginBottom: 20 },
  chip: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  chipSelected: { backgroundColor: "#0052CC", borderColor: "#0052CC" },
  chipText: { fontSize: 16, color: "#4B5563", fontWeight: "600" },
  chipTextSelected: { color: "#fff" },

  counterBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    width: 200,
    marginBottom: 40,
  },
  mathBtn: {
    backgroundColor: "#F3F4F6",
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  mathText: { fontSize: 24, fontWeight: "bold", color: "#111827" },
  numberText: { fontSize: 28, fontWeight: "900", color: "#10B981" },

  footer: {
    padding: 24,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchButton: {
    backgroundColor: "#10B981",
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: "center",
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
