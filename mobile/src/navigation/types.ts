export type AuthStackParamList = {
  AuthWelcome: undefined
  Login: undefined
  Register: undefined
  ForgotPassword: undefined
  ResetPassword: undefined
}

export type AppStackParamList = {
  Tabs: undefined
  Groups: undefined
  GroupDetail: { groupId: string; groupName?: string }
  Search: { tab?: 'pessoas' | 'pets' | 'grupos' | 'locais'; osmId?: number; osmType?: string } | undefined
  SettingsMenu: undefined
  SettingsTheme: undefined
  SettingsNotifications: undefined
  SettingsSecurity: undefined
  SettingsDangerZone: undefined
  PublicProfile: { userId: string; petId?: string }
  ProfileFeed: { userId: string; initialScrollIndex: number; title: string }
  Vaccine: { petId: string; petName: string; vaccineId?: string }
  Consultation: { petId: string; petName: string; autoOpenModal?: boolean }
  FeedingPlan: { petId: string; petName: string }
  FeedingCheck: { petId: string; petName: string }
  ActivityTimeline: { petId: string; petName: string }
  Walk: { petId: string; petName: string }
  WalkRecording: { petId: string; petName: string }
  WalkDetail: { walk: any }
}
