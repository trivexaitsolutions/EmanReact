import AsyncStorage from "@react-native-async-storage/async-storage";
import { CommonActions } from "@react-navigation/native";
import { Stack, useNavigation } from "expo-router";
import {
    ChevronRight,
    HelpCircle,
    LogOut,
    MapPin,
    Phone,
    Settings,
    Wallet
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function UserProfile() {
  const navigation = useNavigation();
  const [customer, setCustomer] = useState<any>(null);

  useEffect(() => {
    loadCustomer();
  }, []);

  const loadCustomer = async () => {
    try {
      const session = await AsyncStorage.getItem("customerSession");

      if (session) {
        setCustomer(JSON.parse(session));
      }
    } catch (error) {
      console.log("Profile session error:", error);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            /*
             * Logout ke baad app ko fresh role-selection state me laana hai.
             * Dono role sessions clear kar rahe hain, warna root screen kisi
             * purane worker session ko dekhkar automatic redirect kar sakti hai.
             */
            await AsyncStorage.multiRemove([
              "customerSession",
              "workerSession",
              "activeRole",
              "newBookingDraft",
            ]);

            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [
                  {
                    name: "index",
                  },
                ],
              }),
            );
          } catch (error) {
            console.log("Customer logout error:", error);

            Alert.alert(
              "Logout Failed",
              "Logout karne mein problem hui. Dobara try karein.",
            );
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Profile</Text>
          <Text style={styles.headerSub}>
            Manage your account and addresses
          </Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {customer?.name ? customer.name.charAt(0).toUpperCase() : "U"}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{customer?.name || "User"}</Text>

            <View style={styles.phoneRow}>
              <Phone color="#10B981" size={14} />
              <Text style={styles.phone}>{customer?.phone || "-"}</Text>
            </View>

            {customer?.email ? (
              <Text style={styles.email}>{customer.email}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.menuBox}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/user/manage-addresses")}
          >
            <View style={styles.menuLeft}>
              <View style={styles.iconBox}>
                <MapPin color="#10B981" size={22} />
              </View>

              <View>
                <Text style={styles.menuTitle}>Saved Addresses</Text>
                <Text style={styles.menuSub}>
                  Add home, office, site or other addresses
                </Text>
              </View>
            </View>

            <ChevronRight color="#9CA3AF" size={22} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={styles.iconBox}>
                <Wallet color="#10B981" size={22} />
              </View>

              <View>
                <Text style={styles.menuTitle}>Wallet</Text>
                <Text style={styles.menuSub}>Payments and refunds</Text>
              </View>
            </View>

            <ChevronRight color="#9CA3AF" size={22} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={styles.iconBox}>
                <HelpCircle color="#10B981" size={22} />
              </View>

              <View>
                <Text style={styles.menuTitle}>Support</Text>
                <Text style={styles.menuSub}>Help and contact</Text>
              </View>
            </View>

            <ChevronRight color="#9CA3AF" size={22} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={styles.iconBox}>
                <Settings color="#10B981" size={22} />
              </View>

              <View>
                <Text style={styles.menuTitle}>Settings</Text>
                <Text style={styles.menuSub}>
                  Preferences and account settings
                </Text>
              </View>
            </View>

            <ChevronRight color="#9CA3AF" size={22} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut color="#EF4444" size={20} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    backgroundColor: "#059669",
    paddingTop: 55,
    paddingHorizontal: 22,
    paddingBottom: 35,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
  },
  headerSub: {
    color: "#D1FAE5",
    fontSize: 14,
    marginTop: 5,
    fontWeight: "600",
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 18,
    marginTop: -22,
    borderRadius: 24,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  avatarText: {
    color: "#059669",
    fontSize: 28,
    fontWeight: "900",
  },
  name: {
    fontSize: 20,
    color: "#111827",
    fontWeight: "900",
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  phone: {
    fontSize: 14,
    color: "#047857",
    fontWeight: "800",
  },
  email: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    fontWeight: "600",
  },
  menuBox: {
    marginTop: 22,
    marginHorizontal: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  menuItem: {
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },
  menuSub: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 3,
  },
  logoutBtn: {
    marginHorizontal: 18,
    marginTop: 20,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  logoutText: {
    color: "#EF4444",
    fontWeight: "900",
    fontSize: 15,
  },
});
