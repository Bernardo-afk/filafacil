# Decisões registradas

Formato: **# — Tema** · decisão adotada · por quê · onde afeta. Segue a regra da spec §0 item 6: adota o default indicado, registra aqui, segue em frente.

## Fase 0 — Fundação

### 1 — Protótipo Figma Make não disponível
Não recebemos `reference/figma-make/` (código-fonte do protótipo). Seguimos as descrições escritas da spec (`docs/SPEC-SPRINT1.md`) como fonte de verdade visual e de comportamento, como a própria spec prevê (§0 item 4: "Onde estiver ⚠️ ou ❌ e o Figma estiver acessível, consulte o Figma antes de decidir. Se não estiver, siga a proposta do documento").
**Afeta:** todas as telas construídas nas histórias seguintes. Se o protótipo real aparecer depois, comparar e ajustar.

### 2 — 🔶 CPF no cadastro
Mantido como passo curto extra "Seu CPF" (default da spec §10.1 #2). Implementação chega na história 01.

### 3 — 🔶 Item esgotado: visível ou oculto
Visível e desabilitado com selo "Esgotado" (default da spec §10.1 #9, RF10). Já aplicado no seed: X-Bacon (`isAvailable: false`).

### 4 — Organizações não mapeadas 1:1 pela spec
A spec (§8) nomeia só 3 organizações (Grupo Bar do Zé, Restaurantes Bela Vista, Boteco Corp) sem dizer quais dos 9 estabelecimentos do seed pertencem a cada uma, além das 3 unidades "Bar do Zé" já explícitas. Decisão: Grupo Bar do Zé fica com as 3 unidades "Bar do Zé" (Cambuí/Taquaral/Centro, como a spec diz); Restaurantes Bela Vista (Start, 1 unidade) fica com o Restaurante São Paulo; Boteco Corp (Business, 2 unidades) fica com Seu Joaquim Bar e Boteco da Vila; os estabelecimentos avulsos restantes (Bar do Mestre, Cantina Universitária, Lancheria do Zé) ganham cada um a própria organização no plano Start, seguindo a regra geral da spec §3 ("estabelecimento avulso ganha uma organização própria").
**Afeta:** `src/mock/seed/organizations.ts`, `establishments.ts`, `subscriptions.ts`. História 34/37.

### 5 — Bar do Mestre no plano Pro (não Start)
Como não há organização própria nomeada para o Bar do Mestre com um plano definido pela spec, e ele é o único estabelecimento com cardápio, promoções, fichas técnicas, mesas e fila completos no seed (o "estabelecimento de demonstração"), colocamos a organização dele no plano **Pro** — necessário para os recursos `RECIPE_SHEETS` e `WAITLIST` (só existem em Pro/Business, spec §10.1 #15) funcionarem na demonstração sem precisar trocar de plano manualmente antes de testar as histórias 21/31.
**Afeta:** `src/mock/seed/subscriptions.ts`. Histórias 21, 29, 31, 37.

### 6 — Lucas Torres também gestor do Bar do Mestre
A spec nota uma inconsistência do protótipo (§10.3 #1): "Bar do Mestre" (usado pelo cliente/atendente) e "Bar do Zé" (usado pelo seletor do gestor) podem ser o mesmo lugar, mas o `mock.ts` original tem os dois como estabelecimentos distintos. Como só a organização de Lucas (Grupo Bar do Zé) tinha um gestor nomeado, e o Bar do Mestre é o estabelecimento com os dados mais completos para testar as telas de gestor, demos a Lucas também um `Membership(MANAGER)` direto no Bar do Mestre.
**Afeta:** `src/mock/seed/memberships.ts`.

### 7 — Grid da planta do Bar do Mestre expandido para 6×4
O default do `FloorPlan` (spec §3) é 6×3, que cobre exatamente as 18 mesas do Salão (M01–M18). Para caber a Área externa (M21, M22) e o Balcão (BLC) na mesma planta (1 `FloorPlan` por estabelecimento, spec §3), usamos `gridRows: 4`: a 4ª linha tem a área externa e o balcão.
**Afeta:** `src/mock/seed/floorplan.ts`. História 20.

### 8 — Ficha técnica do hambúrguer: unidade de compra UN, não G
A tabela da spec (§8) mistura "hambúrguer 160 g (R$ 7,20 por un)" — um peso descritivo com um custo por unidade. Para o custo bater com o total de R$ 11,40 informado, tratamos "hambúrguer" e "queijo cheddar (fatia)" como ingredientes comprados e consumidos por unidade (UN), não por grama. O molho especial é comprado em KG e consumido em G (conversão dentro da mesma dimensão, permitida pela spec RF15).
**Afeta:** `src/mock/seed/ingredients.ts`. História 31.

### 9 — IDs do seed são slugs legíveis, não UUID
A spec pede `id: UUID (PK)` gerado com `crypto.randomUUID()` para toda entidade. Isso vale para tudo criado em tempo de execução pelos mock services (`src/lib/id.ts`). Para os dados fixos do seed (§8), usamos IDs legíveis (`user-admin`, `estab-bar-do-mestre`...) para poder referenciar entidades entre arquivos sem uma etapa extra de "resolver por nome"; nada no app valida formato de UUID, então isso não quebra nenhuma regra funcional.
**Afeta:** `src/mock/seed/**`.

### 10 — Fontes self-hosted via `@fontsource`, não Google Fonts CDN
A spec exige que o app funcione 100% offline durante a apresentação (§0.2: "continua funcionando offline durante a apresentação"). Um `<link>` para `fonts.googleapis.com` quebraria isso (e, à parte da spec, travou a verificação em navegador nesta sessão — a aba ficava esperando a fonte externa carregar). Trocado por `@fontsource/inter` e `@fontsource/manrope`, importados em `src/index.css`, empacotados pelo Vite.
**Afeta:** `src/index.css`, `index.html`, `package.json`.

### 11 — `npm run seed:reset` só orienta; o reset real é o botão no app
`resetMockData()` limpa `localStorage`, que só existe dentro do navegador — não é acessível a partir de um script Node fora dele. `npm run seed:reset` (`scripts/seed-reset-info.mjs`) imprime instruções; o reset de verdade é o botão "Resetar dados" (visível em modo dev na tela de boas-vindas) ou chamar `resetMockData()` no console do navegador com o app aberto.
**Afeta:** `package.json`, `scripts/seed-reset-info.mjs`, `src/features/auth/WelcomeScreen.tsx`.

### 12 — Verificação em navegador não pôde ser confirmada nesta sessão
O Browser pane usado para testar (ferramenta do ambiente, não parte do app) travou consistentemente ao carregar o bundle JS (tanto em `npm run dev` quanto em `vite preview`), mesmo com `curl` confirmando respostas HTTP 200 instantâneas e corretas do mesmo servidor. `typecheck`, `lint`, os 17 testes unitários e `npm run build` passam limpos. Recomenda-se rodar `npm run dev` localmente para confirmar visualmente antes da próxima história.
**Afeta:** processo de verificação, não o código do app.

## História 13 — Perfil do usuário

### 13 — "Referência opcional" do endereço entra em `complement`
A spec (§10.3, tela "Novo endereço") pede CEP, rua, número, complemento, bairro, cidade **e referência opcional**, mas a entidade `Address` (spec §3, já fechada na Fase 0) só tem uma coluna `complement`, sem `reference`. Como as duas são texto livre de apoio à entrega e a Fase 0 já está commitada, não adicionamos coluna nova: o campo do formulário virou "Complemento / referência (opcional)", gravado em `complement`.
**Afeta:** `src/features/profile/AddressFormScreen.tsx`. Não muda `src/mock/types.ts`.

### 14 — Sem seletor de localização no mapa
A spec cita "localização pelo mapa" no cadastro de endereço, mas o modo mock não tem backend nem chave de geocodificação real (spec §0.2: sem serviços externos). `lat`/`lng` do `Address` ficam `null` para endereços criados/editados pela UI (igual ao seed, spec §8). Se um provedor de mapas mock entrar depois, dá pra editar só o formulário sem mudar o service.
**Afeta:** `src/mock/services/addresses.ts`, `src/features/profile/AddressFormScreen.tsx`.

### 15 — Rotas de perfil ganham um guard de sessão (`RequireAuth`)
Nenhuma história anterior exigia sessão pra navegar: o "Explorar restaurantes" da tela de boas-vindas leva direto pra `/app` sem login (spec história 11, navegação de convidado). `/app/perfil` e suas sub-rotas são a primeira área que só faz sentido autenticado (`GET /me` não funciona sem sessão), então criamos `src/features/auth/RequireAuth.tsx`: sem sessão ativa, redireciona pro `/login`. As demais rotas de `/app` continuam abertas.
**Afeta:** `src/app/router.tsx`, `src/features/auth/RequireAuth.tsx`.

### 16 — "Sair de todos os dispositivos" também encerra a sessão local
A spec descreve o cenário com 2 aparelhos, mas o app roda num navegador só por sessão de teste — não dá pra ter 2 abas logadas como "aparelhos" diferentes de forma realista. Decisão: `usersService.logoutAllDevices()` revoga **todo** `RefreshToken` do usuário (incluindo o deste navegador) e também limpa a sessão local (`clearSession()`), já que este aparelho está entre "todos". Sem isso, a tela continuaria mostrando dados de uma sessão cujo refresh token já foi revogado.
**Afeta:** `src/mock/services/users.ts`, `src/features/profile/AccountManagementScreen.tsx`.

## História 34 — Estabelecimentos (Admin)

### 17 — "Painel de detalhe" e o formulário "Novo" viram telas próprias
A spec descreve um painel de detalhe (provavelmente lateral/slide-over no protótipo) e diz explicitamente que o formulário do botão "Novo" **não está desenhado** (❌, spec história 34). Sem o protótipo pra copiar a interação, seguimos o mesmo padrão já usado nas outras telas do app (rota própria em vez de modal/painel lateral — igual ao `AddressFormScreen` da história 13): `/admin/estabelecimentos/:id` (detalhe), `/admin/estabelecimentos/novo` e `/admin/estabelecimentos/:id/editar`.
**Afeta:** `src/features/admin/EstablishmentDetailScreen.tsx`, `src/features/admin/EstablishmentFormScreen.tsx`, `src/app/router.tsx`.

### 18 — Motivo obrigatório só ao suspender, não ao reativar
A spec escreve "`ACTIVE ↔ SUSPENDED` (motivo obrigatório)" com uma seta de mão dupla, o que é ambíguo sobre exigir motivo também ao reativar (`SUSPENDED → ACTIVE`). O cenário Gherkin da spec só testa "Motivo obrigatório para suspender" (a ida pra `SUSPENDED`). Adotado: motivo obrigatório apenas na transição **para** `SUSPENDED`; reativar (`SUSPENDED`/`DEACTIVATED` → `ACTIVE`) não pede motivo, e o `statusReason` é limpo ao sair de `SUSPENDED`.
**Afeta:** `src/mock/services/adminEstablishments.ts` (`changeStatus`).

### 19 — Limite de unidades conta todo estabelecimento da organização, não só os ACTIVE
`Establishment` não tem soft-delete, e a spec não diz se `MAX_UNITS` conta unidades suspensas/em configuração. Adotado: o contador de "unidades" da organização, usado por `entitlements.assertUnitLimit`, soma **todos** os estabelecimentos vinculados àquela `organizationId`, qualquer que seja o status — uma unidade suspensa continua ocupando vaga do plano até ser desativada/excluída (não há exclusão na Sprint 1).
**Afeta:** `src/mock/services/adminEstablishments.ts` (`create`).

### 20 — Rotas `/admin/*` ganham guard de papel (`RequireRole`)
Igual à decisão 15 (história 13), mas agora por **papel**, não só por sessão: `adminEstablishmentsService` já barra quem não é `PLATFORM_ADMIN` com `403 FORBIDDEN` (spec, cenário "Apenas admin acessa"), então a tela crasharia ao chamar o service sem guard nenhum — inclusive pelos atalhos de desenvolvimento da `WelcomeScreen`, que linkam direto pra `/admin` sem login. Criado `src/features/auth/RequireRole.tsx`: sem sessão manda pro `/login`, com sessão mas papel errado manda pro `/` (a tela sabe formular sua própria mensagem de "não autorizado" quando a história correspondente existir).
**Afeta:** `src/app/router.tsx`, `src/features/auth/RequireRole.tsx`.

## História 37 — Planos de assinatura (Admin)

### 21 — "Trocar plano" mora no detalhe do estabelecimento, não numa tela de Organizações
A spec propõe a ação "Plano atual"/"Trocar plano" "na tela da organização/estabelecimento", mas "Organizações" não é um item ativo da barra lateral nesta sprint (só Estabelecimentos, Usuários e Planos — spec história 34, "ative só os itens da sprint"). Como o `EstablishmentDetailScreen` (história 34) já mostra o selo de plano da organização, a ação "Trocar plano" foi anexada ali, valendo pra organização inteira (todas as unidades), em vez de criar uma tela de Organizações só pra isso.
**Afeta:** `src/features/admin/EstablishmentDetailScreen.tsx`.

### 22 — Trocar plano nunca deixa a assinatura nova como `TRIAL`
A spec (história 34) diz que uma organização nova sem assinatura ganha uma `TRIAL` no plano Start — isso é o "plano padrão de quem ainda não escolheu nada". Mas uma troca deliberada feita pelo admin (`PUT /admin/organizations/:id/subscription`) não é esse caso: a nova assinatura nasce `ACTIVE` diretamente (cobrança real é Sprint 5, então `nextBillingAt` fica `null`). Isso também garante nunca existirem 2 assinaturas `ACTIVE`/`TRIAL` simultâneas pra mesma organização (caso de borda da spec, "índice parcial impede"): a anterior é cancelada (`status: CANCELED`, `canceledAt`) antes de criar a nova, na mesma chamada síncrona.
**Afeta:** `src/mock/services/adminPlans.ts` (`changeOrganizationPlan`).

### 23 — `entitlements` já era "sem cache" desde a Fundação — nada mudou aqui
A spec descreve "trocar de plano vale na hora, sem deploy" como se fosse uma regra nova desta história, mas `entitlements.assertFeature`/`assertUnitLimit` (Fase 0) já relê `subscriptions`/`planFeatures` do zero a cada chamada. Resultado: os cenários "downgrade retira/upgrade libera o recurso na hora" já funcionam automaticamente assim que `adminPlansService.changeOrganizationPlan` grava a nova assinatura — testados diretamente contra `entitlements`, já que as telas de fichas técnicas (história 31) e fila de espera (história 21) ainda não existem pra exercitar isso pela UI.
**Afeta:** nenhum código novo; só o teste (`adminPlans.test.ts`) documenta o comportamento.
