import { useState, useEffect, useRef, useMemo } from 'react'
import { useFilters } from '../lib/FilterContext'
import { useFilterOptionsRaw, useStopMotivos } from '../hooks/useData'



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

export default function GlobalFilterFAB({ allowedProcessos = null, solinftecOnly = false }) {
  const { filters, applyFilters, activeCount } = useFilters()
  const { rawRows } = useFilterOptionsRaw(solinftecOnly)
  const motivos     = useStopMotivos()

  const [expanded,     setExpanded]     = useState(false)
  const [open,         setOpen]         = useState(false)
  const [pending,      setPending]      = useState(filters)
  const [motivosOpen,  setMotivosOpen]  = useState(false)
  const [motivoSearch, setMotivoSearch] = useState('')
  const panelRef = useRef(null)

  function toggleExpanded() {
    setExpanded(e => {
      if (e) setOpen(false) // fecha painel ao colapsar
      return !e
    })
  }

  // Linhas restritas ao escopo da página (null = irrestrito)
  const pageRows = useMemo(() => {
    if (!allowedProcessos || rawRows.length === 0) return rawRows
    return rawRows.filter(r =>
      allowedProcessos.some(p => p.toLowerCase() === (r.processo || '').toLowerCase())
    )
  }, [rawRows, allowedProcessos])

  // Opções cascateadas: cada dimensão mostra só valores que existem nas linhas
  // compatíveis com todas as OUTRAS dimensões já selecionadas no painel.
  const cascadedOpts = useMemo(() => {
    const filter = (excludeDim) => pageRows.filter(r => {
      if (excludeDim !== 'cliente'     && pending.cliente     && r.cliente     !== pending.cliente)     return false
      if (excludeDim !== 'propriedade' && pending.propriedade && r.propriedade !== pending.propriedade) return false
      if (excludeDim !== 'processo'    && pending.processo    && r.processo    !== pending.processo)    return false
      if (excludeDim !== 'tipo_safra'  && pending.tipo_safra  && r.tipo_safra  !== pending.tipo_safra)  return false
      return true
    })
    return {
      clientes:    [...new Set(filter('cliente').map(r => r.cliente).filter(Boolean))].sort(),
      propriedades:[...new Set(filter('propriedade').map(r => r.propriedade).filter(Boolean))].sort(),
      processos:   [...new Set(filter('processo').map(r => r.processo).filter(Boolean))].sort(),
      tipos_safra: [...new Set(filter('tipo_safra').map(r => r.tipo_safra).filter(Boolean))].sort(),
    }
  }, [pageRows, pending.cliente, pending.propriedade, pending.processo, pending.tipo_safra])

  // Abre o painel quando outro componente dispara o evento 'openFilterFAB'
  useEffect(() => {
    function handle() { setOpen(true) }
    window.addEventListener('openFilterFAB', handle)
    return () => window.removeEventListener('openFilterFAB', handle)
  }, [])

  // Ao abrir o painel, sincroniza pending com os filtros ativos
  useEffect(() => {
    if (open) { setPending(filters); setMotivosOpen(false); setMotivoSearch('') }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-limpa valores pendentes que deixaram de ter dados após uma mudança em cascata
  useEffect(() => {
    if (!open) return
    const updates = {}
    if (pending.cliente     && !cascadedOpts.clientes.includes(pending.cliente))         updates.cliente = ''
    if (pending.propriedade && !cascadedOpts.propriedades.includes(pending.propriedade)) updates.propriedade = ''
    if (pending.processo    && !cascadedOpts.processos.includes(pending.processo))       updates.processo = ''
    if (pending.tipo_safra  && !cascadedOpts.tipos_safra.includes(pending.tipo_safra))   updates.tipo_safra = ''
    if (Object.keys(updates).length > 0) setPending(p => ({ ...p, ...updates }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending.cliente, pending.propriedade, pending.processo, pending.tipo_safra, open])

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
      excludedMotivos: [],
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

  const fabBase = {
    position: 'fixed', right: 24, zIndex: 1000,
    width: 48, height: 48, borderRadius: '50%',
    border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
  }

  return (
    <>
      {/* FAB — Chevron toggle (sempre visível) */}
      <button
        onClick={toggleExpanded}
        data-pdf-exclude="true"
        title={expanded ? 'Ocultar botões' : 'Mostrar botões'}
        style={{ ...fabBase, bottom: 24, background: '#8a9a85', color: '#fff' }}
      >
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          {expanded
            ? <path strokeLinecap="round" strokeLinejoin="round" d="M19 15l-7-7-7 7" />
            : <path strokeLinecap="round" strokeLinejoin="round" d="M5 9l7 7 7-7" />
          }
        </svg>
      </button>

      {/* FAB — Filtros (visível quando expandido) */}
      {expanded && (
        <button
          onClick={() => setOpen(o => !o)}
          data-pdf-exclude="true"
          style={{
            ...fabBase, bottom: 84,
            background: activeCount > 0 ? '#2d4a2d' : '#4a6741',
            color: '#fff',
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
      )}

      {/* FAB — Exportar PDF (visível quando expandido) */}
      {expanded && (
        <button
          onClick={() => window.print()}
          data-pdf-exclude="true"
          title="Exportar PDF"
          style={{ ...fabBase, bottom: 144, background: '#2d5016', color: '#fff' }}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3M7 7V4a1 1 0 011-1h8a1 1 0 011 1v3" />
          </svg>
        </button>
      )}

      {/* Painel de filtros */}
      {open && expanded && (
        <div ref={panelRef} data-pdf-exclude="true" style={{
          position: 'fixed', bottom: 204, right: 24, zIndex: 999,
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

          {/* ── Dimensões ────────────────────────────────────────────── */}
          <Label>Cliente</Label>
          <SearchableSelect
            value={pending.cliente}
            onChange={val => set('cliente', val)}
            placeholder="Todos"
            options={[{ value: '', label: 'Todos' }, ...cascadedOpts.clientes.map(c => ({ value: c, label: c }))]}
          />

          <Label>Propriedade</Label>
          <SearchableSelect
            value={pending.propriedade}
            onChange={val => set('propriedade', val)}
            placeholder="Todas"
            options={[{ value: '', label: 'Todas' }, ...cascadedOpts.propriedades.map(p => ({ value: p, label: p }))]}
          />

          <Label>Processo / Operação</Label>
          <SearchableSelect
            value={pending.processo}
            onChange={val => set('processo', val)}
            placeholder="Todos"
            options={[{ value: '', label: 'Todos' }, ...cascadedOpts.processos.map(p => ({ value: p, label: p }))]}
          />

          <Label>Cultura</Label>
          <SearchableSelect
            value={pending.tipo_safra}
            onChange={val => set('tipo_safra', val)}
            placeholder="Todas"
            options={[{ value: '', label: 'Todas' }, ...cascadedOpts.tipos_safra.map(t => ({ value: t, label: t }))]}
          />

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

// options: [{ value, label }] — primeiro item é sempre a opção "todos" (value='')
// Usa onBlur+setTimeout em vez de document listener para não conflitar com o handler do painel.
function SearchableSelect({ value, onChange, placeholder, options }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef(null)

  const selectedLabel = options.find(o => o.value === value)?.label ?? ''
  const filtered = options.filter(o => !search || o.label.toLowerCase().includes(search.toLowerCase()))

  function selectOption(val) {
    onChange(val)
    setSearch('')
    setOpen(false)
  }

  return (
    <div style={{ marginBottom: open ? 0 : 12 }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={open ? search : selectedLabel}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => { setOpen(true); setSearch('') }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          style={{
            width: '100%', padding: '6px 28px 6px 10px', boxSizing: 'border-box',
            border: '1px solid #d4cfc9', borderRadius: open ? '6px 6px 0 0' : 6,
            fontSize: 13, color: '#1a1a1a', background: '#fff', outline: 'none',
          }}
        />
        <span
          onMouseDown={e => {
            e.preventDefault() // mantém o foco no input
            if (value) {
              onChange('')
              setSearch('')
              setOpen(false)
            } else {
              if (!open) { setSearch(''); inputRef.current?.focus() }
              else inputRef.current?.blur()
            }
          }}
          style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            cursor: 'pointer', color: '#6b6560',
            fontSize: value ? 16 : 10, lineHeight: 1, userSelect: 'none',
          }}
        >
          {value ? '×' : '▼'}
        </span>
      </div>
      {open && (
        <div style={{
          border: '1px solid #d4cfc9', borderTop: 'none', borderRadius: '0 0 6px 6px',
          background: '#fff', maxHeight: 160, overflowY: 'auto', marginBottom: 12,
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '8px 10px', fontSize: 12, color: '#6b6560' }}>Nenhum resultado</div>
          ) : filtered.map(o => (
            <div
              key={o.value === '' ? '__all__' : o.value}
              onMouseDown={e => e.preventDefault()} // previne blur antes do click
              onClick={() => selectOption(o.value)}
              style={{
                padding: '6px 10px', fontSize: 13, cursor: 'pointer',
                color: o.value === value ? '#1e4d1e' : (o.value === '' ? '#6b6560' : '#1a1a1a'),
                background: o.value === value ? '#edf5ed' : 'transparent',
                fontStyle: o.value === '' ? 'italic' : 'normal',
              }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
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
