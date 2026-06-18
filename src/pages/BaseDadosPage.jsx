// BaseDadosPage.jsx
// Planilhão filtrável — auto-fetch via FilterContext global.
// Tab 1: Registros Operacionais. Tab 2: Motivos de Parada (joinados, seguem filtros da tab 1).
// Seletor de colunas: 15 habilitadas por padrão.

import { useState, useMemo, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useFilters } from '../lib/FilterContext'
import { exportBaseDados } from '../lib/export'

// ─── COLUNAS OPERACIONAIS ─────────────────────────────────────────────────────

const ALL_COLS = [
  // Identificação
  { key: 'data',                        label: 'Data',              w: 92,  type: 'str', group: 'Identificação' },
  { key: 'cliente',                     label: 'Cliente',           w: 95,  type: 'str', group: 'Identificação' },
  { key: 'propriedade',                 label: 'Propriedade',       w: 110, type: 'str', group: 'Identificação' },
  { key: 'safra',                       label: 'Safra',             w: 80,  type: 'str', group: 'Identificação' },
  { key: 'processo',                    label: 'Processo',          w: 88,  type: 'str', group: 'Identificação' },
  { key: 'tipo_safra',                  label: 'Cultura',           w: 72,  type: 'str', group: 'Identificação' },
  // Equipamento
  { key: 'equipamento_cod',             label: 'Cód.',              w: 52,  type: 'str', group: 'Equipamento' },
  { key: 'equipamento',                 label: 'Equipamento',       w: 160, type: 'str', group: 'Equipamento' },
  { key: 'modelo_equipamento',          label: 'Modelo',            w: 140, type: 'str', group: 'Equipamento' },
  { key: 'operador',                    label: 'Operador',          w: 130, type: 'str', group: 'Equipamento' },
  // Área e Rendimento
  { key: 'area_ha',                     label: 'Área (ha)',         w: 76,  type: 'num', dec: 2, group: 'Área e Rendimento' },
  { key: 'rendimento_operacional_hah',  label: 'Rend. Op. (ha/h)', w: 110, type: 'num', dec: 2, group: 'Área e Rendimento' },
  { key: 'rendimento_real_hah',         label: 'Rend. Real (ha/h)',w: 110, type: 'num', dec: 2, group: 'Área e Rendimento' },
  { key: 'velocidade_media_kmh',        label: 'Vel. (km/h)',       w: 80,  type: 'num', dec: 1, group: 'Área e Rendimento' },
  { key: 'area_por_linha_ha',           label: 'Área/Linha (ha)',   w: 100, type: 'num', dec: 3, group: 'Área e Rendimento' },
  { key: 'area_por_pe_ha',              label: 'Área/Pé (ha)',      w: 90,  type: 'num', dec: 3, group: 'Área e Rendimento' },
  // Tempo
  { key: 'tempo_total_h',               label: 'T. Total (h)',      w: 80,  type: 'num', dec: 2, group: 'Tempo' },
  { key: 'tempo_efetivo_h',             label: 'T. Efetivo (h)',    w: 88,  type: 'num', dec: 2, group: 'Tempo' },
  { key: 'tempo_produtivo_h',           label: 'T. Produtivo (h)', w: 96,  type: 'num', dec: 2, group: 'Tempo' },
  { key: 'tempo_parada_h',              label: 'T. Parada (h)',     w: 84,  type: 'num', dec: 2, group: 'Tempo' },
  { key: 'tempo_motor_ligado_h',        label: 'T. Motor Lig. (h)',w: 106, type: 'num', dec: 2, group: 'Tempo' },
  // Eficiência
  { key: 'eficiencia_geral_pct',        label: 'Efic. Geral (%)',  w: 96,  type: 'num', dec: 1, group: 'Eficiência' },
  { key: 'eficiencia_operacional_pct',  label: 'Efic. Op. (%)',    w: 80,  type: 'num', dec: 1, group: 'Eficiência' },
  { key: 'disponibilidade_mecanica_pct',label: 'Disponib. (%)',    w: 84,  type: 'num', dec: 1, group: 'Eficiência' },
  { key: 'sem_apontamento_pct',         label: 'Sem Apontar. (%)', w: 100, type: 'num', dec: 1, group: 'Eficiência' },
  { key: 'motor_ocioso_pct',            label: 'Motor Ocioso (%)', w: 100, type: 'num', dec: 1, group: 'Eficiência' },
  { key: 'motor_ligado_pct',            label: 'Motor Ligado (%)', w: 100, type: 'num', dec: 1, group: 'Eficiência' },
  // Consumo
  { key: 'consumo_total_l',             label: 'Cons. Total (L)',  w: 96,  type: 'num', dec: 1, group: 'Consumo' },
  { key: 'consumo_efetivo_l',           label: 'Cons. Efetivo (L)',w: 100, type: 'num', dec: 1, group: 'Consumo' },
  { key: 'consumo_medio_lh',            label: 'Cons. (L/h)',      w: 80,  type: 'num', dec: 2, group: 'Consumo' },
  { key: 'consumo_medio_lha',           label: 'Cons. (L/ha)',     w: 80,  type: 'num', dec: 2, group: 'Consumo' },
  { key: 'consumo_medio_efetivo_lh',    label: 'Cons. Ef. (L/h)', w: 90,  type: 'num', dec: 2, group: 'Consumo' },
  { key: 'consumo_medio_efetivo_lha',   label: 'Cons. Ef. (L/ha)',w: 100, type: 'num', dec: 2, group: 'Consumo' },
  // Motor
  { key: 'rpm_medio',                   label: 'RPM Médio',        w: 78,  type: 'num', dec: 0, group: 'Motor' },
]

const DEFAULT_VISIBLE = new Set([
  'data', 'cliente', 'propriedade', 'processo', 'tipo_safra',
  'equipamento', 'modelo_equipamento', 'operador',
  'area_ha', 'tempo_total_h', 'tempo_efetivo_h',
  'rendimento_operacional_hah', 'velocidade_media_kmh',
  'eficiencia_geral_pct', 'consumo_medio_efetivo_lha',
])

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

// ─── COLUNAS DA TAB PARADAS ───────────────────────────────────────────────────

const STOP_COLS = [
  { key: 'data',             label: 'Data',             w: 92,  type: 'str' },
  { key: 'cliente',          label: 'Cliente',          w: 95,  type: 'str' },
  { key: 'propriedade',      label: 'Propriedade',      w: 110, type: 'str' },
  { key: 'processo',         label: 'Processo',         w: 88,  type: 'str' },
  { key: 'equipamento_cod',  label: 'Cód.',             w: 52,  type: 'str' },
  { key: 'equipamento',      label: 'Equipamento',      w: 160, type: 'str' },
  { key: 'operador',         label: 'Operador',         w: 130, type: 'str' },
  { key: 'motivo_de_parada', label: 'Motivo de Parada', w: 200, type: 'str' },
  { key: 'tipo_parada',      label: 'Tipo',             w: 110, type: 'str' },
  { key: 'tempo_parado_h',   label: 'T. Parado (h)',    w: 84,  type: 'num', dec: 2 },
]

const PAGE_SIZE = 100

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function fetchPaginated(query) {
  let all = [], from = 0
  while (true) {
    const { data: page, error } = await query.range(from, from + 999)
    if (error) throw new Error(error.message)
    if (!page?.length) break
    all = all.concat(page)
    if (page.length < 1000) break
    from += 1000
  }
  return all
}

function applyQF(query, qf) {
  if (qf.dataInicio)          query = query.gte('data', qf.dataInicio)
  if (qf.dataFim)             query = query.lte('data', qf.dataFim)
  if (qf.clientes?.length)    query = query.in('cliente', qf.clientes)
  if (qf.processos?.length)   query = query.in('processo', qf.processos)
  if (qf.tipos_safra?.length) query = query.in('tipo_safra', qf.tipos_safra)
  return query
}

function sortRows(arr, key, dir) {
  return [...arr].sort((a, b) => {
    const av = a[key] ?? ''
    const bv = b[key] ?? ''
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return dir === 'asc' ? cmp : -cmp
  })
}

// ─── COMPONENTES ─────────────────────────────────────────────────────────────

function ColsDropdown({ visibleCols, setVisibleCols, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const groups = useMemo(() => {
    const map = new Map()
    for (const col of ALL_COLS) {
      if (!map.has(col.group)) map.set(col.group, [])
      map.get(col.group).push(col)
    }
    return map
  }, [])

  function toggle(key) {
    setVisibleCols(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', right: 0, marginTop: 4,
      background: '#fff', border: '1px solid #e0dbd4', borderRadius: 6,
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      zIndex: 100, maxHeight: 420, overflowY: 'auto', minWidth: 220,
    }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0ede8', display: 'flex', gap: 10 }}>
        <button onClick={() => setVisibleCols(new Set(ALL_COLS.map(c => c.key)))}
          style={{ fontSize: 11, color: '#4a6741', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
          Todas
        </button>
        <button onClick={() => setVisibleCols(new Set(DEFAULT_VISIBLE))}
          style={{ fontSize: 11, color: '#6b6560', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
          Padrão (15)
        </button>
      </div>
      {[...groups.entries()].map(([group, cols]) => (
        <div key={group}>
          <div style={{ padding: '6px 12px 2px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9e998f' }}>
            {group}
          </div>
          {cols.map(col => (
            <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', cursor: 'pointer' }}>
              <input type="checkbox" checked={visibleCols.has(col.key)} onChange={() => toggle(col.key)} style={{ accentColor: '#2d4a2d' }} />
              <span style={{ fontSize: 12, color: '#1a1a1a' }}>{col.label}</span>
            </label>
          ))}
        </div>
      ))}
    </div>
  )
}

function DataTable({ cols, rows, sortKey, sortDir, onSort, colFilters, onColFilter, page, setPage, totalRows }) {
  const totalPages = Math.ceil(totalRows / PAGE_SIZE)
  const pageRows = rows

  return (
    <div style={{ background: '#fff', border: '1px solid #e0dbd4', borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 11, width: 'max-content', minWidth: '100%' }}>
          <thead>
            <tr>
              {cols.map(col => {
                const active = sortKey === col.key
                return (
                  <th key={col.key} onClick={() => onSort(col.key)}
                    style={{
                      background: '#2d4a2d', color: '#fff',
                      padding: '7px 10px', textAlign: col.type === 'num' ? 'right' : 'left',
                      whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none',
                      minWidth: col.w, borderRight: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    {col.label}{' '}
                    <span style={{ opacity: active ? 1 : 0.3 }}>
                      {active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </th>
                )
              })}
            </tr>
            <tr>
              {cols.map(col => (
                <th key={col.key} style={{ background: '#f0ede8', padding: '4px 6px', borderRight: '1px solid #e0dbd4', borderBottom: '2px solid #e0dbd4' }}>
                  <input
                    type="text"
                    value={colFilters[col.key] || ''}
                    onChange={e => onColFilter(col.key, e.target.value)}
                    placeholder="filtrar…"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '3px 6px', fontSize: 11,
                      border: '1px solid #d0cbc4', borderRadius: 3,
                      background: '#fff', outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={cols.length} style={{ padding: 32, textAlign: 'center', color: '#6b6560', fontSize: 12 }}>
                  Nenhum dado encontrado.
                </td>
              </tr>
            ) : pageRows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                {cols.map(col => {
                  const v = row[col.key]
                  return (
                    <td key={col.key} style={{
                      padding: '5px 10px',
                      textAlign: col.type === 'num' ? 'right' : 'left',
                      borderBottom: '1px solid #f0ede8',
                      borderRight: '1px solid #f5f2ee',
                      whiteSpace: 'nowrap', color: '#1a1a1a',
                    }}>
                      {col.type === 'num'
                        ? (v != null ? Number(v).toFixed(col.dec ?? 2) : '—')
                        : (v ?? '—')
                      }
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid #e0dbd4', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6b6560' }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={{ padding: '3px 10px', fontSize: 12, border: '1px solid #e0dbd4', borderRadius: 3, cursor: page === 0 ? 'not-allowed' : 'pointer', background: '#fff', fontFamily: 'inherit' }}>◀</button>
          <span>Página {page + 1} de {totalPages} · {totalRows.toLocaleString('pt-BR')} registros</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
            style={{ padding: '3px 10px', fontSize: 12, border: '1px solid #e0dbd4', borderRadius: 3, cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer', background: '#fff', fontFamily: 'inherit' }}>▶</button>
        </div>
      )}
    </div>
  )
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

export default function BaseDadosPage() {
  const { queryFilters, registerExportFn } = useFilters()

  const [rows, setRows]         = useState([])
  const [stopRows, setStopRows] = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const [activeTab, setActiveTab] = useState('registros')

  // Op table state
  const [sortKey, setSortKey]   = useState('data')
  const [sortDir, setSortDir]   = useState('desc')
  const [colFilters, setColFilters] = useState({})
  const [page, setPage]         = useState(0)
  const [visibleCols, setVisibleCols] = useState(DEFAULT_VISIBLE)
  const [colsOpen, setColsOpen] = useState(false)

  // Stop table state
  const [stopSortKey, setStopSortKey] = useState('data')
  const [stopSortDir, setStopSortDir] = useState('desc')
  const [stopColFilters, setStopColFilters] = useState({})
  const [stopPage, setStopPage] = useState(0)

  // Auto-fetch quando queryFilters mudar
  const qfKey = JSON.stringify(queryFilters)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setPage(0)
    setStopPage(0)
    setColFilters({})
    setStopColFilters({})

    ;(async () => {
      try {
        let opQ = supabase
          .from('dashboard_operational_view')
          .select(BD_SELECT)
          .neq('cliente', 'Média Porteira')
          .order('data', { ascending: false })

        let stQ = supabase
          .from('dashboard_stop_view')
          .select('report_id, motivo_de_parada, tipo_parada, tempo_parado_h')

        opQ = applyQF(opQ, queryFilters)
        stQ = applyQF(stQ, queryFilters)

        const [opData, stData] = await Promise.all([fetchPaginated(opQ), fetchPaginated(stQ)])
        if (!cancelled) {
          setRows(opData)
          setStopRows(stData)
        }
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [qfKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Registra export no FAB
  useEffect(() => {
    registerExportFn(() => exportBaseDados(rows, stopRows))
    return () => registerExportFn(null)
  }, [rows, stopRows, registerExportFn])

  // ─── Op records: filter + sort + paginate ───────────────────────────────
  const visibleColDefs = useMemo(
    () => ALL_COLS.filter(c => visibleCols.has(c.key)),
    [visibleCols]
  )

  const opById = useMemo(() => new Map(rows.map(r => [r.id, r])), [rows])

  const displayed = useMemo(() => {
    let out = rows
    for (const [key, val] of Object.entries(colFilters)) {
      if (!val) continue
      const lc = val.toLowerCase()
      out = out.filter(r => String(r[key] ?? '').toLowerCase().includes(lc))
    }
    return sortRows(out, sortKey, sortDir)
  }, [rows, colFilters, sortKey, sortDir])

  const displayedIds = useMemo(() => new Set(displayed.map(r => r.id)), [displayed])
  const pageRows = displayed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleOpSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(0)
  }
  function handleOpColFilter(key, val) {
    setColFilters(f => ({ ...f, [key]: val }))
    setPage(0)
  }

  // ─── Stop records: join + filter + sort + paginate ───────────────────────
  // Só mostra paradas dos registros visíveis na tab principal
  const joinedStopRows = useMemo(() => {
    return stopRows
      .filter(s => displayedIds.has(s.report_id))
      .map(s => ({
        ...(opById.get(s.report_id) || {}),
        motivo_de_parada: s.motivo_de_parada,
        tipo_parada: s.tipo_parada,
        tempo_parado_h: s.tempo_parado_h,
      }))
  }, [stopRows, displayedIds, opById])

  const displayedStop = useMemo(() => {
    let out = joinedStopRows
    for (const [key, val] of Object.entries(stopColFilters)) {
      if (!val) continue
      const lc = val.toLowerCase()
      out = out.filter(r => String(r[key] ?? '').toLowerCase().includes(lc))
    }
    return sortRows(out, stopSortKey, stopSortDir)
  }, [joinedStopRows, stopColFilters, stopSortKey, stopSortDir])

  const stopPageRows = displayedStop.slice(stopPage * PAGE_SIZE, (stopPage + 1) * PAGE_SIZE)

  function handleStopSort(key) {
    if (stopSortKey === key) setStopSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setStopSortKey(key); setStopSortDir('asc') }
    setStopPage(0)
  }
  function handleStopColFilter(key, val) {
    setStopColFilters(f => ({ ...f, [key]: val }))
    setStopPage(0)
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────

  const hasColFilter = Object.values(colFilters).some(Boolean)

  return (
    <div style={{ padding: 24, maxWidth: '100%', boxSizing: 'border-box' }}>

      {/* ── TOOLBAR ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>

        {/* Tab switcher */}
        <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #e0dbd4' }}>
          <button
            onClick={() => setActiveTab('registros')}
            style={{
              padding: '7px 20px', fontSize: 12, fontWeight: activeTab === 'registros' ? 600 : 400,
              border: 'none', fontFamily: 'inherit', cursor: 'pointer',
              background: activeTab === 'registros' ? '#2d4a2d' : '#fff',
              color: activeTab === 'registros' ? '#fff' : '#6b6560',
            }}
          >
            Registros Operacionais
            {rows.length > 0 && (
              <span style={{ marginLeft: 6, opacity: 0.75 }}>
                ({hasColFilter ? `${displayed.length.toLocaleString('pt-BR')}/` : ''}{rows.length.toLocaleString('pt-BR')})
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('paradas')}
            style={{
              padding: '7px 20px', fontSize: 12, fontWeight: activeTab === 'paradas' ? 600 : 400,
              border: 'none', borderLeft: '1px solid #e0dbd4', fontFamily: 'inherit', cursor: 'pointer',
              background: activeTab === 'paradas' ? '#2d4a2d' : '#fff',
              color: activeTab === 'paradas' ? '#fff' : '#6b6560',
            }}
          >
            Motivos de Parada
            {joinedStopRows.length > 0 && (
              <span style={{ marginLeft: 6, opacity: 0.75 }}>
                ({displayedStop.length.toLocaleString('pt-BR')})
              </span>
            )}
          </button>
        </div>

        {/* Seletor de colunas — só na tab registros */}
        {activeTab === 'registros' && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setColsOpen(o => !o)}
              style={{
                padding: '6px 14px', fontSize: 12, border: '1px solid #e0dbd4',
                borderRadius: 4, background: '#fff', cursor: 'pointer', fontFamily: 'inherit', color: '#4a3728',
              }}
            >
              Colunas ({visibleCols.size}) ▾
            </button>
            {colsOpen && (
              <ColsDropdown
                visibleCols={visibleCols}
                setVisibleCols={setVisibleCols}
                onClose={() => setColsOpen(false)}
              />
            )}
          </div>
        )}

        {/* Status */}
        {loading && (
          <span style={{ fontSize: 12, color: '#6b6560' }}>Carregando…</span>
        )}
        {error && (
          <span style={{ fontSize: 12, color: '#8b2020' }}>Erro: {error}</span>
        )}
      </div>

      {/* ── TAB: REGISTROS ── */}
      {activeTab === 'registros' && !loading && (
        <DataTable
          cols={visibleColDefs}
          rows={pageRows}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleOpSort}
          colFilters={colFilters}
          onColFilter={handleOpColFilter}
          page={page}
          setPage={setPage}
          totalRows={displayed.length}
        />
      )}

      {/* ── TAB: PARADAS ── */}
      {activeTab === 'paradas' && !loading && (
        <DataTable
          cols={STOP_COLS}
          rows={stopPageRows}
          sortKey={stopSortKey}
          sortDir={stopSortDir}
          onSort={handleStopSort}
          colFilters={stopColFilters}
          onColFilter={handleStopColFilter}
          page={stopPage}
          setPage={setStopPage}
          totalRows={displayedStop.length}
        />
      )}
    </div>
  )
}
