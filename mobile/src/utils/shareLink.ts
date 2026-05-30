import { Share, Platform } from 'react-native'

const DEEP_LINK_BASE = 'https://petlink.app'
const DEEP_LINK_FALLBACK = 'petlink://'

export function profileLink(userId: string): string {
  return `${DEEP_LINK_BASE}/profile/${userId}`
}

export function petLink(ownerId: string, petId: string): string {
  return `${DEEP_LINK_BASE}/profile/${ownerId}?petId=${petId}`
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

export function groupLink(groupId: string): string {
  return `${DEEP_LINK_BASE}/group/${groupId}`
}

export async function shareGroup(groupId: string, groupName: string) {
  const url = groupLink(groupId)
  await Share.share({
    message: `Participe do grupo "${groupName}" no PetLink! 🐾\n\n${url}`,
    title: 'Grupo PetLink',
    url: Platform.OS === 'ios' ? url : undefined,
  })
}
