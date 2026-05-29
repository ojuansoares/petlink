import React, { useEffect, useRef, useState } from 'react'
import {
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTheme } from '../hooks/useTheme'
import { Heading, Text } from '../components/ui/Typography'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { useAppSelector } from '../store'
import { selectProfile } from '../store/slices/profileSlice'
import { selectActivePetId, selectPetsList } from '../store/slices/petsSlice'
import { getVaccinesByPetId } from '../api/vaccine.api'
import { Vaccine } from '../data/models'
import { AppStackParamList } from '../navigation/types'
import { fetchReminders, ReminderItem } from '../api/reminders.api'
import { format, parseISO } from 'date-fns'

type NavProp = StackNavigationProp<AppStackParamList>

export default function HomeScreen() {
  const { colors, withAlpha, mode } = useTheme()
  const { width: screenWidth } = useWindowDimensions()
  const cardWidth = screenWidth - 32
  const navigation = useNavigation<NavProp>()
  const pets = useAppSelector(selectPetsList)
  const activePetId = useAppSelector(selectActivePetId)
  const activePet = pets.find(p => p.id === activePetId) || (pets.length > 0 ? pets[0] : null)
  const profile = useAppSelector(selectProfile)

  const [allVaccines, setAllVaccines] = useState<Vaccine[]>([])
  const [vaccinesLoading, setVaccinesLoading] = useState(false)
  const [nextVaccine, setNextVaccine] = useState<Vaccine | null>(null)

  const [reminders, setReminders] = useState<ReminderItem[]>([])
  const [remindersLoading, setRemindersLoading] = useState(false)

  const bannerScrollRef = useRef<ScrollView>(null)
  const [bannerIndex, setBannerIndex] = useState(0)
  const bannerCount = 2

  useEffect(() => {
    const interval = setInterval(() => {
      setBannerIndex(prev => {
        const next = prev + 1
        if (next >= bannerCount) return 0
        return next
      })
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    bannerScrollRef.current?.scrollTo({ x: bannerIndex * (cardWidth + 16), animated: true })
  }, [bannerIndex, cardWidth])

  useEffect(() => {
    if (!activePet?.id) return
    setVaccinesLoading(true)
    getVaccinesByPetId(activePet.id)
      .then((vaccines) => {
        setAllVaccines(vaccines)
        const upcoming = vaccines
          .filter(v => !v.is_completed)
          .sort((a, b) => {
            const aDate = a.next_dose_at || a.doses?.find(d => !d.applied)?.date || ''
            const bDate = b.next_dose_at || b.doses?.find(d => !d.applied)?.date || ''
            return aDate.localeCompare(bDate)
          })
        setNextVaccine(upcoming[0] || null)
      })
      .catch(() => {
        setAllVaccines([])
        setNextVaccine(null)
      })
      .finally(() => setVaccinesLoading(false))
  }, [activePet?.id])

  useEffect(() => {
    if (!activePet?.id) return
    setRemindersLoading(true)
    fetchReminders()
      .then(setReminders)
      .catch(() => setReminders([]))
      .finally(() => setRemindersLoading(false))
  }, [activePet?.id])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  const speciesLabel = activePet?.species
    ? activePet.species.charAt(0).toUpperCase() + activePet.species.slice(1)
    : null

  const weightLabel = activePet?.weight_kg != null
    ? `${activePet.weight_kg} kg`
    : null

  const hasWeightData = !!(activePet?.weight_kg || activePet?.weight_history?.length)
  const hasVaccineData = allVaccines.length > 0
  const isPetSparse = activePet && !hasWeightData && !hasVaccineData

  const nextVaccineLabel = (() => {
    if (vaccinesLoading) return 'Carregando...'
    if (!nextVaccine) return 'Nenhuma pendente'
    const doseDate = nextVaccine.next_dose_at || nextVaccine.doses?.find(d => !d.applied)?.date
    if (!doseDate) return nextVaccine.name
    try {
      return `${nextVaccine.name} — ${format(parseISO(doseDate), 'dd/MM')}`
    } catch {
      return nextVaccine.name
    }
  })()

  const nextVaccineUrgent = (() => {
    if (!nextVaccine) return false
    const doseDate = nextVaccine.next_dose_at || nextVaccine.doses?.find(d => !d.applied)?.date
    if (!doseDate) return false
    try {
      return parseISO(doseDate) <= new Date()
    } catch {
      return false
    }
  })()

  function renderNoPetState() {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: withAlpha(colors.border, 0.6) }]}>
        <View style={[styles.emptyIconWrapper, { backgroundColor: withAlpha(colors.primary, 0.1) }]}>
          <Ionicons name="paw" size={48} color={colors.primary} />
        </View>
        <Heading size="2xl" weight="800" style={{ textAlign: 'center', marginTop: 16 }}>
          Bem-vindo ao PetLink!
        </Heading>
        <Text style={{ textAlign: 'center', marginTop: 8, lineHeight: 22 }} color="mutedForeground">
          Cadastre seu primeiro pet e comece a acompanhar vacinas, alimentação, passeios e muito mais.
        </Text>
        <Button
          label="Adicionar pet"
          onPress={() => navigation.navigate('Pets' as never)}
          style={{ marginTop: 24, width: '100%' }}
        />
      </View>
    )
  }

  function renderPetSparseOnboarding() {
    if (!activePet) return null
    return (
      <Card variant="organic" style={[styles.onboardingCard, { backgroundColor: mode === 'light' ? '#F0FDF4' : '#142b1b', borderColor: '#22c55e33' }]}>
        <View style={styles.onboardingContent}>
          <View style={[styles.onboardingIcon, { backgroundColor: withAlpha('#22C55E', 0.1) }]}>
            <Ionicons name="sparkles" size={24} color="#22C55E" />
          </View>
          <View style={styles.onboardingText}>
            <Text weight="700" style={{ color: '#22C55E' }}>Que tal começar?</Text>
            <Text size="sm" style={{ color: '#22C55E', opacity: 0.8, marginTop: 2 }}>
              Registre o peso e as vacinas do {activePet.name} para acompanhar a saúde.
            </Text>
          </View>
        </View>
        <View style={styles.onboardingActions}>
          <Pressable
            onPress={() => navigation.navigate('Vaccine', { petId: activePet.id, petName: activePet.name })}
            style={[styles.onboardingActionBtn, { backgroundColor: withAlpha('#22C55E', 0.1) }]}
          >
            <Ionicons name="medical" size={18} color="#22C55E" />
            <Text size="xs" weight="700" style={{ color: '#22C55E' }}>Vacinas</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('Consultation', { petId: activePet.id, petName: activePet.name })}
            style={[styles.onboardingActionBtn, { backgroundColor: withAlpha('#22C55E', 0.1) }]}
          >
            <Ionicons name="scale" size={18} color="#22C55E" />
            <Text size="xs" weight="700" style={{ color: '#22C55E' }}>Peso</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('FeedingPlan', { petId: activePet.id, petName: activePet.name })}
            style={[styles.onboardingActionBtn, { backgroundColor: withAlpha('#22C55E', 0.1) }]}
          >
            <Ionicons name="restaurant" size={18} color="#22C55E" />
            <Text size="xs" weight="700" style={{ color: '#22C55E' }}>Alimentação</Text>
          </Pressable>
        </View>
      </Card>
    )
  }

  function renderReminder(item: ReminderItem, index: number) {
    const isVaccine = item.type === 'vaccine'
    const accentColor = isVaccine ? '#22C55E' : '#3B82F6'
    const iconName = isVaccine ? 'medical' : 'calendar'
    const bgColor = mode === 'light' ? (isVaccine ? '#F0FDF4' : '#EFF6FF') : (isVaccine ? '#142b1b' : '#13233a')

    return (
      <Pressable
        key={item.id}
        onPress={() => {
          if (isVaccine) {
            navigation.navigate('Vaccine', { petId: item.petId, petName: item.petName, vaccineId: item.data.vaccineId as string | undefined })
          } else {
            navigation.navigate('Consultation', { petId: item.petId, petName: item.petName })
          }
        }}
      >
        <Card variant="organic" style={[styles.reminderCard, { backgroundColor: bgColor, borderColor: `${accentColor}33` }]}>
          <View style={[styles.iconCircle, { backgroundColor: withAlpha(accentColor, 0.1) }]}>
            <Ionicons name={iconName as any} size={24} color={accentColor} />
          </View>
          <View style={styles.reminderInfo}>
            <Text weight="800" style={{ color: accentColor }} numberOfLines={1}>{item.title}</Text>
            <Text size="xs" style={{ color: accentColor, opacity: 0.8 }} numberOfLines={1}>
              {item.petName} — {item.overdue ? '⚠️ Vencida' : item.date}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={accentColor} />
        </Card>
      </Pressable>
    )
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text size="sm" color="mutedForeground">{greeting}!</Text>
          <Heading size="3xl" weight="800">{profile?.name || 'Humano'} 👋</Heading>
        </View>
        <Pressable onPress={() => navigation.navigate('Profile' as never)}>
          <Avatar
            name={profile?.name || 'Usuario'}
            source={profile?.avatar_url ? { uri: profile.avatar_url } : undefined}
            size={48}
          />
        </Pressable>
      </View>

      {/* PET DASHBOARD / EMPTY STATE */}
      {activePet ? (
        <>
          <Pressable
            onPress={() => navigation.navigate('Pets' as never)}
            style={[styles.dashboardCard, { backgroundColor: colors.card, borderColor: withAlpha(colors.border, 0.6) }]}
          >
            <View style={styles.dashboardLeft}>
              <Avatar
                name={activePet.name}
                source={activePet.photo_url ? { uri: activePet.photo_url } : undefined}
                size={72}
              />
            </View>
            <View style={styles.dashboardRight}>
              <Heading size="xl" weight="800">{activePet.name}</Heading>
              <View style={styles.dashboardTags}>
                {speciesLabel && (
                  <View style={[styles.tag, { backgroundColor: withAlpha(colors.primary, 0.1) }]}>
                    <Text size="xs" weight="700" color="primary">{speciesLabel}</Text>
                  </View>
                )}
                {activePet.breed && (
                  <View style={[styles.tag, { backgroundColor: withAlpha(colors.mutedForeground, 0.1) }]}>
                    <Text size="xs" weight="700" style={{ color: colors.mutedForeground }}>{activePet.breed}</Text>
                  </View>
                )}
              </View>
              <View style={styles.dashboardStats}>
                {weightLabel && (
                  <View style={styles.statItem}>
                    <Ionicons name="scale-outline" size={16} color={colors.mutedForeground} />
                    <Text size="sm" color="mutedForeground">{weightLabel}</Text>
                  </View>
                )}
                <View style={styles.statItem}>
                  <Ionicons
                    name={nextVaccineUrgent ? 'warning' : 'medical-outline'}
                    size={16}
                    color={nextVaccineUrgent ? '#EF4444' : colors.mutedForeground}
                  />
                  <Text
                    size="sm"
                    style={{ color: nextVaccineUrgent ? '#EF4444' : colors.mutedForeground }}
                    numberOfLines={1}
                  >
                    {nextVaccineLabel}
                  </Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} style={styles.dashboardArrow} />
          </Pressable>

          {isPetSparse && renderPetSparseOnboarding()}
        </>
      ) : (
        renderNoPetState()
      )}

      {/* QUICK ACTIONS */}
      {activePet && (
        <View style={[styles.quickActionsRow, screenWidth < 400 && styles.quickActionsRowNarrow]}>
          <Pressable
            onPress={() => navigation.navigate('Feed' as never)}
            style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: withAlpha(colors.border, 0.6) }, screenWidth < 400 && styles.quickActionBtnNarrow]}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: withAlpha(colors.primary, 0.1) }]}>
              <Ionicons name="add-circle" size={22} color={colors.primary} />
            </View>
            <Text size="xs" weight="700" style={{ marginTop: 4 }}>Criar post</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('Weight' as never)}
            style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: withAlpha(colors.border, 0.6) }, screenWidth < 400 && styles.quickActionBtnNarrow]}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: withAlpha('#22C55E', 0.1) }]}>
              <Ionicons name="scale-outline" size={22} color="#22C55E" />
            </View>
            <Text size="xs" weight="700" style={{ marginTop: 4 }}>Registrar peso</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('Consultation', { petId: activePet.id, petName: activePet.name })}
            style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: withAlpha(colors.border, 0.6) }, screenWidth < 400 && styles.quickActionBtnNarrow]}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: withAlpha('#3B82F6', 0.1) }]}>
              <Ionicons name="calendar" size={22} color="#3B82F6" />
            </View>
            <Text size="xs" weight="700" style={{ marginTop: 4 }}>Agendar consulta</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('FeedingPlan', { petId: activePet.id, petName: activePet.name })}
            style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: withAlpha(colors.border, 0.6) }, screenWidth < 400 && styles.quickActionBtnNarrow]}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: withAlpha('#F97316', 0.1) }]}>
              <Ionicons name="restaurant" size={22} color="#F97316" />
            </View>
            <Text size="xs" weight="700" style={{ marginTop: 4 }}>Alimentação</Text>
          </Pressable>
        </View>
      )}

      {/* BANNER CAROUSEL */}
      <ScrollView
        ref={bannerScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + 16}
        decelerationRate="fast"
        contentContainerStyle={styles.bannerRow}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / (cardWidth + 16))
          setBannerIndex(idx)
        }}
      >
        <ImageBackground
          source={require('../assets/banner_happy_dog.jpg')}
          style={[styles.banner, { backgroundColor: colors.primary, width: cardWidth, aspectRatio: 1.8 }]}
          imageStyle={styles.bannerImage}
        >
          <View style={styles.bannerOverlay}>
            <View style={styles.bannerContent}>
              <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text size="xs" weight="700" style={{ color: '#fff' }}>DICA DO DIA</Text>
              </View>
              <Heading size="xl" weight="800" style={styles.bannerTitle}>
                Mantenha seu pet hidratado no verão! ☀️
              </Heading>
              <Pressable style={styles.bannerButton}>
                <Text size="sm" weight="700" style={{ color: colors.primary }}>Ler mais</Text>
              </Pressable>
            </View>
          </View>
        </ImageBackground>

        <View style={[styles.banner, { backgroundColor: '#7048E8', width: cardWidth, aspectRatio: 1.8 }]}>
           <View style={styles.bannerContent}>
              <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text size="xs" weight="700" style={{ color: '#fff' }}>PETLINK PLUS</Text>
              </View>
              <Heading size="xl" weight="800" style={styles.bannerTitle}>
                Assine o plano para pets ilimitados! 🐾
              </Heading>
              <Pressable style={[styles.bannerButton, { backgroundColor: '#fff' }]}>
                <Text size="sm" weight="700" style={{ color: '#7048E8' }}>Ver planos</Text>
              </Pressable>
            </View>
            <View style={styles.bannerDecoration}>
               <Ionicons name="sparkles" size={80} color="rgba(255,255,255,0.1)" />
            </View>
        </View>
      </ScrollView>

      {/* Banner Dots */}
      <View style={styles.bannerDotsRow}>
        {Array.from({ length: bannerCount }).map((_, i) => (
          <Pressable
            key={i}
            onPress={() => {
              setBannerIndex(i)
              bannerScrollRef.current?.scrollTo({ x: i * (cardWidth + 16), animated: true })
            }}
          >
            <View
              style={[
                styles.bannerDot,
                {
                  backgroundColor: i === bannerIndex ? colors.primary : withAlpha(colors.mutedForeground, 0.3),
                  width: i === bannerIndex ? 20 : 8,
                },
              ]}
            />
          </Pressable>
        ))}
      </View>

      {/* LEMBRETES REAIS */}
      {activePet && (
        <>
          <View style={styles.sectionHeader}>
            <Heading size="xl" weight="800">Lembretes</Heading>
          </View>

          {remindersLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 16 }} />
          ) : reminders.length > 0 ? (
            reminders.map(renderReminder)
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <Ionicons name="checkmark-circle-outline" size={40} color={colors.mutedForeground} />
              <Text style={{ marginTop: 8 }} color="mutedForeground">Nenhum lembrete pendente</Text>
            </View>
          )}
        </>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 24,
  },
  emptyIconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 24,
  },
  dashboardLeft: {
    marginRight: 16,
  },
  dashboardRight: {
    flex: 1,
  },
  dashboardTags: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
  },
  dashboardStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dashboardArrow: {
    marginLeft: 4,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionsRowNarrow: {
    flexWrap: 'wrap',
  },
  quickActionBtn: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  quickActionBtnNarrow: {
    flex: undefined,
    width: '47%',
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardingCard: {
    padding: 16,
    marginBottom: 24,
  },
  onboardingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  onboardingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardingText: {
    flex: 1,
  },
  onboardingActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  onboardingActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
  },
  bannerRow: {
    gap: 16,
    paddingBottom: 24,
  },
  banner: {
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 24,
  },
  bannerImage: {
    opacity: 0.85,
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'flex-end',
    padding: 24,
  },
  bannerContent: {
    gap: 8,
  },
  bannerTitle: {
    color: '#fff',
    lineHeight: 28,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  bannerButton: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 8,
  },
  bannerDecoration: {
    position: 'absolute',
    bottom: -10,
    right: -10,
  },
  bannerDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  bannerDot: {
    height: 8,
    borderRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 16,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderInfo: {
    flex: 1,
  },
})
