// export.js
// Builders de XLSX para exportação de dados do dashboard.
// Cada função é async: páginas de benchmark buscam dados brutos da safra no momento da exportação.

import * as XLSX from 'xlsx'
import { supabase } from './supabase'

const JD_ID = '6731a094-8f65-472f-95f5-655d1303a72f'

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function makeSheet(rows) {
  if (!rows?.length) return XLSX.utils.aoa_to_sheet([['Sem dados']])
  return XLSX.utils.json_to_sheet(rows)
}

function addSheet(wb, name, rows) {
  XLSX.utils.book_append_sheet(wb, makeSheet(rows), name.slice(0, 31))
}

function today() {
  return new Date().toISOString().split('T')[0]
}

// Busca paginada de dashboard_operational_view com select mínimo para validação
async function fetchRawRows(filters = {}) {
  let query = supabase
    .from('dashboard_operational_view')
    .select([
      'data', 'cliente', 'propriedade', 'processo', 'tipo_safra', 'safra',
      'equipamento_cod', 'equipamento', 'modelo_equipamento', 'operador',
      'area_ha', 'tempo_efetivo_h', 'tempo_produtivo_h', 'tempo_total_h',
      'tempo_motor_ligado_h', 'tempo_parada_h',
      'rendimento_operacional_hah', 'rendimento_real_hah', 'velocidade_media_kmh',
      'eficiencia_geral_pct', 'eficiencia_operacional_pct', 'disponibilidade_mecanica_pct',
      'consumo_total_l', 'consumo_efetivo_l',
      'consumo_medio_lh', 'consumo_medio_lha', 'consumo_medio_efetivo_lha', 'consumo_medio_efetivo_lh',
      'sem_apontamento_pct', 'motor_ocioso_pct', 'motor_ligado_pct', 'rpm_medio', 'area_por_linha_ha',
    ].join(','))
    .neq('cliente', 'Média Porteira')

  if (filters.jdOnly)  query = query.eq('data_provider_id', JD_ID)
  if (filters.solOnly) query = query.neq('data_provider_id', JD_ID)
  if (filters.clientes?.length)    query = query.in('cliente', filters.clientes)
  if (filters.processos?.length)   query = query.in('processo', filters.processos)
  if (filters.tipos_safra?.length) query = query.in('tipo_safra', filters.tipos_safra)
  if (filters.processo)            query = query.eq('processo', filters.processo)
  if (filters.tipo_safra)          query = query.eq('tipo_safra', filters.tipo_safra)
  if (filters.safra)               query = query.eq('safra', filters.safra)
  if (filters.dataInicio)          query = query.gte('data', filters.dataInicio)
  if (filters.dataFim)             query = query.lte('data', filters.dataFim)
  if (filters.equipamento_cod)     query = query.eq('equipamento_cod', filters.equipamento_cod)
  if (filters.modelo_equipamento)  query = query.eq('modelo_equipamento', filters.modelo_equipamento)

  let all = [], from = 0
  while (true) {
    const { data: page, error } = await query.range(from, from + 999)
    if (error) { console.error('ERRO exportação: falha ao buscar dados brutos:', error.message); break }
    if (!page?.length) break
    all = all.concat(page)
    if (page.length < 1000) break
    from += 1000
  }
  return all
}

// Converte row de dashboard_operational_view para shape limpo de exportação.
// Mantém valores numéricos puros para facilitar SUMPRODUCT/SUM no Excel.
function toExportRow(r) {
  return {
    'Data':                r.data,
    'Cliente':             r.cliente,
    'Propriedade':         r.propriedade,
    'Processo':            r.processo,
    'Cultura':             r.tipo_safra,
    'Safra':               r.safra,
    'Cód. Equipamento':    r.equipamento_cod,
    'Equipamento':         r.equipamento,
    'Modelo':              r.modelo_equipamento,
    'Operador':            r.operador,
    'Área (ha)':           r.area_ha,
    'Rend. Op. (ha/h)':    r.rendimento_operacional_hah,
    'Rend. Real (ha/h)':   r.rendimento_real_hah,
    'Velocidade (km/h)':   r.velocidade_media_kmh,
    'Efic. Geral (%)':     r.eficiencia_geral_pct,
    'Efic. Op. (%)':       r.eficiencia_operacional_pct,
    'Disponib. (%)':       r.disponibilidade_mecanica_pct,
    'Cons. Total (L)':     r.consumo_total_l,
    'Cons. Efetivo (L)':   r.consumo_efetivo_l,
    'Cons. (L/h)':         r.consumo_medio_lh,
    'Cons. (L/ha)':        r.consumo_medio_lha,
    'Cons. Ef. (L/h)':     r.consumo_medio_efetivo_lh,
    'Cons. Ef. (L/ha)':    r.consumo_medio_efetivo_lha,
    'Motor Ocioso (%)':    r.motor_ocioso_pct,
    'Motor Ligado (%)':    r.motor_ligado_pct,
    'Sem Apontamento (%)': r.sem_apontamento_pct,
    'RPM Médio':           r.rpm_medio,
    'Área/Linha (ha)':     r.area_por_linha_ha,
    // denominadores — necessários para verificar a média ponderada no Excel
    'T. Efetivo (h)':      r.tempo_efetivo_h,
    'T. Produtivo (h)':    r.tempo_produtivo_h,
    'T. Total (h)':        r.tempo_total_h,
    'T. Motor Ligado (h)': r.tempo_motor_ligado_h,
    'T. Parada (h)':       r.tempo_parada_h,
  }
}

// Sheet explicando a metodologia de média ponderada — permite ao cliente verificar os números
function metodologiaRows() {
  return [
    { Campo: 'Método',             Descrição: 'Média ponderada — cada métrica usa seu denominador real como peso' },
    { Campo: '',                   Descrição: 'Fórmula Excel: =SUMPRODUCT(métrica; peso) / SUMIF(peso; ">"&0; peso)' },
    { Campo: '',                   Descrição: '' },
    { Campo: 'Rend. Op. (ha/h)',   'Campo Peso': 'T. Efetivo (h)',       Observação: 'Numerador: Área (ha)' },
    { Campo: 'Rend. Real (ha/h)',  'Campo Peso': 'T. Motor Ligado (h)',  Observação: 'Numerador: Área (ha)' },
    { Campo: 'Velocidade (km/h)',  'Campo Peso': 'T. Produtivo (h)',     Observação: '' },
    { Campo: 'Efic. Geral (%)',    'Campo Peso': 'T. Total (h)',         Observação: '' },
    { Campo: 'Disponib. (%)',      'Campo Peso': 'T. Total (h)',         Observação: '' },
    { Campo: 'Efic. Op. (%)',      'Campo Peso': 'T. Total (h)',         Observação: 'Denominador real exclui paradas climáticas/administrativas' },
    { Campo: 'Cons. (L/h)',        'Campo Peso': 'T. Total (h)',         Observação: '' },
    { Campo: 'Cons. (L/ha)',       'Campo Peso': 'Área (ha)',            Observação: '' },
    { Campo: 'Cons. Ef. (L/ha)',   'Campo Peso': 'Área (ha)',            Observação: '' },
    { Campo: 'Cons. Ef. (L/h)',    'Campo Peso': 'T. Efetivo (h)',       Observação: '' },
    { Campo: 'Motor Ocioso (%)',   'Campo Peso': 'T. Motor Ligado (h)',  Observação: '' },
    { Campo: 'Motor Ligado (%)',   'Campo Peso': 'T. Total (h)',         Observação: '' },
    { Campo: 'Sem Apontamento (%)', 'Campo Peso': 'T. Parada (h)',       Observação: '' },
    { Campo: 'RPM Médio',          'Campo Peso': 'T. Total (h)',         Observação: '' },
    { Campo: 'Área/Linha (ha)',    'Campo Peso': 'Área (ha)',            Observação: '' },
    { Campo: 'Pés Plat./24h',      'Campo Peso': '—',                   Observação: 'SUMPRODUCT(area_por_linha_ha / T.Total * 24 * area_ha) / SUM(area_ha)' },
  ]
}

// ─── MÉTRICAS BENCHMARK ───────────────────────────────────────────────────────

const BENCH_LABELS = {
  rendimento_operacional_hah:   'Rend. Op. (ha/h)',
  rendimento_real_hah:          'Rend. Real (ha/h)',
  velocidade_media_kmh:         'Velocidade (km/h)',
  eficiencia_geral_pct:         'Efic. Geral (%)',
  eficiencia_operacional_pct:   'Efic. Op. (%)',
  disponibilidade_mecanica_pct: 'Disponib. (%)',
  consumo_medio_lh:             'Cons. (L/h)',
  consumo_medio_lha:            'Cons. (L/ha)',
  consumo_medio_efetivo_lha:    'Cons. Ef. (L/ha)',
  consumo_medio_efetivo_lh:     'Cons. Ef. (L/h)',
  sem_apontamento_pct:          'Sem Apontamento (%)',
  motor_ocioso_pct:             'Motor Ocioso (%)',
  motor_ligado_pct:             'Motor Ligado (%)',
  rpm_medio:                    'RPM Médio',
  area_por_linha_ha:            'Área/Linha (ha)',
  pes_plataforma_24h:           'Pés Plat./24h',
  tempo_medio_turno_h:          'Turno Médio (h)',
}

const BENCH_KEYS = Object.keys(BENCH_LABELS)

function metricasToRow(tipo, metricas) {
  const row = { Tipo: tipo }
  for (const k of BENCH_KEYS) row[BENCH_LABELS[k]] = metricas?.[k] ?? null
  return row
}

// ─── ANÁLISE GERAL ────────────────────────────────────────────────────────────

export async function exportAnaliseGeral({ filteredData, equipRows, operadorRows, queryFilters = {} }) {
  const wb = XLSX.utils.book_new()

  const equipSheet = (equipRows || []).map(r => ({
    'Equipamento':       r.equip || r.label,
    'Área (ha)':         r.area_ha,
    'T. Efetivo (h)':    r.tempo_efetivo_h,
    'Rend. Op. (ha/h)':  r.rendimento_operacional_hah,
    'Rend. Real (ha/h)': r.rendimento_real_hah,
    'Velocidade (km/h)': r.velocidade_media_kmh,
    'Efic. Geral (%)':   r.eficiencia_geral_pct,
    'Efic. Op. (%)':     r.eficiencia_operacional_pct,
    'Disponib. (%)':     r.disponibilidade_mecanica_pct,
    'Cons. (L/h)':       r.consumo_medio_lh,
    'Cons. (L/ha)':      r.consumo_medio_lha,
    'Cons. Ef. (L/ha)':  r.consumo_medio_efetivo_lha,
    'Cons. Ef. (L/h)':   r.consumo_medio_efetivo_lh,
    'Cons. Total (L)':   r.consumo_total_l,
    'T. Total (h)':      r.tempo_total_h,
    'Motor Ocioso (%)':  r.motor_ocioso_pct,
    'RPM Médio':         r.rpm_medio,
    'Área/Linha (ha)':   r.area_por_linha_ha,
  }))
  addSheet(wb, 'Por Equipamento', equipSheet)

  const opSheet = (operadorRows || []).map(r => ({
    'Operador':            r.nome,
    'T. Trabalhando (h)':  r.trabalhando,
    'T. Deslocamento (h)': r.deslocamento,
    'T. Manobra (h)':      r.manobra,
    'T. Parada (h)':       r.parada,
    'T. Total (h)':        r.tempoTotal,
    'Trabalhando (%)':     r.trabalhando_pct != null ? +r.trabalhando_pct.toFixed(2) : null,
    'Turno Médio (h)':     r.turnoMedio != null ? +r.turnoMedio.toFixed(2) : null,
  }))
  addSheet(wb, 'Por Operador', opSheet)

  // dados brutos já em memória — não exige fetch adicional
  addSheet(wb, 'Dados Brutos', (filteredData || []).map(toExportRow))

  const period = queryFilters.dataInicio && queryFilters.dataFim
    ? `${queryFilters.dataInicio}_${queryFilters.dataFim}`
    : today()
  XLSX.writeFile(wb, `analise-geral_${period}.xlsx`)
}

// ─── BENCHMARK CLIENTE ────────────────────────────────────────────────────────

export async function exportBenchmarkCliente({ allClientesData, grupoMetricas, fetchFilters = {} }) {
  const wb = XLSX.utils.book_new()

  const resumoRows = [
    ...(allClientesData || []).map(c => metricasToRow(c.cliente, c)),
    ...(grupoMetricas ? [metricasToRow('— Média Grupo —', grupoMetricas)] : []),
  ]
  addSheet(wb, 'Clientes vs Grupo', resumoRows)
  addSheet(wb, 'Metodologia', metodologiaRows())

  const rawRows = await fetchRawRows({ solOnly: true, ...fetchFilters })
  addSheet(wb, 'Dados Brutos', rawRows.map(toExportRow))

  XLSX.writeFile(wb, `benchmark-cliente_${today()}.xlsx`)
}

// ─── BENCHMARK EQUIPAMENTO ────────────────────────────────────────────────────

export async function exportBenchmarkEquip({
  activeTab,
  maqLabel, modeloLabel, maqMetricas, modeloMetricas,
  labelA, labelB, equipMetricasA, equipMetricasB,
  modeloMetricasA, modeloMetricasB,
  fetchFilters = {},
}) {
  const wb = XLSX.utils.book_new()

  if (activeTab === 'maquina-modelo') {
    addSheet(wb, 'Máquina vs Modelo', [
      metricasToRow(maqLabel || 'Máquina', maqMetricas),
      metricasToRow(modeloLabel ? `Ref. ${modeloLabel}` : 'Referência Modelo', modeloMetricas),
    ])
  } else if (activeTab === 'equip-equip') {
    addSheet(wb, 'Equip vs Equip', [
      metricasToRow(labelA || 'Equipamento A', equipMetricasA),
      metricasToRow(labelB || 'Equipamento B', equipMetricasB),
    ])
  } else {
    addSheet(wb, 'Modelo vs Modelo', [
      metricasToRow(labelA || 'Modelo A', modeloMetricasA),
      metricasToRow(labelB || 'Modelo B', modeloMetricasB),
    ])
  }

  addSheet(wb, 'Metodologia', metodologiaRows())

  // dados brutos da safra + processo selecionado para verificação das médias ponderadas
  const rawRows = await fetchRawRows({ solOnly: true, ...fetchFilters })
  addSheet(wb, 'Dados Brutos Safra', rawRows.map(toExportRow))

  XLSX.writeFile(wb, `benchmark-equip_${today()}.xlsx`)
}

// ─── BENCHMARK JOHN DEERE ─────────────────────────────────────────────────────

const JD_KEYS = [
  'rendimento_operacional_hah', 'velocidade_media_kmh',
  'consumo_medio_lh', 'consumo_medio_lha', 'consumo_medio_efetivo_lha', 'consumo_medio_efetivo_lh',
  'area_por_linha_ha', 'tempo_medio_turno_h',
]

export async function exportBenchmarkJD({ allClientesData, grupoMetricas, fetchFilters = {} }) {
  const wb = XLSX.utils.book_new()

  const rows = [
    ...(allClientesData || []).map(c => {
      const row = { Tipo: 'Cliente', Nome: c.cliente }
      for (const k of JD_KEYS) row[BENCH_LABELS[k] || k] = c[k] ?? null
      return row
    }),
    ...(grupoMetricas ? [{
      Tipo: 'Média Grupo', Nome: '— Porteira Adentro —',
      ...Object.fromEntries(JD_KEYS.map(k => [BENCH_LABELS[k] || k, grupoMetricas[k] ?? null])),
    }] : []),
  ]
  addSheet(wb, 'Clientes John Deere', rows)

  const rawRows = await fetchRawRows({ jdOnly: true, ...fetchFilters })
  addSheet(wb, 'Dados Brutos', rawRows.map(toExportRow))

  XLSX.writeFile(wb, `benchmark-jd_${today()}.xlsx`)
}
