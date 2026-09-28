# FilaZero — Especificação técnica da Sprint 1

> **Para:** Claude Code (implementação) · **Escopo:** as 15 histórias da Sprint 1 (67 pontos) escolhidas pelo professor · **Versão 1.2**
> **Fontes:** backlog do grupo (fichas de história), **código-fonte do protótipo Figma Make** (telas, `mock.ts`, `index.css` e as 6 specs coladas no Make) e regras combinadas com o grupo.
> **Legenda:** ✅ confirmado no protótipo (tela ou código) · ⚠️ inferido · ❌ não existe no protótipo · 🔶 conflito que o **grupo precisa decidir**
> **Modo de implementação (v1.2): MOCK.** Sem backend, sem banco de dados real. É um **app React único**, rodando inteiro no navegador, com os dados guardados em `localStorage`. Tudo que este documento descreve como rota HTTP (`POST /auth/login` etc.) é o **contrato de uma função mockada**, não uma chamada de rede real. Ver seção 0.2.

---

## 0. Como usar este documento

1. Leia o documento inteiro antes de escrever código. Em seguida crie o `CLAUDE.md` do repositório (modelo na seção 12).
2. Implemente **uma história por vez**, na ordem da seção 1.4. Cada história entrega: tipos/seed mockado + mock service + UI + testes de aceite.
3. Os critérios de aceite (Dado/Quando/Então) viram **testes automatizados**. Uma história só está pronta com esses testes verdes.
4. Onde estiver ⚠️ ou ❌ e o Figma estiver acessível, consulte o Figma antes de decidir. Se não estiver, siga a proposta do documento e registre a decisão em `docs/DECISIONS.md`.
5. **Não invente escopo.** O que não está na seção 1.2 está fora da Sprint 1. Prepare apenas os ganchos listados na seção 1.3.
6. Decisões em aberto estão na seção 10, cada uma com um default. Adote o default, registre e siga. Só pare para perguntar se a dúvida bloquear o trabalho.
7. Idioma da interface e das mensagens de erro: **pt-BR**. Código, nomes de tabela e rotas: **inglês**.
8. **Código do protótipo:** o projeto do Figma Make (React 19, Vite, Tailwind v4, `lucide-react`, `recharts`) deve ficar em `reference/figma-make/`. Ele é a referência visual **e** de comportamento: porte as telas para `src/features` e troque o import de `src/data/mock.ts` pelas chamadas aos mock services (`src/mock/services`, seção 4). Nunca importe `mock.ts` do protótipo direto no app novo — ele vira o seed de `src/mock/seed/`.

---

## 0.1 Reconciliação com o protótipo real (v1.1)

A v1.0 se baseava em 23 capturas de tela. A v1.1 foi conferida com o **código-fonte do protótipo**. **Regra de precedência: onde este documento e o protótipo divergirem, vale o protótipo**, exceto nos itens 🔶, que o grupo precisa decidir. Os blocos das seções 2 a 5, 7, 8 e 10 já estão atualizados.

| # | Tema | Na v1.0 | No protótipo real | Decisão da v1.1 |
|---|---|---|---|---|
| 1 | **CPF** | obrigatório no cadastro | **não existe** em nenhuma tela, spec ou `mock.ts` (cadastro = nome, sobrenome, celular **ou** e-mail, termos) | 🔶 manter CPF (a ficha 01 exige) como passo curto extra; o grupo atualiza o Figma |
| 2 | Login | e-mail/celular + senha | campo único; **celular → OTP de 6 dígitos**; e-mail → senha ou código; Google e Apple discretos; sem senha obrigatória no 1º passo | seguir o protótipo (OTP com provedor abstrato e stub em dev) |
| 3 | Item esgotado | some do cardápio | **fica visível, desabilitado, com selo "Esgotado"** (specs e código) | 🔶 a ficha 19 diz "some"; adotar o protótipo e reescrever o critério |
| 4 | Promoções | janela de datas em 1 item | **recorrente**: nome, itens/categorias/todos, desconto, dias da semana, horário inicial/final, ativo (ex.: Happy Hour, Seg–Sex, 17:00–19:00, −20%) | modelo novo (seção 3) |
| 5 | Planos | por estabelecimento; Essencial/Profissional/Premium | **por organização**; **Start R$ 99, Pro R$ 299, Business R$ 799**; recursos: unidades (1, 3, ilimitadas), KDS, fidelidade, relatórios, API, multi-unidade, SLA, gerente de conta, white-label. A tela admin "Planos" é **placeholder** | modelo novo; a tela admin de Planos é ❌ (proposta) |
| 6 | Status do estabelecimento | `ACTIVE`, `INACTIVE`, `SUSPENDED` | **Ativo, Em configuração, Suspenso** (+ Desativado na spec) | enum novo |
| 7 | Status operacional | `accepting_orders` (sim/não) | 4 estados: **Aceitando pedidos, Alta demanda, Pedidos pausados, Fechado**; o gestor pode "Pausar pedidos" (15 min, 30 min, 1 h, até reativar, com motivo) | campos de pausa + status derivado |
| 8 | Horários | 1 horário por dia | **dois horários**: funcionamento e pedidos pelo FilaZero, mais horários especiais por data | modelo novo |
| 9 | Perfil público | proposta | tela **"Estabelecimento"** existe ✅: nome, nome curto, telefone, e-mail, descrição, categoria, CEP, endereço, número, bairro, cidade, mapa, horários, prévia do card | seguir |
| 10 | Mesas | só grade de mesas | **Mesas e locais** (áreas Salão / Área externa / Balcão, mesas com código `M01` e QR `QR-0001`, status Ativa/Desativada) + mapa de mesas com 5 status e ações Transferir, Juntar, Fechar. O **editor visual** de planta só existe na spec ❌ | modelo com `Area` e `type` |
| 11 | Fila de espera (gestor) | Chamar, Sentado, Desistiu, Remover, reordenar | **Chamar, Atribuir mesa, Não compareceu, Remover**; colunas Pos., Cliente (nome + telefone), Pessoas, Tempo esperando; KPIs "Total na fila" e "Espera estimada". **A fila do cliente existe** (entrar, posição, "sua mesa está pronta") | ações ajustadas; UI do cliente na Sprint 3 |
| 12 | Ficha técnica | CMV % | **Margem %**: lista (Produto, Categoria, Ingredientes, Custo, Preço venda, Margem) e painel com ingredientes (qtd + custo), custo total, preço e margem | exibir margem; alerta por limite é opcional |
| 13 | Papéis da equipe | atendente, gestor | Atendente, Supervisor, Gestor, Recepção, Garçom, Cozinha, Caixa; multi-unidade: Gerente de unidade, Gestor do grupo, Administrador | enum ampliado (Sprint 1 usa 2) |
| 14 | Admin · Estabelecimentos | CRUD | tabela (Estabelecimento, Cidade, Plano, Status, Entrada, Volume hoje, Ver) + painel de detalhe + ações "Abrir como gestor" e "Suspender"; botão "Novo" sem formulário desenhado | ajustar (seção 5, história 34) |
| 15 | Admin · Usuários | filtros papel/status | busca por nome/e-mail; colunas Nome, Email, Status (Ativo/Inativo), Último acesso, Pedidos; ações Ver e Suspender; Exportar | ajustar |
| 16 | Home e navegação | pouco detalhada | **Home global** (sem cardápio) e barra inferior dinâmica: *Início · Restaurantes · Pedidos · Perfil*; dentro de um restaurante: *Início · Cardápio · Pedidos · Perfil*. **Cardápio sempre pertence a um restaurante**; sem QR é modo consulta | incorporado |
| 17 | Cores e fontes | aproximadas | **tokens reais** (seção 7): Manrope + Inter, `#E8700A`, `#7C2D3F`, `#F7F6F3` | atualizado |
| 18 | Dados de exemplo | inferidos | `src/data/mock.ts` (6 restaurantes, 9 itens, 18 mesas, fila, equipe) | seção 8 refeita |
| 19 | Total R$ 108,70 do pedido #184 | inconsistência sem causa | o erro está **no `mock.ts`**: `ORDER_184.subtotal/total = 108.70`, mas 2×18,90 + 28,90 + 22,00 = **88,70** (e o histórico mostra 108,70 para 2×IPA + 1×X-Burger = 66,70) | corrigir no Make (seção 10.3) |
| 20 | Stack do front | React + Vite + Tailwind | **Tailwind v4** (`@theme` em `index.css`, sem `tailwind.config`), `lucide-react`, `recharts`, sem React Router nem TanStack Query no protótipo | usar Tailwind v4 e React Router; **sem backend nem TanStack Query — v1.2 é modo mock (§0.2), dados em `localStorage`** |

**Decisões que só o grupo pode tomar (🔶):** (a) CPF no cadastro; (b) item esgotado visível ou oculto (a ficha 19 e o protótipo divergem); (c) preços dos planos, já que a spec do Make pede para não definir preços definitivos, mas o protótipo mostra R$ 99, R$ 299 e R$ 799. Enquanto não decidirem, use os defaults indicados neste documento.

---

## 0.2 Modo mock — por que e como (v1.2)

**Por quê:** é um trabalho de faculdade com apresentação em sala. Sem backend, sem banco, sem Docker: o projeto abre com `npm install && npm run dev` em qualquer notebook, sem servidor para configurar ou hospedar, e continua funcionando offline durante a apresentação.

**O que muda em relação às seções 3 a 6 e 9 a 12** (o resto do documento continua valendo — histórias, regras, telas, Gherkin):

1. **Uma coisa só roda: o front-end** (React + Vite + TypeScript). Não existe `apps/backend`, não existe Express, Prisma nem PostgreSQL.
2. **Toda "Entidade" da seção 3 é um `type`/`interface` TypeScript**, não uma tabela SQL. Cada entidade vira uma **coleção em `localStorage`** (`Record<string, Entidade>` serializado em JSON), sob uma chave própria (ex.: `filazero:users`, `filazero:establishments`). PK, FK, `UNIQUE` e índice viram **checagens em JavaScript** dentro do mock service (ex.: "e-mail único" = percorrer a coleção antes de gravar).
3. **Toda "API" da seção 4 e de cada história da seção 5 é uma função mockada**, não uma rota de rede. Leia `POST /auth/otp/request` como `mockApi.auth.requestOtp(input)`: mesmo nome de conceito, mesma entrada, mesma saída, os mesmos códigos de erro (`400 VALIDATION_ERROR`, `404`, `409`…) — só que lançados como `MockApiError` em vez de devolvidos por HTTP. Os Gherkins da seção 5 continuam valendo sem alterar uma linha: "recebe 409" vira "a Promise rejeita com `code: 'EMAIL_ALREADY_REGISTERED'`".
4. **Sessão sem JWT real:** ao "logar", guarde `{ userId, role, expiresAt }` em `localStorage` (`filazero:session`). Nada de assinar ou verificar token de verdade — é só um objeto de sessão. A regra "suspensão vale na próxima requisição" continua valendo porque **toda** função mockada relê o registro do usuário (`status`, `role`) antes de agir, não confia num token velho.
5. **OTP simulado:** o código de 6 dígitos aparece em um toast na tela ("Código de teste: 482913") em vez de ir por SMS. Sem provedor externo.
6. **Login social desligado por padrão:** sem backend não dá para validar um ID token do Google de verdade. Os botões "Continuar com Google/Apple" ficam **visíveis e desabilitados** ("Em breve"), como a spec já previa para a Apple.
7. **CPF sem criptografia real:** guarda-se o CPF **mascarado na exibição**, mas sem AES/HMAC (não existe segredo de servidor para proteger num app que roda inteiro no navegador do usuário). Documentar isso como limitação conhecida do protótipo acadêmico.
8. **Upload de foto:** sem `multer`/S3. Redimensionar no `canvas` (máx. 600 px) e guardar como `base64` no próprio registro do item, com aviso de que fotos grandes pesam no `localStorage` (limite de ~5 MB por origem).
9. **Tempo real sem SSE:** troque o hub de eventos por um `EventTarget`/pub-sub simples em memória (mesma aba) **e** um `BroadcastChannel('filazero')` (entre abas), para poder demonstrar "gestor esgota item → cliente vê em outra aba" na apresentação. As mesmas regras de latência (5 s, 10 s, 1 min) continuam valendo como meta de UX.
10. **Sem multi-tenant de verdade:** o "isolamento por `establishment_id`" continua sendo uma regra a **testar** (unitário: gestor do estabelecimento A não lê dados do B), só que dentro do mesmo `localStorage`, filtrando em JavaScript em vez de em SQL.
11. **"Resetar dados":** um botão (e um comando `npm run seed:reset`) que apaga as chaves `filazero:*` do `localStorage` e recarrega o seed da seção 8. Essencial para ensaiar a apresentação várias vezes a partir do mesmo estado.
12. **Isto é um mock para fins acadêmicos, não um padrão de produção.** Se o grupo migrar para um backend de verdade depois, o contrato de funções da seção 4 (mesmos nomes, entradas e códigos de erro) foi desenhado para virar rotas HTTP quase sem mudar a regra de negócio nem os testes de aceite.

---

## 1. Contexto e escopo

### 1.1 Produto

**FilaZero** é um app de pedido por QR Code sem fila para bares e restaurantes (slogan do protótipo: "Peça. Acompanhe. Retire."). O cliente pede pelo celular, o estabelecimento recebe e prepara, e o pagamento é feito pelo app.

É um sistema **multi-estabelecimento (multi-tenant)**: uma plataforma atende várias organizações (redes) e cada organização tem vários estabelecimentos (unidades). O protótipo tem 4 experiências:

| Papel | Dispositivo | Área no protótipo | O que entra na Sprint 1 |
|---|---|---|---|
| Cliente | Celular (mobile-first) | "Cliente · Mobile" | cadastro, login, buscar restaurantes, página do restaurante, cardápio, perfil |
| Atendente | Tablet | "Atendente · Tablet/KDS" | disponibilidade do cardápio |
| Gestor | Desktop | "Gestor · Dashboard" | cardápio, promoções, fichas técnicas, planta do salão, fila de espera, perfil público do estabelecimento |
| Admin | Desktop | "Admin · Plataforma" | estabelecimentos, usuários, planos |

Observação: o seletor de papéis no topo do protótipo ("Cliente / Atendente / Gestor / Admin") é um recurso do protótipo. No produto real o papel vem do login e o usuário é redirecionado para a sua área.

### 1.2 Histórias da Sprint 1 (15 histórias · 67 pontos)

Os números são os das fichas do grupo.

| Nº | História | Pts | Papel | Depende de |
|---|---|---|---|---|
| 01 | Cadastro por nome e CPF | 3 | Cliente | — |
| 03 | Menu de lanches | 5 | Cliente | 28 |
| 06 | Login (celular, e-mail, Google, Apple) | 5 | Cliente | 01 |
| 11 | Buscar restaurantes próximos | 5 | Cliente | 12, 34 |
| 12 | Página do restaurante | 3 | Cliente | 34 |
| 13 | Perfil do usuário | 3 | Cliente | 06 |
| 19 | Disponibilidade do cardápio | 3 | Atendente | 28 |
| 20 | Planta do salão | 5 | Gestor | 34, 37 |
| 21 | Fila de espera | 5 | Gestor | 20, 37 |
| 28 | Cadastro e edição de cardápio | 5 | Gestor | 34, 37 |
| 29 | Promoções e descontos | 5 | Gestor | 28, 37 |
| 31 | Fichas técnicas | 5 | Gestor | 28, 37 |
| 34 | Estabelecimentos | 5 | Admin | 06 |
| 36 | Usuários da plataforma | 5 | Admin | 06 |
| 37 | Planos de assinatura | 5 | Admin | 34 |
| | **Total** | **67** | | |

### 1.3 Fora da Sprint 1 (mas deixe os ganchos prontos)

Fora de escopo: pedido, QR Code de mesa, carrinho, pagamento, notificação push de "pedido pronto", acompanhamento de pedido, mapa de mesas operacional, comandas, cozinha/KDS, reservas, fidelidade/cashback, dashboards, suporte, incidentes, integrações, métricas, auditoria (tela), configurações da plataforma.

Ganchos que **devem** existir desde já, para não haver retrabalho:

- `dining_tables.qr_token` único por mesa, gerado na criação (usado pelo QR na Sprint 2).
- `menu_items.is_available` e `menu_items.is_featured` (base do selo "+ pedido").
- Status operacional **derivado** do estabelecimento (`orders_paused_*`, horário de pedidos e `high_demand`): Aceitando pedidos, Alta demanda, Pedidos pausados e Fechado. O QR "Bar fechado" da Sprint 2 usa o mesmo cálculo.
- Tabela `notifications` + interface `NotificationService` com canal `IN_APP` (push, SMS e WhatsApp entram depois).
- Tabela `audit_logs` append-only e helper `audit.log(...)`.
- Colunas `users.deleted_at` e `users.anonymized_at` (exclusão de conta/LGPD é da Sprint 2).
- Feature flags por variável de ambiente, todas `false` na Sprint 1: `ORDERING_ENABLED`, `LOYALTY_ENABLED`, `RESERVATIONS_ENABLED`, `AUTH_APPLE_ENABLED`. Com `ORDERING_ENABLED=false`, o botão "+" do cardápio, o botão "Escanear QR Code" e o botão "Reservar" ficam ocultos.

### 1.4 Ordem de implementação recomendada

| Fase | Histórias | Por quê |
|---|---|---|
| 0 — Fundação | projeto Vite único, `src/mock/types.ts`, `storage.ts`, `errors.ts`, `events.ts`, seed, sessão (Zustand + localStorage), RBAC, tenant guard, audit log, shells por papel | tudo depende disso |
| 1 — Identidade | 01 → 06 → 13 | sem usuário não há papel nem tenant |
| 2 — Plataforma | 34 → 37 → 36 | cria estabelecimentos, planos (entitlements) e equipes que as outras histórias exigem |
| 3 — Vitrine | 12 → 11 | perfil público antes da busca |
| 4 — Catálogo | 28 → 03 → 19 → 29 → 31 | o gestor cadastra, o cliente vê, o atendente ajusta |
| 5 — Salão | 20 → 21 | planta antes da fila |

---

## 2. BLOCO 1 — Requisitos Funcionais

### Identidade e acesso
- **RF01** — Cadastro em passos curtos: passo 1 nome e sobrenome ✅; passo 2 contato — **celular** (DDD, número, código OTP) **ou e-mail** (senha e confirmação, com requisitos de senha atualizados enquanto digita) ✅; 🔶 **CPF** (não existe no protótipo; a ficha 01 exige); termos obrigatórios e opt-in de marketing em checkbox **separado** ✅.
- **RF02** — CPF: validar dígitos verificadores, rejeitar sequências repetidas, único no sistema, armazenar cifrado + hash HMAC, exibir mascarado, imutável por autoatendimento.
- **RF03** — Login por campo único "Celular ou e-mail" ✅. Celular → OTP de 6 dígitos (estados: digitando, validando, incorreto, expirado, muitas tentativas, sem conexão; reenvio após contagem). E-mail → senha ou código por e-mail. Emite access token (15 min) e refresh token rotativo (30 dias).
- **RF04** — Login social Google (real) e Apple (adaptador atrás de `AUTH_APPLE_ENABLED`). Vincula por e-mail verificado.
- **RF05** — Sessão: logout revoga o refresh token. Usuário suspenso é barrado na próxima requisição.
- **RF06** — Perfil: ver e editar nome, sobrenome, e-mail e celular. Trocar celular ou e-mail exige **nova verificação por OTP**. Alterações refletidas imediatamente.
- **RF07** — Endereços do cliente (Casa, Trabalho…): CEP, rua, número, complemento, bairro, cidade e referência opcional; criar, editar, remover, definir um padrão.

### Vitrine (cliente)
- **RF08** — Buscar estabelecimentos por geolocalização ou cidade escolhida. Chips: Todos, Aberto agora, Mais próximos, Menor espera, Bares, Restaurantes. Ordenação: Recomendados, Mais próximos, Menor espera, Melhor avaliados. Busca por nome, tipo, culinária, bairro e item do cardápio. Lista ou mapa. Só aparecem estabelecimentos `ACTIVE`.
- **RF09** — Página do estabelecimento: capa, nome, nota, distância, espera, status (Aceitando pedidos, Alta demanda, Pedidos pausados, Fechado), tags, endereço com "Como chegar", horário de hoje, botão "Ver cardápio" e o aviso "Você pode consultar o cardápio. Para fazer um pedido, confirme sua presença pelo QR Code" ✅. "Reservar" e "Escanear QR" ficam ocultos por flag.
- **RF10** — Cardápio público, **sempre dentro do contexto de um restaurante**: chips de categoria (Mais pedidos, Cervejas, Drinks, Porções, Lanches, Combos), busca, cards com foto, nome, descrição e preço; selos "+ pedido" e de promoção (ex.: "Happy Hour −20%"); itens esgotados **visíveis e desabilitados** com selo "Esgotado" 🔶; sem QR é modo consulta. Carrega em até 2 s.

### Operação (atendente e gestor)
- **RF11** — Alternar item entre "Disponível" e "Esgotado" (atendente na tela "Cardápio" com toggles; gestor pelo botão de status na tabela do cardápio). Propaga ao cliente em até 5 s e registra histórico.
- **RF12** — CRUD de categorias do cardápio (ordem, ativa/inativa).
- **RF13** — CRUD de itens (nome, descrição, preço em centavos, categoria, foto, destaque) com exclusão lógica. Reflete no cliente em até 1 min.
- **RF14** — O gestor edita a tela "Estabelecimento" ✅: nome, nome curto, descrição, categoria, telefone, e-mail, logo, capa, endereço (CEP, número, complemento, bairro, cidade, estado) com ajuste do ponto no mapa, tags, dois horários (funcionamento e pedidos pelo FilaZero) por dia, horários especiais por data e prévia do card.
- **RF15** — CRUD de ingredientes com custo por unidade de compra.
- **RF16** — Ficha técnica por item: linhas (ingrediente, quantidade e unidade), rendimento, custo total calculado automaticamente, preço de venda e **margem %** ✅. Lista com filtro por categoria. Alerta por limite de custo é opcional.
- **RF17** — CRUD de promoções **recorrentes** ✅: nome, escopo (itens, categorias ou todos), desconto (% ou preço fixo), dias da semana, horário inicial e final, ativo/inativo. Ex.: Happy Hour, Seg–Sex, 17:00–19:00, −20%.
- **RF18** — Aplicação e encerramento automáticos pela janela semanal (dia + horário no fuso do estabelecimento, com suporte a janela que cruza a meia-noite), calculados na leitura, sem job. Havendo mais de uma promoção no mesmo item, vale a de menor preço final (nunca acumula).
- **RF19** — Mesas e locais ✅: áreas (Salão, Área externa, Balcão…) e mesas com código, nome, QR e status Ativa/Desativada. Mapa de mesas com status Livre, Ocupada, Reservada, Aguardando pagamento, Atenção e Indisponível ✅. Editor visual de planta (arrastar; mesa quadrada ou redonda, balcão, área, ponto de retirada) ❌ só na spec.
- **RF20** — Liberar, ocupar e bloquear mesa (status mínimo, necessário para a fila). Transferir, Juntar e Fechar mesa aparecem no protótipo, mas são das Sprints 2 e 3.
- **RF21** — Toda mesa nasce com `qr_token` único (uso na Sprint 2).
- **RF22** — Fila de espera (gestor/recepção) ✅: adicionar (nome, pessoas, telefone), **Chamar, Atribuir mesa, Não compareceu, Remover**; indicadores "Total na fila" e "Espera estimada". A tela do cliente (entrar na fila, posição, "sua mesa está pronta") existe no protótipo: a API nasce agora e a UI do cliente entra na Sprint 3.
- **RF23** — Tempo esperando por entrada (minutos desde que entrou) e estimativa de espera (heurística da história 21).
- **RF24** — Ao liberar uma mesa compatível, notificar automaticamente o próximo da fila em até 10 s (notificação in-app + evento em tempo real para a tela do gestor).

### Plataforma (admin)
- **RF25** — CRUD de estabelecimentos com status **Ativo, Em configuração, Suspenso, Desativado**. Suspenso e Desativado somem da busca e param de aceitar pedidos imediatamente. Ações: Ver, Suspender, (futuro) Abrir como gestor.
- **RF26** — Usuários: buscar por nome e e-mail, filtrar por papel e status, ver último acesso e nº de pedidos, alterar papel e vínculos, suspender e reativar, consultar histórico, exportar.
- **RF27** — CRUD de planos (Start, Pro, Business: preço em centavos, recursos e limites) e assinatura **por organização**.
- **RF28** — Entitlements: bloquear recursos e limites fora do plano (limite de unidades e recursos do plano) com efeito imediato.

### Transversais
- **RF29** — RBAC e isolamento por tenant em toda rota e toda query. Um gestor do estabelecimento A nunca acessa dados do B.
- **RF30** — Auditoria de ações sensíveis: troca de papel, suspensão, mudança de status de estabelecimento, troca de plano, disponibilidade de item, criação e edição de promoção.

---

## 3. BLOCO 2 — Formato dos dados mockados

> **Modo mock (seção 0.2):** o que seria um "Modelo de Banco de Dados" aqui é o **formato dos dados guardados em `localStorage`**. Cada "Entidade" abaixo é um `type` TypeScript (arquivo `src/mock/types.ts`) e uma coleção `Record<string, Entidade>` sob uma chave `filazero:<coleção>`. PK, FK, `UNIQUE`, índice e "transação" (usados nas notas de cada entidade) são a forma de descrever a **regra**, não uma instrução de SQL — implemente-os como checagens em JavaScript dentro do mock service correspondente. Onde uma nota disser "índice parcial único" ou "checagem no banco", leia como "validar isso na função mockada antes de gravar, dentro de um `try/catch` que desfaz a gravação inteira se algo falhar no meio" (não existe transação real de banco; simule atomicidade escrevendo tudo em memória e só persistindo em `localStorage` no fim, se nada lançou erro).

**Convenções (valem para todas as coleções):**
- `id` (string, UUID gerado com `crypto.randomUUID()`). Todo registro tem `createdAt` e `updatedAt` (ISO-8601 UTC, `camelCase` — já não é `snake_case`: o mock usa o mesmo formato que o front consome, sem uma camada de banco no meio).
- **Dinheiro sempre em centavos (`number` inteiro).** Nunca `float`/ponto flutuante para valores monetários. Percentuais de desconto são inteiros (ex.: 15 = 15%).
- **"Tenant":** a chave de isolamento é `establishmentId`. Toda entidade operacional (cardápio, promoções, planta, fila etc.) carrega esse campo e **toda função de leitura filtra por ele** antes de devolver dados — é a mesma regra de isolamento de um sistema multi-tenant real, só que aplicada em JS. `organizationId` agrupa unidades de uma rede.
- Nome de coleção em `camelCase` plural (ex.: `diningTables`, `menuItems`), igual ao nome usado no TypeScript.
- Cada coleção tem uma função `seed<Nome>()` que a repovoa a partir da seção 8, chamada por `resetMockData()` (ver seção 0.2, item 11).

### Enums

| Enum | Valores |
|---|---|
| `UserRole` | `CUSTOMER`, `STAFF`, `PLATFORM_ADMIN` |
| `UserStatus` | `ACTIVE`, `SUSPENDED`, `DELETED`. O "Inativo" da tela de usuários do admin ✅ é **derivado** (sem acesso há mais de 30 dias) |
| `MembershipRole` | `ATTENDANT`, `RECEPTION`, `WAITER`, `KITCHEN`, `CASHIER`, `SUPERVISOR`, `MANAGER`. Em vínculo de unidade, `MANAGER` = gerente de unidade; em vínculo de organização = gestor do grupo. A Sprint 1 exercita só `ATTENDANT` e `MANAGER` |
| `EstablishmentStatus` | `ACTIVE` (Ativo ✅), `SETUP` (Em configuração ✅), `SUSPENDED` (Suspenso ✅), `DEACTIVATED` (Desativado) |
| `EstablishmentCategory` | `BAR`, `RESTAURANT`, `BURGER_HOUSE`, `PIZZERIA`, `CAFE`, `SNACK_BAR`, `CANTINA` |
| `OperationalStatus` (**derivado, não gravado**) | `OPEN` (Aceitando pedidos), `BUSY` (Alta demanda), `PAUSED` (Pedidos pausados), `CLOSED` (Fechado) |
| `HoursKind` | `BUSINESS` (funcionamento), `ORDERS` (pedidos pelo FilaZero) |
| `SubscriptionStatus` | `TRIAL`, `ACTIVE`, `PAST_DUE`, `CANCELED` |
| `BillingPeriod` | `MONTHLY`, `YEARLY` |
| `PlanFeatureKey` | `MAX_UNITS` (limite), `KDS`, `LOYALTY`, `ADVANCED_REPORTS`, `API_ACCESS`, `MULTI_UNIT`, `DEDICATED_SLA`, `ACCOUNT_MANAGER`, `WHITE_LABEL` (todos ✅ no protótipo) e, ⚠️ propostos para dar efeito às histórias desta sprint, `PROMOTIONS`, `RECIPE_SHEETS`, `WAITLIST` |
| `PromotionScope` | `ALL`, `CATEGORIES`, `ITEMS` |
| `DiscountType` | `PERCENT`, `FIXED_PRICE_CENTS` (preço promocional fixo, ex.: de R$ 14 por R$ 9) |
| `IngredientUnit` | `UN`, `G`, `KG`, `ML`, `L`, `CX` (caixa), `PCT` (pacote) |
| `LocationType` | `TABLE`, `COUNTER` (balcão), `AREA_ZONE`, `PICKUP_POINT` |
| `TableShape` | `SQUARE`, `ROUND`, `RECTANGLE` |
| `TableStatus` | `AVAILABLE` (Livre), `OCCUPIED` (Ocupada), `RESERVED` (Reservada), `CALLING` (Atenção), `AWAITING_PAYMENT` (Aguardando pgto), `UNAVAILABLE` (Indisponível) ✅ |
| `WaitlistStatus` | `WAITING`, `NOTIFIED` (Chamado), `SEATED`, `NO_SHOW`, `CANCELED` |
| `NotificationChannel` | `IN_APP` (futuro: `PUSH`, `SMS`, `WHATSAPP`) |
| `OAuthProvider` | `GOOGLE`, `APPLE` |
| `OtpPurpose` | `LOGIN`, `SIGNUP`, `CHANGE_CONTACT` |
### Entidade: User
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| first_name | VARCHAR(80) | ✅ passo 1 do cadastro |
| last_name | VARCHAR(120) | ✅ |
| email | VARCHAR(254) | único, minúsculo, nulo permitido |
| email_verified_at | TIMESTAMPTZ | |
| phone_e164 | VARCHAR(16) | único, formato `+5519999999999`, nulo permitido |
| phone_verified_at | TIMESTAMPTZ | preenchido pelo OTP ✅ |
| passwordHash | string | 🔧 modo mock: sem hash real (spec §0.2); nulo se o usuário só entra por OTP ou login social. Guardar só para simular a checagem — nunca usar senha real de ninguém aqui |
| cpf_encrypted | BYTEA | 🔶 AES-256-GCM (chave `CPF_ENC_KEY`); nulo se o grupo decidir tirar o CPF |
| cpf_hash | CHAR(64) | 🔶 HMAC-SHA256 (`CPF_HASH_PEPPER`) do CPF só com dígitos; **único**; usado para busca e unicidade |
| role | UserRole | default `CUSTOMER` |
| status | UserStatus | default `ACTIVE` |
| token_version | INTEGER | default 0; incrementa ao suspender/trocar papel (invalida access tokens) |
| consent_version | VARCHAR(20) | versão dos termos aceitos |
| consent_accepted_at | TIMESTAMPTZ | |
| marketing_opt_in | BOOLEAN | default false; checkbox **separado** do aceite dos termos ✅ |
| age_confirmed_at | TIMESTAMPTZ | confirmação de 18+ (componente do protótipo ✅; regras definitivas podem mudar) |
| last_login_at | TIMESTAMPTZ | alimenta "Último acesso" e o "Inativo" derivado |
| deleted_at / anonymized_at | TIMESTAMPTZ | gancho da exclusão LGPD (Sprint 2) |

`CHECK (email IS NOT NULL OR phone_e164 IS NOT NULL)`.

### Entidade: OtpChallenge
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| identifier | VARCHAR(254) | celular E.164 ou e-mail |
| channel | VARCHAR(10) | `SMS` ou `EMAIL` |
| purpose | OtpPurpose | |
| code_hash | CHAR(64) | SHA-256 do código de 6 dígitos; nunca guardar o código |
| expires_at | TIMESTAMPTZ | 5 minutos |
| attempts | SMALLINT | máximo 5 → estado "muitas tentativas" ✅ |
| consumed_at | TIMESTAMPTZ | |
| resend_available_at | TIMESTAMPTZ | contagem de reenvio (o protótipo mostra 00:42) ✅ |
### Entidade: OAuthAccount
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK User) | |
| provider | OAuthProvider | |
| provider_user_id | VARCHAR(190) | `UNIQUE(provider, provider_user_id)` |
| email | VARCHAR(254) | e-mail informado pelo provedor |

### Entidade: RefreshToken
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK User) | |
| token_hash | CHAR(64) | SHA-256 do token opaco; nunca guardar o token |
| family_id | UUID | rotação com detecção de reuso: reuso revoga a família inteira |
| expires_at | TIMESTAMPTZ | |
| revoked_at | TIMESTAMPTZ | |
| user_agent / ip | VARCHAR | |

### Entidade: Address
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK User) | |
| label | VARCHAR(40) | "Casa", "Trabalho" |
| street, number, complement, neighborhood | VARCHAR | |
| city | VARCHAR(80) | |
| state | CHAR(2) | |
| zip | CHAR(8) | só dígitos |
| lat, lng | DECIMAL(9,6) | opcional |
| is_default | BOOLEAN | no máximo 1 por usuário (índice parcial único) |

### Entidade: Organization
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | ex.: "Grupo Bar do Zé" (3 unidades: Cambuí, Taquaral, Centro) ✅ |
| name | VARCHAR(120) | CRUD (tela "Nova organização" ✅) é da Sprint 4; na Sprint 1 só via seed e via criação automática |

**Toda unidade pertence a uma organização.** Estabelecimento avulso ganha uma organização própria criada automaticamente. A **assinatura (plano) é da organização** ✅ (o admin mostra o plano por organização e por estabelecimento).
### Entidade: Establishment (raiz do tenant)
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| organization_id | UUID (FK Organization) | **obrigatório** |
| name | VARCHAR(120) | ex.: "Bar do Zé" ✅ |
| short_name | VARCHAR(60) | "Nome curto" ✅ |
| unit_label | VARCHAR(80) | ex.: "Cambuí" (o admin lista "Bar do Zé Cambuí" ✅) |
| category | EstablishmentCategory | ✅ lista do formulário do gestor |
| description | TEXT | |
| logo_url / cover_photo_url | VARCHAR(500) | logo e foto de capa ✅ |
| phone / email / website | VARCHAR | ✅ telefone e e-mail; site/redes opcionais |
| status | EstablishmentStatus | default `SETUP`; vira `ACTIVE` ao concluir a configuração |
| status_reason | TEXT | motivo da suspensão ou desativação |
| street, number, complement, neighborhood, city, state, zip | VARCHAR | ex.: "Rua das Flores, 148 · Centro" ✅ |
| lat, lng | DECIMAL(9,6) | obrigatórios para aparecer na busca; o gestor ajusta o ponto no mapa ✅ |
| timezone | VARCHAR(40) | default `America/Sao_Paulo` |
| tags | TEXT[] | ex.: "Cervejas artesanais", "Petiscos" ✅ |
| rating_avg / rating_count | NUMERIC(2,1) / INTEGER | ex.: 4,7 e 312 ✅; somente leitura na Sprint 1 |
| wait_min_minutes / wait_max_minutes | INTEGER | espera média, ex.: 12–18 ✅ (manual na Sprint 1) |
| high_demand | BOOLEAN | default false; "Alta demanda" manual até a Sprint 3 (capacidade) |
| orders_paused_at | TIMESTAMPTZ | preenchido = pedidos pausados ✅ |
| orders_paused_until | TIMESTAMPTZ | nulo com `orders_paused_at` = "até eu reativar" |
| orders_pause_reason | VARCHAR(200) | ex.: "Cozinha sobrecarregada" |
| avg_table_turnover_min | INTEGER | default 45; usado na estimativa da fila |
| menu_version | INTEGER | default 0; incrementa (na mesma transação) a cada mudança de cardápio |
| created_by | UUID (FK User) | |

**Status operacional (derivado, nunca gravado)**, nesta ordem: `PAUSED` se há pausa vigente → `CLOSED` se fora do horário de pedidos (ou do funcionamento) → `BUSY` se `high_demand` ou `wait_max_minutes >= 25` → `OPEN`. Só `OPEN` e `BUSY` aceitam novos pedidos; `PAUSED` e `CLOSED` deixam o cardápio em modo consulta ✅.

Índices: `(status)`, `(organization_id)`, `(lat, lng)`, GIN em `tags`, `pg_trgm` em `name`.
### Entidade: EstablishmentHours
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| establishment_id | UUID (FK) | `UNIQUE(establishment_id, kind, weekday)` |
| kind | HoursKind | `BUSINESS` (funcionamento) ou `ORDERS` (pedidos pelo FilaZero) ✅ |
| weekday | SMALLINT | 0 (domingo) a 6 (sábado) |
| opens_at / closes_at | TIME | se `closes_at < opens_at`, fecha no dia seguinte (ex.: 17:00 → 01:00 ✅) |
| is_closed | BOOLEAN | "Fechado neste dia" ✅ |

### Entidade: EstablishmentSpecialHours
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| establishment_id | UUID (FK) | `UNIQUE(establishment_id, kind, date)` |
| kind | HoursKind | |
| date | DATE | ex.: 07/09 ✅ (spec) |
| is_closed | BOOLEAN | "Fechado" |
| opens_at / closes_at | TIME | ex.: 18:00 → 23:00 |

Regra: horário especial da data **sobrescreve** o horário semanal.
### Entidade: EstablishmentPhoto
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| establishment_id | UUID (FK) | |
| url | VARCHAR(500) | |
| sort_order | INTEGER | |

### Entidade: Membership (vínculo de equipe)
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK User) | |
| establishment_id | UUID (FK) | preencha este **ou** o `organization_id` |
| organization_id | UUID (FK) | vínculo de rede: acesso a todas as unidades (seletor de unidade do gestor ✅) |
| role | MembershipRole | ver o enum; a matriz de permissões do protótipo está em `ROLE_PERMISSIONS` (`ManagerApp.tsx`) |

`CHECK ((establishment_id IS NULL) <> (organization_id IS NULL))`.
### Entidade: Plan
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| code | VARCHAR(40) | único: `START`, `PRO`, `BUSINESS` ✅ |
| name | VARCHAR(80) | "FilaZero Start / Pro / Business" ✅ |
| price_cents | INTEGER | 9900, 29900 e 79900 no protótipo ✅ (🔶 a spec pede para não fixar preços definitivos: tratar como seed editável) |
| billing_period | BillingPeriod | mensal ("/mês" ✅) |
| is_active | BOOLEAN | |

### Entidade: PlanFeature
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| plan_id | UUID (FK Plan) | `UNIQUE(plan_id, key)` |
| key | PlanFeatureKey | |
| int_value | INTEGER | para limites (`MAX_UNITS`); nulo = ilimitado |
| bool_value | BOOLEAN | para recursos liga/desliga |

### Entidade: Subscription
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| **organization_id** | UUID (FK Organization) | a assinatura é da **organização** |
| plan_id | UUID (FK Plan) | |
| status | SubscriptionStatus | |
| started_at / ends_at / canceled_at | TIMESTAMPTZ | |
| next_billing_at | TIMESTAMPTZ | "Próximo vencimento" ✅ (cobrança real é da Sprint 5) |

Índice parcial único: no máximo 1 assinatura `TRIAL` ou `ACTIVE` por organização. O estabelecimento herda o plano da sua organização.
### Entidade: MenuCategory
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| establishment_id | UUID (FK) | `UNIQUE(establishment_id, name)` |
| name | VARCHAR(60) | ex.: Cervejas, Drinks, Porções, Lanches ✅ |
| sort_order | INTEGER | |
| is_active | BOOLEAN | |

### Entidade: MenuItem
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| establishment_id | UUID (FK) | |
| category_id | UUID (FK MenuCategory) | |
| name | VARCHAR(120) | |
| description | VARCHAR(400) | |
| price_cents | INTEGER | maior que 0 |
| photo_url | VARCHAR(500) | |
| is_available | BOOLEAN | default true; `false` = "Esgotado" ✅ |
| is_featured | BOOLEAN | selo "+ pedido" ✅ (no `mock.ts` é o campo `popular`) |
| is_active | BOOLEAN | default true |
| sort_order | INTEGER | |
| prep_station | VARCHAR(20) | gancho do KDS por estação (BAR, CHAPA, FRITADEIRA…) — spec da fase 3 |
| prep_time_min | SMALLINT | gancho: tempo padrão de preparo |
| deleted_at | TIMESTAMPTZ | exclusão lógica (pedidos futuros precisam do histórico) |

Ganchos para a Sprint 2 (não criar agora): `MenuItemOptionGroup` e `MenuItemOption` (personalização, adicionais e observação da tela de detalhe do item ✅).
Índice: `(establishment_id, category_id, is_active, is_available)`.
### Entidade: Promotion (recorrente)
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| establishment_id | UUID (FK) | |
| name | VARCHAR(80) | ex.: "Happy Hour", "Combo da semana", "Quarta universitária" ✅ |
| scope | PromotionScope | itens, categorias ou todos ("Todos" ✅) |
| discount_type | DiscountType | |
| discount_value | INTEGER | `PERCENT`: 1 a 95 · `FIXED_PRICE_CENTS`: preço final em centavos (deve ser menor que o preço do item) |
| weekdays | SMALLINT[] | 0 a 6; "Seg–Sex", "Toda semana", "Qua" ✅ |
| start_time / end_time | TIME | ex.: 17:00–19:00; "00:00–23:59" = o dia todo ✅. Se `end_time < start_time`, cruza a meia-noite |
| valid_from / valid_until | DATE | opcionais (campanha com data) |
| label | VARCHAR(40) | selo mostrado ao cliente, ex.: "Happy Hour -20%" ✅ (gerado se vazio) |
| is_active | BOOLEAN | "Ativo / Inativo" ✅ |
| created_by | UUID (FK User) | |

### Entidade: PromotionTarget
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| promotion_id | UUID (FK Promotion) | |
| menu_item_id | UUID (FK MenuItem) | preencha este **ou** o `category_id`; sem linhas quando `scope = ALL` |
| category_id | UUID (FK MenuCategory) | |

Não há constraint de exclusão: se mais de uma promoção vale no mesmo item no mesmo instante, **vence a de menor preço final** (não acumula).
### Entidade: Ingredient
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| establishment_id | UUID (FK) | `UNIQUE(establishment_id, name)` |
| name | VARCHAR(80) | ex.: "Pão de hambúrguer", "Queijo cheddar" ✅ |
| purchase_unit | IngredientUnit | unidade em que o ingrediente é comprado |
| unit_cost_cents | INTEGER | custo **por unidade de compra** (ex.: R$ 40,00/kg = 4000) |
| deleted_at | TIMESTAMPTZ | |

Dimensões para conversão: massa (`G`, `KG`), volume (`ML`, `L`) e contagem (`UN`, `CX`, `PCT`, **sem conversão entre si**: "não misturar quantidades sem unidade clara" ✅).
### Entidade: RecipeSheet (ficha técnica)
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| establishment_id | UUID (FK) | |
| menu_item_id | UUID (FK MenuItem) | **único** (1 ficha por item) |
| yield_portions | INTEGER | default 1 |
| method | TEXT | modo de preparo (opcional) |
| max_cost_percent | SMALLINT | default 40; limite de CMV (custo ÷ preço) para o alerta opcional |

### Entidade: RecipeSheetLine
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| recipe_sheet_id | UUID (FK RecipeSheet) | `UNIQUE(recipe_sheet_id, ingredient_id)` |
| ingredient_id | UUID (FK Ingredient) | |
| quantity | NUMERIC(12,3) | |
| unit | IngredientUnit | mesma dimensão do ingrediente (massa, volume ou unidade) |

### Entidade: Area
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| establishment_id | UUID (FK) | `UNIQUE(establishment_id, name)` |
| name | VARCHAR(60) | "Salão", "Área externa", "Balcão" ✅ |
| sort_order | INTEGER | |
| is_active | BOOLEAN | |

### Entidade: FloorPlan
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| establishment_id | UUID (FK) | **único** (1 planta por unidade no MVP) |
| name | VARCHAR(80) | |
| grid_cols / grid_rows | INTEGER | default 6 × 3 (o mapa do protótipo é uma grade de 6 colunas ✅) |

### Entidade: DiningTable (`dining_tables`)
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| establishment_id | UUID (FK) | `UNIQUE(establishment_id, code)` |
| area_id | UUID (FK Area) | |
| floor_plan_id | UUID (FK FloorPlan) | |
| type | LocationType | `TABLE` (default), `COUNTER`, `AREA_ZONE`, `PICKUP_POINT` (spec da fase 3) |
| code | VARCHAR(10) | código interno, ex.: `M01`, `M21`, `BLC` ✅ |
| label | VARCHAR(40) | nome exibido, ex.: "Mesa 01" ✅ |
| capacity | SMALLINT | 1 a 30; nulo para não-mesa |
| shape | TableShape | |
| grid_x, grid_y, grid_w, grid_h | INTEGER | posição e tamanho em células da grade; sem sobreposição |
| status | TableStatus | default `AVAILABLE` |
| qr_token | CHAR(32) | único, aleatório (128 bits); o protótipo mostra códigos como `QR-0001` ✅ — uso na Sprint 2 |
| is_active | BOOLEAN | "Ativa / Desativada" ✅ |
### Entidade: WaitlistEntry
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| establishment_id | UUID (FK) | |
| user_id | UUID (FK User) | nulo para cliente sem conta (o gestor adiciona nome e telefone ✅) |
| customer_name | VARCHAR(80) | |
| phone_e164 | VARCHAR(16) | |
| party_size | SMALLINT | 1 a 30 ("Pessoas" ✅) |
| status | WaitlistStatus | default `WAITING` |
| position | INTEGER | ordem na fila ("Pos." ✅) |
| estimated_wait_minutes | INTEGER | cache da estimativa |
| notified_at / seated_at / canceled_at | TIMESTAMPTZ | "Tempo esperando" = agora − `created_at` ✅ |
| notified_table_id | UUID (FK DiningTable) | mesa liberada que motivou o "Chamar" |
| seated_table_id | UUID (FK DiningTable) | mesa definida em "Atribuir mesa" ✅ |

Índice: `(establishment_id, status, position)`.
### Entidade: Notification
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| user_id | UUID (FK User) | nulo se o destinatário não tem conta |
| establishment_id | UUID (FK) | |
| channel | NotificationChannel | |
| type | VARCHAR(40) | ex.: `WAITLIST_TABLE_READY` |
| title / body | VARCHAR | |
| payload | JSONB | |
| read_at | TIMESTAMPTZ | |

### Entidade: AuditLog (append-only)
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| actor_user_id | UUID (FK User) | |
| establishment_id | UUID (FK) | nulo para ações da plataforma |
| entity | VARCHAR(40) | ex.: `User`, `Establishment`, `MenuItem`, `Subscription`, `Promotion` |
| entity_id | UUID | |
| action | VARCHAR(40) | ex.: `ROLE_CHANGED`, `SUSPENDED`, `AVAILABILITY_CHANGED`, `PLAN_CHANGED` |
| before / after | JSONB | |
| ip | VARCHAR(45) | |

Sem `UPDATE` nem `DELETE` para o usuário da aplicação (revogue por GRANT).

### Relações
- Organization tem muitos Establishment (1:N) e 1 Subscription ativa (1:1 lógico).
- Establishment tem muitos MenuCategory, MenuItem, Promotion, Ingredient, RecipeSheet, DiningTable, WaitlistEntry, Membership, EstablishmentHours e EstablishmentPhoto (1:N).
- Establishment tem 1 FloorPlan (1:1) e muitas Area e DiningTable. A assinatura (Subscription) é da **Organization**, e o estabelecimento herda o plano dela.
- MenuCategory tem muitos MenuItem (1:N). MenuItem tem 1 RecipeSheet (1:1) e muitas Promotion (1:N).
- RecipeSheet tem muitas RecipeSheetLine (1:N). RecipeSheetLine pertence a 1 Ingredient (N:1).
- Plan tem muitas PlanFeature (1:N) e muitas Subscription (1:N).
- User tem muitos Address, OAuthAccount, RefreshToken e Membership (1:N).

### Operações que exigem transação
1. **Cadastro:** `User` + consentimento na mesma transação.
2. **Suspender usuário:** atualizar `status` + incrementar `token_version` + revogar refresh tokens + `AuditLog`.
3. **Trocar plano:** encerrar a assinatura atual + criar a nova + `AuditLog`.
4. **Mudança de cardápio:** alteração do item/categoria + `establishment.menuVersion = menuVersion + 1` (+ evento `menu.updated`, emitido depois de gravar no `localStorage`).
5. **Criar/editar promoção:** promoção + alvos (`PromotionTarget`) na mesma transação; sem verificação de sobreposição (vence o menor preço final).
6. **Salvar ficha técnica:** apagar e recriar as linhas junto com o cabeçalho.
7. **Reordenar fila:** renumerar `position` de todos os `WAITING`.
8. **Liberar mesa:** `status = AVAILABLE` + escolher e marcar o próximo da fila (`NOTIFIED`) + criar `Notification`. O evento em tempo real sai **depois** do commit.
9. **Salvar planta:** upsert em lote das mesas com validação de sobreposição de células e de código único.

---

## 4. BLOCO 3 — Arquitetura + Stack (modo mock)

### Visão geral
**Um único app React (SPA)**, sem backend e sem banco real (seção 0.2). Quatro áreas por papel (cliente, atendente, gestor, admin), escolhidas pela sessão mockada guardada em `localStorage`. Toda regra de negócio que estaria num backend — validação, RBAC, isolamento por estabelecimento, entitlements do plano, cálculo de promoção e de ficha técnica, notificação da fila — mora numa camada de **mock services** dentro do próprio front, chamada diretamente (sem `fetch`/HTTP), mas com a mesma assinatura, os mesmos nomes de erro e a mesma forma de resposta que um backend real teria. Tempo real via `EventTarget` (mesma aba) + `BroadcastChannel` (entre abas).

### Stack (padrão da equipe; troque só com justificativa em `docs/DECISIONS.md`)
- **App único:** React 19 + Vite + TypeScript, **Tailwind CSS v4** (como no protótipo: tokens em `@theme` no `index.css`, sem `tailwind.config`), `lucide-react` (ícones), React Router DOM, Zustand (sessão e estado global), React Hook Form + Zod (formulários e validação, cliente **e** dentro dos mock services), `recharts` (gráficos futuros), `dnd-kit` (arrastar e soltar da planta), Leaflet + OpenStreetMap (mapa da busca).
- **Persistência:** `localStorage` via um wrapper fino (`src/mock/storage.ts`) com `get/set/remove` tipados e `JSON.parse`/`stringify` centralizados; `IndexedDB` só se algum conjunto de dados (ex.: fotos) estourar o limite de ~5 MB do `localStorage`.
- **Sem:** Node/Express, Prisma, PostgreSQL, JWT/Bcrypt reais, Docker, Helmet, `multer`, `pino`. Nada disso existe no projeto.
- **Testes:** Vitest + Testing Library (unidade e integração contra os mock services), Playwright (E2E, tudo no navegador, sem subir servidor além do `vite dev`).
- **Integrações:** nenhuma integração externa real nesta sprint (Google/Apple ficam desligados por flag; ver seção 0.2, item 6).

### Estrutura de pastas
```
filazero/
  src/
    app/                    # providers, router, guards (por papel)
    layouts/                # CustomerLayout, AttendantLayout, ManagerLayout, AdminLayout
    features/
      auth/ profile/ discovery/ menu/
      attendant/ manager/ admin/
    components/             # ui: Button, Card, Chip, Toggle, StatusPill, Modal...
    mock/
      types.ts              # todas as entidades da seção 3, como type/interface
      storage.ts            # wrapper do localStorage
      seed/                 # dados da seção 8, um arquivo por coleção
      services/
        auth.ts              # register, login, social (desligado), refresh de sessão, logout
        users.ts             # /me, endereços, admin de usuários
        establishments.ts    # busca, detalhe, perfil público, admin
        menu.ts               # categorias, itens, disponibilidade, foto
        promotions.ts
        recipes.ts            # ingredientes + fichas técnicas
        floorPlan.ts           # planta + mesas
        waitlist.ts
        plans.ts               # planos, assinaturas, entitlements
        notifications.ts
        audit.ts
      events.ts               # EventTarget + BroadcastChannel (pub/sub)
      errors.ts               # MockApiError e os códigos padronizados
      reset.ts                # resetMockData()
    lib/                      # formatters (BRL, datas), flags, cpf, phone, money, hours, geo
  reference/
    figma-make/                # protótipo original (React 19 + Vite + Tailwind v4), só leitura
  docs/
    SPEC-SPRINT1.md             # este documento
    DECISIONS.md
```

### Decisões de arquitetura
1. **App único, sem camadas de rede:** um `npm run dev`, sem orquestrar backend e frontend separados. Módulos com fronteira clara (`feature` de UI → `mock/services/<domínio>` → coleções em `localStorage`).
2. **Sessão:** `filazero:session = { userId, role, expiresAt }` em `localStorage`, sem token assinado. `expiresAt` de 15 min só para simular a UX de sessão expirada (modal "Sua sessão expirou"); renovar é apenas estender `expiresAt` enquanto o usuário estiver ativo. **Toda** função mockada autenticada relê `status` e `role` do registro do usuário antes de agir, para que suspensão valha imediatamente.
3. **Tenant guard (em JS):** `assertEstablishmentAccess(session, establishmentId, roles[])` dentro de cada mock service confere o `Membership` (direto ou por organização) e lança `MockApiError('FORBIDDEN', 403)` ou, para não revelar que o recurso existe, `MockApiError('NOT_FOUND', 404)`. **Nenhum service recebe `establishmentId` vindo só da UI sem essa checagem.**
4. **Entitlements:** `entitlements.assert(establishmentId, feature)` e `entitlements.limit(establishmentId, key)` resolvem estabelecimento → organização → assinatura ativa **lendo a coleção a cada chamada** (sem cache), então trocar de plano no admin vale na hora, mesmo sem recarregar a página. Erros: `FEATURE_NOT_IN_PLAN` e `PLAN_LIMIT_REACHED` (ambos como `403` conceitual).
5. **Tempo real:** `mock/events.ts` expõe `emit(event)` e `subscribe(type, handler)`. Internamente usa um `EventTarget` para a mesma aba e retransmite pelo `BroadcastChannel('filazero')` para outras abas do mesmo navegador — assim dá para abrir "Gestor" numa aba e "Cliente" em outra e demonstrar ao vivo. Eventos desta sprint: `menu.updated`, `establishment.updated` (status operacional, pausa), `waitlist.notified`.
6. **Geo sem PostGIS:** distância por Haversine em JavaScript puro sobre a coleção de estabelecimentos (nada de índice espacial: são no máximo algumas centenas de registros no seed).
7. **Foto:** `readAndResizeImage(file, maxSize=600)` desenha no `<canvas>`, exporta `toDataURL('image/webp', 0.8)` e guarda a string base64 no próprio registro do item. Sem isso, aceitar só JPEG/PNG/WebP até 5 MB antes de processar.
8. **Datas e fuso:** guardar em ISO-8601 UTC (`Date.toISOString()`); interpretar horário de funcionamento no fuso do estabelecimento (`timezone`, default `America/Sao_Paulo`) com `Intl.DateTimeFormat`.
9. **Moeda:** valores em centavos em todo o mock; formatação só na UI com `Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})`.
10. **Feature flags:** um único módulo `src/lib/flags.ts` com `import.meta.env.VITE_*`, lido em todo lugar (evita `if` espalhado). Nesta sprint: `ORDERING_ENABLED=false`, `LOYALTY_ENABLED=false`, `RESERVATIONS_ENABLED=false`, `AUTH_GOOGLE_ENABLED=false`, `AUTH_APPLE_ENABLED=false`.
11. **Roteamento para publicar em GitHub Pages:** use `createHashRouter`/`<HashRouter>` do React Router (URLs com `/#/`), não `BrowserRouter`. O Pages serve arquivos estáticos e não sabe devolver `index.html` para uma rota profunda (ex.: `/gestor/cardapio`) recarregada direto ou aberta por QR Code — com hash router, toda rota vive depois do `#` e o servidor só precisa saber servir `index.html`, sem configuração extra nem página 404 de redirecionamento. Ver seção 13.

### Mock services (padrão de cada módulo)
```
src/mock/services/<domínio>.ts
  // funções exportadas com o mesmo nome/forma da tabela "Contrato" abaixo
  // cada função: valida entrada (Zod) → confere sessão/RBAC/tenant/entitlement →
  //              lê/grava a coleção em localStorage → emite evento (se mudou algo) →
  //              devolve o resultado ou lança MockApiError
<domínio>.test.ts
```
`MockApiError` carrega `{ code, status, message, details? }`, com o mesmo vocabulário de códigos que o resto do documento usa (`VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`…), para que os testes Gherkin da seção 5 não precisem mudar de redação.

### Convenções das funções mockadas
- Toda entrada passa por Zod, exatamente como valeria numa rota real.
- Erro padrão: `MockApiError` com `{ code: "STRING_CONSTANTE", message: "texto em pt-BR", details? }`. "Status" (400/401/403/404/409/422/429) é só um campo informativo dentro do erro, usado nos testes e para escolher a mensagem na UI — não existe um servidor HTTP de verdade para devolvê-lo.
- Listagem com filtro/paginação devolve `{ items, total, page, pageSize }` (`pageSize` máximo 100), igual a uma resposta paginada de API.
- "Rate limit" (login, cadastro) é simulado em memória (contagem por identificador com janela de tempo), só para exercitar a mensagem de erro — não protege nada de verdade num app sem servidor.

### Matriz de permissões (RBAC)

| Ação | CUSTOMER | ATTENDANT | MANAGER | PLATFORM_ADMIN |
|---|---|---|---|---|
| Ver busca, página e cardápio (público) | ✅ | ✅ | ✅ | ✅ |
| Editar o próprio perfil e endereços | ✅ | ✅ | ✅ | ✅ |
| Alternar disponibilidade de item 🔶 (o protótipo restringe a Supervisor e Gestor; a ficha 19 manda o atendente) | — | ✅ (seu estabelecimento) | ✅ | ✅ |
| CRUD de cardápio, promoções, fichas, planta, fila, perfil público | — | — | ✅ (seu estabelecimento/rede) | ✅ |
| CRUD de estabelecimentos, usuários, planos | — | — | — | ✅ |

**Papéis ampliados:** o protótipo ainda tem Supervisor, Recepção, Garçom, Cozinha, Caixa, Gerente de unidade e Gestor do grupo (`MembershipRole`). Na Sprint 1 use `ATTENDANT` e `MANAGER`; os demais ficam no `type`, sem regra própria.

### Contrato das funções mockadas da Sprint 1

> Cada linha é uma **função do mock service**, não uma rota de rede. "Método e rota" é só a forma curta de nomear o contrato (ex.: `POST /auth/register` ⇒ `authService.register(input)`); mantenha essa correspondência ao nomear as funções, para que a spec continue fácil de seguir.

| Método e rota (⇒ função mockada) | Papel | História |
|---|---|---|
| `POST /auth/register` | público | 01 |
| `POST /auth/otp/request` · `POST /auth/otp/verify` | público | 01, 06 |
| `POST /auth/login` (e-mail + senha) | público | 06 |
| `POST /auth/social/google` · `POST /auth/social/apple` | público (desligado por flag) | 06 |
| `POST /auth/refresh` · `POST /auth/logout` | sessão | 06 |
| `GET /me` · `PATCH /me` | logado | 13 |
| `GET/POST /me/addresses` · `PATCH/DELETE /me/addresses/:id` | logado | 13 |
| `GET /establishments` (busca) | público | 11 |
| `GET /establishments/:id` | público | 12 |
| `GET /establishments/:id/menu` | público | 03 |
| `subscribe('menu.updated' | 'establishment.updated', ...)` (evento) | público | 19, 28 |
| `PATCH /establishments/:id` (perfil público) | manager | 12 |
| `PUT /establishments/:id/hours` · `PUT /establishments/:id/special-hours` · `POST/DELETE /establishments/:id/photos` | manager | 12 |
| `PUT /establishments/:id/orders-pause` · `DELETE /establishments/:id/orders-pause` (pausar e retomar pedidos) | manager | 12 |
| `GET /establishments/:id/menu-items` (gestão) | attendant, manager | 19, 28 |
| `PATCH /establishments/:id/menu-items/:itemId/availability` | attendant, manager | 19 |
| `GET /establishments/:id/menu-items/:itemId/history` | attendant, manager | 19 |
| `GET/POST /establishments/:id/menu/categories` · `PATCH/DELETE .../:categoryId` | manager | 28 |
| `POST /establishments/:id/menu/items` · `PATCH/DELETE .../:itemId` | manager | 28 |
| `POST /establishments/:id/menu/items/:itemId/photo` | manager | 28 |
| `GET/POST /establishments/:id/promotions` · `PATCH/DELETE .../:promotionId` | manager | 29 |
| `GET/POST /establishments/:id/ingredients` · `PATCH/DELETE .../:ingredientId` | manager | 31 |
| `GET/PUT /establishments/:id/menu/items/:itemId/recipe-sheet` | manager | 31 |
| `GET/POST /establishments/:id/areas` · `PATCH/DELETE .../:areaId` · `POST /establishments/:id/tables` · `PATCH/DELETE .../:tableId` (mesas e locais) | manager | 20 |
| `GET/PUT /establishments/:id/floor-plan` (posições na grade, em lote) | manager | 20 |
| `PATCH /establishments/:id/tables/:tableId/status` | manager, attendant | 20, 21 |
| `GET/POST /establishments/:id/waitlist` · `PATCH/DELETE .../:entryId` · `POST .../:entryId/notify` (Chamar) · `POST .../:entryId/assign-table` · `POST .../:entryId/no-show` | manager | 21 |
| `subscribe('waitlist.notified', ...)` (evento) | manager, attendant | 21 |
| `GET/POST /admin/establishments` · `PATCH /admin/establishments/:id` · `POST .../:id/status` | admin | 34 |
| `GET /admin/users` · `PATCH /admin/users/:id` · `POST .../:id/suspend` · `POST .../:id/reactivate` · `GET .../:id/audit` | admin | 36 |
| `GET/POST /admin/plans` · `PATCH /admin/plans/:id` · `PUT /admin/organizations/:id/subscription` | admin | 37 |
---

## 5. Especificação por história

Cada história traz: texto, telas do protótipo, regras, API, tarefas, critérios de aceite em Dado/Quando/Então (viram testes) e casos de borda. Estão na **ordem de implementação** da seção 1.4.

> **Lembrete do modo mock (spec §0.2 e §4):** em cada história abaixo, a linha "**API:**" e as respostas em JSON são o **contrato de uma função do mock service**, não uma rota HTTP real. "Recebe 409", "recebe 403" etc. nos critérios de aceite significam "a função lança `MockApiError` com esse `status`". Implemente exatamente como está descrito — só troque a rede por uma chamada direta de função.

---

### História 01 — Cadastro por nome e CPF · 3 pts · Cliente

**História:** Como cliente, quero me cadastrar informando nome completo e CPF logo no primeiro acesso, para agilizar meus próximos pedidos, acumular pontos de fidelidade e não precisar redigitar meus dados toda vez que for a um estabelecimento parceiro.

**Telas (protótipo, `EntryAuth.tsx`):**
- ✅ **Boas-vindas** "Peça. Acompanhe. Retire.": "Escanear QR Code" (principal; oculto por flag), "Entrar", "Ainda não tem conta? Criar conta" e o link discreto "Explorar restaurantes". Antes dela existem Splash e Onboarding de 3 telas (fora desta história).
- ✅ **Cadastro · passo 1 de 2:** Nome (placeholder "Ex: Lucas") e Sobrenome ("Ex: Torres"), seta de voltar, "Continuar" desabilitado até preencher.
- ✅ **Cadastro · contato** (`SignupContactScreen`): escolher "Usar celular" (DDD, número, código OTP) **ou** "Usar e-mail" (e-mail, senha, confirmar senha). Os requisitos de senha (mínimo de caracteres, letra, número) se atualizam enquanto a pessoa digita.
- ✅ **Termos** (`SignupTermsScreen`): checkbox obrigatório "Li e aceito os Termos de Uso e a Política de Privacidade" (os links abrem modal sem perder o cadastro) e, **separado e opcional**, "Quero receber promoções e novidades".
- ✅ **"Conta criada!"** → "Continuar".
- 🔶 **CPF não existe no protótipo.** A ficha 01 exige. Proposta: um passo curto "Seu CPF" entre o contato e os termos (máscara, validação em tempo real, mensagem "CPF inválido"). O grupo deve decidir e atualizar o Figma.

**Regras:**
- **CPF (🔶 se mantido):** aceitar com ou sem máscara, normalizar para 11 dígitos, validar os 2 dígitos verificadores, rejeitar sequências iguais. Único no sistema (via `cpf_hash`). Cifrado (`cpf_encrypted`, AES-256-GCM), nunca em log, exibido mascarado (`•••.•••.•••-25`), não editável pelo usuário.
- **Senha (só no caminho por e-mail):** mínimo 8 caracteres, com 1 letra e 1 número. Modo mock: sem hash real (spec §0.2); guardar só o suficiente para simular a checagem no `login`.
- **Celular:** normalizado para E.164; concluir o cadastro exige **OTP válido** (marca `phone_verified_at`). O e-mail, nesta sprint, não exige verificação por código (a verificação de e-mail/telefone é a história 65, da Sprint 4).
- **Consentimentos:** aceite dos termos obrigatório (`consent_version`, `consent_accepted_at`); `marketing_opt_in` gravado à parte e **nunca** misturado com o aceite obrigatório.
- Ao concluir: autentica, mostra "Conta criada!" e leva ao Início. A tela contextual de permissão de notificações é da Sprint 3.

**API**
- `POST /auth/otp/request` — `{ phone, purpose: "SIGNUP" }` → `204`. Erros: `429 TOO_MANY_ATTEMPTS`.
- `POST /auth/otp/verify` — `{ phone, code }` → `{ verificationToken }` (curta duração, usado no cadastro).
- `POST /auth/register` — `{ firstName, lastName, cpf, email?, phone?, password?, verificationToken?, acceptTerms: true, marketingOptIn? }`. Se vier `phone`, exige `verificationToken`; se vier `email`, exige `password`. Resposta `201 { user, accessToken }` + cookie de refresh.
- Erros: `400 VALIDATION_ERROR`, `400 CPF_INVALID`, `400 TERMS_REQUIRED`, `409 CPF_ALREADY_REGISTERED`, `409 EMAIL_ALREADY_REGISTERED`, `409 PHONE_ALREADY_REGISTERED`.

**Tarefas**
- [ ] Criar formulário de cadastro em passos (nome → contato → CPF → termos)
- [ ] Validar o CPF informado (front e back, mesma regra)
- [ ] Armazenar os dados com segurança (cifra + hash, sem log)
- [ ] Criar tela de login e perfil (entregues nas histórias 06 e 13)

**Critérios de aceite**
```gherkin
Cenário: CPF inválido é bloqueado
  Dado que o cliente preencheu nome, sobrenome, contato e o CPF "111.111.111-11"
  Quando envia o cadastro
  Então recebe 400 com o código CPF_INVALID e nenhum usuário é criado

Cenário: CPF já cadastrado
  Dado que já existe um usuário com o CPF "529.982.247-25"
  Quando outro cliente tenta se cadastrar com o mesmo CPF
  Então recebe 409 com o código CPF_ALREADY_REGISTERED

Cenário: Cadastro por celular com OTP
  Dado um celular válido e um código OTP correto
  Quando o cliente conclui o cadastro
  Então o usuário é criado com role CUSTOMER e phone_verified_at preenchido
  E o CPF fica cifrado no banco (nunca em texto puro)
  E o cliente já sai autenticado

Cenário: Cadastro por e-mail
  Dado e-mail válido e senha com 8 caracteres, 1 letra e 1 número
  Quando o cliente conclui o cadastro
  Então o usuário é criado e autenticado

Cenário: Termos obrigatórios, marketing opcional
  Dado um cadastro sem o aceite dos termos
  Quando o cliente envia
  Então recebe 400 TERMS_REQUIRED
  E um cadastro com termos aceitos e sem marketing grava marketing_opt_in = false

Cenário: Dados reconhecidos em pedidos futuros
  Dado um cliente cadastrado e autenticado
  Quando consulta GET /me
  Então recebe nome, sobrenome, contato e CPF mascarado sem novo preenchimento
```

**Casos de borda e testes:** CPF com e sem máscara; casos válidos e inválidos do algoritmo; duas requisições simultâneas com o mesmo CPF (uma cria, a outra recebe 409 pelo índice único); senha fraca; OTP expirado ou reutilizado; celular com e sem `+55`; log e resposta nunca contêm CPF completo, senha ou código OTP.
---

### História 06 — Login (celular, e-mail, Google, Apple) · 5 pts · Cliente

**História:** Como cliente, quero entrar na minha conta usando celular, e-mail ou login social (Google ou Apple), para continuar de onde parei em qualquer aparelho, sem perder meu histórico de pedidos, pontos acumulados ou endereços salvos.

**Telas (protótipo, `EntryAuth.tsx`):**
- ✅ **Login** (`LoginScreen`): "Entre na sua conta — Continue de onde parou e acompanhe seus pedidos.", campo "Celular ou e-mail" (placeholder "(19) 99999-9999 ou nome@email.com"), "Continuar" (desabilitado até preencher), divisor "ou", "Continuar com Google", "Continuar com Apple", "Não tem uma conta? Criar conta". Ao continuar: **celular → tela de OTP**; **e-mail → tela de e-mail e senha**.
- ✅ **OTP** (`OTPScreen`): "Digite o código", "Enviamos um código de 6 dígitos para (19) 99999-9999", 6 campos, "Reenviar código em 00:42" que vira "Reenviar código", "Alterar número". Estados: digitando, validando, incorreto, expirado, muitas tentativas, sem conexão. Nunca apagar tudo depois de um erro simples.
- ✅ **E-mail** (`EmailLoginScreen`): E-mail, Senha (mostrar/ocultar), "Entrar", "Esqueci minha senha" (o fluxo é a história 44, da Sprint 2) e, na spec, "Entrar usando código por e-mail".
- ✅ Fora desta história: Splash, Onboarding, "Continuar como visitante" (folha que aparece após ler um QR sem estar logado) e modal "Sua sessão expirou".

**Regras:**
- O identificador é detectado automaticamente: contém `@` → e-mail; senão → celular normalizado.
- **OTP:** `OtpChallenge` (propósito `LOGIN`), código de 6 dígitos, expira em 5 min, máximo de 5 tentativas (depois "muitas tentativas"), reenvio liberado após 60 s. O envio usa a interface `OtpSender`: `ConsoleOtpSender` em dev (imprime o código no log; com `OTP_DEV_FIXED_CODE=123456` aceita código fixo) e `SmsOtpSender` real quando o grupo escolher o provedor.
- **E-mail e senha:** o protótipo mostra "Senha incorreta."; use a mensagem única "E-mail ou senha incorretos", perto do campo, para **não revelar se a conta existe** (desvio consciente de segurança).
- Access token 15 min; refresh opaco de 30 dias com rotação; reuso de refresh já usado revoga a família. Logout revoga o refresh atual.
- Usuário `SUSPENDED` → `403 ACCOUNT_SUSPENDED` ("Sua conta está suspensa. Entre em contato com o suporte.").
- Redirecionamento por papel: `CUSTOMER` → `/app`; `MANAGER` → `/gestor`; `ATTENDANT` → `/atendente`; `PLATFORM_ADMIN` → `/admin`. Quem tem mais de um vínculo escolhe o estabelecimento.
- **Google:** o front obtém o ID token; `POST /auth/social/google { idToken }`; o back valida a audiência (`GOOGLE_CLIENT_ID`) e cria ou vincula a conta por e-mail verificado. **Apple:** `AppleAuthProvider` atrás de `AUTH_APPLE_ENABLED`; com a flag desligada o botão fica visível e desabilitado com "Em breve".
- **Visitante:** consultar restaurantes e cardápio não exige login (as rotas públicas já cobrem). O carrinho do visitante é da Sprint 2.

**API:** `POST /auth/otp/request` (`purpose: "LOGIN"`), `POST /auth/otp/verify` (→ `{ user, accessToken }`), `POST /auth/login` (`{ email, password }`), `POST /auth/social/google`, `POST /auth/social/apple` (flag), `POST /auth/refresh`, `POST /auth/logout`.
Erros: `401 INVALID_CREDENTIALS`, `401 OTP_INVALID`, `410 OTP_EXPIRED`, `403 ACCOUNT_SUSPENDED`, `429 TOO_MANY_ATTEMPTS`.

**Tarefas**
- [ ] Criar tela de login com celular/e-mail
- [ ] Integrar login social (Google e Apple)
- [ ] Validar credenciais e tratar erros de acesso
- [ ] Manter sessão ativa no app (refresh automático no interceptor do Axios)

**Critérios de aceite**
```gherkin
Cenário: Login por celular com OTP
  Dado um cliente cadastrado
  Quando informa o celular e o código de 6 dígitos correto
  Então entra na conta e cai na área do cliente

Cenário: Erra o código e acerta em até 3 tentativas
  Dado um cliente que errou o código 2 vezes
  Quando informa o código correto na 3ª tentativa
  Então entra normalmente, sem bloqueio
  E seus endereços e dados continuam disponíveis

Cenário: Muitas tentativas
  Dado um cliente que errou o código 5 vezes
  Quando tenta de novo
  Então recebe 429 TOO_MANY_ATTEMPTS e precisa pedir um novo código

Cenário: Código expirado
  Dado um código gerado há mais de 5 minutos
  Quando o cliente o informa
  Então recebe 410 OTP_EXPIRED

Cenário: Login por e-mail e senha
  Dado um cliente cadastrado com e-mail e senha
  Quando informa e-mail e senha corretos
  Então entra na conta

Cenário: Credencial inválida não vaza informação
  Dado um e-mail que não existe
  Quando tenta entrar
  Então recebe 401 com a mesma mensagem usada para senha errada

Cenário: Login com Google
  Dado um ID token válido do Google
  Quando o cliente escolhe "Continuar com Google"
  Então a conta é criada ou vinculada e o cliente entra

Cenário: Refresh reutilizado
  Dado um refresh token que já foi rotacionado
  Quando ele é enviado de novo
  Então toda a família de tokens é revogada

Cenário: Usuário suspenso
  Dado um usuário com status SUSPENDED
  Quando tenta entrar
  Então recebe 403 ACCOUNT_SUSPENDED
```

**Casos de borda e testes:** o teste do reenvio respeita os 60 s; código nunca aparece em resposta nem log em produção; token expirado renovado sem o usuário perceber; cookie `httpOnly` e `Secure` em produção; celular digitado com e sem máscara.
---

### História 13 — Perfil do usuário · 3 pts · Cliente

**História:** Como cliente, quero editar meu nome, e-mail, telefone e gerenciar meus endereços salvos em um só lugar, para manter minhas informações sempre atualizadas e agilizar pedidos e reservas futuras sem redigitar tudo de novo.

**Telas (protótipo, `HomeProfile.tsx` e `ClientApp.tsx`):**
- ✅ **Perfil** (`ProfileFullScreen`): avatar com iniciais, nome, telefone e e-mail, botão "Editar perfil". Grupos: **Sua conta** (Dados pessoais, Meus endereços, Pagamentos), **Sua atividade** (Pedidos, Reservas, Favoritos, Benefícios), **Configurações** (Notificações, Privacidade e conta, Acessibilidade, Preferências alimentares, Ajuda, Termos de uso) e "Sair".
- ✅ **Editar perfil** (`EditProfileScreen`): nome, sobrenome, celular, e-mail.
- ✅ **Privacidade e conta** (`AccountManagementScreen`): Alterar senha, e-mail e telefone, Dispositivos conectados, Sair de todos os dispositivos e Excluir minha conta.
- ✅ **Meus endereços:** "Casa — Rua das Acácias, 123 · Campinas, SP" (padrão) e "Trabalho — Av. Universitária, 450 · Barão Geraldo, SP". Novo endereço: CEP, rua, número, complemento, bairro, cidade e referência opcional, com localização pelo mapa (spec).
- ✅ **Sair:** folha "Deseja sair da sua conta?" com "Sair" e "Cancelar".
- **Na Sprint 1 implemente:** cabeçalho, Editar perfil, Meus endereços, Privacidade e conta (Alterar senha, e-mail e telefone e Sair de todos os dispositivos) e Sair. As demais linhas (Pedidos, Reservas, Favoritos, Benefícios/FilaZero Club/Cupons/Cashback, Pagamentos, Notificações, Acessibilidade, Preferências alimentares, Ajuda) ficam ocultas por flag ou abrem "Em breve". **Excluir minha conta** é a história 53 (Sprint 2).
- **Barra inferior dinâmica** ✅: sem restaurante ativo → *Início · Restaurantes · Pedidos · Perfil*; dentro de um restaurante → *Início · Cardápio · Pedidos · Perfil*. Pedidos abre um estado vazio.

**Regras:**
- Editáveis: nome e sobrenome. **Trocar celular ou e-mail exige nova verificação** ✅ (OTP para o novo celular; código por e-mail para o novo e-mail) antes de atualizar (`OtpPurpose.CHANGE_CONTACT`). Unicidade validada.
- **CPF não é editável** (mostrar mascarado com "Para alterar, fale com o suporte").
- Endereços: até 10 por usuário; exatamente 1 padrão; CEP com 8 dígitos; UF com 2 letras.
- "Sair de todos os dispositivos": `token_version + 1` e revogação de todos os refresh tokens.
- `GET /me` com `Cache-Control: no-store`; depois de salvar, invalidar as queries do TanStack Query.

**API:** `GET /me`, `PATCH /me` (nome), `POST /me/contact-change/request` e `POST /me/contact-change/confirm`, `POST /auth/logout-all`, `GET/POST /me/addresses`, `PATCH/DELETE /me/addresses/:id`.

**Tarefas**
- [ ] Criar tela de perfil com dados pessoais
- [ ] Permitir edição de nome, e-mail e telefone
- [ ] Criar gestão de endereços salvos
- [ ] Exibir atalhos para pedidos e reservas (estado vazio na Sprint 1)

**Critérios de aceite**
```gherkin
Cenário: Alteração refletida imediatamente
  Dado um cliente autenticado com o nome "Lucas"
  Quando altera o nome para "Lucas Henrique" e salva
  Então GET /me devolve o novo nome imediatamente
  E a tela de perfil mostra o novo valor sem recarregar

Cenário: Trocar celular exige verificação
  Dado um cliente autenticado
  Quando informa um novo celular
  Então recebe um OTP nesse celular
  E o celular só muda depois do código correto

Cenário: Endereço padrão único
  Dado um cliente com 2 endereços, sendo "Casa" o padrão
  Quando define "Trabalho" como padrão
  Então "Trabalho" é o único padrão e "Casa" deixa de ser

Cenário: E-mail já usado
  Dado que outro usuário já usa "maria@email.com"
  Quando o cliente tenta trocar o e-mail para esse valor
  Então recebe 409 EMAIL_ALREADY_REGISTERED e nada é alterado

Cenário: Sair de todos os dispositivos
  Dado um cliente logado em 2 aparelhos
  Quando escolhe "Sair de todos os dispositivos"
  Então os dois refresh tokens deixam de funcionar
```

**Casos de borda e testes:** tentativa de editar CPF via PATCH é rejeitada; limite de 10 endereços (`422`); um usuário nunca lê ou edita endereço de outro (`404`).
---

### História 34 — Estabelecimentos · 5 pts · Admin

**História:** Como administrador da plataforma, quero cadastrar, editar e desativar estabelecimentos parceiros, vinculando cada um a uma organização, para controlar quem está ativo na plataforma e suspender rapidamente quem violar as regras de uso.

**Telas (protótipo, `AdminApp.tsx`):**
- ✅ **Shell do admin:** barra lateral escura "Admin FilaZero · Plataforma" com Visão geral, **Estabelecimentos**, Organizações, **Usuários**, **Planos**, Pagamentos, Suporte (2), Incidentes (1), Integrações, Métricas, Auditoria e Configurações. Cabeçalho com o título da tela, a data e o botão "Atualizar". Na Sprint 1 ative só os itens da sprint.
- ✅ **Estabelecimentos** (`EstablishmentsSection`): busca "Buscar estabelecimento ou cidade…", botões "Filtrar" e "Novo"; tabela com **Estabelecimento** (nome e "N tickets abertos"), **Cidade**, **Plano** (selo Start, Pro ou Business), **Status** (Ativo, Em configuração, Suspenso), **Entrada** (data), **Volume hoje** e **Ações** ("Ver"). Exemplos: Bar do Zé Cambuí, Taquaral e Centro (Pro; o Centro está "Em configuração"), Boteco da Vila (Start), Restaurante São Paulo (Business, Suspenso).
- ✅ **Painel de detalhe:** Cidade, Plano, Status, Gestor, Membro desde, Volume hoje, Tickets abertos, Incidentes ativos, e os botões "Abrir como gestor" e "Suspender".
- ❌ O formulário do botão "Novo" não está desenhado. Proposta: os mesmos campos da tela "Estabelecimento" do gestor (nome, nome curto, categoria, telefone, e-mail, endereço com lat/lng), mais organização, plano inicial e gestor responsável.
- "Volume hoje", "Tickets abertos" e "Incidentes ativos" dependem de módulos futuros: devolva `null` e mostre "—" na Sprint 1.

**Regras:**
- **Criar:** status `SETUP` ("Em configuração"). Cria ou associa a organização (estabelecimento avulso ganha uma organização própria). A organização herda a assinatura existente; se não tiver, cria uma `TRIAL` no plano `START`.
- **Ativar** (`SETUP → ACTIVE`) exige nome, endereço, `lat/lng` e horário de pedidos configurado (⚠️ regra inferida do checklist de ativação da spec). Sem isso não aparece na busca.
- **Transições:** `SETUP → ACTIVE`; `ACTIVE ↔ SUSPENDED` (motivo obrigatório); `ACTIVE → DEACTIVATED`; `DEACTIVATED → ACTIVE`.
- **`SUSPENDED` e `DEACTIVATED`:** somem de `GET /establishments`; `GET /establishments/:id` público devolve `404`; os pedidos param imediatamente. A equipe continua logando e vê o aviso "Estabelecimento suspenso".
- **Limite de unidades:** `MAX_UNITS` do plano da organização (Start = 1, Pro = 3, Business = ilimitado ✅). Criar unidade acima do limite → `403 PLAN_LIMIT_REACHED`.
- Toda mudança de status grava `AuditLog` (`STATUS_CHANGED`, com o motivo).
- **Gestor responsável:** o e-mail de um usuário existente cria `Membership(MANAGER)`. Se não existir → `404 USER_NOT_FOUND` (convite por e-mail é futuro).
- **"Abrir como gestor"** (futuro): sessão somente leitura, sempre auditada. Não implementar na Sprint 1.

**API:** `GET /admin/establishments?q=&status=&plan=`, `POST /admin/establishments`, `PATCH /admin/establishments/:id`, `POST /admin/establishments/:id/status` (`{ status, reason }`).

**Tarefas**
- [ ] Criar tela de listagem de estabelecimentos
- [ ] Permitir cadastro, edição e desativação
- [ ] Vincular estabelecimento a uma organização
- [ ] Exibir status (ativo, em configuração, suspenso, desativado)

**Critérios de aceite**
```gherkin
Cenário: Estabelecimento desativado some das buscas
  Dado um estabelecimento ACTIVE que aparece na busca do cliente
  Quando o admin muda o status para DEACTIVATED
  Então ele deixa de aparecer em GET /establishments imediatamente
  E GET /establishments/:id devolve 404
  E ele deixa de aceitar pedidos

Cenário: Reativação
  Dado um estabelecimento DEACTIVATED
  Quando o admin muda o status para ACTIVE
  Então ele volta a aparecer na busca

Cenário: Em configuração não aparece
  Dado um estabelecimento recém-criado com status SETUP
  Quando o cliente busca
  Então ele não aparece

Cenário: Motivo obrigatório para suspender
  Dado um admin suspendendo um estabelecimento sem informar o motivo
  Quando envia
  Então recebe 400 e o status não muda

Cenário: Limite de unidades do plano
  Dado uma organização no plano START (MAX_UNITS = 1) com 1 unidade
  Quando o admin cria a segunda unidade
  Então recebe 403 PLAN_LIMIT_REACHED

Cenário: Apenas admin acessa
  Dado um usuário MANAGER
  Quando chama POST /admin/establishments
  Então recebe 403
```

**Casos de borda e testes:** criar com organização inexistente; `lat/lng` fora do intervalo; auditoria gerada a cada troca de status; busca por nome ou cidade sem diferenciar acento.
---

### História 37 — Planos de assinatura · 5 pts · Admin

**História:** Como administrador da plataforma, quero gerenciar os planos de assinatura oferecidos aos estabelecimentos, definindo preço, limites e recursos de cada um, para monetizar a plataforma de forma escalável conforme o porte de cada parceiro.

**Telas (protótipo):**
- ❌ **Admin · Planos:** o item existe na barra lateral, mas abre um **placeholder** (`AdminPlaceholderSection`). Não há tela.
- ✅ **Referência visual no painel do gestor** (`SubscriptionSection`, "Plano e cobrança"): "Plano atual — FilaZero Pro — R$ 299/mês — próximo vencimento 02/10/2026 — Mastercard ••••9328 — Gerenciar plano"; tabela de faturas (Período, Valor, Status, PDF); "Comparar planos" com 3 cartões e o botão "Migrar para …". Essas telas do gestor são da Sprint 5 (cobrança); aproveite só o **cartão de plano**.
- **Proposta para a tela admin:** lista de cartões dos 3 planos (mesma aparência) + edição (nome, preço, recursos, limite de unidades, ativo) e, na tela da organização/estabelecimento, "Plano atual" e "Trocar plano".

**Planos de seed** (nomes, preços e recursos vêm do protótipo ✅; 🔶 a spec da fase 3 pede para não fixar preços definitivos, então trate como dado editável):

| Recurso | Start · R$ 99 | Pro · R$ 299 | Business · R$ 799 |
|---|---|---|---|
| `MAX_UNITS` (unidades) | 1 | 3 | ilimitado |
| `KDS` | não | sim | sim |
| `LOYALTY` | não | sim | sim |
| `ADVANCED_REPORTS` | não | sim | sim |
| `API_ACCESS` | não | sim | sim |
| `MULTI_UNIT` | não | não | sim |
| `DEDICATED_SLA` | não | não | sim |
| `ACCOUNT_MANAGER` | não | não | sim |
| `WHITE_LABEL` | não | não | sim |
| `PROMOTIONS` ⚠️ | sim | sim | sim |
| `RECIPE_SHEETS` ⚠️ | não | sim | sim |
| `WAITLIST` ⚠️ | não | sim | sim |

Os três últimos são **propostas** para dar efeito às histórias 29, 31 e 21. O protótipo mostra a fase 3 (fichas técnicas ligadas a estoque) como recurso "Pro" (`estoque`), e a fila de espera como operação sem plano definido. Confirme com o grupo.

**Regras:**
- `entitlements.assert(establishmentId, feature)` e `entitlements.limit(establishmentId, key)` resolvem **estabelecimento → organização → assinatura ativa** a cada chamada. Trocar de plano vale na hora, sem deploy.
- Aplicar nas histórias desta sprint: `MAX_UNITS` (34), `WAITLIST` (21), `PROMOTIONS` (29), `RECIPE_SHEETS` (31). Os demais recursos (KDS, fidelidade etc.) só precisam existir como chave.
- **Downgrade não apaga dados.** Bloqueia criar novas unidades acima do limite. Recurso desligado → `403 FEATURE_NOT_IN_PLAN` (a UI mostra "Recurso não incluso no seu plano") e as promoções deixam de ser aplicadas no cardápio.
- Plano inativo não pode ser atribuído. Trocar de plano encerra a assinatura atual (`canceled_at`) e cria a nova, com `AuditLog` (`PLAN_CHANGED`).
- Cobrança real e faturas são da Sprint 5.

**API:** `GET/POST /admin/plans`, `PATCH /admin/plans/:id`, `PUT /admin/organizations/:id/subscription` (`{ planId }`).

**Tarefas**
- [ ] Criar tela de cadastro de planos
- [ ] Definir preço, limites e recursos por plano
- [ ] Vincular plano ao estabelecimento (na organização dele)
- [ ] Bloquear recursos fora do plano contratado

**Critérios de aceite**
```gherkin
Cenário: Downgrade retira o recurso na hora
  Dado uma organização no plano PRO usando fichas técnicas
  Quando o admin troca para START
  Então o gestor recebe 403 FEATURE_NOT_IN_PLAN ao abrir fichas técnicas
  E nenhum deploy ou reinício é necessário

Cenário: Upgrade libera o recurso na hora
  Dado uma organização no plano START
  Quando o admin troca para PRO
  Então o gestor acessa fichas técnicas e fila de espera imediatamente

Cenário: Limite de unidades
  Dado um plano com MAX_UNITS = 3 e uma organização com 3 unidades
  Quando o admin cria a 4ª
  Então recebe 403 PLAN_LIMIT_REACHED

Cenário: Downgrade preserva os dados
  Dado uma organização no plano PRO com 3 unidades
  Quando o admin troca para START (MAX_UNITS = 1)
  Então as 3 unidades continuam existindo
  E criar uma nova unidade é bloqueado

Cenário: Histórico da troca
  Dado uma troca de plano
  Então existe um AuditLog PLAN_CHANGED com o plano anterior e o novo
```

**Casos de borda e testes:** dois planos ativos simultâneos para a mesma organização (índice parcial impede); estabelecimento sem organização é impossível (FK obrigatória).
---

### História 36 — Usuários da plataforma · 5 pts · Admin

**História:** Como administrador da plataforma, quero gerenciar todos os usuários do sistema — clientes, atendentes, gestores e outros admins —, para controlar acessos e permissões, suspendendo rapidamente qualquer conta suspeita ou mal utilizada.

**Telas (protótipo, `AdminUsersSection`):**
- ✅ **Usuários:** busca "Buscar por nome ou email…", botão "Exportar"; tabela com **Nome**, **Email**, **Status** (Ativo, Inativo), **Último acesso** ("Agora", "há 2h", "Ontem", "há 30 dias"), **Pedidos** (quantidade) e **Ações** ("Ver" · "Suspender"). Exemplos: Lucas Torres (842 pedidos), Marina Silva (124), Pedro Carvalho (387), Ana Beatriz (56), Carlos Mendes e Joana Ferreira (Inativos).
- A spec da fase 3 acrescenta busca por telefone e ID e diz para **não expor informações sensíveis desnecessariamente**.
- ❌ O detalhe ("Ver") e a alteração de papel e vínculos não estão desenhados. Proposta: painel lateral com dados básicos, vínculos (estabelecimento/organização + papel), histórico e as ações "Alterar papel/vínculos" e "Suspender/Reativar" (motivo obrigatório).

**Regras:**
- "Inativo" é **derivado** (sem acesso há mais de 30 dias), não um status gravado. "Suspender" muda para `SUSPENDED`.
- **Não exibir CPF** na listagem nem no "Exportar" (CSV só com nome, e-mail, status, último acesso e quantidade de pedidos). "Pedidos" vem de módulo futuro: `null` na Sprint 1.
- Suspender é uma transação: `status = SUSPENDED` + `token_version + 1` + revogar todos os refresh tokens + `AuditLog`.
- Efeito imediato: como todo request lê `status` e `token_version`, a próxima chamada do usuário devolve `403 ACCOUNT_SUSPENDED`, mesmo com access token ainda válido.
- Admin não pode suspender a si mesmo nem remover o último `PLATFORM_ADMIN` ativo (`422`).
- Trocar para `STAFF` exige ao menos 1 vínculo (`Membership`). Alterar papel ou vínculo grava `AuditLog` (`ROLE_CHANGED`) com antes e depois.
- Histórico: `GET /admin/users/:id/audit` (entidade `User`).

**API:** `GET /admin/users?q=&role=&status=`, `PATCH /admin/users/:id` (`{ role, memberships[] }`), `POST /admin/users/:id/suspend` (`{ reason }`), `POST /admin/users/:id/reactivate`, `GET /admin/users/:id/audit`, `GET /admin/users/export` (CSV).

**Tarefas**
- [ ] Criar tela de listagem de usuários com filtro por papel
- [ ] Permitir editar permissões e papéis
- [ ] Suspender ou reativar usuários
- [ ] Registrar histórico de alterações de permissão

**Critérios de aceite**
```gherkin
Cenário: Suspensão vale na hora
  Dado um cliente logado com access token ainda válido
  Quando o admin suspende esse usuário
  Então a próxima requisição dele devolve 403 ACCOUNT_SUSPENDED
  E o refresh token dele não funciona mais

Cenário: Reativação
  Dado um usuário SUSPENDED
  Quando o admin o reativa
  Então ele consegue entrar novamente

Cenário: Proteção do último admin
  Dado que existe apenas 1 PLATFORM_ADMIN ativo
  Quando ele tenta se suspender
  Então recebe 422 e nada muda

Cenário: Histórico de permissões
  Dado que o admin muda o papel de um usuário de CUSTOMER para STAFF (MANAGER de um estabelecimento)
  Então o histórico mostra quem alterou, quando, o papel anterior e o novo

Cenário: Inativo derivado
  Dado um usuário sem acesso há 45 dias
  Quando o admin lista os usuários
  Então ele aparece como "Inativo" sem que o status gravado tenha mudado

Cenário: Exportação sem dados sensíveis
  Dado o botão "Exportar"
  Quando o admin baixa o CSV
  Então o arquivo não contém CPF nem telefone
```

**Casos de borda e testes:** listagem paginada; filtro combinado papel + status; usuário STAFF sem vínculo é rejeitado; busca sem diferenciar acento.
---

### História 12 — Página do restaurante · 3 pts · Cliente (+ tela "Estabelecimento" do Gestor)

**História:** Como cliente, quero ver fotos do ambiente, nota de avaliação de outros clientes, endereço, horário de funcionamento e categorias do cardápio de um restaurante, para decidir com confiança se é ali que eu quero pedir.

**Telas (protótipo):**
- ✅ **Página do restaurante** (`RestaurantDetailScreen`): capa menor, nome, "★ 4.7 (312)", distância, "Espera: 12–18 min", status, tags, cartão com endereço + "Como chegar" + "Hoje: 17:00–02:00", e os botões "Ver cardápio" e "Reservar". Estados de status: 🟢 **Aceitando pedidos**, 🟡 **Alta demanda**, 🔴/índigo **Pedidos temporariamente pausados** ("Este restaurante pausou novos pedidos temporariamente." e, com previsão, "Pedidos devem retornar às 21:30."), ⚫ **Fechado**.
- ✅ **Aviso de presença:** "Você pode consultar o cardápio. Para fazer um pedido, confirme sua presença pelo QR Code do estabelecimento." + botão "Escanear QR para pedir". (É o cartão que aparecia cortado nas capturas.) Oculto por `ORDERING_ENABLED`.
- "Reservar" fica oculto por `RESERVATIONS_ENABLED=false`. A distribuição de notas (5★ … 1★) da spec é opcional.
- ✅ **Gestor · "Estabelecimento"** (`EstablishmentSection`): *Informações básicas* (Nome do estabelecimento, Nome curto, Telefone, E-mail, Descrição, Categoria: Bar, Restaurante, Hamburgueria, Pizzaria, Cafeteria, Lanchonete), *Localização* (CEP, Endereço, Número, Bairro, Cidade e mapa com o ponto ajustável), *Preview público* ("É assim que seu estabelecimento aparece no FilaZero", com o card da Home).
- ✅ **Gestor · "Horários"** (`SchedulesSection`, item próprio da barra lateral): horário por dia com "Fechar neste dia" e "Configurar horário"; **dois horários** — *funcionamento* e *pedidos pelo FilaZero* (ex.: 17:00→01:00 e 17:30→00:30) —, "Copiar horário para outros dias", "24 horas" e **horários especiais** por data.
- ✅ **Pausar pedidos** (dashboard do gestor, spec): "Por quanto tempo deseja pausar?" — 15 min, 30 min, 1 hora, Até eu reativar — e motivo opcional (Cozinha sobrecarregada, Falta de equipe, Problema operacional, Encerramento antecipado); durante a pausa "Retorno estimado em 22 min" e "Retomar pedidos agora". A tela do dashboard é de outra sprint, mas a **API e o status** entram agora, porque a página do restaurante depende deles.

**Regras:**
- Fonte única de dados: a entidade `Establishment`. Nada duplicado.
- **Status (derivado):** `PAUSED` → `CLOSED` → `BUSY` → `OPEN`, na ordem da seção 3. Em `PAUSED` e `CLOSED` o cardápio continua acessível em **modo consulta** e o checkout fica bloqueado.
- **Pausa com prazo termina sozinha:** a leitura compara `orders_paused_until` com o horário atual (sem job).
- "Hoje: HH:MM–HH:MM" vem do horário `BUSINESS` no fuso do estabelecimento; horário especial da data **sobrescreve** o semanal; `is_closed` → "Fechado hoje". O status "Fechado" considera o horário `ORDERS`.
- Distância só aparece se o cliente enviou `lat/lng`. "Como chegar": `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`.
- Nota e quantidade de avaliações são somente leitura (avaliações reais entram na Sprint 3). Estabelecimento que não está `ACTIVE` → `404`.
- Só o gestor edita: `PATCH /establishments/:id`, `PUT .../hours`, `PUT .../special-hours`, fotos e `PUT/DELETE .../orders-pause`. Toda mudança gera `AuditLog` (ex.: "Lucas pausou novos pedidos" ✅ na spec).

**API:** `GET /establishments/:id?lat=&lng=`.

**Resposta (resumo):**
```json
{ "id": "…", "name": "Bar do Mestre", "category": "BAR", "tags": ["Cervejas artesanais", "Petiscos"],
  "ratingAvg": 4.7, "ratingCount": 312, "distanceMeters": 350,
  "waitTime": { "minMinutes": 12, "maxMinutes": 18 },
  "operationalStatus": "OPEN", "pausedUntil": null,
  "address": "Rua das Flores, 148 · Centro", "todayHours": "17:00–02:00", "photos": ["…"] }
```

**Tarefas**
- [ ] Criar tela com galeria de fotos e nota média
- [ ] Exibir endereço com botão "como chegar"
- [ ] Mostrar horário de funcionamento do dia
- [ ] Botões de "ver cardápio" e "reservar" ("reservar" oculto por flag)
- [ ] Telas do gestor "Estabelecimento" e "Horários" para cadastrar esses dados

**Critérios de aceite**
```gherkin
Cenário: Dados batem com o cadastro do gestor
  Dado um estabelecimento cadastrado pelo gestor com endereço, horários, tags e fotos
  Quando o cliente abre a página do restaurante
  Então nota, endereço, horário de hoje, tags e fotos são exatamente os cadastrados

Cenário: Horário que cruza a meia-noite
  Dado um estabelecimento que abre às 17:00 e fecha às 02:00
  Quando o cliente consulta às 01:00 de terça
  Então o estabelecimento aparece como aberto (regra do dia anterior)

Cenário: Horário especial sobrescreve o semanal
  Dado um horário especial "fechado" para 07/09
  Quando o cliente consulta em 07/09
  Então vê "Fechado hoje"

Cenário: Pedidos pausados
  Dado que o gestor pausou os pedidos por 30 minutos
  Quando o cliente abre a página
  Então o status é "Pedidos temporariamente pausados"
  E o botão "Ver cardápio" continua disponível em modo consulta
  E depois de 30 minutos o status volta a "Aceitando pedidos" sem ação manual

Cenário: Estabelecimento inativo
  Dado um estabelecimento SUSPENDED
  Quando o cliente acessa a página
  Então recebe 404
```

**Casos de borda e testes:** função `isOpenNow` com fuso, virada de dia, horário especial e dia sem horário; pausa "até reativar" só termina com `DELETE`; distância omitida sem geolocalização; gestor de outro estabelecimento não edita este (`404`).

**Algoritmo `isOpenNow(hours, special, now, tz)`:** converta `now` para o fuso. Se existe horário especial para a data, use-o. Senão, se hoje tem faixa e `opens_at <= t < closes_at` (ou, quando `closes_at < opens_at`, `t >= opens_at`) → aberto. Senão, se **ontem** tinha faixa que atravessa a meia-noite e `t < closes_at_de_ontem` → aberto. Caso contrário → fechado.
---

### História 11 — Buscar restaurantes próximos · 5 pts · Cliente

**História:** Como cliente, quero buscar bares e restaurantes próximos da minha localização atual, com filtros de distância, tempo de espera e se estão abertos agora, para decidir rapidamente onde fazer meu próximo pedido.

**Telas (protótipo, `RestaurantScreens.tsx` e `HomeProfile.tsx`):**
- ✅ **Permissão de localização** (`LocationPermissionScreen`): "Encontre lugares perto de você — Use sua localização para encontrar bares e restaurantes que aceitam pedidos pelo FilaZero." com "Usar minha localização" e "Escolher localização manualmente" (bairro, cidade ou região). Nunca bloquear o app por falta de permissão.
- ✅ **Restaurantes** (`ExploreScreen`): seta de voltar, ordenar, filtros (badge com a contagem), alternância **Lista | Mapa**, busca "Buscar restaurante, tipo, prato…", chips **Todos, Aberto agora, Mais próximos, Menor espera, Bares, Restaurantes, Favoritos**, contador "N estabelecimentos encontrados" e cards (`RestaurantCard`) com foto, coração de favorito, nome, chip de espera, "Bar · 350 m · ★ 4.7" e status.
- ✅ **Filtros** (folha inferior): Funcionamento (Aberto agora, Aceitando pedidos), Distância (até 1, 3 ou 5 km), Espera (até 15 min, até 30 min, qualquer), Tipo, Pagamento, "Ver resultados" e "Limpar filtros". **Ordenar por:** Recomendados, Mais próximos, Menor espera, Melhor avaliados. (Ordenação e filtros são controles separados.)
- ✅ **Mapa** (`MapView`): pinos; ao tocar, folha com imagem, nome, distância, status, espera e "Ver restaurante".
- ✅ **Sem resultados** (`EmptyNearbyState`): "Ainda não encontramos FilaZero por perto — Tente aumentar a área de busca ou procurar outra região." com "Alterar localização" e "Escanear QR Code".
- ✅ **Início** (Home global): "Olá, Lucas 👋", "Campinas, SP ▾", busca, card "Já está no local? Escaneie o QR Code" (oculto por flag), "Perto de você" com "Ver todos", "Visitados recentemente" e "Seus últimos pedidos". **A Home global não mostra produtos de cardápio.**
- **Na Sprint 1:** implemente localização, Restaurantes (lista, mapa, busca, chips, filtros, ordenação) e, no Início, a saudação, o seletor de cidade, a busca e "Perto de você". Ocultam-se: favoritos (chip e coração), filtro de pagamento, "Visitados recentemente", "Seus últimos pedidos", pedido em andamento e o card de QR.

**Regras:**
- Parâmetros: `lat, lng, radiusMeters` (default 10000, máx. 50000), `q`, `openNow`, `acceptingOrders`, `maxWaitMinutes`, `category`, `sort` (`recommended` | `distance` | `wait` | `rating`), `page`, `pageSize`.
- Só `ACTIVE` e com `lat/lng`. Estabelecimento em `SETUP` não aparece.
- **Busca de texto (`q`):** `unaccent` + `pg_trgm` sobre nome, categoria, tags, bairro **ou** nome de item ativo do cardápio (`EXISTS` em `menu_items`) — o placeholder cita "prato".
- **"Aberto agora"** = horário `BUSINESS` aberto agora (uma pausa de pedidos **não** tira o estabelecimento desse filtro). **"Aceitando pedidos"** = status derivado `OPEN` ou `BUSY`.
- "Menor espera" ordena por `wait_min_minutes` **numérico** crescente (nulos por último); o protótipo compara texto e erra a ordem (ex.: "8–12" vs "10–15"). "Mais próximos" ordena por distância; "Melhor avaliados" por nota; "Recomendados" = distância com desempate por nota.
- **Sem permissão de localização:** usar a cidade escolhida (default Campinas-SP, centro fixo em constante).
- Selo "Alta demanda" = status `BUSY`. Estados do card: Aceitando pedidos (verde), Alta demanda (amarelo), Pedidos pausados (índigo) e Fechado (cinza).
- Mapa: Leaflet + OpenStreetMap; clicar no pino abre a folha.
- Distância: Haversine em SQL com pré-filtro por caixa. Deve responder em até 2 s com 500 estabelecimentos no seed.

**Resposta (item):**
```json
{
  "id": "…", "name": "Bar do Mestre", "category": "BAR", "categoryLabel": "Bar",
  "coverPhotoUrl": "…", "distanceMeters": 350,
  "ratingAvg": 4.7, "ratingCount": 312,
  "waitTime": { "minMinutes": 12, "maxMinutes": 18 },
  "operationalStatus": "OPEN", "isOpenNow": true,
  "tags": ["Cervejas artesanais", "Petiscos"]
}
```

**API:** `GET /establishments`.

**Tarefas**
- [ ] Integrar geolocalização do usuário (com fallback para a cidade escolhida)
- [ ] Listar estabelecimentos por distância
- [ ] Criar filtros (aberto agora, mais próximos, menor espera)
- [ ] Exibir mapa com os locais

**Critérios de aceite**
```gherkin
Cenário: Ordenação por distância com status visível
  Dado 5 estabelecimentos ACTIVE a distâncias diferentes do cliente
  Quando o cliente abre a busca com a localização ativada
  Então a lista vem ordenada da menor para a maior distância
  E cada card mostra "Aceitando pedidos", "Alta demanda", "Pedidos pausados" ou "Fechado"
  E a resposta chega em até 2 segundos

Cenário: Filtro "Aberto agora"
  Dado estabelecimentos abertos e fechados no horário atual
  Quando o cliente ativa "Aberto agora"
  Então só aparecem os abertos

Cenário: Menor espera em ordem numérica
  Dado estabelecimentos com esperas 8–12, 10–15, 25–30 e sem informação
  Quando o cliente ordena por "Menor espera"
  Então a ordem é 8–12, 10–15, 25–30 e por último o sem informação

Cenário: Busca por item do cardápio
  Dado um restaurante com o item "X-Burger"
  Quando o cliente busca "burger"
  Então esse restaurante aparece na lista

Cenário: Suspenso e em configuração não aparecem
  Dado estabelecimentos SUSPENDED e SETUP
  Quando o cliente busca
  Então nenhum deles está na lista nem no contador

Cenário: Sem permissão de localização
  Dado que o cliente negou a localização
  Quando abre a busca
  Então a lista usa a cidade do seletor e continua funcionando
```

**Casos de borda e testes:** desempenho com 500 estabelecimentos no seed; busca com acento ("cafe" encontra "Café"); raio máximo; paginação estável; o chip "Favoritos" não aparece na Sprint 1.
---

### História 28 — Cadastro e edição de cardápio · 5 pts · Gestor

**História:** Como gestor, quero cadastrar, editar e organizar os itens do cardápio por categoria, com foto, descrição e preço, para manter os produtos sempre atualizados sem depender de suporte técnico para qualquer mudança.

**Telas (protótipo, `ManagerApp.tsx`):**
- ✅ **Shell do gestor:** barra lateral escura "FilaZero · Painel gestor" com seletor de unidade (multiunidade) e grupos **Operação** (Visão geral, Pedidos, Comandas, **Planta**, **Fila de espera**, Reservas, Chamados, KDS, Atendimento), **Catálogo** (**Cardápio**, **Promoções**, **Fichas técnicas**, Estoque, Compras, Fornecedores), Clientes, Gestão, **Estabelecimento** (Estabelecimento, **Mesas e locais**, QR Codes, **Horários**, Integrações, Saúde do sistema, Capacidade, Auditoria, Configurações) e Conta. Na Sprint 1 ative só os itens da sprint.
- ✅ **Cardápio** (`MenuSection`): "N itens no cardápio" e botão "Novo item"; tabela com **Item** (foto, nome e selo "+ pedido"), **Categoria**, **Preço**, **Status** (botão "Disponível"/"Esgotado" que alterna) e **Ações** (editar, excluir).
- ❌ O formulário de criar/editar item **não está ligado** no protótipo. A spec pede: foto, nome, descrição, categoria, preço, disponibilidade e opções/adicionais. Proposta: gaveta de edição com nome, descrição (até 400), preço com máscara BRL, categoria, foto (upload com prévia), destaque "+ pedido" e disponibilidade. Opções e adicionais (personalização) ficam para a Sprint 2.
- ❌ Gestão de categorias (a spec da fase 3 lista "Produtos" e "Categorias"): criar, renomear, reordenar, ativar e desativar.

**Regras:**
- Preço inteiro em centavos, mínimo 1. Descrição até 400 caracteres. Nome até 120.
- Excluir item = exclusão lógica (`deleted_at`, `is_active = false`). Excluir categoria só se estiver vazia (`422 CATEGORY_NOT_EMPTY`).
- **Toda** mudança de cardápio incrementa `menuVersion` e, só depois de gravar no `localStorage`, emite `menu.updated`.
- O botão de status da tabela usa o mesmo endpoint de disponibilidade da história 19 (gestor também pode).
- Upload: JPEG/PNG/WebP até 5 MB; `sharp` gera versão de 1000 px e miniatura de 400 px em WebP. Rejeitar outros tipos (`400 INVALID_IMAGE`).
- O gestor só enxerga e edita o próprio estabelecimento (ou os da rede dele).
- 🔶 **Categoria "Mais pedidos":** no protótipo ela é a primeira aba do cardápio do cliente, mas não é uma categoria cadastrada. Na Sprint 1 ela lista os itens com `is_featured = true`; o cálculo por vendas é a história 46 (Sprint 2).

**API:** `GET /establishments/:id/menu-items` (gestão), `GET/POST /establishments/:id/menu/categories`, `PATCH/DELETE .../:categoryId`, `POST /establishments/:id/menu/items`, `PATCH/DELETE .../:itemId`, `POST .../:itemId/photo`.

**Tarefas**
- [ ] Criar tela de gestão de cardápio
- [ ] Permitir criar, editar e excluir itens
- [ ] Organizar itens por categoria
- [ ] Definir preço, foto e descrição de cada item

**Critérios de aceite**
```gherkin
Cenário: Alteração aparece para o cliente em até 1 minuto
  Dado um item "X-Burger" a R$ 28,90 visível no cardápio do cliente
  Quando o gestor altera o preço para R$ 30,90 e salva
  Então GET /establishments/:id/menu devolve R$ 30,90
  E o cliente vê o novo preço em até 1 minuto, sem atualizar o app

Cenário: Item excluído some
  Dado um item ativo
  Quando o gestor o exclui
  Então ele não aparece mais no cardápio do cliente nem na lista de gestão
  E continua existindo no banco com deleted_at preenchido

Cenário: Categoria com itens não pode ser excluída
  Dado uma categoria com 2 itens
  Quando o gestor tenta excluí-la
  Então recebe 422 CATEGORY_NOT_EMPTY

Cenário: Isolamento entre estabelecimentos
  Dado um gestor do estabelecimento A
  Quando tenta editar um item do estabelecimento B
  Então recebe 404

Cenário: Foto inválida
  Dado um arquivo PDF enviado como foto
  Quando o gestor faz o upload
  Então recebe 400 INVALID_IMAGE
```

**Casos de borda e testes:** preço com vírgula na UI vira centavos inteiros sem erro de arredondamento; `menu_version` incrementa uma vez por operação.
---

### História 03 — Menu de lanches (cardápio do cliente) · 5 pts · Cliente

**História:** Como cliente, quero navegar por um menu organizado em categorias, com foto, descrição dos ingredientes e preço de cada item, para escolher meu pedido com facilidade e sem depender de perguntar ao garçom o que tem em cada prato.

**Telas (protótipo, `ClientApp.tsx`):**
- ✅ **Cardápio:** cabeçalho com o **restaurante** ("Bar do Zé" e, se houver, "Mesa 18"), busca "Buscar no cardápio…", chips de categoria (**Mais pedidos, Cervejas, Drinks, Porções, Lanches, Combos**), cards com foto, nome, descrição (2 linhas), preço, botão "+", selo **"+ pedido"** (mais pedido) e selo de promoção (ex.: "Happy Hour -20%", "Combo -15%"). Item **esgotado** fica visível, desabilitado e com selo "Esgotado" ✅ (spec e `mock.ts`).
- **O cardápio nunca existe sem um restaurante**: o caminho é Início → Restaurante → Cardápio, ou QR → Restaurante → Cardápio. Sem QR o cardápio é **modo consulta**: "Você pode consultar o cardápio. Para fazer um pedido, confirme sua presença pelo QR Code do estabelecimento."
- O botão "+" e a barra do carrinho ficam ocultos até `ORDERING_ENABLED` (carrinho é da Sprint 2).

**Regras:**
- `GET /establishments/:id/menu?q=&categoryId=` devolve categorias ativas em ordem e **todos** os itens ativos, cada um com `isAvailable`.
- 🔶 **Item esgotado:** o protótipo o mostra visível e desabilitado com selo "Esgotado"; a ficha 19 diz que ele "some". **Default desta versão: seguir o protótipo** (visível + "Esgotado"). Se o grupo preferir ocultar, basta filtrar `is_available = true` na consulta e ajustar o texto do critério.
- Chip "Mais pedidos" = itens com `is_featured = true` na Sprint 1 (cálculo por vendas na Sprint 2). O selo "+ pedido" também vem de `is_featured`.
- **Promoção vigente:** o item traz `priceCents` (original), `promoPriceCents` e `promo.label` (ex.: "Happy Hour -20%"). A UI mostra o preço original riscado. Ver história 29.
- Busca com `unaccent` no servidor, mais filtro instantâneo no cliente.
- Estabelecimento que não está `ACTIVE` → `404`. Estabelecimento `PAUSED` ou `CLOSED` → cardápio em modo consulta.
- Desempenho: imagens com `loading="lazy"` e `srcset` (400/1000 px); resposta com gzip; alvo p95 de 2 s no 4G e ≤ 300 ms de API com 100 itens.
- Assine o evento `menu.updated` (mesma aba e `BroadcastChannel`); ao recebê-lo, refaça a consulta. Reserva: polling de 3 s.

**Resposta (resumo):**
```json
{
  "establishmentId": "…", "menuVersion": 42, "operationalStatus": "OPEN",
  "categories": [
    { "id": "…", "name": "Cervejas", "items": [
      { "id": "…", "name": "Cerveja IPA 600ml",
        "description": "Artesanal com notas cítricas e amargor equilibrado",
        "priceCents": 1890, "promoPriceCents": null, "promo": null,
        "photoUrl": "…", "isFeatured": true, "isAvailable": true }
    ]}
  ]
}
```

**API:** `GET /establishments/:id/menu`.

**Tarefas**
- [ ] Cadastrar itens no painel administrativo (entregue pela história 28)
- [ ] Permitir upload de fotos dos itens (história 28)
- [ ] Organizar por categorias (cervejas, drinks, porções)
- [ ] Adicionar busca e filtro no cardápio

**Critérios de aceite**
```gherkin
Cenário: Todo item mostra foto, nome, descrição e preço
  Dado um estabelecimento com itens cadastrados
  Quando o cliente abre o cardápio
  Então cada item exibe foto, nome, descrição e preço formatado em BRL

Cenário: Carregamento em até 2 segundos
  Dado um cardápio com 100 itens em conexão 4G simulada
  Quando o cliente abre o cardápio
  Então o conteúdo principal aparece em até 2 segundos

Cenário: Filtro por categoria e busca
  Dado itens em várias categorias
  Quando o cliente escolhe "Drinks" e busca "lim"
  Então aparecem só os itens de Drinks cujo nome contém "lim" (sem diferenciar acento)

Cenário: Item esgotado visível e desabilitado
  Dado o item "X-Bacon" marcado como Esgotado
  Quando o cliente abre o cardápio
  Então o item aparece desabilitado com o selo "Esgotado"

Cenário: Preço promocional
  Dado uma promoção vigente de 20% na "Caipirinha de Limão" de R$ 22,00
  Quando o cliente abre o cardápio
  Então o item mostra R$ 22,00 riscado e R$ 17,60 como preço atual e o selo "Happy Hour -20%"
```
(Conta: 2200 − round(2200 × 20 / 100) = 1760 centavos.)

**Casos de borda e testes:** categoria sem itens não aparece; item sem foto usa um placeholder; nenhum item excluído vaza na resposta.
---

### História 19 — Disponibilidade do cardápio · 3 pts · Atendente

**História:** Como atendente, quero marcar rapidamente um item do cardápio como esgotado assim que ele acabar no estoque, para que os clientes não peçam algo indisponível e a cozinha não perca tempo recusando pedidos.

**Telas (protótipo, `AttendantApp.tsx`):**
- ✅ **Cardápio rápido** (`MenuToggleSection`): título "Disponibilidade do cardápio", subtítulo "Bar do Mestre · Carlos Mendes", aviso "Alterações refletem imediatamente no cardápio do cliente.", cartões com nome, categoria, rótulo "Disponível" (verde) ou "Esgotado" (cinza) e toggle. Itens: Cerveja IPA 600ml, X-Burger, Caipirinha de Limão, Batata Frita, X-Bacon (Esgotado), Heineken Long Neck…
- ✅ **Shell do atendente:** barra lateral escura e estreita com o logo/avatar e os ícones **Pedidos, Mapa de mesas, Comandas, Chamados, Cozinha (KDS), Cardápio, Histórico**; cabeçalho com o nome da tela, "estabelecimento · atendente" e a pílula "● Bar aberto". Na Sprint 1 só o item "Cardápio" fica ativo. O aviso "Impressora offline" é da Sprint 3 e **não** entra agora.

**Regras:**
- Toggle otimista na UI, com reversão se a API falhar.
- Ao alterar: gravar `isAvailable`, incrementar `menuVersion`, emitir `menu.updated` e gravar `AuditLog` (`AVAILABILITY_CHANGED`, com antes, depois e quem alterou; a spec mostra "20:53 — Ana marcou Cerveja IPA como indisponível" ✅).
- 🔶 **Permissão:** a ficha 19 é do **atendente**, e a tela do atendente tem o toggle. Mas a matriz de permissões do protótipo (`ROLE_PERMISSIONS`) lista "Marcar itens indisponíveis" só para **Supervisor e Gestor**. Default desta versão: `ATTENDANT`, `SUPERVISOR` e `MANAGER` podem alternar (a ficha manda). Deixe a permissão configurável (`MARK_ITEM_UNAVAILABLE`) para o grupo restringir depois.
- Reativar usa o mesmo toggle. Atendente e gestor só agem no próprio estabelecimento (tenant guard).
- Histórico de um item: `GET /establishments/:id/menu-items/:itemId/history` (lê o `AuditLog`).
- **Preparar a Sprint 2:** criar o helper `assertItemOrderable(itemId)` que lança `422 ITEM_UNAVAILABLE` se `is_available = false` ou o item estiver excluído, com teste. O carrinho vai usá-lo.

**API:** `PATCH /establishments/:id/menu-items/:itemId/availability` (`{ isAvailable }`).

**Tarefas**
- [ ] Criar tela de disponibilidade com toggle por item
- [ ] Refletir mudança no cardápio do cliente em tempo real
- [ ] Permitir reativar item quando voltar ao estoque
- [ ] Registrar histórico de alterações

**Critérios de aceite** (🔶 reescritos para o comportamento do protótipo — o item continua visível, mas desabilitado; se o grupo optar por ocultar, troque "aparece como Esgotado" por "some")
```gherkin
Cenário: Item esgotado aparece como "Esgotado" em até 5 segundos
  Dado um item "X-Bacon" disponível no cardápio do cliente
  Quando o atendente o marca como Esgotado
  Então em até 5 segundos o cliente vê o item desabilitado com o selo "Esgotado"

Cenário: Item esgotado não pode ser adicionado ao carrinho
  Dado um item marcado como Esgotado
  Quando o helper assertItemOrderable é chamado para ele
  Então lança 422 ITEM_UNAVAILABLE

Cenário: Reativar
  Dado um item Esgotado
  Quando o atendente o marca como Disponível
  Então em até 5 segundos ele volta a poder ser pedido

Cenário: Histórico
  Dado um item que foi esgotado e reativado
  Então o histórico lista as duas alterações com data e autor

Cenário: Isolamento
  Dado um atendente do estabelecimento A
  Quando tenta alterar item do estabelecimento B
  Então recebe 404
```

**Casos de borda e testes:** o teste dos 5 segundos escuta o evento `menu.updated` e mede o tempo até a consulta do cardápio refletir; toggle repetido rapidamente termina no estado final correto.
---

### História 29 — Promoções e descontos · 5 pts · Gestor

**História:** Como gestor, quero criar promoções e descontos configuráveis por item e período, para atrair mais clientes em horários de baixo movimento e ver a promoção ativar e desativar automaticamente sem precisar mexer manualmente todo dia.

**Telas (protótipo, `PromotionsSection`):**
- ✅ **Promoções:** botão "Nova promoção" e uma lista de cartões, cada um com **nome** e selo **Ativo/Inativo**, "**itens** · −**desconto**" e "**dias** · **horário**", mais os ícones de editar e excluir. Exemplos do protótipo:
  - *Happy Hour* — Cervejas, Drinks · −20% · Seg–Sex · 17:00–19:00 · Ativo
  - *Combo da semana* — Combos · −15% · Toda semana · 00:00–23:59 · Ativo
  - *Quarta universitária* — Todos · −10% · Qua · 20:00–22:00 · Inativo
- ✅ **No cliente:** selos no cartão do item ("Happy Hour -20%", "Combo -15%") e, na spec "Preço por horário", o preço fixo: "R$ 14" riscado, "R$ 9 Happy Hour" e "até 20:00".
- ❌ O formulário "Nova promoção" não está desenhado. Proposta: nome; escopo (Todos, Categorias, Itens); tipo (% ou preço fixo) e valor; dias da semana (chips Seg a Dom); horário inicial e final; ativo.
- Os cartões "Frete grátis" e "10% de cashback" da Home do cliente são de outras histórias (cupom e cashback): **não implementar aqui**.

**Regras:**
- Exige `PROMOTIONS` no plano.
- **Promoção é recorrente** (dias da semana + janela de horário), não uma janela única de datas. `valid_from/valid_until` são opcionais para campanhas com data.
- `PERCENT`: inteiro de 1 a 95. `FIXED_PRICE_CENTS`: preço final menor que o do item.
- **Vigente agora** = `is_active` e o dia da semana está em `weekdays` e a hora local está em `[start_time, end_time)` no fuso do estabelecimento. Se `end_time < start_time`, a janela cruza a meia-noite (vale também na madrugada do dia seguinte). Calculado **em cada leitura**, sem job. O status mostrado ao gestor (Ativa agora, Agendada, Inativa) também é derivado.
- **Sobreposição:** se mais de uma promoção vale no mesmo item ao mesmo tempo, **vence a de menor preço final**. Nunca acumulam.
- Preço promocional: `PERCENT` → `price − round_half_up(price × pct / 100)`; `FIXED_PRICE_CENTS` → o próprio valor.
- A promoção só aparece se o item estiver ativo, e o plano tiver `PROMOTIONS`. Item indisponível continua mostrando o selo (fica "Esgotado").
- Criar, editar e excluir geram `AuditLog`. Como o início e o fim de uma janela mudam o cardápio sem ação humana, o cliente deve refazer a consulta a cada 60 s na tela do cardápio e ao voltar ao app.

**API:** `GET/POST /establishments/:id/promotions`, `PATCH/DELETE .../:promotionId`.

**Tarefas**
- [ ] Criar tela de cadastro de promoções
- [ ] Definir item, desconto e período de validade
- [ ] Aplicar promoção automaticamente no cardápio do cliente
- [ ] Encerrar promoção automaticamente ao fim do período

**Critérios de aceite**
```gherkin
Cenário: Promoção aparece só na janela semanal
  Dado a promoção "Happy Hour" de 20% em Cervejas e Drinks, de segunda a sexta, das 17:00 às 19:00
  Quando o cliente consulta o cardápio na segunda às 18:00
  Então a "Caipirinha de Limão" mostra o preço promocional e o selo "Happy Hour -20%"
  Quando consulta na segunda às 19:00
  Então o item volta ao preço normal, sem nenhuma ação manual
  Quando consulta no sábado às 18:00
  Então o item está com o preço normal

Cenário: Promoção inativa não se aplica
  Dado a promoção "Quarta universitária" marcada como Inativa
  Quando o cliente consulta o cardápio na quarta às 21:00
  Então nenhum item recebe desconto

Cenário: Escopo "Todos"
  Dado uma promoção de 10% com escopo Todos
  Quando o cliente consulta o cardápio dentro da janela
  Então todos os itens ativos mostram o desconto

Cenário: Melhor preço vence
  Dado duas promoções vigentes no mesmo item, de 10% e de 20%
  Quando o cliente consulta o cardápio
  Então o item mostra o desconto de 20%, sem somar os dois

Cenário: Janela que cruza a meia-noite
  Dado uma promoção das 22:00 às 02:00 na sexta
  Quando o cliente consulta no sábado à 01:00
  Então a promoção está vigente

Cenário: Plano sem promoções
  Dado uma organização cujo plano não inclui PROMOTIONS
  Quando o gestor abre promoções
  Então recebe 403 FEATURE_NOT_IN_PLAN
  E as promoções existentes deixam de aparecer no cardápio
```

**Casos de borda e testes:** arredondamento half-up com preços ímpares; preço fixo maior ou igual ao preço do item é rejeitado; todo o cálculo em UTC, convertido no fuso do estabelecimento na borda.
---

### História 31 — Fichas técnicas · 5 pts · Gestor

**História:** Como gestor, quero cadastrar a ficha técnica de cada item do cardápio, com ingredientes, quantidades e custo unitário, para controlar o custo real de cada prato, padronizar o preparo entre os cozinheiros e saber exatamente minha margem de lucro.

**Telas (protótipo, `RecipesSection`):**
- ✅ **Fichas técnicas:** chips de categoria (Todas, Lanches, Porções, Bebidas), botão "Nova ficha" e tabela **Produto, Categoria, Ingredientes (quantidade), Custo, Preço venda, Margem**. Ao clicar numa linha abre um painel com as linhas de ingredientes (nome, quantidade, custo), **Custo total, Preço venda, Margem** e o botão "Editar ficha". Exemplo: X-Burger — pão de hambúrguer 1 un (R$ 1,20), hambúrguer 160 g (R$ 7,20), queijo cheddar 2 fatias (R$ 1,80), molho especial 20 g (R$ 1,20) → custo R$ 11,40, margem 65%.
- ❌ O editor ("Nova ficha" e "Editar ficha") **não está ligado**. Proposta: seleção do item do cardápio, linhas (ingrediente, quantidade, unidade), rendimento, modo de preparo, painel com custo e margem ao vivo.
- Na spec da fase 3 a ficha técnica faz parte do **Estoque** (baixa automática, movimentações, compras, fornecedores): **isso não entra na Sprint 1**. Aqui só ficha técnica, ingredientes e custo.
- ⚠️ As fichas do protótipo **não batem com o cardápio** (X-Burger a R$ 32,90 na ficha e R$ 28,90 no cardápio; "Cerveja IPA 500ml" vs 600ml; "Batata Frita Grande" R$ 22,90 vs "Batata Frita" R$ 22,00; Gin Tônica R$ 34,90 vs R$ 28,00). No produto a ficha é **ligada ao item do cardápio** (`menu_item_id`) e o preço vem do cardápio.

**Regras de cálculo (obrigatórias):**
- Dimensões: massa (`G`, `KG`), volume (`ML`, `L`) e contagem (`UN`, `CX`, `PCT`). Converter a quantidade da linha para a **unidade de compra** do ingrediente: `G→KG ÷1000`, `KG→G ×1000`, `ML→L ÷1000`, `L→ML ×1000`, mesma unidade ×1. Dimensões diferentes (ou `UN` com `CX`/`PCT`) → `422 UNIT_INCOMPATIBLE`.
- `custoLinha = quantidadeConvertida × unit_cost_cents` (usar `Decimal`, nunca float).
- `custoPorção = round_half_up( Σ custoLinha ÷ yield_portions )`, em centavos.
- **`margem` = `(preço − custo)`; `margemPercent = margem ÷ preço × 100`** (1 casa decimal), com o preço **base** do item (sem promoção) ✅. O protótipo mostra a margem inteira (65%).
- Alerta opcional: `cmvPercent = custo ÷ preço × 100`; `costAlert = cmvPercent > max_cost_percent` (default 40).
- **Calcular na leitura** (nunca guardar o custo pronto). Assim, mudar o preço de um ingrediente atualiza todos os pratos na hora.
- Exige `RECIPE_SHEETS` no plano (⚠️ proposta). Excluir ingrediente em uso → `409 INGREDIENT_IN_USE`. **Produto sem ficha** ou **custo desconhecido** aparecem como "—" na lista (edge case da spec).

**API:** `GET/POST /establishments/:id/ingredients`, `PATCH/DELETE .../:ingredientId`, `GET/PUT /establishments/:id/menu/items/:itemId/recipe-sheet`, `GET /establishments/:id/recipe-sheets` (lista com custo e margem).

**Resposta da ficha (resumo):**
```json
{ "menuItemId": "…", "yieldPortions": 1, "maxCostPercent": 40,
  "lines": [ { "ingredientId": "…", "name": "Pão de hambúrguer", "quantity": 1, "unit": "UN", "costCents": 120 } ],
  "costPerPortionCents": 1140, "priceCents": 2890, "marginCents": 1750, "marginPercent": 60.6,
  "cmvPercent": 39.4, "costAlert": false }
```

**Tarefas**
- [ ] Criar tela de ficha técnica vinculada ao item do cardápio
- [ ] Cadastrar ingredientes, quantidades e custo unitário
- [ ] Calcular custo total do prato automaticamente
- [ ] Alertar quando o custo ultrapassar um limite definido

**Critérios de aceite**
```gherkin
Cenário: Custo e margem calculados automaticamente
  Dado os ingredientes "Pão de hambúrguer" a R$ 1,20/un, "Hambúrguer 160 g" a R$ 7,20/un, "Queijo cheddar" a R$ 0,90/un e "Molho especial" a R$ 60,00/kg
  E a ficha do "X-Burger" (R$ 28,90) com 1 pão, 1 hambúrguer, 2 queijos e 20 g de molho
  Quando o gestor abre a ficha
  Então o custo por porção é R$ 11,40 (120 + 720 + 180 + 120 centavos)
  E a margem é R$ 17,50 (60,6%)
  E não há alerta (CMV de 39,4% com limite de 40%)

Cenário: Mudança de preço recalcula todos os pratos e liga o alerta
  Dado a ficha acima
  Quando o gestor altera o "Molho especial" para R$ 72,00/kg
  Então o custo do "X-Burger" passa para R$ 11,64 (a linha do molho vai de 120 para 144)
  E a margem passa para R$ 17,26 (59,7%)
  E o alerta aparece (CMV de 40,3%)
  E toda outra ficha que usa "Molho especial" também é recalculada

Cenário: Unidade incompatível
  Dado um ingrediente comprado em KG
  Quando o gestor lança uma linha em ML
  Então recebe 422 UNIT_INCOMPATIBLE

Cenário: Ingrediente em uso
  Dado um ingrediente usado em uma ficha
  Quando o gestor tenta excluí-lo
  Então recebe 409 INGREDIENT_IN_USE

Cenário: Produto sem ficha
  Dado um item do cardápio sem ficha técnica
  Quando o gestor abre a lista de fichas
  Então o item aparece com custo e margem "—"
```

**Casos de borda e testes:** rendimento maior que 1; quantidade com 3 casas decimais; ficha sem linhas (custo 0 e aviso); item sem preço válido não gera divisão por zero.
---

### História 20 — Planta do salão · 5 pts · Gestor

**História:** Como gestor, quero desenhar a planta do salão posicionando cada mesa no lugar exato em que ela fica fisicamente, definindo formato e capacidade, para que o mapa de mesas do atendente reflita o layout real do estabelecimento e facilite a localização durante o rush.

**Telas (protótipo):**
- ✅ **Gestor · Planta** (`FloorMgrSection`, grupo Operação): legenda de status, **grade de 18 mesas** (ícone + número, cor por status: Livre, Ocupada, Reservada, Aguardando pgto, Atenção) e, ao tocar numa mesa, um painel com o nome, o status e os botões "Transferir mesa", "Juntar mesas" e "Fechar mesa".
- ✅ **Gestor · Mesas e locais** (`TablesSection`, grupo Estabelecimento): "N locais configurados em M áreas", botões "Nova área" e "Adicionar mesa" (modal com "Nome da mesa" e "Área"); por área (**Salão, Área externa, Balcão**) uma tabela **Mesa/Local, Código (M01), QR Code (QR-0001), Status (Ativa/Desativada)** e ações de editar e QR.
- ✅ **Atendente · Mapa de mesas** (`FloorMapSection`, referência visual): grade de 6 colunas × 3 linhas, cada mesa com número, status (Livre, Ocupada, Reservada, Pagamento, Chamado, Indisp.), pessoas, tempo aberto e total. Resumo "18 mesas · 6 ocupadas · 7 livres · 1 chamado". O mapa do atendente é da Sprint 2.
- ❌ **Editor visual da planta** (arrastar e organizar): só na spec da fase 3 — mesa quadrada, mesa redonda, balcão, área e ponto de retirada, "associar cada elemento a uma mesa cadastrada", **"não criar um CAD complexo"**. Não há tela. Proposta: canvas em grade (6 × 3 por padrão, ampliável), paleta "Adicionar mesa/balcão/área/ponto de retirada", arrastar com `dnd-kit`, redimensionar de 1 a 3 células, número editável e botão "Salvar planta".
- **Acessibilidade ✅ (spec):** não depender só da cor; usar ícone e texto de status.

**Regras:**
- **Mesas e locais:** CRUD de `Area` e `DiningTable` (`code` único, `label`, `type`, `capacity`, `is_active`). Desativada some do mapa e não recebe fila.
- **Planta:** `PUT /floor-plan` recebe a grade e a lista de posições (`grid_x, grid_y, grid_w, grid_h`) das mesas existentes e dos novos elementos, em uma transação. Validar: sem sobreposição de células, dentro dos limites da grade, `code` e `label` únicos, capacidade de 1 a 30 para `TABLE`.
- Mesas novas nascem `AVAILABLE` e com `qr_token` (128 bits, hex) único. **Nunca** regenerar o `qr_token` de mesa existente (a substituição de QR é fluxo administrativo da Sprint 2).
- **Status mínimo:** `PATCH /tables/:tableId/status` permite `AVAILABLE`, `OCCUPIED` e `UNAVAILABLE` (e os demais valores do enum, para o mapa do atendente). Na Sprint 1 aparece no painel da mesa como "Liberar", "Ocupar" e "Bloquear", o que também permite testar a fila. Mudança para `AVAILABLE` dispara a regra da história 21. "Transferir", "Juntar" e "Fechar mesa" aparecem desabilitados ("Em breve"): são das Sprints 2 e 3.
- **Componente compartilhado:** crie `FloorMap` (somente leitura) usado na Planta, no editor e, na Sprint 2, no mapa do atendente. Ele desenha a partir de `grid_*`.
- Não há limite de mesas por plano nesta versão (o plano do protótipo limita **unidades**, não mesas).
- 🔶 Se o Figma passar a mostrar posicionamento livre em vez de grade, troque a grade por coordenadas em pixels sem mudar a API.

**API:** `GET/POST /establishments/:id/areas`, `PATCH/DELETE .../:areaId`, `POST /establishments/:id/tables`, `PATCH/DELETE .../:tableId`, `GET/PUT /establishments/:id/floor-plan`, `PATCH /establishments/:id/tables/:tableId/status`.

**Tarefas**
- [ ] Criar editor visual de arrastar e soltar mesas
- [ ] Permitir definir formato e capacidade de cada mesa
- [ ] Salvar layout por estabelecimento
- [ ] Sincronizar planta com o mapa de mesas do atendente (`GET /floor-plan` + componente `FloorMap`)

**Critérios de aceite**
```gherkin
Cenário: Mesa reposicionada aparece na mesma posição
  Dado uma planta salva com a mesa "5" na célula (2, 1)
  Quando o gestor move a mesa "5" para a célula (4, 2) e salva
  Então GET /floor-plan devolve a mesa "5" em (4, 2)
  E o FloorMap renderiza a mesa nessa posição, sem reconfiguração manual

Cenário: Sobreposição bloqueada
  Dado duas mesas ocupando a mesma célula
  Quando o gestor tenta salvar
  Então recebe 422 TABLE_OVERLAP e nada é salvo

Cenário: Código de mesa único
  Dado uma mesa com código "M03"
  Quando o gestor cria outra mesa com o código "M03"
  Então recebe 409 TABLE_CODE_TAKEN

Cenário: Mesa desativada
  Dado uma mesa Ativa
  Quando o gestor a desativa em "Mesas e locais"
  Então ela deixa de aparecer no mapa e não recebe clientes da fila

Cenário: QR Token estável
  Dado uma mesa existente com qr_token X
  Quando o gestor salva a planta de novo
  Então o qr_token da mesa continua X

Cenário: Liberar, ocupar e bloquear
  Dado uma mesa OCCUPIED
  Quando o gestor escolhe "Liberar"
  Então o status passa para AVAILABLE
```

**Casos de borda e testes:** salvar é atômico (erro no meio não deixa a planta pela metade); redimensionar para fora da grade é rejeitado; remover todas as mesas é permitido; o `FloorMap` mostra ícone e texto além da cor.
---

### História 21 — Fila de espera · 5 pts · Gestor

**História:** Como gestor, quero gerenciar a fila de espera de clientes sem mesa disponível, registrando nome e tamanho do grupo, para organizar o atendimento em horários de pico e evitar bagunça na entrada do estabelecimento.

**Telas (protótipo):**
- ✅ **Gestor · Fila de espera** (`WaitlistMgrSection`, grupo Operação): dois indicadores — "**Total na fila**: 3 grupos" e "**Espera estimada**: ~30 min" —, cartão "Fila de espera" com o botão "**Adicionar**" e tabela **Pos.** (número), **Cliente** (nome + telefone), **Pessoas** ("4 pessoas"), **Tempo esperando** ("19 min") e **Ações**: **Chamar**, **Atribuir mesa**, **Não compareceu** e **X** (remover). Dados do protótipo: Lucas Torres (4 pessoas, 19 min), Marina Silva (2, 24 min), João Mendes (3, 30 min).
- ✅ **Cliente** (`WaitlistScreens.tsx`, **UI é da Sprint 3**): página do restaurante com "🔴 Lotado no momento — Espera estimada: 25–35 min" e o botão "Entrar na fila"; "**Entrar na fila**" com "Quantas pessoas?" (− 4 +), nome e telefone e o aviso "Você receberá um aviso quando a mesa estiver pronta."; **posição** ("Você está na fila — 4º lugar — Estimativa: 18–25 min — Grupo: 4 pessoas — Atualizado agora", "Sair da fila"); e "**Sua mesa está pronta!** — Dirija-se à recepção" com "Estou chegando". A spec diz para **não inventar penalidade** nem contador sem regra do restaurante.
- ❌ O modal do botão "Adicionar" e o seletor de mesa de "Atribuir mesa" não estão desenhados. Proposta: nome, nº de pessoas e telefone opcional; e a lista de mesas **livres e compatíveis** (spec §30).

**Regras:**
- Exige `WAITLIST` no plano (⚠️ proposta).
- **Mesa compatível:** `is_active`, `type = TABLE` e `capacity >= party_size`.
- **Ações do gestor:** *Chamar* (`NOTIFIED`), *Atribuir mesa* (escolhe uma mesa `AVAILABLE` compatível → `SEATED`, `seated_table_id`, e a mesa vira `OCCUPIED`), *Não compareceu* (`NO_SHOW`) e *Remover* (`CANCELED`). Reordenar manualmente não existe no protótipo, mas a ficha pede: mantenha `PATCH .../:entryId { position }` como API e deixe a UI para depois.
- **Tempo esperando** = agora − `created_at` (é o que a tabela mostra).
- **Estimativa v1 (heurística documentada):** para a entrada na posição `i` (0 é a primeira): `compatíveis` = mesas ativas com capacidade suficiente; `livresAgora` = as compatíveis em `AVAILABLE`; `faltam = max(0, i + 1 − livresAgora)`; `eta = faltam == 0 ? 0 : ceil(faltam ÷ max(1, compatíveis)) × avg_table_turnover_min`. Se `compatíveis == 0` → `eta = null` e a UI avisa "Nenhuma mesa comporta X pessoas". O indicador "Espera estimada" do topo é o maior `eta` da fila.
- **Notificação automática (RF24):** ao mudar uma mesa para `AVAILABLE`, na mesma chamada de função: escolher a primeira entrada `WAITING` (por `position`) com `partySize <= capacity`, marcá-la `NOTIFIED` (`notifiedAt`, `notifiedTableId`) e, se tiver `userId`, criar `Notification` `IN_APP` (`WAITLIST_TABLE_READY`: "Sua mesa está pronta!"). **Depois de gravar no `localStorage`**, emitir o evento `waitlist.notified`: `{ entryId, tableId, tableLabel }`. Meta: menos de 10 s (o esperado é menos de 1 s, já que não há rede de verdade).
- A mesa continua `AVAILABLE` depois do chamado (não há reserva automática) — decisão aberta. Cliente sem conta: só a tela do gestor avisa; SMS e WhatsApp ficam para depois (n8n).
- **API do cliente (preparada agora, UI na Sprint 3):** `POST /establishments/:id/waitlist/join`, `GET /me/waitlist`, `DELETE /me/waitlist/:entryId`.

**API:** `GET/POST /establishments/:id/waitlist`, `PATCH/DELETE .../:entryId`, `POST .../:entryId/notify`, `POST .../:entryId/assign-table`, `POST .../:entryId/no-show`, `subscribe('waitlist.notified', ...)` (evento).

**Tarefas**
- [ ] Criar tela de fila de espera com nome e tamanho do grupo
- [ ] Estimar tempo de espera com base em mesas disponíveis
- [ ] Notificar cliente quando a mesa estiver pronta
- [ ] Permitir remover ou reordenar da fila manualmente

**Critérios de aceite**
```gherkin
Cenário: Próximo da fila é notificado em até 10 segundos
  Dado a fila: 1) Lucas (4 pessoas) e 2) Marina (2 pessoas)
  E a mesa 8 (capacidade 6) ocupada
  Quando a mesa 8 é liberada
  Então Lucas passa a NOTIFIED em até 10 segundos
  E a tela do gestor mostra "Mesa 8 liberada → chame Lucas"

Cenário: Mesa pequena pula quem não cabe
  Dado a fila: 1) Lucas (6 pessoas) e 2) Marina (2 pessoas)
  E a mesa 3 (capacidade 2) é liberada
  Então Marina é notificada e Lucas continua WAITING na 1ª posição

Cenário: Atribuir mesa
  Dado Lucas (4 pessoas) NOTIFIED e a mesa 2 livre com capacidade 4
  Quando o gestor escolhe "Atribuir mesa" e a mesa 2
  Então Lucas passa a SEATED e a mesa 2 passa a OCCUPIED

Cenário: Mesa incompatível não pode ser atribuída
  Dado um grupo de 6 pessoas e a mesa 3 (capacidade 2)
  Quando o gestor tenta atribuí-la
  Então recebe 422 TABLE_TOO_SMALL

Cenário: Não compareceu
  Dado um cliente NOTIFIED que não apareceu
  Quando o gestor escolhe "Não compareceu"
  Então o status passa a NO_SHOW e ele sai da fila ativa

Cenário: Sem mesa compatível
  Dado uma entrada de 12 pessoas e nenhuma mesa com capacidade 12
  Então a estimativa é nula e a UI avisa que nenhuma mesa comporta o grupo

Cenário: Plano sem fila de espera
  Dado uma organização cujo plano não inclui WAITLIST
  Quando o gestor abre a fila
  Então recebe 403 FEATURE_NOT_IN_PLAN
```

**Casos de borda e testes:** liberar duas mesas quase ao mesmo tempo não notifica a mesma entrada duas vezes (o JavaScript é single-thread, então basta processar a fila dentro da mesma chamada de função, sem concorrência real); fila vazia não gera evento; o teste de 10 s mede do `PATCH` de status até o evento `waitlist.notified`; o cliente que sai da fila (`DELETE`) some da lista do gestor.
---

## 6. Requisitos não funcionais, "segurança" e LGPD (modo mock)

> Sem backend (seção 0.2), boa parte da segurança de servidor não se aplica — não existe um servidor para proteger. O que continua valendo, e é testável, são as regras de **validação, RBAC e isolamento de dados**, agora escritas em JavaScript dentro dos mock services em vez de em middlewares de API.

### Desempenho e tempo real (metas vindas dos critérios de aceite)

| Meta | Onde | Como verificar |
|---|---|---|
| Cardápio carrega em até 2 s | história 03 | teste com 100 itens no seed (tudo em memória, deve sobrar folga) |
| Busca de restaurantes em até 2 s | história 11 | seed de 500 estabelecimentos |
| Item esgotado some em até 5 s | história 19 | evento `menu.updated` (mesma aba e `BroadcastChannel`) |
| Alteração de cardápio reflete em até 1 min | história 28 | mesmo mecanismo |
| Próximo da fila notificado em até 10 s | história 21 | do `PATCH` de status ao evento `waitlist.notified` |
| Suspensão de usuário vale na próxima ação | história 36 | teste de integração contra o mock service |
| Troca de plano vale na próxima ação | história 37 | teste de integração contra o mock service |

### "Segurança" possível num mock local
- Validação de entrada com Zod em **toda** função mockada, igual valeria numa rota real.
- Isolamento por estabelecimento garantido pelo `assertEstablishmentAccess` **e** por testes (gestor A nunca lê ou escreve no B; erro `NOT_FOUND`, não `FORBIDDEN`, para não revelar que o recurso existe).
- Upload: validar tipo real do arquivo (não só a extensão) e tamanho máximo antes de redimensionar.
- **O que não existe, e não deve ser prometido:** senha com hash de verdade, token assinado, HTTPS, segredo de servidor, criptografia do CPF. É um protótipo acadêmico rodando 100% no navegador de quem está usando; **não é seguro para dados reais** e o `README` do projeto deve dizer isso claramente.

### LGPD (dados pessoais: nome, CPF, e-mail, celular, endereço) — leitura para a apresentação, não proteção real
- **Minimização:** só pedir o que a Sprint 1 usa. A listagem de usuários do admin não mostra CPF.
- **Base legal e transparência:** aceite registrado (`consentVersion`, `consentAcceptedAt`) e texto de política de privacidade acessível no cadastro (pode ser estático).
- **CPF:** mascarado na tela e ausente de qualquer `console.log`; como não há servidor, não há "cifrado em repouso" de verdade — documentar essa limitação (seção 0.2, item 7) em vez de fingir que existe.
- **Logs:** nunca imprimir CPF, senha, código OTP ou o objeto de sessão inteiro no console, nem em produção nem em desenvolvimento.
- **Direito de exclusão:** a Sprint 2 entrega a exclusão de conta. Por isso o `type User` já traz `deletedAt`/`anonymizedAt`.
- **Vantagem honesta de ser mock:** como os dados nunca saem do navegador de quem está usando (não há servidor coletando nada), a superfície de risco real é pequena — mas isso não substitui dizer, com todas as letras na apresentação e no `README`, que é um protótipo e não deve receber CPF ou dado real de ninguém.
- Este documento não substitui orientação jurídica: confirme a redação com o professor.

### Acessibilidade e usabilidade
- Contraste mínimo WCAG AA (atenção ao texto branco sobre o laranja da marca e ao cinza claro).
- Alvos de toque de pelo menos 44 × 44 px no cliente e no atendente (tablet).
- Todo campo tem rótulo; erro de formulário em texto e não só em cor; foco visível; navegação por teclado no gestor e no admin.
- Toggle de disponibilidade com `role="switch"` e `aria-checked`.

### Idioma, formatos e fuso
- Interface só em pt-BR. Moeda BRL (`R$ 18,90`). Datas `dd/MM/yyyy`, horas 24 h. Distância em metros até 999 m e em km depois ("350 m", "1,2 km").
- Fuso padrão `America/Sao_Paulo` por estabelecimento; dados guardados em UTC.

### Observabilidade (o suficiente para depurar um mock)
- `console.error` estruturado nos erros inesperados dos mock services (sem dado sensível).
- Um painel de dev simples (ex.: item escondido no menu, só em `import.meta.env.DEV`) para inspecionar as coleções do `localStorage` e chamar `resetMockData()`.

---

## 7. Interface (o que o protótipo mostra)

> Os valores abaixo vêm do **código do protótipo** (`src/index.css`, telas e specs). Use-os direto no `@theme` do Tailwind v4 e mantenha `reference/figma-make/` como fonte de verdade visual.

### Tokens reais (`src/index.css`)

```css
@theme {
  --color-background: #F7F6F3;   --color-foreground: #18160F;
  --color-card: #FFFFFF;         --color-card-foreground: #18160F;
  --color-primary: #E8700A;      --color-primary-foreground: #FFFFFF;
  --color-secondary: #7C2D3F;    --color-secondary-foreground: #FFFFFF;   /* vinho */
  --color-muted: #EDE8E0;        --color-muted-foreground: #6B6560;
  --color-border: #E8E3DC;
  --color-success: #16A34A;      --color-success-bg: #DCFCE7;
  --color-error: #DC2626;        --color-error-bg: #FEE2E2;
  --color-warning: #B45309;      --color-warning-bg: #FEF3C7;
  --font-display: 'Manrope', sans-serif;   /* pesos 400–800 */
  --font-body: 'Inter', sans-serif;        /* pesos 400–600 */
  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 14px; --radius-xl: 16px;
}
```
Cores de status usadas no código, fora do tema: azul (`blue-500`) para Reservada, roxo (`purple-500`) para Aguardando pagamento e índigo `#6366f1` para Pedidos pausados. Barras de rolagem finas (4 px) que só aparecem ao passar o mouse.

### Padrões visuais
- **Cliente (mobile, 390 × 844):** fundo off-white quente, cartões brancos com borda fina e cantos de 12 a 16 px, botão primário laranja em pílula com texto branco, botão secundário branco com borda, campos arredondados com rótulo acima, chips (ativo laranja, inativo bege `muted`), títulos em Manrope e texto em Inter. Sombras muito discretas e grade de 8 px (spec).
- **Navegação do cliente:** barra inferior de 4 abas com ícone + rótulo. **Dinâmica:** sem restaurante → Início, Restaurantes, Pedidos, Perfil; dentro de um restaurante → Início, Cardápio, Pedidos, Perfil. Bolinha laranja em "Pedidos" quando há pedido ativo.
- **Marca** (`src/components/brand/Logo.tsx`): `FilaZeroMark`, um símbolo de 3 barras horizontais **decrescentes** (a fila diminuindo) + um chevron `>` (movimento), desenhado em SVG com `currentColor`, e `FilaZeroLogo` (símbolo + wordmark "FilaZero"; tamanhos sm, md e lg; variantes light, dark e color). Copie o componente. A spec proíbe voltar ao placeholder "FZ" e proíbe usar foto de um bar como identidade da plataforma; nas telas de um restaurante use a foto e o nome dele dentro da estrutura visual do FilaZero.
- **Atendente (tablet, 1280 × 800):** barra lateral escura (`#18160F`) estreita (64 px) só com ícones; conteúdo legível para o horário de pico (KDS); nada de faturamento, fidelidade, planos ou marketing.
- **Gestor e Admin (desktop, 1440 × 900):** barra lateral escura (`#18160F`, 208 px) com grupos de itens, cabeçalho com título da tela e data, tabelas com cabeçalho discreto e ações à direita, e painel de detalhe que abre ao clicar na linha ("Ver").
- **Ícones:** `lucide-react`. **Gráficos:** `recharts`.
- **Estados de status:** verde (aceitando pedidos, disponível, livre), amarelo (alta demanda), laranja (ocupada), vermelho (chamado, cancelar), roxo (pagamento), azul (reservada), índigo (pedidos pausados), cinza (indisponível, esgotado, fechado). **Nunca só a cor**: sempre ícone ou texto também (spec, acessibilidade).
- **Divulgação progressiva** (spec): o cliente só vê fila quando existe fila, reserva quando o restaurante oferece, comanda quando aberta etc.; funcionários só veem o que o papel deles usa.

### Componentes do protótipo que valem reaproveitar
`AuthInput`, `PasswordInput`, `PasswordRequirements`, `LoadingButton`, `SocialButton`, `TermsCheckbox`, `OTPScreen` (6 posições e estados), `RestaurantCard`, `StatusBadge`, `MapView`, `BottomNav`, `Logo`, `OfflineBanner`, `SessionExpiredModal`, `AgeConfirmScreen`, e as seções de tabela do gestor e do admin. Porte para `src/components` e troque os dados fixos por chamadas aos mock services (seção 4).

### Estados obrigatórios em toda tela
Carregando (skeleton), vazio (texto + saída clara), erro (mensagem + tentar de novo), sem permissão, sem conexão ("Sem conexão — Algumas informações podem estar desatualizadas") e sessão expirada. A spec exige **saída clara** em todo estado de erro.

### Telas do protótipo que **não** são da Sprint 1 (não construir)
Splash e Onboarding, leitor de QR e QR inválido/bar fechado, confirmação de idade, notificações, carrinho, pagamento, acompanhamento e recibo, avaliação, comandas e pedido colaborativo, mapa de mesas do atendente, KDS, chamados, reservas, fidelidade, cashback, cupons, delivery, financeiro, estoque, compras, fornecedores, capacidade, saúde, segurança do gestor, aprovações, onboarding B2B, "Plano e cobrança" do gestor, visão geral do gestor e do admin, suporte, incidentes e métricas do admin.

---

## 8. Dados de exemplo (seed)

Os dados vêm de `src/data/mock.ts` e das telas do protótipo. Itens com ⚠️ são **placeholders** (o protótipo não define o valor ou os dados se contradizem).

**Usuários** (senha de dev: `Filazero@123`, só para desenvolvimento)

| Nome | E-mail | Papel | Vínculo |
|---|---|---|---|
| Admin FilaZero | `admin@filazero.dev` | `PLATFORM_ADMIN` | — |
| Lucas Torres ✅ | `lucas@bardoze.com.br` ✅ | `STAFF` | `MANAGER` da organização **Grupo Bar do Zé** |
| Carlos Mendes ✅ | `carlos@filazero.dev` ⚠️ | `STAFF` | `ATTENDANT` do Bar do Mestre |
| Ana Rodrigues ✅ | `ana@filazero.dev` ⚠️ | `STAFF` | `ATTENDANT` do Bar do Mestre |
| Mariana Costa ✅ | `mariana@filazero.dev` ⚠️ | `STAFF` | `ATTENDANT` (inativa: último acesso em 25 ago) |
| João ✅ | `joao@email.com` · +55 19 99999-9999 ✅ | `CUSTOMER` | — |

Endereços do cliente ✅: **Casa** — Rua das Acácias, 123, Campinas-SP (padrão); **Trabalho** — Av. Universitária, 450, Barão Geraldo-SP.

**Organizações e planos** ✅ (`AdminApp.tsx`): *Grupo Bar do Zé* (plano **Pro**, 3 unidades, gestor Lucas Torres), *Restaurantes Bela Vista* (**Start**, 1 unidade, Fernanda Costa) e *Boteco Corp* (**Business**, 2 unidades, Ricardo Lima). Cada estabelecimento avulso do `mock.ts` ganha uma organização própria (plano Start).

**Estabelecimentos** (coordenadas fictícias em Campinas-SP; ponto de referência de teste: -22.9056, -47.0608; posicione cada um à distância indicada usando um helper `offsetMeters`)

| Nome | Tipo | Endereço | Dist. | Nota | Espera | Status | Horário | Tags |
|---|---|---|---|---|---|---|---|---|
| **Bar do Mestre** ✅ | Bar | Rua das Flores, 148 · Centro | 350 m | 4,7 (312) | 12–18 min | aberto | 17:00–02:00 | Cervejas artesanais, Petiscos |
| **Seu Joaquim Bar** ✅ | Bar | Av. Brasil, 512 · Barão Geraldo | 800 m | 4,3 (189) | 25–30 min | **alta demanda** | 18:00–01:00 | Chopes, Botequim |
| **Cantina Universitária** ✅ | Cantina | Campus Unicamp · Cidade Universitária | 1,2 km | 4,5 (421) | 15–20 min | **fechado** ("Abre às 18:00") | abre 18:00 | Almoço, Lanches |
| **Boteco da Vila** ✅ | Bar | Rua da Vila, 88 · Jardim das Flores | 600 m | 4,6 (256) | 10–15 min | aberto | 16:00–00:00 | Rodízio de petiscos, Happy Hour |
| **Lancheria do Zé** ✅ | Lanchonete | Rua 7 de Setembro, 203 | 450 m | 4,4 (178) | 8–12 min | aberto | 11:00–23:00 | Hambúrgueres, Combos |
| **Bar do Zé — Cambuí** ✅ | Bar | Rua Augusta, 742 · Centro ⚠️ | 220 m | 4,8 (512) | 15–20 min | **pedidos pausados** | 17:00–02:00 | Cervejas, Petiscos, Happy Hour |
| Bar do Zé — Taquaral ✅ | Bar | ⚠️ | — | — | — | aberto | ⚠️ | — |
| Bar do Zé — Centro ✅ | Bar | ⚠️ | — | — | — | **em configuração** (`SETUP`) | — | — |
| Restaurante São Paulo ✅ | Restaurante | ⚠️ (São Paulo-SP) | — | — | — | **suspenso** | — | — |

O horário `ORDERS` de cada um é igual ao de funcionamento (⚠️ o protótipo só mostra o exemplo "17:30 → 00:30"). Com `SEED_LOAD_TEST=1`, gerar +500 estabelecimentos aleatórios para o teste de desempenho da busca.

**Cardápio do Bar do Mestre** (`mock.ts`, todos ✅). Categorias: Cervejas, Drinks, Porções, Lanches, Combos (mais a aba virtual "Mais pedidos").

| Item | Categoria | Preço | Descrição | Flags |
|---|---|---|---|---|
| Cerveja IPA 600ml | Cervejas | R$ 18,90 | Artesanal com notas cítricas e amargor equilibrado | destaque |
| X-Burger | Lanches | R$ 28,90 | Hambúrguer artesanal 180g, alface, tomate, cheddar e maionese especial | destaque |
| Caipirinha de Limão | Drinks | R$ 22,00 | Cachaça premium, limão siciliano e açúcar cristal | promoção "Happy Hour -20%" |
| Batata Frita | Porções | R$ 22,00 | Porção 400g crocante com molho aïoli | |
| X-Bacon | Lanches | R$ 32,90 | Hambúrguer com bacon crocante, queijo e cebola caramelizada | **esgotado** |
| Heineken Long Neck | Cervejas | R$ 12,90 | Cerveja holandesa 330ml gelada | |
| Combo IPA + X-Burger | Combos | R$ 42,00 | Cerveja IPA 600ml + X-Burger com batata pequena | destaque, promoção "Combo -15%" ⚠️ (não fica claro se R$ 42,00 é antes ou depois do desconto; o seed usa antes) |
| Gin Tônica | Drinks | R$ 28,00 | Gin premium, água tônica Schweppes, pepino e pimenta rosa | |
| Porção de Coxinha | Porções | R$ 35,00 | Bandeja com 12 unidades, frango desfiado e catupiry | |

**Promoções** ✅: *Happy Hour* (Cervejas e Drinks, −20%, Seg–Sex, 17:00–19:00, ativa); *Combo da semana* (Combos, −15%, toda semana, 00:00–23:59, ativa); *Quarta universitária* (Todos, −10%, quarta, 20:00–22:00, **inativa**).

**Mesas do Bar do Mestre** (grade 6 × 3). Áreas ✅: **Salão** (M01 a M18, "Mesa 1" a "Mesa 18"), **Área externa** (M21 e M22) e **Balcão** (`BLC`, tipo `COUNTER`). O **mapa do atendente** ✅ define os status iniciais das 18 mesas: livres 1, 5, 7, 9, 11, 14, 17; ocupadas 2, 3, 8, 12, 15, 18; reservadas 4 e 16; chamado 6; aguardando pagamento 10; indisponível 13. As capacidades **não aparecem** no protótipo (o número exibido é a quantidade de pessoas sentadas): use 2 lugares nas mesas 3, 5, 9, 12, 14 e 16; 6 lugares nas 8, 15 e 18; 4 lugares nas demais (e nas duas da área externa).

**Fila de espera** ✅ (`mock.ts`): Lucas Torres (4 pessoas, (19) 99874-1234, 19 min), Marina Silva (2, (19) 98765-4321, 24 min), João Mendes (3, (19) 97654-3210, 30 min). ⚠️ O protótipo põe Lucas na posição 1 mesmo esperando **menos** que os outros: no seed use a ordem de chegada (João, Marina, Lucas).

**Ingredientes e fichas** ✅ (`RecipesSection`). X-Burger: pão de hambúrguer 1 un (R$ 1,20), hambúrguer 160 g (R$ 7,20 por un), queijo cheddar 2 fatias (R$ 1,80; cadastre R$ 0,90/un), molho especial 20 g (R$ 1,20; cadastre R$ 60,00/kg) → custo R$ 11,40. Também: Batata Frita Grande (custo R$ 4,80), Cerveja IPA 500ml (R$ 6,40) e Gin Tônica (R$ 12,00), vinculadas aos itens equivalentes do cardápio.

**Planos:** os 3 da história 37 (Start R$ 99, Pro R$ 299, Business R$ 799).

---

## 9. Testes e Definição de Pronto (modo mock)

### Estratégia
- **Unitários (Vitest):** CPF, telefone, dinheiro (arredondamento), `isOpenNow`, conversão de unidades e cálculo de ficha técnica, preço promocional, estimativa da fila, entitlements — são funções puras, testam igual com ou sem backend.
- **Integração (Vitest + Testing Library):** um arquivo por mock service, cobrindo os cenários Gherkin das histórias, RBAC e isolamento por estabelecimento — chamando as funções diretamente (sem servidor de teste, sem banco de teste), com `localStorage` limpo (`resetMockData()`) a cada teste.
- **E2E (Playwright), fluxos críticos** (tudo no `vite dev`, um único processo):
  1. cadastro → login → buscar → abrir restaurante → ver cardápio;
  2. gestor cria item → aparece no cardápio do cliente;
  3. atendente esgota item → o cliente vê "Esgotado" (desabilitado) em até 5 s (duas abas + `BroadcastChannel`, ou um teste de componente que dispara o evento);
  4. admin suspende usuário → próxima ação dele falha;
  5. admin troca plano → recurso é bloqueado na hora;
  6. gestor libera mesa → próximo da fila é chamado.
- Cada cenário Gherkin da seção 5 tem **um teste com o mesmo nome**.

### Definição de Pronto (por história)
- [ ] Critérios de aceite implementados como testes automatizados e verdes
- [ ] `type`s (seção 3) e seed (seção 8) atualizados nas coleções mockadas
- [ ] RBAC e isolamento por estabelecimento testados
- [ ] Entrada validada com Zod; erros no formato padrão (`MockApiError`)
- [ ] Sem CPF, senha ou objeto de sessão em `console.log`
- [ ] UI fiel ao Figma nos estados carregando, vazio, erro e sem permissão; responsiva no dispositivo do papel
- [ ] Textos em pt-BR
- [ ] `lint`, `typecheck`, `test` e `build` passando
- [ ] Decisões novas registradas em `docs/DECISIONS.md`
- [ ] Commit da história (uma história por commit ou PR)

### Comandos esperados
```
npm install
npm run dev                     # abre o app (front + mock, tudo junto)
npm run seed:reset               # limpa o localStorage e recarrega o seed da seção 8
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e                 # fim de cada história
```

---

## 10. Decisões em aberto, fidelidade ao protótipo e inconsistências

### 10.1 Decisões em aberto (use o default e registre em `docs/DECISIONS.md`)

| # | Decisão | Default adotado | Afeta |
|---|---|---|---|
| 1 | Stack | app único **mock**, sem backend (seção 4; front com **Tailwind v4**, como o protótipo) | tudo |
| 2 | 🔶 **CPF no cadastro** | manter (a ficha 01 exige) como passo extra "Seu CPF"; o grupo atualiza o Figma | 01 |
| 3 | Login: OTP por SMS para celular; senha ou código para e-mail | seguir o protótipo; `OtpSender` com stub em dev; provedor de SMS a escolher | 06 |
| 4 | Login Apple (credenciais) | adaptador + flag desligada | 06 |
| 5 | Cliente que entra por login social não tem CPF | pedir CPF em "Complete seu cadastro" (só se o CPF for mantido) | 06 |
| 6 | Espera estimada: manual ou calculada? | manual (campos min/max) na Sprint 1 | 11, 12 |
| 7 | Mapa da busca | Leaflet + OpenStreetMap | 11 |
| 8 | Armazenamento de fotos | `base64` (WebP, redimensionado a 600 px) dentro do próprio registro do item, em `localStorage` (sem upload real; ver §0.2 item 8) | 28 |
| 9 | 🔶 **Item esgotado: ocultar ou mostrar?** | **visível e desabilitado com selo "Esgotado"** (protótipo). A ficha 19 diz "some": reescreva o critério | 03, 19 |
| 10 | 🔶 Quem marca item indisponível | atendente, supervisor e gestor (ficha 19), configurável; a matriz do protótipo só lista supervisor e gestor | 19 |
| 11 | Planta em grade ou posição livre? | grade | 20 |
| 12 | Aviso da fila para cliente sem conta | só a tela do gestor | 21 |
| 13 | A mesa liberada fica reservada para quem foi chamado? | não | 21 |
| 14 | 🔶 Preços dos planos | R$ 99, R$ 299 e R$ 799 do protótipo, editáveis no seed (a spec pede para não fixar) | 37 |
| 15 | ⚠️ Recursos `WAITLIST`, `RECIPE_SHEETS` e `PROMOTIONS` por plano | Start: só promoções; Pro e Business: todos | 37, 21, 29, 31 |
| 16 | Quem edita o perfil do estabelecimento | o gestor (telas "Estabelecimento" e "Horários") | 12 |
| 17 | Gestor de rede com várias unidades | vínculo por organização | 34, 36 |
| 18 | "Aberto agora" vs "Aceitando pedidos" | "Aberto agora" = horário de funcionamento; "Aceitando pedidos" = status `OPEN` ou `BUSY` | 11, 12 |
| 19 | Aba "Mais pedidos" | itens com `is_featured` na Sprint 1; por vendas na Sprint 2 | 03, 28 |
| 20 | ⚠️ Ativar estabelecimento (`SETUP → ACTIVE`) | exige nome, endereço, lat/lng e horário de pedidos | 34 |
| 21 | Combo R$ 42,00: preço antes ou depois do desconto de 15%? | antes (o seed aplica −15% por cima) | seed, 29 |
| 22 | Hospedagem para a apresentação | **GitHub Pages** (grátis, link fixo, dá para gerar QR Code; ver seção 13) | infra |
| 23 | Roteamento em produção | `HashRouter` (URLs com `/#/`), por causa do GitHub Pages (seção 4, decisão 11) | infra, todas |

### 10.2 Mapa de fidelidade ao protótipo (lido do código)

| História | O que o protótipo tem | O que falta |
|---|---|---|
| 01 Cadastro | Boas-vindas, passos de nome, contato e termos, "Conta criada!" ✅ | 🔶 **CPF não existe** |
| 03 Menu | Cardápio do cliente ✅ | — |
| 06 Login | Login, OTP com 6 estados, e-mail e senha, Google e Apple ✅ | — |
| 11 Buscar | Localização, Restaurantes (chips, filtros, ordenação), mapa, vazio, Início ✅ | — |
| 12 Página | Detalhe do restaurante ✅; telas "Estabelecimento" e "Horários" do gestor ✅ | ⚠️ "Pausar pedidos" só na spec |
| 13 Perfil | Perfil, Editar, Privacidade e conta, Meus endereços, Sair ✅ | — |
| 19 Disponibilidade | Cardápio rápido do atendente ✅ | 🔶 permissão |
| 20 Planta | Planta (grade) ✅, Mesas e locais ✅, mapa do atendente ✅ | ❌ **editor visual** (só na spec) |
| 21 Fila de espera | Fila do gestor ✅ e do cliente ✅ | ❌ modal "Adicionar" e seletor de mesa |
| 28 Cardápio (gestor) | Tabela de itens com status ✅ | ❌ **formulário de item** e categorias |
| 29 Promoções | Lista de promoções ✅ | ❌ **formulário** |
| 31 Fichas técnicas | Lista e painel de ingredientes ✅ | ❌ **editor da ficha** |
| 34 Estabelecimentos | Tabela, busca e painel de detalhe ✅ | ❌ **formulário "Novo"** |
| 36 Usuários | Tabela, busca, "Suspender", "Exportar" ✅ | ❌ **detalhe e troca de papel** |
| 37 Planos | Só o item de menu (placeholder) ❌; cartões de plano no painel do gestor ✅ | ❌ **tela admin de Planos** |

**Resumo:** 6 histórias têm tela completa (03, 06, 11, 12, 13, 19); 8 têm tela parcial (01, 20, 21, 28, 29, 31, 34, 36: a lista existe, faltam formulário, editor ou detalhe); **1 não tem tela** (37). Total: 15. Onde faltar tela, as propostas deste documento valem; se o grupo desenhar no Figma, o Figma manda.

### 10.3 Inconsistências no protótipo (não bloqueiam a Sprint 1)
1. **Nome do estabelecimento:** cliente, atendente e a tela "Estabelecimento" usam **"Bar do Mestre"**; o seletor do gestor e as specs usam **"Bar do Zé"** (Grupo Bar do Zé). No `mock.ts` há os dois ("Bar do Mestre" e "Bar do Zé", este pausado). Decidir se são o mesmo lugar.
2. **Total do pedido #184 = R$ 108,70** em `ORDER_184.subtotal` e `total` (`src/data/mock.ts`), mas 2× Cerveja IPA (R$ 37,80) + X-Burger (R$ 28,90) + Batata Frita (R$ 22,00) somam **R$ 88,70**. É valor fixo no arquivo, não conta. Correção: `subtotal: 88.70` e `total: 88.70`. **Não use R$ 108,70 como fixture.**
3. Em `ORDER_HISTORY_WITH_RESTAURANT`, "2× Cerveja IPA, 1× X-Burger" aparece com R$ 108,70 (a soma dá R$ 66,70). A spec ainda cita R$ 48,90 para o mesmo pedido.
4. **Duas listas de mesas:** "Mesas e locais" tem M01 a M04, M21, M22 e BLC; a Planta e o mapa do atendente têm "Mesa 1" a "Mesa 18". A spec fala em "Mesa 18". O seed une as duas.
5. **Fichas técnicas ≠ cardápio:** X-Burger custa R$ 32,90 na ficha e R$ 28,90 no cardápio; "Cerveja IPA 500ml" vs 600ml; "Batata Frita Grande" R$ 22,90 vs "Batata Frita" R$ 22,00; Gin Tônica R$ 34,90 vs R$ 28,00; hambúrguer de 160 g na ficha e "180g" na descrição do cardápio.
6. **Fila de espera:** Lucas está na posição 1 com 19 min esperando e João na 3 com 30 min; numa fila por ordem de chegada quem espera há mais tempo é o primeiro.
7. **Ordenação "Menor espera"** compara texto (`localeCompare`) em vez de número; "8–12" e "10–15" saem fora de ordem.
8. **Permissões:** a tela do atendente tem o toggle de disponibilidade, mas `ROLE_PERMISSIONS` só dá "Marcar itens indisponíveis" a Supervisor e Gestor.
9. **Estados diferentes para "fechado":** "Pedidos fechados" (spec da Home) e "Fechado" (spec do estabelecimento). O documento usa "Fechado".
10. A estimativa do mesmo pedido é "8–12 min" na Home e "20–25 min" no acompanhamento (Sprint 2).

---

## 11. BLOCO 4 — Prompt para Google Stitch (opcional)

> Só use se a equipe quiser desenhar as telas que **faltam** no protótipo: formulários de item, promoção e estabelecimento, editor da ficha técnica, editor visual da planta, modal da fila, detalhe de usuário e a tela admin de Planos. Para o resto, o código do protótipo é a referência.

```
Design a responsive web dashboard for "FilaZero", a SaaS platform that lets bars and restaurants take QR-code orders without queues. Screens for the restaurant manager (desktop 1440x900) and the platform admin (desktop). Style: warm, modern; off-white background (#F7F6F3), dark charcoal sidebar (#18160F, 208px), primary orange (#E8700A), secondary wine (#7C2D3F), white cards with 1px warm-gray borders (#E8E3DC) and 12-16px radius, pill buttons, Manrope for headings and Inter for body, Lucide-style line icons. UI language: Brazilian Portuguese.

Screens: (1) Manager · Menu item drawer: photo upload with preview, name, description, BRL price, category select, "+ pedido" featured toggle, availability toggle. (2) Manager · Promotion form: name, scope (Todos / Categorias / Itens), discount type (% or fixed price) and value, weekday chips (Seg to Dom), start and end time, active toggle; live preview "Happy Hour -20% · Seg-Sex · 17:00-19:00". (3) Manager · Recipe sheet editor: pick a menu item, ingredient rows (ingredient, quantity, unit), yield, live panel with total cost, price, margin % and a red alert badge above the cost limit. (4) Manager · Floor plan editor: grid canvas, palette (mesa quadrada, mesa redonda, balcao, area, ponto de retirada), drag and drop, side panel with number, capacity and status, "Salvar planta". (5) Manager · Waitlist: "Adicionar" modal (name, party size, phone) and an "Atribuir mesa" picker listing free compatible tables. (6) Admin · Establishment create form (basic info, address with map pin, organization, plan, responsible manager). (7) Admin · User detail side panel: basic data, memberships with role, audit history, suspend/reactivate with mandatory reason. (8) Admin · Plans: three plan cards (Start R$ 99, Pro R$ 299, Business R$ 799) with feature checklist, unit limit, and an edit drawer.

Components: sidebar with small uppercase group labels, status pills (green, orange, red, purple, blue, indigo, gray), tables with sortable headers, drawers, toasts, empty states.
```

---

## 12. BLOCO 5 — Prompt para o Claude Code (modo mock)

### 12.1 `CLAUDE.md` sugerido (na raiz do repositório)

```markdown
# FilaZero
App único: React 19 + Vite + TypeScript + Tailwind v4. SEM backend, SEM banco de dados real — modo mock (spec §0.2).
Dados guardados em localStorage via src/mock/*, seedados a partir da spec §8. Tempo real via EventTarget + BroadcastChannel (spec §4).
Spec completa: docs/SPEC-SPRINT1.md. Decisões: docs/DECISIONS.md.
Referência visual e de comportamento: reference/figma-make/ (protótipo React 19 + Vite + Tailwind v4; tokens em src/index.css; dados fictícios em src/data/mock.ts — vira o seed de src/mock/seed/, nunca é importado direto no app).

## Regras
- Dinheiro = centavos inteiros. Nunca float.
- "Multi-tenant" simulado: toda função de mock service filtra por establishmentId dentro da coleção; nunca confiar em establishmentId vindo só da UI sem checar a sessão.
- Zod em toda função mockada. Erro = MockApiError { code, status, message, details }.
- UI em pt-BR. Código, types e nomes de função em inglês.
- Nunca logar CPF, senha, código OTP ou o objeto de sessão inteiro.
- Suspensão de usuário e troca de plano valem na próxima chamada (releem a coleção, sem cache).
- Uma história por vez. Teste de aceite (Gherkin da spec) antes de fechar.
- Onde a spec e o protótipo divergirem, vale o protótipo, exceto os itens 🔶 da spec §0.1 (use o default e registre em DECISIONS.md).
- Porte as telas do protótipo para src/features e troque o import de mock.ts por chamadas aos mock services (src/mock/services).
- Sem Docker, sem Prisma, sem Express: se algo pedir isso, releia a spec §0.2 antes de criar.

## Comandos
npm install
npm run dev
npm run seed:reset
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e
```

### 12.2 Prompt de inicialização (cole no Claude Code)

```
Lê CLAUDE.md, docs/SPEC-SPRINT1.md e reference/figma-make/ (AGENTS.md, src/index.css, src/data/mock.ts e as telas do papel que for implementar). Constrói o FilaZero Sprint 1 (15 histórias, 67 pts) como um app ÚNICO em modo MOCK — sem backend, sem banco de dados real (spec §0.2 e §4).

Stack: React 19 + Vite + TS + Tailwind v4 + React Router + Zustand + RHF + Zod. Um projeto só, sem monorepo, sem Docker.

Ordem:
0. Fundação: projeto Vite, tokens do index.css, src/mock/types.ts (spec §3), src/mock/storage.ts, src/mock/errors.ts (MockApiError), src/mock/events.ts (EventTarget + BroadcastChannel), seed a partir do mock.ts (spec §8) em src/mock/seed/, src/mock/reset.ts, sessão em Zustand + localStorage (spec §4, decisão 2), RBAC e tenant guard (assertEstablishmentAccess), entitlements por organização, shells por papel (cliente, atendente, gestor, admin).
1. 01 → 06 → 13
2. 34 → 37 → 36
3. 12 → 11
4. 28 → 03 → 19 → 29 → 31
5. 20 → 21

Regras críticas:
- centavos int. establishmentId checado em toda função mockada. Zod em toda entrada.
- CPF (🔶 se mantido): valida dígitos, mascarado na UI, nunca em log — sem criptografia real (não existe servidor para guardar segredo; spec §0.2 item 7).
- suspensão vale na hora: toda função relê status do usuário antes de agir.
- plano vale na hora: entitlements relidos a cada chamada, sem cache.
- promoção (recorrente: dias + horário) e custo/margem da ficha calculados na leitura, nunca guardados prontos.
- item esgotado fica visível e desabilitado com selo "Esgotado", refletido via evento menu.updated em até 5 s. fila notifica via waitlist.notified em até 10 s.
- status operacional do estabelecimento é derivado (pausa, horário de pedidos, alta demanda) a cada leitura, nunca gravado.
- flags desligadas: ORDERING, LOYALTY, RESERVATIONS, AUTH_GOOGLE, AUTH_APPLE.
- fotos: redimensiona no canvas e guarda base64 no próprio registro (spec §4, decisão 7). Sem upload de verdade.

Por história: types/seed → mock service → UI (portada do protótipo) → testes Gherkin da spec. Um commit por história.
Onde a spec marcar ⚠️ ou ❌, siga a proposta e anote em docs/DECISIONS.md. Onde marcar 🔶, use o default da §10.1.
Não inventa escopo. Dúvida bloqueante: pergunta. O resto: default da spec §10.

Antes de cada commit: npm run lint && npm run typecheck && npm test && npm run build
Fim de história: npm run test:e2e

Começa pela Fase 0. Mostra o plano em 10 linhas antes de codar.
```

---

## 13. Publicar no GitHub Pages (para o professor escanear)

Como o app é 100% mock (seção 0.2) — sem backend, sem banco —, ele é um **site estático puro** depois do `npm run build`: publica sem servidor, sem variável de ambiente secreta, sem custo. Cada pessoa que abrir o link tem os próprios dados no `localStorage` do navegador dela (não são compartilhados entre visitantes — bom para a apresentação, cada um pode clicar à vontade sem estragar a demonstração de ninguém).

### 13.1 Ajustar o projeto

**`vite.config.ts`** — o `base` precisa ser o nome do repositório entre barras (o Pages de projeto serve em `usuario.github.io/repo/`, não na raiz):
```ts
export default defineConfig({
  base: '/NOME-DO-REPOSITORIO/',
  // ...resto da config
});
```

**Roteador:** use `createHashRouter`/`<HashRouter>` (decisão 11 da seção 4), não `BrowserRouter`. Sem isso, abrir um link direto para uma rota interna (ex.: o QR Code apontando para `/gestor`) dá 404 no Pages.

**`package.json`** — adicionar o script de build (o deploy em si fica no workflow abaixo, não precisa do pacote `gh-pages`):
```json
{
  "scripts": {
    "build": "vite build"
  }
}
```

### 13.2 Workflow do GitHub Actions (deploy automático a cada push)

Criar `.github/workflows/deploy.yml`:
```yaml
name: Deploy GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

No GitHub: **Settings → Pages → Source → GitHub Actions** (uma vez só, no repositório). A cada `git push` na `main`, o site publica sozinho em 1–2 minutos.

### 13.3 O link para o QR Code

```
https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/
```

Gerar o QR Code (qualquer serviço gratuito, ex. `https://www.qr-code-generator.com` ou o pacote `qrcode` do Node) apontando para essa URL e colocar no slide final da apresentação. Como é `HashRouter`, dá para até apontar o QR direto para uma tela específica, ex. `.../#/r/bar-do-mestre`.

**Antes da apresentação:** abrir o link uma vez em modo anônimo/privado para conferir que carrega do zero (seed do `localStorage`) e treinar o fluxo que será demonstrado ao vivo (o botão "Resetar dados" da seção 0.2, item 11, ajuda a voltar ao estado inicial entre um ensaio e outro).

---

*Fim do documento. Versão 1.2 (modo mock).*
