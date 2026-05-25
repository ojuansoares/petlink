import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'

WebBrowser.maybeCompleteAuthSession()

// Gera o redirect URL direto do app (ex: petlink://--/auth/callback ou exp://IP:8081/--/auth/callback)
export function getRedirectUrl(): string {
  const redirectUrl = Linking.createURL('auth/callback')
  console.log('Redirect URL gerado:', redirectUrl)
  return redirectUrl
}

// Retorna o scheme base do app (ex: "petlink://" ou "exp://192.168.6.5:8081")
export function getAppScheme(): string {
  const url = Linking.createURL('/')
  // Expo Go: exp://192.168.6.5:8081/--/
  // Standalone: petlink://--/
  const parts = url.split('/--')
  const scheme = parts[0]
  const normalized = scheme.endsWith('/') ? scheme.slice(0, -1) : scheme
  return normalized
}

// Gera URL do servidor que faz a ponte (bridge) entre o redirect do Supabase e o app.
// O servidor recebe o scheme do app como query param e redireciona de volta para o app.
export function getServerRedirectUrl(): string {
  const scheme = getAppScheme()
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'
  const serverUrl = `${apiUrl}/auth/redirect?scheme=${encodeURIComponent(scheme)}`
  console.log('Server redirect URL gerado:', serverUrl)
  return serverUrl
}