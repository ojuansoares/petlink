import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Switch, View } from 'react-native'
import { Heading, Text } from '../components/ui/Typography'
import { useTheme } from '../hooks/useTheme'

export default function SettingsNotificationsScreen() {
  const { colors, withAlpha } = useTheme()
  const [receiveNotifications, setReceiveNotifications] = React.useState(true)

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Heading size="2xl" weight="800">Alertas</Heading>
        <Text color="mutedForeground" style={styles.description}>
          Gerencie como o PetLink se comunica com você. Desative se preferir o silêncio.
        </Text>

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
            onValueChange={setReceiveNotifications}
            trackColor={{
              false: withAlpha(colors.mutedForeground, 0.35),
              true: withAlpha(colors.primary, 0.55),
            }}
            thumbColor={receiveNotifications ? colors.primary : colors.card}
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
  },
})
