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
  `PAGES` é um objeto com JSX estático (linhas 48–52), não componentes lazy. Todas as 4 páginas ficam montadas e executando hooks ao mesmo tempo. Fix: mapear para componentes (`OverviewPage`) e renderizar como `<Component />` no `main`.~~

- [ ] **B3 — `useFilterOptions` sem limite de paginação**
  `useData.js:153` busca toda a `dashboard_operational_view` sem range apenas para popular dropdowns. Fix: usar `.select('campo').limit(N)` ou query DISTINCT separada.

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

- [ ] **E2 — Reestruturar Homepage / Overview**
  Quatro seções conforme spec:
  1. **Médias do Grupo Porteira Adentro** — tabela simples por safra (safra selecionada), linhas = médias de equipamentos (cod + modelo) dos clientes do grupo
  2. **Média dos Equipamentos** — filtros: Safra / Processo / Cultura / Timeframe; tabela por modelo com unfold que mostra cod+equip+cliente
  3. **Benchmark de Equipamentos** — visão termômetro (min / média / max) por métrica, marcador do cliente na régua
  4. **Benchmark do Grupo Porteira Adentro** — desempenho do cliente vs médias do grupo; inclui % motivos de parada comparativo

---

## Páginas futuras (não iniciar até conclusão da Homepage)

- [ ] **P1 — Médias do Grupo Porteira Adentro** (página dedicada)
- [ ] **P2 — Média dos Equipamentos** (página dedicada, com unfold por modelo)
- [ ] **P3 — Benchmark de Equipamentos** (página dedicada, termômetro)
- [ ] **P4 — Benchmark do Grupo Porteira Adentro** (página dedicada, cliente vs grupo)
- [ ] **P5 — (quinta página a definir)**

---

## Concluídos

<!-- Itens migrados aqui após resolução -->
