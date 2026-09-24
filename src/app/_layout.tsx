import { SidebarProvider } from '@/components/sidebar/sidebar-context';
import { SidebarDrawer } from '@/components/sidebar/sidebar-drawer';
import { AuthProvider } from '@/lib/auth';
import { asyncStoragePersister, queryClient, shouldDehydrateQuery } from '@/lib/query-client';
import { dark } from '@/theme/tokens';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'SF-Pro-Rounded-Regular': require('../../assets/fonts/SF-Pro-Rounded-Regular.otf'),
    'SF-Pro-Rounded-Medium': require('../../assets/fonts/SF-Pro-Rounded-Medium.otf'),
    'SF-Pro-Rounded-Semibold': require('../../assets/fonts/SF-Pro-Rounded-Semibold.otf'),
    'SF-Pro-Rounded-Bold': require('../../assets/fonts/SF-Pro-Rounded-Bold.otf'),
    'SF-Pro-Rounded-Heavy': require('../../assets/fonts/SF-Pro-Rounded-Heavy.otf'),
    'SF-Pro-Rounded-Black': require('../../assets/fonts/SF-Pro-Rounded-Black.otf'),
    'SF-Mono-Semibold': require('../../assets/fonts/SF-Mono-Semibold.otf'),
    'SF-Mono-Bold': require('../../assets/fonts/SF-Mono-Bold.otf'),
    'SFProRounded-Regular': require('../../assets/fonts/SF-Pro-Rounded-Regular.otf'),
    'SFProRounded-Medium': require('../../assets/fonts/SF-Pro-Rounded-Medium.otf'),
    'SFProRounded-Semibold': require('../../assets/fonts/SF-Pro-Rounded-Semibold.otf'),
    'SFProRounded-Bold': require('../../assets/fonts/SF-Pro-Rounded-Bold.otf'),
    'SFProRounded-Heavy': require('../../assets/fonts/SF-Pro-Rounded-Heavy.otf'),
    'SFProRounded-Black': require('../../assets/fonts/SF-Pro-Rounded-Black.otf'),
    'SFMono-Semibold': require('../../assets/fonts/SF-Mono-Semibold.otf'),
    'SFMono-Bold': require('../../assets/fonts/SF-Mono-Bold.otf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: asyncStoragePersister,
          dehydrateOptions: { shouldDehydrateQuery },
        }}
      >
        <AuthProvider>
          <SidebarProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: dark.background },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="index" options={{ animation: 'fade' }} />
              <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
              <Stack.Screen
                name="vault/[risk]"
                options={{
                  animation: 'slide_from_bottom',
                  animationDuration: 300,
                  gestureEnabled: true,
                }}
              />
              <Stack.Screen
                name="wallet"
                options={{
                  presentation: 'modal',
                  animation: 'slide_from_bottom',
                }}
              />
            </Stack>
            <SidebarDrawer />
          </SidebarProvider>
        </AuthProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
