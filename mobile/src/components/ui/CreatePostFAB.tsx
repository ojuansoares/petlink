import React, { useCallback, useState } from 'react'
import { Pressable, StyleSheet, View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated'
import { useTheme } from '../../hooks/useTheme'
import { useAppDispatch } from '../../store'
import { setShowCreatePost, setLoadingPetsForPost } from '../../store/slices/uiSlice'
import { fetchPetsThunk } from '../../store/slices/petsSlice'

const BUTTON_SIZE = 56
const GAP = 16

export function CreatePostFAB() {
  const dispatch = useAppDispatch()
  const { colors, withAlpha } = useTheme()
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)

  const rotate = useSharedValue(0)
  const postScale = useSharedValue(0)
  const postOpacity = useSharedValue(0)
  const postTranslateY = useSharedValue(30)
  const walkScale = useSharedValue(0)
  const walkOpacity = useSharedValue(0)
  const walkTranslateY = useSharedValue(30)
  const backdropOpacity = useSharedValue(0)

  const animate = useCallback((toOpen: boolean) => {
    rotate.value = withTiming(toOpen ? 45 : 0, { duration: 300, easing: Easing.out(Easing.cubic) })

    // Walk button animation (appears first - from bottom)
    walkScale.value = withTiming(toOpen ? 1 : 0, { duration: 280, easing: Easing.out(Easing.cubic) })
    walkOpacity.value = withTiming(toOpen ? 1 : 0, { duration: 200, easing: Easing.out(Easing.cubic) })
    walkTranslateY.value = withTiming(toOpen ? 0 : 40, { duration: 280, easing: Easing.out(Easing.cubic) })

    // Post button animation (appears second with delay)
    setTimeout(() => {
      postScale.value = withTiming(toOpen ? 1 : 0, { duration: 280, easing: Easing.out(Easing.cubic) })
      postOpacity.value = withTiming(toOpen ? 1 : 0, { duration: 200, easing: Easing.out(Easing.cubic) })
      postTranslateY.value = withTiming(toOpen ? 0 : 40, { duration: 280, easing: Easing.out(Easing.cubic) })
    }, toOpen ? 80 : 0)

    backdropOpacity.value = withTiming(toOpen ? 1 : 0, { duration: 200, easing: Easing.inOut(Easing.cubic) })
  }, [])

  const toggle = useCallback(() => {
    const next = !open
    setOpen(next)
    animate(next)
  }, [open, animate])

  const handleCreatePost = useCallback(async () => {
    toggle()
    dispatch(setLoadingPetsForPost(true))
    dispatch(setShowCreatePost(true))
    try {
      await dispatch(fetchPetsThunk()).unwrap()
    } finally {
      dispatch(setLoadingPetsForPost(false))
    }
  }, [dispatch, toggle])

  const handleWalk = useCallback(() => {
    toggle()
  }, [toggle])

  const mainAnim = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }))

  const postAnim = useAnimatedStyle(() => ({
    transform: [
      { scale: postScale.value },
      { translateY: postTranslateY.value },
    ],
    opacity: postOpacity.value,
  }))

  const walkAnim = useAnimatedStyle(() => ({
    transform: [
      { scale: walkScale.value },
      { translateY: walkTranslateY.value },
    ],
    opacity: walkOpacity.value,
  }))

  const backdropAnim = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }))

  return (
    <>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { zIndex: open ? 8 : -1 },
          backdropAnim,
        ]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]}
          onPress={toggle}
        />
      </Animated.View>

      <Animated.View
        style={[
          walkAnim,
          styles.option,
          {
            bottom: insets.bottom + 88 + BUTTON_SIZE + GAP,
            right: 20,
          },
        ]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <Pressable
          onPress={handleWalk}
          android_ripple={{ color: 'transparent' }}
          style={({ pressed }) => [
            styles.optionBtn,
            {
              backgroundColor: withAlpha(colors.primary, pressed ? 0.9 : 0.93),
              borderColor: withAlpha(colors.primaryForeground, 0.24),
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View style={[styles.optionIcon, { backgroundColor: withAlpha(colors.primaryForeground, 0.16) }]}>
            <Ionicons name="walk-outline" size={20} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.optionLabel, { color: colors.primaryForeground }]}>Passeio</Text>
        </Pressable>
      </Animated.View>

      <Animated.View
        style={[
          postAnim,
          styles.option,
          {
            bottom: insets.bottom + 88 + (BUTTON_SIZE + GAP) * 2,
            right: 20,
          },
        ]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <Pressable
          onPress={handleCreatePost}
          android_ripple={{ color: 'transparent' }}
          style={({ pressed }) => [
            styles.optionBtn,
            {
              backgroundColor: withAlpha(colors.primary, pressed ? 0.9 : 0.78),
              borderColor: withAlpha(colors.primaryForeground, 0.24),
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View style={[styles.optionIcon, { backgroundColor: withAlpha(colors.primaryForeground, 0.16) }]}>
            <Ionicons name="add-circle" size={20} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.optionLabel, { color: colors.primaryForeground }]}>Post</Text>
        </Pressable>
      </Animated.View>

      <Animated.View
        style={[
          styles.fab,
          mainAnim,
          {
            backgroundColor: withAlpha(colors.primary, 0.90),
            bottom: insets.bottom + 88,
          },
        ]}
      >
        <Pressable
          onPress={toggle}
          style={({ pressed }) => [
            styles.fabInner,
            {
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={open ? 'Fechar' : 'Criar'}
        >
          <Ionicons name="add" size={28} color={colors.primaryForeground} />
        </Pressable>
      </Animated.View>
    </>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  option: {
    position: 'absolute',
    zIndex: 10,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
    includeFontPadding: false,
    backgroundColor: 'transparent',
  },
})
