// app/worker/login.tsx
import axios from "axios";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../../constants/api";

export default function WorkerLoginScreen() {
  const [loginId, setLoginId] = useState(""); // Handles both email and phone now!
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // IMPORTANT: Update this with your PC's actual IPv4 address!
  // Notice the path is now /api/worker/login
  // const API_URL = "http://192.168.0.103:4000/api";

  const handleLogin = async () => {
    if (!loginId || password.length === 0) {
      Alert.alert("Error", "Please enter your Mobile No/Email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/worker/login`, {
        loginId: loginId.toLowerCase(), // Emails should be lowercase
        password,
      });

      if (response.data.success) {
        // Save the worker data to the phone's local storage
        await AsyncStorage.setItem(
          "workerSession",
          JSON.stringify(response.data.worker),
        );

        await AsyncStorage.setItem("activeRole", "worker");

        // Use 'replace' instead of 'push' so they can't press the Android back button to return to the login screen
        router.replace("/worker/dashboard");
      }
    } catch (error: any) {
      // This will print the exact error to your laptop's Expo terminal!
      console.log(
        "MOBILE ERROR:",
        error.response ? error.response.data : error.message,
      );

      Alert.alert("Login Failed", "Incorrect ID or password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Worker Login</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>MOBILE NO OR EMAIL</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter phone or email"
          placeholderTextColor="#999"
          keyboardType="email-address" // Better keyboard for mixed input
          autoCapitalize="none"
          value={loginId}
          onChangeText={setLoginId}
        />

        <Text style={styles.label}>PASSWORD</Text>
        <TextInput
          style={styles.input}
          placeholder="Your password"
          placeholderTextColor="#999"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24 },
  header: { marginTop: 60, alignItems: "center", marginBottom: 40 },
  welcomeText: { fontSize: 32, fontWeight: "800", color: "#000" },
  formContainer: { flex: 1 },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    marginBottom: 24,
    color: "#000",
  },
  loginButton: {
    backgroundColor: "#10B981",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  loginButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
