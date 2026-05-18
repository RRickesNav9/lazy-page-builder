// BenchmarkJohnDeerePage.jsx
// Benchmark exclusivo John Deere — 4 abas por processo (Plantio, Colheita, Preparo do Solo, Aplicação).
// Dados derivados de dashboard_operational_view filtrado por data_provider_id JD.
// Métricas disponíveis: rendimento, velocidade, consumo L/h, consumo L/ha, área por linha (Plantio), turno.
// Não aparece nas páginas de Análise Geral, Benchmark Equipamento ou Benchmark Cliente.

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useFilters } from '../lib/FilterContext'
import { useClienteBenchmarkJD, useAllClientesBenchmarkJD } from '../hooks/useData'
import MetricSelectorFAB from '../components/MetricSelectorFAB'
import { exportBenchmarkJD } from '../lib/export'

// ─── CONFIGURAÇÃO ─────────────────────────────────────────────────────────────

const ALL_METRICAS_CONFIG = [
  {
    key: 'rendimento_operacional_hah',
    label: 'Rendimento Operacional',
    sub: 'ha/h',
    fmt: (v) => (v != null && v > 0) ? v.toFixed(2) : '—',
    higherIsBetter: true,
    isPct: false,
  },
  {
    key: 'velocidade_media_kmh',
    label: 'Velocidade Média',
    sub: 'km/h',
    fmt: (v) => (v != null && v > 0) ? v.toFixed(2) : '—',
    higherIsBetter: true,
    isPct: false,
  },
  {
    key: 'consumo_medio_lh',
    label: 'Consumo Médio',
    sub: 'L/h',
    fmt: (v) => (v != null && v > 0) ? v.toFixed(2) : '—',
    higherIsBetter: false,
    isPct: false,
  },
  {
    key: 'consumo_medio_lha',
    label: 'Consumo L/ha',
    sub: 'L/ha',
    fmt: (v) => (v != null && v > 0) ? v.toFixed(2) : '—',
    higherIsBetter: false,
    isPct: false,
  },
  {
    key: 'area_por_linha_ha',
    label: 'Área por Linha',
    sub: 'ha · apenas Plantio',
    fmt: (v) => (v != null && v > 0) ? v.toFixed(4) : '—',
    higherIsBetter: true,
    isPct: false,
  },
  {
    key: 'tempo_medio_turno_h',
    label: 'Tempo Médio de Turno',
    sub: 'h/equip/dia',
    fmt: (v) => (v != null && v > 0) ? v.toFixed(1) + 'h' : '—',
    higherIsBetter: true,
    isPct: false,
  },
]

const DEFAULT_SELECTED_METRICS = [
  'rendimento_operacional_hah',
  'velocidade_media_kmh',
  'consumo_medio_lh',
  'consumo_medio_lha',
  'tempo_medio_turno_h',
]

const JD_TABS = [
  { id: 'plantio',   label: 'Plantio',        processo: 'Plantio'         },
  { id: 'colheita',  label: 'Colheita',        processo: 'Colheita'        },
  { id: 'preparo',   label: 'Preparo do Solo', processo: 'Preparo do solo' },
  { id: 'aplicacao', label: 'Aplicação',       processo: 'Aplicação'       },
]

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function computeStatus(clienteVal, grupoVal, higherIsBetter) {
  if (!grupoVal) return 'referencia'
  const ratio = clienteVal / grupoVal
  if (higherIsBetter) {
    if (ratio >= 1.10) return 'acima'
    if (ratio >= 0.90) return 'na-media'
    return 'abaixo'
  }
  if (ratio <= 0.90) return 'acima'
  if (ratio <= 1.10) return 'na-media'
  return 'abaixo'
}

function fmtPctDiff(clienteVal, grupoVal) {
  if (!grupoVal || grupoVal === 0) return '—'
  const pct = (clienteVal / grupoVal - 1) * 100
  const sign = pct >= 0 ? '+' : '−'
  return `${sign}${Math.abs(pct).toFixed(1)}%`
}

function statusBadgeProps(status) {
  const MAP = {
    'acima':      { bg: '#edf5ed', fg: '#1e4d1e', text: 'Acima'      },
    'na-media':   { bg: '#fdf6e3', fg: '#7a5c00', text: 'Na média'   },
    'abaixo':     { bg: '#fdf0f0', fg: '#8b2020', text: 'Abaixo'     },
    'referencia': { bg: '#f0ede8', fg: '#4a3728', text: 'Referência' },
  }
  return MAP[status] ?? MAP['referencia']
}

function clienteBarColor(status) {
  if (status === 'acima')    return '#2d4a2d'
  if (status === 'na-media') return '#c8960c'
  return '#8b2020'
}

function computeZoneBoundaries(clienteRows, metricKey, higherIsBetter) {
  const vals = clienteRows.map(r => r[metricKey]).filter(v => v != null && v > 0)
  if (vals.length < 2) return null
  const mn = Math.min(...vals)
  const mx = Math.max(...vals)
  if (mn === mx) return null
  return higherIsBetter ? { bad: mn, good: mx } : { bad: mx, good: mn }
}

// ─── COMPONENTES INTERNOS ─────────────────────────────────────────────────────

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

function DynamicHeader({ cliente, processo, tipoSafra }) {
  const fieldStyle  = { display: 'flex', flexDirection: 'column', gap: 2 }
  const labelStyle  = { fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)' }
  const valueStyle  = { fontSize: 14, fontWeight: 700, color: '#ffffff' }
  const dividerStyle = { width: 1, height: 32, background: 'rgba(255,255,255,0.2)', flexShrink: 0 }

  return (
    <div style={{
      background: '#2d4a2d', borderRadius: 8,
      padding: '14px 20px', marginBottom: 20,
      display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
    }}>
      <div style={fieldStyle}>
        <span style={labelStyle}>Provedor</span>
        <span style={valueStyle}>John Deere</span>
      </div>
      <div style={dividerStyle} />
      <div style={fieldStyle}>
        <span style={labelStyle}>Cliente</span>
        <span style={valueStyle}>{cliente || 'Todos'}</span>
      </div>
      <div style={dividerStyle} />
      <div style={fieldStyle}>
        <span style={labelStyle}>Processo</span>
        <span style={valueStyle}>{processo || '—'}</span>
      </div>
      {tipoSafra && (
        <>
          <div style={dividerStyle} />
          <div style={fieldStyle}>
            <span style={labelStyle}>Tipo de cultura</span>
            <span style={valueStyle}>{tipoSafra}</span>
          </div>
        </>
      )}
    </div>
  )
}

function Legenda({ cliente }) {
  return (
    <div style={{ display: 'flex', gap: 18, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 10, color: '#6b6560' }}>
        <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18 }}>
          <span style={{ display: 'block', width: 11, height: 11, background: '#4a3728', transform: 'rotate(45deg)', boxShadow: '0 0 0 2px white, 0 1px 4px rgba(0,0,0,0.3)' }} />
        </span>
        {cliente || 'Cliente'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 10, color: '#6b6560' }}>
        <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18 }}>
          <span style={{ display: 'block', width: 14, height: 14, borderRadius: '50%', background: '#c8960c', border: '3px solid white', boxShadow: '0 1px 5px rgba(0,0,0,0.25)' }} />
        </span>
        Média dos clientes JD
      </div>
    </div>
  )
}

function SectionCard({ title, subtitle, children }) {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e0dbd4', borderRadius: 6, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#4a3728', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {title}
        </span>
        {subtitle && <span style={{ fontSize: 8, color: '#6b6560' }}>{subtitle}</span>}
      </div>
      {children}
    </div>
  )
}

// Gauge linear com 3 zonas — idêntico ao BenchmarkClientePage
function LinearGauge({ clienteVal, grupoVal, zones, fmt }) {
  function ClientMarker({ pct }) {
    return (
      <>
        <span style={{
          position: 'absolute', left: `${pct}%`, top: -22,
          transform: 'translateX(-50%)', fontSize: 8, fontWeight: 700, color: '#4a3728',
          whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.95)',
          padding: '1px 3px', borderRadius: 2, zIndex: 9, lineHeight: '12px',
        }}>
          {fmt(clienteVal)}
        </span>
        <div style={{
          position: 'absolute', left: `${pct}%`, top: '50%',
          width: 13, height: 13, background: '#4a3728',
          transform: 'translate(-50%, -50%) rotate(45deg)',
          zIndex: 8, boxShadow: '0 0 0 2.5px white, 0 1px 5px rgba(0,0,0,0.3)',
        }} />
      </>
    )
  }

  function GrupoMarker({ pct }) {
    return (
      <>
        <div style={{
          position: 'absolute', left: `${pct}%`, top: 0, height: 10,
          width: 3, background: '#c8960c', transform: 'translateX(-50%)', zIndex: 3,
        }} />
        <div style={{
          position: 'absolute', left: `${pct}%`, top: '50%',
          width: 18, height: 18, borderRadius: '50%',
          background: '#c8960c', border: '3px solid white',
          boxShadow: '0 1px 5px rgba(0,0,0,0.3)',
          transform: 'translate(-50%, -50%)', zIndex: 6,
        }} />
      </>
    )
  }

  if (!zones) {
    const scaleMax   = Math.max(clienteVal, grupoVal, 0.001) * 1.1
    const clientePct = Math.min((clienteVal / scaleMax) * 100, 100)
    const grupoPct   = Math.min((grupoVal   / scaleMax) * 100, 100)
    return (
      <div style={{ minWidth: 180, paddingTop: 26 }}>
        <div style={{ height: 10, borderRadius: 5, background: '#f0ede8', position: 'relative', overflow: 'visible' }}>
          <GrupoMarker pct={grupoPct} />
          <ClientMarker pct={clientePct} />
        </div>
        <div style={{ position: 'relative', height: 16, marginTop: 6 }}>
          <span style={{ position: 'absolute', left: `${grupoPct}%`, top: 0, transform: 'translateX(-50%)', fontSize: 7, fontWeight: 700, color: '#c8960c', whiteSpace: 'nowrap' }}>
            {fmt(grupoVal)}
          </span>
        </div>
      </div>
    )
  }

  const { bad, good, higherIsBetter } = zones
  const Z = 100 / 3
  const validScale = higherIsBetter
    ? (bad > 0 && grupoVal > bad && good > grupoVal)
    : (good > 0 && grupoVal > good && bad > grupoVal)
  const maxBound = higherIsBetter ? good : bad
  const maxVal   = Math.max(clienteVal, grupoVal, maxBound > 0 ? maxBound : 0, 0.001) * 1.2

  function toPct(v) {
    if (v <= 0) return 0
    const half = Z / 2
    const gCtr = Z * 2.5
    if (validScale) {
      if (higherIsBetter) {
        if (v <= bad)      return (v / bad) * half
        if (v <= grupoVal) return half + ((v - bad)      / (grupoVal - bad))      * (50 - half)
        if (v <= good)     return 50   + ((v - grupoVal) / (good - grupoVal))     * (gCtr - 50)
        return Math.min(gCtr + ((v - good) / (maxVal - good)) * (100 - gCtr), 100)
      } else {
        if (v <= good)     return (v / good) * half
        if (v <= grupoVal) return half + ((v - good)     / (grupoVal - good))     * (50 - half)
        if (v <= bad)      return 50   + ((v - grupoVal) / (bad - grupoVal))      * (gCtr - 50)
        return Math.min(gCtr + ((v - bad) / (maxVal - bad)) * (100 - gCtr), 100)
      }
    } else {
      if (higherIsBetter) {
        if (v <= bad)  return (v / bad)  * half
        if (v <= good) return half + ((v - bad)  / (good - bad))  * (gCtr - half)
        return Math.min(gCtr + ((v - good) / (maxVal - good)) * (100 - gCtr), 100)
      } else {
        if (v <= good) return (v / good) * half
        if (v <= bad)  return half + ((v - good) / (bad - good))  * (gCtr - half)
        return Math.min(gCtr + ((v - bad) / (maxVal - bad)) * (100 - gCtr), 100)
      }
    }
  }

  const clientePct   = toPct(clienteVal)
  const grupoPct     = validScale ? 50 : toPct(grupoVal)
  const badLabelPct  = toPct(bad)
  const goodLabelPct = toPct(good)
  const badColor     = higherIsBetter ? '#a02d20' : '#2a5c2a'
  const goodColor    = higherIsBetter ? '#2a5c2a' : '#a02d20'
  const zoneSegs     = higherIsBetter
    ? [{ left: 0, color: '#c0392b', r: '5px 0 0 5px' }, { left: Z, color: '#e8a200', r: '0' }, { left: 2*Z, color: '#3a7d3a', r: '0 5px 5px 0' }]
    : [{ left: 0, color: '#3a7d3a', r: '5px 0 0 5px' }, { left: Z, color: '#e8a200', r: '0' }, { left: 2*Z, color: '#c0392b', r: '0 5px 5px 0' }]

  return (
    <div style={{ minWidth: 180, paddingTop: 26 }}>
      <div style={{ height: 10, borderRadius: 5, position: 'relative', overflow: 'visible' }}>
        {zoneSegs.map((z, i) => (
          <div key={i} style={{ position: 'absolute', left: `${z.left}%`, width: `${Z}%`, top: 0, height: '100%', background: z.color, borderRadius: z.r }} />
        ))}
        <GrupoMarker pct={grupoPct} />
        <ClientMarker pct={clientePct} />
      </div>
      <div style={{ position: 'relative', height: 28, marginTop: 5 }}>
        <span style={{ position: 'absolute', left: `${grupoPct}%`, top: 0, transform: 'translateX(-50%)', fontSize: 7, fontWeight: 700, color: '#c8960c', whiteSpace: 'nowrap' }}>
          {fmt(grupoVal)}
        </span>
        <span style={{ position: 'absolute', left: `${badLabelPct}%`, top: 14, transform: 'translateX(-50%)', fontSize: 7, fontWeight: 600, color: badColor, whiteSpace: 'nowrap' }}>
          {fmt(bad)}
        </span>
        <span style={{ position: 'absolute', left: `${goodLabelPct}%`, top: 14, transform: 'translateX(-50%)', fontSize: 7, fontWeight: 600, color: goodColor, whiteSpace: 'nowrap' }}>
          {fmt(good)}
        </span>
      </div>
    </div>
  )
}

// ─── TABELA COMPARATIVA (sem cliente selecionado) ─────────────────────────────
// Exibe cada cliente JD em uma coluna — mais útil que só a média quando há poucos clientes.

function ClientesComparisonTable({ allClientesData, activeConfig }) {
  const clientes = allClientesData.map(r => r.cliente)

  // Média simples dos clientes para cada métrica
  const grupoMetricas = useMemo(() => {
    const g = {}
    for (const cfg of activeConfig) {
      const vals = allClientesData.map(r => r[cfg.key]).filter(v => v != null && v > 0)
      g[cfg.key] = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null
    }
    return g
  }, [allClientesData, activeConfig])

  if (allClientesData.length === 0) {
    return <div style={{ padding: '20px 0', color: '#6b6560', fontSize: 13 }}>Sem dados JD para o período selecionado.</div>
  }

  const thStyle = { background: '#2d4a2d', color: '#fff', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '6px 10px', fontWeight: 600 }
  const tdStyle = { padding: '9px 10px', textAlign: 'center', fontSize: 13 }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, textAlign: 'left', width: 180 }}>Métrica</th>
            {clientes.map(c => (
              <th key={c} style={{ ...thStyle, textAlign: 'center' }}>{c}</th>
            ))}
            <th style={{ ...thStyle, textAlign: 'center', background: '#1a2e1a' }}>Média Grupo</th>
          </tr>
        </thead>
        <tbody>
          {activeConfig.map((cfg, i) => (
            <tr key={cfg.key} style={{ background: i % 2 === 0 ? '#ffffff' : '#fafaf8' }}>
              <td style={{ padding: '9px 10px' }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#4a3728' }}>{cfg.label}</div>
                <div style={{ fontSize: 8, color: '#6b6560', marginTop: 2 }}>{cfg.sub}</div>
              </td>
              {clientes.map(c => {
                const row = allClientesData.find(r => r.cliente === c)
                const val = row?.[cfg.key]
                const grupo = grupoMetricas[cfg.key]
                const status = (val != null && val > 0 && grupo != null && grupo > 0)
                  ? computeStatus(val, grupo, cfg.higherIsBetter)
                  : null
                const badge = status ? statusBadgeProps(status) : null
                return (
                  <td key={c} style={{ ...tdStyle }}>
                    <div style={{ fontWeight: 700, color: '#4a3728' }}>{cfg.fmt(val)}</div>
                    {badge && (
                      <div style={{ marginTop: 3 }}>
                        <span style={{ fontSize: 8, fontWeight: 600, color: badge.fg, background: badge.bg, padding: '1px 5px', borderRadius: 3 }}>
                          {badge.text}
                        </span>
                      </div>
                    )}
                  </td>
                )
              })}
              <td style={{ ...tdStyle, background: i % 2 === 0 ? '#f0f5f0' : '#e8f0e8' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#2d4a2d' }}>
                  {cfg.fmt(grupoMetricas[cfg.key])}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 10, fontSize: 10, color: '#6b6560', fontStyle: 'italic' }}>
        Selecione um cliente no filtro global para ver o comparativo com gauge individual.
      </div>
    </div>
  )
}

// ─── TABELA CLIENTE VS. GRUPO (com cliente selecionado) ──────────────────────

function MetricaRow({ cfg, clienteVal, grupoVal, isEven, zoneInfo, dragProps }) {
  const { isDragging, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd } = dragProps ?? {}
  const hasData = clienteVal != null && clienteVal > 0 && grupoVal != null && grupoVal > 0
  const status   = hasData ? computeStatus(clienteVal, grupoVal, cfg.higherIsBetter) : 'referencia'
  const badge    = statusBadgeProps(status)
  const diffStr  = hasData ? fmtPctDiff(clienteVal, grupoVal) : '—'
  const diffColor = hasData
    ? ((clienteVal >= grupoVal) === cfg.higherIsBetter ? '#1e4d1e' : '#8b2020')
    : '#6b6560'

  const zones = (zoneInfo && hasData) ? { bad: zoneInfo.bad, good: zoneInfo.good, higherIsBetter: cfg.higherIsBetter } : null

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
      <td style={{ padding: '9px 10px', width: 160 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#4a3728' }}>{cfg.label}</div>
        <div style={{ fontSize: 8, color: '#6b6560', marginTop: 2 }}>{cfg.sub}</div>
      </td>
      <td style={{ padding: '9px 10px', width: 80, textAlign: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#4a3728' }}>{cfg.fmt(clienteVal)}</span>
      </td>
      <td style={{ padding: '9px 10px', width: 80, textAlign: 'center' }}>
        <span style={{ fontSize: 11, color: '#6b6560' }}>{cfg.fmt(grupoVal)}</span>
      </td>
      <td style={{ padding: '9px 10px', minWidth: 220 }}>
        {hasData
          ? <LinearGauge clienteVal={clienteVal} grupoVal={grupoVal} zones={zones} fmt={cfg.fmt} />
          : <span style={{ fontSize: 11, color: '#c0bab4' }}>Dado não disponível para este processo</span>
        }
      </td>
      <td style={{ padding: '9px 10px', width: 80, textAlign: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: diffColor }}>{diffStr}</span>
      </td>
      <td style={{ padding: '9px 10px', width: 70, textAlign: 'center' }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: badge.fg, background: badge.bg, padding: '2px 6px', borderRadius: 3, whiteSpace: 'nowrap' }}>
          {badge.text}
        </span>
      </td>
    </tr>
  )
}

function MetricasTable({ clienteMetricas, grupoMetricas, zoneThresholds, activeConfig, onReorder }) {
  const [draggedKey,  setDraggedKey]  = useState(null)
  const [dragOverKey, setDragOverKey] = useState(null)

  const thStyle = { background: '#2d4a2d', color: '#ffffff', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '6px 10px', fontWeight: 600 }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ background: '#2d4a2d', width: 28 }} />
            <th style={{ ...thStyle, textAlign: 'left', width: 160 }}>Métrica</th>
            <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>Cliente</th>
            <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>Grupo JD</th>
            <th style={{ ...thStyle, minWidth: 220 }}>Comparativo visual</th>
            <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>Diferença</th>
            <th style={{ ...thStyle, textAlign: 'center', width: 70 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {activeConfig.map((cfg, i) => (
            <MetricaRow
              key={cfg.key}
              cfg={cfg}
              clienteVal={clienteMetricas?.[cfg.key] ?? 0}
              grupoVal={grupoMetricas?.[cfg.key] ?? 0}
              isEven={i % 2 === 0}
              zoneInfo={zoneThresholds?.[cfg.key]}
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

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

export default function BenchmarkJohnDeerePage() {
  const { filters, queryFilters, benchmarkSafra, registerExportFn } = useFilters()
  const [activeTab,       setActiveTab]       = useState('plantio')
  const [selectedMetrics, setSelectedMetrics] = useState([...DEFAULT_SELECTED_METRICS])

  const toggleMetric = useCallback((key) => {
    setSelectedMetrics(prev => {
      if (prev.includes(key) && prev.length <= 1) return prev
      return prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    })
  }, [])

  const handleReorder = useCallback((fromKey, toKey) => {
    setSelectedMetrics(prev => {
      const from = prev.indexOf(fromKey)
      const to   = prev.indexOf(toKey)
      if (from === -1 || to === -1 || from === to) return prev
      const next = [...prev]
      next.splice(from, 1)
      next.splice(to, 0, fromKey)
      return next
    })
  }, [])

  const activeTabDef = JD_TABS.find(t => t.id === activeTab)
  const processo     = activeTabDef?.processo ?? 'Plantio'
  const cliente      = filters.clientes?.[0]    || ''
  const tipoSafra    = filters.tipos_safra?.[0] || ''

  const benchFilters = {
    ...(cliente   && { cliente }),
    processo,
    ...(tipoSafra && { tipo_safra: tipoSafra }),
    safra: benchmarkSafra,
    ...(queryFilters.dataInicio && { dataInicio: queryFilters.dataInicio }),
    ...(queryFilters.dataFim    && { dataFim:    queryFilters.dataFim    }),
  }

  const grupoFilters = {
    processo,
    ...(tipoSafra && { tipo_safra: tipoSafra }),
    safra: benchmarkSafra,
  }

  const { metricas: clienteMetricas, loading: loadingCliente, error: errorCliente } =
    useClienteBenchmarkJD(cliente ? benchFilters : {})

  const { data: allClientesData, loading: loadingAllClientes } =
    useAllClientesBenchmarkJD(grupoFilters)

  // Deriva grupo e limites de zona a partir dos dados de todos clientes JD
  const { grupoMetricas, zoneThresholds } = useMemo(() => {
    if (!allClientesData || allClientesData.length === 0) return { grupoMetricas: null, zoneThresholds: {} }
    const grupoM = {}
    const zones  = {}
    for (const cfg of ALL_METRICAS_CONFIG) {
      const vals = allClientesData.map(r => r[cfg.key]).filter(v => v != null && v > 0)
      if (vals.length === 0) continue
      grupoM[cfg.key] = vals.reduce((s, v) => s + v, 0) / vals.length
      const boundaries = computeZoneBoundaries(allClientesData, cfg.key, cfg.higherIsBetter)
      if (boundaries) zones[cfg.key] = boundaries
    }
    return { grupoMetricas: grupoM, zoneThresholds: zones }
  }, [allClientesData])

  const activeConfig = selectedMetrics
    .map(key => ALL_METRICAS_CONFIG.find(m => m.key === key))
    .filter(Boolean)

  const loading  = cliente ? (loadingCliente || loadingAllClientes) : loadingAllClientes
  const semDados = !loading && cliente && !clienteMetricas

  const exportRef = useRef({})
  exportRef.current = {
    allClientesData,
    grupoMetricas,
    fetchFilters: { jdOnly: true, processo, tipo_safra: tipoSafra || undefined, safra: benchmarkSafra },
  }
  useEffect(() => {
    registerExportFn(() => exportBenchmarkJD(exportRef.current))
    return () => registerExportFn(null)
  }, [registerExportFn])

  return (
    <>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 24px' }}>
        <DynamicHeader cliente={cliente} processo={processo} tipoSafra={tipoSafra} />

        <TabControl tabs={JD_TABS} active={activeTab} onChange={setActiveTab} />

        {loading && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#6b6560', fontSize: 13 }}>
            Carregando dados...
          </div>
        )}

        {/* Sem cliente: tabela comparativa entre todos os clientes JD */}
        {!loading && !cliente && (
          <SectionCard title="CLIENTES JOHN DEERE — COMPARATIVO POR PROCESSO">
            <ClientesComparisonTable
              allClientesData={allClientesData}
              activeConfig={activeConfig}
            />
          </SectionCard>
        )}

        {/* Cliente selecionado mas sem dados */}
        {!loading && semDados && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#8b2020', fontSize: 13 }}>
            {errorCliente
              ? `Erro ao carregar dados: ${errorCliente}`
              : 'Nenhum dado John Deere encontrado para o cliente e processo selecionados.'}
          </div>
        )}

        {/* Comparação cliente vs. grupo JD */}
        {!loading && cliente && clienteMetricas && (
          <SectionCard title="MÉTRICAS — CLIENTE VS. GRUPO JOHN DEERE">
            <Legenda cliente={cliente} />
            <MetricasTable
              clienteMetricas={clienteMetricas}
              grupoMetricas={grupoMetricas ?? {}}
              zoneThresholds={zoneThresholds}
              activeConfig={activeConfig}
              onReorder={handleReorder}
            />
          </SectionCard>
        )}
      </div>

      <MetricSelectorFAB
        config={ALL_METRICAS_CONFIG}
        selected={new Set(selectedMetrics)}
        onToggle={toggleMetric}
      />
    </>
  )
}
