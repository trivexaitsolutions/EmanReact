import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Stack, router } from "expo-router";
import { ArrowLeft, Minus, Plus, Star } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { API_URL } from "../../constants/api";

export default function BookWorkerStep1() {
  const [skills, setSkills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedSkill, setSelectedSkill] = useState<number | null>(null);
  const [selectedSkillName, setSelectedSkillName] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [workerCount, setWorkerCount] = useState(1);

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

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={31} color="#16863A" strokeWidth={2.5} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Book a Worker</Text>

        <Text style={styles.stepText}>Step 1 of 3</Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressLineActive} />

        <View style={styles.progressCircleActive}>
          <Text style={styles.progressCircleActiveText}>1</Text>
        </View>

        <View style={styles.progressLineInactive} />

        <View style={styles.progressCircleInactive}>
          <Text style={styles.progressCircleInactiveText}>2</Text>
        </View>

        <View style={styles.progressLineInactiveLarge} />

        <View style={styles.progressCircleInactive}>
          <Text style={styles.progressCircleInactiveText}>3</Text>
        </View>

        <View style={styles.progressLineEnd} />
      </View>

      <View style={styles.divider} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Select Skill & Rating</Text>

        <Text style={styles.sectionTitle}>Select Skill</Text>

        <View style={styles.skillGrid}>
          {skills.map((skill: any) => {
            const isSelected = selectedSkill === skill.id;

            return (
              <TouchableOpacity
                key={skill.id}
                activeOpacity={0.8}
                style={[styles.skillCard, isSelected && styles.skillCardActive]}
                onPress={() => handleSkillSelect(skill)}
              >
                <Text
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
                  size={39}
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

        <View style={styles.bottomSpace} />
      </ScrollView>

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
  },

  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 28,
  },

  pageTitle: {
    fontSize: 35,
    fontWeight: "900",
    color: "#003B1F",
    letterSpacing: -1,
    marginBottom: 32,
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#202124",
    marginBottom: 16,
  },

  skillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 34,
  },

  skillCard: {
    width: "48%",
    minHeight: 98,
    borderWidth: 1,
    borderColor: "#DEDEDE",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 14,
    backgroundColor: "#FFFFFF",
  },

  skillCardActive: {
    borderColor: "#16863A",
    borderWidth: 2,
    backgroundColor: "#F1FAF4",
  },

  skillCardText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#171717",
    textAlign: "center",
  },

  skillCardTextActive: {
    color: "#16863A",
  },

  ratingCard: {
    height: 130,
    borderWidth: 1,
    borderColor: "#DEDEDE",
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 10,
  },

  ratingItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  ratingNumber: {
    fontSize: 18,
    fontWeight: "500",
    color: "#5B5B5B",
  },

  ratingNumberActive: {
    color: "#16863A",
    fontWeight: "800",
  },

  ratingHelper: {
    fontSize: 16,
    color: "#747474",
    marginTop: 17,
    marginBottom: 33,
  },

  workerCountCard: {
    borderWidth: 1,
    borderColor: "#DEDEDE",
    borderRadius: 18,
    minHeight: 94,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  workerCountTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#171717",
  },

  workerCountHelper: {
    fontSize: 13,
    color: "#777777",
    marginTop: 5,
  },

  counter: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DFDFDF",
    borderRadius: 13,
  },

  counterButton: {
    width: 42,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },

  counterValue: {
    minWidth: 38,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "800",
    color: "#111111",
  },

  bottomSpace: {
    height: 35,
  },

  footer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 25,
    borderTopWidth: 1,
    borderTopColor: "#E7E7E7",
  },

  nextButton: {
    height: 63,
    borderRadius: 15,
    backgroundColor: "#16863A",
    justifyContent: "center",
    alignItems: "center",
  },

  nextButtonText: {
    fontSize: 21,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
