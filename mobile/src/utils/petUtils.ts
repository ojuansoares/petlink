type PetInfo = { name: string }

export function getPetNames(pets: PetInfo[] | PetInfo | undefined | null): string {
  if (!pets) return ''
  if (Array.isArray(pets)) {
    return pets.map(p => p.name).filter(Boolean).join(', ')
  }
  return pets.name ?? ''
}

export function getPetNamesFromIds(
  petIds: string[] | undefined | null,
  allPets: { id: string; name: string }[]
): string {
  if (!petIds?.length || !allPets.length) return ''
  return petIds
    .map(id => allPets.find(p => p.id === id)?.name)
    .filter(Boolean)
    .join(', ')
}
