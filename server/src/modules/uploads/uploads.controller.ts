import { Request, Response } from 'express'
import { AuthRequest } from '../../middlewares/auth.middleware'
import { uploadsService } from './uploads.service'
import { AppError } from '../../shared/AppError'

type MulterFile = Express.Multer.File

export const uploadsController = {
  async uploadImage(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest
      if (!authReq.user) return res.status(401).json({ error: 'Não autenticado' })

      const file = req.file as MulterFile | undefined
      const folder = typeof req.body?.folder === 'string' ? req.body.folder : undefined

      if (!file) return res.status(400).json({ error: 'file obrigatório' })

      const uploaded = await uploadsService.uploadImage({
        userId: authReq.user.id,
        file: {
          buffer: file.buffer,
          mimetype: file.mimetype,
          originalname: file.originalname,
          size: file.size,
        },
        folder,
      })

      return res.status(201).json(uploaded)
    } catch (err: any) {
      const statusCode = err instanceof AppError ? err.statusCode : err.statusCode ?? 500
      return res.status(statusCode).json({ error: err.message ?? 'Erro' })
    }
  },
}

