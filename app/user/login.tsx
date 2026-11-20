// app/user/login.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
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
  const scrollRef = useRef<ScrollView>(null);

  const keepFormVisible = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

  // Login Field
  const [loginId, setLoginId] = useState(""); // Isme phone ya email kuch bhi daal sakte hain

  // Register Fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [clientType, setClientType] = useState<"Individual" | "Company">("Individual");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("Warehouse");
  const [gstNumber, setGstNumber] = useState("");

  // OTP Field
  const [otp, setOtp] = useState("");
  const [customerId, setCustomerId] = useState(null);

  const handleSendOtp = async () => {
    setIsLoading(true);
    try {
      let payload = {};

      if (isRegisterMode) {
        // Naye user ke liye Name, Phone, Email teeno chahiye
        if (!name.trim() || !phone.trim() || !email.trim()) {
          Alert.alert(
            "Zaroori Hai",
            "Kripya Name, Phone aur Email teeno daalein.",
          );
          setIsLoading(false);
          return;
        }
        if (!/^\d{10}$/.test(phone.trim())) {
          Alert.alert("Invalid Phone", "Please enter a valid 10-digit mobile number.");
          return;
        }
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
          Alert.alert("Invalid Email", "Please enter a valid email address.");
          return;
        }
        if (clientType === "Company" && !businessName.trim()) {
          Alert.alert("Company Details", "Company name is required.");
          return;
        }
        payload = {
          name: name.trim().toLocaleUpperCase(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          clientType,
          businessName: clientType === "Company" ? businessName.trim().toLocaleUpperCase() : undefined,
          businessType: clientType === "Company" ? businessType : undefined,
          gstNumber: clientType === "Company" ? gstNumber.trim().toUpperCase() : undefined,
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
        setOtp("");
        Alert.alert("OTP Sent", response.data?.message || "OTP bhej diya gaya hai!");
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
    if (otp.trim().length !== 6) {
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

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
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
              <Text style={{ fontWeight: "700", color: "#334155", marginBottom: 8 }}>Registration Type</Text>
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 15 }}>
                {(["Individual", "Company"] as const).map((type) => (
                  <TouchableOpacity key={type} disabled={isOtpSent} onPress={() => setClientType(type)}
                    style={{ flex: 1, padding: 12, borderRadius: 12, alignItems: "center", borderWidth: 1,
                      borderColor: clientType === type ? "#059669" : "#CBD5E1", backgroundColor: clientType === type ? "#D1FAE5" : "#FFFFFF" }}>
                    <Text style={{ color: "#064E3B", fontWeight: "700" }}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholderTextColor="#6B7280"
                placeholder="Full Name"
                value={name}
                onChangeText={value => setName(value.toLocaleUpperCase())}
                autoCapitalize="characters"
                editable={!isOtpSent}
              />
              {clientType === "Company" && (
                <>
                  <Text style={styles.fieldLabel}>Company Name *</Text>
                  <TextInput style={styles.input} placeholderTextColor="#6B7280" placeholder="Company Name *" value={businessName}
                    onChangeText={value => setBusinessName(value.toLocaleUpperCase())}
                    autoCapitalize="characters" editable={!isOtpSent} />
                  <Text style={{ fontWeight: "700", color: "#334155", marginBottom: 8 }}>Industry Type</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 15 }}>
                    {["Warehouse", "Construction", "Retail", "Other"].map(type => (
                      <TouchableOpacity key={type} disabled={isOtpSent} onPress={() => setBusinessType(type)}
                        style={{ paddingVertical: 8, paddingHorizontal: 11, borderRadius: 9, borderWidth: 1,
                          borderColor: businessType === type ? "#059669" : "#CBD5E1", backgroundColor: businessType === type ? "#D1FAE5" : "#FFFFFF" }}>
                        <Text style={{ color: "#111827", fontWeight: "600" }}>{type}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.fieldLabel}>GST Number (optional)</Text>
                  <TextInput style={styles.input} placeholderTextColor="#6B7280" placeholder="GST Number (optional)" value={gstNumber}
                    onChangeText={value => setGstNumber(value.toUpperCase())}
                    maxLength={15} autoCapitalize="characters" editable={!isOtpSent} />
                </>
              )}
              <Text style={styles.fieldLabel}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                placeholderTextColor="#6B7280"
                placeholder="Phone Number"
                keyboardType="numeric"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
                editable={!isOtpSent}
                onFocus={keepFormVisible}
              />
              <Text style={styles.fieldLabel}>Email Address *</Text>
              <TextInput
                style={styles.input}
                placeholderTextColor="#6B7280"
                placeholder="Email Address"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                editable={!isOtpSent}
                onFocus={keepFormVisible}
              />
            </>
          ) : (
            /* ----- LOGIN FIELD (Default) ----- */
            <>
            <Text style={styles.fieldLabel}>Registered Phone Number or Email</Text>
            <TextInput
              style={styles.input}
              placeholderTextColor="#6B7280"
              placeholder="Phone Number / Email"
              autoCapitalize="none"
              value={loginId}
              onChangeText={setLoginId}
              editable={!isOtpSent} // OTP aane ke baad isko lock kar denge
              onFocus={keepFormVisible}
            />
            </>
          )}

          {/* ----- OTP FIELD (Shuru me disabled rahega) ----- */}
          <Text style={styles.fieldLabel}>OTP (6 digits)</Text>
          <TextInput
            style={[
              styles.input,
              styles.otpInput,
              !isOtpSent && styles.disabledInput, // Agar OTP nahi bheja toh Grey dikhega
            ]}
            placeholder="OTP daalein"
            placeholderTextColor="#6B7280"
            keyboardType="numeric"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
            editable={isOtpSent} // Yeh logic OTP box ko disable/enable karta hai
            onFocus={keepFormVisible}
            returnKeyType="done"
            onSubmitEditing={isOtpSent ? handleVerifyOtp : undefined}
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

          {isOtpSent && (
            <View style={styles.otpActions}>
              <TouchableOpacity disabled={isLoading} onPress={handleSendOtp}>
                <Text style={styles.otpActionText}>Resend OTP</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={isLoading} onPress={() => { setIsOtpSent(false); setOtp(""); setCustomerId(null); }}>
                <Text style={styles.otpActionText}>Change Email / Phone</Text>
              </TouchableOpacity>
            </View>
          )}
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 140 },
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
  content: { flexGrow: 1, padding: 24, marginTop: 20 },
  titleText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 10,
  },
  subText: { fontSize: 14, color: "#6B7280", marginBottom: 30, lineHeight: 20 },
  form: { gap: 10 },
  fieldLabel: { color: "#111827", fontSize: 14, fontWeight: "700", marginBottom: 3 },
  otpActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, gap: 8 },
  otpActionText: { color: "#0052CC", fontSize: 14, fontWeight: "700" },
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
    backgroundColor: "#F3F4F6",
    color: "#374151",
    borderColor: "#CBD5E1",
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
