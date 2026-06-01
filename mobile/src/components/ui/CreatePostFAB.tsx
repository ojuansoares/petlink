import React, { useCallback, useState } from 'react'
import { Pressable, StyleSheet, View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated'
import { useTheme } from '../../hooks/useTheme'
import { useAppDispatch } from '../../store'
import { setShowCreatePost, setLoadingPetsForPost } from '../../store/slices/uiSlice'
import { fetchPetsThunk } from '../../store/slices/petsSlice'

const BUTTON_SIZE = 56
const GAP = 12

export function CreatePostFAB() {
  const dispatch = useAppDispatch()
  const { colors, withAlpha } = useTheme()
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)

  const rotate = useSharedValue(0)
  const postScale = useSharedValue(0)
  const postTranslate = useSharedValue(20)
  const walkScale = useSharedValue(0)
  const walkTranslate = useSharedValue(20)

  const animate = useCallback((toOpen: boolean) => {
    rotate.value = withTiming(toOpen ? 45 : 0, { duration: 200 })
    postScale.value = withSpring(toOpen ? 1 : 0, { damping: 12 })
    postTranslate.value = withSpring(toOpen ? 0 : 20, { damping: 12 })
    walkScale.value = withSpring(toOpen ? 1 : 0, { damping: 12 })
    walkTranslate.value = withSpring(toOpen ? 0 : 20, { damping: 12 })
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
      { translateY: postTranslate.value },
    ],
  }))

  const walkAnim = useAnimatedStyle(() => ({
    transform: [
      { scale: walkScale.value },
      { translateY: walkTranslate.value },
    ],
  }))

  const backdropAnim = useAnimatedStyle(() => ({
    opacity: withTiming(open ? 1 : 0, { duration: 200 }),
  }))

  const bottom = insets.bottom + 88

  return (
    <>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { zIndex: 9 },
          backdropAnim,
        ]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <Pressable style={{ flex: 1 }} onPress={toggle} />
      </Animated.View>

      <Animated.View
        style={[
          walkAnim,
          styles.option,
          {
            bottom: bottom + BUTTON_SIZE + GAP,
            right: 20,
          },
        ]}
      >
        <Pressable
          onPress={handleWalk}
          style={[styles.optionBtn, { backgroundColor: colors.card, borderColor: withAlpha(colors.border, 0.6) }]}
        >
          <View style={[styles.optionIcon, { backgroundColor: withAlpha('#8B5CF6', 0.1) }]}>
            <Ionicons name="walk-outline" size={20} color="#8B5CF6" />
          </View>
          <Text style={[styles.optionLabel, { color: colors.foreground }]}>Passeio</Text>
        </Pressable>
      </Animated.View>

      <Animated.View
        style={[
          postAnim,
          styles.option,
          {
            bottom: bottom + (BUTTON_SIZE + GAP) * 2,
            right: 20,
          },
        ]}
      >
        <Pressable
          onPress={handleCreatePost}
          style={[styles.optionBtn, { backgroundColor: colors.card, borderColor: withAlpha(colors.border, 0.6) }]}
        >
          <View style={[styles.optionIcon, { backgroundColor: withAlpha(colors.primary, 0.1) }]}>
            <Ionicons name="add-circle" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.optionLabel, { color: colors.foreground }]}>Post</Text>
        </Pressable>
      </Animated.View>

      <Animated.View
        style={[
          styles.fab,
          mainAnim,
          {
            backgroundColor: colors.primary,
            bottom,
          },
        ]}
      >
        <Pressable
          onPress={toggle}
          style={styles.fabInner}
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
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
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
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  optionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
})
