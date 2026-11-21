import { ActivityIndicator, View } from 'react-native'
import { Redirect, Tabs } from 'expo-router'
import { homeRouteFor, useAuth } from '../../src/auth'
import { tabIcon } from '../../src/icons'
import { colors, glassTabBar } from '../../src/theme'

export default function GateLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink }}>
        <ActivityIndicator color={colors.gateAccent} size="large" />
      </View>
    )
  }
  if (!user) return <Redirect href="/login" />
  if (user.role !== 'SECURITY') return <Redirect href={homeRouteFor(user.role) as any} />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true,
        tabBarActiveTintColor: colors.gateAccent,
        tabBarInactiveTintColor: 'rgba(244,255,240,0.45)',
        tabBarStyle: glassTabBar.dark,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.1, marginBottom: 2 },
        tabBarItemStyle: { paddingTop: 6 },
        sceneStyle: { backgroundColor: colors.ink, paddingBottom: 92 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Gate', tabBarIcon: tabIcon('enter-outline', 'enter') }} />
      <Tabs.Screen name="scan" options={{ title: 'Scan', tabBarIcon: tabIcon('qr-code-outline', 'qr-code') }} />
      <Tabs.Screen name="passes" options={{ title: 'Passes', tabBarIcon: tabIcon('list-outline', 'list') }} />
      <Tabs.Screen name="profile" options={{ title: 'You', tabBarIcon: tabIcon('person-circle-outline', 'person-circle') }} />
    </Tabs>
  )
}
