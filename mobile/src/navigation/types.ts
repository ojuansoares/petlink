export type AuthStackParamList = {
  AuthWelcome: undefined
  Login: undefined
  Register: undefined
  ForgotPassword: undefined
  ResetPassword: undefined
}

export type AppStackParamList = {
  Tabs: undefined
  SettingsMenu: undefined
  SettingsTheme: undefined
  SettingsNotifications: undefined
  SettingsDangerZone: undefined
  PublicProfile: { userId: string }
  ProfileFeed: { userId: string; initialScrollIndex: number; title: string }
  Vaccine: { petId: string, petName: string }
  Consultation: { petId: string, petName: string }
  FeedingPlan: { petId: string; petName: string }
  FeedingCheck: { petId: string; petName: string }
}
