import { useState } from 'react'
import { METRICAS, NIVEIS_ANALISE } from '../lib/utils'

// Semáforo por % absoluto (disponibilidade, eficiência): crítico <70, atenção 70-95, adequado >95
export function semaphorePct(value) {
  if (value == null || isNaN(value)) return { cls: 'text-pa-muted', bg: 'bg-pa-surface-2' }
  if (value >= 95) return { cls: 'text-pa-green', bg: 'bg-pa-green-dim' }
  if (value >= 70) return { cls: 'text-pa-amber', bg: 'bg-pa-amber-dim' }
  return { cls: 'text-pa-red', bg: 'bg-pa-red-dim' }
}

// Semáforo por ratio vs benchmark
export function semaphoreRatio(value, benchmark, higherIsBetter = true) {
  if (!benchmark || value == null) return { cls: 'text-pa-text', bg: '' }
  const ratio = value / benchmark
  const ok = higherIsBetter ? ratio >= 0.95 : ratio <= 1.05
  const warn = higherIsBetter ? ratio >= 0.80 : ratio <= 1.20
  if (ok)   return { cls: 'text-pa-green', bg: 'bg-pa-green-dim' }
  if (warn) return { cls: 'text-pa-amber', bg: 'bg-pa-amber-dim' }
  return { cls: 'text-pa-red', bg: 'bg-pa-red-dim' }
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
export function KPICard({ label, value, unit, benchmark, benchmarkLabel, pctValue, ratioBenchmark }) {
  // pctValue: número bruto para semáforo absoluto (ex: 94.5)
  // ratioBenchmark: { value, benchmark, higherIsBetter } para semáforo relativo
  const sem = pctValue != null
    ? semaphorePct(pctValue)
    : ratioBenchmark != null
      ? semaphoreRatio(ratioBenchmark.value, ratioBenchmark.benchmark, ratioBenchmark.higherIsBetter)
      : { cls: 'text-pa-green', bg: '' }

  return (
    <div className="rounded-xl border border-pa-border bg-pa-surface p-4">
      <p className="text-xs font-medium text-pa-muted uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${sem.cls}`}>
        {value ?? '—'}
        {unit && <span className="text-sm font-normal text-pa-muted ml-1">{unit}</span>}
      </p>
      {benchmark && (
        <p className="text-xs text-pa-muted mt-1">
          Porteira: <span className="text-pa-text">{benchmark}</span>
          {benchmarkLabel && <span className="ml-1 text-pa-faint">{benchmarkLabel}</span>}
        </p>
      )}
    </div>
  )
}

// ── Donut Chart (SVG puro) ────────────────────────────────────────────────────
export function DonutChart({ data, centerLabel, size = 160 }) {
  if (!data?.length) return (
    <div className="flex items-center justify-center h-40 text-pa-muted text-sm">Sem dados</div>
  )

  const r = size * 0.36
  const cx = size / 2
  const strokeWidth = size * 0.14
  const total = data.reduce((a, d) => a + d.value, 0)

  let offset = 0
  const circumference = 2 * Math.PI * r

  const segments = data.map((d) => {
    const pct = d.value / total
    const dash = pct * circumference
    const gap = circumference - dash
    const seg = { ...d, dash, gap, offset, pct }
    offset += dash
    return seg
  })

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--donut-track)" strokeWidth={strokeWidth} />
        {segments.map((seg, i) => (
          <circle
            key={i} cx={cx} cy={cx} r={r} fill="none"
            stroke={seg.color} strokeWidth={strokeWidth}
            strokeDasharray={`${seg.dash} ${seg.gap}`}
            strokeDashoffset={-seg.offset}
            strokeLinecap="butt"
            style={{ transform: `rotate(-90deg)`, transformOrigin: `${cx}px ${cx}px` }}
          />
        ))}
        {centerLabel && (
          <>
            <text x={cx} y={cx - 6} textAnchor="middle" fill="var(--donut-center-text)" fontSize={size * 0.13} fontWeight="700" fontFamily="monospace">
              {centerLabel.value}
            </text>
            <text x={cx} y={cx + size * 0.1} textAnchor="middle" fill="var(--donut-center-sub)" fontSize={size * 0.072}>
              {centerLabel.label}
            </text>
          </>
        )}
      </svg>
      <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-pa-muted">
            <span className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: seg.color }} />
            {seg.label}
            <span className="text-pa-text font-medium">{seg.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Horizontal Bar Chart ──────────────────────────────────────────────────────
export function HBarChart({ data }) {
  if (!data?.length) return (
    <div className="text-pa-muted text-sm py-4 text-center">Sem dados</div>
  )
  const max = Math.max(...data.map(d => d.value || 0))
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-xs text-pa-muted truncate max-w-[55%]" title={d.label}>{d.label}</span>
            <div className="flex items-center gap-2">
              {d.benchmark != null && (
                <span className="text-xs text-pa-faint">ref: {d.benchmark.toFixed(1)}</span>
              )}
              <span className="text-xs font-bold text-pa-text tabular-nums">{(d.value || 0).toFixed(2)}</span>
            </div>
          </div>
          <div className="relative h-5 rounded overflow-hidden bg-pa-surface-2">
            <div
              className="absolute left-0 top-0 h-full rounded transition-all duration-500"
              style={{ width: `${max > 0 ? (d.value / max) * 100 : 0}%`, background: d.color || 'var(--pa-green)' }}
            />
            {d.benchmark != null && (
              <div
                className="absolute top-0 h-full w-0.5 bg-pa-muted/40"
                style={{ left: `${max > 0 ? (d.benchmark / max) * 100 : 0}%` }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Data Table com ordenação ──────────────────────────────────────────────────
export function DataTable({ rows, columns, highlightCol }) {
  const [sort, setSort] = useState({ col: null, dir: 'desc' })

  const sorted = [...rows].sort((a, b) => {
    if (!sort.col) return 0
    const va = a[sort.col] ?? ''
    const vb = b[sort.col] ?? ''
    const na = parseFloat(va)
    const nb = parseFloat(vb)
    const cmp = isNaN(na) ? String(va).localeCompare(String(vb)) : na - nb
    return sort.dir === 'asc' ? cmp : -cmp
  })

  const toggleSort = (col) => {
    setSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'desc' })
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-pa-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-pa-border bg-pa-surface-2">
            {columns.map(col => (
              <th
                key={col.key}
                onClick={() => toggleSort(col.key)}
                className={`px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors
                  ${sort.col === col.key ? 'text-pa-green' : 'text-pa-muted hover:text-pa-text'}`}
              >
                {col.label}
                {sort.col === col.key && <span className="ml-1">{sort.dir === 'asc' ? '↑' : '↓'}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} className="border-b border-pa-border/50 hover:bg-pa-surface-2 transition-colors">
              {columns.map(col => (
                <td
                  key={col.key}
                  className={`px-3 py-2 tabular-nums ${col.key === highlightCol ? 'font-bold text-pa-green' : 'text-pa-text'}`}
                >
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
          {!sorted.length && (
            <tr>
              <td colSpan={columns.length} className="text-center py-8 text-pa-faint">
                Nenhum registro encontrado
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ── Filter Bar ────────────────────────────────────────────────────────────────
export function FilterBar({ filters, onChange, options, showNivel = false, showMetrica = false }) {
  const set = (key, val) => onChange({ ...filters, [key]: val || undefined })

  const inputCls = "bg-pa-surface border border-pa-border rounded-lg px-3 py-1.5 text-sm text-pa-text focus:outline-none focus:border-pa-green"

  return (
    <div className="flex flex-wrap gap-2 items-end">
      {/* Date range */}
      <div className="flex flex-col gap-0.5">
        <label className="text-xs text-pa-muted">De</label>
        <input
          type="date" value={filters.dataInicio || ''}
          onChange={e => set('dataInicio', e.target.value)}
          className={inputCls}
        />
      </div>
      <div className="flex flex-col gap-0.5">
        <label className="text-xs text-pa-muted">Até</label>
        <input
          type="date" value={filters.dataFim || ''}
          onChange={e => set('dataFim', e.target.value)}
          className={inputCls}
        />
      </div>

      {/* Dropdowns dinâmicos */}
      {[
        { key: 'cliente',      label: 'Cliente',    opts: options.clientes },
        { key: 'propriedade',  label: 'Fazenda',    opts: options.propriedades },
        { key: 'safra',        label: 'Safra',      opts: options.safras },
        { key: 'tipo_safra',   label: 'Cultura',    opts: options.tipos_safra },
        { key: 'processo',     label: 'Processo',   opts: options.processos },
      ].map(({ key, label, opts }) => (
        <div key={key} className="flex flex-col gap-0.5">
          <label className="text-xs text-pa-muted">{label}</label>
          <select
            value={filters[key] || ''}
            onChange={e => set(key, e.target.value)}
            className={`${inputCls} min-w-[130px]`}
          >
            <option value="">Todos</option>
            {opts?.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      ))}

      {showNivel && (
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-pa-muted">Nível de Análise</label>
          <select
            value={filters.nivel || 'processo'}
            onChange={e => set('nivel', e.target.value)}
            className={inputCls}
          >
            {NIVEIS_ANALISE.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>
        </div>
      )}

      {showMetrica && (
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-pa-muted">Métrica</label>
          <select
            value={filters.metrica || 'rendimento_operacional_hah'}
            onChange={e => set('metrica', e.target.value)}
            className={`${inputCls} min-w-[200px]`}
          >
            {METRICAS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      )}

      <button
        onClick={() => onChange({})}
        className="self-end px-3 py-1.5 rounded-lg text-xs text-pa-muted border border-pa-border hover:border-pa-green hover:text-pa-text transition-colors"
      >
        Limpar
      </button>
    </div>
  )
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-pa-surface-2 ${className}`} />
}

export function PageLoader() {
  return (
    <div className="space-y-4 p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  )
}

// ── Fetching indicator (overlay sutil) ────────────────────────────────────────
export function FetchingBar() {
  return (
    <div className="h-0.5 w-full bg-pa-surface-2 overflow-hidden rounded-full">
      <div className="h-full bg-pa-green animate-pulse" style={{ width: '60%' }} />
    </div>
  )
}
