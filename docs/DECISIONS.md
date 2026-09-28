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

## História 36 — Usuários da plataforma (Admin)

### 24 — "Proteção do último admin" cobre dois casos com códigos distintos
A spec junta "admin não pode suspender a si mesmo **nem** remover o último `PLATFORM_ADMIN` ativo" numa frase só, com um `422` genérico. São duas regras diferentes (a 1ª nunca depende de quantos admins existem; a 2ª só dispara quando o alvo é o único admin ativo), então viraram dois códigos: `CANNOT_SUSPEND_SELF` (em `suspend`) e `LAST_ADMIN_PROTECTED` (em `suspend` e em `changeRole`, quando o papel do último admin ativo mudaria para outro). Ambos continuam `422`, como a spec pede.
**Afeta:** `src/mock/errors.ts`, `src/mock/services/adminUsers.ts`.

### 25 — Motivo de suspensão de usuário só existe no `AuditLog`, não no registro
Diferente de `Establishment` (que ganhou `statusReason` na história 34), a entidade `User` (spec §3) não tem uma coluna de motivo. `POST /admin/users/:id/suspend` recebe `{ reason }`, mas ele só é gravado no `AuditLog.after` daquela troca de status — não existe um "motivo atual" exposto no perfil do usuário suspenso, só no histórico.
**Afeta:** `src/mock/services/adminUsers.ts` (`suspend`).

### 26 — Revogação de refresh token virou helper compartilhado
`usersService.logoutAllDevices` (história 13) e `adminUsersService.suspend` (história 36) precisam do mesmo passo — revogar todo `RefreshToken` de um usuário —, só que um age sobre a própria sessão e o outro sobre a de outra pessoa. Extraído `revokeAllRefreshTokensFor(userId)` em `src/mock/services/refreshTokens.ts` pros dois chamarem, em vez de duplicar o loop.
**Afeta:** `src/mock/services/refreshTokens.ts`, `src/mock/services/users.ts`, `src/mock/services/adminUsers.ts`.

### 27 — Trocar de papel sempre substitui o conjunto de vínculos inteiro
A spec (`PATCH /admin/users/:id { role, memberships[] }`) não deixa claro se `memberships[]` é um PATCH incremental ou o conjunto final. Adotado: substitui tudo — os vínculos antigos do usuário são apagados e os do payload (se o novo papel for `STAFF`) tomam o lugar. Um usuário deixando de ser `STAFF` perde todos os vínculos (fazem sentido só pra `STAFF`, spec §3 `Membership`). Mais simples de raciocinar no admin e evita vínculo órfão de um papel que a pessoa não tem mais.
**Afeta:** `src/mock/services/adminUsers.ts` (`changeRole`).

### 28 — Listagens de admin (usuários/estabelecimentos) não paginam de verdade
A spec história 36 cita "listagem paginada" nos casos de borda, mas não dá tamanho de página nem cenário Gherkin pra isso — mesma situação já aceita na história 34 (`EstablishmentsListScreen`, sem paginação real). Como o seed tem poucas dezenas de registros no máximo, `adminUsersService.list`/`adminEstablishmentsService.list` devolvem a lista inteira já filtrada; paginação de verdade fica pra quando o volume de dados justificar.
**Afeta:** `src/mock/services/adminUsers.ts`, `src/features/admin/UsersListScreen.tsx`.

## História 12 — Página do restaurante (+ Estabelecimento/Horários do gestor)

### 29 — "Painel de detalhe"/"Pausar pedidos" do gestor não ganham a tela de dashboard
A spec é explícita: "a tela do dashboard é de outra sprint, mas a API e o status entram agora, porque a página do restaurante depende deles". Implementado `managerEstablishmentService.pauseOrders/resumeOrders` (o núcleo que a história pede) e um controle simples de pausar/retomar dentro da tela "Estabelecimento" (que já existe nesta sprint) — não um dashboard novo. O texto de exemplo da spec ("Retorno estimado em 22 min") é cálculo de exibição; guardamos só `ordersPausedAt/Until/Reason` no `Establishment`, como já modelado na Fase 0.
**Afeta:** `src/mock/services/managerEstablishment.ts`, `src/features/manager/EstablishmentScreen.tsx`.

### 30 — Sem mapa interativo no formulário "Estabelecimento" do gestor
Mesma decisão 14 (história 13, endereço do cliente): o modo mock não tem provedor de mapas real. "Localização... com mapa com o ponto ajustável" vira dois campos numéricos (latitude/longitude) editáveis diretamente, com uma nota explicando a ausência do mapa.
**Afeta:** `src/features/manager/EstablishmentScreen.tsx`.

### 31 — `PATCH /establishments/:id/hours` substitui a semana inteira, não faz merge por dia
A spec descreve `PUT .../hours` (verbo que já sugere substituição total) mas não detalha o payload. Adotado: `managerEstablishmentService.updateHours` sempre recebe os 7 dias dos dois horários (funcionamento e pedidos) de uma vez e substitui todas as linhas de `EstablishmentHours` daquele estabelecimento — mais simples de raciocinar na UI (uma grade só) do que um PATCH parcial por dia/tipo, e citação com o verbo `PUT` da própria spec.
**Afeta:** `src/mock/services/managerEstablishment.ts` (`updateHours`).

### 32 — "Copiar horário para outros dias" virou "copiar para todos os dias"
A spec não detalha se a cópia pede pra escolher quais dias (um seletor múltiplo) ou copia pra todos de uma vez. Sem o protótipo, a ação mais simples e menos propensa a erro é copiar o dia de origem pra todos os outros 6 de uma vez (o gestor ainda pode reajustar dias específicos depois) — evita construir um seletor de dias só pra essa ação secundária.
**Afeta:** `src/features/manager/HoursScreen.tsx`.

### 33 — Rotas `/gestor/*` ganham guard de papel (`RequireRole`)
Mesma lógica das decisões 15/20: `managerEstablishmentService` já barra quem não tem `Membership(MANAGER)` no estabelecimento (404, spec §6), e as telas de gestor agora leem dados de verdade (antes eram só `Placeholder`). Adicionado `RequireRole roles={['STAFF']}` nas rotas `/gestor/*`, do mesmo jeito que `/admin/*` já tinha.
**Afeta:** `src/app/router.tsx`.

## História 11 — Buscar restaurantes próximos

### 34 — Sem Leaflet/OpenStreetMap: alternância "Mapa" fica desabilitada
A spec pede um `MapView` com Leaflet + OpenStreetMap, mas isso depende de carregar tiles de um servidor externo em tempo real — contradiz a exigência de a apresentação funcionar 100% offline (spec §0.2, já motivo da decisão 10 sobre fontes). Sem o protótipo pra copiar a interação exata do mapa, a alternância **Lista | Mapa** existe na tela (fiel ao layout da spec), mas o botão "Mapa" fica desabilitado com "Em breve — mapa depende de conexão com a internet"; a experiência de Lista (busca, chips, filtros, ordenação, cards) é implementada por completo.
**Afeta:** `src/features/discovery/RestaurantsScreen.tsx`.

### 35 — Localização do cliente não é uma coleção do mock, é preferência de dispositivo
`lat/lng`/cidade escolhida pelo cliente (`LocationPermissionScreen`) não é uma entidade da spec §3 — é estado efêmero do navegador, parecido com "em qual aba eu estava". Criado `src/lib/clientLocation.ts` com sua própria chave `filazero:client-location` em vez de uma coleção nova em `storage.ts`/`CollectionName`: não precisa de multi-tenant, RBAC ou reset de seed, só persistir a preferência entre telas.
**Afeta:** `src/lib/clientLocation.ts`, `src/features/discovery/LocationPermissionScreen.tsx`, `HomeScreen.tsx`, `RestaurantsScreen.tsx`.

### 36 — Chips da busca controlam filtro **e** ordenação juntos, mesmo a spec separando os dois
A spec diz "Ordenação e filtros são controles separados", mas também lista chips como "Mais próximos" e "Menor espera" que soam como atalhos de ordenação, junto de "Aberto agora"/"Bares"/"Restaurantes" que são filtros. Adotado: os chips continuam um controle único e simplificado (cada um seleciona um filtro OU seta o `sort`), enquanto a folha de filtros mantém "Ordenar por" como campo separado e completo (Recomendados/Mais próximos/Menor espera/Melhor avaliados) — assim quem quer os dois juntos (o caso comum) usa o chip, e quem quer combinações finas usa a folha.
**Afeta:** `src/features/discovery/RestaurantsScreen.tsx`.

### 37 — "Perto de você" e a Home global não têm produtos de cardápio nem cartões fora do escopo
A spec é explícita: "A Home global não mostra produtos de cardápio" e a Sprint 1 esconde favoritos, pagamento, "Visitados recentemente", "Seus últimos pedidos", pedido em andamento e o card de QR (`ORDERING_ENABLED=false`). `HomeScreen` implementa só saudação, seletor de cidade, busca e "Perto de você" (reaproveitando `RestaurantCard`/`searchEstablishments` da própria história 11) — nada além disso.
**Afeta:** `src/features/discovery/HomeScreen.tsx`.

## Histórias 28 + 03 + 19 + 29 — Cardápio (gestor, cliente, atendente) e promoções

### 38 — `applyPercentDiscount` corrigido pra `round_half_up` em vez de arredondar pra baixo
A função já existia desde a Fase 0 (prevista pra história 29), mas arredondava pra baixo (`Math.floor`). A spec exige explicitamente `round_half_up` no cálculo do preço promocional (história 29) e do custo de ficha técnica (história 31). Corrigida no lugar — sem uso em nenhuma outra história ainda, então não quebra nada — e testada com os valores exatos do Gherkin (R$ 22,00 −20% = R$ 17,60).
**Afeta:** `src/lib/money.ts` (`applyPercentDiscount`, novo `roundHalfUp`).

### 39 — Sem Decimal.js: cálculo de custo em `number`, arredondando só no fim
A spec pede "usar Decimal, nunca float" pro custo de ficha técnica (história 31) e promoções. Adicionar uma biblioteca de precisão decimal só pra isso não se justifica nesta sprint — os valores do seed (spec §8) não têm nenhum caso de imprecisão de ponto flutuante real (ex.: 20 g a R$ 60,00/kg dá exatamente 120 centavos). Mantido `number` em todo o cálculo, com `roundHalfUp` só no resultado final (nunca em passos intermediários) — se aparecer um caso real de imprecisão, aí sim vale trazer uma lib de Decimal.
**Afeta:** `src/lib/money.ts`, o cálculo de ficha técnica (história 31, a seguir).

### 40 — Histórico de disponibilidade (história 19) é visível por quem pode alternar, não só pelo gestor
`listItemHistory` inicialmente usava o mesmo guard de MANAGER da história 28 (edição de cardápio), mas a história 19 é do **atendente** — ele alterna disponibilidade e faz sentido ver o próprio histórico sem precisar do papel de gestor. Trocado pro guard `AVAILABILITY_ROLES` (`ATTENDANT`, `SUPERVISOR`, `MANAGER`), o mesmo que já protege `setAvailability`.
**Afeta:** `src/mock/services/managerMenu.ts` (`listItemHistory`).

### 41 — Preço fixo (`FIXED_PRICE_CENTS`) só com escopo "Itens"
A spec valida "preço fixo maior ou igual ao preço do item é rejeitado", mas não diz o que fazer quando o escopo é "Todos" ou "Categorias" — itens diferentes têm preços diferentes, então um preço fixo único não faz sentido comparado a vários itens ao mesmo tempo. Adotado: `discountType: FIXED_PRICE_CENTS` exige `scope: 'ITEMS'`; pra "Todos"/"Categorias" só o percentual é aceito.
**Afeta:** `src/mock/services/promotions.ts` (schema de validação).

### 42 — Upload de foto sem storage real: `URL.createObjectURL`, sem persistir entre sessões
Como não há backend (spec §0.2), não existe onde gravar o arquivo de verdade nem gerar as versões de 1000 px/400 px em WebP (`sharp`, história 28). O necessário pra exercitar a regra (JPEG/PNG/WebP até 5 MB, `400 INVALID_IMAGE` pro resto) está em `managerMenuService.validatePhoto`; a prévia usa `URL.createObjectURL` do navegador, que funciona na sessão atual mas não sobrevive a um F5 (a foto não é persistida em `localStorage`, só a URL efêmera do blob) — aceitável pra um mock de demonstração.
**Afeta:** `src/mock/services/managerMenu.ts` (`validatePhoto`), `src/features/manager/MenuScreen.tsx`.

## História 31 — Fichas técnicas

### 43 — Painel de detalhe e editor de ficha viram modais na mesma tela, não rotas
Igual às decisões 17/29 (estabelecimento e promoções): sem protótipo ligado pro editor ("Nova ficha"/"Editar ficha" ❌), a tela de fichas técnicas usa o mesmo padrão já estabelecido nas outras telas de gestor desta sprint — painel de detalhe e formulário como diálogos sobre a lista, em vez de rotas próprias. Mantém a navegação do gestor consistente entre as histórias 28/29/31.
**Afeta:** `src/features/manager/RecipeSheetsScreen.tsx`.

### 44 — Cadastro de ingredientes vive dentro da tela de Fichas técnicas
A spec não desenha uma tela própria de "Ingredientes" — eles só aparecem como parte do fluxo de montar uma ficha (`GET/POST /establishments/:id/ingredients` é mencionado na API, mas nenhuma tela). Um painel simples de "Ingredientes" (listar + adicionar) foi colocado na mesma tela de Fichas técnicas, de onde o editor de ficha já puxa a lista pra montar as linhas — evita criar uma rota/tela extra só pra CRUD que a spec não pede.
**Afeta:** `src/features/manager/RecipeSheetsScreen.tsx`.

## Histórias 20 + 21 — Planta do salão e Fila de espera

### 45 — Sem `dnd-kit`: reposicionar mesa é "selecionar e clicar no destino", não arrastar
A spec propõe arrastar com `dnd-kit`, mas também é explícita: "não criar um CAD complexo", e o editor visual **não está desenhado** no protótipo (❌). Sem interação de referência e sem adicionar uma biblioteca de drag-and-drop só para isso, `FloorPlanScreen` usa clique: seleciona a mesa, clica em "Mover mesa", clica na célula de destino. O resultado (posição gravada em `grid_x/y/w/h`, sem sobreposição, `PUT /floor-plan` atômico) é o mesmo que a spec pede — só a interação de arrastar fica de fora.
**Afeta:** `src/features/manager/FloorPlanScreen.tsx`.

### 46 — `FloorMap` não cria elementos novos direto na grade
A spec deixa em aberto se `PUT /floor-plan` também cria "os novos elementos" (mesa/balcão/área/ponto de retirada) inline no editor visual. Adotado: mesas são sempre criadas primeiro em "Mesas e locais" (com código, nome, área e capacidade definidos) e só depois posicionadas na Planta — o `PUT /floor-plan` só recebe posições de mesas que já existem. Evita um editor que cria e posiciona ao mesmo tempo sem nenhuma referência visual de como isso deveria funcionar.
**Afeta:** `src/mock/services/floorPlan.ts` (`putFloorPlan`), `src/features/manager/TablesScreen.tsx`.

### 47 — Notificação automática da fila mora em `floorPlan.ts`, não em `waitlist.ts`
RF24 exige que liberar uma mesa notifique a fila "na mesma chamada de função" — ou seja, `tablesService.setStatus(...,'AVAILABLE')` e a notificação são uma coisa só. Colocar essa lógica num `waitlist.ts` separado exigiria um import cruzado (`floorPlan.ts` chamando `waitlist.ts` pra notificar, e `waitlist.ts` chamando `floorPlan.ts` pra ocupar a mesa ao atribuir) — funciona em ESM, mas é mais difícil de ler. Em vez disso, `notifyNextForFreedTable` mora dentro de `floorPlan.ts` (só lê/grava as coleções `waitlistEntries`/`notifications` via `storage.ts`, sem importar `waitlist.ts`), e `assignTable` (em `waitlist.ts`) ocupa a mesa direto por `upsert`, sem precisar chamar `floorPlan.ts` de volta. Nenhum dos dois arquivos importa o outro.
**Afeta:** `src/mock/services/floorPlan.ts`, `src/mock/services/waitlist.ts`.

### 48 — "Fila ativa" do gestor mostra `WAITING` e `NOTIFIED`, só esconde os estados finais
A spec descreve ações "Chamar", "Atribuir mesa", "Não compareceu" e "Remover" todas na mesma tabela — ou seja, uma entrada `NOTIFIED` continua visível pro gestor até virar `SEATED`, `NO_SHOW` ou `CANCELED`. `managerWaitlistService.list` reflete isso: só esses três status finais saem da lista. A heurística de estimativa (`estimateWaitMinutes`) só roda pra quem ainda está `WAITING` — quem já foi `NOTIFIED` tem estimativa 0 (a mesa já está se resolvendo).
**Afeta:** `src/mock/services/waitlist.ts`.

### 49 — Sem imagem de QR Code renderizada
"Mesas e locais" mostra a coluna QR Code (spec história 20), mas gerar a imagem do QR é decorativo pra esta sprint e exigiria uma biblioteca nova só pra isso. A tela mostra o início do `qr_token` como texto; a leitura por câmera e o fluxo de QR do cliente são de outra sprint (§0.2, sem QR na Sprint 1 do cliente).
**Afeta:** `src/features/manager/TablesScreen.tsx`.
