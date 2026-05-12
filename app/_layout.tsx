import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack>
      {/* We hide the default header because we built our own UI */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
