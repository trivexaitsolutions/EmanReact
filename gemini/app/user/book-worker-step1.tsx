import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Stack, router } from "expo-router";
import { BriefcaseBusiness, Grid2X2, Minus, Plus, Search, Star, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { API_URL } from "../../constants/api";
import BookingStepHeader from "../../components/ui/booking-step-header";

const SERVER_URL = API_URL.replace(/\/api\/?$/, "");

const getSkillImageUri = (imageUrl?: string | null) => {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${SERVER_URL}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
};

export default function BookWorkerStep1() {
  const [skills, setSkills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedSkill, setSelectedSkill] = useState<number | null>(null);
  const [selectedSkillName, setSelectedSkillName] = useState("");
  const [minRating, setMinRating] = useState(3);
  const [workerCount, setWorkerCount] = useState(1);
  const [skillModalVisible, setSkillModalVisible] = useState(false);
  const [skillSearch, setSkillSearch] = useState("");
  const [modalSkillId, setModalSkillId] = useState<number | null>(null);

  useEffect(() => {
    loadSkills();
    loadSavedDraft();
  }, []);

  const loadSkills = async () => {
    try {
      const response = await axios.get(`${API_URL}/user/booking-options`);

      if (response.data.success) {
        setSkills(response.data.skills || []);
      }
    } catch (error) {
      console.log("Skill load error:", error);

      Alert.alert("Error", "Skills load nahi ho paye. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedDraft = async () => {
    try {
      const savedDraft = await AsyncStorage.getItem("newBookingDraft");

      if (!savedDraft) {
        return;
      }

      const draft = JSON.parse(savedDraft);

      if (draft.skillId) {
        setSelectedSkill(Number(draft.skillId));
      }

      if (draft.skillName) {
        setSelectedSkillName(draft.skillName);
      }

      if (draft.minRating !== undefined) {
        setMinRating(Number(draft.minRating));
      }

      if (draft.workerCount) {
        setWorkerCount(Number(draft.workerCount));
      }
    } catch (error) {
      console.log("Draft load error:", error);
    }
  };

  const handleSkillSelect = (skill: any) => {
    setSelectedSkill(skill.id);
    setSelectedSkillName(skill.name);
  };

  const openSkillModal = () => {
    setModalSkillId(selectedSkill);
    setSkillSearch("");
    setSkillModalVisible(true);
  };

  const confirmModalSkill = () => {
    const skill = skills.find(
      (item: any) => Number(item.id) === Number(modalSkillId),
    );

    if (!skill) {
      Alert.alert("Select Skill", "Please select a skill.");
      return;
    }

    handleSkillSelect(skill);
    setSkillModalVisible(false);
    setSkillSearch("");
  };

  const filteredSkills = skills.filter((skill: any) =>
    String(skill.name || "")
      .toLowerCase()
      .includes(skillSearch.trim().toLowerCase()),
  );

  const handleRatingSelect = (star: number) => {
    if (minRating === star) {
      setMinRating(0);
      return;
    }

    setMinRating(star);
  };

  const handleNext = async () => {
    if (!selectedSkill) {
      Alert.alert("Select Skill", "Please select the type of worker you need.");

      return;
    }

    try {
      const oldDraft = await AsyncStorage.getItem("newBookingDraft");

      const existingDraft = oldDraft ? JSON.parse(oldDraft) : {};

      const updatedDraft = {
        ...existingDraft,
        skillId: selectedSkill,
        skillName: selectedSkillName,
        minRating,
        workerCount,
      };

      await AsyncStorage.setItem(
        "newBookingDraft",
        JSON.stringify(updatedDraft),
      );

      // Step 2 banne ke baad yahan router.push lagayenge.
      router.push("/user/book-worker-step2");
    } catch (error) {
      console.log("Draft save error:", error);

      Alert.alert("Error", "Booking details save nahi ho payi.");
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <Stack.Screen options={{ headerShown: false }} />

        <ActivityIndicator size="large" color="#16863A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <BookingStepHeader step={1} />

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Select Skill</Text>

        <View style={styles.skillGrid}>
          {skills.slice(0, 3).map((skill: any) => {
            const isSelected = selectedSkill === skill.id;
            const imageUri = getSkillImageUri(skill.imageUrl);

            return (
              <TouchableOpacity
                key={skill.id}
                activeOpacity={0.8}
                style={[styles.skillCard, isSelected && styles.skillCardActive]}
                onPress={() => handleSkillSelect(skill)}
              >
                <View style={styles.skillImageWrap}>
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      resizeMode="cover"
                      style={styles.skillImage}
                    />
                  ) : (
                    <View style={styles.skillImagePlaceholder}>
                      <BriefcaseBusiness
                        size={22}
                        color={isSelected ? "#16863A" : "#6B7280"}
                      />
                    </View>
                  )}
                </View>

                <Text
                  numberOfLines={2}
                  style={[
                    styles.skillCardText,
                    isSelected && styles.skillCardTextActive,
                  ]}
                >
                  {skill.name}
                </Text>
              </TouchableOpacity>
            );
          })}

          {skills.length > 3 ? (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.skillCard,
                styles.viewAllCard,
                selectedSkill &&
                  !skills
                    .slice(0, 3)
                    .some((skill: any) => Number(skill.id) === selectedSkill) &&
                  styles.skillCardActive,
              ]}
              onPress={openSkillModal}
            >
              <View style={styles.viewAllIcon}>
                <Grid2X2 size={22} color="#16863A" />
              </View>
              <Text style={styles.viewAllText}>View All</Text>
              <Text numberOfLines={1} style={styles.viewAllCount}>
                {selectedSkill &&
                !skills
                  .slice(0, 3)
                  .some((skill: any) => Number(skill.id) === selectedSkill)
                  ? selectedSkillName
                  : `${skills.length} services`}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Minimum Worker Rating</Text>

        <View style={styles.ratingCard}>
          {[1, 2, 3, 4, 5].map((star) => {
            const isActive = star <= minRating;

            return (
              <TouchableOpacity
                key={star}
                style={styles.ratingItem}
                onPress={() => handleRatingSelect(star)}
              >
                <Star
                  size={29}
                  color={isActive ? "#16863A" : "#969696"}
                  fill={isActive ? "#16863A" : "transparent"}
                  strokeWidth={2}
                />

                <Text
                  style={[
                    styles.ratingNumber,
                    isActive && star === minRating && styles.ratingNumberActive,
                  ]}
                >
                  {star}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.ratingHelper}>
          {minRating === 0
            ? "Any worker rating is acceptable."
            : `${minRating} star & above workers will be considered.`}
        </Text>

        <Text style={styles.sectionTitle}>Number of Workers</Text>

        <View style={styles.workerCountCard}>
          <View>
            <Text style={styles.workerCountTitle}>Workers Required</Text>

            <Text style={styles.workerCountHelper}>
              Select up to 10 workers
            </Text>
          </View>

          <View style={styles.counter}>
            <TouchableOpacity
              style={styles.counterButton}
              onPress={() => {
                if (workerCount > 1) {
                  setWorkerCount((current) => current - 1);
                }
              }}
            >
              <Minus size={19} color="#111111" />
            </TouchableOpacity>

            <Text style={styles.counterValue}>{workerCount}</Text>

            <TouchableOpacity
              style={styles.counterButton}
              onPress={() => {
                if (workerCount < 10) {
                  setWorkerCount((current) => current + 1);
                }
              }}
            >
              <Plus size={19} color="#111111" />
            </TouchableOpacity>
          </View>
        </View>

      </View>

      <Modal
        visible={skillModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSkillModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.skillModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Skill</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setSkillModalVisible(false)}
              >
                <X size={24} color="#202124" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
              <Search size={20} color="#747474" />
              <TextInput
                value={skillSearch}
                onChangeText={setSkillSearch}
                placeholder="Search skills"
                placeholderTextColor="#9A9A9A"
                style={styles.searchInput}
                autoCorrect={false}
              />
            </View>

            <ScrollView
              style={styles.modalSkillScroll}
              contentContainerStyle={styles.modalSkillGrid}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {filteredSkills.map((skill: any) => {
                const isSelected = Number(modalSkillId) === Number(skill.id);
                const imageUri = getSkillImageUri(skill.imageUrl);

                return (
                  <TouchableOpacity
                    key={skill.id}
                    activeOpacity={0.8}
                    style={[
                      styles.modalSkillCard,
                      isSelected && styles.modalSkillCardActive,
                    ]}
                    onPress={() => setModalSkillId(Number(skill.id))}
                  >
                    <View style={styles.modalSkillImageWrap}>
                      {imageUri ? (
                        <Image
                          source={{ uri: imageUri }}
                          resizeMode="cover"
                          style={styles.modalSkillImage}
                        />
                      ) : (
                        <View style={styles.modalSkillPlaceholder}>
                          <BriefcaseBusiness
                            size={25}
                            color={isSelected ? "#16863A" : "#6B7280"}
                          />
                        </View>
                      )}
                    </View>

                    <Text
                      numberOfLines={2}
                      style={[
                        styles.modalSkillName,
                        isSelected && styles.modalSkillNameActive,
                      ]}
                    >
                      {skill.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {filteredSkills.length === 0 ? (
                <Text style={styles.noSkillsText}>No skills found</Text>
              ) : null}
            </ScrollView>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.modalSelectButton,
                !modalSkillId && styles.modalSelectButtonDisabled,
              ]}
              onPress={confirmModalSkill}
              disabled={!modalSkillId}
            >
              <Text style={styles.modalSelectButtonText}>Select</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.nextButton}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  loaderContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    height: 105,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backButton: {
    width: 55,
    height: 55,
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#171717",
  },

  stepText: {
    minWidth: 90,
    textAlign: "right",
    fontSize: 17,
    fontWeight: "800",
    color: "#16863A",
  },

  progressContainer: {
    height: 75,
    paddingHorizontal: 26,
    flexDirection: "row",
    alignItems: "center",
  },

  progressLineActive: {
    flex: 1,
    height: 4,
    borderRadius: 10,
    backgroundColor: "#16863A",
  },

  progressLineInactive: {
    flex: 1,
    height: 4,
    backgroundColor: "#E4E4E4",
  },

  progressLineInactiveLarge: {
    flex: 2,
    height: 4,
    backgroundColor: "#E4E4E4",
  },

  progressLineEnd: {
    flex: 0.5,
    height: 4,
    borderRadius: 10,
    backgroundColor: "#E4E4E4",
  },

  progressCircleActive: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#16863A",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 4,
  },

  progressCircleInactive: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#E7E7E7",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 4,
  },

  progressCircleActiveText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  progressCircleInactiveText: {
    fontSize: 20,
    fontWeight: "500",
    color: "#8E8E8E",
  },

  divider: {
    height: 1,
    backgroundColor: "#E7E7E7",
  },

  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#202124",
    marginBottom: 9,
  },

  skillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  skillCard: {
    width: "48.5%",
    minHeight: 103,
    borderWidth: 1,
    borderColor: "#DEDEDE",
    borderRadius: 14,
    alignItems: "center",
    padding: 7,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },

  skillCardActive: {
    borderColor: "#16863A",
    borderWidth: 2,
    backgroundColor: "#F1FAF4",
  },

  skillImageWrap: {
    width: "100%",
    height: 57,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    marginBottom: 6,
  },

  skillImage: {
    width: "100%",
    height: "100%",
  },

  skillImagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },

  skillCardText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "800",
    color: "#171717",
    textAlign: "center",
  },

  skillCardTextActive: {
    color: "#16863A",
  },

  viewAllCard: {
    justifyContent: "center",
    backgroundColor: "#F1FAF4",
    borderColor: "#B7DFC5",
  },

  viewAllIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    marginBottom: 6,
  },

  viewAllText: {
    color: "#16863A",
    fontSize: 14,
    fontWeight: "900",
  },

  viewAllCount: {
    color: "#6B7280",
    fontSize: 9,
    fontWeight: "600",
    marginTop: 2,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.38)",
  },

  skillModal: {
    height: "82%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#171717",
  },

  modalClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },

  searchBox: {
    height: 50,
    borderWidth: 1,
    borderColor: "#DEDEDE",
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#171717",
  },

  modalSkillScroll: {
    flex: 1,
  },

  modalSkillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingBottom: 12,
  },

  modalSkillCard: {
    width: "48%",
    minHeight: 128,
    borderWidth: 1,
    borderColor: "#DEDEDE",
    borderRadius: 16,
    padding: 8,
    marginBottom: 12,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },

  modalSkillCardActive: {
    borderColor: "#16863A",
    borderWidth: 2,
    backgroundColor: "#F1FAF4",
  },

  modalSkillImageWrap: {
    width: "100%",
    height: 76,
    borderRadius: 11,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    marginBottom: 7,
  },

  modalSkillImage: {
    width: "100%",
    height: "100%",
  },

  modalSkillPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  modalSkillName: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
    color: "#171717",
    textAlign: "center",
  },

  modalSkillNameActive: {
    color: "#16863A",
  },

  noSkillsText: {
    width: "100%",
    textAlign: "center",
    color: "#777777",
    fontSize: 15,
    paddingVertical: 28,
  },

  modalSelectButton: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#16863A",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },

  modalSelectButtonDisabled: {
    opacity: 0.45,
  },

  modalSelectButtonText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  ratingCard: {
    height: 82,
    borderWidth: 1,
    borderColor: "#DEDEDE",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },

  ratingItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },

  ratingNumber: {
    fontSize: 12,
    fontWeight: "500",
    color: "#5B5B5B",
  },

  ratingNumberActive: {
    color: "#16863A",
    fontWeight: "800",
  },

  ratingHelper: {
    fontSize: 11,
    color: "#747474",
    marginTop: 6,
    marginBottom: 11,
  },

  workerCountCard: {
    borderWidth: 1,
    borderColor: "#DEDEDE",
    borderRadius: 14,
    minHeight: 64,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  workerCountTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#171717",
  },

  workerCountHelper: {
    fontSize: 10,
    color: "#777777",
    marginTop: 2,
  },

  counter: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DFDFDF",
    borderRadius: 13,
  },

  counterButton: {
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
  },

  counterValue: {
    minWidth: 32,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
    color: "#111111",
  },

  bottomSpace: {
    height: 0,
  },

  footer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: "#E7E7E7",
  },

  nextButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#16863A",
    justifyContent: "center",
    alignItems: "center",
  },

  nextButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
