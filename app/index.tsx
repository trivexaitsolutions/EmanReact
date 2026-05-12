// Replace your entire app/index.tsx with this:
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function RoleSelectionScreen() {
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const session = await AsyncStorage.getItem("workerSession");
      if (session) {
        // Found a saved worker! Jump straight to dashboard.
        router.replace("/worker/dashboard");
      } else {
        // No session found, show the screen
        setIsChecking(false);
      }
    } catch (error) {
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>E-man</Text>
      <Text style={styles.subtitle}>Choose your profile to continue</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.cardButton, { backgroundColor: "#10B981" }]}
          onPress={() => router.push("/worker/login")}
        >
          <Text style={styles.cardTitle}>I am a Worker</Text>
          <Text style={styles.cardSub}>Find daily jobs and manage duties</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cardButton, { backgroundColor: "#3B82F6" }]}
          onPress={() => router.push("/user/login")}
        >
          <Text style={styles.cardTitle}>I am a User</Text>
          <Text style={styles.cardSub}>Hire skilled daily-wage labor</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 42, fontWeight: "900", color: "#111", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 48 },
  buttonContainer: { width: "100%", gap: 20 },
  cardButton: { padding: 24, borderRadius: 16, alignItems: "flex-start" },
  cardTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  cardSub: { color: "#fff", fontSize: 14, opacity: 0.9 },
});
