import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Stack, router, useFocusEffect } from "expo-router";
import {
  BriefcaseBusiness,
  ChevronLeft,
  LogOut,
  Mail,
  MapPin,
  PhoneCall,
  ShieldCheck,
  UserRound,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import WorkerBottomNav from "../../components/worker-bottom-nav";
import { API_URL } from "../../constants/api";

export default function WorkerProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const session = await AsyncStorage.getItem("workerSession");
      if (!session) {
        router.replace("/");
        return;
      }

      const workerId = Number(JSON.parse(session).id);
      const response = await axios.get(`${API_URL}/worker/profile/${workerId}`);
      if (response.data.success) setProfile(response.data.worker);
    } catch (error) {
      console.log("Worker profile fetch error:", error);
      Alert.alert("Unable to load", "Profile load nahi ho paya.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  const contactSupport = async () => {
    const phone = String(profile?.mitra?.phone || "").trim();
    const email = String(profile?.mitra?.email || "").trim();

    try {
      if (phone) {
        await Linking.openURL(`tel:${phone}`);
        return;
      }

      if (email) {
        await Linking.openURL(`mailto:${email}`);
        return;
      }
    } catch (error) {
      console.log("Support contact error:", error);
    }

    Alert.alert("Contact Us", "Support contact abhi available nahi hai.");
  };

  const logout = () => {
    Alert.alert("Logout", "Worker account se logout karein?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.clear();
          router.replace("/");
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#087C49" />
        </View>
        <WorkerBottomNav active="profile" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/worker/dashboard")}
        >
          <ChevronLeft color="#111827" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.name?.charAt(0)?.toUpperCase() || "W"}
            </Text>
          </View>
          <Text style={styles.name}>{profile?.name || "Worker"}</Text>
          <Text style={styles.workerId}>Worker ID #{profile?.id || "-"}</Text>
          <View style={styles.activeBadge}>
            <ShieldCheck color="#087C49" size={15} />
            <Text style={styles.activeBadgeText}>
              {profile?.isActive ? "Active profile" : "Inactive profile"}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <ProfileRow icon={<PhoneCall color="#087C49" size={20} />} label="Phone" value={profile?.phone} />
          <ProfileRow icon={<Mail color="#087C49" size={20} />} label="Email" value={profile?.email || "Not added"} />
          <ProfileRow icon={<UserRound color="#087C49" size={20} />} label="Qualification" value={profile?.qualification || "Not added"} />
          <ProfileRow icon={<MapPin color="#087C49" size={20} />} label="Address" value={profile?.address || profile?.pincode || "Not added"} last />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Skills</Text>
          <View style={styles.chipsWrap}>
            {(profile?.skills || []).length ? (
              profile.skills.map((skill: any) => (
                <View key={skill.id} style={styles.chip}>
                  <BriefcaseBusiness color="#087C49" size={14} />
                  <Text style={styles.chipText}>{skill.name}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No skills added.</Text>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Assigned Nakas</Text>
          {(profile?.nakas || []).length ? (
            profile.nakas.map((naka: any) => (
              <Text key={naka.id} style={styles.nakaText}>
                • {naka.name}{naka.pincode ? ` · ${naka.pincode}` : ""}
              </Text>
            ))
          ) : (
            <Text style={styles.emptyText}>No Naka assigned.</Text>
          )}
        </View>

        <TouchableOpacity style={styles.contactButton} onPress={contactSupport}>
          <PhoneCall color="#FFFFFF" size={20} />
          <Text style={styles.contactButtonText}>Contact Us</Text>
        </TouchableOpacity>
        {profile?.mitra?.name ? (
          <Text style={styles.supportHint}>
            Your support Mitra: {profile.mitra.name}
          </Text>
        ) : null}

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <LogOut color="#DC2626" size={20} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      <WorkerBottomNav active="profile" />
    </SafeAreaView>
  );
}

function ProfileRow({ icon, label, value, last = false }: any) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value || "-"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomColor: "#E5E7EB",
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  backButton: { marginRight: 10, padding: 4 },
  headerTitle: { color: "#111827", fontSize: 22, fontWeight: "900" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 35 },
  heroCard: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 24, padding: 24, marginBottom: 16 },
  avatar: { alignItems: "center", backgroundColor: "#087C49", borderRadius: 38, height: 76, justifyContent: "center", width: 76 },
  avatarText: { color: "#FFFFFF", fontSize: 32, fontWeight: "900" },
  name: { color: "#111827", fontSize: 24, fontWeight: "900", marginTop: 14 },
  workerId: { color: "#6B7280", fontSize: 13, fontWeight: "600", marginTop: 4 },
  activeBadge: { alignItems: "center", backgroundColor: "#ECFDF5", borderRadius: 18, flexDirection: "row", marginTop: 12, paddingHorizontal: 12, paddingVertical: 7 },
  activeBadgeText: { color: "#087C49", fontSize: 12, fontWeight: "800", marginLeft: 5 },
  card: { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB", borderRadius: 20, borderWidth: 1, marginBottom: 16, padding: 18 },
  cardTitle: { color: "#111827", fontSize: 17, fontWeight: "900", marginBottom: 12 },
  row: { alignItems: "center", flexDirection: "row", paddingVertical: 12 },
  rowBorder: { borderBottomColor: "#F3F4F6", borderBottomWidth: 1 },
  rowIcon: { alignItems: "center", backgroundColor: "#ECFDF5", borderRadius: 12, height: 40, justifyContent: "center", width: 40 },
  rowCopy: { flex: 1, marginLeft: 12 },
  rowLabel: { color: "#9CA3AF", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  rowValue: { color: "#374151", fontSize: 14, fontWeight: "700", marginTop: 3 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { alignItems: "center", backgroundColor: "#ECFDF5", borderRadius: 18, flexDirection: "row", paddingHorizontal: 11, paddingVertical: 8 },
  chipText: { color: "#087C49", fontSize: 12, fontWeight: "800", marginLeft: 5 },
  nakaText: { color: "#4B5563", fontSize: 14, fontWeight: "600", marginBottom: 8 },
  emptyText: { color: "#9CA3AF", fontSize: 13 },
  contactButton: { alignItems: "center", backgroundColor: "#087C49", borderRadius: 16, flexDirection: "row", justifyContent: "center", paddingVertical: 16 },
  contactButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900", marginLeft: 8 },
  supportHint: { color: "#6B7280", fontSize: 12, marginTop: 8, textAlign: "center" },
  logoutButton: { alignItems: "center", backgroundColor: "#FEF2F2", borderColor: "#FECACA", borderRadius: 16, borderWidth: 1, flexDirection: "row", justifyContent: "center", marginTop: 16, paddingVertical: 16 },
  logoutText: { color: "#DC2626", fontSize: 16, fontWeight: "900", marginLeft: 8 },
});
