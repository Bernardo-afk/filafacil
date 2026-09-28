// `resetMockData()` limpa e recarrega as chaves `filazero:*` em localStorage
// (spec §0.2 item 11) — armazenamento do navegador, não existe fora dele.
// Este script só orienta; o reset de verdade acontece no app (botão "Resetar
// dados" na tela de boas-vindas, em modo dev) ou chamando resetMockData() no
// console do navegador com o app aberto.
console.log(
  [
    '',
    'FilaZero · seed:reset',
    '----------------------',
    'localStorage só existe dentro do navegador — não dá para resetar por aqui.',
    '',
    'Para reiniciar os dados:',
    '  1. Abra o app (npm run dev) e clique em "Resetar dados" (visível em modo dev).',
    '  2. Ou, com o app aberto, rode no console do navegador:',
    "     import('/src/mock/reset.ts').then(m => m.resetMockData())",
    '',
  ].join('\n'),
)
