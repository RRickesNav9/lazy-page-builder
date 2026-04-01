import { useState, useMemo } from 'react'
import { useOperationalData, useGrupoBenchmark, useFilterOptions } from '../hooks/useData'
import { FilterBar, HBarChart, DataTable, PageLoader, KPICard } from '../components/UI'
import {
  groupBy, aggregateRows, defaultDateRange,
  METRICAS, fmtHa, fmtHah, fmtPct, fmtLh, fmtH, fmtDate
} from '../lib/utils'

const COLS_FIXAS = [
  { key: 'nivel',                      label: 'Nível' },
  { key: 'area_ha',                    label: 'Área (ha)',           render: v => fmtHa(v) },
  { key: 'rendimento_operacional_hah', label: 'Rend. Op. (ha/h)',    render: v => fmtHah(v) },
  { key: 'rendimento_real_hah',        label: 'Rend. Real (ha/h)',   render: v => fmtHah(v) },
  { key: 'consumo_medio_efetivo_lh',   label: 'Cons. Ef. (l/h)',     render: v => fmtLh(v) },
  { key: 'tempo_produtivo_h',          label: 'T. Efetivo (h)',      render: v => fmtH(v) },
  { key: 'eficiencia_geral_pct',       label: 'Efic. Geral (%)',     render: v => fmtPct(v) },
  { key: 'disponibilidade_mecanica_pct', label: 'Disp. Mec. (%)',   render: v => fmtPct(v) },
]

export default function DiarioOperacionalPage() {
  const [filters, setFilters] = useState({ ...defaultDateRange(), nivel: 'processo', metrica: 'rendimento_operacional_hah' })
  const options = useFilterOptions()
  const { data, loading, error } = useOperationalData(filters)
  const { data: benchmarks } = useGrupoBenchmark({ safra: filters.safra })

  const nivel = filters.nivel || 'processo'
  const metricaDef = METRICAS.find(m => m.value === (filters.metrica || 'rendimento_operacional_hah')) || METRICAS[0]

  // Agrega por nível de análise selecionado
  const tableRows = useMemo(() => {
    if (!data.length) return []
    const grouped = groupBy(data, nivel)
    return Object.entries(grouped).map(([key, rows]) => {
      const agg = aggregateRows(rows)
      return { nivel: key, ...agg }
    }).sort((a, b) => (b[metricaDef.value] || 0) - (a[metricaDef.value] || 0))
  }, [data, nivel, metricaDef.value])

  // Total agregado
  const total = useMemo(() => aggregateRows(data), [data])

  // Benchmark do grupo para a métrica selecionada
  const benchmarkKey = metricaDef.value.replace('rendimento_operacional_hah', 'rendimento_operacional_hah_grupo')
    .replace('rendimento_real_hah', 'rendimento_real_hah_grupo')
    .replace('eficiencia_geral_pct', 'eficiencia_geral_pct_grupo')
    .replace('disponibilidade_mecanica_pct', 'disponibilidade_mecanica_pct_grupo')
    .replace('consumo_medio_efetivo_lh', 'consumo_medio_efetivo_lh_grupo')
  const mainBenchmark = benchmarks[0] || null
  const benchmarkValue = mainBenchmark?.[benchmarkKey]

  if (loading) return <PageLoader />
  if (error) return <div className="p-6 text-red-400">Erro: {error}</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Diário Operacional</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {filters.dataInicio && filters.dataFim
            ? `Exibindo de ${fmtDate(filters.dataInicio)} até ${fmtDate(filters.dataFim)}`
            : 'Selecione um período'}
        </p>
      </div>

      <FilterBar
        filters={filters} onChange={setFilters} options={options}
        showNivel showMetrica
      />

      {/* KPIs do período */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Área Total"        value={fmtHa(total?.area_ha)}                    color="emerald" />
        <KPICard label="Rend. Operacional" value={fmtHah(total?.rendimento_operacional_hah)} color="blue"
          benchmark={benchmarkValue ? metricaDef.fmt(benchmarkValue) : null} benchmarkLabel="Porteira" />
        <KPICard label="Efic. Geral"       value={fmtPct(total?.eficiencia_geral_pct)}       color="amber" />
        <KPICard label="Disp. Mecânica"    value={fmtPct(total?.disponibilidade_mecanica_pct)} color="violet" />
      </div>

      {/* Gráfico de barras — métrica selecionada por nível */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4">
          {metricaDef.label} por {nivel.charAt(0).toUpperCase() + nivel.slice(1).replace('_', ' ')}
        </h3>
        <HBarChart
          data={tableRows.map(r => ({
            label: r.nivel,
            value: parseFloat(r[metricaDef.value]) || 0,
            benchmark: benchmarkValue,
            color: '#22c55e',
          }))}
        />
      </div>

      {/* Tabela detalhada */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4">
          Detalhamento por {nivel.charAt(0).toUpperCase() + nivel.slice(1).replace('_', ' ')}
        </h3>
        <DataTable
          rows={tableRows}
          columns={COLS_FIXAS}
          highlightCol={metricaDef.value}
        />
        {/* Linha de total */}
        {total && (
          <div className="mt-2 flex gap-6 px-3 py-2 bg-zinc-800/50 rounded-lg text-xs">
            <span className="font-bold text-zinc-300">Total</span>
            <span className="text-emerald-400 font-bold">{fmtHa(total.area_ha)}</span>
            <span className="text-zinc-400">{fmtHah(total.rendimento_operacional_hah)} rend. op.</span>
            <span className="text-zinc-400">{fmtPct(total.eficiencia_geral_pct)} efic.</span>
            <span className="text-zinc-400">{fmtH(total.tempo_produtivo_h)} ef.</span>
          </div>
        )}
      </div>
    </div>
  )
}
