# Backlog — Porteira Adentro Dashboard

> Itens riscados (~~item~~) = concluídos. Itens abertos = pendentes.
> Atualizado a cada entrega.

---

## Referência visual
PDF de referência: `relatorio_diario_porteira_adentro.pdf`
- Paleta: verde-oliva escuro (`#3d4a2e`) + âmbar terracota + vermelho crítico
- Tipografia: DM Mono (já aplicada)
- Semáforo: Crítico <70% = vermelho, Atenção 70–95% = âmbar, Adequado >95% = verde
- Layout: KPIs em linha superior, gráficos de barra horizontal por equipamento, distribuição de tempo empilhada

---

## Bugs / UX

- [x] ~~**B1 — Flicker ao aplicar filtros**
  `setLoading(true)` imediato em `useData.js:10` descarta todo o conteúdo e exibe `PageLoader` a cada mudança de filtro. Fix: separar `loading` (carga inicial) de `fetching` (re-fetch); manter dados visíveis com indicador sutil durante re-fetch.~~

- [x] ~~**B2 — `PAGES` em App.jsx monta todas as páginas simultaneamente**
  `PAGES` é um objeto com JSX estático, não componentes lazy. Todas as páginas ficam montadas e executando hooks ao mesmo tempo. Fix: mapear para componentes e renderizar como `<Component />` no `main`.~~

- [x] ~~**B3 — `useFilterOptions` sem limite de paginação**
  Adicionado `.limit(2000)` explícito na query de opções de filtro.~~

---

## Visual / Tema

- [x] ~~**V1 — Paleta fora do brand**
  Atual: `emerald-500` (#22c55e) + `zinc`. Target: verde-oliva (`#5a8a3a`) + âmbar (`#c87941`) + superfície escura (`#232d1a`). Implementado via CSS custom properties `--pa-*` + extensão Tailwind `colors.pa.*`.~~

- [x] ~~**V2 — Tema claro quebrado nos cards**
  `OverviewPage.jsx` usava `bg-zinc-900 border-zinc-800` hardcoded. Migrado para `bg-pa-surface border-pa-border`.~~

- [x] ~~**V3 — Semáforo não aplicado nas métricas**
  Semáforo aplicado em `KPICard` (via `pctValue` / `ratioBenchmark`) e nas colunas de eficiência e disponibilidade da tabela comparativa.~~

- [x] ~~**V4 — Cores da distribuição de tempo hardcoded**
  `calcTimeDistribution` migrado para `var(--pa-green)`, `var(--pa-red)`, `var(--pa-amber)`.~~

- [x] ~~**V5 — Sem transição ao trocar de página**
  Fade-in de 0.18s implementado via `key={page}` + CSS `@keyframes fadeIn` no `page-fade-in`.~~

---

## Estrutura de páginas

- [x] ~~**E1 — Ocultar páginas não-implementadas do nav**
  Média Porteira, Diário Operacional e Benchmark removidos do array `NAV`. Mantidos comentados em `PAGES` para reativação futura.~~

- [x] ~~**E2 — Reestruturar Homepage / Overview**
  Implementado: KPIs do grupo (`media_grupo_porteira`), grid de combinações processo/cultura, comparativo de clientes (HBarChart + tabela com semáforo). FilterPanel popup com safra/processo/cultura.~~

---

## Páginas implementadas

- [x] ~~**P3 — Benchmark Cliente vs Grupo** (`BenchmarkClientePage`)
  KPIs cliente vs grupo, termômetros de posição (min/avg/max), VBarChart rendimento por equip,
  donut combustível, tabela por equipamento com colunas fixas + dropdown de métricas extras.~~

- [x] ~~**P4 — Benchmark de Equipamentos** (`BenchmarkEquipamentosPage`)
  Comparativo A vs B com referência do modelo (`media_equipamentos_porteira`).
  EquipSelector por cliente/equip/período, tabela comparativa com semáforo vs modelo, HBarChart.~~

## Páginas futuras

- [ ] **P1 — Diário Operacional** — visão por data com drill-down por equipamento/operador
- [ ] **P2 — Médias por Modelo** — tabela por modelo com unfold cod+equip+cliente
- [ ] **P5 — (página a definir)**

---

## Concluídos

<!-- Itens migrados aqui após resolução -->
