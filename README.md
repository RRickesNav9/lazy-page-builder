# Porteira Adentro Dashboard

Dashboard de operações agrícolas — Nav9 Tech.

Consome telemetria de máquinas agrícolas via Supabase e exibe KPIs operacionais,
benchmarks de grupo (Média Porteira) e análise de benchmark por equipamento.

## Variáveis de ambiente

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Desenvolvimento

```bash
npm install
npm run dev   # localhost:5173
```

## Deploy

Push no branch `main` → Lovable deploya automaticamente.
