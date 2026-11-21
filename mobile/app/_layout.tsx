import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Stack, ThemeProvider, DefaultTheme } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import {
  useFonts,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces'
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans'
import * as SplashScreen from 'expo-splash-screen'
import { AuthProvider } from '../src/auth'
import { LockProvider } from '../src/LockGate'
import { SocietyProvider } from '../src/society'
import { colors } from '../src/theme'

SplashScreen.preventAutoHideAsync().catch(() => {})

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

const havenLight = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.mist,
    card: colors.chalk,
    text: colors.text,
    border: colors.border,
    primary: colors.brand,
  },
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  })

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {})
  }, [loaded])

  if (!loaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mist }}>
        <ActivityIndicator color={colors.brand} />
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <LockProvider>
              <SocietyProvider>
                <ThemeProvider value={havenLight}>
                  <StatusBar style="dark" />
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      animation: 'fade',
                      animationDuration: 200,
                      contentStyle: { backgroundColor: colors.mist },
                      freezeOnBlur: true,
                    }}
                  >
                    <Stack.Screen name="index" options={{ animation: 'none' }} />
                    <Stack.Screen name="login" options={{ animation: 'fade', contentStyle: { backgroundColor: colors.ink } }} />
                    <Stack.Screen name="(resident)" options={{ animation: 'fade' }} />
                    <Stack.Screen name="(gate)" options={{ animation: 'fade', contentStyle: { backgroundColor: colors.ink } }} />
                    <Stack.Screen name="(desk)" options={{ animation: 'fade' }} />
                  </Stack>
                </ThemeProvider>
              </SocietyProvider>
            </LockProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
