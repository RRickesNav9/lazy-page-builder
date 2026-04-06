// BenchmarkClientePage.jsx
// Compara métricas de um cliente específico contra a média do grupo Porteira.
// Seleção de cliente via chips internos — independente do filtro global.

import { useState } from 'react'

// ─── DADOS E CONFIGURAÇÃO ─────────────────────────────────────────────────────

const CLIENTES = [
  'Arrozeira Pelotas',
  'TioJocaAlimentos PEL',
  'Labrustar',
  'Coragon',
  'Agropecuária Pontal',
]

// Configuração das 7 métricas comparáveis — ordem reflete as linhas da tabela
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
    fmt: (v) => v.toFixed(1) + '%',
    higherIsBetter: true,
    isPct: true,
  },
  {
    key: 'eficiencia_operacional_pct',
    label: 'Eficiência Operacional',
    sub: '% · maior é melhor',
    fmt: (v) => v.toFixed(1) + '%',
    higherIsBetter: true,
    isPct: true,
  },
  {
    key: 'consumo_medio_efetivo_lha',
    label: 'Consumo Efetivo Médio',
    sub: 'L/ha · menor é melhor',
    fmt: (v) => v.toFixed(1),
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
    fmt: (v) => v.toFixed(1) + '%',
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

// Motivos de parada — ordem reflete as linhas da tabela
const PARADAS_CONFIG = [
  'Manutenção na máquina',
  'Aguardar graneleiro',
  'Aguardar ordem',
  'Sem apontamento',
  'Refeição e descanso',
  'Climático',
]

// Dados mock — metricas e paradas em arrays na mesma ordem das configs acima
const MOCK_DATA = {
  'Arrozeira Pelotas': {
    metricas: [
      { clienteVal: 2.03, grupoVal: 1.65 },
      { clienteVal: 57.3, grupoVal: 49.0 },
      { clienteVal: 63.1, grupoVal: 68.0 },
      { clienteVal: 34.9, grupoVal: 30.7 },
      { clienteVal: 5.41, grupoVal: 4.80 },
      { clienteVal: 96.2, grupoVal: 89.0 },
      { clienteVal: 2.31, grupoVal: 2.20 },
    ],
    paradas: [
      { clientePct: 57.1, grupoPct: 22.0 },
      { clientePct: 18.2, grupoPct: 24.0 },
      { clientePct: 18.1, grupoPct: 14.0 },
      { clientePct: 3.5,  grupoPct: 28.0 },
      { clientePct: 1.8,  grupoPct: 8.0  },
      { clientePct: 1.3,  grupoPct: 4.0  },
    ],
  },
  'TioJocaAlimentos PEL': {
    metricas: [
      { clienteVal: 1.52, grupoVal: 1.65 },
      { clienteVal: 51.2, grupoVal: 49.0 },
      { clienteVal: 72.5, grupoVal: 68.0 },
      { clienteVal: 29.1, grupoVal: 30.7 },
      { clienteVal: 4.32, grupoVal: 4.80 },
      { clienteVal: 91.5, grupoVal: 89.0 },
      { clienteVal: 2.05, grupoVal: 2.20 },
    ],
    paradas: [
      { clientePct: 31.2, grupoPct: 22.0 },
      { clientePct: 22.5, grupoPct: 24.0 },
      { clientePct: 15.8, grupoPct: 14.0 },
      { clientePct: 19.3, grupoPct: 28.0 },
      { clientePct: 7.4,  grupoPct: 8.0  },
      { clientePct: 3.8,  grupoPct: 4.0  },
    ],
  },
  'Labrustar': {
    metricas: [
      { clienteVal: 1.81, grupoVal: 1.65 },
      { clienteVal: 49.5, grupoVal: 49.0 },
      { clienteVal: 65.0, grupoVal: 68.0 },
      { clienteVal: 31.8, grupoVal: 30.7 },
      { clienteVal: 4.95, grupoVal: 4.80 },
      { clienteVal: 88.2, grupoVal: 89.0 },
      { clienteVal: 2.18, grupoVal: 2.20 },
    ],
    paradas: [
      { clientePct: 18.5, grupoPct: 22.0 },
      { clientePct: 26.0, grupoPct: 24.0 },
      { clientePct: 12.5, grupoPct: 14.0 },
      { clientePct: 32.8, grupoPct: 28.0 },
      { clientePct: 6.5,  grupoPct: 8.0  },
      { clientePct: 3.7,  grupoPct: 4.0  },
    ],
  },
  'Coragon': {
    metricas: [
      { clienteVal: 1.43, grupoVal: 1.65 },
      { clienteVal: 44.8, grupoVal: 49.0 },
      { clienteVal: 58.3, grupoVal: 68.0 },
      { clienteVal: 27.6, grupoVal: 30.7 },
      { clienteVal: 4.20, grupoVal: 4.80 },
      { clienteVal: 93.7, grupoVal: 89.0 },
      { clienteVal: 1.95, grupoVal: 2.20 },
    ],
    paradas: [
      { clientePct: 25.3, grupoPct: 22.0 },
      { clientePct: 28.5, grupoPct: 24.0 },
      { clientePct: 16.2, grupoPct: 14.0 },
      { clientePct: 22.1, grupoPct: 28.0 },
      { clientePct: 5.1,  grupoPct: 8.0  },
      { clientePct: 2.8,  grupoPct: 4.0  },
    ],
  },
  'Agropecuária Pontal': {
    metricas: [
      { clienteVal: 1.76, grupoVal: 1.65 },
      { clienteVal: 46.0, grupoVal: 49.0 },
      { clienteVal: 74.2, grupoVal: 68.0 },
      { clienteVal: 33.5, grupoVal: 30.7 },
      { clienteVal: 5.10, grupoVal: 4.80 },
      { clienteVal: 85.1, grupoVal: 89.0 },
      { clienteVal: 2.40, grupoVal: 2.20 },
    ],
    paradas: [
      { clientePct: 14.2, grupoPct: 22.0 },
      { clientePct: 18.9, grupoPct: 24.0 },
      { clientePct: 11.3, grupoPct: 14.0 },
      { clientePct: 43.8, grupoPct: 28.0 },
      { clientePct: 9.5,  grupoPct: 8.0  },
      { clientePct: 2.3,  grupoPct: 4.0  },
    ],
  },
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

// Determina status de posicionamento do cliente vs grupo
function computeStatus(clienteVal, grupoVal, higherIsBetter) {
  if (!grupoVal) return 'referencia'
  const ratio = clienteVal / grupoVal
  if (higherIsBetter) {
    if (ratio >= 1.10) return 'acima'
    if (ratio >= 0.90) return 'na-media'
    return 'abaixo'
  }
  // menor é melhor: cliente abaixo do grupo é "acima"
  if (ratio <= 0.90) return 'acima'
  if (ratio <= 1.10) return 'na-media'
  return 'abaixo'
}

// Formata diferença pp para tabela de métricas (arredonda ao inteiro mais próximo)
function fmtMetricPpDiff(diff) {
  const sign = diff >= 0 ? '+' : '−'
  return `${sign}${Math.round(Math.abs(diff))}pp`
}

// Formata diferença percentual relativa com 1 decimal (strip .0, vírgula pt-BR)
function fmtMetricPctDiff(clienteVal, grupoVal) {
  const pct = grupoVal > 0 ? (clienteVal / grupoVal - 1) * 100 : 0
  const sign = pct >= 0 ? '+' : '−'
  const abs = Math.abs(pct)
  const str = abs.toFixed(1).replace(/\.0$/, '').replace('.', ',')
  return `${sign}${str}%`
}

// Formata delta de parada com 1 decimal (strip .0, vírgula pt-BR)
function fmtParadaDelta(delta) {
  const sign = delta >= 0 ? '+' : '−'
  const abs = Math.abs(delta)
  const str = abs.toFixed(1).replace(/\.0$/, '').replace('.', ',')
  return `${sign}${str}pp`
}

// Retorna propriedades do badge de status (cor e texto)
function statusBadgeProps(status) {
  const MAP = {
    'acima':      { bg: '#edf5ed', fg: '#1e4d1e', text: 'Acima'      },
    'na-media':   { bg: '#fdf6e3', fg: '#7a5c00', text: 'Na média'   },
    'abaixo':     { bg: '#fdf0f0', fg: '#8b2020', text: 'Abaixo'     },
    'referencia': { bg: '#f0ede8', fg: '#4a3728', text: 'Referência' },
  }
  return MAP[status] ?? MAP['referencia']
}

// Retorna cor da barra do cliente baseada no status
function clienteBarColor(status) {
  if (status === 'acima')    return '#2d4a2d'
  if (status === 'na-media') return '#c8960c'
  return '#8b2020'
}

// Verifica se o delta é favorável ao cliente (guia a cor da célula DIFERENÇA)
function isFavoravel(clienteVal, grupoVal, higherIsBetter) {
  return higherIsBetter ? clienteVal >= grupoVal : clienteVal <= grupoVal
}

// ─── COMPONENTES INTERNOS ─────────────────────────────────────────────────────

// Chips horizontais para seleção de cliente — estado interno da página
function ClienteChips({ selecionado, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 9, color: '#6b6560', flexShrink: 0 }}>Cliente:</span>
      {CLIENTES.map((c) => {
        const ativo = c === selecionado
        return (
          <button
            key={c}
            onClick={() => onChange(c)}
            style={{
              padding: '4px 10px', borderRadius: 4, fontSize: 11, cursor: 'pointer',
              fontWeight: ativo ? 600 : 400,
              background: ativo ? '#2d4a2d' : '#f7f5f2',
              color: ativo ? '#ffffff' : '#4a3728',
              border: ativo ? 'none' : '1px solid #e0dbd4',
            }}
          >
            {c}
          </button>
        )
      })}
    </div>
  )
}

// Legenda de cores usada acima das duas tabelas
function Legenda() {
  const items = [
    { color: '#2d4a2d', label: 'Este cliente'   },
    { color: '#c8960c', label: 'Média do grupo' },
  ]
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
      {items.map(({ color, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#6b6560' }}>
          <span style={{ width: 10, height: 10, background: color, borderRadius: 2, display: 'inline-block', flexShrink: 0 }} />
          {label}
        </div>
      ))}
    </div>
  )
}

// Barras duplas sobrepostas para coluna COMPARATIVO VISUAL
function BarrasDuplas({ clienteVal, grupoVal, barColor }) {
  const maxVal = Math.max(clienteVal, grupoVal, 0.001)
  const rows = [
    { label: 'Cliente', width: (clienteVal / maxVal) * 100, color: barColor },
    { label: 'Grupo',   width: (grupoVal   / maxVal) * 100, color: '#c8960c' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {rows.map(({ label, width, color }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 46, flexShrink: 0, fontSize: 7, color: '#6b6560', textAlign: 'right' }}>
            {label}
          </span>
          <div style={{ flex: 1, height: 7, background: '#f0ede8', borderRadius: 2, overflow: 'hidden', minWidth: 100 }}>
            <div style={{ height: '100%', width: `${width}%`, background: color, borderRadius: 2 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// Card branco de seção com título, subtítulo opcional e rodapé opcional
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

// ─── BLOCO 1 — TABELA DE MÉTRICAS ─────────────────────────────────────────────

// Cabeçalho da tabela de métricas
function MetricasHeader() {
  const cols = [
    { label: 'MÉTRICA',            width: 160                    },
    { label: 'CLIENTE',            width: 80,  align: 'center'  },
    { label: 'GRUPO',              width: 80,  align: 'center'  },
    { label: 'COMPARATIVO VISUAL', minWidth: 200                 },
    { label: 'DIFERENÇA',          width: 70,  align: 'center'  },
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

// Uma linha da tabela de métricas comparáveis
function MetricaRow({ cfg, clienteVal, grupoVal, isEven }) {
  const status   = computeStatus(clienteVal, grupoVal, cfg.higherIsBetter)
  const barColor = clienteBarColor(status)
  const badge    = statusBadgeProps(status)
  const diffStr  = cfg.isPct
    ? fmtMetricPpDiff(clienteVal - grupoVal)
    : fmtMetricPctDiff(clienteVal, grupoVal)
  const diffColor = isFavoravel(clienteVal, grupoVal, cfg.higherIsBetter)
    ? '#1e4d1e'
    : '#8b2020'

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
      <td style={{ padding: '9px 10px', minWidth: 200 }}>
        <BarrasDuplas clienteVal={clienteVal} grupoVal={grupoVal} barColor={barColor} />
      </td>
      <td style={{ padding: '9px 10px', width: 70, textAlign: 'center' }}>
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

// Tabela completa de métricas comparáveis
function MetricasTable({ metricas }) {
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
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── BLOCO 2 — TABELA DE PARADAS ──────────────────────────────────────────────

// Determina badge de alerta de parada baseado no delta cliente vs grupo
function paradaAlertaBadge(clientePct, grupoPct) {
  const delta = clientePct - grupoPct
  const str   = fmtParadaDelta(delta)
  if (delta > 10)  return { text: `▲ ${str}`, bg: '#fdf0f0', fg: '#8b2020' }
  if (delta < -10) return { text: str,         bg: '#edf5ed', fg: '#1e4d1e' }
  return               { text: str,             bg: '#f7f5f2', fg: '#6b6560' }
}

// Uma linha da tabela de motivos de parada
function ParadaRow({ label, clientePct, grupoPct, maxPct, isEven }) {
  const cW    = maxPct > 0 ? (clientePct / maxPct) * 100 : 0
  const gW    = maxPct > 0 ? (grupoPct   / maxPct) * 100 : 0
  const badge = paradaAlertaBadge(clientePct, grupoPct)

  return (
    <tr style={{ background: isEven ? '#ffffff' : '#fafaf8' }}>
      <td style={{ padding: '9px 10px', width: 180, fontSize: 11, fontWeight: 500, color: '#4a3728' }}>
        {label}
      </td>
      <td style={{ padding: '9px 10px', width: 60, textAlign: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#4a3728' }}>
          {clientePct.toFixed(1)}%
        </span>
      </td>
      <td style={{ padding: '9px 10px', width: 60, textAlign: 'center' }}>
        <span style={{ fontSize: 11, color: '#6b6560' }}>{grupoPct.toFixed(1)}%</span>
      </td>
      <td style={{ padding: '9px 10px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { label: 'Cliente', width: cW, color: '#2d4a2d' },
            { label: 'Grupo',   width: gW, color: '#c8960c' },
          ].map(({ label: l, width, color }) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 46, flexShrink: 0, fontSize: 7, color: '#6b6560', textAlign: 'right' }}>
                {l}
              </span>
              <div style={{ flex: 1, height: 7, background: '#f0ede8', borderRadius: 2, overflow: 'hidden', minWidth: 100 }}>
                <div style={{ height: '100%', width: `${width}%`, background: color, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
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

// Tabela completa de motivos de parada
function ParadasTable({ paradas }) {
  const allPcts = paradas.flatMap((p) => [p.clientePct, p.grupoPct])
  const maxPct  = Math.max(...allPcts, 1)

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {[
              { label: 'MOTIVO',             width: 180               },
              { label: 'CLIENTE',            width: 60, align: 'center' },
              { label: 'GRUPO',              width: 60, align: 'center' },
              { label: 'COMPARATIVO VISUAL'                            },
              { label: 'ALERTA',             width: 70, align: 'center' },
            ].map((c) => (
              <th
                key={c.label}
                style={{
                  background: '#2d4a2d', color: '#ffffff',
                  fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em',
                  padding: '6px 10px', fontWeight: 600,
                  textAlign: c.align || 'left', width: c.width,
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PARADAS_CONFIG.map((label, i) => (
            <ParadaRow
              key={label}
              label={label}
              clientePct={paradas[i].clientePct}
              grupoPct={paradas[i].grupoPct}
              maxPct={maxPct}
              isEven={i % 2 === 0}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

export default function BenchmarkClientePage() {
  const [clienteSelecionado, setClienteSelecionado] = useState(CLIENTES[0])
  const dados = MOCK_DATA[clienteSelecionado]

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 24px' }}>
      <ClienteChips selecionado={clienteSelecionado} onChange={setClienteSelecionado} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <SectionCard
          title="MÉTRICAS COMPARÁVEIS — CLIENTE VS. GRUPO PORTEIRA"
          subtitle="Mesmo tipo de operação e cultura"
          footnote="Grupo Porteira: média ponderada de todos os clientes com a mesma operação e cultura no período. Quando não há dados de outros clientes, são usadas referências históricas da safra anterior."
        >
          <Legenda />
          <MetricasTable metricas={dados.metricas} />
        </SectionCard>
        <SectionCard title="MOTIVOS DE PARADA — CLIENTE VS. GRUPO PORTEIRA (%)">
          <Legenda />
          <ParadasTable paradas={dados.paradas} />
        </SectionCard>
      </div>
    </div>
  )
}
