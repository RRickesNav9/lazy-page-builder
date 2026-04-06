import { useState, useEffect } from 'react'
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
                <span className="text-xs text-pa-faint">ref: {d.benchmark.toFixed(2)}</span>
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

// ── Vertical Bar Chart com grupos (cliente vs referência) ─────────────────────
// data = [{ label, cliente, grupo }] — barras agrupadas por item
export function VBarChart({ data, height = 180, benchmarkLabel = 'Porteira' }) {
  if (!data?.length) return (
    <div className="text-pa-muted text-sm py-4 text-center">Sem dados</div>
  )
  const maxVal = Math.max(...data.flatMap(d => [d.cliente ?? 0, d.grupo ?? 0]), 0.001)

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="flex items-end gap-1.5" style={{ height, minWidth: data.length * 56 }}>
          {data.map((d, i) => (
            <div key={i} className="flex flex-col items-center flex-1 min-w-[44px] h-full">
              <div className="flex items-end gap-0.5 flex-1 w-full">
                <div className="flex-1 flex items-end">
                  <div
                    className="w-full rounded-t-sm transition-all duration-700"
                    style={{ height: `${((d.cliente ?? 0) / maxVal) * 100}%`, background: 'var(--pa-green)', opacity: 0.9, minHeight: d.cliente > 0 ? 2 : 0 }}
                    title={`${d.label}: ${(d.cliente ?? 0).toFixed(2)}`}
                  />
                </div>
                {d.grupo != null && (
                  <div className="flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-sm transition-all duration-700"
                      style={{ height: `${(d.grupo / maxVal) * 100}%`, background: 'var(--pa-amber)', opacity: 0.7, minHeight: d.grupo > 0 ? 2 : 0 }}
                      title={`${benchmarkLabel}: ${d.grupo.toFixed(2)}`}
                    />
                  </div>
                )}
              </div>
              <span className="text-pa-muted mt-1 text-center leading-none truncate w-full px-0.5" style={{ fontSize: 10 }}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs text-pa-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--pa-green)' }} />
          Cliente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--pa-amber)' }} />
          {benchmarkLabel}
        </span>
      </div>
    </div>
  )
}

// ── Thermometer Bar — posiciona o cliente entre min e max dos peers ────────────
// min/max = extremos dos clientes do grupo, avg = média porteira, value = cliente selecionado
export function ThermometerBar({ label, min, max, avg, value, fmtFn, higherIsBetter = true }) {
  if (min == null || max == null || value == null) return null
  const range = (max - min) || 1
  const clamp = (v) => Math.max(0, Math.min(100, ((v - min) / range) * 100))
  const pctValue = clamp(value)
  const pctAvg = avg != null ? clamp(avg) : null

  const ratio = avg > 0 ? value / avg : null
  const barColor = ratio == null ? 'var(--pa-green)'
    : (higherIsBetter ? ratio >= 0.95 : ratio <= 1.05) ? 'var(--pa-green)'
    : (higherIsBetter ? ratio >= 0.80 : ratio <= 1.20) ? 'var(--pa-amber)'
    : 'var(--pa-red)'

  return (
    <div className="py-2.5 border-b border-pa-border/40 last:border-0">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-xs font-medium text-pa-muted">{label}</span>
        <span className="text-sm font-bold tabular-nums" style={{ color: barColor }}>{fmtFn ? fmtFn(value) : value?.toFixed(2)}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-pa-surface-2">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
          style={{ width: `${pctValue}%`, background: barColor, opacity: 0.35 }}
        />
        {pctAvg != null && (
          <div
            className="absolute top-1/2 w-px h-3 rounded-full bg-pa-amber"
            style={{ left: `${pctAvg}%`, transform: 'translate(-50%, -50%)' }}
            title={`Porteira: ${fmtFn ? fmtFn(avg) : avg?.toFixed(2)}`}
          />
        )}
        <div
          className="absolute top-1/2 w-2.5 h-2.5 rounded-full border-2 transition-all duration-700"
          style={{ left: `${pctValue}%`, transform: 'translate(-50%, -50%)', background: barColor, borderColor: 'var(--pa-bg)' }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-pa-faint" style={{ fontSize: 10 }}>{fmtFn ? fmtFn(min) : min?.toFixed(2)}</span>
        {pctAvg != null && (
          <span className="text-pa-amber" style={{ fontSize: 10 }}>▲ {fmtFn ? fmtFn(avg) : avg?.toFixed(2)}</span>
        )}
        <span className="text-pa-faint" style={{ fontSize: 10 }}>{fmtFn ? fmtFn(max) : max?.toFixed(2)}</span>
      </div>
    </div>
  )
}

// ── Filter Panel — drawer lateral com filtros (inspirado no SGPA) ─────────────
// hideFields: array de chaves a ocultar (ex: ['cliente', 'modelo_equipamento'])
export function FilterPanel({ open, onClose, filters, onChange, options, hideFields = [], showBenchmarkToggle = false }) {
  const [local, setLocal] = useState(filters)
  useEffect(() => { if (open) setLocal(filters) }, [open])  // eslint-disable-line

  const set = (key, val) => setLocal(prev => ({ ...prev, [key]: val || undefined }))
  const apply = () => { onChange(local); onClose() }
  const clear = () => { onChange({}); onClose() }

  const inputCls = "w-full bg-pa-surface-2 border border-pa-border rounded-lg px-3 py-2 text-sm text-pa-text focus:outline-none focus:border-pa-green transition-colors"

  const FIELDS = [
    { key: 'safra',              label: 'Safra',    opts: options.safras },
    { key: 'processo',           label: 'Processo', opts: options.processos },
    { key: 'tipo_safra',         label: 'Cultura',  opts: options.tipos_safra },
    { key: 'cliente',            label: 'Cliente',  opts: options.clientes },
    { key: 'modelo_equipamento', label: 'Modelo',   opts: options.modelos },
  ].filter(f => !hideFields.includes(f.key))

  const activeCount = Object.values(filters).filter(v => v && v !== true).length

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div
        className={`fixed right-0 top-0 h-full w-72 bg-pa-surface border-l border-pa-border z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-pa-border">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-pa-text uppercase tracking-wider">Filtros</h2>
            {activeCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'var(--pa-green)', color: '#fff' }}>{activeCount}</span>
            )}
          </div>
          <button onClick={onClose} className="text-pa-muted hover:text-pa-text transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {FIELDS.map(({ key, label, opts }) => (
            <div key={key}>
              <label className="block text-xs text-pa-muted mb-1.5 uppercase tracking-wider">{label}</label>
              <select value={local[key] || ''} onChange={e => set(key, e.target.value)} className={inputCls}>
                <option value="">Todos</option>
                {opts?.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}

          {!hideFields.includes('dates') && (
            <div>
              <label className="block text-xs text-pa-muted mb-1.5 uppercase tracking-wider">Período</label>
              <div className="space-y-2">
                <input type="date" value={local.dataInicio || ''} onChange={e => set('dataInicio', e.target.value)} className={inputCls} placeholder="De" />
                <input type="date" value={local.dataFim || ''} onChange={e => set('dataFim', e.target.value)} className={inputCls} placeholder="Até" />
              </div>
            </div>
          )}

          {showBenchmarkToggle && (
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => set('showBenchmark', !local.showBenchmark)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${local.showBenchmark ? 'bg-pa-green' : 'bg-pa-surface-2 border border-pa-border'}`}
              >
                <span className={`inline-block w-3.5 h-3.5 transform rounded-full bg-white shadow transition-transform ${local.showBenchmark ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-sm text-pa-text">Mostrar benchmark Porteira</span>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-pa-border flex gap-2">
          <button onClick={clear} className="flex-1 py-2 text-sm text-pa-muted border border-pa-border rounded-lg hover:border-pa-green hover:text-pa-text transition-colors">
            Limpar
          </button>
          <button onClick={apply} className="flex-1 py-2 text-sm font-semibold rounded-lg transition-colors" style={{ background: 'var(--pa-green)', color: '#fff' }}>
            Aplicar
          </button>
        </div>
      </div>
    </>
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
      <div className="flex flex-col gap-0.5">
        <label className="text-xs text-pa-muted">De</label>
        <input type="date" value={filters.dataInicio || ''} onChange={e => set('dataInicio', e.target.value)} className={inputCls} />
      </div>
      <div className="flex flex-col gap-0.5">
        <label className="text-xs text-pa-muted">Até</label>
        <input type="date" value={filters.dataFim || ''} onChange={e => set('dataFim', e.target.value)} className={inputCls} />
      </div>
      {[
        { key: 'cliente',      label: 'Cliente',    opts: options.clientes },
        { key: 'propriedade',  label: 'Fazenda',    opts: options.propriedades },
        { key: 'safra',        label: 'Safra',      opts: options.safras },
        { key: 'tipo_safra',   label: 'Cultura',    opts: options.tipos_safra },
        { key: 'processo',     label: 'Processo',   opts: options.processos },
      ].map(({ key, label, opts }) => (
        <div key={key} className="flex flex-col gap-0.5">
          <label className="text-xs text-pa-muted">{label}</label>
          <select value={filters[key] || ''} onChange={e => set(key, e.target.value)} className={`${inputCls} min-w-[130px]`}>
            <option value="">Todos</option>
            {opts?.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      ))}
      {showNivel && (
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-pa-muted">Nível de Análise</label>
          <select value={filters.nivel || 'processo'} onChange={e => set('nivel', e.target.value)} className={inputCls}>
            {NIVEIS_ANALISE.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>
        </div>
      )}
      {showMetrica && (
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-pa-muted">Métrica</label>
          <select value={filters.metrica || 'rendimento_operacional_hah'} onChange={e => set('metrica', e.target.value)} className={`${inputCls} min-w-[200px]`}>
            {METRICAS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      )}
      <button onClick={() => onChange({})} className="self-end px-3 py-1.5 rounded-lg text-xs text-pa-muted border border-pa-border hover:border-pa-green hover:text-pa-text transition-colors">
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

// ── Fetching indicator (overlay sutil sem apagar conteúdo) ────────────────────
export function FetchingBar() {
  return (
    <div className="h-0.5 w-full bg-pa-surface-2 overflow-hidden rounded-full">
      <div className="h-full bg-pa-green animate-pulse" style={{ width: '60%' }} />
    </div>
  )
}

// ── Botão de filtros padronizado para o cabeçalho das páginas ─────────────────
export function FilterButton({ onClick, filters = {}, label = 'Filtros' }) {
  const activeCount = Object.values(filters).filter(v => v && v !== true).length
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-pa-border text-sm text-pa-muted hover:text-pa-text hover:border-pa-green transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
      </svg>
      {label}
      {activeCount > 0 && (
        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'var(--pa-green)', color: '#fff' }}>{activeCount}</span>
      )}
    </button>
  )
}
