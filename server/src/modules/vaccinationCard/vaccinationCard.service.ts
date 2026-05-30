import PDFDocument from 'pdfkit'
import { vaccinationCardRepository, type VaccineData } from './vaccinationCard.repository'

const PRIMARY = '#5D7052'
const PRIMARY_LIGHT = '#E6E9DD'
const ACCENT = '#C18C5D'
const BG_LIGHT = '#F0F2ED'
const TEXT_DARK = '#2C2C24'
const TEXT_MUTED = '#78786C'
const BORDER = '#DED8CF'
const SUCCESS = '#3A7D44'
const WARNING = '#C18C5D'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR')
}

function drawRoundedRect(
  doc: any,
  x: number, y: number, w: number, h: number, r: number,
  fillColor?: string, strokeColor?: string
) {
  doc.save()
  if (fillColor) doc.fillColor(fillColor)
  if (strokeColor) doc.strokeColor(strokeColor).lineWidth(1)

  doc.moveTo(x + r, y)
    .lineTo(x + w - r, y)
    .quadraticCurveTo(x + w, y, x + w, y + r)
    .lineTo(x + w, y + h - r)
    .quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    .lineTo(x + r, y + h)
    .quadraticCurveTo(x, y + h, x, y + h - r)
    .lineTo(x, y + r)
    .quadraticCurveTo(x, y, x + r, y)
    .closePath()

  if (fillColor) doc.fill()
  if (strokeColor) doc.stroke()
  doc.restore()
}

export const vaccinationCardService = {
  async generatePdf(petId: string, vaccineIds: string[]): Promise<Buffer> {
    const pet = await vaccinationCardRepository.getPet(petId)
    if (!pet) throw new Error('Pet não encontrado')

    const owner = await vaccinationCardRepository.getOwner(pet.owner_id)
    const vaccines = vaccineIds.length > 0
      ? await vaccinationCardRepository.getVaccines(petId, vaccineIds)
      : await vaccinationCardRepository.getAllVaccines(petId)

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 30, bottom: 30, left: 30, right: 30 },
      info: {
        Title: `Carteirinha de Vacinação - ${pet.name}`,
        Author: 'PetLink',
        Subject: 'Carteirinha de Vacinação',
      },
    })

    const buffers: Buffer[] = []
    doc.on('data', (chunk: Buffer) => buffers.push(chunk))
    doc.on('end', () => {})

    const pageWidth = doc.page.width - 60
    let y = 30

    // ───── TOP BAR ─────
    drawRoundedRect(doc, 30, y, pageWidth, 60, 12, PRIMARY)
    doc.fillColor('#ffffff')
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('PetLink', 50, y + 14)
      .fontSize(10)
      .font('Helvetica')
      .text('Carteirinha de Vacinação', 50, y + 40)
    // generation date top right
    const genDate = new Date().toLocaleDateString('pt-BR')
    doc.fontSize(8).text(`Gerado em ${genDate}`, 30 + pageWidth - 120, y + 14, { width: 100, align: 'right' })
    y += 80

    // ───── PET CARD ─────
    drawRoundedRect(doc, 30, y, pageWidth, 80, 10, PRIMARY_LIGHT)
    doc.fillColor(TEXT_DARK)

    const petName = pet.name
    doc.fontSize(18).font('Helvetica-Bold').text(petName, 50, y + 14)

    const petInfo = [
      `Espécie: ${pet.species}`,
      pet.breed ? `Raça: ${pet.breed}` : null,
      `Tutor: ${owner?.name ?? '—'}`,
    ].filter(Boolean).join('  |  ')

    doc.fontSize(10).font('Helvetica').fillColor(TEXT_MUTED).text(petInfo, 50, y + 42, { width: pageWidth - 40 })

    if (pet.photo_url) {
      try {
        doc.image(pet.photo_url, 30 + pageWidth - 70, y + 10, { width: 60, height: 60 })
      } catch {}
    }
    y += 100

    // ───── SECTION HEADER ─────
    drawRoundedRect(doc, 30, y, pageWidth, 36, 8, PRIMARY)
    doc.fillColor('#ffffff')
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('Registro de Vacinas e Vermífugos', 50, y + 10)
    y += 52

    // ───── TABLE HEADER ─────
    const colX = [30, 180, 290, 390, 460]
    const colW = [150, 110, 100, 70, 100]
    const rowH = 22

    drawRoundedRect(doc, 30, y, pageWidth, rowH, 6, TEXT_DARK)
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
    doc.text('Nome', colX[0] + 8, y + 6)
    doc.text('Tipo', colX[1] + 8, y + 6)
    doc.text('Aplicação', colX[2] + 8, y + 6)
    doc.text('Doses', colX[3] + 8, y + 6)
    doc.text('Status', colX[4] + 8, y + 6)
    y += rowH

    // ───── TABLE ROWS ─────
    if (vaccines.length === 0) {
      drawRoundedRect(doc, 30, y, pageWidth, rowH, 0, BG_LIGHT)
      doc.fillColor(TEXT_MUTED).fontSize(10).font('Helvetica')
        .text('Nenhum registro encontrado', 50, y + 5)
      y += rowH
    } else {
      for (let i = 0; i < vaccines.length; i++) {
        const v = vaccines[i]
        if (y + rowH > doc.page.height - 60) {
          doc.addPage()
          y = 30
        }

        const bgColor = i % 2 === 0 ? BG_LIGHT : '#ffffff'
        drawRoundedRect(doc, 30, y, pageWidth, rowH, 0, bgColor)

        const appliedCount = (v.doses ?? []).filter((d: { applied: boolean }) => d.applied).length
        const totalCount = (v.doses ?? []).length
        const statusText = v.is_completed ? 'Completo' : `${appliedCount}/${totalCount}`
        const statusColor = v.is_completed ? SUCCESS : WARNING

        doc.fillColor(TEXT_DARK).fontSize(9).font('Helvetica')
        doc.text(v.name, colX[0] + 8, y + 6, { width: colW[0] - 12 })

        const typeLabel = v.type === 'vaccine' ? 'Vacina' : 'Vermífugo'
        doc.text(typeLabel, colX[1] + 8, y + 6, { width: colW[1] - 12 })

        doc.text(formatDate(v.applied_at), colX[2] + 8, y + 6, { width: colW[2] - 12 })

        doc.text(totalCount > 0 ? `${appliedCount}/${totalCount}` : '—', colX[3] + 8, y + 6, { width: colW[3] - 12 })

        doc.fillColor(statusColor).font('Helvetica-Bold')
        doc.text(v.is_completed ? 'Completo' : 'Pendente', colX[4] + 8, y + 6, { width: colW[4] - 12 })

        y += rowH
      }
    }

    y += 20

    // ───── LEGEND ─────
    drawRoundedRect(doc, 30, y, pageWidth, 36, 8, BG_LIGHT)
    doc.fillColor(TEXT_MUTED).fontSize(8).font('Helvetica')
    doc.text('Legenda:', 50, y + 8, { continued: true })
    doc.fillColor(SUCCESS).text('  Completo  ', { continued: true })
    doc.fillColor(WARNING).text(' Pendente', { continued: true })
    doc.fillColor(TEXT_MUTED).text('  |  Doses: aplicadas/total')
    y += 56

    // ───── FOOTER ─────
    doc.fillColor(TEXT_MUTED).fontSize(7).font('Helvetica')
    doc.text(
      'Documento gerado pelo PetLink (petlink.app) — não possui validade oficial como documento veterinário.',
      30, doc.page.height - 40,
      { width: pageWidth, align: 'center' }
    )

    doc.end()

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)))
    })
  },
}
