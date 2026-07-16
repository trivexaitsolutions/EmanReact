// utils/pushToken.ts
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Alert, Platform } from "react-native";

// Yeh function phone se permission mangega aur Token nikal kar dega
export async function registerForPushNotificationsAsync() {
  let token;

  // 1. Web Browser Shield (Taaki laptop par app crash na ho)
  if (Platform.OS === "web") {
    console.log(
      "Web browser par Push Notifications support nahi karta. Isko skip kar rahe hain.",
    );
    return null;
  }

  // 2. Check karein ki asli phone hai ya Emulator (Emulator par test nahi hota)
  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Agar permission pehle se nahi hai, toh user se maango
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Aapko notifications ON karni hongi taaki naye kaam ka alert mil sake!",
      );
      return null;
    }

    // 3. Permission mil gayi, ab Expo se Token generate karo
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      token = tokenData.data;
      console.log("🎉 Push Token Mil Gaya:", token);
    } catch (error) {
      console.log("Token generate karne me error:", error);
    }
  } else {
    console.log(
      "Push notifications test karne ke liye asli phone use karein (Emulator nahi).",
    );
  }

  // 4. Android ke liye channel setup (Android ki requirement)
  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#0052CC", // E-MAN Blue color
    });
  }

  return token;
}
