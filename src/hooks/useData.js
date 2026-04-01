import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Busca registros operacionais com filtros dinâmicos e paginação
export function useOperationalData(filters = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('dashboard_operational_view')
        .select('*')
        .order('data', { ascending: false })

      if (filters.cliente)      query = query.eq('cliente', filters.cliente)
      if (filters.propriedade)  query = query.eq('propriedade', filters.propriedade)
      if (filters.processo)     query = query.eq('processo', filters.processo)
      if (filters.tipo_safra)   query = query.eq('tipo_safra', filters.tipo_safra)
      if (filters.safra)        query = query.eq('safra', filters.safra)
      if (filters.equipamento)  query = query.ilike('equipamento', `%${filters.equipamento}%`)
      if (filters.operador)     query = query.ilike('operador', `%${filters.operador}%`)
      if (filters.modelo_equipamento) query = query.eq('modelo_equipamento', filters.modelo_equipamento)
      if (filters.dataInicio)   query = query.gte('data', filters.dataInicio)
      if (filters.dataFim)      query = query.lte('data', filters.dataFim)

      // Paginação obrigatória — limite silencioso do Supabase é 1000
      let allRows = []
      let from = 0
      const pageSize = 1000
      while (true) {
        const { data: page, error: err } = await query.range(from, from + pageSize - 1)
        if (err) throw err
        allRows = allRows.concat(page)
        if (page.length < pageSize) break
        from += pageSize
      }

      setData(allRows)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}

// Busca benchmark por modelo de equipamento
export function useEquipamentoBenchmark(filters = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      try {
        let query = supabase.from('media_equipamentos_porteira').select('*')
        if (filters.processo)   query = query.eq('processo', filters.processo)
        if (filters.tipo_safra) query = query.eq('tipo_safra', filters.tipo_safra)
        if (filters.safra)      query = query.eq('safra', filters.safra)
        const { data, error } = await query
        if (error) throw error
        setData(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [filters.processo, filters.tipo_safra, filters.safra])

  return { data, loading, error }
}

// Busca benchmark "Média Porteira" por grupo/processo
export function useGrupoBenchmark(filters = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      try {
        let query = supabase.from('media_grupo_porteira').select('*')
        if (filters.processo)   query = query.eq('processo', filters.processo)
        if (filters.tipo_safra) query = query.eq('tipo_safra', filters.tipo_safra)
        if (filters.safra)      query = query.eq('safra', filters.safra)
        const { data, error } = await query
        if (error) throw error
        setData(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [filters.processo, filters.tipo_safra, filters.safra])

  return { data, loading, error }
}

// Busca todos os registros de media_grupo_porteira (tabela pequena, sem paginação)
export function useGrupoData(filters = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      setError(null)
      try {
        let query = supabase.from('media_grupo_porteira').select('*')
        if (filters.processo)   query = query.eq('processo', filters.processo)
        if (filters.tipo_safra) query = query.eq('tipo_safra', filters.tipo_safra)
        if (filters.safra)      query = query.eq('safra', filters.safra)
        const { data, error } = await query
        if (error) throw error
        setData(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [filters.processo, filters.tipo_safra, filters.safra])

  return { data, loading, error }
}

// Busca valores únicos para popular filtros dropdown
export function useFilterOptions() {
  const [options, setOptions] = useState({
    clientes: [], propriedades: [], processos: [],
    safras: [], tipos_safra: [], modelos: []
  })

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('dashboard_operational_view')
        .select('cliente, propriedade, processo, safra, tipo_safra, modelo_equipamento')
      if (!data) return
      setOptions({
        clientes:     [...new Set(data.map(r => r.cliente).filter(Boolean))].sort(),
        propriedades: [...new Set(data.map(r => r.propriedade).filter(Boolean))].sort(),
        processos:    [...new Set(data.map(r => r.processo).filter(Boolean))].sort(),
        safras:       [...new Set(data.map(r => r.safra).filter(Boolean))].sort().reverse(),
        tipos_safra:  [...new Set(data.map(r => r.tipo_safra).filter(Boolean))].sort(),
        modelos:      [...new Set(data.map(r => r.modelo_equipamento).filter(Boolean))].sort(),
      })
    }
    fetch()
  }, [])

  return options
}
