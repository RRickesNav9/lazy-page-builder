// MetricSelectorFAB.jsx
// Botão flutuante de seleção de métricas — usado nas páginas de benchmark.
// Renderizado pela própria página; data-pdf-exclude garante ausência no PDF.

import { useState, useEffect, useRef } from 'react'
import { useFilters } from '../lib/FilterContext'

export default function MetricSelectorFAB({ config, selected, onToggle }) {
  const [open, setOpen] = useState(false)
  const { hasExportFn } = useFilters()
  // sincroniza com o fold/unfold do GlobalFilterFAB via custom event
  const [fabExpanded, setFabExpanded] = useState(() => window.__fabExpanded ?? false)
  const panelRef = useRef(null)

  useEffect(() => {
    function handle(e) {
      setFabExpanded(e.detail.expanded)
      if (!e.detail.expanded) setOpen(false)
    }
    window.addEventListener('fabToggle', handle)
    return () => window.removeEventListener('fabToggle', handle)
  }, [])

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
            width: 340, maxHeight: '65vh', overflowY: 'auto',
            background: '#fff', border: '1px solid #e0dbd4', borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: 20,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a1a', marginBottom: 4 }}>
            Métricas exibidas
          </div>
          <div style={{
            fontSize: 10, color: '#6b6560', marginBottom: 12,
          }}>
            Toque para ativar ou desativar. Ao menos uma métrica deve permanecer ativa.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {config.map(cfg => {
              const active = selected.has(cfg.key)
              // suporta tanto {unit} (BenchmarkEquipamentoPage) quanto {sub} (demais páginas)
              const unitLabel = cfg.unit || (cfg.sub ? cfg.sub.split('·')[0].trim() : '')
              return (
                <button
                  key={cfg.key}
                  onClick={() => onToggle(cfg.key)}
                  style={{
                    padding: '4px 10px', fontSize: 11, fontWeight: 500,
                    borderRadius: 4, cursor: 'pointer',
                    border: active ? '1px solid #2d4a2d' : '1px solid #d0cac4',
                    background: active ? '#2d4a2d' : '#ffffff',
                    color: active ? '#ffffff' : '#6b6560',
                  }}
                >
                  {cfg.label}
                  {unitLabel && (
                    <span style={{ fontSize: 9, marginLeft: 4, opacity: 0.7 }}>{unitLabel}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
