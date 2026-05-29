import { Model } from '@nozbe/watermelondb'
import { text } from '@nozbe/watermelondb/decorators'

export class SyncMetaModel extends Model {
  static table = 'sync_meta'

  @text('meta_key') metaKey!: string
  @text('meta_value') metaValue!: string | null
}
