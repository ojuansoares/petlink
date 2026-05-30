import { createTable, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations'

export const offlineMigrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        createTable({
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
      ],
    },
    {
      toVersion: 3,
      steps: [
        createTable({
          name: 'feed_photos',
          columns: [
            { name: 'post_id', type: 'string' },
            { name: 'image_url', type: 'string' },
            { name: 'author_id', type: 'string' },
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
        createTable({
          name: 'profile_photos',
          columns: [
            { name: 'user_id', type: 'string' },
            { name: 'post_id', type: 'string' },
            { name: 'image_url', type: 'string' },
            { name: 'pet_name', type: 'string', isOptional: true },
            { name: 'caption', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'is_pinned', type: 'boolean', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 4,
      steps: [],
    },
    {
      toVersion: 5,
      steps: [],
    },
    {
      toVersion: 6,
      steps: [],
    },
  ],
})
