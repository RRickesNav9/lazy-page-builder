import { useState } from 'react'
import { useOperationalData, useGrupoBenchmark, useFilterOptions } from '../hooks/useData'
import { KPICard, FilterBar, DonutChart, HBarChart, PageLoader, FetchingBar } from '../components/UI'
import {
  aggregateRows, calcTimeDistribution, groupBy,
  defaultDateRange, fmtHah, fmtHa, fmtPct, fmtLh, fmt
} from '../lib/utils'

export default function OverviewPage() {
  const [filters, setFilters] = useState(defaultDateRange())
  const options = useFilterOptions()
  const { data, loading, fetching, error } = useOperationalData(filters)
  const { data: benchmarks } = useGrupoBenchmark({ safra: filters.safra })

  if (loading) return <PageLoader />
  if (error) return <div className="p-6 text-pa-red">Erro: {error}</div>

  const agg = aggregateRows(data)
  const timeDist = calcTimeDistribution(data)

  const byCliente = groupBy(data, 'cliente')
  const clienteRows = Object.entries(byCliente).map(([cliente, rows]) => {
    const a = aggregateRows(rows)
    return { cliente, ...a, n_equipamentos: new Set(rows.map(r => r.equipamento)).size }
  }).sort((a, b) => b.area_ha - a.area_ha)

  const mainBenchmark = benchmarks[0] || null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-pa-text">Overview Geral</h1>
        <p className="text-sm text-pa-muted mt-0.5">Visão consolidada de todos os clientes no período</p>
      </div>

      <FilterBar filters={filters} onChange={setFilters} options={options} />

      {/* Barra de re-fetch sutil — sem apagar o conteúdo */}
      {fetching && <FetchingBar />}

      <div className={fetching ? 'data-fetching' : ''}>
        {/* KPIs globais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <KPICard
            label="Área Total"
            value={fmtHa(agg?.area_ha)}
          />
          <KPICard
            label="Rend. Operacional"
            value={fmtHah(agg?.rendimento_operacional_hah)}
            benchmark={mainBenchmark ? fmtHah(mainBenchmark.rendimento_operacional_hah_grupo) : null}
            ratioBenchmark={mainBenchmark ? {
              value: agg?.rendimento_operacional_hah,
              benchmark: mainBenchmark.rendimento_operacional_hah_grupo,
              higherIsBetter: true,
            } : null}
          />
          <KPICard
            label="Eficiência Geral"
            value={fmtPct(agg?.eficiencia_geral_pct)}
            benchmark={mainBenchmark ? fmtPct(mainBenchmark.eficiencia_geral_pct_grupo) : null}
            pctValue={agg?.eficiencia_geral_pct}
          />
          <KPICard
            label="Disp. Mecânica"
            value={fmtPct(agg?.disponibilidade_mecanica_pct)}
            pctValue={agg?.disponibilidade_mecanica_pct}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Distribuição de tempo */}
          <div className="bg-pa-surface border border-pa-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-pa-text mb-4">Distribuição de Tempo</h3>
            <DonutChart
              data={timeDist}
              centerLabel={{ value: fmt(agg?.tempo_total_h, 0), label: 'horas' }}
            />
          </div>

          {/* Comparativo de clientes — rendimento */}
          <div className="lg:col-span-2 bg-pa-surface border border-pa-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-pa-text mb-4">Rendimento Operacional por Cliente (ha/h)</h3>
            <HBarChart
              data={clienteRows.map(c => ({
                label: c.cliente,
                value: c.rendimento_operacional_hah,
                benchmark: mainBenchmark?.rendimento_operacional_hah_grupo,
                color: 'var(--pa-green)',
              }))}
            />
          </div>
        </div>

        {/* Tabela comparativa de clientes */}
        <div className="bg-pa-surface border border-pa-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-pa-text mb-4">Comparativo por Cliente</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pa-border">
                  {['Cliente', 'Área (ha)', 'Rend. Op. (ha/h)', 'Efic. Geral (%)', 'Disp. Mec. (%)', 'Consumo (l/h)', 'Equip.'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-pa-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clienteRows.map((c, i) => {
                  const semEfic = c.eficiencia_geral_pct >= 95 ? 'text-pa-green' : c.eficiencia_geral_pct >= 70 ? 'text-pa-amber' : 'text-pa-red'
                  const semDisp = c.disponibilidade_mecanica_pct >= 95 ? 'text-pa-green' : c.disponibilidade_mecanica_pct >= 70 ? 'text-pa-amber' : 'text-pa-red'
                  return (
                    <tr key={i} className="border-b border-pa-border/50 hover:bg-pa-surface-2 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-pa-text">{c.cliente}</td>
                      <td className="px-3 py-2.5 tabular-nums text-pa-text">{fmtHa(c.area_ha)}</td>
                      <td className="px-3 py-2.5 tabular-nums text-pa-green font-bold">{fmtHah(c.rendimento_operacional_hah)}</td>
                      <td className={`px-3 py-2.5 tabular-nums font-medium ${semEfic}`}>{fmtPct(c.eficiencia_geral_pct)}</td>
                      <td className={`px-3 py-2.5 tabular-nums font-medium ${semDisp}`}>{fmtPct(c.disponibilidade_mecanica_pct)}</td>
                      <td className="px-3 py-2.5 tabular-nums text-pa-text">{fmtLh(c.consumo_medio_lh)}</td>
                      <td className="px-3 py-2.5 tabular-nums text-pa-muted">{c.n_equipamentos}</td>
                    </tr>
                  )
                })}
                {!clienteRows.length && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-pa-faint">Nenhum dado no período selecionado</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
