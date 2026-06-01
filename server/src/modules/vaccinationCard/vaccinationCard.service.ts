import PDFDocument from 'pdfkit'
import https from 'https'
import http from 'http'
import { vaccinationCardRepository, type VaccineData } from './vaccinationCard.repository'

// ─── Brand palette (matches app theme) ───────────────────────────────────────
const C = {
  primary:     '#5D7052',   // verde musgo
  primaryDark: '#3E4F38',
  primaryLight:'#E6E9DD',
  accent:      '#C18C5D',   // areia / caramelo
  accentLight: '#F5EDE0',
  bg:          '#F0F2ED',
  white:       '#FFFFFF',
  dark:        '#2C2C24',
  muted:       '#78786C',
  border:      '#DED8CF',
  success:     '#3A7D44',
  successBg:   '#E8F5EA',
  warning:     '#B45309',
  warningBg:   '#FEF3C7',
  danger:      '#A85448',
  dangerBg:    '#FDECEA',
  card:        '#FFFFFF',
  stripe:      '#F7F8F5',
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fetchImageBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    mod.get(url, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

function hex2rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0,2), 16),
    parseInt(h.slice(2,4), 16),
    parseInt(h.slice(4,6), 16),
  ]
}

// Translate species to Portuguese (fallback to original when unknown)
function translateSpecies(species?: string | null): string {
  if (!species) return ''
  const s = species.trim().toLowerCase()
  const map: Record<string, string> = {
    dog: 'Cachorro',
    cat: 'Gato',
    bird: 'Pássaro',
    rabbit: 'Coelho',
    fish: 'Peixe',
    reptile: 'Réptil',
    other: 'Outro',
    horse: 'Cavalo',
    rodent: 'Roedor',
  }
  // Try exact match first
  if (map[s]) return map[s]
  // Try contains
  for (const k of Object.keys(map)) {
    if (s.includes(k)) return map[k]
  }
  // Capitalize first letter of original as fallback
  return species.charAt(0).toUpperCase() + species.slice(1)
}

// Draw a pill / rounded rect
function pill(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string) {
  doc.save()
  doc.roundedRect(x, y, w, h, r)
  if (stroke) { doc.fillAndStroke(fill, stroke) } else { doc.fill(fill) }
  doc.restore()
}

// Draw a thin horizontal rule
function rule(doc: PDFKit.PDFDocument, x: number, y: number, w: number, color = C.border) {
  doc.save().strokeColor(color).lineWidth(0.5).moveTo(x, y).lineTo(x + w, y).stroke().restore()
}

export const vaccinationCardService = {
  async generatePdf(petId: string, vaccineIds: string[]): Promise<Buffer> {
    const pet = await vaccinationCardRepository.getPet(petId)
    if (!pet) throw new Error('Pet não encontrado')

    const owner = await vaccinationCardRepository.getOwner(pet.owner_id)
    const vaccines = vaccineIds.length > 0
      ? await vaccinationCardRepository.getVaccines(petId, vaccineIds)
      : await vaccinationCardRepository.getAllVaccines(petId)

    const vaccineList  = vaccines.filter(v => v.type === 'vaccine')
    const dewormerList = vaccines.filter(v => v.type === 'dewormer')

    // Fetch pet photo
    let petPhoto: Buffer | null = null
    if (pet.photo_url) {
      try { petPhoto = await fetchImageBuffer(pet.photo_url) } catch {}
    }

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      info: {
        Title: `Carteirinha de Vacinação — ${pet.name}`,
        Author: 'PetLink',
        Subject: 'Carteirinha de Vacinação',
        Creator: 'PetLink App',
      },
    })

    const buffers: Buffer[] = []
    doc.on('data', (c: Buffer) => buffers.push(c))

    const PW = doc.page.width   // 595.28
    const PH = doc.page.height  // 841.89
    const ML = 36, MR = 36
    const CW = PW - ML - MR     // content width

    // ═══════════════════════════════════════════════════════
    // BACKGROUND — subtle grain-like dot texture
    // ═══════════════════════════════════════════════════════
    doc.rect(0, 0, PW, PH).fill(C.bg)

    // ═══════════════════════════════════════════════════════
    // HEADER BAND
    // ═══════════════════════════════════════════════════════
    const HEADER_H = 88
    doc.rect(0, 0, PW, HEADER_H).fill(C.primary)

    // Decorative accent stripe on the right side of header
    doc.rect(PW - 8, 0, 8, HEADER_H).fill(C.accent)

    // Logo wordmark
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(26)
    doc.text('PetLink', ML, 22)

    // Subtitle
    doc.fillColor(C.primaryLight).font('Helvetica').fontSize(10)
    doc.text('Carteirinha de Vacinação', ML, 52)

    // Generation date — right aligned
    const genDate = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    doc.fillColor(C.primaryLight).font('Helvetica').fontSize(8)
    doc.text(`Emitido em ${genDate}`, ML, 68, { width: CW, align: 'right' })

    let y = HEADER_H + 20

    // ═══════════════════════════════════════════════════════
    // PET IDENTITY CARD
    // ═══════════════════════════════════════════════════════
    const CARD_H = petPhoto ? 130 : 110
    pill(doc, ML, y, CW, CARD_H, 14, C.white)

    // Left accent bar
    doc.rect(ML, y, 5, CARD_H).fill(C.accent)
    // re-round the left edge only (hack: draw card again on top just for corners)
    doc.save()
    doc.roundedRect(ML, y, 5, CARD_H, 0).fill(C.accent)
    doc.restore()

    // Pet photo circle
    const PHOTO_SIZE = 90
    const photoX = ML + 22
    const photoY = y + (CARD_H - PHOTO_SIZE) / 2

    if (petPhoto) {
      // Circle clip
      doc.save()
      doc.circle(photoX + PHOTO_SIZE / 2, photoY + PHOTO_SIZE / 2, PHOTO_SIZE / 2).clip()
      doc.image(petPhoto, photoX, photoY, { width: PHOTO_SIZE, height: PHOTO_SIZE })
      doc.restore()
      // Circle border
      doc.save()
      doc.circle(photoX + PHOTO_SIZE / 2, photoY + PHOTO_SIZE / 2, PHOTO_SIZE / 2)
        .strokeColor(C.accent).lineWidth(2.5).stroke()
      doc.restore()
    } else {
      // Placeholder paw circle
      doc.save()
      doc.circle(photoX + PHOTO_SIZE / 2, photoY + PHOTO_SIZE / 2, PHOTO_SIZE / 2)
        .fill(C.primaryLight)
      doc.restore()
      doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(32)
      doc.text(pet.name.charAt(0).toUpperCase(), photoX, photoY + PHOTO_SIZE / 2 - 18,
        { width: PHOTO_SIZE, align: 'center' })
    }

    // Pet info text block
    const infoX = petPhoto ? photoX + PHOTO_SIZE + 18 : ML + 18
    const infoW = CW - (infoX - ML) - 16

    doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(22)
    doc.text(pet.name, infoX, y + 18, { width: infoW })

    // Species + breed badge (translate species to PT-BR)
    const speciesTranslated = translateSpecies(pet.species)
    const speciesLabel = `${speciesTranslated}${pet.breed ? ` · ${pet.breed}` : ''}`
    doc.fillColor(C.white).font('Helvetica').fontSize(8)
    const badgeW = Math.min(doc.widthOfString(speciesLabel) + 18, 200)
    pill(doc, infoX, y + 46, badgeW, 18, 9, C.primary)
    doc.fillColor(C.white).font('Helvetica').fontSize(8)
    doc.text(speciesLabel, infoX + 9, y + 50, { width: badgeW - 18 })

    // Info grid
    const infoItems: [string, string][] = []
    if (pet.breed)         infoItems.push(['Raça', pet.breed])
    if (owner?.name)       infoItems.push(['Tutor(a)', owner.name])

    doc.fillColor(C.muted).font('Helvetica').fontSize(8.5)
    let infoRow = y + 74
    infoItems.forEach(([label, value]) => {
      doc.fillColor(C.muted).text(`${label}:`, infoX, infoRow, { continued: true })
      doc.fillColor(C.dark).font('Helvetica-Bold').text(` ${value}`)
      doc.font('Helvetica')
      infoRow += 14
    })

    y += CARD_H + 18

    // ═══════════════════════════════════════════════════════
    // UPCOMING DOSES — alert panel (only if any pending)
    // ═══════════════════════════════════════════════════════
    const today = new Date()
    today.setHours(0,0,0,0)
    const in30 = new Date(today); in30.setDate(in30.getDate() + 30)

    const upcoming = vaccines.flatMap(v => {
      const doses = (v.doses ?? []).length > 0 ? v.doses! : [{ date: v.applied_at, applied: v.is_completed }]
      return doses
        .filter(d => !d.applied && d.date)
        .map(d => ({ vaccine: v.name, date: new Date(d.date!), overdue: new Date(d.date!) < today }))
    }).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 4)

    if (upcoming.length > 0) {
      const ALERT_H = 28 + upcoming.length * 22 + 12
      pill(doc, ML, y, CW, ALERT_H, 12, C.warningBg)
      doc.rect(ML, y, 4, ALERT_H).fill(C.accent)

      doc.fillColor(C.warning).font('Helvetica-Bold').fontSize(9)
      doc.text('PRÓXIMAS DOSES', ML + 14, y + 10)

      upcoming.forEach((u, i) => {
        const rowY = y + 28 + i * 22
        const color = u.overdue ? C.danger : C.warning
        const label = u.overdue ? 'ATRASADA' : formatDate(u.date.toISOString())

        pill(doc, ML + 14, rowY, 6, 6, 3, color)
        doc.fillColor(C.dark).font('Helvetica').fontSize(8.5)
        doc.text(u.vaccine, ML + 26, rowY - 1, { width: CW - 120 })
        pill(doc, ML + CW - 90, rowY - 4, 85, 14, 7, u.overdue ? C.dangerBg : C.warningBg)
        doc.fillColor(color).font('Helvetica-Bold').fontSize(7.5)
        doc.text(label, ML + CW - 90, rowY - 1, { width: 85, align: 'center' })
      })

      y += ALERT_H + 16
    }

    // ═══════════════════════════════════════════════════════
    // HELPER: render a vaccine/dewormer section
    // ═══════════════════════════════════════════════════════
    const renderSection = (
      items: VaccineData[],
      title: string,
      accentColor: string,
      accentBg: string
    ) => {
      if (items.length === 0) return

      // Check page space
      if (y + 50 > PH - 50) { doc.addPage(); doc.rect(0, 0, PW, PH).fill(C.bg); y = 30 }

      // Section header
      pill(doc, ML, y, CW, 32, 8, accentColor)
      doc.fillColor(C.white).font('Helvetica-Bold').fontSize(11)
      doc.text(title.toUpperCase(), ML + 14, y + 10)
      doc.fillColor(C.white).font('Helvetica').fontSize(8)
      // right-aligned count, keep margin from right edge
      doc.text(`${items.length} ${items.length === 1 ? 'registro' : 'registros'}`, ML + CW - 120, y + 11, { width: 110, align: 'right' })
      y += 38

      // Column headers (calculate positions relative to content width to avoid overflow)
      const badgeWidth = 80
      const nameX = ML + 8
      const dateX = ML + Math.floor(CW * 0.45)
      const dosesX = ML + Math.floor(CW * 0.66)
      const statusX = ML + CW - badgeWidth - 10
      const cols = { name: nameX, date: dateX, doses: dosesX, status: statusX }
      doc.fillColor(C.muted).font('Helvetica').fontSize(7.5)
      doc.text('PRODUTO / VACINA', cols.name, y)
      doc.text('APLICAÇÃO', cols.date, y)
      doc.text('DOSES', cols.doses, y)
      doc.text('STATUS', cols.status, y)
      y += 14
      rule(doc, ML, y, CW)
      y += 6

      items.forEach((v, idx) => {
        const doses = (v.doses ?? []).length > 0 ? v.doses! : [{ date: v.applied_at, applied: v.is_completed }]
        const appliedCount = doses.filter(d => d.applied).length
        const totalCount = doses.length
        const anyOverdue = doses.some(d => !d.applied && d.date && new Date(d.date) < today)
        const isComplete = v.is_completed

        const statusText  = isComplete ? 'Completo' : anyOverdue ? 'Atrasado' : 'Pendente'
        const statusColor = isComplete ? C.success : anyOverdue ? C.danger : C.warning
        const statusBg    = isComplete ? C.successBg : anyOverdue ? C.dangerBg : C.warningBg

        // Dose timeline height
        const timelineH = totalCount > 1 ? totalCount * 16 + 8 : 0
        const ROW_H = 32 + timelineH

        if (y + ROW_H > PH - 50) {
          doc.addPage(); doc.rect(0, 0, PW, PH).fill(C.bg); y = 30
        }

        // Row background
        const rowBg = idx % 2 === 0 ? C.white : C.stripe
        doc.rect(ML, y - 4, CW, ROW_H).fill(rowBg)

        // Vaccine name
        doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(9.5)
        const nameW = dateX - cols.name - 12
        doc.text(v.name, cols.name, y, { width: nameW })

        // Lab (if present)
        if (v.lab) {
          doc.fillColor(C.muted).font('Helvetica').fontSize(7.5)
          doc.text(v.lab, cols.name, y + 13, { width: nameW })
        }

        // Application date
        doc.fillColor(C.dark).font('Helvetica').fontSize(8.5)
        const dateW = dosesX - cols.date - 8
        doc.text(formatDate(v.applied_at), cols.date, y, { width: dateW })

        // Next dose (small)
        if (v.next_dose_at && !isComplete) {
          doc.fillColor(accentColor).font('Helvetica').fontSize(7)
          doc.text(`↻ ${formatDate(v.next_dose_at)}`, cols.date, y + 13, { width: 85 })
        }

        // Doses fraction
        doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(9)
        doc.text(`${appliedCount}/${totalCount}`, cols.doses, y, { width: 60, align: 'center' })

        // Status badge (ensure it stays within page)
        const badgeX = statusX
        pill(doc, badgeX, y - 2, badgeWidth, 16, 8, statusBg)
        doc.fillColor(statusColor).font('Helvetica-Bold').fontSize(7.5)
        doc.text(statusText, badgeX, y + 2, { width: badgeWidth, align: 'center' })

        // Dose timeline (when > 1 dose)
        if (totalCount > 1) {
          const tlY = y + 24
          doc.fillColor(C.muted).font('Helvetica').fontSize(7)
          doc.text('Histórico de doses:', cols.name, tlY)

          doses.forEach((dose, di) => {
            const dY = tlY + 8 + di * 16
            const dDate = dose.date ? new Date(dose.date) : null
            const isOverdue = !dose.applied && dDate && dDate < today
            const dotColor = dose.applied ? C.success : isOverdue ? C.danger : C.border

            // Dot
            doc.circle(cols.name + 4, dY + 4, 4).fill(dotColor)

            // Line connector
            if (di < totalCount - 1) {
              doc.save().strokeColor(C.border).lineWidth(1)
                .moveTo(cols.name + 4, dY + 8).lineTo(cols.name + 4, dY + 16).stroke().restore()
            }

            // Dose info
            doc.fillColor(dose.applied ? C.success : isOverdue ? C.danger : C.muted)
              .font('Helvetica').fontSize(7.5)
            const dLabel = `Dose ${di + 1}: ${dDate ? dDate.toLocaleDateString('pt-BR') : '—'}`
            const dStatus = dose.applied ? ' ✓' : isOverdue ? ' (atrasada)' : ' (pendente)'
            doc.text(dLabel + dStatus, cols.name + 14, dY - 1, { width: 180 })
          })
        }

        y += ROW_H + 2
        rule(doc, ML, y, CW, C.border + '50')
        y += 4
      })

      y += 12
    }

    // ─── Vaccines ────────────────────────────────────────────
    renderSection(vaccineList, 'Vacinas', C.primary, C.primaryLight)

    // ─── Dewormers ───────────────────────────────────────────
    renderSection(dewormerList, 'Vermífugos', C.accent, C.accentLight)

    // ═══════════════════════════════════════════════════════
    // SUMMARY STATS BAR
    // ═══════════════════════════════════════════════════════
    if (y + 60 > PH - 50) { doc.addPage(); doc.rect(0, 0, PW, PH).fill(C.bg); y = 30 }

    y += 8
    pill(doc, ML, y, CW, 52, 10, C.primaryLight)

    const stats = [
      { label: 'Total de registros', value: String(vaccines.length) },
      { label: 'Completos', value: String(vaccines.filter(v => v.is_completed).length) },
      { label: 'Pendentes', value: String(vaccines.filter(v => !v.is_completed).length) },
      { label: 'Laboratórios', value: String([...new Set(vaccines.map(v => v.lab).filter(Boolean))].length || '—') },
    ]

    const statW = CW / stats.length
    stats.forEach((s, i) => {
      const sx = ML + i * statW + statW / 2
      doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(16)
      doc.text(s.value, sx - 20, y + 8, { width: 40, align: 'center' })
      doc.fillColor(C.muted).font('Helvetica').fontSize(7)
      doc.text(s.label, sx - 35, y + 32, { width: 70, align: 'center' })

      if (i < stats.length - 1) {
        doc.save().strokeColor(C.border).lineWidth(0.5)
          .moveTo(ML + (i + 1) * statW, y + 10).lineTo(ML + (i + 1) * statW, y + 42).stroke().restore()
      }
    })

    y += 60

    // ═══════════════════════════════════════════════════════
    // FOOTER
    // ═══════════════════════════════════════════════════════
    const FOOTER_Y = PH - 38
    doc.rect(0, FOOTER_Y, PW, 38).fill(C.primaryDark)
    doc.rect(0, FOOTER_Y, PW, 2).fill(C.accent)

    doc.fillColor(C.primaryLight).font('Helvetica').fontSize(7)
    doc.text(
      'Documento gerado pelo PetLink (petlink.app) · Não substitui documentação veterinária oficial · Mantenha sempre com o seu pet',
      ML, FOOTER_Y + 14, { width: CW, align: 'center' }
    )

    doc.end()

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)))
    })
  },
}