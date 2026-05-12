// app/worker/active-duty.tsx
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ActiveDutyScreen() {
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // This starts the timer the second the screen loads
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval); // Cleanup when they leave the screen
  }, []);

  // Format the seconds into HH:MM:SS
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const stopDuty = () => {
    Alert.alert("Stop Work", "Are you sure you want to end your duty?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes, End Duty",
        onPress: () => router.replace("/worker/dashboard"),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusBox}>
        <Text style={styles.liveText}>🔴 LIVE / AVAILABLE</Text>
      </View>

      <Text style={styles.titleText}>Time Elapsed</Text>

      {/* Massive Timer Display */}
      <Text style={styles.timerText}>{formatTime(secondsElapsed)}</Text>

      <Text style={styles.waitingText}>Waiting for job requests...</Text>

      {/* Stop Button */}
      <TouchableOpacity style={styles.stopButton} onPress={stopDuty}>
        <Text style={styles.stopButtonText}>STOP DUTY</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  statusBox: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  liveText: {
    color: "#EF4444",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 1,
  },
  titleText: {
    fontSize: 20,
    color: "#6B7280",
    fontWeight: "bold",
    marginBottom: 10,
  },
  timerText: {
    fontSize: 72, // Massive numbers!
    fontWeight: "900",
    color: "#111827",
    fontVariant: ["tabular-nums"], // Keeps the numbers from jumping around
    marginBottom: 20,
  },
  waitingText: {
    fontSize: 18,
    color: "#10B981",
    fontWeight: "bold",
    marginBottom: 60,
  },
  stopButton: {
    backgroundColor: "#EF4444",
    width: "100%",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    elevation: 4,
  },
  stopButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
});
