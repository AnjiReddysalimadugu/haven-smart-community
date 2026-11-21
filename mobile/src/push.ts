import { Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { deviceApi } from './api'
import { EAS_PROJECT_ID } from './config'

let handlerReady = false

function ensureHandler() {
  if (handlerReady) return
  handlerReady = true
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    })
  } catch {
    /* ignore */
  }
}

function projectId(): string | null {
  const id =
    EAS_PROJECT_ID ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    null
  if (!id || id.startsWith('00000000')) return null
  return id
}

/** Best-effort push registration — never throws / never blocks login. */
export async function registerForPush(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return null
    ensureHandler()
    if (!Device.isDevice) return null

    const easProjectId = projectId()
    if (!easProjectId) return null

    const { status: existing } = await Notifications.getPermissionsAsync()
    let finalStatus = existing
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') return null

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('haven', {
        name: 'Haven',
        importance: Notifications.AndroidImportance.DEFAULT,
      })
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId: easProjectId })).data
    await deviceApi.registerPush(token, Platform.OS)
    return token
  } catch {
    return null
  }
}
