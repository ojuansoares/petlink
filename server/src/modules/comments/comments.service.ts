import { AppError } from '../../shared/AppError'
import { commentsRepository } from './comments.repository'

export const commentsService = {
  async listByPost(postId: string) {
    return commentsRepository.listByPost(postId)
  },

  async create(postId: string, authorId: string, content: string) {
    if (!content?.trim()) throw new AppError('Conteúdo é obrigatório', 400)
    return commentsRepository.create(postId, authorId, content.trim())
  },

  async delete(commentId: string, authorId: string) {
    const deleted = await commentsRepository.delete(commentId, authorId)
    if (!deleted) throw new AppError('Comentário não encontrado ou sem permissão', 404)
  },
}
