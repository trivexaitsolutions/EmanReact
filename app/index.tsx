import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

export default function RoleSelectionScreen() {
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
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
      {/* Top Worker Card */}
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => router.push("/worker/login")}
      >
        <Image
          source={require("../assets/images/worker-icon.png")} // Change file name if needed
          style={styles.image}
          resizeMode="contain"
        />
      </TouchableOpacity>

      {/* Center Text */}
      <View style={styles.textContainer}>
        <Text style={styles.loginText}>LOGIN</Text>
      </View>

      {/* Bottom User/Company Card */}
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => router.push("/user/login")}
      >
        <Image
          source={require("../assets/images/factory-icon.png")} // Change file name if needed
          style={styles.image}
          resizeMode="contain"
        />
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
    paddingVertical: 50,
  },
  card: {
    width: width * 0.65,
    height: width * 0.65,
    backgroundColor: "#FFFFFF",
    borderRadius: 24, // Modern rounded corners
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
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
    height: "85%",
  },
  textContainer: {
    marginVertical: 10,
  },
  loginText: {
    fontSize: 48,
    fontWeight: "900",
    color: "#1A1A1A",
    letterSpacing: 3, // Slight spacing for premium look
  },
});
