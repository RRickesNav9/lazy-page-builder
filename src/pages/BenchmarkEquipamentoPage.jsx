// BenchmarkEquipamentoPage.jsx
// Analisa desempenho de máquinas: individual vs. modelo, comparativo de períodos e modelos.
// Dados reais via dashboard_operational_view e media_equipamentos_porteira.

import { useState, useMemo, useRef, useEffect } from 'react'
import { useFilters } from '../lib/FilterContext'
import {
  useEquipamentoInterativo, useEquipamentoComparativo,
  useMaquinaMetricas, computeWeightedAvg,
  useAllEquipamentos, useModeloStats, useModeloMetricasCliente, useFilterOptions,
} from '../hooks/useData'
import MetricSelectorFAB from '../components/MetricSelectorFAB'
import { exportBenchmarkEquip } from '../lib/export'

// ─── CONFIGURAÇÃO ─────────────────────────────────────────────────────────────

// Todas as métricas não-absolutas disponíveis — modeloKey é o sufixo em media_equipamentos_porteira
const METRICAS_CONFIG = [
  { key: 'rendimento_operacional_hah',   modeloKey: 'rendimento_operacional_hah_modelo',   label: 'Rendimento Operacional',   unit: 'ha/h', d: 2, higherIsBetter: true  },
  { key: 'rendimento_real_hah',          modeloKey: 'rendimento_real_hah_modelo',          label: 'Rendimento Real',          unit: 'ha/h', d: 2, higherIsBetter: true  },
  { key: 'velocidade_media_kmh',         modeloKey: 'velocidade_media_kmh_modelo',         label: 'Velocidade Média Op.',     unit: 'km/h', d: 2, higherIsBetter: true  },
  { key: 'eficiencia_geral_pct',         modeloKey: 'eficiencia_geral_pct_modelo',         label: 'Eficiência Geral',         unit: '%',    d: 2, higherIsBetter: true  },
  { key: 'eficiencia_operacional_pct',   modeloKey: 'eficiencia_operacional_pct_modelo',   label: 'Eficiência Operacional',   unit: '%',    d: 2, higherIsBetter: true  },
  { key: 'disponibilidade_mecanica_pct', modeloKey: 'disponibilidade_mecanica_pct_modelo', label: 'Disponibilidade Mecânica', unit: '%',    d: 2, higherIsBetter: true  },
  { key: 'consumo_medio_lh',             modeloKey: 'consumo_medio_lh_modelo',             label: 'Consumo Médio',            unit: 'L/h',  d: 2, higherIsBetter: false },
  { key: 'consumo_medio_lha',            modeloKey: 'consumo_medio_lha_modelo',            label: 'Consumo Médio',            unit: 'L/ha', d: 2, higherIsBetter: false },
  { key: 'consumo_medio_efetivo_lh',     modeloKey: 'consumo_medio_efetivo_lh_modelo',     label: 'Consumo Médio Efetivo',    unit: 'L/h',  d: 2, higherIsBetter: false },
  { key: 'consumo_medio_efetivo_lha',    modeloKey: 'consumo_medio_efetivo_lha_modelo',    label: 'Consumo Médio Efetivo',    unit: 'L/ha', d: 2, higherIsBetter: false },
  { key: 'motor_ligado_pct',             modeloKey: 'motor_ligado_pct_modelo',             label: 'Motor Ligado',             unit: '%',    d: 2, higherIsBetter: true  },
  { key: 'motor_ocioso_pct',             modeloKey: 'motor_ocioso_pct_modelo',             label: 'Motor Ocioso',             unit: '%',    d: 2, higherIsBetter: false },
  { key: 'sem_apontamento_pct',          modeloKey: 'sem_apontamento_pct_modelo',          label: 'Sem Apontamento',          unit: '%',    d: 2, higherIsBetter: false },
  { key: 'rpm_medio',                    modeloKey: 'rpm_medio_modelo',                    label: 'RPM Médio',                unit: 'RPM',  d: 0, higherIsBetter: null  },
  { key: 'area_por_linha_ha',            modeloKey: 'area_por_linha_ha_modelo',            label: 'Área por Linha',           unit: 'ha',           d: 4, higherIsBetter: true  },
  { key: 'area_por_linha_24h',           modeloKey: null,                                  label: 'Área/Linha por 24h',       unit: 'ha/linha/dia',  d: 3, higherIsBetter: true  },
  { key: 'pes_plataforma_24h',           modeloKey: null,                                  label: 'Pés Plat. por 24h',        unit: 'ha/pé/dia',     d: 3, higherIsBetter: true  },
  { key: 'tempo_medio_turno_h',          modeloKey: null,                                  label: 'Turno Médio',              unit: 'h/equip/dia',   d: 1, higherIsBetter: true  },
]

const DEFAULT_SELECTED_METRICS = new Set([
  'rendimento_operacional_hah',
  'velocidade_media_kmh',
  'eficiencia_geral_pct',
  'disponibilidade_mecanica_pct',
  'consumo_medio_efetivo_lha',
  'consumo_medio_lh',
  'rpm_medio',
])

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

// Normaliza row de media_equipamentos_porteira para o mesmo shape das métricas (cfg.key → value).
// pes_plataforma_24h e area_por_linha_24h são computados em memória — não existem na tabela benchmark.
// Aceita rows do benchmark (chaves com sufixo _modelo) ou do computeWeightedAvg (chaves diretas).
function normalizarModeloRow(row) {
  if (!row) return null
  return Object.fromEntries(METRICAS_CONFIG.map(cfg => [
    cfg.key,
    cfg.modeloKey !== null
      ? (row[cfg.modeloKey] ?? row[cfg.key] ?? 0)
      : (row[`${cfg.key}_modelo`] ?? row[cfg.key] ?? 0),
  ]))
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

  // valor é chave composta "equipamento_cod|||cliente" para evitar colisão entre clientes
  const [selCod, selCliente] = (value || '').split('|||')
  const selected = equipamentos.find(e => e.equipamento_cod === selCod && e.cliente === selCliente)
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
                  key={`${e.equipamento_cod}|||${e.cliente}`}
                  onMouseDown={ev => ev.preventDefault()}
                  onClick={() => { onChange(`${e.equipamento_cod}|||${e.cliente}`); setSearch(''); setOpen(false) }}
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

function CompareRow({ cfg, valA, valB, labelA, labelB, isEven, dragProps }) {
  const { isDragging, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd } = dragProps ?? {}
  const status = computeStatus(valA, valB, cfg.higherIsBetter)
  const badge  = badgeProps(status)
  const diff   = fmtDiff(valA, valB)
  const maxVal = Math.max(valA || 0, valB || 0, 0.001)
  const diffColor = status === 'acima' ? '#1e4d1e' : status === 'abaixo' ? '#8b2020' : '#7a5c00'

  return (
    <tr
      draggable
      onDragStart={onDragStart}
      onDragOver={e => { e.preventDefault(); onDragOver?.() }}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        background: isDragging ? '#f0f7f0' : (isEven ? '#ffffff' : '#fafaf8'),
        opacity: isDragging ? 0.4 : 1,
        outline: isDragOver ? '2px dashed #2d4a2d' : 'none',
        outlineOffset: '-2px',
      }}
    >
      <td style={{ width: 20, textAlign: 'center', cursor: 'grab', color: '#c0bab4', userSelect: 'none', padding: '0 4px' }}>⠿</td>
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

function CompareTable({ metricasA, metricasB, labelA, labelB, config, onReorder }) {
  const [draggedKey,  setDraggedKey]  = useState(null)
  const [dragOverKey, setDragOverKey] = useState(null)
  const activeConfig = config ?? METRICAS_CONFIG
  const thStyle = {
    background: '#2d4a2d', color: '#fff', fontSize: 11, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.04em', padding: '6px 10px',
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: 28 }} />
            <th style={{ ...thStyle, textAlign: 'left' }}>Métrica</th>
            <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>{labelA}</th>
            <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>{labelB}</th>
            <th style={{ ...thStyle, textAlign: 'left', minWidth: 160 }}>Comparativo visual</th>
            <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>Diferença</th>
            <th style={{ ...thStyle, textAlign: 'center', width: 70 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {activeConfig.map((cfg, i) => (
            <CompareRow
              key={cfg.key}
              cfg={cfg}
              valA={metricasA?.[cfg.key] ?? 0}
              valB={metricasB?.[cfg.key] ?? 0}
              labelA={labelA}
              labelB={labelB}
              isEven={i % 2 === 0}
              dragProps={{
                isDragging: draggedKey === cfg.key,
                isDragOver: dragOverKey === cfg.key && draggedKey !== cfg.key,
                onDragStart: () => setDraggedKey(cfg.key),
                onDragOver: () => setDragOverKey(cfg.key),
                onDrop: () => { if (draggedKey && onReorder) onReorder(draggedKey, cfg.key); setDraggedKey(null); setDragOverKey(null) },
                onDragEnd: () => { setDraggedKey(null); setDragOverKey(null) },
              }}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── CABEÇALHO DINÂMICO ───────────────────────────────────────────────────────

// extraFields: [{ label, value }] — campos adicionais por aba, renderizados após os campos base
function DynamicHeader({ processo, tipoSafra, safra, extraFields = [] }) {
  const fieldStyle  = { display: 'flex', flexDirection: 'column', gap: 2 }
  const labelStyle  = { fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)' }
  const valueStyle  = { fontSize: 14, fontWeight: 700, color: '#ffffff' }
  const divStyle    = { width: 1, height: 32, background: 'rgba(255,255,255,0.2)', flexShrink: 0 }
  return (
    <div style={{
      background: '#2d4a2d', borderRadius: 8,
      padding: '14px 20px', marginBottom: 20,
      display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
      breakAfter: 'avoid', pageBreakAfter: 'avoid',
    }}>
      <div style={fieldStyle}>
        <span style={labelStyle}>Processo</span>
        <span style={valueStyle}>{processo || '—'}</span>
      </div>
      <div style={divStyle} />
      <div style={fieldStyle}>
        <span style={labelStyle}>Cultura</span>
        <span style={valueStyle}>{tipoSafra || 'Todas'}</span>
      </div>
      <div style={divStyle} />
      <div style={fieldStyle}>
        <span style={labelStyle}>Safra</span>
        <span style={valueStyle}>{safra || '—'}</span>
      </div>
      {extraFields.flatMap(f => [
        <div key={`div-${f.label}`} style={divStyle} />,
        <div key={f.label} style={fieldStyle}>
          <span style={labelStyle}>{f.label}</span>
          <span style={valueStyle}>{f.value}</span>
        </div>,
      ])}
    </div>
  )
}

// ─── SELETOR DE CLIENTE (TAB 3) ──────────────────────────────────────────────

// clientes: string[] com os nomes reais; 'grupo' é o valor sentinela para o grupo porteira.
function ClienteSelect({ label, value, onChange, clientes }) {
  return (
    <div style={{ flex: 1 }}>
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '6px 8px', boxSizing: 'border-box',
          fontSize: 12, color: '#1a1a1a', background: '#fff',
          border: '1px solid #e0dbd4', borderRadius: 4, outline: 'none', cursor: 'pointer',
        }}
      >
        <option value="grupo">Grupo</option>
        {clientes.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  )
}

// Seletor de período por lado no Tab 3 — modo "Safra" ou "Período personalizado"
function PeriodoModeloSelect({ value, onChange, safraOptions, defaultSafraLabel }) {
  const { periodoMode, safra, dataInicio, dataFim } = value
  const modeBtn = (m, text) => (
    <button
      key={m}
      onClick={() => onChange({ ...value, periodoMode: m })}
      style={{
        padding: '3px 10px', fontSize: 11, borderRadius: 3, cursor: 'pointer',
        border: '1px solid #e0dbd4',
        background: periodoMode === m ? '#2d4a2d' : '#f7f5f2',
        color: periodoMode === m ? '#fff' : '#6b6560',
        fontWeight: periodoMode === m ? 600 : 400,
      }}
    >
      {text}
    </button>
  )
  return (
    <div>
      <FieldLabel>Período</FieldLabel>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {modeBtn('safra', 'Safra')}
        {modeBtn('periodo', 'Personalizado')}
      </div>
      {periodoMode === 'safra' ? (
        <select
          value={safra}
          onChange={e => onChange({ ...value, safra: e.target.value })}
          style={{
            width: '100%', padding: '6px 8px', boxSizing: 'border-box',
            fontSize: 12, color: '#1a1a1a', background: '#fff',
            border: '1px solid #e0dbd4', borderRadius: 4, outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">Padrão ({defaultSafraLabel})</option>
          {safraOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      ) : (
        <DateRangeInputs
          inicio={dataInicio}
          fim={dataFim}
          onInicio={v => onChange({ ...value, dataInicio: v })}
          onFim={v => onChange({ ...value, dataFim: v })}
        />
      )}
    </div>
  )
}

// ─── TAB 3: SELETOR DE MÉTRICAS + BARRAS MODELO VS MODELO ────────────────────


// statsA/statsB: { min, max, n } para a métrica, vindos de useModeloStats
function ModeloMetricBar({ cfg, valA, valB, labelA, labelB, statsA, statsB }) {
  const allVals = [valA || 0, valB || 0, statsA?.min || 0, statsA?.max || 0, statsB?.min || 0, statsB?.max || 0]
  const maxVal = Math.max(...allVals, 0.001)

  return (
    <div style={{ marginBottom: 12, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
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
          <div key={label} style={{ marginBottom: 4 }}>
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
  const { filters, queryFilters, benchmarkSafra, registerExportFn } = useFilters()

  const [activeTab, setActiveTab] = useState('maquina-modelo')
  const [tab1Cod, setTab1Cod]     = useState('')
  const [sideA, setSideA]         = useState({ cod: '', dataInicio: '', dataFim: '' })
  const [sideB, setSideB]         = useState({ cod: '', dataInicio: '', dataFim: '' })
  const [m3A, setM3A] = useState({ modelo: '', cliente: 'grupo', periodoMode: 'safra', safra: '', dataInicio: '', dataFim: '' })
  const [m3B, setM3B] = useState({ modelo: '', cliente: 'grupo', periodoMode: 'safra', safra: '', dataInicio: '', dataFim: '' })
  const [selectedMetrics, setSelectedMetrics] = useState([...DEFAULT_SELECTED_METRICS])

  // O filtro global já garante que processo é Colheita ou Plantio nesta página (via App.jsx + cascade do FAB).
  // processoFiltro é apenas o valor normalizado para passar aos hooks.
  const processoFiltro  = filters.processos?.[0] || null
  const tipoSafraLabel  = filters.tipos_safra?.length > 1
    ? `${filters.tipos_safra.length} culturas`
    : filters.tipos_safra?.[0] || undefined

  function toggleMetric(key) {
    setSelectedMetrics(prev => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev
        return prev.filter(k => k !== key)
      }
      return [...prev, key]
    })
  }

  function handleReorder(fromKey, toKey) {
    setSelectedMetrics(prev => {
      const from = prev.indexOf(fromKey)
      const to   = prev.indexOf(toKey)
      if (from === -1 || to === -1 || from === to) return prev
      const next = [...prev]
      next.splice(from, 1)
      next.splice(to, 0, fromKey)
      return next
    })
  }

  const orderedConfig = useMemo(
    () => selectedMetrics.map(key => METRICAS_CONFIG.find(m => m.key === key)).filter(Boolean),
    [selectedMetrics]
  )

  // ── hooks compartilhados ───────────────────────────────────────────────────

  // Todas as máquinas do grupo, agrupadas por cliente no select.
  // allowedProcessos restringe a busca a Colheita/Plantio mesmo sem processo específico selecionado.
  const { equipamentos } = useAllEquipamentos({
    ...(processoFiltro     && { processo:      processoFiltro }),
    ...(filters.tipos_safra?.[0] && { tipo_safra:    filters.tipos_safra?.[0] }),
    allowedProcessos: ['Colheita', 'Plantio'],
    solinftecOnly: true,
  })

  // Fetch único para todos os modelos da safra de referência (breakdown já aplicado internamente)
  const { data: allModelosData, loading: loadingModelos } = useEquipamentoInterativo(
    benchmarkSafra,
    processoFiltro || undefined,
    filters.tipos_safra?.[0] || undefined,
  )

  // Safra anterior para fallback de Tab 1: no início de uma safra nova, modelos ainda não têm
  // registros com consumo_medio_lh > 0 suficientes — usa a safra passada como referência.
  const prevSafra = useMemo(() => {
    if (!benchmarkSafra) return null
    const year = parseInt(benchmarkSafra.split('/')[0], 10)
    return `${year - 1}/${year}`
  }, [benchmarkSafra])

  const { data: prevModelosData, loading: loadingPrevModelos } = useEquipamentoInterativo(
    prevSafra,
    processoFiltro || undefined,
    filters.tipos_safra?.[0] || undefined,
  )

  // ── Tab 1: Máquina vs. Modelo ──────────────────────────────────────────────

  // tab1Cod é chave composta "equipamento_cod|||cliente" — separa máquinas de clientes diferentes com mesmo código
  const [tab1EquipCod, tab1Cliente] = tab1Cod ? tab1Cod.split('|||') : [null, null]
  const maqInfo1 = equipamentos.find(e => e.equipamento_cod === tab1EquipCod && e.cliente === tab1Cliente)
  // Tab 1 é sempre safra-scoped — o período global (inclusive 'historico') não se aplica aqui porque
  // o benchmark de modelo é intrinsecamente por safra. dataInicio/dataFim conflitariam com referenciaSafra passada.
  const { metricas: maqMetricas, loading: loadingMaq } = useMaquinaMetricas({
    ...(tab1EquipCod && { equipamento_cod: tab1EquipCod }),
    ...(tab1Cliente  && { cliente: tab1Cliente }),
    ...(processoFiltro && { processo: processoFiltro }),
    ...(filters.tipos_safra?.[0] && { tipo_safra: filters.tipos_safra?.[0] }),
    safra: benchmarkSafra,
  })
  const modeloNorm1 = useMemo(() => {
    const fromCurrent = allModelosData.find(r => r.modelo_equipamento === maqInfo1?.modelo)
    const fromPrev    = prevModelosData.find(r => r.modelo_equipamento === maqInfo1?.modelo)
    return normalizarModeloRow(fromCurrent ?? fromPrev ?? null)
  }, [allModelosData, prevModelosData, maqInfo1])
  const loadingModelo1 = loadingModelos || loadingPrevModelos

  // ── Tab 2: Equipamento vs. Equipamento ────────────────────────────────────

  // sideA.cod e sideB.cod são chaves compostas "equipamento_cod|||cliente"
  const [tab2CodA, tab2ClienteA] = sideA.cod ? sideA.cod.split('|||') : [null, null]
  const [tab2CodB, tab2ClienteB] = sideB.cod ? sideB.cod.split('|||') : [null, null]

  const tab2FiltersA = tab2CodA ? {
    equipamento_cod: tab2CodA,
    ...(tab2ClienteA  && { cliente: tab2ClienteA }),
    ...(processoFiltro && { processo: processoFiltro }),
    ...(filters.tipos_safra?.[0] && { tipo_safra: filters.tipos_safra?.[0] }),
    ...(sideA.dataInicio   && { dataInicio: sideA.dataInicio }),
    ...(sideA.dataFim      && { dataFim:    sideA.dataFim    }),
  } : {}
  const tab2FiltersB = tab2CodB ? {
    equipamento_cod: tab2CodB,
    ...(tab2ClienteB  && { cliente: tab2ClienteB }),
    ...(processoFiltro && { processo: processoFiltro }),
    ...(filters.tipos_safra?.[0] && { tipo_safra: filters.tipos_safra?.[0] }),
    ...(sideB.dataInicio   && { dataInicio: sideB.dataInicio }),
    ...(sideB.dataFim      && { dataFim:    sideB.dataFim    }),
  } : {}
  const { dataA, dataB, loading: loadingEquip } = useEquipamentoComparativo(tab2FiltersA, tab2FiltersB)
  const metricasEquipA = useMemo(() => computeWeightedAvg(dataA), [dataA])
  const metricasEquipB = useMemo(() => computeWeightedAvg(dataB), [dataB])

  const maqInfoA = equipamentos.find(e => e.equipamento_cod === tab2CodA && e.cliente === tab2ClienteA)
  const maqInfoB = equipamentos.find(e => e.equipamento_cod === tab2CodB && e.cliente === tab2ClienteB)
  const labelEquipA = maqInfoA
    ? `${maqInfoA.equipamento_cod} — ${maqInfoA.equipamento}${sideA.dataInicio ? ' (' + sideA.dataInicio + ')' : ''}`
    : 'Equipamento A'
  const labelEquipB = maqInfoB
    ? `${maqInfoB.equipamento_cod} — ${maqInfoB.equipamento}${sideB.dataInicio ? ' (' + sideB.dataInicio + ')' : ''}`
    : 'Equipamento B'

  // ── Tab 3: Modelo vs. Modelo ───────────────────────────────────────────────

  const { safras: safraOptions } = useFilterOptions()

  const modeloOptions = useMemo(
    () => [...new Set(allModelosData.map(r => r.modelo_equipamento).filter(Boolean))].sort(),
    [allModelosData]
  )

  // Lista de clientes para os seletores de Tab 3 (deriva dos equipamentos já carregados)
  const clienteOptions = useMemo(
    () => [...new Set(equipamentos.map(e => e.cliente).filter(Boolean))].sort(),
    [equipamentos]
  )

  // Monta os parâmetros de filtro por lado — safra ou intervalo customizado
  const m3ParamsA = {
    modelo_equipamento: m3A.modelo || undefined,
    cliente: m3A.cliente !== 'grupo' ? m3A.cliente : undefined,
    ...(m3A.periodoMode === 'safra'
      ? { safra: m3A.safra || benchmarkSafra }
      : { dataInicio: m3A.dataInicio, dataFim: m3A.dataFim }
    ),
    ...(processoFiltro           && { processo:   processoFiltro }),
    ...(filters.tipos_safra?.[0] && { tipo_safra: filters.tipos_safra?.[0] }),
  }
  const m3ParamsB = {
    modelo_equipamento: m3B.modelo || undefined,
    cliente: m3B.cliente !== 'grupo' ? m3B.cliente : undefined,
    ...(m3B.periodoMode === 'safra'
      ? { safra: m3B.safra || benchmarkSafra }
      : { dataInicio: m3B.dataInicio, dataFim: m3B.dataFim }
    ),
    ...(processoFiltro           && { processo:   processoFiltro }),
    ...(filters.tipos_safra?.[0] && { tipo_safra: filters.tipos_safra?.[0] }),
  }

  const { metricas: metricasClienteA, loading: loadingClienteA } = useModeloMetricasCliente(m3ParamsA)
  const { metricas: metricasClienteB, loading: loadingClienteB } = useModeloMetricasCliente(m3ParamsB)

  const modeloNormA = useMemo(() => normalizarModeloRow(metricasClienteA), [metricasClienteA])
  const modeloNormB = useMemo(() => normalizarModeloRow(metricasClienteB), [metricasClienteB])

  const modeloStatsFilters = {
    ...(processoFiltro && { processo: processoFiltro }),
    ...(filters.tipos_safra?.[0] && { tipo_safra: filters.tipos_safra?.[0] }),
  }
  const { stats: statsA } = useModeloStats({
    ...modeloStatsFilters,
    safra: m3A.periodoMode === 'safra' ? (m3A.safra || benchmarkSafra) : benchmarkSafra,
    ...(m3A.modelo && { modelo_equipamento: m3A.modelo }),
    ...(m3A.cliente !== 'grupo' && { cliente: m3A.cliente }),
  })
  const { stats: statsB } = useModeloStats({
    ...modeloStatsFilters,
    safra: m3B.periodoMode === 'safra' ? (m3B.safra || benchmarkSafra) : benchmarkSafra,
    ...(m3B.modelo && { modelo_equipamento: m3B.modelo }),
    ...(m3B.cliente !== 'grupo' && { cliente: m3B.cliente }),
  })

  const exportRef = useRef({})
  exportRef.current = {
    activeTab,
    maqLabel: maqInfo1 ? `${maqInfo1.equipamento_cod} — ${maqInfo1.equipamento}` : 'Máquina',
    modeloLabel: maqInfo1?.modelo || 'Referência Modelo',
    maqMetricas,
    modeloMetricas: modeloNorm1,
    labelA: labelEquipA,
    labelB: labelEquipB,
    equipMetricasA: metricasEquipA,
    equipMetricasB: metricasEquipB,
    modeloMetricasA: modeloNormA,
    modeloMetricasB: modeloNormB,
    fetchFilters: {
      safra: benchmarkSafra,
      ...(processoFiltro && { processo: processoFiltro }),
      ...(filters.tipos_safra?.[0] && { tipo_safra: filters.tipos_safra[0] }),
    },
  }
  useEffect(() => {
    registerExportFn(() => exportBenchmarkEquip(exportRef.current))
    return () => registerExportFn(null)
  }, [registerExportFn])

  return (
    <div style={{ padding: '24px', maxWidth: 1280, margin: '0 auto' }}>
      {(filters.metricFilters ?? []).some(f => f.field && f.value !== '' && f.value != null) && (
        <div style={{ background: '#edf5ed', border: '1px solid #4a6741', borderRadius: 6, padding: '8px 14px', marginBottom: 18, fontSize: 12, color: '#1e4d1e' }}>
          Filtro de métrica ativo nesta safra — os resultados refletem o período e dimensões selecionados.
        </div>
      )}
      <div data-pdf-exclude="true">
        <TabControl tabs={TABS} active={activeTab} onChange={setActiveTab} />
      </div>

      {/* ── TAB 1: MÁQUINA VS. MODELO ──────────────────────────────────────── */}
      {activeTab === 'maquina-modelo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div data-pdf-exclude="true">
            <SectionCard>
              <MaquinaSelect
                label="Máquina"
                value={tab1Cod}
                onChange={setTab1Cod}
                equipamentos={equipamentos}
              />
            </SectionCard>
          </div>

          <DynamicHeader
            processo={processoFiltro}
            tipoSafra={tipoSafraLabel}
            safra={benchmarkSafra}
            extraFields={[
              { label: 'Equipamento', value: maqInfo1 ? `${maqInfo1.equipamento_cod} — ${maqInfo1.equipamento}` : '—' },
              { label: 'Modelo',      value: maqInfo1?.modelo || '—' },
            ]}
          />

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
                emptyText={maqMetricas && !modeloNorm1
                  ? 'Equipamento sem modelo de referência cadastrado.'
                  : 'Sem dados operacionais para os filtros selecionados.'}
              />
              {!loadingMaq && !loadingModelo1 && maqMetricas && modeloNorm1 && (
                <CompareTable
                  metricasA={maqMetricas}
                  metricasB={modeloNorm1}
                  labelA={maqInfo1 ? `${maqInfo1.equipamento_cod} — ${maqInfo1.equipamento}` : tab1Cod}
                  labelB={maqInfo1?.modelo ? `${maqInfo1.modelo} — Porteira` : 'Média modelo'}
                  config={orderedConfig}
                  onReorder={handleReorder}
                />
              )}
            </SectionCard>
          )}
        </div>
      )}

      {/* ── TAB 2: EQUIPAMENTO VS. EQUIPAMENTO ─────────────────────────────── */}
      {activeTab === 'equip-equip' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div data-pdf-exclude="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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

          <DynamicHeader
            processo={processoFiltro}
            tipoSafra={tipoSafraLabel}
            safra={benchmarkSafra}
            extraFields={[
              { label: 'Equip. A', value: maqInfoA ? `${maqInfoA.equipamento_cod} — ${maqInfoA.equipamento}` : '—' },
              { label: 'Equip. B', value: maqInfoB ? `${maqInfoB.equipamento_cod} — ${maqInfoB.equipamento}` : '—' },
            ]}
          />

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
                  config={orderedConfig}
                  onReorder={handleReorder}
                />
              )}
            </SectionCard>
          )}
        </div>
      )}

      {/* ── TAB 3: MODELO VS. MODELO ────────────────────────────────────────── */}
      {activeTab === 'modelo-modelo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div data-pdf-exclude="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <SectionCard title="Modelo A">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <ModeloSelect label="Modelo" value={m3A.modelo} onChange={modelo => setM3A(p => ({ ...p, modelo }))} modelos={modeloOptions} />
                <ClienteSelect label="Cliente" value={m3A.cliente} onChange={cliente => setM3A(p => ({ ...p, cliente }))} clientes={clienteOptions} />
                <PeriodoModeloSelect value={m3A} onChange={setM3A} safraOptions={safraOptions} defaultSafraLabel={benchmarkSafra} />
              </div>
            </SectionCard>
            <SectionCard title="Modelo B">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <ModeloSelect label="Modelo" value={m3B.modelo} onChange={modelo => setM3B(p => ({ ...p, modelo }))} modelos={modeloOptions} />
                <ClienteSelect label="Cliente" value={m3B.cliente} onChange={cliente => setM3B(p => ({ ...p, cliente }))} clientes={clienteOptions} />
                <PeriodoModeloSelect value={m3B} onChange={setM3B} safraOptions={safraOptions} defaultSafraLabel={benchmarkSafra} />
              </div>
            </SectionCard>
          </div>

          {(() => {
            const labelA = m3A.modelo ? `${m3A.modelo}${m3A.cliente !== 'grupo' ? ` — ${m3A.cliente}` : ' — Grupo'}` : '—'
            const labelB = m3B.modelo ? `${m3B.modelo}${m3B.cliente !== 'grupo' ? ` — ${m3B.cliente}` : ' — Grupo'}` : '—'
            const loadingTab3 = loadingModelos || loadingClienteA || loadingClienteB
            return (
              <>
                <DynamicHeader
                  processo={processoFiltro}
                  tipoSafra={tipoSafraLabel}
                  safra={benchmarkSafra}
                  extraFields={[
                    { label: 'Modelo A', value: labelA },
                    { label: 'Modelo B', value: labelB },
                  ]}
                />

                {(m3A.modelo || m3B.modelo) && (
                  <SectionCard
                    title="Comparativo de Modelos"
                    subtitle={`${labelA} vs. ${labelB}`}
                  >
                    <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                      {[
                        { color: '#2d4a2d', label: labelA },
                        { color: '#c8960c', label: labelB },
                      ].map(({ color, label }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#6b6560' }}>
                          <span style={{ width: 10, height: 10, background: color, borderRadius: 2, display: 'inline-block', flexShrink: 0 }} />
                          {label}
                        </div>
                      ))}
                    </div>

                    <StateMsg
                      loading={loadingTab3}
                      empty={!loadingTab3 && !modeloNormA && !modeloNormB}
                      emptyText="Selecione os modelos para comparar."
                    />

                    {!loadingTab3 && (modeloNormA || modeloNormB) && (
                      <div>
                        {orderedConfig.map(cfg => (
                          <ModeloMetricBar
                            key={cfg.key}
                            cfg={cfg}
                            valA={modeloNormA?.[cfg.key] ?? 0}
                            valB={modeloNormB?.[cfg.key] ?? 0}
                            labelA={labelA}
                            labelB={labelB}
                            statsA={statsA?.[cfg.key]}
                            statsB={statsB?.[cfg.key]}
                          />
                        ))}
                        {selectedMetrics.length === 0 && (
                          <div style={{ color: '#6b6560', fontSize: 12 }}>
                            Selecione ao menos uma métrica no botão flutuante.
                          </div>
                        )}
                      </div>
                    )}
                  </SectionCard>
                )}
              </>
            )
          })()}
        </div>
      )}
      <MetricSelectorFAB config={METRICAS_CONFIG} selected={new Set(selectedMetrics)} onToggle={toggleMetric} />
    </div>
  )
}
