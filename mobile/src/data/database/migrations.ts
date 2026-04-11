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
            { name: 'created_at', type: 'string' },
            { name: 'avatar_url', type: 'string', isOptional: true },
            { name: 'bio', type: 'string', isOptional: true },
            { name: 'updated_at', type: 'string', isOptional: true },
            { name: 'pets_count', type: 'number' },
            { name: 'birth_date', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
  ],
})
