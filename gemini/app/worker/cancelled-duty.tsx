import { router, Stack, useLocalSearchParams } from "expo-router";
import { XCircle } from "lucide-react-native";
import React from "react";
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function CancelledDuty() {
  const { reason, amount, type } = useLocalSearchParams();

  const isWholeBooking = type === "BOOKING_CANCELLED_BY_CLIENT";

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <XCircle color="#DC2626" size={46} />
        </View>

        <Text style={styles.title}>
          {isWholeBooking ? "Booking Cancelled" : "Duty Cancelled"}
        </Text>

        <Text style={styles.subtitle}>
          {isWholeBooking
            ? "Customer ne poori booking cancel kar di hai."
            : "Customer ne aapki duty cancel kar di hai."}
        </Text>

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Reason</Text>
            <Text style={styles.infoValue}>{reason || "-"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Amount</Text>
            <Text style={styles.amountText}>₹{amount || 0}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.replace("/worker/dashboard")}
        >
          <Text style={styles.primaryBtnText}>Go to Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.replace("/worker/available")}
        >
          <Text style={styles.secondaryBtnText}>Go to Availability</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    padding: 22,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  iconCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  infoBox: {
    width: "100%",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    padding: 16,
    marginTop: 22,
    marginBottom: 18,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    gap: 12,
  },
  infoLabel: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "800",
  },
  infoValue: {
    flex: 1,
    color: "#111827",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right",
  },
  amountText: {
    color: "#DC2626",
    fontSize: 18,
    fontWeight: "900",
  },
  primaryBtn: {
    width: "100%",
    backgroundColor: "#111827",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 4,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  secondaryBtn: {
    width: "100%",
    backgroundColor: "#ECFDF5",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  secondaryBtnText: {
    color: "#047857",
    fontSize: 15,
    fontWeight: "900",
  },
});
