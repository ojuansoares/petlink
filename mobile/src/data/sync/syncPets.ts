import { api } from '../../api/axios'
import { PetsRepository, type OfflinePet } from '../repositories/PetsRepository'

export async function syncPetsFromApi(): Promise<OfflinePet[]> {
  const { data } = await api.get('/pets')
  const pets = (data?.pets ?? []) as OfflinePet[]

  await PetsRepository.replaceAllFromRemote(pets)

  return PetsRepository.getAllWithWeightHistory()
}
