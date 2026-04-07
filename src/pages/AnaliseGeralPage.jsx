import { useMemo } from 'react'
import { useFilters } from '../lib/FilterContext'
import { useOperationalData, useStopData, useGrupoBenchmark } from '../hooks/useData'
import {
  aggregateRows, groupBy, applyStopExclusions, calcTimeDistribution, calcStopDistribution,
  fmtHah, fmtHa, fmtKmh, fmtPct, fmtH, fmt,
} from '../lib/utils'

/* ── Status helpers ───────────────────────────────────────────────────────── */
function rendStatus(v, ref) {
  if (!ref) return 'neutral'
  const r = v / ref
  if (r >= 0.95) return 'ok'
  if (r >= 0.80) return 'warning'
  return 'critical'
}
function dispStatus(v) {
  if (v >= 95) return 'ok'
  if (v >= 70) return 'warning'
  return 'critical'
}
const STATUS_COLORS = {
  ok:       { bar: '#2d6a2d', bg: '#edf5ed', text: '#1e4d1e' },
  warning:  { bar: '#c8960c', bg: '#fdf6e3', text: '#7a5c00' },
  critical: { bar: '#8b2020', bg: '#fdf0f0', text: '#8b2020' },
  neutral:  { bar: '#4a6741', bg: '#f0ede8', text: '#1a1a1a' },
}
const PARADA_COLORS = {
  MANUTENCAO:      '#ef4444',
  CLIMATICO:       '#3b82f6',
  ADMINISTRATIVO:  '#f59e0b',
  GERENCIAL:       '#8b5cf6',
  SEM_APONTAMENTO: '#6b7280',
}

/* ── Small components ─────────────────────────────────────────────────────── */
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

function KPICard({ label, value, sub }) {
  return (
    <div style={{
      flex: '1 1 0', background: '#fff', border: '1px solid #e0dbd4',
      borderRadius: 6, padding: '16px 20px', minWidth: 140,
    }}>
      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b6560', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, color: '#1a1a1a' }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 11, color: '#6b6560', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function HBar({ label, value, maxVal, barColor, displayValue, refLine, refValue }) {
  const pct    = maxVal > 0 ? Math.min((value / maxVal) * 100, 100) : 0
  const refPct = refLine && refValue && maxVal > 0 ? Math.min((refValue / maxVal) * 100, 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
      <div style={{ width: 120, fontSize: 12, color: '#1a1a1a', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </div>
      <div style={{ flex: 1, position: 'relative', height: 10, background: '#f0ede8', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3 }} />
        {refLine && refPct > 0 && (
          <div style={{ position: 'absolute', top: -4, bottom: -4, left: `${refPct}%`, width: 0, borderLeft: '2px dashed #8b2020' }} />
        )}
      </div>
      <div style={{ width: 56, textAlign: 'right', fontSize: 12, fontWeight: 500, color: '#1a1a1a', flexShrink: 0 }}>
        {displayValue}
      </div>
    </div>
  )
}

function MiniPanel({ title, subtitle, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e0dbd4', borderRadius: 6, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#4a3728', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</div>
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
            <span style={{ fontSize: 11, color: '#fff', fontWeight: 500 }}>{s.pct.toFixed(0)}%</span>
          )}
        </div>
      ))}
    </div>
  )
}

/* ── Main Page ────────────────────────────────────────────────────────────── */
export default function AnaliseGeralPage() {
  const { filters, queryFilters, currentSafra } = useFilters()
  const { excludedMotivos, showBenchmark } = filters

  const { data: raw, loading } = useOperationalData(queryFilters)
  const { data: stopRows }     = useStopData(queryFilters)
  const { data: benchmarks }   = useGrupoBenchmark({
    safra:      currentSafra,
    processo:   queryFilters.processo,
    tipo_safra: queryFilters.tipo_safra,
  })

  // apply stop-time exclusions to all rows
  const data = useMemo(() => applyStopExclusions(raw, stopRows, excludedMotivos), [raw, stopRows, excludedMotivos])

  const agg      = useMemo(() => aggregateRows(data), [data])
  const timeDist = useMemo(() => calcTimeDistribution(data), [data])
  const stopDist = useMemo(() => calcStopDistribution(data), [data])

  const mainBenchmark = showBenchmark ? (benchmarks?.[0] ?? null) : null

  // per-equipment rows (sorted by area desc)
  const equipRows = useMemo(() => {
    return Object.entries(groupBy(data.filter(r => (parseFloat(r.area_ha) || 0) > 0), 'equipamento'))
      .map(([equip, rows]) => ({
        equip,
        cod:    rows[0]?.equipamento_cod ?? equip,
        modelo: rows[0]?.modelo_equipamento ?? '—',
        ...aggregateRows(rows),
      }))
      .sort((a, b) => b.area_ha - a.area_ha)
  }, [data])

  // per-model rows
  const modelRows = useMemo(() => {
    return Object.entries(
      groupBy(data.filter(r => (parseFloat(r.area_ha) || 0) > 0 && r.modelo_equipamento), 'modelo_equipamento')
    )
      .map(([modelo, rows]) => ({
        modelo,
        n_equip: new Set(rows.map(r => r.equipamento_cod || r.equipamento)).size,
        ...aggregateRows(rows),
      }))
      .sort((a, b) => b.rendimento_operacional_hah - a.rendimento_operacional_hah)
  }, [data])

  // operator distribution from raw time fields
  const operadorRows = useMemo(() => {
    const map = new Map()
    for (const r of data) {
      const nome = r.operador || 'Desconhecido'
      const acc  = map.get(nome) ?? { nome, trabalhando: 0, deslocamento: 0, manobra: 0, parada: 0 }
      acc.trabalhando  += parseFloat(r.tempo_produtivo_h)    || 0
      acc.deslocamento += parseFloat(r.tempo_deslocamento_h) || 0
      acc.manobra      += parseFloat(r.tempo_manobra_h)      || 0
      acc.parada       += parseFloat(r.tempo_parada_h)       || 0
      map.set(nome, acc)
    }
    return [...map.values()]
      .filter(o => (o.trabalhando + o.deslocamento + o.manobra + o.parada) > 0)
      .sort((a, b) => b.trabalhando - a.trabalhando)
      .slice(0, 8)
      .map(o => {
        const total = o.trabalhando + o.deslocamento + o.manobra + o.parada
        return {
          ...o,
          trabalhando_pct:  (o.trabalhando  / total) * 100,
          deslocamento_pct: (o.deslocamento / total) * 100,
          manobra_pct:      (o.manobra      / total) * 100,
          parada_pct:       (o.parada       / total) * 100,
        }
      })
  }, [data])

  if (loading) return (
    <div style={{ padding: 64, textAlign: 'center', color: '#6b6560' }}>Carregando...</div>
  )

  if (!agg) return (
    <div style={{ padding: 64, textAlign: 'center', color: '#6b6560' }}>
      Nenhum dado para os filtros selecionados.
    </div>
  )

  const maxArea = Math.max(...equipRows.map(e => e.area_ha), 1)
  const maxRend = Math.max(...equipRows.map(e => e.rendimento_operacional_hah), mainBenchmark?.rendimento_operacional_hah_grupo ?? 0, 0.1)
  const maxVel  = Math.max(...equipRows.map(e => e.velocidade_media_kmh), 0.1)
  const maxComb = Math.max(...equipRows.map(e => e.consumo_medio_lh), 0.1)
  const maxTempo = Math.max(...equipRows.map(e => e.tempo_produtivo_h), 0.1)

  const benchRendimento = mainBenchmark?.rendimento_operacional_hah_grupo ?? null

  return (
    <div style={{ padding: '24px', maxWidth: 1280, margin: '0 auto' }}>

      {/* Banner de exclusão ativa */}
      {excludedMotivos.length > 0 && (
        <div style={{
          background: '#fdf6e3', border: '1px solid #d97706', borderRadius: 6,
          padding: '8px 14px', marginBottom: 18, fontSize: 12, color: '#7a5c00',
        }}>
          {excludedMotivos.length} motivo(s) de parada excluídos dos totais: {excludedMotivos.join(', ')}
        </div>
      )}

      {/* BLOCO 1 — KPIs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        <KPICard label="Área Total" value={fmtHa(agg.area_ha)} />
        <KPICard
          label="Rendimento Médio"
          value={fmtHah(agg.rendimento_operacional_hah)}
          sub={benchRendimento ? `ref: ${fmtHah(benchRendimento)}` : undefined}
        />
        <KPICard label="Velocidade Média" value={fmtKmh(agg.velocidade_media_kmh)} />
        <KPICard label="Eficiência Geral" value={fmtPct(agg.eficiencia_geral_pct)} />
        <KPICard label="Tempo Efetivo" value={fmtH(agg.tempo_produtivo_h)} />
      </div>

      {/* BLOCO 2 — Desempenho por Equipamento */}
      {equipRows.length > 0 && (
        <>
          <SectionTitle>Desempenho por Equipamento</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>

            <MiniPanel title="Área Trabalhada (ha)">
              {equipRows.map(e => (
                <HBar key={e.equip} label={e.cod || e.equip} value={e.area_ha} maxVal={maxArea}
                  barColor="#2d4a2d" displayValue={fmtHa(e.area_ha)} />
              ))}
            </MiniPanel>

            <MiniPanel title="Rendimento Operacional (ha/h)"
              subtitle={benchRendimento ? `ref: ${fmtHah(benchRendimento)}` : undefined}>
              {equipRows.map(e => {
                const st = rendStatus(e.rendimento_operacional_hah, benchRendimento)
                return (
                  <HBar key={e.equip} label={e.cod || e.equip}
                    value={e.rendimento_operacional_hah} maxVal={maxRend}
                    barColor={STATUS_COLORS[st].bar}
                    displayValue={fmtHah(e.rendimento_operacional_hah)}
                    refLine={!!benchRendimento} refValue={benchRendimento} />
                )
              })}
            </MiniPanel>

            <MiniPanel title="Velocidade Média (km/h)">
              {equipRows.map(e => (
                <HBar key={e.equip} label={e.cod || e.equip} value={e.velocidade_media_kmh} maxVal={maxVel}
                  barColor="#4a6741" displayValue={fmtKmh(e.velocidade_media_kmh)} />
              ))}
            </MiniPanel>

            <MiniPanel title="Consumo Médio (l/h)"
              subtitle={`— Média: ${fmt(agg.consumo_medio_lh, 1, ' l/h')}`}>
              {equipRows.map(e => (
                <HBar key={e.equip} label={e.cod || e.equip} value={e.consumo_medio_lh} maxVal={maxComb}
                  barColor="#c8960c" displayValue={fmt(e.consumo_medio_lh, 1)} />
              ))}
            </MiniPanel>

            <MiniPanel title="Tempo Efetivo (h)">
              {equipRows.map(e => (
                <HBar key={e.equip} label={e.cod || e.equip} value={e.tempo_produtivo_h} maxVal={maxTempo}
                  barColor="#2d4a2d" displayValue={fmtH(e.tempo_produtivo_h)} />
              ))}
            </MiniPanel>

            <MiniPanel title="Disponibilidade Mecânica (%)">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {equipRows.map(e => {
                  const st = dispStatus(e.disponibilidade_mecanica_pct)
                  const sc = STATUS_COLORS[st]
                  return (
                    <div key={e.equip} style={{ background: sc.bg, borderRadius: 6, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#6b6560' }}>{e.cod || e.equip}</div>
                      <div style={{ fontSize: 20, fontWeight: 600, color: sc.text }}>{fmtPct(e.disponibilidade_mecanica_pct)}</div>
                    </div>
                  )
                })}
              </div>
            </MiniPanel>
          </div>
        </>
      )}

      {/* BLOCO 3 — Distribuição do Tempo + Motivos de Parada */}
      <SectionTitle>Eficiência e Disponibilidade Mecânica</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>

        {/* Distribuição do tempo por operador */}
        <div style={{ background: '#fff', border: '1px solid #e0dbd4', borderRadius: 6, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#4a3728', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
            Distribuição do Tempo
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Trabalhando',  color: '#2d4a2d' },
              { label: 'Deslocamento', color: '#c8960c' },
              { label: 'Manobra',      color: '#7a5c00' },
              { label: 'Parada',       color: '#8b2020' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, background: l.color, borderRadius: 2 }} />
                <span style={{ fontSize: 11, color: '#6b6560' }}>{l.label}</span>
              </div>
            ))}
          </div>
          {/* barra global */}
          <StackedBar
            segments={timeDist.map(d => ({ pct: d.pct, color: d.color }))}
            height={28}
          />
          {/* por operador */}
          <div style={{ marginTop: 12 }}>
            {operadorRows.map(op => (
              <div key={op.nome} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ width: 100, fontSize: 12, color: '#1a1a1a', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {op.nome}
                </div>
                <div style={{ flex: 1 }}>
                  <StackedBar segments={[
                    { pct: op.trabalhando_pct,  color: '#2d4a2d' },
                    { pct: op.deslocamento_pct, color: '#c8960c' },
                    { pct: op.manobra_pct,      color: '#7a5c00' },
                    { pct: op.parada_pct,        color: '#8b2020' },
                  ]} height={16} showLabels={false} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Motivos de parada */}
        <div style={{ background: '#fff', border: '1px solid #e0dbd4', borderRadius: 6, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#4a3728', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
            Motivos de Parada (%)
          </div>
          {stopDist.length === 0 ? (
            <div style={{ fontSize: 12, color: '#6b6560', padding: '12px 0' }}>Sem dados de parada.</div>
          ) : (
            stopDist.map(p => (
              <div key={p.label} style={{ display: 'flex', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                <div style={{ width: `${Math.min(p.pct, 100)}%`, maxWidth: 120, minWidth: 4, height: 8, background: p.color, borderRadius: 2 }} />
                <span style={{ fontSize: 12, color: '#1a1a1a', flex: 1 }}>{p.label}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a', flexShrink: 0 }}>{p.pct.toFixed(1)}%</span>
                <span style={{ fontSize: 11, color: '#6b6560', flexShrink: 0 }}>{p.value.toFixed(1)}h</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* BLOCO 4 — Tabela por Modelo */}
      {modelRows.length > 0 && (
        <>
          <SectionTitle>Comparativo por Modelo</SectionTitle>
          <div style={{ background: '#fff', border: '1px solid #e0dbd4', borderRadius: 6, marginBottom: 28, overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e0dbd4' }}>
                  {['Modelo', 'Equip.', 'Área (ha)', 'Rend. (ha/h)', 'Vel. (km/h)', 'Consumo (l/h)', 'Efic. Geral', 'Disp. Mec.'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b6560', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modelRows.map((m, i) => {
                  const rSt = rendStatus(m.rendimento_operacional_hah, benchRendimento)
                  const dSt = dispStatus(m.disponibilidade_mecanica_pct)
                  return (
                    <tr key={m.modelo} style={{ borderBottom: '1px solid #e0dbd4', background: i % 2 === 0 ? '#fff' : '#f9f7f5' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 500, color: '#1a1a1a' }}>{m.modelo}</td>
                      <td style={{ padding: '10px 14px', color: '#6b6560', textAlign: 'center' }}>{m.n_equip}</td>
                      <td style={{ padding: '10px 14px', color: '#6b6560' }}>{fmtHa(m.area_ha)}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: STATUS_COLORS[rSt].text }}>{fmtHah(m.rendimento_operacional_hah)}</td>
                      <td style={{ padding: '10px 14px' }}>{fmtKmh(m.velocidade_media_kmh)}</td>
                      <td style={{ padding: '10px 14px' }}>{fmt(m.consumo_medio_lh, 1, ' l/h')}</td>
                      <td style={{ padding: '10px 14px', color: STATUS_COLORS[rSt].text }}>{fmtPct(m.eficiencia_geral_pct)}</td>
                      <td style={{ padding: '10px 14px', color: STATUS_COLORS[dSt].text }}>{fmtPct(m.disponibilidade_mecanica_pct)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* RODAPÉ */}
      <div style={{
        background: '#f7f5f2', borderTop: '1px solid #e0dbd4', padding: '10px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        margin: '0 -24px -24px',
      }}>
        <span style={{ fontSize: 11, color: '#6b6560' }}>
          Relatório gerado automaticamente · Porteira Adentro Consultoria Agrícola
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#4a3728' }}>PORTEIRA ADENTRO</span>
      </div>
    </div>
  )
}
