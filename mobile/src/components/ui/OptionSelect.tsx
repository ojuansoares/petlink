import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
  Image,
} from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { Text } from './Typography'

interface SelectOption {
  label: string
  value: string
  photoUrl?: string | null
}

interface OptionSelectProps {
  label?: string
  placeholder: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  leftIconName?: keyof typeof Ionicons.glyphMap
  showPhotos?: boolean
  onLocationPress?: () => void
  isLoadingLocation?: boolean
}

export function OptionSelect({
  label,
  placeholder,
  value,
  options,
  onChange,
  leftIconName = 'location-outline',
  showPhotos = false,
  onLocationPress,
  isLoadingLocation = false,
}: Readonly<OptionSelectProps>) {
  const { colors, withAlpha } = useTheme()
  const [open, setOpen] = React.useState(false)

  const selectedOption = options.find((option) => option.value === value)

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text size="xs" weight="700" style={[styles.label, { color: colors.mutedForeground }]}>
          {label}
        </Text>
      ) : null}

      <Pressable
        style={[
          styles.field,
          {
            borderColor: colors.border,
            backgroundColor: withAlpha(colors.card, 0.8),
          },
        ]}
        onPress={() => setOpen(true)}
      >
        {showPhotos && selectedOption?.photoUrl ? (
          <Image source={{ uri: selectedOption.photoUrl }} style={styles.fieldPhoto} />
        ) : (
          <Ionicons name={leftIconName} size={18} color={colors.mutedForeground} />
        )}
        <Text size="base" style={[styles.fieldText, { color: selectedOption ? colors.foreground : colors.mutedForeground }]}>
          {selectedOption?.label ?? placeholder}
        </Text>

        {onLocationPress && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.()
              onLocationPress()
            }}
            hitSlop={8}
            style={styles.locationButton}
            disabled={isLoadingLocation}
          >
            {isLoadingLocation ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="navigate-circle-outline" size={22} color={colors.primary} />
            )}
          </Pressable>
        )}

        <Ionicons name="chevron-down" size={18} color={colors.mutedForeground} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />

          <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text size="base" weight="700" style={styles.title}>{label || 'Selecione'}</Text>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = item.value === value

                return (
                  <Pressable
                    style={[
                      styles.option,
                      {
                        borderColor: colors.border,
                        backgroundColor: selected ? withAlpha(colors.primary, 0.12) : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      onChange(item.value)
                      setOpen(false)
                    }}
                  >
                    {showPhotos && item.photoUrl ? (
                      <View style={styles.optionRow}>
                        <Image source={{ uri: item.photoUrl }} style={styles.optionPhoto} />
                        <Text size="sm" weight={selected ? '700' : '400'}>{item.label}</Text>
                      </View>
                    ) : (
                      <Text size="sm" weight={selected ? '700' : '400'}>{item.label}</Text>
                    )}
                  </Pressable>
                )
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    gap: 6,
  },
  label: {
    marginLeft: 12,
  },
  field: {
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldText: {
    flex: 1,
  },
  fieldPhoto: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    padding: 18,
  },
  sheet: {
    width: '100%',
    maxHeight: '70%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  title: {
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  option: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionPhoto: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  locationButton: {
    padding: 4,
  },
})