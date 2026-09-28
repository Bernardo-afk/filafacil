# FilaZero

App de pedido por QR Code sem fila para bares e restaurantes — "Peça. Acompanhe. Retire."

> **Isto é um protótipo acadêmico.** Não é seguro para dados reais: não há backend,
> não há criptografia de verdade, e tudo roda no navegador de quem está usando.
> Não use CPF, senha ou dado pessoal real neste app. Ver `docs/SPEC-SPRINT1.md`
> §0.2 e §6 para o detalhe completo do que isso significa.

## O que é

Um único app React (SPA), **sem backend e sem banco de dados real**. Toda regra
de negócio que existiria numa API mora em `src/mock/services/*`, chamada
diretamente pelo front-end (sem `fetch`/HTTP), com os mesmos nomes de erro e
formato de resposta que uma API real teria. Os dados ficam em `localStorage`,
semeados a partir de `src/mock/seed/*`.

Funciona 100% offline depois de carregado — pensado para abrir com
`npm install && npm run dev` em qualquer notebook, sem servidor para
configurar, e continuar funcionando numa apresentação sem internet.

## Comandos

```bash
npm install
npm run dev                      # abre o app (front + mock, tudo junto)
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e
```

Para reiniciar os dados: abra o app e clique em "Resetar dados" (visível em
modo dev na tela de boas-vindas) — `localStorage` é do navegador, então
`npm run seed:reset` só imprime instruções (ver o script para o porquê).

## Documentação

- `CLAUDE.md` — regras e estrutura para quem (humano ou agente) for mexer no código.
- `docs/SPEC-SPRINT1.md` — especificação completa da Sprint 1 (15 histórias, 67 pontos).
- `docs/DECISIONS.md` — decisões registradas onde a spec pedia um default ou ficou em aberto.
