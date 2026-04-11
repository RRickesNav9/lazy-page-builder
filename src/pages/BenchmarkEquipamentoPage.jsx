// BenchmarkEquipamentoPage.jsx
// Analisa desempenho de máquinas: individual vs. modelo, comparativo de períodos e modelos.
// Dados reais via dashboard_operational_view e media_equipamentos_porteira.

import { useState, useMemo, useRef } from 'react'
import { useFilters } from '../lib/FilterContext'
import {
  useEquipamentoBenchmark, useEquipamentoComparativo,
  useMaquinaMetricas, computeWeightedAvg,
  useAllEquipamentos, useModeloStats,
} from '../hooks/useData'

// ─── CONFIGURAÇÃO ─────────────────────────────────────────────────────────────

// modeloKey: sufixo _modelo usado em media_equipamentos_porteira
const METRICAS_CONFIG = [
  { key: 'rendimento_operacional_hah',   modeloKey: 'rendimento_operacional_hah_modelo',   label: 'Rendimento Operacional',   unit: 'ha/h', d: 2, higherIsBetter: true  },
  { key: 'eficiencia_geral_pct',         modeloKey: 'eficiencia_geral_pct_modelo',         label: 'Eficiência Geral',         unit: '%',    d: 2, higherIsBetter: true  },
  { key: 'eficiencia_operacional_pct',   modeloKey: 'eficiencia_operacional_pct_modelo',   label: 'Eficiência Operacional',   unit: '%',    d: 2, higherIsBetter: true  },
  { key: 'consumo_medio_efetivo_lha',    modeloKey: 'consumo_medio_efetivo_lha_modelo',    label: 'Consumo Efetivo Médio',    unit: 'L/ha', d: 2, higherIsBetter: false },
  { key: 'consumo_medio_lh',             modeloKey: 'consumo_medio_lh_modelo',             label: 'Consumo Médio',            unit: 'L/h',  d: 2, higherIsBetter: false },
  { key: 'disponibilidade_mecanica_pct', modeloKey: 'disponibilidade_mecanica_pct_modelo', label: 'Disponibilidade Mecânica', unit: '%',    d: 2, higherIsBetter: true  },
  { key: 'velocidade_media_kmh',         modeloKey: 'velocidade_media_kmh_modelo',         label: 'Velocidade Média Op.',     unit: 'km/h', d: 2, higherIsBetter: true  },
  { key: 'rpm_medio',                    modeloKey: 'rpm_medio_modelo',                    label: 'RPM Médio',                unit: 'RPM',  d: 0, higherIsBetter: null  },
]

const TABS = [
  { id: 'maquina-modelo', label: 'Máquina vs. Modelo'        },
  { id: 'equip-equip',    label: 'Equipamento vs. Equipamento' },
  { id: 'modelo-modelo',  label: 'Modelo vs. Modelo'         },
]

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const fmt = (v, d = 2) =>
  v != null && v !== 0 ? Number(v).toFixed(d).replace('.', ',') : '—'

function fmtDiff(valA, valB) {
  if (!valA || !valB || valB === 0) return null
  const pct = (valA / valB - 1) * 100
  const sign = pct >= 0 ? '+' : '−'
  return `${sign}${Math.abs(pct).toFixed(2)}%`
}

function computeStatus(valA, valB, higherIsBetter) {
  if (!valA || !valB || higherIsBetter === null) return 'neutro'
  const ratio = valA / valB
  if (higherIsBetter) {
    if (ratio >= 1.05) return 'acima'
    if (ratio >= 0.95) return 'na-media'
    return 'abaixo'
  }
  if (ratio <= 0.95) return 'acima'
  if (ratio <= 1.05) return 'na-media'
  return 'abaixo'
}

function badgeProps(status) {
  const MAP = {
    acima:      { bg: '#edf5ed', fg: '#1e4d1e', text: 'Acima'    },
    'na-media': { bg: '#fdf6e3', fg: '#7a5c00', text: 'Na média' },
    abaixo:     { bg: '#fdf0f0', fg: '#8b2020', text: 'Abaixo'   },
    neutro:     { bg: '#f0ede8', fg: '#4a3728', text: '—'        },
  }
  return MAP[status] ?? MAP.neutro
}

// Normaliza row de media_equipamentos_porteira para o mesmo shape das métricas (cfg.key → value)
function normalizarModeloRow(row) {
  if (!row) return null
  return Object.fromEntries(METRICAS_CONFIG.map(cfg => [cfg.key, row[cfg.modeloKey] ?? 0]))
}

// ─── COMPONENTES COMPARTILHADOS ───────────────────────────────────────────────

function TabControl({ tabs, active, onChange }) {
  return (
    <div style={{
      display: 'flex', background: '#f7f5f2', border: '1px solid #e0dbd4',
      borderRadius: 6, overflow: 'hidden', marginBottom: 20,
    }}>
      {tabs.map((tab, i) => (
        <button key={tab.id} onClick={() => onChange(tab.id)} style={{
          flex: 1, padding: '8px 12px', fontSize: 13, fontWeight: 500,
          border: 'none', cursor: 'pointer',
          borderRight: i < tabs.length - 1 ? '1px solid #e0dbd4' : 'none',
          background: active === tab.id ? '#2d4a2d' : '#f7f5f2',
          color: active === tab.id ? '#ffffff' : '#6b6560',
        }}>
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function SectionCard({ title, subtitle, footnote, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e0dbd4', borderRadius: 6, padding: 20 }}>
      {(title || subtitle) && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
          {title && (
            <span style={{ fontSize: 11, fontWeight: 600, color: '#4a3728', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {title}
            </span>
          )}
          {subtitle && <span style={{ fontSize: 8, color: '#6b6560' }}>{subtitle}</span>}
        </div>
      )}
      {children}
      {footnote && (
        <div style={{ marginTop: 14, fontSize: 8, color: '#6b6560', fontStyle: 'italic' }}>{footnote}</div>
      )}
    </div>
  )
}

function FieldLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
      letterSpacing: '0.06em', color: '#6b6560', marginBottom: 5,
    }}>
      {children}
    </div>
  )
}

function MaquinaSelect({ label, value, onChange, equipamentos }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef(null)

  const selected = equipamentos.find(e => e.equipamento_cod === value)
  const displayLabel = selected
    ? `${selected.equipamento_cod} · ${selected.equipamento}${selected.modelo ? ` — ${selected.modelo}` : ''}`
    : ''

  const searchLower = search.toLowerCase()
  const byCliente = equipamentos.reduce((acc, e) => {
    const c = e.cliente || 'Sem cliente'
    if (!acc[c]) acc[c] = []
    acc[c].push(e)
    return acc
  }, {})
  const filteredByCliente = Object.entries(byCliente).reduce((acc, [cliente, lista]) => {
    const filtered = search
      ? lista.filter(e =>
          (e.equipamento_cod || '').toLowerCase().includes(searchLower) ||
          (e.equipamento || '').toLowerCase().includes(searchLower) ||
          (e.modelo || '').toLowerCase().includes(searchLower) ||
          cliente.toLowerCase().includes(searchLower)
        )
      : lista
    if (filtered.length > 0) acc[cliente] = filtered
    return acc
  }, {})

  return (
    <div style={{ position: 'relative' }}>
      <FieldLabel>{label}</FieldLabel>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={open ? search : displayLabel}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => { setOpen(true); setSearch('') }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Selecionar máquina..."
          style={{
            width: '100%', padding: '6px 30px 6px 10px', boxSizing: 'border-box',
            fontSize: 12, color: '#1a1a1a', background: '#fff',
            border: '1px solid #e0dbd4', borderRadius: open ? '4px 4px 0 0' : 4,
            outline: 'none',
          }}
        />
        <span
          onMouseDown={e => {
            e.preventDefault()
            if (value) { onChange(''); setSearch(''); setOpen(false) }
            else { setSearch(''); inputRef.current?.focus() }
          }}
          style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            cursor: 'pointer', color: '#6b6560',
            fontSize: value ? 16 : 10, lineHeight: 1, userSelect: 'none',
          }}
        >
          {value ? '×' : '▼'}
        </span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', left: 0, right: 0, zIndex: 200,
          border: '1px solid #e0dbd4', borderTop: 'none', borderRadius: '0 0 4px 4px',
          background: '#fff', maxHeight: 220, overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        }}>
          {Object.keys(filteredByCliente).length === 0 ? (
            <div style={{ padding: '8px 10px', fontSize: 12, color: '#6b6560' }}>Nenhum resultado</div>
          ) : Object.entries(filteredByCliente).map(([cliente, lista]) => (
            <div key={cliente}>
              <div style={{
                padding: '5px 10px 2px', fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                color: '#2d4a2d', background: '#f7f5f2',
                position: 'sticky', top: 0,
              }}>
                {cliente}
              </div>
              {lista.map(e => (
                <div
                  key={e.equipamento_cod || e.equipamento}
                  onMouseDown={ev => ev.preventDefault()}
                  onClick={() => { onChange(e.equipamento_cod); setSearch(''); setOpen(false) }}
                  style={{
                    padding: '5px 10px 5px 16px', fontSize: 12, cursor: 'pointer',
                    color: e.equipamento_cod === value ? '#1e4d1e' : '#1a1a1a',
                    background: e.equipamento_cod === value ? '#edf5ed' : 'transparent',
                  }}
                >
                  {e.equipamento_cod} · {e.equipamento}{e.modelo ? ` — ${e.modelo}` : ''}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ModeloSelect({ label, value, onChange, modelos }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef(null)

  const searchLower = search.toLowerCase()
  const filtered = modelos.filter(m => !search || m.toLowerCase().includes(searchLower))

  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <FieldLabel>{label}</FieldLabel>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={open ? search : value}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => { setOpen(true); setSearch('') }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Selecionar modelo..."
          style={{
            width: '100%', padding: '6px 30px 6px 10px', boxSizing: 'border-box',
            fontSize: 12, color: '#1a1a1a', background: '#fff',
            border: '1px solid #e0dbd4', borderRadius: open ? '4px 4px 0 0' : 4,
            outline: 'none',
          }}
        />
        <span
          onMouseDown={e => {
            e.preventDefault()
            if (value) { onChange(''); setSearch(''); setOpen(false) }
            else { setSearch(''); inputRef.current?.focus() }
          }}
          style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            cursor: 'pointer', color: '#6b6560',
            fontSize: value ? 16 : 10, lineHeight: 1, userSelect: 'none',
          }}
        >
          {value ? '×' : '▼'}
        </span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', left: 0, right: 0, zIndex: 200,
          border: '1px solid #e0dbd4', borderTop: 'none', borderRadius: '0 0 4px 4px',
          background: '#fff', maxHeight: 200, overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '8px 10px', fontSize: 12, color: '#6b6560' }}>Nenhum resultado</div>
          ) : filtered.map(m => (
            <div
              key={m}
              onMouseDown={ev => ev.preventDefault()}
              onClick={() => { onChange(m); setSearch(''); setOpen(false) }}
              style={{
                padding: '5px 10px', fontSize: 12, cursor: 'pointer',
                color: m === value ? '#1e4d1e' : '#1a1a1a',
                background: m === value ? '#edf5ed' : 'transparent',
              }}
            >
              {m}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DateRangeInputs({ inicio, fim, onInicio, onFim }) {
  const inputStyle = {
    width: '100%', padding: '6px 8px', border: '1px solid #e0dbd4', borderRadius: 4,
    fontSize: 12, color: '#1a1a1a', background: '#fff', boxSizing: 'border-box',
  }
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: '#6b6560', marginBottom: 3 }}>De</div>
        <input type="date" value={inicio} onChange={e => onInicio(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: '#6b6560', marginBottom: 3 }}>Até</div>
        <input type="date" value={fim} onChange={e => onFim(e.target.value)} style={inputStyle} />
      </div>
    </div>
  )
}

function StateMsg({ loading, empty, emptyText }) {
  if (loading) return (
    <div style={{ padding: '36px 0', textAlign: 'center', color: '#6b6560', fontSize: 13 }}>
      Carregando...
    </div>
  )
  if (empty) return (
    <div style={{ padding: '36px 0', textAlign: 'center', color: '#6b6560', fontSize: 13 }}>
      {emptyText}
    </div>
  )
  return null
}

// ─── TABELA COMPARATIVA (usada por Tab 1 e Tab 2) ────────────────────────────

function CompareRow({ cfg, valA, valB, labelA, labelB, isEven }) {
  const status = computeStatus(valA, valB, cfg.higherIsBetter)
  const badge  = badgeProps(status)
  const diff   = fmtDiff(valA, valB)
  const maxVal = Math.max(valA || 0, valB || 0, 0.001)
  const diffColor = status === 'acima' ? '#1e4d1e' : status === 'abaixo' ? '#8b2020' : '#7a5c00'

  return (
    <tr style={{ background: isEven ? '#ffffff' : '#fafaf8' }}>
      <td style={{ padding: '8px 10px', width: 170 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#4a3728' }}>{cfg.label}</div>
        <div style={{ fontSize: 8, color: '#6b6560', marginTop: 1 }}>{cfg.unit}</div>
      </td>
      <td style={{ padding: '8px 10px', textAlign: 'center', width: 80 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#4a3728' }}>{fmt(valA, cfg.d)}</span>
      </td>
      <td style={{ padding: '8px 10px', textAlign: 'center', width: 80 }}>
        <span style={{ fontSize: 11, color: '#6b6560' }}>{fmt(valB, cfg.d)}</span>
      </td>
      <td style={{ padding: '8px 10px', minWidth: 160 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {[
            { l: labelA, w: (valA / maxVal) * 100, c: '#2d4a2d' },
            { l: labelB, w: (valB / maxVal) * 100, c: '#c8960c' },
          ].map(({ l, w, c }) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                width: 54, flexShrink: 0, fontSize: 7, color: '#6b6560',
                textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {l}
              </span>
              <div style={{ flex: 1, height: 7, background: '#f0ede8', borderRadius: 2, overflow: 'hidden', minWidth: 80 }}>
                <div style={{ height: '100%', width: `${w}%`, background: c, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      </td>
      <td style={{ padding: '8px 10px', textAlign: 'center', width: 80 }}>
        {diff && (
          <span style={{ fontSize: 11, fontWeight: 600, color: cfg.higherIsBetter === null ? '#6b6560' : diffColor }}>
            {diff}
          </span>
        )}
      </td>
      <td style={{ padding: '8px 10px', textAlign: 'center', width: 70 }}>
        {cfg.higherIsBetter !== null && (
          <span style={{
            fontSize: 9, fontWeight: 600, color: badge.fg, background: badge.bg,
            padding: '2px 6px', borderRadius: 3,
          }}>
            {badge.text}
          </span>
        )}
      </td>
    </tr>
  )
}

function CompareTable({ metricasA, metricasB, labelA, labelB }) {
  const thStyle = {
    background: '#2d4a2d', color: '#fff', fontSize: 11, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.04em', padding: '6px 10px',
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, textAlign: 'left' }}>Métrica</th>
            <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>{labelA}</th>
            <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>{labelB}</th>
            <th style={{ ...thStyle, textAlign: 'left', minWidth: 160 }}>Comparativo visual</th>
            <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>Diferença</th>
            <th style={{ ...thStyle, textAlign: 'center', width: 70 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {METRICAS_CONFIG.map((cfg, i) => (
            <CompareRow
              key={cfg.key}
              cfg={cfg}
              valA={metricasA?.[cfg.key] ?? 0}
              valB={metricasB?.[cfg.key] ?? 0}
              labelA={labelA}
              labelB={labelB}
              isEven={i % 2 === 0}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── CABEÇALHO DINÂMICO ───────────────────────────────────────────────────────

function DynamicHeader({ processo, tipoSafra, safra }) {
  const fieldStyle  = { display: 'flex', flexDirection: 'column', gap: 2 }
  const labelStyle  = { fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)' }
  const valueStyle  = { fontSize: 14, fontWeight: 700, color: '#ffffff' }
  const divStyle    = { width: 1, height: 32, background: 'rgba(255,255,255,0.2)', flexShrink: 0 }
  return (
    <div style={{
      background: '#2d4a2d', borderRadius: 8,
      padding: '14px 20px', marginBottom: 20,
      display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
    }}>
      <div style={fieldStyle}>
        <span style={labelStyle}>Processo</span>
        <span style={valueStyle}>{processo || '—'}</span>
      </div>
      <div style={divStyle} />
      <div style={fieldStyle}>
        <span style={labelStyle}>Cultura</span>
        <span style={valueStyle}>{tipoSafra || 'Não especificado'}</span>
      </div>
      <div style={divStyle} />
      <div style={fieldStyle}>
        <span style={labelStyle}>Safra</span>
        <span style={valueStyle}>{safra || '—'}</span>
      </div>
    </div>
  )
}

// ─── TAB 3: SELETOR DE MÉTRICAS + BARRAS MODELO VS MODELO ────────────────────

function MetricaSelector({ selected, onToggle }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
      {METRICAS_CONFIG.map(m => {
        const ativo = selected.has(m.key)
        return (
          <button key={m.key} onClick={() => onToggle(m.key)} style={{
            padding: '4px 10px', borderRadius: 4, fontSize: 11, cursor: 'pointer',
            background: ativo ? '#2d4a2d' : '#f7f5f2',
            color: ativo ? '#fff' : '#4a3728',
            border: ativo ? 'none' : '1px solid #e0dbd4',
            fontWeight: ativo ? 600 : 400,
          }}>
            {m.label}
          </button>
        )
      })}
    </div>
  )
}

// statsA/statsB: { min, max, n } para a métrica, vindos de useModeloStats
function ModeloMetricBar({ cfg, valA, valB, labelA, labelB, statsA, statsB }) {
  const allVals = [valA || 0, valB || 0, statsA?.min || 0, statsA?.max || 0, statsB?.min || 0, statsB?.max || 0]
  const maxVal = Math.max(...allVals, 0.001)

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#4a3728', marginBottom: 5 }}>
        {cfg.label}
        <span style={{ fontWeight: 400, color: '#6b6560' }}> · {cfg.unit}</span>
      </div>
      {[
        { label: labelA, val: valA, color: '#2d4a2d', stats: statsA },
        { label: labelB, val: valB, color: '#c8960c', stats: statsB },
      ].map(({ label, val, color, stats }) => {
        const minPct = stats?.min ? (stats.min / maxVal) * 100 : null
        const maxPct = stats?.max ? (stats.max / maxVal) * 100 : null
        return (
          <div key={label} style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 110, fontSize: 8, color: '#6b6560', textAlign: 'right',
                flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {label || '—'}
              </div>
              {/* Barra: range min-max em cinza claro + avg como barra sólida */}
              <div style={{ flex: 1, height: 11, background: '#f0ede8', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
                {/* Range min→max */}
                {minPct != null && maxPct != null && (
                  <div style={{
                    position: 'absolute', top: 0, bottom: 0,
                    left: `${minPct}%`, width: `${maxPct - minPct}%`,
                    background: color, opacity: 0.22, borderRadius: 2,
                  }} />
                )}
                {/* Média (avg) */}
                <div style={{ height: '100%', width: `${(val / maxVal) * 100}%`, background: color, borderRadius: 2 }} />
              </div>
              <div style={{ width: 42, fontSize: 10, fontWeight: 700, color: '#1a1a1a', textAlign: 'right', flexShrink: 0 }}>
                {fmt(val, cfg.d)}
              </div>
            </div>
            {/* Linha min/max */}
            {stats && stats.n > 1 && (
              <div style={{ marginLeft: 118, fontSize: 8, color: '#9a9490', marginTop: 1 }}>
                {stats.n} máq. · mín {fmt(stats.min, cfg.d)} · máx {fmt(stats.max, cfg.d)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export default function BenchmarkEquipamentoPage() {
  const { filters, queryFilters, currentSafra } = useFilters()

  const [activeTab, setActiveTab] = useState('maquina-modelo')
  const [tab1Cod, setTab1Cod]     = useState('')
  const [sideA, setSideA]         = useState({ cod: '', dataInicio: '', dataFim: '' })
  const [sideB, setSideB]         = useState({ cod: '', dataInicio: '', dataFim: '' })
  const [modeloA, setModeloA]     = useState('')
  const [modeloB, setModeloB]     = useState('')
  const [selectedMetrics, setSelectedMetrics] = useState(() => new Set(METRICAS_CONFIG.map(m => m.key)))

  // O filtro global já garante que processo é Colheita ou Plantio nesta página (via App.jsx + cascade do FAB).
  // processoFiltro é apenas o valor normalizado para passar aos hooks.
  const processoFiltro = filters.processo || null

  function toggleMetric(key) {
    setSelectedMetrics(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // ── hooks compartilhados ───────────────────────────────────────────────────

  // Todas as máquinas do grupo, agrupadas por cliente no select.
  // allowedProcessos restringe a busca a Colheita/Plantio mesmo sem processo específico selecionado.
  const { equipamentos } = useAllEquipamentos({
    ...(processoFiltro     && { processo:      processoFiltro }),
    ...(filters.tipo_safra && { tipo_safra:    filters.tipo_safra }),
    allowedProcessos: ['Colheita', 'Plantio'],
    solinftecOnly: true,
  })

  // ── Tab 1: Máquina vs. Modelo ──────────────────────────────────────────────

  const maqInfo1 = equipamentos.find(e => e.equipamento_cod === tab1Cod)
  const { metricas: maqMetricas, loading: loadingMaq } = useMaquinaMetricas({
    ...(tab1Cod && { equipamento_cod: tab1Cod }),
    ...(processoFiltro && { processo: processoFiltro }),
    ...(filters.tipo_safra && { tipo_safra: filters.tipo_safra }),
    safra: currentSafra,
    ...(queryFilters.dataInicio && { dataInicio: queryFilters.dataInicio }),
    ...(queryFilters.dataFim    && { dataFim:    queryFilters.dataFim    }),
  })
  const { data: modeloData1, loading: loadingModelo1 } = useEquipamentoBenchmark({
    ...(maqInfo1?.modelo && { modelo_equipamento: maqInfo1.modelo }),
    ...(processoFiltro && { processo: processoFiltro }),
    ...(filters.tipo_safra && { tipo_safra: filters.tipo_safra }),
    safra: currentSafra,
  })
  const modeloNorm1 = useMemo(() => normalizarModeloRow(modeloData1[0] ?? null), [modeloData1])

  // ── Tab 2: Equipamento vs. Equipamento ────────────────────────────────────

  const tab2FiltersA = sideA.cod ? {
    equipamento_cod: sideA.cod,
    ...(processoFiltro && { processo: processoFiltro }),
    ...(filters.tipo_safra && { tipo_safra: filters.tipo_safra }),
    ...(sideA.dataInicio   && { dataInicio: sideA.dataInicio }),
    ...(sideA.dataFim      && { dataFim:    sideA.dataFim    }),
  } : {}
  const tab2FiltersB = sideB.cod ? {
    equipamento_cod: sideB.cod,
    ...(processoFiltro && { processo: processoFiltro }),
    ...(filters.tipo_safra && { tipo_safra: filters.tipo_safra }),
    ...(sideB.dataInicio   && { dataInicio: sideB.dataInicio }),
    ...(sideB.dataFim      && { dataFim:    sideB.dataFim    }),
  } : {}
  const { dataA, dataB, loading: loadingEquip } = useEquipamentoComparativo(tab2FiltersA, tab2FiltersB)
  const metricasEquipA = useMemo(() => computeWeightedAvg(dataA), [dataA])
  const metricasEquipB = useMemo(() => computeWeightedAvg(dataB), [dataB])

  const maqInfoA = equipamentos.find(e => e.equipamento_cod === sideA.cod)
  const maqInfoB = equipamentos.find(e => e.equipamento_cod === sideB.cod)
  const labelEquipA = maqInfoA
    ? `${maqInfoA.equipamento_cod} — ${maqInfoA.equipamento}${sideA.dataInicio ? ' (' + sideA.dataInicio + ')' : ''}`
    : 'Equipamento A'
  const labelEquipB = maqInfoB
    ? `${maqInfoB.equipamento_cod} — ${maqInfoB.equipamento}${sideB.dataInicio ? ' (' + sideB.dataInicio + ')' : ''}`
    : 'Equipamento B'

  // ── Tab 3: Modelo vs. Modelo ───────────────────────────────────────────────

  const { data: allModelosData, loading: loadingModelos } = useEquipamentoBenchmark({
    ...(processoFiltro && { processo: processoFiltro }),
    ...(filters.tipo_safra && { tipo_safra: filters.tipo_safra }),
    safra: currentSafra,
  })
  const modeloOptions = useMemo(
    () => [...new Set(allModelosData.map(r => r.modelo_equipamento).filter(Boolean))].sort(),
    [allModelosData]
  )
  const modeloNormA = useMemo(() => normalizarModeloRow(allModelosData.find(r => r.modelo_equipamento === modeloA) ?? null), [allModelosData, modeloA])
  const modeloNormB = useMemo(() => normalizarModeloRow(allModelosData.find(r => r.modelo_equipamento === modeloB) ?? null), [allModelosData, modeloB])

  const modeloStatsFilters = {
    ...(processoFiltro && { processo: processoFiltro }),
    ...(filters.tipo_safra && { tipo_safra: filters.tipo_safra }),
    safra: currentSafra,
  }
  const { stats: statsA } = useModeloStats({ ...modeloStatsFilters, ...(modeloA && { modelo_equipamento: modeloA }) })
  const { stats: statsB } = useModeloStats({ ...modeloStatsFilters, ...(modeloB && { modelo_equipamento: modeloB }) })

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '24px', maxWidth: 1280, margin: '0 auto' }}>
      <DynamicHeader
        processo={processoFiltro}
        tipoSafra={filters.tipo_safra}
        safra={currentSafra}
      />
      <TabControl tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {/* ── TAB 1: MÁQUINA VS. MODELO ──────────────────────────────────────── */}
      {activeTab === 'maquina-modelo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionCard>
            <MaquinaSelect
              label="Máquina"
              value={tab1Cod}
              onChange={setTab1Cod}
              equipamentos={equipamentos}
            />
          </SectionCard>

          {tab1Cod && (
            <SectionCard
              title="Máquina vs. Média do Modelo"
            >
              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                {[
                  { color: '#2d4a2d', label: maqInfo1 ? `${maqInfo1.equipamento_cod} — ${maqInfo1.equipamento}` : 'Esta máquina' },
                  { color: '#c8960c', label: maqInfo1?.modelo ? `${maqInfo1.modelo} — Porteira` : 'Média do modelo' },
                ].map(({ color, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#6b6560' }}>
                    <span style={{ width: 10, height: 10, background: color, borderRadius: 2, display: 'inline-block', flexShrink: 0 }} />
                    {label}
                  </div>
                ))}
              </div>
              <StateMsg
                loading={loadingMaq || loadingModelo1}
                empty={!loadingMaq && !loadingModelo1 && (!maqMetricas || !modeloNorm1)}
                emptyText="Sem dados para os filtros selecionados."
              />
              {!loadingMaq && !loadingModelo1 && maqMetricas && modeloNorm1 && (
                <CompareTable
                  metricasA={maqMetricas}
                  metricasB={modeloNorm1}
                  labelA={maqInfo1 ? `${maqInfo1.equipamento_cod} — ${maqInfo1.equipamento}` : tab1Cod}
                  labelB={maqInfo1?.modelo ? `${maqInfo1.modelo} — Porteira` : 'Média modelo'}
                />
              )}
            </SectionCard>
          )}
        </div>
      )}

      {/* ── TAB 2: EQUIPAMENTO VS. EQUIPAMENTO ─────────────────────────────── */}
      {activeTab === 'equip-equip' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <SectionCard title="Equipamento A">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <MaquinaSelect
                  label="Máquina"
                  value={sideA.cod}
                  onChange={cod => setSideA(p => ({ ...p, cod }))}
                  equipamentos={equipamentos}
                />
                <div>
                  <FieldLabel>Período (opcional)</FieldLabel>
                  <DateRangeInputs
                    inicio={sideA.dataInicio}
                    fim={sideA.dataFim}
                    onInicio={v => setSideA(p => ({ ...p, dataInicio: v }))}
                    onFim={v => setSideA(p => ({ ...p, dataFim: v }))}
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Equipamento B">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <MaquinaSelect
                  label="Máquina"
                  value={sideB.cod}
                  onChange={cod => setSideB(p => ({ ...p, cod }))}
                  equipamentos={equipamentos}
                />
                <div>
                  <FieldLabel>Período (opcional)</FieldLabel>
                  <DateRangeInputs
                    inicio={sideB.dataInicio}
                    fim={sideB.dataFim}
                    onInicio={v => setSideB(p => ({ ...p, dataInicio: v }))}
                    onFim={v => setSideB(p => ({ ...p, dataFim: v }))}
                  />
                </div>
              </div>
            </SectionCard>
          </div>

          {(sideA.cod || sideB.cod) && (
            <SectionCard
              title="Comparativo de Métricas"
              subtitle="Equipamento A vs. Equipamento B"
            >
              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                {[{ color: '#2d4a2d', label: labelEquipA }, { color: '#c8960c', label: labelEquipB }].map(({ color, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#6b6560' }}>
                    <span style={{ width: 10, height: 10, background: color, borderRadius: 2, display: 'inline-block', flexShrink: 0 }} />
                    {label}
                  </div>
                ))}
              </div>
              <StateMsg
                loading={loadingEquip}
                empty={!loadingEquip && !metricasEquipA && !metricasEquipB}
                emptyText="Selecione ao menos uma máquina para comparar."
              />
              {!loadingEquip && (metricasEquipA || metricasEquipB) && (
                <CompareTable
                  metricasA={metricasEquipA ?? {}}
                  metricasB={metricasEquipB ?? {}}
                  labelA={labelEquipA}
                  labelB={labelEquipB}
                />
              )}
            </SectionCard>
          )}
        </div>
      )}

      {/* ── TAB 3: MODELO VS. MODELO ────────────────────────────────────────── */}
      {activeTab === 'modelo-modelo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionCard>
            <div style={{ display: 'flex', gap: 16 }}>
              <ModeloSelect label="Modelo A" value={modeloA} onChange={setModeloA} modelos={modeloOptions} />
              <ModeloSelect label="Modelo B" value={modeloB} onChange={setModeloB} modelos={modeloOptions} />
            </div>
            {loadingModelos && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#6b6560' }}>Carregando modelos...</div>
            )}
          </SectionCard>

          {(modeloA || modeloB) && (
            <SectionCard
              title="Comparativo de Modelos"
              subtitle={`${modeloA || '—'} vs. ${modeloB || '—'}`}
            >
              <div style={{ marginBottom: 16 }}>
                <FieldLabel>Métricas exibidas</FieldLabel>
                <MetricaSelector selected={selectedMetrics} onToggle={toggleMetric} />
              </div>

              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                {[
                  { color: '#2d4a2d', label: modeloA || 'Modelo A' },
                  { color: '#c8960c', label: modeloB || 'Modelo B' },
                ].map(({ color, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#6b6560' }}>
                    <span style={{ width: 10, height: 10, background: color, borderRadius: 2, display: 'inline-block', flexShrink: 0 }} />
                    {label}
                  </div>
                ))}
              </div>

              <StateMsg
                loading={loadingModelos}
                empty={!loadingModelos && !modeloNormA && !modeloNormB}
                emptyText="Selecione os dois modelos para comparar."
              />

              {!loadingModelos && (modeloNormA || modeloNormB) && (
                <div>
                  {METRICAS_CONFIG.filter(m => selectedMetrics.has(m.key)).map(cfg => (
                    <ModeloMetricBar
                      key={cfg.key}
                      cfg={cfg}
                      valA={modeloNormA?.[cfg.key] ?? 0}
                      valB={modeloNormB?.[cfg.key] ?? 0}
                      labelA={modeloA}
                      labelB={modeloB}
                      statsA={statsA?.[cfg.key]}
                      statsB={statsB?.[cfg.key]}
                    />
                  ))}
                  {selectedMetrics.size === 0 && (
                    <div style={{ color: '#6b6560', fontSize: 12 }}>
                      Selecione ao menos uma métrica acima.
                    </div>
                  )}
                </div>
              )}
            </SectionCard>
          )}
        </div>
      )}
    </div>
  )
}
