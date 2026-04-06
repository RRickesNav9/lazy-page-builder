import { FilterProvider, useFilters } from './lib/FilterContext'
import GlobalFilterDrawer from './components/GlobalFilterDrawer'
import AnaliseGeralPage from './pages/AnaliseGeralPage'

function FilterButton() {
  const { openDrawer, activeCount } = useFilters()
  return (
    <button
      onClick={openDrawer}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(255,255,255,0.15)', color: '#fff',
        border: 'none', borderRadius: 6, padding: '6px 14px',
        fontSize: 13, fontWeight: 500, cursor: 'pointer', position: 'relative',
      }}
    >
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
      </svg>
      Filtros
      {activeCount > 0 && (
        <span style={{
          position: 'absolute', top: -6, right: -6,
          width: 18, height: 18, borderRadius: '50%',
          background: '#c04040', color: '#fff',
          fontSize: 10, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {activeCount}
        </span>
      )}
    </button>
  )
}

function Breadcrumb() {
  const { filters } = useFilters()
  const cliente = filters.todosClientes ? 'Todos' : (filters.clientes.length > 0 ? filters.clientes.join(', ') : 'Todos')
  const operacao = filters.todasOperacoes ? 'Todas' : (filters.operacoes.length > 0 ? filters.operacoes.join(', ') : 'Todas')
  const cultura = filters.todasCulturas ? 'Todas' : (filters.culturas.length > 0 ? filters.culturas.join(', ') : 'Todas')
  const propriedade = filters.todasPropriedades ? 'Todas' : (filters.propriedades.length > 0 ? filters.propriedades.join(', ') : 'Todas')

  const items = [
    { label: 'Cliente', value: cliente },
    { label: 'Propriedade', value: propriedade },
    { label: 'Operação', value: operacao },
    { label: 'Cultura', value: cultura },
  ]

  return (
    <div style={{
      background: '#f7f5f2', borderBottom: '1px solid #e0dbd4',
      padding: '8px 24px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap',
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
  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* Header */}
      <header style={{
        background: '#2d4a2d', padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>PORTEIRA ADENTRO</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Relatório de Operações Agrícolas</div>
        </div>
        <FilterButton />
      </header>

      {/* Breadcrumb */}
      <Breadcrumb />

      {/* Content */}
      <AnaliseGeralPage />

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
