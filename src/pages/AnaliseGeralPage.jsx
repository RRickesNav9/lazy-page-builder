import { useMemo, useState, useRef, useEffect } from 'react'
import { useFilters } from '../lib/FilterContext'
import { useOperationalData, useStopData, useGrupoBenchmark } from '../hooks/useData'
import {
  aggregateRows, groupBy, applyStopExclusions, calcTimeDistribution, calcStopDistribution,
  fmtHah, fmtHa, fmtKmh, fmtPct, fmtH, fmt,
} from '../lib/utils'

/* ── Filtro de métrica — labels para o banner ────────────────────────────── */

const METRIC_FILTER_LABELS = {
  rendimento_operacional_hah: 'Rendimento Op. (ha/h)',
  eficiencia_geral_pct:       'Eficiência Geral (%)',
  eficiencia_operacional_pct: 'Eficiência Op. (%)',
  velocidade_media_kmh:       'Velocidade (km/h)',
  consumo_medio_efetivo_lha:  'Consumo Ef. (l/ha)',
  consumo_medio_lh:           'Consumo Médio (l/h)',
  disponibilidade_mecanica_pct: 'Disponibilidade (%)',
  area_ha:                    'Área (ha)',
}

/* ── Constantes da Tabela de Dimensões ────────────────────────────────────── */

const DIMS = [
  { key: 'cliente',            label: 'Cliente' },
  { key: 'processo',           label: 'Processo' },
  { key: 'tipo_safra',         label: 'Cultura' },
  { key: 'equipamento',        label: 'Equipamento' },
  { key: 'modelo_equipamento', label: 'Modelo' },
  { key: 'propriedade',        label: 'Propriedade' },
  { key: 'operador',           label: 'Operador' },
]

const FIXED_METRICS = [
  { key: 'area_ha',                   label: 'Área (ha)',          fmt: fmtHa },
  { key: 'tempo_efetivo_h',            label: 'T. Efetivo (h)',     fmt: fmtH },
  { key: 'rendimento_operacional_hah', label: 'Rend. Op. (ha/h)',  fmt: fmtHah },
  { key: 'consumo_medio_efetivo_lha', label: 'Cons. Ef. (l/ha)',   fmt: v => fmt(v, 1, ' l/ha') },
]

const SELECTABLE_METRICS = [
  { key: 'velocidade_media_kmh',         label: 'Velocidade (km/h)',   fmt: fmtKmh },
  { key: 'eficiencia_geral_pct',         label: 'Efic. Geral (%)',     fmt: fmtPct },
  { key: 'disponibilidade_mecanica_pct', label: 'Disponib. (%)',       fmt: fmtPct },
  { key: 'consumo_medio_lh',             label: 'Cons. Médio (l/h)',   fmt: v => fmt(v, 1, ' l/h') },
  { key: 'rendimento_real_hah',          label: 'Rend. Real (ha/h)',   fmt: fmtHah },
  { key: 'tempo_total_h',               label: 'T. Total (h)',        fmt: fmtH },
  { key: 'tempo_parada_h',              label: 'T. Parada (h)',       fmt: fmtH },
  { key: 'eficiencia_operacional_pct',  label: 'Efic. Op. (%)',       fmt: fmtPct },
  { key: 'area_por_linha_ha',           label: 'Área/linha (ha)',     fmt: v => fmt(v, 4, ' ha') },
]

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function equipLabel(row) {
  if (row.equipamento_cod && row.equipamento) return `${row.equipamento_cod} - ${row.equipamento}`
  return row.equipamento || row.equipamento_cod || '—'
}

function getGroupKey(row, dim) {
  if (dim === 'equipamento') return equipLabel(row)
  return row[dim] || '—'
}

function buildGroups(rows, dims, level = 0) {
  if (!dims.length || !rows.length) return []
  const dim = dims[0]
  const map = new Map()
  for (const r of rows) {
    const k = getGroupKey(r, dim)
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(r)
  }
  return [...map.entries()]
    .map(([key, children]) => ({
      key, dim, level,
      agg: aggregateRows(children),
      children: dims.length > 1 ? buildGroups(children, dims.slice(1), level + 1) : [],
    }))
    .sort((a, b) => (b.agg?.area_ha ?? 0) - (a.agg?.area_ha ?? 0))
}

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

/* ── Componentes visuais compartilhados ───────────────────────────────────── */

function SectionTitle({ children }) {
  return (
    <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#4a3728', margin: '0 0 12px' }}>
      {children}
    </h2>
  )
}

function KPICard({ label, value, sub }) {
  return (
    <div style={{ flex: '1 1 0', background: '#fff', border: '1px solid #e0dbd4', borderRadius: 6, padding: '16px 20px', minWidth: 140 }}>
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
      <div style={{ width: 56, textAlign: 'right', fontSize: 12, fontWeight: 500, color: '#1a1a1a', flexShrink: 0 }}>{displayValue}</div>
    </div>
  )
}

function MiniPanel({ title, subtitle, children, footer }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e0dbd4', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#2d5016', padding: '10px 16px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</div>
        {subtitle && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{subtitle}</span>}
      </div>
      <div style={{ flex: 1, padding: '12px 16px' }}>{children}</div>
      {footer && <div style={{ padding: '0 16px 12px' }}>{footer}</div>}
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

function ShowMoreBtn({ current, total, onMore, onLess }) {
  const remaining = total - current
  const canLess   = current > 6
  if (remaining <= 0 && !canLess) return null
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
      {remaining > 0 && (
        <button onClick={onMore} style={{
          flex: 1, padding: '6px 0', border: '1px dashed #d4cfc9', borderRadius: 4,
          background: 'transparent', color: '#6b6560', fontSize: 12, cursor: 'pointer',
        }}>
          + {Math.min(6, remaining)} de {remaining} restantes
        </button>
      )}
      {canLess && (
        <button onClick={onLess} style={{
          padding: '6px 12px', border: '1px dashed #d4cfc9', borderRadius: 4,
          background: 'transparent', color: '#6b6560', fontSize: 12, cursor: 'pointer',
        }}>
          −
        </button>
      )}
    </div>
  )
}

/* ── Motivos de Parada ────────────────────────────────────────────────────── */

function MotivosParadaPanel({ stopRows }) {
  const [visible, setVisible] = useState(6)

  const motivoRows = useMemo(() => {
    if (!stopRows.length) return []
    const map = new Map()
    for (const s of stopRows) {
      const motivo = s.motivo_de_parada || 'Sem apontamento'
      const h = parseFloat(s.tempo_parado_h) || 0
      map.set(motivo, (map.get(motivo) ?? 0) + h)
    }
    const totalH = [...map.values()].reduce((a, v) => a + v, 0)
    if (!totalH) return []
    return [...map.entries()]
      .map(([motivo, h]) => ({ motivo, h, pct: (h / totalH) * 100 }))
      .sort((a, b) => b.h - a.h)
  }, [stopRows])

  // reset ao mudar dados
  useEffect(() => { setVisible(6) }, [stopRows])

  const shown     = motivoRows.slice(0, visible)
  const remaining = motivoRows.length - visible
  const canReduce = visible > 6

  return (
    <div style={{ background: '#fff', border: '1px solid #e0dbd4', borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ background: '#2d5016', padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Motivos de Parada
      </div>
      <div style={{ padding: '12px 16px' }}>
      {motivoRows.length === 0 ? (
        <div style={{ fontSize: 12, color: '#6b6560', padding: '12px 0' }}>Sem dados de parada.</div>
      ) : (
        <>
          {shown.map(p => (
            <div key={p.motivo} style={{ display: 'flex', alignItems: 'center', marginBottom: 7, gap: 8 }}>
              <div style={{ width: 80, flexShrink: 0 }}>
                <div style={{ height: 8, borderRadius: 3, background: '#f0ede8' }}>
                  <div style={{ height: '100%', width: `${Math.min(p.pct, 100)}%`, background: '#8b2020', borderRadius: 3 }} />
                </div>
              </div>
              <span style={{ flex: 1, fontSize: 12, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.motivo}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#8b2020', flexShrink: 0 }}>
                {p.pct.toFixed(1)}%
              </span>
              <span style={{ fontSize: 11, color: '#6b6560', flexShrink: 0, minWidth: 36, textAlign: 'right' }}>
                {fmtH(p.h)}
              </span>
            </div>
          ))}
          {/* Controles de paginação */}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            {remaining > 0 && (
              <button onClick={() => setVisible(v => v + 6)} style={{
                flex: 1, padding: '5px 0', border: '1px dashed #d4cfc9', borderRadius: 4,
                background: 'transparent', color: '#6b6560', fontSize: 12, cursor: 'pointer',
              }}>
                + {Math.min(5, remaining)} de {remaining} restantes
              </button>
            )}
            {canReduce && (
              <button onClick={() => setVisible(v => Math.max(6, v - 6))} style={{
                padding: '5px 10px', border: '1px dashed #d4cfc9', borderRadius: 4,
                background: 'transparent', color: '#6b6560', fontSize: 12, cursor: 'pointer',
              }}>
                −
              </button>
            )}
          </div>
        </>
      )}
      </div>
    </div>
  )
}

/* ── Tabela de Dimensões ─────────────────────────────────────────────────── */

function GroupRow({ node, path, expanded, onToggle, cols }) {
  const isExpanded  = expanded.has(path)
  const hasChildren = node.children.length > 0
  const indent      = 12 + node.level * 20

  return (
    <>
      <tr style={{ borderBottom: '1px solid #f0ede8', background: node.level % 2 === 0 ? '#fff' : '#f9f7f5' }}>
        <td style={{ padding: `8px 12px 8px ${indent}px`, whiteSpace: 'nowrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {hasChildren ? (
              <button
                onClick={() => onToggle(path)}
                style={{
                  width: 18, height: 18, borderRadius: 3,
                  border: '1px solid #d4cfc9', background: '#fff',
                  cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  color: '#2d4a2d',
                }}
              >
                {isExpanded ? '−' : '+'}
              </button>
            ) : (
              <span style={{ display: 'inline-block', width: 18, flexShrink: 0 }} />
            )}
            <span style={{ fontSize: 13, color: node.level === 0 ? '#1a1a1a' : '#4a3728', fontWeight: node.level === 0 ? 500 : 400 }}>
              {node.key}
            </span>
          </div>
        </td>
        {cols.map(col => (
          <td key={col.key} style={{ padding: '8px 14px', textAlign: 'right', fontSize: 13, color: '#1a1a1a', whiteSpace: 'nowrap' }}>
            {node.agg ? col.fmt(node.agg[col.key] ?? 0) : '—'}
          </td>
        ))}
      </tr>
      {isExpanded && node.children.map((child, i) => (
        <GroupRow
          key={`${path}/${child.key}/${i}`}
          node={child}
          path={`${path}/${child.key}`}
          expanded={expanded}
          onToggle={onToggle}
          cols={cols}
        />
      ))}

    </>
  )
}

// Métricas que possuem referência de grupo (taxas — não somas)
const AVG_GROUP_KEYS = new Set([
  'rendimento_operacional_hah', 'consumo_medio_efetivo_lha',
  'velocidade_media_kmh', 'eficiencia_geral_pct',
  'disponibilidade_mecanica_pct', 'consumo_medio_lh',
  'rendimento_real_hah', 'eficiencia_operacional_pct',
])

function DimensionTable({ data, grupoRow, showGroupAvg }) {
  const [activeDims,    setActiveDims]    = useState(['cliente', 'processo'])
  const [metricCols,    setMetricCols]    = useState(['velocidade_media_kmh', 'eficiencia_geral_pct'])
  const [expanded,      setExpanded]      = useState(new Set())
  const [dimDropOpen,   setDimDropOpen]   = useState(false)
  const [metDropOpen,   setMetDropOpen]   = useState(false)
  const dimRef = useRef(null)
  const metRef = useRef(null)

  // fechar dropdowns ao clicar fora
  useEffect(() => {
    function handle(e) {
      if (dimDropOpen && dimRef.current && !dimRef.current.contains(e.target)) setDimDropOpen(false)
      if (metDropOpen && metRef.current && !metRef.current.contains(e.target)) setMetDropOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [dimDropOpen, metDropOpen])

  function toggleExpand(path) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(path) ? next.delete(path) : next.add(path)
      return next
    })
  }

  function handleDimClick(key, ctrlKey) {
    setActiveDims(prev => {
      if (ctrlKey) {
        // toggle: remove se presente, adiciona ao final se ausente — preserva ordem de clique
        return prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]
      }
      return [key]
    })
    setExpanded(new Set())
  }

  function moveDim(key, dir) {
    setActiveDims(prev => {
      const idx = prev.indexOf(key)
      const swap = idx + dir
      if (idx === -1 || swap < 0 || swap >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[swap]] = [next[swap], next[idx]]
      return next
    })
    setExpanded(new Set())
  }

  function toggleMetric(key) {
    setMetricCols(prev => {
      if (prev.includes(key)) return prev.filter(m => m !== key)
      return [...prev, key]
    })
  }

  const groups = useMemo(() => buildGroups(data, activeDims), [data, activeDims])

  const activeCols = [
    ...FIXED_METRICS,
    ...SELECTABLE_METRICS.filter(m => metricCols.includes(m.key)),
  ]


  const dimLabel = activeDims.map(k => DIMS.find(d => d.key === k)?.label ?? k).join(' + ')
  const metLabel = metricCols.length
    ? metricCols.map(k => SELECTABLE_METRICS.find(m => m.key === k)?.label ?? k).join(', ')
    : 'Selecionar'

  return (
    <div>
      {/* Controles */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Seletor de dimensões */}
        <div ref={dimRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDimDropOpen(o => !o)}
            style={{
              padding: '6px 12px', border: '1px solid #d4cfc9', borderRadius: 6,
              background: '#fff', fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, color: '#1a1a1a',
            }}
          >
            <span style={{ fontSize: 11, color: '#6b6560' }}>Agrupar por:</span>
            <strong>{dimLabel}</strong>
            <span style={{ fontSize: 10, color: '#6b6560' }}>{dimDropOpen ? '▲' : '▼'}</span>
          </button>
          {dimDropOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200,
              background: '#fff', border: '1px solid #d4cfc9', borderRadius: 6,
              minWidth: 180, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              padding: '4px 0',
            }}>
              <div style={{ padding: '4px 12px 6px', fontSize: 10, color: '#6b6560' }}>
                Ctrl+clique para múltiplas · use ↑↓ para reordenar
              </div>
              {DIMS.map(d => {
                const idx = activeDims.indexOf(d.key)
                const isActive = idx !== -1
                return (
                  <div
                    key={d.key}
                    onClick={e => { handleDimClick(d.key, e.ctrlKey); if (!e.ctrlKey) setDimDropOpen(false) }}
                    style={{
                      padding: '7px 14px', fontSize: 13, cursor: 'pointer',
                      background: isActive ? '#edf5ed' : 'transparent',
                      color: isActive ? '#1e4d1e' : '#1a1a1a',
                      fontWeight: isActive ? 600 : 400,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
                    }}
                  >
                    <span style={{ flex: 1 }}>{d.label}</span>
                    {isActive && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <span style={{ fontSize: 10, color: '#6b6560', marginRight: 4 }}>#{idx + 1}</span>
                        <button
                          onClick={e => { e.stopPropagation(); moveDim(d.key, -1) }}
                          disabled={idx === 0}
                          style={{ border: 'none', background: 'none', cursor: idx === 0 ? 'default' : 'pointer', fontSize: 11, color: idx === 0 ? '#c0bab4' : '#4a3728', padding: '0 2px', lineHeight: 1 }}
                        >↑</button>
                        <button
                          onClick={e => { e.stopPropagation(); moveDim(d.key, 1) }}
                          disabled={idx === activeDims.length - 1}
                          style={{ border: 'none', background: 'none', cursor: idx === activeDims.length - 1 ? 'default' : 'pointer', fontSize: 11, color: idx === activeDims.length - 1 ? '#c0bab4' : '#4a3728', padding: '0 2px', lineHeight: 1 }}
                        >↓</button>
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Seletor de métricas adicionais */}
        <div ref={metRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMetDropOpen(o => !o)}
            style={{
              padding: '6px 12px', border: '1px solid #d4cfc9', borderRadius: 6,
              background: '#fff', fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, color: '#1a1a1a',
            }}
          >
            <span style={{ fontSize: 11, color: '#6b6560' }}>Métricas extras:</span>
            <strong>{metLabel}</strong>
            <span style={{ fontSize: 10, color: '#6b6560' }}>{metDropOpen ? '▲' : '▼'}</span>
          </button>
          {metDropOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200,
              background: '#fff', border: '1px solid #d4cfc9', borderRadius: 6,
              minWidth: 220, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              padding: '4px 0',
            }}>
              <div style={{ padding: '4px 12px 6px', fontSize: 10, color: '#6b6560' }}>
                Selecione as métricas desejadas
              </div>
              {SELECTABLE_METRICS.map(m => (
                <div
                  key={m.key}
                  onClick={() => toggleMetric(m.key)}
                  style={{
                    padding: '7px 14px', fontSize: 13, cursor: 'pointer',
                    background: metricCols.includes(m.key) ? '#edf5ed' : 'transparent',
                    color: metricCols.includes(m.key) ? '#1e4d1e' : '#1a1a1a',
                    fontWeight: metricCols.includes(m.key) ? 600 : 400,
                  }}
                >
                  {m.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div style={{ background: '#fff', border: '1px solid #e0dbd4', borderRadius: 6, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e0dbd4', background: '#f7f5f2' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b6560', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {dimLabel}
              </th>
              {activeCols.map(col => (
                <th key={col.key} style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#6b6560', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Linha "Média do grupo" — visível só quando toggle ativo e benchmark disponível */}
            {showGroupAvg && grupoRow && (
              <tr style={{ borderBottom: '1px dashed #b8d4b8', background: '#f0f7ee' }}>
                <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: 11, color: '#4a6741', fontStyle: 'italic', fontWeight: 500 }}>
                    Média do grupo
                  </span>
                </td>
                {activeCols.map(col => (
                  <td key={col.key} style={{ padding: '7px 14px', textAlign: 'right', fontSize: 11, color: '#4a6741', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                    {AVG_GROUP_KEYS.has(col.key) && grupoRow[col.key + '_grupo'] != null
                      ? col.fmt(grupoRow[col.key + '_grupo'])
                      : '—'}
                  </td>
                ))}
              </tr>
            )}
            {groups.length === 0 ? (
              <tr><td colSpan={activeCols.length + 1} style={{ padding: 24, textAlign: 'center', color: '#6b6560', fontSize: 13 }}>Sem dados.</td></tr>
            ) : (
              groups.map((node, i) => (
                <GroupRow
                  key={`${node.key}/${i}`}
                  node={node}
                  path={node.key}
                  expanded={expanded}
                  onToggle={toggleExpand}
                  cols={activeCols}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Página principal ─────────────────────────────────────────────────────── */

export default function AnaliseGeralPage() {
  const { filters, queryFilters, currentSafra } = useFilters()
  const { excludedMotivos, metricFilter, showGroupAvg } = filters

  const { data: raw, loading } = useOperationalData(queryFilters)
  const { data: stopRows }     = useStopData(queryFilters)
  const { data: benchmarks }   = useGrupoBenchmark({
    safra:      currentSafra,
    processo:   queryFilters.processo,
    tipo_safra: queryFilters.tipo_safra,
  })

  const data = useMemo(() => applyStopExclusions(raw, stopRows, excludedMotivos), [raw, stopRows, excludedMotivos])

  // Filtro de métrica: mantém apenas sessões de equipamentos cuja média agregada passa o limiar
  const filteredData = useMemo(() => {
    const { field, operator, value } = metricFilter ?? {}
    if (!field || value === '' || value == null) return data
    const num = parseFloat(value)
    if (isNaN(num)) return data
    const byEquip = new Map()
    for (const r of data) {
      if ((parseFloat(r.area_ha) || 0) <= 0) continue
      const lbl = equipLabel(r)
      if (!byEquip.has(lbl)) byEquip.set(lbl, [])
      byEquip.get(lbl).push(r)
    }
    const passingLabels = new Set()
    for (const [lbl, rows] of byEquip) {
      const eq = aggregateRows(rows)
      if (!eq) continue
      const v = eq[field] ?? 0
      const passes = operator === '>=' ? v >= num : operator === '<=' ? v <= num : Math.abs(v - num) < 0.001
      if (passes) passingLabels.add(lbl)
    }
    return data.filter(r => passingLabels.has(equipLabel(r)))
  }, [data, metricFilter])

  const agg      = useMemo(() => aggregateRows(filteredData), [filteredData])
  const timeDist = useMemo(() => calcTimeDistribution(filteredData), [filteredData])
  const stopDist = useMemo(() => calcStopDistribution(filteredData), [filteredData])

  const mainBenchmark = benchmarks?.[0] ?? null
  // referências de grupo só ativas quando o toggle "Comparar com grupo" está ligado
  const benchRend = showGroupAvg ? (mainBenchmark?.rendimento_operacional_hah_grupo ?? null) : null
  const benchVel  = showGroupAvg ? (mainBenchmark?.velocidade_media_kmh_grupo      ?? null) : null

  // Paginação independente por bloco
  const [vis1,  setVis1]  = useState(6) // par 1: área + rendimento
  const [vis2,  setVis2]  = useState(6) // par 2: velocidade + consumo
  const [vis3,  setVis3]  = useState(6) // par 3: tempo efetivo + disponibilidade
  const [visOp, setVisOp] = useState(6) // operadores

  const equipRows = useMemo(() => {
    const map = new Map()
    for (const r of filteredData) {
      if ((parseFloat(r.area_ha) || 0) <= 0) continue
      const k = equipLabel(r)
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(r)
    }
    return [...map.entries()].map(([label, rows]) => ({
      equip: label,
      label,
      ...aggregateRows(rows),
    }))
  }, [filteredData])

  // reset paginação quando os dados mudam
  useEffect(() => { setVis1(6); setVis2(6); setVis3(6); setVisOp(6) }, [data])

  // cada painel ordena pelo seu próprio critério (melhor → pior)
  const byArea  = useMemo(() => [...equipRows].sort((a, b) => b.area_ha - a.area_ha), [equipRows])
  const byRend  = useMemo(() => [...equipRows].sort((a, b) => b.rendimento_operacional_hah - a.rendimento_operacional_hah), [equipRows])
  const byVel   = useMemo(() => [...equipRows].sort((a, b) => b.velocidade_media_kmh - a.velocidade_media_kmh), [equipRows])
  const byComb  = useMemo(() => [...equipRows].sort((a, b) => a.consumo_medio_lh - b.consumo_medio_lh), [equipRows]) // menor = melhor
  const byTempo = useMemo(() => [...equipRows].sort((a, b) => b.tempo_efetivo_h - a.tempo_efetivo_h), [equipRows])
  const byDisp  = useMemo(() => [...equipRows].sort((a, b) => b.disponibilidade_mecanica_pct - a.disponibilidade_mecanica_pct), [equipRows])

  // escalas baseadas no total de equipamentos (não no slice) para barra estável ao expandir
  const maxArea  = useMemo(() => Math.max(...equipRows.map(e => e.area_ha), 1), [equipRows])
  const maxRend  = useMemo(() => Math.max(...equipRows.map(e => e.rendimento_operacional_hah), benchRend ?? 0, 0.1), [equipRows, benchRend])
  const maxVel   = useMemo(() => Math.max(...equipRows.map(e => e.velocidade_media_kmh), benchVel ?? 0, 0.1), [equipRows, benchVel])
  const maxComb  = useMemo(() => Math.max(...equipRows.map(e => e.consumo_medio_lh), 0.1), [equipRows])
  const maxTempo = useMemo(() => Math.max(...equipRows.map(e => e.tempo_efetivo_h), 0.1), [equipRows])

  const operadorRows = useMemo(() => {
    const map = new Map()
    for (const r of filteredData) {
      const nome = r.operador || 'Desconhecido'
      const acc  = map.get(nome) ?? { nome, trabalhando: 0, deslocamento: 0, manobra: 0, parada: 0, tempoTotal: 0, datas: new Set() }
      acc.trabalhando  += parseFloat(r.tempo_produtivo_h)    || 0
      acc.deslocamento += parseFloat(r.tempo_deslocamento_h) || 0
      acc.manobra      += parseFloat(r.tempo_manobra_h)      || 0
      acc.parada       += parseFloat(r.tempo_parada_h)       || 0
      acc.tempoTotal   += parseFloat(r.tempo_total_h)        || 0
      if (r.data) acc.datas.add(r.data)
      map.set(nome, acc)
    }
    return [...map.values()]
      .filter(o => (o.trabalhando + o.deslocamento + o.manobra + o.parada) > 0)
      .sort((a, b) => b.trabalhando - a.trabalhando)
      .map(o => {
        const total      = o.trabalhando + o.deslocamento + o.manobra + o.parada
        const diasAtivos = o.datas.size || 1
        return {
          ...o,
          trabalhando_pct:  (o.trabalhando  / total) * 100,
          deslocamento_pct: (o.deslocamento / total) * 100,
          manobra_pct:      (o.manobra      / total) * 100,
          parada_pct:       (o.parada        / total) * 100,
          turnoMedio:       o.tempoTotal / diasAtivos,
        }
      })
  }, [filteredData])

  if (loading) return <div style={{ padding: 64, textAlign: 'center', color: '#6b6560' }}>Carregando...</div>
  if (!agg)    return <div style={{ padding: 64, textAlign: 'center', color: '#6b6560' }}>Nenhum dado para os filtros selecionados.</div>

  const n = equipRows.length

  const cliente   = filters.cliente    || ''
  const processo  = filters.processo   || ''
  const tipoSafra = filters.tipo_safra || ''

  const fmtDate = (iso) => {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    return `${d}-${m}-${y}`
  }
  const di = queryFilters.dataInicio
  const df = queryFilters.dataFim
  const periodo = di === df ? fmtDate(di) : `${fmtDate(di)} até ${fmtDate(df)}`

  return (
    <div style={{ padding: '24px', maxWidth: 1280, margin: '0 auto' }}>

      {/* Cabeçalho verde com contexto dos filtros ativos */}
      <div style={{
        background: '#2d4a2d', borderRadius: 8,
        padding: '14px 20px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
      }}>
        {[
          { label: 'Cliente',  value: cliente   || 'Todos'            },
          { label: 'Processo', value: processo  || 'Todos'            },
          { label: 'Cultura',  value: tipoSafra || 'Não especificado' },
          { label: 'Período',  value: periodo                           },
        ].map(f => (
          <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)' }}>
              {f.label}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>
              {f.value}
            </span>
          </div>
        ))}
      </div>

      {/* Banner de exclusão ativa */}
      {excludedMotivos.length > 0 && (
        <div style={{ background: '#fdf6e3', border: '1px solid #d97706', borderRadius: 6, padding: '8px 14px', marginBottom: 18, fontSize: 12, color: '#7a5c00' }}>
          {excludedMotivos.length} motivo(s) de parada excluídos dos totais: {excludedMotivos.join(', ')}
        </div>
      )}

      {/* Banner de filtro de métrica ativo */}
      {metricFilter?.field && metricFilter?.value !== '' && metricFilter?.value != null && (
        <div style={{ background: '#edf5ed', border: '1px solid #4a6741', borderRadius: 6, padding: '8px 14px', marginBottom: 18, fontSize: 12, color: '#1e4d1e' }}>
          Filtro de métrica: {METRIC_FILTER_LABELS[metricFilter.field] ?? metricFilter.field} {metricFilter.operator} {metricFilter.value} — {equipRows.length} equipamento(s) exibido(s)
        </div>
      )}

      {/* ── BLOCO 1: KPIs ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        <KPICard label="Área Total"        value={fmtHa(agg.area_ha)} />
        <KPICard label="Rendimento Médio"  value={fmtHah(agg.rendimento_operacional_hah)} sub={benchRend ? `Média do grupo = ${fmtHah(benchRend)}` : undefined} />
        <KPICard label="Velocidade Média"  value={fmtKmh(agg.velocidade_media_kmh)} sub={benchVel ? `Média do grupo = ${fmtKmh(benchVel)}` : undefined} />
        <KPICard label="Eficiência Geral"  value={fmtPct(agg.eficiencia_geral_pct)} />
        <KPICard label="Tempo Efetivo"     value={fmtH(agg.tempo_efetivo_h)} />
      </div>

      {/* ── BLOCO 2: Tabela de Dimensões ─────────────────────────────────── */}
      <SectionTitle>Análise por Dimensão</SectionTitle>
      <div style={{ marginBottom: 28 }}>
        <DimensionTable data={filteredData} grupoRow={showGroupAvg ? mainBenchmark : null} showGroupAvg={showGroupAvg} />
      </div>

      {/* ── BLOCO 3: Desempenho por Equipamento (3 pares independentes) ──── */}
      {equipRows.length > 0 && (
        <>
          <SectionTitle>Desempenho por Equipamento</SectionTitle>

          {/* Par 1: Área + Rendimento */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 6 }}>
            <MiniPanel title="Área Trabalhada (ha)">
              {byArea.slice(0, vis1).map(e => (
                <HBar key={e.equip} label={e.label} value={e.area_ha} maxVal={maxArea} barColor="#2d4a2d" displayValue={fmtHa(e.area_ha)} />
              ))}
            </MiniPanel>
            <MiniPanel title="Rendimento Operacional (ha/h)" subtitle={benchRend ? `Média do grupo = ${fmtHah(benchRend)}` : undefined}>
              {byRend.slice(0, vis1).map(e => {
                const st = rendStatus(e.rendimento_operacional_hah, benchRend)
                return (
                  <HBar key={e.equip} label={e.label} value={e.rendimento_operacional_hah} maxVal={maxRend}
                    barColor={STATUS_COLORS[st].bar} displayValue={fmtHah(e.rendimento_operacional_hah)}
                    refLine={!!benchRend} refValue={benchRend} />
                )
              })}
            </MiniPanel>
          </div>
          <ShowMoreBtn current={vis1} total={n} onMore={() => setVis1(v => v + 6)} onLess={() => setVis1(v => Math.max(6, v - 6))} />

          {/* Par 2: Velocidade + Consumo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12, marginBottom: 6 }}>
            <MiniPanel title="Velocidade Média (km/h)" subtitle={benchVel ? `Média do grupo = ${fmtKmh(benchVel)}` : undefined}>
              {byVel.slice(0, vis2).map(e => (
                <HBar key={e.equip} label={e.label} value={e.velocidade_media_kmh} maxVal={maxVel} barColor="#4a6741" displayValue={fmtKmh(e.velocidade_media_kmh)} refLine={!!benchVel} refValue={benchVel} />
              ))}
            </MiniPanel>
            <MiniPanel title="Consumo Médio (l/h)">
              {byComb.slice(0, vis2).map(e => (
                <HBar key={e.equip} label={e.label} value={e.consumo_medio_lh} maxVal={maxComb} barColor="#c8960c" displayValue={fmt(e.consumo_medio_lh, 1, ' l/h')} />
              ))}
            </MiniPanel>
          </div>
          <ShowMoreBtn current={vis2} total={n} onMore={() => setVis2(v => v + 6)} onLess={() => setVis2(v => Math.max(6, v - 6))} />

          {/* Par 3: Tempo Efetivo + Disponibilidade */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12, marginBottom: 6, alignItems: 'start' }}>
            <MiniPanel title="Tempo Efetivo (h)">
              {byTempo.slice(0, vis3).map(e => (
                <HBar key={e.equip} label={e.label} value={e.tempo_efetivo_h} maxVal={maxTempo} barColor="#2d4a2d" displayValue={fmtH(e.tempo_efetivo_h)} />
              ))}
            </MiniPanel>
            <div style={{ background: '#fff', border: '1px solid #e0dbd4', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ background: '#2d5016', padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Disponibilidade Mecânica (%)
              </div>
              <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                {byDisp.slice(0, vis3).map(e => {
                  const st = dispStatus(e.disponibilidade_mecanica_pct)
                  const sc = STATUS_COLORS[st]
                  return (
                    <div key={e.equip} style={{ background: sc.bg, borderRadius: 6, padding: '8px 6px', textAlign: 'center', minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: '#6b6560', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: sc.text }}>{fmtPct(e.disponibilidade_mecanica_pct)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <ShowMoreBtn current={vis3} total={n} onMore={() => setVis3(v => v + 6)} onLess={() => setVis3(v => Math.max(6, v - 6))} />

          <div style={{ marginBottom: 28 }} />
        </>
      )}

      {/* ── BLOCO 4: Distribuição de Tempo + Motivos de Parada ─────────── */}
      <SectionTitle>Eficiência e Disponibilidade Mecânica</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28, alignItems: 'start' }}>

        <div style={{ background: '#fff', border: '1px solid #e0dbd4', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ background: '#2d5016', padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Distribuição do Tempo
          </div>
          <div style={{ padding: '12px 16px' }}>
            {/* Legenda com totais de horas por estado */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
              {timeDist.map(d => (
                <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 10, height: 10, background: d.color, borderRadius: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: '#6b6560' }}>{d.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#1a1a1a' }}>{fmtH(d.value)}</span>
                </div>
              ))}
            </div>
            {/* Barra global */}
            <StackedBar segments={timeDist.map(d => ({ pct: d.pct, color: d.color }))} height={28} />
            {/* Por operador */}
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ width: 100, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 10, color: '#9b9390' }}>Distribuição de tempo</div>
                <div style={{ width: 58, fontSize: 10, color: '#9b9390', textAlign: 'right', flexShrink: 0 }}>Turno/dia</div>
              </div>
              {operadorRows.slice(0, visOp).map(op => (
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
                  <div style={{ width: 58, fontSize: 11, fontWeight: 600, color: '#4a3728', textAlign: 'right', flexShrink: 0, paddingLeft: 6 }}>
                    {fmtH(op.turnoMedio)}
                  </div>
                </div>
              ))}
            </div>
            <ShowMoreBtn
              current={visOp} total={operadorRows.length}
              onMore={() => setVisOp(v => v + 6)}
              onLess={() => setVisOp(v => Math.max(6, v - 6))}
            />
          </div>
        </div>

        <MotivosParadaPanel stopRows={stopRows} />
      </div>

      {/* Rodapé */}
      <div style={{ background: '#f7f5f2', borderTop: '1px solid #e0dbd4', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 -24px -24px' }}>
        <span style={{ fontSize: 11, color: '#6b6560' }}>Relatório gerado automaticamente · Porteira Adentro Consultoria Agrícola</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#4a3728' }}>PORTEIRA ADENTRO</span>
      </div>
    </div>
  )
}
