import { useState, useEffect, useRef, useMemo } from 'react'
import { useFilters } from '../lib/FilterContext'
import { useFilterOptions, useStopMotivos } from '../hooks/useData'



const PERIODOS = [
  { value: 'ontem',  label: 'Ontem' },
  { value: '7dias',  label: '7 dias' },
  { value: '30dias', label: '30 dias' },
  { value: 'safra',  label: 'Safra' },
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
  const { filters, applyFilters, activeCount, showFABs } = useFilters()
  const options  = useFilterOptions()
  const motivos  = useStopMotivos()

  const [open,         setOpen]         = useState(false)
  const [pending,      setPending]      = useState(filters)
  const [motivosOpen,  setMotivosOpen]  = useState(false)
  const [motivoSearch, setMotivoSearch] = useState('')
  const panelRef = useRef(null)

  // Abre o painel quando outro componente dispara o evento 'openFilterFAB'
  useEffect(() => {
    function handle() { setOpen(true) }
    window.addEventListener('openFilterFAB', handle)
    return () => window.removeEventListener('openFilterFAB', handle)
  }, [])

  useEffect(() => {
    if (open) { setPending(filters); setMotivosOpen(false); setMotivoSearch('') }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    function handle(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const set = (key, val) => setPending(p => ({ ...p, [key]: val }))

  function toggleMotivo(motivo) {
    setPending(p => ({
      ...p,
      excludedMotivos: p.excludedMotivos.includes(motivo)
        ? p.excludedMotivos.filter(m => m !== motivo)
        : [...p.excludedMotivos, motivo],
    }))
  }

  function handleApply() { applyFilters(pending); setOpen(false) }

  function handleClear() {
    const cleared = {
      periodo: '7dias', dataInicio: null, dataFim: null,
      cliente: '', propriedade: '', processo: '', tipo_safra: '',
      excludedMotivos: [], showBenchmark: false,
    }
    setPending(cleared); applyFilters(cleared); setOpen(false)
  }

  // motivos agrupados + filtrados pela busca
  const filteredMotivosByTipo = useMemo(() => {
    const search = motivoSearch.toLowerCase()
    return motivos.reduce((acc, m) => {
      if (search && !m.motivo_de_parada.toLowerCase().includes(search)) return acc
      const tipo = m.tipo_parada || 'OUTROS'
      if (!acc[tipo]) acc[tipo] = []
      acc[tipo].push(m.motivo_de_parada)
      return acc
    }, {})
  }, [motivos, motivoSearch])

  const nExcluded = pending.excludedMotivos.length

  if (!showFABs) return null

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

      {/* Painel slide-up */}
      {open && (
        <div ref={panelRef} style={{
          position: 'fixed', bottom: 84, right: 24, zIndex: 999,
          width: 320, maxHeight: '80vh', overflowY: 'auto',
          background: '#fff', border: '1px solid #e0dbd4', borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>Filtros</span>
            <button onClick={handleClear} style={{ fontSize: 12, color: '#8b2020', background: 'none', border: 'none', cursor: 'pointer' }}>
              Limpar tudo
            </button>
          </div>

          {/* ── Período ──────────────────────────────────────────────── */}
          <Label>Período</Label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: pending.periodo === 'custom' ? 10 : 14 }}>
            {PERIODOS.map(p => (
              <Chip key={p.value} active={pending.periodo === p.value} onClick={() => set('periodo', p.value)}>
                {p.label}
              </Chip>
            ))}
            <Chip active={pending.periodo === 'custom'} onClick={() => set('periodo', 'custom')}>
              Personalizado
            </Chip>
          </div>

          {pending.periodo === 'custom' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <Label>De</Label>
                <input type="date" value={pending.dataInicio || ''} onChange={e => set('dataInicio', e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #d4cfc9', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <Label>Até</Label>
                <input type="date" value={pending.dataFim || ''} onChange={e => set('dataFim', e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #d4cfc9', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            </div>
          )}

          {pending.showBenchmark && pending.periodo === 'custom' && (
            <div style={{ fontSize: 11, color: '#6b6560', marginBottom: 10, fontStyle: 'italic' }}>
              Benchmark exibe média da safra que contém o período selecionado.
            </div>
          )}

          {/* ── Dimensões ────────────────────────────────────────────── */}
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

          {/* ── Benchmark toggle ─────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '10px 0 14px' }}>
            <span style={{ fontSize: 13, color: '#1a1a1a' }}>Exibir Média Porteira</span>
            <Toggle checked={pending.showBenchmark} onChange={v => set('showBenchmark', v)} />
          </div>

          {/* ── Motivos de parada — dropdown com busca ───────────────── */}
          {motivos.length > 0 && (
            <div style={{ borderTop: '1px solid #e0dbd4', paddingTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Label>Excluir Motivos de Parada</Label>
                {nExcluded > 0 && (
                  <button
                    onClick={() => set('excludedMotivos', [])}
                    style={{ fontSize: 11, color: '#8b2020', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 5 }}
                  >
                    limpar ({nExcluded})
                  </button>
                )}
              </div>
              <p style={{ fontSize: 11, color: '#6b6560', marginBottom: 8 }}>
                O tempo desses motivos será removido dos totais.
              </p>

              {/* Trigger */}
              <button
                onClick={() => setMotivosOpen(o => !o)}
                style={{
                  width: '100%', padding: '7px 10px', textAlign: 'left',
                  border: '1px solid #d4cfc9',
                  borderRadius: motivosOpen ? '6px 6px 0 0' : 6,
                  background: '#fff', fontSize: 13, cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <span style={{ color: nExcluded > 0 ? '#1a1a1a' : '#6b6560' }}>
                  {nExcluded === 0 ? 'Nenhum excluído' : `${nExcluded} selecionado${nExcluded > 1 ? 's' : ''}`}
                </span>
                <span style={{ fontSize: 10, color: '#6b6560' }}>{motivosOpen ? '▲' : '▼'}</span>
              </button>

              {/* Dropdown list */}
              {motivosOpen && (
                <div style={{
                  border: '1px solid #d4cfc9', borderTop: 'none',
                  borderRadius: '0 0 6px 6px', background: '#fff',
                  maxHeight: 200, overflowY: 'auto',
                }}>
                  {/* Busca */}
                  <div style={{ padding: '8px 10px', borderBottom: '1px solid #e0dbd4', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                    <input
                      type="text"
                      placeholder="Buscar motivo..."
                      value={motivoSearch}
                      onChange={e => setMotivoSearch(e.target.value)}
                      autoFocus
                      style={{
                        width: '100%', padding: '5px 8px', boxSizing: 'border-box',
                        border: '1px solid #d4cfc9', borderRadius: 4, fontSize: 12,
                      }}
                    />
                  </div>

                  {Object.keys(filteredMotivosByTipo).length === 0 ? (
                    <div style={{ padding: '10px 12px', fontSize: 12, color: '#6b6560' }}>Nenhum resultado.</div>
                  ) : (
                    Object.entries(filteredMotivosByTipo).map(([tipo, lista]) => (
                      <div key={tipo}>
                        <div style={{
                          padding: '6px 10px 2px', fontSize: 10, fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                          color: TIPO_PARADA_COLOR[tipo] || '#6b6560',
                        }}>
                          {TIPO_PARADA_LABEL[tipo] || tipo}
                        </div>
                        {lista.map(m => (
                          <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 4px 20px', cursor: 'pointer' }}>
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
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleApply}
            style={{
              width: '100%', marginTop: 16, padding: '10px 0',
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

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function Label({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6b6560', marginBottom: 5 }}>
      {children}
    </div>
  )
}

function Select({ value, onChange, children }) {
  return (
    <select value={value} onChange={onChange} style={{
      width: '100%', padding: '6px 10px', marginBottom: 12,
      border: '1px solid #d4cfc9', borderRadius: 6,
      fontSize: 13, color: '#1a1a1a', background: '#fff', cursor: 'pointer',
    }}>
      {children}
    </select>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 12px', borderRadius: 20, fontSize: 12,
      border: active ? '1.5px solid #2d4a2d' : '1px solid #d4cfc9',
      background: active ? '#edf5ed' : '#fff',
      color: active ? '#1e4d1e' : '#4a3728',
      fontWeight: active ? 600 : 400, cursor: 'pointer',
    }}>
      {children}
    </button>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} style={{
      width: 40, height: 22, borderRadius: 11, border: 'none',
      background: checked ? '#2d4a2d' : '#d4cfc9',
      position: 'relative', cursor: 'pointer', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 3, left: checked ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s',
      }} />
    </button>
  )
}
