import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Modal, Animated, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../hooks/useTheme'
import { Text } from './ui/Typography'

const levelNames = ['Iniciante', 'Aprendiz', 'Dedicado', 'Expert', 'Veterano', 'Mestre', 'Lendário']

interface LevelUpModalProps {
  visible: boolean
  level: number
  onDismiss: () => void
}

export default function LevelUpModal({ visible, level, onDismiss }: LevelUpModalProps) {
  const { colors, withAlpha } = useTheme()
  const scaleAnim = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0)
      fadeAnim.setValue(0)
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start()
    }
  }, [visible, scaleAnim, fadeAnim])

  const name = levelNames[Math.min(level - 1, levelNames.length - 1)] ?? 'Lendário'

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: withAlpha(colors.primary, 0.1) }]}>
            <Ionicons name="trophy" size={48} color={colors.primary} />
          </View>
          <Text weight="800" size="xs" color="mutedForeground" style={{ marginTop: 16 }}>
            SUBIU DE NÍVEL!
          </Text>
          <Text weight="800" size="4xl" style={{ marginTop: 4 }}>Nível {level}</Text>
          <Text weight="600" size="lg" color="mutedForeground" style={{ marginTop: 2 }}>{name}</Text>
          <Text size="sm" color="mutedForeground" style={{ textAlign: 'center', marginTop: 16, lineHeight: 20 }}>
            Continue completando atividades{'\n'}para subir ainda mais!
          </Text>
          <Pressable
            onPress={onDismiss}
            style={[styles.button, { backgroundColor: colors.primary }]}
          >
            <Text weight="800" size="sm" style={{ color: colors.primaryForeground }}>Continuar</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
})
