import { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react'

export const DEFAULT_FILTERS = {
  periodo: '7dias',
  dataInicio: null,
  dataFim: null,
  clientes: [],
  propriedades: [],
  processos: [],
  tipos_safra: [],
  excludedMotivos: [],
  showGroupAvg: false,
  metricFilters: [],
  equipamentos: [],
  operadores: [],
  modelos: [],
  implementos: [],
  referenciaSafra: '',
}

// Formata Date para YYYY-MM-DD usando data local — evita deslize de dia em BRT tarde da noite
function localDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function dateRangeForPeriodo(periodo) {
  const end = new Date()
  const start = new Date()
  if (periodo === 'ontem') {
    const d = new Date(end)
    d.setDate(d.getDate() - 1)
    const s = localDateStr(d)
    return { dataInicio: s, dataFim: s }
  }
  if (periodo === '7dias') {
    start.setDate(end.getDate() - 7)
    return { dataInicio: localDateStr(start), dataFim: localDateStr(end) }
  }
  if (periodo === '30dias') {
    start.setDate(end.getDate() - 30)
    return { dataInicio: localDateStr(start), dataFim: localDateStr(end) }
  }
  if (periodo === 'safra') {
    const year = end.getFullYear()
    const month = end.getMonth() + 1
    const safraStart = month >= 6 ? `${year}-06-01` : `${year - 1}-06-01`
    return { dataInicio: safraStart, dataFim: localDateStr(end) }
  }
  return { dataInicio: null, dataFim: null }
}

const FilterContext = createContext()

export function FilterProvider({ children }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showFABs, setShowFABs] = useState(true)
  const [fabExpanded, setFabExpanded] = useState(false)

  // Página ativa registra sua função de exportação; FAB lê para exibir o botão.
  // useRef evita que a troca de exportFn cause re-render em componentes que só lêem o ref.
  const exportFnRef = useRef(null)
  const [hasExportFn, setHasExportFn] = useState(false)
  const registerExportFn = useCallback((fn) => {
    exportFnRef.current = fn || null
    setHasExportFn(!!fn)
  }, [])

  const openDrawer  = useCallback(() => setDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const applyFilters = useCallback((newFilters) => {
    setFilters(newFilters)
    setDrawerOpen(false)
  }, [])

  const clearFilters = useCallback(() => setFilters(DEFAULT_FILTERS), [])

  const queryFilters = useMemo(() => {
    const dateRange = filters.periodo === 'custom'
      ? { dataInicio: filters.dataInicio, dataFim: filters.dataFim }
      : dateRangeForPeriodo(filters.periodo)
    return {
      ...dateRange,
      ...(filters.clientes.length    && { clientes:    filters.clientes }),
      ...(filters.propriedades.length && { propriedades: filters.propriedades }),
      ...(filters.processos.length   && { processos:   filters.processos }),
      ...(filters.tipos_safra.length  && { tipos_safra:  filters.tipos_safra }),
      ...(filters.equipamentos?.length && { equipamentos: filters.equipamentos }),
      ...(filters.operadores?.length  && { operadores:   filters.operadores }),
      ...(filters.modelos?.length     && { modelos:      filters.modelos }),
      ...(filters.implementos?.length && { implementos:  filters.implementos }),
    }
  }, [filters])

  const currentSafra = useMemo(() => {
    const dateStr = queryFilters.dataFim || new Date().toISOString().split('T')[0]
    // append noon to avoid UTC offset shifting the date
    const d = new Date(dateStr + 'T12:00:00')
    const year  = d.getFullYear()
    const month = d.getMonth() + 1
    return month >= 6 ? `${year}/${year + 1}` : `${year - 1}/${year}`
  }, [queryFilters.dataFim])

  // Safra usada como janela de referência para benchmarks e baseline de quebra.
  // Quando o usuário seleciona explicitamente uma safra, usa ela; caso contrário usa a safra do período ativo.
  const benchmarkSafra = useMemo(
    () => filters.referenciaSafra || currentSafra,
    [filters.referenciaSafra, currentSafra]
  )

  const activeCount = useMemo(() => {
    let count = 0
    if (filters.clientes.length)        count++
    if (filters.propriedades.length)   count++
    if (filters.processos.length)      count++
    if (filters.tipos_safra.length)    count++
    if (filters.excludedMotivos.length) count++
    if (filters.showGroupAvg)          count++
    if (filters.periodo !== '7dias')   count++
    if ((filters.metricFilters ?? []).some(f => f.field && f.value !== '')) count++
    if (filters.equipamentos?.length) count++
    if (filters.operadores?.length)  count++
    if (filters.modelos?.length)     count++
    if (filters.implementos?.length) count++
    if (filters.referenciaSafra)     count++
    return count
  }, [filters])

  const value = useMemo(() => ({
    filters, setFilters, applyFilters, clearFilters,
    drawerOpen, openDrawer, closeDrawer,
    showFABs, setShowFABs,
    activeCount, DEFAULT_FILTERS,
    queryFilters, currentSafra, benchmarkSafra,
    exportFnRef, hasExportFn, registerExportFn,
    fabExpanded, setFabExpanded,
  }), [
    filters, drawerOpen, showFABs, hasExportFn,
    activeCount, queryFilters, currentSafra, benchmarkSafra,
    applyFilters, clearFilters, openDrawer, closeDrawer, registerExportFn,
    fabExpanded,
  ])

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilters() {
  return useContext(FilterContext)
}
