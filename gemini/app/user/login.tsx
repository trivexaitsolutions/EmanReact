// app/user/login.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { API_URL } from "../../constants/api";

export default function CustomerLoginScreen() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Login Field
  const [loginId, setLoginId] = useState(""); // Isme phone ya email kuch bhi daal sakte hain

  // Register Fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // OTP Field
  const [otp, setOtp] = useState("");
  const [customerId, setCustomerId] = useState(null);

  const handleSendOtp = async () => {
    setIsLoading(true);
    try {
      let payload = {};

      if (isRegisterMode) {
        // Naye user ke liye Name, Phone, Email teeno chahiye
        if (!name || !phone || !email) {
          Alert.alert(
            "Zaroori Hai",
            "Kripya Name, Phone aur Email teeno daalein.",
          );
          setIsLoading(false);
          return;
        }
        payload = {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
        };
      } else {
        // Purane user ke liye sirf loginId (Phone ya Email) chahiye
        if (!loginId) {
          Alert.alert(
            "Zaroori Hai",
            "Kripya apna Phone Number ya Email daalein.",
          );
          setIsLoading(false);
          return;
        }
        // Check karte hain ki user ne email daala hai ya phone number
        const isEmail = loginId.includes("@");
        payload = isEmail
          ? { email: loginId.trim().toLowerCase() }
          : { phone: loginId.trim() };
      }

      const response = await axios.post(`${API_URL}/user/send-otp`, payload);

      if (response.data.success) {
        setCustomerId(response.data.customerId);
        setIsOtpSent(true); // OTP box ko Enable kar dega!
        Alert.alert("OTP Sent", "OTP aapke email par bhej diya gaya hai!");
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message || "Server se connect nahi ho paya.";
      Alert.alert("Error", errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const getPushToken = async () => {
    let token;
    if (Device.isDevice) {
      // Token sirf asli phone me generate hota hai
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        console.log("Permission not granted for Push Notifications");
        return null;
      }
      try {
        // Token nikalne ka Expo method
        token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log("Customer Push Token Generated:", token);
      } catch (error) {
        console.log("Token generation error:", error);
      }
    } else {
      console.log("Must use physical device for Push Notifications");
    }
    return token;
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 4) {
      Alert.alert("Error", "Sahi OTP daalein.");
      return;
    }

    setIsLoading(true);
    const expoPushToken = await getPushToken();
    try {
      const response = await axios.post(`${API_URL}/user/verify-otp`, {
        customerId,
        otp: otp.trim(),
        pushToken: expoPushToken, // 👈 Naya addition
      });

      if (response.data.success) {
        await AsyncStorage.setItem(
          "customerSession",
          JSON.stringify(response.data.customer),
        );
        // Alert.alert("Welcome!", "Aapka login successful ho gaya hai.");
        await AsyncStorage.setItem("activeRole", "user");
        router.replace("/user/dashboard");
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message || "Galat OTP ya expire ho chuka hai.";
      Alert.alert("Error", errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>E-MAN CUSTOMER</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.titleText}>
          {isRegisterMode ? "Naya Account Banayein" : "Login Karein"}
        </Text>
        <Text style={styles.subText}>
          {isRegisterMode
            ? "Apni details daalein taaki hum aapka account bana sakein."
            : "Apna registered Phone Number ya Email daalein."}
        </Text>

        <View style={styles.form}>
          {/* ----- REGISTER FIELDS (Sirf tab dikhenge jab New Login chuna ho) ----- */}
          {isRegisterMode ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
                editable={!isOtpSent}
              />
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                keyboardType="numeric"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
                editable={!isOtpSent}
              />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                editable={!isOtpSent}
              />
            </>
          ) : (
            /* ----- LOGIN FIELD (Default) ----- */
            <TextInput
              style={styles.input}
              placeholder="Phone Number / Email"
              autoCapitalize="none"
              value={loginId}
              onChangeText={setLoginId}
              editable={!isOtpSent} // OTP aane ke baad isko lock kar denge
            />
          )}

          {/* ----- OTP FIELD (Shuru me disabled rahega) ----- */}
          <TextInput
            style={[
              styles.input,
              styles.otpInput,
              !isOtpSent && styles.disabledInput, // Agar OTP nahi bheja toh Grey dikhega
            ]}
            placeholder="OTP daalein"
            keyboardType="numeric"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
            editable={isOtpSent} // Yeh logic OTP box ko disable/enable karta hai
          />

          {/* ----- MAIN BUTTON ----- */}
          <TouchableOpacity
            style={[
              styles.mainButton,
              isOtpSent ? styles.verifyButton : styles.sendButton,
            ]}
            onPress={isOtpSent ? handleVerifyOtp : handleSendOtp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isOtpSent ? "Verify & Login" : "Send OTP"}
              </Text>
            )}
          </TouchableOpacity>

          {/* ----- TOGGLE BUTTON (Naya Account / Purana Account) ----- */}
          {!isOtpSent && ( // OTP aane ke baad mode change karne ka option chhupa denge
            <TouchableOpacity
              style={styles.toggleContainer}
              onPress={() => {
                setIsRegisterMode(!isRegisterMode);
                setLoginId("");
                setName("");
                setPhone("");
                setEmail("");
              }}
            >
              <Text style={styles.toggleText}>
                {isRegisterMode
                  ? "Pehle se account hai? Login karein"
                  : "Naya user? Create Account (New Login)"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    backgroundColor: "#0052CC",
    paddingTop: 50,
    paddingBottom: 20,
    alignItems: "center",
    elevation: 4,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  content: { flex: 1, padding: 24, marginTop: 20 },
  titleText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 10,
  },
  subText: { fontSize: 14, color: "#6B7280", marginBottom: 30, lineHeight: 20 },
  form: { gap: 15 },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#111827",
  },

  // OTP box ki styling
  otpInput: { textAlign: "center", fontSize: 20, letterSpacing: 5 },
  disabledInput: {
    backgroundColor: "#E5E7EB",
    color: "#9CA3AF",
    borderColor: "#E5E7EB",
  }, // Band hone par grey dikhega

  mainButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    elevation: 2,
  },
  sendButton: { backgroundColor: "#3B82F6" }, // Blue color OTP bhejne ke liye
  verifyButton: { backgroundColor: "#10B981" }, // Green color Verify ke liye
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },

  toggleContainer: { marginTop: 20, alignItems: "center", padding: 10 },
  toggleText: { color: "#0052CC", fontSize: 16, fontWeight: "bold" },
});
