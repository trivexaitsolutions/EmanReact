import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function BookingStepHeader({ step }: { step: 1 | 2 | 3 }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#111827" strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.title}>Book Worker</Text>
        <Text style={styles.stepText}>{step}/3</Text>
      </View>

      <View style={styles.progressRow}>
        {[1, 2, 3].map((item, index) => {
          const done = item < step;
          const active = item === step;
          return (
            <React.Fragment key={item}>
              {index > 0 ? (
                <View style={[styles.line, item <= step && styles.lineActive]} />
              ) : null}
              <View style={[styles.circle, done && styles.circleDone, active && styles.circleActive]}>
                <Text style={[styles.circleText, (done || active) && styles.circleTextActive]}>{item}</Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#FFFFFF",
    borderBottomColor: "#E5E7EB",
    borderBottomWidth: 1,
  },
  header: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  title: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
  },
  stepText: {
    width: 38,
    textAlign: "right",
    color: "#16863A",
    fontSize: 13,
    fontWeight: "900",
  },
  progressRow: {
    height: 38,
    paddingHorizontal: 30,
    flexDirection: "row",
    alignItems: "center",
  },
  line: {
    flex: 1,
    height: 3,
    backgroundColor: "#E5E7EB",
  },
  lineActive: {
    backgroundColor: "#16863A",
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  circleDone: {
    backgroundColor: "#DDF4E5",
  },
  circleActive: {
    backgroundColor: "#16863A",
  },
  circleText: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "800",
  },
  circleTextActive: {
    color: "#FFFFFF",
  },
});
