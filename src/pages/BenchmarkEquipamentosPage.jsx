import { useState, useMemo } from 'react'
import { useEquipamentoComparativo, useEquipamentoBenchmark, useEquipamentoOptions, useFilterOptions } from '../hooks/useData'
import { KPICard, HBarChart, PageLoader, FetchingBar, semaphoreRatio } from '../components/UI'
import { aggregateRows, defaultSafra, fmtHah, fmtPct, fmtLh, fmtKmh, fmtHa, fmtH, fmt } from '../lib/utils'

const COMPARE_METRICAS = [
  { key: 'rendimento_operacional_hah', label: 'Rend. Operacional (ha/h)', fmtFn: fmtHah, modeloKey: 'rendimento_operacional_hah_modelo', higherIsBetter: true },
  { key: 'eficiencia_geral_pct',       label: 'Efic. Geral (%)',          fmtFn: fmtPct, modeloKey: 'eficiencia_geral_pct_modelo',       higherIsBetter: true },
  { key: 'disponibilidade_mecanica_pct', label: 'Disp. Mecânica (%)',     fmtFn: fmtPct, modeloKey: 'disponibilidade_mecanica_pct_modelo', higherIsBetter: true },
  { key: 'velocidade_media_kmh',       label: 'Velocidade Média (km/h)',  fmtFn: fmtKmh, modeloKey: 'velocidade_media_kmh_modelo' },
  { key: 'consumo_medio_lha',          label: 'Consumo Médio (l/ha)',     fmtFn: (v) => fmt(v, 1, ' l/ha'), modeloKey: 'consumo_medio_lha_modelo', higherIsBetter: false },
  { key: 'consumo_medio_lh',           label: 'Consumo Médio (l/h)',      fmtFn: fmtLh, modeloKey: 'consumo_medio_lh_modelo', higherIsBetter: false },
  { key: 'area_ha',                    label: 'Área Total (ha)',          fmtFn: fmtHa },
  { key: 'tempo_produtivo_h',          label: 'Tempo Efetivo (h)',        fmtFn: fmtH },
]

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
                  {COMPARE_METRICAS.map(m => {
                    const valA = aggA?.[m.key]
                    const valB = aggB?.[m.key]
                    const valMod = benchmarkRow?.[m.modeloKey]
                    const semA = valMod && m.higherIsBetter != null ? semaphoreRatio(valA, valMod, m.higherIsBetter !== false) : null
                    const semB = valMod && m.higherIsBetter != null ? semaphoreRatio(valB, valMod, m.higherIsBetter !== false) : null
                    return (
                      <tr key={m.key} className="border-b border-pa-border/50 hover:bg-pa-surface-2 transition-colors">
                        <td className="px-3 py-2.5 text-xs text-pa-muted">{m.label}</td>
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

          {/* Gráfico de barras horizontal comparativo */}
          <div className="bg-pa-surface border border-pa-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-pa-text mb-4">Comparativo Visual — Rendimento Operacional (ha/h)</h3>
            <HBarChart
              data={[
                aggA && { label: labelA, value: aggA.rendimento_operacional_hah, color: 'var(--pa-green)', benchmark: benchmarkRow?.rendimento_operacional_hah_modelo },
                aggB && { label: labelB, value: aggB.rendimento_operacional_hah, color: 'var(--pa-amber)' },
                benchmarkRow && { label: `Modelo: ${modeloRef}`, value: benchmarkRow.rendimento_operacional_hah_modelo, color: 'var(--pa-faint)' },
              ].filter(Boolean)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
