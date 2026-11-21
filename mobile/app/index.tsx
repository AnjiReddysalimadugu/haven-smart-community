import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { homeRouteFor, useAuth } from '../src/auth'
import { colors } from '../src/theme'

export default function Index() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mist }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    )
  }

  if (!user) return <Redirect href="/login" />
  return <Redirect href={homeRouteFor(user.role) as any} />
}
