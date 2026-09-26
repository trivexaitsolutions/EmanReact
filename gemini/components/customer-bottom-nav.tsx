import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, usePathname } from "expo-router";
import { BriefcaseBusiness, History, House, UserRound } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type CustomerTab = "home" | "book" | "history" | "profile";

const tabs: Array<{
  key: CustomerTab;
  label: string;
  route:
    | "/user/dashboard"
    | "/user/book-worker-step1"
    | "/user/history"
    | "/user/profile";
  icon: typeof House;
}> = [
  { key: "home", label: "Home", route: "/user/dashboard", icon: House },
  { key: "book", label: "Book", route: "/user/book-worker-step1", icon: BriefcaseBusiness },
  { key: "history", label: "History", route: "/user/history", icon: History },
  { key: "profile", label: "Profile", route: "/user/profile", icon: UserRound },
];

const getActiveTab = (pathname: string): CustomerTab | null => {
  if (pathname === "/user/dashboard" || pathname === "/user/active-booking") return "home";
  if (pathname.includes("book-worker") || pathname === "/user/create-booking") return "book";
  if (pathname === "/user/history" || pathname === "/user/booking-details") return "history";
  if (pathname === "/user/profile" || pathname === "/user/manage-addresses") return "profile";
  return null;
};

export default function CustomerBottomNav() {
  const pathname = usePathname();
  const active = getActiveTab(pathname);

  const openTab = async (tab: (typeof tabs)[number]) => {
    if (tab.key === "book") {
      try {
        await AsyncStorage.removeItem("newBookingDraft");
      } catch (error) {
        console.log("Booking draft reset error:", error);
      }
    }

    if (active !== tab.key || tab.key === "book") {
      router.replace(tab.route);
    }
  };

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        const Icon = tab.icon;

        return (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.78}
            style={styles.item}
            onPress={() => void openTab(tab)}
          >
            <Icon color={isActive ? "#16863A" : "#6B7280"} size={23} strokeWidth={2.2} />
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 68,
    backgroundColor: "#FFFFFF",
    borderTopColor: "#E5E7EB",
    borderTopWidth: 1,
    flexDirection: "row",
    paddingBottom: 10,
    paddingTop: 8,
  },
  item: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  label: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  labelActive: {
    color: "#16863A",
  },
});
