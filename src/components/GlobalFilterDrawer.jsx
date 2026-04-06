import { useState, useEffect } from 'react'
import { useFilters } from '../lib/FilterContext'

const CLIENTES_MOCK = [
  'TioJocaAlimentos PEL',
  'Labrustar',
  'Coragon',
  'Agropecuária Pontal',
]

const PROPRIEDADES_MOCK = {
  'TioJocaAlimentos PEL': ['Fazenda São João', 'Fazenda Boa Vista'],
  'Labrustar': ['Fazenda Estrela'],
  'Coragon': ['Fazenda Coragon I', 'Fazenda Coragon II'],
  'Agropecuária Pontal': ['Fazenda Pontal'],
}

const OPERACOES = ['Colheita', 'Aplicação', 'Plantio', 'Logística']
const CULTURAS = ['Arroz', 'Soja', 'Milho']

const EQUIPAMENTOS_MOCK = [
  { cod: '31', modelo: 'JD S660' },
  { cod: '33', modelo: 'JD S760' },
  { cod: '34', modelo: 'JD S760' },
  { cod: '35', modelo: 'JD S760' },
  { cod: '36', modelo: 'JD S760' },
  { cod: '37', modelo: 'JD S760' },
]

const PERIODO_CHIPS = [
  { id: 'ontem', label: 'Ontem' },
  { id: '7dias', label: 'Últimos 7 dias' },
  { id: '30dias', label: 'Últimos 30 dias' },
  { id: 'safra', label: 'Safra atual' },
]

export default function GlobalFilterDrawer() {
  const { filters, applyFilters, clearFilters, drawerOpen, closeDrawer, DEFAULT_FILTERS } = useFilters()
  const [local, setLocal] = useState(filters)

  useEffect(() => {
    if (drawerOpen) setLocal(filters)
  }, [drawerOpen]) // eslint-disable-line

  const set = (key, val) => setLocal(prev => ({ ...prev, [key]: val }))

  const toggleArrayItem = (key, item) => {
    setLocal(prev => {
      const arr = prev[key] || []
      return { ...prev, [key]: arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item] }
    })
  }

  const singleCliente = !local.todosClientes && local.clientes.length === 1 ? local.clientes[0] : null

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(0,0,0,0.2)' }}
        onClick={closeDrawer}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-full z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ width: 360, background: '#ffffff', borderLeft: '3px solid #2d4a2d' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e0dbd4' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>Filtros</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => { clearFilters(); setLocal(DEFAULT_FILTERS) }}
              style={{ fontSize: 12, color: '#6b6560', background: 'none', border: 'none', cursor: 'pointer' }}>
              Limpar tudo
            </button>
            <button onClick={closeDrawer} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b6560' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* Período */}
          <Section title="Período">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PERIODO_CHIPS.map(c => (
                <button
                  key={c.id}
                  onClick={() => set('periodo', c.id)}
                  style={{
                    padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                    cursor: 'pointer', border: '1px solid',
                    ...(local.periodo === c.id
                      ? { background: '#2d4a2d', color: '#fff', borderColor: '#2d4a2d' }
                      : { background: '#fff', color: '#1a1a1a', borderColor: '#e0dbd4' }),
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Cliente */}
          <Section title="Cliente">
            <CheckItem label="Todos os clientes" checked={local.todosClientes}
              onChange={() => set('todosClientes', !local.todosClientes)} />
            {!local.todosClientes && CLIENTES_MOCK.map(c => (
              <CheckItem key={c} label={c} checked={local.clientes.includes(c)}
                onChange={() => toggleArrayItem('clientes', c)} />
            ))}
          </Section>

          {/* Propriedade */}
          {singleCliente && PROPRIEDADES_MOCK[singleCliente] && (
            <Section title="Propriedade">
              <CheckItem label="Todas" checked={local.todasPropriedades}
                onChange={() => set('todasPropriedades', !local.todasPropriedades)} />
              {!local.todasPropriedades && PROPRIEDADES_MOCK[singleCliente].map(p => (
                <CheckItem key={p} label={p} checked={local.propriedades.includes(p)}
                  onChange={() => toggleArrayItem('propriedades', p)} />
              ))}
            </Section>
          )}

          {/* Operação */}
          <Section title="Operação">
            <CheckItem label="Todas" checked={local.todasOperacoes}
              onChange={() => set('todasOperacoes', !local.todasOperacoes)} />
            {!local.todasOperacoes && OPERACOES.map(o => (
              <CheckItem key={o} label={o} checked={local.operacoes.includes(o)}
                onChange={() => toggleArrayItem('operacoes', o)} />
            ))}
          </Section>

          {/* Cultura */}
          <Section title="Cultura">
            <CheckItem label="Todas" checked={local.todasCulturas}
              onChange={() => set('todasCulturas', !local.todasCulturas)} />
            {!local.todasCulturas && CULTURAS.map(c => (
              <CheckItem key={c} label={c} checked={local.culturas.includes(c)}
                onChange={() => toggleArrayItem('culturas', c)} />
            ))}
          </Section>

          {/* Equipamentos */}
          <Section title="Equipamentos">
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button onClick={() => { set('todosEquipamentos', true); set('equipamentos', []) }}
                style={{ fontSize: 11, color: '#6b6560', background: 'none', border: 'none', cursor: 'pointer' }}>
                Selecionar todos
              </button>
              <span style={{ color: '#e0dbd4' }}>·</span>
              <button onClick={() => { set('todosEquipamentos', false); set('equipamentos', []) }}
                style={{ fontSize: 11, color: '#6b6560', background: 'none', border: 'none', cursor: 'pointer' }}>
                Limpar
              </button>
            </div>
            <CheckItem label="Todos" checked={local.todosEquipamentos}
              onChange={() => set('todosEquipamentos', !local.todosEquipamentos)} />
            {!local.todosEquipamentos && EQUIPAMENTOS_MOCK.map(e => (
              <CheckItem key={e.cod} label={`${e.cod} · ${e.modelo}`}
                checked={local.equipamentos.includes(e.cod)}
                onChange={() => toggleArrayItem('equipamentos', e.cod)} />
            ))}
          </Section>

          {/* Benchmark */}
          <Section title="Benchmark Porteira">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => set('showBenchmark', !local.showBenchmark)}
                style={{
                  position: 'relative', width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: local.showBenchmark ? '#2d4a2d' : '#e0dbd4', transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s', left: local.showBenchmark ? 18 : 2,
                }} />
              </button>
              <span style={{ fontSize: 13, color: '#1a1a1a' }}>Exibir média Porteira</span>
            </div>
            <p style={{ fontSize: 11, color: '#6b6560', marginTop: 6 }}>
              Exibe a linha de meta nos gráficos de rendimento
            </p>
          </Section>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #e0dbd4' }}>
          <button
            onClick={() => applyFilters(local)}
            style={{
              width: '100%', padding: '10px 0', background: '#2d4a2d', color: '#fff',
              border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Aplicar filtros
          </button>
        </div>
      </div>
    </>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
        color: '#4a3728', marginBottom: 8, marginTop: 0,
      }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>
    </div>
  )
}

function CheckItem({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={onChange}>
      <span style={{
        width: 16, height: 16, borderRadius: 3, border: '1px solid',
        borderColor: checked ? '#2d4a2d' : '#e0dbd4',
        background: checked ? '#2d4a2d' : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {checked && (
          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      <span style={{ fontSize: 13, color: '#1a1a1a' }}>{label}</span>
    </label>
  )
}
