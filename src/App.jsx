import { useState, useEffect, useMemo } from 'react'
import logoPorteira from './assets/logo-porteira.svg'
import { FilterProvider, useFilters } from './lib/FilterContext'
import GlobalFilterFAB from './components/GlobalFilterFAB'
import AnaliseGeralPage from './pages/AnaliseGeralPage'
import BenchmarkClientePage from './pages/BenchmarkClientePage'
import BenchmarkEquipamentoPage from './pages/BenchmarkEquipamentoPage'
import LoginPage from './pages/LoginPage'
import { supabase } from './lib/supabase'

const NAV = [
  { id: 'analise',         label: 'Análise Geral' },
  { id: 'benchmark',       label: 'Benchmark Cliente' },
  { id: 'bench-equip',     label: 'Benchmark Equipamento' },
]

const PAGES = {
  analise:       AnaliseGeralPage,
  benchmark:     BenchmarkClientePage,
  'bench-equip': BenchmarkEquipamentoPage,
}

// Processos permitidos por página — null = irrestrito
// benchmark usa benchTab para restringir por aba (ver AppInner)
const PAGE_PROCESSOS = {
  analise:       null,
  'bench-equip': ['Colheita', 'Plantio'],
}

// Páginas que exibem apenas dados Solinftec (excluem John Deere dos filtros e cálculos)
const PAGE_SOLINFTEC = {
  analise:       false,
  benchmark:     true,
  'bench-equip': true,
}


function Breadcrumb() {
  const { filters } = useFilters()
  const items = [
    { label: 'Cliente',     value: filters.cliente     || 'Todos' },
    { label: 'Propriedade', value: filters.propriedade || 'Todas' },
    { label: 'Operação',    value: filters.processo     || 'Todas' },
    { label: 'Cultura',     value: filters.tipo_safra   || 'Todas' },
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

  // Ao trocar página ou aba, limpa processo se ele não for permitido (ou for excluído)
  useEffect(() => {
    if (!filters.processo) return
    const proc = filters.processo.toLowerCase()
    const blockedByAllowed  = allowedProcessos  && !allowedProcessos.some(p => p.toLowerCase() === proc)
    const blockedByExcluded = excludedProcessos &&  excludedProcessos.some(p => p.toLowerCase() === proc)
    if (blockedByAllowed || blockedByExcluded) {
      applyFilters({ ...filters, processo: '' })
    }
  }, [activePage, benchTab]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="app-root" style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>

      <header className="no-print" style={{
        background: '#2d4a2d', padding: '1px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img
            src={logoPorteira}
            alt="Porteira Adentro"
            style={{ height: '70px', width: 'auto' }}
          />
          <div style={{ color: '#ffffff', fontSize: 16 }}>Relatório de Operações Agrícolas</div>
        </div>
        <button
          onClick={onLogout}
          style={{
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 6, padding: '6px 14px', color: '#ffffff', fontSize: 12,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Sair
        </button>
      </header>

      <Breadcrumb />

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

      <GlobalFilterFAB allowedProcessos={allowedProcessos} excludedProcessos={excludedProcessos} solinftecOnly={solinftecOnly} />
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
