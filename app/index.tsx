import { getMobileToken } from "../utils/mobileAuthClient";
import { useI18n } from '../i18n';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import LanguageQuickSwitcher from "../components/language-quick-switcher";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  useWindowDimensions,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";


export default function RoleSelectionScreen() {
  const { t } = useI18n();
  const { width, height } = useWindowDimensions();
  const cardSize = Math.min(width * 0.65, height * 0.30, 300);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkExistingSession();
  }, []);

  // Android back on the role chooser returns to language choice, not app exit.
  useFocusEffect(useCallback(() => {
    if (isChecking) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      router.push('/select-language');
      return true;
    });
    return () => sub.remove();
  }, [isChecking]));

  const checkExistingSession = async () => {
    try {
      const chosen = await AsyncStorage.getItem("@eman:language:chosen:v1");
      if (!chosen) {
        router.replace("/select-language?initial=1");
        return;
      }
      const token = await getMobileToken();
      if (!token) {
        // An old userId-only session is not an authenticated session.
        await AsyncStorage.multiRemove(['customerSession', 'workerSession', 'activeRole']);
        setIsChecking(false);
        return;
      }
      const activeRole = await AsyncStorage.getItem("activeRole");
      const customerSession = await AsyncStorage.getItem("customerSession");
      const workerSession = await AsyncStorage.getItem("workerSession");

      if (activeRole === "user" && customerSession) {
        router.replace("/user/dashboard");
        return;
      }

      if (activeRole === "worker" && workerSession) {
        router.replace("/worker/dashboard");
        return;
      }

      if (customerSession) {
        router.replace("/user/dashboard");
        return;
      }

      if (workerSession) {
        router.replace("/worker/dashboard");
        return;
      }

      setIsChecking(false);
    } catch (error) {
      console.log("Session check error:", error);
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <View style={[styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#111" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ alignSelf: 'flex-end', marginBottom: 12 }}>
        <LanguageQuickSwitcher />
      </View>
      {/* Top Worker Card */}
      <TouchableOpacity
        style={[styles.card, { width: cardSize, height: cardSize }]}
        activeOpacity={0.8}
        accessibilityRole="button" accessibilityLabel={t("Worker")}
        onPress={() => router.push("/worker/login")}
      >
        <Image
          source={require("../assets/images/worker-icon.png")} // Change file name if needed
          style={styles.image}
          resizeMode="contain"
        />
        <Text style={styles.roleLabel}>{t("Worker")}</Text>
      </TouchableOpacity>

      {/* Center Text */}
      <View style={styles.textContainer}>
        <Text style={styles.loginText}>{t("LOGIN")}</Text>
      </View>

      {/* Bottom User/Company Card */}
      <TouchableOpacity
        style={[styles.card, { width: cardSize, height: cardSize }]}
        activeOpacity={0.8}
        accessibilityRole="button" accessibilityLabel={t("Customer")}
        onPress={() => router.push("/user/login")}
      >
        <Image
          source={require("../assets/images/factory-icon.png")} // Change file name if needed
          style={styles.image}
          resizeMode="contain"
        />
        <Text style={styles.roleLabel}>{t("Customer")}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#FFD23F",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFD23F", // Client's requested yellow background
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingVertical: 16,
  },
  languageAction: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 8, padding: 10, backgroundColor: "#FFFFFF", borderRadius: 18 },
  languageText: { fontSize: 14, fontWeight: "800", color: "#1A1A1A" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24, // Modern rounded corners
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
    // Premium iOS Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    // Premium Android Shadow
    elevation: 10,
  },
  image: {
    width: "85%",
    flex: 1,
    minHeight: 0,
  },
  roleLabel: { fontSize: 20, fontWeight: "800", color: "#171717", textAlign: "center", marginTop: 8 },
  textContainer: {
    marginVertical: 10,
  },
  loginText: {
    fontSize: 32,
    fontWeight: "900",
    color: "#1A1A1A",
    letterSpacing: 3, // Slight spacing for premium look
  },
});
