// MetricSelectorFAB.jsx
// Botão flutuante de seleção de métricas — usado nas páginas de benchmark.
// Renderizado pela própria página; data-pdf-exclude garante ausência no PDF.

import { useState, useEffect, useRef } from 'react'
import { useFilters } from '../lib/FilterContext'

export default function MetricSelectorFAB({ config, selected, onToggle }) {
  const [open, setOpen] = useState(false)
  const { hasExportFn, fabExpanded } = useFilters()
  const panelRef = useRef(null)

  // fecha o painel local quando o FAB principal colapsa
  useEffect(() => { if (!fabExpanded) setOpen(false) }, [fabExpanded])

  useEffect(() => {
    if (!open) return
    function handle(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  if (!fabExpanded) return null

  // sobe 60px quando o botão de exportação está presente para não sobrepor
  const btnBottom   = 204 + (hasExportFn ? 60 : 0)
  const panelBottom = 264 + (hasExportFn ? 60 : 0)

  return (
    <>
      <button
        data-pdf-exclude="true"
        onClick={() => setOpen(o => !o)}
        title="Selecionar métricas"
        style={{
          position: 'fixed', bottom: btnBottom, right: 24, zIndex: 1000,
          width: 48, height: 48, borderRadius: '50%',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          background: open ? '#2d4a2d' : '#4a6741', color: '#fff',
        }}
      >
        {/* Sliders icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
          <circle cx="8"  cy="6"  r="2" fill="currentColor" stroke="none" />
          <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
          <circle cx="10" cy="18" r="2" fill="currentColor" stroke="none" />
        </svg>
      </button>

      {open && (
        <div
          ref={panelRef}
          data-pdf-exclude="true"
          style={{
            position: 'fixed', bottom: panelBottom, right: 24, zIndex: 999,
            width: 300, maxHeight: '65vh', overflowY: 'auto',
            background: '#fff', border: '1px solid #e0dbd4', borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: '16px 0',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a1a', padding: '0 16px 12px' }}>
            Métricas exibidas
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {config.map(cfg => {
              const active = selected.has(cfg.key)
              const unitLabel = cfg.unit || (cfg.sub ? cfg.sub.split('·')[0].trim() : '')
              return (
                <label
                  key={cfg.key}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 16px', cursor: 'pointer',
                    background: active ? '#f2f6f0' : 'transparent',
                    borderLeft: active ? '3px solid #4a6741' : '3px solid transparent',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => onToggle(cfg.key)}
                    style={{ accentColor: '#4a6741', width: 15, height: 15, cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 12, color: active ? '#1a1a1a' : '#6b6560', fontWeight: active ? 500 : 400 }}>
                    {cfg.label}
                    {unitLabel && (
                      <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.6 }}>{unitLabel}</span>
                    )}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
