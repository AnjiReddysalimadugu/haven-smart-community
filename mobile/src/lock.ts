import { Alert, Platform } from 'react-native'
import * as Crypto from 'expo-crypto'
import * as LocalAuthentication from 'expo-local-authentication'
import { storageDelete, storageGet, storageSet } from './storage'

const KEY_HASH = 'haven.mpin.hash'
const KEY_USER = 'haven.mpin.userId'
const KEY_BIO = 'haven.mpin.bio'
const KEY_SALT = 'haven.mpin.salt'

async function getOrCreateSalt() {
  let salt = await storageGet(KEY_SALT)
  if (!salt) {
    salt = Crypto.randomUUID()
    await storageSet(KEY_SALT, salt)
  }
  return salt
}

async function hashPin(pin: string) {
  const salt = await getOrCreateSalt()
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`,
  )
}

export async function getMpinUserId(): Promise<string | null> {
  return storageGet(KEY_USER)
}

export async function hasMpin(): Promise<boolean> {
  const hash = await storageGet(KEY_HASH)
  return Boolean(hash)
}

export async function isMpinForUser(userId: string): Promise<boolean> {
  const [hash, uid] = await Promise.all([storageGet(KEY_HASH), storageGet(KEY_USER)])
  return Boolean(hash && uid === userId)
}

export async function setMpin(userId: string, pin: string): Promise<void> {
  if (!/^\d{4}$/.test(pin)) throw new Error('MPIN must be 4 digits')
  const hash = await hashPin(pin)
  await storageSet(KEY_HASH, hash)
  await storageSet(KEY_USER, userId)
}

export async function verifyMpin(pin: string): Promise<boolean> {
  const stored = await storageGet(KEY_HASH)
  if (!stored) return false
  const hash = await hashPin(pin)
  return hash === stored
}

export async function clearMpin(): Promise<void> {
  await storageDelete(KEY_HASH)
  await storageDelete(KEY_USER)
  await storageDelete(KEY_BIO)
}

export async function isBiometricEnabled(): Promise<boolean> {
  return (await storageGet(KEY_BIO)) === '1'
}

export async function setBiometricEnabled(on: boolean): Promise<void> {
  if (on) await storageSet(KEY_BIO, '1')
  else await storageDelete(KEY_BIO)
}

export type BioInfo = {
  available: boolean
  enrolled: boolean
  /** web uses confirm-dialog quick unlock when OS biometrics unavailable */
  webFallback: boolean
  label: string
  hint: string
}

function webConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (Platform.OS === 'web' && typeof globalThis.confirm === 'function') {
      resolve(globalThis.confirm(message))
      return
    }
    Alert.alert('Haven', message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Unlock', onPress: () => resolve(true) },
    ])
  })
}

export async function getBiometricInfo(): Promise<BioInfo> {
  if (Platform.OS === 'web') {
    return {
      available: true,
      enrolled: true,
      webFallback: true,
      label: 'Quick unlock',
      hint: 'Browser confirm · phone app uses fingerprint',
    }
  }
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync()
    const enrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false
    const types = hasHardware ? await LocalAuthentication.supportedAuthenticationTypesAsync() : []
    const hasFace = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
    const hasFinger = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
    let label = 'Biometrics'
    if (hasFinger && hasFace) label = Platform.OS === 'ios' ? 'Face ID / Touch ID' : 'Fingerprint / Face'
    else if (hasFace) label = Platform.OS === 'ios' ? 'Face ID' : 'Face unlock'
    else if (hasFinger) label = 'Fingerprint'

    if (!hasHardware) {
      return {
        available: false,
        enrolled: false,
        webFallback: false,
        label: 'Fingerprint',
        hint: 'This device has no biometric sensor',
      }
    }
    if (!enrolled) {
      return {
        available: true,
        enrolled: false,
        webFallback: false,
        label,
        hint: 'Add a fingerprint / face in phone Settings first',
      }
    }
    return {
      available: true,
      enrolled: true,
      webFallback: false,
      label,
      hint: `Unlock Haven with ${label.toLowerCase()}`,
    }
  } catch {
    return {
      available: false,
      enrolled: false,
      webFallback: false,
      label: 'Biometrics',
      hint: 'Biometrics unavailable',
    }
  }
}

export async function authenticateBiometric(prompt = 'Unlock Haven'): Promise<boolean> {
  const info = await getBiometricInfo()
  if (info.webFallback || Platform.OS === 'web') {
    return webConfirm(`${prompt}\n\nConfirm it’s you to unlock.`)
  }
  if (!info.enrolled) return false
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: prompt,
      cancelLabel: 'Use MPIN',
      disableDeviceFallback: true,
    })
    return res.success
  } catch {
    return false
  }
}
