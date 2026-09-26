import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function LoginScreen() {
  const [role, setRole] = useState("employer"); // 'employer' or 'worker'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    console.log(`Logging in as ${role} with ${email}`);
    // We will connect this to the Node.js backend later!
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inner}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.logoText}>E-man</Text>
          <Text style={styles.subtitle}>Connecting Labor to Opportunity</Text>
        </View>

        {/* Role Selection Cards */}
        <Text style={styles.sectionLabel}>Select your role to continue</Text>
        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[
              styles.roleCard,
              role === "worker" && styles.roleCardActive,
            ]}
            onPress={() => setRole("worker")}
          >
            <Text style={styles.roleIcon}>🛠️</Text>
            <Text
              style={[
                styles.roleText,
                role === "worker" && styles.roleTextActive,
              ]}
            >
              I'm a Worker
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleCard,
              role === "employer" && styles.roleCardActive,
            ]}
            onPress={() => setRole("employer")}
          >
            <Text style={styles.roleIcon}>🏢</Text>
            <Text
              style={[
                styles.roleText,
                role === "employer" && styles.roleTextActive,
              ]}
            >
              I'm an Employer
            </Text>
          </TouchableOpacity>
        </View>

        {/* Login Form */}
        <View style={styles.formContainer}>
          <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
          <TextInput
            style={styles.input}
            placeholder="name@example.com"
            placeholderTextColor="#78716c" // stone-500
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.inputLabel}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#78716c" // stone-500
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
            <Text style={styles.primaryButtonText}>Log In →</Text>
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// EXACT COLOR PALETTE:
// bg-stone-200: #e7e5e4 (Main App Bg)
// bg-stone-100: #f5f5f4 (Cards/Inputs)
// text-stone-900: #1c1917 (Primary Text)
// text-stone-500: #78716c (Secondary Text)
// bg-emerald-600: #059669 (Primary Action)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e7e5e4", // NO WHITE allowed - using soft stone
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoText: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#1c1917",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#78716c",
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1c1917",
    textAlign: "center",
    marginBottom: 16,
  },
  roleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  roleCard: {
    flex: 1,
    backgroundColor: "#f5f5f4", // Elevated stone-100
    paddingVertical: 24,
    borderRadius: 16,
    alignItems: "center",
    marginHorizontal: 6,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  roleCardActive: {
    borderColor: "#059669", // Emerald 600 border when active
    backgroundColor: "#ecfdf5", // Very light emerald tint
  },
  roleIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  roleText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#78716c",
  },
  roleTextActive: {
    color: "#059669",
  },
  formContainer: {
    marginTop: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#78716c",
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: "#f5f5f4",
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1c1917",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#d6d3d1", // stone-300
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: "#059669",
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#059669", // Emerald 600
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#f5f5f4",
    fontSize: 18,
    fontWeight: "bold",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  signupText: {
    color: "#78716c",
  },
  signupLink: {
    color: "#059669",
    fontWeight: "bold",
  },
});
