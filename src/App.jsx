import { useState } from 'react'
import { useTheme } from './lib/ThemeContext'
import { FilterProvider, useFilters } from './lib/FilterContext'
import GlobalFilterDrawer from './components/GlobalFilterDrawer'
import OverviewDashboardPage from './pages/OverviewDashboardPage'
import OverviewPage from './pages/OverviewPage'
import BenchmarkClientePage from './pages/BenchmarkClientePage'
import BenchmarkEquipamentosPage from './pages/BenchmarkEquipamentosPage'

const NAV = [
  {
    id: 'overview_dashboard',
    label: 'Overview',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM2.25 16.5c0-.621.504-1.125 1.125-1.125h6c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-2.25z" />
      </svg>
    ),
  },
  {
    id: 'overview',
    label: 'Grupo Porteira',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    id: 'benchmark_cliente',
    label: 'Benchmark Cliente',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    id: 'benchmark_equipamentos',
    label: 'Benchmark Equip.',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
]

function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
  )
}

function FilterHeaderButton() {
  const { openDrawer, activeCount } = useFilters()
  return (
    <button
      onClick={openDrawer}
      className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg border border-pa-border text-xs text-pa-muted hover:text-pa-text hover:border-pa-green transition-colors"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
      </svg>
      Filtros
      {activeCount > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-white flex items-center justify-center"
          style={{ background: 'var(--pa-green)', fontSize: 10, fontWeight: 700 }}
        >
          {activeCount}
        </span>
      )}
    </button>
  )
}

function AppInner() {
  const [page, setPage] = useState('overview_dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { theme, toggleTheme } = useTheme()

  const handleNavigateCliente = (cliente) => {
    setPage('benchmark_cliente')
    // The benchmark page will pick up from its own filters
  }

  const renderPage = () => {
    switch (page) {
      case 'overview_dashboard':
        return <OverviewDashboardPage onNavigateCliente={handleNavigateCliente} />
      case 'overview':
        return <OverviewPage />
      case 'benchmark_cliente':
        return <BenchmarkClientePage />
      case 'benchmark_equipamentos':
        return <BenchmarkEquipamentosPage />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--pa-bg)', color: 'var(--pa-text)', fontFamily: "'DM Mono', 'JetBrains Mono', monospace" }}>
      {/* Sidebar */}
      <aside className={`flex-shrink-0 flex flex-col border-r border-pa-border bg-pa-surface transition-all duration-300 ${sidebarOpen ? 'w-56' : 'w-14'}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-pa-border">
          <div className="w-7 h-7 rounded-lg bg-pa-green-dim border border-pa-border flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-pa-green" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 4a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1V4zM2 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
          </div>
          {sidebarOpen && (
            <div>
              <p className="text-xs font-bold text-pa-text leading-none">Porteira</p>
              <p className="text-xs text-pa-green leading-none mt-0.5">Adentro</p>
            </div>
          )}
          <div className="ml-auto flex items-center gap-1">
            {sidebarOpen && <FilterHeaderButton />}
            <button onClick={toggleTheme} title={theme === 'dark' ? 'Mudar para claro' : 'Mudar para escuro'} className="text-pa-muted hover:text-pa-text transition-colors">
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <button onClick={() => setSidebarOpen(o => !o)} className="text-pa-muted hover:text-pa-text transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={sidebarOpen ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
              </svg>
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 space-y-0.5 px-2">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-all text-sm
                ${page === item.id
                  ? 'bg-pa-green-dim text-pa-green border border-pa-border'
                  : 'text-pa-muted hover:text-pa-text hover:bg-pa-surface-2'
                }`}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="truncate text-xs font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div className="px-4 py-3 border-t border-pa-border">
            <p className="text-xs text-pa-faint">Nav9 © 2026</p>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Top bar with filter button when sidebar collapsed */}
        {!sidebarOpen && (
          <div className="flex justify-end px-4 py-2 border-b border-pa-border">
            <FilterHeaderButton />
          </div>
        )}
        <div key={page} className="max-w-7xl mx-auto p-6 page-fade-in">
          {renderPage()}
        </div>
      </main>

      <GlobalFilterDrawer />
    </div>
  )
}

export default function App() {
  return (
    <FilterProvider>
      <AppInner />
    </FilterProvider>
  )
}
