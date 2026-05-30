import React, { useEffect, useRef, useState } from 'react'
import {
  ImageBackground,
  Modal,
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
import { selectActivePetId, selectPetsList, selectPetsLoading } from '../store/slices/petsSlice'
import { selectGamification } from '../store/slices/gamificationSlice'
import { getVaccinesByPetId } from '../api/vaccine.api'
import { Vaccine } from '../data/models'
import { AppStackParamList } from '../navigation/types'
import { fetchReminders, ReminderItem } from '../api/reminders.api'
import { WeeklySummaryCard } from '../components/WeeklySummaryCard'
import { homeCacheRepository } from '../data/repositories/HomeCacheRepository'
import { format, parseISO } from 'date-fns'
import { CreatePostModal } from '../components/ui/CreatePostModal'
import { WebView } from 'react-native-webview'

type NavProp = StackNavigationProp<AppStackParamList>

export default function HomeScreen() {
  const { colors, withAlpha, mode } = useTheme()
  const { width: screenWidth } = useWindowDimensions()
  const cardWidth = screenWidth - 32
  const navigation = useNavigation<NavProp>()
  const pets = useAppSelector(selectPetsList)
  const activePetId = useAppSelector(selectActivePetId)
  const petsLoading = useAppSelector(selectPetsLoading)
  const profile = useAppSelector(selectProfile)
  const gamificationStats = useAppSelector(selectGamification)

  const [showCreatePost, setShowCreatePost] = useState(false)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [webViewLoading, setWebViewLoading] = useState(false)
  const [petCarouselIndex, setPetCarouselIndex] = useState(0)
  const petCarouselRef = useRef<ScrollView>(null)
  const activePet = pets.length > 0
    ? (pets[petCarouselIndex] ?? pets[0])
    : null

  useEffect(() => {
    if (pets.length > 0) {
      const idx = activePetId ? pets.findIndex(p => p.id === activePetId) : 0
      setPetCarouselIndex(Math.max(0, idx))
    }
  }, [pets.length, activePetId])

  const [nextVaccineMap, setNextVaccineMap] = useState<Record<string, { label: string; urgent: boolean; count: number }>>({})
  const [vaccinesLoading, setVaccinesLoading] = useState(false)

  const [reminders, setReminders] = useState<ReminderItem[]>([])
  const [remindersLoading, setRemindersLoading] = useState(false)

  const bannerScrollRef = useRef<ScrollView>(null)
  const [bannerIndex, setBannerIndex] = useState(0)
  const banners = [
    {
      badge: 'DICA DO DIA',
      title: 'Mantenha seu pet hidratado no verão! ☀️',
      subtitle: 'Água fresca sempre disponível e nunca deixe no sol forte.',
      image: require('../assets/banner_dica.png'),
      url: 'https://vetnil.com.br/hidratacao-pet-confira-algumas-dicas-para-manter-caes-e-gatos-hidratados/',
    },
    {
      badge: 'EMERGÊNCIA',
      title: 'Número de emergência veterinária 24h',
      subtitle: 'Salve contatos de clínicas 24h perto de você.',
      image: require('../assets/banner_emergencia.png'),
      url: 'https://www.google.com/search?q=clinica+veterinaria+24h+perto+mim',
    },
    {
      badge: 'COMPORTAMENTO',
      title: 'Dicas de adestramento positivo 🐾',
      subtitle: 'Reforço positivo fortalece o vínculo com seu pet.',
      image: require('../assets/banner_comportamento.png'),
      url: 'https://www.petz.com.br/blog/reforco-positivo/',
    },
  ]
  const bannerCount = banners.length

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
    if (pets.length === 0) return
    setVaccinesLoading(true)

    const promises = pets.map(async (pet) => {
      try {
        let vaccines: Vaccine[] = []
        try {
          vaccines = await getVaccinesByPetId(pet.id)
          homeCacheRepository.saveNextVaccine(pet.id, vaccines)
        } catch {
          const cached = await homeCacheRepository.getNextVaccine<Vaccine[]>(pet.id)
          if (cached) vaccines = cached
        }

        const upcoming = vaccines
          .filter(v => !v.is_completed)
          .sort((a, b) => {
            const aDate = a.next_dose_at || a.doses?.find(d => !d.applied)?.date || ''
            const bDate = b.next_dose_at || b.doses?.find(d => !d.applied)?.date || ''
            return aDate.localeCompare(bDate)
          })

        const nextV = upcoming[0] || null
        if (!nextV) {
          return { petId: pet.id, label: 'Nenhuma', urgent: false, count: vaccines.length }
        }

        const doseDate = nextV.next_dose_at || nextV.doses?.find(d => !d.applied)?.date
        if (!doseDate) {
          return { petId: pet.id, label: nextV.name, urgent: false, count: vaccines.length }
        }

        let label = nextV.name
        try {
          label = `${nextV.name} — ${format(parseISO(doseDate), 'dd/MM')}`
        } catch {}

        let urgent = false
        try {
          urgent = parseISO(doseDate) <= new Date()
        } catch {}

        return { petId: pet.id, label, urgent, count: vaccines.length }
      } catch {
        return { petId: pet.id, label: 'Nenhuma', urgent: false, count: 0 }
      }
    })

    Promise.all(promises).then((results) => {
      const newMap: Record<string, { label: string; urgent: boolean; count: number }> = {}
      for (const res of results) {
        if (res) {
          newMap[res.petId] = { label: res.label, urgent: res.urgent, count: res.count }
        }
      }
      setNextVaccineMap(newMap)
      setVaccinesLoading(false)
    })
  }, [pets])

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

  const hasWeightData = !!(activePet?.weight_kg || activePet?.weight_history?.length)
  const hasVaccineData = (nextVaccineMap[activePet?.id || '']?.count ?? 0) > 0
  const isPetSparse = activePet && !hasWeightData && !hasVaccineData

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
            onPress={() => navigation.navigate('Consultation', { petId: activePet.id, petName: activePet.name, autoOpenModal: true })}
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

    const formattedDate = (() => {
      try {
        return format(parseISO(item.date), 'dd/MM/yyyy')
      } catch {
        return item.date
      }
    })()

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
              {item.petName} — {item.overdue ? '⚠️ Vencida' : formattedDate}
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
            level={gamificationStats?.level}
          />
        </Pressable>
      </View>

      {/* PET DASHBOARD / EMPTY STATE */}
      {pets.length > 0 ? (
        <>
          <ScrollView
            ref={petCarouselRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={cardWidth + 16}
            decelerationRate="fast"
            contentContainerStyle={{ gap: 16, paddingBottom: 4 }}
            style={{ marginBottom: pets.length > 1 ? 2 : 16 }}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / (cardWidth + 16))
              setPetCarouselIndex(idx)
            }}
          >
            {pets.map((pet) => {
              const isCurrentPet = pet.id === activePet?.id
              return (
                <Pressable
                  key={pet.id}
                  onPress={() => navigation.navigate('ActivityTimeline', { petId: pet.id, petName: pet.name })}
                  style={[
                    styles.dashboardCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: withAlpha(colors.border, 0.6),
                      width: cardWidth,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={styles.dashboardLeft}>
                      <Avatar
                        name={pet.name}
                        source={pet.photo_url ? { uri: pet.photo_url } : undefined}
                        size={72}
                      />
                    </View>
                    <View style={styles.dashboardRight}>
                      <Heading size="xl" weight="800">{pet.name}</Heading>
                      <View style={styles.dashboardTags}>
                        {pet.species && (
                          <View style={[styles.tag, { backgroundColor: withAlpha(colors.primary, 0.1) }]}>
                            <Text size="xs" weight="700" color="primary">
                              {pet.species.charAt(0).toUpperCase() + pet.species.slice(1)}
                            </Text>
                          </View>
                        )}
                        {pet.breed && (
                          <View style={[styles.tag, { backgroundColor: withAlpha(colors.mutedForeground, 0.1) }]}>
                            <Text size="xs" weight="700" style={{ color: colors.mutedForeground }}>{pet.breed}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.dashboardStats}>
                        {pet.weight_kg != null && (
                          <View style={styles.statItem}>
                            <Ionicons name="scale-outline" size={16} color={colors.mutedForeground} />
                            <Text size="sm" color="mutedForeground">{pet.weight_kg} kg</Text>
                          </View>
                        )}
                        {(() => {
                          const vaccineInfo = nextVaccineMap[pet.id] || { label: vaccinesLoading ? 'Carregando...' : 'Nenhuma', urgent: false }
                          return (
                            <View style={[styles.statItem, { flex: 1 }]}>
                              <Ionicons
                                name={vaccineInfo.urgent ? 'warning' : 'medical-outline'}
                                size={16}
                                color={vaccineInfo.urgent ? '#EF4444' : colors.mutedForeground}
                              />
                              <Text
                                size="sm"
                                style={{ color: vaccineInfo.urgent ? '#EF4444' : colors.mutedForeground, flexShrink: 1 }}
                                numberOfLines={1}
                              >
                                {vaccineInfo.label}
                              </Text>
                            </View>
                          )
                        })()}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} style={styles.dashboardArrow} />
                  </View>
                </Pressable>
              )
            })}
          </ScrollView>

          {pets.length > 1 && (
            <View style={[styles.bannerDotsRow, { marginTop: 2, marginBottom: 12 }]}>  
              {pets.map((_, i) => (
                <Pressable
                  key={i}
                  onPress={() => {
                    setPetCarouselIndex(i)
                    petCarouselRef.current?.scrollTo({ x: i * (cardWidth + 16), animated: true })
                  }}
                >
                  <View
                    style={[
                      styles.bannerDot,
                      {
                        backgroundColor: i === petCarouselIndex ? colors.primary : withAlpha(colors.mutedForeground, 0.3),
                        width: i === petCarouselIndex ? 20 : 8,
                      },
                    ]}
                  />
                </Pressable>
              ))}
            </View>
          )}

          {isPetSparse && renderPetSparseOnboarding()}
        </>
      ) : petsLoading ? (
        <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: withAlpha(colors.border, 0.6), justifyContent: 'center', alignItems: 'center', minHeight: 120 }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text color="mutedForeground" size="sm" style={{ marginTop: 12 }}>Carregando seus pets...</Text>
        </View>
      ) : (
        renderNoPetState()
      )}

      {/* QUICK ACTIONS */}
      {activePet && (
        <View style={[styles.quickActionsRow, screenWidth < 400 && styles.quickActionsRowNarrow, { marginBottom: 16 }]}>  
          <Pressable
            onPress={() => setShowCreatePost(true)}
            style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: withAlpha(colors.border, 0.6) }, screenWidth < 400 ? { width: (screenWidth - 32 - 10) / 2 } : { width: (screenWidth - 32 - 30) / 4 }]}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: withAlpha(colors.primary, 0.1) }]}>
              <Ionicons name="add-circle" size={22} color={colors.primary} />
            </View>
            <Text size="xs" weight="700" style={{ marginTop: 4 }}>Criar post</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('Tabs', { screen: 'Pets', params: { openWeightModal: true } } as any)}
            style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: withAlpha(colors.border, 0.6) }, screenWidth < 400 ? { width: (screenWidth - 32 - 10) / 2 } : { width: (screenWidth - 32 - 30) / 4 }]}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: withAlpha('#22C55E', 0.1) }]}>
              <Ionicons name="scale-outline" size={22} color="#22C55E" />
            </View>
            <Text size="xs" weight="700" style={{ marginTop: 4 }}>Registrar peso</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('Consultation', { petId: activePet.id, petName: activePet.name, autoOpenModal: true })}
            style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: withAlpha(colors.border, 0.6) }, screenWidth < 400 ? { width: (screenWidth - 32 - 10) / 2 } : { width: (screenWidth - 32 - 30) / 4 }]}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: withAlpha('#3B82F6', 0.1) }]}>
              <Ionicons name="calendar" size={22} color="#3B82F6" />
            </View>
            <Text size="xs" weight="700" style={{ marginTop: 4 }}>Agendar consulta</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('FeedingPlan', { petId: activePet.id, petName: activePet.name })}
            style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: withAlpha(colors.border, 0.6) }, screenWidth < 400 ? { width: (screenWidth - 32 - 10) / 2 } : { width: (screenWidth - 32 - 30) / 4 }]}
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
        {banners.map((b, i) => (
          <ImageBackground
            key={i}
            source={b.image}
            style={[styles.banner, { width: cardWidth, aspectRatio: 1.6 }]}
            imageStyle={styles.bannerImage}
          >
            <View style={styles.bannerOverlay}>
              <View style={styles.bannerShade} />
              <View style={styles.bannerContent}>
                <View style={[styles.badge, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
                  <Text size="xs" weight="700" style={{ color: '#fff' }}>{b.badge}</Text>
                </View>
                <View style={styles.bannerText}>
                  <Heading size="base" weight="800" style={styles.bannerTitle}>
                    {b.title}
                  </Heading>
                  {b.subtitle && (
                    <Text size="xs" style={{ color: '#fff', opacity: 0.95 }} numberOfLines={1}>
                      {b.subtitle}
                    </Text>
                  )}
                </View>
                <Pressable style={[styles.bannerButton, { backgroundColor: 'rgba(255,255,255,0.9)' }]} onPress={() => setBannerUrl(b.url)}>
                  <Text size="xs" weight="700" style={{ color: '#000' }}>Ler mais</Text>
                </Pressable>
              </View>
            </View>
          </ImageBackground>
        ))}
      </ScrollView>

      {/* Banner Dots */}
      <View style={styles.bannerDotsRow}>
        {banners.map((_, i) => (
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

      {/* RESUMO DA SEMANA */}
      {pets.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <WeeklySummaryCard pets={pets} />
        </View>
      )}

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

      <CreatePostModal visible={showCreatePost} onClose={() => setShowCreatePost(false)} />

      {bannerUrl && (
        <Modal visible transparent animationType="slide" statusBarTranslucent>
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text weight="700" size="sm" numberOfLines={1} style={{ flex: 1 }}>Artigo</Text>
              <Pressable onPress={() => setBannerUrl(null)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </Pressable>
            </View>
            {webViewLoading && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, zIndex: 1 }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text size="sm" color="mutedForeground" style={{ marginTop: 12 }}>Carregando artigo...</Text>
              </View>
            )}
            <WebView
              source={{ uri: bannerUrl }}
              style={{ flex: 1 }}
              onLoadStart={() => setWebViewLoading(true)}
              onLoadEnd={() => setWebViewLoading(false)}
            />
          </View>
        </Modal>
      )}
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
    marginBottom: 0,
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
    justifyContent: 'space-between',
    width: '100%',
  },
  quickActionsRowNarrow: {
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionBtn: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  quickActionBtnNarrow: {
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
    paddingBottom: 0,
  },
  banner: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  bannerImage: {
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    overflow: 'hidden',
  },
  bannerShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  bannerContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 24,
  },
  bannerText: {
    alignItems: 'flex-start',
  },
  bannerTitle: {
    color: '#fff',
    marginBottom: 1,
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
  bannerDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
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
