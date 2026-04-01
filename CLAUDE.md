# Porteira Adentro Dashboard

## O que é
Dashboard de operações agrícolas (Nav9 Tech). Consome telemetria de máquinas
agrícolas via Supabase e exibe KPIs operacionais, benchmarks e análise de downtime.

## Stack
- React 18 + Vite + Tailwind CSS + Supabase JS SDK
- TypeScript habilitado (allowJs: true — código fonte em .jsx/.js)
- shadcn/ui disponível mas não usado pelo dashboard (apenas no template Lovable)
- Deploy: Lovable (push no main → deploy automático)
- UI: Português brasileiro, fonte DM Mono (não substituir)

## Repos
- **Este repo (ativo):** https://github.com/RRickesNav9/blank-slate-e52f9779
- **Repo legado:** https://github.com/RRickesNav9/porteira-dash (descontinuado)

## Lovable
- Build: `npm run build` → `dist/`
- Deploy automático via push no branch `main`
- Variáveis de ambiente configuradas no painel Lovable:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## Arquitetura
- `src/lib/supabase.js` — client singleton (nunca instanciar em outro lugar)
- `src/lib/utils.js` — formatadores, agregação, constantes (NIVEIS_ANALISE, METRICAS) + função `cn` do shadcn
- `src/hooks/useData.js` — todos os hooks de dados
- `src/components/UI.jsx` — componentes reutilizáveis do dashboard
- `src/components/ui/` — componentes shadcn/ui (template Lovable — não editar)
- `src/pages/` — OverviewPage, DiarioOperacionalPage, MediaPorteiraPage, EquipamentoBenchmarkPage
- `src/App.jsx` — layout + navegação lateral (NAV, PAGES)

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
