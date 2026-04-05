import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { tokens, withAlpha } from '../theme'
import { Text } from '../components/ui/Typography'

export interface OnboardingStep {
  title: string
  description: string
}

interface OnboardingScreenProps {
  palette: (typeof tokens)['light'] | (typeof tokens)['dark']
  steps: readonly OnboardingStep[]
  currentIndex: number
  onNext: () => void
  onComplete: () => void
}

export default function OnboardingScreen({
  palette,
  steps,
  currentIndex,
  onNext,
  onComplete,
}: Readonly<OnboardingScreenProps>) {
  const currentStep = steps[currentIndex]
  const isLastStep = currentIndex === steps.length - 1

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}> 
      <View style={styles.content}> 
        <Text size="xs" color="mutedForeground" style={styles.stepLabel}>
          Passo {currentIndex + 1} de {steps.length}
        </Text>
        <Text size="3xl" weight="700" style={styles.title}>{currentStep.title}</Text>
        <Text size="base" color="mutedForeground" style={styles.description}>{currentStep.description}</Text>
      </View>

      <View style={styles.dotsRow}>
        {steps.map((step, index) => (
          <View
            key={step.title}
            style={[
              styles.dot,
              {
                backgroundColor: index === currentIndex ? palette.primary : withAlpha(palette.border, 0.9),
                width: index === currentIndex ? 20 : 8,
              },
            ]}
          />
        ))}
      </View>

      <Pressable
        style={[
          styles.button,
          { backgroundColor: palette.primary },
        ]}
        onPress={isLastStep ? onComplete : onNext}
      >
        <Text size="base" weight="700" style={{ color: palette.primaryForeground }}>
          {isLastStep ? 'Concluido' : 'Next'}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: 460,
    alignItems: 'center',
  },
  stepLabel: {
    marginBottom: 8,
    textAlign: 'center',
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    lineHeight: 23,
    textAlign: 'center',
  },
  dotsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 999,
  },
  button: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    minHeight: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
})
