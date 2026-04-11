import { useState, useEffect } from 'react'
import { FilterProvider, useFilters } from './lib/FilterContext'
import GlobalFilterFAB from './components/GlobalFilterFAB'
import AnaliseGeralPage from './pages/AnaliseGeralPage'
import BenchmarkClientePage from './pages/BenchmarkClientePage'
import BenchmarkEquipamentoPage from './pages/BenchmarkEquipamentoPage'

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
const PAGE_PROCESSOS = {
  analise:       null,
  benchmark:     ['Colheita', 'Plantio'],
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

function AppInner() {
  const [activePage, setActivePage] = useState('analise')
  const PageComponent  = PAGES[activePage]
  const { filters, applyFilters } = useFilters()
  const allowedProcessos = PAGE_PROCESSOS[activePage]
  const solinftecOnly    = PAGE_SOLINFTEC[activePage] ?? false

  // Ao trocar para uma página com processos restritos, limpa o processo se ele não for permitido
  useEffect(() => {
    if (!allowedProcessos) return
    const valid = allowedProcessos.some(
      p => p.toLowerCase() === (filters.processo || '').toLowerCase()
    )
    if (!valid && filters.processo) {
      applyFilters({ ...filters, processo: '' })
    }
  }, [activePage]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="app-root" style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>

      <header className="no-print" style={{
        background: '#2d4a2d', padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img 
            src="/src/assets/logo-porteira.png" 
            alt="Porteira Adentro"
            style={{ height: '48px', width: 'auto' }}
          />
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Relatório de Operações Agrícolas</div>
        </div>
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
        <PageComponent />
      </div>

      <GlobalFilterFAB allowedProcessos={allowedProcessos} solinftecOnly={solinftecOnly} />
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
