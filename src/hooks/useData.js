import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ─── CONSTANTES DE PROVIDER ───────────────────────────────────────────────────

const SOLINFTEC_ID = '4303d3d1-b62b-4a03-850a-bb87e797f013'
const JD_ID        = '6731a094-8f65-472f-95f5-655d1303a72f'

// ─── MAPAS DE PESO POR MÉTRICA ────────────────────────────────────────────────

// Mapa métrica → denominador correto para média ponderada (espelho de compute-performance-stats)
export const METRIC_WEIGHT_MAP = {
  rendimento_operacional_hah:   'tempo_efetivo_h',
  rendimento_real_hah:          'tempo_motor_ligado_h',
  eficiencia_geral_pct:         'tempo_total_h',
  eficiencia_operacional_pct:   'tempo_total_h',
  consumo_medio_efetivo_lha:    'area_ha',
  consumo_medio_efetivo_lh:     'tempo_efetivo_h',
  consumo_medio_lh:             'tempo_total_h',
  consumo_medio_lha:            'area_ha',
  disponibilidade_mecanica_pct: 'tempo_total_h',
  velocidade_media_kmh:         'tempo_produtivo_h',
  rpm_medio:                    'tempo_total_h',
  motor_ligado_pct:             'tempo_total_h',
  motor_ocioso_pct:             'tempo_motor_ligado_h',
  sem_apontamento_pct:          'tempo_parada_h',
  area_por_linha_ha:            'area_ha',
}

// JD exporta apenas um subconjunto de métricas; velocidade_media_kmh usa tempo_efetivo_h (= tempo_total_h no JD)
const JD_METRIC_WEIGHT_MAP = {
  rendimento_operacional_hah: 'tempo_efetivo_h',
  velocidade_media_kmh:       'tempo_efetivo_h',
  consumo_medio_lh:           'tempo_total_h',
  consumo_medio_lha:          'area_ha',
  area_por_linha_ha:          'area_ha',
}

// ─── PAGINAÇÃO ────────────────────────────────────────────────────────────────

// Pagina uma query Supabase já configurada (sem .range()) e retorna todos os registros.
async function fetchAllPages(query) {
  let all = [], from = 0
  while (true) {
    const { data: page, error } = await query.range(from, from + 999)
    if (error) throw error
    if (!page?.length) break
    all = all.concat(page)
    if (page.length < 1000) break
    from += 1000
  }
  return all
}

// ─── HELPERS INTERNOS ─────────────────────────────────────────────────────────

// Converte string de safra ('YYYY/YYYY+1') para intervalo de datas.
function safraToDateRange(safra) {
  const startYear = parseInt(safra.split('/')[0])
  return { dataInicio: `${startYear}-06-01`, dataFim: `${startYear + 1}-05-31` }
}

// ─── HOOKS PÚBLICOS ───────────────────────────────────────────────────────────

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
        .order('id', { ascending: true })

      if (filters.clientes?.length)     query = query.in('cliente', filters.clientes)
      else if (filters.cliente)        query = query.eq('cliente', filters.cliente)
      if (filters.propriedades?.length) query = query.in('propriedade', filters.propriedades)
      else if (filters.propriedade)    query = query.eq('propriedade', filters.propriedade)
      if (filters.processos?.length)   query = query.in('processo', filters.processos)
      else if (filters.processo)       query = query.eq('processo', filters.processo)
      if (filters.tipos_safra?.length) query = query.in('tipo_safra', filters.tipos_safra)
      else if (filters.tipo_safra)     query = query.eq('tipo_safra', filters.tipo_safra)
      if (filters.safra)              query = query.eq('safra', filters.safra)
      if (filters.equipamento)        query = query.ilike('equipamento', `%${filters.equipamento}%`)
      if (filters.equipamento_cod)    query = query.eq('equipamento_cod', filters.equipamento_cod)
      if (filters.operador)            query = query.ilike('operador', `%${filters.operador}%`)
      if (filters.modelo_equipamento)  query = query.eq('modelo_equipamento', filters.modelo_equipamento)
      if (filters.operadores?.length)  query = query.in('operador',           filters.operadores)
      if (filters.modelos?.length)     query = query.in('modelo_equipamento', filters.modelos)
      if (filters.implementos?.length) query = query.in('implemento',         filters.implementos)
      if (filters.dataInicio)          query = query.gte('data', filters.dataInicio)
      if (filters.dataFim)             query = query.lte('data', filters.dataFim)

      setData(await fetchAllPages(query))
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

// Retorna as linhas brutas de dashboard_filter_options para filtros cascateados no FAB.
// solinftecOnly=true exclui linhas do provider John Deere.
// dateRange filtra pelo período pending — garante que opções refletem o intervalo selecionado.
export function useFilterOptionsRaw(solinftecOnly = false, dateRange = {}) {
  const [rawRows, setRawRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      let query = supabase
        .from('dashboard_filter_options')
        .select('cliente, propriedade, processo, tipo_safra')
      if (solinftecOnly)        query = query.neq('data_provider_id', JD_ID)
      if (dateRange.dataInicio) query = query.gte('data', dateRange.dataInicio)
      if (dateRange.dataFim)    query = query.lte('data', dateRange.dataFim)
      const { data } = await query
      if (data) setRawRows(data)
      setLoading(false)
    }
    fetch()
  }, [solinftecOnly, dateRange.dataInicio, dateRange.dataFim])

  return { rawRows, loading }
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
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!queryFilters.dataInicio && !queryFilters.dataFim) { setData([]); setError(null); return }
    setLoading(true)
    setError(null)
    async function fetch() {
      try {
        let query = supabase
          .from('dashboard_stop_view')
          .select('report_id, motivo_de_parada, tipo_parada, tempo_parado_h')
        if (queryFilters.dataInicio) query = query.gte('data', queryFilters.dataInicio)
        if (queryFilters.dataFim)    query = query.lte('data', queryFilters.dataFim)
        if (queryFilters.clientes?.length)      query = query.in('cliente',     queryFilters.clientes)
        else if (queryFilters.cliente)         query = query.eq('cliente',     queryFilters.cliente)
        if (queryFilters.propriedades?.length) query = query.in('propriedade', queryFilters.propriedades)
        if (queryFilters.processos?.length)    query = query.in('processo',    queryFilters.processos)
        else if (queryFilters.processo)        query = query.eq('processo',    queryFilters.processo)
        if (queryFilters.tipos_safra?.length)  query = query.in('tipo_safra',  queryFilters.tipos_safra)
        else if (queryFilters.tipo_safra)      query = query.eq('tipo_safra',  queryFilters.tipo_safra)
        setData(await fetchAllPages(query))
      } catch (err) {
        setError(err.message)
        setData([])
      } finally {
        setLoading(false)
      }
    }
    fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(queryFilters)])

  return { data, loading, error }
}

// Agrega métricas de um cliente via média ponderada a partir de dashboard_operational_view.
// Benchmark é exclusivamente Solinftec — JD sempre excluído.
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
            'equipamento_cod', 'data',
            'rendimento_operacional_hah', 'eficiencia_geral_pct',
            'eficiencia_operacional_pct', 'consumo_medio_efetivo_lha',
            'consumo_medio_lh', 'disponibilidade_mecanica_pct', 'velocidade_media_kmh',
            'rendimento_real_hah', 'consumo_medio_lha', 'consumo_medio_efetivo_lh',
            'sem_apontamento_pct', 'motor_ocioso_pct', 'motor_ligado_pct', 'rpm_medio', 'area_por_linha_ha', 'area_por_pe_ha',
            'tempo_produtivo_h', 'tempo_efetivo_h', 'tempo_total_h', 'area_ha', 'tempo_motor_ligado_h', 'tempo_parada_h',
          ].join(','))
          .neq('cliente', 'Média Porteira')
          .neq('data_provider_id', JD_ID)

        if (filters.cliente)    query = query.eq('cliente',    filters.cliente)
        if (filters.processo)   query = query.eq('processo',   filters.processo)
        if (filters.tipo_safra) query = query.eq('tipo_safra', filters.tipo_safra)
        if (filters.safra)      query = query.eq('safra',      filters.safra)
        if (filters.dataInicio) query = query.gte('data',      filters.dataInicio)
        if (filters.dataFim)    query = query.lte('data',      filters.dataFim)
        // aba "Geral" no Benchmark Cliente exclui processos com aba própria
        if (filters.not_processos?.length) {
          for (const p of filters.not_processos) query = query.neq('processo', p)
        }

        const all = await fetchAllPages(query)

        if (all.length === 0) { setMetricas(null); return }

        const result = {}
        for (const [metrica, peso] of Object.entries(METRIC_WEIGHT_MAP)) {
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

        // tempo_medio_turno_h = SUM(tempo_total_h) / COUNT(DISTINCT (data, equipamento_cod))
        const equipDays = new Set(all.map(r => `${r.data}|||${r.equipamento_cod}`))
        result['tempo_medio_turno_h'] = equipDays.size > 0
          ? all.reduce((s, r) => s + (r.tempo_total_h ?? 0), 0) / equipDays.size
          : 0

        // pes_plataforma_24h: colheita — area_por_pe_ha / tempo_total_h * 24
        // area_por_linha_24h: plantio  — area_por_linha_ha / tempo_total_h * 24
        let pesNum = 0, pesDen = 0, linhaNum = 0, linhaDen = 0
        for (const row of all) {
          const tt   = row.tempo_total_h
          const area = row.area_ha
          if (tt != null && tt > 0 && area != null && area > 0) {
            const ppe = row.area_por_pe_ha
            if (ppe != null && ppe > 0) { pesNum += ppe / tt * 24 * area; pesDen += area }
            const apl = row.area_por_linha_ha
            if (apl != null && apl > 0) { linhaNum += apl / tt * 24 * area; linhaDen += area }
          }
        }
        result['pes_plataforma_24h'] = pesDen > 0 ? pesNum / pesDen : 0
        result['area_por_linha_24h'] = linhaDen > 0 ? linhaNum / linhaDen : 0

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

// Agrega métricas de todos os clientes via média ponderada — fornece pior/melhor para limiares de zona.
export function useAllClientesBenchmark(filters = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      try {
        let query = supabase
          .from('dashboard_operational_view')
          .select([
            'cliente', 'equipamento_cod', 'data',
            'rendimento_operacional_hah', 'eficiencia_geral_pct',
            'eficiencia_operacional_pct', 'consumo_medio_efetivo_lha',
            'consumo_medio_lh', 'disponibilidade_mecanica_pct', 'velocidade_media_kmh',
            'rendimento_real_hah', 'consumo_medio_lha', 'consumo_medio_efetivo_lh',
            'sem_apontamento_pct', 'motor_ocioso_pct', 'motor_ligado_pct', 'rpm_medio', 'area_por_linha_ha', 'area_por_pe_ha',
            'tempo_produtivo_h', 'tempo_efetivo_h', 'tempo_total_h', 'area_ha', 'tempo_motor_ligado_h', 'tempo_parada_h',
          ].join(','))
          .neq('cliente', 'Média Porteira')
          .neq('data_provider_id', JD_ID)

        if (filters.processo)   query = query.eq('processo',   filters.processo)
        if (filters.tipo_safra) query = query.eq('tipo_safra', filters.tipo_safra)
        if (filters.safra)      query = query.eq('safra',      filters.safra)
        if (filters.not_processos?.length) {
          for (const p of filters.not_processos) query = query.neq('processo', p)
        }

        const all = await fetchAllPages(query)

        const byCliente = new Map()
        for (const row of all) {
          if (!row.cliente) continue
          if (!byCliente.has(row.cliente)) byCliente.set(row.cliente, [])
          byCliente.get(row.cliente).push(row)
        }

        const result = []
        for (const [cliente, rows] of byCliente) {
          const entry = { cliente }
          for (const [metrica, peso] of Object.entries(METRIC_WEIGHT_MAP)) {
            let sumProd = 0, sumPeso = 0
            for (const row of rows) {
              const v = row[metrica]; const w = row[peso]
              if (v != null && w != null && w > 0) { sumProd += v * w; sumPeso += w }
            }
            entry[metrica] = sumPeso > 0 ? sumProd / sumPeso : null
          }
          const equipDays = new Set(rows.map(r => `${r.data}|||${r.equipamento_cod}`))
          entry['tempo_medio_turno_h'] = equipDays.size > 0
            ? rows.reduce((s, r) => s + (r.tempo_total_h ?? 0), 0) / equipDays.size
            : null

          let pesNum = 0, pesDen = 0, linhaNum = 0, linhaDen = 0
          for (const row of rows) {
            const tt   = row.tempo_total_h
            const area = row.area_ha
            if (tt != null && tt > 0 && area != null && area > 0) {
              const ppe = row.area_por_pe_ha
              if (ppe != null && ppe > 0) { pesNum += ppe / tt * 24 * area; pesDen += area }
              const apl = row.area_por_linha_ha
              if (apl != null && apl > 0) { linhaNum += apl / tt * 24 * area; linhaDen += area }
            }
          }
          entry['pes_plataforma_24h'] = pesDen > 0 ? pesNum / pesDen : null
          entry['area_por_linha_24h'] = linhaDen > 0 ? linhaNum / linhaDen : null
          result.push(entry)
        }
        setData(result)
      } catch {
        setData([])
      } finally {
        setLoading(false)
      }
    }
    fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.processo, filters.tipo_safra, filters.safra])

  return { data, loading }
}

// Agrega métricas de um cliente JD via média ponderada — campos disponíveis no provider John Deere.
export function useClienteBenchmarkJD(filters = {}) {
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
          .select('equipamento,equipamento_cod,data,rendimento_operacional_hah,velocidade_media_kmh,consumo_medio_lh,consumo_medio_lha,area_por_linha_ha,tempo_efetivo_h,tempo_total_h,area_ha')
          .eq('data_provider_id', JD_ID)
          .neq('cliente', 'Média Porteira')

        if (filters.cliente)    query = query.eq('cliente',    filters.cliente)
        if (filters.processo)   query = query.eq('processo',   filters.processo)
        if (filters.tipo_safra) query = query.eq('tipo_safra', filters.tipo_safra)
        if (filters.safra)      query = query.eq('safra',      filters.safra)
        if (filters.dataInicio) query = query.gte('data',      filters.dataInicio)
        if (filters.dataFim)    query = query.lte('data',      filters.dataFim)

        const all = await fetchAllPages(query)
        if (all.length === 0) { setMetricas(null); return }

        const result = {}
        for (const [metrica, peso] of Object.entries(JD_METRIC_WEIGHT_MAP)) {
          let sumProd = 0, sumPeso = 0
          for (const row of all) {
            const v = row[metrica]; const w = row[peso]
            if (v != null && w != null && w > 0) { sumProd += v * w; sumPeso += w }
          }
          result[metrica] = sumPeso > 0 ? sumProd / sumPeso : 0
        }

        // JD: equipamento_cod é vazio — usa equipamento como identificador de máquina
        const equipDays = new Set(all.map(r => `${r.data}|||${r.equipamento_cod || r.equipamento}`))
        result['tempo_medio_turno_h'] = equipDays.size > 0
          ? all.reduce((s, r) => s + (r.tempo_total_h ?? 0), 0) / equipDays.size
          : 0

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

// Agrega métricas de todos os clientes JD — fornece grupo, pior e melhor para limiares de zona.
export function useAllClientesBenchmarkJD(filters = {}) {
  const [data, setData]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      try {
        let query = supabase
          .from('dashboard_operational_view')
          .select('cliente,equipamento,equipamento_cod,data,rendimento_operacional_hah,velocidade_media_kmh,consumo_medio_lh,consumo_medio_lha,area_por_linha_ha,tempo_efetivo_h,tempo_total_h,area_ha')
          .eq('data_provider_id', JD_ID)
          .neq('cliente', 'Média Porteira')

        if (filters.processo)   query = query.eq('processo',   filters.processo)
        if (filters.tipo_safra) query = query.eq('tipo_safra', filters.tipo_safra)
        if (filters.safra)      query = query.eq('safra',      filters.safra)

        const all = await fetchAllPages(query)

        const byCliente = new Map()
        for (const row of all) {
          if (!row.cliente) continue
          if (!byCliente.has(row.cliente)) byCliente.set(row.cliente, [])
          byCliente.get(row.cliente).push(row)
        }

        const result = []
        for (const [cliente, rows] of byCliente) {
          const entry = { cliente }
          for (const [metrica, peso] of Object.entries(JD_METRIC_WEIGHT_MAP)) {
            let sumProd = 0, sumPeso = 0
            for (const row of rows) {
              const v = row[metrica]; const w = row[peso]
              if (v != null && w != null && w > 0) { sumProd += v * w; sumPeso += w }
            }
            entry[metrica] = sumPeso > 0 ? sumProd / sumPeso : null
          }
          const equipDays = new Set(rows.map(r => `${r.data}|||${r.equipamento_cod || r.equipamento}`))
          entry['tempo_medio_turno_h'] = equipDays.size > 0
            ? rows.reduce((s, r) => s + (r.tempo_total_h ?? 0), 0) / equipDays.size
            : null
          result.push(entry)
        }
        setData(result)
      } catch {
        setData([])
      } finally {
        setLoading(false)
      }
    }
    fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.processo, filters.tipo_safra, filters.safra])

  return { data, loading }
}

// Calcula média ponderada das métricas a partir de rows brutas de dashboard_operational_view
export function computeWeightedAvg(rows) {
  if (!rows || rows.length === 0) return null
  const result = {}
  for (const [metrica, peso] of Object.entries(METRIC_WEIGHT_MAP)) {
    let sumProd = 0, sumPeso = 0
    for (const row of rows) {
      const v = row[metrica]
      const w = row[peso]
      if (v != null && w != null && w > 0) {
        sumProd += v * w
        sumPeso += w
      }
    }
    result[metrica] = sumPeso > 0 ? sumProd / sumPeso : 0
  }
  let pesNum = 0, pesDen = 0, linhaNum = 0, linhaDen = 0
  for (const row of rows) {
    const tt   = row.tempo_total_h
    const area = row.area_ha
    if (tt != null && tt > 0 && area != null && area > 0) {
      const ppe = row.area_por_pe_ha
      if (ppe != null && ppe > 0) { pesNum += ppe / tt * 24 * area; pesDen += area }
      const apl = row.area_por_linha_ha
      if (apl != null && apl > 0) { linhaNum += apl / tt * 24 * area; linhaDen += area }
    }
  }
  result.pes_plataforma_24h = pesDen > 0 ? pesNum / pesDen : 0
  result.area_por_linha_24h = linhaDen > 0 ? linhaNum / linhaDen : 0

  // turno médio: tempo total / pares únicos (data × equipamento)
  const equipDaySet = new Set(rows.map(r => `${r.data}|||${r.equipamento_cod || r.equipamento || ''}`))
  result.tempo_medio_turno_h = equipDaySet.size > 0
    ? rows.reduce((s, r) => s + (r.tempo_total_h ?? 0), 0) / equipDaySet.size
    : 0

  return result
}

// Agrega métricas de uma máquina específica via média ponderada
export function useMaquinaMetricas(filters = {}) {
  const [metricas, setMetricas] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  useEffect(() => {
    if (!filters.equipamento_cod) { setMetricas(null); setLoading(false); return }
    setLoading(true); setError(null)
    async function run() {
      try {
        let query = supabase
          .from('dashboard_operational_view')
          .select('rendimento_operacional_hah,rendimento_real_hah,eficiencia_geral_pct,eficiencia_operacional_pct,consumo_medio_efetivo_lha,consumo_medio_efetivo_lh,consumo_medio_lh,consumo_medio_lha,disponibilidade_mecanica_pct,velocidade_media_kmh,rpm_medio,motor_ligado_pct,motor_ocioso_pct,sem_apontamento_pct,area_por_linha_ha,area_por_pe_ha,tempo_produtivo_h,tempo_efetivo_h,tempo_total_h,area_ha,tempo_motor_ligado_h,tempo_parada_h')
          .eq('equipamento_cod', filters.equipamento_cod)
        if (filters.processo)   query = query.eq('processo',   filters.processo)
        if (filters.tipo_safra) query = query.eq('tipo_safra', filters.tipo_safra)
        if (filters.safra)      query = query.eq('safra',      filters.safra)
        if (filters.dataInicio) query = query.gte('data',      filters.dataInicio)
        if (filters.dataFim)    query = query.lte('data',      filters.dataFim)

        const all = await fetchAllPages(query)
        setMetricas(computeWeightedAvg(all))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)])

  return { metricas, loading, error }
}

// Busca todas as máquinas do grupo sem restrição de cliente, incluindo o nome do cliente na label.
export function useAllEquipamentos(filters = {}) {
  const [equipamentos, setEquipamentos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    async function run() {
      try {
        let query = supabase
          .from('dashboard_operational_view')
          .select('cliente,equipamento,equipamento_cod,modelo_equipamento')
          .neq('cliente', 'Média Porteira')
        if (filters.processo)                      query = query.eq('processo', filters.processo)
        else if (filters.allowedProcessos?.length) query = query.in('processo', filters.allowedProcessos)
        if (filters.tipo_safra)    query = query.eq('tipo_safra', filters.tipo_safra)
        if (filters.solinftecOnly) query = query.neq('data_provider_id', JD_ID)

        const all = await fetchAllPages(query)
        const seen = new Set()
        const opts = []
        for (const r of all) {
          const k = `${r.equipamento_cod || ''}|||${r.equipamento || ''}`
          if (k !== '|||' && !seen.has(k)) {
            seen.add(k)
            opts.push({
              cliente: r.cliente,
              equipamento: r.equipamento,
              equipamento_cod: r.equipamento_cod,
              modelo: r.modelo_equipamento,
            })
          }
        }
        opts.sort((a, b) =>
          (a.cliente || '').localeCompare(b.cliente || '') ||
          (a.equipamento_cod || '').localeCompare(b.equipamento_cod || '')
        )
        setEquipamentos(opts)
      } finally {
        setLoading(false)
      }
    }
    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.processo, filters.tipo_safra, JSON.stringify(filters.allowedProcessos), filters.solinftecOnly])

  return { equipamentos, loading }
}

// Calcula min/max por métrica para um modelo, agrupando por máquina via média ponderada.
export function useModeloStats(filters = {}) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!filters.modelo_equipamento) { setStats(null); return }
    setLoading(true)
    async function run() {
      try {
        let query = supabase
          .from('dashboard_operational_view')
          .select('equipamento_cod,rendimento_operacional_hah,rendimento_real_hah,eficiencia_geral_pct,eficiencia_operacional_pct,consumo_medio_efetivo_lha,consumo_medio_efetivo_lh,consumo_medio_lh,consumo_medio_lha,disponibilidade_mecanica_pct,velocidade_media_kmh,rpm_medio,motor_ligado_pct,motor_ocioso_pct,sem_apontamento_pct,area_por_linha_ha,tempo_produtivo_h,tempo_efetivo_h,tempo_total_h,area_ha,tempo_motor_ligado_h,tempo_parada_h')
          .eq('modelo_equipamento', filters.modelo_equipamento)
        if (filters.processo)   query = query.eq('processo',   filters.processo)
        if (filters.tipo_safra) query = query.eq('tipo_safra', filters.tipo_safra)
        if (filters.safra)      query = query.eq('safra',      filters.safra)

        const all = await fetchAllPages(query)
        const byMachine = {}
        for (const row of all) {
          const k = row.equipamento_cod || 'unknown'
          if (!byMachine[k]) byMachine[k] = []
          byMachine[k].push(row)
        }
        const machineAvgs = Object.values(byMachine).map(rows => computeWeightedAvg(rows)).filter(Boolean)
        if (machineAvgs.length === 0) { setStats(null); return }

        const metrics = Object.keys(METRIC_WEIGHT_MAP)
        const result = {}
        for (const m of metrics) {
          const vals = machineAvgs.map(a => a[m]).filter(v => v != null && v > 0)
          result[m] = { min: vals.length ? Math.min(...vals) : 0, max: vals.length ? Math.max(...vals) : 0, n: vals.length }
        }
        setStats(result)
      } catch {
        setStats(null)
      } finally {
        setLoading(false)
      }
    }
    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)])

  return { stats, loading }
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
    return fetchAllPages(query)
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

const EQUIP_SELECT = [
  'equipamento_cod', 'modelo_equipamento', 'data',
  'consumo_medio_lh',
  'rendimento_operacional_hah', 'rendimento_real_hah', 'velocidade_media_kmh',
  'eficiencia_geral_pct', 'eficiencia_operacional_pct', 'disponibilidade_mecanica_pct',
  'consumo_medio_lha', 'consumo_medio_efetivo_lha', 'consumo_medio_efetivo_lh',
  'area_por_linha_ha', 'sem_apontamento_pct', 'motor_ocioso_pct', 'motor_ligado_pct', 'rpm_medio',
  'tempo_produtivo_h', 'tempo_efetivo_h', 'tempo_total_h', 'area_ha', 'tempo_motor_ligado_h', 'tempo_parada_h',
].join(',')

// Calcula médias por modelo de equipamento direto de operational_records para a safra inteira.
export function useEquipamentoInterativo(safra, processo, tipo_safra) {
  const [data, setData]     = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!safra) return
    setLoading(true)
    async function run() {
      const { dataInicio, dataFim } = safraToDateRange(safra)
      let query = supabase
        .from('operational_records')
        .select(EQUIP_SELECT)
        .eq('data_provider_id', SOLINFTEC_ID)
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .gt('consumo_medio_lh', 0)
      if (processo)   query = query.eq('processo',   processo)
      if (tipo_safra) query = query.eq('tipo_safra', tipo_safra)

      const all = await fetchAllPages(query)

      const byModelo = new Map()
      for (const row of all) {
        const m = row.modelo_equipamento
        if (!m) continue
        if (!byModelo.has(m)) byModelo.set(m, [])
        byModelo.get(m).push(row)
      }

      const result = []
      for (const [modelo, rows] of byModelo) {
        const avg = computeWeightedAvg(rows)
        if (!avg) continue
        const entry = { modelo_equipamento: modelo, dias_ativos: new Set(rows.map(r => r.data)).size }
        for (const [key, val] of Object.entries(avg)) {
          entry[`${key}_modelo`] = val
        }
        result.push(entry)
      }
      setData(result)
      setLoading(false)
    }
    run()
  }, [safra, processo, tipo_safra])

  return { data, loading }
}

// Calcula média do grupo (todos os clientes Solinftec) para a safra inteira.
// enabled=false → skip (evita fetch desnecessário quando showGroupAvg=false).
export function useGrupoInterativo(safra, processo, tipo_safra, enabled = false) {
  const [metricas, setMetricas] = useState(null)
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    if (!enabled || !safra) { setMetricas(null); return }
    setLoading(true)
    async function run() {
      const { dataInicio, dataFim } = safraToDateRange(safra)
      let query = supabase
        .from('operational_records')
        .select(EQUIP_SELECT)
        .eq('data_provider_id', SOLINFTEC_ID)
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .gt('consumo_medio_lh', 0)
      if (processo)   query = query.eq('processo',   processo)
      if (tipo_safra) query = query.eq('tipo_safra', tipo_safra)

      const all = await fetchAllPages(query)
      setMetricas(computeWeightedAvg(all))
      setLoading(false)
    }
    run()
  }, [safra, processo, tipo_safra, enabled])

  return { metricas, loading }
}

// Busca opções de dimensão (operador, implemento, modelo) da view dashboard_dim_options
export function useExtraFilterOptions() {
  const [options, setOptions] = useState({ operadores: [], implementos: [], modelos: [] })

  useEffect(() => {
    async function run() {
      const { data } = await supabase.from('dashboard_dim_options').select('*')
      if (!data) return
      setOptions({
        operadores:  [...new Set(data.map(r => r.operador).filter(Boolean))].sort(),
        implementos: [...new Set(data.map(r => r.implemento).filter(Boolean))].sort(),
        modelos:     [...new Set(data.map(r => r.modelo_equipamento).filter(Boolean))].sort(),
      })
    }
    run()
  }, [])

  return options
}
