import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, Stack } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from "react-native";

/**
 * Safety net for native providers that deliver a raw callback before
 * +native-intent can normalize it while the app is already running.
 */
export default function NotFoundScreen() {
  useEffect(() => {
    let cancelled = false;

    const recover = async () => {
      try {
        const pendingPayment = await AsyncStorage.getItem("pendingPaymentReturn");
        if (cancelled) return;

        if (pendingPayment) {
          router.replace("/user/payment-return");
          return;
        }

        const [activeRole, customerSession, workerSession] = await Promise.all([
          AsyncStorage.getItem("activeRole"),
          AsyncStorage.getItem("customerSession"),
          AsyncStorage.getItem("workerSession"),
        ]);

        if (cancelled) return;

        if (activeRole === "user" && customerSession) {
          router.replace("/user/dashboard");
          return;
        }

        if (activeRole === "worker" && workerSession) {
          router.replace("/worker/dashboard");
          return;
        }

        router.replace("/");
      } catch {
        if (!cancelled) router.replace("/");
      }
    };

    recover();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#16863A" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
});
