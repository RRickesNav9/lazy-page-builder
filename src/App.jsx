import { useState, useEffect, useMemo, useRef } from 'react'
import logoPorteira from './assets/logo-porteira.svg'
import { FilterProvider, useFilters } from './lib/FilterContext'
import GlobalFilterFAB from './components/GlobalFilterFAB'
import AnaliseGeralPage from './pages/AnaliseGeralPage'
import BenchmarkClientePage from './pages/BenchmarkClientePage'
import BenchmarkEquipamentoPage from './pages/BenchmarkEquipamentoPage'
import BenchmarkJohnDeerePage from './pages/BenchmarkJohnDeerePage'
import BaseDadosPage from './pages/BaseDadosPage'
import LoginPage from './pages/LoginPage'
import { supabase } from './lib/supabase'

const NAV = [
  { id: 'analise',         label: 'Análise Geral' },
  { id: 'benchmark',       label: 'Benchmark Cliente' },
  { id: 'bench-equip',     label: 'Benchmark Equipamento' },
  { id: 'bench-jd',        label: 'Benchmark John Deere' },
  { id: 'base-dados',      label: 'Base de Dados' },
]

const PAGES = {
  analise:       AnaliseGeralPage,
  benchmark:     BenchmarkClientePage,
  'bench-equip': BenchmarkEquipamentoPage,
  'bench-jd':    BenchmarkJohnDeerePage,
  'base-dados':  BaseDadosPage,
}

const PAGE_PROCESSOS = {
  analise:       null,
  'bench-equip': ['Colheita', 'Plantio'],
  'bench-jd':    null,
}

const PAGE_SOLINFTEC = {
  analise:       false,
  benchmark:     true,
  'bench-equip': true,
  'bench-jd':    false,
  'base-dados':  false,
}

const PAGE_VISIBLE_FILTERS = {
  analise: {
    cliente: true, propriedade: true, processo: true, cultura: true,
    showGroupAvg: true, metricFilter: true, excludedMotivos: true,
  },
  benchmark: {
    cliente: true, propriedade: false, processo: false, cultura: true,
    showGroupAvg: false, metricFilter: false, excludedMotivos: false,
  },
  'bench-equip': {
    cliente: false, propriedade: false, processo: true, cultura: true,
    showGroupAvg: false, metricFilter: false, excludedMotivos: false, periodo: false,
  },
  'bench-jd': {
    cliente: true, propriedade: false, processo: false, cultura: true,
    showGroupAvg: false, metricFilter: false, excludedMotivos: false,
  },
  'base-dados': {
    cliente: true, propriedade: false, processo: true, cultura: true,
    showGroupAvg: false, metricFilter: false, excludedMotivos: false,
    pdfExport: false,
  },
}

const SIDEBAR_W  = 240
const MOBILE_BP  = 768
const HEADER_H   = 80



function AppInner({ onLogout }) {
  const [activePage,   setActivePage]   = useState('analise')
  const [benchTab,     setBenchTab]     = useState('colheita')
  const [sidebarOpen,  setSidebarOpen]  = useState(true)
  const [isMobile,     setIsMobile]     = useState(() => window.innerWidth < MOBILE_BP)

  const PageComponent = PAGES[activePage]
  const { filters, applyFilters } = useFilters()
  const solinftecOnly = PAGE_SOLINFTEC[activePage] ?? false

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < MOBILE_BP)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Sidebar não empurra o conteúdo no mobile — fica off-canvas
  const sidebarPushes = sidebarOpen && !isMobile
  const sidebarW      = sidebarPushes ? SIDEBAR_W : 0

  function navigateTo(pageId) {
    setActivePage(pageId)
    if (isMobile) setSidebarOpen(false)
  }

  const allowedProcessos = useMemo(() => {
    if (activePage === 'benchmark') {
      if (benchTab === 'colheita') return ['Colheita']
      if (benchTab === 'plantio')  return ['Plantio']
      return null
    }
    return PAGE_PROCESSOS[activePage] ?? null
  }, [activePage, benchTab])

  const excludedProcessos = useMemo(() => {
    if (activePage === 'benchmark' && benchTab === 'geral') return ['Colheita', 'Plantio']
    return null
  }, [activePage, benchTab])

  const prevSolinftecOnly = useRef(solinftecOnly)

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
    <div
      style={{
        '--sidebar-w': `${sidebarW}px`,
        '--header-h':  `${HEADER_H}px`,
        minHeight: '100vh',
        background: '#ffffff',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ── ☰ Toggle — sempre visível no topo esquerdo ──────────────────────── */}
      <button
        className="no-print"
        onClick={() => setSidebarOpen(o => !o)}
        title={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
        style={{
          position: 'fixed', top: 20, left: 20,
          zIndex: 400,
          width: 40, height: 40, borderRadius: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: sidebarOpen ? 'rgba(255,255,255,0.9)' : '#4a6741',
        }}
      >
        {sidebarOpen ? (
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        ) : (
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* ── Backdrop mobile (sidebar sobre o conteúdo) ─────────────────────── */}
      {isMobile && sidebarOpen && (
        <div
          className="no-print"
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            zIndex: 299,
            background: 'rgba(0,0,0,0.35)',
          }}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className="no-print"
        style={{
          position: 'fixed', left: 0, top: 0, bottom: 0,
          width: sidebarOpen ? SIDEBAR_W : 0,
          overflow: 'hidden',
          background: '#2d4a2d',
          zIndex: 300,
          display: 'flex', flexDirection: 'column',
          transition: 'width 0.2s',
        }}
      >
        {/* Espaçador para o ☰ fixed acima */}
        <div style={{ height: 64, flexShrink: 0 }} />

        {/* Navegação */}
        <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV.map(item => {
            const isActive = activePage === item.id
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '12px 20px 12px 21px',
                  background: 'none', border: 'none',
                  borderLeft: `3px solid ${isActive ? '#fff' : 'transparent'}`,
                  cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.7)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}
              >
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Sair */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }}>
          <button
            onClick={onLogout}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 6, padding: '6px 14px',
              color: 'rgba(255,255,255,0.8)', fontSize: 12,
              cursor: 'pointer', fontFamily: 'inherit', width: '100%',
            }}
          >
            Sair
          </button>
        </div>
      </aside>

      {/* ── Área de conteúdo ────────────────────────────────────────────────── */}
      <div
        className="content-wrapper"
        style={{
          marginLeft: sidebarW,
          transition: 'margin-left 0.2s',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header — apenas sobre a área de conteúdo */}
        <header
          className="no-print"
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e0dbd4',
            padding: '6px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'sticky', top: 0, zIndex: 200,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img
              src={logoPorteira}
              alt="Porteira Adentro"
              style={{ height: '68px', width: 'auto' }}
            />
            <div style={{ color: '#2d4a2d', fontSize: 14 }}>Relatório de Operações Agrícolas</div>
          </div>
        </header>

        {/* Conteúdo das páginas */}
        <div id="pdf-content" style={{ flex: 1 }}>
          {activePage === 'benchmark'
            ? <BenchmarkClientePage onTabChange={setBenchTab} />
            : <PageComponent />
          }
        </div>
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

const ALLOWED_DOMAINS = ['porteiraadentro.com', 'dspartners.com.br']

function isAllowedEmail(email) {
  const domain = (email || '').toLowerCase().split('@')[1]
  return !!domain && ALLOWED_DOMAINS.includes(domain)
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

  if (session === undefined) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f7f5' }}>
      <div style={{ color: '#6b6560', fontSize: 13 }}>Carregando…</div>
    </div>
  )

  if (!session) return <LoginPage authError={authError} />

  return (
    <FilterProvider>
      <AppInner onLogout={() => supabase.auth.signOut()} />
    </FilterProvider>
  )
}
