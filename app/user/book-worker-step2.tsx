import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack } from "expo-router";
import { ArrowLeft, Check, Search, X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { API_URL } from "../../constants/api";

type NakaOption = {
  id: number;
  name: string;
  pincode?: string | null;
  landmark?: string | null;
  cityId?: number;
  city?: {
    id: number;
    name: string;
  } | null;
};

export default function BookWorkerStep2() {
  const { height } = useWindowDimensions();

  const isSmallScreen = height < 760;

  const [searchText, setSearchText] = useState("");
  const [nakaResults, setNakaResults] = useState<NakaOption[]>([]);
  const [selectedNakas, setSelectedNakas] = useState<NakaOption[]>([]);

  const [isSearching, setIsSearching] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    loadSavedDraft();

    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
    });

    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const search = searchText.trim();

    if (!search) {
      setNakaResults([]);
      setIsSearching(false);
      return;
    }

    const timeout = setTimeout(() => {
      searchNakas(search);
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchText]);

  const loadSavedDraft = async () => {
    try {
      const savedDraft = await AsyncStorage.getItem("newBookingDraft");

      if (!savedDraft) {
        return;
      }

      const draft = JSON.parse(savedDraft);

      if (
        Array.isArray(draft.selectedNakas) &&
        draft.selectedNakas.length > 0
      ) {
        setSelectedNakas(draft.selectedNakas.slice(0, 3));
      }
    } catch (error) {
      console.log("Step 2 draft load error:", error);
    }
  };

  const searchNakas = async (search: string) => {
    try {
      setIsSearching(true);

      const response = await axios.get(
        `${API_URL}/user/nakas/search?q=${encodeURIComponent(search)}`,
      );

      if (response.data.success) {
        setNakaResults(response.data.nakas || []);
      } else {
        setNakaResults([]);
      }
    } catch (error) {
      console.log("Naka search error:", error);

      setNakaResults([]);

      Alert.alert(
        "Search Error",
        "Nakas search nahi ho paye. Please try again.",
      );
    } finally {
      setIsSearching(false);
    }
  };

  const isNakaSelected = (id: number) => {
    return selectedNakas.some((naka) => Number(naka.id) === Number(id));
  };

  const toggleNakaSelection = (naka: NakaOption) => {
    const alreadySelected = isNakaSelected(naka.id);

    if (alreadySelected) {
      setSelectedNakas((current) =>
        current.filter((item) => Number(item.id) !== Number(naka.id)),
      );

      return;
    }

    if (selectedNakas.length >= 3) {
      Alert.alert("Maximum 3 Nakas", "You can select up to 3 nakas only.");

      return;
    }

    setSelectedNakas((current) => [...current, naka]);

    Keyboard.dismiss();
  };

  const clearSearch = () => {
    setSearchText("");
    setNakaResults([]);
  };

  const handleNext = async () => {
    if (selectedNakas.length === 0) {
      Alert.alert("Select Naka", "Please select at least one nearby naka.");

      return;
    }

    try {
      const oldDraft = await AsyncStorage.getItem("newBookingDraft");

      const existingDraft = oldDraft ? JSON.parse(oldDraft) : {};

      const updatedDraft = {
        ...existingDraft,

        selectedNakas,

        nakaIds: selectedNakas.map((naka) => Number(naka.id)),
      };

      await AsyncStorage.setItem(
        "newBookingDraft",
        JSON.stringify(updatedDraft),
      );

      router.push("/user/book-worker-step3");
    } catch (error) {
      console.log("Step 2 draft save error:", error);

      Alert.alert("Error", "Selected nakas save nahi ho paye.");
    }
  };

  const visibleResults = useMemo(() => {
    const maximumResults = keyboardVisible ? 2 : isSmallScreen ? 4 : 5;

    return nakaResults.slice(0, maximumResults);
  }, [nakaResults, keyboardVisible, isSmallScreen]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.screen}>
        {/* HEADER */}
        <View
          style={[
            styles.header,
            isSmallScreen && styles.headerSmall,
            keyboardVisible && styles.headerKeyboardOpen,
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={30} color="#16863A" strokeWidth={2.5} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Book a Worker</Text>

          <Text style={styles.stepText}>Step 2 of 3</Text>
        </View>

        {/* PROGRESS */}
        <View
          style={[
            styles.progressContainer,
            isSmallScreen && styles.progressContainerSmall,
            keyboardVisible && styles.progressKeyboardOpen,
          ]}
        >
          <View style={styles.progressLineActive} />

          <View style={styles.progressCircleDone}>
            <Text style={styles.progressCircleDoneText}>1</Text>
          </View>

          <View style={styles.progressLineActiveLarge} />

          <View style={styles.progressCircleActive}>
            <Text style={styles.progressCircleActiveText}>2</Text>
          </View>

          <View style={styles.progressLineInactiveLarge} />

          <View style={styles.progressCircleInactive}>
            <Text style={styles.progressCircleInactiveText}>3</Text>
          </View>

          <View style={styles.progressLineEnd} />
        </View>

        <View style={styles.divider} />

        {/* CONTENT */}
        <View
          style={[
            styles.content,
            isSmallScreen && styles.contentSmall,
            keyboardVisible && styles.contentKeyboardOpen,
          ]}
        >
          <Text
            style={[
              styles.pageTitle,
              isSmallScreen && styles.pageTitleSmall,
              keyboardVisible && styles.pageTitleKeyboardOpen,
            ]}
          >
            Find Nakas
          </Text>

          <Text
            style={[
              styles.sectionTitle,
              keyboardVisible && styles.sectionTitleKeyboardOpen,
            ]}
          >
            Search Nearby Nakas
          </Text>

          <View
            style={[
              styles.searchContainer,
              keyboardVisible && styles.searchContainerKeyboardOpen,
            ]}
          >
            <Search size={22} color="#777777" />

            <TextInput
              style={styles.searchInput}
              placeholder="Pincode, city or naka"
              placeholderTextColor="#9A9A9A"
              value={searchText}
              onChangeText={setSearchText}
              autoCapitalize="none"
              returnKeyType="search"
            />

            {isSearching ? (
              <ActivityIndicator size="small" color="#16863A" />
            ) : searchText.length > 0 ? (
              <TouchableOpacity onPress={clearSearch}>
                <X size={25} color="#16863A" />
              </TouchableOpacity>
            ) : null}
          </View>

          <View
            style={[
              styles.helperRow,
              keyboardVisible && styles.helperRowKeyboardOpen,
            ]}
          >
            <Text style={styles.helperText}>Select up to 3 nakas</Text>

            <Text style={styles.selectedMiniCount}>
              {selectedNakas.length}/3 selected
            </Text>
          </View>

          {/* RESULTS */}
          <View style={styles.resultsContainer}>
            {!searchText.trim() ? (
              <View style={styles.emptyContainer}>
                <Search size={34} color="#B8B8B8" />

                <Text style={styles.emptyTitle}>Search for nearby nakas</Text>

                <Text style={styles.emptyText}>
                  Enter a pincode, city or naka name.
                </Text>
              </View>
            ) : !isSearching && visibleResults.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No verified nakas found</Text>

                <Text style={styles.emptyText}>
                  Try another pincode, city or naka name.
                </Text>
              </View>
            ) : (
              visibleResults.map((naka) => {
                const selected = isNakaSelected(naka.id);

                return (
                  <TouchableOpacity
                    key={naka.id}
                    activeOpacity={0.8}
                    style={[
                      styles.nakaCard,
                      isSmallScreen && styles.nakaCardSmall,
                      keyboardVisible && styles.nakaCardKeyboardOpen,
                      selected && styles.nakaCardSelected,
                    ]}
                    onPress={() => toggleNakaSelection(naka)}
                  >
                    <View style={styles.nakaTextContainer}>
                      <Text
                        style={[
                          styles.nakaName,
                          keyboardVisible && styles.nakaNameKeyboardOpen,
                          selected && styles.nakaNameSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {naka.name}
                      </Text>

                      <Text style={styles.nakaSubText} numberOfLines={1}>
                        {[naka.city?.name, naka.pincode]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.selectionCircle,
                        keyboardVisible && styles.selectionCircleKeyboardOpen,
                        selected && styles.selectionCircleSelected,
                      ]}
                    >
                      {selected ? (
                        <Check size={18} color="#FFFFFF" strokeWidth={3} />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {!keyboardVisible && nakaResults.length > visibleResults.length ? (
            <Text style={styles.moreResultsText}>
              More results found. Type more to narrow your search.
            </Text>
          ) : null}

          {!keyboardVisible && (
            <View style={styles.selectedCountCard}>
              <Text style={styles.selectedCountText}>
                Selected:{" "}
                <Text style={styles.selectedCountValue}>
                  {selectedNakas.length} / 3
                </Text>
              </Text>
            </View>
          )}
        </View>

        {/* FOOTER */}
        {!keyboardVisible && (
          <View style={styles.footer}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.nextButton,
                selectedNakas.length === 0 && styles.nextButtonDisabled,
              ]}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  header: {
    height: 105,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerSmall: {
    height: 78,
  },

  headerKeyboardOpen: {
    height: 68,
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

  progressContainerSmall: {
    height: 55,
  },

  progressKeyboardOpen: {
    height: 48,
  },

  progressLineActive: {
    flex: 1,
    height: 4,
    borderRadius: 10,
    backgroundColor: "#16863A",
  },

  progressLineActiveLarge: {
    flex: 2,
    height: 4,
    backgroundColor: "#16863A",
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

  progressCircleDone: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#E7E7E7",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 4,
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

  progressCircleDoneText: {
    fontSize: 20,
    fontWeight: "500",
    color: "#8E8E8E",
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
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 12,
  },

  contentSmall: {
    paddingTop: 14,
    paddingBottom: 8,
  },

  contentKeyboardOpen: {
    paddingTop: 8,
    paddingBottom: 4,
  },

  pageTitle: {
    fontSize: 35,
    fontWeight: "900",
    color: "#003B1F",
    letterSpacing: -1,
    marginBottom: 28,
  },

  pageTitleSmall: {
    fontSize: 29,
    marginBottom: 14,
  },

  pageTitleKeyboardOpen: {
    fontSize: 27,
    marginBottom: 9,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#202124",
    marginBottom: 12,
  },

  sectionTitleKeyboardOpen: {
    fontSize: 17,
    marginBottom: 7,
  },

  searchContainer: {
    height: 62,
    borderWidth: 2,
    borderColor: "#16863A",
    borderRadius: 16,
    paddingHorizontal: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  searchContainerKeyboardOpen: {
    height: 52,
    borderRadius: 14,
  },

  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 18,
    color: "#171717",
    fontWeight: "500",
  },

  helperRow: {
    marginTop: 12,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  helperRowKeyboardOpen: {
    marginTop: 6,
    marginBottom: 6,
  },

  helperText: {
    fontSize: 16,
    color: "#747474",
  },

  selectedMiniCount: {
    fontSize: 13,
    fontWeight: "800",
    color: "#16863A",
  },

  resultsContainer: {
    flex: 1,
    justifyContent: "flex-start",
  },

  nakaCard: {
    minHeight: 67,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 16,
    paddingHorizontal: 17,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
  },

  nakaCardSmall: {
    minHeight: 55,
    marginBottom: 7,
  },

  nakaCardKeyboardOpen: {
    minHeight: 50,
    marginBottom: 6,
    borderRadius: 13,
    paddingHorizontal: 14,
  },

  nakaCardSelected: {
    borderWidth: 2,
    borderColor: "#16863A",
    backgroundColor: "#F1FAF4",
  },

  nakaTextContainer: {
    flex: 1,
    paddingRight: 12,
  },

  nakaName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#171717",
  },

  nakaNameKeyboardOpen: {
    fontSize: 15,
  },

  nakaNameSelected: {
    color: "#003B1F",
  },

  nakaSubText: {
    fontSize: 12,
    color: "#777777",
    marginTop: 3,
  },

  selectionCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: "#BDBDBD",
    justifyContent: "center",
    alignItems: "center",
  },

  selectionCircleKeyboardOpen: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },

  selectionCircleSelected: {
    backgroundColor: "#16863A",
    borderColor: "#16863A",
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#333333",
    marginTop: 10,
    textAlign: "center",
  },

  emptyText: {
    fontSize: 14,
    color: "#777777",
    marginTop: 5,
    textAlign: "center",
  },

  moreResultsText: {
    fontSize: 11,
    color: "#777777",
    textAlign: "center",
    marginBottom: 6,
  },

  selectedCountCard: {
    height: 52,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  selectedCountText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#171717",
  },

  selectedCountValue: {
    color: "#16863A",
    fontWeight: "900",
  },

  footer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 22,
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

  nextButtonDisabled: {
    opacity: 0.5,
  },

  nextButtonText: {
    fontSize: 21,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
