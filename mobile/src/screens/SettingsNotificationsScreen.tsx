import React from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Switch, View, Alert } from 'react-native'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Button } from '../components/ui/Button'
import { Heading, Text } from '../components/ui/Typography'
import { useTheme } from '../hooks/useTheme'

const NOTIF_PREF_KEY = 'petlink.notifications.enabled'
const CATEGORY_KEYS = {
  alimentacao: 'petlink.notifications.category.alimentacao',
  postsLikes: 'petlink.notifications.category.posts_likes',
  postsAmigos: 'petlink.notifications.category.posts_amigos',
  vacinas: 'petlink.notifications.category.vacinas',
} as const

type NotifCategory = keyof typeof CATEGORY_KEYS

const CATEGORY_CONFIG: { key: NotifCategory; icon: string; label: string; desc: string }[] = [
  { key: 'alimentacao', icon: 'restaurant-outline', label: 'Alimentação', desc: 'Lembretes de refeições do pet' },
  { key: 'postsLikes', icon: 'heart-outline', label: 'Posts — curtidas e comentários', desc: 'Interações em suas publicações' },
  { key: 'postsAmigos', icon: 'people-outline', label: 'Posts de amigos', desc: 'Novas publicações de quem você segue' },
  { key: 'vacinas', icon: 'shield-checkmark-outline', label: 'Vacinas / Vermífugos', desc: 'Alertas de doses e prazos' },
]

export default function SettingsNotificationsScreen() {
  const { colors, withAlpha } = useTheme()
  const [receiveNotifications, setReceiveNotifications] = React.useState(true)
  const [categories, setCategories] = React.useState<Record<NotifCategory, boolean>>({
    alimentacao: true,
    postsLikes: true,
    postsAmigos: true,
    vacinas: true,
  })
  useFocusEffect(
    React.useCallback(() => {
      let mounted = true

      const loadState = async () => {
        const [notifPref, ...catPrefs] = await Promise.all([
          AsyncStorage.getItem(NOTIF_PREF_KEY),
          ...Object.values(CATEGORY_KEYS).map((k) => AsyncStorage.getItem(k)),
        ])

        if (!mounted) return
        setReceiveNotifications(notifPref !== 'false')

        const catValues = { ...categories }
        Object.values(CATEGORY_CONFIG).forEach((cfg, i) => {
          if (catPrefs[i] !== null) {
            catValues[cfg.key] = catPrefs[i] === 'true'
          }
        })
        setCategories(catValues)
      }

      loadState()

      return () => {
        mounted = false
      }
    }, [])
  )

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
      Alert.alert('Notificação enviada!', 'Verifique sua central de notificações.')
    } catch {
      Alert.alert('Erro', 'Não foi possível disparar a notificação.')
    }
  }

  const handleNotificationToggle = async (nextValue: boolean) => {
    await AsyncStorage.setItem(NOTIF_PREF_KEY, nextValue ? 'true' : 'false')
    setReceiveNotifications(nextValue)
  }

  const handleCategoryToggle = async (key: NotifCategory, nextValue: boolean) => {
    await AsyncStorage.setItem(CATEGORY_KEYS[key], nextValue ? 'true' : 'false')
    setCategories((prev) => ({ ...prev, [key]: nextValue }))
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Heading size="2xl" weight="800">Alertas</Heading>
        <Text color="mutedForeground" style={styles.description}>
          Gerencie como o PetLink se comunica com você. Desative se preferir o silêncio.
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
            value={receiveNotifications}
            onValueChange={handleNotificationToggle}
            trackColor={{
              false: withAlpha(colors.mutedForeground, 0.35),
              true: withAlpha(colors.primary, 0.55),
            }}
            thumbColor={receiveNotifications ? colors.primary : colors.card}
          />
        </View>

        <View style={styles.subSection}>
          <Text size="xs" weight="800" color="mutedForeground" style={styles.subLabel}>
            NOTIFICAÇÕES POR CATEGORIA
          </Text>
          {CATEGORY_CONFIG.map((cfg) => {
            const enabled = categories[cfg.key]
            return (
              <View
                key={cfg.key}
                style={[
                  styles.actionRow,
                  {
                    borderColor: withAlpha(colors.border, 0.8),
                    backgroundColor: withAlpha(colors.card, 0.78),
                    opacity: receiveNotifications ? 1 : 0.45,
                  },
                ]}
              >
                <View style={styles.actionLeft}>
                  <Ionicons name={cfg.icon as any} size={22} color={receiveNotifications ? colors.primary : colors.mutedForeground} />
                  <View>
                    <Text weight="700" size="lg">{cfg.label}</Text>
                    <Text size="xs" color="mutedForeground">{cfg.desc}</Text>
                  </View>
                </View>
                <Switch
                  value={receiveNotifications && enabled}
                  onValueChange={(v) => handleCategoryToggle(cfg.key, v)}
                  disabled={!receiveNotifications}
                  trackColor={{
                    false: withAlpha(colors.mutedForeground, 0.35),
                    true: withAlpha(colors.primary, 0.55),
                  }}
                  thumbColor={enabled && receiveNotifications ? colors.primary : colors.card}
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
