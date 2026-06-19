import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { brand } from "@/theme/brand";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: brand.white },
            headerTintColor: brand.forest,
            contentStyle: { backgroundColor: brand.cream },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="templates" options={{ title: "Templates" }} />
          <Stack.Screen name="reports" options={{ title: "ROI reports" }} />
          <Stack.Screen name="finance" options={{ title: "Finance" }} />
          <Stack.Screen name="onboarding" options={{ title: "Onboarding" }} />
          <Stack.Screen name="compliance" options={{ title: "Compliance" }} />
          <Stack.Screen name="profile" options={{ title: "Profile" }} />
          <Stack.Screen name="reviews" options={{ title: "Reviews" }} />
          <Stack.Screen name="auth/login" options={{ title: "Sign in", presentation: "modal" }} />
          <Stack.Screen name="auth/callback" options={{ title: "Signing in", presentation: "modal" }} />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
