import { Request, Response } from 'express'
import { AuthRequest } from '../../middlewares/auth.middleware'
import { weatherService } from '../../services/weather.service'

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'

async function geocodeLocation(text: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(text + ', Brasil')}&format=json&limit=1&countrycodes=br`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'PetLinkApp/1.0' },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null
    const lat = parseFloat(data[0].lat)
    const lng = parseFloat(data[0].lon)
    if (!isFinite(lat) || !isFinite(lng)) return null
    return { lat, lng }
  } catch {
    return null
  }
}

export const weatherController = {
  async current(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    let lat = parseFloat(req.query.lat as string)
    let lng = parseFloat(req.query.lng as string)
    const location = req.query.location as string | undefined

    console.log(`[WeatherController] GET /weather/current user=${authReq.user.id} lat=${lat} lng=${lng} location=${location}`)

    // If lat/lng are invalid but location text is provided, geocode
    if ((isNaN(lat) || isNaN(lng)) && location?.trim()) {
      console.log(`[WeatherController] geocodificando location="${location}"`)
      const coords = await geocodeLocation(location.trim())
      if (!coords) {
        return res.status(400).json({ error: 'Localização não reconhecida' })
      }
      lat = coords.lat
      lng = coords.lng
      console.log(`[WeatherController] geocodificado para lat=${lat} lng=${lng}`)
    }

    if (isNaN(lat) || isNaN(lng)) {
      console.log(`[WeatherController] lat/lng inválidos: ${req.query.lat}, ${req.query.lng}`)
      return res.status(400).json({ error: 'lat e lng são obrigatórios' })
    }

    const result = await weatherService.getCurrentWeather(lat, lng)
    if (!result) {
      console.log(`[WeatherController] weatherService retornou null`)
      return res.status(502).json({ error: 'Não foi possível obter dados climáticos' })
    }

    console.log(`[WeatherController] resposta:`, JSON.stringify(result))
    return res.status(200).json(result)
  },
}
