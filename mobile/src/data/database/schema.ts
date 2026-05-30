import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const offlineSchema = appSchema({
  version: 6,
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
        { name: 'tags', type: 'string', isOptional: true },
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
        { name: 'created_at', type: 'number' },
        { name: 'avatar_url', type: 'string', isOptional: true },
        { name: 'bio', type: 'string', isOptional: true },
        { name: 'updated_at', type: 'number' },
        { name: 'pets_count', type: 'number' },
        { name: 'birth_date', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'feed_photos',
      columns: [
        { name: 'post_id', type: 'string', isIndexed: true },
        { name: 'image_url', type: 'string' },
        { name: 'author_id', type: 'string', isIndexed: true },
        { name: 'pet_id', type: 'string', isOptional: true },
        { name: 'caption', type: 'string', isOptional: true },
        { name: 'location', type: 'string', isOptional: true },
        { name: 'is_pinned', type: 'boolean', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'author_name', type: 'string', isOptional: true },
        { name: 'author_avatar_url', type: 'string', isOptional: true },
        { name: 'pet_name', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'profile_photos',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'post_id', type: 'string' },
        { name: 'image_url', type: 'string' },
        { name: 'pet_name', type: 'string', isOptional: true },
        { name: 'caption', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'is_pinned', type: 'boolean', isOptional: true },
      ],
    }),
  ],
})
