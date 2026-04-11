// pdfExport.js
// Exporta o conteúdo do dashboard como PDF A4 de alta qualidade.
// html2canvas (scale=2) para captura fiel + jsPDF para estrutura do documento.
// Cabeçalho e rodapé desenhados vetorialmente — repetidos em todas as páginas.
// Elementos com [data-pdf-exclude] são ocultados temporariamente antes da captura.

import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

// ─── DIMENSÕES A4 (mm) ────────────────────────────────────────────────────────

const A4_W    = 210
const A4_H    = 297
const MARGIN  = 15   // todos os lados
const HDR     = 22   // altura do cabeçalho de marca
const FTR     = 8    // altura do rodapé

const CONTENT_W = A4_W - 2 * MARGIN           // 180 mm
const CONTENT_H = A4_H - 2 * MARGIN - HDR - FTR  // 237 mm

// ─── PALETA FIXA ─────────────────────────────────────────────────────────────
// Valores RGB explícitos — sem herança de variável CSS — garante consistência entre SOs.

const C_GREEN  = [45,  74,  45]   // #2d4a2d — fundo do cabeçalho
const C_WHITE  = [255, 255, 255]
const C_LIGHT  = [180, 200, 180]  // branco atenuado — labels e elementos secundários
const C_MUTED  = [150, 140, 130]  // cinza quente — texto do rodapé

// ─── CABEÇALHO VETORIAL ───────────────────────────────────────────────────────

function drawHeader(pdf, { cliente, processo, tipoSafra }) {
  const x = MARGIN, y = MARGIN

  // Fundo verde
  pdf.setFillColor(...C_GREEN)
  pdf.rect(x, y, CONTENT_W, HDR, 'F')

  // Nome da marca
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.setTextColor(...C_WHITE)
  pdf.text('PORTEIRA ADENTRO', x + 6, y + 9)

  // Subtítulo
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(...C_LIGHT)
  pdf.text('Relatório de Operações Agrícolas', x + 6, y + 14.5)

  // Divisória vertical
  pdf.setDrawColor(...C_LIGHT)
  pdf.setLineWidth(0.25)
  pdf.line(x + 72, y + 4, x + 72, y + HDR - 4)

  // Campos de contexto
  const fields = [
    { label: 'Cliente',  value: cliente   || '—',                xOff: 0  },
    { label: 'Processo', value: processo  || '—',                xOff: 36 },
    { label: 'Cultura',  value: tipoSafra || 'Não especificado', xOff: 72 },
  ]
  const baseX    = x + 76
  const MAX_W_MM = 32  // máximo de largura por campo em mm

  for (const f of fields) {
    const fx = baseX + f.xOff

    // Label em maiúsculo atenuado
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(6)
    pdf.setTextColor(...C_LIGHT)
    pdf.text(f.label.toUpperCase(), fx, y + 8)

    // Valor — trunca com reticências se ultrapassar a largura disponível
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(...C_WHITE)
    let val = f.value
    while (val.length > 1 && pdf.getTextWidth(val) > MAX_W_MM) val = val.slice(0, -1)
    if (val !== f.value) val += '…'
    pdf.text(val, fx, y + 15)
  }

  // Data de geração — canto inferior direito do cabeçalho
  const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(...C_LIGHT)
  pdf.text(date, x + CONTENT_W - 4, y + HDR - 4, { align: 'right' })
}

// ─── RODAPÉ VETORIAL ──────────────────────────────────────────────────────────

function drawFooter(pdf, pageNum, totalPages) {
  // Posicionado dentro da margem inferior
  const y = MARGIN + HDR + CONTENT_H + 4  // ≈ 278 mm do topo
  const x = MARGIN

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(...C_MUTED)
  pdf.text('Porteira Adentro — Relatório Confidencial', x, y)
  pdf.text(`Página ${pageNum} de ${totalPages}`, x + CONTENT_W, y, { align: 'right' })
}

// ─── QUEBRA INTELIGENTE DE PÁGINA ────────────────────────────────────────────
// Localiza limites de <tr> próximos ao corte ideal (threshold: 15% de CONTENT_H).
// Evita partir uma linha de tabela ao meio. Retorna array com todos os cortes em px.

function findBreakPoints(element, idealPx, scale, totalPx) {
  const containerTop = element.getBoundingClientRect().top
  const rows         = [...element.querySelectorAll('tr')]
  const threshold    = idealPx * 0.15

  const cuts = []
  let pageStart = 0

  while (pageStart + idealPx < totalPx) {
    const ideal = pageStart + idealPx
    let best = ideal

    // Procura uma linha de tabela que termine logo ANTES do corte ideal
    for (const row of rows) {
      const rb = (row.getBoundingClientRect().bottom - containerTop) * scale
      if (rb > ideal - threshold && rb < ideal) {
        best = rb
        break
      }
    }

    cuts.push(best)
    pageStart = best
  }

  return [0, ...cuts, totalPx]
}

// ─── EXPORTAÇÃO PRINCIPAL ─────────────────────────────────────────────────────

export async function exportToPDF(element, options = {}) {
  if (!element) return

  const { cliente = '', processo = '', tipoSafra = '' } = options

  // 1 — Oculta temporariamente os elementos marcados com [data-pdf-exclude]
  const excluded   = [...element.querySelectorAll('[data-pdf-exclude]')]
  const prevDisplay = excluded.map(el => el.style.display)
  excluded.forEach(el => { el.style.display = 'none' })

  let canvas
  try {
    // 2 — Captura de alta qualidade (scale=2 para anti-aliasing em telas retina/padrão)
    canvas = await html2canvas(element, {
      scale:           2,
      useCORS:         true,
      allowTaint:      false,
      logging:         false,
      backgroundColor: '#ffffff',
      scrollX:         0,
      scrollY:         -window.scrollY,
    })
  } finally {
    // 3 — Restaura os elementos (mesmo se html2canvas lançar erro)
    excluded.forEach((el, i) => { el.style.display = prevDisplay[i] })
  }

  // 4 — Cálculo de dimensões e quebra de página
  const pxPerMm  = canvas.width / CONTENT_W   // px de canvas por mm de PDF
  const idealPx  = CONTENT_H * pxPerMm        // altura ideal de uma página em px
  const breaks   = findBreakPoints(element, idealPx, 2, canvas.height)
  const totalPgs = breaks.length - 1

  // 5 — Cria instância jsPDF
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })

  // 6 — Gera cada página
  for (let pg = 0; pg < totalPgs; pg++) {
    if (pg > 0) pdf.addPage()

    drawHeader(pdf, { cliente, processo, tipoSafra })
    drawFooter(pdf, pg + 1, totalPgs)

    // Fatia do canvas correspondente a esta página
    const srcY = Math.round(breaks[pg])
    const srcH = Math.round(breaks[pg + 1] - srcY)

    // Canvas auxiliar com altura fixa — a última página pode ter espaço branco ao final
    const slice = document.createElement('canvas')
    slice.width  = canvas.width
    slice.height = Math.ceil(idealPx)
    const ctx = slice.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, slice.width, slice.height)
    ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH)

    const imgData  = slice.toDataURL('image/jpeg', 0.92)  // JPEG para menor tamanho de arquivo
    const sliceHMm = srcH / pxPerMm                       // altura real desta fatia em mm

    pdf.addImage(imgData, 'JPEG', MARGIN, MARGIN + HDR, CONTENT_W, sliceHMm, `s${pg}`)
  }

  // 7 — Salva com nome padronizado
  const date   = new Date().toISOString().split('T')[0]
  const client = (cliente || 'Relatorio').replace(/[^a-zA-Z0-9_-]/g, '_')
  pdf.save(`Porteira_Adentro_${date}_${client}.pdf`)
}
