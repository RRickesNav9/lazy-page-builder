// BaseDadosPage.jsx
// Planilhão filtrável de registros operacionais.
// Fetch server-side (date/cliente/processo). Filtros por coluna client-side.
// Export XLSX: aba 1 = registros operacionais, aba 2 = motivos de parada.

import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useFilterOptions } from '../hooks/useData'
import { exportBaseDados } from '../lib/export'

// ─── COLUNAS ─────────────────────────────────────────────────────────────────

const COLS = [
  { key: 'data',                        label: 'Data',             w: 92,  type: 'str' },
  { key: 'cliente',                     label: 'Cliente',          w: 95,  type: 'str' },
  { key: 'propriedade',                 label: 'Propriedade',      w: 110, type: 'str' },
  { key: 'processo',                    label: 'Processo',         w: 88,  type: 'str' },
  { key: 'tipo_safra',                  label: 'Cultura',          w: 72,  type: 'str' },
  { key: 'equipamento_cod',             label: 'Cód.',             w: 52,  type: 'str' },
  { key: 'equipamento',                 label: 'Equipamento',      w: 160, type: 'str' },
  { key: 'modelo_equipamento',          label: 'Modelo',           w: 140, type: 'str' },
  { key: 'operador',                    label: 'Operador',         w: 130, type: 'str' },
  { key: 'area_ha',                     label: 'Área (ha)',        w: 76,  type: 'num', dec: 2 },
  { key: 'tempo_total_h',               label: 'T. Total (h)',     w: 80,  type: 'num', dec: 2 },
  { key: 'tempo_efetivo_h',             label: 'T. Efetivo (h)',   w: 88,  type: 'num', dec: 2 },
  { key: 'tempo_parada_h',              label: 'T. Parada (h)',    w: 84,  type: 'num', dec: 2 },
  { key: 'rendimento_operacional_hah',  label: 'Rend. Op. (ha/h)', w: 110, type: 'num', dec: 2 },
  { key: 'velocidade_media_kmh',        label: 'Vel. (km/h)',      w: 80,  type: 'num', dec: 1 },
  { key: 'eficiencia_geral_pct',        label: 'Efic. Geral (%)',  w: 96,  type: 'num', dec: 1 },
  { key: 'disponibilidade_mecanica_pct',label: 'Disponib. (%)',    w: 84,  type: 'num', dec: 1 },
  { key: 'consumo_total_l',             label: 'Cons. Total (L)',  w: 96,  type: 'num', dec: 1 },
  { key: 'consumo_medio_lh',            label: 'Cons. (L/h)',      w: 80,  type: 'num', dec: 2 },
  { key: 'consumo_medio_efetivo_lha',   label: 'Cons. Ef. (L/ha)',w: 100, type: 'num', dec: 2 },
  { key: 'rpm_medio',                   label: 'RPM Médio',        w: 78,  type: 'num', dec: 0 },
]

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

const PAGE_SIZE = 100

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function fetchPaginated(baseQuery) {
  let all = [], from = 0
  while (true) {
    const { data: page, error } = await baseQuery.range(from, from + 999)
    if (error) throw new Error(error.message)
    if (!page?.length) break
    all = all.concat(page)
    if (page.length < 1000) break
    from += 1000
  }
  return all
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

export default function BaseDadosPage() {
  const filterOptions = useFilterOptions()

  const [filtros, setFiltros]   = useState({ cliente: '', processo: '', tipo_safra: '', dataInicio: '', dataFim: '' })
  const [rows, setRows]         = useState([])
  const [stopRows, setStopRows] = useState([])
  const [loading, setLoading]   = useState(false)
  const [fetched, setFetched]   = useState(false)
  const [error, setError]       = useState(null)
  const [sortKey, setSortKey]   = useState('data')
  const [sortDir, setSortDir]   = useState('desc')
  const [colFilters, setColFilters] = useState({})
  const [page, setPage]         = useState(0)
  const [exporting, setExporting] = useState(false)

  // Filtros de coluna + ordenação (client-side)
  const displayed = useMemo(() => {
    let out = rows
    for (const [key, val] of Object.entries(colFilters)) {
      if (!val) continue
      const lc = val.toLowerCase()
      out = out.filter(r => String(r[key] ?? '').toLowerCase().includes(lc))
    }
    return [...out].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, colFilters, sortKey, sortDir])

  const pageRows   = displayed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(displayed.length / PAGE_SIZE)

  async function buscar() {
    setLoading(true)
    setFetched(false)
    setError(null)
    setPage(0)
    setColFilters({})
    try {
      let opQ = supabase
        .from('dashboard_operational_view')
        .select(BD_SELECT)
        .neq('cliente', 'Média Porteira')
        .order('data', { ascending: false })

      let stQ = supabase
        .from('dashboard_stop_view')
        .select('report_id, motivo_de_parada, tipo_parada, tempo_parado_h')

      if (filtros.dataInicio) { opQ = opQ.gte('data', filtros.dataInicio); stQ = stQ.gte('data', filtros.dataInicio) }
      if (filtros.dataFim)    { opQ = opQ.lte('data', filtros.dataFim);    stQ = stQ.lte('data', filtros.dataFim) }
      if (filtros.cliente)    { opQ = opQ.eq('cliente', filtros.cliente);  stQ = stQ.eq('cliente', filtros.cliente) }
      if (filtros.processo)   { opQ = opQ.eq('processo', filtros.processo); stQ = stQ.eq('processo', filtros.processo) }
      if (filtros.tipo_safra) { opQ = opQ.eq('tipo_safra', filtros.tipo_safra); stQ = stQ.eq('tipo_safra', filtros.tipo_safra) }

      const [opData, stData] = await Promise.all([fetchPaginated(opQ), fetchPaginated(stQ)])
      setRows(opData)
      setStopRows(stData)
      setFetched(true)
    } catch (e) {
      setError(`Erro: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(0)
  }

  function handleColFilter(key, val) {
    setColFilters(f => ({ ...f, [key]: val }))
    setPage(0)
  }

  function handleExport() {
    if (!rows.length || exporting) return
    setExporting(true)
    try { exportBaseDados(rows, stopRows) }
    finally { setExporting(false) }
  }

  const setF = (k) => (e) => setFiltros(f => ({ ...f, [k]: e.target.value }))

  const inp = { padding: '5px 8px', fontSize: 12, border: '1px solid #e0dbd4', borderRadius: 4, background: '#fff', fontFamily: 'inherit', color: '#1a1a1a', outline: 'none' }
  const lbl = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b6560', marginBottom: 3, display: 'block' }

  return (
    <div style={{ padding: 24, maxWidth: '100%', boxSizing: 'border-box' }}>

      {/* ── FILTROS DO TOPO ── */}
      <div style={{ background: '#fff', border: '1px solid #e0dbd4', borderRadius: 6, padding: '14px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>

          <div><label style={lbl}>De</label>
            <input type="date" value={filtros.dataInicio} onChange={setF('dataInicio')} style={{ ...inp, width: 130 }} />
          </div>
          <div><label style={lbl}>Até</label>
            <input type="date" value={filtros.dataFim} onChange={setF('dataFim')} style={{ ...inp, width: 130 }} />
          </div>
          <div><label style={lbl}>Cliente</label>
            <select value={filtros.cliente} onChange={setF('cliente')} style={{ ...inp, width: 130 }}>
              <option value="">Todos</option>
              {(filterOptions.clientes || []).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Processo</label>
            <select value={filtros.processo} onChange={setF('processo')} style={{ ...inp, width: 120 }}>
              <option value="">Todos</option>
              {(filterOptions.processos || []).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Cultura</label>
            <select value={filtros.tipo_safra} onChange={setF('tipo_safra')} style={{ ...inp, width: 100 }}>
              <option value="">Todas</option>
              {(filterOptions.tipos_safra || []).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <button
            onClick={buscar}
            disabled={loading}
            style={{
              padding: '6px 20px', fontSize: 13, fontWeight: 600,
              background: loading ? '#c0bab4' : '#2d4a2d', color: '#fff',
              border: 'none', borderRadius: 4, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}
          >
            {loading ? 'Buscando…' : 'Buscar'}
          </button>

          {fetched && !loading && (
            <>
              <span style={{ fontSize: 12, color: '#6b6560', alignSelf: 'center' }}>
                {rows.length.toLocaleString('pt-BR')} sessões
                {Object.values(colFilters).some(Boolean) && ` · ${displayed.length.toLocaleString('pt-BR')} filtradas`}
              </span>
              <button
                onClick={handleExport}
                disabled={exporting}
                style={{
                  padding: '6px 16px', fontSize: 12, fontWeight: 600,
                  background: exporting ? '#c0bab4' : '#4a6741', color: '#fff',
                  border: 'none', borderRadius: 4, cursor: exporting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                }}
              >
                {exporting ? 'Exportando…' : '↓ Exportar XLSX'}
              </button>
            </>
          )}
        </div>
        {error && <div style={{ marginTop: 8, fontSize: 12, color: '#8b2020' }}>{error}</div>}
      </div>

      {/* ── TABELA ── */}
      {fetched && (
        <div style={{ background: '#fff', border: '1px solid #e0dbd4', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11, width: 'max-content', minWidth: '100%' }}>
              <thead>
                {/* Cabeçalhos sortáveis */}
                <tr>
                  {COLS.map(col => {
                    const active = sortKey === col.key
                    return (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
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
                {/* Filtros por coluna */}
                <tr>
                  {COLS.map(col => (
                    <th key={col.key} style={{ background: '#f0ede8', padding: '4px 6px', borderRight: '1px solid #e0dbd4', borderBottom: '2px solid #e0dbd4' }}>
                      <input
                        type="text"
                        value={colFilters[col.key] || ''}
                        onChange={e => handleColFilter(col.key, e.target.value)}
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
                    <td colSpan={COLS.length} style={{ padding: 32, textAlign: 'center', color: '#6b6560', fontSize: 12 }}>
                      Nenhum dado encontrado.
                    </td>
                  </tr>
                ) : pageRows.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                    {COLS.map(col => {
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

          {/* Paginação */}
          {totalPages > 1 && (
            <div style={{
              padding: '10px 16px', borderTop: '1px solid #e0dbd4',
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6b6560',
            }}>
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                style={{ padding: '3px 10px', fontSize: 12, border: '1px solid #e0dbd4', borderRadius: 3, cursor: page === 0 ? 'not-allowed' : 'pointer', background: '#fff', fontFamily: 'inherit' }}
              >◀</button>
              <span>Página {page + 1} de {totalPages} · {displayed.length.toLocaleString('pt-BR')} registros</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                style={{ padding: '3px 10px', fontSize: 12, border: '1px solid #e0dbd4', borderRadius: 3, cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer', background: '#fff', fontFamily: 'inherit' }}
              >▶</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
