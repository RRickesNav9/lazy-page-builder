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
    // processo vem do tab ativo na página JD — filtro global não tem efeito aqui
    cliente: true, propriedade: false, processo: false, cultura: true,
    showGroupAvg: false, metricFilter: false, excludedMotivos: false,
  },
}

const HEADER_H = 80   // px — altura do header (logo 68px + padding 12px)
const SIDEBAR_W = 240  // px — largura da sidebar expandida
const SIDEBAR_W_COLLAPSED = 44  // px — só o botão de toggle



function AppInner({ onLogout }) {
  const [activePage,   setActivePage]   = useState('analise')
  const [benchTab,     setBenchTab]     = useState('colheita')
  const [sidebarOpen,  setSidebarOpen]  = useState(true)
  const PageComponent  = PAGES[activePage]
  const { filters, applyFilters } = useFilters()
  const solinftecOnly = PAGE_SOLINFTEC[activePage] ?? false

  const sidebarW = sidebarOpen ? SIDEBAR_W : SIDEBAR_W_COLLAPSED

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
    <div
      className="app-root"
      style={{
        minHeight: '100vh',
        background: '#ffffff',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        '--sidebar-w': `${sidebarW}px`,
        '--header-h': `${HEADER_H}px`,
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header
        className="no-print"
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e0dbd4',
          padding: `6px 24px 6px ${sidebarW + 24}px`,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          position: 'sticky',
          top: 0,
          zIndex: 200,
          transition: 'padding-left 0.2s',
        }}
      >
        <img
          src={logoPorteira}
          alt="Porteira Adentro"
          style={{ height: '68px', width: 'auto' }}
        />
        <div style={{ color: '#2d4a2d', fontSize: 14 }}>Relatório de Operações Agrícolas</div>
      </header>

      {/* ── Layout: sidebar + conteúdo ──────────────────────────────────────── */}
      <div style={{ display: 'flex' }}>

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside
          className="no-print"
          style={{
            width: sidebarW,
            flexShrink: 0,
            position: 'sticky',
            top: HEADER_H,
            height: `calc(100vh - ${HEADER_H}px)`,
            overflowY: 'auto',
            overflowX: 'hidden',
            background: '#ffffff',
            borderRight: '1px solid #e0dbd4',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.2s',
            zIndex: 100,
          }}
        >
          {/* Toggle ☰ */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            title={sidebarOpen ? 'Recolher menu' : 'Expandir menu'}
            style={{
              width: '100%',
              height: 44,
              flexShrink: 0,
              background: 'none',
              border: 'none',
              borderBottom: '1px solid #e0dbd4',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarOpen ? 'flex-end' : 'center',
              padding: sidebarOpen ? '0 14px' : 0,
              color: '#6b6560',
            }}
          >
            {sidebarOpen ? (
              /* chevron left */
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            ) : (
              /* hamburger */
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          {/* Nav items — só quando expandida */}
          {sidebarOpen && (
            <>
              <nav style={{ flex: 1, padding: '8px 0' }}>
                {NAV.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActivePage(item.id)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '11px 20px',
                      background: 'none',
                      border: 'none',
                      borderLeft: `3px solid ${activePage === item.id ? '#2d4a2d' : 'transparent'}`,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: activePage === item.id ? 600 : 400,
                      color: activePage === item.id ? '#2d4a2d' : '#6b6560',
                      fontFamily: 'inherit',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>

              <div style={{ padding: '16px 20px', borderTop: '1px solid #e0dbd4' }}>
                <button
                  onClick={onLogout}
                  style={{
                    background: 'transparent',
                    border: '1px solid #d4cec8',
                    borderRadius: 6,
                    padding: '6px 14px',
                    color: '#6b6560',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    width: '100%',
                  }}
                >
                  Sair
                </button>
              </div>
            </>
          )}
        </aside>

        {/* ── Conteúdo ─────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div id="pdf-content">
            {activePage === 'benchmark'
              ? <BenchmarkClientePage onTabChange={setBenchTab} />
              : <PageComponent />
            }
          </div>
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

  // aguarda resolução do estado de auth para evitar flash de tela de login
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
