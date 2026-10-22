import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { GymProvider } from '../context/GymContext';
import { RestTimerOverlay } from '../components/RestTimerOverlay';
import GymTheme from '../constants/theme';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GymProvider>
      <View style={{ flex: 1, backgroundColor: GymTheme.colors.background }}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: GymTheme.colors.background,
            },
            headerTintColor: GymTheme.colors.textPrimary,
            contentStyle: {
              backgroundColor: GymTheme.colors.background,
            },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="active-workout"
            options={{
              presentation: 'fullScreenModal',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="new-routine"
            options={{
              presentation: 'modal',
              title: 'Nova Rotina',
              headerStyle: { backgroundColor: GymTheme.colors.card },
            }}
          />
        </Stack>
        <RestTimerOverlay />
      </View>
    </GymProvider>
  );
}
