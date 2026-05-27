import React from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Switch, View } from 'react-native'
import { Heading, Text } from '../components/ui/Typography'
import { useTheme } from '../hooks/useTheme'
import {
  authenticateBiometric,
  isBiometricAvailable,
  isBiometricEnabled,
  setBiometricEnabled as persistBiometricEnabled,
} from '../services/BiometricService'

export default function SettingsSecurityScreen() {
  const { colors, withAlpha } = useTheme()
  const [biometricAvailable, setBiometricAvailable] = React.useState(false)
  const [biometricEnabled, setBiometricEnabledState] = React.useState(false)

  useFocusEffect(
    React.useCallback(() => {
      let mounted = true

      const loadState = async () => {
        const [available, enabled] = await Promise.all([
          isBiometricAvailable(),
          isBiometricEnabled(),
        ])

        if (!mounted) return
        setBiometricAvailable(available)
        setBiometricEnabledState(enabled)
      }

      loadState()

      return () => {
        mounted = false
      }
    }, [])
  )

  const handleBiometricToggle = async (nextValue: boolean) => {
    if (!biometricAvailable) return

    if (nextValue) {
      const authenticated = await authenticateBiometric()
      if (!authenticated) return
    }

    await persistBiometricEnabled(nextValue)
    setBiometricEnabledState(nextValue)
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Heading size="2xl" weight="800">Segurança</Heading>
        <Text color="mutedForeground" style={styles.description}>
          Proteja sua conta com autenticação adicional.
        </Text>

        <View
          style={[
            styles.actionRow,
            {
              borderColor: withAlpha(colors.border, 0.8),
              backgroundColor: withAlpha(colors.card, 0.78),
              opacity: biometricAvailable ? 1 : 0.6,
            },
          ]}
        >
          <View style={styles.actionLeft}>
            <Ionicons name="finger-print-outline" size={22} color={colors.primary} />
            <View>
              <Text weight="700" size="lg">Login com Biometria</Text>
              <Text size="xs" color="mutedForeground">
                {biometricAvailable ? 'Use digital/face para entrar no app.' : 'Biometria indisponivel neste dispositivo.'}
              </Text>
            </View>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={handleBiometricToggle}
            disabled={!biometricAvailable}
            trackColor={{
              false: withAlpha(colors.mutedForeground, 0.35),
              true: withAlpha(colors.primary, 0.55),
            }}
            thumbColor={biometricEnabled ? colors.primary : colors.card}
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  content: {
    gap: 10,
  },
  description: {
    marginBottom: 12,
  },
  actionRow: {
    minHeight: 68,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
})
