// app/_layout.tsx
import * as Notifications from "expo-notifications";
import { Stack, router } from "expo-router";
import { useEffect } from "react";

// 1. Notification ka behaviour set karo (Foreground me alert aaye ya nahi)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // App ON hone par bhi banner dikhao
    shouldPlaySound: true, // Ghanti bajao
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  useEffect(() => {
    // 2. SCENARIO 1: App Background me tha ya Locked tha, aur user ne Notification par TAP kiya (Tap Event)
    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;

        console.log("Worker tapped notification:", data);

        // Agar backend se action aya hai
        if (data && data.action === "OPEN_ACTIVE_DUTY") {
          // Thoda timeout dete hain taaki app puri tarah load ho jaye
          setTimeout(() => {
            router.push("/worker/active-duty");
          }, 500);
        }
      });

    // 3. SCENARIO 2: App ON hai (Foreground me hai) aur Notification aayi (Receive Event)
    // SCENARIO 2: App ON hai aur Notification aayi (Receive Event)
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data;

        if (data && data.action === "OPEN_ACTIVE_DUTY") {
          router.push("/worker/active-duty");
        }

        // 🚀 NAYA LOGIC: Agar duty complete ho gayi toh free kar do!
        if (data && data.action === "DUTY_COMPLETED") {
          router.replace("/worker/dashboard");
        }
      },
    );

    // Cleanup: Jab app close ho toh listeners hata do
    return () => {
      Notifications.removeNotificationSubscription(responseListener);
      Notifications.removeNotificationSubscription(notificationListener);
    };
  }, []);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="auth/login" options={{ headerShown: false }} />
      <Stack.Screen name="worker/dashboard" options={{ headerShown: false }} />
      {/* Humari nayi screen add ki */}
      <Stack.Screen
        name="worker/active-duty"
        options={{ headerShown: false, animation: "slide_from_bottom" }}
      />
    </Stack>
  );
}
