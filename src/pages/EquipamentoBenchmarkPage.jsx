import { useState, useMemo } from 'react'
import React from 'react'
import { useOperationalData, useEquipamentoBenchmark, useFilterOptions, useModeloBenchmarkAll } from '../hooks/useData'
import { FilterBar, HBarChart, PageLoader } from '../components/UI'
import {
  groupBy, aggregateRows, semaphoreColor, defaultDateRange,
  fmtHah, fmtPct, fmtLh, fmtKmh, fmtH, fmtHa
} from '../lib/utils'

// Métricas disponíveis para o seletor desta página
const BENCH_METRICAS = [
  { value: 'rendimento_operacional_hah',   benchKey: 'rendimento_operacional_hah_modelo',   label: 'Rendimento Operacional (ha/h)', fmt: fmtHah, higherIsBetter: true  },
  { value: 'rendimento_real_hah',          benchKey: 'rendimento_real_hah_modelo',           label: 'Rendimento Real (ha/h)',        fmt: fmtHah, higherIsBetter: true  },
  { value: 'eficiencia_geral_pct',         benchKey: 'eficiencia_geral_pct_modelo',          label: 'Eficiência Geral (%)',          fmt: fmtPct, higherIsBetter: true  },
  { value: 'disponibilidade_mecanica_pct', benchKey: 'disponibilidade_mecanica_pct_modelo',  label: 'Disponibilidade Mecânica (%)', fmt: fmtPct, higherIsBetter: true  },
  { value: 'consumo_medio_efetivo_lh',     benchKey: 'consumo_medio_efetivo_lh_modelo',      label: 'Consumo Ef. (l/h)',            fmt: fmtLh,  higherIsBetter: false },
  { value: 'velocidade_media_kmh',         benchKey: 'velocidade_media_kmh_modelo',          label: 'Velocidade Média (km/h)',      fmt: fmtKmh, higherIsBetter: true  },
]

const TABLE_COLS_REF = [
  { key: 'modelo_equipamento',                label: 'Modelo' },
  { key: 'processo',                          label: 'Processo' },
  { key: 'tipo_safra',                        label: 'Cultura' },
  { key: 'safra',                             label: 'Safra' },
  { key: 'rendimento_operacional_hah_modelo', label: 'Rend. Op.',   fmt: fmtHah },
  { key: 'rendimento_real_hah_modelo',        label: 'Rend. Real',  fmt: fmtHah },
  { key: 'eficiencia_geral_pct_modelo',       label: 'Efic. Geral', fmt: fmtPct },
  { key: 'disponibilidade_mecanica_pct_modelo', label: 'Disp. Mec.', fmt: fmtPct },
  { key: 'consumo_medio_efetivo_lh_modelo',   label: 'Cons. Ef.',   fmt: fmtLh  },
  { key: 'velocidade_media_kmh_modelo',       label: 'Vel. Média',  fmt: fmtKmh },
  { key: 'dias_ativos',                       label: 'Dias Ativos' },
]

const inputCls = 'bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200'

function barColor(value, bench, higherIsBetter) {
  if (!bench || !value) return '#6b7280'
  return (higherIsBetter ? value >= bench : value <= bench) ? '#22c55e' : '#ef4444'
}

function pctDiff(val, bench) {
  if (!bench || val == null) return null
  return ((val - bench) / bench) * 100
}

export default function EquipamentoBenchmarkPage() {
  const [filters, setFilters]   = useState({ ...defaultDateRange() })
  const [metrica, setMetrica]   = useState('rendimento_operacional_hah')
  const [expandedEquip, setExpandedEquip] = useState(null)
  const [filters4, setFilters4] = useState({})

  const options = useFilterOptions()
  const { data, loading, error } = useOperationalData(filters)
  const { data: modeloBenchmarks } = useEquipamentoBenchmark({
    safra:      filters.safra,
    processo:   filters.processo,
    tipo_safra: filters.tipo_safra,
  })
  const { data: allModeloBench } = useModeloBenchmarkAll(filters4)

  const metricaDef = BENCH_METRICAS.find(m => m.value === metrica) || BENCH_METRICAS[0]

  // ── Agrega por equipamento individual ────────────────────────────────────────
  const byEquipamento = useMemo(() => {
    const grouped = groupBy(data, 'equipamento')
    return Object.entries(grouped).map(([equip, rows]) => {
      const agg = aggregateRows(rows)
      const modelo = rows[0]?.modelo_equipamento
      // Para benchmark: tenta casar modelo + processo; cai no primeiro do modelo
      const bench = modeloBenchmarks.find(b =>
        b.modelo_equipamento === modelo && (!filters.processo || b.processo === filters.processo)
      ) || modeloBenchmarks.find(b => b.modelo_equipamento === modelo) || null
      return { equipamento: equip, modelo, bench, ...agg }
    })
      .filter(r => r.area_ha > 0 || r.tempo_total_h > 0)
      .sort((a, b) => (b[metrica] || 0) - (a[metrica] || 0))
  }, [data, modeloBenchmarks, metrica, filters.processo])

  // ── Drill-down: processos do equipamento expandido ───────────────────────────
  const expandedRows = useMemo(() => {
    if (!expandedEquip) return []
    const rows = data.filter(r => r.equipamento === expandedEquip)
    const modelo = rows[0]?.modelo_equipamento
    const grouped = groupBy(rows, 'processo')
    return Object.entries(grouped).map(([proc, procRows]) => {
      const agg = aggregateRows(procRows)
      const bench =
        modeloBenchmarks.find(b => b.modelo_equipamento === modelo && b.processo === proc) ||
        modeloBenchmarks.find(b => b.modelo_equipamento === modelo) || null
      return { processo: proc, bench, ...agg }
    }).sort((a, b) => (b[metrica] || 0) - (a[metrica] || 0))
  }, [data, expandedEquip, modeloBenchmarks, metrica])

  // ── Agrega por modelo (para gráfico B) ──────────────────────────────────────
  const byModelo = useMemo(() => {
    const grouped = groupBy(data, 'modelo_equipamento')
    return Object.entries(grouped).map(([modelo, rows]) => {
      const agg = aggregateRows(rows)
      const bench = modeloBenchmarks.find(b =>
        b.modelo_equipamento === modelo && (!filters.processo || b.processo === filters.processo)
      ) || modeloBenchmarks.find(b => b.modelo_equipamento === modelo) || null
      return { modelo, bench, ...agg }
    })
      .filter(r => r.area_ha > 0 || r.tempo_total_h > 0)
      .sort((a, b) => (b[metrica] || 0) - (a[metrica] || 0))
  }, [data, modeloBenchmarks, metrica, filters.processo])

  // ── Opções de filtro derivadas da tabela de referência ──────────────────────
  const opts4 = useMemo(() => ({
    safras:      [...new Set(allModeloBench.map(r => r.safra).filter(Boolean))].sort().reverse(),
    tipos_safra: [...new Set(allModeloBench.map(r => r.tipo_safra).filter(Boolean))].sort(),
    processos:   [...new Set(allModeloBench.map(r => r.processo).filter(Boolean))].sort(),
  }), [allModeloBench])

  const tableRefRows = useMemo(() =>
    [...allModeloBench].sort((a, b) =>
      String(a.modelo_equipamento || '').localeCompare(String(b.modelo_equipamento || '')) ||
      String(a.processo || '').localeCompare(String(b.processo || ''))
    )
  , [allModeloBench])

  // ── Dados para Chart A (15 equipamentos) ────────────────────────────────────
  const chartAData = useMemo(() =>
    byEquipamento.slice(0, 15).map(e => ({
      label:     e.equipamento,
      value:     e[metrica] || 0,
      benchmark: e.bench?.[metricaDef.benchKey] ?? null,
      color:     barColor(e[metrica], e.bench?.[metricaDef.benchKey], metricaDef.higherIsBetter),
    }))
  , [byEquipamento, metrica, metricaDef])

  // ── Dados para Chart B (8 modelos, 2 barras cada) ───────────────────────────
  const chartBData = useMemo(() =>
    byModelo.slice(0, 8).flatMap(m => [
      { label: `${m.modelo} (cliente)`,  value: m[metrica] || 0,                             color: '#22c55e' },
      { label: `${m.modelo} (Porteira)`, value: m.bench?.[metricaDef.benchKey] || 0,          color: '#3b82f6' },
    ]).filter(d => d.value > 0)
  , [byModelo, metrica, metricaDef])

  if (loading) return <PageLoader />
  if (error)   return <div className="p-6 text-red-400">Erro: {error}</div>

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Benchmark por Equipamento</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Performance real vs Média Porteira por modelo</p>
      </div>

      {/* ── Seção 1: Filtros ───────────────────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <FilterBar
          filters={filters}
          onChange={(f) => { setFilters(f); setExpandedEquip(null) }}
          options={options}
          showModelo
          showEquipamentoSearch
        />
      </div>

      {/* ── Seção 2: Seletor de Métrica ────────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-semibold text-zinc-300 whitespace-nowrap">Métrica dos gráficos</span>
          <select
            value={metrica}
            onChange={e => setMetrica(e.target.value)}
            className={`${inputCls} min-w-[240px]`}
          >
            {BENCH_METRICAS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <div className="flex flex-wrap gap-4 text-xs text-zinc-500 ml-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
              Acima do benchmark
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />
              Abaixo do benchmark
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-0.5 h-4 bg-white/40 inline-block" />
              Linha de referência
            </span>
          </div>
        </div>
      </div>

      {/* ── Seção 3: Gráficos comparativos ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* 3A — Equipamentos individuais com linha de referência */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-0.5">Equipamentos Individuais</h3>
          <p className="text-xs text-zinc-600 mb-4">
            {metricaDef.label} · linha vertical = benchmark do modelo correspondente
          </p>
          {chartAData.length > 0
            ? <HBarChart data={chartAData} />
            : <div className="text-center py-8 text-zinc-600 text-sm">Nenhum dado no período selecionado</div>
          }
        </div>

        {/* 3B — Agrupado por modelo */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-0.5">Comparativo por Modelo</h3>
          <p className="text-xs text-zinc-600 mb-4">
            {metricaDef.label} · <span className="text-emerald-500">verde = cliente</span> · <span className="text-blue-400">azul = benchmark Porteira</span>
          </p>
          {chartBData.length > 0
            ? <HBarChart data={chartBData} />
            : <div className="text-center py-8 text-zinc-600 text-sm">Nenhum dado no período selecionado</div>
          }
        </div>
      </div>

      {/* ── Seção 4: Tabela de Referência — Médias Porteira por Modelo ─────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-300">
              Tabela de Referência — Médias Porteira por Modelo
            </h3>
            <p className="text-xs text-zinc-600 mt-0.5">
              Fonte: <span className="font-mono">media_equipamentos_porteira</span> · Selecione uma safra para carregar os dados
            </p>
          </div>

          {/* Filtros independentes da Seção 4 */}
          <div className="flex flex-wrap gap-2 items-end">
            {[
              { key: 'safra',      label: 'Safra',    opts: opts4.safras },
              { key: 'tipo_safra', label: 'Cultura',  opts: opts4.tipos_safra },
              { key: 'processo',   label: 'Processo', opts: opts4.processos },
            ].map(({ key, label, opts }) => (
              <div key={key} className="flex flex-col gap-0.5">
                <label className="text-xs text-zinc-500">{label}</label>
                <select
                  value={filters4[key] || ''}
                  onChange={e => setFilters4(f => ({ ...f, [key]: e.target.value || undefined }))}
                  className={`${inputCls} min-w-[120px]`}
                >
                  <option value="">Todos</option>
                  {opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <button
              onClick={() => setFilters4({})}
              className="self-end px-3 py-1.5 rounded-lg text-xs text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
            >
              Limpar
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {TABLE_COLS_REF.map(col => (
                  <th key={col.key} className="px-3 py-2.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRefRows.map((row, i) => (
                <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  {TABLE_COLS_REF.map(col => (
                    <td key={col.key} className="px-3 py-2 tabular-nums text-zinc-300 whitespace-nowrap text-xs">
                      {col.fmt ? col.fmt(row[col.key]) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
              {!tableRefRows.length && (
                <tr>
                  <td colSpan={TABLE_COLS_REF.length} className="text-center py-8 text-zinc-600">
                    Selecione uma safra para visualizar os dados de referência
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Seção 5: Tabela de Equipamentos do Cliente ─────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-zinc-300 mb-0.5">Equipamentos do Cliente</h3>
        <p className="text-xs text-zinc-600 mb-4">
          Clique em uma linha para ver detalhes por processo · Semáforo vs benchmark do modelo · Métrica: <span className="text-zinc-400">{metricaDef.label}</span>
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {[
                  'Equipamento', 'Modelo', 'Área (ha)',
                  metricaDef.label, 'Benchmark Modelo', 'Δ% vs Bench',
                  'Efic. Geral', 'Disp. Mec.',
                ].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byEquipamento.map((e) => {
                const benchVal = e.bench?.[metricaDef.benchKey] ?? null
                const val      = e[metrica] || 0
                const diff     = pctDiff(val, benchVal)
                const semColor = semaphoreColor(val, benchVal, metricaDef.higherIsBetter)
                const isExpanded = expandedEquip === e.equipamento

                return (
                  <React.Fragment key={e.equipamento}>
                    <tr
                      onClick={() => setExpandedEquip(isExpanded ? null : e.equipamento)}
                      className={`border-b border-zinc-800/50 cursor-pointer transition-colors ${isExpanded ? 'bg-zinc-800/40' : 'hover:bg-zinc-800/30'}`}
                    >
                      <td className="px-3 py-2 text-zinc-200">
                        <span className="mr-1.5 text-zinc-600 text-xs">{isExpanded ? '▼' : '▶'}</span>
                        {e.equipamento}
                      </td>
                      <td className="px-3 py-2 text-zinc-400 text-xs whitespace-nowrap">{e.modelo || '—'}</td>
                      <td className="px-3 py-2 tabular-nums text-zinc-300">{fmtHa(e.area_ha)}</td>
                      <td className={`px-3 py-2 tabular-nums font-medium ${semColor}`}>
                        {metricaDef.fmt(val)}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-zinc-500 text-xs">
                        {benchVal != null ? metricaDef.fmt(benchVal) : '—'}
                      </td>
                      <td className={`px-3 py-2 tabular-nums text-xs font-medium ${diff === null ? 'text-zinc-600' : diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {diff !== null ? `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%` : '—'}
                      </td>
                      <td className={`px-3 py-2 tabular-nums text-xs ${semaphoreColor(e.eficiencia_geral_pct, e.bench?.eficiencia_geral_pct_modelo, true)}`}>
                        {fmtPct(e.eficiencia_geral_pct)}
                      </td>
                      <td className={`px-3 py-2 tabular-nums text-xs ${semaphoreColor(e.disponibilidade_mecanica_pct, e.bench?.disponibilidade_mecanica_pct_modelo, true)}`}>
                        {fmtPct(e.disponibilidade_mecanica_pct)}
                      </td>
                    </tr>

                    {/* Drill-down: detalhes por processo */}
                    {isExpanded && expandedRows.map((proc, j) => {
                      const pBench = proc.bench?.[metricaDef.benchKey] ?? null
                      const pVal   = proc[metrica] || 0
                      const pDiff  = pctDiff(pVal, pBench)
                      return (
                        <tr key={`${e.equipamento}-${j}`} className="border-b border-zinc-800/30 bg-zinc-800/20">
                          <td className="px-3 py-1.5 pl-8 text-xs text-zinc-500 italic">{proc.processo}</td>
                          <td className="px-3 py-1.5 text-zinc-700 text-xs">—</td>
                          <td className="px-3 py-1.5 tabular-nums text-xs text-zinc-400">{fmtHa(proc.area_ha)}</td>
                          <td className={`px-3 py-1.5 tabular-nums text-xs font-medium ${semaphoreColor(pVal, pBench, metricaDef.higherIsBetter)}`}>
                            {metricaDef.fmt(pVal)}
                          </td>
                          <td className="px-3 py-1.5 tabular-nums text-xs text-zinc-600">
                            {pBench != null ? metricaDef.fmt(pBench) : '—'}
                          </td>
                          <td className={`px-3 py-1.5 tabular-nums text-xs ${pDiff === null ? 'text-zinc-600' : pDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {pDiff !== null ? `${pDiff >= 0 ? '+' : ''}${pDiff.toFixed(1)}%` : '—'}
                          </td>
                          <td className={`px-3 py-1.5 tabular-nums text-xs ${semaphoreColor(proc.eficiencia_geral_pct, proc.bench?.eficiencia_geral_pct_modelo, true)}`}>
                            {fmtPct(proc.eficiencia_geral_pct)}
                          </td>
                          <td className={`px-3 py-1.5 tabular-nums text-xs ${semaphoreColor(proc.disponibilidade_mecanica_pct, proc.bench?.disponibilidade_mecanica_pct_modelo, true)}`}>
                            {fmtPct(proc.disponibilidade_mecanica_pct)}
                          </td>
                        </tr>
                      )
                    })}
                  </React.Fragment>
                )
              })}
              {!byEquipamento.length && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-zinc-600">
                    Nenhum equipamento no período selecionado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
