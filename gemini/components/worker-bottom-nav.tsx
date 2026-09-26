import { router } from "expo-router";
import {
  BriefcaseBusiness,
  CircleUserRound,
  House,
  Wallet,
} from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type WorkerTab = "home" | "jobs" | "wallet" | "profile";

const tabs: Array<{
  key: WorkerTab;
  label: string;
  route:
    | "/worker/dashboard"
    | "/worker/history"
    | "/worker/wallet"
    | "/worker/profile";
  icon: typeof House;
}> = [
  { key: "home", label: "Home", route: "/worker/dashboard", icon: House },
  {
    key: "jobs",
    label: "Jobs",
    route: "/worker/history",
    icon: BriefcaseBusiness,
  },
  { key: "wallet", label: "Wallet", route: "/worker/wallet", icon: Wallet },
  {
    key: "profile",
    label: "Profile",
    route: "/worker/profile",
    icon: CircleUserRound,
  },
];

export default function WorkerBottomNav({ active }: { active: WorkerTab }) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        const Icon = tab.icon;

        return (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.78}
            style={styles.item}
            onPress={() => {
              if (!isActive) router.replace(tab.route);
            }}
          >
            <Icon color={isActive ? "#087C49" : "#6B7280"} size={25} />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
            {isActive ? <View style={styles.indicator} /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderTopColor: "#E5E7EB",
    borderTopWidth: 1,
    flexDirection: "row",
    paddingBottom: 18,
    paddingTop: 10,
  },
  item: {
    alignItems: "center",
    flex: 1,
    position: "relative",
  },
  label: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 5,
  },
  labelActive: {
    color: "#087C49",
  },
  indicator: {
    backgroundColor: "#087C49",
    borderRadius: 2,
    bottom: -9,
    height: 3,
    position: "absolute",
    width: 24,
  },
});
