import React, { useCallback, useState } from 'react'
import { Pressable, StyleSheet, View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay, 
  Easing 
} from 'react-native-reanimated'
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
    const duration = 250;

    // Rotação do botão principal
    rotate.value = withTiming(toOpen ? 45 : 0, { duration, easing: Easing.out(Easing.cubic) })
    backdropOpacity.value = withTiming(toOpen ? 1 : 0, { duration, easing: Easing.inOut(Easing.cubic) })

    if (toOpen) {
      // ANIMAÇÃO DE ABERTURA
      // Botão Passeio (Aparece primeiro)
      walkScale.value = withTiming(1, { duration, easing: Easing.out(Easing.back(1.5)) })
      walkOpacity.value = withTiming(1, { duration })
      walkTranslateY.value = withTiming(0, { duration, easing: Easing.out(Easing.cubic) })

      // Botão Post (Aparece em seguida)
      postScale.value = withDelay(80, withTiming(1, { duration, easing: Easing.out(Easing.back(1.5)) }))
      postOpacity.value = withDelay(80, withTiming(1, { duration }))
      postTranslateY.value = withDelay(80, withTiming(0, { duration, easing: Easing.out(Easing.cubic) }))
    } else {
      // ANIMAÇÃO DE FECHAMENTO (Cascata reversa)
      // Botão Post (Some primeiro)
      postScale.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) })
      postOpacity.value = withTiming(0, { duration: 200 })
      postTranslateY.value = withTiming(20, { duration: 200, easing: Easing.in(Easing.cubic) })

      // Botão Passeio (Some em seguida)
      walkScale.value = withDelay(50, withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) }))
      walkOpacity.value = withDelay(50, withTiming(0, { duration: 200 }))
      walkTranslateY.value = withDelay(50, withTiming(20, { duration: 200, easing: Easing.in(Easing.cubic) }))
    }
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

      {/* Botão Passeio */}
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
          style={({ pressed }) => [
            styles.optionBtn,
            {
              // Agora está 0.78, igual ao Post!
              backgroundColor: withAlpha(colors.primary, pressed ? 0.9 : 0.85),
              borderColor: withAlpha(colors.primaryForeground, 0.24),
              opacity: pressed ? 0.8 : 1, 
            },
          ]}
        >
          <View style={[styles.optionIcon, { backgroundColor: withAlpha(colors.primaryForeground, 0.16) }]}>
            <Ionicons name="walk-outline" size={20} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.optionLabel, { color: colors.primaryForeground }]}>Passeio</Text>
        </Pressable>
      </Animated.View>

      {/* Botão Post */}
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
          style={({ pressed }) => [
            styles.optionBtn,
            {
              backgroundColor: withAlpha(colors.primary, pressed ? 0.9 : 0.85),
              borderColor: withAlpha(colors.primaryForeground, 0.24),
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <View style={[styles.optionIcon, { backgroundColor: withAlpha(colors.primaryForeground, 0.16) }]}>
            <Ionicons name="add-circle" size={20} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.optionLabel, { color: colors.primaryForeground }]}>Post</Text>
        </Pressable>
      </Animated.View>

      {/* Botão Principal (FAB) */}
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
              opacity: pressed ? 0.7 : 1,
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