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
  const brandBackground = '#5D7052'
  const white = '#F3F4F1'

  return (
    <View style={[styles.screen, { backgroundColor: brandBackground }]}> 
      <View style={styles.content}> 
        <Text size="xs" style={[styles.stepLabel, { color: withAlpha(white, 0.86) }]}>
          Passo {currentIndex + 1} de {steps.length}
        </Text>
        <Text size="3xl" weight="700" style={[styles.title, { color: white }]}>{currentStep.title}</Text>
        <Text size="base" style={[styles.description, { color: withAlpha(white, 0.9) }]}>{currentStep.description}</Text>
      </View>

      <View style={styles.dotsRow}>
        {steps.map((step, index) => (
          <View
            key={step.title}
            style={[
              styles.dot,
              {
                backgroundColor: index === currentIndex ? white : withAlpha(white, 0.35),
                width: index === currentIndex ? 20 : 8,
              },
            ]}
          />
        ))}
      </View>

      <Pressable
        style={[
          styles.button,
          { backgroundColor: withAlpha(white, 0.16), borderColor: withAlpha(white, 0.45), borderWidth: 1 },
        ]}
        onPress={isLastStep ? onComplete : onNext}
      >
        <Text size="base" weight="700" style={{ color: white }}>
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
