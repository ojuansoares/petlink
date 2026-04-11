import { Model } from '@nozbe/watermelondb'
import { field, text } from '@nozbe/watermelondb/decorators'

export class WeightRecordModel extends Model {
  static table = 'pet_weight_records'

  @text('pet_id') petId!: string
  @field('weight') weight!: number
  @text('recorded_at') recordedAt!: string
  @text('source') source!: string | null
  @field('updated_at_local') updatedAtLocal!: number
}
