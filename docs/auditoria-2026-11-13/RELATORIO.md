# Auditoria do Bolão da Mega — 13/11/2026

**Conclusão: o projeto é um protótipo funcional com uma boa base matemática, mas ainda não está pronto para conduzir um bolão real com transparência entre aparelhos.** Os bloqueios principais são persistência compartilhada, autorização, resultados fictícios tratados como apuração e divergência entre as telas. Expandir modalidades antes de resolver isso amplia o risco.

## Escopo e evidências

- Código examinado: branch `feature/multi-lottery-engines`, commit `a4b86c9`. Referência local de `main`: `056c0d3`. As referências remotas locais não foram atualizadas nesta auditoria.
- `C:\Dev_agando\bolao-da-virada` é uma junction para `C:\Users\Kelvin Castro\antigravity\Bolão-da-Virada---Gestão,-OCR-e-Transparência`: são o mesmo projeto físico, não duas cópias independentes.
- Aplicação publicada inspecionada visualmente em cinco larguras CSS. Asset observado: `index-CjDFf1rG.js`. O build local gerou `index-LgQKxFUi.js`; não foi estabelecida a identidade exata do commit publicado.
- Lidos os 12 artifacts Markdown da conversa Antigravity `198b7a9b-f4ac-4c40-9cb7-816dfa8e3289`, mais documentação do repositório. Declarações de implementação nos artifacts foram confrontadas com o código e com a execução.
- **22/22 testes existentes aprovados; tipagem e build aprovados.** O comando chamado `lint` verifica tipos, não executa uma auditoria geral de qualidade.
- **292 cenários combinatórios válidos, 1.114 comparações contra enumeração independente dos subconjuntos, nenhuma divergência.** Isso valida quantidades de prêmios por sorteio; não valida valores oficiais, importação, autorização nem o fluxo completo da Dupla Sena.
- Ensaios adicionais reproduziram defeitos em parser OCR, fallback de resultados, premiação fixa, rateio em centavos e proteção da API. Usaram dados sintéticos e transporte substituído, sem gravações na produção.
- Evidências: [diagnósticos](diagnosticos.json), [reprodução local](diagnosticos.ts), [navegador](evidencias-navegador.json), [testes](testes-existentes.txt), [tipagem](tipagem.txt), [build](build.txt).

## Problemas que bloqueiam o piloto

### P0-01 — O link compartilhado não carrega o bolão de outro aparelho

**Confirmado na interface em dois contextos independentes.** Alterei o nome pela configuração local, salvei e recarreguei: o organizador manteve o nome novo. Ao abrir o link público em outro contexto, apareceu o bolão de demonstração. Nenhuma chamada de API acompanhou o salvamento.

`src/App.tsx:39–67,119–122` usa quatro chaves globais de localStorage. O hash da URL só escolhe a visão; não busca nem seleciona o bolão. O código de `api/bolao.ts:3` mantém um `Map` em memória, sem banco persistente, e não está ligado ao fluxo de leitura/gravação da aplicação. Mesmo se conectado, o estado não sobreviveria de forma confiável à troca de instância ou reinicialização.

**Correção necessária:** fonte persistente compartilhada; leitura pelo identificador do bolão; isolamento por bolão; erros explícitos; confirmação de gravação. Aceite: criar e atualizar no aparelho A, ler o mesmo conteúdo no B, reiniciar o serviço e repetir.

### P0-02 — “Link seguro” não corresponde a autorização

`src/App.tsx:145` aceita qualquer valor de `admin` ou prefixo `#admin-`. A tela pública oferece “Painel do Organizador” e o botão abre controles de edição sem autenticação. No estado atual, essa edição altera a cópia local; não foi demonstrada alteração do bolão de outra pessoa em produção.

O handler local tem um risco adicional: POST sem credencial foi aceito, e GET devolveu todo o payload, inclusive o `admin_token` sintético. Não existem projeções separadas para público e administrador. Tokens curtos gerados por `Math.random()` não resolvem esse problema.

**Correção necessária:** autenticação/autorização no servidor; token público com escopo somente leitura e revogação; não devolver token administrativo, telefone integral ou dados privados na resposta pública. Aceite: uma requisição pública não pode escrever, mesmo fora da interface.

### P0-03 — Falha na consulta produz resultado e prêmio inventados

Em `src/services/caixaLotteryService.ts:17–92`, o espelho Heroku é consultado antes da Caixa e ambos recebem o rótulo `caixa_oficial`. Se nenhum responder, retornam dezenas fixas, data `31/12/2026` e Sena de R$ 550 milhões. Solicitei o concurso sintético `999999` com ambos os endpoints indisponíveis: a função devolveu esses números associados ao concurso solicitado.

Outra reprodução: resposta com prêmio da Sena igual a **zero** foi convertida em **R$ 550 milhões**, porque `if (rSena?.valorPremio)` ignora zero. A interface usa mensagens verdes de sucesso também para a contingência.

**Correção necessária:** indisponibilidade deve permanecer indisponibilidade. Simulação precisa de estado próprio e não pode produzir relatório/notificação “oficial”. Validar modalidade, concurso, data, quantidade, unicidade, universo e valores; preservar zero e registrar a fonte real.

### P0-04 — Organizador e cotista não compartilham a mesma apuração

`PainelConferencia.tsx` mantém os valores importados somente no estado interno do componente. `PublicTransparencyView.tsx:94–104` decide que houve sorteio apenas pela existência de seis dezenas, usa valores fixos de R$ 550 milhões/R$ 70 mil/R$ 1.200 e chama `conferirJogo` sem a modalidade.

Consequências: a mudança de aba desmonta e perde os valores importados; o público não usa os valores buscados pelo organizador; Quina e Lotofácil não têm a contagem correta de dezenas para declarar sorteio realizado. A demonstração exibiu **R$ 1.100.861.600,00** como prêmio conquistado, sem uma separação clara de modo de demonstração.

**Correção necessária:** uma apuração persistida, identificada por concurso/modalidade/sorteio, com origem e estado verificável, compartilhada pelas duas telas.

## Lógica e funcionalidades

| Prioridade | Achado confirmado | Impacto e direção da correção |
|---|---|---|
| P1 | Lotofácil usa R$ 13 para 12 acertos e R$ 32 para 13 acertos (`lotteryEngine.ts:73,72`) | A fonte oficial consultada informa R$ 14 e R$ 35. Corrigir tabela com vigência e testar os valores monetários, além das contagens. |
| P1 | A integração de resultados é exclusivamente Mega-Sena | `PainelConferencia.tsx:72` chama sempre `fetchMegaSenaDraw`; entrada manual permanece 1–60. Criar adaptadores por modalidade. |
| P1 | Dupla Sena não modela os dois sorteios | Tipos guardam apenas um vetor de dezenas e uma tabela de prêmios. A fórmula por sorteio funciona, mas falta apurar e somar os dois, com rateios independentes. |
| P1 | OCR transforma metadados em aposta | Texto contendo apenas concurso/data/hora/valor produziu `[6,10,11,14,19,22]`. O fallback global reaproveita linhas anteriormente descartadas. Um bilhete Lotofácil de 15 números com data virou 17. Separar metadados e blocos de jogos; não criar jogo na dúvida. |
| P1 | Revisão OCR continua limitada à Mega-Sena | A própria amostra Quina `[12,28,45,67,79]` chega à etapa 2, mas é rejeitada por ter menos de 6 números e números acima de 60. `TicketOcrModal` não recebe modalidade. |
| P1 | Original da foto não é preservado nesse fluxo | `handleProcessImage` guarda a versão redimensionada/binarizada; é ela que segue para o jogo. Guardar original e derivado separadamente. OCR não autentica bilhete. |
| P1 | Falta validação de entrada no motor e no salvamento de jogos importados | O motor aceita `[1,1,1,1,1,1]` como seis acertos; o volante valida contagem, mas não universo de números vindos de OCR/gerador. Validar nas fronteiras, sem depender só dos botões do volante. |
| P1 | O planejador está preso a dezembro | `SimuladorPreBolaoModal.tsx:48` fixa `2026-12-31T20:00:00`. Aplicá-lo ao piloto de novembro desloca o prazo. Custos/gerador também permanecem Mega-Sena; textos ainda citam R$ 5. |
| P1 | Prazo de pagamento é apenas informativo | `calcularRateio` filtra somente o status atual “Pago”. Não há pagamento com data/hora, congelamento do quadro, histórico imutável ou aceite das regras. Alterar o status depois modifica quem participa. |
| P1 | Reiniciar o bolão esvazia o formulário de resultado manual | `App.tsx:269` grava `[]`; os inputs manuais são criados com `.map` desse vetor. Sem importação, não há seis campos a preencher. Confirmado pelo fluxo do código; não executado após a interrupção. |
| P1 | “Lotéricas próximas” usa lista fixa | Endereços, distâncias e premiações são `LOTERICAS_MOCK`; a localização obtida é ignorada. Horários são genéricos. Não apresentar isso como diretório oficial ou distância real. |
| P1 | Hash é anunciado como assinatura e autenticidade | O manifesto não inclui foto nem regras. Trocar a foto preservou o hash. Sem Web Crypto, `calculateSha256` devolve FNV repetido, não SHA-256. Não há assinatura digital, prova de anterioridade ou autenticação Caixa nesse mecanismo. |
| P2 | Rateio perde o fechamento em centavos | R$ 100 / 3 exibe três parcelas de R$ 33,33, somando R$ 99,99. Calcular em centavos e distribuir o resíduo por regra determinística. |
| P2 | Privacidade pública ficou apenas parcial | “Pendente” virou “Em reserva”, mas a associação entre nome e situação continua visível. Telefones mascarados não são anonimização e o painel do organizador está acessível. |
| P2 | Código de bilhete é fabricado quando omitido | `App.tsx:215` gera números aleatórios; mensagens descrevem jogos como autenticados. Um identificador interno deve ter nome e formato distintos do código do recibo. |

O cadastro, os filtros, o volante manual, a atualização local de status e a revisão humana em duas etapas estão implementados. PIX é chave do organizador com confirmação manual; não há comprovação de conciliação bancária automática. Os botões de WhatsApp preparam mensagens; não significam que o destinatário recebeu algo. Nenhuma mensagem foi enviada nesta auditoria.

O gerador chamado “IA” é uma heurística local com `Math.random()` e uma lista histórica fixa. Contar dezenas distintas/60 mede presença de números, não probabilidade de acertar uma combinação. Uma combinação simples tem a mesma chance que qualquer outra; repetir uma combinação não amplia o conjunto de resultados cobertos. Recomendações como “forte alinhamento histórico” ou aumento “exponencial” carecem de evidência e devem ser substituídas por descrições matemáticas verificáveis.

## Design e experiência de uso

Há uma identidade visual aproveitável: logotipo vetorial, paleta consistente, hierarquia dos valores, componentes reutilizados e suporte CSS a redução de movimento. A correção deve preservar essa base.

**A responsividade documentada nos artifacts não se confirma na versão publicada:**

| Largura CSS da janela | Largura do documento | Excesso horizontal |
|---:|---:|---:|
| 1440 | 1515 | 75 px |
| 1280 | 1435 | 155 px |
| 768 | 1046 | 278 px |
| 390 | 437 | 47 px |
| 375 | 437 | 62 px |

A barra do topo possui grupos que não encolhem e acumula muitos botões. “Novo Jogo” aparece cortado no celular. O problema é rolagem do documento, não apenas rolagem interna de uma tabela. [Desktop](producao-desktop.png) · [Celular](producao-mobile-375.png).

Recomendações específicas:

1. Deixar uma ação principal visível; mover Planejador, Lotéricas, Extrato e Regras para menu secundário. Eliminar duplicação dessas ações entre topo e toolbar.
2. No celular, priorizar situação do bolão e próxima ação. Quatro indicadores empilhados ocupam grande parte da tela antes de chegar aos participantes.
3. Manter um aviso inequívoco de demonstração; mostrar fonte, concurso e última verificação ao exibir resultado. Remover “oficial”, “seguro” e “autenticado” onde o sistema não verificou essas propriedades.
4. Corrigir teclado nos modais. No volante testado, o foco permaneceu no botão atrás do modal e Escape não fechou. Implementar entrada/contenção/devolução do foco.
5. Trocar `lang="en"` por `pt-BR`, padronizar BRL (`12.00` e `12,00` hoje convivem) e revisar rótulos de controles de ícone.
6. Não prometer instalação PWA/offline: não foram encontrados manifesto nem service worker no projeto. Atalho de navegador não comprova a experiência offline anunciada.

Não foi realizada certificação WCAG, ensaio em aparelho físico nem medição completa de contraste/performance. As afirmações antigas de WCAG AAA não ficam comprovadas pelas capturas ou testes unitários.

## Estrutura recomendada

A separação em `components`, `utils`, `services`, `constants` e `types` ajuda a manutenção. O problema é que as regras ainda se repetem em várias camadas: catálogo, OCR, gerador, planejador, apuração e página pública divergem.

Organizar a evolução em torno de quatro responsabilidades:

- **Regras por modalidade e vigência:** universo, contagens, preços, faixas, número de sorteios e fontes. Um catálogo autoritativo consumido por todos os módulos.
- **Ciclo do bolão:** rascunho → aberto → pagamentos encerrados → apostas registradas → resultado confirmado → prestação de contas. Alterações posteriores precisam de histórico.
- **Persistência e acesso:** bolões, cotistas, pagamentos, jogos, arquivos originais, resultados e aceites no servidor; respostas públicas minimizadas.
- **Apuração compartilhada:** um único serviço calcula resultados e rateio em centavos, para organizador, cotista e extrato.

O build gerou JavaScript de 502,33 kB (136,49 kB gzip), com aviso de chunk acima de 500 kB. Carregar OCR e modais sob demanda é uma melhoria secundária. O objetivo imediato é correção e integridade. Não há necessidade demonstrada de trocar React/Vite para resolver os bloqueios.

## Pesquisa oficial das loterias

Fontes verificadas em **13/11/2026**. Escopo: as quatro modalidades e suas edições especiais presentes no projeto; não foi uma auditoria de todas as modalidades comercializadas pela Caixa.

| Modalidade | Universo / escolha | Aposta simples | Faixas |
|---|---|---:|---|
| [Mega-Sena](https://loterias.caixa.gov.br/Paginas/Mega-Sena.aspx) | 1–60 / 6–20 dezenas | R$ 6,00 | 4, 5, 6 |
| [Lotofácil](https://loterias.caixa.gov.br/Paginas/Lotofacil.aspx) | 1–25 / 15–20 dezenas | R$ 3,50 | 11 a 15 |
| [Quina](https://loterias.caixa.gov.br/Paginas/Quina.aspx) | 1–80 / 5–15 dezenas | R$ 3,00 | 2 a 5 |
| [Dupla Sena](https://loterias.caixa.gov.br/Paginas/Dupla-Sena.aspx) | 1–50 / 6–15 dezenas | R$ 3,00 | 3 a 6 em cada um dos dois sorteios |

Correções que devem chegar ao código e aos artifacts:

- **Mega da Virada 2026:** comunicado específico de 03/11, atualizado em 04/11, anuncia concurso **3100**, apostas até **31/12/2026 às 22h** e sorteio em **01/01/2027 às 11h**, no horário de Brasília. A distribuição é **90%/5%/5%**. O horário da lotérica física deve ser confirmado separadamente. Esse comunicado específico é mais adequado para a edição 2026 que textos genéricos sobre “31/12”. [CAIXA Notícias](https://caixanoticias.caixa.gov.br/Paginas/Not%C3%ADcias/2026/11-NOVEMBRO/Premio-da-Mega-da-Virada-2026-deve-ultrapassar-R-1-bilhao.aspx).
- **Mega-Sena:** o máximo é 20, não 15. Preço de aposta múltipla: R$ 6 × C(n,6). Por exemplo, 7 números custam R$ 42 e 8 custam R$ 168. O Bolão CAIXA exige regras específicas de quantidade de cotas, valor mínimo e jogos por recibo. Jogos no mesmo recibo precisam ter a mesma quantidade de números. [Regras e tabela da Mega-Sena](https://loterias.caixa.gov.br/Paginas/Mega-Sena.aspx).
- **Lotofácil:** prêmios fixos consultados: **R$ 7 / R$ 14 / R$ 35**, para 11/12/13 acertos. Na Independência, a transferência sem ganhador continua pelas faixas inferiores; não termina necessariamente em 14. [Regras e premiação](https://loterias.caixa.gov.br/Paginas/Lotofacil.aspx).
- **Dupla Sena:** o artifact apresenta bolão mínimo R$ 15 e cota R$ 4; a página oficial informa **R$ 10 e R$ 3**. Há dois resultados e duas tabelas de premiação. Na Dupla de Páscoa, não reduzir a regra a uma única Sena/Quina. [Regras da Dupla Sena](https://loterias.caixa.gov.br/Paginas/Dupla-Sena.aspx).
- **Calendário:** a página oficial consultada informa Mega às terças/quintas, 21h, e domingos, 11h; Quina/Lotofácil de segunda a sexta, 21h, e domingo, 11h; Dupla às segundas/quartas/sextas, 21h. O projeto ainda diz sábado em textos genéricos. Usar calendário versionado e exceções por concurso. [Regras e cronogramas](https://loterias.caixa.gov.br/Paginas/regras-sorteios.aspx).
- **Especiais:** “não acumula” precisa da regra completa. As páginas Mega, Quina e Lotofácil preveem o caso extremo sem ganhadores em nenhuma faixa, com acumulação para concurso seguinte. O sistema deve consumir o rateio publicado, não inventar a redistribuição a partir apenas dos jogos do próprio grupo. [Quina de São João](https://loterias.caixa.gov.br/Paginas/Quina.aspx), [Mega da Virada](https://loterias.caixa.gov.br/Paginas/Mega-Sena.aspx), [Independência](https://loterias.caixa.gov.br/Paginas/Lotofacil.aspx).

**Distinção de produto:** o grupo informal controlado pelo app não equivale automaticamente a um Bolão CAIXA com recibos individuais. O plano “1 jogo de 7 + 9 simples” pode ser uma carteira do grupo; não deve ser descrito como um único recibo oficial contendo tamanhos misturados. As restrições de cotas também variam com o tamanho do jogo, não apenas com a modalidade.

**Limitação da pesquisa do piloto:** os PDFs oficiais de cronograma de novembro/dezembro foram localizados, mas o acesso retornou redirecionamento circular. Não confirmo o número do concurso de 19/11 com base em agregadores. O número 3087 nos planos permanece a confirmar em fonte oficial acessível.

## Confronto dos 12 artifacts do Antigravity

Pasta de origem: `C:\Users\Kelvin Castro\.gemini\antigravity\brain\198b7a9b-f4ac-4c40-9cb7-816dfa8e3289`.

| Artifact | Resultado da revisão |
|---|---|
| `analise_auditoria_e_plano.md` | Diagnóstico de transparência sem backend continua válido. G1, preço simples, foi corrigido no cálculo; textos antigos permanecem. G3 está parcial, G6 avançou para duas etapas; G7 tem hash incompleto; G8, aceite persistido, não foi encontrado. |
| `plano_piloto_mega_1911.md` | Escopo enxuto e teste entre aparelhos continuam adequados. Armazenamento, aceite e métricas prometidos ainda não estão entregues. Não foi encontrada a branch de piloto entre as referências locais inspecionadas. |
| `auditoria_regras_oficiais_caixa.md` | Fórmula correta e Mega até 20 já documentada, mas não propagada. Valores da Dupla e absolutos sobre não acumular precisam de correção. “main exclusivamente Mega” diverge do commit atual de main, que já contém catálogo/seleção multi-loterias. |
| `expansao_multimodal_loterias.md` | Catálogo e volante adaptativo existem; integração de resultados, página pública, OCR interativo e segundo sorteio não acompanham. Fixos da Lotofácil e calendário precisam atualizar. |
| `pesquisa_viabilidade_e_regras.md` | Mistura hipóteses comerciais e certezas não demonstradas: “100% legal”, “95% desistirão”, “100% disponibilidade”. Percentuais 62/19/19 da Virada estão desatualizados. |
| `planejamento_pre_bolao_e_contingencias.md` | Boas ideias de prazo e cenários; exemplos continuam a R$ 5 e datas fixas. Redução de dezenas implementada corta as maiores, não usa peso estatístico. Falta aceite e execução controlada da regra. |
| `arquitetura_ocr_e_pix_raspberry.md` | É desenho de integração, não prova de implantação. Código atual usa Tesseract no navegador; não há fluxo implementado de Mercado Pago/conciliação no projeto examinado. Não foi auditado o funcionamento de serviços externos nos Raspberry Pis. |
| `relatorio_design_squad.md` | Parte relevante do estilo foi implementada. Afirmações sobre robustez/qualidade financeira não são demonstradas por testes unitários. |
| `relatorio_design_squad_arejamento_topo.md` | Espaçamento melhorou, mas a barra de ações voltou a ultrapassar o viewport. |
| `dimensionalidade_e_logo_design.md` | Marca existe; a matriz de acessibilidade e ausência de overflow não corresponde à versão publicada medida. |
| `screens_overview.md` | Útil como inventário visual histórico. Não comprova sincronização, autenticação ou apuração oficial atual. |
| `visualizacao_ao_vivo.md` | Registro de uma sessão anterior. Links/capturas não comprovam que o servidor ainda esteja ativo nem que dados sejam reais. |

Não alterei os artifacts originais: este relatório preserva a comparação entre intenção e estado atual.

## Linguagem jurídica e confiança

A pesquisa antiga não sustenta a conclusão geral “100% legal”. A classificação depende do funcionamento concreto, tratamento de dados, recebimento de valores e comercialização. Esta auditoria técnica não emite parecer jurídico.

A afirmação de que a Apple proíbe automaticamente aplicativos que mencionem loterias não corresponde ao texto da diretriz 5.3.4: ela trata de licenciamento, permissões e restrições geográficas para ofertas de jogos com dinheiro/loterias. Isso não garante aprovação deste app, mas invalida a generalização do artifact. [Diretrizes Apple, seção 5.3](https://developer.apple.com/app-store/review/guidelines/).

Mascarar telefone é uma medida parcial; não demonstra conformidade LGPD. Minimização, transparência, segurança e prevenção precisam ser consideradas no fluxo efetivo. [Princípios da LGPD — Serpro](https://www7.serpro.gov.br/lgpd/menu/arquivos/os-10-principios-para-um-efetivo-tratamento-de-dados/view).

## Ordem recomendada e aceite do piloto

1. **Separar demo e dados reais; impedir resultado fictício.** Não exibir apuração financeira até haver resultado validado.
2. **Implementar persistência compartilhada e autorização.** Testar dois aparelhos, reinício e tentativas sem credencial.
3. **Fechar o fluxo Mega-Sena do piloto.** Concurso/data verificados, cadastro vazio, pagamento manual com registro temporal, foto original, apuração compartilhada e centavos exatos.
4. **Corrigir responsividade e transparência da linguagem.** Informações essenciais legíveis em 375/390/768/1280 px, modal operável por teclado e fonte visível dos resultados.
5. **Reconciliar artifacts e catálogo.** Registrar fonte e vigência em cada regra; substituir “implementado” por “planejado” onde apropriado.
6. **Expandir uma modalidade por vez.** Cada uma precisa atravessar cadastro → OCR → resultado → rateio → público → extrato; Dupla exige os dois sorteios.

Critérios para liberar o piloto: o cotista vê o mesmo bolão em outro aparelho; o público não consegue editar; falha de API não produz prêmio; valores do público e organizador coincidem; pagamentos e jogos fechados deixam histórico; centavos fecham; o bilhete original permanece acessível; número e horário do concurso foram verificados.

**Entrega desta auditoria:** relatório, evidências e ensaios de diagnóstico. Não houve alteração do código da aplicação, commit, push, deploy, envio de mensagens ou movimentação financeira. Build local foi executado e os arquivos de diagnóstico ficaram na pasta desta auditoria. Serviços externos, impressão física, precisão OCR em fotos reais e comportamento em aparelhos físicos permanecem fora da validação executada.
