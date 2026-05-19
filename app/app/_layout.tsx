import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserStore } from '../src/stores/useUserStore';
import { useAuthStore } from '../src/stores/useAuthStore';
import { configureGoogleSignIn } from '../src/services/googleAuth';

const queryClient = new QueryClient();
configureGoogleSignIn();

export default function RootLayout() {
  const loadProfile = useUserStore((s) => s.loadProfile);
  const loadAuth = useAuthStore((s) => s.loadAuth);

  useEffect(() => {
    loadProfile();
    loadAuth();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0A0015' },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="home" />
          <Stack.Screen name="galactic-intro" />
          <Stack.Screen name="galactic" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="game" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="results" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="leaderboard" />
          <Stack.Screen name="daily" />
          <Stack.Screen name="store" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="profile" />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
