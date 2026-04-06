// BenchmarkClientePage.jsx
// Compara métricas de um cliente específico contra a média do grupo Porteira
// na mesma operação e cultura. Usa o filtro global — cliente único obrigatório.

import { useMemo } from 'react'
import { useFilters } from '../lib/FilterContext'
import { useOperationalData } from '../hooks/useData'
import { FetchingBar, PageLoader } from '../components/UI'
import { groupBy, defaultSafra, fmt, fmtPct, fmtHah, fmtKmh } from '../lib/utils'

// ─── CONFIGURAÇÃO ─────────────────────────────────────────────────────────────

const fmtLha = (v) => fmt(v, 1, ' L/ha')
const fmtRpm = (v) => fmt(v, 0, ' rpm')

const THERMO_METRICAS = [
  { key: 'rendimento_operacional_hah',   label: 'Rendimento Operacional',    desc: 'ponderado por área trabalhada',                                       unit: 'ha/h', fmtFn: fmtHah,  higherIsBetter: true  },
  { key: 'eficiencia_geral_pct',         label: 'Eficiência Geral',          desc: 'tempo produtivo / tempo total motor ligado',                           unit: '%',    fmtFn: fmtPct,  higherIsBetter: true  },
  { key: 'eficiencia_operacional_pct',   label: 'Eficiência Operacional',    desc: 'produtivo / (total − climático − manutenção − administrativo)',        unit: '%',    fmtFn: fmtPct,  higherIsBetter: true  },
  { key: 'consumo_medio_efetivo_lha',    label: 'Consumo Efetivo Médio',     desc: 'consumo apenas em estado produtivo',                                   unit: 'L/ha', fmtFn: fmtLha,  higherIsBetter: false },
  { key: 'disponibilidade_mecanica_pct', label: 'Disponibilidade Mecânica',  desc: 'excluindo tempo de manutenção',                                        unit: '%',    fmtFn: fmtPct,  higherIsBetter: true  },
  { key: 'velocidade_media_kmh',         label: 'Velocidade Média Operacional', desc: 'apenas em estado produtivo',                                        unit: 'km/h', fmtFn: fmtKmh,  higherIsBetter: true  },
  { key: 'rpm_medio_trabalhando',        label: 'RPM Médio Trabalhando',     desc: 'rotações por minuto em estado produtivo',                              unit: 'rpm',  fmtFn: fmtRpm,  higherIsBetter: true, neutro: true },
]

const STOP_GROUPS = [
  { key: 'MANUTENCAO',      label: 'Manutenção na máquina',        color: '#8b2020', alertBad: true  },
  { key: 'GERENCIAL',       label: 'Parada gerencial / aguardando', color: '#c8960c', alertBad: false },
  { key: 'SEM_APONTAMENTO', label: 'Sem apontamento',              color: '#888780', alertBad: true  },
  { key: 'ADMINISTRATIVO',  label: 'Administrativo',               color: '#4a6741', alertBad: false },
  { key: 'CLIMATICO',       label: 'Climático',                    color: '#4a6741', alertBad: false },
]

// ─── FUNÇÕES DE AGREGAÇÃO ─────────────────────────────────────────────────────

// Agrega métricas dos 7 termômetros a partir de linhas brutas de operational_records
function computeAgg(rows) {
  if (!rows.length) return null
  const sum  = (k) => rows.reduce((a, r) => a + (parseFloat(r[k]) || 0), 0)
  const wavg = (vk, wk) => {
    const w = sum(wk)
    if (!w) return 0
    return rows.reduce((a, r) => a + (parseFloat(r[vk]) || 0) * (parseFloat(r[wk]) || 0), 0) / w
  }
  const area    = sum('area_ha')
  const prod    = sum('tempo_produtivo_h')
  const total   = sum('tempo_total_h')
  const manut   = sum('tempo_manutencao_h')
  const clim    = sum('tempo_parada_climatica_h')
  const adm     = sum('tempo_parada_administrativa_h')
  const efopDen = Math.max(total - manut - clim - adm, 0)
  const efetivo = sum('consumo_efetivo_l')
  return {
    rendimento_operacional_hah:   prod > 0 ? area / prod : 0,
    eficiencia_geral_pct:         wavg('eficiencia_geral_pct', 'tempo_total_h'),
    eficiencia_operacional_pct:   efopDen > 0 ? (prod / efopDen) * 100 : 0,
    consumo_medio_efetivo_lha:    area > 0 ? efetivo / area : 0,
    disponibilidade_mecanica_pct: wavg('disponibilidade_mecanica_pct', 'tempo_total_h'),
    velocidade_media_kmh:         wavg('velocidade_media_kmh', 'tempo_produtivo_h'),
    rpm_medio_trabalhando:        wavg('rpm_medio_trabalhando', 'tempo_produtivo_h'),
  }
}

// Distribui tempo de parada em 5 categorias como percentual do total de parada
function computeStopDist(rows) {
  const sum = (k) => rows.reduce((a, r) => a + (parseFloat(r[k]) || 0), 0)
  const totalParada    = sum('tempo_parada_h')
  if (!totalParada) return null
  const manutencao     = sum('tempo_manutencao_h')
  const climatica      = sum('tempo_parada_climatica_h')
  const administrativa = sum('tempo_parada_administrativa_h')
  const semApontamento = sum('tempo_parada_sem_apontamento_h')
  const gerencial      = Math.max(totalParada - manutencao - climatica - administrativa - semApontamento, 0)
  const pct = (v) => (v / totalParada) * 100
  return {
    MANUTENCAO:      pct(manutencao),
    GERENCIAL:       pct(gerencial),
    SEM_APONTAMENTO: pct(semApontamento),
    ADMINISTRATIVO:  pct(administrativa),
    CLIMATICO:       pct(climatica),
  }
}

// Gera um agregado por cliente para calcular min/max dos termômetros
function computeAllClienteAggs(rows) {
  return Object.values(groupBy(rows, 'cliente'))
    .map(computeAgg)
    .filter(a => a && a.rendimento_operacional_hah > 0)
}

// ─── COMPONENTES INTERNOS ─────────────────────────────────────────────────────

// Calcula cor e badge para uma métrica do termômetro em relação à média do grupo
function thermoStatus(value, avg, higherIsBetter, neutro) {
  if (neutro || !avg || !value) return { barColor: '#9ca3af', badgeText: null, badgeFg: null, badgeBg: null }
  const ratio = value / avg
  if (Math.abs(ratio - 1) <= 0.10) return { barColor: '#c8960c', badgeText: 'Na média', badgeFg: '#7a5c00', badgeBg: '#fdf6e3' }
  const isAbove = higherIsBetter ? ratio > 1.10 : ratio < 0.90
  if (isAbove) return { barColor: '#2d4a2d', badgeText: 'Acima',  badgeFg: '#1e4d1e', badgeBg: '#edf5ed' }
  return           { barColor: '#8b2020', badgeText: 'Abaixo', badgeFg: '#8b2020', badgeBg: '#fdf0f0' }
}

// Renderiza uma linha de termômetro com trilha, marcador do cliente e badge de status
function ThermoRow({ label, desc, min, max, avg, value, fmtFn, higherIsBetter, neutro }) {
  if (min == null || max == null || value == null) return null
  const range  = max - min
  const clamp  = range > 0 ? (v) => Math.max(0, Math.min(100, ((v - min) / range) * 100)) : () => 50
  const pctVal = clamp(value)
  const pctAvg = avg != null ? clamp(avg) : null
  const { barColor, badgeText, badgeFg, badgeBg } = thermoStatus(value, avg, higherIsBetter, neutro)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 0', borderBottom: '1px solid #e0dbd4' }}>
      <div style={{ width: 180, flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#4a3728' }}>{label}</div>
        <div style={{ fontSize: 8, color: '#6b6560', marginTop: 2 }}>{desc}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ position: 'relative', height: 28 }}>
          <div style={{ position: 'absolute', left: `${pctVal}%`, transform: 'translateX(-50%)', bottom: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 7, color: '#6b6560', whiteSpace: 'nowrap' }}>CLIENTE</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: barColor, whiteSpace: 'nowrap' }}>{fmtFn ? fmtFn(value) : value?.toFixed(2)}</div>
          </div>
        </div>
        <div style={{ position: 'relative', height: 6, background: '#e0dbd4', borderRadius: 3 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pctVal}%`, background: barColor, borderRadius: 3, opacity: 0.4 }} />
          {pctAvg != null && (
            <div style={{ position: 'absolute', top: '50%', left: `${pctAvg}%`, transform: 'translate(-50%, -50%)', width: 2, height: 12, background: '#c8960c', borderRadius: 1 }} />
          )}
          <div style={{ position: 'absolute', top: '50%', left: `${pctVal}%`, transform: 'translate(-50%, -50%)', width: 10, height: 10, borderRadius: '50%', background: barColor, border: '2px solid #fff' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 8, color: '#6b6560' }}>
          <span>Mín {fmtFn ? fmtFn(min) : min?.toFixed(2)}</span>
          {pctAvg != null && <span style={{ color: '#c8960c' }}>◆ Média {fmtFn ? fmtFn(avg) : avg?.toFixed(2)}</span>}
          <span>Máx {fmtFn ? fmtFn(max) : max?.toFixed(2)}</span>
        </div>
      </div>
      <div style={{ width: 60, flexShrink: 0, textAlign: 'right' }}>
        {badgeText && (
          <span style={{ fontSize: 10, fontWeight: 600, color: badgeFg, padding: '2px 6px', borderRadius: 3, background: badgeBg, whiteSpace: 'nowrap' }}>
            {badgeText}
          </span>
        )}
      </div>
    </div>
  )
}

// Renderiza uma linha de comparação de parada: cliente vs média porteira com barras duplas
function StopCompareRow({ label, clientePct, grupoPct, color, maxPct, alertBad }) {
  const isHighBad = alertBad && clientePct > grupoPct + 5
  const cW = maxPct > 0 ? (clientePct / maxPct) * 100 : 0
  const gW = maxPct > 0 ? (grupoPct  / maxPct) * 100 : 0
  return (
    <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid #e0dbd4' }}>
      <div style={{ width: 150, flexShrink: 0, fontSize: 10, fontWeight: 500, color: '#4a3728', alignSelf: 'center' }}>{label}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 7, color: '#6b6560', marginBottom: 3 }}>Cliente</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, height: 8, background: '#f0ede8', borderRadius: 4, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${cW}%`, background: color, borderRadius: 4 }} />
          </div>
          <span style={{ fontSize: 9, fontWeight: isHighBad ? 700 : 400, color: isHighBad ? '#8b2020' : '#6b6560', width: 36, textAlign: 'right', flexShrink: 0 }}>
            {clientePct.toFixed(1)}%
          </span>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 7, color: '#6b6560', marginBottom: 3 }}>Média Porteira</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, height: 8, background: '#f0ede8', borderRadius: 4, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${gW}%`, background: '#c8960c', borderRadius: 4 }} />
          </div>
          <span style={{ fontSize: 9, color: '#6b6560', width: 36, textAlign: 'right', flexShrink: 0 }}>
            {grupoPct.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── SEÇÕES ───────────────────────────────────────────────────────────────────

function SectionCard({ title, children }) {
  return (
    <div style={{ background: '#f7f5f2', border: '1px solid #e0dbd4', borderRadius: 12, padding: 20 }}>
      <h2 style={{ fontSize: 11, fontWeight: 600, color: '#4a3728', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, margin: '0 0 16px 0' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

// Renderiza os 7 termômetros de posicionamento com min/max/avg calculados em memória
function SectionThermo({ clienteAgg, allClienteAggs, groupAgg }) {
  if (!clienteAgg || allClienteAggs.length < 2) {
    return (
      <p style={{ textAlign: 'center', padding: '24px 0', color: '#6b6560', fontSize: 13 }}>
        Dados insuficientes para comparação (mínimo 2 clientes com dados na safra atual).
      </p>
    )
  }
  return (
    <div>
      {THERMO_METRICAS.map(m => {
        const vals = allClienteAggs.map(a => a[m.key]).filter(v => v != null && !isNaN(v) && v >= 0)
        if (!vals.length) return null
        return (
          <ThermoRow
            key={m.key}
            label={m.label}
            desc={m.desc}
            min={Math.min(...vals)}
            max={Math.max(...vals)}
            avg={groupAgg?.[m.key] ?? null}
            value={clienteAgg[m.key]}
            fmtFn={m.fmtFn}
            higherIsBetter={m.higherIsBetter}
            neutro={m.neutro}
          />
        )
      })}
      <div style={{ borderTop: '1px solid #e0dbd4', marginTop: 12, paddingTop: 8, fontSize: 8, fontStyle: 'italic', color: '#c8960c' }}>
        ◆ Média Porteira = média ponderada de todos os clientes na mesma operação e cultura · mesmo período de safra
      </div>
    </div>
  )
}

// Renderiza o comparativo de motivos de parada com barras duplas (cliente vs grupo)
function SectionStop({ clienteDist, grupoDist }) {
  if (!clienteDist || !grupoDist) {
    return (
      <p style={{ textAlign: 'center', padding: '24px 0', color: '#6b6560', fontSize: 13 }}>
        Sem dados de parada disponíveis para o período selecionado.
      </p>
    )
  }
  const allPcts = STOP_GROUPS.flatMap(g => [clienteDist[g.key] ?? 0, grupoDist[g.key] ?? 0])
  const maxPct  = Math.max(...allPcts, 1)
  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        {[{ color: '#2d4a2d', label: 'Este cliente' }, { color: '#c8960c', label: 'Média Porteira' }].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#6b6560' }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, background: color, borderRadius: 2 }} />
            {label}
          </div>
        ))}
      </div>
      {STOP_GROUPS.map(g => (
        <StopCompareRow
          key={g.key}
          label={g.label}
          clientePct={clienteDist[g.key] ?? 0}
          grupoPct={grupoDist[g.key] ?? 0}
          color={g.color}
          maxPct={maxPct}
          alertBad={g.alertBad}
        />
      ))}
    </div>
  )
}

// Exibe estado vazio quando nenhum cliente único está selecionado nos filtros
function EmptyState({ openDrawer }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: 16 }}>
      <p style={{ color: '#6b6560', fontSize: 13, textAlign: 'center', maxWidth: 340, margin: 0 }}>
        Selecione um cliente nos filtros para visualizar o benchmark.
      </p>
      <button
        onClick={openDrawer}
        style={{ padding: '8px 20px', background: '#2d4a2d', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
      >
        Abrir filtros
      </button>
    </div>
  )
}

// Exibe os filtros ativos desta tela em formato de breadcrumb
function PageBreadcrumb({ cliente, operacao, cultura, safra }) {
  const items = [
    { label: 'Cliente',   value: cliente || '—' },
    { label: 'Operação',  value: operacao || 'Todas' },
    { label: 'Cultura',   value: cultura  || 'Todas' },
    { label: 'Período',   value: safra },
  ]
  return (
    <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 16 }}>
      {items.map((item, i) => (
        <span key={item.label}>
          {i > 0 && <span style={{ color: '#6b6560', margin: '0 6px' }}>·</span>}
          <span style={{ color: '#6b6560' }}>{item.label}: </span>
          <span style={{ color: '#4a3728', fontWeight: 500 }}>{item.value}</span>
        </span>
      ))}
    </div>
  )
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

export default function BenchmarkClientePage() {
  const { filters, openDrawer } = useFilters()

  // cliente único é obrigatório — benchmark compara um contra o grupo
  const cliente  = (!filters.todosClientes  && filters.clientes.length  === 1) ? filters.clientes[0]  : null
  const operacao = (!filters.todasOperacoes && filters.operacoes.length  > 0)  ? filters.operacoes[0]  : null
  const cultura  = (!filters.todasCulturas  && filters.culturas.length   > 0)  ? filters.culturas[0]   : null
  const safra    = defaultSafra()

  const hookFilters = useMemo(
    () => ({ processo: operacao, tipo_safra: cultura, safra }),
    [operacao, cultura, safra]
  )
  const { data: allData, loading, fetching } = useOperationalData(hookFilters, !!cliente)

  const clienteData    = useMemo(() => allData.filter(r => r.cliente === cliente), [allData, cliente])
  const allClienteAggs = useMemo(() => computeAllClienteAggs(allData), [allData])
  const clienteAgg     = useMemo(() => computeAgg(clienteData), [clienteData])
  const groupAgg       = useMemo(() => computeAgg(allData), [allData])
  const stopCliente    = useMemo(() => computeStopDist(clienteData), [clienteData])
  const stopGrupo      = useMemo(() => computeStopDist(allData), [allData])

  if (!cliente) return <EmptyState openDrawer={openDrawer} />
  if (loading)  return <PageLoader />

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 24px' }}>
      <PageBreadcrumb cliente={cliente} operacao={operacao} cultura={cultura} safra={safra} />
      {fetching && <FetchingBar />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <SectionCard title="POSICIONAMENTO NO GRUPO PORTEIRA — MÉTRICAS COMPARÁVEIS">
          <SectionThermo clienteAgg={clienteAgg} allClienteAggs={allClienteAggs} groupAgg={groupAgg} />
        </SectionCard>
        <SectionCard title="MOTIVOS DE PARADA — ESTE CLIENTE VS. MÉDIA PORTEIRA (%)">
          <SectionStop clienteDist={stopCliente} grupoDist={stopGrupo} />
        </SectionCard>
      </div>
    </div>
  )
}
