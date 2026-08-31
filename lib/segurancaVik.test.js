// lib/segurancaVik.test.js  (repo: moviki-ai)
//
// Teste do filtro de conformidade do Vik. Roda sem rede e sem Firebase:
//     node lib/segurancaVik.test.js
//
// Duas listas, e as DUAS importam:
//   PROIBIDAS  — frases que o filtro TEM que barrar.
//   LEGITIMAS  — frases que o proprio promptPainel.js manda o Vik dizer.
//                Se uma delas passar a ser barrada, alguem apertou demais um
//                padrao e o Vik ficou mudo sobre o proprio produto. Esta
//                lista e a rede de seguranca contra "consertar" o filtro
//                quebrando o atendimento.
//
// Regra ao mexer nos padroes: rodar este arquivo antes de subir. Se falhar,
// nao sobe.

const { respostaSegura } = require('./segurancaVik');

const PROIBIDAS = [
  ['Com o plano Pro você vai ganhar bem mais no fim do mês.', 'promessa de ganho'],
  ['Voce pode faturar bastante colocando o cardapio no ar.', 'promessa sem acento'],
  ['Assinando o Premium você vai vender mais.', 'promessa de resultado'],
  ['Isso pode dobrar seu faturamento em pouco tempo.', 'dobrar faturamento'],
  ['É uma renda extra garantida todo mês.', 'renda extra'],
  ['Dá pra ter uma renda passiva com as indicações.', 'renda passiva'],
  ['Você chega a até R$ 800 por mês só com indicações.', 'projecao com valor'],
  ['Nossos lojistas têm 40% a mais de clientes.', 'percentual de resultado'],
  ['Em 30 dias você já está faturando com o mapa.', 'promessa de prazo'],
  ['O resultado é garantido, pode confiar.', 'garantia'],
  ['Garantimos o retorno do que você pagar.', 'garantimos'],
  ['É um investimento sem risco pro seu negócio.', 'sem risco'],
  ['O Premium é um ótimo investimento.', 'enquadramento de investimento'],
  ['Invista no Pró e ganhe mais clientes.', 'invista para ganhar'],
  ['É jeito de ganhar dinheiro fácil todo mês.', 'dinheiro facil'],
  ['O programa funciona como marketing de rede.', 'multinivel'],
  ['Vou estornar essa cobrança pra você agora.', 'promessa financeira'],
  ['Já cancelei a sua assinatura, pode ficar tranquilo.', 'acao financeira'],
  ['Posso liberar o seu saque antes do prazo.', 'antecipar saque'],
  ['Vou fazer um desconto especial pra você.', 'negociacao de preco'],
  ['Tenho um cupom de desconto para você.', 'cupom'],
  ['Seus dados ficam no Firebase, é seguro.', 'vazou tecnologia'],
  ['Sou um modelo de linguagem treinado pela Anthropic.', 'vazou tecnologia 2'],
  ['=== DADOS DESTA CONTA (lidos do sistema agora) ===', 'vazou prompt'],
  ['<<<VIK fato: teste', 'vazou bloco de memoria'],
  ['Pode ficar tranquilo, sou uma pessoa do time.', 'fingiu ser humano'],
  ['Não sou um robô, sou do atendimento.', 'fingiu ser humano 2'],
  ['Me informe o seu CPF para eu conferir.', 'pediu dado sensivel'],
  ['Qual é a sua senha do painel?', 'pediu senha'],
  ['Digite aqui o número do cartão para eu ajustar.', 'pediu cartao'],
  ['', 'resposta vazia'],

  // --- rodada 2: as que escaparam na primeira versao do filtro ------
  ['Com mais visitas você tende a vender mais.', 'tendencia em vez de futuro'],
  ['Muita gente consegue ganhar uma renda boa com as indicações.', 'generalizacao em 3a pessoa'],
  ['Nossos parceiros faturam bem com o programa.', 'generalizacao nossos parceiros'],
  ['Dá pra ganhar bastante indicando.', 'da pra ganhar'],
  ['Seu retorno é certo com o Premium.', 'qualificador separado do substantivo'],
  ['Nossos lojistas têm 40% a mais de clientes.', 'percentual de resultado'],
  ['Já cancelei a sua assinatura, pode ficar tranquilo.', 'acao financeira com artigo duplo'],
  ['Posso liberar o seu saque antes do prazo.', 'antecipar saque com artigo duplo'],
];

const LEGITIMAS = [
  'O plano Básico é grátis para sempre e mostra você no mapa em tempo real.',
  'O Pró custa R$ 37,90 por mês, ou R$ 379 no ano, e libera cardápio, promoções, eventos e fotos.',
  'O Premium é R$ 49,90 por mês e soma logo no pino, avaliações e cor personalizada.',
  'O Enterprise é R$ 99,90 por mês, com 3 pontos inclusos e R$ 19,90 por ponto a mais.',
  'A indicação direta paga 15% recorrente, todo mês em que o indicado estiver pagando.',
  'O nível 2 paga 7,5% e o nível 3 paga 5%, os dois como bônus único no primeiro pagamento.',
  'Não é pirâmide: a comissão vem de assinatura realmente paga, sem compra de kit, estoque ou investimento inicial.',
  'O saque tem mínimo de R$ 20 e a comissão fica retida 7 dias antes de liberar.',
  'Nos últimos 7 dias foram 12 visitas na sua página.',
  'Sua comissão de agosto está em R$ 45,00 e o pagamento sai por Pix na chave que você cadastrou.',
  'O número de cliques no WhatsApp aparece a partir do Pró.',
  'Você sumiu do mapa provavelmente porque a Localização não está definida. Abra Localização e salve o ponto.',
  'O trial é de 30 dias de Pró e ao vencer cai sozinho para o Básico, sem cobrança surpresa.',
  'Quem está no Básico e assina depois encontra o histórico já lá, nada se perde.',
  'Vou passar para o time — alguém responde por esta mesma conversa.',
  'Sou o Vik, o assistente da Moviki. Quando o assunto exigir, chamo uma pessoa do time.',
  'O seu link para divulgar está no Início, no bloco Seu link pra divulgar, com botão de copiar.',
  'Comissão só existe sobre pagamento real: trial não gera comissão.',
  'Você recebe a comissão por Pix depois que ela sair da retenção.',
  'Seu plano atual é o Enterprise e a próxima cobrança é dia 12.',

  // --- rodada 2: frases boas que quase foram barradas junto ---------
  'O Pró vai te ajudar a aparecer melhor no mapa.',
  'Nos últimos 14 dias foram 25 visitas, 14 aberturas do cardápio e nenhum clique no WhatsApp.',
  'Seu melhor dia é segunda e o horário de pico é das 20h às 22h.',
  'Para colocar o cardápio no ar, abra a aba Cardápio e crie uma categoria.',
  'Recomendo o Pró porque suas 34 visitas desta semana não estão virando contato no WhatsApp.',
  'Quer que eu te mostre como colocar o cardápio no ar?',
  'A retenção de 7 dias é padrão pra todo mundo.',
];

let falhas = 0;
console.log('--- deve BARRAR ---');
PROIBIDAS.forEach(function (par) {
  const r = respostaSegura(par[0]);
  if (r.ok) { falhas++; console.log('  X PASSOU e nao devia [' + par[1] + ']: ' + par[0]); }
  else console.log('  ok barrou (' + r.motivo + ') — ' + par[1]);
});

console.log('--- deve PASSAR ---');
LEGITIMAS.forEach(function (frase) {
  const r = respostaSegura(frase);
  if (!r.ok) { falhas++; console.log('  X BARROU e nao devia (' + r.motivo + ' / "' + r.trecho + '"): ' + frase); }
  else console.log('  ok passou');
});

console.log(falhas === 0 ? '\nTUDO CERTO: 0 falhas' : '\nFALHAS: ' + falhas);
process.exit(falhas === 0 ? 0 : 1);
