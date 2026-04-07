import { useState, useEffect, useRef } from 'react'
import { useFilters } from '../lib/FilterContext'
import { useFilterOptions, useStopMotivos } from '../hooks/useData'

const PERIODOS = [
  { value: 'ontem',   label: 'Ontem' },
  { value: '7dias',   label: '7 dias' },
  { value: '30dias',  label: '30 dias' },
  { value: 'safra',   label: 'Safra' },
]

const TIPO_PARADA_LABEL = {
  MANUTENCAO:      'Manutenção',
  CLIMATICO:       'Climático',
  ADMINISTRATIVO:  'Administrativo',
  GERENCIAL:       'Gerencial',
  SEM_APONTAMENTO: 'Sem Apontamento',
}

const TIPO_PARADA_COLOR = {
  MANUTENCAO:      '#ef4444',
  CLIMATICO:       '#3b82f6',
  ADMINISTRATIVO:  '#f59e0b',
  GERENCIAL:       '#8b5cf6',
  SEM_APONTAMENTO: '#6b7280',
}

export default function GlobalFilterFAB() {
  const { filters, applyFilters, activeCount } = useFilters()
  const options  = useFilterOptions()
  const motivos  = useStopMotivos()

  const [open, setOpen] = useState(false)
  // pending = local copy while panel is open; committed only on "Aplicar"
  const [pending, setPending] = useState(filters)
  const panelRef = useRef(null)

  // sync pending when panel opens
  useEffect(() => {
    if (open) setPending(filters)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // close on outside click
  useEffect(() => {
    if (!open) return
    function handle(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function set(key, val) {
    setPending(p => ({ ...p, [key]: val }))
  }

  function toggleMotivo(motivo) {
    setPending(p => ({
      ...p,
      excludedMotivos: p.excludedMotivos.includes(motivo)
        ? p.excludedMotivos.filter(m => m !== motivo)
        : [...p.excludedMotivos, motivo],
    }))
  }

  function handleApply() {
    applyFilters(pending)
    setOpen(false)
  }

  function handleClear() {
    const cleared = {
      periodo: '7dias', dataInicio: null, dataFim: null,
      cliente: '', propriedade: '', processo: '', tipo_safra: '',
      excludedMotivos: [], showBenchmark: false,
    }
    setPending(cleared)
    applyFilters(cleared)
    setOpen(false)
  }

  // group motivos by tipo_parada
  const motivosByTipo = motivos.reduce((acc, m) => {
    const tipo = m.tipo_parada || 'OUTROS'
    if (!acc[tipo]) acc[tipo] = []
    acc[tipo].push(m.motivo_de_parada)
    return acc
  }, {})

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          width: 48, height: 48, borderRadius: '50%',
          background: activeCount > 0 ? '#2d4a2d' : '#4a6741',
          color: '#fff', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        }}
        title="Filtros"
      >
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
        </svg>
        {activeCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            width: 18, height: 18, borderRadius: '50%',
            background: '#d97706', color: '#fff',
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {activeCount}
          </span>
        )}
      </button>

      {/* Slide-up panel */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'fixed', bottom: 84, right: 24, zIndex: 999,
            width: 320, maxHeight: '80vh', overflowY: 'auto',
            background: '#fff', border: '1px solid #e0dbd4',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            padding: 20,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>Filtros</span>
            <button onClick={handleClear} style={{ fontSize: 12, color: '#8b2020', background: 'none', border: 'none', cursor: 'pointer' }}>
              Limpar tudo
            </button>
          </div>

          {/* Período */}
          <Label>Período</Label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {PERIODOS.map(p => (
              <Chip
                key={p.value}
                active={pending.periodo === p.value}
                onClick={() => set('periodo', p.value)}
              >
                {p.label}
              </Chip>
            ))}
          </div>

          {/* Dimensões */}
          <Label>Cliente</Label>
          <Select value={pending.cliente} onChange={e => set('cliente', e.target.value)}>
            <option value="">Todos</option>
            {options.clientes.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>

          <Label>Propriedade</Label>
          <Select value={pending.propriedade} onChange={e => set('propriedade', e.target.value)}>
            <option value="">Todas</option>
            {options.propriedades.map(p => <option key={p} value={p}>{p}</option>)}
          </Select>

          <Label>Processo / Operação</Label>
          <Select value={pending.processo} onChange={e => set('processo', e.target.value)}>
            <option value="">Todos</option>
            {options.processos.map(p => <option key={p} value={p}>{p}</option>)}
          </Select>

          <Label>Cultura</Label>
          <Select value={pending.tipo_safra} onChange={e => set('tipo_safra', e.target.value)}>
            <option value="">Todas</option>
            {options.tipos_safra.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>

          {/* Benchmark toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 0' }}>
            <span style={{ fontSize: 13, color: '#1a1a1a' }}>Exibir Média Porteira</span>
            <Toggle
              checked={pending.showBenchmark}
              onChange={v => set('showBenchmark', v)}
            />
          </div>

          {/* Motivos de parada */}
          {motivos.length > 0 && (
            <>
              <div style={{ borderTop: '1px solid #e0dbd4', marginTop: 8, paddingTop: 14 }}>
                <Label>Excluir Motivos de Parada</Label>
                <p style={{ fontSize: 11, color: '#6b6560', marginBottom: 10 }}>
                  Tempo desses motivos será removido dos totais.
                </p>
                {Object.entries(motivosByTipo).map(([tipo, lista]) => (
                  <div key={tipo} style={{ marginBottom: 10 }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                      textTransform: 'uppercase', color: TIPO_PARADA_COLOR[tipo] || '#6b6560',
                      marginBottom: 4,
                    }}>
                      {TIPO_PARADA_LABEL[tipo] || tipo}
                    </div>
                    {lista.map(m => (
                      <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={pending.excludedMotivos.includes(m)}
                          onChange={() => toggleMotivo(m)}
                          style={{ accentColor: '#2d4a2d' }}
                        />
                        <span style={{ fontSize: 12, color: '#1a1a1a' }}>{m}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}

          <button
            onClick={handleApply}
            style={{
              width: '100%', marginTop: 8, padding: '10px 0',
              background: '#2d4a2d', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Aplicar filtros
          </button>
        </div>
      )}
    </>
  )
}

/* ── Small sub-components ───────────────────────────────────────────────────── */

function Label({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6b6560', marginBottom: 5 }}>
      {children}
    </div>
  )
}

function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        width: '100%', padding: '6px 10px', marginBottom: 12,
        border: '1px solid #d4cfc9', borderRadius: 6,
        fontSize: 13, color: '#1a1a1a', background: '#fff',
        appearance: 'none', cursor: 'pointer',
      }}
    >
      {children}
    </select>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 12px', borderRadius: 20, fontSize: 12,
        border: active ? '1.5px solid #2d4a2d' : '1px solid #d4cfc9',
        background: active ? '#edf5ed' : '#fff',
        color: active ? '#1e4d1e' : '#4a3728',
        fontWeight: active ? 600 : 400, cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 11, border: 'none',
        background: checked ? '#2d4a2d' : '#d4cfc9',
        position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3,
        left: checked ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
      }} />
    </button>
  )
}
