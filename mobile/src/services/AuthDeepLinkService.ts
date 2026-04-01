import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'

// Necessário para o OAuth (Google, Facebook) fechar o browser corretamente
WebBrowser.maybeCompleteAuthSession()

// Gera o redirect URL correto dependendo do ambiente
export function getRedirectUrl(): string {
  // Em Expo Go: retorna exp://192.168.x.x:8081
  // Em APK de produção: retorna petlink://auth/callback
  const redirectUrl = Linking.createURL('auth/callback')
  console.log('Redirect URL gerado:', redirectUrl)
  return redirectUrl
}