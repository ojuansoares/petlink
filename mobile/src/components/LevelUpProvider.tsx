import { useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '../store'
import {
  selectPendingLevelUp,
  dismissLevelUp,
} from '../store/slices/gamificationSlice'
import LevelUpModal from './LevelUpModal'

export default function LevelUpProvider() {
  const dispatch = useAppDispatch()
  const pendingLevel = useAppSelector(selectPendingLevelUp)

  if (!pendingLevel) return null

  return (
    <LevelUpModal
      visible
      level={pendingLevel}
      onDismiss={() => dispatch(dismissLevelUp())}
    />
  )
}
