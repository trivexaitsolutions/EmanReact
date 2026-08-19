import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type BookingStepHeaderProps = {
  step: 1 | 2 | 3;
  disabled?: boolean;
};

export default function BookingStepHeader({
  step,
  disabled = false,
}: BookingStepHeaderProps) {
  const circleStyle = (circle: number) =>
    circle === step ? styles.circleActive : styles.circleInactive;

  const circleTextStyle = (circle: number) =>
    circle === step ? styles.circleTextActive : styles.circleTextInactive;

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          disabled={disabled}
          onPress={() => router.back()}
        >
          <ArrowLeft size={23} color="#16863A" strokeWidth={2.4} />
        </TouchableOpacity>

        <Text style={styles.title}>Book a Worker</Text>
        <Text style={styles.stepText}>Step {step} of 3</Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.outerLine} />

        <View style={circleStyle(1)}>
          <Text style={circleTextStyle(1)}>1</Text>
        </View>

        <View
          style={[
            styles.innerLine,
            step >= 2 ? styles.innerLineActive : styles.innerLineInactive,
          ]}
        />

        <View style={circleStyle(2)}>
          <Text style={circleTextStyle(2)}>2</Text>
        </View>

        <View
          style={[
            styles.innerLine,
            step >= 3 ? styles.innerLineActive : styles.innerLineInactive,
          ]}
        />

        <View style={circleStyle(3)}>
          <Text style={circleTextStyle(3)}>3</Text>
        </View>

        <View style={styles.outerLine} />
      </View>

      <View style={styles.divider} />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 54,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#171717",
  },
  stepText: {
    minWidth: 72,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "800",
    color: "#16863A",
  },
  progressContainer: {
    height: 44,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  outerLine: {
    flex: 0.65,
    height: 3,
    borderRadius: 10,
    backgroundColor: "#E4E4E4",
  },
  innerLine: {
    flex: 2,
    height: 3,
  },
  innerLineActive: {
    backgroundColor: "#16863A",
  },
  innerLineInactive: {
    backgroundColor: "#E4E4E4",
  },
  circleActive: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16863A",
  },
  circleInactive: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E7E7E7",
  },
  circleTextActive: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  circleTextInactive: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E8E",
  },
  divider: {
    height: 1,
    backgroundColor: "#E7E7E7",
  },
});
