// BaseDadosPage.jsx
// Exportação de registros operacionais com granularidade configurável.
// Filtros locais — independentes do FilterContext. Foco em configurar e exportar XLSX.

import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { computeWeightedAvg, useFilterOptions } from '../hooks/useData'
import { exportBaseDados } from '../lib/export'

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

const BD_SELECT = [
  'id', 'data', 'safra', 'cliente', 'propriedade', 'processo', 'tipo_safra',
  'equipamento_cod', 'equipamento', 'modelo_equipamento', 'operador',
  'area_ha', 'consumo_total_l', 'consumo_efetivo_l',
  'tempo_total_h', 'tempo_efetivo_h', 'tempo_produtivo_h', 'tempo_parada_h', 'tempo_motor_ligado_h',
  'rendimento_operacional_hah', 'rendimento_real_hah', 'velocidade_media_kmh',
  'eficiencia_geral_pct', 'eficiencia_operacional_pct', 'disponibilidade_mecanica_pct',
  'consumo_medio_lh', 'consumo_medio_lha', 'consumo_medio_efetivo_lh', 'consumo_medio_efetivo_lha',
  'motor_ocioso_pct', 'motor_ligado_pct', 'sem_apontamento_pct', 'rpm_medio',
  'area_por_linha_ha', 'area_por_pe_ha',
].join(',')

const SUM_FIELDS = {
  area_ha:              'Área (ha)',
  consumo_total_l:      'Cons. Total (L)',
  consumo_efetivo_l:    'Cons. Efetivo (L)',
  tempo_total_h:        'T. Total (h)',
  tempo_efetivo_h:      'T. Efetivo (h)',
  tempo_produtivo_h:    'T. Produtivo (h)',
  tempo_parada_h:       'T. Parada (h)',
  tempo_motor_ligado_h: 'T. Motor Ligado (h)',
}

const RATE_FIELDS = {
  rendimento_operacional_hah:   'Rend. Op. (ha/h)',
  rendimento_real_hah:          'Rend. Real (ha/h)',
  velocidade_media_kmh:         'Velocidade (km/h)',
  eficiencia_geral_pct:         'Efic. Geral (%)',
  eficiencia_operacional_pct:   'Efic. Op. (%)',
  disponibilidade_mecanica_pct: 'Disponib. (%)',
  consumo_medio_lh:             'Cons. (L/h)',
  consumo_medio_lha:            'Cons. (L/ha)',
  consumo_medio_efetivo_lh:     'Cons. Ef. (L/h)',
  consumo_medio_efetivo_lha:    'Cons. Ef. (L/ha)',
  motor_ocioso_pct:             'Motor Ocioso (%)',
  motor_ligado_pct:             'Motor Ligado (%)',
  sem_apontamento_pct:          'Sem Apontamento (%)',
  rpm_medio:                    'RPM Médio',
  area_por_linha_ha:            'Área/Linha (ha)',
}

const GRANULARIDADES = [
  { id: 'sessao', label: 'Sessão'  },
  { id: 'dia',    label: 'Dia'     },
  { id: 'semana', label: 'Semana'  },
  { id: 'safra',  label: 'Safra'   },
]

const GROUP_BY_OPTIONS = [
  { id: 'equipamento', label: 'Equipamento' },
  { id: 'modelo',      label: 'Modelo'      },
  { id: 'cliente',     label: 'Cliente'     },
]

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function isoWeek(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z')
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const y = d.getUTCFullYear()
  const jan1 = new Date(Date.UTC(y, 0, 1))
  const w = Math.ceil(((d - jan1) / 864e5 + 1) / 7)
  return `${y}-W${String(w).padStart(2, '0')}`
}

function distinct(arr) {
  return [...new Set(arr.filter(Boolean))]
}

// Converte uma row bruta (granularidade = sessao) para o shape de exportação.
function sessionToExportRow(r) {
  return {
    'Data':                r.data,
    'Safra':               r.safra,
    'Cliente':             r.cliente,
    'Propriedade':         r.propriedade,
    'Processo':            r.processo,
    'Cultura':             r.tipo_safra,
    'Cód. Equipamento':    r.equipamento_cod,
    'Equipamento':         r.equipamento,
    'Modelo':              r.modelo_equipamento,
    'Operador':            r.operador,
    ...Object.fromEntries(Object.entries(SUM_FIELDS).map(([k, l]) => [l, r[k] ?? null])),
    ...Object.fromEntries(Object.entries(RATE_FIELDS).map(([k, l]) => [l, r[k] ?? null])),
  }
}

// Agrega rows brutas por granularidade e dimensão de agrupamento.
// Retorna linhas com chaves em português prontas para XLSX.
function aggregateToRows(rawRows, granularidade, groupBy) {
  if (rawRows.length === 0) return []
  if (granularidade === 'sessao') return rawRows.map(sessionToExportRow)

  const groups = new Map()
  for (const row of rawRows) {
    const timeKey = {
      dia:    row.data,
      semana: isoWeek(row.data),
      safra:  row.safra,
    }[granularidade]

    const dimKey = {
      equipamento: `${row.equipamento_cod || ''}|||${row.equipamento || ''}`,
      modelo:      row.modelo_equipamento || 'sem modelo',
      cliente:     row.cliente || '',
    }[groupBy]

    const key = `${timeKey}|||${dimKey}`
    if (!groups.has(key)) groups.set(key, { timeKey, rows: [] })
    groups.get(key).rows.push(row)
  }

  const result = []
  for (const { timeKey, rows } of groups.values()) {
    const first = rows[0]
    const avg   = computeWeightedAvg(rows) || {}
    const row   = {}

    // Coluna de tempo
    if (granularidade === 'dia')    row['Data']   = timeKey
    if (granularidade === 'semana') row['Semana'] = timeKey
    if (granularidade === 'safra')  row['Safra']  = timeKey

    // Dimensões
    if (groupBy === 'equipamento') {
      row['Cliente']          = distinct(rows.map(r => r.cliente)).join(', ')
      row['Processo']         = distinct(rows.map(r => r.processo)).join(' / ')
      row['Cultura']          = first.tipo_safra
      row['Cód. Equipamento'] = first.equipamento_cod
      row['Equipamento']      = first.equipamento
      row['Modelo']           = first.modelo_equipamento
    } else if (groupBy === 'modelo') {
      row['Modelo']   = first.modelo_equipamento || 'sem modelo'
      row['Cliente']  = distinct(rows.map(r => r.cliente)).join(', ')
      row['Processo'] = distinct(rows.map(r => r.processo)).join(' / ')
      row['Cultura']  = first.tipo_safra
    } else {
      row['Cliente']  = first.cliente
      row['Processo'] = distinct(rows.map(r => r.processo)).join(' / ')
      row['Cultura']  = first.tipo_safra
    }

    // Somas
    for (const [field, label] of Object.entries(SUM_FIELDS)) {
      row[label] = rows.reduce((s, r) => s + (r[field] ?? 0), 0)
    }

    // Médias ponderadas
    for (const [field, label] of Object.entries(RATE_FIELDS)) {
      row[label] = avg[field] ?? null
    }

    result.push(row)
  }

  result.sort((a, b) => {
    const tA = a['Data'] || a['Semana'] || a['Safra'] || ''
    const tB = b['Data'] || b['Semana'] || b['Safra'] || ''
    const dA = a['Equipamento'] || a['Modelo'] || a['Cliente'] || ''
    const dB = b['Equipamento'] || b['Modelo'] || b['Cliente'] || ''
    return tA.localeCompare(tB) || dA.localeCompare(dB)
  })

  return result
}

// Colunas exibidas no preview — suficiente para confirmar que os dados estão certos.
const PREVIEW_COL_KEYS = ['Data', 'Semana', 'Safra', 'Cliente', 'Processo', 'Cód. Equipamento', 'Equipamento', 'Modelo', 'Área (ha)', 'Rend. Op. (ha/h)', 'Cons. Ef. (L/ha)', 'T. Total (h)']

// ─── ESTILOS COMPARTILHADOS ───────────────────────────────────────────────────

const labelStyle = {
  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.06em', color: '#6b6560', marginBottom: 4,
}

const inputStyle = {
  width: '100%', padding: '6px 8px', boxSizing: 'border-box',
  fontSize: 12, color: '#1a1a1a', background: '#fff',
  border: '1px solid #e0dbd4', borderRadius: 4, outline: 'none',
}

const pillBase = {
  padding: '5px 14px', fontSize: 12, fontWeight: 500,
  border: '1px solid #e0dbd4', borderRadius: 4, cursor: 'pointer',
  fontFamily: 'inherit',
}

// ─── COMPONENTES ──────────────────────────────────────────────────────────────

function PillGroup({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          style={{
            ...pillBase,
            background: value === opt.id ? '#2d4a2d' : '#f7f5f2',
            color:      value === opt.id ? '#fff'     : '#6b6560',
            borderColor: value === opt.id ? '#2d4a2d' : '#e0dbd4',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function MultiCheckList({ options, value, onChange, height = 100 }) {
  return (
    <div style={{
      height, overflowY: 'auto', border: '1px solid #e0dbd4',
      borderRadius: 4, padding: '4px 0', background: '#fff',
    }}>
      {options.map(opt => (
        <label key={opt} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '3px 10px', cursor: 'pointer', fontSize: 12, color: '#1a1a1a',
          background: value.includes(opt) ? '#edf5ed' : 'transparent',
        }}>
          <input
            type="checkbox"
            checked={value.includes(opt)}
            onChange={() => onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt])}
            style={{ accentColor: '#2d4a2d' }}
          />
          {opt}
        </label>
      ))}
    </div>
  )
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

export default function BaseDadosPage() {
  const filterOptions = useFilterOptions()

  const [filtros, setFiltros] = useState({
    clientes: [], processos: [], tipos_safra: [],
    dataInicio: '', dataFim: '',
  })
  const [granularidade, setGranularidade] = useState('dia')
  const [groupBy, setGroupBy]             = useState('equipamento')
  const [rawData, setRawData]             = useState([])
  const [loading, setLoading]             = useState(false)
  const [fetched, setFetched]             = useState(false)
  const [exporting, setExporting]         = useState(false)
  const [error, setError]                 = useState(null)

  const aggregated = useMemo(
    () => aggregateToRows(rawData, granularidade, groupBy),
    [rawData, granularidade, groupBy]
  )

  // Colunas do preview: só as que existem nas linhas agregadas
  const previewCols = useMemo(() => {
    if (!aggregated.length) return []
    const keys = Object.keys(aggregated[0])
    return PREVIEW_COL_KEYS.filter(k => keys.includes(k))
  }, [aggregated])

  async function buscar() {
    if (!filtros.dataInicio && !filtros.dataFim && !filtros.clientes.length && !filtros.processos.length) {
      setError('Aplique ao menos um filtro antes de buscar.')
      return
    }
    setLoading(true)
    setFetched(false)
    setError(null)
    try {
      let query = supabase
        .from('dashboard_operational_view')
        .select(BD_SELECT)
        .neq('cliente', 'Média Porteira')
        .order('data', { ascending: false })

      if (filtros.clientes.length)    query = query.in('cliente',    filtros.clientes)
      if (filtros.processos.length)   query = query.in('processo',   filtros.processos)
      if (filtros.tipos_safra.length) query = query.in('tipo_safra', filtros.tipos_safra)
      if (filtros.dataInicio)         query = query.gte('data',      filtros.dataInicio)
      if (filtros.dataFim)            query = query.lte('data',      filtros.dataFim)

      let all = [], from = 0
      while (true) {
        const { data: page, error: err } = await query.range(from, from + 999)
        if (err) throw err
        if (!page?.length) break
        all = all.concat(page)
        if (page.length < 1000) break
        from += 1000
      }
      setRawData(all)
      setFetched(true)
    } catch (e) {
      setError(`Erro ao buscar: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  function handleExport() {
    if (!aggregated.length || exporting) return
    setExporting(true)
    try {
      exportBaseDados(aggregated, granularidade, groupBy)
    } finally {
      setExporting(false)
    }
  }

  const cardStyle = {
    background: '#fff', border: '1px solid #e0dbd4', borderRadius: 6,
    padding: 20, marginBottom: 16,
  }
  const sectionLabel = {
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.08em', color: '#4a3728', marginBottom: 14,
  }

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>

      {/* ── FILTROS ── */}
      <div style={cardStyle}>
        <div style={sectionLabel}>Filtros</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 16 }}>

          <div>
            <div style={labelStyle}>Cliente</div>
            <MultiCheckList
              options={filterOptions.clientes}
              value={filtros.clientes}
              onChange={v => setFiltros(f => ({ ...f, clientes: v }))}
            />
          </div>

          <div>
            <div style={labelStyle}>Processo</div>
            <MultiCheckList
              options={filterOptions.processos}
              value={filtros.processos}
              onChange={v => setFiltros(f => ({ ...f, processos: v }))}
              height={100}
            />
          </div>

          <div>
            <div style={labelStyle}>Cultura</div>
            <MultiCheckList
              options={filterOptions.tipos_safra}
              value={filtros.tipos_safra}
              onChange={v => setFiltros(f => ({ ...f, tipos_safra: v }))}
              height={100}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <div style={labelStyle}>Data De</div>
              <input type="date" value={filtros.dataInicio}
                onChange={e => setFiltros(f => ({ ...f, dataInicio: e.target.value }))}
                style={inputStyle} />
            </div>
            <div>
              <div style={labelStyle}>Data Até</div>
              <input type="date" value={filtros.dataFim}
                onChange={e => setFiltros(f => ({ ...f, dataFim: e.target.value }))}
                style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={buscar}
            disabled={loading}
            style={{
              padding: '8px 20px', fontSize: 13, fontWeight: 600,
              background: loading ? '#c0bab4' : '#2d4a2d', color: '#fff',
              border: 'none', borderRadius: 4, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {loading ? 'Buscando...' : 'Buscar dados'}
          </button>
          {fetched && !loading && (
            <span style={{ fontSize: 12, color: '#6b6560' }}>
              {rawData.length.toLocaleString('pt-BR')} sessões encontradas
            </span>
          )}
          {error && <span style={{ fontSize: 12, color: '#8b2020' }}>{error}</span>}
        </div>
      </div>

      {/* ── GRANULARIDADE + AGRUPAMENTO ── */}
      {fetched && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
            <div>
              <div style={sectionLabel}>Granularidade</div>
              <PillGroup options={GRANULARIDADES} value={granularidade} onChange={setGranularidade} />
            </div>
            {granularidade !== 'sessao' && (
              <div>
                <div style={sectionLabel}>Agrupar por</div>
                <PillGroup options={GROUP_BY_OPTIONS} value={groupBy} onChange={setGroupBy} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PREVIEW + EXPORTAR ── */}
      {fetched && aggregated.length > 0 && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <span style={sectionLabel}>Preview</span>
              <span style={{ fontSize: 12, color: '#6b6560', marginLeft: 8, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                {aggregated.length.toLocaleString('pt-BR')} linhas · exibindo {Math.min(20, aggregated.length)} · o XLSX contém todas as colunas
              </span>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              style={{
                padding: '8px 20px', fontSize: 13, fontWeight: 600,
                background: exporting ? '#c0bab4' : '#4a6741', color: '#fff',
                border: 'none', borderRadius: 4, cursor: exporting ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {exporting ? 'Exportando...' : `↓ Exportar XLSX (${aggregated.length.toLocaleString('pt-BR')} linhas)`}
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  {previewCols.map(col => (
                    <th key={col} style={{
                      background: '#2d4a2d', color: '#fff', fontWeight: 600,
                      padding: '7px 12px', textAlign: 'left', whiteSpace: 'nowrap',
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {aggregated.slice(0, 20).map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                    {previewCols.map(col => {
                      const v = row[col]
                      const isNum = typeof v === 'number'
                      return (
                        <td key={col} style={{
                          padding: '6px 12px', color: '#1a1a1a',
                          borderBottom: '1px solid #f0ede8', whiteSpace: 'nowrap',
                          textAlign: isNum ? 'right' : 'left',
                        }}>
                          {isNum ? v.toFixed(2) : (v ?? '—')}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {fetched && aggregated.length === 0 && !loading && (
        <div style={{ ...cardStyle, textAlign: 'center', color: '#6b6560', fontSize: 13, padding: 40 }}>
          Nenhum dado encontrado para os filtros selecionados.
        </div>
      )}
    </div>
  )
}
