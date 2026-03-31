import * as SecureStore from 'expo-secure-store'
import * as Keychain from 'react-native-keychain'

type StoredTokens = {
  accessToken: string
  refreshToken: string
}

const AUTH_TOKENS_KEY = 'petlink_auth_tokens'

function parseTokens(raw: string | null): StoredTokens | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed?.accessToken && parsed?.refreshToken) {
      return {
        accessToken: String(parsed.accessToken),
        refreshToken: String(parsed.refreshToken),
      }
    }
  } catch {
    return null
  }

  return null
}

export async function readAuthTokens(): Promise<StoredTokens | null> {
  try {
    const raw = await SecureStore.getItemAsync(AUTH_TOKENS_KEY)
    const parsed = parseTokens(raw)
    if (parsed) return parsed
  } catch {
    // ignore and try fallback
  }

  try {
    const credentials = await Keychain.getGenericPassword()
    if (!credentials) return null
    return parseTokens(credentials.password)
  } catch {
    return null
  }
}

export async function writeAuthTokens(tokens: StoredTokens): Promise<void> {
  const payload = JSON.stringify(tokens)

  try {
    await SecureStore.setItemAsync(AUTH_TOKENS_KEY, payload)
  } catch {
    // ignore and try fallback
  }

  try {
    await Keychain.setGenericPassword('petlink', payload)
  } catch {
    // ignore: SecureStore path is enough for Expo Go
  }
}

export async function clearAuthTokens(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(AUTH_TOKENS_KEY)
  } catch {
    // ignore and continue
  }

  try {
    await Keychain.resetGenericPassword()
  } catch {
    // ignore
  }
}
