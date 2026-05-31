import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

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

  const area_ha            = sum('area_ha')
  const tempo_produtivo_h  = sum('tempo_produtivo_h')
  const tempo_parada_h     = sum('tempo_parada_h')
  const tempo_manutencao_h = sum('tempo_manutencao_h')
  const tempo_manobra_h    = sum('tempo_manobra_h')
  const tempo_deslocamento_h = sum('tempo_deslocamento_h')
  const tempo_total_h      = sum('tempo_total_h')
  const consumo_total_l    = sum('consumo_total_l')
  const consumo_efetivo_l  = sum('consumo_efetivo_l')

  const weightedAvg = (valKey, weightKey) => {
    const totalWeight = rows.reduce((a, r) => a + (parseFloat(r[weightKey]) || 0), 0)
    if (!totalWeight) return 0
    return rows.reduce((a, r) => a + (parseFloat(r[valKey]) || 0) * (parseFloat(r[weightKey]) || 0), 0) / totalWeight
  }

  const tempo_motor_ligado_h = sum('tempo_motor_ligado_h')
  const tempo_efetivo_h      = sum('tempo_efetivo_h')

  const consumo_trabalhando_l          = sum('consumo_trabalhando_l')
  const consumo_descarregando_l        = sum('consumo_descarregando_l')
  const consumo_deslocamento_l         = sum('consumo_deslocamento_l')
  const consumo_desloc_desc_l          = sum('consumo_desloc_desc_l')
  const consumo_desloc_reab_l          = sum('consumo_desloc_reab_l')
  const consumo_manobra_l              = sum('consumo_manobra_l')
  const consumo_parada_l               = sum('consumo_parada_l')
  const tempo_descarregando_h          = sum('tempo_descarregando_h')
  const tempo_abastecimento_h          = sum('tempo_abastecimento_h')
  const tempo_motor_ocioso_h           = sum('tempo_motor_ocioso_h')
  const tempo_parada_climatica_h       = sum('tempo_parada_climatica_h')
  const tempo_parada_administrativa_h  = sum('tempo_parada_administrativa_h')
  const tempo_parada_sem_apontamento_h = sum('tempo_parada_sem_apontamento_h')
  const tempo_desloc_desc_h            = sum('tempo_desloc_desc_h')
  const tempo_trabalhando_h            = sum('tempo_trabalhando_h')

  // período de atividade — min/max de data e contagem de dias distintos com operação
  const datasDistintas = new Set(rows.map(r => r.data).filter(Boolean))
  const datasOrdenadas = [...datasDistintas].sort()   // YYYY-MM-DD ordena lexicamente = cronológico
  const data_inicio    = datasOrdenadas[0] ?? null
  const data_fim       = datasOrdenadas[datasOrdenadas.length - 1] ?? null
  const dias_ativos    = datasDistintas.size

  // quando stop exclusions foram aplicadas, os tempos já foram ajustados —
  // recalcular eficiência e disponibilidade diretamente das fórmulas base
  const hasExclusions = rows.some(r => r._hasStopExclusions)

  return {
    area_ha,
    tempo_produtivo_h,
    tempo_efetivo_h,
    tempo_parada_h,
    tempo_manutencao_h,
    tempo_manobra_h,
    tempo_deslocamento_h,
    tempo_total_h,
    consumo_total_l,
    consumo_efetivo_l,
    rendimento_operacional_hah: tempo_efetivo_h > 0 ? area_ha / tempo_efetivo_h : 0,
    rendimento_real_hah: tempo_motor_ligado_h > 0 ? area_ha / tempo_motor_ligado_h : 0,
    eficiencia_geral_pct: hasExclusions
      ? (tempo_total_h > 0 ? (tempo_efetivo_h / tempo_total_h) * 100 : 0)
      : weightedAvg('eficiencia_geral_pct', 'tempo_total_h'),
    disponibilidade_mecanica_pct: hasExclusions
      ? (tempo_total_h > 0 ? ((tempo_total_h - tempo_manutencao_h) / tempo_total_h) * 100 : 0)
      : weightedAvg('disponibilidade_mecanica_pct', 'tempo_total_h'),
    consumo_medio_efetivo_lh: tempo_efetivo_h > 0 ? consumo_efetivo_l / tempo_efetivo_h : 0,
    consumo_medio_efetivo_lha: area_ha > 0 ? consumo_efetivo_l / area_ha : 0,
    consumo_medio_lh: tempo_total_h > 0 ? consumo_total_l / tempo_total_h : 0,
    consumo_medio_lha: area_ha > 0 ? consumo_total_l / area_ha : 0,
    velocidade_media_kmh: weightedAvg('velocidade_media_kmh', 'tempo_produtivo_h'),
    sem_apontamento_pct: weightedAvg('sem_apontamento_pct', 'tempo_parada_h'),
    eficiencia_operacional_pct: weightedAvg('eficiencia_operacional_pct', 'tempo_total_h'),
    motor_ligado_pct: weightedAvg('motor_ligado_pct', 'tempo_total_h'),
    // motor_ocioso_pct: % do tempo de motor ligado — se não há motor ligado, é 0
    motor_ocioso_pct: tempo_motor_ligado_h > 0 ? weightedAvg('motor_ocioso_pct', 'tempo_motor_ligado_h') : 0,
    rpm_medio: weightedAvg('rpm_medio', 'tempo_total_h'),
    area_por_linha_ha: weightedAvg('area_por_linha_ha', 'area_ha'),
    tempo_motor_ligado_h,
    tempo_motor_ocioso_h,
    consumo_trabalhando_l,
    consumo_descarregando_l,
    consumo_deslocamento_l,
    consumo_desloc_desc_l,
    consumo_desloc_reab_l,
    consumo_manobra_l,
    consumo_parada_l,
    tempo_descarregando_h,
    tempo_abastecimento_h,
    tempo_parada_climatica_h,
    tempo_parada_administrativa_h,
    tempo_parada_sem_apontamento_h,
    tempo_desloc_desc_h,
    tempo_trabalhando_h,
    rpm_medio_trabalhando:   weightedAvg('rpm_medio_trabalhando',   'tempo_trabalhando_h'),
    rpm_medio_descarregando: weightedAvg('rpm_medio_descarregando', 'tempo_descarregando_h'),
    rpm_medio_deslocamento:  weightedAvg('rpm_medio_deslocamento',  'tempo_deslocamento_h'),
    rpm_medio_desloc_desc:   weightedAvg('rpm_medio_desloc_desc',   'tempo_desloc_desc_h'),
    rpm_medio_desloc_reab:   weightedAvg('rpm_medio_desloc_reab',   'tempo_abastecimento_h'),
    rpm_medio_manobra:       weightedAvg('rpm_medio_manobra',       'tempo_manobra_h'),
    rpm_medio_parada:        weightedAvg('rpm_medio_parada',        'tempo_parada_h'),
    data_inicio,
    data_fim,
    dias_ativos,
  }
}

// Aplica exclusões de motivos de parada: subtrai os tempos dos campos correspondentes
// Retorna cópias das linhas com _hasStopExclusions=true quando alguma exclusão foi aplicada
export function applyStopExclusions(rows, stopRows, excludedMotivos = []) {
  if (!excludedMotivos.length || !stopRows.length) return rows

  // mapa report_id → exclusões por categoria
  const exclusionMap = new Map()
  for (const s of stopRows) {
    if (!excludedMotivos.includes(s.motivo_de_parada)) continue
    const h = parseFloat(s.tempo_parado_h) || 0
    if (!h) continue
    if (!exclusionMap.has(s.report_id)) {
      exclusionMap.set(s.report_id, { total: 0, manutencao: 0, climatica: 0, administrativa: 0, sem_apontamento: 0 })
    }
    const e = exclusionMap.get(s.report_id)
    e.total += h
    const tipo = (s.tipo_parada || '').toUpperCase()
    if (tipo === 'MANUTENCAO')       e.manutencao    += h
    else if (tipo === 'CLIMATICO')   e.climatica     += h
    else if (tipo === 'ADMINISTRATIVO') e.administrativa += h
    else if (tipo === 'SEM_APONTAMENTO') e.sem_apontamento += h
  }

  if (!exclusionMap.size) return rows

  return rows.map(row => {
    const exc = exclusionMap.get(row.id)
    if (!exc) return row
    const r = { ...row, _hasStopExclusions: true }
    r.tempo_parada_h               = Math.max(0, (parseFloat(row.tempo_parada_h) || 0) - exc.total)
    r.tempo_manutencao_h           = Math.max(0, (parseFloat(row.tempo_manutencao_h) || 0) - exc.manutencao)
    r.tempo_parada_climatica_h     = Math.max(0, (parseFloat(row.tempo_parada_climatica_h) || 0) - exc.climatica)
    r.tempo_parada_administrativa_h = Math.max(0, (parseFloat(row.tempo_parada_administrativa_h) || 0) - exc.administrativa)
    r.tempo_parada_sem_apontamento_h = Math.max(0, (parseFloat(row.tempo_parada_sem_apontamento_h) || 0) - exc.sem_apontamento)
    r.tempo_total_h                = Math.max(0, (parseFloat(row.tempo_total_h) || 0) - exc.total)
    return r
  })
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
    { label: 'Produtivo',     value: produtivo,    pct: (produtivo / total) * 100,    color: '#2d4a2d' },
    { label: 'Parada',        value: parada,        pct: (parada / total) * 100,        color: '#8b2020' },
    { label: 'Manobra',       value: manobra,       pct: (manobra / total) * 100,       color: '#c8960c' },
    { label: 'Deslocamento',  value: deslocamento,  pct: (deslocamento / total) * 100,  color: '#4a6741' },
  ].filter(d => d.value > 0)
}

// Remove sessões com consumo_medio_lh anormalmente alto vs. mediana da máquina na safra.
// baseline: Map<equipamento_cod, { median, count }> — gerado por useMachineBaseline.
// Sessões de máquinas sem baseline suficiente (< MIN_SESSIONS) passam sem filtro.
const BREAKDOWN_MULTIPLIER  = 3.0
const MIN_BASELINE_SESSIONS = 5

export function applyBreakdownFilter(rows, baseline) {
  if (!baseline || baseline.size === 0) return rows
  return rows.filter(r => {
    const ref = baseline.get(r.equipamento_cod)
    if (!ref || ref.count < MIN_BASELINE_SESSIONS) return true
    const consumo = parseFloat(r.consumo_medio_lh) || 0
    if (!consumo) return true
    return consumo <= ref.median * BREAKDOWN_MULTIPLIER
  })
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

// Retorna a safra agrícola vigente baseada na data atual (espelho de safraFromDate do backend)
export function defaultSafra() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  return month >= 6 ? `${year}/${year + 1}` : `${year - 1}/${year}`
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
  { value: 'consumo_total_l',            label: 'Consumo Total (l)',             fmt: (v) => fmt(v, 1, ' l') },
  { value: 'consumo_medio_lh',           label: 'Consumo Médio L/h',            fmt: fmtLh  },
  { value: 'consumo_medio_efetivo_lh',   label: 'Consumo Médio Efetivo L/h',    fmt: fmtLh  },
  { value: 'eficiencia_geral_pct',       label: 'Eficiência Geral (%)',          fmt: fmtPct },
  { value: 'disponibilidade_mecanica_pct', label: 'Disponibilidade Mecânica (%)', fmt: fmtPct },
  { value: 'tempo_efetivo_h',             label: 'Tempo Efetivo (h)',             fmt: fmtH   },
  { value: 'velocidade_media_kmh',       label: 'Velocidade Média (km/h)',       fmt: fmtKmh },
  { value: 'sem_apontamento_pct',        label: 'Sem Apontamento (%)',           fmt: fmtPct },
]
