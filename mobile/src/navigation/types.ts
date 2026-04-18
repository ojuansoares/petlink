export type AuthStackParamList = {
  AuthWelcome: undefined
  Login: undefined
  Register: undefined
}

export type AppStackParamList = {
  Tabs: undefined
  SettingsMenu: undefined
  SettingsTheme: undefined
  SettingsNotifications: undefined
  SettingsDangerZone: undefined
  PublicProfile: { userId: string }
  ProfileFeed: { userId: string; initialScrollIndex: number; title: string }
}
