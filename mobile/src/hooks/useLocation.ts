import { useState, useCallback } from 'react'
import * as ExpoLocation from 'expo-location'
import { useAppDispatch } from '../store'
import { showToast } from '../store/slices/uiSlice'

interface LocationResult {
  city: string
  state: string
  formatted: string
}

export function useLocation() {
  const dispatch = useAppDispatch()
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)

  const getCurrentLocation = useCallback(async (): Promise<LocationResult | null> => {
    setIsLoadingLocation(true)

    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync()

      if (status !== 'granted') {
        dispatch(showToast({ type: 'info', message: 'Permissão de localização negada. Selecione manualmente.' }))
        return null
      }

      const location = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      })

      const { latitude, longitude } = location.coords

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        {
          headers: {
            'User-Agent': 'PetLink/1.0 (petlink.app@gmail.com)',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Geocoding request failed')
      }

      const data = await response.json()

      const city =
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.municipality ||
        null

      const state = data.address?.state || null

      if (!city || !state) {
        dispatch(showToast({ type: 'info', message: 'Não foi possível identificar a cidade. Selecione manualmente.' }))
        return null
      }

      const stateCode = extractStateCode(state)

      return {
        city,
        state: stateCode,
        formatted: `${city}, ${stateCode}`,
      }
    } catch (error) {
      const isNetworkError = error instanceof TypeError && error.message.includes('Network')
      dispatch(showToast({
        type: 'error',
        message: isNetworkError
          ? 'Sem conexão para buscar localização.'
          : 'Erro ao buscar localização.',
      }))
      return null
    } finally {
      setIsLoadingLocation(false)
    }
  }, [dispatch])

  return { getCurrentLocation, isLoadingLocation }
}

function extractStateCode(stateFullName: string): string {
  const stateMap: Record<string, string> = {
    'acre': 'AC', 'alagoas': 'AL', 'amapá': 'AP', 'amazonas': 'AM',
    'bahia': 'BA', 'ceará': 'CE', 'distrito federal': 'DF',
    'espírito santo': 'ES', 'goiás': 'GO', 'maranhão': 'MA',
    'mato grosso': 'MT', 'mato Grosso do sul': 'MS', 'minas gerais': 'MG',
    'pará': 'PA', 'paraíba': 'PB', 'paraná': 'PR', 'pernambuco': 'PE',
    'piauí': 'PI', 'rio de janeiro': 'RJ', 'rio Grande do norte': 'RN',
    'rio Grande do sul': 'RS', 'rondônia': 'RO', 'roraima': 'RR',
    'santa catalina': 'SC', 'são paulo': 'SP', 'sergipe': 'SE', 'tocantins': 'TO',
  }

  const normalized = stateFullName.toLowerCase().trim()
  return stateMap[normalized] || stateFullName.slice(0, 2).toUpperCase()
}