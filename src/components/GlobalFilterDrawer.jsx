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
  { cod: '45', modelo: 'JD S770' },
  { cod: '12', modelo: 'Case 8250' },
  { cod: '07', modelo: 'NH CR9.90' },
  { cod: '22', modelo: 'JD S680' },
  { cod: '38', modelo: 'Case 7250' },
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
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={closeDrawer}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-full z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ width: 360, background: 'var(--pa-surface)', borderLeft: '2px solid var(--pa-green)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-pa-border">
          <h2 className="text-sm font-bold text-pa-text uppercase tracking-wider">Filtros</h2>
          <div className="flex items-center gap-3">
            <button onClick={() => { clearFilters(); setLocal(DEFAULT_FILTERS) }} className="text-xs text-pa-muted hover:text-pa-text transition-colors">
              Limpar tudo
            </button>
            <button onClick={closeDrawer} className="text-pa-muted hover:text-pa-text transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Período */}
          <Section title="Período">
            <div className="flex flex-wrap gap-2">
              {PERIODO_CHIPS.map(c => (
                <button
                  key={c.id}
                  onClick={() => set('periodo', c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                    local.periodo === c.id
                      ? 'border-pa-green text-pa-green bg-pa-green-dim'
                      : 'border-pa-border text-pa-muted hover:text-pa-text hover:border-pa-green'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {local.periodo === 'custom' && (
              <input
                type="date"
                value={local.dataCustom || ''}
                onChange={e => set('dataCustom', e.target.value)}
                className="mt-2 w-full bg-pa-surface-2 border border-pa-border rounded-lg px-3 py-2 text-sm text-pa-text focus:outline-none focus:border-pa-green"
              />
            )}
            {!PERIODO_CHIPS.find(c => c.id === local.periodo) && local.periodo !== 'custom' && (
              <button onClick={() => set('periodo', 'custom')} className="mt-2 text-xs text-pa-muted hover:text-pa-green transition-colors">
                Data customizada
              </button>
            )}
          </Section>

          {/* Cliente */}
          <Section title="Cliente">
            <CheckItem
              label="Todos os clientes"
              checked={local.todosClientes}
              onChange={() => set('todosClientes', !local.todosClientes)}
            />
            {!local.todosClientes && CLIENTES_MOCK.map(c => (
              <CheckItem
                key={c}
                label={c}
                checked={local.clientes.includes(c)}
                onChange={() => toggleArrayItem('clientes', c)}
              />
            ))}
          </Section>

          {/* Propriedade — only when single client */}
          {singleCliente && PROPRIEDADES_MOCK[singleCliente] && (
            <Section title="Propriedade">
              <CheckItem
                label="Todas"
                checked={local.todasPropriedades}
                onChange={() => set('todasPropriedades', !local.todasPropriedades)}
              />
              {!local.todasPropriedades && PROPRIEDADES_MOCK[singleCliente].map(p => (
                <CheckItem
                  key={p}
                  label={p}
                  checked={local.propriedades.includes(p)}
                  onChange={() => toggleArrayItem('propriedades', p)}
                />
              ))}
            </Section>
          )}

          {/* Operação */}
          <Section title="Operação">
            <CheckItem
              label="Todas"
              checked={local.todasOperacoes}
              onChange={() => set('todasOperacoes', !local.todasOperacoes)}
            />
            {!local.todasOperacoes && OPERACOES.map(o => (
              <CheckItem
                key={o}
                label={o}
                checked={local.operacoes.includes(o)}
                onChange={() => toggleArrayItem('operacoes', o)}
              />
            ))}
          </Section>

          {/* Cultura */}
          <Section title="Cultura">
            <CheckItem
              label="Todas"
              checked={local.todasCulturas}
              onChange={() => set('todasCulturas', !local.todasCulturas)}
            />
            {!local.todasCulturas && CULTURAS.map(c => (
              <CheckItem
                key={c}
                label={c}
                checked={local.culturas.includes(c)}
                onChange={() => toggleArrayItem('culturas', c)}
              />
            ))}
          </Section>

          {/* Equipamentos */}
          <Section title="Equipamentos">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => { set('todosEquipamentos', true); set('equipamentos', []) }}
                className="text-xs text-pa-muted hover:text-pa-green transition-colors"
              >
                Selecionar todos
              </button>
              <span className="text-pa-faint">·</span>
              <button
                onClick={() => { set('todosEquipamentos', false); set('equipamentos', []) }}
                className="text-xs text-pa-muted hover:text-pa-green transition-colors"
              >
                Limpar
              </button>
            </div>
            <CheckItem
              label="Todos"
              checked={local.todosEquipamentos}
              onChange={() => set('todosEquipamentos', !local.todosEquipamentos)}
            />
            {!local.todosEquipamentos && EQUIPAMENTOS_MOCK.map(e => (
              <CheckItem
                key={e.cod}
                label={`${e.cod} · ${e.modelo}`}
                checked={local.equipamentos.includes(e.cod)}
                onChange={() => toggleArrayItem('equipamentos', e.cod)}
              />
            ))}
          </Section>

          {/* Benchmark Porteira */}
          <Section title="Benchmark Porteira">
            <div className="flex items-center gap-3">
              <button
                onClick={() => set('showBenchmark', !local.showBenchmark)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${local.showBenchmark ? 'bg-pa-green' : 'bg-pa-surface-2 border border-pa-border'}`}
              >
                <span className={`inline-block w-3.5 h-3.5 transform rounded-full bg-white shadow transition-transform ${local.showBenchmark ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-sm text-pa-text">Exibir média Porteira</span>
            </div>
            <p className="text-xs text-pa-muted mt-1.5">
              Compara os resultados do cliente com a média consolidada de todas as propriedades
            </p>
          </Section>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-pa-border">
          <button
            onClick={() => applyFilters(local)}
            className="w-full py-2.5 text-sm font-semibold rounded-lg transition-colors"
            style={{ background: 'var(--pa-green)', color: '#fff' }}
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
    <div>
      <p className="text-xs font-semibold text-pa-muted uppercase tracking-wider mb-2">{title}</p>
      <div className="space-y-1.5">
        {children}
      </div>
    </div>
  )
}

function CheckItem({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <span
        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
          checked ? 'bg-pa-green border-pa-green' : 'border-pa-border bg-pa-surface-2 group-hover:border-pa-green'
        }`}
        onClick={onChange}
      >
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      <span className="text-sm text-pa-text" onClick={onChange}>{label}</span>
    </label>
  )
}
