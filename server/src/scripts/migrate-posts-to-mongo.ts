/**
 * Migração única: lê todos os posts do Supabase e insere no MongoDB.
 * Uso: npx ts-node scripts/migrate-posts-to-mongo.ts
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { supabaseAdmin } from '../config/supabase'
import { Post } from '../models/Post'

async function migrate() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    console.error('MONGODB_URI não definida no .env')
    process.exit(1)
  }

  await mongoose.connect(mongoUri)
  console.log('[Migrate] Conectado ao MongoDB')

  // Lê todos os posts do Supabase
  const { data: supabasePosts, error } = await supabaseAdmin
    .from('posts')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[Migrate] Erro ao ler Supabase:', error)
    process.exit(1)
  }

  if (!supabasePosts || supabasePosts.length === 0) {
    console.log('[Migrate] Nenhum post para migrar')
    await mongoose.disconnect()
    return
  }

  console.log(`[Migrate] ${supabasePosts.length} posts lidos do Supabase`)

  // Transforma para o schema do MongoDB
  const mongoDocs = supabasePosts.map((p) => ({
    authorId: p.author_id,
    petId: p.pet_id,
    imageUrl: p.image_url,
    caption: p.caption ?? null,
    location: p.location ?? null,
    isPinned: p.is_pinned ?? false,
    likesCount: 0,
    commentsCount: 0,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }))

  // Insere em lotes de 100
  const BATCH_SIZE = 100
  let inserted = 0

  for (let i = 0; i < mongoDocs.length; i += BATCH_SIZE) {
    const batch = mongoDocs.slice(i, i + BATCH_SIZE)
    await Post.insertMany(batch, { ordered: false })
    inserted += batch.length
    console.log(`[Migrate] ${inserted}/${mongoDocs.length} inseridos`)
  }

  // Valida
  const mongoCount = await Post.countDocuments()
  console.log(`[Migrate] Migração concluída: ${mongoCount} posts no MongoDB`)

  if (mongoCount === supabasePosts.length) {
    console.log('[Migrate] ✅ Contagem coincide — migração bem-sucedida')
  } else {
    console.warn(`[Migrate] ⚠️ Divergência: Supabase ${supabasePosts.length} × MongoDB ${mongoCount}`)
  }

  await mongoose.disconnect()
}

migrate().catch((err) => {
  console.error('[Migrate] Erro:', err)
  process.exit(1)
})
