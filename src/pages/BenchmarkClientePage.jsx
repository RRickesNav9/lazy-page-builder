// BenchmarkClientePage.jsx
// Compara métricas de um cliente específico contra a média do grupo Porteira.
// Seleção de cliente via filtro global. Cabeçalho dinâmico + export PDF.

import { useState, useRef } from 'react'
import { useFilters } from '../lib/FilterContext'
import { useClienteBenchmark, useGrupoBenchmark } from '../hooks/useData'

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

// ─── COMPONENTES INTERNOS ─────────────────────────────────────────────────────

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

// Legenda de cores
function Legenda() {
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
      {[
        { color: '#2d4a2d', label: 'Este cliente'   },
        { color: '#c8960c', label: 'Média do grupo' },
      ].map(({ color, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#6b6560' }}>
          <span style={{ width: 10, height: 10, background: color, borderRadius: 2, display: 'inline-block', flexShrink: 0 }} />
          {label}
        </div>
      ))}
    </div>
  )
}

// Barras duplas sobrepostas
function BarrasDuplas({ clienteVal, grupoVal, barColor }) {
  const maxVal = Math.max(clienteVal, grupoVal, 0.001)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {[
        { label: 'Cliente', width: (clienteVal / maxVal) * 100, color: barColor },
        { label: 'Grupo',   width: (grupoVal   / maxVal) * 100, color: '#c8960c' },
      ].map(({ label, width, color }) => (
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
    { label: 'COMPARATIVO VISUAL', minWidth: 200                 },
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

function MetricaRow({ cfg, clienteVal, grupoVal, isEven }) {
  const status   = computeStatus(clienteVal, grupoVal, cfg.higherIsBetter)
  const barColor = clienteBarColor(status)
  const badge    = statusBadgeProps(status)
  const diffStr  = fmtPctDiff(clienteVal, grupoVal)
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

// ─── MODAL DE CONFIRMAÇÃO DE EXPORT ──────────────────────────────────────────

function ConfirmExportModal({ cliente, processo, tipoSafra, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 10, padding: 28,
        maxWidth: 380, width: '90%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#2d4a2d" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3M7 7V4a1 1 0 011-1h8a1 1 0 011 1v3" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>Exportar como PDF</span>
        </div>
        <p style={{ fontSize: 13, color: '#4a3728', marginBottom: 6 }}>
          Será gerado um PDF do relatório de benchmark com os seguintes dados:
        </p>
        <div style={{
          background: '#f7f5f2', borderRadius: 6, padding: '10px 14px',
          marginBottom: 20, fontSize: 12, color: '#4a3728', lineHeight: 1.7,
        }}>
          <div><strong>Cliente:</strong> {cliente || '—'}</div>
          <div><strong>Processo:</strong> {processo || '—'}</div>
          <div><strong>Cultura:</strong> {tipoSafra || 'Não especificado'}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '9px 0',
              background: '#f7f5f2', color: '#4a3728',
              border: '1px solid #e0dbd4', borderRadius: 7,
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '9px 0',
              background: '#2d4a2d', color: '#fff',
              border: 'none', borderRadius: 7,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3" />
            </svg>
            Exportar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── FABs FLUTUANTES DA PÁGINA ────────────────────────────────────────────────

// Empilha Export PDF (acima do filtro) e Toggle (acima do export).
// Quando oculto, exibe apenas uma setinha para re-expandir.
// Posicionamento: filtro=bottom:24, export=bottom:84, toggle=bottom:144
function BenchmarkFABs({ onExport, onToggle, showFABs }) {
  const fabBase = {
    position: 'fixed', right: 24, zIndex: 1000,
    width: 48, height: 48, borderRadius: '50%',
    border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
  }

  if (!showFABs) {
    // Somente a seta para expandir, posicionada onde ficaria o filtro
    return (
      <button
        onClick={onToggle}
        title="Mostrar botões"
        className="no-print"
        style={{ ...fabBase, bottom: 24, background: '#4a6741', color: '#fff' }}
      >
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>
    )
  }

  return (
    <>
      {/* Toggle — topo da pilha */}
      <button
        onClick={onToggle}
        title="Ocultar botões"
        className="no-print"
        style={{ ...fabBase, bottom: 144, background: '#4a6741', color: '#fff' }}
      >
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Export PDF */}
      <button
        onClick={onExport}
        title="Exportar PDF"
        className="no-print"
        style={{ ...fabBase, bottom: 84, background: '#2d7a2d', color: '#fff' }}
      >
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3" />
        </svg>
      </button>
    </>
  )
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────

export default function BenchmarkClientePage() {
  const { filters, queryFilters, currentSafra, setShowFABs, showFABs } = useFilters()
  const contentRef = useRef(null)

  const cliente   = filters.cliente    || ''
  const processo  = filters.processo   || ''
  const tipoSafra = filters.tipo_safra || ''

  // Filtros para os hooks — sempre inclui safra corrente para parear cliente vs grupo
  const benchFilters = {
    ...(cliente   && { cliente }),
    ...(processo  && { processo }),
    ...(tipoSafra && { tipo_safra: tipoSafra }),
    safra: currentSafra,
    ...(queryFilters.dataInicio && { dataInicio: queryFilters.dataInicio }),
    ...(queryFilters.dataFim    && { dataFim:    queryFilters.dataFim    }),
  }

  const grupoFilters = {
    ...(processo  && { processo }),
    ...(tipoSafra && { tipo_safra: tipoSafra }),
    safra: currentSafra,
  }

  const { metricas: clienteMetricas, loading: loadingCliente, error: errorCliente } =
    useClienteBenchmark(benchFilters)

  const { data: grupoData, loading: loadingGrupo } =
    useGrupoBenchmark(grupoFilters)

  // Pega a linha do grupo correspondente (processo + tipo_safra + safra)
  const grupoRow = grupoData[0] ?? null

  // Monta o array de pares { clienteVal, grupoVal } na ordem de METRICAS_CONFIG
  const metricas = METRICAS_CONFIG.map(cfg => ({
    clienteVal: clienteMetricas?.[cfg.key] ?? 0,
    grupoVal:   grupoRow ? (grupoRow[`${cfg.key}_grupo`] ?? 0) : 0,
  }))

  const loading = loadingCliente || loadingGrupo
  const semDados = !loading && !clienteMetricas

  const [showConfirmExport, setShowConfirmExport] = useState(false)

  function handleExportConfirm() {
    setShowConfirmExport(false)
    setShowFABs(false)
    requestAnimationFrame(() => {
      window.print()
      setShowFABs(true)
    })
  }

  return (
    <>
      {showConfirmExport && (
        <ConfirmExportModal
          cliente={cliente || '—'}
          processo={processo || '—'}
          tipoSafra={tipoSafra}
          onConfirm={handleExportConfirm}
          onCancel={() => setShowConfirmExport(false)}
        />
      )}

      <BenchmarkFABs
        showFABs={showFABs}
        onExport={() => setShowConfirmExport(true)}
        onToggle={() => setShowFABs(v => !v)}
      />

      <div ref={contentRef} style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 24px' }}>
        <DynamicHeader
          cliente={cliente}
          processo={processo}
          tipoSafra={tipoSafra}
        />

        {loading && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#6b6560', fontSize: 13 }}>
            Carregando dados...
          </div>
        )}

        {!loading && (errorCliente || semDados) && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#8b2020', fontSize: 13 }}>
            {errorCliente
              ? `Erro ao carregar dados: ${errorCliente}`
              : 'Nenhum dado encontrado para os filtros selecionados. Selecione um cliente e operação no filtro.'}
          </div>
        )}

        {!loading && clienteMetricas && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SectionCard
              title="MÉTRICAS COMPARÁVEIS — CLIENTE VS. GRUPO PORTEIRA"
              subtitle="Mesmo tipo de operação e cultura"
              footnote="Grupo Porteira: média ponderada de todos os clientes com a mesma operação e cultura na safra. Quando não há dados de outros clientes, os valores do grupo aparecem como zero."
            >
              <Legenda />
              <MetricasTable metricas={metricas} />
            </SectionCard>
          </div>
        )}
      </div>
    </>
  )
}
