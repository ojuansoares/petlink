import { Model } from '@nozbe/watermelondb'
import { field, text } from '@nozbe/watermelondb/decorators'

export class PetModel extends Model {
  static table = 'pets'

  @text('owner_id') ownerId!: string | null
  @text('name') name!: string
  @text('species') species!: string
  @text('breed') breed!: string | null
  @text('birth_date') birthDate!: string | null
  @field('weight_kg') weightKg!: number | null
  @text('photo_url') photoUrl!: string | null
  @text('allergies') allergies!: string | null
  @text('temperament') temperament!: string | null
  @text('observations') observations!: string | null
  @field('is_active') isActive!: boolean | null
  @field('created_at') createdAt!: number
  @text('updated_at_remote') updatedAtRemote!: string | null
  @field('is_deleted_local') isDeletedLocal!: boolean
}
