// app/_layout.tsx
import * as Notifications from "expo-notifications";
import { Stack, router } from "expo-router";
import { useEffect } from "react";

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

      // Old fallback: agar kahi purana DUTY_COMPLETED action aaya to dashboard par bhej do
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
        handleNotificationData(data);
      },
    );

    return () => {
      responseListener.remove();
      notificationListener.remove();
    };
  }, []);

  return (
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
      <Stack.Screen
        name="worker/booking-details"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
