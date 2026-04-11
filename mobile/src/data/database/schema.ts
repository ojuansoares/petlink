import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const offlineSchema = appSchema({
  version: 2,
  tables: [
    tableSchema({
      name: 'pets',
      columns: [
        { name: 'owner_id', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'species', type: 'string' },
        { name: 'breed', type: 'string', isOptional: true },
        { name: 'birth_date', type: 'string', isOptional: true },
        { name: 'weight_kg', type: 'number', isOptional: true },
        { name: 'photo_url', type: 'string', isOptional: true },
        { name: 'allergies', type: 'string', isOptional: true },
        { name: 'temperament', type: 'string', isOptional: true },
        { name: 'observations', type: 'string', isOptional: true },
        { name: 'is_active', type: 'boolean', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at_remote', type: 'string', isOptional: true },
        { name: 'is_deleted_local', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'pet_weight_records',
      columns: [
        { name: 'pet_id', type: 'string', isIndexed: true },
        { name: 'weight', type: 'number' },
        { name: 'recorded_at', type: 'string' },
        { name: 'source', type: 'string', isOptional: true },
        { name: 'updated_at_local', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'sync_meta',
      columns: [
        { name: 'meta_key', type: 'string', isIndexed: true },
        { name: 'meta_value', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'user_profiles',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'email', type: 'string', isOptional: true },
        { name: 'location', type: 'string', isOptional: true },
        { name: 'created_at', type: 'string' },
        { name: 'avatar_url', type: 'string', isOptional: true },
        { name: 'bio', type: 'string', isOptional: true },
        { name: 'updated_at', type: 'string', isOptional: true },
        { name: 'pets_count', type: 'number' },
        { name: 'birth_date', type: 'string', isOptional: true },
      ],
    }),
  ],
})
