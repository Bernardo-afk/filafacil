# FilaZero

App único: React 19 + Vite + TypeScript + Tailwind v4. SEM backend, SEM banco de dados real — modo mock (spec §0.2).
Dados guardados em localStorage via `src/mock/*`, seedados a partir da spec §8. Tempo real via EventTarget + BroadcastChannel (spec §4).
Spec completa: `docs/SPEC-SPRINT1.md`. Decisões: `docs/DECISIONS.md`.
Referência visual e de comportamento: `reference/figma-make/` (protótipo Figma Make) — **não disponível neste repositório**; onde a spec pede fidelidade ao protótipo, seguimos as descrições escritas da própria spec e registramos em `docs/DECISIONS.md` (regra §0 item 4 do documento).

## Regras
- Dinheiro = centavos inteiros. Nunca float.
- "Multi-tenant" simulado: toda função de mock service filtra por `establishmentId` dentro da coleção; nunca confiar em `establishmentId` vindo só da UI sem checar a sessão (`assertEstablishmentAccess`, `src/mock/guard.ts`).
- Zod em toda função mockada (a partir da história 01 — a fundação ainda não tem formulários). Erro = `MockApiError { code, status, message, details }` (`src/mock/errors.ts`).
- UI em pt-BR. Código, types e nomes de função em inglês.
- Nunca logar CPF, senha, código OTP ou o objeto de sessão inteiro.
- Suspensão de usuário e troca de plano valem na próxima chamada (releem a coleção, sem cache — `src/mock/guard.ts`, `src/mock/entitlements.ts`).
- Uma história por vez. Teste de aceite (Gherkin da spec) antes de fechar.
- Onde a spec e o protótipo divergirem, vale o protótipo, exceto os itens 🔶 da spec §0.1 (use o default e registre em `docs/DECISIONS.md`). Sem o protótipo disponível, seguimos a spec escrita.
- Porte as telas do protótipo para `src/features` quando o protótipo existir; por ora as telas são construídas a partir da spec.
- Sem Docker, sem Prisma, sem Express: se algo pedir isso, releia a spec §0.2 antes de criar.
- IDs do seed (`src/mock/seed/*`) usam slugs legíveis (`user-admin`, `estab-bar-do-mestre`...) em vez de UUID aleatório, para poder referenciar entidades entre arquivos do seed. Qualquer registro criado em tempo de execução usa `crypto.randomUUID()` (`src/lib/id.ts`).

## Estrutura
```
src/
  app/                # router (HashRouter)
  layouts/             # CustomerLayout, AttendantLayout, ManagerLayout, AdminLayout
  features/            # auth/ profile/ discovery/ menu/ attendant/ manager/ admin/
  components/          # ui/ (genéricos), brand/ (Logo)
  mock/
    types.ts            # entidades e enums (spec §3)
    storage.ts           # wrapper de localStorage
    errors.ts             # MockApiError
    events.ts              # EventTarget + BroadcastChannel
    session.ts               # sessão (Zustand + localStorage)
    guard.ts                  # RBAC + tenant guard
    entitlements.ts            # recursos/limites por plano
    reset.ts                    # resetMockData()
    seed/                        # dados da seção 8, um arquivo por coleção
    services/                     # audit.ts, notifications.ts (+ um arquivo por história)
  lib/                 # flags, money, cpf, phone, hours, geo, id
```

## Comandos
```
npm install
npm run dev
npm run seed:reset       # ver aviso do script — o reset de verdade é o botão "Resetar dados" no app (localStorage é do navegador)
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e
```
