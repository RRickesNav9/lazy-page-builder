import { useState, useMemo } from 'react'
import { KPICard, HBarChart } from '../components/UI'
import { useFilters } from '../lib/FilterContext'
import { fmtHah, fmtPct, fmtHa, fmtH, fmt } from '../lib/utils'

const META_RENDIMENTO = 1.65

const MOCK_CLIENTES = [
  {
    cliente: 'TioJocaAlimentos PEL',
    propriedade: 'Fazenda São João',
    operacao: 'Colheita',
    cultura: 'Arroz',
    area_ha: 1240,
    rendimento_hah: 2.31,
    combustivel_lha: 28.4,
    eficiencia_pct: 72,
    disponibilidade_pct: 97,
    tempo_efetivo_h: 537,
    tempo_motor_h: 745,
  },
  {
    cliente: 'Labrustar',
    propriedade: 'Fazenda Estrela',
    operacao: 'Colheita',
    cultura: 'Soja',
    area_ha: 890,
    rendimento_hah: 1.82,
    combustivel_lha: 31.2,
    eficiencia_pct: 58,
    disponibilidade_pct: 91,
    tempo_efetivo_h: 489,
    tempo_motor_h: 843,
  },
  {
    cliente: 'Coragon',
    propriedade: 'Fazenda Coragon I',
    operacao: 'Aplicação',
    cultura: 'Milho',
    area_ha: 650,
    rendimento_hah: 1.45,
    combustivel_lha: 35.1,
    eficiencia_pct: 41,
    disponibilidade_pct: 82,
    tempo_efetivo_h: 448,
    tempo_motor_h: 1092,
  },
  {
    cliente: 'Agropecuária Pontal',
    propriedade: 'Fazenda Pontal',
    operacao: 'Colheita',
    cultura: 'Arroz',
    area_ha: 1050,
    rendimento_hah: 1.97,
    combustivel_lha: 26.8,
    eficiencia_pct: 65,
    disponibilidade_pct: 100,
    tempo_efetivo_h: 533,
    tempo_motor_h: 820,
  },
]

const CHART_METRICS = [
  { value: 'rendimento_hah', label: 'Rendimento (ha/h)', fmt: fmtHah, meta: META_RENDIMENTO, higherIsBetter: true },
  { value: 'eficiencia_pct', label: 'Eficiência (%)', fmt: fmtPct, meta: null, higherIsBetter: true },
  { value: 'combustivel_lha', label: 'Combustível (L/ha)', fmt: v => fmt(v, 1, ' L/ha'), meta: null, higherIsBetter: false },
  { value: 'disponibilidade_pct', label: 'Disponibilidade Mecânica (%)', fmt: fmtPct, meta: null, higherIsBetter: true },
]

function statusBadge(value, meta, higherIsBetter = true) {
  if (meta == null) return null
  const ratio = value / meta
  if (higherIsBetter) {
    if (ratio >= 1.0) return { cls: 'text-pa-green bg-pa-green-dim', label: '●' }
    if (ratio >= 0.80) return { cls: 'text-pa-amber bg-pa-amber-dim', label: '●' }
    return { cls: 'text-pa-red bg-pa-red-dim', label: '●' }
  }
  if (ratio <= 1.0) return { cls: 'text-pa-green bg-pa-green-dim', label: '●' }
  if (ratio <= 1.20) return { cls: 'text-pa-amber bg-pa-amber-dim', label: '●' }
  return { cls: 'text-pa-red bg-pa-red-dim', label: '●' }
}

function dispBadge(val) {
  if (val >= 95) return { cls: 'text-pa-green bg-pa-green-dim', label: '●' }
  if (val >= 70) return { cls: 'text-pa-amber bg-pa-amber-dim', label: '●' }
  return { cls: 'text-pa-red bg-pa-red-dim', label: '●' }
}

function barColor(value, meta, higherIsBetter = true) {
  if (!meta) return 'var(--pa-green)'
  const ratio = value / meta
  if (higherIsBetter) {
    if (ratio >= 1.0) return 'var(--pa-green)'
    if (ratio >= 0.80) return 'var(--pa-amber)'
    return 'var(--pa-red)'
  }
  if (ratio <= 1.0) return 'var(--pa-green)'
  if (ratio <= 1.20) return 'var(--pa-amber)'
  return 'var(--pa-red)'
}

export default function OverviewDashboardPage({ onNavigateCliente }) {
  const { filters } = useFilters()
  const [chartMetric, setChartMetric] = useState('rendimento_hah')

  const data = MOCK_CLIENTES

  // Aggregated KPIs
  const agg = useMemo(() => {
    const totalArea = data.reduce((a, c) => a + c.area_ha, 0)
    const totalTempoEfetivo = data.reduce((a, c) => a + c.tempo_efetivo_h, 0)
    const totalTempoMotor = data.reduce((a, c) => a + c.tempo_motor_h, 0)
    const rendMedio = totalArea > 0
      ? data.reduce((a, c) => a + c.rendimento_hah * c.area_ha, 0) / totalArea
      : 0
    const combMedio = totalArea > 0
      ? data.reduce((a, c) => a + c.combustivel_lha * c.area_ha, 0) / totalArea
      : 0
    const eficMedia = totalTempoMotor > 0
      ? data.reduce((a, c) => a + c.eficiencia_pct * c.tempo_motor_h, 0) / totalTempoMotor
      : 0
    return { totalArea, rendMedio, combMedio, totalTempoEfetivo, eficMedia }
  }, [data])

  const selMetric = CHART_METRICS.find(m => m.value === chartMetric) || CHART_METRICS[0]

  // Benchmark mean for chart
  const benchmarkMean = useMemo(() => {
    if (!filters.showBenchmark) return null
    if (selMetric.meta) return selMetric.meta
    const vals = data.map(c => c[chartMetric])
    return vals.reduce((a, v) => a + v, 0) / vals.length
  }, [filters.showBenchmark, chartMetric, data, selMetric.meta])

  const chartData = useMemo(() => {
    return data.map(c => ({
      label: c.cliente,
      value: c[chartMetric],
      benchmark: benchmarkMean,
      color: barColor(c[chartMetric], selMetric.meta, selMetric.higherIsBetter),
    }))
  }, [data, chartMetric, benchmarkMean, selMetric])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-pa-text">Overview</h1>
        <p className="text-sm text-pa-muted mt-0.5">
          Visão consolidada de todos os clientes
          {filters.periodo === 'ontem' && ' · Ontem'}
          {filters.periodo === '7dias' && ' · Últimos 7 dias'}
          {filters.periodo === '30dias' && ' · Últimos 30 dias'}
          {filters.periodo === 'safra' && ' · Safra atual'}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard label="Área Total" value={fmtHa(agg.totalArea)} />
        <KPICard label="Rendimento Médio" value={fmtHah(agg.rendMedio)} />
        <KPICard label="Combustível Médio" value={fmt(agg.combMedio, 1, ' L/ha')} />
        <KPICard label="Tempo Efetivo Total" value={fmtH(agg.totalTempoEfetivo)} />
        <KPICard label="Eficiência Geral" value={fmtPct(agg.eficMedia)} pctValue={agg.eficMedia} />
      </div>

      {/* Tabela de clientes */}
      <div className="bg-pa-surface border border-pa-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-pa-text mb-4">Clientes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pa-border">
                {['Cliente', 'Propriedade', 'Operação', 'Cultura', 'Área (ha)', 'Rendimento', 'Combustível', 'Eficiência', 'Disp. Mec.', 'Tempo Efet.'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-pa-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
                {filters.showBenchmark && (
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-pa-muted uppercase tracking-wider whitespace-nowrap">Média Porteira</th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.map((c, i) => {
                const rendBadge = statusBadge(c.rendimento_hah, META_RENDIMENTO, true)
                const eficBadge = statusBadge(c.eficiencia_pct, 70, true)
                const dBadge = dispBadge(c.disponibilidade_pct)
                return (
                  <tr
                    key={i}
                    className="border-b border-pa-border/50 hover:bg-pa-surface-2 transition-colors cursor-pointer"
                    onClick={() => onNavigateCliente?.(c.cliente)}
                  >
                    <td className="px-3 py-2.5 font-medium text-pa-text">{c.cliente}</td>
                    <td className="px-3 py-2.5 text-pa-muted">{c.propriedade}</td>
                    <td className="px-3 py-2.5 text-pa-muted">{c.operacao}</td>
                    <td className="px-3 py-2.5 text-pa-muted">{c.cultura}</td>
                    <td className="px-3 py-2.5 tabular-nums text-pa-muted">{fmtHa(c.area_ha)}</td>
                    <td className="px-3 py-2.5 tabular-nums">
                      <span className="font-bold text-pa-green">{fmtHah(c.rendimento_hah)}</span>
                      {rendBadge && <span className={`ml-1.5 text-xs ${rendBadge.cls}`}>{rendBadge.label}</span>}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-pa-muted">{fmt(c.combustivel_lha, 1, ' L/ha')}</td>
                    <td className="px-3 py-2.5 tabular-nums">
                      <span className="font-medium">{fmtPct(c.eficiencia_pct)}</span>
                      {eficBadge && <span className={`ml-1.5 text-xs ${eficBadge.cls}`}>{eficBadge.label}</span>}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      <span className="font-medium">{fmtPct(c.disponibilidade_pct)}</span>
                      <span className={`ml-1.5 text-xs ${dBadge.cls}`}>{dBadge.label}</span>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-pa-muted">{fmtH(c.tempo_efetivo_h)}</td>
                    {filters.showBenchmark && (
                      <td className="px-3 py-2.5 tabular-nums text-pa-amber font-medium">{fmtHah(META_RENDIMENTO)}</td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gráfico comparativo */}
      <div className="bg-pa-surface border border-pa-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-pa-text">Comparativo por Cliente</h3>
          <select
            value={chartMetric}
            onChange={e => setChartMetric(e.target.value)}
            className="bg-pa-surface-2 border border-pa-border rounded-lg px-3 py-1.5 text-sm text-pa-text focus:outline-none focus:border-pa-green"
          >
            {CHART_METRICS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <HBarChart data={chartData} />
        {filters.showBenchmark && benchmarkMean && (
          <p className="text-xs text-pa-muted mt-2">
            Linha de referência: Média Porteira = {selMetric.fmt(benchmarkMean)}
          </p>
        )}
      </div>
    </div>
  )
}
