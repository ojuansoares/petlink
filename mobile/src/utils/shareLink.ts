import { Share, Platform } from 'react-native'

const DEEP_LINK_BASE = 'petlink://'

export function profileLink(userId: string): string {
  return `${DEEP_LINK_BASE}profile/${userId}`
}

export function petLink(ownerId: string, petId: string): string {
  return `${DEEP_LINK_BASE}profile/${ownerId}?petId=${petId}`
}

export function webFallbackProfile(userId: string): string {
  return `https://petlink.app/profile/${userId}`
}

export async function shareProfile(userId: string, userName: string) {
  const url = profileLink(userId)
  await Share.share({
    message: `${userName} está no PetLink! 🐾\n\n${url}`,
    title: 'Perfil PetLink',
    url: Platform.OS === 'ios' ? url : undefined,
  })
}

export async function sharePet(ownerId: string, petId: string, petName: string) {
  const url = petLink(ownerId, petId)
  await Share.share({
    message: `Conheça ${petName} no PetLink! 🐾\n\n${url}`,
    title: 'Pet no PetLink',
    url: Platform.OS === 'ios' ? url : undefined,
  })
}
