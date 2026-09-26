import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { API_URL } from "../../constants/api";

const MAX_CHECKS = 15;
const CHECK_DELAY_MS = 1000;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export default function PaymentReturnScreen() {
  useEffect(() => {
    let cancelled = false;

    const recoverPaymentReturn = async () => {
      try {
        const [activeRole, customerSession, workerSession, pendingPayment] =
          await Promise.all([
            AsyncStorage.getItem("activeRole"),
            AsyncStorage.getItem("customerSession"),
            AsyncStorage.getItem("workerSession"),
            AsyncStorage.getItem("pendingPaymentReturn"),
          ]);

        if (cancelled) return;

        // This route is primarily for the customer Razorpay/UPI return.
        if (customerSession && (activeRole === "user" || !workerSession)) {
          const customer = JSON.parse(customerSession);

          if (pendingPayment && customer?.id) {
            for (let attempt = 0; attempt < MAX_CHECKS; attempt += 1) {
              if (cancelled) return;

              try {
                const response = await axios.get(
                  `${API_URL}/user/current-booking/${customer.id}`,
                );

                if (response.data?.success && response.data?.booking) {
                  await AsyncStorage.removeItem("pendingPaymentReturn");
                  if (!cancelled) router.replace("/user/active-booking");
                  return;
                }
              } catch {
                // Payment verification may still be finishing in the original
                // Razorpay promise. Retry briefly instead of showing 404.
              }

              await wait(CHECK_DELAY_MS);
            }
          }

          if (!cancelled) router.replace("/user/dashboard");
          return;
        }

        if (workerSession && activeRole === "worker") {
          router.replace("/worker/dashboard");
          return;
        }

        router.replace("/");
      } catch (error) {
        console.log("Payment return recovery error:", error);
        if (!cancelled) router.replace("/");
      }
    };

    recoverPaymentReturn();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#16863A" />
        <Text style={styles.text}>Confirming payment...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  text: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700",
  },
});
