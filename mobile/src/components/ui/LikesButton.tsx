import React, { useCallback } from 'react'
import { Pressable, ActivityIndicator, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from './Typography'
import { useTheme } from '../../hooks/useTheme'
import { useAppDispatch, useAppSelector } from '../../store'
import { toggleLikeThunk, selectLikedByPostId, selectIsLikeLoading } from '../../store/slices/likesSlice'
import { formatCount } from '../../utils/formatNumber'

interface LikesButtonProps {
  postId: string
  likesCount: number
  size?: number
  initialLiked?: boolean
  onCountPress?: () => void
}

export function LikesButton({ postId, likesCount, size = 36, initialLiked, onCountPress }: LikesButtonProps) {
  const { colors } = useTheme()
  const dispatch = useAppDispatch()
  const globalLiked = useAppSelector(selectLikedByPostId)[postId]
  const loading = useAppSelector(selectIsLikeLoading(postId))

  // Use global state when toggled in this session; fall back to initial from server
  const liked = globalLiked !== undefined ? globalLiked : !!initialLiked

  const handlePress = useCallback(() => {
    dispatch(toggleLikeThunk(postId))
  }, [dispatch, postId])

  if (loading) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        <ActivityIndicator size={size - 8} color={colors.mutedForeground} />
        <Text size="sm" weight="600" color="mutedForeground">
          {formatCount(likesCount)}
        </Text>
      </View>
    )
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Pressable onPress={handlePress} hitSlop={8} style={{ padding: 2 }}>
        <Ionicons
          name={liked ? 'heart' : 'heart-outline'}
          size={size}
          color={liked ? colors.destructive : colors.mutedForeground}
        />
      </Pressable>
      <Pressable onPress={onCountPress} hitSlop={8} disabled={!onCountPress} style={{ padding: 2 }}>
        <Text size="sm" weight="600" color="mutedForeground">
          {formatCount(likesCount)}
        </Text>
      </Pressable>
    </View>
  )
}
