import { useFilters } from '../lib/FilterContext'

/* ── Mock Data ────────────────────────────────────────────────────────────── */
const META_RENDIMENTO = 1.65

const MAQUINAS = [
  { cod: '31', modelo: 'JD S660', area: 7.65, rend: 1.70, vel: 2.30, comb: 29.98, tempo: 4.50 },
  { cod: '33', modelo: 'JD S760', area: 8.11, rend: 2.26, vel: 2.50, comb: 29.98, tempo: 3.58 },
  { cod: '34', modelo: 'JD S760', area: 10.84, rend: 2.10, vel: 2.31, comb: 31.77, tempo: 5.17 },
  { cod: '35', modelo: 'JD S760', area: 8.01, rend: 1.96, vel: 2.16, comb: 34.93, tempo: 4.09 },
  { cod: '36', modelo: 'JD S760', area: 12.49, rend: 2.19, vel: 2.42, comb: 28.61, tempo: 5.70 },
  { cod: '37', modelo: 'JD S760', area: 10.49, rend: 1.99, vel: 2.19, comb: 28.73, tempo: 5.26 },
]

const KPI = { area: 57.58, rend: 2.03, comb: 30.67, vel: 2.31, tempo: 28.36 }

const TEMPO_DIST = { trabalhando: 47, deslocamento: 39, manobra: 12, parada: 2 }

const OPERADORES = [
  { nome: 'Rafael B.', trabalhando: 52, deslocamento: 35, manobra: 10, parada: 3 },
  { nome: 'Rodrigo F.', trabalhando: 44, deslocamento: 42, manobra: 11, parada: 3 },
  { nome: 'Julio C.', trabalhando: 49, deslocamento: 37, manobra: 12, parada: 2 },
  { nome: 'Carlos A.', trabalhando: 43, deslocamento: 41, manobra: 14, parada: 2 },
  { nome: 'Marcio B.', trabalhando: 47, deslocamento: 40, manobra: 11, parada: 2 },
]

const DISPONIBILIDADE = [
  { cod: '31', pct: 58.2 },
  { cod: '33', pct: 93.4 },
  { cod: '34', pct: 98.8 },
  { cod: '35', pct: 100 },
  { cod: '36', pct: 89.5 },
  { cod: '37', pct: 100 },
]

const PARADAS = [
  { motivo: 'Manutenção na máquina', pct: 57.1, horas: 10, cor: '#8b2020' },
  { motivo: 'Aguardar graneleiro', pct: 18.2, horas: 5, cor: '#c8960c' },
  { motivo: 'Aguardar ordem', pct: 18.1, horas: 3, cor: '#c8960c' },
  { motivo: 'Sem apontamento', pct: 3.5, horas: 0.7, cor: '#6b6560' },
  { motivo: 'Refeição / descanso', pct: 1.8, horas: 0.2, cor: '#6b6560' },
]

/* ── Helpers ──────────────────────────────────────────────────────────────── */
const fmt = (v, d = 2) => v.toFixed(d).replace('.', ',')

function rendStatus(v) {
  if (v >= META_RENDIMENTO) return 'ok'
  if (v >= META_RENDIMENTO * 0.8) return 'warning'
  return 'critical'
}

function dispStatus(v) {
  if (v > 95) return 'ok'
  if (v >= 70) return 'warning'
  return 'critical'
}

const STATUS_COLORS = {
  ok: { bar: '#2d6a2d', bg: '#edf5ed', text: '#1e4d1e' },
  warning: { bar: '#c8960c', bg: '#fdf6e3', text: '#7a5c00' },
  critical: { bar: '#8b2020', bg: '#fdf0f0', text: '#8b2020' },
}

/* ── Components ───────────────────────────────────────────────────────────── */

function SectionTitle({ children }) {
  return (
    <h2 style={{
      fontSize: 13, fontWeight: 600, letterSpacing: '0.06em',
      textTransform: 'uppercase', color: '#4a3728', margin: '0 0 12px',
    }}>
      {children}
    </h2>
  )
}

function KPICard({ label, value }) {
  return (
    <div style={{
      flex: '1 1 0', background: '#fff', border: '1px solid #e0dbd4',
      borderRadius: 6, padding: '16px 20px', minWidth: 140,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 500, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: '#6b6560', marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, color: '#1a1a1a' }}>{value}</div>
    </div>
  )
}

function HBar({ label, value, maxVal, barColor, displayValue, metaLine, metaValue }) {
  const pct = maxVal > 0 ? (value / maxVal) * 100 : 0
  const metaPct = metaLine && metaValue && maxVal > 0 ? (metaValue / maxVal) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
      <div style={{ width: 120, fontSize: 13, color: '#1a1a1a', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </div>
      <div style={{ flex: 1, position: 'relative', height: 10, background: '#f0ede8', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: barColor, borderRadius: 3 }} />
        {metaLine && metaPct > 0 && metaPct <= 100 && (
          <div style={{
            position: 'absolute', top: -4, bottom: -4, left: `${metaPct}%`,
            width: 0, borderLeft: '2px dashed #8b2020',
          }} />
        )}
      </div>
      <div style={{ width: 50, textAlign: 'right', fontSize: 13, fontWeight: 500, color: '#1a1a1a', flexShrink: 0 }}>
        {displayValue}
      </div>
    </div>
  )
}

function MiniPanel({ title, subtitle, children }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e0dbd4', borderRadius: 6, padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#4a3728', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {title}
        </div>
        {subtitle && <span style={{ fontSize: 11, color: '#6b6560' }}>{subtitle}</span>}
      </div>
      {children}
    </div>
  )
}

function StackedBar({ segments, height = 28, showLabels = true }) {
  return (
    <div style={{ display: 'flex', height, borderRadius: 4, overflow: 'hidden', width: '100%' }}>
      {segments.map((s, i) => (
        <div key={i} style={{ width: `${s.pct}%`, background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {showLabels && s.pct >= 8 && (
            <span style={{ fontSize: 11, color: '#fff', fontWeight: 500 }}>{s.pct}%</span>
          )}
        </div>
      ))}
    </div>
  )
}

/* ── Main Page ────────────────────────────────────────────────────────────── */
export default function AnaliseGeralPage() {
  const { filters } = useFilters()
  const showBenchmark = filters.showBenchmark

  const maxArea = Math.max(...MAQUINAS.map(m => m.area))
  const maxRend = Math.max(...MAQUINAS.map(m => m.rend), META_RENDIMENTO + 0.3)
  const maxVel = Math.max(...MAQUINAS.map(m => m.vel))
  const maxComb = Math.max(...MAQUINAS.map(m => m.comb))
  const maxTempo = Math.max(...MAQUINAS.map(m => m.tempo))
  const avgComb = fmt(MAQUINAS.reduce((a, m) => a + m.comb, 0) / MAQUINAS.length, 1)

  const tempoSegments = [
    { pct: TEMPO_DIST.trabalhando, color: '#2d4a2d' },
    { pct: TEMPO_DIST.deslocamento, color: '#c8960c' },
    { pct: TEMPO_DIST.manobra, color: '#7a5c00' },
    { pct: TEMPO_DIST.parada, color: '#8b2020' },
  ]

  return (
    <div style={{ padding: '24px', maxWidth: 1280, margin: '0 auto' }}>
      {/* BLOCO 1 — KPIs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        <KPICard label="Área Total do Dia" value={`${fmt(KPI.area)} ha`} />
        <KPICard label="Rendimento Médio" value={`${fmt(KPI.rend)} ha/h`} />
        <KPICard label="Combustível Médio" value={`${fmt(KPI.comb)} L/ha`} />
        <KPICard label="Velocidade Média" value={`${fmt(KPI.vel)} km/h`} />
        <KPICard label="Tempo Efetivo Total" value={`${fmt(KPI.tempo)} h`} />
      </div>

      {/* BLOCO 2 — Desempenho por Máquina */}
      <SectionTitle>Desempenho por Máquina</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
        {/* Área */}
        <MiniPanel title="Área Trabalhada (ha)">
          {MAQUINAS.map(m => (
            <HBar key={m.cod} label={`${m.cod} · ${m.modelo}`} value={m.area} maxVal={maxArea}
              barColor="#2d4a2d" displayValue={fmt(m.area)} />
          ))}
        </MiniPanel>

        {/* Rendimento */}
        <MiniPanel title="Rendimento Operacional (ha/h)">
          {showBenchmark && (
            <div style={{ fontSize: 11, color: '#8b2020', marginBottom: 6 }}>
              ── Média porteira: {fmt(META_RENDIMENTO)} ha/h
            </div>
          )}
          {MAQUINAS.map(m => (
            <HBar key={m.cod} label={`${m.cod} · ${m.modelo}`} value={m.rend} maxVal={maxRend}
              barColor={STATUS_COLORS[rendStatus(m.rend)].bar} displayValue={fmt(m.rend)}
              metaLine={showBenchmark} metaValue={META_RENDIMENTO} />
          ))}
        </MiniPanel>

        {/* Velocidade */}
        <MiniPanel title="Velocidade Média (km/h)">
          {MAQUINAS.map(m => (
            <HBar key={m.cod} label={`${m.cod} · ${m.modelo}`} value={m.vel} maxVal={maxVel}
              barColor="#4a6741" displayValue={fmt(m.vel)} />
          ))}
        </MiniPanel>

        {/* Combustível */}
        <MiniPanel title="Combustível (L/ha)" subtitle={`— Média: ${avgComb}`}>
          {MAQUINAS.map(m => (
            <HBar key={m.cod} label={`${m.cod} · ${m.modelo}`} value={m.comb} maxVal={maxComb}
              barColor="#c8960c" displayValue={fmt(m.comb)} />
          ))}
        </MiniPanel>

        {/* Tempo Efetivo */}
        <MiniPanel title="Tempo Efetivo (h)">
          {MAQUINAS.map(m => (
            <HBar key={m.cod} label={`${m.cod} · ${m.modelo}`} value={m.tempo} maxVal={maxTempo}
              barColor="#2d4a2d" displayValue={fmt(m.tempo)} />
          ))}
        </MiniPanel>

        {/* Reservado */}
        <MiniPanel title="—">
          <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b6560', fontSize: 12 }}>
            Em breve
          </div>
        </MiniPanel>
      </div>

      {/* BLOCO 3 — Eficiência e Disponibilidade */}
      <SectionTitle>Eficiência e Disponibilidade Mecânica</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
        {/* Distribuição do Tempo */}
        <div style={{ background: '#fff', border: '1px solid #e0dbd4', borderRadius: 6, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#4a3728', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
            Distribuição do Tempo — Operador
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Trabalhando', color: '#2d4a2d' },
              { label: 'Deslocamento', color: '#c8960c' },
              { label: 'Manobra', color: '#7a5c00' },
              { label: 'Parada', color: '#8b2020' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, background: l.color, borderRadius: 2 }} />
                <span style={{ fontSize: 11, color: '#6b6560' }}>{l.label}</span>
              </div>
            ))}
          </div>
          {/* Global bar */}
          <StackedBar segments={tempoSegments} height={28} />
          {/* Per-operator */}
          <div style={{ marginTop: 12 }}>
            {OPERADORES.map(op => (
              <div key={op.nome} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ width: 100, fontSize: 12, color: '#1a1a1a', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {op.nome}
                </div>
                <div style={{ flex: 1 }}>
                  <StackedBar segments={[
                    { pct: op.trabalhando, color: '#2d4a2d' },
                    { pct: op.deslocamento, color: '#c8960c' },
                    { pct: op.manobra, color: '#7a5c00' },
                    { pct: op.parada, color: '#8b2020' },
                  ]} height={16} showLabels={false} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Disponibilidade Mecânica */}
          <div style={{ background: '#fff', border: '1px solid #e0dbd4', borderRadius: 6, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#4a3728', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              Disponibilidade Mecânica (%)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {DISPONIBILIDADE.map(d => {
                const st = dispStatus(d.pct)
                const sc = STATUS_COLORS[st]
                return (
                  <div key={d.cod} style={{
                    background: sc.bg, borderRadius: 6, padding: '10px 12px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 11, color: '#6b6560' }}>{d.cod}</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: sc.text }}>{fmt(d.pct, 1)}%</div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, color: '#6b6560' }}>
              <span><span style={{ color: '#8b2020' }}>■</span> Crítico (&lt;70%)</span>
              <span><span style={{ color: '#c8960c' }}>■</span> Atenção (70–95%)</span>
              <span><span style={{ color: '#1e4d1e' }}>■</span> Adequado (&gt;95%)</span>
            </div>
          </div>

          {/* Motivos de Parada */}
          <div style={{ background: '#fff', border: '1px solid #e0dbd4', borderRadius: 6, padding: '14px 16px', flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#4a3728', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              Motivos de Parada (%)
            </div>
            {PARADAS.map(p => (
              <div key={p.motivo} style={{ display: 'flex', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                <div style={{ width: `${p.pct}%`, maxWidth: 120, minWidth: 4, height: 8, background: p.cor, borderRadius: 2 }} />
                <span style={{ fontSize: 12, color: '#1a1a1a', flex: 1 }}>{p.motivo}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a', flexShrink: 0 }}>{fmt(p.pct, 1)}%</span>
                <span style={{ fontSize: 11, color: '#6b6560', flexShrink: 0 }}>{fmt(p.horas, 1)}h</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RODAPÉ */}
      <div style={{
        background: '#f7f5f2', borderTop: '1px solid #e0dbd4', padding: '10px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        margin: '0 -24px -24px', borderRadius: '0 0 0 0',
      }}>
        <span style={{ fontSize: 11, color: '#6b6560' }}>
          Relatório gerado automaticamente · Porteira Adentro Consultoria Agrícola
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#4a3728' }}>
          PORTEIRA ADENTRO
        </span>
      </div>
    </div>
  )
}
