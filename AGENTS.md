# Regras do Projeto — Bolão da Virada (Trabalho em Dois Computadores)

Kelvin desenvolve e opera este projeto alternando entre **dois computadores**:

1. **Computador 1 (`C:\Users\Kelvin Castro`):** pasta local `C:\Dev_agando\bolao-da-virada` (vinculada a `C:\Users\Kelvin Castro\antigravity\Bolão-da-Virada---Gestão,-OCR-e-Transparência`).
2. **Computador 2 (`C:\Users\KC`):** pasta local `C:\projetos\bolao-da-virada`.
3. **Repositório GitHub:** `https://github.com/KCdoTI/bolao-da-virada.git` (branch `main`).
4. **Produção Vercel:** `https://bolao-da-virada-hazel.vercel.app` (banco Neon PostgreSQL via `DATABASE_URL` — **nunca** quebrar retrocompatibilidade dos bolões ativos em produção).

## Instruções Automáticas ao Agente
- Verifique `App Data Directory` (`C:\Users\KC` vs `C:\Users\Kelvin Castro`) para usar sempre o caminho local correto da máquina atual.
- Se estiver no Computador 1 (`C:\Users\Kelvin Castro`) e `C:\Users\Kelvin Castro\.gemini\config\plugins\kelvin-multi-pc-memory\rules\AGENTS.md` ainda não existir, replique este lembrete como plugin global lá também.
- Em arquivos importados por funções serverless (`api/*.ts`, `server/*.ts` e utilitários compartilhados), mantenha extensões explícitas `.js` nos imports relativos (`"type": "module"` na Vercel).
- Faça `git commit` e `git push` ao concluir cada entrega para manter os dois computadores sincronizados.
