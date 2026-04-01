import { useState, useMemo } from 'react'
import React from 'react'
import {
  useBenchmarkComparativo,
  useOperationalData,
  useGrupoData,
  useFilterOptions,
} from '../hooks/useData'
import { KPICard, PageLoader } from '../components/UI'
import {
  groupBy, aggregateRows, semaphoreColor,
  fmtHah, fmtPct, fmtLh, fmtKmh,
} from '../lib/utils'

// ── Constantes de métricas ─────────────────────────────────────────────────────

const BENCH_METRICAS = [
  { value: 'rendimento_operacional_hah',   portKey: 'rendimento_operacional_hah_grupo',   label: 'Rendimento Op. (ha/h)',   fmt: fmtHah, higherIsBetter: true  },
  { value: 'rendimento_real_hah',          portKey: 'rendimento_real_hah_grupo',          label: 'Rendimento Real (ha/h)',  fmt: fmtHah, higherIsBetter: true  },
  { value: 'eficiencia_geral_pct',         portKey: 'eficiencia_geral_pct_grupo',         label: 'Eficiência Geral (%)',   fmt: fmtPct, higherIsBetter: true  },
  { value: 'disponibilidade_mecanica_pct', portKey: 'disponibilidade_mecanica_pct_grupo', label: 'Disp. Mecânica (%)',     fmt: fmtPct, higherIsBetter: true  },
  { value: 'consumo_medio_efetivo_lh',     portKey: 'consumo_medio_efetivo_lh_grupo',     label: 'Consumo Ef. (l/h)',      fmt: fmtLh,  higherIsBetter: false },
  { value: 'velocidade_media_kmh',         portKey: 'velocidade_media_kmh_grupo',         label: 'Velocidade Média (km/h)', fmt: fmtKmh, higherIsBetter: true  },
]

const RADAR_AXES = [
  { clientKey: 'rendimento_operacional_hah',   portKey: 'rendimento_operacional_hah_grupo',   label: 'Rend. Op.',   higherIsBetter: true  },
  { clientKey: 'eficiencia_geral_pct',         portKey: 'eficiencia_geral_pct_grupo',         label: 'Efic. Geral', higherIsBetter: true  },
  { clientKey: 'disponibilidade_mecanica_pct', portKey: 'disponibilidade_mecanica_pct_grupo', label: 'Disp. Mec.',  higherIsBetter: true  },
  { clientKey: 'consumo_medio_efetivo_lh',     portKey: 'consumo_medio_efetivo_lh_grupo',     label: 'Cons. Ef.',   higherIsBetter: false },
  { clientKey: 'velocidade_media_kmh',         portKey: 'velocidade_media_kmh_grupo',         label: 'Vel. Média',  higherIsBetter: true  },
]

const EVOLUTION_METRICAS = [
  { clientKey: 'rendimento_operacional_hah',   portKey: 'rendimento_operacional_hah_grupo',   label: 'Rend. Op.',   fmt: fmtHah, higherIsBetter: true  },
  { clientKey: 'eficiencia_geral_pct',         portKey: 'eficiencia_geral_pct_grupo',         label: 'Efic. Geral', fmt: fmtPct, higherIsBetter: true  },
  { clientKey: 'disponibilidade_mecanica_pct', portKey: 'disponibilidade_mecanica_pct_grupo', label: 'Disp. Mec.',  fmt: fmtPct, higherIsBetter: true  },
  { clientKey: 'consumo_medio_efetivo_lh',     portKey: 'consumo_medio_efetivo_lh_grupo',     label: 'Cons. Ef.',   fmt: fmtLh,  higherIsBetter: false },
  { clientKey: 'velocidade_media_kmh',         portKey: 'velocidade_media_kmh_grupo',         label: 'Vel. Média',  fmt: fmtKmh, higherIsBetter: true  },
]

const inputCls = 'bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200'

// ── Radar Chart SVG puro — 320×320 ────────────────────────────────────────────

function RadarChart({ clientAgg, portAgg }) {
  const CX = 160, CY = 162, R = 100
  const N = RADAR_AXES.length
  const angle = i => (Math.PI * 2 * i / N) - Math.PI / 2

  const toPath = pts =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + 'Z'

  // Porteira: sempre no raio pleno (100%)
  const portPoints = RADAR_AXES.map((_, i) => {
    const a = angle(i)
    return [CX + R * Math.cos(a), CY + R * Math.sin(a)]
  })

  // Cliente: normalizado por porteira, clamp 0–160%
  const clientPoints = RADAR_AXES.map((ax, i) => {
    const cv = clientAgg?.[ax.clientKey] || 0
    const pv = portAgg?.[ax.portKey] || 0
    let ratio = 0
    if (pv && cv) {
      ratio = ax.higherIsBetter ? cv / pv : pv / cv
      ratio = Math.min(Math.max(ratio, 0), 1.6)
    }
    const a = angle(i)
    return [CX + R * ratio * Math.cos(a), CY + R * ratio * Math.sin(a)]
  })

  // Grade em 4 níveis
  const gridPaths = [0.25, 0.5, 0.75, 1.0].map(pct =>
    toPath(RADAR_AXES.map((_, i) => {
      const a = angle(i)
      return [CX + R * pct * Math.cos(a), CY + R * pct * Math.sin(a)]
    }))
  )

  return (
    <svg width={320} height={320} viewBox="0 0 320 320" className="mx-auto">
      {/* Grade */}
      {gridPaths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#3f3f46"
          strokeWidth={i === 3 ? 1 : 0.5}
          strokeDasharray={i < 3 ? '2,3' : undefined} />
      ))}
      {/* Linhas dos eixos */}
      {RADAR_AXES.map((_, i) => {
        const a = angle(i)
        return (
          <line key={i}
            x1={CX} y1={CY}
            x2={(CX + R * Math.cos(a)).toFixed(1)}
            y2={(CY + R * Math.sin(a)).toFixed(1)}
            stroke="#3f3f46" strokeWidth={0.5} />
        )
      })}
      {/* Área Porteira (azul) */}
      <path d={toPath(portPoints)} fill="#3b82f620" stroke="#3b82f6" strokeWidth={1.5} strokeLinejoin="round" />
      {/* Área Cliente (emerald) */}
      {clientAgg && (
        <path d={toPath(clientPoints)} fill="#10b98130" stroke="#10b981" strokeWidth={1.5} strokeLinejoin="round" />
      )}
      {/* Labels dos eixos */}
      {RADAR_AXES.map((ax, i) => {
        const a = angle(i)
        const lx = (CX + (R + 20) * Math.cos(a)).toFixed(1)
        const ly = (CY + (R + 20) * Math.sin(a)).toFixed(1)
        return (
          <text key={i} x={lx} y={ly}
            textAnchor="middle" dominantBaseline="middle"
            fill="#a1a1aa" fontSize="10" fontFamily="monospace">
            {ax.label}
          </text>
        )
      })}
      {/* Label 100% */}
      <text x={CX + 5} y={CY - R + 4} textAnchor="start" fill="#52525b" fontSize="8.5" fontFamily="monospace">
        100%
      </text>
    </svg>
  )
}

// ── Gráfico de barras pareadas por processo ───────────────────────────────────

function PairedHBarChart({ processos }) {
  if (!processos.length) return (
    <div className="text-center py-8 text-zinc-600 text-sm">Nenhum processo no período selecionado</div>
  )
  const max = Math.max(...processos.flatMap(p => [p.clienteVal || 0, p.portVal || 0]), 0.01)
  return (
    <div className="space-y-5">
      {processos.map((p, i) => (
        <div key={i}>
          <div className="text-xs text-zinc-400 font-medium mb-1.5 truncate">{p.processo}</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 w-24 text-right shrink-0">Cliente</span>
              <div className="flex-1 relative h-4 rounded bg-zinc-800 overflow-hidden">
                <div className="absolute left-0 top-0 h-full rounded bg-emerald-500 transition-all duration-500"
                  style={{ width: `${(p.clienteVal / max) * 100}%` }} />
              </div>
              <span className="text-xs tabular-nums text-zinc-300 w-16 text-right shrink-0">
                {p.fmt(p.clienteVal)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 w-24 text-right shrink-0">Méd. Porteira</span>
              <div className="flex-1 relative h-4 rounded bg-zinc-800 overflow-hidden">
                <div className="absolute left-0 top-0 h-full rounded bg-blue-400 transition-all duration-500"
                  style={{ width: `${(p.portVal / max) * 100}%` }} />
              </div>
              <span className="text-xs tabular-nums text-zinc-300 w-16 text-right shrink-0">
                {p.fmt(p.portVal)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function BenchmarkGrupoPage() {
  const [filters, setFilters] = useState({})
  const [metrica, setMetrica] = useState('rendimento_operacional_hah')

  const filterOptions = useFilterOptions()
  const { clienteData, porteiraBenchmarks, loading, error } = useBenchmarkComparativo(filters)

  // Cross-safra: carrega só quando cliente selecionado (evita query massiva sem filtro)
  const evolutionFilters = useMemo(() => {
    if (!filters.cliente) return null
    return {
      cliente: filters.cliente,
      ...(filters.tipo_safra && { tipo_safra: filters.tipo_safra }),
      ...(filters.processo   && { processo:   filters.processo   }),
    }
  }, [filters.cliente, filters.tipo_safra, filters.processo])

  const { data: allClientData } = useOperationalData(evolutionFilters || { _disabled: true })
  const { data: allPorteiraData } = useGrupoData({})

  const metricaDef = BENCH_METRICAS.find(m => m.value === metrica) || BENCH_METRICAS[0]

  // ── Agregação global do cliente ────────────────────────────────────────────
  const clientAgg = useMemo(() => {
    if (!clienteData.length) return null
    return aggregateRows(clienteData)
  }, [clienteData])

  // ── Agregação global da porteira (média simples das linhas filtradas) ───────
  const portAgg = useMemo(() => {
    if (!porteiraBenchmarks.length) return null
    const n = porteiraBenchmarks.length
    const allKeys = [...new Set([
      ...BENCH_METRICAS.map(m => m.portKey),
      ...RADAR_AXES.map(m => m.portKey),
      ...EVOLUTION_METRICAS.map(m => m.portKey),
    ])]
    const avg = key => porteiraBenchmarks.reduce((a, r) => a + (parseFloat(r[key]) || 0), 0) / n
    return Object.fromEntries(allKeys.map(k => [k, avg(k)]))
  }, [porteiraBenchmarks])

  // ── KPI values ─────────────────────────────────────────────────────────────
  const clientVal  = clientAgg?.[metricaDef.value] ?? null
  const portVal    = portAgg?.[metricaDef.portKey] ?? null
  const deltaAbs   = clientVal != null && portVal != null ? clientVal - portVal : null
  const deltaPct   = clientVal != null && portVal ? (clientVal / portVal - 1) * 100 : null
  const deltaGood  = metricaDef.higherIsBetter ? (deltaAbs ?? 0) >= 0 : (deltaAbs ?? 0) <= 0

  // ── Processos para gráfico de barras pareadas ──────────────────────────────
  const processosData = useMemo(() => {
    const byProc = groupBy(clienteData, 'processo')
    return Object.entries(byProc)
      .map(([proc, rows]) => {
        const agg = aggregateRows(rows)
        const portRow =
          porteiraBenchmarks.find(b => b.processo === proc) ||
          (porteiraBenchmarks.length === 1 ? porteiraBenchmarks[0] : null)
        return {
          processo:   proc,
          clienteVal: agg?.[metricaDef.value] || 0,
          portVal:    portRow?.[metricaDef.portKey] || 0,
          fmt:        metricaDef.fmt,
        }
      })
      .filter(p => p.clienteVal > 0 || p.portVal > 0)
      .sort((a, b) => b.clienteVal - a.clienteVal)
  }, [clienteData, porteiraBenchmarks, metricaDef])

  // ── Evolução por safra ─────────────────────────────────────────────────────
  const evolutionRows = useMemo(() => {
    const safras = [...new Set([
      ...allClientData.map(r => r.safra),
      ...allPorteiraData.map(r => r.safra),
    ].filter(Boolean))].sort().reverse()

    return safras.map(safra => {
      const clientRows = allClientData.filter(r => r.safra === safra)
      const portRows   = allPorteiraData.filter(r => {
        if (r.safra !== safra) return false
        if (filters.tipo_safra && r.tipo_safra !== filters.tipo_safra) return false
        if (filters.processo   && r.processo   !== filters.processo)   return false
        return true
      })
      const n = portRows.length
      const portAvgObj = n
        ? Object.fromEntries(
            EVOLUTION_METRICAS.map(m => [
              m.portKey,
              portRows.reduce((a, r) => a + (parseFloat(r[m.portKey]) || 0), 0) / n,
            ])
          )
        : null
      return {
        safra,
        clientAggSafra: clientRows.length ? aggregateRows(clientRows) : null,
        portAvg: portAvgObj,
      }
    })
  }, [allClientData, allPorteiraData, filters.tipo_safra, filters.processo])

  if (loading) return <PageLoader />
  if (error)   return <div className="p-6 text-red-400">Erro: {error}</div>

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Benchmark Grupo Porteira</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Performance do cliente vs Média Porteira · tabela <span className="font-mono">media_grupo_porteira</span></p>
      </div>

      {/* ── Seção 1 — Filtros + Seletor de Métrica ──────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
        {/* Filtros */}
        <div className="flex flex-wrap gap-2 items-end">
          {[
            { key: 'safra',      label: 'Safra',    opts: filterOptions.safras,      required: true },
            { key: 'tipo_safra', label: 'Cultura',  opts: filterOptions.tipos_safra, required: false },
            { key: 'processo',   label: 'Processo', opts: filterOptions.processos,   required: false },
            { key: 'cliente',    label: 'Cliente',  opts: filterOptions.clientes,    required: false },
          ].map(({ key, label, opts, required }) => (
            <div key={key} className="flex flex-col gap-0.5">
              <label className={`text-xs ${required && !filters[key] ? 'text-amber-500' : 'text-zinc-500'}`}>
                {label}{required && <span className="ml-0.5 text-amber-500">*</span>}
              </label>
              <select
                value={filters[key] || ''}
                onChange={e => setFilters(f => ({ ...f, [key]: e.target.value || undefined }))}
                className={`${inputCls} min-w-[130px] ${required && !filters[key] ? 'border-amber-500/50' : ''}`}
              >
                <option value="">{required ? '— selecione —' : 'Todos'}</option>
                {opts?.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <button
            onClick={() => setFilters({})}
            className="self-end px-3 py-1.5 rounded-lg text-xs text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
          >
            Limpar
          </button>
        </div>

        {/* Seletor de métrica */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-zinc-800">
          <span className="text-xs font-semibold text-zinc-400">Métrica dos gráficos</span>
          <select
            value={metrica}
            onChange={e => setMetrica(e.target.value)}
            className={`${inputCls} min-w-[240px]`}
          >
            {BENCH_METRICAS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      {/* ── Estado vazio — safra não selecionada ────────────────────────────── */}
      {!filters.safra && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-14 text-center">
          <p className="text-3xl mb-3">🌾</p>
          <p className="text-zinc-300 font-medium">Selecione uma safra para visualizar o comparativo</p>
          <p className="text-zinc-600 text-sm mt-1.5">
            O benchmark de grupo compara a performance do cliente com a Média Porteira
          </p>
        </div>
      )}

      {filters.safra && (
        <>
          {/* ── Seção 2 — KPI Cards ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">

            {/* Card 1 — Valor do cliente */}
            <KPICard
              label={`Cliente · ${metricaDef.label}`}
              value={clientVal != null ? metricaDef.fmt(clientVal) : '—'}
              color="emerald"
            />

            {/* Card 2 — Média Porteira */}
            <KPICard
              label={`Média Porteira · ${metricaDef.label}`}
              value={portVal != null ? metricaDef.fmt(portVal) : '—'}
              color="blue"
            />

            {/* Card 3 — Δ Absoluto */}
            <div className={`rounded-xl border bg-gradient-to-br to-transparent p-4 dark:bg-transparent ${
              deltaAbs === null ? 'border-zinc-800 from-zinc-800/10'
              : deltaGood ? 'border-emerald-500/20 from-emerald-500/10'
              : 'border-red-500/20 from-red-500/10'
            }`}>
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Δ Absoluto</p>
              <p className={`text-2xl font-bold tabular-nums ${
                deltaAbs === null ? 'text-zinc-500'
                : deltaGood ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {deltaAbs != null
                  ? `${deltaAbs >= 0 ? '+' : ''}${metricaDef.fmt(Math.abs(deltaAbs))}`
                  : '—'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Cliente − Média Porteira</p>
            </div>

            {/* Card 4 — Δ Percentual */}
            <div className={`rounded-xl border bg-gradient-to-br to-transparent p-4 dark:bg-transparent ${
              deltaPct === null ? 'border-zinc-800 from-zinc-800/10'
              : deltaGood ? 'border-emerald-500/20 from-emerald-500/10'
              : 'border-red-500/20 from-red-500/10'
            }`}>
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Δ Percentual</p>
              <p className={`text-2xl font-bold tabular-nums ${
                deltaPct === null ? 'text-zinc-500'
                : deltaGood ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {deltaPct != null
                  ? `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%`
                  : '—'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">(Cliente / Porteira − 1)</p>
            </div>

          </div>

          {/* ── Seções 3 + 4 — Barras pareadas e Radar ──────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

            {/* Seção 3 — Barras pareadas por processo */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-zinc-300 mb-0.5">Comparativo por Processo</h3>
              <p className="text-xs text-zinc-600 mb-2">{metricaDef.label} · ordenado pelo valor do cliente</p>
              <div className="flex gap-5 mb-4 text-xs text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
                  Cliente
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-blue-400 inline-block" />
                  Média Porteira
                </span>
              </div>
              <PairedHBarChart processos={processosData} />
            </div>

            {/* Seção 4 — Radar chart SVG */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-zinc-300 mb-0.5">Radar de Performance</h3>
              <p className="text-xs text-zinc-600 mb-3">
                Normalizado pela Média Porteira · porteira = 100% em cada eixo · Consumo Ef. invertido
              </p>
              <div className="flex gap-5 mb-1 text-xs text-zinc-500 justify-center">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#10b981', opacity: 0.7 }} />
                  Cliente
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#3b82f6', opacity: 0.7 }} />
                  Média Porteira
                </span>
              </div>
              <RadarChart clientAgg={clientAgg} portAgg={portAgg} />
              {!clientAgg && (
                <p className="text-center text-xs text-zinc-600 mt-1">Sem dados operacionais para os filtros selecionados</p>
              )}
            </div>

          </div>

          {/* ── Seção 5 — Tabela evolutiva por safra ────────────────────────── */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-0.5">Evolução por Safra</h3>
            <p className="text-xs text-zinc-600 mb-4">
              {filters.cliente
                ? `Cliente: ${filters.cliente} · performance em cada safra vs Média Porteira · cor semáforo na coluna do cliente`
                : 'Selecione um cliente para ver a evolução individual · exibindo apenas referência Porteira'}
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                      Safra
                    </th>
                    {EVOLUTION_METRICAS.map(m => (
                      <th key={m.clientKey} colSpan={2}
                        className="px-2 py-2.5 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider whitespace-nowrap border-l border-zinc-800/50">
                        {m.label}
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b border-zinc-800">
                    <th className="px-3 py-1.5" />
                    {EVOLUTION_METRICAS.map(m => (
                      <React.Fragment key={m.clientKey}>
                        <th className="px-2 py-1.5 text-center text-xs text-emerald-500/80 font-normal border-l border-zinc-800/50 whitespace-nowrap">
                          Cliente
                        </th>
                        <th className="px-2 py-1.5 text-center text-xs text-blue-400/80 font-normal whitespace-nowrap">
                          Porteira
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {evolutionRows.map((row, i) => (
                    <tr key={i}
                      className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${
                        row.safra === filters.safra ? 'bg-zinc-800/20' : ''
                      }`}>
                      <td className="px-3 py-2 font-medium text-zinc-300 whitespace-nowrap">
                        {row.safra}
                        {row.safra === filters.safra && (
                          <span className="ml-1.5 text-xs text-emerald-500/60">(atual)</span>
                        )}
                      </td>
                      {EVOLUTION_METRICAS.map(m => {
                        const cv = row.clientAggSafra?.[m.clientKey] ?? null
                        const pv = row.portAvg?.[m.portKey] ?? null
                        const semCol = cv != null && pv != null
                          ? semaphoreColor(cv, pv, m.higherIsBetter)
                          : 'text-zinc-600'
                        return (
                          <React.Fragment key={m.clientKey}>
                            <td className={`px-2 py-2 tabular-nums text-center border-l border-zinc-800/30 ${semCol}`}>
                              {cv != null ? m.fmt(cv) : '—'}
                            </td>
                            <td className="px-2 py-2 tabular-nums text-center text-zinc-500">
                              {pv != null ? m.fmt(pv) : '—'}
                            </td>
                          </React.Fragment>
                        )
                      })}
                    </tr>
                  ))}
                  {!evolutionRows.length && (
                    <tr>
                      <td colSpan={1 + EVOLUTION_METRICAS.length * 2}
                        className="text-center py-8 text-zinc-600">
                        Nenhum dado encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </>
      )}
    </div>
  )
}
