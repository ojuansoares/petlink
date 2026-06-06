import { Request, Response } from 'express'
import { AuthRequest } from '../../middlewares/auth.middleware'
import { weatherService } from '../../services/weather.service'

export const weatherController = {
  async current(req: Request, res: Response) {
    const authReq = req as AuthRequest
    if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

    const lat = parseFloat(req.query.lat as string)
    const lng = parseFloat(req.query.lng as string)

    console.log(`[WeatherController] GET /weather/current user=${authReq.user.id} lat=${lat} lng=${lng}`)

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
