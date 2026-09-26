// app/worker/login.tsx
import axios from "axios";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../../constants/api";

export default function WorkerLoginScreen() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState(""); // Backend ke liye variable name password hi rakha hai
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!loginId || password.length === 0) {
      Alert.alert("Error", "Please enter your Mobile No and PIN.");
      return;
    }

    setIsLoading(true);
    try {
      console.log(
        "Attempting login with:",
        loginId,
        password,
        `${API_URL}/worker/login`,
      );
      const response = await axios.post(`${API_URL}/worker/login`, {
        loginId: loginId.toLowerCase(),
        password,
      });

      if (response.data.success) {
        await AsyncStorage.setItem(
          "workerSession",
          JSON.stringify(response.data.worker),
        );
        await AsyncStorage.setItem("activeRole", "worker");

        router.replace("/worker/dashboard");
      }
    } catch (error: any) {
      console.log(
        "MOBILE ERROR:",
        error.response ? error.response.data : error.message,
      );
      Alert.alert("Login Failed", "Incorrect Mobile No or PIN.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        bounces={false}
      >
        {/* Top Yellow Header Background */}
        <View style={styles.topHeader} />

        {/* Floating Avatar */}
        <View style={styles.avatarContainer}>
          <Image
            source={require("../../assets/images/worker-icon.png")}
            style={styles.avatar}
            resizeMode="contain"
          />
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.welcomeText}>Welcome</Text>

          {/* Mobile No Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>MOBILE NO</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your mobile no"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              autoCapitalize="none"
              value={loginId}
              onChangeText={setLoginId}
            />
          </View>

          {/* PIN Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>PIN</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your PIN"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              keyboardType="numeric" // Changes keyboard to number pad for PIN
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          {/* Footer Links */}
          <View style={styles.footerLinks}>
            <TouchableOpacity>
              <Text style={styles.linkText}>Forgot PIN?</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 15 }}>
              <Text style={styles.linkText}>Privacy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
  },
  topHeader: {
    height: 180,
    backgroundColor: "#FFD23F", // Client's yellow theme
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  avatarContainer: {
    alignSelf: "center",
    marginTop: -70, // Pulls the avatar up over the yellow background
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 100,
    // Premium shadows
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  avatar: {
    width: 110,
    height: 110,
  },
  formContainer: {
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 40,
  },
  welcomeText: {
    fontSize: 34,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },
  loginButton: {
    backgroundColor: "#3F51B5", // Matched the blue from the reference
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#3F51B5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  footerLinks: {
    marginTop: 30,
    alignItems: "flex-start",
  },
  linkText: {
    color: "#3F51B5",
    fontSize: 15,
    fontWeight: "700",
  },
});
