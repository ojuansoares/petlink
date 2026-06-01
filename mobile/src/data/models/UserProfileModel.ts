import { Model } from '@nozbe/watermelondb'
import { field, text } from '@nozbe/watermelondb/decorators'

export class UserProfileModel extends Model {
  static table = 'user_profiles'

  @text('name') name!: string
  @text('email') email!: string | null
  @text('location') location!: string | null
  @field('created_at') createdAt!: number
  @text('avatar_url') avatarUrl!: string | null
  @text('bio') bio!: string | null
  @field('updated_at') updatedAt!: number
  @field('pets_count') petsCount!: number
  @field('posts_count') postsCount!: number
  @field('followers_count') followersCount!: number
  @field('following_count') followingCount!: number
  @text('birth_date') birthDate!: string | null
}
