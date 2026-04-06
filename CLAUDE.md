# Porteira Adentro Dashboard

## O que é
Dashboard de operações agrícolas (Nav9 Tech). Consome telemetria de máquinas
agrícolas via Supabase e exibe KPIs operacionais, benchmarks e análise de downtime.

## Stack
- React 18 + Vite + Tailwind CSS + Supabase JS SDK
- TypeScript habilitado (allowJs: true — código fonte em .jsx/.js)
- shadcn/ui disponível mas não usado pelo dashboard (apenas no template Lovable)
- Deploy: Lovable (push no main → deploy automático)
- UI: Português brasileiro, fonte Inter, tema claro (fundo #ffffff, primary #2d4a2d)

## Repos
- **Este repo (ativo):** https://github.com/RRickesNav9/dash_porteira
- **Repo legado:** https://github.com/RRickesNav9/porteira-dash (descontinuado)

## Lovable
- Build: `npm run build` → `dist/`
- Deploy automático via push no branch `main`
- Variáveis de ambiente configuradas no painel Lovable:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## Arquitetura (pós-refactor visual 2026-04)
- `src/lib/supabase.js` — client singleton (nunca instanciar em outro lugar)
- `src/lib/utils.js` — formatadores (fmt, fmtPct, fmtHa…), aggregateRows, calcStopDistribution, calcTimeDistribution, semaphoreColor, defaultSafra, NIVEIS_ANALISE, METRICAS, `cn`
- `src/lib/FilterContext.jsx` — Context global com filters, applyFilters, clearFilters, drawerOpen, activeCount
- `src/hooks/useData.js` — todos os hooks de dados
- `src/components/UI.jsx` — componentes reutilizáveis (HBarChart, DonutChart, VBarChart, ThermometerBar, FilterPanel, etc.)
- `src/components/GlobalFilterDrawer.jsx` — drawer de filtros global (período, cliente, propriedade, operação, cultura, equipamentos, benchmark)
- `src/components/ui/` — componentes shadcn/ui (template Lovable — não editar)
- `src/pages/AnaliseGeralPage.jsx` — página principal atual (dados ainda em mock hardcoded)
- `src/App.jsx` — layout com header fixo verde (#2d4a2d), FilterProvider wrapper, Breadcrumb de filtros ativos, GlobalFilterDrawer

## Estado atual dos dados
- `AnaliseGeralPage` usa dados **hardcoded mock** — próximo passo é conectar ao Supabase
- `GlobalFilterDrawer` usa listas **hardcoded mock** (CLIENTES_MOCK, EQUIPAMENTOS_MOCK…) — próximo passo é buscar do Supabase
- Hooks em `useData.js` estão prontos para uso real (dashboard_operational_view, media_grupo_porteira, media_equipamentos_porteira)

## Fluxo de dados
1. Hook em `useData.js` busca dados do Supabase com paginação (loop de 1000 linhas)
2. Página recebe `data[]` bruto e agrega via `useMemo` + `aggregateRows()`
3. Componentes de `UI.jsx` recebem dados já agregados para renderização

## Regras deste projeto
- Novas queries sempre via hook em `useData.js` — nunca Supabase direto nas páginas
- Novos filtros sempre via `FilterBar` — nunca inputs avulsos
- Novas páginas registradas em `NAV` e `PAGES` no `App.jsx`
- Nova métrica → adicionar em `METRICAS` com `fmt` correto
- Paginação obrigatória em qualquer query a `dashboard_operational_view`
- Agregação sempre no `useMemo` da página — nunca pré-agregar no hook
- Erros exibidos inline — nunca `alert()` ou `toast` não solicitado
- Não converter arquivos .jsx/.js para .tsx/.ts sem necessidade

## Referências
- Tabelas e colunas: ver @docs/estrutura-dados.md
- Regras de agregação e semáforo: ver @docs/regras-negocio.md
- Componentes e hooks disponíveis: ver @docs/api-referencia.md

## Comandos
```bash
npm run dev      # localhost:5173
npm run build    # dist/
# Deploy: git push origin main → Lovable deploya automaticamente
```
