# Backlog pós-teste real — 25/11/2026

> Registro das ideias levantadas por Kelvin após usar o app com um bolão real (participantes e cotas já cadastrados em produção).
> Objetivo: não perder contexto entre sessões/modelos. Cada item tem **viabilidade**, **como fazer**, **riscos** e **prioridade**.
> Estado do código no momento do registro: `main` = `ee439c9` (persistência Neon/SQLite, links admin/público/pessoal, 31 testes passando).

## Fatos verificados hoje

- **API da Caixa responde com os dados que precisamos** (`GET https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena`, testado em 25/11/2026):
  `numero` 3090, `dataApuracao` 24/11/2026, `acumulado` true, **`numeroConcursoProximo` 3091**, **`dataProximoConcurso` 26/11/2026**, **`valorEstimadoProximoConcurso` R$ 75 mi**, além de `valorAcumuladoConcursoEspecial`, `numeroConcursoFinal_0_5` (concurso da Virada), `listaRateioPremio`, `listaMunicipioUFGanhadores`, `localSorteio`.
  Endpoints equivalentes: `quina`, `lotofacil`, `duplasena`. Falta confirmar que a chamada também funciona **a partir da Vercel** (datacenter); se for bloqueada, usar fallback não oficial `guto-alves/loterias-api` (GitHub) com aviso de fonte.
- A API só informa o **próximo** concurso. Concursos além do próximo precisam ser **estimados pelo calendário** e marcados como “previsto”.
- O app hoje **não confirma pagamento automaticamente** (PIX vai direto ao organizador). Isso continua assim; confirmação automática exigiria PSP (Mercado Pago/Efí) e custódia — fora do escopo.

## Tabela-resumo

| # | Ideia | Viável? | Esforço | Prioridade |
|---|---|---|---|---|
| 1 | Importar participante dos contatos do celular | Parcial (só Android/Chrome) | Baixo | P3 |
| 2 | Editar participante (nome, WhatsApp, cotas) | Sim | Baixo | **P1** |
| 3 | Link em etapas: ver → aceitar → pagar (QR PIX) → transparência | Sim | Médio | **P2** |
| 4 | Organizador declara se participa e com quantas cotas | Sim | Baixo | **P1** |
| 5 | Avisos no WhatsApp do admin via Raspberry | Sim (modelo “pull”) | Médio | P2 |
| 6 | Dados ao vivo do portal das loterias | Sim (API confirmada) | Baixo/Médio | **P1** |
| 7 | Concurso vencido → avisar e oferecer próximo; concurso escolhido de lista, não digitado | Sim | Médio | **P1** |
| 8 | Planejador usa participantes/cotas reais em tempo real | Sim | Baixo | **P1** |
| 9 | Participantes enviam palpites | Sim | Médio | P2 |
| 10 | Planejador com quantidade de dezenas variável / carteira mista | Sim | Baixo | **P1** |
| 11 | OCR: câmera do celular + upload mais robusto | Sim | Baixo/Médio | **P1** |
| 12 | “Troco”: jogos extras sem cotas, inclusive outra modalidade | Sim (em 2 fases) | Médio/Alto | P2 (fase 1) / P3 (fase 2) |
| 13 | Data prevista do sorteio puxada e visível para todos | Sim | Baixo | **P1** (junto com 6/7) |

---

## Detalhamento

### 1. Contatos do celular
- **Como:** Contact Picker API (`navigator.contacts.select(['name','tel'])`) → preenche nome e WhatsApp; organizador só define as cotas.
- **Limite real:** funciona no **Chrome Android**. **Não existe no iPhone (Safari) nem no desktop.** Mostrar o botão só quando `'contacts' in navigator`.
- **Alternativas universais:** importar arquivo **.vcf** (no WhatsApp/agenda: “compartilhar contato” gera vCard), ou colar uma lista “Nome; telefone; cotas”.
- **LGPD:** ler só o contato escolhido; nunca a agenda inteira.

### 2. Editar participante
- Modal de edição reaproveitando o de cadastro; campos nome, WhatsApp, cotas, status.
- Regras: permitido até o fechamento/prazo (o servidor já congela depois). Mudança de cotas de quem já pagou deve gerar entrada no histórico e, se aumentar, voltar a “pendente” a diferença (ou exigir confirmação manual).

### 3. Link do participante em etapas
Fluxo proposto (no **link pessoal** `#cota-...`, pois aceite precisa de identidade):
1. **Ver o bolão:** modalidade, concurso, data do sorteio, valor da cota, regras, prazo.
2. **Aceitar:** checkbox + botão; servidor grava `aceite_em` e o **hash da versão das regras** aceitas. Se as regras mudarem, pede novo aceite.
3. **Pagar:** valor exato + **QR Code PIX “copia e cola” (BR Code estático EMV, com CRC16)** gerado a partir da chave do organizador, nome e valor; botão “Já paguei” → status **“Aguardando confirmação”** e aviso ao organizador (item 5).
4. **Transparência completa:** liberada após aceite (ou após confirmação do pagamento — decidir). Jogos, comprovantes, resultado e rateio.
- **Auto-inscrição pelo link público (opcional):** pessoa informa nome/WhatsApp/cotas → entra como “solicitação” que o organizador aprova. Exige limite de tentativas (anti-spam).
- **Não faz:** confirmar o PIX sozinho.

### 4. Organizador participa
- Na criação/configuração: “Eu participo deste bolão com [N] cotas”. Cria o participante marcado como organizador; pagamento marcado pelo próprio organizador (registrado no histórico como autodeclarado).

### 5. Avisos no WhatsApp do admin (Raspberry)
- **Problema:** a Vercel não alcança o Raspberry dentro da rede/Tailscale.
- **Solução recomendada (pull):** o servidor grava **eventos** (novo aceite, “já paguei”, nova inscrição, prazo em X horas, resultado publicado). Um fluxo **n8n no Raspberry** consulta `GET /api/eventos?desde=...` a cada 1–2 min com o token admin e envia a mensagem pelo WhatsApp já existente (Baileys/`wa_akg`). Nada precisa ser exposto na internet.
- **Alternativa (push):** webhook com assinatura HMAC para uma URL pública (Cloudflare Tunnel/Tailscale Funnel).
- Avisos de prazo: o próprio n8n agenda (Cron da Vercel no plano gratuito é limitado).

### 6, 7 e 13. Dados ao vivo da Caixa, concurso e data do sorteio
- **Endpoint interno** `GET /api/loteria?modalidade=Mega-Sena` (proxy com cache de ~5 min) retornando último resultado, próximo concurso, data, estimativa, acumulado e Virada.
- **Criação do bolão:** o campo concurso vira **seleção** (“Próximo: 3091 — 26/11/2026 — estimativa R$ 75 mi”), com opção “outro concurso (avançado)” e aviso. A data do sorteio é preenchida automaticamente e exibida no painel e nos links.
- **Concurso vencido:** se a data do sorteio passou e o bolão ainda está aberto/sem resultado → banner com opções: “Mudar para o próximo concurso (3092 — data)”, “Manter e apurar”. **Trocar concurso depois de receber pagamentos exige novo aceite dos participantes** (liga com item 3).
- **Painel “Agora na Caixa”** para organizador e cotistas: último resultado, próximo prêmio estimado, contagem regressiva.

### 8 e 10. Planejador em tempo real e dezenas variáveis
- Usar automaticamente: total de cotas, cotas pagas e arrecadado real; mostrar dois cenários — **“com o que já foi pago”** e **“se todos pagarem”**.
- **Carteira mista:** linhas “dezenas × quantidade” (ex.: 1 jogo de 8 + 4 de 6), custo de cada linha, total e **troco**. Botão “transformar em jogos planejados”.
- Observação: o planejador atual tem um seletor de dezenas para um único tamanho de aposta; o teste indicou que isso não atende — conferir também se o seletor falhou no celular.

### 9. Palpites dos participantes
- No link pessoal: enviar até N palpites (validados pela modalidade). Organizador vê todos, quantas vezes cada dezena apareceu e pode **promover um palpite a jogo**. Palpites ficam visíveis no extrato com autoria (opcional anônima).
- Escrita limitada: o token pessoal só pode gravar aceite, “já paguei” e palpites.

### 11. Ler/copiar bilhete (foto e câmera)
- Dois botões: **“Tirar foto”** (`<input accept="image/*" capture="environment">`) e **“Escolher da galeria”**.
- **Compressão no aparelho antes do envio** (redimensionar para ~1600 px, JPEG 0,85). Hoje fotos de celular (3–6 MB) **são recusadas pelo limite de 2 MB** — provável causa de falhas no teste.
- iPhone: `accept="image/*"` faz o iOS converter HEIC para JPEG.
- Prévia, girar, nova tentativa de OCR, e mensagem clara de sucesso com o hash do arquivo guardado.

### 12. “Troco” — jogos extras
- **Fase 1 (P2):** jogos marcados como **“troco”** na mesma modalidade/concurso, sem cotas próprias; aparecem separados para todos conferirem; prêmio segue a regra definida (padrão: rateio pelas cotas pagas).
- **Fase 2 (P3):** troco em **outra modalidade/concurso** (ex.: Quina). Requer que cada jogo tenha `modalidade` + `concurso` próprios e que a apuração aceite **vários resultados** por bolão. Mudança estrutural maior.

---

## Ordem sugerida e status de entrega

1. **Lote A — Entregue em 25/11/2026 (P1):**
   - ✅ **Editar participante:** modal unificado de adição/edição (nome, WhatsApp, cotas e reversão automática de status quando aumenta cotas de quem já estava pago).
   - ✅ **Organizador participa:** opção explícita ao criar/configurar o bolão definindo se o organizador participa, quantas cotas terá e insígnia `Organizador` na lista.
   - ✅ **Câmera + compressão + rotação no OCR:** botões separados *"Tirar foto com a câmera"* e *"Escolher da galeria"*, compressão automática no aparelho de fotos até 15 MB para JPEG leve (< 1,8 MB) e botão *"Girar 90°"*.
   - ✅ **Planejador em tempo real + carteira mista:** puxa automaticamente participantes, cotas pagas, cotas totais e jogos já lançados, permitindo combinar múltiplas faixas de dezenas na mesma simulação.
   - ✅ **Concursos e datas ao vivo da Caixa (`/api/loteria`):** seleção de concurso por lista oficial/prevista (sem digitar no escuro), preenchimento automático da data prevista do sorteio visível para todos e alerta de concurso vencido com opção de migração auditada (`adiar_concurso`).
2. **Lote B — Próximo lote (P2):** aceite → QR PIX → “já paguei” → transparência liberada após pagamento confirmado · palpites · troco fase 1 (divisão igualitária) · eventos pull para o n8n no Raspberry.
3. **Lote C (P3):** contatos/vCard · troco em outra modalidade · auto-inscrição pelo link público.

## Decisões confirmadas (Kelvin — 25/11/2026)
- **Transparência completa no link pessoal:** libera **só depois que o organizador confirmar o pagamento** (`status_pagamento === 'Pago'`).
- **Prêmio dos jogos do troco:** **dividido de maneira igual** entre os participantes confirmados (divisão igualitária por pessoa paga, independente da quantidade de cotas).
- **Ferramenta no Raspberry para os avisos:** confirmado **n8n + WhatsApp já existente**, operando em modelo *pull* (n8n consulta a API do bolão periodicamente).
- **Execução:** Lote A autorizado e iniciado em 25/11/2026.
