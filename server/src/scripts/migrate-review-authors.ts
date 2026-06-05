import 'dotenv/config'
import mongoose from 'mongoose'
import { supabaseAdmin } from '../config/supabase'
import { PlaceReview } from '../models/PlaceReview'

async function migrate() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    console.error('MONGODB_URI não definida no .env')
    process.exit(1)
  }

  await mongoose.connect(mongoUri)
  console.log('[Migrate] Conectado ao MongoDB')

  const reviews = await PlaceReview.find({})
  console.log(`[Migrate] ${reviews.length} reviews encontrados`)

  let updated = 0
  for (const review of reviews) {
    const authorId = review.authorId
    const oldName = review.authorName

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('name')
      .eq('id', authorId)
      .maybeSingle()

    const newName = profile?.name || authorId
    if (newName !== oldName) {
      await PlaceReview.updateOne({ _id: review._id }, { $set: { authorName: newName } })
      console.log(`  [${authorId}] "${oldName}" -> "${newName}"`)
      updated++
    }
  }

  console.log(`[Migrate] ${updated} reviews atualizados`)
  await mongoose.disconnect()
}

migrate().catch((err) => {
  console.error('[Migrate] Erro:', err)
  process.exit(1)
})
