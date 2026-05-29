import React, { useEffect, useRef, useState } from 'react'
import { View, ScrollView, ActivityIndicator, StyleSheet, Animated, TouchableOpacity, Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../hooks/useTheme'
import { Text } from './ui/Typography'
import { useAppDispatch, useAppSelector } from '../store'
import {
  fetchGamificationThunk,
  selectGamification,
  selectNewlyUnlockedIds,
  clearNewlyUnlocked,
  selectIsLoadingGamification,
} from '../store/slices/gamificationSlice'
import type { AchievementData } from '../api/gamification.api'
import { format, parseISO } from 'date-fns'

const levelNames = ['Iniciante', 'Aprendiz', 'Dedicado', 'Expert', 'Veterano', 'Mestre', 'Lendário']

function LevelBar({ current, max }: { current: number; max: number }) {
  const { colors } = useTheme()
  const pct = max > 0 ? Math.min(current / max, 1) : 0
  return (
    <View style={[styles.levelBarBg, { backgroundColor: colors.muted }]}>
      <View style={[styles.levelBarFill, { width: `${pct * 100}%`, backgroundColor: colors.primary }]} />
    </View>
  )
}

function BadgeDetailModal({ achievement, visible, onClose }: { achievement: AchievementData | null; visible: boolean; onClose: () => void }) {
  const { colors, withAlpha } = useTheme()
  if (!achievement) return null

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.modalIconWrap, { backgroundColor: achievement.unlocked ? withAlpha('#fbbf24', 0.15) : withAlpha(colors.muted, 0.5) }]}>
            <Ionicons
              name={(achievement.icon || 'trophy-outline') as any}
              size={40}
              color={achievement.unlocked ? '#fbbf24' : colors.mutedForeground}
            />
          </View>
          <Text weight="800" size="lg" style={{ marginTop: 12, textAlign: 'center' }}>{achievement.name}</Text>
          {achievement.description && (
            <Text size="sm" color="mutedForeground" style={{ textAlign: 'center', marginTop: 6, lineHeight: 18 }}>
              {achievement.description}
            </Text>
          )}
          <View style={[styles.modalBadgeRow, { backgroundColor: withAlpha(colors.muted, 0.3) }]}>
            <Ionicons name="flash" size={16} color={colors.primary} />
            <Text weight="700" size="sm" style={{ marginLeft: 4 }}>+{achievement.xp_reward} XP</Text>
          </View>
          {achievement.unlocked && achievement.unlocked_at && (
            <Text size="xs" color="mutedForeground" style={{ marginTop: 10 }}>
              Desbloqueada em {format(parseISO(achievement.unlocked_at), 'dd/MM/yyyy')}
            </Text>
          )}
          <TouchableOpacity
            onPress={onClose}
            style={[styles.modalButton, { backgroundColor: colors.primary }]}
          >
            <Text weight="800" size="sm" style={{ color: colors.primaryForeground }}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  )
}

function AchievementBadge({ achievement, size = 'small', newlyUnlocked = false, onPress }: { achievement: AchievementData; size?: 'small' | 'medium'; newlyUnlocked?: boolean; onPress?: () => void }) {
  const { colors, withAlpha } = useTheme()
  const isMedium = size === 'medium'
  const dimension = isMedium ? 80 : 64
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (!newlyUnlocked) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [newlyUnlocked, pulseAnim])

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.badge, { width: dimension, opacity: achievement.unlocked ? 1 : 0.5 }]}>
      <Animated.View
        style={[
          styles.badgeIcon,
          {
            width: dimension - 8,
            height: dimension - 8,
            borderRadius: (dimension - 8) / 2,
            backgroundColor: achievement.unlocked
              ? withAlpha('#fbbf24', 0.15)
              : withAlpha(colors.muted, 0.5),
            borderColor: achievement.unlocked ? '#fbbf24' : colors.border,
            transform: newlyUnlocked ? [{ scale: pulseAnim }] : undefined,
          },
        ]}
      >
        <Ionicons
          name={(achievement.icon || 'trophy-outline') as any}
          size={isMedium ? 28 : 22}
          color={achievement.unlocked ? '#fbbf24' : colors.mutedForeground}
        />
        {newlyUnlocked && (
          <View style={styles.newBadge}>
            <Text size="xs" weight="800" style={{ color: '#fff', fontSize: 8 }}>NOVA</Text>
          </View>
        )}
      </Animated.View>
      <Text
        size="xs"
        weight="600"
        numberOfLines={2}
        style={{ textAlign: 'center', marginTop: 4, color: achievement.unlocked ? colors.foreground : colors.mutedForeground }}
      >
        {achievement.name}
      </Text>
    </TouchableOpacity>
  )
}

function AchievementProgressRow({ achievement }: { achievement: AchievementData }) {
  const { colors, withAlpha } = useTheme()
  const pct = Math.min(achievement.progress, 1)

  return (
    <View style={[styles.progressCard, { backgroundColor: withAlpha(colors.muted, 0.4), borderColor: colors.border }]}>
      <View style={styles.progressHeader}>
        <View style={[styles.progressIconWrap, { backgroundColor: withAlpha(colors.muted, 0.5) }]}>
          <Ionicons
            name={(achievement.icon || 'trophy-outline') as any}
            size={20}
            color={colors.mutedForeground}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text weight="700" size="sm">{achievement.name}</Text>
          <Text size="xs" color="mutedForeground" numberOfLines={1}>{achievement.description}</Text>
        </View>
        <View style={styles.progressXpBadge}>
          <Ionicons name="flash" size={12} color={colors.primary} />
          <Text weight="700" size="xs" style={{ marginLeft: 2 }}>+{achievement.xp_reward}</Text>
        </View>
      </View>
      <View style={styles.progressRow}>
        <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${pct * 100}%`,
                backgroundColor: pct >= 1 ? '#22c55e' : colors.primary,
              },
            ]}
          />
        </View>
        <Text size="xs" weight="700" style={{ marginLeft: 8, minWidth: 36, textAlign: 'right' }}>
          {Math.round(pct * 100)}%
        </Text>
      </View>
    </View>
  )
}

export default function GamificationSection() {
  const { colors, withAlpha } = useTheme()
  const dispatch = useAppDispatch()
  const stats = useAppSelector(selectGamification)
  const newlyUnlockedIds = useAppSelector(selectNewlyUnlockedIds)
  const loading = useAppSelector(selectIsLoadingGamification)
  const [detailAchievement, setDetailAchievement] = useState<AchievementData | null>(null)

  useEffect(() => {
    dispatch(fetchGamificationThunk())
    return () => { dispatch(clearNewlyUnlocked()) }
  }, [dispatch])

  const inProgress = stats?.nextAchievements.filter((a) => a.progress > 0 && a.progress < 1) ?? []
  const locked = stats?.nextAchievements.filter((a) => a.progress <= 0) ?? []

  if (loading && !stats) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (!stats) {
    return (
      <View style={styles.center}>
        <Ionicons name="trophy-outline" size={48} color={colors.mutedForeground} />
        <Text color="mutedForeground" style={{ marginTop: 12 }}>Erro ao carregar conquistas</Text>
      </View>
    )
  }

  const showEmptyUnlocked = stats.unlockedAchievements.length === 0

  return (
    <>
      <BadgeDetailModal achievement={detailAchievement} visible={!!detailAchievement} onClose={() => setDetailAchievement(null)} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Level Card */}
        <View style={[styles.levelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.levelHeader}>
            <View style={[styles.levelBadge, { backgroundColor: withAlpha(colors.primary, 0.1) }]}>
              <Ionicons name="trophy" size={28} color={colors.primary} />
            </View>
            <View style={styles.levelInfo}>
              <Text size="xs" color="mutedForeground" weight="700">NÍVEL {stats.level}</Text>
              <Text size="lg" weight="800">{levelNames[Math.min(stats.level - 1, levelNames.length - 1)] ?? 'Lendário'}</Text>
            </View>
          </View>
          <View style={styles.xpRow}>
            <Text size="sm" weight="600">{stats.xpInLevel} / {stats.xpToNext} XP</Text>
            <Text size="xs" color="mutedForeground">Total: {stats.totalXp} XP</Text>
          </View>
          <LevelBar current={stats.xpInLevel} max={stats.xpToNext} />
        </View>

        {/* Unlocked Badges */}
        {showEmptyUnlocked ? (
          <View style={[styles.emptySection, { backgroundColor: withAlpha(colors.muted, 0.3), borderColor: colors.border }]}>
            <Ionicons name="sparkles-outline" size={32} color={colors.mutedForeground} />
            <Text weight="700" size="sm" style={{ marginTop: 10, textAlign: 'center' }}>
              Nenhuma conquista desbloqueada ainda
            </Text>
            <Text size="xs" color="mutedForeground" style={{ marginTop: 4, textAlign: 'center' }}>
              Continue usando o app para desbloquear badges!
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 24 }}>
            <Text weight="800" size="sm" style={{ marginBottom: 12 }}>CONQUISTAS DESBLOQUEADAS</Text>
            <View style={styles.badgeGrid}>
              {stats.unlockedAchievements.map((ach) => (
                <AchievementBadge
                  key={ach.id}
                  achievement={ach}
                  size="medium"
                  newlyUnlocked={newlyUnlockedIds.includes(ach.id)}
                  onPress={() => setDetailAchievement(ach)}
                />
              ))}
            </View>
          </View>
        )}

        {/* In Progress */}
        {inProgress.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text weight="800" size="sm" style={{ marginBottom: 12 }}>EM ANDAMENTO</Text>
            {inProgress.map((ach) => (
              <AchievementProgressRow key={ach.id} achievement={ach} />
            ))}
          </View>
        )}

        {/* Locked / All Achievements */}
        {locked.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text weight="800" size="sm" style={{ marginBottom: 12 }}>BLOQUEADAS</Text>
            {locked.map((ach) => (
              <AchievementProgressRow key={ach.id} achievement={ach} />
            ))}
          </View>
        )}
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  levelCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  levelBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelInfo: {
    flex: 1,
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  levelBarBg: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  levelBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badge: {
    alignItems: 'center',
  },
  badgeIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emptySection: {
    marginTop: 24,
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
  },
  progressCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressXpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  progressBar: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  newBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#22c55e',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalCard: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  modalButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
})
