import { ActivityIndicator, View } from 'react-native'
import { Redirect, Tabs } from 'expo-router'
import { homeRouteFor, useAuth } from '../../src/auth'
import { tabIcon } from '../../src/icons'
import { colors, glassTabBar } from '../../src/theme'

export default function ResidentLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mist }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    )
  }
  if (!user) return <Redirect href="/login" />
  if (user.role !== 'RESIDENT') return <Redirect href={homeRouteFor(user.role) as any} />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.soft,
        tabBarStyle: glassTabBar.light,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.1, marginBottom: 2 },
        tabBarItemStyle: { paddingTop: 6 },
        sceneStyle: { backgroundColor: colors.mist, paddingBottom: 92 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon('home-outline', 'home') }} />
      <Tabs.Screen name="bills" options={{ title: 'Bills', tabBarIcon: tabIcon('wallet-outline', 'wallet') }} />
      <Tabs.Screen name="guests" options={{ title: 'Guests', tabBarIcon: tabIcon('person-add-outline', 'person-add') }} />
      <Tabs.Screen name="help" options={{ title: 'Help', tabBarIcon: tabIcon('construct-outline', 'construct') }} />
      <Tabs.Screen name="profile" options={{ title: 'You', tabBarIcon: tabIcon('person-circle-outline', 'person-circle') }} />
      <Tabs.Screen name="receipts" options={{ href: null, title: 'Receipts' }} />
    </Tabs>
  )
}
