import { createNavigationContainerRef } from '@react-navigation/native'
import { AppStackParamList } from './types'

export const navigationRef = createNavigationContainerRef<AppStackParamList>()

export function navigateFromNotification(
  screen: keyof AppStackParamList,
  params: AppStackParamList[keyof AppStackParamList]
) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(screen as any, params as any)
  }
}
