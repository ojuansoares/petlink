import React, { useCallback, useEffect } from 'react'
import { Image, ImageSourcePropType, Pressable, StyleSheet, View, Dimensions, Platform } from 'react-native'
import Animated, {
  FadeInDown,
  FadeOutUp,
  SlideInRight,
  SlideOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  withRepeat,
  withDelay,
  interpolate,
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { tokens, withAlpha } from '../theme'
import { Text } from '../components/ui/Typography'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export interface OnboardingStep {
  title: string
  description: string
  illustration?: ImageSourcePropType
}

interface OnboardingScreenProps {
  palette: (typeof tokens)['light'] | (typeof tokens)['dark']
  steps: readonly OnboardingStep[]
  currentIndex: number
  onNext: () => void
  onComplete: () => void
}

const STEP_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'paw',
  'person',
  'paw',
  'notifications',
]

const ILLUSTRATION_COLORS = [
  ['#4A5B42', '#5D7052', '#7A9470'],
  ['#4A5B42', '#5D7052', '#7A9470'],
  ['#4A5B42', '#5D7052', '#7A9470'],
  ['#4A5B42', '#5D7052', '#7A9470'],
]

function StepIndicator({
  steps,
  currentIndex,
  progressAnim,
}: {
  steps: readonly OnboardingStep[]
  currentIndex: number
  progressAnim: SharedValue<number>
}) {
  const progress = useDerivedValue(() => progressAnim.value)

  return (
    <View style={styles.progressContainer}>
      {steps.map((_, index) => {
        const isActive = index === currentIndex
        const isPast = index < currentIndex
        return (
          <View
            key={index}
            style={[
              styles.progressDot,
              {
                backgroundColor: isPast
                  ? withAlpha('#F3F4F1', 0.9)
                  : isActive
                    ? '#F3F4F1'
                    : withAlpha('#F3F4F1', 0.25),
                width: isActive ? 24 : isPast ? 8 : 8,
              },
            ]}
          />
        )
      })}
    </View>
  )
}

export default function OnboardingScreen({
  palette,
  steps,
  currentIndex,
  onNext,
  onComplete,
}: Readonly<OnboardingScreenProps>) {
  const insets = useSafeAreaInsets()
  const currentStep = steps[currentIndex]
  const isLastStep = currentIndex === steps.length - 1
  const brand = '#5D7052'
  const white = '#F3F4F1'

  const progressAnim = useSharedValue(0)
  const buttonScale = useSharedValue(1)
  const floatAnim = useSharedValue(0)

  useEffect(() => {
    progressAnim.value = withTiming((currentIndex + 1) / steps.length, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    })
  }, [currentIndex, steps.length, progressAnim])

  useEffect(() => {
    floatAnim.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    )
  }, [floatAnim])

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value * 100}%`,
  }))

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }))

  const floatUpStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(floatAnim.value, [0, 1], [0, -8]) }],
  }))

  const iconName = STEP_ICONS[currentIndex] ?? 'paw'

  const handlePressIn = useCallback(() => {
    buttonScale.value = withTiming(0.95, { duration: 100 })
  }, [buttonScale])

  const handlePressOut = useCallback(() => {
    buttonScale.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.back(1.5)) })
  }, [buttonScale])

  const handlePress = useCallback(() => {
    if (isLastStep) {
      onComplete()
    } else {
      onNext()
    }
  }, [isLastStep, onComplete, onNext])

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#4A5B42', '#5D7052', '#6B8060']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.safeArea, { paddingTop: insets.top + 12 }]}>
        <View style={styles.progressBarTrack}>
          <Animated.View style={[styles.progressBarFill, progressBarStyle]} />
        </View>

        <Text size="xs" style={[styles.stepLabel, { color: withAlpha(white, 0.75) }]}>
          Passo {currentIndex + 1} de {steps.length}
        </Text>
      </View>

      <View style={styles.illustrationArea}>
        <Animated.View
          key={`ill-${currentIndex}`}
          entering={FadeInDown.duration(500).easing(Easing.out(Easing.cubic))}
          exiting={FadeOutUp.duration(200)}
          style={styles.illustrationWrap}
        >
          {currentStep.illustration ? (
            <View style={styles.illustrationImageWrap}>
              <Image
                source={currentStep.illustration}
                style={[styles.illustrationImage, { backgroundColor: withAlpha(white, 0.12) }]}
                resizeMode="contain"
              />
            </View>
          ) : (
            <Animated.View style={[styles.illustrationPlaceholder, floatUpStyle]}>
              <View style={[styles.iconCircle, { backgroundColor: withAlpha(white, 0.15) }]}>
                <Ionicons name={iconName} size={56} color={white} />
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </View>

      <View style={styles.contentArea}>
        <Animated.View
          key={`step-${currentIndex}`}
          entering={SlideInRight.duration(400).easing(Easing.out(Easing.cubic))}
          exiting={SlideOutLeft.duration(250).easing(Easing.in(Easing.cubic))}
          style={styles.contentCard}
        >
          <Text size="2xl" weight="700" style={[styles.title, { color: white }]}>
            {currentStep.title}
          </Text>
          <Text size="base" style={[styles.description, { color: withAlpha(white, 0.88) }]}>
            {currentStep.description}
          </Text>
        </Animated.View>
      </View>

      <View style={[styles.bottomArea, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <StepIndicator steps={steps} currentIndex={currentIndex} progressAnim={progressAnim} />

        <Animated.View style={[styles.buttonWrap, buttonAnimStyle]}>
          <Pressable
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: withAlpha(white, pressed ? 0.22 : 0.14),
                borderColor: withAlpha(white, pressed ? 0.6 : 0.35),
              },
            ]}
          >
            <Text size="base" weight="700" style={{ color: white }}>
              {isLastStep ? 'Concluir' : 'Próximo'}
            </Text>
            {!isLastStep && (
              <Ionicons name="arrow-forward" size={18} color={white} style={{ marginLeft: 8 }} />
            )}
          </Pressable>
        </Animated.View>

        {!isLastStep && (
          <Pressable
            onPress={onComplete}
            style={({ pressed }) => [styles.skipBtn, { opacity: pressed ? 0.5 : 1 }]}
          >
            <Text size="sm" style={{ color: withAlpha(white, 0.55) }}>
              Pular
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    paddingHorizontal: 24,
    alignItems: 'center',
    zIndex: 10,
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: withAlpha('#F3F4F1', 0.2),
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F3F4F1',
    borderRadius: 2,
  },
  stepLabel: {
    textAlign: 'center',
    marginBottom: 4,
  },
  illustrationArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  illustrationWrap: {
    width: SCREEN_WIDTH * 0.82,
    aspectRatio: 1,
    maxWidth: 420,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationImageWrap: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  illustrationPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentArea: {
    paddingHorizontal: 32,
    paddingBottom: 20,
  },
  contentCard: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    lineHeight: 23,
    textAlign: 'center',
  },
  bottomArea: {
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressDot: {
    height: 8,
    borderRadius: 999,
  },
  buttonWrap: {
    width: '100%',
    maxWidth: 280,
  },
  button: {
    minHeight: 50,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    borderWidth: 1,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
})
