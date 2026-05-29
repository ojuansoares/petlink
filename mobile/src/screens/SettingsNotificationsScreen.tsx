import React, { useState, useEffect, useCallback } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Switch, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import { useAppDispatch, useAppSelector } from '../store'
import {
  fetchPreferencesThunk,
  updatePreferencesThunk,
  selectPreferences,
  selectPrefsLoading,
} from '../store/slices/notificationsSlice'
import { Button } from '../components/ui/Button'
import { Heading, Text } from '../components/ui/Typography'
import { useTheme } from '../hooks/useTheme'

// ─── AsyncStorage keys (read by NotificationService) ─────────
const ASYNC_PREFIX = 'petlink.notifications.'
const ASYNC_KEYS = {
  enabled:      ASYNC_PREFIX + 'enabled',
  alimentacao:  ASYNC_PREFIX + 'alimentacao',
  vacinas:      ASYNC_PREFIX + 'vacinas',
  social_likes: ASYNC_PREFIX + 'social_likes',
  social_follows: ASYNC_PREFIX + 'social_follows',
  aniversario:  ASYNC_PREFIX + 'aniversario',
} as const

const CATEGORIES: { key: keyof typeof ASYNC_KEYS; icon: string; label: string; desc: string }[] = [
  { key: 'alimentacao',   icon: 'restaurant-outline',     label: 'Alimentação',    desc: 'Lembretes de refeições do pet' },
  { key: 'vacinas',       icon: 'shield-checkmark-outline', label: 'Vacinas / Vermífugos', desc: 'Alertas de doses e prazos' },
  { key: 'aniversario',   icon: 'cake-outline',            label: 'Aniversário',    desc: 'Lembretes de aniversário do pet' },
  { key: 'social_likes',  icon: 'heart-outline',           label: 'Curtidas e comentários', desc: 'Interações em suas publicações' },
  { key: 'social_follows', icon: 'people-outline',          label: 'Novos seguidores', desc: 'Quando alguém seguir você' },
]

export default function SettingsNotificationsScreen() {
  const { colors, withAlpha } = useTheme()
  const dispatch = useAppDispatch()
  const serverPrefs = useAppSelector(selectPreferences)
  const prefsLoading = useAppSelector(selectPrefsLoading)

  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    enabled: true,
    alimentacao: true,
    vacinas: true,
    aniversario: true,
    social_likes: true,
    social_follows: true,
  })

  // Load server + AsyncStorage on mount
  useEffect(() => {
    dispatch(fetchPreferencesThunk())
    const loadAsync = async () => {
      const entries = await AsyncStorage.multiGet(Object.values(ASYNC_KEYS))
      const fromAsync: Record<string, boolean> = {}
      const keyMap = Object.entries(ASYNC_KEYS)
      entries.forEach(([storageKey, val], i) => {
        const field = keyMap.find(([, v]) => v === storageKey)?.[0]
        if (field && val !== null) fromAsync[field] = val === 'true'
      })
      setPrefs(prev => ({ ...prev, ...fromAsync }))
    }
    loadAsync()
  }, [dispatch])

  // Merge server prefs when they arrive
  useEffect(() => {
    if (serverPrefs) {
      setPrefs(prev => ({ ...prev, ...serverPrefs }))
    }
  }, [serverPrefs])

  const persistToggle = useCallback(async (key: keyof typeof ASYNC_KEYS, value: boolean) => {
    await AsyncStorage.setItem(ASYNC_KEYS[key], value ? 'true' : 'false')
    setPrefs(prev => ({ ...prev, [key]: value }))
    dispatch(updatePreferencesThunk({ [key]: value }))
  }, [dispatch])

  const handleMasterToggle = useCallback(async (value: boolean) => {
    await AsyncStorage.setItem(ASYNC_KEYS.enabled, value ? 'true' : 'false')
    setPrefs(prev => ({ ...prev, enabled: value }))
    dispatch(updatePreferencesThunk({ enabled: value }))
    if (!value) {
      // when disabling all, also disable all category prefs locally
      for (const cat of CATEGORIES) {
        await AsyncStorage.setItem(ASYNC_KEYS[cat.key], 'false')
        setPrefs(prev => ({ ...prev, [cat.key]: false }))
        dispatch(updatePreferencesThunk({ [cat.key]: false }))
      }
    }
  }, [dispatch])

  const handleTestNotification = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔔 PetLink',
          body: 'Esta é uma notificação de teste!',
          data: { type: 'test' },
        },
        trigger: null,
      })
    } catch {
      // silent
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Heading size="2xl" weight="800">Alertas</Heading>
        <Text color="mutedForeground" style={styles.description}>
          Gerencie como o PetLink se comunica com você.
        </Text>

        <Button label="Enviar notificação de teste" onPress={handleTestNotification} variant="outline" />

        <View
          style={[
            styles.actionRow,
            {
              borderColor: withAlpha(colors.border, 0.8),
              backgroundColor: withAlpha(colors.card, 0.78),
            },
          ]}
        >
          <View style={styles.actionLeft}>
            <Ionicons name="notifications-outline" size={22} color={colors.primary} />
            <View>
              <Text weight="700" size="lg">Receber Notificações</Text>
              <Text size="xs" color="mutedForeground">Avisos de cuidados, banhos e alertas.</Text>
            </View>
          </View>
          <Switch
            value={prefs.enabled}
            onValueChange={handleMasterToggle}
            trackColor={{
              false: withAlpha(colors.mutedForeground, 0.35),
              true: withAlpha(colors.primary, 0.55),
            }}
            thumbColor={prefs.enabled ? colors.primary : colors.card}
          />
        </View>

        <View style={styles.subSection}>
          <Text size="xs" weight="800" color="mutedForeground" style={styles.subLabel}>
            NOTIFICAÇÕES POR CATEGORIA
          </Text>
          {CATEGORIES.map((cfg) => {
            const enabled = prefs[cfg.key]
            return (
              <View
                key={cfg.key}
                style={[
                  styles.actionRow,
                  {
                    borderColor: withAlpha(colors.border, 0.8),
                    backgroundColor: withAlpha(colors.card, 0.78),
                    opacity: prefs.enabled ? 1 : 0.45,
                  },
                ]}
              >
                <View style={styles.actionLeft}>
                  <Ionicons name={cfg.icon as any} size={22} color={prefs.enabled ? colors.primary : colors.mutedForeground} />
                  <View>
                    <Text weight="700" size="lg">{cfg.label}</Text>
                    <Text size="xs" color="mutedForeground">{cfg.desc}</Text>
                  </View>
                </View>
                <Switch
                  value={prefs.enabled && enabled}
                  onValueChange={(v) => persistToggle(cfg.key, v)}
                  disabled={!prefs.enabled}
                  trackColor={{
                    false: withAlpha(colors.mutedForeground, 0.35),
                    true: withAlpha(colors.primary, 0.55),
                  }}
                  thumbColor={enabled && prefs.enabled ? colors.primary : colors.card}
                />
              </View>
            )
          })}
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
  subSection: {
    gap: 6,
  },
  subLabel: {
    paddingLeft: 4,
    marginTop: 4,
    marginBottom: 2,
  },
})
