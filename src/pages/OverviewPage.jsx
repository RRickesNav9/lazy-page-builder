import { useState, useMemo } from 'react'
import { useGrupoBenchmark, useOperationalData, useFilterOptions } from '../hooks/useData'
import { KPICard, DonutChart, HBarChart, FilterPanel, FilterButton, PageLoader, FetchingBar } from '../components/UI'
import {
  aggregateRows, calcTimeDistribution, groupBy, defaultSafra,
  fmtHah, fmtHa, fmtPct, fmtLh, fmtKmh, fmt
} from '../lib/utils'

const GRUPO_METRICAS = [
  { key: 'rendimento_operacional_hah_grupo', label: 'Rend. Operacional', fmt: fmtHah },
  { key: 'eficiencia_operacional_pct_grupo', label: 'Efic. Operacional',  fmt: fmtPct, pct: true },
  { key: 'eficiencia_geral_pct_grupo',       label: 'Efic. Geral',        fmt: fmtPct, pct: true },
  { key: 'disponibilidade_mecanica_pct_grupo', label: 'Disp. Mecânica',  fmt: fmtPct, pct: true },
  { key: 'velocidade_media_kmh_grupo',       label: 'Velocidade Média',   fmt: fmtKmh },
  { key: 'consumo_medio_lha_grupo',          label: 'Consumo (l/ha)',      fmt: (v) => fmt(v, 1, ' l/ha') },
]

export default function OverviewPage() {
  const [panelOpen, setPanelOpen] = useState(false)
  const [filters, setFilters] = useState({ safra: defaultSafra() })
  const options = useFilterOptions()

  const { data: grupoAll, loading: grupoLoading } = useGrupoBenchmark({ safra: filters.safra })

  const grupoFiltrado = useMemo(() => grupoAll.filter(g => {
    if (filters.processo && g.processo !== filters.processo) return false
    if (filters.tipo_safra && g.tipo_safra !== filters.tipo_safra) return false
    return true
  }), [grupoAll, filters.processo, filters.tipo_safra])

  const grupoHero = grupoFiltrado[0] || null

  const opFilters = useMemo(() => ({
    safra: filters.safra,
    processo: filters.processo,
    tipo_safra: filters.tipo_safra,
  }), [filters.safra, filters.processo, filters.tipo_safra])

  const { data, loading: opLoading, fetching } = useOperationalData(opFilters)

  const clienteRows = useMemo(() => {
    return Object.entries(groupBy(data, 'cliente'))
      .map(([cliente, rows]) => ({
        cliente,
        ...aggregateRows(rows),
        n_equip: new Set(rows.map(r => r.equipamento_cod || r.equipamento)).size,
      }))
      .filter(c => c.area_ha > 0)
      .sort((a, b) => b.rendimento_operacional_hah - a.rendimento_operacional_hah)
  }, [data])

  const timeDist = useMemo(() => calcTimeDistribution(data), [data])
  const agg = useMemo(() => aggregateRows(data), [data])

  if (opLoading || grupoLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-pa-text">Grupo Porteira Adentro</h1>
          <p className="text-sm text-pa-muted mt-0.5">
            Médias e comparativos do grupo · {filters.safra || 'Todas as safras'}
            {filters.processo && ` · ${filters.processo}`}
            {filters.tipo_safra && ` · ${filters.tipo_safra}`}
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
        hideFields={['cliente', 'modelo_equipamento', 'dates']}
      />

      {fetching && <FetchingBar />}

      {/* KPIs do grupo */}
      {grupoHero ? (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-semibold text-pa-muted uppercase tracking-wider">
              Médias do Grupo — {grupoHero.processo}{grupoHero.tipo_safra ? ` · ${grupoHero.tipo_safra}` : ''} · {grupoHero.safra}
            </span>
            <span className="text-xs text-pa-faint">{grupoHero.n_clientes} clientes · {grupoHero.dias_ativos_min} dias mín.</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {GRUPO_METRICAS.map(m => (
              <KPICard
                key={m.key}
                label={m.label}
                value={m.fmt(grupoHero[m.key])}
                pctValue={m.pct ? grupoHero[m.key] : undefined}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-pa-border bg-pa-surface p-8 text-center text-pa-muted text-sm">
          Nenhum dado de benchmark para os filtros selecionados
        </div>
      )}

      {/* Grid de todas as combinações quando não filtrado por processo */}
      {grupoFiltrado.length > 1 && (
        <div className="bg-pa-surface border border-pa-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-pa-text mb-4">Todas as Combinações — {filters.safra}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pa-border">
                  {['Processo', 'Cultura', 'Rend. Op.', 'Efic. Op.', 'Disp. Mec.', 'Velocidade', 'Consumo', 'Clientes'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-pa-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grupoFiltrado.map((g, i) => (
                  <tr key={i} className="border-b border-pa-border/50 hover:bg-pa-surface-2 transition-colors">
                    <td className="px-3 py-2.5 font-medium text-pa-text">{g.processo}</td>
                    <td className="px-3 py-2.5 text-pa-muted">{g.tipo_safra || '—'}</td>
                    <td className="px-3 py-2.5 tabular-nums text-pa-green font-bold">{fmtHah(g.rendimento_operacional_hah_grupo)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{fmtPct(g.eficiencia_operacional_pct_grupo)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{fmtPct(g.disponibilidade_mecanica_pct_grupo)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{fmtKmh(g.velocidade_media_kmh_grupo)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{fmt(g.consumo_medio_lha_grupo, 1, ' l/ha')}</td>
                    <td className="px-3 py-2.5 tabular-nums text-pa-muted">{g.n_clientes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Comparativo de clientes — dados operacionais */}
      <div className={`space-y-4 ${fetching ? 'data-fetching' : ''}`}>
        {data.length > 0 && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-pa-surface border border-pa-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-pa-text mb-4">Distribuição de Tempo</h3>
                <DonutChart
                  data={timeDist}
                  centerLabel={{ value: fmt(agg?.tempo_total_h, 0), label: 'horas' }}
                />
              </div>
              <div className="lg:col-span-2 bg-pa-surface border border-pa-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-pa-text mb-4">
                  Rendimento por Cliente (ha/h)
                  {grupoHero && <span className="ml-2 text-xs text-pa-faint font-normal">ref. porteira: {fmtHah(grupoHero.rendimento_operacional_hah_grupo)}</span>}
                </h3>
                <HBarChart
                  data={clienteRows.map(c => ({
                    label: c.cliente,
                    value: c.rendimento_operacional_hah,
                    benchmark: grupoHero?.rendimento_operacional_hah_grupo,
                    color: 'var(--pa-green)',
                  }))}
                />
              </div>
            </div>

            <div className="bg-pa-surface border border-pa-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-pa-text mb-4">Comparativo por Cliente</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-pa-border">
                      {['Cliente', 'Área (ha)', 'Rend. Op.', 'Efic. Geral', 'Disp. Mec.', 'Vel. (km/h)', 'Consumo (l/h)', 'Equip.'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-pa-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
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
                          <td className="px-3 py-2.5 tabular-nums text-pa-muted">{fmtHa(c.area_ha)}</td>
                          <td className="px-3 py-2.5 tabular-nums text-pa-green font-bold">{fmtHah(c.rendimento_operacional_hah)}</td>
                          <td className={`px-3 py-2.5 tabular-nums font-medium ${semEfic}`}>{fmtPct(c.eficiencia_geral_pct)}</td>
                          <td className={`px-3 py-2.5 tabular-nums font-medium ${semDisp}`}>{fmtPct(c.disponibilidade_mecanica_pct)}</td>
                          <td className="px-3 py-2.5 tabular-nums">{fmtKmh(c.velocidade_media_kmh)}</td>
                          <td className="px-3 py-2.5 tabular-nums">{fmtLh(c.consumo_medio_lh)}</td>
                          <td className="px-3 py-2.5 tabular-nums text-pa-muted">{c.n_equip}</td>
                        </tr>
                      )
                    })}
                    {!clienteRows.length && (
                      <tr><td colSpan={8} className="text-center py-8 text-pa-faint">Nenhum dado operacional para os filtros selecionados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
