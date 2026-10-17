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

/* 10/10/2026 (noite) — '2026-10-10-teatro': videoaulas com layout de YouTube
   nos dois paineis, Tutoriais no menu lateral e no alto do menu do celular do
   lojista, cartao "Videoaulas do painel" no Inicio do lojista, selo das aulas
   do parceiro com barra e a aula opcional do Material de apoio; busca vazia
   de Quem entrega sem repetir o link (LOG-1). Aulas em tres niveis nos dois
   paineis: Essenciais (vermelho), Recomendadas (amarelo) e Complementares
   (azul). Escrito em TUTORIAIS (lojista), nas duvidas comuns, em QUEM ENTREGA
   e nas AULAS do parceiro. */
/* 10/10/2026 — Robo Vik: revisado contra moviki-app d794d55 (lojista
   '2026-10-09-tiktok', parceiro '2026-10-06-pixcarimbo', estudio
   '2026-10-07-ensaio'); texto do painel sem mudanca. Leva junto o bloco
   RECURSOS DO PRODUTO do atendimento (ensaio e Google no TikTok). */
/* 10/10/2026 (noite) — '2026-10-10-pixlive': o Pix DENTRO da live usa o mesmo
   recebimento da aba Financeiro (Pix direto ou conta Asaas do lojista); o texto
   antigo falava em "conta de pagamento aberta no nome do lojista", que e a
   subconta fechada em 16/09. Estudio '2026-10-10-pixtexto': a aba Receber no
   Pix nao mostra mais a tarifa da subconta para quem usa Pix direto. Paineis
   do lojista e do parceiro sem mudanca (marcas iguais). */
/* 10/10/2026 (noite) — '2026-10-10-pixaula': parceiro '2026-10-10-pixaula'
   (antes '2026-10-10-teatro') so trocou o video da aula "Como voce recebe o
   dinheiro" (regravada, 1:30). Texto do painel sem mudanca. */
/* 13/10/2026 — Robo Vik: catalogo '2026-10-13-vik' (marcas lojista
   '2026-10-12-ramoqr' e parceiro '2026-10-10-pixaula', conferidas no ar). */
/* 14/10/2026 — '2026-10-14-cadastro2': lojista '2026-10-14-cadastro2' (antes
   '2026-10-12-ramoqr'). So a tela de cadastro mudou; dentro do painel nada muda.
   Escrito em CADASTRO DO LOJISTA. */
/* 14/10/2026 — '2026-10-14-arroba': parceiro '2026-10-13-arroba' (antes
   '2026-10-10-pixaula'), subido em 13/10 pelo P80 SEM o Vik (regra 13) — o
   painel do dono acendeu o modo cauteloso em 14/10. Bloco novo "Seu @ no
   Instagram" em Meus dados (prova de posse pelo codigo na bio) e foto/@ do
   cracha so com o @ confirmado. Escrito em PAINEL DO PARCEIRO. */
/* 15/10/2026 — Robo Vik: catalogo '2026-10-15-vik' (marcas lojista
   '2026-10-14-provisorio' e parceiro '2026-10-13-arroba', conferidas no ar).
   Corrigida em CADASTRO DO LOJISTA a frase que ainda dizia que, com e-mail e
   senha, o teste so comeca depois de confirmar o e-mail. */
/* 16/10/2026 — Robo Vik: revisado o lojista '2026-10-15-ramodepois' (marca trocada
   pelo SincronizarMoviki em 15/10 20:56). Cadastro direto, ramo depois (P82):
   escrito em CADASTRO DO LOJISTA e no bloco do parceiro (porta de entrada).
   Montado sobre o catalogo '2026-10-15-vik' (PR #51). */
const CATALOGO_VERSAO = '2026-10-17-retido';
const CATALOGO_EM = '17/10/2026';

/* Marcas de versao (window.MOVIKI_VERSAO) dos paineis que foram LIDOS para
   escrever este catalogo. Nao e enfeite: e o gatilho do modo cauteloso. */
const MARCAS_CONFERIDAS = {
  lojista: '2026-10-17-aulasmalu',
  parceiro: '2026-10-17-retido',
};
/* 17/10/2026 — parceiro '2026-10-17-retido' (antes '2026-10-16-linkramo'): carencia de 30 dias
   do lojista-parceiro com a mensalidade em atraso (regulamento 1.5, item 2.4).
   Card Saldo ganhou o bloco "Retido pela mensalidade em atraso" (valor,
   contagem regressiva, prazo e botao para pagar) e o aviso amarelo tem texto
   proprio para o atraso. Escrito em PARCEIRO QUE TAMBEM E LOJISTA e no resumo
   do programa. */
/* 17/10/2026 — lojista '2026-10-17-aulasmalu' (antes '2026-10-16-boasvindas'): 13 videoaulas
   do lojista regravadas com a voz da Malu e a tela de hoje (so troca o video,
   mesmas chaves; mod-fotos virou 'Fotos e videos: a vitrine da sua pagina').
   Escrito no bloco das aulas (Tutoriais em video). */
/* 16/10/2026 — lojista '2026-10-16-boasvindas' (antes '2026-10-15-ramodepois'): aula de boas-vindas
   REGRAVADA ("Bem-vindo ao Moviki", 1:40, voz Malu) com versao vertical no
   celular em pe; e a PRIMEIRA ENTRADA mudou: conta nova sem ramo ve primeiro
   o video, depois "Ultimo passo: que tipo de negocio e o seu?", depois a
   proxima aula do comeco. Escrito em CADASTRO DO LOJISTA e no bloco das aulas. */
/* 16/10/2026 12:13 - AUTO-MARCA (SincronizarMoviki): parceiro '2026-10-13-arroba' -> '2026-10-16-linkramo'.
   So a marca mudou, para o Vik nao entrar em modo cauteloso. O texto do
   Vik sobre essa mudanca NAO foi revisado: o Robo Vik confere na proxima rodada. */
/* 15/10/2026 20:56 - AUTO-MARCA (SincronizarMoviki): lojista '2026-10-14-provisorio' -> '2026-10-15-ramodepois'.
   So a marca mudou, para o Vik nao entrar em modo cauteloso. O texto do
   Vik sobre essa mudanca NAO foi revisado: o Robo Vik confere na proxima rodada. */
/* 14/10/2026 — lojista '2026-10-14-provisorio' (estudio live.html
   '2026-10-14-provisorio'): TESTE GRATIS PROVISORIO. Sem confirmar o e-mail,
   o teste comeca no cadastro e vale 7 dias (ensaio sim, live aberta ao publico
   e assinar nao); confirmou, vira 30 dias contados do cadastro. Escrito no
   bloco do teste gratis. Antes: '2026-10-14-cadastro2'. */
/* 13/10/2026 — Robo Vik: revisado o lojista '2026-10-12-ramoqr' (antes
   '2026-10-10-teatro', marca trocada pelo SincronizarMoviki em 12/10 09:50).
   So o cadastro mudou: link ou QR com ramo abre o formulario com o ramo
   marcado tambem nos ramos sem live de exemplo. Escrito em CADASTRO DO
   LOJISTA. Dentro do painel nada muda. */
/* 10/10/2026 — lojista e parceiro '2026-10-10-teatro' (antes '2026-10-09-tiktok'
   e '2026-10-06-pixcarimbo'). So a janela das aulas, o menu, o cartao do Inicio,
   o selo e a aula opcional do Material de apoio mudaram; o resto da tela e igual. */
/* 09/10/2026 (tarde) — lojista '2026-10-09-tiktok': o aviso do Google tambem
   aparece no navegador do TikTok (que no iPhone nao se identifica como TikTok)
   e o texto passa a citar "Instagram, Facebook ou TikTok". Escrito em "LOGIN
   COM GOOGLE NAO APARECE". Antes: '2026-10-09-origem'. */
/* 09/10/2026 — lojista '2026-10-09-origem': no navegador do Instagram/
   Facebook o aviso do Google virou BOTAO "Abrir no navegador e entrar com
   Google" (abre a mesma pagina no Chrome/Safari levando ramo e etiquetas do
   link; se o aplicativo nao deixar sair, mostra o caminho pelos 3 pontinhos e
   "Copiar link"). O cadastro passa a mandar ao robo de onde a pessoa veio
   (nada muda na tela do lojista). Escrito em "LOGIN COM GOOGLE NAO APARECE".
   Antes: '2026-10-08-confirma1'. */
/* 07/10/2026 — estudio live.html '2026-10-07-ensaio' (P75 fase 1, B7): LIVE
   DE ENSAIO (botao "Fazer um ensaio", ate 10 min, 5 por dia, nao conta nas 2
   lives do teste gratis, ninguem ve). Escrito em TESTE GRATIS: DUAS LIVES.
   As marcas do lojista e do parceiro nao mudaram. Antes: '2026-10-06-vik'. */
/* 07/10/2026 — lojista '2026-10-07-cadastro1' (P75 fase 1, B3 e B12):
   CADASTRO EM MENOS TELAS (ramo vindo do anuncio, macro Loja de bairro /
   Shopping, apelido automatico), cartao "Sua primeira live em 3 passos" e
   avisos do teste gratis apontando o Premium como plano da live. Texto
   conferido no index.html dessa marca. */
/* 08/10/2026 — lojista '2026-10-08-confirma1': o aviso de e-mail nao
   confirmado diz o que libera e o painel percebe a confirmacao sozinho;
   o robo manda ate 2 lembretes de confirmacao por e-mail. Escrito em
   "Ao confirmar o e-mail". Antes: '2026-10-07-cadastro1'. */
/* 08/10/2026 — catalogo '2026-10-08-p75': juntou o pacote do Robo Vik de
   08/10 ('2026-10-08-vik', nunca subiu) com o P75 fases 0 e 1, para os dois
   nao brigarem pelo mesmo arquivo. */
/* 08/10/2026 — Robo Vik: revisado o lojista '2026-10-06-denuncia' (marca
   trocada sozinha pelo SincronizarMoviki em 06/10 20:13; antes
   '2026-10-05-aulasped2'). Mudanca do painel: botao DENUNCIAR em cada
   avaliacao (motivo + frase opcional; status "Denunciada · em analise" ou
   "Denuncia analisada: mantida"). Escrito em LOJISTA > Avaliacoes. */
/* 06/10/2026 — Robo Vik: parceiro '2026-10-06-pixcarimbo' (entrega
   'conferidor', regras v33) subiu sem esta tabela e o Vik entrou em MODO
   CAUTELOSO para todos os parceiros. Mudanca do painel: trocar a chave Pix em
   Meus dados grava a hora da troca (pixAtualizadoEm); o dono ve o alerta no
   saque. Nada muda na tela do parceiro: so a marca foi atualizada aqui. */
/* 05/10/2026 (tarde) — lojista '2026-10-05-aulasped2': MAIS DUAS AULAS
   ligadas, fora do cartao roxo (recursos liberados conta por conta): Lista VIP
   (1:10) no fim da sanfona Lista VIP e Quem entrega na sua cidade (1:06) no
   fim da sanfona Quem entrega. Na aba Tutoriais, as aulas de Envio, Lista VIP
   e Quem entrega so aparecem para quem tem o recurso. Corrigido o link da
   Lista VIP: e ?vip=link (e o QR do balcao usa ?vip=qr), nao ?vip=1; entrou
   "Encha a sua sala" (Copiar link, Imprimir QR para o balcao) e a linha
   "Vieram". Escrito em TUTORIAIS e LISTA VIP. Antes: '2026-10-05-aulasped'. */
/* 05/10/2026 — lojista '2026-10-05-aulasped' (sobre o catalogo '2026-10-05-vik'
   do Robo Vik, que este arquivo ja contem): DUAS AULAS NOVAS ligadas. Estoque
   (1:01) no fim da sanfona Estoque e como NONA aula do cartao roxo da Central;
   Envio para outras cidades (1:49) no fim do bloco de envio, so para quem tem
   o envio liberado, fora do cartao roxo. Escrito em TUTORIAIS, ESTOQUE e ENVIO.
   Antes: '2026-10-04-freteauto'. */
/* 05/10/2026 — Robo Vik (catalogo '2026-10-05-vik'; marcas iguais, lidas no
   retrato moviki-app c9a4545): o que cada aba do ESTUDIO faz (Agendar, Cupom
   e brinde, Fila de pedidos, Dados, Cortes e o botao Avisar clientes);
   Videos do negocio com links aceitos, setas de ordem e "Marcar produtos";
   rastreio com "Salvar codigo" e o aviso so com WhatsApp do cliente; regra
   unica dos RECURSOS LIBERADOS CONTA POR CONTA. Escrito em LOJISTA. */
/* 04/10/2026 — lojista '2026-10-04-freteauto' (P70 etapa 6): FRETE AUTOMATICO
   pelo Melhor Envio do lojista em Pedidos > Sua entrega > Envio (so com a
   chave ligada pelo Moviki). Escrito em ENTREGA, depois de QUEM ENTREGA. */
/* 04/10/2026 — lojista '2026-10-04-logistica' (P70 etapa 5): QUEM ENTREGA NA
   SUA CIDADE em Pedidos (so com a chave ligada pelo Moviki para a conta):
   parceiros de entrega aprovados, busca por cidade/UF e Chamar no WhatsApp.
   O Moviki so apresenta. Antes: '2026-10-03-vip'. */
/* 03/10/2026 — lojista '2026-10-03-vip' (P70 etapa 4): LISTA VIP em Pedidos
   (so com a chave ligada pelo Moviki para a conta) e botao "Avisar a Lista
   VIP" no estudio da live. Escrito em ENTREGA, depois do rastreio.
   Antes: '2026-10-03-rastreio'. */
/* 03/10/2026 — lojista '2026-10-03-rastreio' (P70 etapa 3): CODIGO DE
   RASTREIO na ficha do pedido de envio, pedido vira "Enviado", aviso pronto
   no WhatsApp do lojista e link de acompanhamento do cliente
   (www.moviki.com.br/pedido/...). Escrito em ENTREGA, logo depois do envio.
   Antes: '2026-10-03-envio'. */
/* 03/10/2026 — lojista '2026-10-03-envio' (P70 etapa 2): ENVIO PARA OUTRAS
   CIDADES (Pedidos > Sua entrega, so aparece quando o Moviki libera para a
   conta) e a marcacao "pode ir pelo correio" no produto do cardapio (nao
   aparece nos ramos de comida). Junto, o CARRINHO NA LIVE (etapa 1, tambem
   liberado conta por conta). Escrito em ENTREGA. */
/* 01/10/2026 — lojista e parceiro '2026-10-01-conforto2' (P65, correcao): o claro vale so dentro do painel
   (login, cadastro e quiz sempre escuros). Antes: '2026-10-01-conforto'.
   01/10/2026 — lojista e parceiro '2026-10-01-conforto' (P65): CONFORTO VISUAL v2.
   Botao APARENCIA (Escuro / Claro) no menu (lojista: logo abaixo do cartao da
   conta; parceiro: menu Mais e lateral do computador). Inicio do lojista na
   ordem de uso; trilhas de aula numa linha "Suas aulas"; o cartao largo da
   Central de Pedidos saiu da grade Ferramentas. Sem brilho e sem pulsar.
   Escrito no LOJISTA (Inicio, Ferramentas, Central, Meu dinheiro, APARENCIA)
   e no PARCEIRO (APARENCIA). Icones 3D e emojis continuam. */
/* 01/10/2026 — parceiro '2026-10-01-epoca': peca DE EPOCA no Material de
   apoio (campo a_partir_de: so aparece a partir do dia) e 16 videos novos de
   live por ramo (5 da Black Friday ja no ar; 10 de Natal so a partir de
   20/11; moda praia ja no ar). Escrito na DIVULGACAO. */
/* 01/10/2026 — parceiro '2026-10-01-eventos': CARTOES DE EVENTO do Material
   de apoio (Lote Fundador com as pecas dentro do cartao; Black Friday de
   01/11 a 30/11; Natal de 20/11 a 24/12). Escrito na DIVULGACAO. */
/* 01/10/2026 — lojista '2026-10-01-faixafundador': FAIXA DOURADA do Lote
   Fundador no Inicio (abaixo do aviso do teste gratis), para quem ainda nao e
   Enterprise. Escrito em PLANOS E PRECOS, no item do Lote Fundador. */
/* 01/10/2026 — parceiro '2026-10-01-fundador': cartao "Lote Fundador" com o
   link moviki.com.br/f/apelido na Divulgacao, atalho na Visao geral, link
   /fc/apelido na Area do criador, {link_fundador} e panfleto com QR do
   fundador no Material de apoio. Escrito na DIVULGACAO e na AREA DO CRIADOR. */
/* 01/10/2026 — lojista '2026-10-01-fundador': LOTE FUNDADOR no Meu plano,
   dentro do card Enterprise (R$ 990 a vista ou 12x de R$ 89,90 no cartao,
   50 vagas com "restam N", ate 27/11/2026). Escrito em PLANOS E PRECOS e na
   linha do Meu Plano. */
/* 30/09/2026 (noite) — lojista '2026-09-30-meudinheiro3': AULA NOVA
   "Meu dinheiro: quanto voce vendeu" (1:43) no fim da aba Meu dinheiro, nos
   Tutoriais e como OITAVA aula do cartao roxo da Central de Pedidos (quem ja
   tinha as sete ve "Tem uma aula nova da Central de Pedidos"). Escrito em
   MEU DINHEIRO e TUTORIAIS. */
/* 30/09/2026 (noite) — lojista '2026-09-30-meudinheiro2': aba nova MEU
   DINHEIRO (menu lateral logo abaixo da Central de Pedidos, menu "Mais" do
   celular, cartao em Ferramentas e botao no Financeiro > Vendas). So mostra:
   total vendido por periodo, comparacao, a confirmar, Pix nao pago,
   devolvido, live x cardapio, mais vendidos, dia/hora mais fortes, onde o
   dinheiro esta e extrato com planilha. Escrito em MEU DINHEIRO, na abertura
   do PAINEL DO LOJISTA e em NAO EXISTE. Icone
   3D proprio (carteira azul com moedas e grafico). */
/* 30/09/2026 (noite) — lojista '2026-09-30-alertaoferta': a Central de
   Pedidos avisa da peca da OFERTA RELAMPAGO que ja e de outro comprador
   ANTES do "Recebi o Pix" (cartao "peca ja e de outro", quadro vermelho na
   ficha, aviso no confirmar), botao novo "Nao tenho a peca" (recusa e manda
   devolver o Pix), "Avisar cliente" com texto de devolucao e etiqueta "sem a
   peca: devolva o Pix" no Historico. Comanda impressa ganha "CONFIRA A PECA".
   Escrito em PEDIDOS e MODO LIVE. */
/* 30/09/2026 (madrugada) — parceiro '2026-09-30-p46': o painel do parceiro
   subiu na P46 (videos do Material de apoio no Firebase Storage) sem trocar
   a marca aqui, e o Vik ficou em MODO CAUTELOSO para todos os parceiros
   desde entao. Mudanca visivel: o Baixar do video salva o .mp4 no aparelho
   (antes abria o video numa aba) e o compartilhar do celular manda o
   arquivo do video. Escrito em Material de apoio e nas duvidas comuns. */
/* 30/09/2026 (tarde) — lojista '2026-09-30-estoque' (P53): ESTOQUE DO
   PRODUTO na Central de Pedidos (sanfona "Estoque"), reserva da peca no Pix,
   "Desfazer venda / devolver" na ficha, "O Pix caiu: confirmar" para Pix
   recusado/vencido, faixa vermelha de Pix devolvido pelo banco, etiquetas
   "sem estoque: confira" e "pagou depois do prazo", Pix vencido so 2 h em
   Novos (eram 12 h), quadro sem o limite de 200 pedidos. Estudio: lista de
   produtos com "estoque N"/"ESGOTADO". Escrito em PEDIDOS e MODO LIVE. */
/* 30/09/2026 — catalogo '2026-09-30-reserva': nenhum dos dois paineis mudou
   (as marcas acima continuam as mesmas). Mudou o CHECKOUT e o ESTUDIO da
   live: prazo do Pix (10 min na oferta relampago, 30 no resto), reserva da
   unidade da oferta na geracao do Pix, Pix vencido que some da tela do
   comprador e alerta de "pago depois do prazo". Escrito em VENDAS e em
   MODO LIVE. */
/* 27/09/2026 — lojista '2026-09-27-trilhaped': o cartao das aulas da Central
   (e qualquer aula da Central aberta pelos Tutoriais) passou a abrir a JANELA
   DE TRILHA — a mesma das boas-vindas: video grande, lista das 7 aulas ao lado
   com visto verde, "X de 7", medidor "Assistido N%" e a proxima aula entrando
   sozinha quando a atual termina. Escrito em PEDIDOS. */
/* 27/09/2026 — lojista e parceiro '2026-09-27-aulaspedidos': AULAS DA
   CENTRAL DE PEDIDOS no ar. Seis aulas novas no painel do lojista (modulo
   "Central de Pedidos" dos tutoriais) e a do Financeiro regravada (1:39).
   Cartao roxo "Aulas da Central de Pedidos: X de 7" no Inicio e no alto da
   aba Pedidos, so para Premium e Enterprise; nao tranca nada. No parceiro,
   as sete entram no modulo OPCIONAL (nao contam para a trava nem o selo).
   Escrito em TUTORIAIS, PEDIDOS e no modulo opcional do parceiro. */
/* 27/09/2026 — lojista '2026-09-27-quadro' (sobre a '2026-09-26-a2'): a
   CENTRAL DE PEDIDOS virou QUADRO DE COLUNAS, no jeito do iFood (Novos ·
   Pagos · Separando · Prontos · Entregues). Arrastar no computador; no
   celular uma coluna por vez, com abas, e um botao por cartao. Ficha do
   pedido ao tocar; aviso "Avisar cliente / Desfazer" depois de mover;
   Historico; impressao da COLUNA inteira (Enterprise). Sairam os filtros em
   pilula, os quatro numeros do topo e as caixinhas de marcar. Escrito em
   PEDIDOS e na descricao do layout. */
/* 26/09/2026 — lojista '2026-09-26-a2' (Pacote A2, sobre a '2026-09-26-dados'): assinar
   exige e-mail confirmado; teste gratis pedido de novo quando so existe
   cobranca pendente; no navegador do Instagram/Facebook o botao do Google some
   (o Google recusa login ali) e aparece o aviso para usar e-mail e senha;
   linha dos Termos no cadastro. */
/* 26/09/2026 — lojista '2026-09-26-dados': TERMO DE VENDA 2026-09-26 com o
   item "Os dados do cliente sao para atender o pedido"; aviso "O Termo de
   Venda mudou em 26/09" no Financeiro e no topo da Central de Pedidos para
   quem ja vendia; pedido com dados vencidos mostra "Contato e endereco
   apagados pelo prazo de privacidade (LGPD)". Escrito em FINANCEIRO e PEDIDOS. */
/* 26/09/2026 — lojista e parceiro '2026-09-26-aulasroxo': cartoes e avisos
   de AULAS ficaram ROXOS em todos os paineis (lojista, parceiro e estudio da
   live); antes eram laranja e disputavam com a Central de Pedidos. O cartao
   "Indicar agora" e o bloco "Indique e receba" do lojista ficaram VERDES, a
   cor do programa de parceiros. Escrito na abertura do PAINEL DO LOJISTA. */
/* 26/09/2026 — lojista '2026-09-26-menupedidos': PEDIDOS EM DESTAQUE. No
   computador "Central de Pedidos" subiu para logo abaixo do Inicio, laranja;
   no celular entrou na barra de baixo NO LUGAR de Promocoes e no topo do
   menu "Mais"; no Inicio virou o cartao largo do topo da grade. Contador
   laranja nos quatro lugares. Escrito na abertura do PAINEL DO LOJISTA e em
   PEDIDOS. */
/* 26/09/2026 — lojista '2026-09-26-pedidos': CENTRAL DE PEDIDOS. Aba nova
   "Pedidos" (menu lateral e cartao em Ferramentas), com as etapas depois do
   Pix, comanda para imprimir, aviso ao cliente pelo WhatsApp, entrega por
   bairro com taxa e a lista de separacao do Enterprise. A lista de pedidos
   saiu do Financeiro (ficou so o resumo) e o "Como o cliente recebe" foi
   para Pedidos > Sua entrega. Escrito em PEDIDOS e em COMO O DINHEIRO ANDA. */
/* 25/09/2026 — lojista '2026-09-25-checkout' (Pacote A): a tela Meu Plano
   ganhou as regras da assinatura antes do botao de pagar (renova a cada
   ciclo, canal de cancelamento, 7 dias a partir do 1o pagamento) e a caixa
   "Li e aceito os Termos". Conferido e escrito em PLANOS E PRECOS. */
/* 23/09/2026 — 'rodada2' subiu nos dois paineis (outro chat) sem esta tabela:
   modo cauteloso para TODOS de novo. Conferido o que o cliente percebe:
   lojista — teste gratis nao renova sozinho, e-mail confirmado libera o
   teste na hora, botao "Conferir no Asaas"; parceiro — aviso da clausula 2.4
   (parceiro que tambem e lojista so ganha com o proprio plano pago). */
/* 22/09/2026 — o parceiro foi de 'menucateg' a 'criador4' no mesmo dia
   (Area do criador, card na Visao geral, porta /criador) e esta tabela ficou
   para tras por algumas horas: modo cauteloso ligado de novo para todos os
   parceiros. Entrou junto o bloco CRIADOR, que so vai no prompt de quem esta
   marcado como criador. */
/* 16/09/2026, TERCEIRA VEZ NO MESMO DIA — a tabela ficou em 'asaasconta' e
   'trilha' enquanto os dois paineis subiam para 'preco1' (a troca de precos) e
   o lojista seguiu para 'atrib1' (fbc/fbp no cadastro). O Vik passou o dia
   inteiro em modo cauteloso, de novo, sem ninguem ver.
   O CONTEUDO deste catalogo ja estava certo: os precos aqui dentro sao
   39,90 / 69,90 / 129,90, os novos. O que estava velho era so a tabela — que e
   justamente o pior caso, porque degrada o Vik sem nenhum sintoma na tela.
   A melhoria que falta nao e aqui: e o painel do dono ACUSAR a divergencia.
   Marca velha aqui deveria acender uma luz em "Precisa de voce", nao ficar
   esperando alguem clonar o repositorio para descobrir.

   Marcas anteriores, para o historico: '2026-09-12-beta1' e
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
   atualizacao.

   16/09/2026, QUARTA REVISAO — as aulas alcancaram o dinheiro.
   O lojista foi para '2026-09-16-aulafinanceiro' (aula propria da aba
   Financeiro, a 17a do painel) e o parceiro para '2026-09-16-liveparc2'
   (aula obrigatoria da venda ao vivo, a 13a, mais o modulo OPCIONAL com as
   catorze aulas do lojista). Na mesma rodada a abertura de conta de
   recebimento SAIU do estudio da live: conta nova nao se abre mais por la. */

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
- Pro: R$ 39,90/mes · R$ 399,00 anual (2 meses gratis).
  Soma cardapio, promocoes, eventos e o desempenho completo de 14 dias.
- Premium: R$ 69,90/mes · R$ 699,00 anual.
  Soma fotos, videos, foto de capa, logo propria no pino, cor da marca, o
  Modo Live (transmissao ao vivo) e a VENDA PELO CARDAPIO com Pix caindo na
  conta do proprio lojista.
- Enterprise: R$ 129,90/mes. Soma multi-ponto (3 pontos inclusos, do 4o em
  diante R$ 19,90/mes cada), WhatsApp proprio por ponto, white-label,
  relatorios e as ferramentas de venda da live, incluindo o PIX DENTRO DA
  PROPRIA LIVE.
- LOTE FUNDADOR (desde 01/10/2026, so ate 27/11/2026 ou enquanto houver
  vaga — sao 50 vagas no total): o MESMO Enterprise completo por 12 meses,
  pago de uma vez. Duas formas, as duas em Meu Plano, dentro do cartao
  Enterprise, no bloco "Lote Fundador":
  * "R$ 990 a vista" (Pix, boleto ou cartao). Renova todo ano por R$ 990
    enquanto o lojista renovar sem interrupcao — o preco de fundador fica
    travado. Se deixar vencer, volta ao preco da tabela.
  * "12x de R$ 89,90" no cartao (total R$ 1.078,80). As parcelas sao do
    cartao; o plano vale 12 meses e NAO renova sozinho: no fim, ele renova
    pelo preco de fundador se fizer isso antes de vencer.
  O bloco mostra "restam N de 50". A cobranca vence HOJE (nao espera o fim
  do teste), mas quem esta no teste gratis NAO perde dias: os 12 meses so
  comecam quando o teste acaba. Garantia de 30 dias: desistiu dentro de 30
  dias do pagamento, devolucao integral pelos canais de cancelamento (WhatsApp
  ou e-mail), e a vaga volta para o lote. Esgotou ou passou de 27/11, o bloco
  some e aparece "As vagas do Lote Fundador acabaram" / "O Lote Fundador
  encerrou". Cada conta compra uma vez ("Voce ja garantiu o seu Lote
  Fundador"). Quem ja paga outro plano nao troca pelo painel: troca de plano
  de pagante e pela equipe. Comparacao honesta: 12 x R$ 129,90 = R$ 1.558,80
  no mensal; o fundador a vista sai por R$ 990. Pagina com os detalhes:
  moviki.com.br/fundador. Nunca chame de "desconto que eu consigo para
  voce" nem prometa vaga: quem conta as vagas e o sistema.
  FAIXA NO INICIO (desde 01/10/2026): quem ainda nao e Enterprise ve, no
  Inicio do painel, uma faixa dourada "Lote Fundador · so ate 27/11" com
  "restam N de 50". No teste gratis e no Basico o botao e "Quero o
  fundador" e abre o Meu Plano ja no bloco do Lote Fundador. Quem ja paga Pro
  ou Premium ve "Trocar pelo fundador", que abre o WhatsApp da equipe (a troca
  de plano de pagante e feita pela equipe, sem perder o que ja pagou). O "x"
  esconde a faixa por 3 dias naquele aparelho. Enterprise nao ve. Depois de
  27/11 ou com as vagas esgotadas, a faixa some sozinha.
Teste gratis: 30 dias de Pro, automatico no cadastro, uma vez por conta. Ao
vencer cai sozinho para o Basico, sem cobranca surpresa.
TESTE SEM CONFIRMAR O E-MAIL (desde 14/10/2026): o teste comeca na hora do
cadastro, mesmo antes de confirmar o e-mail, mas vale so 7 dias. Nesses 7 dias
o painel funciona (cardapio, promocoes, ferramentas do Pro) e o ENSAIO da live
esta liberado; a LIVE ABERTA AO PUBLICO e ASSINAR um plano pedem o e-mail
confirmado. Na live, quem tenta "Entrar ao vivo" sem confirmar ve "Confirme
seu e-mail para fazer a live aberta aos seus clientes. O ensaio, que ninguem
ve, ja esta liberado." Confirmando, o teste passa a valer 30 dias contados do
dia do cadastro (quem confirma muito tarde ainda ganha pelo menos 7 dias a
partir da confirmacao). O aviso do topo do painel mostra "Seu teste gratis ja
comecou" e quantos dias faltam sem confirmar; o Meu Plano diz "por enquanto
ate <data>". A faixa "Seu teste gratis acaba em N dias" nao aparece nesse
periodo. Quem nao confirma recebe ate 3 lembretes por e-mail (algumas horas
depois, no dia seguinte e 2 dias antes de os 7 dias acabarem).
O TESTE NAO RENOVA SOZINHO: para continuar no plano, a pessoa escolhe o plano
em Meu Plano ainda durante o teste — a primeira cobranca so vence no fim do
teste e ela nao perde nenhum dia. Nunca diga que "renova automaticamente".
Ao confirmar o e-mail (link enviado no cadastro), o painel libera os 30 dias na
hora, sem precisar sair e entrar de novo. O aviso do topo (desde 14/10 com o
texto do teste que ja comecou; so contas antigas sem teste ainda veem "Falta 1
passo para liberar seus 30 dias gratis"), tem
os botoes "Ja confirmei" e "Nao recebi — enviar de novo", e o painel PERCEBE
SOZINHO quando a pessoa confirma no celular e volta para a aba. Quem nao
confirma recebe lembretes por e-mail com um link novo (ver acima). Link que nao abre ou expirou: tocar em
"Nao recebi — enviar de novo" no painel. Durante o teste as
fotos e os videos ja aparecem no site. Pagamento por Pix ou cartao.
ASSINAR UM PLANO PAGO (Meu Plano, desde 25/09/2026): depois de escolher o
plano, a tela mostra tres regras e a caixa "Li e aceito os Termos de uso e a
Politica de privacidade". Sem marcar a caixa, o botao "Confirmar meu plano"
responde "Marque que leu e aceita os Termos de uso para seguir". As regras:
- o plano PAGO renova sozinho a cada ciclo (mes ou ano) ate a pessoa cancelar
  (quem nao renova sozinho e o TESTE GRATIS, nao o plano pago);
- cancelar e pelo WhatsApp (41) 2018-6848 ou por suporte@moviki.com.br, sem
  multa; o plano segue ate o fim do periodo ja pago;
- 7 dias para desistir a partir do PRIMEIRO PAGAMENTO, com devolucao
  integral (quem assina durante o teste conta da primeira cobranca paga).
SO ASSINA COM E-MAIL CONFIRMADO (desde 25/09/2026): quem ainda nao tocou no
link de confirmacao recebe "Confirme o seu e-mail antes de assinar". E de
proposito: confirmado o e-mail, o teste vira 30 dias e a 1a cobranca so vence
no fim dele. Se a pessoa diz que ja confirmou, oriente a tocar em "Ja confirmei"
no aviso do topo do painel e tentar de novo.
TROCAR DE PLANO sendo pagante: pela equipe (WhatsApp ou e-mail); o painel
responde "Para trocar de plano, fale com a gente".
LOGIN COM GOOGLE NAO APARECE: a pessoa esta no navegador de um aplicativo
(Instagram, Facebook ou TikTok), onde o Google recusa o login. No lugar do botao do Google aparece o
botao "Abrir no navegador e entrar com Google": ele abre a mesma pagina no
Chrome/Safari do celular, onde o Google funciona e o e-mail ja vem confirmado
(o teste gratis libera na hora). Se o aplicativo nao deixar sair, aparece o
caminho manual (tocar nos 3 pontinhos > Abrir no navegador) e o botao "Copiar
link". Ou ela cria a conta ali mesmo com e-mail e senha.
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
  Cor da marca, Modo Live, LIGAR A VENDA no cardapio (aba Financeiro) e a
  CENTRAL DE PEDIDOS (quadro de etapas, comanda uma a uma, aviso ao
  cliente, entrega por bairro com taxa).
- Enterprise: Meus pontos, white-label, as ferramentas de venda da live
  (Pix DENTRO da live, oferta relampago, cupom, brinde, fila, dados,
  cortes) e, na Central de Pedidos, a IMPRESSAO DA COLUNA INTEIRA
  (comandas em lote) e a LISTA DE SEPARACAO.
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
    sistema confere sozinho no Asaas (na hora, se o cliente estiver com a
    pagina aberta; senao a cada 5 minutos) e o pedido "aguardando" tem o
    botao "Conferir no Asaas" para perguntar na hora, o Asaas desconta R$ 1,99 por Pix recebido e o
    pedido minimo sobe para R$ 20.
- LIVE (so Enterprise): "Comprar com Pix" dentro da transmissao, com o MESMO
  recebimento da aba Financeiro: Pix direto (sem tarifa, o lojista confirma
  pelo aviso "Recebi" que aparece por cima do estudio, depois de o cliente
  tocar em "Ja paguei") ou conta Asaas do lojista (confirmacao sozinha, com a
  tarifa do Asaas). O botao de compra aparece sozinho na live quando a venda
  esta ligada no Financeiro. Nao existe conta nova para abrir no estudio. No
  Premium a live nao tem Pix: o botao e "Quero este", que abre o WhatsApp do
  lojista.
So Pix. Nao existe cartao nem boleto.
ENTREGA (desde 26/09/2026): o lojista escolhe retirada, entrega ou as duas e
pode cadastrar os BAIRROS que atende com a TAXA de cada um (Pedidos > Sua
entrega). Com bairros cadastrados, o cliente informa o CEP e o endereco,
escolhe o bairro da lista e a taxa entra SOZINHA no valor do Pix — o valor
inteiro vai para o lojista, o Moviki nao fica com nada. Bairro fora da lista
nao recebe entrega. Sem bairros cadastrados, a entrega e "a combinar" pelo
WhatsApp, sem taxa no Pix. Pode haver pedido minimo PARA ENTREGA, que conta
so os produtos. O Moviki NAO faz a entrega: quem entrega e o lojista.
ENVIO PARA OUTRAS CIDADES (03/10/2026, so para a conta que o Moviki liberou;
se o lojista nao ve a opcao, ela ainda nao foi liberada para ele — pedir ao
suporte): em Pedidos > Sua entrega aparece "Envio para outras cidades
(correio ou transportadora)". O lojista marca "Enviar pedidos para outras
cidades", escolhe o estado de onde o pacote sai e preenche o frete: um valor
para o proprio estado e um por regiao (Norte, Nordeste, Centro-Oeste,
Sudeste, Sul). Regiao vazia = nao envia para la. Pode ter "frete gratis
acima de" um valor e o prazo de envio. NAO pede peso nem medida. O cliente de
outra cidade escolhe "Enviar para outra cidade", informa o CEP e o frete entra
no Pix pelo estado dele. So vai pelo correio o produto marcado "pode ir pelo
correio" no cardapio (a caixinha fica ao lado de "acabando"); comida e ramos
de alimentacao nao tem essa opcao. Se o carrinho tiver item que so tem
retirada ou entrega no bairro, o cliente ve o nome dele e nao consegue
escolher o envio. Quem posta e paga a etiqueta e o lojista; o Moviki nao
fica com o valor do frete (pela tabela, o valor e o que o lojista escreveu; o
calculo pela transportadora so existe no FRETE AUTOMATICO, abaixo). O pedido aparece na
Central como "Envio · UF", com o endereco completo.
CODIGO DE RASTREIO (03/10/2026, so em pedido de envio para outra cidade):
na Central de Pedidos, o lojista abre o pedido pago e, em "Codigo de
rastreio", escolhe a transportadora (Correios, Jadlog, Loggi, J&T Express ou
"Outra transportadora", com o nome dela) e digita o codigo. Correios tem 13
caracteres, como AB123456789BR. "Salvar e marcar Enviado": o pedido passa
para ENVIADO sozinho (em pedido de envio a etapa "saiu" se chama Enviado).
Se o pedido ja passou dessa etapa, o botao se chama "Salvar codigo" e so
guarda o codigo. Com o codigo salvo, quando o pedido tem o WhatsApp do
cliente, aparece o botao "Avisar cliente no WhatsApp", que abre o WhatsApp DO LOJISTA
com a mensagem pronta: numero do pedido, transportadora, codigo e o link de
acompanhamento. Quem envia a mensagem e o lojista; o Moviki nao manda nada em
nome dele e o cliente nao deixa e-mail. O link (www.moviki.com.br/pedido/...)
mostra so loja, numero, etapa, cidade/UF, prazo, itens e o codigo, com botao
para copiar e para abrir o site oficial de rastreio; nunca nome, telefone ou
endereco. "Trocar codigo" corrige o codigo sem mudar o link. "Copiar link"
copia o link para mandar por outro canal. O link deixa de abrir quando os
dados do comprador sao apagados pelo prazo de privacidade. O Moviki NAO
consulta a transportadora: o andamento do pacote o cliente ve no site dela;
"Entregue" o lojista marca. Pedido de envio nao usa o codigo de 4 digitos
(ele e para retirada e entrega no bairro). Na Central, pedido enviado sem
codigo aparece com a etiqueta "sem rastreio".
LISTA VIP — "ME AVISE DA PROXIMA LIVE" (03/10/2026, Premium e Enterprise, so
para a conta que o Moviki liberou; se o lojista nao ve, ainda nao foi liberada
para ele — pedir ao suporte): na pagina do negocio e na live aparece o botao
"Me avise da proxima live". O cliente escolhe como quer ser avisado:
notificacao no celular (no iPhone so funciona com o site adicionado a tela de
inicio), e-mail (ele confirma por um link antes de comecar a receber) ou o
WhatsApp da loja. Tudo com autorizacao marcada pelo cliente. No painel, em
Pedidos > Lista VIP, o lojista ve quantas pessoas tem em cada canal, a lista do
WhatsApp (nome e numero; ele NAO ve e-mail nem o aparelho de ninguem), a linha
"Vieram" (de onde cada pessoa entrou: QR do balcao, link, live ou pagina), o
bloco "Encha a sua sala" com o link para divulgar (endereco da pagina com
?vip=link, que ja abre o pedido de aviso; serve para status, bio e reels),
"Copiar link" e "Imprimir QR para o balcao" (o QR usa ?vip=qr) e
o botao "Avisar agora", com uma chamada opcional de ate 80 letras. O aviso so
sai COM A LIVE NO AR, no maximo 1 vez a cada 2 horas e 3 por dia; a notificacao
e o e-mail saem pelo Moviki dizendo que a loja esta ao vivo, com o link da live.
A lista do WhatsApp o lojista avisa pelo WhatsApp dele: cada nome tem o botao
"Avisar" (mensagem pronta com o link da live e o link para a pessoa sair) e
"Remover"; "Copiar nomes e numeros" ajuda a montar uma lista de transmissao.
No estudio, com a live no ar, ha o botao "Avisar a Lista VIP (N pessoas)". O
e-mail tem um limite por dia para o Moviki inteiro; quando bate, o painel diz
quantos ficaram de fora. A lista e da loja e serve SO para aviso de live: nao
pode virar propaganda e o Moviki nao manda WhatsApp. Cliente sai pelo link do
e-mail, pelo link da mensagem, desligando a notificacao ou pedindo a loja.
NUNCA sugerir importar contatos de compradores de outras plataformas para a
lista: cada pessoa entra sozinha, pelo botao.
FRETE AUTOMATICO PELO MELHOR ENVIO (04/10/2026, Premium e Enterprise, so para
a conta que o Moviki liberou, e so com o Envio para outras cidades ligado): em
Pedidos > Sua entrega, no fim do bloco de envio, aparece "Frete automatico
(Melhor Envio)". O lojista precisa ter conta no Melhor Envio (e dele, nao do
Moviki). Ele gera um token no Melhor Envio (Integracoes > Permissoes de acesso
> Gerar novo token, marcando so a cotacao de fretes), cola no painel e
preenche: CEP de onde o pacote sai, peso medio por peca (kg), a caixa que mais
usa (altura, largura, comprimento em cm), acrescimo por pedido (embalagem, ate
R$ 50), dias ate postar e, se quiser, declarar o valor (seguro, frete mais
caro). Marca "Calcular o frete automaticamente" e salva: o Moviki confere o
token com uma cotacao de teste e guarda CIFRADO (ninguem ve depois, nem ele;
para trocar, cola outro; "Desconectar o Melhor Envio" apaga). Ha "Simular o
que o cliente ve" com CEP e numero de pecas. Na pagina e na live, quem escolhe
"Enviar para outra cidade" digita o CEP e ve as opcoes (Correios, Jadlog e
outras que a conta dele tiver) com preco e prazo, e escolhe uma; o frete entra
no MESMO Pix do pedido, o dinheiro e todo do lojista, e a ETIQUETA o lojista
compra no Melhor Envio dele, como ja fazia (o Moviki nao compra etiqueta).
O pacote e a caixa padrao com o peso somado das pecas: no Cardapio, o produto
marcado "pode ir pelo correio" ganha o campo "peso (kg)" (so com o frete
automatico liberado); produto sem peso usa o peso medio por peca. Frete gratis acima de X: a opcao mais barata
sai gratis e as outras cobram so a diferenca. Se o Melhor Envio estiver fora
do ar, vale a tabela por regiao (se a regiao estiver preenchida). Na Central,
o pedido mostra a forma de envio escolhida pelo cliente.
QUEM ENTREGA NA SUA CIDADE (04/10/2026, Premium e Enterprise, so para a conta
que o Moviki liberou; se o lojista nao ve, ainda nao foi liberada para ele —
pedir ao suporte): em Pedidos > Quem entrega na sua cidade, o lojista escolhe
a cidade e o estado e toca em Buscar. Aparecem entregadores (moto, bike,
carro), transportadoras pequenas e pontos de coleta que se cadastraram em
moviki.com.br/entregadores e foram CONFERIDOS pela equipe do Moviki. Primeiro
os da mesma cidade, depois os do estado e por ultimo quem atende outros
estados. Cada cartao mostra o nome, o tipo, o primeiro nome do responsavel,
os servicos (bairro, cidade, cidades vizinhas, outros estados, busca na loja,
leva ao correio), os veiculos e a area atendida, com o botao "Chamar no
WhatsApp" (mensagem pronta). O MOVIKI SO APRESENTA: nao contrata, nao cobra
taxa de ninguem, nao recebe nem repassa o frete e NAO garante a entrega. Preco,
prazo, forma de pagamento e responsabilidade pelo pacote sao combinados direto
entre a loja e o parceiro; orientar a combinar por escrito no WhatsApp. Nunca
dizer que o entregador e "do Moviki", "verificado" no sentido de garantido, ou
que o Moviki responde por extravio. Cadastro do entregador e gratuito: indicar
o link moviki.com.br/entregadores (fica na nota fixa embaixo da busca). Se nao
aparece ninguem na cidade, a tela diz que ainda nao ha parceiro aprovado ali e
que quem se cadastrar e for aprovado pela equipe aparece na lista.
CARRINHO NA LIVE (03/10/2026, so para a conta que o Moviki liberou): o
cliente junta varios produtos da live e paga UM Pix, com UM frete. O pedido
chega na Central com todos os itens.
RECURSOS LIBERADOS CONTA POR CONTA: Envio para outras cidades, Frete
automatico (Melhor Envio), Lista VIP (e o botao "Avisar a Lista VIP" do
estudio), Quem entrega na sua cidade e Carrinho na live. A equipe do Moviki
libera cada um para algumas contas. Se o lojista pergunta por um deles e
nao ve a tela: diga que o recurso existe, que e liberado pela equipe para
algumas contas e ainda nao foi liberado para a dele, e que ele pode pedir ao
suporte (da para avisar o time por aqui). Nunca diga que nao existe, nunca
prometa que vai ser liberado nem prazo, e nao explique o passo a passo como
se ele ja tivesse a tela.
Cada pedido sai com CENTAVOS diferentes (R$ 20,07, R$ 20,13...) para o
lojista achar o pagamento no extrato sem caçar nome. Nao e erro de preco.

=== PROGRAMA DE PARCEIROS ===
- Nivel 1 (indicacao direta): 15% de cada mensalidade paga pelo indicado,
  enquanto ele continuar pagando. Sobe para 16% (Ouro), 17% (Diamante) e 18% (Esmeralda).
- Nivel 2: 7,5%, bonus unico, so no primeiro pagamento do indicado.
- Nivel 3: 5%, bonus unico, so no primeiro pagamento do indicado.
Comissao so existe sobre assinatura efetivamente PAGA — periodo de teste nao
gera comissao, e se ninguem assinar plano pago a comissao e zero.
Cadastro entra como pendente e passa por aprovacao. O link de indicacao so
abre depois das aulas. Saque: minimo R$ 20, Pix na chave cadastrada, em ate
1 dia util (24h); a comissao fica retida antes de liberar: 7 dias, 30 dias
quando o pagamento e do Lote Fundador e, no cartao de credito, ate o valor
ser creditado ao Moviki (regulamento 5.2, versao 1.4). Cada comissao mostra
"libera em DATA" no painel.
Quem ja e lojista so opera como parceiro com a propria assinatura paga (fora
do teste gratis). Mensalidade em atraso: a comissao fica retida por ate 30
dias e e liberada se ele pagar no prazo; depois, a do periodo e perdida
(regulamento 1.5, item 2.4). Parceiro puro, sem negocio na Moviki, e isento
dessa regra.
Nao e piramide: nao ha kit, estoque, investimento inicial, nem pagamento por
cadastrar pessoas ou montar equipe.
`.trim();

/* ==================================================================
   2. PAINEL DO LOJISTA  (moviki-app/index.html + live.html)
   ================================================================== */
const LOJISTA = `
=== O PAINEL DO LOJISTA, COMO ELE ESTA HOJE ===
Menu lateral (computador), nesta ordem: Inicio · CENTRAL DE PEDIDOS (em
destaque laranja, logo abaixo do Inicio) · MEU DINHEIRO (desde 30/09) ·
Cardapio · Promocoes · Eventos ·
Fotos e videos · Localizacao · Informacoes · WhatsApp · Avaliacoes ·
FINANCEIRO · Meu Plano · Meus pontos (so Enterprise).
CONTADOR DE PEDIDOS (desde 26/09): bolinha laranja com um numero em todos os
caminhos para Pedidos. Conta so o que pede acao agora: cliente que avisou que
pagou (conferir o Pix) + pedido pago esperando separar. "Aguardando
pagamento" nao entra. Pisca quando ha Pix para conferir. So aparece para
Premium e Enterprise, que sao os planos da Central.
Quem tambem e parceiro ve no topo do menu o botao VERDE "Painel do parceiro"
(era dourado ate 26/09): verde e a cor do painel do parceiro.
APARENCIA (desde 01/10): no menu, logo abaixo do cartao da conta, o botao
"Aparencia" com duas opcoes: Escuro (padrao) e Claro. A escolha fica salva
NO APARELHO (vale para o painel do negocio e o do parceiro naquele celular ou
computador; em outro aparelho, escolhe de novo). O topo com a logo continua
escuro nos dois. O claro vale so DENTRO do painel: a tela de entrar, o
cadastro e o quiz ficam sempre escuros. O estudio da live fica sempre escuro
(tela de camera) e a pagina publica do negocio nao muda. Quem reclamar de tela escura no sol:
mande usar Aparencia > Claro.
CORES FIXAS (desde 26/09): AULAS sao ROXAS em todos os paineis (desde 01/10
as trilhas do Inicio ficam numa linha "Suas aulas" que abre as trilhas; o
aviso de aulas do parceiro e uma linha compacta);
INDICAR ("Indicar agora" e "Indique e receba") e VERDE, a cor do parceiro.
ENTERPRISE tem distintivo DOURADO (desde 26/09): selo "Enterprise" no cartao
do negocio no menu lateral (com borda dourada) e "★ ENTERPRISE" embaixo da
logo no celular. Recursos exclusivos levam a etiqueta dourada ENTERPRISE; no
Premium a mesma etiqueta aparece com cadeado. A cor do painel NAO muda por
plano: dourado e so o distintivo.
Ao abrir PEDIDOS o painel fica LARANJA na faixa do topo, na aba ativa e nos
botoes, e o titulo vira "Central de Pedidos"; voltar ao inicio devolve o azul. No
computador, dentro de Pedidos, a coluna da direita some e os pedidos aparecem
num QUADRO de cinco colunas (desde 27/09); no celular e em tela estreita, uma
coluna por vez, com abas no alto.
No celular a barra de baixo tem 5 lugares: Inicio · Cardapio · botao redondo
do meio (Acao rapida) · PEDIDOS (laranja, com o contador) · Mais. Desde
26/09 Pedidos ocupa o lugar que era de Promocoes; Promocoes continua no
cartao da grade Ferramentas e em "Criar promocao" na Acao rapida. O "Mais"
abre o menu completo, que tem "Central de Pedidos" logo no topo.
A folha "Acao rapida" tem: Fazer live, Adicionar fotos,
Criar promocao, Atualizar cardapio, Ver minha pagina.
No Inicio existe a grade "Ferramentas", com um cartao para cada tela —
incluindo FINANCEIRO —, mais Mensagens, Tutoriais, Indicar agora e Fazer
live. Desde 01/10 a grade NAO tem mais o cartao largo da Central de Pedidos:
a Central fica no aviso laranja do topo do Inicio ("N pedidos esperando
voce", botao Abrir), em Pedidos na barra de baixo e no topo do menu.

- Inicio (ordem desde 01/10): saudacao, aviso de pedidos esperando, cartao
  "Seu negocio no mapa" com os botoes Aberto e Fechado, os 3 passos de
  boas-vindas (conta nova), avisos do teste gratis e do Lote Fundador, a
  grade Ferramentas, a linha "Suas aulas" (toca e abre as trilhas: boas-vindas,
  live, Central de Pedidos), o convite de parceiro e "Proximas acoes
  recomendadas"; na coluna da direita, "Seu desempenho", "Seu link pra
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
  Instagram e do TikTok abre no aplicativo, que e regra deles.
  O link tem que comecar com https:// e ser de um video (YouTube normal,
  Shorts ou live; Reels ou post do Instagram; TikTok). Link de perfil ou de
  outro site da "Nao reconheci esse link"; o mesmo video duas vezes da "Esse
  video ja esta na lista". Na lista, as setas sobem e descem o video (muda a
  ordem) e o X remove. Os videos aparecem numa faixa no alto da pagina
  publica. MARCAR PRODUTOS (botao em cada video; vira "Produtos (N)"): abre
  "Produtos deste video", onde ele escolhe ate 4 itens do cardapio; eles
  aparecem embaixo do video, na pagina, com o mesmo botao de comprar do
  cardapio — vale tambem para Instagram e TikTok. Item sem preco aparece
  apagado e nao pode ser marcado. Sem cardapio, a janela manda montar o
  cardapio primeiro. Mudou a lista, a capa ou os produtos: "Salvar tudo".
  CAPA DO VIDEO (16/09/2026): cada video tem o botao "Escolher capa" /
  "Trocar capa". TRES formas: usar uma foto que ele JA tem na galeria, enviar
  uma imagem nova, ou "PEGAR UM QUADRO DO VIDEO" — abre o video que esta no
  celular dele, ele arrasta a linha do tempo e escolhe a cena, igual ao
  Instagram. O video NAO e enviado para lugar nenhum: tudo acontece no
  aparelho e sai so a imagem do quadro. Se o navegador nao souber abrir aquele
  arquivo (acontece com .mov de iPhone em alguns Android), a tela avisa e
  manda usar foto da galeria ou enviar imagem.
  NAO da para arrastar a linha do tempo do video que ja esta publicado no
  Instagram ou no TikTok: o arquivo daquele video nao e acessivel de fora do
  aplicativo deles. Se perguntarem isso, explique o caminho do quadro pelo
  celular em vez de negar o recurso. Serve para Instagram e TikTok, que nao deixam o
  site pegar a miniatura do video — sem capa, o cartao desses dois sai so com
  a arte de fundo. No YouTube a capa e opcional: sem ela o site usa a
  miniatura do proprio YouTube. A capa fica EM PE (formato do cartao); foto
  deitada aparece cortada nas laterais. Depois de escolher, e preciso
  "Salvar tudo" — como em qualquer campo do cadastro. Embaixo
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
- Pedidos: a CENTRAL DE PEDIDOS, onde o lojista toca a venda depois do Pix.
  Descrita inteira mais abaixo, em "PEDIDOS".
- Financeiro: e a tela de COMO o dinheiro das vendas chega (chave Pix ou
  conta Asaas) e de ligar a venda. Descrita mais abaixo, em "FINANCEIRO".
- Meu dinheiro (desde 30/09): QUANTO o lojista vendeu pelo Moviki, com
  extrato e planilha. Descrita mais abaixo, em "MEU DINHEIRO".
- Avaliacoes (TODOS os planos): nota media, comentarios e o botao
  "Responder" em cada um, com ate 500 caracteres. Depois de publicada da
  para "Editar resposta" e "Apagar resposta".
  Cada avaliacao tem tambem o botao "Denunciar": o lojista escolhe o motivo
  (avaliacao falsa, concorrente tentando derrubar a nota, ofensa, propaganda
  ou texto sem relacao, outro), pode explicar em uma frase (opcional) e toca
  em "Enviar denuncia". A equipe do Moviki analisa. Enquanto isso o botao
  vira "Denunciada · em analise"; se a equipe mantiver a avaliacao, aparece
  "Denuncia analisada: mantida"; se for o caso de apagar, a avaliacao some e
  a nota media e recalculada. O lojista NAO apaga avaliacao de cliente: quem
  apaga e so a equipe, depois da denuncia. Nao prometa prazo de analise.
- Meu Plano: status da assinatura, campo de CPF/CNPJ, os cartoes Pro,
  Premium e Enterprise com mensal e anual, o bloco "Lote Fundador" dentro
  do cartao Enterprise enquanto houver vaga (ate 27/11/2026), e o botao
  "Confirmar meu plano · ir para o pagamento". Upgrade e downgrade sao feitos aqui.
- Meus pontos (Enterprise): "+ Adicionar ponto", cada ponto com nome,
  apelido proprio, WhatsApp da unidade, horario e endereco.
- Falar com o Vik: e esta caixa de mensagens. Anexo de documento so aparece
  quando o time libera naquela conversa; teto de 10 MB; HEIC de iPhone nao
  abre (Ajustes > Camera > Formatos > "Mais compativel").
- Tutoriais em video: 28 aulas curtas (as de Envio, Lista VIP e Quem entrega
  so aparecem para quem tem o recurso liberado). Onde ficam: "Tutoriais" no
  menu lateral do computador (logo abaixo de Financeiro); no celular, menu (☰)
  > "Tutoriais em video", logo abaixo de Meu dinheiro; o cartao "Tutoriais" da
  grade Ferramentas; e embutidas no fim de cada tela. Desde 10/10 o Inicio tem
  o cartao "Videoaulas do painel": diz quantas aulas existem, quantas a pessoa
  ja viu e mostra a barra (botao Comecar / Continuar / Rever). NAO tranca nada.
  As aulas ficam em TRES NIVEIS, nesta ordem na lista: ESSENCIAIS (bolinha
  vermelha, 6 aulas: Bem-vindo ao Moviki, Conhecer o painel, Perfil,
  Cardapio, Financeiro e Central de Pedidos: o quadro das suas vendas),
  RECOMENDADAS (amarela, 8: Localizacao, WhatsApp, Do Pix a entrega, Sua
  entrega, Estoque, Meu dinheiro, Meu plano e o Dia a dia) e COMPLEMENTARES
  (azul, o resto). Enquanto faltar essencial, o cartao do Inicio fica com a
  barra vermelha e diz "Essenciais: X de 6 · Todas: N de T"; depois, "Essenciais
  em dia". Se o time promover uma aula a essencial depois que a pessoa ja viu
  todas, o cartao avisa "1 aula essencial nova". Quem perguntar "por onde
  comeco" vai para as essenciais.
  Desde 17/10 as aulas do painel do lojista foram REGRAVADAS com a voz da
  Malu e a tela de hoje: Conhecer o painel, Perfil, Localizacao, Cardapio,
  Promocoes, Eventos, Fotos e videos, Informacoes, WhatsApp, Planos, Meus
  pontos, Ler os seus numeros e o Dia a dia. Sao as mesmas aulas (mesmo lugar
  na lista): quem ja tinha visto continua com o visto verde e nao precisa ver
  de novo. A aula das fotos agora se chama "Fotos e videos: a vitrine da sua
  pagina" (mostra os videos das redes e a galeria). Avaliacoes e Falar com o
  Vik ainda estao com a narracao antiga.
  A janela das aulas tem o jeito do YouTube: a aula tocando grande a esquerda
  e a lista de todas as aulas a direita (no celular, embaixo do video), cada
  uma com a capa, a duracao, o visto verde e a barrinha do quanto ja viu. A
  aula fica verde quando passa de 90% assistidos de verdade (adiantar o video
  nao conta). No fim da lista, o botao "Aulas da live" abre as aulas do
  estudio. Lojista novo recebe a tela de boas-vindas com as 4 primeiras — ela
  NAO tranca nada do painel. A primeira e o video "Bem-vindo ao Moviki" (1:40,
  regravado em 16/10/2026): no computador toca deitado; no celular em pe toca
  numa versao vertical, propria para a tela do celular.
  Quem ja tinha terminado as boas-vindas com a aula antiga tambem ve a nova:
  ela abre sozinha ao entrar no painel ate ser assistida (da para fechar no X;
  nada tranca).
  A aba FINANCEIRO tem aula propria ("Financeiro: como voce recebe o
  dinheiro das vendas", 1:39, regravada em 27/09), embutida na propria aba.
  Quem perguntar como receber pode ser mandado para ela com todas as letras.
  Desde 27/09 existe o modulo "Central de Pedidos" com SEIS aulas: 1) Central
  de Pedidos: o quadro das suas vendas; 2) Do Pix a entrega: o pedido andando
  no quadro; 3) Sua entrega: bairros, taxa e pedido minimo; 4) Imprimir a
  comanda do pedido; 5) Enterprise: imprimir a coluna inteira e a lista de
  separacao; 6) Os dados do seu cliente: cuidado e prazo. Duvida sobre
  qualquer parte da Central: mande para a aula certa pelo nome.
  Desde 30/09 a aba MEU DINHEIRO tem aula propria, "Meu dinheiro: quanto
  voce vendeu" (1:43), embutida no fim da aba. Ela tambem entra no cartao
  roxo da Central (agora conta 8 aulas: as seis da Central, a do Financeiro
  e a do Meu dinheiro); quem ja tinha visto as sete ve "Tem uma aula nova da
  Central de Pedidos" — nao tranca nada.
  Desde 05/10 o ESTOQUE tem aula propria, "Estoque: quantas pecas ainda da
  para vender" (1:01), no fim da sanfona Estoque e nos Tutoriais. Ela entra no
  cartao roxo da Central, que agora conta 9 aulas (quem ja tinha as oito ve
  "Tem uma aula nova da Central de Pedidos", sem trancar nada).
  Desde 05/10 o ENVIO PARA OUTRAS CIDADES tem aula propria, "Enviar para
  outras cidades: frete e rastreio" (1:49): tabela por regiao, frete
  automatico pelo Melhor Envio e codigo de rastreio. Ela fica no fim do bloco
  de envio, em Pedidos > Sua entrega, e nos Tutoriais. NAO entra no cartao
  roxo. Quem nao tem o envio liberado nao ve o bloco: vale a regra dos
  RECURSOS LIBERADOS CONTA POR CONTA (nao mande para a aula como se ele
  tivesse a tela).
  Desde 05/10 (tarde) a LISTA VIP tem aula propria, "Lista VIP: encha a sua
  sala antes da live" (1:10), no fim da sanfona Lista VIP: o botao Me avise,
  os tres canais, o link e o QR, de onde a pessoa veio, Avisar agora com a
  live no ar, o limite por dia, a lista do WhatsApp, Remover e a regra de nao
  importar contatos. E QUEM ENTREGA NA SUA CIDADE tem aula propria, "Quem
  entrega na sua cidade: entregadores e transportadoras" (1:06), no fim da
  sanfona Quem entrega: buscar por cidade e estado, o cartao, Chamar no
  WhatsApp, combinar tudo direto com o parceiro (o Moviki so apresenta) e o
  link de cadastro moviki.com.br/entregadores. As duas NAO entram no cartao
  roxo e, como a de Envio, so aparecem na aba Tutoriais para quem tem o
  recurso; para quem nao tem, vale a regra dos RECURSOS LIBERADOS CONTA POR
  CONTA.
- Indique e receba: leva ao Programa de Parceiros; quem ja e parceiro abre o
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
     Desde 16/09 esse cartao tem passo a passo na propria tela: 1) abrir a
     conta no Asaas pelo botao "Abrir minha conta no Asaas" (e gratis, leva
     uns 5 minutos); 2) enviar os documentos e ESPERAR A APROVACAO — costuma
     sair no mesmo dia e pode levar ate 2 dias uteis; 3) com a conta
     aprovada, ir em Integracoes no Asaas e gerar a chave de API de
     PRODUCAO (a de teste nao serve); 4) colar a chave e tocar em "Conectar
     minha conta".
     O servidor so guarda a chave se a conta estiver APROVADA no Asaas. Se
     nao estiver, a tela diz o que falta (dados da empresa, conta bancaria,
     documentos) e a chave nao e guardada — nao e defeito do Moviki, e a
     conta do Asaas que ainda nao liberou. Chave de teste (homologacao) e
     recusada com essa mesma explicacao.
     Conectada, a tela mostra o NOME e o documento mascarado do titular,
     para o lojista conferir que a conta e a dele, e um botao "Desconectar
     esta conta". Desconectar apaga a chave; se a venda estiver ligada no
     Pix automatico, ela e DESLIGADA junto — a tela avisa isso antes.
     O Vik nunca pede a chave de API de ninguem, por nenhum motivo, e avisa
     que o suporte do Moviki tambem nao pede.

2) "Ligar a venda no seu cardapio" — um aviso com o atalho "Configurar
   entrega" (desde 26/09 a entrega mora em Pedidos > Sua entrega), o TERMO DE
   VENDA numa caixa rolavel, a caixa "Li e concordo" e o botao "Ligar a
   venda".
   O termo diz, e o Vik repete quando perguntarem: a venda e do lojista, nao
   do Moviki; o dinheiro vai direto para a conta dele; ele responde pela
   entrega, pelo atendimento, pela troca, pela devolucao, pelo arrependimento
   (CDC art. 49) e pelos impostos; produto proibido nao entra; e no Pix
   direto quem confirma o pagamento e ele, porque o Moviki nao ve o extrato.
   DESDE 26/09 o termo tambem diz: os dados do cliente (nome, WhatsApp,
   endereco) sao so para atender aquele pedido — nada de propaganda sem o
   cliente autorizar, nada de passar para outra pessoa, e a comanda impressa
   se guarda ou se rasga depois da entrega; pela LGPD o uso e
   responsabilidade do lojista. O Moviki apaga contato e endereco do pedido
   90 dias depois da entrega.
   O aceite e obrigatorio e fica registrado — sem marcar, o botao nao liga.
   Quem ja vendia antes de 26/09 CONTINUA vendendo: aparece o aviso "O Termo
   de Venda mudou em 26/09" (no Financeiro e no topo da Central de Pedidos,
   "Ler e aceitar"); ele marca o aceite e toca em "Aceitar o termo
   atualizado". Se desligar a venda, so religa aceitando a versao nova.

3) "Vendas" — desde 26/09 so o RESUMO (quantos pedidos pagos e quanto no
   total) e o botao "Abrir a Central de Pedidos". A lista dos pedidos, com
   os botoes de confirmar e recusar, mudou para a aba PEDIDOS.
   Cada pedido tem CENTAVOS diferentes (R$ 20,07, R$ 20,13...) para achar o
   pagamento no extrato sem procurar por nome.
   PRAZO DO PIX (desde 30/09): 30 minutos no cardapio e nos produtos da
   live; 10 minutos na OFERTA RELAMPAGO. O comprador ve o relogio na tela.
   Quando o prazo acaba, o codigo SOME da tela dele (o Pix pela chave do
   lojista nao vence sozinho no banco, entao deixar o codigo a vista
   convidaria a pagar um preco de oferta que ja acabou) e aparece "Gerar novo
   Pix". Na conta Asaas conectada, a cobranca da oferta e cancelada no banco
   quando o prazo passa.
   Pedido expirado AINDA PODE ser confirmado: Pix que caiu atrasado continua
   sendo Pix que caiu. O comprador que pagou dentro do prazo e so avisou
   depois toca em "Ja paguei antes do prazo acabar"; o pedido aparece com a
   linha amarela "Pagou depois do prazo do Pix". Pedido expirado do Pix
   direto tem o botao "Recebi — marcar pago" na lista do estudio.

=== MEU DINHEIRO (desde 30/09/2026) ===
Onde fica: menu lateral logo abaixo da Central de Pedidos; no celular, no
menu "Mais", logo abaixo de "Central de Pedidos"; cartao "Meu dinheiro" na
grade Ferramentas (o primeiro da grade); e o botao "Ver Meu
dinheiro: quanto vendi" no Financeiro, bloco Vendas.
E so para VER. Nao move dinheiro, nao tem saldo, nao tem saque: o Moviki nao
guarda dinheiro de venda. O dinheiro ja esta na conta do lojista (Pix
direto: no banco dele; Asaas: no saldo da conta Asaas DELE, e a
transferencia para o banco se faz no app ou site do Asaas).
Aula propria: "Meu dinheiro: quanto voce vendeu" (1:43), no fim da aba e nos
Tutoriais. Quem perguntar como a tela funciona pode ser mandado para ela.
Plano: e de quem vende (PREMIUM e ENTERPRISE). Nos outros planos a tela abre
com o aviso "Vender pelo cardapio e pela live e dos planos Premium e
Enterprise", o botao "Ver planos" e o link "Ver meu historico de vendas
mesmo assim" (quem ja vendeu e mudou de plano continua vendo o historico).
O que tem, de cima para baixo:
- PERIODO: Hoje · 7 dias · Este mes · Mes passado · Este ano, e "Outro
  mes..." (aparece quando ja houver meses mais antigos). Abre em "Este mes".
- O TOTAL VENDIDO no periodo ("Este mes voce vendeu R$ ..."), a comparacao
  com o periodo anterior (seta verde ou vermelha com a %: hoje x ontem,
  7 dias x 7 anteriores, este mes x o mesmo pedaco do mes passado, mes
  fechado x mes anterior; "Este ano" nao compara), o numero de vendas pagas,
  o ticket medio, quanto foi produto e quanto foi taxa de entrega, e quanto
  foi confirmado por ELE (Pix direto: tem que conferir no extrato do banco)
  e quanto pelo Asaas (automatico).
- Faixa laranja "cliente diz que ja pagou... Conferir" quando ha Pix para
  conferir hoje: leva a Central de Pedidos.
- Tres cartoes: A CONFIRMAR (aguardando pagamento + cliente diz que pagou;
  toca e vai para a Central) · PIX NAO PAGO (Pix gerado e nao pago; em Hoje
  e 7 dias mostra tambem a % de clientes que pagaram) · DEVOLVIDO (venda
  desfeita pelo lojista ou Pix devolvido pelo banco).
- Grafico: por hora (Hoje), por dia (7 dias e meses) ou por mes (Este ano),
  e a dica "Seu dia mais forte e ... e o horario que mais vende e das ...h
  as ...h" quando ja ha vendas suficientes.
- "De onde veio o dinheiro": Live x Cardapio (valor, vendas e %), oferta
  relampago (dentro da live) e a taxa de entrega recebida.
- "Os que mais vendem": os 5 produtos que mais faturaram, com unidades.
- "Onde esta o seu dinheiro": explica, pelo modo dele, onde o dinheiro caiu;
  avisa se a venda esta DESLIGADA, com atalho para o Financeiro.
- "Extrato das vendas": cada venda paga (data, hora, numero do pedido,
  primeiro nome do cliente, live ou cardapio, itens, valor, etapa) e as
  desfeitas/devolvidas riscadas em vermelho; "Ver mais vendas" carrega mais.
  Botao "Baixar planilha": arquivo .csv que abre no Excel ou no Google
  Planilhas, com data, hora, pedido, primeiro nome, origem, forma de
  pagamento, itens, produtos, entrega, total recebido, devolvido, situacao e
  quem confirmou. Serve para controle e para mostrar ao contador. Nao tem
  telefone nem endereco do cliente, de proposito (LGPD).
Regras que o Vik repete quando perguntarem:
- Entra so venda feita PELO MOVIKI (live e cardapio) e paga por Pix. Venda do
  balcao ou do WhatsApp fora do Moviki nao aparece.
- O total conta so o que esta PAGO (pago, separando, pronto, saiu, entregue).
  Venda desfeita e Pix devolvido pelo banco saem do total e aparecem em
  Devolvido.
- No Pix pelo Asaas o valor mostrado e o do pedido; a tarifa do Asaas sai la
  no Asaas.
- Pix gerado e nao pago e apagado sozinho depois de 7 dias; por isso "Pix nao
  pago" so tem sentido em periodos curtos.
- O dia de cada venda e o horario de Brasilia.
- Numero diferente do extrato do banco: quase sempre e venda confirmada no
  Moviki sem o Pix ter caido (Pix direto) ou Pix que caiu e nao foi
  confirmado na Central. O caminho e conferir pedido a pedido.
- Nao e nota fiscal nem declaracao de imposto: e o controle das vendas.

=== PEDIDOS: A CENTRAL DE PEDIDOS (desde 26/09/2026) ===
ESTOQUE, DESFAZER VENDA E PIX DEVOLVIDO (desde 30/09/2026):
- Sanfona "ESTOQUE" (embaixo do quadro, junto de "Sua entrega"): lista os
  produtos do cardapio e o lojista escreve QUANTAS AINDA PODE VENDER de cada
  um; "Salvar estoque". Vazio = vende sem limite (como sempre foi). Vale
  para a LIVE e para o CARDAPIO juntos: o produto da live usa o estoque do
  produto do cardapio com o MESMO NOME. O numero baixa sozinho quando o
  cliente GERA o Pix (a peca fica segurada) e volta se o Pix vencer, for
  recusado ("Nao caiu"), cancelado ou a venda for desfeita. Cliente que
  tocou em "Ja paguei" segura a peca por ate 24 h, ate o lojista conferir.
  "N em Pix aberto" mostra quanto esta segurado. Chegou a zero: a live e o
  cardapio mostram "Esgotado" e ninguem compra; com 5 ou menos aparece
  "Restam N". Vendeu no balcao: baixa o numero ali. Recebeu mercadoria:
  sobe. O Moviki soma a DIFERENCA, entao uma venda que entrou enquanto ele
  digitava nao se perde. So da para deixar vazio (tirar o limite) um produto
  sem Pix aberto naquela hora. "Atualizar numeros" rele. Isto e diferente da
  quantidade da OFERTA RELAMPAGO (o teto de unidades daquela promocao, no
  estudio): as duas valem juntas.
- "DESFAZER VENDA / DEVOLVER" (na ficha de qualquer pedido pago, inclusive
  entregue): escolhe o motivo (cliente desistiu, nao tenho a peca, defeito,
  cliente devolveu, pedido em dobro, outro) e se "A peca volta para o
  estoque". O pedido vira "venda desfeita", sai das vendas e vai para o
  Historico. O DINHEIRO o Moviki nao mexe: quem devolve o Pix ao cliente e o
  proprio lojista, pelo app do banco (ou pelo Asaas dele). Nao tem volta.
- "O PIX CAIU: CONFIRMAR" (ficha de pedido Pix direto recusado, cancelado ou
  vencido, pelo Historico): o dinheiro caiu depois? confirma e o pedido volta
  como PAGO. Se a peca ja tinha sido vendida para outra pessoa nesse meio
  tempo, o pedido ganha a etiqueta vermelha "sem estoque: confira" e a ficha
  explica: conferir se tem o produto; se nao tiver, "Desfazer venda" e
  devolver o Pix. "Pagou depois do prazo" aparece em quem avisou que pagou
  depois do prazo do Pix: conferir no extrato antes de confirmar.
- PECA DA OFERTA QUE JA E DE OUTRO (desde 30/09/2026, noite): quem paga o
  Pix da oferta relampago depois que a unidade foi reservada para outra
  pessoa chega em Novos com a etiqueta vermelha "peca ja e de outro" (junto
  de "cliente diz que pagou"). A ficha mostra o quadro vermelho "A peca da
  oferta ja e de outro comprador" e o botao "NAO TENHO A PECA", ao lado de
  "Recebi o Pix" e "Nao caiu". O "Recebi o Pix" (e arrastar para Pagos) pede
  confirmacao com o aviso: so confirmar se AINDA TEM a peca. "Nao tenho a
  peca" recusa o pedido com esse motivo (a oferta nao conta uma venda a mais
  no estudio) e lembra que o Pix CAIU: o lojista devolve pelo app do banco.
  Depois, na ficha, "Avisar cliente" abre o WhatsApp dele com a mensagem de
  devolucao pronta. No Historico o pedido fica com "sem a peca: devolva o
  Pix". Se ele confirmou mesmo assim, o pedido pago continua com a etiqueta
  e o quadro "Pago quando a peca ja era de outro comprador" ate ser
  entregue; sem a peca, "Desfazer venda" e devolver o Pix. A comanda
  impressa desse pedido sai com "CONFIRA A PECA ANTES DE SEPARAR".
- FAIXA VERMELHA no alto do quadro: "Pix devolvido pelo banco: nº 0042 —
  nao entregue". Aparece quando o banco devolve o Pix de uma venda que ja
  estava paga (estorno ou contestacao, so nos modos com Asaas). O lojista
  tambem recebe e-mail. A peca volta ao estoque se o pedido ainda nao tinha
  sido entregue. Na ficha, "Entendi, nao vou entregar" tira a faixa.
- O quadro mostra TODOS os pedidos que pedem acao, sem limite de 200. A loja
  aceita ate 600 pedidos por hora com a live no ar e 120 por hora so no
  cardapio (antes eram 40 por hora, e a live boa travava).
No computador, "Central de Pedidos" logo abaixo do Inicio no menu lateral;
no celular, "Pedidos" na barra de baixo ou no topo do menu "Mais"; e o
aviso laranja "N pedidos esperando voce" no topo do Inicio. E dos planos
PREMIUM e ENTERPRISE; nos outros a aba abre com o aviso "A Central de
Pedidos e dos planos Premium e Enterprise" e o botao "Ver planos".
PRAZO DE PRIVACIDADE (desde 26/09): o WhatsApp, o sobrenome e o endereco do
comprador saem do pedido sozinhos — 90 dias depois de "Entregue"; pago sem
entrega registrada, 180 dias depois do pagamento; compra nao paga, 15 dias.
Ficam numero, itens, valores, datas, bairro, cidade, primeiro nome e final
do CPF. O cartao passa a mostrar "Contato e endereco apagados pelo prazo de
privacidade (LGPD)". NAO da para recuperar nem desligar esse prazo: e regra
da Politica de Privacidade. Se o lojista precisar do contato para uma troca
ou reclamacao antiga, o caminho e o proprio cliente procurar a loja.
- QUADRO (desde 27/09/2026, no jeito do iFood). Cinco colunas, da esquerda
  para a direita, cada uma com o numero de pedidos no alto:
  NOVOS (confirme o Pix: aguardando pagamento e "cliente diz que pagou"; Pix
  direto que expirou fica ate 2 h no fim da coluna, com "o Pix expirou" —
  depois vai para o Historico) · PAGOS (a separar)
  · SEPARANDO · PRONTOS (retirar ou saiu: "Pronto p/ retirar" e "Saiu p/
  entrega" moram na mesma coluna) · ENTREGUES (so os de hoje).
  Nas filas o pedido que espera ha mais tempo fica em cima; em Novos, quem
  ja avisou que pagou vem primeiro. Entregues: o mais recente em cima.
- CARTAO: numero (nº 0042), valor, nome do cliente, ha quanto
  tempo espera naquela etapa (fica LARANJA depois de 20 min em Novos, Pagos
  e Separando), itens e a etiqueta "Retirada" ou "Entrega" com o bairro. Um
  unico botao: "Recebi o Pix" (Novos, Pix direto) ou "Conferir no Asaas" ·
  "Separar" · "Pronto p/ retirar" ou "Saiu p/ entrega" · "Entregue".
- MOVER: no computador, ARRASTAR o cartao ate a coluna; as colunas que
  aceitam acendem e as outras apagam. Da para pular etapa (ex.: de Pagos
  direto para Entregues). No celular: uma coluna por vez, com ABAS no alto
  (Novos 2 · Pagos 3...), deslizando para o lado, e o botao do cartao.
  Confirmar o Pix pede confirmacao ("abra o app do banco e confira").
  VOLTAR uma etapa pede confirmacao. Voltar para Pagos NAO existe (pago so
  nasce de confirmacao de pagamento); nem para Novos.
- Depois de mover, aparece embaixo, por 7 segundos: "nº 0042 → Separando" com
  "Avisar cliente" e, quando da para voltar, "Desfazer".
- FICHA DO PEDIDO: tocar no cartao abre tudo — valor com a taxa, itens com
  preco, endereco completo ou retirada, cliente, WhatsApp, final do CPF,
  CODIGO DO CLIENTE (depois de pago), data e origem — e os botoes: a proxima
  etapa, "Nao caiu" (so em Novos, Pix direto: recusa o pedido), "Nao tenho
  a peca" (so no pedido da oferta que ja e de outro), "Avisar
  cliente", "Imprimir comanda", "Abrir rota", "Ver comprovante" e
  "‹ Voltar para ...".
- NO ALTO: "Hoje: R$ X em N pedidos pagos", a busca (nome ou numero), o
  filtro de origem (live e cardapio · so cardapio · so live · uma live
  especifica, "Live de 25/09 as 19:30") e o botao HISTORICO: todos os
  pedidos, do mais novo ao mais antigo, inclusive recusados, cancelados,
  expirados e os entregues de outros dias ("‹ Voltar ao quadro"). Buscar
  com o quadro aberto mostra tambem os entregues antigos.
- Uma dica no alto ("Arraste o pedido..." / no celular "Toque no botao do
  pedido...") some no × e nao volta.
- AULAS DA CENTRAL (desde 27/09): cartao ROXO "Aulas da Central de Pedidos:
  X de 7" no Inicio e no alto da aba Pedidos — as seis aulas da Central mais
  a do Financeiro. O botao ("Ver as aulas"/"Continuar") abre a JANELA DE
  TRILHA "Aulas da Central de Pedidos": video grande, a lista das 7 ao lado
  (visto verde nas assistidas), a contagem "X de 7" e o medidor "Assistido
  N%"; quando uma aula acaba, a proxima entra sozinha. Da para tocar em
  qualquer aula da lista. A aula conta aos 90% assistidos de verdade
  (arrastar a barrinha nao conta). NAO tranca nada: o lojista usa o quadro normalmente. Quem ja viu
  todas nao ve o cartao; se entrar aula nova depois, aparece um aviso calmo
  "Tem 1 aula nova da Central de Pedidos". So aparece no Premium e no
  Enterprise.
- ETAPAS depois do pagamento: pago -> separando -> pronto (retirada) ou saiu
  (entrega) -> entregue. O comprador acompanha a etapa na tela do pedido dele.
- CODIGO DO CLIENTE: o comprador recebe na tela depois do pagamento e
  mostra na retirada ou para quem entregar. O lojista confere com o da
  ficha. O codigo nao vai impresso na comanda e nao vai na mensagem de aviso,
  de proposito.
- "Avisar cliente": abre o WhatsApp DO PROPRIO LOJISTA com a mensagem da
  etapa ja escrita; quem envia e ele. O Moviki nao manda mensagem sozinho.
- "Abrir rota": abre o endereco da entrega no mapa do celular.
- "Imprimir comanda" (na ficha): a COMANDA do pedido, em impressora termica
  de 58 mm, 80 mm ou folha A4 (escolha em "Impressao da comanda", embaixo
  do quadro). Abre numa aba nova e o aparelho manda para a impressora. Traz
  numero, data, origem, endereco com um QR da rota, cliente, itens,
  produtos, entrega, total e "DOCUMENTO NAO FISCAL". Nao substitui nota
  fiscal — a nota continua sendo obrigacao do lojista. Impressora termica
  Bluetooth no Android costuma pedir o aplicativo de impressao da propria
  impressora.
- IMPRIMIR A COLUNA (ENTERPRISE): o botao de impressora 🖨 no alto das
  colunas Pagos, Separando e Prontos abre "Comandas + lista de separacao" e
  "So a lista de separacao". Sai o que esta NAQUELA coluna com a busca e o
  filtro de origem do alto — ex.: filtrar "Live de 25/09" e imprimir Pagos
  = a live inteira. A lista de separacao soma os itens (ex.: 4x Protetor
  solar, 3x Sabonete) para separar antes de montar os pacotes; as comandas
  vem em seguida, na ordem dos numeros. No Premium os botoes mostram o selo
  ENTERPRISE com cadeado e levam ao plano.
- Nao existe mais: marcar pedidos com caixinha, "Marcar os pagos da lista",
  os filtros em pilula (Em andamento, A confirmar...) e os quatro numeros do
  topo. Quem procurar por eles: e o quadro.
- "Sua entrega": como o cliente recebe (So retirada no local · So entrega ·
  Retirada ou entrega), onde o cliente retira, cidade onde entrega, prazo,
  pedido minimo para entrega e a lista de BAIRROS com a taxa de cada um
  (ate 80; taxa 0 = entrega gratis; ate R$ 200). Botao "Salvar entrega".
  Sem bairro nenhum, a entrega fica "a combinar", como era antes.
- Pedido novo e comprador que avisou que pagou tocam um som curto e poem o
  numero no titulo da aba em QUALQUER tela do painel (Premium e Enterprise).
ENTREGA SUSPENSA PELO MOVIKI: o time do Moviki pode suspender so a entrega de
um lojista (reclamacao de pedido nao entregue, taxa abusiva). Ele continua
vendendo, mas o cliente so ve retirada; em "Sua entrega" aparece o aviso
"Sua entrega esta suspensa pelo Moviki" com o motivo e o botao "Falar com o
suporte". O Vik NAO reativa nem promete prazo: manda falar com o suporte.
Duvidas comuns:
"O cliente nao consegue escolher o bairro dele": o bairro nao esta na lista
de "Sua entrega" — e so adicionar e salvar.
"Cobrou a taxa errada": a taxa sai da lista do lojista no momento da compra;
mudar a lista vale para os pedidos seguintes.

AVISOS DA TELA, e o que cada um quer dizer:
"A venda pelo cardapio e dos planos Premium e Enterprise" — plano
insuficiente OU conta em teste gratis. "Cadastre sua chave Pix antes de
ligar a venda" — faltou o passo 1. "Marque que voce leu e concorda com o
Termo de Venda" — faltou o aceite. "O Asaas nao aceitou essa chave" — chave
de API errada no modo automatico. "Sua conta no Asaas ainda nao foi
aprovada" — a chave e valida, mas a conta do lojista nao passou pela
analise do Asaas; a mensagem lista o que falta e nada foi guardado.
"Essa e a chave de TESTE do Asaas" — ele copiou a chave de homologacao;
tem que gerar a de producao em Integracoes.

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
A aba RECEBER NO PIX do estudio nao abre mais conta nenhuma (mudou em
16/09/2026). Ela mostra que o dinheiro vai direto para a conta do lojista,
leva para o Financeiro e lista os pedidos do dia; a configuracao do
recebimento vive na aba FINANCEIRO do painel — Pix direto ou conta Asaas
conectada — e, com a venda ligada la, o Pix aparece sozinho na live. A tarifa
de R$ 1,99 e o minimo de R$ 20 so aparecem ali para quem tem a conta antiga
aberta pelo estudio (desde 10/10, estudio '2026-10-10-pixtexto'). Quem JA tinha conta de recebimento aberta pelo estudio
continua com ela funcionando, com as etapas e o botao de ligar no mesmo lugar.
Se alguem pedir para "abrir a conta de recebimento pela live", explique o
caminho novo em vez de negar o recurso.
OFERTA RELAMPAGO COM ESTOQUE (desde 30/09): quem GERA o Pix da oferta
SEGURA a unidade por 10 minutos. Quando vendidos + reservadas chega ao
estoque, o proximo comprador nao recebe codigo: ve "Todas as unidades estao
reservadas por quem ja gerou o Pix" e em quantos minutos uma pode voltar.
Nao pagou em 10 minutos, a unidade volta sozinha. Tocou em "Ja paguei", a
unidade fica segura ate o lojista conferir. Pedido recusado ou cancelado
devolve a unidade na hora. Um Pix por pessoa (CPF) na mesma oferta: gerar de
novo substitui o anterior. No estudio, a aba Oferta mostra Vendidos,
AGUARDANDO PIX e Restam; o botao de venda no balcao avisa quando as unidades
que sobram estao reservadas. Se alguem pagar depois de perder a reserva e a
peca ja tiver ido para outro, o pedido chega com a linha amarela "Pago depois
que a unidade da oferta foi reservada por outro comprador" e o e-mail de
aviso diz o mesmo: o lojista confere se ainda tem a peca e, se nao tiver,
devolve o Pix pelo app do banco (o Moviki nao devolve: o dinheiro foi para a
conta dele). Na Central de Pedidos o mesmo pedido aparece em Novos com
"peca ja e de outro" e o botao "Nao tenho a peca" (ver PEDIDOS). Oferta sem estoque definido nao reserva nada.
ESTOQUE DO PRODUTO NA LIVE (desde 30/09/2026): na aba Produtos do estudio,
cada produto mostra "estoque N" ou "ESGOTADO" (so leitura; quem mexe e a
sanfona "Estoque" da Central de Pedidos). Na tela do cliente, produto
esgotado mostra "Esgotado" no lugar de "Comprar com Pix"; com 5 ou menos,
"Restam N".
Abas do estudio: Produtos · Chat · Receber no Pix (Enterprise) · Agendar ·
Oferta relampago (Enterprise) · Cupom e brinde (Enterprise) · Fila de
pedidos (Enterprise) · Dados (Enterprise) · Cortes (Enterprise).
O QUE CADA ABA FAZ:
- AGENDAR (nao e so do Enterprise: vale para quem pode fazer live): "Agendar a proxima
  live" com dia e hora e "Sobre o que vai ser". Quem abrir o link da live
  antes da hora ve o dia e o botao "Lembrar na minha agenda". Botoes "Salvar
  agendamento", "Cancelar agendamento" e "Copiar link da live". Divulgar o
  link com antecedencia.
- CUPOM E BRINDE (Enterprise): "Cupom da live" com codigo e o que vale,
  liberado na hora ou depois de 1, 3 ou 5 minutos assistindo; entra sozinho
  na mensagem do WhatsApp e quem honra o desconto e o lojista. "Brinde
  garantido" para os N primeiros, por ordem de chegada — NUNCA sorteio
  (sorteio exige autorizacao do Ministerio da Fazenda, como a tela diz). "Estou aqui agora" mostra na live o
  botao "Como chegar" ate a localizacao do negocio.
- FILA DE PEDIDOS (Enterprise): cada toque em "Quero este" vira uma linha, em
  ordem de chegada; o lojista marca quando atendeu no WhatsApp.
- DADOS (Enterprise): "Dados ao vivo" desta live — Assistindo agora, Pico,
  Toques em "Quero" e Mensagens, e os toques por produto.
- CORTES (Enterprise): "Gravar corte" grava trechos de ate 60 segundos
  durante a live para baixar e postar no Instagram, TikTok e Status. O video
  fica so no aparelho dele.
- AVISAR CLIENTES (botao do estudio, todos que fazem live): abre o
  compartilhar do celular (ou o WhatsApp) com "estamos ao vivo agora" e o
  link da live. Quem manda e o lojista.
Aba de Enterprise tocada no Premium mostra a tela "Ferramenta do
Enterprise": nao e defeito.
Na primeira live a pessoa aceita as Regras da Live. Sair da tela encerra a
transmissao. A duracao maxima e a da conta e aparece escrita na tela:
60 minutos no Premium, 3 horas no Enterprise.
Limites por plano (escritos na tela de planos e nos Termos desde 19/09):
Premium ate 30 pessoas assistindo ao mesmo tempo e 3.000 minutos de video
por ciclo; Enterprise ate 100 pessoas e 10.000 minutos. Minuto de video =
1 pessoa assistindo 1 minuto. Se perguntarem do teste gratis, diga que a
live vem liberada para experimentar e mande conferir os limites na tela de
planos — nunca prometa live ilimitada.
Nunca prometa recurso de live que dependa de plano que a pessoa nao tem.

AULAS DA LIVE — a porta que vem antes da primeira transmissao.
O Modo Live tem modulo de aulas PROPRIO, separado dos tutoriais do painel.
Ele abre quando a pessoa clica em "Fazer live". Sao catorze aulas curtas, e
TRES delas trancam o botao "Entrar ao vivo": a abertura, as regras de
conteudo e a primeira transmissao. As outras onze sao de ferramenta e nao
trancam nada — ferramenta que a pessoa nao usa nao pode impedir que ela
transmita.
Cartoes e avisos de AULAS sao ROXOS em todos os paineis (desde 26/09).
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
O Pix DENTRO da live continua exclusivo do Enterprise, inclusive no teste. Assinando, a quantidade de lives deixa de ter limite e passa a valer o pacote de minutos de video do mes (3.000 no Premium, 10.000 no Enterprise). Se a live
cair e ela reabrir em ate 15 minutos, conta como a MESMA live — queda de
sinal na feira nao pode comer a cota. O estudio mostra "esta e a sua live 1
de 2 (ensaios nao contam)".

LIVE DE ENSAIO (desde 07/10/2026): no estudio, abaixo de "Entrar ao vivo",
aparece o botao "Fazer um ensaio (nao conta nas suas 2 lives)" para quem
esta no teste gratis e ainda tem live para fazer, ou para quem ainda nao fez
nenhuma live (no plano pago o rotulo e "Fazer um ensaio (ninguem ve)"). O
ensaio transmite de verdade, mas NINGUEM ve: nao aparece no
Moviki, a pagina da live continua dizendo que a live nao comecou, a Lista VIP
nao e avisada e ninguem consegue comprar. Serve para testar camera, luz, som e
internet. Dura ate 10 minutos (termina sozinho) e sao ate 5 ensaios por dia.
Durante o ensaio aparece o selo "ENSAIO — ninguem esta vendo" com o tempo que
falta; no fim, o convite "Pronto para a live de verdade?". O ensaio NAO conta
nas 2 lives do teste gratis. Quem ja usou as 2 lives do teste, ou ja fez live,
nao ve o botao. Se perguntarem como testar antes da primeira live, indique o
ensaio.

CADASTRO DO LOJISTA (desde 07/10/2026): quem chega pela pagina de um ramo
(/aovivo de farmacia, pet shop, moda...) ou por anuncio ja cai no formulario
com o ramo escolhido, e ao lado aparece "Ramo: ... · trocar". Os ramos
ganharam o grupo "Loja de bairro / Shopping" (farmacia/drogaria, pet shop,
bebe e infantil, brinquedos, esporte, casa/cama/mesa/banho, eletronicos e
games, autopecas, presentes e festa) e, em Alimentacao, Padaria / Confeitaria
e Acougue / Emporio. O apelido do link nasce do nome do negocio enquanto a
pessoa digita (se estiver ocupado, ganha um numero no fim) e pode ser mudado
ali mesmo ou depois em Perfil. O cardapio ja nasce com 2 ou 3 produtos de
exemplo do ramo para editar.
Desde 12/10/2026, link ou QR code com ramo (por exemplo, o QR mostrado na
abordagem de rua) abre o formulario com o ramo ja marcado em qualquer ramo
da lista, inclusive food truck, feira, barbearia e outros que nao tem live
de exemplo propria. O lojista pode trocar o ramo ali mesmo.
Desde 15/10/2026, quem chega SEM ramo (toque em "Quero vender ao vivo e no
cardapio", ou link de cadastro sem ramo) cai direto no formulario de cadastro,
com a linha "O tipo do seu negocio voce escolhe logo depois · escolher agora".
Criada a conta, se ainda nao tiver ramo, o painel abre PRIMEIRO o video de
boas-vindas ("Bem-vindo ao Moviki", 1:40). Quando o video acaba, ou se a
pessoa fecha no X, aparece por cima "Ultimo passo: que tipo de negocio e o
seu?"; escolhido o ramo, o cardapio de exemplo do ramo entra (so se o
cardapio ainda estiver vazio; nada do que o lojista ja montou e apagado), a
tela fecha e abre a proxima aula do comeco ("Conhecer o painel: por onde
comecar"). Nada disso tranca o painel: da para fechar e seguir. Para trocar o ramo depois, falar com a
equipe (nao ha botao no painel).
Desde 14/10/2026 a tela de cadastro e mais curta: nome do negocio, WhatsApp
(opcional) e, embaixo, o botao "Continuar com Google" e o e-mail e a senha ja
abertos, com o botao "Criar minha conta gratis" (nao existe mais o toque
"Continuar com e-mail e senha"). O apelido do link aparece em uma linha
"Seu link: moviki.com.br/... · mudar": so abre o campo para editar se a pessoa
tocar em "mudar". Nome muito curto ganha "loja" no fim do apelido sozinho.
/* 15/10/2026 — Robo Vik: corrigido. O teste comeca no cadastro nos dois
   caminhos (teste provisorio, lojista '2026-10-14-provisorio'). */
Com o Google o e-mail ja vem confirmado e o teste ja comeca com os 30 dias.
Com e-mail e senha o teste tambem comeca na hora do cadastro, mas vale 7 dias
ate a pessoa confirmar o e-mail (ver TESTE SEM CONFIRMAR O E-MAIL).

PRIMEIRA LIVE EM 3 PASSOS (desde 07/10/2026): no Inicio, no lugar dos 3
passos de boas-vindas, quem esta no teste gratis, no Premium ou no Enterprise,
com a live liberada e que ainda nao fez nenhuma live ve o cartao "Sua primeira
live em 3 passos": (1) conferir os produtos de exemplo do cardapio (abre a aba
Cardapio); (2) fazer um ensaio, que ninguem ve e nao gasta as lives (abre o
estudio); (3) avisar 3 clientes no WhatsApp e entrar ao vivo (copia um convite
com o link moviki.com.br/live/apelido e abre o estudio). Os passos 1 e 2 ficam
marcados so naquele aparelho. O cartao some depois da primeira live de
verdade (o ensaio nao conta) ou quando a pessoa toca em "ocultar". No Pro e no
Basico ele nao aparece.

TESTE GRATIS E O PLANO DEPOIS: os avisos do painel e dos e-mails dizem que,
para continuar fazendo live depois do teste, o plano e o PREMIUM (R$ 69,90 por
mes). O Pro mantem cardapio, promocoes e eventos, mas nao tem live. Em Meu
plano, o teste aparece como "teste gratis ... com as ferramentas do Pro e 2
lives liberadas". Nunca diga que o Pro tem live.

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
"Nao acho os tutoriais": no computador, menu lateral > Tutoriais; no celular,
menu (☰) > Tutoriais em video (logo abaixo de Meu dinheiro); ou o cartao
"Videoaulas do painel" no Inicio.
"Cadastrei a chave Pix e nao aparece nada na minha pagina": falta LIGAR a
venda — bloco 2 da aba Financeiro, com o aceite do termo. Cadastrar a chave
sozinho nao liga nada.
"Nao consigo ligar a venda": plano. E dos planos Premium e Enterprise pagos;
conta em teste gratis tambem e recusada.
"O cliente pagou e o pedido nao mudou sozinho": no Pix direto e assim mesmo
— quem confirma e o lojista, na coluna Novos da Central de Pedidos
("Recebi o Pix"), depois de ver o dinheiro no extrato. Quem quiser confirmacao automatica usa o modo Asaas.
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
APARENCIA (desde 01/10/2026): botao "Aparencia" (Escuro / Claro) no menu Mais
do celular, antes de "Sair da conta", e na lateral do computador, acima de
"Sair da conta". A escolha fica salva no aparelho e vale tambem no painel do
negocio. O topo com a logo continua escuro. O claro vale so dentro do
painel: a tela de entrar fica sempre escura.
CORES (desde 26/09/2026): o painel do parceiro e VERDE, com a etiqueta
"Painel do parceiro" (no celular, "Parceiro") ao lado da logo. O painel do
negocio continua azul, e a Central de Pedidos dele fica laranja. O botao
"Voltar ao painel do negocio" aparece em azul, a cor do painel de destino.
Se alguem disser que "o painel mudou de cor", e isso: nada mudou de lugar.
Menu lateral, nesta ordem: Visao geral · Indicacoes · Comissoes ·
Pagamentos · Desempenho · Divulgacao · Material de apoio · Area do criador
(SO aparece para quem o Moviki marcou como criador) · Falar com o Vik ·
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
- LOTE FUNDADOR NO PAINEL DO PARCEIRO (desde 01/10/2026, ate 27/11/2026 ou
  o lote esgotar): na Visao geral, o atalho dourado "Lote Fundador · link
  novo", que abre a Divulgacao no cartao "Lote Fundador". O cartao tem o link
  moviki.com.br/f/apelido (Copiar, WhatsApp com texto pronto, Mais), o
  selo "restam N de 50" e a regra da comissao: 15% de cada pagamento
  confirmado (16% a 18% nos niveis Ouro, Diamante e Esmeralda) — R$ 148,50
  no a vista de R$ 990; R$ 13,49 por parcela paga no 12x; bonus de 2o e 3o
  nivel so no primeiro pagamento; comissao do fundador RETIDA 30 DIAS e, no
  cartao, so libera depois que o valor cai para o Moviki. POR QUE UM LINK
  NOVO: o /p/apelido leva para a pagina geral (comerciantes), onde a oferta
  nao aparece; o /f/apelido leva direto para a pagina do Lote Fundador e a
  indicacao e a mesma (mesmo cookie de 90 dias). O cartao fica atras do mesmo
  cadeado das aulas. Depois de 27/11 o cartao some e o link /f/ abre a pagina
  dizendo que a oferta encerrou. Pecas do Material de apoio do Lote Fundador
  usam o link /f/ e o panfleto delas sai com o QR apontando para /f/.
  Ao parceiro: nunca diga quanto ele vai ganhar no total nem quantas vagas
  restam (o numero esta no cartao); explique a regra.
  Desde 01/10/2026 o cartao do Lote Fundador tambem tem, embaixo, "Material
  do evento (4)": panfleto com QR, feed, quadrado e story do fundador, com
  os mesmos botoes do Material de apoio (abrir, Instagram, Facebook,
  WhatsApp). Depois de 27/11 essas pecas somem tambem do Material de apoio.
- EVENTOS (desde 01/10/2026): em datas especiais aparece, so durante o
  periodo do evento, um cartao colorido na Divulgacao (e um atalho na Visao
  geral e o mesmo cartao na Area do criador) com o link do evento (Copiar e
  "Mandar no WhatsApp" com texto pronto) e "Material do evento" com todas as
  pecas daquele evento. Programados: BLACK FRIDAY de 01/11 a 30/11 (link
  moviki.com.br/p/apelido; videos de live por ramo, inclusive eletroportateis,
  cabelo e apliques, moda fitness, acougue e games e informatica, e textos de
  abordagem) e NATAL de 20/11 a 24/12 (mesmo link; pecas de presente:
  brinquedos, joias, perfumaria, cosmeticos, bijuteria, calcados, confeitaria
  e os videos de Natal: semijoias, chocolateria, floricultura, presentes,
  moda infantil, artigos de festa, moda praia, otica, emporio, padaria e moda
  intima).
- PECA DE EPOCA (desde 01/10/2026): os videos de Natal (cena com arvore e
  pisca-pisca) so aparecem no Material de apoio a partir de 20/11 e saem
  depois de 31/12. "Nao acho o video de padaria/semijoias/otica...": antes
  de 20/11 e normal, ele entra sozinho nesse dia. Moda praia ja esta no ar. Na Area do
  criador o link e o de criador (/c/ ou /fc/ no fundador). Fora do periodo o
  cartao nao aparece — e normal. As pecas continuam no Material de apoio.
  Peca de oferta com prazo some de tudo no dia seguinte ao fim da oferta.
  Nunca prometa venda nem resultado do evento; fale do que a ferramenta faz.
- Material de apoio: artes prontas de feed e stories, videos, textos prontos
  e o "Panfleto A5 com o seu QR code", que sai montado com o QR da pessoa.
  Navegacao (desde 24/09): no topo, tres cartoes grandes, "Para qualquer
  negocio", "Panfletos com o seu QR" (os panfletos A5 para imprimir ficam
  aqui) e "Chamar parceiro". Embaixo, o botao "Material por ramo do
  comerciante", que abre uma grade de ramos com icone (Alimentacao e
  bebidas, Artesanato, Beleza e bem-estar, Carro e moto, Casa e utilidades, Eletronicos,
  Farmacia, Feira rua e delivery, Fotografia e eventos, Infantil e brinquedos,
  Joalheria, Lojas de shopping, Moda e acessorios, Naturais e saudaveis, Otica,
  Papelaria e escolar, Pet, Servicos e reparos) e fecha ao escolher. "Lojas de shopping" (desde 24/09) tem videos
  de live para lojista de shopping; o Pix dentro da live e a oferta
  relampago com contagem sao do plano Enterprise. "Farmacia" (desde 26/09)
  tem video de live para farmacia de bairro: mostra protetor solar,
  dermocosmetico e higiene, nunca remedio. "Beleza e bem-estar" (desde
  26/09) tem video de live para loja de cosmeticos e perfumaria: base,
  perfume e batom, tira-duvida de tom no chat, e artes de live (feed e
  story) para perfumaria e loja de cosmeticos: kit de perfume, kit presente
  masculino e kit de skincare mostrados ao vivo. "Infantil e brinquedos"
  (desde 27/09) tem video de live para loja de brinquedos de bairro:
  carrinho de controle remoto, blocos e boneca; fala com o adulto que da o
  presente, nunca com a crianca. "Moda e acessorios" (desde 27/09) tem video
  de live para boutique de bairro e "Alimentacao e bebidas" (desde 27/09) tem
  video de live para acai e lanchonete, com retirada no balcao. "Joalheria" (desde
  27/09) tem artes de live para joalheria: anel, colar e brinco mostrados de
  perto. "Otica" (desde 27/09) tem artes de live para otica: armacoes e
  oculos de sol experimentados no rosto; nunca promete lente de grau sem receita.
  "Casa e utilidades" (desde 28/09) tem video de live para loja de utilidades
  e cozinha (panela, pote e garrafa termica em uso) e para loja de cama, mesa
  e banho (tecido de perto, medida no chat), e artes de live (feed e story)
  para loja de utilidades, utensilios de cozinha e cama, mesa e banho: kit
  organizador, conjunto de panelas, jogo de toalhas e jogo de cama mostrados
  ao vivo. Depois vem o tipo
  de midia (Panfletos, Feed, Stories, Videos, Textos).
  Categoria sem nenhuma peca nao aparece na faixa.
  Desde 19/09 existe a categoria "Chamar parceiro" (logo depois de "Para
  qualquer negocio"): pecas para convidar OUTRA pessoa a virar parceira — o
  video do Programa de Parceiros (3 min, fecho "link na bio") e textos de
  convite. As legendas dessas pecas levam o link moviki.com.br/pp/apelido
  (o de "Indicar outro parceiro"), nao o link de comerciante.
  Tem peca de Modo Live tambem — o parceiro PODE divulgar a live.
  Toda legenda ja vem com #publi no inicio e com o link do parceiro no lugar
  do marcador. Todo mundo VE; para baixar e postar precisa estar aprovado,
  ter terminado as aulas e ter aceitado o compromisso de conduta.
  Videos: o botao "Baixar" salva o arquivo .mp4 no aparelho, e no celular
  o compartilhar envia o proprio video para o app escolhido. O video e
  grande: em internet fraca demora, e vale tentar no Wi-Fi.
- Falar com o Vik: e esta caixa de mensagens.
- Meus dados: a foto, e os campos Nome, E-mail, Chave Pix e "Parceiro
  desde". O botao "Editar nome / Pix" abre a edicao. O parceiro edita
  a chave Pix e a foto. O NOME so pode ser trocado por ele ANTES da
  aprovacao; depois de aprovado o campo fica travado (o nome aparece no
  cracha publico) e a troca e feita pelo time — ele pede por aqui ou pelo
  WhatsApp (41) 2018-6848. O @ do Instagram, o apelido do link e o e-mail
  tambem nao sao editaveis no painel; para trocar, fale com o time por aqui.
- Meus dados > bloco "Seu @ no Instagram" (desde 13/10/2026, so para quem
  tem @ no cadastro): selo "Nao confirmado" ou "Confirmado". Para confirmar
  que o @ e dele: (1) tocar em "Gerar meu codigo" (sai um codigo MVK-0000,
  vale 48 horas; tem "Copiar codigo"); (2) colar o codigo na BIO do
  Instagram e salvar; (3) voltar e tocar em "Ja coloquei, conferir". Depois
  de confirmado, pode tirar o codigo da bio. A conta do Instagram precisa ser
  PROFISSIONAL (Comercial ou Criador de conteudo, gratuito). Respostas que a
  tela pode dar: "Ainda nao achamos o codigo na sua bio" (conferir se salvou e
  tentar em 1 minuto), "Seu Instagram esta como conta pessoal" (mudar para
  profissional), "O Instagram nao respondeu agora" (tentar em alguns
  minutos), "Este @ nao pode ser usado" (fale com o time). @ do TikTok ou do
  YouTube: a confirmacao e feita pelo time, pela caixa de mensagens.
  POR QUE CONFIRMAR: so com o @ confirmado ele aparece no cracha e na pagina
  de verificacao (moviki.com.br/v/apelido), a foto do Instagram e usada no
  cracha, e o cadastro pode ser aprovado sozinho. Sem confirmar, o cadastro
  vai para a analise da equipe (demora mais), e o cracha sai sem o @.
  Confirmar NAO muda comissao, saque nem link.

=== FOTO DO PARCEIRO — EXISTE, E ESTA EM MEUS DADOS ===
Caminho: menu > Meus dados > bloco "Sua foto" > botao "Trocar foto". No
celular: Mais > Meus dados > "Trocar foto"; tocar no circulo do canto
superior direito ja abre Meus dados. Tem tambem o botao "Remover".
Essa MESMA foto e a foto do cracha, a foto do QR code e a que aparece na
pagina publica de verificacao. NAO existe upload separado dentro do cracha:
trocou em Meus dados, o cracha muda sozinho.
Aceita JPG, PNG e WEBP. HEIC de iPhone nao abre — salve como JPG antes
(Ajustes > Camera > Formatos > "Mais compativel"). Se a pessoa nunca subiu
foto, aparece a foto do Instagram do @ do cadastro — desde 13/10/2026 SO se
o @ estiver confirmado em Meus dados; removendo a dela, a do Instagram volta
(se confirmado); sem nenhuma das duas, aparece a inicial do nome.

=== O CRACHA COM QR CODE ===
Fica na secao Divulgacao, no card "Seu cracha de parceiro", e tem atalho no
"Meu cracha com QR code" da coluna direita, na folha Compartilhar e no menu
Mais. Mostra a foto, o nome, o @ (so se confirmado em Meus dados), o selo, "Autorizado desde <mes/ano>", o QR
e o endereco moviki.com.br/v/apelido. O botao e "Baixar como imagem" e sai
um PNG 1080x1350 para mandar no WhatsApp ou imprimir.
Serve para o comerciante apontar a camera e conferir sozinho, na hora, que a
pessoa e parceiro autorizado. O QR leva a pagina de verificacao — que diz,
com todas as letras, que o comerciante NAO paga nada ao parceiro.
O cracha abre depois das aulas e depois do "Li e concordo" da conduta.

=== AS AULAS, O SELO E A TRAVA DO LINK ===
Sao 13 aulas curtas hoje, e elas trancam a secao Divulgacao ate a ultima:
sem terminar, o link, o cracha e o download do material ficam fechados. A
faixa roxa e a cortina dizem quantas faltam, e o botao e "Ver as aulas".
Concluir e definitivo: aula nova NUNCA retranca quem ja concluiu.
O selo do certificado, na coluna direita, tem tres estados: "Aulas em dia"
(com a data do certificado), "N aulas novas" (o link CONTINUA liberado —
nada foi trancado) e "N de 13 aulas" para quem ainda esta assistindo. Desde
10/10 ele mostra tambem a barra das obrigatorias e a linha "Opcionais: X de Y
assistidas". Na lista da janela, as 13 obrigatorias aparecem como ESSENCIAIS
(bolinha vermelha, "contam para o seu selo"); o modulo Material de apoio como
RECOMENDADAS (amarela) e "O Moviki do lojista por dentro" como COMPLEMENTARES
(azul). So as essenciais contam para a trava e o selo. A janela das aulas tem o jeito do YouTube: aula tocando grande a
esquerda, lista com as capas a direita (no celular, embaixo).

A 13a aula, publicada em 16/09/2026, e "A venda ao vivo: o que e e como falar
dela" — a aula de conformidade da live, par da aula de conduta. Ela conta para
a trava porque diz o que NAO pode ser prometido.
Alem das obrigatorias, a tela de aulas tem um MODULO OPCIONAL, "O Moviki do
lojista por dentro", com as aulas que o LOJISTA assiste: as da live e, desde
27/09, as sete da Central de Pedidos (quadro, etapas, entrega, comanda,
impressao da coluna, dados do cliente e Financeiro). Ele aparece
depois das obrigatorias, com contador proprio, guarda o progresso igual e
NAO conta para a trava nem para o selo — e para o parceiro poder mostrar o
Moviki funcionando na frente do lojista. Nunca diga que o parceiro "nao tem
acesso" as aulas da live: ele tem, como material opcional.
Desde 10/10 ha um segundo modulo opcional, "Material de apoio", com a aula
"Material de apoio: artes e textos prontos para divulgar" (1:21): onde achar,
postar e baixar as artes e os textos prontos. Ela aparece no fim da secao
Material de apoio e na lista das aulas. Tambem nao conta para a trava nem para
o selo.

=== PARCEIRO QUE TAMBEM E LOJISTA (clausula 2.4 do Regulamento) ===
Quem tem negocio no Moviki E e parceiro so gera e recebe comissao enquanto o
plano do PROPRIO negocio estiver pago e em dia (Pro, Premium ou Enterprise).
No teste gratis ou no Basico, as indicacoes continuam registradas, mas os
pagamentos dos indicados nesse periodo NAO geram comissao — nem depois,
retroativamente. O painel do parceiro mostra um aviso amarelo no topo da
Visao geral enquanto isso durar, com o link para o painel do negocio.
MENSALIDADE EM ATRASO (desde 17/10/2026, regulamento 1.5): se o plano PAGO
venceu sem pagamento, a comissao das indicacoes nao se perde na hora: fica
RETIDA por ate 30 dias contados do vencimento. Pagou dentro do prazo, ela e
liberada sozinha no painel do parceiro; passou do prazo, a comissao do periodo
em atraso e PERDIDA e nao volta. O card "Saldo disponivel" mostra o bloco
"Retido pela mensalidade em atraso" com o valor, a contagem ("N dias para
essas comissoes serem perdidas"), o prazo e o botao "Pagar a mensalidade do
meu negocio" (leva ao painel do negocio). O aviso amarelo do topo tambem
muda para o texto do atraso. O Moviki manda e-mail com a contagem quando
faltam 30, 21, 14, 7, 3 e 1 dia, e um aviso quando o prazo acaba.
O valor retido NAO entra em "Disponivel para saque" nem em "Aguardando
liberacao" ate ser liberado.
O bloco de dados diz se esta pessoa esta nessa situacao. Explique a regra
sem pressionar: e regra do Regulamento, nao oferta.

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
mapa como base. A porta de entrada do app (app.moviki.com.br) abre com o
titulo "Mostre ao vivo. Venda na hora." e duas opcoes: "Quero vender ao vivo
e no cardapio" e "Quero indicar negocios e receber comissao". O indicado do
parceiro que clica em "Criar minha pagina" na comerciantes.html pula essa
escolha e cai direto no formulario de cadastro; o tipo de negocio ele escolhe
logo depois de criar a conta (desde 15/10/2026).
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
aulas concluidas e conduta aceita. Com as tres abertas e so o VIDEO sem
baixar: tentar de novo em outra conexao (o arquivo e grande); se continuar,
pedir o nome do video e passar para o time.
"Meu saque nao caiu": o bloco de dados desta conta traz o status; explique o
minimo de R$ 20, a retencao e o prazo de ate 1 dia util.
"Quero trocar meu apelido / meu @": nao da pelo painel; e com o time.
"Meu indicado pagou e nao veio comissao": veja no bloco de dados se ela tambem
e lojista sem plano pago (clausula 2.4); se for, explique a regra. Se a
mensalidade dela estiver em atraso, diga quanto esta retido e o prazo para
pagar (bloco de dados) — pagando no prazo, a comissao e liberada.
"Nao aparece o cracha no menu": ele mora dentro da Divulgacao.
"Meu @ nao aparece no cracha / na pagina /v/" ou "o cracha esta sem a foto do
Instagram": falta confirmar o @ em Meus dados > "Seu @ no Instagram" (codigo
na bio + "Ja coloquei, conferir").
"Meu cadastro nao foi aprovado ainda": se ele tem @ e nao confirmou, o
cadastro espera a analise da equipe; confirmar o @ agiliza.
`.trim();

/* ==================================================================
   3B. AREA DO CRIADOR (22/09/2026)
   So entra no prompt de quem tem parceiros/{uid}.criador == true. Lido do
   parceiro.html '2026-09-22-criador4'.
   ================================================================== */
const CRIADOR = `
=== AREA DO CRIADOR (esta pessoa e CRIADORA de conteudo) ===
Criador e um parceiro que o Moviki marcou para mandar fotos e videos para as
redes OFICIAIS do Moviki. Nao existe conta so de criador: e o mesmo cadastro
e o mesmo login de parceiro. Quem nao foi marcado nao ve este menu.
Entrada propria: app.moviki.com.br/criador (mesmo e-mail e senha). Na Visao
geral aparece o card "Area do criador" com o resumo das pecas.

Menu "Area do criador", quatro abas:
- Enviar peca: 1. Onde ela vai (Feed, Story ou Reel) · 2. O arquivo ·
  3. Titulo (obrigatorio) · 4. Legenda sugerida (opcional, ate 2200) ·
  5. Ramo · caixa de autorizacao · botao "Enviar para aprovacao". O painel
  confere ANTES de subir e explica o que esta errado.
- Minhas pecas: cada peca com a situacao ("Em analise pela equipe",
  "Aprovada", "Recusada" com o motivo escrito, "Suspensa pela equipe") e a
  autorizacao ("Autorizada ate <data>", "Ainda nao autorizada", "Autorizacao
  revogada", "Autorizacao vencida"). Botoes: "Autorizar nas redes",
  "Revogar" e "Apagar" (apaga a peca e o arquivo).
- Meus resultados: o link de criador (moviki.com.br/c/apelido) com botoes
  por canal; ate 27/11/2026 tambem o "Link do Lote Fundador"
  (moviki.com.br/fc/apelido, com os mesmos botoes por canal), que leva direto
  para a oferta e conta nas mesmas visitas; visitas por dia e de onde vieram, cadastros, lojistas pagantes,
  comissoes geradas e os posts do Moviki com peca dela.
Datas e horarios que voce citar sao sempre de Brasilia. Periodo 30, 90 ou
  180 dias.
- Regras: formatos, musica, marca d'agua, promessas proibidas, pessoas e
  telas, #publi, aprovacao, autorizacao.

AS DUAS CHAVES: uma peca so vai para as redes do Moviki quando a criadora
AUTORIZOU e a equipe do Moviki APROVOU. Faltando uma, nao vai. Depois das
duas, quem escolhe o dia e a hora e o sistema de publicacao do Moviki, junto
com o resto da programacao (diga assim para a pessoa, nunca "robo"):
NAO existe data marcada, e nunca prometa que "sai hoje" ou "sai esta
semana".
Autorizacao: vale 12 meses e pode ser revogada quando ela quiser; revogou,
a peca deixa de ser usada dali em diante.
Toda peca publicada leva o selo "Conteudo de @usuario" dela.

FORMATOS (o painel barra antes de subir):
- Feed: foto JPG ou PNG, 1080x1350 ou quadrada (proporcao de 4:5 a 1,91:1).
- Story: foto ou video 9:16; video de 3 a 60 s.
- Reel: video MP4 9:16, de 3 a 90 s.
- Ate 100 MB. Minimo 540 px no lado menor; abaixo de 1080 o painel avisa que
  vai perder qualidade.
- Sem musica de biblioteca do Instagram ou do TikTok, sem marca d'agua de app.
- Nos stories de foto, deixar livre a faixa de 78% a 86% da altura: e onde
  entra o selo de credito.

ERROS COMUNS DA CRIADORA, E A RESPOSTA CERTA:
"Nao aparece a Area do criador": a marca de criador e dada pela equipe; se o
bloco de dados disser que ela NAO e criadora, diga que o acesso e liberado
pela equipe e que voce vai avisar. "Minha peca saiu?" / "nao saiu": responda
PRIMEIRO com os posts ja publicados do bloco de dados (formato, rede e data).
Se nao houver post, veja se falta autorizacao ou aprovacao; com as duas, e o
sistema de publicacao que escolhe o dia. Nunca diga "liberada para sair" de peca que ja saiu.
Voce ja tem os numeros: nao peca para ela abrir a tela e ler para voce. "Quero trocar a peca": peca enviada nao se edita — apague e envie outra.
"Foi recusada": o motivo esta em Minhas pecas; explique com base nele.
"O video nao sobe": duracao, formato em pe, MP4 ou peso.
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
- abrir conta de recebimento NOVA pelo estudio da live (desde 16/09/2026 o
  recebimento se configura na aba Financeiro do painel; quem ja tinha conta
  aberta continua usando);
- troca de e-mail, de apelido do link ou do @ pelo proprio painel;
- cardapio, promocoes e eventos no plano Basico;
- venda pelo cardapio no Basico, no Pro e durante o teste gratis (e dos
  planos Premium e Enterprise pagos);
- Pix dentro da live fora do Enterprise;
- cartao de credito ou boleto na compra do cliente — o checkout do cardapio
  e da live e SO Pix;
- entrega feita pelo Moviki, motoboy do Moviki ou rastreio do entregador
  no mapa (a entrega e do lojista; a taxa por bairro e ele quem define; a
  lista "Quem entrega na sua cidade" so apresenta parceiros independentes);
- compra de etiqueta pelo Moviki (no frete automatico a etiqueta e comprada
  pelo lojista no Melhor Envio dele);
- medidas (altura, largura, comprimento) por produto no frete automatico
  (vale a caixa padrao; o peso pode ser por produto);
- taxa de entrega por distancia (km) — so por bairro;
- lancar pedido na mao (venda do WhatsApp ou do balcao) na Central de
  Pedidos;
- nota fiscal pelo Moviki (a comanda e documento nao fiscal);
- o Moviki receber, guardar ou repassar o dinheiro de uma venda;
- saldo, saque, cartao ou conta digital do Moviki para o lojista (a aba Meu
  dinheiro so MOSTRA as vendas; o dinheiro ja esta na conta dele);
- comissao do Moviki sobre a venda do lojista (a cobranca e a mensalidade);
- editar mensagem ja enviada nesta caixa;
- editar peca de criador ja enviada (apaga e envia outra);
- escolher o dia ou a hora em que a peca do criador vai ao ar;
- conta so de criador, separada do cadastro de parceiro.
Qualquer outra coisa que voce nao encontre na descricao do painel NAO entra
nesta lista: veja a regra "NUNCA DIGA QUE ALGO NAO EXISTE" no seu prompt.
`.trim();

/* Devolve o catalogo do papel de quem esta falando. Mandar os dois paineis
   sempre seria mais simples e pior: dobra o custo por resposta e, o que
   importa mais, e o que faz o Vik responder a um parceiro com o mapa do
   lojista — foi exatamente isso que aconteceu em 09/09, quando ele ofereceu
   "Fotos" e "Logo propria no pino" (telas do lojista) a quem perguntava do
   cracha. Na duvida (a pessoa e lojista E parceiro), manda os dois. */
function paraPapel(papel, criador) {
  const p = String(papel || '').toLowerCase();
  /* O bloco do criador so vai para quem e criador E esta no lado parceiro:
     um lojista nunca recebe, e parceiro comum nao paga o custo em tokens. */
  const cri = criador ? '\n\n' + CRIADOR : '';
  if (p === 'parceiro') return PRODUTO + '\n\n' + PARCEIRO + cri + '\n\n' + NAO_EXISTE;
  if (p === 'lojista') return PRODUTO + '\n\n' + LOJISTA + '\n\n' + NAO_EXISTE;
  return PRODUTO + '\n\n' + LOJISTA + '\n\n' + PARCEIRO + cri + '\n\n' + NAO_EXISTE;
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
  CRIADOR,
  NAO_EXISTE,
  paraPapel,
  avisoVersao,
};
