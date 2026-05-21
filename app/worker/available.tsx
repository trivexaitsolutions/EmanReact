// app/worker/available.tsx
import { router, Stack } from "expo-router";
import {
    CheckCircle2,
    ChevronLeft,
    MapPin,
    Settings
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function WorkerAvailable() {
  // Demo Countdown Timer Logic (e.g., waiting for 8:30 AM)
  const [timeLeft, setTimeLeft] = useState(5025); // 01:23:45 in seconds

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 5025));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* APP BAR */}
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 5 }}>
          <ChevronLeft color="#0a0e27" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Today's Pool</Text>
        <View style={{ width: 28 }} /> {/* Spacing */}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HERO SECTION - AVAILABLE */}
        <View style={styles.heroAvailable}>
          <Text style={styles.heroTitle}>✅ You're In!</Text>
          <Text style={styles.heroSub}>Match milte hi call aayega</Text>

          <View style={styles.countdownBox}>
            <Text style={styles.countdownTime}>{formatTime(timeLeft)}</Text>
            <Text style={styles.countdownLabel}>MATCH AT 8:30 AM</Text>
          </View>
        </View>

        {/* NAKAS LIST */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MapPin color="#0a0e27" size={18} />
            <Text style={styles.cardTitle}>Today's Nakas</Text>
          </View>

          <View style={styles.rowItem}>
            <Text style={styles.rowTextMain}>Bhiwandi Padgha 🔥</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <CheckCircle2 color="#16a34a" size={14} />
              <Text style={styles.rowTextHighlight}> Top demand</Text>
            </View>
          </View>

          <View style={[styles.rowItem, styles.borderTop]}>
            <Text style={styles.rowTextMain}>Kalyan Phata</Text>
            <CheckCircle2 color="#16a34a" size={18} />
          </View>

          <View style={[styles.rowItem, styles.borderTop]}>
            <Text style={styles.rowTextMain}>Dombivli Manpada</Text>
            <CheckCircle2 color="#16a34a" size={18} />
          </View>
        </View>

        {/* TODAY'S SETTINGS / STATS */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Settings color="#0a0e27" size={18} />
            <Text style={styles.cardTitle}>Today's Settings</Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Skills</Text>
            <Text style={styles.statValue}>Loader, Helper</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Hours</Text>
            <Text style={styles.statValue}>8 AM - 4 PM</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Workers in pool</Text>
            <Text style={[styles.statValue, { color: "#16a34a" }]}>234</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Open jobs</Text>
            <Text style={[styles.statValue, { color: "#FFA500" }]}>187</Text>
          </View>
        </View>

        {/* SIMULATE MATCH BUTTON */}
        <TouchableOpacity
          style={styles.simulateBtn}
          onPress={() => router.push("/worker/matched")}
        >
          <Text style={styles.simulateBtnText}>⚡ Simulate Match (Demo)</Text>
        </TouchableOpacity>

        {/* INFO BANNER */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoText}>
            💡 Pabandi badhao · Gold (4.5) tak pahuncho · ₹100 extra roz!
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f7" },
  appBar: {
    backgroundColor: "#FFD700",
    padding: 15,
    paddingTop: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    elevation: 3,
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#0a0e27" },
  content: { padding: 16 },

  heroAvailable: {
    backgroundColor: "#16a34a",
    padding: 24,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 6,
  },
  heroSub: { color: "rgba(255,255,255,0.9)", fontSize: 13, marginBottom: 16 },
  countdownBox: {
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    width: "100%",
  },
  countdownTime: {
    color: "#FFD700",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },
  countdownLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    marginTop: 4,
    fontWeight: "700",
    letterSpacing: 1,
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0a0e27",
    marginLeft: 8,
    textTransform: "uppercase",
  },

  rowItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    alignItems: "center",
  },
  borderTop: { borderTopWidth: 1, borderColor: "#f1f5f9" },
  rowTextMain: { fontSize: 14, color: "#333", fontWeight: "500" },
  rowTextHighlight: { color: "#16a34a", fontWeight: "700", fontSize: 13 },

  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  statLabel: { color: "#64748b", fontSize: 13 },
  statValue: { color: "#0a0e27", fontWeight: "700", fontSize: 13 },

  simulateBtn: {
    backgroundColor: "#0a0e27",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  simulateBtnText: { color: "#FFD700", fontWeight: "800", fontSize: 15 },

  infoBanner: {
    backgroundColor: "#fffbeb",
    borderLeftWidth: 4,
    borderColor: "#FFA500",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  infoText: {
    fontSize: 12,
    color: "#92400e",
    fontWeight: "500",
    lineHeight: 18,
  },
});
