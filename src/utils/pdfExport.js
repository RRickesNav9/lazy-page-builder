// pdfExport.js
// Renderiza conteúdo em container virtual de 794px (= A4 @ 96 dpi) antes de capturar.
// Isso garante que texto de 14px de tela ≈ 9pt no PDF — legível sem compressão excessiva.
// html2canvas scale=4 para alta resolução. jsPDF com cabeçalho e rodapé vetoriais.

import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

// ─── DIMENSÕES A4 (mm) ────────────────────────────────────────────────────────

const A4_W   = 210
const A4_H   = 297
const MARGIN = 15   // mm — todos os lados
const HDR    = 22   // mm — cabeçalho de marca

const CONTENT_W = A4_W - 2 * MARGIN            // 180 mm
const CONTENT_H = A4_H - 2 * MARGIN - HDR      // 245 mm

// Largura de captura = A4 @ 96dpi — garante escala 1:1 com o papel
// 14px de tela × 4 (scale) / (794×4/180) px·mm⁻¹ ≈ 3,17 mm ≈ 9pt (legível)
const PDF_PX_W = Math.round((A4_W / 25.4) * 96)  // 794 px

// ─── PALETA FIXA ─────────────────────────────────────────────────────────────
const C_GREEN = [45, 74, 45]    // #2d4a2d
const C_WHITE = [255, 255, 255]
const C_LIGHT = [180, 200, 180] // branco atenuado — labels
const C_MUTED = [150, 140, 130] // cinza quente — rodapé

// ─── CABEÇALHO VETORIAL ───────────────────────────────────────────────────────

function drawHeader(pdf, { cliente, processo, tipoSafra }) {
  const x = MARGIN, y = MARGIN

  pdf.setFillColor(...C_GREEN)
  pdf.rect(x, y, CONTENT_W, HDR, 'F')

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.setTextColor(...C_WHITE)
  pdf.text('PORTEIRA ADENTRO', x + 6, y + 9)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(...C_LIGHT)
  pdf.text('Relatório de Operações Agrícolas', x + 6, y + 14.5)

  pdf.setDrawColor(...C_LIGHT)
  pdf.setLineWidth(0.25)
  pdf.line(x + 72, y + 4, x + 72, y + HDR - 4)

  const fields = [
    { label: 'Cliente',  value: cliente   || '—',                xOff: 0  },
    { label: 'Processo', value: processo  || '—',                xOff: 36 },
    { label: 'Cultura',  value: tipoSafra || 'Não especificado', xOff: 72 },
  ]
  const baseX = x + 76
  const MAX_W = 32  // mm por campo

  for (const f of fields) {
    const fx = baseX + f.xOff
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(6)
    pdf.setTextColor(...C_LIGHT)
    pdf.text(f.label.toUpperCase(), fx, y + 8)

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(...C_WHITE)
    let val = f.value
    while (val.length > 1 && pdf.getTextWidth(val) > MAX_W) val = val.slice(0, -1)
    if (val !== f.value) val += '…'
    pdf.text(val, fx, y + 15)
  }

  const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(...C_LIGHT)
  pdf.text(date, x + CONTENT_W - 4, y + HDR - 4, { align: 'right' })
}

// ─── RODAPÉ VETORIAL ──────────────────────────────────────────────────────────

function drawFooter(pdf, pageNum, totalPages) {
  const y = MARGIN + HDR + CONTENT_H + 4  // ~278mm do topo
  const x = MARGIN
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(...C_MUTED)
  pdf.text('Porteira Adentro — Relatório Confidencial', x, y)
  pdf.text(`Página ${pageNum} de ${totalPages}`, x + CONTENT_W, y, { align: 'right' })
}

// ─── QUEBRA INTELIGENTE DE PÁGINA ────────────────────────────────────────────
// Localiza limites de <tr> próximos ao corte ideal (±15% de CONTENT_H).
// Deve ser chamado enquanto o clone ainda está no DOM.

function findBreakPoints(clone, idealPx, scale, totalPx) {
  const containerTop = clone.getBoundingClientRect().top
  const rows         = [...clone.querySelectorAll('tr')]
  const threshold    = idealPx * 0.15
  const cuts         = []
  let pageStart      = 0

  while (pageStart + idealPx < totalPx) {
    const ideal = pageStart + idealPx
    let best = ideal

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
  //     Busca no documento inteiro — inclui FABs e painéis fora do elemento exportado
  const excluded    = [...document.querySelectorAll('[data-pdf-exclude]')]
  const prevDisplay = excluded.map(el => el.style.display)
  excluded.forEach(el => { el.style.display = 'none' })

  // 2 — Cria container virtual na largura A4 (794px) para reflow correto
  //     O clone fica off-screen; cloneNode(true) preserva todos os estilos inline.
  const wrapper = document.createElement('div')
  Object.assign(wrapper.style, {
    position: 'absolute',
    left:     '-9999px',
    top:      '0',
    width:    `${PDF_PX_W}px`,
    overflow: 'visible',
    zIndex:   '-1',
  })
  const clone = element.cloneNode(true)
  Object.assign(clone.style, {
    width:    `${PDF_PX_W}px`,
    maxWidth: `${PDF_PX_W}px`,
    overflow: 'visible',
    margin:   '0',
  })
  wrapper.appendChild(clone)
  document.body.appendChild(wrapper)

  // Aguarda o navegador recalcular o layout do clone — 3× rAF + 200ms para elementos complexos
  await new Promise(r => requestAnimationFrame(r))
  await new Promise(r => requestAnimationFrame(r))
  await new Promise(r => requestAnimationFrame(r))
  await new Promise(r => setTimeout(r, 200))

  // Normaliza elementos no clone para captura correta:
  // - overflow restritivo truncaria tabelas e gráficos
  // - position: fixed/sticky no clone renderiza no viewport, não no contexto do clone
  for (const el of clone.querySelectorAll('*')) {
    const cs = window.getComputedStyle(el)
    if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') el.style.overflowX = 'visible'
    if (cs.position === 'fixed' || cs.position === 'sticky') el.style.position = 'relative'
  }

  let canvas, breaks

  try {
    // 3 — Captura de alta resolução (scale=4 ≈ 384dpi no A4)
    canvas = await html2canvas(clone, {
      scale:           4,
      useCORS:         true,
      allowTaint:      false,
      logging:         false,
      backgroundColor: '#ffffff',
      windowWidth:     clone.scrollWidth,
      width:           clone.scrollWidth,
      height:          clone.scrollHeight,
    })

    // 4 — Calcula quebras de página enquanto o clone ainda está no DOM
    const pxPerMm = canvas.width / CONTENT_W
    const idealPx = CONTENT_H * pxPerMm
    breaks = findBreakPoints(clone, idealPx, 4, canvas.height)
  } finally {
    // Remove o clone (sucesso ou falha)
    document.body.removeChild(wrapper)
    excluded.forEach((el, i) => { el.style.display = prevDisplay[i] })
  }

  if (!canvas || !breaks) return

  // 5 — Monta o PDF
  const pxPerMm  = canvas.width / CONTENT_W
  const idealPx  = CONTENT_H * pxPerMm
  const totalPgs = breaks.length - 1
  const pdf      = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })

  for (let pg = 0; pg < totalPgs; pg++) {
    if (pg > 0) pdf.addPage()

    drawHeader(pdf, { cliente, processo, tipoSafra })

    // Fatia do canvas correspondente a esta página
    const srcY = Math.round(breaks[pg])
    const srcH = Math.round(breaks[pg + 1] - srcY)

    // Canvas auxiliar com altura fixa — garante espaçamento consistente entre páginas
    const slice = document.createElement('canvas')
    slice.width  = canvas.width
    slice.height = Math.ceil(idealPx)
    const ctx = slice.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, slice.width, slice.height)
    ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH)

    const imgData  = slice.toDataURL('image/jpeg', 0.95)
    const sliceHMm = srcH / pxPerMm
    pdf.addImage(imgData, 'JPEG', MARGIN, MARGIN + HDR, CONTENT_W, sliceHMm, `s${pg}`)
  }

  // 6 — Salva
  const date   = new Date().toISOString().split('T')[0]
  const client = (cliente || 'Relatorio').replace(/[^a-zA-Z0-9_-]/g, '_')
  pdf.save(`Porteira_Adentro_${date}_${client}.pdf`)
}
