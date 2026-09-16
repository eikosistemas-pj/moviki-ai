// lib/catalogoPainel.js  (repo: moviki-ai)   ***ARQUIVO NOVO***
//
// ------------------------------------------------------------------
// POR QUE ESTE ARQUIVO EXISTE
// ------------------------------------------------------------------
// Ate 12/09/2026 a descricao do painel morava DENTRO do lib/promptPainel.js,
// misturada com as regras de comportamento do Vik. O efeito, medido na
// pratica: em 09/09 um parceiro perguntou onde trocava a foto do cracha e o
// Vik respondeu que "nao consigo localizar uma funcionalidade de cracha" —
// o cracha estava no ar desde 03/09 e a troca de foto desde 11/09. O painel
// andou; o prompt ficou parado.
//
// O conserto NAO e "atualizar o texto do prompt". E separar as duas coisas:
//   - promptPainel.js  = COMO o Vik se comporta (muda quase nunca)
//   - catalogoPainel.js = O QUE existe no produto  (muda toda rodada)
// Assim a atualizacao do conhecimento vira UM arquivo pequeno, sem risco de
// encostar nas travas de conformidade.
//
// ------------------------------------------------------------------
// REGRA DE MANUTENCAO (a que impede a repeticao do erro)
// ------------------------------------------------------------------
// Mexeu em moviki-app/index.html, moviki-app/parceiro.html ou
// moviki-app/live.html de um jeito que o cliente PERCEBE (secao nova, botao
// novo, rotulo trocado, trava de plano mudada), atualize:
//   1. o texto do painel correspondente aqui embaixo;
//   2. a MARCA de versao daquele painel em MARCAS_CONFERIDAS;
//   3. CATALOGO_VERSAO e CATALOGO_EM.
// A rodada nao esta fechada sem isso — do mesmo jeito que nao esta fechada
// sem a marca de versao no HTML.
//
// E se esquecerem? O api/chat.js recebe a marca de versao real do painel a
// cada mensagem e compara com MARCAS_CONFERIDAS. Divergiu, o Vik entra em
// MODO CAUTELOSO sozinho: continua atendendo, mas fica proibido de dizer que
// algo "nao existe". Esquecer passa a custar uma resposta mais humilde, nunca
// mais uma resposta errada.
//
// Fonte de verdade deste arquivo: o HTML publicado dos paineis, lido no
// repositorio — nunca o MAPA-MESTRE, que envelhece igual.

const CATALOGO_VERSAO = '2026-09-16-3';
const CATALOGO_EM = '16/09/2026';

/* Marcas de versao (window.MOVIKI_VERSAO) dos paineis que foram LIDOS para
   escrever este catalogo. Nao e enfeite: e o gatilho do modo cauteloso. */
const MARCAS_CONFERIDAS = {
  lojista: '2026-09-16-quizlive1',
  parceiro: '2026-09-16-caticones',
};
/* Marcas anteriores, para o historico: '2026-09-12-beta1' e
   '2026-09-11-material-aulaniveis' na primeira escrita; '2026-09-13-vikpainel'
   nos dois paineis em 13/09.

   16/09/2026 — O MODO CAUTELOSO ESTAVA LIGADO, E NINGUEM VIU.
   Entre 15 e 16/09 os dois paineis andaram (modulo de aulas da live no
   lojista, trava de aulas no parceiro) e esta tabela ficou em
   '2026-09-13-vikpainel'. O mecanismo fez exatamente o que devia — o Vik
   passou a responder em modo cauteloso para todo mundo — mas por um dia
   inteiro ninguem percebeu, porque o modo cauteloso e silencioso por
   desenho: ele nao avisa o usuario, so deixa o Vik mais humilde.

   A licao vai para a regra de ouro: quando um painel sobe, esta tabela sobe
   junto, na MESMA rodada. Marca velha aqui nao quebra nada — ela degrada
   tudo, devagar e sem ruido.

   16/09/2026, DE NOVO — o parceiro subiu tres vezes no mesmo dia
   ('matfaixa', 'wafoto' e agora 'caticones') e esta tabela ficou em
   '2026-09-15-aulatrava' o dia inteiro: modo cauteloso ligado outra vez,
   silencioso outra vez. Marca atual do parceiro: '2026-09-16-caticones'
   (faixa de categoria com icone 3D no lugar do emoji).

   16/09/2026, TERCEIRA REVISAO — a que fechou o buraco maior.
   O lojista foi para '2026-09-16-quizlive1' (porta de entrada do app
   reescrita no eixo da venda ao vivo). Ao conferir o painel para escrever
   esta versao apareceu o que estava faltando ha DOIS DIAS: a aba
   FINANCEIRO, no ar desde 14/09, nao existia em lugar nenhum deste
   catalogo. O Vik nao sabia que o cardapio passou a vender, nem que existe
   chave Pix no painel, nem o que responder sobre um pedido. O modo
   cauteloso o impedia de NEGAR a aba — e so.
   Licao registrada: o modo cauteloso protege contra a resposta errada, nao
   contra a resposta ignorante. Ele compra tempo; nao substitui esta
   atualizacao. */

/* ==================================================================
   1. PRODUTO, PLANOS E O QUE CADA PLANO ABRE
   Vale para os dois paineis. Numero e trava de plano conferidos no
   codigo (funcao estadoFotos e os gates de planoPainel do index.html).
   ================================================================== */
const PRODUTO = `
=== O QUE E A MOVIKI ===
SaaS de assinatura que poe o negocio no mapa em tempo real, com pagina
publica propria (moviki.com.br/apelido). Cada cliente divulga o proprio link
e leva os proprios clientes.
E para quem SE MOVE (food truck, carrinho, feira, barraca, ambulante,
entrega, atendimento em casa), para quem tem PONTO FIXO (salao, barbearia,
mercadinho, loja de bairro, oficina, restaurante) e para quem PRESTA SERVICO
(manicure, pedreiro, eletricista, diarista, costureira). Nunca fale como se
fosse so para ambulante, e nunca esqueca quem se move.
Empresa: EIKO SISTEMAS DESENVOLVIMENTO DE SOFTWARE LTDA, CNPJ
68.289.841/0001-02, Curitiba/PR. Suporte por WhatsApp: (41) 2018-6848.

=== PLANOS E PRECOS ===
- Basico: gratis. Pino no mapa em tempo real, pagina publica, link proprio,
  status aberto/fechado, WhatsApp, avaliacoes, e as visitas dos ultimos 7 dias.
- Pro: R$ 37,90/mes · R$ 99,90 trimestral · R$ 379,00 anual (2 meses gratis).
  Soma cardapio, promocoes, eventos e o desempenho completo de 14 dias.
- Premium: R$ 49,90/mes · R$ 134,90 trimestral · R$ 499,00 anual.
  Soma fotos, videos, foto de capa, logo propria no pino, cor da marca, o
  Modo Live (transmissao ao vivo) e a VENDA PELO CARDAPIO com Pix caindo na
  conta do proprio lojista.
- Enterprise: R$ 99,90/mes. Soma multi-ponto (3 pontos inclusos, do 4o em
  diante R$ 19,90/mes cada), WhatsApp proprio por ponto, white-label,
  relatorios e as ferramentas de venda da live, incluindo o PIX DENTRO DA
  PROPRIA LIVE.
Teste gratis: 30 dias de Pro, automatico no cadastro, uma vez por conta. Ao
vencer cai sozinho para o Basico, sem cobranca surpresa. Durante o teste as
fotos e os videos ja aparecem no site. Pagamento por Pix ou cartao.
O TESTE GRATIS TEM DUAS CARAS, e as duas sao verdade ao mesmo tempo:
- na LIVE ele entra como PREMIUM (duas lives de ate 60 min, sacolinha de 5);
- na VENDA PELO CARDAPIO ele NAO entra: ligar a venda pede plano Premium ou
  Enterprise PAGO, e o painel responde com todas as letras "A venda pelo
  cardapio e dos planos Premium e Enterprise".
Nunca diga que o teste gratis vende pelo cardapio, e nunca diga que o teste
gratis nao tem live. Sao coisas diferentes, e as duas ja geraram confusao.

=== O QUE E DE QUE PLANO (conferido no codigo, nao chute) ===
- Todos os planos, inclusive o Basico: perfil, nome, link, recado do dia,
  localizacao/GPS, endereco escrito, informacoes (horario, entrega, preco
  medio), WhatsApp, AVALIACOES (ver e responder) e a caixa de mensagens.
- Pro em diante: Cardapio, Promocoes, Eventos, desempenho completo.
- Premium em diante: Fotos da galeria, Videos, Foto de capa, Logo no pino,
  Cor da marca, Modo Live e LIGAR A VENDA no cardapio (aba Financeiro).
- Enterprise: Meus pontos, white-label, e as ferramentas de venda da live
  (Pix DENTRO da live, oferta relampago, cupom, brinde, fila, dados,
  cortes).
A aba FINANCEIRO aparece no menu de TODOS os planos e abre normalmente —
ela nao tem cadeado. O que pede Premium ou Enterprise e o botao "Ligar a
venda". Quem nao tem plano ve a aba, cadastra a chave, e leva a recusa so na
hora de ligar. Nao diga que a aba "nao aparece" para o plano dele.
ATENCAO a dois erros classicos: AVALIACOES sao de TODOS os planos (nao sao
do Premium), e FOTOS sao do PREMIUM (nao do Pro). Nunca diga o contrario.
O contador de metricas grava para todos os planos, sempre. O que muda e o
que o painel MOSTRA — quem assina depois encontra o historico ja la.

=== COMO O DINHEIRO DA VENDA ANDA (cardapio e live) ===
O Moviki NUNCA recebe, guarda ou repassa dinheiro de venda. O pagamento vai
do cliente direto para a conta do lojista. Isso vale para as duas portas.
- CARDAPIO (Premium e Enterprise): o cliente monta o pedido na pagina
  publica do negocio e paga por Pix ali mesmo. Dois modos, escolhidos pelo
  lojista na aba Financeiro:
  · Pix direto (padrao, recomendado): a chave e a do lojista, nao existe
    taxa nenhuma, pedido minimo R$ 5. Quem confere o extrato e confirma o
    pedido e o proprio lojista — o Moviki nao enxerga o extrato dele.
  · Pix automatico pelo Asaas: o lojista conecta a conta Asaas DELE, o
    sistema confirma sozinho, o Asaas desconta R$ 1,99 por Pix recebido e o
    pedido minimo sobe para R$ 20.
- LIVE (so Enterprise): "Comprar com Pix" dentro da transmissao, numa conta
  de pagamento aberta no nome do lojista. No Premium a live nao tem Pix: o
  botao e "Quero este", que abre o WhatsApp do lojista.
So Pix. Nao existe cartao, boleto nem frete calculado pelo Moviki — a
entrega e combinada entre lojista e cliente (retirada ou entrega).
Cada pedido sai com CENTAVOS diferentes (R$ 20,07, R$ 20,13...) para o
lojista achar o pagamento no extrato sem caçar nome. Nao e erro de preco.

=== PROGRAMA DE PARCEIROS ===
- Nivel 1 (indicacao direta): 15% recorrente, todo mes em que o indicado
  estiver pagando. Sobe para 16% (Ouro), 17% (Diamante) e 18% (Esmeralda).
- Nivel 2: 7,5%, bonus unico, so no primeiro pagamento do indicado.
- Nivel 3: 5%, bonus unico, so no primeiro pagamento do indicado.
Comissao so existe sobre assinatura efetivamente PAGA — periodo de teste nao
gera comissao, e se ninguem assinar plano pago a comissao e zero.
Cadastro entra como pendente e passa por aprovacao. O link de indicacao so
abre depois das aulas. Saque: minimo R$ 20, Pix na chave cadastrada, em ate
1 dia util (24h); a comissao fica retida alguns dias antes de liberar.
Quem ja e lojista so opera como parceiro com a propria assinatura paga (fora
do teste gratis). Parceiro puro, sem negocio na Moviki, e isento dessa regra.
Nao e piramide: nao ha kit, estoque, investimento inicial, nem pagamento por
cadastrar pessoas ou montar equipe.
`.trim();

/* ==================================================================
   2. PAINEL DO LOJISTA  (moviki-app/index.html + live.html)
   ================================================================== */
const LOJISTA = `
=== O PAINEL DO LOJISTA, COMO ELE ESTA HOJE ===
Menu lateral (computador), nesta ordem: Inicio · Cardapio · Promocoes ·
Eventos · Fotos e videos · Localizacao · Informacoes · WhatsApp ·
Avaliacoes · FINANCEIRO · Meu Plano · Meus pontos (so Enterprise).
No celular a barra de baixo tem 5 lugares: Inicio · Cardapio · botao redondo
do meio (Acao rapida) · Promocoes · Mais. O "Mais" abre o menu completo.
A folha "Acao rapida" tem: Fazer live, Adicionar fotos,
Criar promocao, Atualizar cardapio, Ver minha pagina.
No Inicio existe a grade "Ferramentas", com um cartao para cada tela —
incluindo FINANCEIRO —, mais Mensagens, Tutoriais, Indicar agora e Fazer
live.

- Inicio: saudacao, cartao "Seu negocio no mapa", os botoes Aberto e Fechado,
  os 3 passos de boas-vindas, "Proximas acoes recomendadas", a grade
  Ferramentas e, na coluna da direita, "Seu desempenho", "Seu link pra
  divulgar" (com Copiar e Ver pagina), "Perfil completo N%" e "Seu plano".
- Perfil: nome do negocio, "Seu link no Moviki" (moviki.com.br/apelido),
  "Recado do dia", cor da marca (Premium) com atalhos de cor, chave "Quero
  que o Moviki divulgue meu negocio nas redes sociais" (nunca publicamos o
  endereco exato, so a cidade) e, no Enterprise, "Usar so a minha marca".
- Cardapio (Pro+): categorias e produtos, com preco, descricao, marcador
  ACABANDO e ate 3 fotos por produto. Botoes "+ Categoria" e "+ Produto".
- Promocoes (Pro+) e Eventos (Pro+): "+ Promocao" / "+ Evento". So a arte ou
  so o flyer ja funciona; os campos de texto sao opcionais.
- Fotos e videos: e UMA tela so. Em cima "Videos do negocio", ate 6, colando
  o link de um video que a pessoa JA postou no YouTube, Instagram (Reels) ou
  TikTok, com "Titulo curto". Video do YouTube toca dentro da pagina; do
  Instagram e do TikTok abre no aplicativo, que e regra deles. Embaixo
  "Fotos do negocio", ate 12. Fotos e videos sao do Premium (e aparecem no
  teste gratis); pode cadastrar antes e entram no ar ao assinar.
- Localizacao: quatro blocos — "Salve sua localizacao" (botao "Atualizar
  minha localizacao"), "Endereco escrito" (tem que ESCOLHER na lista que
  aparece; endereco digitado a mao trava o salvar, e quem e itinerante deve
  deixar em branco), "Sua logo no mapa" (Premium, com editor de
  enquadramento) e "Foto de capa da sua pagina" (Premium; sem capa o site
  usa a 1a foto da galeria).
- Informacoes: horario de funcionamento, entrega e preco medio. Campo em
  branco simplesmente nao aparece na pagina publica.
- WhatsApp: o numero que vira o botao "Chamar no WhatsApp" da pagina
  publica. Em branco, o botao nao aparece.
- Financeiro: e a tela do dinheiro das vendas. Descrita inteira mais
  abaixo, em "FINANCEIRO".
- Avaliacoes (TODOS os planos): nota media, comentarios e o botao
  "Responder" em cada um, com ate 500 caracteres. Depois de publicada da
  para "Editar resposta" e "Apagar resposta".
- Meu Plano: status da assinatura, campo de CPF/CNPJ, os cartoes Pro,
  Premium e Enterprise com mensal, trimestral e anual, e o botao "Confirmar
  meu plano · ir para o pagamento". Upgrade e downgrade sao feitos aqui.
- Meus pontos (Enterprise): "+ Adicionar ponto", cada ponto com nome,
  apelido proprio, WhatsApp da unidade, horario e endereco.
- Falar com o Vik: e esta caixa de mensagens. Anexo de documento so aparece
  quando o time libera naquela conversa; teto de 10 MB; HEIC de iPhone nao
  abre (Ajustes > Camera > Formatos > "Mais compativel").
- Tutoriais em video: 16 aulas curtas, no menu ("Tutoriais em video"), na
  grade ("Tutoriais") e embutidas no fim de cada tela. Lojista novo recebe a
  tela de boas-vindas com as 4 primeiras — ela NAO tranca nada do painel.
- Indique e ganhe: leva ao Programa de Parceiros; quem ja e parceiro abre o
  painel proprio em parceiro.html.
- Excluir minha conta: fica no menu, e a exclusao sai em ate 48 horas.

=== SEU DESEMPENHO (as visitas) ===
Fica no Inicio e na coluna da direita. Basico ve so o total de visitas dos
ultimos 7 dias, com o resto borrado. Pro, Premium e Enterprise veem 14 dias
com visitas, cliques no WhatsApp, pedidos de rota, aberturas do cardapio,
melhor dia da semana e horario de pico.

=== FINANCEIRO: RECEBER PELO CARDAPIO ===
Tela no ar desde 14/09/2026. Menu > Financeiro, ou o cartao Financeiro na
grade Ferramentas. A aba abre em QUALQUER plano; o que pede Premium ou
Enterprise pago e o botao "Ligar a venda".
No alto fica o resumo: "Sua venda esta ligada / desligada", como a pessoa
recebe e o pedido minimo. Desligada, o cliente ve o cardapio mas nao
consegue comprar.
Sao tres blocos que abrem e fecham:

1) "Como voce recebe" — dois cartoes, escolhe um:
   · "Pix direto — gratis" (RECOMENDADO): o dinheiro cai na conta da pessoa
     na hora, sem taxa. Campos: Chave Pix, Nome do titular da conta, Cidade
     e CPF ou CNPJ do titular. Botao "Salvar chave Pix".
     O nome e o documento aparecem para o CLIENTE na hora de pagar, para ele
     conferir no aplicativo do banco — e assim que ele sabe que esta pagando
     para a pessoa certa. Por isso os campos sao obrigatorios.
     A chave volta do servidor so como MASCARA; o campo nasce vazio e o
     rotulo mostra "Chave atual: ... — digite outra para trocar". Isso nao e
     defeito: a chave crua nunca retorna para a tela.
   · "Pix automatico (Asaas)": o lojista cola a chave de API da conta Asaas
     DELE, o sistema confirma o pagamento sozinho, o Asaas desconta R$ 1,99
     por Pix recebido e o pedido minimo sobe para R$ 20. A conta e dele, nao
     do Moviki, e a chave de API fica cifrada e nunca reaparece na tela.

2) "Ligar a venda no seu cardapio" — "Como o cliente recebe" (So retirada no
   local · So entrega · Retirada ou entrega), o TERMO DE VENDA numa caixa
   rolavel, a caixa "Li e concordo" e o botao "Ligar a venda".
   O termo diz, e o Vik repete quando perguntarem: a venda e do lojista, nao
   do Moviki; o dinheiro vai direto para a conta dele; ele responde pela
   entrega, pelo atendimento, pela troca, pela devolucao, pelo arrependimento
   (CDC art. 49) e pelos impostos; produto proibido nao entra; e no Pix
   direto quem confirma o pagamento e ele, porque o Moviki nao ve o extrato.
   O aceite e obrigatorio e fica registrado — sem marcar, o botao nao liga.

3) "Vendas" — os pedidos que chegaram pelo cardapio E pela live, com valor,
   itens, dados do comprador e os botoes de confirmar ou recusar.
   Situacoes: aguardando · conferindo · pago · entregue · recusado ·
   cancelado · expirado. "Conferindo" e quando o comprador avisou que pagou
   e o lojista ainda nao confirmou.
   Cada pedido tem CENTAVOS diferentes (R$ 20,07, R$ 20,13...) para achar o
   pagamento no extrato sem procurar por nome.
   Pedido expirado AINDA PODE ser confirmado: a janela de 30 minutos e da
   tela do comprador, nao do dinheiro. Pix que caiu atrasado continua sendo
   Pix que caiu.

AVISOS DA TELA, e o que cada um quer dizer:
"A venda pelo cardapio e dos planos Premium e Enterprise" — plano
insuficiente OU conta em teste gratis. "Cadastre sua chave Pix antes de
ligar a venda" — faltou o passo 1. "Marque que voce leu e concorda com o
Termo de Venda" — faltou o aceite. "O Asaas nao aceitou essa chave" — chave
de API errada no modo automatico.

O QUE NAO APARECE PARA O CLIENTE: item sem preco numerico valido ("a partir
de 30", "sob consulta", campo vazio) fica no cardapio SEM botao de comprar,
com uma linha dizendo para chamar no WhatsApp. Nao e defeito.

=== MODO LIVE (transmissao ao vivo) ===
Recurso do Premium; as ferramentas de venda sao do Enterprise.
Como usa: Inicio > Ferramentas > "Fazer live" (ou o botao do meio no
celular) > liga a camera, poe o titulo da live, escolhe os produtos na aba
Produtos e toca em "Entrar ao vivo". O cliente assiste em
moviki.com.br/live/apelido, ve a sacolinha, o produto em destaque com o
botao "Quero este" (abre o WhatsApp) e o chat.
Abas do estudio: Produtos · Chat · Receber no Pix (Enterprise) · Agendar ·
Oferta relampago (Enterprise) · Cupom e brinde (Enterprise) · Fila de
pedidos (Enterprise) · Dados (Enterprise) · Cortes (Enterprise).
Na primeira live a pessoa aceita as Regras da Live. Sair da tela encerra a
transmissao. A duracao maxima e a da conta e aparece escrita na tela:
60 minutos no Premium, 3 horas no Enterprise.
Nunca prometa recurso de live que dependa de plano que a pessoa nao tem.

AULAS DA LIVE — a porta que vem antes da primeira transmissao.
O Modo Live tem modulo de aulas PROPRIO, separado dos tutoriais do painel.
Ele abre quando a pessoa clica em "Fazer live". Sao catorze aulas curtas, e
TRES delas trancam o botao "Entrar ao vivo": a abertura, as regras de
conteudo e a primeira transmissao. As outras onze sao de ferramenta e nao
trancam nada — ferramenta que a pessoa nao usa nao pode impedir que ela
transmita.
No painel existe um cartao proprio para essas aulas, no mesmo lugar do
cartao das videoaulas do painel, com tres estados: falta assistir, em dia e
aula nova. Funcao nova no estudio ganha aula e vira aviso de "aula nova" so
para quem ja estava em dia.
Aula nao toca com a live no ar: o audio sairia dentro da transmissao.
"Nao consigo entrar ao vivo": quase sempre sao as tres aulas de contexto.
O botao destranca sozinho quando a terceira for vista.

TESTE GRATIS: DUAS LIVES, EM NIVEL PREMIUM.
Nos 30 dias gratis a pessoa faz DUAS lives de ate 60 minutos, com sacolinha
de 5 produtos — ou seja, no nivel PREMIUM, e nao no Pro que o cartao do
plano mostra. Quem assina o PRO depois do teste PERDE a live: o servidor
responde "A live faz parte dos planos Premium e Enterprise". Diga isso com
todas as letras quando perguntarem qual plano assinar para continuar
transmitindo.
O Pix DENTRO da live continua exclusivo do Enterprise, inclusive no teste. Assinando, a quantidade deixa de ter limite. Se a live
cair e ela reabrir em ate 15 minutos, conta como a MESMA live — queda de
sinal na feira nao pode comer a cota. O estudio mostra "esta e a sua live 1
de 2".

O QUE PODE DESLIGAR A LIVE PARA TODO MUNDO, e nao e defeito da conta:
a chave-mestra de manutencao e o teto de video do mes. Nos dois casos a
mensagem fala em transmissoes "temporariamente desligadas" ou "pausadas ate
o proximo ciclo". Se aparecer isso, NAO diga que e problema do plano nem da
internet da pessoa: diga que as transmissoes estao pausadas pelo Moviki e
que da para avisar o time por aqui.

=== ERROS COMUNS DO LOJISTA, E A RESPOSTA CERTA ===
"Sumi do mapa" / "nao apareco": Localizacao nao definida, ou o status esta
Fechado. Sem localizacao o negocio nao entra no mapa.
"Salvei e nao mudou": faltou tocar em "Salvar tudo" no fim da tela.
"Nao consigo salvar": quase sempre o endereco foi digitado a mao — tem que
escolher a opcao da lista — ou o apelido escolhido ja esta em uso.
"O cliente nao me chama": falta o numero na secao WhatsApp.
"Minha foto nao aparece no site": fotos aparecem a partir do Premium.
"Nao consigo subir a foto": iPhone salva em HEIC, que nao abre no navegador.
"Nao acho os tutoriais": menu > Tutoriais em video, ou o cartao Tutoriais.
"Cadastrei a chave Pix e nao aparece nada na minha pagina": falta LIGAR a
venda — bloco 2 da aba Financeiro, com o aceite do termo. Cadastrar a chave
sozinho nao liga nada.
"Nao consigo ligar a venda": plano. E dos planos Premium e Enterprise pagos;
conta em teste gratis tambem e recusada.
"O cliente pagou e o pedido nao mudou sozinho": no Pix direto e assim mesmo
— quem confirma e o lojista, na aba Vendas, depois de ver o dinheiro no
extrato. Quem quiser confirmacao automatica usa o modo Asaas.
"O valor ficou quebrado / cobraram centavos a mais": sao os centavos
identificadores do pedido, de proposito.
"Meu produto nao tem botao de comprar": o preco daquele item nao e um numero
(esta como "a partir de", "sob consulta" ou vazio).
`.trim();

/* ==================================================================
   3. PAINEL DO PARCEIRO  (moviki-app/parceiro.html)
   ================================================================== */
const PARCEIRO = `
=== O PAINEL DO PARCEIRO, COMO ELE ESTA HOJE ===
Menu lateral, nesta ordem: Visao geral · Indicacoes · Comissoes ·
Pagamentos · Desempenho · Divulgacao · Material de apoio · Falar com o Vik ·
Meus dados. Tem ainda Tutoriais e Suporte.
No celular a barra de baixo e: Inicio · Indicacoes · botao do meio
(Compartilhar) · Comissoes · Mais.
Na coluna da direita ficam a foto e o nome, o selo do certificado, "Proximo
saque", "Compartilhe seu link" e o botao "Meu cracha com QR code".

- Visao geral: "Resumo dos seus ganhos" (ganhos do mes, ganhos totais,
  comissoes recorrentes), o card "Seu nivel", "Saldo disponivel" com o botao
  "Solicitar saque", o grafico de 8 meses e as indicacoes recentes.
  O icone de olho esconde valores, indicacoes ou o grafico — e privacidade
  da tela, nao um contador de visitas.
- Indicacoes: todos os cadastros feitos pelo link, com plano, situacao (Em
  teste, Ativo, Parado, Sem plano), data e a comissao daquele indicado.
- Comissoes: o extrato, comissao por comissao, com Nivel 1 · 15% recorrente,
  Nivel 2 · bonus 7,5% e Nivel 3 · bonus 5%, e a situacao Paga, Disponivel,
  Em analise (com a data em que libera) ou Estornada.
- Pagamentos: os saques pedidos e pagos, mais "Como o pagamento funciona".
  Saque minimo R$ 20,00, Pix na chave de "Meus dados", em ate 1 dia util.
- Desempenho: ganhos por nivel e o mes a mes.
- Divulgacao (abre depois das aulas): a caixa "Antes de postar" com o
  compromisso de conduta (#publi no inicio, nunca prometer ganho) — o link e
  o cracha so liberam com o "Li e concordo"; "Seu link de indicacao"
  (moviki.com.br/p/apelido) com Copiar, WhatsApp, Facebook e Mais; "Seu
  cracha de parceiro"; "Indicar outro parceiro" (moviki.com.br/pp/apelido);
  dicas; e "Como a sua comissao e calculada" com as abas de plano.
- Material de apoio: artes prontas de feed e stories, videos, textos prontos
  e o "Panfleto A5 com o seu QR code", que sai montado com o QR da pessoa.
  A aba tem DOIS niveis de navegacao: primeiro a categoria de comercio
  (Para qualquer negocio, Alimentacao, Moda, Beleza, Naturais, Pet,
  Artesanato, Eletronicos, Papelaria, Carro e moto, Servicos) e, dentro
  dela, o tipo de midia (Panfletos, Feed, Stories, Videos, Textos).
  Categoria sem nenhuma peca nao aparece na faixa.
  Tem peca de Modo Live tambem — o parceiro PODE divulgar a live.
  Toda legenda ja vem com #publi no inicio e com o link do parceiro no lugar
  do marcador. Todo mundo VE; para baixar e postar precisa estar aprovado,
  ter terminado as aulas e ter aceitado o compromisso de conduta.
- Falar com o Vik: e esta caixa de mensagens.
- Meus dados: a foto, e os campos Nome, E-mail, Chave Pix e "Parceiro
  desde". O botao "Editar nome / Pix" abre a edicao. O parceiro edita
  APENAS nome, chave Pix e foto — o @ do Instagram, o apelido do link e o
  e-mail nao sao editaveis no painel; para trocar, fale com o time por aqui.

=== FOTO DO PARCEIRO — EXISTE, E ESTA EM MEUS DADOS ===
Caminho: menu > Meus dados > bloco "Sua foto" > botao "Trocar foto". No
celular: Mais > Meus dados > "Trocar foto"; tocar no circulo do canto
superior direito ja abre Meus dados. Tem tambem o botao "Remover".
Essa MESMA foto e a foto do cracha, a foto do QR code e a que aparece na
pagina publica de verificacao. NAO existe upload separado dentro do cracha:
trocou em Meus dados, o cracha muda sozinho.
Aceita JPG, PNG e WEBP. HEIC de iPhone nao abre — salve como JPG antes
(Ajustes > Camera > Formatos > "Mais compativel"). Se a pessoa nunca subiu
foto, aparece a foto do Instagram do @ do cadastro; removendo a dela, a do
Instagram volta; sem nenhuma das duas, aparece a inicial do nome.

=== O CRACHA COM QR CODE ===
Fica na secao Divulgacao, no card "Seu cracha de parceiro", e tem atalho no
"Meu cracha com QR code" da coluna direita, na folha Compartilhar e no menu
Mais. Mostra a foto, o nome, o @, o selo, "Autorizado desde <mes/ano>", o QR
e o endereco moviki.com.br/v/apelido. O botao e "Baixar como imagem" e sai
um PNG 1080x1350 para mandar no WhatsApp ou imprimir.
Serve para o comerciante apontar a camera e conferir sozinho, na hora, que a
pessoa e parceiro autorizado. O QR leva a pagina de verificacao — que diz,
com todas as letras, que o comerciante NAO paga nada ao parceiro.
O cracha abre depois das aulas e depois do "Li e concordo" da conduta.

=== AS AULAS, O SELO E A TRAVA DO LINK ===
Sao 12 aulas curtas hoje, e elas trancam a secao Divulgacao ate a ultima:
sem terminar, o link, o cracha e o download do material ficam fechados. A
faixa laranja e a cortina dizem quantas faltam, e o botao e "Ver as aulas".
Concluir e definitivo: aula nova NUNCA retranca quem ja concluiu.
O selo do certificado, na coluna direita, tem tres estados: "Aulas em dia"
(com a data do certificado), "N aulas novas" (o link CONTINUA liberado —
nada foi trancado) e "N de 12 aulas" para quem ainda esta assistindo.

=== SEU NIVEL ===
Card na Visao geral. Conta so os indicados DIRETOS que estao pagando a
mensalidade no mes corrente (nivel 2 e 3 nao contam), e e recalculado mes a
mes: cliente que para de pagar sai da conta.
Bronze de 1 a 10 clientes (15%) · Prata de 11 a 25 (15% + R$ 25) · Ouro de
26 a 50 (16% + R$ 50) · Diamante de 51 a 100 (17% + R$ 150) · Esmeralda de
101 em diante (18% + R$ 300). As regras estao no Regulamento.
Fale do nivel como REGRA (o que a faixa da), nunca como previsao de quanto a
pessoa vai receber.

=== O QUE O PARCEIRO PODE PROMETER AO LOJISTA (16/09/2026) ===
O produto mudou de eixo: virou venda ao vivo e cardapio que vende, com o
mapa como base. A porta de entrada do app (app.moviki.com.br) agora abre com
"Quero vender ao vivo e no cardapio" e "Quero indicar e ganhar comissoes" —
o indicado do parceiro cai na primeira.
A frase certa, e so ela:
- "No teste gratis voce ja faz DUAS lives de ate uma hora, com cinco
  produtos na sacolinha."
- "Vender pelo cardapio com Pix caindo na sua conta e do Premium."
- "Receber Pix DENTRO da live e do Enterprise."
- "O Moviki nao fica com nada da sua venda, e nao cobra comissao por venda."
Nunca prometa faturamento, numero de vendas, publico na live ou audiencia
automatica. A Moviki e o palco; o megafone (Instagram, WhatsApp, grupo do
bairro) e do lojista. Isso vale para toda peca e toda conversa.

=== ERROS COMUNS DO PARCEIRO, E A RESPOSTA CERTA ===
"Meu link nao abre / esta trancado": faltam aulas, ou falta o "Li e
concordo" da conduta na secao Divulgacao.
"Onde troco a foto do cracha": Meus dados > Sua foto > Trocar foto.
"Nao consigo baixar o material": as tres portas sao cadastro aprovado,
aulas concluidas e conduta aceita.
"Meu saque nao caiu": o bloco de dados desta conta traz o status; explique o
minimo de R$ 20, a retencao e o prazo de ate 1 dia util.
"Quero trocar meu apelido / meu @": nao da pelo painel; e com o time.
"Nao aparece o cracha no menu": ele mora dentro da Divulgacao.
`.trim();

/* ==================================================================
   4. O QUE NAO EXISTE — LISTA FECHADA
   O Vik so pode dizer "isso nao existe" sobre o que estiver aqui. Fora
   desta lista, ele nao nega: pergunta ou orienta. Foi negar uma coisa
   que existia que gerou o incidente de 09/09.
   ================================================================== */
const NAO_EXISTE = `
=== A UNICA LISTA DO QUE NAO EXISTE ===
Nao existe hoje, e voce pode dizer isso:
- aplicativo do Moviki na loja de aplicativos (o painel roda no navegador);
- pagamento de comissao por boleto ou transferencia bancaria — so Pix;
- saque abaixo de R$ 20,00;
- pagar o parceiro por cadastrar pessoa ou montar equipe;
- lives no painel do PARCEIRO (a live e do painel do negocio);
- troca de e-mail, de apelido do link ou do @ pelo proprio painel;
- cardapio, promocoes e eventos no plano Basico;
- venda pelo cardapio no Basico, no Pro e durante o teste gratis (e dos
  planos Premium e Enterprise pagos);
- Pix dentro da live fora do Enterprise;
- cartao de credito ou boleto na compra do cliente — o checkout do cardapio
  e da live e SO Pix;
- frete calculado pelo Moviki (a entrega e combinada entre lojista e
  cliente: retirada ou entrega);
- o Moviki receber, guardar ou repassar o dinheiro de uma venda;
- comissao do Moviki sobre a venda do lojista (a cobranca e a mensalidade);
- editar mensagem ja enviada nesta caixa.
Qualquer outra coisa que voce nao encontre na descricao do painel NAO entra
nesta lista: veja a regra "NUNCA DIGA QUE ALGO NAO EXISTE" no seu prompt.
`.trim();

/* Devolve o catalogo do papel de quem esta falando. Mandar os dois paineis
   sempre seria mais simples e pior: dobra o custo por resposta e, o que
   importa mais, e o que faz o Vik responder a um parceiro com o mapa do
   lojista — foi exatamente isso que aconteceu em 09/09, quando ele ofereceu
   "Fotos" e "Logo propria no pino" (telas do lojista) a quem perguntava do
   cracha. Na duvida (a pessoa e lojista E parceiro), manda os dois. */
function paraPapel(papel) {
  const p = String(papel || '').toLowerCase();
  if (p === 'parceiro') return PRODUTO + '\n\n' + PARCEIRO + '\n\n' + NAO_EXISTE;
  if (p === 'lojista') return PRODUTO + '\n\n' + LOJISTA + '\n\n' + NAO_EXISTE;
  return PRODUTO + '\n\n' + LOJISTA + '\n\n' + PARCEIRO + '\n\n' + NAO_EXISTE;
}

/* Compara a marca de versao que o painel mandou com a que foi lida para
   escrever este catalogo. Devolve '' quando batem (o caso normal) ou o aviso
   que entra no prompt quando nao batem. Marca vazia (painel antigo, que
   ainda nao manda o campo) NAO liga o modo cauteloso: ligaria em todo mundo
   ate o upload dos paineis, e um aviso que vive aceso nao e mais aviso. */
function avisoVersao(painel, marcaRecebida) {
  const esperada = MARCAS_CONFERIDAS[String(painel || '').toLowerCase()];
  const recebida = String(marcaRecebida || '').trim();
  if (!esperada || !recebida || recebida === esperada) return '';
  return '=== ATENCAO: MODO CAUTELOSO (o painel mudou depois desta descricao) ===\n' +
    'A tela que esta pessoa esta vendo foi atualizada depois da ultima revisao\n' +
    'da descricao do painel que voce recebeu. Ou seja: pode haver secao, botao\n' +
    'ou recurso novo que nao esta escrito aqui.\n' +
    'Enquanto isso durar: continue atendendo normalmente, mas NAO diga que\n' +
    'nenhuma funcionalidade "nao existe" ou "nao esta disponivel" — nem as da\n' +
    'lista do que nao existe. Se nao achar o que a pessoa descreve, peca para\n' +
    'ela dizer em que tela esta e o que aparece escrito no botao, e resolva a\n' +
    'partir dai. Nao mencione esta observacao para a pessoa.';
}

module.exports = {
  CATALOGO_VERSAO,
  CATALOGO_EM,
  MARCAS_CONFERIDAS,
  PRODUTO,
  LOJISTA,
  PARCEIRO,
  NAO_EXISTE,
  paraPapel,
  avisoVersao,
};
