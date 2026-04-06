import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, View } from 'react-native'
import { Heading, Text } from '../components/ui/Typography'
import { useTheme } from '../hooks/useTheme'
import { useAppDispatch, useAppSelector } from '../store'
import { selectThemeMode, setThemeMode } from '../store/slices/uiSlice'

type ThemeOption = {
  label: 'Claro' | 'Escuro'
  value: 'light' | 'dark'
  icon: keyof typeof Ionicons.glyphMap
}

const OPTIONS: readonly ThemeOption[] = [
  { label: 'Claro', value: 'light', icon: 'sunny-outline' },
  { label: 'Escuro', value: 'dark', icon: 'moon-outline' },
]

export default function ThemeSettingsScreen() {
  const dispatch = useAppDispatch()
  const mode = useAppSelector(selectThemeMode)
  const { colors, withAlpha } = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Heading size="2xl" weight="800">Tema</Heading>
      <Text color="mutedForeground">Escolha como o app deve aparecer.</Text>

      <View style={styles.items}>
        {OPTIONS.map((option) => {
          const selected = mode === option.value
          const itemBackgroundColor = selected
            ? withAlpha(colors.primary, 0.08)
            : colors.card

          return (
            <Pressable
              key={option.value}
              onPress={() => dispatch(setThemeMode(option.value))}
              style={({ pressed }) => [
                styles.item,
                {
                  borderColor: selected ? colors.primary : withAlpha(colors.border, 0.8),
                  backgroundColor: pressed ? withAlpha(colors.primary, 0.1) : itemBackgroundColor,
                },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: withAlpha(colors.primary, 0.14) }]}>
                <Ionicons name={option.icon} size={20} color={colors.primary} />
              </View>
              <Text weight="700" size="lg">{option.label}</Text>
              {selected ? (
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={colors.primary}
                  style={styles.check}
                />
              ) : null}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 10,
  },
  items: {
    marginTop: 10,
    gap: 10,
  },
  item: {
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  check: {
    marginLeft: 'auto',
  },
})
