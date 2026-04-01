import { useState, useMemo } from 'react'
import { useOperationalData, useEquipamentoBenchmark, useFilterOptions } from '../hooks/useData'
import { FilterBar, HBarChart, PageLoader, KPICard } from '../components/UI'
import {
  groupBy, aggregateRows, semaphoreColor, defaultDateRange,
  fmtHah, fmtPct, fmtLh, fmtKmh, fmtH, fmtHa
} from '../lib/utils'

// Célula com semáforo vs benchmark
function BenchCell({ value, benchmark, fmt, higherIsBetter = true }) {
  const color = semaphoreColor(value, benchmark, higherIsBetter)
  const diff = benchmark ? ((value - benchmark) / benchmark) * 100 : null
  return (
    <td className={`px-3 py-2 tabular-nums font-medium ${color}`}>
      {fmt(value)}
      {diff !== null && (
        <span className={`ml-1 text-xs ${diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          ({diff >= 0 ? '+' : ''}{diff.toFixed(0)}%)
        </span>
      )}
    </td>
  )
}

export default function EquipamentoBenchmarkPage() {
  const [filters, setFilters] = useState({ ...defaultDateRange() })
  const options = useFilterOptions()
  const { data, loading, error } = useOperationalData(filters)
  const { data: modeloBenchmarks } = useEquipamentoBenchmark({
    safra: filters.safra,
    processo: filters.processo,
    tipo_safra: filters.tipo_safra,
  })

  // Agrupa dados reais por modelo_equipamento
  const byModelo = useMemo(() => {
    const grouped = groupBy(data, 'modelo_equipamento')
    return Object.entries(grouped).map(([modelo, rows]) => {
      const agg = aggregateRows(rows)
      const bench = modeloBenchmarks.find(b => b.modelo_equipamento === modelo)
      return { modelo, ...agg, bench, n_equip: new Set(rows.map(r => r.equipamento)).size }
    }).filter(r => r.area_ha > 0 || r.tempo_total_h > 0)
      .sort((a, b) => b.area_ha - a.area_ha)
  }, [data, modeloBenchmarks])

  // Agrupa por equipamento individual para drill-down
  const [expandedModelo, setExpandedModelo] = useState(null)
  const byEquipamento = useMemo(() => {
    if (!expandedModelo) return []
    const rows = data.filter(r => r.modelo_equipamento === expandedModelo)
    const grouped = groupBy(rows, 'equipamento')
    return Object.entries(grouped).map(([equip, rows]) => {
      const agg = aggregateRows(rows)
      return { equipamento: equip, ...agg }
    }).sort((a, b) => b.area_ha - a.area_ha)
  }, [data, expandedModelo])

  if (loading) return <PageLoader />
  if (error) return <div className="p-6 text-red-400">Erro: {error}</div>

  // Gráfico comparativo rend operacional real vs benchmark
  const chartData = byModelo.slice(0, 8).flatMap(m => [
    { label: `${m.modelo} (real)`,  value: m.rendimento_operacional_hah,               color: '#22c55e' },
    { label: `${m.modelo} (bench)`, value: m.bench?.rendimento_operacional_hah_modelo, color: '#3b82f6' },
  ]).filter(d => d.value > 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Benchmark por Equipamento</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Performance real vs Média Porteira por modelo</p>
      </div>

      <FilterBar filters={filters} onChange={setFilters} options={options} />

      {/* Gráfico comparativo */}
      {chartData.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-4 mb-4">
            <h3 className="text-sm font-semibold text-zinc-300">Rendimento Operacional — Real vs Benchmark (ha/h)</h3>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"/>Real</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block"/>Benchmark</span>
            </div>
          </div>
          <HBarChart data={chartData} />
        </div>
      )}

      {/* Tabela por modelo */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-zinc-300 mb-1">Performance por Modelo</h3>
        <p className="text-xs text-zinc-600 mb-4">Clique em um modelo para ver equipamentos individuais. Verde = acima do benchmark, Vermelho = abaixo.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Modelo', 'Equip.', 'Área (ha)', 'Rend. Op. (ha/h)', 'vs Bench', 'Efic. Geral (%)', 'vs Bench', 'Disp. Mec. (%)', 'Cons. Ef. (l/h)', 'T. Efetivo (h)'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byModelo.map((m, i) => (
                <>
                  <tr
                    key={m.modelo}
                    onClick={() => setExpandedModelo(expandedModelo === m.modelo ? null : m.modelo)}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors cursor-pointer"
                  >
                    <td className="px-3 py-2 text-zinc-200 font-medium">
                      <span className="mr-1.5 text-zinc-600">{expandedModelo === m.modelo ? '▼' : '▶'}</span>
                      {m.modelo}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-zinc-400">{m.n_equip}</td>
                    <td className="px-3 py-2 tabular-nums text-zinc-300">{fmtHa(m.area_ha)}</td>
                    <BenchCell value={m.rendimento_operacional_hah} benchmark={m.bench?.rendimento_operacional_hah_modelo} fmt={fmtHah} />
                    <td className="px-3 py-2 text-xs text-zinc-600">{m.bench ? `ref: ${fmtHah(m.bench.rendimento_operacional_hah_modelo)}` : '—'}</td>
                    <BenchCell value={m.eficiencia_geral_pct} benchmark={m.bench?.eficiencia_geral_pct_modelo} fmt={fmtPct} />
                    <td className="px-3 py-2 text-xs text-zinc-600">{m.bench ? `ref: ${fmtPct(m.bench.eficiencia_geral_pct_modelo)}` : '—'}</td>
                    <BenchCell value={m.disponibilidade_mecanica_pct} benchmark={m.bench?.disponibilidade_mecanica_pct_modelo} fmt={fmtPct} />
                    <BenchCell value={m.consumo_medio_efetivo_lh} benchmark={m.bench?.consumo_medio_efetivo_lh_modelo} fmt={fmtLh} higherIsBetter={false} />
                    <td className="px-3 py-2 tabular-nums text-zinc-400">{fmtH(m.tempo_produtivo_h)}</td>
                  </tr>

                  {/* Drill-down: equipamentos do modelo expandido */}
                  {expandedModelo === m.modelo && byEquipamento.map((e, j) => (
                    <tr key={`${m.modelo}-${j}`} className="border-b border-zinc-800/30 bg-zinc-800/20">
                      <td className="px-3 py-1.5 pl-8 text-xs text-zinc-400 italic">{e.equipamento}</td>
                      <td className="px-3 py-1.5 text-zinc-600">—</td>
                      <td className="px-3 py-1.5 tabular-nums text-xs text-zinc-400">{fmtHa(e.area_ha)}</td>
                      <td className="px-3 py-1.5 tabular-nums text-xs text-emerald-400">{fmtHah(e.rendimento_operacional_hah)}</td>
                      <td/>
                      <td className="px-3 py-1.5 tabular-nums text-xs text-zinc-400">{fmtPct(e.eficiencia_geral_pct)}</td>
                      <td/>
                      <td className="px-3 py-1.5 tabular-nums text-xs text-zinc-400">{fmtPct(e.disponibilidade_mecanica_pct)}</td>
                      <td className="px-3 py-1.5 tabular-nums text-xs text-zinc-400">{fmtLh(e.consumo_medio_efetivo_lh)}</td>
                      <td className="px-3 py-1.5 tabular-nums text-xs text-zinc-400">{fmtH(e.tempo_produtivo_h)}</td>
                    </tr>
                  ))}
                </>
              ))}
              {!byModelo.length && (
                <tr><td colSpan={10} className="text-center py-8 text-zinc-600">Nenhum dado no período selecionado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
