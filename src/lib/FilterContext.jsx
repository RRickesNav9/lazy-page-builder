import { createContext, useContext, useState, useCallback, useMemo } from 'react'

export const DEFAULT_FILTERS = {
  periodo: '7dias',
  dataInicio: null,
  dataFim: null,
  cliente: '',
  propriedade: '',
  processo: '',
  tipo_safra: '',
  excludedMotivos: [],
  showBenchmark: false,
}

function dateRangeForPeriodo(periodo) {
  const end = new Date()
  const start = new Date()
  if (periodo === 'ontem') {
    const d = new Date(end)
    d.setDate(d.getDate() - 1)
    const s = d.toISOString().split('T')[0]
    return { dataInicio: s, dataFim: s }
  }
  if (periodo === '7dias') {
    start.setDate(end.getDate() - 7)
    return { dataInicio: start.toISOString().split('T')[0], dataFim: end.toISOString().split('T')[0] }
  }
  if (periodo === '30dias') {
    start.setDate(end.getDate() - 30)
    return { dataInicio: start.toISOString().split('T')[0], dataFim: end.toISOString().split('T')[0] }
  }
  if (periodo === 'safra') {
    const year = end.getFullYear()
    const month = end.getMonth() + 1
    const safraStart = month >= 6 ? `${year}-06-01` : `${year - 1}-06-01`
    return { dataInicio: safraStart, dataFim: end.toISOString().split('T')[0] }
  }
  return { dataInicio: null, dataFim: null }
}

const FilterContext = createContext()

export function FilterProvider({ children }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [drawerOpen, setDrawerOpen] = useState(false)

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
      ...(filters.cliente    && { cliente:    filters.cliente }),
      ...(filters.propriedade && { propriedade: filters.propriedade }),
      ...(filters.processo   && { processo:   filters.processo }),
      ...(filters.tipo_safra && { tipo_safra: filters.tipo_safra }),
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

  const activeCount = useMemo(() => {
    let count = 0
    if (filters.cliente)               count++
    if (filters.propriedade)           count++
    if (filters.processo)              count++
    if (filters.tipo_safra)            count++
    if (filters.excludedMotivos.length) count++
    if (filters.showBenchmark)         count++
    if (filters.periodo !== '7dias')   count++
    return count
  }, [filters])

  return (
    <FilterContext.Provider value={{
      filters, setFilters, applyFilters, clearFilters,
      drawerOpen, openDrawer, closeDrawer,
      activeCount, DEFAULT_FILTERS,
      queryFilters, currentSafra,
    }}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilters() {
  return useContext(FilterContext)
}
