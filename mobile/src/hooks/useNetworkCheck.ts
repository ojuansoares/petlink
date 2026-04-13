import { useAppSelector } from '../store'
import { selectIsOnline } from '../store/slices/uiSlice'

export function useNetworkCheck() {
  const isOnline = useAppSelector(selectIsOnline)
  return { isOnline }
}