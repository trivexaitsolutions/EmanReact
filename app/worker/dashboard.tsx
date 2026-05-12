import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack } from "expo-router";
import { Calendar, LogOut, MapPin, User } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";

const API_URL = "http://192.168.0.103:4000/api";

export default function WorkerDashboard() {
  const [worker, setWorker] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const holdAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const session = await AsyncStorage.getItem("workerSession");
      if (session) {
        const parsedData = JSON.parse(session);
        const response = await axios.get(
          `${API_URL}/worker/profile/${parsedData.id}`,
        );
        if (response.data.success) setWorker(response.data.worker);
      }
    } catch (error) {
      console.log("Profile Error", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHoldStart = () => {
    Animated.timing(holdAnim, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        Vibration.vibrate([0, 100, 50, 100]);
        router.replace("/worker/active-duty");
      }
    });
  };

  const handleHoldRelease = () => {
    Animated.spring(holdAnim, { toValue: 0, useNativeDriver: false }).start();
  };

  const progressWidth = holdAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  if (isLoading || !worker) {
    return (
      <View style={styles.loadingArea}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandText}>E-MAN</Text>
          <Text style={styles.welcomeText}>
            Namaste, {worker.name.split(" ")[0]}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() =>
            Alert.alert("Logout", "Logout karein?", [
              { text: "Nahi" },
              {
                text: "Haan",
                onPress: async () => {
                  await AsyncStorage.clear();
                  router.replace("/");
                },
              },
            ])
          }
          style={styles.logoutBtn}
        >
          <LogOut color="#EF4444" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.scrollBody}>
        {/* STATUS BANNER (YELLOW) */}
        <View style={styles.statusBanner}>
          <Text style={styles.statusTitle}>WANT TO EARN? BE READY!</Text>
          <Text style={styles.statusSub}>Aaj kaam ke liye taiyaar rahein</Text>
        </View>

        {/* PROFILE & RATING METER */}
        <View style={styles.profileRow}>
          <View style={styles.photoBox}>
            {worker.photoUrl ? (
              <Image
                source={{ uri: `http://10.80.154.24:4000${worker.photoUrl}` }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User color="#9ca3af" size={50} />
              </View>
            )}
          </View>

          <View style={styles.meterBox}>
            <Text style={styles.meterTitle}>YOUR RATING</Text>
            {/* Visual Gauge Concept */}
            <View style={styles.gaugeTrack}>
              <View
                style={[
                  styles.gaugeFill,
                  { width: "85%", backgroundColor: "#10B981" },
                ]}
              />
            </View>
            <View style={styles.meterLabels}>
              <Text style={styles.labelText}>Poor</Text>
              <Text
                style={[
                  styles.labelText,
                  { color: "#10B981", fontWeight: "900" },
                ]}
              >
                Excellent
              </Text>
            </View>
          </View>
        </View>

        {/* NAKA SECTION (LIME GREEN) */}
        <View style={styles.nakaCard}>
          <View style={styles.cardHeader}>
            <MapPin color="#3F6212" size={20} />
            <Text style={styles.cardTitle}>MY DECIDED NAKA</Text>
          </View>
          <View style={styles.nakaList}>
            {worker.nakas.map((n, i) => (
              <Text key={i} style={styles.nakaText}>
                {i + 1}. {n.name.toUpperCase()}
              </Text>
            ))}
          </View>
        </View>

        {/* VALIDITY SECTION (ORANGE) */}
        <View style={styles.validityCard}>
          <Calendar color="#7C2D12" size={20} />
          <Text style={styles.validityText}>VALID: 01 APR - 30 APR</Text>
        </View>

        {/* THE 3-SECOND BUTTON (MODERN PINK) */}
        <View style={styles.holdContainer}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPressIn={handleHoldStart}
            onPressOut={handleHoldRelease}
            style={styles.holdTrack}
          >
            <Animated.View
              style={[styles.holdProgress, { width: progressWidth }]}
            />
            <View style={styles.holdUi}>
              <View style={styles.stopCircle}>
                <View style={styles.stopIcon} />
              </View>
              <Text style={styles.holdMainText}>
                HOLD 3 SECONDS{"\n"}TO START WORK
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  loadingArea: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: "#fff",
  },
  brandText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0052CC",
    letterSpacing: 2,
  },
  welcomeText: { fontSize: 20, fontWeight: "bold", color: "#1f2937" },
  logoutBtn: { padding: 10, backgroundColor: "#FEE2E2", borderRadius: 12 },

  scrollBody: { padding: 20 },

  statusBanner: {
    backgroundColor: "#FDE047",
    padding: 20,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#000",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 0,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    color: "#000",
  },
  statusSub: {
    fontSize: 14,
    textAlign: "center",
    color: "#713f12",
    marginTop: 4,
  },

  profileRow: { flexDirection: "row", gap: 15, marginBottom: 20 },
  photoBox: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: "#fff",
    elevation: 4,
    overflow: "hidden",
  },
  avatar: { width: "100%", height: "100%" },
  avatarPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e5e7eb",
  },

  meterBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 15,
    elevation: 4,
  },
  meterTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: "#6b7280",
    marginBottom: 8,
  },
  gaugeTrack: {
    height: 12,
    backgroundColor: "#e5e7eb",
    borderRadius: 6,
    overflow: "hidden",
  },
  gaugeFill: { height: "100%", borderRadius: 6 },
  meterLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },
  labelText: { fontSize: 10, color: "#9ca3af", fontWeight: "bold" },

  nakaCard: {
    backgroundColor: "#BEF264",
    padding: 20,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#365314",
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: { fontWeight: "900", color: "#365314" },
  nakaList: { gap: 5 },
  nakaText: { fontSize: 18, fontWeight: "bold", color: "#1a2e05" },

  validityCard: {
    backgroundColor: "#FB923C",
    padding: 15,
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    borderWidth: 2,
    borderColor: "#7C2D12",
    marginBottom: 25,
  },
  validityText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  holdContainer: { height: 90, width: "100%" },
  holdTrack: {
    flex: 1,
    backgroundColor: "#F9A8D4",
    borderRadius: 45,
    borderWidth: 3,
    borderColor: "#000",
    overflow: "hidden",
  },
  holdProgress: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#DB2777",
  },
  holdUi: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  stopCircle: {
    width: 65,
    height: 65,
    borderRadius: 35,
    backgroundColor: "#EF4444",
    borderWidth: 3,
    borderColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  stopIcon: {
    width: 30,
    height: 4,
    backgroundColor: "#FDE047",
    transform: [{ rotate: "45deg" }],
  },
  holdMainText: {
    flex: 1,
    textAlign: "center",
    fontWeight: "900",
    fontSize: 16,
    color: "#000",
  },
});
