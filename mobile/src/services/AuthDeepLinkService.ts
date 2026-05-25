import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'

WebBrowser.maybeCompleteAuthSession()

// Gera o redirect URL correto dependendo do ambiente
export function getRedirectUrl(): string {
  const redirectUrl = Linking.createURL('auth/callback')
  console.log('Redirect URL gerado:', redirectUrl)
  return redirectUrl
}