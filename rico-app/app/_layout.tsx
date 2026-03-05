import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { View } from 'react-native';
import '../global.css';

import { AuthProvider, useAuth } from '@/components/AuthProvider';
import { DataProvider } from '@/components/DataProvider';

import { PremiumPreloader } from '@/components/ui/PremiumPreloader';
import { NoiseOverlay } from '@/components/ui/NoiseOverlay';
import { useState } from 'react';

// ─── Inner layout: decides the initial screen ─────────────────────────────────
function RootLayoutNav() {
  const { session, loading: authLoading } = useAuth();
  const [appLoading, setAppLoading] = useState(true);

  // While session is loading show nothing (could add a splash here)
  if (authLoading) return null;

  return (
    <ThemeProvider value={DarkTheme}>
      <View style={{ flex: 1 }}>
        <Stack>
          {/* Heart-rate landing (root index.tsx) */}
          <Stack.Screen name="index"   options={{ headerShown: false, animation: 'none' }} />
          {/* Main app — tabs */}
          <Stack.Screen name="(tabs)"  options={{ headerShown: false }} />
          {/* Auth screens */}
          <Stack.Screen name="(auth)"  options={{ headerShown: false }} />
          {/* Modals */}
          <Stack.Screen name="modal"   options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen 
            name="registration/[id]" 
            options={{ 
              presentation: 'modal', 
              headerShown: false,
              animation: 'slide_from_bottom'
            }} 
          />
          <Stack.Screen 
            name="admin/auditions" 
            options={{ 
              headerShown: false,
              animation: 'slide_from_right'
            }} 
          />
        </Stack>
        
        {/* Global UI Overlays */}
        <NoiseOverlay />
        
        {appLoading && (
          <PremiumPreloader 
            loading={authLoading} 
            onComplete={() => setAppLoading(false)} 
          />
        )}
      </View>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

// ─── Root wrapper ─────────────────────────────────────────────────────────────
export default function RootLayout() {
  return (
    <AuthProvider>
      <DataProvider>
        <RootLayoutNav />
      </DataProvider>
    </AuthProvider>
  );
}
