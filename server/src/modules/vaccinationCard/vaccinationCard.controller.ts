import { Request, Response } from 'express'
import { vaccinationCardService } from './vaccinationCard.service'

export const vaccinationCardController = {
  async generate(req: Request, res: Response) {
    const petId = req.params.petId as string
    const { vaccineIds } = req.body as { vaccineIds?: string[] }

    if (!petId) {
      res.status(400).json({ error: 'petId é obrigatório' })
      return
    }

    const pdf = await vaccinationCardService.generatePdf(petId, vaccineIds ?? [])

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="carteirinha-${petId}.pdf"`)
    res.send(pdf)
  },
}
