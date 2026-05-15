import { useState, useEffect, useMemo, useRef } from 'react'
import logoPorteira from './assets/logo-porteira.svg'
import { FilterProvider, useFilters } from './lib/FilterContext'
import GlobalFilterFAB from './components/GlobalFilterFAB'
import AnaliseGeralPage from './pages/AnaliseGeralPage'
import BenchmarkClientePage from './pages/BenchmarkClientePage'
import BenchmarkEquipamentoPage from './pages/BenchmarkEquipamentoPage'
import BenchmarkJohnDeerePage from './pages/BenchmarkJohnDeerePage'
import LoginPage from './pages/LoginPage'
import { supabase } from './lib/supabase'

const NAV = [
  { id: 'analise',         label: 'Análise Geral' },
  { id: 'benchmark',       label: 'Benchmark Cliente' },
  { id: 'bench-equip',     label: 'Benchmark Equipamento' },
  { id: 'bench-jd',        label: 'Benchmark John Deere' },
]

const PAGES = {
  analise:       AnaliseGeralPage,
  benchmark:     BenchmarkClientePage,
  'bench-equip': BenchmarkEquipamentoPage,
  'bench-jd':    BenchmarkJohnDeerePage,
}

// Processos permitidos por página — null = irrestrito
// benchmark usa benchTab para restringir por aba (ver AppInner)
const PAGE_PROCESSOS = {
  analise:       null,
  'bench-equip': ['Colheita', 'Plantio'],
  'bench-jd':    null,
}

// Páginas que exibem apenas dados Solinftec (excluem John Deere dos filtros e cálculos)
const PAGE_SOLINFTEC = {
  analise:       false,
  benchmark:     true,
  'bench-equip': true,
  'bench-jd':    false,
}

// Seções do FAB visíveis por página — false oculta a seção e não conta no badge
const PAGE_VISIBLE_FILTERS = {
  analise: {
    cliente: true, propriedade: true, processo: true, cultura: true,
    showGroupAvg: true, metricFilter: true, excludedMotivos: true,
  },
  benchmark: {
    // processo controlado pelas abas da página (Colheita / Plantio / Geral)
    // showGroupAvg não tem efeito aqui — o grupo é sempre exibido por design
    cliente: true, propriedade: false, processo: false, cultura: true,
    showGroupAvg: false, metricFilter: false, excludedMotivos: false,
  },
  'bench-equip': {
    // cliente e propriedade não se aplicam: mostra equipamentos de todo o grupo
    cliente: false, propriedade: false, processo: true, cultura: true,
    showGroupAvg: false, metricFilter: false, excludedMotivos: false,
  },
  'bench-jd': {
    cliente: true, propriedade: false, processo: true, cultura: true,
    showGroupAvg: false, metricFilter: false, excludedMotivos: false,
  },
}


function Breadcrumb() {
  const { filters } = useFilters()
  function fmtArr(arr, none, many = 'selecionados') {
    if (!arr?.length) return none
    if (arr.length === 1) return arr[0]
    return `${arr.length} ${many}`
  }
  const items = [
    { label: 'Cliente',     value: fmtArr(filters.clientes,    'Todos') },
    { label: 'Propriedade', value: fmtArr(filters.propriedades,'Todas') },
    { label: 'Operação',    value: fmtArr(filters.processos,   'Todas') },
    { label: 'Cultura',     value: fmtArr(filters.tipos_safra, 'Todas') },
  ]

  return (
    <div className="no-print" style={{
      background: '#f7f5f2', borderBottom: '1px solid #e0dbd4',
      padding: '8px 24px', fontSize: 12, display: 'flex', alignItems: 'center',
      gap: 4, flexWrap: 'wrap',
    }}>
      {items.map((item, i) => (
        <span key={item.label}>
          {i > 0 && <span style={{ color: '#6b6560', margin: '0 6px' }}>·</span>}
          <span style={{ color: '#6b6560' }}>{item.label}: </span>
          <span style={{ color: '#4a3728', fontWeight: 500 }}>{item.value}</span>
        </span>
      ))}
    </div>
  )
}

function AppInner({ onLogout }) {
  const [activePage, setActivePage] = useState('analise')
  const [benchTab,   setBenchTab]   = useState('colheita')
  const PageComponent  = PAGES[activePage]
  const { filters, applyFilters } = useFilters()
  const solinftecOnly = PAGE_SOLINFTEC[activePage] ?? false

  // Para benchmark: colheita/plantio restringem por aba; geral exclui colheita e plantio
  const allowedProcessos = useMemo(() => {
    if (activePage === 'benchmark') {
      if (benchTab === 'colheita') return ['Colheita']
      if (benchTab === 'plantio')  return ['Plantio']
      return null  // geral: sem lista de permitidos — usa excludedProcessos
    }
    return PAGE_PROCESSOS[activePage] ?? null
  }, [activePage, benchTab])

  const excludedProcessos = useMemo(() => {
    if (activePage === 'benchmark' && benchTab === 'geral') return ['Colheita', 'Plantio']
    return null
  }, [activePage, benchTab])

  const prevSolinftecOnly = useRef(solinftecOnly)

  // Ao trocar página ou aba: remove processos não permitidos e limpa dimensões ao
  // mudar entre contextos solinftec-only e all-providers (evita "sem dados" cross-página)
  useEffect(() => {
    const contextChanged = prevSolinftecOnly.current !== solinftecOnly
    prevSolinftecOnly.current = solinftecOnly

    let updated = { ...filters }
    let changed = false

    if (contextChanged && (filters.clientes.length || filters.propriedades.length || filters.tipos_safra.length)) {
      updated = { ...updated, clientes: [], propriedades: [], tipos_safra: [] }
      changed = true
    }

    if (filters.processos?.length) {
      const remaining = filters.processos.filter(proc => {
        const p = proc.toLowerCase()
        const blockedByAllowed  = allowedProcessos  && !allowedProcessos.some(a => a.toLowerCase() === p)
        const blockedByExcluded = excludedProcessos &&  excludedProcessos.some(a => a.toLowerCase() === p)
        return !blockedByAllowed && !blockedByExcluded
      })
      if (remaining.length !== filters.processos.length) {
        updated = { ...updated, processos: remaining }
        changed = true
      }
    }

    if (changed) applyFilters(updated)
  }, [activePage, benchTab]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="app-root" style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>

      <header className="no-print" style={{
        background: '#ffffff', padding: '6px 24px',
        borderBottom: '1px solid #e0dbd4',
        display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center',
      }}>
        <div />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img
            src={logoPorteira}
            alt="Porteira Adentro"
            style={{ height: '68px', width: 'auto' }}
          />
          <div style={{ color: '#2d4a2d', fontSize: 14 }}>Relatório de Operações Agrícolas</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onLogout}
            style={{
              background: 'transparent', border: '1px solid #d4cec8',
              borderRadius: 6, padding: '6px 14px', color: '#6b6560', fontSize: 12,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Sair
          </button>
        </div>
      </header>


      <nav className="no-print" style={{ borderBottom: '1px solid #e0dbd4', padding: '0 24px', background: '#ffffff', display: 'flex' }}>
        {NAV.map(item => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            style={{
              padding: '10px 16px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer',
              fontWeight: activePage === item.id ? 600 : 400,
              color: activePage === item.id ? '#2d4a2d' : '#6b6560',
              borderBottom: `2px solid ${activePage === item.id ? '#2d4a2d' : 'transparent'}`,
              transition: 'color 0.15s',
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div id="pdf-content">
        {activePage === 'benchmark'
          ? <BenchmarkClientePage onTabChange={setBenchTab} />
          : <PageComponent />
        }
      </div>

      <GlobalFilterFAB
        allowedProcessos={allowedProcessos}
        excludedProcessos={excludedProcessos}
        solinftecOnly={solinftecOnly}
        visibleFilters={PAGE_VISIBLE_FILTERS[activePage] ?? {}}
      />
    </div>
  )
}

const ALLOWED_DOMAINS = ['@porteiraadentro.com', '@dspartners.com.br']

function isAllowedEmail(email) {
  return ALLOWED_DOMAINS.some(d => (email || '').toLowerCase().endsWith(d))
}

export default function App() {
  const [session,   setSession]   = useState(undefined)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !isAllowedEmail(session.user.email)) {
        supabase.auth.signOut()
        setAuthError('Acesso restrito a e-mails @porteiraadentro.com.')
        setSession(null)
        return
      }
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session && !isAllowedEmail(session.user.email)) {
        await supabase.auth.signOut()
        setAuthError('Acesso restrito a e-mails @porteiraadentro.com.')
        setSession(null)
        return
      }
      setAuthError(null)
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  // aguarda resolução do estado de auth para evitar flash de tela de login
  if (session === undefined) return null

  if (!session) return <LoginPage authError={authError} />

  return (
    <FilterProvider>
      <AppInner onLogout={() => supabase.auth.signOut()} />
    </FilterProvider>
  )
}
