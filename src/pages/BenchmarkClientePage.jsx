// BenchmarkClientePage.jsx
// Compara métricas de um cliente específico contra a média do grupo Porteira.
// Seleção de cliente via filtro global. Export via window.print() (FAB global).

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useFilters } from '../lib/FilterContext'
import { useClienteBenchmark, useAllClientesBenchmark } from '../hooks/useData'
import MetricSelectorFAB from '../components/MetricSelectorFAB'
import { exportBenchmarkCliente } from '../lib/export'

// ─── CONFIGURAÇÃO ─────────────────────────────────────────────────────────────

// Todas as métricas não-absolutas disponíveis para comparação benchmark.
// Métricas absolutas (area_ha, tempo_total_h, etc.) são excluídas por não serem comparáveis entre clientes.
const ALL_METRICAS_CONFIG = [
  {
    key: 'rendimento_operacional_hah',
    label: 'Rendimento Operacional',
    sub: 'ha/h',
    fmt: (v) => v.toFixed(2),
    higherIsBetter: true,
    isPct: false,
  },
  {
    key: 'rendimento_real_hah',
    label: 'Rendimento Real',
    sub: 'ha/h',
    fmt: (v) => v.toFixed(2),
    higherIsBetter: true,
    isPct: false,
  },
  {
    key: 'velocidade_media_kmh',
    label: 'Velocidade Média Op.',
    sub: 'km/h',
    fmt: (v) => v.toFixed(2),
    higherIsBetter: true,
    isPct: false,
  },
  {
    key: 'eficiencia_geral_pct',
    label: 'Eficiência Geral',
    sub: '%',
    fmt: (v) => v.toFixed(2) + '%',
    higherIsBetter: true,
    isPct: true,
  },
  {
    key: 'eficiencia_operacional_pct',
    label: 'Eficiência Operacional',
    sub: '%',
    fmt: (v) => v.toFixed(2) + '%',
    higherIsBetter: true,
    isPct: true,
  },
  {
    key: 'disponibilidade_mecanica_pct',
    label: 'Disponibilidade Mecânica',
    sub: '%',
    fmt: (v) => v.toFixed(2) + '%',
    higherIsBetter: true,
    isPct: true,
  },
  {
    key: 'consumo_medio_lh',
    label: 'Consumo Médio',
    sub: 'L/h',
    fmt: (v) => v.toFixed(2),
    higherIsBetter: false,
    isPct: false,
  },
  {
    key: 'consumo_medio_lha',
    label: 'Consumo Médio',
    sub: 'L/ha',
    fmt: (v) => v.toFixed(2),
    higherIsBetter: false,
    isPct: false,
  },
  {
    key: 'consumo_medio_efetivo_lh',
    label: 'Consumo Médio Efetivo',
    sub: 'L/h',
    fmt: (v) => v.toFixed(2),
    higherIsBetter: false,
    isPct: false,
  },
  {
    key: 'consumo_medio_efetivo_lha',
    label: 'Consumo Médio Efetivo',
    sub: 'L/ha',
    fmt: (v) => v.toFixed(2),
    higherIsBetter: false,
    isPct: false,
  },
  {
    key: 'motor_ligado_pct',
    label: 'Motor Ligado',
    sub: '% do total',
    fmt: (v) => v.toFixed(2) + '%',
    higherIsBetter: true,
    isPct: true,
  },
  {
    key: 'motor_ocioso_pct',
    label: 'Motor Ocioso',
    sub: '% do motor ligado',
    fmt: (v) => v.toFixed(2) + '%',
    higherIsBetter: false,
    isPct: true,
  },
  {
    key: 'sem_apontamento_pct',
    label: 'Sem Apontamento',
    sub: '% da parada',
    fmt: (v) => v.toFixed(2) + '%',
    higherIsBetter: false,
    isPct: true,
  },
  {
    key: 'rpm_medio',
    label: 'RPM Médio',
    sub: 'RPM · referência por processo',
    fmt: (v) => v.toFixed(0),
    higherIsBetter: true,
    isPct: false,
  },
  {
    key: 'area_por_linha_ha',
    label: 'Área por Linha',
    sub: 'ha · plantio',
    fmt: (v) => v != null ? v.toFixed(4) : '—',
    higherIsBetter: true,
    isPct: false,
  },
  {
    key: 'area_por_linha_24h',
    label: 'Área/Linha por 24h',
    sub: 'ha/linha/dia · plantio',
    fmt: (v) => v != null && v > 0 ? v.toFixed(3) : '—',
    higherIsBetter: true,
    isPct: false,
  },
  {
    key: 'pes_plataforma_24h',
    label: 'Pés Plat. por 24h',
    sub: 'ha/pé/dia · colheita',
    fmt: (v) => v != null && v > 0 ? v.toFixed(3) : '—',
    higherIsBetter: true,
    isPct: false,
  },
  {
    key: 'tempo_medio_turno_h',
    label: 'Tempo Médio de Turno',
    sub: 'h/equip/dia',
    fmt: (v) => v.toFixed(1) + 'h',
    higherIsBetter: true,
    isPct: false,
  },
]

const DEFAULT_SELECTED_METRICS = new Set([
  'rendimento_operacional_hah',
  'eficiencia_geral_pct',
  'eficiencia_operacional_pct',
  'consumo_medio_efetivo_lha',
  'consumo_medio_lh',
  'disponibilidade_mecanica_pct',
  'velocidade_media_kmh',
  'tempo_medio_turno_h',
])

const TABS = [
  { id: 'colheita', label: 'Colheita' },
  { id: 'plantio',  label: 'Plantio'  },
  { id: 'geral',    label: 'Geral'    },
]

const TAB_PROCESSO = {
  colheita: 'Colheita',
  plantio:  'Plantio',
  // 'geral' usa filters.processo do filtro global
}

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
  const pct = grupoVal > 0 ? (clienteVal / grupoVal - 1) * 100 : 0
  const sign = pct >= 0 ? '+' : '−'
  return `${sign}${Math.abs(pct).toFixed(2)}%`
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

function isFavoravel(clienteVal, grupoVal, higherIsBetter) {
  return higherIsBetter ? clienteVal >= grupoVal : clienteVal <= grupoVal
}

// Calcula limiares de zona a partir das médias reais dos clientes.
// bad = pior cliente, good = melhor cliente para a métrica.
// Retorna null se houver menos de 2 clientes com dados.
function computeZoneBoundaries(clienteRows, metricKey, higherIsBetter) {
  const vals = clienteRows
    .map(r => r[metricKey])
    .filter(v => v != null && v > 0)

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

// Cabeçalho dinâmico com cliente, processo e tipo de cultura
function DynamicHeader({ cliente, processo, tipoSafra }) {
  const fieldStyle = {
    display: 'flex', flexDirection: 'column', gap: 2,
  }
  const labelStyle = {
    fontSize: 9, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)',
  }
  const valueStyle = {
    fontSize: 14, fontWeight: 700, color: '#ffffff',
  }
  const dividerStyle = {
    width: 1, height: 32, background: 'rgba(255,255,255,0.2)', flexShrink: 0,
  }

  return (
    <div style={{
      background: '#2d4a2d', borderRadius: 8,
      padding: '14px 20px', marginBottom: 20,
      display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
    }}>
      <div style={fieldStyle}>
        <span style={labelStyle}>Cliente</span>
        <span style={valueStyle}>{cliente || '—'}</span>
      </div>
      <div style={dividerStyle} />
      <div style={fieldStyle}>
        <span style={labelStyle}>Processo</span>
        <span style={valueStyle}>{processo || '—'}</span>
      </div>
      <div style={dividerStyle} />
      <div style={fieldStyle}>
        <span style={labelStyle}>Tipo de cultura</span>
        <span style={valueStyle}>{tipoSafra || 'Todas'}</span>
      </div>
    </div>
  )
}

// Legenda de marcadores — espelha os símbolos do LinearGauge
function Legenda({ cliente }) {
  return (
    <div style={{ display: 'flex', gap: 18, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 10, color: '#6b6560' }}>
        {/* Diamante — espelha o marcador do cliente */}
        <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18 }}>
          <span style={{ display: 'block', width: 11, height: 11, background: '#4a3728', transform: 'rotate(45deg)', boxShadow: '0 0 0 2px white, 0 1px 4px rgba(0,0,0,0.3)' }} />
        </span>
        {cliente || 'Cliente'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 10, color: '#6b6560' }}>
        {/* Círculo âmbar — espelha o marcador do grupo */}
        <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18 }}>
          <span style={{ display: 'block', width: 14, height: 14, borderRadius: '50%', background: '#c8960c', border: '3px solid white', boxShadow: '0 1px 5px rgba(0,0,0,0.25)' }} />
        </span>
        Média do grupo
      </div>
    </div>
  )
}

// Linear gauge com 3 zonas coloridas.
// Escala 4-pontos: grupoVal âncora em 50%, bad em ~33%, good em ~67%.
// Cliente: diamante rotacionado centrado na barra (sobrepõe) + label acima.
// Grupo  : círculo âmbar grande centrado na barra (sobrepõe) + label abaixo.
// Labels bad/good posicionadas via toPct() — alinhadas com os valores reais na escala.
function LinearGauge({ clienteVal, grupoVal, barColor, zones, fmt }) {
  // Marcadores compartilhados entre as duas variantes (sem/com zonas)
  function ClientMarker({ pct }) {
    return (
      <>
        <span style={{
          position: 'absolute', left: `${pct}%`, top: -22,
          transform: 'translateX(-50%)',
          fontSize: 8, fontWeight: 700, color: '#4a3728', whiteSpace: 'nowrap',
          background: 'rgba(255,255,255,0.95)', padding: '1px 3px', borderRadius: 2,
          zIndex: 9, lineHeight: '12px',
        }}>
          {fmt(clienteVal)}
        </span>
        {/* Diamante centrado na barra — sobrepõe a linha */}
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
        {/* Linha fina na altura da barra como guia de posição */}
        <div style={{
          position: 'absolute', left: `${pct}%`, top: 0, height: 10,
          width: 3, background: '#c8960c', transform: 'translateX(-50%)', zIndex: 3,
        }} />
        {/* Círculo grande centrado na barra — sobrepõe a linha */}
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
        {/* Label do grupo abaixo da barra */}
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

  // Escala 4-pontos com grupoVal sempre em 50%.
  // Se grupoVal não estiver entre bad e good, cai para escala 3-pontos simples.
  const validScale = higherIsBetter
    ? (bad > 0 && grupoVal > bad && good > grupoVal)
    : (good > 0 && grupoVal > good && bad > grupoVal)

  const maxBound = higherIsBetter ? good : bad
  const maxVal   = Math.max(clienteVal, grupoVal, maxBound > 0 ? maxBound : 0, 0.001) * 1.2

  // Escala de 5 pontos (validScale) ou 3 pontos (!validScale).
  // Âncoras: bad → centro zona 1 (Z/2=16.7%), grupoVal → centro zona 2 (50%), good → centro zona 3 (Z*2.5=83.3%).
  // Garante que toPct(bad)=badLabelPct e toPct(good)=goodLabelPct — cliente com valor
  // igual a um extremo aparece exatamente sobre a label correspondente.
  function toPct(v) {
    if (v <= 0) return 0
    const half = Z / 2        // 16.67  — centro zona 1 / zona 3 início
    const gCtr = Z * 2.5      // 83.33  — centro zona 3
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

  const clientePct = toPct(clienteVal)
  const grupoPct   = validScale ? 50 : toPct(grupoVal)
  // Labels bad/good posicionadas no mesmo ponto que seus valores na escala — corrige
  // o bug onde cliente com valor igual ao limite "good" aparecia em posição diferente da label.
  const badLabelPct  = toPct(bad)
  const goodLabelPct = toPct(good)

  const zoneSegs = higherIsBetter
    ? [
        { left: 0,     color: '#c0392b', r: '5px 0 0 5px' },
        { left: Z,     color: '#e8a200', r: '0'            },
        { left: 2 * Z, color: '#3a7d3a', r: '0 5px 5px 0' },
      ]
    : [
        { left: 0,     color: '#3a7d3a', r: '5px 0 0 5px' },
        { left: Z,     color: '#e8a200', r: '0'            },
        { left: 2 * Z, color: '#c0392b', r: '0 5px 5px 0' },
      ]

  const badColor  = higherIsBetter ? '#a02d20' : '#2a5c2a'
  const goodColor = higherIsBetter ? '#2a5c2a' : '#a02d20'

  return (
    <div style={{ minWidth: 180, paddingTop: 26 }}>
      <div style={{ height: 10, borderRadius: 5, position: 'relative', overflow: 'visible' }}>

        {/* Zonas coloridas */}
        {zoneSegs.map((z, i) => (
          <div key={i} style={{
            position: 'absolute', left: `${z.left}%`, width: `${Z}%`,
            top: 0, height: '100%', background: z.color, borderRadius: z.r,
          }} />
        ))}

        <GrupoMarker pct={grupoPct} />
        <ClientMarker pct={clientePct} />
      </div>

      {/* Abaixo da barra: label do grupo (linha 1) + labels bad/good (linha 2) */}
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

// Card branco de seção
function SectionCard({ title, subtitle, footnote, headerAction, children }) {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e0dbd4', borderRadius: 6, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#4a3728',
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            {title}
          </span>
          {subtitle && (
            <span style={{ fontSize: 8, color: '#6b6560' }}>{subtitle}</span>
          )}
        </div>
        {headerAction}
      </div>
      {children}
      {footnote && (
        <div style={{ marginTop: 14, fontSize: 8, color: '#6b6560', fontStyle: 'italic' }}>
          {footnote}
        </div>
      )}
    </div>
  )
}

// Tabela simplificada usada quando nenhum cliente está selecionado:
// exibe apenas as médias do grupo Porteira, sem comparação nem gauge.
function GrupoOnlyTable({ grupoMetricas, activeConfig }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ background: '#2d4a2d', color: '#fff', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '6px 10px', fontWeight: 600, width: 200, textAlign: 'left' }}>
              Métrica
            </th>
            <th style={{ background: '#2d4a2d', color: '#fff', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '6px 10px', fontWeight: 600, textAlign: 'center', width: 160 }}>
              Média Porteira
            </th>
          </tr>
        </thead>
        <tbody>
          {activeConfig.map((cfg, i) => (
            <tr key={cfg.key} style={{ background: i % 2 === 0 ? '#ffffff' : '#fafaf8' }}>
              <td style={{ padding: '9px 10px' }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#4a3728' }}>{cfg.label}</div>
                <div style={{ fontSize: 8, color: '#6b6560', marginTop: 2 }}>{cfg.sub}</div>
              </td>
              <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#4a3728' }}>
                  {cfg.fmt(grupoMetricas[cfg.key] ?? 0)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 10, fontSize: 10, color: '#6b6560', fontStyle: 'italic' }}>
        Selecione um cliente no filtro global para ver a comparação individual com o grupo.
      </div>
    </div>
  )
}


// ─── TABELA DE MÉTRICAS ───────────────────────────────────────────────────────

function MetricasHeader() {
  const cols = [
    { label: 'MÉTRICA',            width: 160                    },
    { label: 'CLIENTE',            width: 80,  align: 'center'  },
    { label: 'GRUPO',              width: 80,  align: 'center'  },
    { label: 'COMPARATIVO VISUAL', minWidth: 220                 },
    { label: 'DIFERENÇA',          width: 80,  align: 'center'  },
    { label: 'STATUS',             width: 70,  align: 'center'  },
  ]
  return (
    <tr>
      <th style={{ background: '#2d4a2d', width: 28 }} />
      {cols.map((c) => (
        <th
          key={c.label}
          style={{
            background: '#2d4a2d', color: '#ffffff',
            fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em',
            padding: '6px 10px', fontWeight: 600,
            textAlign: c.align || 'left',
            width: c.width, minWidth: c.minWidth,
          }}
        >
          {c.label}
        </th>
      ))}
    </tr>
  )
}

function MetricaRow({ cfg, clienteVal, grupoVal, isEven, zoneInfo, dragProps }) {
  const { isDragging, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd } = dragProps ?? {}
  const status   = computeStatus(clienteVal, grupoVal, cfg.higherIsBetter)
  const barColor = clienteBarColor(status)
  const badge    = statusBadgeProps(status)
  const diffStr  = fmtPctDiff(clienteVal, grupoVal)
  const diffColor = isFavoravel(clienteVal, grupoVal, cfg.higherIsBetter)
    ? '#1e4d1e'
    : '#8b2020'

  // computeZoneBoundaries já valida sanidade; aqui apenas empacota para o gauge
  const zones = zoneInfo
    ? { bad: zoneInfo.bad, good: zoneInfo.good, higherIsBetter: cfg.higherIsBetter }
    : null

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
        <span style={{ fontSize: 14, fontWeight: 700, color: '#4a3728' }}>
          {cfg.fmt(clienteVal)}
        </span>
      </td>
      <td style={{ padding: '9px 10px', width: 80, textAlign: 'center' }}>
        <span style={{ fontSize: 11, color: '#6b6560' }}>{cfg.fmt(grupoVal)}</span>
      </td>
      <td style={{ padding: '9px 10px', minWidth: 220 }}>
        <LinearGauge
          clienteVal={clienteVal}
          grupoVal={grupoVal}
          barColor={barColor}
          zones={zones}
          fmt={cfg.fmt}
        />
      </td>
      <td style={{ padding: '9px 10px', width: 80, textAlign: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: diffColor }}>{diffStr}</span>
      </td>
      <td style={{ padding: '9px 10px', width: 70, textAlign: 'center' }}>
        <span style={{
          fontSize: 9, fontWeight: 600,
          color: badge.fg, background: badge.bg,
          padding: '2px 6px', borderRadius: 3, whiteSpace: 'nowrap',
        }}>
          {badge.text}
        </span>
      </td>
    </tr>
  )
}

function MetricasTable({ metricas, zoneThresholds, activeConfig, onReorder }) {
  const [draggedKey,  setDraggedKey]  = useState(null)
  const [dragOverKey, setDragOverKey] = useState(null)
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><MetricasHeader /></thead>
        <tbody>
          {activeConfig.map((cfg, i) => (
            <MetricaRow
              key={cfg.key}
              cfg={cfg}
              clienteVal={metricas[cfg.key]?.clienteVal ?? 0}
              grupoVal={metricas[cfg.key]?.grupoVal ?? 0}
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

export default function BenchmarkClientePage({ onTabChange }) {
  const { filters, queryFilters, benchmarkSafra, registerExportFn } = useFilters()
  const [activeTab, setActiveTab]             = useState('colheita')
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

  const cliente        = filters.clientes?.[0]    || ''
  const tipoSafra      = filters.tipos_safra?.[0] || ''
  const tipoSafraLabel = filters.tipos_safra.length > 1 ? `${filters.tipos_safra.length} culturas` : tipoSafra
  // Colheita/Plantio são fixos por aba; Geral usa o processo do filtro global
  const processo = activeTab === 'geral' ? (filters.processos?.[0] || null) : TAB_PROCESSO[activeTab]
  // Aba "Geral" exclui Colheita e Plantio — cada um tem aba própria
  const geralExclusion = activeTab === 'geral' ? { not_processos: ['Colheita', 'Plantio'] } : {}

  // Quando referenciaSafra é uma safra passada, dataInicio/dataFim do período atual conflitam — não aplicar.
  // Quando 'historico' sem referenciaSafra explícita, remove restrição de safra para mostrar dados históricos.
  const hasExplicitSafra = !!filters.referenciaSafra
  const useSafra = hasExplicitSafra || filters.periodo !== 'historico'

  // Filtros para os hooks — processo sempre vem do tab ativo, não do filtro global
  const benchFilters = {
    ...(cliente   && { cliente }),
    processo,
    ...(tipoSafra && { tipo_safra: tipoSafra }),
    ...(useSafra && { safra: benchmarkSafra }),
    ...(!hasExplicitSafra && queryFilters.dataInicio && { dataInicio: queryFilters.dataInicio }),
    ...(!hasExplicitSafra && queryFilters.dataFim    && { dataFim:    queryFilters.dataFim    }),
    ...geralExclusion,
  }

  const grupoFilters = {
    processo,
    ...(tipoSafra && { tipo_safra: tipoSafra }),
    ...(useSafra && { safra: benchmarkSafra }),
    ...geralExclusion,
  }

  // Dados do cliente — desnecessário quando nenhum cliente está selecionado
  const { metricas: clienteMetricas, loading: loadingCliente, error: errorCliente } =
    useClienteBenchmark(cliente ? benchFilters : {})

  // Busca médias de todos os clientes — fonte única para grupo, bad e good.
  // Usar a mesma fonte garante que grupoVal sempre caia entre bad e good,
  // evitando inconsistências com o benchmark pré-computado (media_grupo_porteira).
  const { data: allClientesData, loading: loadingAllClientes } = useAllClientesBenchmark(grupoFilters)

  // Deriva grupo (média simples dos clientes), bad (pior) e good (melhor) da mesma fonte.
  // Itera sobre ALL_METRICAS_CONFIG para cobrir todas as métricas, mesmo as não selecionadas.
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

  // Mapa key → { clienteVal, grupoVal } para todas as métricas
  const metricas = useMemo(() => {
    const m = {}
    for (const cfg of ALL_METRICAS_CONFIG) {
      m[cfg.key] = {
        clienteVal: clienteMetricas?.[cfg.key] ?? 0,
        grupoVal:   grupoMetricas?.[cfg.key]   ?? 0,
      }
    }
    return m
  }, [clienteMetricas, grupoMetricas])

  const activeConfig = selectedMetrics.map(key => ALL_METRICAS_CONFIG.find(m => m.key === key)).filter(Boolean)

  const loading  = cliente ? (loadingCliente || loadingAllClientes) : loadingAllClientes
  const semDados = !loading && cliente && !clienteMetricas

  const exportRef = useRef({})
  exportRef.current = {
    allClientesData,
    grupoMetricas,
    fetchFilters: { processo, tipo_safra: tipoSafra || undefined, safra: benchmarkSafra },
  }
  useEffect(() => {
    registerExportFn(() => exportBenchmarkCliente(exportRef.current))
    return () => registerExportFn(null)
  }, [registerExportFn])

  return (
    <>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 24px' }}>
        <DynamicHeader
          cliente={cliente}
          processo={processo}
          tipoSafra={tipoSafraLabel}
        />

        <div data-pdf-exclude="true">
          <TabControl tabs={TABS} active={activeTab} onChange={(t) => { setActiveTab(t); onTabChange?.(t) }} />
        </div>

        {(filters.metricFilters ?? []).some(f => f.field && f.value !== '' && f.value != null) && (
          <div style={{ background: '#edf5ed', border: '1px solid #4a6741', borderRadius: 6, padding: '8px 14px', marginBottom: 18, fontSize: 12, color: '#1e4d1e' }}>
            Filtro de métrica ativo nesta safra — os resultados refletem o período e dimensões selecionados.
          </div>
        )}

        {queryFilters.dataInicio && !hasExplicitSafra && (
          <div style={{ background: '#f7f5f2', border: '1px solid #d4cfc9', borderRadius: 6, padding: '8px 14px', marginBottom: 18, fontSize: 11, color: '#6b6560' }}>
            Cliente: período selecionado no filtro · Grupo: safra {benchmarkSafra} completa
          </div>
        )}

        {loading && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#6b6560', fontSize: 13 }}>
            Carregando dados...
          </div>
        )}

        {/* Nenhum cliente selecionado: exibe médias do grupo sem comparação */}
        {!loading && !cliente && (
          <SectionCard title="MÉDIAS DO GRUPO PORTEIRA">
            {grupoMetricas
              ? <GrupoOnlyTable grupoMetricas={grupoMetricas} activeConfig={activeConfig} />
              : <div style={{ padding: '20px 0', color: '#6b6560', fontSize: 13 }}>Sem dados para o período selecionado.</div>
            }
          </SectionCard>
        )}

        {/* Cliente selecionado mas sem dados */}
        {!loading && semDados && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#8b2020', fontSize: 13 }}>
            {errorCliente
              ? `Erro ao carregar dados: ${errorCliente}`
              : 'Nenhum dado encontrado para os filtros selecionados.'}
          </div>
        )}

        {/* Comparação cliente vs. grupo */}
        {!loading && cliente && clienteMetricas && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SectionCard
              title="MÉTRICAS COMPARÁVEIS — CLIENTE VS. GRUPO PORTEIRA"
            >
              <Legenda cliente={cliente} />
              <MetricasTable
                metricas={metricas}
                zoneThresholds={zoneThresholds}
                activeConfig={activeConfig}
                onReorder={handleReorder}
              />
            </SectionCard>
          </div>
        )}
      </div>
      <MetricSelectorFAB config={ALL_METRICAS_CONFIG} selected={new Set(selectedMetrics)} onToggle={toggleMetric} />
    </>
  )
}
