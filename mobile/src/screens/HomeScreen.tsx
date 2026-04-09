import React from 'react'
import {
  Image,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../hooks/useTheme'
import { Heading, Text } from '../components/ui/Typography'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useAppSelector } from '../store'
import { selectActivePetId, selectPetsList } from '../store/slices/petsSlice'

const { width } = Dimensions.get('window')
const CARD_WIDTH = width - 32

export default function HomeScreen() {
  const { colors, withAlpha, mode } = useTheme()
  const pets = useAppSelector(selectPetsList)
  const activePetId = useAppSelector(selectActivePetId)
  const activePet = pets.find(p => p.id === activePetId) || (pets.length > 0 ? pets[0] : null)

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text size="sm" color="mutedForeground">Bem-vindo de volta!</Text>
          <Heading size="3xl" weight="800">Olá, Humano! 👋</Heading>
        </View>
        <Pressable style={[styles.avatarButton, { borderColor: colors.border }]}>
          <Image 
            source={{ uri: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' }} 
            style={styles.avatar} 
          />
        </Pressable>
      </View>

      {/* BANNER CAROUSEL (STATIC) */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        snapToInterval={CARD_WIDTH + 16}
        decelerationRate="fast"
        contentContainerStyle={styles.bannerRow}
      >
        <ImageBackground
          source={require('../assets/banner_happy_dog.png')}
          style={[styles.banner, { backgroundColor: colors.primary }]}
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

        <View style={[styles.banner, { backgroundColor: '#7048E8' }]}>
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

      {/* LEMBRETES (MODAL-STYLE CARDS) */}
      <View style={styles.sectionHeader}>
        <Heading size="xl" weight="800">Lembretes</Heading>
        <Pressable><Text color="primary" weight="700">Ver tudo</Text></Pressable>
      </View>

      <Card variant="organic" style={[styles.reminderCard, { backgroundColor: mode === 'light' ? '#F0FDF4' : '#142b1b', borderColor: '#22c55e33' }]}>
        <View style={[styles.iconCircle, { backgroundColor: withAlpha('#22C55E', 0.1) }]}>
          <Ionicons name="medical" size={24} color="#22C55E" />
        </View>
        <View style={styles.reminderInfo}>
          <Text weight="800" style={{ color: '#22C55E' }}>Vacina Antirrábica</Text>
          <Text size="xs" style={{ color: '#22C55E', opacity: 0.8 }}>Agendado para amanhã às 09:00</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#22C55E" />
      </Card>

      <Card variant="organic" style={[styles.reminderCard, { backgroundColor: mode === 'light' ? '#FFF7ED' : '#331d10', borderColor: '#f9731633' }]}>
        <View style={[styles.iconCircle, { backgroundColor: withAlpha('#F97316', 0.1) }]}>
          <Ionicons name="restaurant" size={24} color="#F97316" />
        </View>
        <View style={styles.reminderInfo}>
          <Text weight="800" style={{ color: '#F97316' }}>Alimentação - Almoço</Text>
          <Text size="xs" style={{ color: '#F97316', opacity: 0.8 }}>Já deu comida para o {activePet?.name || 'seu pet'}?</Text>
        </View>
        <Button label="Feito" size="sm" style={{ backgroundColor: '#F97316', paddingHorizontal: 16 }} />
      </Card>

      {/* PESO E SAÚDE (GRAPH) */}
      <View style={styles.sectionHeader}>
        <Heading size="xl" weight="800">Evolução de Peso</Heading>
        <View style={[styles.infoBadge, { backgroundColor: withAlpha(colors.primary, 0.1) }]}>
           <Text size="xs" weight="700" color="primary">Meta: {activePet?.weight_kg ? activePet.weight_kg + 2 : '12'}kg</Text>
        </View>
      </View>

      <Card variant="organic" style={[styles.graphCard, { backgroundColor: colors.card }]}>
        <View style={styles.graphHeader}>
           <View>
              <Text size="xs" color="mutedForeground">Última pesagem</Text>
              <Heading size="2xl" weight="900">{activePet?.weight_kg || '0'} kg</Heading>
           </View>
           <View style={styles.trendUp}>
              <Ionicons name="trending-up" size={16} color="#22C55E" />
              <Text weight="700" style={{ color: '#22C55E' }}> +0.5kg</Text>
           </View>
        </View>

        <View style={styles.chartContainer}>
           <View style={styles.chartBars}>
              {[40, 65, 55, 85, 70, 95, 80].map((h, i) => (
                <View key={i} style={styles.barColumn}>
                  <View 
                    style={[
                      styles.chartBar, 
                      { 
                        height: h, 
                        backgroundColor: i === 5 ? colors.primary : withAlpha(colors.primary, 0.2),
                        borderRadius: 12,
                      }
                    ]} 
                  />
                  <Text size="xs" color="mutedForeground" style={{ marginTop: 4 }}>{['S', 'T', 'Q', 'Q', 'S', 'S', 'D'][i]}</Text>
                </View>
              ))}
           </View>
        </View>
      </Card>

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
    paddingTop: Platform.OS === 'ios' ? 64 : 56,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  avatarButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    padding: 2,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  bannerRow: {
    gap: 16,
    paddingBottom: 24,
  },
  banner: {
    width: CARD_WIDTH,
    height: 180,
    borderRadius: 32,
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
    top: -20,
    right: -10,
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
  infoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  graphCard: {
    padding: 24,
    marginBottom: 12,
  },
  graphHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  trendUp: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  chartContainer: {
    height: 120,
    justifyContent: 'flex-end',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  chartBar: {
    width: 14,
    minHeight: 10,
  },
})
