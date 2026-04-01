import { useState, useMemo } from 'react'
import React from 'react'
import { useGrupoData } from '../hooks/useData'
import { KPICard, HBarChart, PageLoader } from '../components/UI'
import { fmtHah, fmtPct, fmtLh, fmtKmh } from '../lib/utils'

const METRICAS_GRUPO = [
  { value: 'rendimento_operacional_hah_grupo',  label: 'Rendimento Operacional (ha/h)', fmt: fmtHah },
  { value: 'rendimento_real_hah_grupo',         label: 'Rendimento Real (ha/h)',        fmt: fmtHah },
  { value: 'eficiencia_operacional_pct_grupo',  label: 'Eficiência Operacional (%)',    fmt: fmtPct },
  { value: 'eficiencia_geral_pct_grupo',        label: 'Eficiência Geral (%)',          fmt: fmtPct },
  { value: 'disponibilidade_mecanica_pct_grupo',label: 'Disponibilidade Mecânica (%)', fmt: fmtPct },
  { value: 'consumo_medio_efetivo_lh_grupo',    label: 'Consumo Ef. (l/h)',            fmt: fmtLh  },
  { value: 'consumo_medio_lh_grupo',            label: 'Consumo Médio (l/h)',          fmt: fmtLh  },
  { value: 'velocidade_media_kmh_grupo',        label: 'Velocidade Média (km/h)',      fmt: fmtKmh },
  { value: 'sem_apontamento_pct_grupo',         label: 'Sem Apontamento (%)',          fmt: fmtPct },
  { value: 'motor_ocioso_pct_grupo',            label: 'Motor Ocioso (%)',             fmt: fmtPct },
]

const TABLE_COLS = [
  { key: 'processo',                           label: 'Processo' },
  { key: 'tipo_safra',                         label: 'Cultura' },
  { key: 'rendimento_operacional_hah_grupo',   label: 'Rend. Op. (ha/h)',  fmt: fmtHah },
  { key: 'rendimento_real_hah_grupo',          label: 'Rend. Real (ha/h)', fmt: fmtHah },
  { key: 'eficiencia_geral_pct_grupo',         label: 'Efic. Geral (%)',   fmt: fmtPct },
  { key: 'disponibilidade_mecanica_pct_grupo', label: 'Disp. Mec. (%)',    fmt: fmtPct },
  { key: 'consumo_medio_efetivo_lh_grupo',     label: 'Cons. Ef. (l/h)',   fmt: fmtLh  },
  { key: 'velocidade_media_kmh_grupo',         label: 'Vel. Média (km/h)', fmt: fmtKmh },
  { key: 'sem_apontamento_pct_grupo',          label: 'Sem Apoint. (%)',   fmt: fmtPct },
  { key: 'n_clientes',                         label: 'Nº Clientes' },
  { key: 'dias_ativos_min',                    label: 'Dias Ativos' },
]

const inputCls = 'bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200'

export default function MediaPorteiraPage() {
  const [filters, setFilters] = useState({})
  const [metrica, setMetrica] = useState('rendimento_operacional_hah_grupo')
  const [expanded, setExpanded] = useState(null)

  // Fetch all rows once; filter and derive options client-side (table is small)
  const { data: allData, loading, error } = useGrupoData({})

  const options = useMemo(() => ({
    safras:      [...new Set(allData.map(r => r.safra).filter(Boolean))].sort().reverse(),
    tipos_safra: [...new Set(allData.map(r => r.tipo_safra).filter(Boolean))].sort(),
    processos:   [...new Set(allData.map(r => r.processo).filter(Boolean))].sort(),
  }), [allData])

  const filteredData = useMemo(() => allData.filter(r => {
    if (filters.safra      && r.safra      !== filters.safra)      return false
    if (filters.tipo_safra && r.tipo_safra !== filters.tipo_safra) return false
    if (filters.processo   && r.processo   !== filters.processo)   return false
    return true
  }), [allData, filters])

  const tableRows = useMemo(() =>
    [...filteredData].sort((a, b) =>
      (b.rendimento_operacional_hah_grupo || 0) - (a.rendimento_operacional_hah_grupo || 0)
    ), [filteredData])

  // Weighted average by n_clientes for KPI summary
  const kpi = useMemo(() => {
    if (!filteredData.length) return null
    const totalW = filteredData.reduce((a, r) => a + (r.n_clientes || 1), 0)
    const wavg = key => filteredData.reduce((a, r) => a + (parseFloat(r[key]) || 0) * (r.n_clientes || 1), 0) / totalW
    return {
      rendimento_operacional: wavg('rendimento_operacional_hah_grupo'),
      eficiencia_geral:       wavg('eficiencia_geral_pct_grupo'),
      disponibilidade:        wavg('disponibilidade_mecanica_pct_grupo'),
      consumo_efetivo:        wavg('consumo_medio_efetivo_lh_grupo'),
    }
  }, [filteredData])

  // All safras for the expanded processo/tipo_safra combination
  const expandedRows = useMemo(() => {
    if (!expanded) return []
    return allData
      .filter(r => r.processo === expanded.processo && r.tipo_safra === expanded.tipo_safra)
      .sort((a, b) => String(b.safra).localeCompare(String(a.safra)))
  }, [allData, expanded])

  const metricaDef = METRICAS_GRUPO.find(m => m.value === metrica) || METRICAS_GRUPO[0]

  const setFilter = (key, val) => {
    setFilters(f => ({ ...f, [key]: val || undefined }))
    setExpanded(null)
  }

  if (loading) return <PageLoader />
  if (error) return <div className="p-6 text-red-400">Erro: {error}</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Média Porteira</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Benchmarks do grupo por processo e safra</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-end">
        {[
          { key: 'safra',      label: 'Safra',   opts: options.safras },
          { key: 'tipo_safra', label: 'Cultura', opts: options.tipos_safra },
          { key: 'processo',   label: 'Processo', opts: options.processos },
        ].map(({ key, label, opts }) => (
          <div key={key} className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-500 dark:text-zinc-500">{label}</label>
            <select
              value={filters[key] || ''}
              onChange={e => setFilter(key, e.target.value)}
              className={`${inputCls} min-w-[130px]`}
            >
              <option value="">Todos</option>
              {opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
        <button
          onClick={() => { setFilters({}); setExpanded(null) }}
          className="self-end px-3 py-1.5 rounded-lg text-xs text-slate-500 border border-slate-200 hover:border-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:text-zinc-200 transition-colors"
        >
          Limpar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Rend. Operacional" value={fmtHah(kpi?.rendimento_operacional)} color="emerald" />
        <KPICard label="Efic. Geral"        value={fmtPct(kpi?.eficiencia_geral)}       color="blue"    />
        <KPICard label="Disp. Mecânica"     value={fmtPct(kpi?.disponibilidade)}         color="amber"   />
        <KPICard label="Consumo Ef."         value={fmtLh(kpi?.consumo_efetivo)}          color="violet"  />
      </div>

      {/* Gráfico */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-zinc-300">{metricaDef.label} por Processo</h3>
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-500 dark:text-zinc-500">Métrica</label>
            <select
              value={metrica}
              onChange={e => setMetrica(e.target.value)}
              className={`${inputCls} min-w-[220px]`}
            >
              {METRICAS_GRUPO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <HBarChart
          data={tableRows.map(r => ({
            label: r.tipo_safra ? `${r.processo} · ${r.tipo_safra}` : r.processo,
            value: parseFloat(r[metrica]) || 0,
            color: '#22c55e',
          }))}
        />
      </div>

      {/* Tabela com linhas expansíveis */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-zinc-300 mb-1">
          Processos — {filters.safra || 'Todas as Safras'}
        </h3>
        <p className="text-xs text-zinc-500 mb-4">Clique em uma linha para ver a evolução por safra</p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900">
                <th className="w-6 px-2 py-2.5" />
                {TABLE_COLS.map(col => (
                  <th key={col.key} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500 whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 && (
                <tr>
                  <td colSpan={TABLE_COLS.length + 1} className="text-center py-8 text-slate-400 dark:text-zinc-600">
                    Nenhum registro encontrado
                  </td>
                </tr>
              )}
              {tableRows.map((row) => {
                const rowKey = `${row.processo}__${row.tipo_safra}`
                const isExpanded = expanded?.key === rowKey
                return (
                  <React.Fragment key={rowKey}>
                    <tr
                      onClick={() => setExpanded(isExpanded ? null : { key: rowKey, processo: row.processo, tipo_safra: row.tipo_safra })}
                      className={`border-b border-slate-100 dark:border-zinc-800/50 cursor-pointer transition-colors ${isExpanded ? 'bg-emerald-950/20' : 'hover:bg-slate-50 dark:hover:bg-zinc-800/40'}`}
                    >
                      <td className="px-2 py-2 text-center text-xs text-zinc-500 select-none">
                        {isExpanded ? '▼' : '▶'}
                      </td>
                      {TABLE_COLS.map(col => (
                        <td key={col.key} className="px-3 py-2 tabular-nums text-slate-700 dark:text-zinc-300 whitespace-nowrap">
                          {col.fmt ? col.fmt(row[col.key]) : (row[col.key] ?? '—')}
                        </td>
                      ))}
                    </tr>
                    {isExpanded && expandedRows.map((er, j) => (
                      <tr key={`${rowKey}_${j}`} className="border-b border-emerald-900/20 bg-emerald-950/10">
                        <td className="px-2 py-1.5 text-center text-xs text-emerald-600 select-none">↳</td>
                        {/* First col: safra as identifier instead of processo */}
                        <td className="px-3 py-1.5 text-xs text-emerald-400 font-medium whitespace-nowrap">{er.safra}</td>
                        {/* Remaining cols same as main row */}
                        {TABLE_COLS.slice(1).map(col => (
                          <td key={col.key} className="px-3 py-1.5 tabular-nums text-xs text-zinc-400 whitespace-nowrap">
                            {col.fmt ? col.fmt(er[col.key]) : (er[col.key] ?? '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
