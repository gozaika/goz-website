import { createQueryClientConfig } from "@gozaika/mobile-core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/auth/AuthProvider";
import { PushRegistrar } from "@/push/PushRegistrar";
import { brand } from "@/theme/brand";

const queryClient = new QueryClient(createQueryClientConfig());

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PushRegistrar />
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
          <Stack.Screen name="checkout/[holdPk]" options={{ title: "Checkout" }} />
          <Stack.Screen name="swaad-club" options={{ title: "Swaad Club" }} />
          <Stack.Screen name="auth/login" options={{ title: "Sign in", presentation: "modal" }} />
          <Stack.Screen name="auth/callback" options={{ title: "Signing in", presentation: "modal" }} />
          <Stack.Screen name="onboarding/consent" options={{ title: "Your privacy", presentation: "modal" }} />
        </Stack>
        </SafeAreaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
