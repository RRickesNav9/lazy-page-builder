// BenchmarkClientePage.jsx
// Compara métricas de um cliente específico contra a média do grupo Porteira.
// Seleção de cliente via filtro global. Export via window.print() (FAB global).

import { useState, useMemo } from 'react'
import { useFilters } from '../lib/FilterContext'
import { useClienteBenchmark, useGrupoBenchmark, useEquipamentoBenchmark } from '../hooks/useData'

// ─── CONFIGURAÇÃO ─────────────────────────────────────────────────────────────

const METRICAS_CONFIG = [
  {
    key: 'rendimento_operacional_hah',
    label: 'Rendimento Operacional',
    sub: 'ha/h · maior é melhor',
    fmt: (v) => v.toFixed(2),
    higherIsBetter: true,
    isPct: false,
  },
  {
    key: 'eficiencia_geral_pct',
    label: 'Eficiência Geral',
    sub: '% · maior é melhor',
    fmt: (v) => v.toFixed(2) + '%',
    higherIsBetter: true,
    isPct: true,
  },
  {
    key: 'eficiencia_operacional_pct',
    label: 'Eficiência Operacional',
    sub: '% · maior é melhor',
    fmt: (v) => v.toFixed(2) + '%',
    higherIsBetter: true,
    isPct: true,
  },
  {
    key: 'consumo_medio_efetivo_lha',
    label: 'Consumo Efetivo Médio',
    sub: 'L/ha · menor é melhor',
    fmt: (v) => v.toFixed(2),
    higherIsBetter: false,
    isPct: false,
  },
  {
    key: 'consumo_medio_lh',
    label: 'Consumo Médio',
    sub: 'L/h · menor é melhor',
    fmt: (v) => v.toFixed(2),
    higherIsBetter: false,
    isPct: false,
  },
  {
    key: 'disponibilidade_mecanica_pct',
    label: 'Disponibilidade Mecânica',
    sub: '% · maior é melhor',
    fmt: (v) => v.toFixed(2) + '%',
    higherIsBetter: true,
    isPct: true,
  },
  {
    key: 'velocidade_media_kmh',
    label: 'Velocidade Média Op.',
    sub: 'km/h · maior é melhor',
    fmt: (v) => v.toFixed(2),
    higherIsBetter: true,
    isPct: false,
  },
]

const TABS = [
  { id: 'colheita', label: 'Colheita' },
  { id: 'plantio',  label: 'Plantio'  },
  { id: 'geral',    label: 'Geral'    },
]

const TAB_PROCESSO = {
  colheita: 'Colheita',
  plantio:  'Plantio',
  geral:    'Aplicação',
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

// Calcula limiares de zona ruim e bom a partir dos modelos de equipamento.
// N = min(3, floor(n/2)): garante que os grupos pior e melhor nunca se sobrepõem
// e escala com o tamanho da frota (frota pequena → N menor).
// Retorna { bad, good } ou null se não houver dados suficientes.
function computeZoneBoundaries(equipRows, metricKey, higherIsBetter) {
  const vals = equipRows
    .map(r => r[`${metricKey}_modelo`])
    .filter(v => v != null && v > 0)

  const n = vals.length
  const N = Math.min(3, Math.floor(n / 2))
  if (N === 0) return null  // 0 ou 1 equipamento: não há como distinguir zonas

  // Ordena pior → melhor (ascendente para higherIsBetter, descendente para consumo)
  const sorted = higherIsBetter
    ? [...vals].sort((a, b) => a - b)
    : [...vals].sort((a, b) => b - a)

  // Piores N (início) e melhores N (fim) — por construção nunca se sobrepõem
  const worst = sorted.slice(0, N)
  const best  = sorted.slice(n - N)

  const bad  = worst.reduce((s, v) => s + v, 0) / N
  const good = best.reduce((s, v) => s + v, 0) / N

  // Sanidade: se os grupos inverterem (edge case com dados atípicos), descarta
  if (higherIsBetter  && bad >= good) return null
  if (!higherIsBetter && bad <= good) return null

  return { bad, good }
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
        <span style={valueStyle}>{tipoSafra || 'Não especificado'}</span>
      </div>
    </div>
  )
}

// Legenda de marcadores
function Legenda({ cliente }) {
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#6b6560' }}>
        <span style={{ width: 3, height: 14, background: '#555', borderRadius: 2, display: 'inline-block', flexShrink: 0 }} />
        {cliente || 'Cliente'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#6b6560' }}>
        <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <span style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '5px solid #c8960c' }} />
          <span style={{ width: 2, height: 7, background: '#c8960c', borderRadius: 1 }} />
        </span>
        Média do grupo
      </div>
    </div>
  )
}

// Linear gauge com zonas de largura fixa (cada uma = 1/3 da barra).
// Escala piecewise: cada zona mapeia seu intervalo de dados linearmente ao seu terço.
// Marcadores (cliente e grupo) são posicionados proporcionalmente dentro do terço correspondente.
// O grupo tende a cair perto do centro (50%) pois os limiares são simétricos em torno da média.
function LinearGauge({ clienteVal, grupoVal, barColor, zones, fmt }) {
  // Fallback sem zonas: gauge linear simples
  if (!zones) {
    const scaleMax  = Math.max(clienteVal, grupoVal, 0.001) * 1.1
    const clientePct = Math.min((clienteVal / scaleMax) * 100, 100)
    const grupoPct   = Math.min((grupoVal   / scaleMax) * 100, 100)
    return (
      <div style={{ minWidth: 180, paddingTop: 6 }}>
        <div style={{ height: 10, borderRadius: 5, background: '#f0ede8', position: 'relative', overflow: 'visible' }}>
          <div style={{ position: 'absolute', left: `${grupoPct}%`, top: -7, transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '5px solid #c8960c', zIndex: 4 }} />
          <div style={{ position: 'absolute', left: `${grupoPct}%`, top: -1, bottom: -1, width: 2, background: '#c8960c', transform: 'translateX(-50%)', borderRadius: 1, zIndex: 3 }} />
          <div style={{ position: 'absolute', left: `${clientePct}%`, top: -3, bottom: -3, width: 3, background: barColor, transform: 'translateX(-50%)', borderRadius: 2, zIndex: 5 }} />
        </div>
      </div>
    )
  }

  const { bad, good, higherIsBetter } = zones
  const Z = 100 / 3  // largura de cada terço

  // Valor máximo da escala: garante que o marcador do cliente nunca sai da barra
  const maxVal = Math.max(clienteVal, grupoVal, higherIsBetter ? good : bad, 0.001) * 1.15

  // Escala piecewise: [zona1_min, zona1_max] → [0, Z], [zona2_min, zona2_max] → [Z, 2Z], [zona3_min, +∞] → [2Z, 3Z]
  function toPct(v) {
    if (higherIsBetter) {
      if (v <= 0)    return 0
      if (v <= bad)  return (v / bad) * Z
      if (v <= good) return Z + ((v - bad) / (good - bad)) * Z
      return Math.min(2 * Z + ((v - good) / (maxVal - good)) * Z, 100)
    } else {
      // Menor é melhor: zona verde [0→good] à esquerda, vermelha [bad→max] à direita
      if (v <= 0)    return 0
      if (v <= good) return (v / good) * Z
      if (v <= bad)  return Z + ((v - good) / (bad - good)) * Z
      return Math.min(2 * Z + ((v - bad) / (maxVal - bad)) * Z, 100)
    }
  }

  const clientePct = toPct(clienteVal)
  const grupoPct   = toPct(grupoVal)

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

  // Labels sempre nos centros fixos dos terços (independem dos valores)
  const centers = [Z / 2, Z * 1.5, Z * 2.5]
  const zoneLabels = higherIsBetter
    ? [
        { pos: centers[0], val: bad,              color: '#a02d20' },
        { pos: centers[1], val: (bad + good) / 2, color: '#7a5c00' },
        { pos: centers[2], val: good,             color: '#2a5c2a' },
      ]
    : [
        { pos: centers[0], val: good,             color: '#2a5c2a' },
        { pos: centers[1], val: (good + bad) / 2, color: '#7a5c00' },
        { pos: centers[2], val: bad,              color: '#a02d20' },
      ]

  return (
    <div style={{ minWidth: 180, paddingTop: 6 }}>
      <div style={{ height: 10, borderRadius: 5, position: 'relative', overflow: 'visible' }}>

        {/* Terços de largura fixa */}
        {zoneSegs.map((z, i) => (
          <div key={i} style={{
            position: 'absolute', left: `${z.left}%`, width: `${Z}%`,
            top: 0, height: '100%', background: z.color, borderRadius: z.r,
          }} />
        ))}

        {/* Marcador do grupo: triângulo + linha âmbar */}
        <div style={{ position: 'absolute', left: `${grupoPct}%`, top: -7, transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '5px solid #c8960c', zIndex: 4 }} />
        <div style={{ position: 'absolute', left: `${grupoPct}%`, top: -1, bottom: -1, width: 2, background: '#c8960c', transform: 'translateX(-50%)', borderRadius: 1, zIndex: 3 }} />

        {/* Marcador do cliente */}
        <div style={{ position: 'absolute', left: `${clientePct}%`, top: -3, bottom: -3, width: 3, background: barColor, transform: 'translateX(-50%)', borderRadius: 2, zIndex: 5 }} />
      </div>

      {/* Labels nos centros fixos de cada terço */}
      <div style={{ position: 'relative', height: 13, marginTop: 3 }}>
        {zoneLabels.map(({ pos, val, color }, i) => (
          <span key={i} style={{ position: 'absolute', left: `${pos}%`, transform: 'translateX(-50%)', fontSize: 7, fontWeight: 600, color, whiteSpace: 'nowrap' }}>
            {fmt(val)}
          </span>
        ))}
      </div>
    </div>
  )
}

// Card branco de seção
function SectionCard({ title, subtitle, footnote, children }) {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e0dbd4', borderRadius: 6, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
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
      {children}
      {footnote && (
        <div style={{ marginTop: 14, fontSize: 8, color: '#6b6560', fontStyle: 'italic' }}>
          {footnote}
        </div>
      )}
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

function MetricaRow({ cfg, clienteVal, grupoVal, isEven, zoneInfo }) {
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
    <tr style={{ background: isEven ? '#ffffff' : '#fafaf8' }}>
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

function MetricasTable({ metricas, zoneThresholds }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><MetricasHeader /></thead>
        <tbody>
          {METRICAS_CONFIG.map((cfg, i) => (
            <MetricaRow
              key={cfg.key}
              cfg={cfg}
              clienteVal={metricas[i].clienteVal}
              grupoVal={metricas[i].grupoVal}
              isEven={i % 2 === 0}
              zoneInfo={zoneThresholds?.[cfg.key]}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

export default function BenchmarkClientePage() {
  const { filters, queryFilters, currentSafra } = useFilters()
  const [activeTab, setActiveTab] = useState('colheita')

  const cliente   = filters.cliente    || ''
  const processo  = TAB_PROCESSO[activeTab]
  const tipoSafra = filters.tipo_safra || ''

  // Filtros para os hooks — processo sempre vem do tab ativo, não do filtro global
  const benchFilters = {
    ...(cliente   && { cliente }),
    processo,
    ...(tipoSafra && { tipo_safra: tipoSafra }),
    safra: currentSafra,
    ...(queryFilters.dataInicio && { dataInicio: queryFilters.dataInicio }),
    ...(queryFilters.dataFim    && { dataFim:    queryFilters.dataFim    }),
  }

  const grupoFilters = {
    processo,
    ...(tipoSafra && { tipo_safra: tipoSafra }),
    safra: currentSafra,
  }

  const { metricas: clienteMetricas, loading: loadingCliente, error: errorCliente } =
    useClienteBenchmark(benchFilters)

  const { data: grupoData, loading: loadingGrupo } =
    useGrupoBenchmark(grupoFilters)

  // Busca todos os modelos de equipamento do mesmo processo/safra para calcular limiares de zona
  const { data: equipData } = useEquipamentoBenchmark(grupoFilters)

  // Limiares de zona: ruim = avg dos N piores, bom = avg dos N melhores (N = min(3, floor(n/2)))
  const zoneThresholds = useMemo(() => {
    if (!equipData || equipData.length === 0) return {}
    const result = {}
    for (const cfg of METRICAS_CONFIG) {
      const boundaries = computeZoneBoundaries(equipData, cfg.key, cfg.higherIsBetter)
      if (boundaries) result[cfg.key] = boundaries
    }
    return result
  }, [equipData])

  // Pega a linha do grupo correspondente (processo + tipo_safra + safra)
  const grupoRow = grupoData[0] ?? null

  // Monta o array de pares { clienteVal, grupoVal } na ordem de METRICAS_CONFIG
  const metricas = METRICAS_CONFIG.map(cfg => ({
    clienteVal: clienteMetricas?.[cfg.key] ?? 0,
    grupoVal:   grupoRow ? (grupoRow[`${cfg.key}_grupo`] ?? 0) : 0,
  }))

  const loading = loadingCliente || loadingGrupo
  const semDados = !loading && !clienteMetricas

  return (
    <>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 24px' }}>
        <DynamicHeader
          cliente={cliente}
          processo={processo}
          tipoSafra={tipoSafra}
        />

        <TabControl tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {filters.metricFilter?.field && filters.metricFilter?.value !== '' && filters.metricFilter?.value != null && (
          <div style={{ background: '#edf5ed', border: '1px solid #4a6741', borderRadius: 6, padding: '8px 14px', marginBottom: 18, fontSize: 12, color: '#1e4d1e' }}>
            Filtro de métrica ativo nesta safra — os resultados refletem o período e dimensões selecionados.
          </div>
        )}

        {loading && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#6b6560', fontSize: 13 }}>
            Carregando dados...
          </div>
        )}

        {!loading && (errorCliente || semDados) && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#8b2020', fontSize: 13 }}>
            {errorCliente
              ? `Erro ao carregar dados: ${errorCliente}`
              : 'Nenhum dado encontrado para os filtros selecionados. Selecione um cliente e processo no filtro.'}
          </div>
        )}

        {!loading && clienteMetricas && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SectionCard
              title="MÉTRICAS COMPARÁVEIS — CLIENTE VS. GRUPO PORTEIRA"
            >
              <Legenda cliente={cliente} />
              <MetricasTable metricas={metricas} zoneThresholds={zoneThresholds} />
            </SectionCard>
          </div>
        )}
      </div>
    </>
  )
}
