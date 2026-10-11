// app/_layout.tsx
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { Stack, router, useSegments } from "expo-router";
import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { API_URL } from "../constants/api";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const segments = useSegments();
  const customerArea = segments[0] === "user" && segments[1] !== "login";

  useEffect(() => {
    if (!customerArea) return;
    let mounted = true;
    const heartbeat = async (online: boolean) => {
      try {
        const session = await AsyncStorage.getItem("customerSession");
        const activeRole = await AsyncStorage.getItem("activeRole");
        if (!session || activeRole !== "user") return;
        const id = Number(JSON.parse(session)?.id);
        if (!Number.isInteger(id) || id <= 0) return;
        if (!mounted && online) return;
        await fetch(`${API_URL}/user/presence`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId: id, online }),
        });
      } catch (_) {
        // Temporary connectivity loss results in Offline after two minutes.
      }
    };

    if (AppState.currentState === "active") void heartbeat(true);
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void heartbeat(true);
    }, 60000);
    const subscription = AppState.addEventListener("change", (state) => {
      void heartbeat(state === "active");
    });
    return () => {
      mounted = false;
      clearInterval(timer);
      subscription.remove();
      void heartbeat(false);
    };
  }, [customerArea]);

  useEffect(() => {
    const handleNotificationData = (data: any) => {
      console.log("Notification Data:", data);

      if (!data?.action) return;

      if (data.action === "OPEN_ACTIVE_DUTY") {
        setTimeout(() => {
          router.push("/worker/active-duty");
        }, 500);
        return;
      }

      if (data.action === "RATE_CLIENT") {
        setTimeout(() => {
          router.push({
            pathname: "/worker/rate-client",
            params: {
              bookingId: String(data.bookingId || ""),
            },
          });
        }, 500);
        return;
      }

      if (data.action === "DUTY_COMPLETED") {
        setTimeout(() => {
          router.replace("/worker/dashboard");
        }, 500);
        return;
      }

      if (
        data.action === "WORKER_CANCELLED_BY_CLIENT" ||
        data.action === "BOOKING_CANCELLED_BY_CLIENT"
      ) {
        setTimeout(() => {
          router.push({
            pathname: "/worker/cancelled-duty",
            params: {
              type: String(data.action),
              reason: String(data.reason || ""),
              amount: String(data.amount || 0),
              bookingId: String(data.bookingId || ""),
              workerId: String(data.workerId || ""),
            },
          });
        }, 500);
        return;
      }
    };

    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log("Notification tapped:", data);
        handleNotificationData(data);
      });

    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data;
        console.log("Notification received:", data);

        if (data?.action === "OPEN_ACTIVE_DUTY") return;
        handleNotificationData(data);
      },
    );

    return () => {
      responseListener.remove();
      notificationListener.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />

          {/* User Screens */}
          <Stack.Screen name="user/login" options={{ headerShown: false }} />
          <Stack.Screen name="user/dashboard" options={{ headerShown: false }} />
          <Stack.Screen
            name="user/create-booking"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="user/active-booking"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="user/booking-details"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="user/history" options={{ headerShown: false }} />
          <Stack.Screen name="user/rating" options={{ headerShown: false }} />
          <Stack.Screen name="user/profile" options={{ headerShown: false }} />
          <Stack.Screen
            name="user/manage-addresses"
            options={{ headerShown: false, animation: "slide_from_right" }}
          />

          {/* Worker Screens */}
          <Stack.Screen name="worker/login" options={{ headerShown: false }} />
          <Stack.Screen name="worker/dashboard" options={{ headerShown: false }} />
          <Stack.Screen name="worker/available" options={{ headerShown: false }} />
          <Stack.Screen
            name="worker/active-duty"
            options={{ headerShown: false, animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="worker/cancelled-duty"
            options={{ headerShown: false, animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="worker/duty-in-progress"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="worker/rate-client"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="worker/history" options={{ headerShown: false }} />
          <Stack.Screen name="worker/wallet" options={{ headerShown: false }} />
          <Stack.Screen name="worker/profile" options={{ headerShown: false }} />
          <Stack.Screen
            name="worker/booking-details"
            options={{ headerShown: false }}
          />
        </Stack>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
