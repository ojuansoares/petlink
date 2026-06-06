import { AppError } from '../../shared/AppError'
import { petsRepository, type PetCreateInput } from './pets.repository'
import { uploadsService } from '../uploads/uploads.service'
import PDFDocument from 'pdfkit'
import { Post } from '../../models/Post'
import { Checkin } from '../../models/Checkin'

type ExportFormat = 'json' | 'csv' | 'pdf'

function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const petsService = {
  async createForOwner(ownerId: string, payload: Omit<PetCreateInput, 'pet_id' | 'owner_id'>) {
    const name = payload.name?.trim()
    const species = payload.species?.trim()
    if (!name) throw new AppError('Nome do pet é obrigatório', 400)
    if (!species) throw new AppError('Espécie do pet é obrigatória', 400)

    if (payload.weight_kg !== undefined && payload.weight_kg !== null && Number.isNaN(payload.weight_kg)) {
      throw new AppError('Peso inválido', 400)
    }

    if (payload.tags && payload.tags.length > 7) {
      throw new AppError('O pet pode ter no máximo 7 tags', 400)
    }

    const weight_history = payload.weight_kg 
      ? [{ weight: payload.weight_kg, date: new Date().toISOString() }]
      : []

    const existing = await petsRepository.findByOwnerAndName(ownerId, name)
    if (existing) {
      throw new AppError('Você já tem um pet com esse nome', 409)
    }

    const created = await petsRepository.create(ownerId, {
      ...payload,
      name,
      species,
      weight_history
    })

    if (payload.weight_kg !== undefined && payload.weight_kg !== null) {
      const today = getLocalDateString()
      const hasTodayRecord = await petsRepository.hasWeightRecordForDate(created.id, payload.weight_kg, today)
      if (!hasTodayRecord) {
        await petsRepository.createWeightRecord(created.id, payload.weight_kg, null, today)
      }
    }

    return created
  },

  async listForOwner(ownerId: string) {
    return petsRepository.listByOwner(ownerId)
  },

  async getPublicPetsByOwner(ownerId: string) {
    return petsRepository.listPublicByOwner(ownerId)
  },

  async searchByName(query: string) {
    if (!query || query.trim().length < 2) return []
    return petsRepository.searchByName(query.trim())
  },

  async getForOwner(ownerId: string, petId: string) {
    const pet = await petsRepository.findByIdAndOwner(ownerId, petId)
    if (!pet) throw new AppError('Pet não encontrado', 404)
    return pet
  },

  async updateForOwner(
    ownerId: string,
    petId: string,
    patch: Partial<{
      name: string
      species: string
      breed: string | null
      birth_date: string | null
      weight_kg: number | null
      photo_url: string | null
      allergies: string | null
      temperament: string | null
      observations: string | null
      tags: string[] | null
      is_active: boolean
      weight_history: any[]
    }>
  ) {
    const current = await petsRepository.findByIdAndOwner(ownerId, petId)
    if (!current) throw new AppError('Pet não encontrado', 404)

    if (patch.name !== undefined) {
      const name = patch.name.trim()
      if (!name) throw new AppError('Nome do pet é obrigatório', 400)
      const existing = await petsRepository.findByOwnerAndNameExcludingId(ownerId, name, petId)
      if (existing) throw new AppError('Você já tem um pet com esse nome', 409)
      patch.name = name
    }

    if (patch.species !== undefined) {
      const species = patch.species.trim()
      if (!species) throw new AppError('Espécie do pet é obrigatória', 400)
      patch.species = species
    }

    if (patch.weight_kg !== undefined && patch.weight_kg !== null && Number.isNaN(patch.weight_kg)) {
      throw new AppError('Peso inválido', 400)
    }

    if (patch.tags && patch.tags.length > 7) {
      throw new AppError('O pet pode ter no máximo 7 tags', 400)
    }

    const shouldTrackWeightChange =
      patch.weight_kg !== undefined &&
      patch.weight_kg !== null &&
      patch.weight_kg !== current.weight_kg

    if (shouldTrackWeightChange) {
      const history = Array.isArray(current.weight_history) ? [...current.weight_history] : []
      history.push({
        weight: patch.weight_kg as number,
        date: new Date().toISOString()
      })
      patch.weight_history = history
    }

    const shouldDeleteOldPhoto =
      patch.photo_url !== undefined &&
      current.photo_url &&
      current.photo_url !== patch.photo_url &&
      uploadsService.isManagedCloudinaryUrl(patch.photo_url)

    const updated = await petsRepository.updateByIdAndOwner(ownerId, petId, patch)
    if (!updated) throw new AppError('Pet não encontrado', 404)

    if (shouldDeleteOldPhoto) {
      try {
        await uploadsService.deleteImageByUrl(current.photo_url)
      } catch {}
    }

    if (shouldTrackWeightChange) {
      const today = getLocalDateString()
      const weightValue = patch.weight_kg as number
      const hasTodayRecord = await petsRepository.hasWeightRecordForDate(petId, weightValue, today)
      if (!hasTodayRecord) {
        await petsRepository.createWeightRecord(petId, weightValue, null, today)
      }
    }

    return updated
  },

  async exportData(ownerId: string, petId: string, format: ExportFormat) {
    const pet = await petsRepository.findByIdAndOwner(ownerId, petId)
    if (!pet) throw new AppError('Pet não encontrado', 404)

    const data = await petsRepository.exportPetData(petId)

    if (format === 'csv') {
      const rows: string[] = []

      // Pet info
      rows.push('=== PET ===')
      rows.push('Campo,Valor')
      rows.push(`Nome,${pet.name}`)
      rows.push(`Espécie,${pet.species}`)
      rows.push(`Raça,${pet.breed ?? ''}`)
      rows.push(`Data de Nascimento,${pet.birth_date ?? ''}`)
      rows.push(`Peso (kg),${pet.weight_kg ?? ''}`)
      rows.push(`Alergias,${pet.allergies ?? ''}`)
      rows.push(`Temperamento,${pet.temperament ?? ''}`)
      rows.push(`Observações,${pet.observations ?? ''}`)
      rows.push('')

      // Vaccines
      rows.push('=== VACINAS ===')
      if (data.vaccines.length === 0) {
        rows.push('Nenhum registro')
      } else {
        rows.push('Nome,Tipo,Aplicada em,Próxima dose,Laboratório,Lote,Veterinário,Observações')
        for (const v of data.vaccines) {
          rows.push(`${v.name},${v.type ?? 'vacina'},${v.applied_at ?? ''},${v.next_dose_at ?? ''},${v.lab ?? ''},${v.batch ?? ''},${v.vet_name ?? ''},${v.notes ?? ''}`)
        }
      }
      rows.push('')

      // Consultations
      rows.push('=== CONSULTAS ===')
      if (data.consultations.length === 0) {
        rows.push('Nenhum registro')
      } else {
        rows.push('Veterinário,Clínica,Data,Motivo,Diagnóstico,Exames,Prescrição,Observações')
        for (const c of data.consultations) {
          rows.push(`${c.vet_name},${c.clinic ?? ''},${c.consulted_at ?? ''},${c.reason},${c.diagnosis ?? ''},${c.exams_requested ?? ''},${c.prescription ?? ''},${c.notes ?? ''}`)
        }
      }
      rows.push('')

      // Weight records
      rows.push('=== REGISTROS DE PESO ===')
      if (data.weightRecords.length === 0) {
        rows.push('Nenhum registro')
      } else {
        rows.push('Data,Peso (kg),Observações')
        for (const w of data.weightRecords) {
          rows.push(`${w.recorded_at ?? ''},${w.weight_kg},${w.notes ?? ''}`)
        }
      }
      rows.push('')

      // Walks
      rows.push('=== PASSEIOS ===')
      if (data.walks.length === 0) {
        rows.push('Nenhum registro')
      } else {
        rows.push('Início,Fim,Distância (m),Duração (s),Passos,Velocidade Média (km/h),Calorias,Pace (min/km),Observações')
        for (const w of data.walks) {
          rows.push(`${w.started_at ?? ''},${w.ended_at ?? ''},${w.distance_m ?? ''},${w.duration_s ?? ''},${w.steps_count ?? ''},${w.avg_speed_kmh ?? ''},${w.calories ?? ''},${w.avg_pace_min_km ?? ''},${w.notes ?? ''}`)
        }
      }
      rows.push('')

      // Feeding plans
      rows.push('=== PLANO ALIMENTAR ===')
      if (data.feedingPlans.length === 0) {
        rows.push('Nenhum registro')
      } else {
        rows.push('Refeição,Horário,Quantidade,Ordem')
        for (const f of data.feedingPlans) {
          rows.push(`${f.meal_name},${f.meal_time},${f.quantity ?? ''},${f.order_index}`)
        }
      }
      rows.push('')

      // Feeding logs
      rows.push('=== REGISTROS DE ALIMENTAÇÃO ===')
      if (data.feedingLogs.length === 0) {
        rows.push('Nenhum registro')
      } else {
        rows.push('Data,Refeição,Horário,Quantidade,Marcado em')
        for (const f of data.feedingLogs) {
          rows.push(`${f.log_date},${f.meal_name},${f.scheduled_time},${f.quantity ?? ''},${f.checked_at ?? ''}`)
        }
      }

      return { content: rows.join('\n'), filename: `${pet.name}-exportacao.csv`, contentType: 'text/csv; charset=utf-8' as const }
    }

    if (format === 'pdf') {
      const pdf = await this.generateExportPdf(pet, data)
      return { content: pdf, filename: `${pet.name}-exportacao.pdf`, contentType: 'application/pdf' as const }
    }

    // JSON format
    const json = {
      exportadoEm: new Date().toISOString(),
      pet: {
        nome: pet.name,
        especie: pet.species,
        raca: pet.breed,
        dataNascimento: pet.birth_date,
        pesoKg: pet.weight_kg,
        alergias: pet.allergies,
        temperamento: pet.temperament,
        observacoes: pet.observations,
        tags: pet.tags,
      },
      vacinas: data.vaccines.map(v => ({
        nome: v.name,
        tipo: v.type,
        aplicadaEm: v.applied_at,
        proximaDose: v.next_dose_at,
        laboratorio: v.lab,
        lote: v.batch,
        veterinario: v.vet_name,
        observacoes: v.notes,
      })),
      consultas: data.consultations.map(c => ({
        veterinario: c.vet_name,
        clinica: c.clinic,
        data: c.consulted_at,
        motivo: c.reason,
        diagnostico: c.diagnosis,
        exames: c.exams_requested,
        prescricao: c.prescription,
        observacoes: c.notes,
      })),
      registrosDePeso: data.weightRecords.map(w => ({
        data: w.recorded_at,
        pesoKg: w.weight_kg,
        observacoes: w.notes,
      })),
      passeios: data.walks.map(w => ({
        inicio: w.started_at,
        fim: w.ended_at,
        distanciaMetros: w.distance_m,
        duracaoSegundos: w.duration_s,
        passos: w.steps_count,
        velocidadeMediaKmh: w.avg_speed_kmh,
        calorias: w.calories,
        paceMinKm: w.avg_pace_min_km,
        observacoes: w.notes,
      })),
      planoAlimentar: data.feedingPlans.map(f => ({
        refeicao: f.meal_name,
        horario: f.meal_time,
        quantidade: f.quantity,
        ordem: f.order_index,
      })),
      registrosAlimentacao: data.feedingLogs.map(f => ({
        data: f.log_date,
        refeicao: f.meal_name,
        horario: f.scheduled_time,
        quantidade: f.quantity,
        marcadoEm: f.checked_at,
      })),
    }

    return {
      content: JSON.stringify(json, null, 2),
      filename: `${pet.name}-exportacao.json`,
      contentType: 'application/json; charset=utf-8' as const,
    }
  },

  formatDate(d: string | null): string {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  },

  formatDateTime(d: string | null): string {
    if (!d) return '—'
    const date = new Date(d)
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  },

  async generateExportPdf(pet: any, data: any): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      info: {
        Title: `Exportação de Dados — ${pet.name}`,
        Author: 'PetLink',
        Subject: 'Exportação de Dados do Pet',
        Creator: 'PetLink App',
      },
    })

    const buffers: Buffer[] = []
    doc.on('data', (c: Buffer) => buffers.push(c))

    const PW = doc.page.width
    const PH = doc.page.height
    const ML = 36, MR = 36
    const CW = PW - ML - MR

    const primary = '#5D7052'
    const primaryDark = '#3E4F38'
    const primaryLight = '#E6E9DD'
    const accent = '#C18C5D'
    const bg = '#F0F2ED'
    const white = '#FFFFFF'
    const dark = '#2C2C24'
    const muted = '#78786C'
    const border = '#DED8CF'
    const success = '#3A7D44'
    const warning = '#B45309'
    const danger = '#A85448'

    function fmt(d: string | null) { return d ? new Date(d).toLocaleDateString('pt-BR') : '—' }

    let y = 0

    // Background
    doc.rect(0, 0, PW, PH).fill(bg)

    // Header
    const HEADER_H = 80
    doc.rect(0, 0, PW, HEADER_H).fill(primary)
    doc.rect(PW - 8, 0, 8, HEADER_H).fill(accent)
    doc.fillColor(white).font('Helvetica-Bold').fontSize(24).text('PetLink', ML, 20)
    doc.fillColor(primaryLight).font('Helvetica').fontSize(10).text(`Exportação de Dados — ${pet.name}`, ML, 48)
    const genDate = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    doc.fillColor(primaryLight).font('Helvetica').fontSize(8).text(`Gerado em ${genDate}`, ML, 64, { width: CW, align: 'right' })

    y = HEADER_H + 16

    // Helper: section header
    function section(title: string) {
      if (y + 40 > PH - 40) { doc.addPage(); doc.rect(0, 0, PW, PH).fill(bg); y = 30 }
      doc.rect(ML, y, CW, 28).fill(primary)
      doc.fillColor(white).font('Helvetica-Bold').fontSize(10).text(title, ML + 12, y + 8)
      y += 34
    }

    // Helper: empty
    function empty() {
      doc.fillColor(muted).font('Helvetica').fontSize(9).text('Nenhum registro', ML + 8, y)
      y += 18
    }

    // Helper: table header
    function tableHeader(cols: { label: string; x: number; w: number }[]) {
      if (y + 20 > PH - 40) { doc.addPage(); doc.rect(0, 0, PW, PH).fill(bg); y = 30 }
      doc.fillColor(muted).font('Helvetica').fontSize(7.5)
      cols.forEach(c => doc.text(c.label, c.x, y, { width: c.w }))
      y += 12
      doc.save().strokeColor(border).lineWidth(0.5).moveTo(ML, y).lineTo(ML + CW, y).stroke().restore()
      y += 6
    }

    // Helper: table row
    function tableRow(cols: { text: string; x: number; w: number }[]) {
      if (y + 20 > PH - 40) { doc.addPage(); doc.rect(0, 0, PW, PH).fill(bg); y = 30 }
      doc.fillColor(dark).font('Helvetica').fontSize(8)
      cols.forEach(c => doc.text(c.text, c.x, y, { width: c.w }))
      y += 16
    }

    // ═══════════ PET INFO ═══════════
    section('INFORMAÇÕES DO PET')
    const infoData: [string, string][] = [
      ['Nome', pet.name],
      ['Espécie', pet.species],
      ['Raça', pet.breed ?? '—'],
      ['Data de Nascimento', fmt(pet.birth_date)],
      ['Peso', pet.weight_kg ? `${pet.weight_kg} kg` : '—'],
      ['Alergias', pet.allergies ?? '—'],
      ['Temperamento', pet.temperament ?? '—'],
      ['Observações', pet.observations ?? '—'],
    ]
    infoData.forEach(([label, value], i) => {
      const bgColor = i % 2 === 0 ? white : 'transparent'
      doc.rect(ML, y - 2, CW, 18).fill(bgColor)
      doc.fillColor(muted).font('Helvetica').fontSize(8).text(label, ML + 8, y + 1, { width: 120 })
      doc.fillColor(dark).font('Helvetica-Bold').fontSize(8.5).text(value, ML + 140, y + 1, { width: CW - 160 })
      y += 18
    })
    y += 8

    // ═══════════ VACCINES ═══════════
    section('VACINAS')
    if (data.vaccines.length === 0) { empty() } else {
      const vCols = [
        { label: 'Vacina', x: ML + 8, w: 90 },
        { label: 'Tipo', x: ML + 100, w: 50 },
        { label: 'Aplicada em', x: ML + 150, w: 70 },
        { label: 'Próxima dose', x: ML + 220, w: 70 },
        { label: 'Laboratório', x: ML + 290, w: 80 },
        { label: 'Veterinário', x: ML + 370, w: 80 },
      ]
      tableHeader(vCols)
      data.vaccines.forEach((v: any) => tableRow([
        { text: v.name, x: ML + 8, w: 90 },
        { text: v.type ?? 'vacina', x: ML + 100, w: 50 },
        { text: fmt(v.applied_at), x: ML + 150, w: 70 },
        { text: fmt(v.next_dose_at), x: ML + 220, w: 70 },
        { text: v.lab ?? '—', x: ML + 290, w: 80 },
        { text: v.vet_name ?? '—', x: ML + 370, w: 80 },
      ]))
    }
    y += 8

    // ═══════════ CONSULTATIONS ═══════════
    section('CONSULTAS')
    if (data.consultations.length === 0) { empty() } else {
      const cCols = [
        { label: 'Veterinário', x: ML + 8, w: 80 },
        { label: 'Clínica', x: ML + 90, w: 70 },
        { label: 'Data', x: ML + 160, w: 70 },
        { label: 'Motivo', x: ML + 230, w: 80 },
        { label: 'Diagnóstico', x: ML + 310, w: 130 },
      ]
      tableHeader(cCols)
      data.consultations.forEach((c: any) => tableRow([
        { text: c.vet_name, x: ML + 8, w: 80 },
        { text: c.clinic ?? '—', x: ML + 90, w: 70 },
        { text: fmt(c.consulted_at), x: ML + 160, w: 70 },
        { text: c.reason, x: ML + 230, w: 80 },
        { text: c.diagnosis ?? '—', x: ML + 310, w: 130 },
      ]))
    }
    y += 8

    // ═══════════ WEIGHT RECORDS ═══════════
    section('REGISTROS DE PESO')
    if (data.weightRecords.length === 0) { empty() } else {
      const wCols = [
        { label: 'Data', x: ML + 8, w: 80 },
        { label: 'Peso (kg)', x: ML + 100, w: 70 },
        { label: 'Observações', x: ML + 180, w: 250 },
      ]
      tableHeader(wCols)
      data.weightRecords.forEach((w: any) => tableRow([
        { text: fmt(w.recorded_at), x: ML + 8, w: 80 },
        { text: String(w.weight_kg), x: ML + 100, w: 70 },
        { text: w.notes ?? '—', x: ML + 180, w: 250 },
      ]))
    }
    y += 8

    // ═══════════ WALKS ═══════════
    section('PASSEIOS')
    if (data.walks.length === 0) { empty() } else {
      const walkCols = [
        { label: 'Data', x: ML + 8, w: 70 },
        { label: 'Distância (m)', x: ML + 80, w: 60 },
        { label: 'Duração (min)', x: ML + 145, w: 60 },
        { label: 'Calorias', x: ML + 210, w: 50 },
        { label: 'Pace', x: ML + 265, w: 50 },
        { label: 'Vel. Média', x: ML + 320, w: 55 },
      ]
      tableHeader(walkCols)
      data.walks.forEach((w: any) => {
        const durMin = w.duration_s ? Math.round(w.duration_s / 60) : '—'
        tableRow([
          { text: w.started_at ? new Date(w.started_at).toLocaleDateString('pt-BR') : '—', x: ML + 8, w: 70 },
          { text: w.distance_m != null ? String(Math.round(w.distance_m)) : '—', x: ML + 80, w: 60 },
          { text: String(durMin), x: ML + 145, w: 60 },
          { text: w.calories != null ? String(Math.round(w.calories)) : '—', x: ML + 210, w: 50 },
          { text: w.avg_pace_min_km != null ? `${w.avg_pace_min_km} min/km` : '—', x: ML + 265, w: 50 },
          { text: w.avg_speed_kmh != null ? `${w.avg_speed_kmh} km/h` : '—', x: ML + 320, w: 55 },
        ])
      })
    }
    y += 8

    // ═══════════ FEEDING PLANS ═══════════
    section('PLANO ALIMENTAR')
    if (data.feedingPlans.length === 0) { empty() } else {
      const fCols = [
        { label: 'Refeição', x: ML + 8, w: 100 },
        { label: 'Horário', x: ML + 120, w: 60 },
        { label: 'Quantidade', x: ML + 190, w: 80 },
      ]
      tableHeader(fCols)
      data.feedingPlans.forEach((f: any) => tableRow([
        { text: f.meal_name, x: ML + 8, w: 100 },
        { text: f.meal_time ?? '—', x: ML + 120, w: 60 },
        { text: f.quantity ?? '—', x: ML + 190, w: 80 },
      ]))
    }
    y += 8

    // ═══════════ FEEDING LOGS ═══════════
    section('REGISTROS DE ALIMENTAÇÃO')
    if (data.feedingLogs.length === 0) { empty() } else {
      const flCols = [
        { label: 'Data', x: ML + 8, w: 70 },
        { label: 'Refeição', x: ML + 85, w: 80 },
        { label: 'Horário', x: ML + 170, w: 55 },
        { label: 'Quantidade', x: ML + 230, w: 60 },
        { label: 'Marcado', x: ML + 295, w: 80 },
      ]
      tableHeader(flCols)
      data.feedingLogs.forEach((f: any) => tableRow([
        { text: f.log_date ?? '—', x: ML + 8, w: 70 },
        { text: f.meal_name, x: ML + 85, w: 80 },
        { text: f.scheduled_time ?? '—', x: ML + 170, w: 55 },
        { text: f.quantity ?? '—', x: ML + 230, w: 60 },
        { text: f.checked_at ? 'Sim' : '—', x: ML + 295, w: 80 },
      ]))
    }
    y += 8

    // ═══════════ CALENDAR EVENTS ═══════════
    section('EVENTOS DE CALENDÁRIO')
    empty()

    // Footer
    const FOOTER_Y = PH - 36
    doc.rect(0, FOOTER_Y, PW, 36).fill(primaryDark)
    doc.rect(0, FOOTER_Y, PW, 2).fill(accent)
    doc.fillColor(primaryLight).font('Helvetica').fontSize(7)
    doc.text(
      'Documento gerado pelo PetLink (petlink.app)',
      ML, FOOTER_Y + 14, { width: CW, align: 'center' }
    )

    doc.end()

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)))
    })
  },

  async deleteForOwner(ownerId: string, petId: string) {
    const current = await petsRepository.findByIdAndOwner(ownerId, petId)
    if (!current) throw new AppError('Pet não encontrado', 404)

    const deleted = await petsRepository.deleteCascadeByIdAndOwner(ownerId, petId)
    if (!deleted) {
      throw new AppError('Pet não encontrado', 404)
    }

    // Clean up MongoDB — remove petId from posts, delete checkins
    await Post.updateMany(
      { petIds: petId },
      { $pull: { petIds: petId } }
    )
    await Post.deleteMany({
      $or: [
        { petId },
        { petIds: [], petId: { $exists: false } },
      ]
    })
    await Checkin.deleteMany({ petId })

    if (current.photo_url) {
      try {
        await uploadsService.deleteImageByUrl(current.photo_url)
      } catch {}
    }
  },
}

