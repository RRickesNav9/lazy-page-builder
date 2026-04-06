// BenchmarkEquipamentoPage.jsx
// Analisa desempenho de máquinas: individual vs. modelo, evolução temporal e comparativo de modelos.
// Dados em mock — seletores internos não sobrescrevem o filtro global.

import { useState } from 'react'
import { useFilters } from '../lib/FilterContext'

// ─── MOCK: Máquinas (Colheita · Arroz · Safra 2025/2026) ─────────────────────

const MAQUINAS = [
  { cod: '31', label: '31 · JD S660', modelo: 'John Deere S660' },
  { cod: '33', label: '33 · JD S760', modelo: 'John Deere S760' },
  { cod: '34', label: '34 · JD S760', modelo: 'John Deere S760' },
  { cod: '35', label: '35 · JD S760', modelo: 'John Deere S760' },
  { cod: '36', label: '36 · JD S760', modelo: 'John Deere S760' },
  { cod: '37', label: '37 · JD S760', modelo: 'John Deere S760' },
]

const STATS = {
  '31': { rendimento: 1.70, eficiencia: 52, consumo: 26.4, disp: 88.0,  vel: 2.08, rpm: 1820 },
  '33': { rendimento: 2.26, eficiencia: 61, consumo: 29.5, disp: 93.4,  vel: 2.50, rpm: 1950 },
  '34': { rendimento: 2.10, eficiencia: 58, consumo: 31.8, disp: 98.8,  vel: 2.31, rpm: 1870 },
  '35': { rendimento: 1.96, eficiencia: 55, consumo: 34.9, disp: 100.0, vel: 2.16, rpm: 1900 },
  '36': { rendimento: 2.19, eficiencia: 61, consumo: 28.6, disp: 89.5,  vel: 2.42, rpm: 1963 },
  '37': { rendimento: 1.99, eficiencia: 57, consumo: 28.7, disp: 100.0, vel: 2.19, rpm: 1880 },
}

const MEDIA_MODELO = {
  'John Deere S760': { rendimento: 2.04, eficiencia: 58, consumo: 30.1, disp: 94.2, vel: 2.31, rpm: 1890 },
  'John Deere S660': { rendimento: 1.72, eficiencia: 52, consumo: 26.4, disp: 88.0, vel: 2.08, rpm: 1820 },
}

// Histórico por máquina: máquina 36 tem dados reais, demais usam fallback
const HISTORICO = {
  '36': [
    { periodo: 'Jun/2025', rendimento: 2.31, eficiencia: 63, consumo: 27.5, disp: 91.0 },
    { periodo: 'Jul/2025', rendimento: 2.19, eficiencia: 61, consumo: 28.6, disp: 89.5 },
    { periodo: 'Ago/2025', rendimento: 1.88, eficiencia: 55, consumo: 31.2, disp: 87.0 },
    { periodo: 'Set/2025', rendimento: 1.74, eficiencia: 51, consumo: 33.1, disp: 84.0 },
    { periodo: 'Out/2025', rendimento: 2.26, eficiencia: 62, consumo: 28.0, disp: 92.0 },
  ],
}

const HISTORICO_FALLBACK = [
  { periodo: 'Jun/2025', rendimento: 2.05, eficiencia: 58, consumo: 30.5, disp: 93.0 },
  { periodo: 'Jul/2025', rendimento: 1.98, eficiencia: 56, consumo: 31.2, disp: 94.1 },
  { periodo: 'Ago/2025', rendimento: 2.10, eficiencia: 59, consumo: 29.8, disp: 95.0 },
  { periodo: 'Set/2025', rendimento: 1.95, eficiencia: 54, consumo: 32.0, disp: 91.5 },
  { periodo: 'Out/2025', rendimento: 2.12, eficiencia: 60, consumo: 29.1, disp: 96.0 },
]

const MODELOS = ['John Deere S760', 'John Deere S660']

// ─── CONFIGURAÇÃO DE MÉTRICAS ──────────────────────────────────────────────────

// inv: false = maior é melhor | true = menor é melhor | null = sem badge
const METRICAS_TAB1 = [
  { key: 'rendimento', label: 'Rendimento Operacional',     unit: 'ha/h',  d: 2, isPct: false, inv: false },
  { key: 'eficiencia', label: 'Eficiência Geral',           unit: '%',     d: 0, isPct: true,  inv: false },
  { key: 'consumo',    label: 'Consumo Efetivo Médio',      unit: 'L/ha',  d: 1, isPct: false, inv: true  },
  { key: 'disp',       label: 'Disponibilidade Mecânica',   unit: '%',     d: 1, isPct: true,  inv: false },
  { key: 'vel',        label: 'Velocidade Média Operacional', unit: 'km/h', d: 2, isPct: false, inv: false },
  { key: 'rpm',        label: 'RPM Médio Trabalhando',      unit: 'RPM',   d: 0, isPct: false, inv: null  },
]

const METRICAS_TAB2 = [
  { key: 'rendimento', label: 'Rendimento Operacional (ha/h)',  d: 2, inv: false },
  { key: 'eficiencia', label: 'Eficiência Geral (%)',           d: 0, inv: false },
  { key: 'consumo',    label: 'Consumo Efetivo Médio (L/ha)',   d: 1, inv: true  },
  { key: 'disp',       label: 'Disponibilidade Mecânica (%)',   d: 1, inv: false },
]

const METRICAS_TAB3 = [
  { key: 'rendimento', label: 'Rendimento Operacional',     unit: 'ha/h',  d: 2 },
  { key: 'eficiencia', label: 'Eficiência Geral',           unit: '%',     d: 0 },
  { key: 'consumo',    label: 'Consumo Efetivo Médio',      unit: 'L/ha',  d: 1 },
  { key: 'disp',       label: 'Disponibilidade Mecânica',   unit: '%',     d: 1 },
  { key: 'vel',        label: 'Velocidade Média Operacional', unit: 'km/h', d: 2 },
]

const TABS = [
  { id: 'maquina-modelo', label: 'Máquina vs. Modelo' },
  { id: 'historico',      label: 'Máquina ao longo do tempo' },
  { id: 'modelo-modelo',  label: 'Modelo vs. Modelo' },
]

// ─── HELPERS ──────────────────────────────────────────────────────────────────

// Formata número com vírgula decimal (pt-BR), retorna '—' para nulos
const fmt = (v, d = 2) => v != null ? Number(v).toFixed(d).replace('.', ',') : '—'

// Calcula diferença de uma máquina em relação à média do modelo e retorna dados para badge
function calcDiff(maq, mod, isPct, inv, d) {
  const rawDiff = maq - mod
  const pctDiff = mod !== 0 ? (rawDiff / mod) * 100 : 0
  const sign = (isPct ? rawDiff : pctDiff) >= 0 ? '+' : ''
  const label = isPct
    ? `${sign}${fmt(rawDiff, d)}pp`
    : `${sign}${fmt(pctDiff, 1)}%`
  if (inv === null) return { label, isNeutral: true }
  const isBetter = inv ? rawDiff < 0 : rawDiff > 0
  const texto = inv
    ? (rawDiff < 0 ? 'melhor' : 'pior')
    : (rawDiff > 0 ? 'acima' : 'abaixo')
  return { label, texto, isBetter, isNeutral: false }
}

// Retorna cor da barra do histórico comparando valor com a média do modelo
function corBarra(val, avg, inv) {
  const ratio = val / avg
  if (inv) {
    if (ratio <= 1.00) return '#2d4a2d'
    if (ratio <= 1.10) return '#c8960c'
    return '#8b2020'
  }
  if (ratio >= 1.00) return '#2d4a2d'
  if (ratio >= 0.90) return '#c8960c'
  return '#8b2020'
}

// ─── COMPONENTES COMPARTILHADOS ───────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <h2 style={{
      fontSize: 13, fontWeight: 600, letterSpacing: '0.06em',
      textTransform: 'uppercase', color: '#4a3728', margin: '0 0 10px',
    }}>
      {children}
    </h2>
  )
}

function TabControl({ tabs, active, onChange }) {
  return (
    <div style={{
      display: 'flex', background: '#f7f5f2', border: '1px solid #e0dbd4',
      borderRadius: 6, overflow: 'hidden', marginBottom: 20,
    }}>
      {tabs.map((tab, i) => (
        <button key={tab.id} onClick={() => onChange(tab.id)} style={{
          flex: 1, padding: '8px 12px', fontSize: 13, fontWeight: 500, border: 'none',
          cursor: 'pointer', transition: 'background 0.12s',
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

function MachineChips({ selected, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
      {MAQUINAS.map(m => (
        <button key={m.cod} onClick={() => onSelect(m.cod)} style={{
          padding: '5px 12px', fontSize: 12, fontWeight: 500, borderRadius: 4,
          border: `1px solid ${selected === m.cod ? '#2d4a2d' : '#e0dbd4'}`,
          background: selected === m.cod ? '#2d4a2d' : '#f7f5f2',
          color: selected === m.cod ? '#ffffff' : '#4a3728',
          cursor: 'pointer',
        }}>
          {m.label}
        </button>
      ))}
    </div>
  )
}

function InternalBreadcrumb({ equipNome, modeloNome, operacao }) {
  const items = [
    { label: 'Equipamento', value: equipNome },
    { label: 'Modelo',      value: modeloNome },
    { label: 'Operação',    value: operacao },
  ]
  return (
    <div style={{
      background: '#f7f5f2', border: '1px solid #e0dbd4', borderRadius: 6,
      padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center',
      gap: 4, flexWrap: 'wrap', marginBottom: 16,
    }}>
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

// ─── TAB 1: MÁQUINA VS. MODELO ────────────────────────────────────────────────

function DiffBadge({ diff }) {
  if (!diff) return null
  if (diff.isNeutral) {
    return <span style={{ fontSize: 11, color: '#6b6560' }}>{diff.label}</span>
  }
  const bg  = diff.isBetter ? '#edf5ed' : '#fdf0f0'
  const cor = diff.isBetter ? '#1e4d1e' : '#8b2020'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px',
      borderRadius: 3, fontSize: 11, fontWeight: 600, background: bg, color: cor,
    }}>
      {diff.label} <span style={{ fontWeight: 400 }}>{diff.texto}</span>
    </span>
  )
}

function CompareRow({ m, stats, media, isEven }) {
  const maqVal = stats[m.key]
  const modVal = media[m.key]
  const diff   = calcDiff(maqVal, modVal, m.isPct, m.inv, m.d)
  return (
    <tr style={{ background: isEven ? '#ffffff' : '#f7f5f2' }}>
      <td style={{ padding: '7px 8px' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{m.label}</div>
        <div style={{ fontSize: 11, color: '#6b6560' }}>{m.unit}</div>
      </td>
      <td style={{ padding: '7px 8px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
        {fmt(maqVal, m.d)}
      </td>
      <td style={{ padding: '7px 8px', textAlign: 'right', fontSize: 13, color: '#6b6560' }}>
        {fmt(modVal, m.d)}
      </td>
      <td style={{ padding: '7px 8px', textAlign: 'right' }}>
        <DiffBadge diff={diff} />
      </td>
    </tr>
  )
}

function CompareTableCard({ maquinaCod }) {
  const maq   = MAQUINAS.find(m => m.cod === maquinaCod)
  const stats = STATS[maquinaCod]
  const media = MEDIA_MODELO[maq.modelo]
  const thStyle = {
    background: '#2d4a2d', color: '#fff', fontSize: 11, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 8px', textAlign: 'left',
  }
  return (
    <div style={{ background: '#fff', border: '1px solid #e0dbd4', borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #e0dbd4' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#4a3728' }}>
          Máquina {maquinaCod} vs. média do modelo {maq.modelo} — Colheita · Arroz
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Métrica</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Esta máquina</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Média do modelo</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Diferença</th>
          </tr>
        </thead>
        <tbody>
          {METRICAS_TAB1.map((m, i) => (
            <CompareRow key={m.key} m={m} stats={stats} media={media} isEven={i % 2 === 0} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── TAB 2: MÁQUINA AO LONGO DO TEMPO ────────────────────────────────────────

function PeriodRow({ h, metrica, maxVal, metaPct, metObj, isFirst, modeloLabel, modelAvg }) {
  const val    = h[metrica]
  const barPct = maxVal > 0 ? (val / maxVal) * 100 : 0
  const cor    = corBarra(val, modelAvg, metObj.inv)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, marginTop: isFirst ? 22 : 0 }}>
      <div style={{ width: 68, fontSize: 11, fontWeight: 500, color: '#4a3728', flexShrink: 0 }}>
        {h.periodo}
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        {isFirst && (
          <div style={{
            position: 'absolute', bottom: 'calc(100% + 4px)', left: `${metaPct}%`,
            transform: 'translateX(-50%)', fontSize: 7, color: '#7a5c00',
            whiteSpace: 'nowrap', fontWeight: 600,
          }}>
            {modeloLabel} — {fmt(modelAvg, metObj.d)}
          </div>
        )}
        <div style={{ height: 10, background: '#f0ede8', borderRadius: 2, position: 'relative' }}>
          <div style={{ height: '100%', width: `${Math.min(barPct, 100)}%`, background: cor, borderRadius: 2 }} />
          <div style={{ position: 'absolute', top: -4, bottom: -4, left: `${metaPct}%`, borderLeft: '2px dashed #c8960c' }} />
        </div>
      </div>
      <div style={{ width: 42, textAlign: 'right', fontSize: 10, fontWeight: 600, color: '#1a1a1a', flexShrink: 0 }}>
        {fmt(val, metObj.d)}
      </div>
    </div>
  )
}

function TimelineTab({ maquinaCod, metrica, modeloNome }) {
  const historico   = HISTORICO[maquinaCod] ?? HISTORICO_FALLBACK
  const mediaObj    = MEDIA_MODELO[modeloNome]
  const metObj      = METRICAS_TAB2.find(m => m.key === metrica)
  const modelAvg    = mediaObj[metrica]
  const maxVal      = Math.max(...historico.map(h => h[metrica]), modelAvg) * 1.12
  const metaPct     = (modelAvg / maxVal) * 100
  const modeloLabel = `Média ${modeloNome.replace('John Deere ', 'JD ')}`
  return (
    <div style={{ background: '#fff', border: '1px solid #e0dbd4', borderRadius: 6, padding: '14px 16px' }}>
      <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 12, height: 12, background: '#2d4a2d', borderRadius: 2 }} />
          <span style={{ fontSize: 11, color: '#6b6560' }}>Valor da máquina no período</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 18, borderTop: '2px dashed #c8960c' }} />
          <span style={{ fontSize: 11, color: '#6b6560' }}>Média do modelo</span>
        </div>
      </div>
      {historico.map((h, i) => (
        <PeriodRow key={h.periodo} h={h} metrica={metrica} maxVal={maxVal}
          metaPct={metaPct} metObj={metObj} isFirst={i === 0}
          modeloLabel={modeloLabel} modelAvg={modelAvg}
        />
      ))}
      <div style={{ marginTop: 10, fontSize: 8, color: '#6b6560', fontStyle: 'italic' }}>
        Cor da barra: verde = acima da média do modelo · âmbar = até 10% abaixo · vermelho = mais de 10% abaixo
      </div>
    </div>
  )
}

// ─── TAB 3: MODELO VS. MODELO ─────────────────────────────────────────────────

function ModelMetricRow({ m, mediasA, mediasB }) {
  const valA   = mediasA[m.key]
  const valB   = mediasB[m.key]
  const maxVal = Math.max(valA, valB) * 1.2
  const pctA   = (valA / maxVal) * 100
  const pctB   = (valB / maxVal) * 100
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <div style={{ width: 140, flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: '#4a3728' }}>{m.label}</div>
        <div style={{ fontSize: 8, color: '#6b6560' }}>{m.unit}</div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ flex: 1, height: 10, background: '#f0ede8', borderRadius: 2 }}>
          <div style={{ height: '100%', width: `${pctA}%`, background: '#2d4a2d', borderRadius: 2 }} />
        </div>
        <div style={{ width: 36, fontSize: 9, fontWeight: 600, color: '#2d4a2d', textAlign: 'right', flexShrink: 0 }}>
          {fmt(valA, m.d)}
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ flex: 1, height: 10, background: '#f0ede8', borderRadius: 2 }}>
          <div style={{ height: '100%', width: `${pctB}%`, background: '#4a3728', borderRadius: 2 }} />
        </div>
        <div style={{ width: 36, fontSize: 9, fontWeight: 600, color: '#4a3728', textAlign: 'right', flexShrink: 0 }}>
          {fmt(valB, m.d)}
        </div>
      </div>
    </div>
  )
}

function ModelCompareTab({ modeloA, modeloB }) {
  const mediasA = MEDIA_MODELO[modeloA]
  const mediasB = MEDIA_MODELO[modeloB]
  return (
    <div style={{ background: '#fff', border: '1px solid #e0dbd4', borderRadius: 6, padding: '14px 16px' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#4a3728', marginBottom: 10 }}>
        Comparativo de modelos — Colheita · Arroz
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 12, height: 12, background: '#2d4a2d', borderRadius: 2 }} />
          <span style={{ fontSize: 11, color: '#6b6560' }}>{modeloA}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 12, height: 12, background: '#4a3728', borderRadius: 2 }} />
          <span style={{ fontSize: 11, color: '#6b6560' }}>{modeloB}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
        <div style={{ width: 140, flexShrink: 0 }} />
        <div style={{ flex: 1, fontSize: 7, color: '#6b6560', fontWeight: 500, paddingLeft: 2 }}>{modeloA}</div>
        <div style={{ flex: 1, fontSize: 7, color: '#6b6560', fontWeight: 500, paddingLeft: 2 }}>{modeloB}</div>
      </div>
      {METRICAS_TAB3.map(m => (
        <ModelMetricRow key={m.key} m={m} mediasA={mediasA} mediasB={mediasB} />
      ))}
      <div style={{ marginTop: 4, fontSize: 8, color: '#6b6560' }}>
        Valores representam a média ponderada de todas as máquinas deste modelo no grupo Porteira, na mesma operação e cultura.
      </div>
    </div>
  )
}

function ModelDropdown({ label, value, onChange }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{
        fontSize: 11, fontWeight: 500, color: '#6b6560', marginBottom: 5,
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {label}
      </div>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width: '100%', padding: '6px 10px', fontSize: 12, color: '#1a1a1a',
        background: '#fff', border: '1px solid #e0dbd4', borderRadius: 4, cursor: 'pointer',
      }}>
        {MODELOS.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export default function BenchmarkEquipamentoPage() {
  const { filters } = useFilters()
  const [activeTab,    setActiveTab]    = useState('maquina-modelo')
  const [maquinaTab1,  setMaquinaTab1]  = useState('36')
  const [maquinaTab2,  setMaquinaTab2]  = useState('36')
  const [metricaTab2,  setMetricaTab2]  = useState('rendimento')
  const [modeloA,      setModeloA]      = useState('John Deere S760')
  const [modeloB,      setModeloB]      = useState('John Deere S660')

  const maqAtiva  = MAQUINAS.find(m => m.cod === (activeTab === 'historico' ? maquinaTab2 : maquinaTab1))
  const operacao  = filters.todasOperacoes ? 'Colheita' : (filters.operacoes[0] || 'Colheita')
  const equipNome = activeTab === 'modelo-modelo' ? '—' : (maqAtiva?.label ?? '—')
  const modeloNomeBC = activeTab === 'modelo-modelo' ? `${modeloA} vs. ${modeloB}` : (maqAtiva?.modelo ?? '—')

  return (
    <div style={{ padding: '24px', maxWidth: 1280, margin: '0 auto' }}>
      <InternalBreadcrumb equipNome={equipNome} modeloNome={modeloNomeBC} operacao={operacao} />

      <TabControl tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'maquina-modelo' && (
        <div>
          <SectionTitle>Selecionar Máquina</SectionTitle>
          <MachineChips selected={maquinaTab1} onSelect={setMaquinaTab1} />
          <CompareTableCard maquinaCod={maquinaTab1} />
        </div>
      )}

      {activeTab === 'historico' && (
        <div>
          <SectionTitle>Selecionar Máquina</SectionTitle>
          <MachineChips selected={maquinaTab2} onSelect={setMaquinaTab2} />
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 11, fontWeight: 500, color: '#6b6560', marginBottom: 5,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Métrica
            </div>
            <select value={metricaTab2} onChange={e => setMetricaTab2(e.target.value)} style={{
              padding: '6px 10px', fontSize: 12, color: '#1a1a1a',
              background: '#fff', border: '1px solid #e0dbd4', borderRadius: 4, cursor: 'pointer',
            }}>
              {METRICAS_TAB2.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>
          <TimelineTab
            maquinaCod={maquinaTab2}
            metrica={metricaTab2}
            modeloNome={MAQUINAS.find(m => m.cod === maquinaTab2)?.modelo ?? 'John Deere S760'}
          />
        </div>
      )}

      {activeTab === 'modelo-modelo' && (
        <div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            <ModelDropdown label="Modelo A" value={modeloA} onChange={setModeloA} />
            <ModelDropdown label="Modelo B" value={modeloB} onChange={setModeloB} />
          </div>
          <ModelCompareTab modeloA={modeloA} modeloB={modeloB} />
        </div>
      )}

      <div style={{
        background: '#f7f5f2', borderTop: '1px solid #e0dbd4', padding: '10px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        margin: '28px -24px -24px',
      }}>
        <span style={{ fontSize: 11, color: '#6b6560' }}>
          Relatório gerado automaticamente · Porteira Adentro Consultoria Agrícola
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#4a3728' }}>PORTEIRA ADENTRO</span>
      </div>
    </div>
  )
}
