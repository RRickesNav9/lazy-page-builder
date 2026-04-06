import { useState, useMemo } from 'react'
import { useGrupoBenchmark, useOperationalData, useFilterOptions } from '../hooks/useData'
import {
  KPICard, DonutChart, VBarChart, ThermometerBar,
  FilterPanel, FilterButton, PageLoader, FetchingBar, semaphorePct
} from '../components/UI'
import {
  aggregateRows, groupBy, defaultSafra,
  fmtHah, fmtPct, fmtLh, fmtKmh, fmt, METRICAS
} from '../lib/utils'

const FIXED_COLS = [
  { key: 'rendimento_operacional_hah', label: 'Rend. Op. (ha/h)', fmtFn: fmtHah, highlight: true },
  { key: 'eficiencia_geral_pct',       label: 'Efic. Geral (%)',  fmtFn: fmtPct, pct: true },
  { key: 'disponibilidade_mecanica_pct', label: 'Disp. Mec. (%)', fmtFn: fmtPct, pct: true },
  { key: 'velocidade_media_kmh',        label: 'Vel. (km/h)',     fmtFn: fmtKmh },
  { key: 'consumo_medio_lh',            label: 'Consumo (l/h)',   fmtFn: fmtLh },
]

const THERMO_METRICAS = [
  { key: 'rendimento_operacional_hah', label: 'Rendimento Operacional', fmtFn: fmtHah, grupoKey: 'rendimento_operacional_hah_grupo' },
  { key: 'eficiencia_geral_pct',       label: 'Eficiência Geral',       fmtFn: fmtPct, grupoKey: 'eficiencia_geral_pct_grupo' },
  { key: 'disponibilidade_mecanica_pct', label: 'Disp. Mecânica',       fmtFn: fmtPct, grupoKey: 'disponibilidade_mecanica_pct_grupo' },
  { key: 'velocidade_media_kmh',       label: 'Velocidade Média',       fmtFn: fmtKmh, grupoKey: 'velocidade_media_kmh_grupo' },
  { key: 'consumo_medio_lh',           label: 'Consumo Médio (l/h)',    fmtFn: fmtLh,  grupoKey: 'consumo_medio_lh_grupo', higherIsBetter: false },
]

const EXTRA_OPTS = METRICAS.filter(m => !FIXED_COLS.find(f => f.key === m.value))

export default function BenchmarkClientePage() {
  const [panelOpen, setPanelOpen] = useState(false)
  const [filters, setFilters] = useState({ safra: defaultSafra(), processo: 'Colheita', tipo_safra: 'Arroz' })
  const [extraCols, setExtraCols] = useState([])
  const [extraDropOpen, setExtraDropOpen] = useState(false)
  const options = useFilterOptions()

  // Todos os clientes com os filtros de contexto (sem filtro de cliente) — base para termômetro
  const contextFilters = useMemo(() => ({
    safra: filters.safra,
    processo: filters.processo,
    tipo_safra: filters.tipo_safra,
  }), [filters.safra, filters.processo, filters.tipo_safra])

  const canFetch = !!(filters.processo)
  const { data: allData, loading, fetching } = useOperationalData(contextFilters, canFetch)

  const { data: grupoAll } = useGrupoBenchmark(contextFilters)
  const grupo = grupoAll[0] || null

  // Dados do cliente selecionado filtrados em memória
  const clienteData = useMemo(() => {
    if (!filters.cliente) return []
    return allData.filter(r => {
      if (r.cliente !== filters.cliente) return false
      if (filters.modelo_equipamento && r.modelo_equipamento !== filters.modelo_equipamento) return false
      return true
    })
  }, [allData, filters.cliente, filters.modelo_equipamento])

  const clienteAgg = useMemo(() => aggregateRows(clienteData), [clienteData])

  // Agregados de todos os clientes para calcular min/max dos termômetros
  const allClienteAggs = useMemo(() => {
    return Object.values(groupBy(allData, 'cliente'))
      .map(rows => aggregateRows(rows))
      .filter(a => a && a.area_ha > 0)
  }, [allData])

  // Rendimento por equipamento do cliente selecionado vs grupo
  const byEquipamento = useMemo(() => {
    return Object.entries(groupBy(clienteData, 'equipamento'))
      .map(([equip, rows]) => ({
        label: equip.split(' ').slice(0, 2).join(' '), // abrevia para caber no gráfico
        fullLabel: equip,
        cliente: aggregateRows(rows)?.rendimento_operacional_hah ?? 0,
        grupo: grupo?.rendimento_operacional_hah_grupo ?? null,
      }))
      .filter(e => e.cliente > 0)
      .sort((a, b) => b.cliente - a.cliente)
      .slice(0, 12)
  }, [clienteData, grupo])

  // Distribuição de combustível por estado
  const fuelDist = useMemo(() => {
    const sum = key => clienteData.reduce((a, r) => a + (parseFloat(r[key]) || 0), 0)
    return [
      { label: 'Trabalhando',  value: sum('consumo_trabalhando_l'),  color: 'var(--pa-green)' },
      { label: 'Deslocamento', value: sum('consumo_deslocamento_l'), color: '#6366f1' },
      { label: 'Manobra',      value: sum('consumo_manobra_l'),      color: 'var(--pa-amber)' },
      { label: 'Parada',       value: sum('consumo_parada_l'),       color: 'var(--pa-red)' },
    ].filter(d => d.value > 0)
  }, [clienteData])

  // Linhas da tabela: um por equipamento com todos os campos
  const tableRows = useMemo(() => {
    return Object.entries(groupBy(clienteData, 'equipamento'))
      .map(([equip, rows]) => ({ equipamento: equip, ...aggregateRows(rows) }))
      .filter(r => r.area_ha > 0)
      .sort((a, b) => b.area_ha - a.area_ha)
  }, [clienteData])

  const allExtraCols = [...FIXED_COLS, ...extraCols.map(k => METRICAS.find(m => m.value === k)).filter(Boolean).map(m => ({
    key: m.value, label: m.label, fmtFn: m.fmt, removable: true
  }))]

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-pa-text">Benchmark — Cliente vs Grupo</h1>
          <p className="text-sm text-pa-muted mt-0.5">
            {filters.cliente || 'Selecione um cliente'} · {filters.processo || 'Todos os processos'}
            {filters.tipo_safra && ` · ${filters.tipo_safra}`} · {filters.safra}
          </p>
        </div>
        <FilterButton onClick={() => setPanelOpen(true)} filters={filters} />
      </div>

      <FilterPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        filters={filters}
        onChange={setFilters}
        options={options}
        hideFields={['dates']}
        showBenchmarkToggle={false}
      />

      {fetching && <FetchingBar />}

      {!canFetch && (
        <div className="rounded-xl border border-pa-border bg-pa-surface p-10 text-center text-pa-muted text-sm">
          Selecione um processo nos filtros para carregar os dados
        </div>
      )}

      {canFetch && (
        <div className={fetching ? 'data-fetching space-y-6' : 'space-y-6'}>
          {/* KPI cards do cliente vs grupo */}
          <div>
            <p className="text-xs font-semibold text-pa-muted uppercase tracking-wider mb-3">
              {filters.cliente ? `${filters.cliente} vs Média Porteira` : 'Médias do grupo (selecione um cliente para comparar)'}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <KPICard
                label="Rend. Operacional"
                value={fmtHah(clienteAgg?.rendimento_operacional_hah)}
                benchmark={grupo ? fmtHah(grupo.rendimento_operacional_hah_grupo) : null}
                ratioBenchmark={clienteAgg && grupo ? { value: clienteAgg.rendimento_operacional_hah, benchmark: grupo.rendimento_operacional_hah_grupo, higherIsBetter: true } : null}
              />
              <KPICard
                label="Eficiência Geral"
                value={fmtPct(clienteAgg?.eficiencia_geral_pct)}
                benchmark={grupo ? fmtPct(grupo.eficiencia_geral_pct_grupo) : null}
                pctValue={clienteAgg?.eficiencia_geral_pct}
              />
              <KPICard
                label="Disp. Mecânica"
                value={fmtPct(clienteAgg?.disponibilidade_mecanica_pct)}
                benchmark={grupo ? fmtPct(grupo.disponibilidade_mecanica_pct_grupo) : null}
                pctValue={clienteAgg?.disponibilidade_mecanica_pct}
              />
              <KPICard
                label="Velocidade Média"
                value={fmtKmh(clienteAgg?.velocidade_media_kmh)}
                benchmark={grupo ? fmtKmh(grupo.velocidade_media_kmh_grupo) : null}
              />
              <KPICard
                label="Consumo (l/h)"
                value={fmtLh(clienteAgg?.consumo_medio_lh)}
                benchmark={grupo ? fmtLh(grupo.consumo_medio_lh_grupo) : null}
              />
            </div>
          </div>

          {/* Termômetros + Combustível */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-pa-surface border border-pa-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-pa-text mb-1">Posição no Grupo</h3>
              <p className="text-xs text-pa-muted mb-4">Min · <span className="text-pa-amber">▲ Porteira</span> · Max entre clientes</p>
              {filters.cliente && clienteAgg ? (
                THERMO_METRICAS.map(m => {
                  const vals = allClienteAggs.map(a => a[m.key]).filter(v => v != null && !isNaN(v))
                  return (
                    <ThermometerBar
                      key={m.key}
                      label={m.label}
                      min={Math.min(...vals)}
                      max={Math.max(...vals)}
                      avg={grupo?.[m.grupoKey]}
                      value={clienteAgg[m.key]}
                      fmtFn={m.fmtFn}
                      higherIsBetter={m.higherIsBetter !== false}
                    />
                  )
                })
              ) : (
                <p className="text-pa-faint text-sm text-center py-8">Selecione um cliente</p>
              )}
            </div>

            <div className="bg-pa-surface border border-pa-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-pa-text mb-4">Distribuição de Combustível</h3>
              {fuelDist.length > 0 ? (
                <DonutChart
                  data={fuelDist}
                  centerLabel={{ value: fmt(fuelDist.reduce((a, d) => a + d.value, 0), 0), label: 'litros' }}
                />
              ) : (
                <p className="text-pa-faint text-sm text-center py-8">
                  {filters.cliente ? 'Sem dados de combustível' : 'Selecione um cliente'}
                </p>
              )}
            </div>
          </div>

          {/* Rendimento por equipamento */}
          {byEquipamento.length > 0 && (
            <div className="bg-pa-surface border border-pa-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-pa-text mb-4">
                Rendimento Operacional por Equipamento (ha/h)
                {grupo && <span className="ml-2 text-xs text-pa-amber font-normal">■ ref. porteira: {fmtHah(grupo.rendimento_operacional_hah_grupo)}</span>}
              </h3>
              <VBarChart data={byEquipamento} height={200} />
            </div>
          )}

          {/* Tabela comparativa por equipamento */}
          {tableRows.length > 0 && (
            <div className="bg-pa-surface border border-pa-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-pa-text">Detalhamento por Equipamento</h3>
                <div className="relative">
                  <button
                    onClick={() => setExtraDropOpen(o => !o)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-pa-muted border border-pa-border rounded-lg hover:border-pa-green hover:text-pa-text transition-colors"
                  >
                    + Métrica
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {extraDropOpen && (
                    <div className="absolute right-0 top-full mt-1 w-56 bg-pa-surface border border-pa-border rounded-lg shadow-xl z-10 py-1">
                      {EXTRA_OPTS.filter(m => !extraCols.includes(m.value)).map(m => (
                        <button
                          key={m.value}
                          onClick={() => { setExtraCols(prev => [...prev, m.value]); setExtraDropOpen(false) }}
                          className="w-full text-left px-3 py-2 text-xs text-pa-text hover:bg-pa-surface-2 transition-colors"
                        >
                          {m.label}
                        </button>
                      ))}
                      {EXTRA_OPTS.filter(m => !extraCols.includes(m.value)).length === 0 && (
                        <p className="px-3 py-2 text-xs text-pa-faint">Todas as métricas adicionadas</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-pa-border">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-pa-muted uppercase tracking-wider sticky left-0 bg-pa-surface">Equipamento</th>
                      {allExtraCols.map(col => (
                        <th key={col.key} className="px-3 py-2.5 text-left text-xs font-semibold text-pa-muted uppercase tracking-wider whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            {col.label}
                            {col.removable && (
                              <button onClick={() => setExtraCols(prev => prev.filter(k => k !== col.key))} className="text-pa-faint hover:text-pa-red ml-1">×</button>
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, i) => (
                      <tr key={i} className="border-b border-pa-border/50 hover:bg-pa-surface-2 transition-colors">
                        <td className="px-3 py-2.5 text-pa-text font-medium sticky left-0 bg-pa-surface text-xs">{row.equipamento}</td>
                        {allExtraCols.map(col => {
                          const val = row[col.key]
                          const sem = col.pct ? semaphorePct(val) : null
                          return (
                            <td key={col.key} className={`px-3 py-2.5 tabular-nums whitespace-nowrap ${col.highlight ? 'text-pa-green font-bold' : sem ? sem.cls : 'text-pa-text'}`}>
                              {col.fmtFn ? col.fmtFn(val) : (val?.toFixed(2) ?? '—')}
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
        </div>
      )}
    </div>
  )
}
