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
  { key: 'rendimento_operacional_hah',   label: 'Rendimento Operacional',       desc: 'ponderado por área trabalhada',                                unit: 'ha/h', fmtFn: fmtHah, higherIsBetter: true  },
  { key: 'eficiencia_geral_pct',         label: 'Eficiência Geral',             desc: 'tempo produtivo / tempo total com motor ligado',               unit: '%',    fmtFn: fmtPct, higherIsBetter: true  },
  { key: 'eficiencia_operacional_pct',   label: 'Eficiência Operacional',       desc: 'produtivo / (total − climático − manutenção − administrativo)', unit: '%',    fmtFn: fmtPct, higherIsBetter: true  },
  { key: 'consumo_medio_efetivo_lha',    label: 'Consumo Efetivo Médio',        desc: 'consumo apenas em estado produtivo',                           unit: 'L/ha', fmtFn: fmtLha, higherIsBetter: false },
  { key: 'disponibilidade_mecanica_pct', label: 'Disponibilidade Mecânica',     desc: 'excluindo paradas de manutenção',                              unit: '%',    fmtFn: fmtPct, higherIsBetter: true  },
  { key: 'velocidade_media_kmh',         label: 'Velocidade Média Operacional', desc: 'apenas em estado produtivo',                                   unit: 'km/h', fmtFn: fmtKmh, higherIsBetter: true  },
  { key: 'rpm_medio_trabalhando',        label: 'RPM Médio Trabalhando',        desc: 'rotações por minuto em estado produtivo',                      unit: 'rpm',  fmtFn: fmtRpm, higherIsBetter: true, neutro: true },
]

const STOP_GROUPS = [
  { key: 'MANUTENCAO',      label: 'Manutenção na máquina',        alertBad: true  },
  { key: 'GERENCIAL',       label: 'Parada gerencial / aguardando', alertBad: false },
  { key: 'SEM_APONTAMENTO', label: 'Sem apontamento',              alertBad: true  },
  { key: 'ADMINISTRATIVO',  label: 'Administrativo',               alertBad: false },
  { key: 'CLIMATICO',       label: 'Climático',                    alertBad: false },
]

// ─── FUNÇÕES DE AGREGAÇÃO ─────────────────────────────────────────────────────

// Agrega as 7 métricas dos termômetros a partir de linhas brutas de operational_records
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

// Distribui tempo de parada nas 5 categorias como % do total de parada
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

// Retorna um agregado por cliente para calcular min/max dos termômetros
function computeAllClienteAggs(rows) {
  return Object.values(groupBy(rows, 'cliente'))
    .map(computeAgg)
    .filter(a => a && a.rendimento_operacional_hah > 0)
}

// ─── COMPONENTES INTERNOS ─────────────────────────────────────────────────────

// Determina cor e badge do termômetro com base na posição relativa à média do grupo
function thermoStatus(value, avg, higherIsBetter, neutro) {
  if (neutro || !avg || value == null) return { barColor: '#9ca3af', badgeText: null, badgeFg: null, badgeBg: null }
  const ratio = value / avg
  if (Math.abs(ratio - 1) <= 0.10) return { barColor: '#c8960c', badgeText: 'Na média', badgeFg: '#7a5c00', badgeBg: '#fdf6e3' }
  const isAbove = higherIsBetter ? ratio > 1.10 : ratio < 0.90
  if (isAbove) return { barColor: '#2d4a2d', badgeText: 'Acima',  badgeFg: '#1e4d1e', badgeBg: '#edf5ed' }
  return           { barColor: '#8b2020', badgeText: 'Abaixo', badgeFg: '#8b2020', badgeBg: '#fdf0f0' }
}

// Renderiza uma linha de termômetro: chevron ▼ do cliente + três pontos (mín/média/máx) + badge
function ThermoRow({ label, desc, min, max, avg, value, fmtFn, higherIsBetter, neutro }) {
  if (value == null) return null
  const range  = max - min
  const clamp  = range > 0 ? (v) => Math.max(0, Math.min(100, ((v - min) / range) * 100)) : () => 50
  const pctVal = clamp(value)
  const pctAvg = avg != null ? clamp(avg) : null
  const { barColor, badgeText, badgeFg, badgeBg } = thermoStatus(value, avg, higherIsBetter, neutro)
  const f = (v) => fmtFn ? fmtFn(v) : v?.toFixed(2)

  return (
    <div style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid #e0dbd4', alignItems: 'center' }}>
      <div style={{ width: 180, flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: '#4a3728' }}>{label}</div>
        <div style={{ fontSize: 8, color: '#6b6560', marginTop: 2 }}>{desc}</div>
      </div>
      <div style={{ flex: 1 }}>
        {/* Área superior: label CLIENTE + valor + chevron apontando para baixo */}
        <div style={{ position: 'relative', height: 36 }}>
          <div style={{ position: 'absolute', left: `${pctVal}%`, transform: 'translateX(-50%)', bottom: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 7, fontWeight: 700, color: '#6b6560', letterSpacing: '0.04em' }}>CLIENTE</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: barColor }}>{f(value)}</div>
            <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `7px solid ${barColor}`, margin: '2px auto 0' }} />
          </div>
        </div>
        {/* Trilho com pontos coloridos: vermelho=mín, âmbar=média, verde=máx */}
        <div style={{ position: 'relative', height: 6, background: '#e0dbd4', borderRadius: 3 }}>
          <Dot left="0%"        bg="#8b2020" />
          {pctAvg != null && <Dot left={`${pctAvg}%`} bg="#c8960c" />}
          <Dot left="100%"      bg="#2d4a2d" />
        </div>
        {/* Rótulos abaixo: mín / média / máx */}
        <div style={{ position: 'relative', height: 20, marginTop: 4 }}>
          <span style={{ position: 'absolute', left: '0%',       transform: 'translateX(-50%)', fontSize: 8, color: '#6b6560',  whiteSpace: 'nowrap' }}>{f(min)}</span>
          {pctAvg != null && (
            <span style={{ position: 'absolute', left: `${pctAvg}%`, transform: 'translateX(-50%)', fontSize: 8, color: '#c8960c', whiteSpace: 'nowrap' }}>
              {f(avg)} <span style={{ fontSize: 7 }}>Média</span>
            </span>
          )}
          <span style={{ position: 'absolute', left: '100%',     transform: 'translateX(-50%)', fontSize: 8, color: '#6b6560',  whiteSpace: 'nowrap' }}>{f(max)}</span>
        </div>
      </div>
      <div style={{ width: 60, flexShrink: 0, textAlign: 'right' }}>
        {badgeText && (
          <span style={{ fontSize: 9, fontWeight: 600, color: badgeFg, padding: '2px 6px', borderRadius: 3, background: badgeBg, whiteSpace: 'nowrap' }}>
            {badgeText}
          </span>
        )}
      </div>
    </div>
  )
}

// Ponto circular no trilho (usado em ThermoRow)
function Dot({ left, bg }) {
  return (
    <div style={{ position: 'absolute', top: '50%', left, transform: 'translate(-50%, -50%)', width: 8, height: 8, borderRadius: '50%', background: bg, border: '1.5px solid #fff', zIndex: 1 }} />
  )
}

// Linha de comparação de parada: barras duplas com alerta quando delta > 10pp
function StopCompareRow({ label, clientePct, grupoPct, maxPct, alertBad }) {
  const delta    = clientePct - grupoPct
  const isAlert  = alertBad && delta > 10
  const cColor   = isAlert ? '#8b2020' : '#2d4a2d'
  const cW = maxPct > 0 ? (clientePct / maxPct) * 100 : 0
  const gW = maxPct > 0 ? (grupoPct  / maxPct) * 100 : 0
  return (
    <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid #e0dbd4' }}>
      <div style={{ width: 150, flexShrink: 0, fontSize: 10, fontWeight: 500, color: '#4a3728', alignSelf: 'center' }}>
        {isAlert && <span style={{ color: '#8b2020', marginRight: 4, fontSize: 9 }}>▲</span>}
        {label}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 7, color: '#6b6560', marginBottom: 3 }}>Cliente</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, height: 8, background: '#f0ede8', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${cW}%`, background: cColor, borderRadius: 4 }} />
          </div>
          <span style={{ fontSize: 9, fontWeight: isAlert ? 700 : 400, color: isAlert ? '#8b2020' : '#6b6560', width: 38, textAlign: 'right', flexShrink: 0 }}>
            {clientePct.toFixed(1)}%
          </span>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 7, color: '#6b6560', marginBottom: 3 }}>Média Porteira</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, height: 8, background: '#f0ede8', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${gW}%`, background: '#c8960c', borderRadius: 4 }} />
          </div>
          <span style={{ fontSize: 9, color: '#6b6560', width: 38, textAlign: 'right', flexShrink: 0 }}>
            {grupoPct.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── SEÇÕES ───────────────────────────────────────────────────────────────────

// Card branco com título de seção
function SectionCard({ title, children }) {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e0dbd4', borderRadius: 6, padding: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#4a3728', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

// Lista de termômetros com rodapé explicativo
function SectionThermo({ clienteAgg, allClienteAggs, groupAgg }) {
  if (!clienteAgg || allClienteAggs.length < 2) {
    return (
      <p style={{ fontSize: 13, color: '#6b6560', textAlign: 'center', padding: '24px 0', margin: 0 }}>
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
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '2px dashed #c8960c', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: '#c8960c', flexShrink: 0 }}>Média Porteira</span>
        <span style={{ fontSize: 8, color: '#6b6560' }}>
          Comparativo restrito a clientes com a mesma operação e cultura no mesmo período
        </span>
      </div>
    </div>
  )
}

// Barras duplas de parada: cliente vs média porteira, alerta quando delta > 10pp
function SectionStop({ clienteDist, grupoDist }) {
  if (!clienteDist || !grupoDist) {
    return (
      <p style={{ fontSize: 13, color: '#6b6560', textAlign: 'center', padding: '24px 0', margin: 0 }}>
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
            <span style={{ width: 10, height: 10, background: color, borderRadius: 2, flexShrink: 0, display: 'inline-block' }} />
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
          maxPct={maxPct}
          alertBad={g.alertBad}
        />
      ))}
    </div>
  )
}

// Estado vazio quando nenhum cliente único está selecionado
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

// Breadcrumb com os filtros ativos desta tela
function PageBreadcrumb({ cliente, operacao, cultura, safra }) {
  const items = [
    { label: 'Cliente',  value: cliente  || '—' },
    { label: 'Operação', value: operacao || 'Todas' },
    { label: 'Cultura',  value: cultura  || 'Todas' },
    { label: 'Período',  value: safra },
  ]
  return (
    <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 16 }}>
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
        <SectionCard title="MOTIVOS DE PARADA — CLIENTE VS. MÉDIA PORTEIRA (%)">
          <SectionStop clienteDist={stopCliente} grupoDist={stopGrupo} />
        </SectionCard>
      </div>
    </div>
  )
}
