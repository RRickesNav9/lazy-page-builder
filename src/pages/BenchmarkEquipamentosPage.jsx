// BenchmarkEquipamentosPage.jsx
// Compara dois equipamentos lado a lado, com referência da média do modelo.
// Seleção de métricas não-absolutas via chips toggle.

import { useState, useMemo, useCallback } from 'react'
import { useEquipamentoComparativo, useEquipamentoBenchmark, useEquipamentoOptions, useFilterOptions } from '../hooks/useData'
import { KPICard, HBarChart, PageLoader, FetchingBar, semaphoreRatio } from '../components/UI'
import { aggregateRows, defaultSafra, fmtHah, fmtPct, fmtLh, fmtKmh, fmtHa, fmt } from '../lib/utils'

// ─── CONFIGURAÇÃO ─────────────────────────────────────────────────────────────

// Apenas métricas não-absolutas — comparáveis entre equipamentos e contextos distintos.
// Métricas absolutas (area_ha, tempo_total_h, etc.) são excluídas por não serem comparáveis.
const ALL_METRICAS_CONFIG = [
  { key: 'rendimento_operacional_hah',   label: 'Rendimento Operacional',   sub: 'ha/h · maior é melhor',              fmtFn: fmtHah,                    modeloKey: 'rendimento_operacional_hah_modelo',   higherIsBetter: true,  isPct: false },
  { key: 'rendimento_real_hah',          label: 'Rendimento Real',          sub: 'ha/h · maior é melhor',              fmtFn: fmtHah,                    modeloKey: 'rendimento_real_hah_modelo',          higherIsBetter: true,  isPct: false },
  { key: 'velocidade_media_kmh',         label: 'Velocidade Média',         sub: 'km/h · maior é melhor',              fmtFn: fmtKmh,                    modeloKey: 'velocidade_media_kmh_modelo',         higherIsBetter: true,  isPct: false },
  { key: 'eficiencia_geral_pct',         label: 'Eficiência Geral',         sub: '% · maior é melhor',                 fmtFn: fmtPct,                    modeloKey: 'eficiencia_geral_pct_modelo',         higherIsBetter: true,  isPct: true  },
  { key: 'eficiencia_operacional_pct',   label: 'Eficiência Operacional',   sub: '% · maior é melhor',                 fmtFn: fmtPct,                    modeloKey: 'eficiencia_operacional_pct_modelo',   higherIsBetter: true,  isPct: true  },
  { key: 'disponibilidade_mecanica_pct', label: 'Disponibilidade Mecânica', sub: '% · maior é melhor',                 fmtFn: fmtPct,                    modeloKey: 'disponibilidade_mecanica_pct_modelo', higherIsBetter: true,  isPct: true  },
  { key: 'consumo_medio_lha',            label: 'Consumo Médio',            sub: 'L/ha · menor é melhor',              fmtFn: (v) => fmt(v, 1, ' L/ha'), modeloKey: 'consumo_medio_lha_modelo',            higherIsBetter: false, isPct: false },
  { key: 'consumo_medio_lh',             label: 'Consumo Médio',            sub: 'L/h · menor é melhor',               fmtFn: fmtLh,                     modeloKey: 'consumo_medio_lh_modelo',             higherIsBetter: false, isPct: false },
  { key: 'consumo_medio_efetivo_lha',    label: 'Consumo Efetivo Médio',    sub: 'L/ha · menor é melhor',              fmtFn: (v) => fmt(v, 1, ' L/ha'), modeloKey: 'consumo_medio_efetivo_lha_modelo',    higherIsBetter: false, isPct: false },
  { key: 'consumo_medio_efetivo_lh',     label: 'Consumo Efetivo',          sub: 'L/h · menor é melhor',               fmtFn: (v) => fmt(v, 1, ' L/h'),  modeloKey: 'consumo_medio_efetivo_lh_modelo',     higherIsBetter: false, isPct: false },
  { key: 'motor_ligado_pct',             label: 'Motor Ligado',             sub: '% do total · maior é melhor',        fmtFn: fmtPct,                    modeloKey: 'motor_ligado_pct_modelo',             higherIsBetter: true,  isPct: true  },
  { key: 'motor_ocioso_pct',             label: 'Motor Ocioso',             sub: '% do motor ligado · menor é melhor', fmtFn: fmtPct,                    modeloKey: 'motor_ocioso_pct_modelo',             higherIsBetter: false, isPct: true  },
  { key: 'sem_apontamento_pct',          label: 'Sem Apontamento',          sub: '% da parada · menor é melhor',       fmtFn: fmtPct,                    modeloKey: 'sem_apontamento_pct_modelo',          higherIsBetter: false, isPct: true  },
  { key: 'rpm_medio',                    label: 'RPM Médio',                sub: 'RPM · referência por processo',      fmtFn: (v) => fmt(v, 0, ' rpm'),  modeloKey: 'rpm_medio_modelo',                   higherIsBetter: null,  isPct: false },
  { key: 'area_por_linha_ha',            label: 'Área por Linha',           sub: 'ha · plantio · maior é melhor',      fmtFn: (v) => fmt(v, 4, ' ha'),   modeloKey: 'area_por_linha_ha_modelo',            higherIsBetter: true,  isPct: false },
]

const DEFAULT_SELECTED_METRICS = new Set([
  'rendimento_operacional_hah',
  'velocidade_media_kmh',
  'eficiencia_geral_pct',
  'disponibilidade_mecanica_pct',
  'consumo_medio_lha',
  'consumo_medio_lh',
])

// ─── COMPONENTES INTERNOS ─────────────────────────────────────────────────────

// Painel de seleção de métricas — chips toggle por chave.
// Impede desselecionar a última métrica ativa.
function MetricSelector({ selected, onToggle }) {
  return (
    <div style={{
      background: '#fafaf8', border: '1px solid #e0dbd4',
      borderRadius: 6, padding: '12px 14px',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, color: '#6b6560',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
      }}>
        Selecione as métricas para comparação
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ALL_METRICAS_CONFIG.map(cfg => {
          const isActive = selected.has(cfg.key)
          return (
            <button
              key={cfg.key}
              onClick={() => onToggle(cfg.key)}
              style={{
                padding: '4px 10px', fontSize: 11, fontWeight: 500,
                borderRadius: 4, cursor: 'pointer',
                border: isActive ? '1px solid #2d4a2d' : '1px solid #d0cac4',
                background: isActive ? '#2d4a2d' : '#ffffff',
                color: isActive ? '#ffffff' : '#6b6560',
              }}
            >
              {cfg.label}
              <span style={{ fontSize: 9, marginLeft: 4, opacity: 0.7 }}>
                {cfg.isPct ? '%' : cfg.sub.split('·')[0].trim()}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function EquipSelector({ label, filter, onChange, options, equipamentos }) {
  const inputCls = "w-full bg-pa-surface-2 border border-pa-border rounded-lg px-2.5 py-1.5 text-xs text-pa-text focus:outline-none focus:border-pa-green transition-colors"
  const set = (key, val) => onChange({ ...filter, [key]: val || undefined })

  return (
    <div className="flex-1 min-w-[240px] bg-pa-surface border border-pa-border rounded-xl p-4 space-y-3">
      <p className="text-xs font-bold text-pa-muted uppercase tracking-wider">{label}</p>
      <div>
        <label className="block text-xs text-pa-faint mb-1">Cliente</label>
        <select value={filter.cliente || ''} onChange={e => onChange({ cliente: e.target.value || undefined, equipamento_cod: undefined, safra: filter.safra, processo: filter.processo, tipo_safra: filter.tipo_safra })} className={inputCls}>
          <option value="">Selecione</option>
          {options.clientes?.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-pa-faint mb-1">Equipamento</label>
        <select value={filter.equipamento_cod || ''} onChange={e => set('equipamento_cod', e.target.value)} className={inputCls} disabled={!filter.cliente}>
          <option value="">Todos do cliente</option>
          {equipamentos.map(e => (
            <option key={e.equipamento_cod || e.equipamento} value={e.equipamento_cod || e.equipamento}>
              {e.equipamento}{e.modelo ? ` (${e.modelo})` : ''}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-pa-faint mb-1">Processo</label>
          <select value={filter.processo || ''} onChange={e => set('processo', e.target.value)} className={inputCls}>
            <option value="">Todos</option>
            {options.processos?.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-pa-faint mb-1">Cultura</label>
          <select value={filter.tipo_safra || ''} onChange={e => set('tipo_safra', e.target.value)} className={inputCls}>
            <option value="">Todas</option>
            {options.tipos_safra?.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-pa-faint mb-1">Safra</label>
        <select value={filter.safra || ''} onChange={e => set('safra', e.target.value)} className={inputCls}>
          <option value="">Todas</option>
          {options.safras?.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-pa-faint mb-1">De</label>
          <input type="date" value={filter.dataInicio || ''} onChange={e => set('dataInicio', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-pa-faint mb-1">Até</label>
          <input type="date" value={filter.dataFim || ''} onChange={e => set('dataFim', e.target.value)} className={inputCls} />
        </div>
      </div>
    </div>
  )
}

export default function BenchmarkEquipamentosPage() {
  const [filterA, setFilterA] = useState({ safra: defaultSafra() })
  const [filterB, setFilterB] = useState({ safra: defaultSafra() })
  const [selectedMetrics, setSelectedMetrics] = useState(DEFAULT_SELECTED_METRICS)
  const options = useFilterOptions()

  const equipamentosA = useEquipamentoOptions(filterA.cliente)
  const equipamentosB = useEquipamentoOptions(filterB.cliente)

  const { dataA, dataB, loading, error } = useEquipamentoComparativo(filterA, filterB)

  const aggA = useMemo(() => aggregateRows(dataA), [dataA])
  const aggB = useMemo(() => aggregateRows(dataB), [dataB])

  // Modelo de referência: pega o modelo do primeiro registro de A
  const modeloRef = dataA[0]?.modelo_equipamento || null
  const { data: benchmarkData } = useEquipamentoBenchmark({
    modelo_equipamento: modeloRef,
    processo: filterA.processo,
    tipo_safra: filterA.tipo_safra,
    safra: filterA.safra,
  })
  const benchmarkRow = benchmarkData[0] || null

  const toggleMetric = useCallback((key) => {
    setSelectedMetrics(prev => {
      if (prev.has(key) && prev.size <= 1) return prev
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  const activeConfig = ALL_METRICAS_CONFIG.filter(cfg => selectedMetrics.has(cfg.key))
  const primaryMetric = activeConfig[0]

  const labelA = filterA.cliente
    ? `${filterA.cliente}${filterA.equipamento_cod ? ` · ${filterA.equipamento_cod}` : ''}`
    : 'Equip. A'
  const labelB = filterB.cliente
    ? `${filterB.cliente}${filterB.equipamento_cod ? ` · ${filterB.equipamento_cod}` : ''}`
    : 'Equip. B'

  const hasData = aggA || aggB

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-pa-text">Benchmark de Equipamentos</h1>
        <p className="text-sm text-pa-muted mt-0.5">Compare dois equipamentos ou períodos, com referência da média do modelo</p>
      </div>

      {/* Seletores A vs B */}
      <div className="flex flex-wrap gap-4">
        <EquipSelector label="Equipamento A" filter={filterA} onChange={setFilterA} options={options} equipamentos={equipamentosA} />
        <div className="flex items-center justify-center px-2">
          <span className="text-pa-faint text-lg font-light">vs</span>
        </div>
        <EquipSelector label="Equipamento B" filter={filterB} onChange={setFilterB} options={options} equipamentos={equipamentosB} />
      </div>

      {/* Seleção de métricas */}
      <MetricSelector selected={selectedMetrics} onToggle={toggleMetric} />

      {error && <div className="text-pa-red text-sm">Erro: {error}</div>}

      {!hasData && !loading && (
        <div className="rounded-xl border border-pa-border bg-pa-surface p-10 text-center text-pa-muted text-sm">
          Selecione pelo menos um equipamento para começar
        </div>
      )}

      {hasData && (
        <div className="space-y-6">
          {/* Referência do modelo */}
          {modeloRef && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-pa-border bg-pa-surface-2">
              <span className="text-xs text-pa-muted">Referência do modelo:</span>
              <span className="text-xs font-semibold text-pa-amber">{modeloRef}</span>
              {benchmarkRow && <span className="text-xs text-pa-faint ml-2">· {benchmarkRow.processo} · {benchmarkRow.tipo_safra} · {benchmarkRow.safra}</span>}
            </div>
          )}

          {/* KPIs A vs B */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPICard label="Área — A" value={fmtHa(aggA?.area_ha)} />
            <KPICard label="Área — B" value={fmtHa(aggB?.area_ha)} />
            <KPICard label="Rend. Op. — A" value={fmtHah(aggA?.rendimento_operacional_hah)}
              ratioBenchmark={aggA && benchmarkRow ? { value: aggA.rendimento_operacional_hah, benchmark: benchmarkRow.rendimento_operacional_hah_modelo, higherIsBetter: true } : null}
            />
            <KPICard label="Rend. Op. — B" value={fmtHah(aggB?.rendimento_operacional_hah)}
              ratioBenchmark={aggB && benchmarkRow ? { value: aggB.rendimento_operacional_hah, benchmark: benchmarkRow.rendimento_operacional_hah_modelo, higherIsBetter: true } : null}
            />
          </div>

          {/* Tabela comparativa detalhada */}
          <div className="bg-pa-surface border border-pa-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-pa-text mb-4">Comparativo de Métricas</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-pa-border">
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-pa-muted uppercase tracking-wider">Métrica</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-pa-green uppercase tracking-wider">{labelA}</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-pa-amber uppercase tracking-wider">{labelB}</th>
                    {benchmarkRow && <th className="px-3 py-2.5 text-left text-xs font-semibold text-pa-muted uppercase tracking-wider">Modelo (ref.)</th>}
                  </tr>
                </thead>
                <tbody>
                  {activeConfig.map(m => {
                    const valA = aggA?.[m.key]
                    const valB = aggB?.[m.key]
                    const valMod = benchmarkRow?.[m.modeloKey]
                    const semA = valMod && m.higherIsBetter != null ? semaphoreRatio(valA, valMod, m.higherIsBetter !== false) : null
                    const semB = valMod && m.higherIsBetter != null ? semaphoreRatio(valB, valMod, m.higherIsBetter !== false) : null
                    return (
                      <tr key={m.key} className="border-b border-pa-border/50 hover:bg-pa-surface-2 transition-colors">
                        <td className="px-3 py-2.5 text-xs text-pa-muted">
                          {m.label}
                          <span className="ml-1.5 text-pa-faint" style={{ fontSize: 10 }}>({m.sub.split('·')[0].trim()})</span>
                        </td>
                        <td className={`px-3 py-2.5 tabular-nums font-medium ${semA?.cls || 'text-pa-green'}`}>
                          {valA != null ? m.fmtFn(valA) : '—'}
                        </td>
                        <td className={`px-3 py-2.5 tabular-nums font-medium ${semB?.cls || 'text-pa-amber'}`}>
                          {valB != null ? m.fmtFn(valB) : '—'}
                        </td>
                        {benchmarkRow && (
                          <td className="px-3 py-2.5 tabular-nums text-pa-faint">
                            {valMod != null ? m.fmtFn(valMod) : '—'}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gráfico de barras horizontal — métrica primária selecionada */}
          {primaryMetric && (
            <div className="bg-pa-surface border border-pa-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-pa-text mb-4">
                Comparativo Visual — {primaryMetric.label} ({primaryMetric.sub.split('·')[0].trim()})
              </h3>
              <HBarChart
                data={[
                  aggA && { label: labelA, value: aggA[primaryMetric.key], color: 'var(--pa-green)', benchmark: benchmarkRow?.[primaryMetric.modeloKey] },
                  aggB && { label: labelB, value: aggB[primaryMetric.key], color: 'var(--pa-amber)' },
                  benchmarkRow && { label: `Modelo: ${modeloRef}`, value: benchmarkRow[primaryMetric.modeloKey], color: 'var(--pa-faint)' },
                ].filter(Boolean)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
