import { ActivityIndicator, View } from 'react-native'
import { Redirect, Tabs } from 'expo-router'
import { homeRouteFor, useAuth } from '../../src/auth'
import { tabIcon } from '../../src/icons'
import { colors, glassTabBar } from '../../src/theme'

const DESK_ROLES = new Set(['STAFF', 'APARTMENT_ADMIN', 'ADMIN', 'SUPER_ADMIN'])
const ADMIN_ROLES = new Set(['APARTMENT_ADMIN', 'ADMIN', 'SUPER_ADMIN'])

export default function DeskLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mist }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    )
  }
  if (!user) return <Redirect href="/login" />
  if (!DESK_ROLES.has(user.role)) return <Redirect href={homeRouteFor(user.role) as any} />

  const isSuper = user.role === 'SUPER_ADMIN'
  const isAdmin = ADMIN_ROLES.has(user.role)

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.soft,
        tabBarStyle: glassTabBar.light,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.1, marginBottom: 2 },
        tabBarItemStyle: { paddingTop: 6 },
        sceneStyle: { backgroundColor: colors.mist, paddingBottom: 92 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isSuper ? 'Societies' : isAdmin ? 'Ops' : 'Desk',
          tabBarIcon: tabIcon(isSuper ? 'business-outline' : 'grid-outline', isSuper ? 'business' : 'grid'),
        }}
      />

      <Tabs.Screen name="society" options={{ href: null, title: 'Society' }} />

      <Tabs.Screen
        name="revenue"
        options={{
          title: 'Revenue',
          href: isSuper ? undefined : null,
          tabBarIcon: tabIcon('cash-outline', 'cash'),
        }}
      />

      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          href: isAdmin ? undefined : null,
          tabBarIcon: tabIcon('people-outline', 'people'),
        }}
      />
      <Tabs.Screen
        name="tenants"
        options={{
          title: isSuper ? 'People' : 'Residents',
          href: isAdmin ? undefined : null,
          tabBarIcon: tabIcon('home-outline', 'home'),
        }}
      />
      <Tabs.Screen
        name="flats"
        options={{
          title: 'Flats',
          href: isAdmin ? undefined : null,
          tabBarIcon: tabIcon('business-outline', 'business'),
        }}
      />

      <Tabs.Screen
        name="payments"
        options={{
          title: 'Pay',
          href: !isAdmin ? undefined : null,
          tabBarIcon: tabIcon('cash-outline', 'cash'),
        }}
      />
      <Tabs.Screen
        name="complaints"
        options={{
          title: 'Tickets',
          href: !isAdmin ? undefined : null,
          tabBarIcon: tabIcon('construct-outline', 'construct'),
        }}
      />
      <Tabs.Screen
        name="visitors"
        options={{
          title: 'Guests',
          href: !isAdmin ? undefined : null,
          tabBarIcon: tabIcon('person-add-outline', 'person-add'),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{ title: 'You', tabBarIcon: tabIcon('person-circle-outline', 'person-circle') }}
      />

      <Tabs.Screen name="parking" options={{ href: null, title: 'Park' }} />
      <Tabs.Screen name="receipts" options={{ href: null, title: 'Receipts' }} />
    </Tabs>
  )
}
