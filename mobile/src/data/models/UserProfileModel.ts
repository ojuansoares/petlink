import { Model } from '@nozbe/watermelondb'
import { field, text } from '@nozbe/watermelondb/decorators'

export class UserProfileModel extends Model {
  static table = 'user_profiles'

  @text('name') name!: string
  @text('email') email!: string | null
  @text('location') location!: string | null
  @text('created_at') createdAt!: string
  @text('avatar_url') avatarUrl!: string | null
  @text('bio') bio!: string | null
  @text('updated_at') updatedAt!: string | null
  @field('pets_count') petsCount!: number
  @text('birth_date') birthDate!: string | null
}
