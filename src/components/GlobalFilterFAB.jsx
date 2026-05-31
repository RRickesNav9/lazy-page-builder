import { useState, useEffect, useRef, useMemo } from 'react'
import { useFilters, dateRangeForPeriodo, DEFAULT_FILTERS } from '../lib/FilterContext'
import { useFilterOptionsRaw, useStopMotivos, useFilterOptions, useExtraFilterOptions } from '../hooks/useData'



const PERIODOS = [
  { value: 'ontem',  label: 'Ontem' },
  { value: '7dias',  label: '7 dias' },
  { value: '30dias', label: '30 dias' },
  { value: 'safra',  label: 'Safra' },
]

const METRIC_FILTER_OPTIONS = [
  { group: 'Área e Rendimento', options: [
    { value: 'area_ha',                    label: 'Área (ha)' },
    { value: 'rendimento_operacional_hah', label: 'Rendimento Op. (ha/h)' },
    { value: 'rendimento_real_hah',        label: 'Rendimento Real (ha/h)' },
    { value: 'velocidade_media_kmh',       label: 'Velocidade (km/h)' },
    { value: 'area_por_linha_ha',          label: 'Área/Linha (ha)' },
  ]},
  { group: 'Eficiência', options: [
    { value: 'eficiencia_geral_pct',         label: 'Eficiência Geral (%)' },
    { value: 'eficiencia_operacional_pct',   label: 'Eficiência Op. (%)' },
    { value: 'disponibilidade_mecanica_pct', label: 'Disponibilidade (%)' },
    { value: 'sem_apontamento_pct',          label: 'Sem Apontamento (%)' },
  ]},
  { group: 'Consumo', options: [
    { value: 'consumo_medio_lh',          label: 'Consumo Médio L/h' },
    { value: 'consumo_medio_lha',         label: 'Consumo Médio L/ha' },
    { value: 'consumo_medio_efetivo_lh',  label: 'Consumo Médio Efetivo L/h' },
    { value: 'consumo_medio_efetivo_lha', label: 'Consumo Médio Efetivo L/ha' },
  ]},
  { group: 'Motor', options: [
    { value: 'motor_ligado_pct', label: 'Motor Ligado (%)' },
    { value: 'motor_ocioso_pct', label: 'Motor Ocioso (%)' },
    { value: 'rpm_medio',        label: 'RPM Médio' },
  ]},
  { group: 'Tempo — Operacional', options: [
    { value: 'tempo_efetivo_h',      label: 'T. Efetivo (h)' },
    { value: 'tempo_produtivo_h',    label: 'T. Produtivo (h)' },
    { value: 'tempo_total_h',        label: 'T. Total (h)' },
    { value: 'tempo_manobra_h',      label: 'T. Manobra (h)' },
    { value: 'tempo_deslocamento_h', label: 'T. Deslocamento (h)' },
    { value: 'tempo_motor_ligado_h', label: 'T. Motor Ligado (h)' },
  ]},
  { group: 'Tempo — Parada', options: [
    { value: 'tempo_parada_h',     label: 'T. Parada (h)' },
    { value: 'tempo_manutencao_h', label: 'T. Manutenção (h)' },
  ]},
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

export default function GlobalFilterFAB({ allowedProcessos = null, excludedProcessos = null, solinftecOnly = false, visibleFilters = {} }) {
  const { filters, applyFilters, clearFilters, exportFnRef, hasExportFn, fabExpanded, setFabExpanded } = useFilters()
  const show = (key) => visibleFilters[key] !== false

  const [open,         setOpen]         = useState(false)
  const [exporting,    setExporting]    = useState(false)
  const [pending,      setPending]      = useState(filters)
  const [motivosOpen,  setMotivosOpen]  = useState(false)
  const [motivoSearch, setMotivoSearch] = useState('')
  const [avancadoOpen, setAvancadoOpen] = useState(false)
  const stripRef = useRef(null)

  const pendingDateRange = useMemo(() => {
    if (pending.periodo === 'custom') {
      return { dataInicio: pending.dataInicio, dataFim: pending.dataFim }
    }
    return dateRangeForPeriodo(pending.periodo)
  }, [pending.periodo, pending.dataInicio, pending.dataFim])

  const { rawRows }  = useFilterOptionsRaw(solinftecOnly, pendingDateRange)
  const motivos      = useStopMotivos()
  const { safras }   = useFilterOptions()
  const extraOptions = useExtraFilterOptions()

  function toggleExpanded() {
    const next = !fabExpanded
    if (!next) setOpen(false)
    setFabExpanded(next)
  }

  const pageRows = useMemo(() => {
    if (rawRows.length === 0) return rawRows
    let rows = rawRows
    if (allowedProcessos)  rows = rows.filter(r =>  allowedProcessos.some(p => p.toLowerCase() === (r.processo || '').toLowerCase()))
    if (excludedProcessos) rows = rows.filter(r => !excludedProcessos.some(p => p.toLowerCase() === (r.processo || '').toLowerCase()))
    return rows
  }, [rawRows, allowedProcessos, excludedProcessos])

  const cascadedOpts = useMemo(() => {
    const filter = (excludeDim) => pageRows.filter(r => {
      if (excludeDim !== 'clientes'     && pending.clientes.length     && !pending.clientes.includes(r.cliente))        return false
      if (excludeDim !== 'propriedades' && pending.propriedades.length && !pending.propriedades.includes(r.propriedade)) return false
      if (excludeDim !== 'processos'    && pending.processos.length    && !pending.processos.includes(r.processo))       return false
      if (excludeDim !== 'tipos_safra'  && pending.tipos_safra.length  && !pending.tipos_safra.includes(r.tipo_safra))   return false
      return true
    })
    return {
      clientes:    [...new Set(filter('clientes').map(r => r.cliente).filter(Boolean))].sort(),
      propriedades:[...new Set(filter('propriedades').map(r => r.propriedade).filter(Boolean))].sort(),
      processos:   [...new Set(filter('processos').map(r => r.processo).filter(Boolean))].sort(),
      tipos_safra: [...new Set(filter('tipos_safra').map(r => r.tipo_safra).filter(Boolean))].sort(),
    }
  }, [pageRows, pending.clientes, pending.propriedades, pending.processos, pending.tipos_safra])

  useEffect(() => {
    function handle() { setOpen(true) }
    window.addEventListener('openFilterFAB', handle)
    return () => window.removeEventListener('openFilterFAB', handle)
  }, [])

  useEffect(() => {
    if (open) { setPending(filters); setMotivosOpen(false); setMotivoSearch(''); setAvancadoOpen(false) }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const updates = {}
    const validClientes  = pending.clientes.filter(c => cascadedOpts.clientes.includes(c))
    const validProprias  = pending.propriedades.filter(p => cascadedOpts.propriedades.includes(p))
    const validProcessos = pending.processos.filter(p => cascadedOpts.processos.includes(p))
    const validTipos     = pending.tipos_safra.filter(t => cascadedOpts.tipos_safra.includes(t))
    if (validClientes.length  !== pending.clientes.length)     updates.clientes     = validClientes
    if (validProprias.length  !== pending.propriedades.length) updates.propriedades = validProprias
    if (validProcessos.length !== pending.processos.length)    updates.processos    = validProcessos
    if (validTipos.length     !== pending.tipos_safra.length)  updates.tipos_safra  = validTipos
    if (Object.keys(updates).length > 0) setPending(p => ({ ...p, ...updates }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending.clientes, pending.propriedades, pending.processos, pending.tipos_safra, open, cascadedOpts])

  // Esc fecha; trava scroll do body enquanto aberta
  useEffect(() => {
    if (!open) return
    function handleKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open])

  // Foco no primeiro campo ao abrir
  useEffect(() => {
    if (open && stripRef.current) {
      const first = stripRef.current.querySelector('button, input, select')
      first?.focus()
    }
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

  async function handleExport() {
    if (!exportFnRef.current || exporting) return
    setExporting(true)
    try { await exportFnRef.current() }
    catch (err) { console.error('ERRO exportação:', err.message) }
    finally { setExporting(false) }
  }

  function handleClear() {
    setPending(DEFAULT_FILTERS); applyFilters(DEFAULT_FILTERS); setOpen(false)
  }

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

  const pageActiveCount = useMemo(() => {
    let c = 0
    if (filters.periodo !== '7dias') c++
    if (show('cliente')         && filters.clientes.length)        c++
    if (show('propriedade')     && filters.propriedades.length)    c++
    if (show('processo')        && filters.processos.length)       c++
    if (show('cultura')         && filters.tipos_safra.length)     c++
    if (show('excludedMotivos') && filters.excludedMotivos.length) c++
    if (show('showGroupAvg')    && filters.showGroupAvg)           c++
    if (show('metricFilter') && (filters.metricFilters ?? []).some(f => f.field && f.value !== '')) c++
    if (show('metricFilter') && filters.equipamentos?.length) c++
    if (show('metricFilter') && filters.operadores?.length)  c++
    if (show('metricFilter') && filters.modelos?.length)     c++
    if (show('metricFilter') && filters.implementos?.length) c++
    if (solinftecOnly && filters.referenciaSafra)            c++
    return c
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, visibleFilters, solinftecOnly])

  const hasAvancado = show('metricFilter') || show('showGroupAvg') || show('excludedMotivos') || solinftecOnly

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
        title={fabExpanded ? 'Ocultar botões' : 'Mostrar botões'}
        style={{ ...fabBase, bottom: 24, background: '#4a6741', color: '#fff' }}
      >
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          {fabExpanded
            ? <path strokeLinecap="round" strokeLinejoin="round" d="M19 15l-7-7-7 7" />
            : <path strokeLinecap="round" strokeLinejoin="round" d="M5 9l7 7 7-7" />
          }
        </svg>
      </button>

      {/* FAB — Filtros (visível quando expandido) */}
      {fabExpanded && (
        <button
          onClick={() => setOpen(o => !o)}
          data-pdf-exclude="true"
          style={{
            ...fabBase, bottom: 84,
            background: pageActiveCount > 0 ? '#2d4a2d' : '#4a6741',
            color: '#fff',
          }}
          title="Filtros"
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          {pageActiveCount > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              width: 18, height: 18, borderRadius: '50%',
              background: '#d97706', color: '#fff',
              fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {pageActiveCount}
            </span>
          )}
        </button>
      )}

      {/* FAB — Limpar filtros (visível quando expandido e há filtros ativos) */}
      {fabExpanded && pageActiveCount > 0 && (
        <button
          onClick={() => { clearFilters(); setOpen(false) }}
          data-pdf-exclude="true"
          title="Limpar filtros"
          style={{ ...fabBase, bottom: 144, background: '#2d4a2d', color: '#fff' }}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* FAB — Exportar PDF (visível quando expandido) */}
      {fabExpanded && (
        <button
          onClick={() => window.print()}
          data-pdf-exclude="true"
          title="Exportar PDF"
          style={{ ...fabBase, bottom: pageActiveCount > 0 ? 204 : 144, background: '#4a6741', color: '#fff' }}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3M7 7V4a1 1 0 011-1h8a1 1 0 011 1v3" />
          </svg>
        </button>
      )}

      {/* FAB — Exportar XLSX (visível quando expandido e a página registrou função de exportação) */}
      {fabExpanded && hasExportFn && (
        <button
          onClick={handleExport}
          data-pdf-exclude="true"
          disabled={exporting}
          title={exporting ? 'Exportando...' : 'Exportar XLSX'}
          style={{
            ...fabBase,
            bottom: pageActiveCount > 0 ? 264 : 204,
            background: '#4a6741',
            color: '#fff',
            opacity: exporting ? 0.75 : 1,
          }}
        >
          {exporting ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}
              style={{ animation: 'spin 1s linear infinite' }}>
              <path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" />
            </svg>
          ) : (
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M6 4h12a2 2 0 012 2v4H4V6a2 2 0 012-2zM4 10h16v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8zM9 10v10M15 10v10" />
            </svg>
          )}
        </button>
      )}

      {/* ── Faixa de filtros ─────────────────────────────────────────────────── */}
      {open && fabExpanded && (
        <>
          {/* Backdrop */}
          <div
            data-pdf-exclude="true"
            aria-hidden="true"
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              zIndex: 1001,
              background: 'rgba(0,0,0,0.35)',
            }}
          />

          {/* Faixa */}
          <div
            ref={stripRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="filter-strip-title"
            data-pdf-exclude="true"
            style={{
              position: 'fixed',
              top: 'var(--header-h, 80px)',
              left: 'var(--sidebar-w, 0)',
              right: 0,
              maxHeight: 'calc(100vh - var(--header-h, 80px))',
              overflowY: 'auto',
              background: '#fff',
              borderBottom: '1px solid #e0dbd4',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              zIndex: 1002,
            }}
          >
            {/* ── Cabeçalho da faixa ──────────────────────────────────────── */}
            <div style={{
              padding: '12px 24px',
              borderBottom: '1px solid #e0dbd4',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#fff',
              position: 'sticky', top: 0, zIndex: 1,
            }}>
              <span id="filter-strip-title" style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>
                Filtros
              </span>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <button
                  onClick={handleClear}
                  style={{ fontSize: 12, color: '#8b2020', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Limpar tudo
                </button>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: '#6b6560',
                    width: 28, height: 28, borderRadius: 4,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ── Linha 1: campos sempre visíveis ─────────────────────────── */}
            <div style={{ padding: '16px 24px', display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>

              {/* Período */}
              <div style={{ flexBasis: 300, flexGrow: 1, minWidth: 220 }}>
                <Label>Período</Label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <div style={{ flex: 1 }}>
                      <Label>De</Label>
                      <input type="date" value={pending.dataInicio || ''} onChange={e => set('dataInicio', e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #d4cfc9', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <Label>Até</Label>
                      <input type="date" value={pending.dataFim || ''} onChange={e => set('dataFim', e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #d4cfc9', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Cliente */}
              {show('cliente') && (
                <div style={{ flexBasis: 160, flexGrow: 1, minWidth: 140 }}>
                  <Label>Cliente</Label>
                  <MultiSelect
                    values={pending.clientes}
                    onChange={vals => set('clientes', vals)}
                    placeholder="Todos"
                    options={cascadedOpts.clientes.map(c => ({ value: c, label: c }))}
                  />
                </div>
              )}

              {/* Propriedade */}
              {show('propriedade') && (
                <div style={{ flexBasis: 160, flexGrow: 1, minWidth: 140 }}>
                  <Label>Propriedade</Label>
                  <MultiSelect
                    values={pending.propriedades}
                    onChange={vals => set('propriedades', vals)}
                    placeholder="Todas"
                    options={cascadedOpts.propriedades.map(p => ({ value: p, label: p }))}
                  />
                </div>
              )}

              {/* Processo */}
              {show('processo') && (
                <div style={{ flexBasis: 160, flexGrow: 1, minWidth: 140 }}>
                  <Label>Processo / Operação</Label>
                  <MultiSelect
                    values={pending.processos}
                    onChange={vals => set('processos', vals)}
                    placeholder="Todos"
                    options={cascadedOpts.processos.map(p => ({ value: p, label: p }))}
                  />
                </div>
              )}

              {/* Cultura */}
              {show('cultura') && (
                <div style={{ flexBasis: 160, flexGrow: 1, minWidth: 140 }}>
                  <Label>Cultura</Label>
                  <MultiSelect
                    values={pending.tipos_safra}
                    onChange={vals => set('tipos_safra', vals)}
                    placeholder="Todas"
                    options={cascadedOpts.tipos_safra.map(t => ({ value: t, label: t }))}
                  />
                </div>
              )}
            </div>

            {/* ── Toggle "Avançado" ────────────────────────────────────────── */}
            {hasAvancado && (
              <div style={{ padding: '0 24px 12px' }}>
                <button
                  onClick={() => setAvancadoOpen(v => !v)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, color: '#4a6741', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontFamily: 'inherit', padding: 0,
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={2}>
                    {avancadoOpen ? <path d="M1 7L5 3L9 7" /> : <path d="M1 3L5 7L9 3" />}
                  </svg>
                  {avancadoOpen ? 'Ocultar avançado' : 'Avançado'}
                </button>
              </div>
            )}

            {/* ── Seção Avançada ──────────────────────────────────────────── */}
            {hasAvancado && avancadoOpen && (
              <div style={{ borderTop: '1px solid #f0ede8', padding: '16px 24px', display: 'flex', flexWrap: 'wrap', gap: 24 }}>

                {/* Equipamento / Operador / Modelo / Implemento + Filtrar por Métrica */}
                {show('metricFilter') && (
                  <div style={{ flexBasis: 600, flexGrow: 2, minWidth: 280 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                      <div style={{ flexBasis: 160, flexGrow: 1, minWidth: 130 }}>
                        <Label>Equipamento</Label>
                        <MultiSelect
                          values={pending.equipamentos ?? []}
                          onChange={vals => set('equipamentos', vals)}
                          placeholder="Todos"
                          options={extraOptions.equipamentos}
                        />
                      </div>
                      <div style={{ flexBasis: 160, flexGrow: 1, minWidth: 130 }}>
                        <Label>Operador</Label>
                        <MultiSelect
                          values={pending.operadores ?? []}
                          onChange={vals => set('operadores', vals)}
                          placeholder="Todos"
                          options={extraOptions.operadores.map(o => ({ value: o, label: o }))}
                        />
                      </div>
                      <div style={{ flexBasis: 160, flexGrow: 1, minWidth: 130 }}>
                        <Label>Modelo</Label>
                        <MultiSelect
                          values={pending.modelos ?? []}
                          onChange={vals => set('modelos', vals)}
                          placeholder="Todos"
                          options={extraOptions.modelos.map(o => ({ value: o, label: o }))}
                        />
                      </div>
                      <div style={{ flexBasis: 160, flexGrow: 1, minWidth: 130 }}>
                        <Label>Implemento</Label>
                        <MultiSelect
                          values={pending.implementos ?? []}
                          onChange={vals => set('implementos', vals)}
                          placeholder="Todos"
                          options={extraOptions.implementos.map(o => ({ value: o, label: o }))}
                        />
                      </div>
                    </div>

                    {/* Filtrar por Métrica */}
                    <div style={{ marginTop: 16 }}>
                      <Label>Filtrar por Métrica</Label>
                      {(pending.metricFilters ?? []).map((mf, idx) => (
                        <div key={idx} style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
                            <select
                              value={mf.field}
                              onChange={e => setPending(p => ({ ...p, metricFilters: p.metricFilters.map((f, i) => i === idx ? { ...f, field: e.target.value, value: '' } : f) }))}
                              style={{ flex: 1, padding: '6px 8px', border: '1px solid #d4cfc9', borderRadius: 6, fontSize: 12, color: '#1a1a1a', background: '#fff', fontFamily: 'inherit' }}
                            >
                              <option value="">Escolher métrica…</option>
                              {METRIC_FILTER_OPTIONS.map(({ group, options }) => (
                                <optgroup key={group} label={group}>
                                  {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </optgroup>
                              ))}
                            </select>
                            <button
                              onClick={() => setPending(p => ({ ...p, metricFilters: p.metricFilters.filter((_, i) => i !== idx) }))}
                              style={{ width: 26, height: 32, border: 'none', background: 'none', cursor: 'pointer', color: '#8b6560', fontSize: 18, padding: 0, flexShrink: 0 }}
                            >×</button>
                          </div>
                          {mf.field && (
                            <>
                              <div style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
                                <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #d4cfc9', flexShrink: 0 }}>
                                  {['>=', '<=', '='].map(op => (
                                    <button key={op}
                                      onClick={() => setPending(p => ({ ...p, metricFilters: p.metricFilters.map((f, i) => i === idx ? { ...f, operator: op } : f) }))}
                                      style={{ padding: '5px 8px', fontSize: 12, border: 'none', background: (mf.operator ?? '>=') === op ? '#2d4a2d' : '#fff', color: (mf.operator ?? '>=') === op ? '#fff' : '#4a3728', cursor: 'pointer' }}
                                    >{op}</button>
                                  ))}
                                </div>
                                <input type="number" step="0.1"
                                  value={mf.value ?? ''}
                                  onChange={e => setPending(p => ({ ...p, metricFilters: p.metricFilters.map((f, i) => i === idx ? { ...f, value: e.target.value } : f) }))}
                                  placeholder="Valor…"
                                  style={{ flex: 1, padding: '5px 8px', border: '1px solid #d4cfc9', borderRadius: 6, fontSize: 12, fontFamily: 'inherit' }}
                                />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 10, color: '#6b6560' }}>Modo:</span>
                                <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #d4cfc9' }}>
                                  {[{ v: 'geral', l: 'Geral' }, { v: 'diario', l: 'Diária' }, { v: 'sessao', l: 'Sessão' }].map(({ v, l }) => (
                                    <button key={v}
                                      onClick={() => setPending(p => ({ ...p, metricFilters: p.metricFilters.map((f, i) => i === idx ? { ...f, mode: v } : f) }))}
                                      style={{ padding: '4px 10px', fontSize: 11, border: 'none', background: (mf.mode ?? 'geral') === v ? '#2d4a2d' : '#fff', color: (mf.mode ?? 'geral') === v ? '#fff' : '#4a3728', cursor: 'pointer' }}
                                    >{l}</button>
                                  ))}
                                </div>
                                {(mf.mode ?? 'geral') !== 'sessao' && (
                                  <>
                                    <span style={{ fontSize: 10, color: '#6b6560' }}>por:</span>
                                    <select value={mf.dim ?? 'equipamento'}
                                      onChange={e => setPending(p => ({ ...p, metricFilters: p.metricFilters.map((f, i) => i === idx ? { ...f, dim: e.target.value } : f) }))}
                                      style={{ padding: '3px 6px', border: '1px solid #d4cfc9', borderRadius: 6, fontSize: 11, color: '#1a1a1a', background: '#fff', fontFamily: 'inherit' }}
                                    >
                                      {[{ v: 'equipamento', l: 'Equipamento' }, { v: 'operador', l: 'Operador' }, { v: 'modelo_equipamento', l: 'Modelo' }, { v: 'implemento', l: 'Implemento' }].map(({ v, l }) => (
                                        <option key={v} value={v}>{l}</option>
                                      ))}
                                    </select>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => setPending(p => ({ ...p, metricFilters: [...(p.metricFilters ?? []), { field: '', operator: '>=', value: '', mode: 'geral' }] }))}
                        style={{ width: '100%', padding: '6px 0', fontSize: 12, fontWeight: 500, border: '1px dashed #4a6741', borderRadius: 6, background: 'none', color: '#4a6741', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        + Adicionar filtro
                      </button>
                    </div>
                  </div>
                )}

                {/* Comparar com grupo + Motivos + Safra */}
                <div style={{ flexBasis: 260, flexGrow: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {show('showGroupAvg') && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6b6560' }}>Comparar com grupo</div>
                        <div style={{ fontSize: 11, color: '#8a9a85', marginTop: 2 }}>Referências na tabela e gráficos</div>
                      </div>
                      <Toggle checked={pending.showGroupAvg ?? false} onChange={v => set('showGroupAvg', v)} />
                    </div>
                  )}

                  {show('excludedMotivos') && motivos.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Label>Excluir Motivos de Parada</Label>
                        {nExcluded > 0 && (
                          <button onClick={() => set('excludedMotivos', [])}
                            style={{ fontSize: 11, color: '#8b2020', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 5, fontFamily: 'inherit' }}>
                            limpar ({nExcluded})
                          </button>
                        )}
                      </div>
                      <p style={{ fontSize: 11, color: '#6b6560', marginBottom: 8, marginTop: 0 }}>
                        O tempo desses motivos será removido dos totais.
                      </p>
                      <button onClick={() => setMotivosOpen(o => !o)}
                        style={{ width: '100%', padding: '7px 10px', textAlign: 'left', border: '1px solid #d4cfc9', borderRadius: motivosOpen ? '6px 6px 0 0' : 6, background: '#fff', fontSize: 13, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'inherit' }}
                      >
                        <span style={{ color: nExcluded > 0 ? '#1a1a1a' : '#6b6560' }}>
                          {nExcluded === 0 ? 'Nenhum excluído' : `${nExcluded} selecionado${nExcluded > 1 ? 's' : ''}`}
                        </span>
                        <span style={{ fontSize: 10, color: '#6b6560' }}>{motivosOpen ? '▲' : '▼'}</span>
                      </button>
                      {motivosOpen && (
                        <div style={{ border: '1px solid #d4cfc9', borderTop: 'none', borderRadius: '0 0 6px 6px', background: '#fff', maxHeight: 200, overflowY: 'auto' }}>
                          <div style={{ padding: '8px 10px', borderBottom: '1px solid #e0dbd4', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                            <input type="text" placeholder="Buscar motivo..." value={motivoSearch}
                              onChange={e => setMotivoSearch(e.target.value)} autoFocus
                              style={{ width: '100%', padding: '5px 8px', boxSizing: 'border-box', border: '1px solid #d4cfc9', borderRadius: 4, fontSize: 12, fontFamily: 'inherit' }} />
                          </div>
                          {Object.keys(filteredMotivosByTipo).length === 0
                            ? <div style={{ padding: '10px 12px', fontSize: 12, color: '#6b6560' }}>Nenhum resultado.</div>
                            : Object.entries(filteredMotivosByTipo).map(([tipo, lista]) => (
                              <div key={tipo}>
                                <div style={{ padding: '6px 10px 2px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: TIPO_PARADA_COLOR[tipo] || '#6b6560' }}>
                                  {TIPO_PARADA_LABEL[tipo] || tipo}
                                </div>
                                {lista.map(m => (
                                  <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 4px 20px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={pending.excludedMotivos.includes(m)} onChange={() => toggleMotivo(m)} style={{ accentColor: '#2d4a2d' }} />
                                    <span style={{ fontSize: 12, color: '#1a1a1a' }}>{m}</span>
                                  </label>
                                ))}
                              </div>
                            ))
                          }
                        </div>
                      )}
                    </div>
                  )}

                  {solinftecOnly && safras.length > 0 && (
                    <div>
                      <Label>Safra de referência</Label>
                      <p style={{ fontSize: 11, color: '#6b6560', marginBottom: 8, marginTop: 0 }}>
                        Janela usada para benchmarks e detecção de quebra. Padrão: safra do período ativo.
                      </p>
                      <select value={pending.referenciaSafra ?? ''} onChange={e => set('referenciaSafra', e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #d4cfc9', borderRadius: 6, fontSize: 13, color: '#1a1a1a', background: '#fff', fontFamily: 'inherit' }}>
                        <option value="">Automático (safra do período)</option>
                        {safras.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Rodapé ──────────────────────────────────────────────────── */}
            <div style={{ padding: '12px 24px', borderTop: '1px solid #e0dbd4', position: 'sticky', bottom: 0, background: '#fff' }}>
              <button
                onClick={handleApply}
                style={{
                  width: '100%', padding: '10px 0',
                  background: '#2d4a2d', color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Aplicar filtros
              </button>
            </div>
          </div>
        </>
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

function MultiSelect({ values, onChange, placeholder, options }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  const filtered = options.filter(o => !search || o.label.toLowerCase().includes(search.toLowerCase()))

  function toggle(val) {
    onChange(values.includes(val) ? values.filter(v => v !== val) : [...values, val])
  }

  useEffect(() => {
    if (!open) return
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const label = values.length === 0 ? placeholder
    : values.length === 1 ? values[0]
    : `${values.length} selecionados`

  return (
    <div ref={ref} style={{ marginBottom: 0 }}>
      <button
        onClick={() => { setOpen(o => !o); setSearch('') }}
        style={{
          width: '100%', padding: '6px 10px',
          border: '1px solid #d4cfc9',
          borderRadius: open ? '6px 6px 0 0' : 6,
          fontSize: 13, color: values.length ? '#1a1a1a' : '#6b6560',
          background: '#fff', textAlign: 'left', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6,
          fontFamily: 'inherit',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {values.length > 0 && (
            <span onMouseDown={e => { e.stopPropagation(); onChange([]) }}
              style={{ color: '#6b6560', fontSize: 16, lineHeight: 1, cursor: 'pointer' }}>×</span>
          )}
          <span style={{ color: '#6b6560', fontSize: 10 }}>{open ? '▲' : '▼'}</span>
        </span>
      </button>
      {open && (
        <div style={{ border: '1px solid #d4cfc9', borderTop: 'none', borderRadius: '0 0 6px 6px', background: '#fff', maxHeight: 180, overflowY: 'auto' }}>
          <div style={{ padding: '6px 8px', borderBottom: '1px solid #e0dbd4', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
            <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} autoFocus
              style={{ width: '100%', padding: '4px 8px', boxSizing: 'border-box', border: '1px solid #d4cfc9', borderRadius: 4, fontSize: 12, fontFamily: 'inherit' }} />
          </div>
          {filtered.length === 0
            ? <div style={{ padding: '8px 10px', fontSize: 12, color: '#6b6560' }}>Nenhum resultado</div>
            : filtered.map(o => (
              <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={values.includes(o.value)} onChange={() => toggle(o.value)}
                  style={{ accentColor: '#2d4a2d', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#1a1a1a' }}>{o.label}</span>
              </label>
            ))
          }
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
      fontFamily: 'inherit',
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
