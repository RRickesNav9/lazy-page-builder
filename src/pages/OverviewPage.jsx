import { useState } from 'react'
import { useOperationalData, useGrupoBenchmark, useFilterOptions } from '../hooks/useData'
import { KPICard, FilterBar, DonutChart, HBarChart, PageLoader } from '../components/UI'
import {
  aggregateRows, calcTimeDistribution, groupBy,
  defaultDateRange, fmtHah, fmtHa, fmtPct, fmtLh, fmt
} from '../lib/utils'

export default function OverviewPage() {
  const [filters, setFilters] = useState(defaultDateRange())
  const options = useFilterOptions()
  const { data, loading, error } = useOperationalData(filters)
  const { data: benchmarks } = useGrupoBenchmark({ safra: filters.safra })

  if (loading) return <PageLoader />
  if (error) return <div className="p-6 text-red-400">Erro: {error}</div>

  // Agrega todos os registros para KPIs globais
  const agg = aggregateRows(data)
  const timeDist = calcTimeDistribution(data)

  // Agrega por cliente para comparativo
  const byCliente = groupBy(data, 'cliente')
  const clienteRows = Object.entries(byCliente).map(([cliente, rows]) => {
    const a = aggregateRows(rows)
    return { cliente, ...a, n_equipamentos: new Set(rows.map(r => r.equipamento)).size }
  }).sort((a, b) => b.area_ha - a.area_ha)

  // Busca benchmark Média Porteira para o processo mais comum
  const mainBenchmark = benchmarks[0] || null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Overview Geral</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Visão consolidada de todos os clientes no período</p>
      </div>

      <FilterBar filters={filters} onChange={setFilters} options={options} />

      {/* KPIs globais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label="Área Total" value={fmtHa(agg?.area_ha)} color="emerald"
          benchmark={mainBenchmark ? '—' : null}
        />
        <KPICard
          label="Rend. Operacional" value={fmtHah(agg?.rendimento_operacional_hah)} color="blue"
          benchmark={mainBenchmark ? fmtHah(mainBenchmark.rendimento_operacional_hah_grupo) : null}
          benchmarkLabel="Porteira"
        />
        <KPICard
          label="Eficiência Geral" value={fmtPct(agg?.eficiencia_geral_pct)} color="amber"
          benchmark={mainBenchmark ? fmtPct(mainBenchmark.eficiencia_geral_pct_grupo) : null}
          benchmarkLabel="Porteira"
        />
        <KPICard
          label="Disp. Mecânica" value={fmtPct(agg?.disponibilidade_mecanica_pct)} color="violet"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Distribuição de tempo */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Distribuição de Tempo</h3>
          <DonutChart
            data={timeDist}
            centerLabel={{ value: fmt(agg?.tempo_total_h, 0), label: 'horas' }}
          />
        </div>

        {/* Comparativo de clientes — rendimento */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Rendimento Operacional por Cliente (ha/h)</h3>
          <HBarChart
            data={clienteRows.map(c => ({
              label: c.cliente,
              value: c.rendimento_operacional_hah,
              benchmark: mainBenchmark?.rendimento_operacional_hah_grupo,
              color: '#22c55e',
            }))}
          />
        </div>
      </div>

      {/* Tabela comparativa de clientes */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4">Comparativo por Cliente</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Cliente', 'Área (ha)', 'Rend. Op. (ha/h)', 'Efic. Geral (%)', 'Disp. Mec. (%)', 'Consumo (l/h)', 'Equip.'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clienteRows.map((c, i) => (
                <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-3 py-2.5 font-medium text-zinc-200">{c.cliente}</td>
                  <td className="px-3 py-2.5 tabular-nums text-zinc-300">{fmtHa(c.area_ha)}</td>
                  <td className="px-3 py-2.5 tabular-nums text-emerald-400 font-bold">{fmtHah(c.rendimento_operacional_hah)}</td>
                  <td className="px-3 py-2.5 tabular-nums text-zinc-300">{fmtPct(c.eficiencia_geral_pct)}</td>
                  <td className="px-3 py-2.5 tabular-nums text-zinc-300">{fmtPct(c.disponibilidade_mecanica_pct)}</td>
                  <td className="px-3 py-2.5 tabular-nums text-zinc-300">{fmtLh(c.consumo_medio_lh)}</td>
                  <td className="px-3 py-2.5 tabular-nums text-zinc-400">{c.n_equipamentos}</td>
                </tr>
              ))}
              {!clienteRows.length && (
                <tr><td colSpan={7} className="text-center py-8 text-zinc-600">Nenhum dado no período selecionado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
