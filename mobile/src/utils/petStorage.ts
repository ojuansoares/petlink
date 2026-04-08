import AsyncStorage from '@react-native-async-storage/async-storage'

const ACTIVE_PET_ID_KEY = 'petlink.active_pet_id'

export async function writeActivePetId(id: string | null) {
  try {
    if (id) {
      await AsyncStorage.setItem(ACTIVE_PET_ID_KEY, id)
    } else {
      await AsyncStorage.removeItem(ACTIVE_PET_ID_KEY)
    }
  } catch (e) {
    console.warn('[PetStorage] Fail to write pet id', e)
  }
}

export async function readActivePetId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACTIVE_PET_ID_KEY)
  } catch (e) {
    console.warn('[PetStorage] Fail to read pet id', e)
    return null
  }
}
