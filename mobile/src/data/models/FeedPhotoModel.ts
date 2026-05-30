import { Model } from '@nozbe/watermelondb'
import { field, text } from '@nozbe/watermelondb/decorators'

export class FeedPhotoModel extends Model {
  static table = 'feed_photos'

  @text('post_id') postId!: string
  @text('image_url') imageUrl!: string
  @text('author_id') authorId!: string
  @text('pet_id') petId!: string | null
  @text('caption') caption!: string | null
  @text('location') location!: string | null
  @field('is_pinned') isPinned!: boolean | null
  @field('created_at') createdAt!: number
  @field('updated_at') updatedAt!: number
  @text('author_name') authorName!: string | null
  @text('author_avatar_url') authorAvatarUrl!: string | null
  @text('pet_name') petName!: string | null
}