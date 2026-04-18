/**
 * Injecta transformações de otimização em URLs do Cloudinary.
 *
 * Cloudinary aceita parâmetros de transformação no path da URL no formato:
 *   .../upload/<transformações>/v123/...
 *
 * Exemplos de uso:
 *   optimizeCloudinaryUrl(url, 'feed')   → largura 800px, auto-format, auto-quality
 *   optimizeCloudinaryUrl(url, 'thumb')  → largura 400px, height 400px, crop fill
 *   optimizeCloudinaryUrl(url, 'avatar') → largura 120px, height 120px, crop fill
 */

type ImageContext = 'feed' | 'thumb' | 'avatar'

const TRANSFORMS: Record<ImageContext, string> = {
  feed: 'f_auto,q_auto:good,w_800',
  thumb: 'f_auto,q_auto:eco,w_400,h_400,c_fill',
  avatar: 'f_auto,q_auto:eco,w_120,h_120,c_fill',
}

export function optimizeCloudinaryUrl(
  url: string | null | undefined,
  context: ImageContext = 'feed'
): string | null {
  if (!url) return null

  // Só aplica se for uma URL do Cloudinary
  if (!url.includes('res.cloudinary.com')) return url

  // Evita aplicar duplicado
  if (url.includes('/upload/f_auto') || url.includes('/upload/q_auto') || url.includes('/upload/w_')) {
    return url
  }

  const transforms = TRANSFORMS[context]

  // Insere as transformações logo após /upload/
  const optimized = url.replace('/upload/', `/upload/${transforms}/`)
  return optimized
}

/**
 * Aplica otimização a todos os posts de uma lista.
 * image_url → context 'feed' ou 'thumb' dependendo do uso.
 * profiles.avatar_url → context 'avatar'.
 */
export function optimizePostUrls<T extends {
  image_url: string
  profiles?: { name: string; avatar_url: string | null } | null
}>(posts: T[], imageContext: ImageContext = 'feed'): T[] {
  return posts.map((post) => ({
    ...post,
    image_url: optimizeCloudinaryUrl(post.image_url, imageContext) ?? post.image_url,
    profiles: post.profiles
      ? {
          ...post.profiles,
          avatar_url: optimizeCloudinaryUrl(post.profiles.avatar_url, 'avatar'),
        }
      : post.profiles,
  }))
}
