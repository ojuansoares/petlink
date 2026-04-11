import type { UploadApiResponse } from 'cloudinary'
import { env } from '../../config/env'
import { cloudinary } from '../../config/cloudinary'
import { AppError } from '../../shared/AppError'

function isCloudinaryConfigured() {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_SECRET
  )
}

function uploadBufferToCloudinary(params: {
  buffer: Buffer
  folder: string
  publicId?: string
  resourceType: 'image'
}) {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: params.folder,
        public_id: params.publicId,
        resource_type: params.resourceType,
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Upload falhou'))
        resolve(result)
      }
    )

    stream.end(params.buffer)
  })
}

function extractCloudinaryPublicId(url: string) {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.includes('res.cloudinary.com')) return null
    if (!parsed.pathname.includes(`/${env.CLOUDINARY_CLOUD_NAME}/`)) return null

    const match = parsed.pathname.match(/\/(?:image|video|raw)\/upload\/(?:v\d+\/)?(.+)$/)
    if (!match?.[1]) return null

    const withExtension = decodeURIComponent(match[1])
    const publicId = withExtension.replace(/\.[^/.]+$/, '')
    return publicId || null
  } catch {
    return null
  }
}

export const uploadsService = {
  async uploadImage(args: {
    userId: string
    file: { buffer: Buffer; mimetype: string; originalname: string; size: number }
    folder?: string
  }) {
    const { file } = args

    if (!isCloudinaryConfigured()) {
      throw new AppError('Cloudinary não configurado no servidor', 503)
    }

    if (!file?.buffer?.length) throw new AppError('Arquivo obrigatório', 400)
    if (!file.mimetype?.startsWith('image/')) throw new AppError('Tipo de arquivo inválido (somente imagem)', 400)

    const maxBytes = 8 * 1024 * 1024
    if (file.size > maxBytes) throw new AppError('Imagem muito grande (máx 8MB)', 413)

    const folder = (args.folder?.trim() || `petlink/${args.userId}`).replace(/\/+$/, '')

    const result = await uploadBufferToCloudinary({
      buffer: file.buffer,
      folder,
      resourceType: 'image',
    })

    return {
      url: result.secure_url,
      publicId: result.public_id,
      bytes: result.bytes,
      format: result.format,
      width: result.width,
      height: result.height,
    }
  },

  async deleteImageByUrl(url?: string | null) {
    if (!isCloudinaryConfigured()) return false
    if (!url) return false
    const publicId = extractCloudinaryPublicId(url)
    if (!publicId) return false

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
    })

    return result.result === 'ok' || result.result === 'not found'
  },

  isManagedCloudinaryUrl(url?: string | null) {
    if (!url) return false
    if (!isCloudinaryConfigured()) return false
    return Boolean(extractCloudinaryPublicId(url))
  },
}

