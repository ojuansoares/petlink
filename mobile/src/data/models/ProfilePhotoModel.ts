import { Model } from '@nozbe/watermelondb'
import { field, text } from '@nozbe/watermelondb/decorators'

export class ProfilePhotoModel extends Model {
  static table = 'profile_photos'

  @text('user_id') userId!: string
  @text('post_id') postId!: string
  @text('image_url') imageUrl!: string
  @text('pet_name') petName!: string | null
  @text('caption') caption!: string | null
  @text('created_at') createdAt!: string
  @field('is_pinned') isPinned!: boolean | null
}