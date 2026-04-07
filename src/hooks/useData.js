import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Busca registros operacionais com filtros dinâmicos e paginação
// enabled=false retorna vazio imediatamente sem query (evita fetch desnecessário)
export function useOperationalData(filters = {}, enabled = true) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState(null)
  const hasData = data.length > 0

  const fetch = useCallback(async () => {
    if (!enabled) { setData([]); setLoading(false); return }
    if (hasData) { setFetching(true) } else { setLoading(true) }
    setError(null)
    try {
      let query = supabase
        .from('dashboard_operational_view')
        .select('*')
        .neq('cliente', 'Média Porteira')
        .order('data', { ascending: false })

      if (filters.cliente)            query = query.eq('cliente', filters.cliente)
      if (filters.propriedade)        query = query.eq('propriedade', filters.propriedade)
      if (filters.processo)           query = query.eq('processo', filters.processo)
      if (filters.tipo_safra)         query = query.eq('tipo_safra', filters.tipo_safra)
      if (filters.safra)              query = query.eq('safra', filters.safra)
      if (filters.equipamento)        query = query.ilike('equipamento', `%${filters.equipamento}%`)
      if (filters.equipamento_cod)    query = query.eq('equipamento_cod', filters.equipamento_cod)
      if (filters.operador)           query = query.ilike('operador', `%${filters.operador}%`)
      if (filters.modelo_equipamento) query = query.eq('modelo_equipamento', filters.modelo_equipamento)
      if (filters.dataInicio)         query = query.gte('data', filters.dataInicio)
      if (filters.dataFim)            query = query.lte('data', filters.dataFim)

      let allRows = [], from = 0
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
      setFetching(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters), enabled])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, fetching, error, refetch: fetch }
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
        if (filters.modelo_equipamento) query = query.eq('modelo_equipamento', filters.modelo_equipamento)
        if (filters.processo)           query = query.eq('processo', filters.processo)
        if (filters.tipo_safra)         query = query.eq('tipo_safra', filters.tipo_safra)
        if (filters.safra)              query = query.eq('safra', filters.safra)
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
  }, [filters.modelo_equipamento, filters.processo, filters.tipo_safra, filters.safra])

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

// Busca valores únicos para popular filtros dropdown — usa view dedicada para evitar limite de 1000 linhas
export function useFilterOptions() {
  const [options, setOptions] = useState({
    clientes: [], propriedades: [], processos: [],
    safras: [], tipos_safra: [], modelos: []
  })

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('dashboard_filter_options')
        .select('*')
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

// Busca motivos de parada distintos para o seletor de exclusão no filtro
export function useStopMotivos() {
  const [motivos, setMotivos] = useState([])

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('dashboard_stop_motivos')
        .select('motivo_de_parada, tipo_parada')
        .order('tipo_parada')
      if (!data) return
      setMotivos(data)
    }
    fetch()
  }, [])

  return motivos
}

// Busca registros de stop_records filtrados pela janela de datas e dimensões ativas
// Retorna vazio se não houver filtros de data definidos
export function useStopData(queryFilters = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!queryFilters.dataInicio && !queryFilters.dataFim) { setData([]); return }
    setLoading(true)
    async function fetch() {
      try {
        let query = supabase
          .from('dashboard_stop_view')
          .select('report_id, motivo_de_parada, tipo_parada, tempo_parado_h')
        if (queryFilters.dataInicio) query = query.gte('data', queryFilters.dataInicio)
        if (queryFilters.dataFim)    query = query.lte('data', queryFilters.dataFim)
        if (queryFilters.cliente)    query = query.eq('cliente', queryFilters.cliente)
        if (queryFilters.processo)   query = query.eq('processo', queryFilters.processo)
        if (queryFilters.tipo_safra) query = query.eq('tipo_safra', queryFilters.tipo_safra)
        let all = [], from = 0
        const pageSize = 1000
        while (true) {
          const { data: page, error } = await query.range(from, from + pageSize - 1)
          if (error) throw error
          all = all.concat(page)
          if (page.length < pageSize) break
          from += pageSize
        }
        setData(all)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(queryFilters)])

  return { data, loading }
}

// Agrega métricas de um cliente via média ponderada a partir de dashboard_operational_view.
// Mesma lógica de peso por métrica usada em compute-performance-stats.
export function useClienteBenchmark(filters = {}) {
  const [metricas, setMetricas] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      setError(null)
      try {
        let query = supabase
          .from('dashboard_operational_view')
          .select([
            'rendimento_operacional_hah', 'eficiencia_geral_pct',
            'eficiencia_operacional_pct', 'consumo_medio_efetivo_lha',
            'consumo_medio_lh', 'disponibilidade_mecanica_pct', 'velocidade_media_kmh',
            'tempo_produtivo_h', 'tempo_total_h', 'area_ha',
          ].join(','))
          .neq('cliente', 'Média Porteira')

        if (filters.cliente)    query = query.eq('cliente',    filters.cliente)
        if (filters.processo)   query = query.eq('processo',   filters.processo)
        if (filters.tipo_safra) query = query.eq('tipo_safra', filters.tipo_safra)
        if (filters.safra)      query = query.eq('safra',      filters.safra)
        if (filters.dataInicio) query = query.gte('data',      filters.dataInicio)
        if (filters.dataFim)    query = query.lte('data',      filters.dataFim)

        let all = [], from = 0
        while (true) {
          const { data: page, error: err } = await query.range(from, from + 999)
          if (err) throw err
          all = all.concat(page)
          if (page.length < 1000) break
          from += 1000
        }

        if (all.length === 0) { setMetricas(null); return }

        // Média ponderada por denominador correto por métrica
        const PESO = {
          rendimento_operacional_hah:   'tempo_produtivo_h',
          eficiencia_geral_pct:         'tempo_total_h',
          eficiencia_operacional_pct:   'tempo_total_h', // denom_h sintético não existe na view
          consumo_medio_efetivo_lha:    'area_ha',
          consumo_medio_lh:             'tempo_total_h',
          disponibilidade_mecanica_pct: 'tempo_total_h',
          velocidade_media_kmh:         'tempo_produtivo_h',
        }

        const result = {}
        for (const [metrica, peso] of Object.entries(PESO)) {
          let sumProd = 0, sumPeso = 0
          for (const row of all) {
            const v = row[metrica]
            const w = row[peso]
            if (v != null && w != null && w > 0) {
              sumProd += v * w
              sumPeso += w
            }
          }
          result[metrica] = sumPeso > 0 ? sumProd / sumPeso : 0
        }
        setMetricas(result)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)])

  return { metricas, loading, error }
}

// Busca equipamentos disponíveis para um cliente específico (para o seletor de benchmark)
export function useEquipamentoOptions(cliente) {
  const [equipamentos, setEquipamentos] = useState([])

  useEffect(() => {
    if (!cliente) { setEquipamentos([]); return }
    async function fetch() {
      const { data } = await supabase
        .from('dashboard_operational_view')
        .select('equipamento, equipamento_cod, modelo_equipamento')
        .eq('cliente', cliente)
        .limit(1000)
      if (!data) return
      const seen = new Set()
      const opts = []
      for (const r of data) {
        const k = r.equipamento_cod || r.equipamento
        if (k && !seen.has(k)) {
          seen.add(k)
          opts.push({ equipamento: r.equipamento, equipamento_cod: r.equipamento_cod, modelo: r.modelo_equipamento })
        }
      }
      setEquipamentos(opts.sort((a, b) => (a.equipamento || '').localeCompare(b.equipamento || '')))
    }
    fetch()
  }, [cliente])

  return equipamentos
}

// Busca dados de dois conjuntos de filtros em paralelo para comparativo de equipamentos
export function useEquipamentoComparativo(filterA, filterB) {
  const [dataA, setDataA] = useState([])
  const [dataB, setDataB] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function fetchFor(filters) {
    let query = supabase.from('dashboard_operational_view').select('*')
    if (filters.equipamento_cod) query = query.eq('equipamento_cod', filters.equipamento_cod)
    if (filters.cliente)         query = query.eq('cliente', filters.cliente)
    if (filters.processo)        query = query.eq('processo', filters.processo)
    if (filters.tipo_safra)      query = query.eq('tipo_safra', filters.tipo_safra)
    if (filters.safra)           query = query.eq('safra', filters.safra)
    if (filters.dataInicio)      query = query.gte('data', filters.dataInicio)
    if (filters.dataFim)         query = query.lte('data', filters.dataFim)
    let all = [], from = 0
    while (true) {
      const { data, error } = await query.range(from, from + 999)
      if (error) throw error
      all = all.concat(data)
      if (data.length < 1000) break
      from += 1000
    }
    return all
  }

  const hasA = !!(filterA?.equipamento_cod || filterA?.cliente)
  const hasB = !!(filterB?.equipamento_cod || filterB?.cliente)

  useEffect(() => {
    if (!hasA && !hasB) { setDataA([]); setDataB([]); return }
    setLoading(true)
    setError(null)
    Promise.all([
      hasA ? fetchFor(filterA) : Promise.resolve([]),
      hasB ? fetchFor(filterB) : Promise.resolve([]),
    ])
      .then(([a, b]) => { setDataA(a); setDataB(b) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filterA), JSON.stringify(filterB)])

  return { dataA, dataB, loading, error }
}
