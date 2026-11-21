/**
 * Dynamic Expo config — prefers env over hardcoded LAN IPs.
 *
 * EXPO_PUBLIC_API_URL=http://192.168.x.x:8080/api/v1
 * EXPO_PUBLIC_EAS_PROJECT_ID=<from `eas init` / expo.dev>
 */
const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.API_URL ||
  ''

const easProjectId =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
  process.env.EAS_PROJECT_ID ||
  ''

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: 'Haven',
  slug: 'haven-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'haven',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0B1612',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.haven.community',
    infoPlist: {
      NSCameraUsageDescription: 'Haven scans visitor QR passes at the gate.',
      NSAppTransportSecurity: {
        NSAllowsLocalNetworking: true,
      },
    },
  },
  android: {
    package: 'com.haven.community',
    adaptiveIcon: {
      backgroundColor: '#101828',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    permissions: [
      'CAMERA',
      'android.permission.CAMERA',
      'android.permission.POST_NOTIFICATIONS',
    ],
    predictiveBackGestureEnabled: true,
    usesCleartextTraffic: true,
    manifestQueries: {
      intent: [
        {
          action: 'android.intent.action.VIEW',
          data: { scheme: 'upi' },
        },
      ],
    },
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-web-browser',
    [
      'expo-camera',
      {
        cameraPermission: 'Allow Haven to scan visitor QR passes.',
      },
    ],
    [
      'expo-notifications',
      {
        color: '#176B55',
      },
    ],
  ],
  extra: {
    // Empty → src/config.ts uses emulator/simulator defaults
    apiUrl: apiUrl || undefined,
    eas: {
      // Run `eas init` and set EXPO_PUBLIC_EAS_PROJECT_ID — leave blank until then
      projectId: easProjectId || undefined,
    },
  },
}
