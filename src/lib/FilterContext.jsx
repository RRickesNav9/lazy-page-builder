import { createContext, useContext, useState, useCallback } from 'react'

const DEFAULT_FILTERS = {
  periodo: 'ontem',        // 'ontem' | '7dias' | '30dias' | 'safra' | 'custom'
  dataCustom: null,
  clientes: [],            // [] = todos
  todosClientes: true,
  propriedades: [],
  todasPropriedades: true,
  operacoes: [],           // [] = todas
  todasOperacoes: true,
  culturas: [],            // [] = todas
  todasCulturas: true,
  equipamentos: [],        // [] = todos
  todosEquipamentos: true,
  showBenchmark: false,
}

const FilterContext = createContext()

export function FilterProvider({ children }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const openDrawer = useCallback(() => setDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const applyFilters = useCallback((newFilters) => {
    setFilters(newFilters)
    setDrawerOpen(false)
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  const activeCount = countActive(filters)

  return (
    <FilterContext.Provider value={{
      filters, setFilters, applyFilters, clearFilters,
      drawerOpen, openDrawer, closeDrawer,
      activeCount, DEFAULT_FILTERS,
    }}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilters() {
  return useContext(FilterContext)
}

function countActive(f) {
  let count = 0
  if (!f.todosClientes && f.clientes.length > 0) count += f.clientes.length
  if (!f.todasOperacoes && f.operacoes.length > 0) count++
  if (!f.todasCulturas && f.culturas.length > 0) count++
  if (!f.todosEquipamentos && f.equipamentos.length > 0) count++
  if (f.showBenchmark) count++
  if (f.periodo !== 'ontem') count++
  return count
}
