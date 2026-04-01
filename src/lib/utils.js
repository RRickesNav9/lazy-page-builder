import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Shadcn/ui utility — required by src/components/ui/*
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Formata número com casas decimais e unidade
export const fmt = (val, decimals = 1, unit = '') => {
  const n = parseFloat(val)
  if (isNaN(n) || n === 0) return unit ? `0${unit}` : '0'
  return `${n.toFixed(decimals)}${unit}`
}

export const fmtPct = (val) => fmt(val, 1, '%')
export const fmtHa  = (val) => fmt(val, 2, ' ha')
export const fmtH   = (val) => fmt(val, 1, ' h')
export const fmtLh  = (val) => fmt(val, 1, ' l/h')
export const fmtHah = (val) => fmt(val, 2, ' ha/h')
export const fmtKmh = (val) => fmt(val, 1, ' km/h')

// Agrupa array de objetos por chave
export function groupBy(arr, key) {
  return arr.reduce((acc, row) => {
    const k = row[key] ?? 'N/A'
    if (!acc[k]) acc[k] = []
    acc[k].push(row)
    return acc
  }, {})
}

// Agrega registros operacionais somando tempos e áreas, recalculando médias ponderadas
export function aggregateRows(rows) {
  if (!rows.length) return null
  const sum = (key) => rows.reduce((a, r) => a + (parseFloat(r[key]) || 0), 0)

  const area_ha           = sum('area_ha')
  const tempo_produtivo_h = sum('tempo_produtivo_h')
  const tempo_parada_h    = sum('tempo_parada_h')
  const tempo_manutencao_h= sum('tempo_manutencao_h')
  const tempo_manobra_h   = sum('tempo_manobra_h')
  const tempo_deslocamento_h = sum('tempo_deslocamento_h')
  const tempo_total_h     = sum('tempo_total_h')
  const consumo_total_l   = sum('consumo_total_l')
  const consumo_efetivo_l = sum('consumo_efetivo_l')

  // Médias ponderadas por tempo total
  const weightedAvg = (valKey, weightKey) => {
    const totalWeight = rows.reduce((a, r) => a + (parseFloat(r[weightKey]) || 0), 0)
    if (!totalWeight) return 0
    return rows.reduce((a, r) => a + (parseFloat(r[valKey]) || 0) * (parseFloat(r[weightKey]) || 0), 0) / totalWeight
  }

  return {
    area_ha,
    tempo_produtivo_h,
    tempo_parada_h,
    tempo_manutencao_h,
    tempo_manobra_h,
    tempo_deslocamento_h,
    tempo_total_h,
    consumo_total_l,
    consumo_efetivo_l,
    rendimento_operacional_hah: tempo_produtivo_h > 0 ? area_ha / tempo_produtivo_h : 0,
    rendimento_real_hah: tempo_total_h > 0 ? area_ha / tempo_total_h : 0,
    eficiencia_geral_pct: weightedAvg('eficiencia_geral_pct', 'tempo_total_h'),
    disponibilidade_mecanica_pct: weightedAvg('disponibilidade_mecanica_pct', 'tempo_total_h'),
    consumo_medio_efetivo_lh: tempo_produtivo_h > 0 ? consumo_efetivo_l / tempo_produtivo_h : 0,
    consumo_medio_lh: tempo_total_h > 0 ? consumo_total_l / tempo_total_h : 0,
    velocidade_media_kmh: weightedAvg('velocidade_media_kmh', 'tempo_produtivo_h'),
    sem_apontamento_pct: weightedAvg('sem_apontamento_pct', 'tempo_parada_h'),
  }
}

// Calcula distribuição de motivos de parada a partir de stop_records (join externo)
// Aqui soma os campos de tempo de parada por categoria disponíveis na view
export function calcStopDistribution(rows) {
  const sum = (key) => rows.reduce((a, r) => a + (parseFloat(r[key]) || 0), 0)
  const climatica    = sum('tempo_parada_climatica_h')
  const administrativa = sum('tempo_parada_administrativa_h')
  const sem_apontamento = sum('tempo_parada_sem_apontamento_h')
  const manutencao   = sum('tempo_manutencao_h')
  const total = climatica + administrativa + sem_apontamento + manutencao
  if (!total) return []
  return [
    { label: 'Manutenção',       value: manutencao,      pct: (manutencao / total) * 100,       color: '#ef4444' },
    { label: 'Climático',        value: climatica,       pct: (climatica / total) * 100,        color: '#3b82f6' },
    { label: 'Administrativo',   value: administrativa,  pct: (administrativa / total) * 100,   color: '#f59e0b' },
    { label: 'Sem Apontamento',  value: sem_apontamento, pct: (sem_apontamento / total) * 100,  color: '#6b7280' },
  ].filter(d => d.value > 0).sort((a, b) => b.value - a.value)
}

// Distribui tempo total por estado operacional
export function calcTimeDistribution(rows) {
  const sum = (key) => rows.reduce((a, r) => a + (parseFloat(r[key]) || 0), 0)
  const produtivo     = sum('tempo_produtivo_h')
  const parada        = sum('tempo_parada_h')
  const manobra       = sum('tempo_manobra_h')
  const deslocamento  = sum('tempo_deslocamento_h')
  const total = produtivo + parada + manobra + deslocamento
  if (!total) return []
  return [
    { label: 'Trabalhando',   value: produtivo,    pct: (produtivo / total) * 100,    color: '#22c55e' },
    { label: 'Parada',        value: parada,        pct: (parada / total) * 100,        color: '#ef4444' },
    { label: 'Manobra',       value: manobra,       pct: (manobra / total) * 100,       color: '#eab308' },
    { label: 'Deslocamento',  value: deslocamento,  pct: (deslocamento / total) * 100,  color: '#6366f1' },
  ].filter(d => d.value > 0)
}

// Retorna cor semáforo baseada em performance vs benchmark
export function semaphoreColor(value, benchmark, higherIsBetter = true) {
  if (!benchmark || !value) return 'text-zinc-400'
  const ratio = value / benchmark
  if (higherIsBetter) {
    if (ratio >= 0.95) return 'text-emerald-400'
    if (ratio >= 0.80) return 'text-amber-400'
    return 'text-red-400'
  } else {
    if (ratio <= 1.05) return 'text-emerald-400'
    if (ratio <= 1.20) return 'text-amber-400'
    return 'text-red-400'
  }
}

// Formata data YYYY-MM-DD → DD/MM/YYYY
export function fmtDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

// Retorna range de datas padrão: últimos 7 dias
export function defaultDateRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 7)
  return {
    dataInicio: start.toISOString().split('T')[0],
    dataFim: end.toISOString().split('T')[0],
  }
}

// Nível de análise disponíveis para o seletor (espelho das screenshots)
export const NIVEIS_ANALISE = [
  { value: 'processo',          label: 'Processo' },
  { value: 'equipamento',       label: 'Equipamento' },
  { value: 'modelo_equipamento',label: 'Modelo do Equipamento' },
  { value: 'operador',          label: 'Operador' },
  { value: 'propriedade',       label: 'Fazenda' },
  { value: 'tipo_safra',        label: 'Cultura' },
  { value: 'implemento',        label: 'Implemento' },
]

// Métricas disponíveis para seleção no Diário Operacional
export const METRICAS = [
  { value: 'rendimento_operacional_hah', label: 'Rendimento Operacional (ha/h)', fmt: fmtHah },
  { value: 'rendimento_real_hah',        label: 'Rendimento Real (ha/h)',        fmt: fmtHah },
  { value: 'area_ha',                    label: 'Área (ha)',                     fmt: fmtHa  },
  { value: 'consumo_total_l',            label: 'Consumo (l)',                   fmt: (v) => fmt(v, 1, ' l') },
  { value: 'consumo_medio_lh',           label: 'Consumo Médio (l/h)',           fmt: fmtLh  },
  { value: 'consumo_medio_efetivo_lh',   label: 'Consumo Médio Efetivo (l/h)',   fmt: fmtLh  },
  { value: 'eficiencia_geral_pct',       label: 'Eficiência Geral (%)',          fmt: fmtPct },
  { value: 'disponibilidade_mecanica_pct', label: 'Disponibilidade Mecânica (%)', fmt: fmtPct },
  { value: 'tempo_produtivo_h',          label: 'Tempo Efetivo (h)',             fmt: fmtH   },
  { value: 'velocidade_media_kmh',       label: 'Velocidade Média (km/h)',       fmt: fmtKmh },
  { value: 'sem_apontamento_pct',        label: 'Sem Apontamento (%)',           fmt: fmtPct },
]