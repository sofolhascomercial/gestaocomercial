# Sistema Comercial Só Folhas — v45

## v51

- Corrige o mapeamento oficial do CNPJ da loja **DD GAMA** no XML.
- Adiciona reconhecimento de `17.457.404/0005-35` / `17457404000535` como **DD GAMA**.
- Mantém o vínculo anterior de `17.457.404/0035-35` como alias preventivo, sem impedir o reconhecimento do CNPJ correto informado pelo usuário.
- Atualiza cache para `v=51`.


Versão com login imediato, Firebase em segundo plano e correção reforçada de reconhecimento XML por CNPJ.

## Correção v45

- XML agora reconhece loja diretamente pelo mapa oficial CNPJ -> loja, mesmo se a base antiga do Firebase/cache ainda não tiver `cnpjs` atualizados.
- CNPJ do XML é comparado sempre sem máscara/pontuação.
- O reconhecimento por CNPJ não depende mais do texto da razão social ou da rede inferida.
- Corrige casos como `ATACADAO DIA A DIA S.A | CNPJ 17457404003399`, `17457404001698`, `17457404001930`, etc.


Correção emergencial de login: o formulário agora é ligado imediatamente, antes do Firestore/IndexedDB terminar de carregar. Isso evita que o acesso fique bloqueado quando o Firebase, cache ou base local demoram ou falham.

Mantém as correções anteriores: CNPJs XML Dia a Dia, Comper/Fort e Costa; logo na raiz e em assets; firebase-config.js no formato window.firebaseConfig.

Após publicar no GitHub Pages, use Ctrl+F5 ou teste em janela anônima.

## v31 - Atendimento oculto no menu lateral

- Removido o card fixo **Dúvidas ou suporte?** da lateral.
- O acesso aos chamados permanece concentrado na aba **Chamados**, sem ocupar espaço fixo na tela.
- Atualizado cache dos arquivos para `v=31`.

## v26 - Chamados de atendimento

- O botão **Abrir atendimento** agora abre um formulário para registrar chamados.
- Cada chamado gera numeração automática no padrão `CH-AAAAMMDD-0001`.
- Foi adicionada a aba **Chamados** para ADM e usuários comerciais.
- Chamados podem ser aceitos por um responsável e finalizados com status **Resolvido**.
- O sistema registra quem abriu, quem aceitou, data/hora, responsável e observação de resolução.
- Os chamados são salvos junto à base do sistema e sincronizam pelo Firebase quando configurado.

# Sistema Comercial Só Folhas

Sistema web para operação comercial da Só Folhas, dividido em duas interfaces:

1. **Sistema de Pedidos Comerciais** — acesso da loja/promotor.
2. **Sistema de Análises Comerciais** — acesso ADM/comercial.

## Arquivos

- `index.html` — página principal.
- `style.css` — identidade visual e responsividade.
- `script.js` — regras de negócio, importações e telas.
- `firebase-config.js` — configuração opcional do Firebase.
- `data/default-data.js` — produtos e lojas oficiais.
- `assets/logo-so-folhas.svg` — marca usada no sistema.

## Acesso inicial

### ADM / Comercial
- Usuário: `gerenciacomercial`
- Senha: `sofolhas2026`

### Loja
Cada loja possui usuário e senha gerados automaticamente. Exemplos:

- Usuário: `ddgama`
- Senha: `ddgama2026`

- Usuário: `costarioverde`
- Senha: `costarioverde2026`

- Usuário: `fortvalparaiso`
- Senha: `fortvalparaiso2026`

No ADM, acesse **Usuários** para visualizar e alterar senhas.

## Regras implementadas

### 1. Produtos
- O cadastro de produtos usa a base oficial enviada.
- `FLG` = Folhagem.
- `BDJ` = Bandeja.
- Produto inativo não aparece para a loja e não gera ruptura.
- Produto inativo entregue via PDF gera alerta em **Produtos Inativos Entregues**.

### 2. Lojas
- Cada loja tem login próprio.
- Usuário da loja vê somente a própria loja.
- O ADM vê todas as redes e lojas.

### 3. Pedido da loja
Campos do pedido:

- Produto.
- Venda base.
- Entrega base.
- Aproveitamento.
- Inventário físico.
- Quebra.
- Inventário bom.
- Sugestão da loja.
- Sugestão comercial.

O inventário bom é calculado como:

`Inventário bom = Inventário físico - Quebra`

### 4. Pedido zerado com estoque insuficiente
Se a venda base é maior que o inventário bom e a sugestão da loja está zerada, o sistema exige justificativa.

### 5. Venda base e entrega base
- Venda base vem do Excel importado.
- Entrega base vem dos PDFs importados.
- Aproveitamento = venda base / entrega base.
- Venda igual ou superior à entrega base gera alerta de possível venda reprimida.

### 6. Bandejas
Na análise comercial, bandejas exibem:

- Venda período.
- Entrega período.
- Aproveitamento.
- Inventário bom.
- Venda pendente.
- Sobra prevista.
- Sugestão loja.
- Sugestão comercial.
- Status.

Regras:
- Sugestão loja > venda período = OK.
- Sugestão loja = venda período = Atenção.
- Sugestão loja < venda período = Alerta de falta.
- Sobra prevista negativa indica risco até a próxima entrega.

### 7. PDF de entrega
O PDF alimenta:

- Sugestão comercial.
- Entrega base.
- Entrega do dia.
- Venda válida.
- Custo unitário.

A quantidade do PDF é a entrega bruta.

### 8. Faltas e qualidade
Somente ADM/comercial lança falta e qualidade.

`Entrega válida = Quantidade PDF - Falta - Qualidade`

`Valor falta = Falta × custo unitário do PDF`

`Valor qualidade = Qualidade × custo unitário do PDF`

O sistema bloqueia quando:

`Falta + Qualidade > Quantidade PDF`

### 9. Pendências de bandejas
Quando a sugestão da loja é maior que a entrega válida, o sistema cria pendência de bandeja.

A pendência fica aberta até o prazo configurado e depois passa para não entregue, sem apagar histórico.

### 10. Ruptura
Ruptura ocorre quando:

- Produto está ativo no mix da loja.
- Inventário bom = 0.
- Sugestão da loja = 0.
- Não existe pendência de bandeja aberta.

### 11. Venda x Quebra
O painel de análises calcula:

- Venda válida.
- Quebra em R$.
- % quebra.
- Faltas R$.
- Qualidade R$.

A quebra usa o custo da última entrega do produto para a loja.

## Importação de Excel

O sistema aceita os modelos enviados de:

- Costa.
- Dia a Dia.

Procura automaticamente os campos:
- Loja ou Filial.
- Produto.
- Quantidade.
- Data.

## Importação de PDF

O sistema lê PDFs com estrutura semelhante aos modelos enviados:

- Fantasia da loja.
- Data Saída.
- Pedido.
- Produto.
- UND/BDJ/KG.
- QTD.
- Valor unitário.

## Conciliação de base

No ADM, acesse **Conciliação** e selecione:

### Folhagens
- Datas que formarão a venda base.

### Bandejas
- Datas que formarão a venda do período.
- Datas que formarão a venda pendente até a próxima entrega.

## Publicação no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie todos os arquivos deste pacote.
3. Vá em **Settings > Pages**.
4. Em **Build and deployment**, selecione `Deploy from a branch`.
5. Escolha `main` e `/root`.
6. Aguarde o link ser publicado.

## Firebase

O sistema funciona em modo localStorage se o Firebase não for configurado.

Para ativar Firestore:
1. Crie um projeto no Firebase.
2. Habilite Firestore Database.
3. Vá em configurações do projeto.
4. Crie um app Web.
5. Copie a configuração para `firebase-config.js`.

A primeira versão usa um documento único no Firestore para simplificar a operação. Para segurança real em produção, recomenda-se evoluir para Firebase Authentication com regras por usuário/loja.

## Observação importante

Essa versão é uma primeira entrega funcional, feita para validar fluxo, importações e regras comerciais. Antes de colocar em produção completa, teste com:
- 1 PDF de cada rede.
- 1 Excel de venda.
- 1 loja de cada rede.
- 1 pedido de folhagens.
- 1 pedido de bandejas.
- Lançamento de falta e qualidade.
- Validação de ruptura e pendência.


## Atualização aplicada
- Logo oficial substituída em todas as telas.
- Mix por Loja com filtro de rede: ativar/inativar produto aplica automaticamente a todas as lojas da rede selecionada.

## Correções aplicadas nesta versão

- Menu lateral retrátil: a barra lateral fica oculta e abre somente pelo botão de três linhas no topo.
- Filtros recolhidos: os filtros administrativos aparecem apenas ao clicar no botão **Filtros**.
- Filtro de loja com opção **Todas as lojas**.
- Filtro de tipo de produto com opção **Ambos** para Folhagens e Bandejas.
- Nova aba **Dashboard** com venda, quebra, inventário, lojas em atenção, excesso e estoque baixo.
- Nova aba **Análise de Pedidos** com lojas pendentes, inventário e quebra.
- Importação de PDFs agora mostra resumo por loja/nota e permite excluir/remover importações.
- Importação de Excel agora mostra histórico das bases importadas, datas da planilha, divergências e permite excluir/remover base.
- Histórico e Auditoria agora mostra resumo por loja/nota e consolidado por rede.
- Rupturas agora possuem filtro por quantidade de dias sem entrega.
- A leitura de datas de Excel foi ajustada para preservar o formato correto da planilha, priorizando datas reais do arquivo.

## Correções técnicas aplicadas nesta versão

- Sincronização Firebase/Firestore ajustada para carregar dados existentes antes de salvar e para usar armazenamento em partes quando a base fica grande.
- Exclusão de usuários comerciais padrão respeita a decisão do ADM e não recria automaticamente usuários removidos.
- Conferência de importação usa data/rede/nota das divergências reais para filtrar alertas de PDF/XML.
- Exclusão de PDF/XML ou loja/nota remove também alertas e cancelamentos vinculados à importação.
- Leitura do rodapé do PDF ajustada para quantidades com milhar, como `26.040`, sem tratar rodapé como item.
- Importação de base de vendas em modo fallback respeita a coluna inicial do cabeçalho quando a planilha não começa na coluna A.
- Botão de suporte/atendimento passou a abrir orientação em modal.

## Atualização de Chamados - acesso do promotor

- A aba **Chamados** também aparece no menu do promotor/loja.
- O promotor pode abrir chamado e acompanhar os chamados vinculados à própria loja.
- O promotor visualiza número, status, prioridade, responsável e observação de resolução.
- O promotor não pode aceitar nem finalizar chamado.
- Aceitar e resolver chamados continua restrito ao ADM e usuários comerciais/assistentes.
- Ao abrir um chamado, o usuário é levado automaticamente para a aba **Chamados** para acompanhar o protocolo gerado.

## Correção v28 - Chamados

- Corrigido o botão **Aceitar chamado**.
- A ação deixou de depender de `onclick` direto no HTML e passou a usar eventos internos por `data-ticket-action`, evitando falha por cache/escopo global.
- Ao aceitar, o status muda imediatamente para **Em atendimento**, registra o responsável e depois sincroniza/salva os dados.
- Atualizado o cache-buster dos arquivos para `v=28`.


## v30 - Organização visual controlada

Esta versão aplica somente melhorias visuais e de organização, sem alterar as regras comerciais existentes.

Alterações principais:
- Menu lateral agrupado por áreas: Painel, Importações, Comercial, Operação, Atendimento e Administração.
- Dashboard inicial mais limpo, com faixa executiva, atalhos rápidos e indicadores de ação.
- Cards, painéis, tabelas, filtros, chamados e modais com visual mais padronizado.
- Criação de estilos para `panel`, `panel-head`, `import-box` e elementos que já eram usados pelo sistema.
- Cache atualizado para `v=30`.

Nenhuma regra de importação, cálculo, usuário, PDF, XML, Base de Vendas, Ofertas, Rupturas, Inventário ou Chamados foi alterada nesta etapa.


## v32 - Correção do travamento em 98% na Base de Vendas

- Corrigido o travamento na etapa **Salvando base no navegador** durante importação de bases grandes.
- A Base de Vendas agora é salva no IndexedDB em lotes menores, evitando que o navegador fique preso em 98%.
- O progresso de salvamento passa a informar o lote que está sendo gravado.
- O Firebase, quando configurado, deixa de bloquear a finalização da importação grande; a sincronização roda em segundo plano.
- Atualizado o cache para `v=32`.


## v33 - Ajuste de nomenclatura: Data de Entrega

- O campo exibido para o promotor no pedido passou de data genérica/data do pedido para **Data de entrega**.
- Na área comercial de conciliação, o campo de seleção também passou para **Data de entrega**.
- A tabela de pendências de bandejas agora mostra **Data de entrega** em vez de **Data pedido**.
- Não foram alteradas regras comerciais, cálculos, importação PDF/XML, Base de Vendas, chamados ou permissões.
- Atualizado o cache para `v=33`.

## v34 - Separação do menu do promotor

- Menu lateral do promotor separado em **Pedidos**, **Quebras** e **Inventário**.
- Criada a aba **Quebras** para o promotor registrar as quebras separadamente do pedido.
- Na aba **Pedidos** do promotor foram removidas as colunas **Aproveitamento**, **Inventário físico** e **Quebra**.
- A aba **Inventário** permanece separada para o inventário de saída.
- Não foram alteradas regras de PDF/XML, Base de Vendas, Chamados, Firebase, usuários ou permissões administrativas.
- Atualizado o cache para `v=34`.


## Versão v35 — data automática para Quebras e Inventário do promotor

- Na aba **Quebras** do promotor, a data de entrega agora é amarrada automaticamente ao dia correto.
- Na aba **Inventário** do promotor, a data de entrega também é amarrada automaticamente ao dia correto.
- Regra aplicada:
  - preenchimento de terça a sábado/domingo: vincula ao dia anterior;
  - preenchimento na segunda-feira: vincula automaticamente às entregas de sábado e domingo.
- O promotor não precisa alterar data nessas duas telas.
- A tela informa claramente a data de entrega vinculada.
- No inventário, a entrega vinculada considera o período automático, incluindo sábado + domingo quando preenchido na segunda-feira.
- Atualizado o cache para `v=35`.


## Versão v36 — Estoque em Loja

- Criada a área **Estoque em Loja** para ADM/comercial e promotores.
- No menu do promotor, o estoque aparece separado de **Pedidos**, **Quebras** e **Inventário**.
- Na tela de **Pedidos**, foi incluído um resumo de **Estoque em Loja para apoiar o pedido**, sem alterar a regra de envio do pedido.
- Para **bandejas**, o sistema passa a trabalhar com saldo contínuo por loja/produto, vinculado à última entrega real encontrada.
- O cálculo exibido considera: estoque anterior + entrega vinculada - quebra - saída estimada = estoque bom atual informado.
- Na tela de **Inventário**, bandejas passam a usar a última entrega real por produto; folhagens continuam usando a regra do dia anterior e segunda-feira vinculada a sábado/domingo.
- Na tela de **Quebras**, bandejas também são vinculadas à última entrega real por produto.
- Não foram alteradas importações PDF/XML, Base de Vendas, Chamados, usuários ou permissões além da inclusão da nova aba.
- Atualizado o cache para `v=36`.

## Versão v37 — Acompanhamento de Preços em Loja

- Criada a área **Preços em Loja** no menu do promotor.
- O promotor visualiza somente os produtos e o campo **Preço de venda em loja**.
- A tela do promotor não mostra preço de entrega, diferença, margem ou markup do cliente.
- O preenchimento é obrigatório nos dias configurados como segunda, quarta e sexta.
- Em dia obrigatório, os campos não puxam o preço anterior: a coleta do dia começa em branco até o promotor salvar o novo preço.
- Criada a área **Acompanhamento de Preços** para ADM/comercial.
- O comercial consegue acompanhar por período, rede, loja e produto.
- A visão comercial mostra preço Só Folhas, preço praticado em loja, diferença, margem e ranking de maiores margens.
- Usuários comerciais receberam permissão para a nova aba automaticamente na migração.
- Atualizado o cache para `v=37`.


## Versão v38 — Filtro de tipo no Acompanhamento de Preços

- Adicionado filtro **Tipo** na aba comercial **Acompanhamento de Preços**.
- Agora o comercial pode filtrar por:
  - Folhagem e bandeja;
  - Somente folhagem;
  - Somente bandeja.
- A lista de produtos do filtro passa a respeitar o tipo selecionado.
- A tabela de coletas também mostra a coluna **Tipo** para diferenciar folhagem e bandeja.
- Atualizado o cache para `v=38`.

## v39 - Visão Clara / Painel Executivo

Alterações aplicadas:

- Tela inicial do ADM/comercial reorganizada como central de pendências, com menos tabelas abertas na primeira visão.
- Cards principais para Fechamento do Dia, Importações/Divergências, Chamados, Rupturas, Preços Pendentes e Estoque Baixo.
- Tabelas e gráficos detalhados ficam recolhidos em “Ver gráficos e listas detalhadas”.
- Menu lateral passou a usar grupos recolhíveis, reduzindo a poluição visual.
- Criada tela “Visão Geral” para promotor/loja com pendências e atalhos: Pedidos, Quebras, Inventário, Preços e Chamados.
- Mantidas as regras existentes de PDF/XML, Base de Vendas, Chamados, Estoque em Loja, Preços, Inventário, Quebras, Firebase e permissões.

Recomendação após publicar no GitHub Pages: limpar cache com Ctrl + F5.


## v40 - Correção de logo no GitHub Pages
- Logo duplicada também na raiz do projeto para evitar falha de caminho no GitHub Pages.
- `index.html` passa a buscar a logo na raiz e usa `assets/` como fallback.
- `firebase-config.js` preenchido com o projeto `gestaocomercial-a1e81`.


## v41 - Correção de login e inicialização Firebase
- Login ADM `gerenciacomercial / sofolhas2026` protegido contra cache/Firebase vazio.
- Usuários comerciais padrão recuperados se a base da nuvem vier sem usuários.
- Leitura/gravação do Firestore com limite de espera para não travar a tela de login.
- Inicialização local automática caso o Firebase esteja sem regras ou indisponível.

## v42 — Reconhecimento de lojas por CNPJ no XML

Atualização focada em importação XML:

- Adicionado reconhecimento automático de lojas pelo CNPJ do destinatário da NF-e.
- Incluídos CNPJs informados para as redes Dia a Dia, Comper/Fort e Costa.
- Corrigido vínculo de Vicente Pires Rua 12 e Vicente Pires Rua 04:
  - Rua 12 = DD VICENTE PIRES
  - Rua 04 = DD VICENTE PIRES 2
- Incluídas lojas Dia a Dia que estavam ausentes no cadastro base:
  - DD BRAZLÂNDIA
  - DD CALDAS NOVAS
  - DIA A DIA CD
- Alertas antigos de XML com “Loja não reconhecida” deixam de aparecer quando o CNPJ passar a ser reconhecido pelo cadastro atualizado.

Observação: os CNPJs de COSTA JARDIM GOIÁS e COSTA RIO VERDE não foram adicionados porque não estavam visíveis/preenchidos na lista enviada.


## v45 - Correção de login

- Reforçado login de recuperação para ADM, usuários comerciais e lojas/promotores.
- Login padrão não depende mais de Firebase, cache local ou Firestore carregado para liberar acesso.
- Salvamento da recuperação de usuários acontece em segundo plano, sem travar a entrada.
- Mantido reconhecimento XML por CNPJ da v42.

## v48 — Histórico de erros

- Adicionada opção **Limpar** na área de Divergências de reconhecimento para remover o histórico de erros da tela sem apagar entregas, notas ou XML/PDF importados.
- Adicionada opção **Ocultar corrigidos** para esconder divergências que já passaram a ser reconhecidas pelo cadastro atual.
- Linhas de erro agora são clicáveis e abrem detalhes com CNPJ, NF, loja vinculada quando encontrada e ações para limpar erro individual, erros iguais ou erros do mesmo arquivo.


## v48 - Correção das opções do histórico de erros
- Corrigido clique no botão **Opções** das divergências de reconhecimento.
- A tabela agora usa evento interno por `data-issue-key`, sem depender de `onclick` inline.
- O modal de detalhe do erro ganhou abertura com fallback para evitar falha silenciosa.
- Mantida a limpeza de erros sem excluir XML/PDF, entregas ou dados comerciais.


## v49 — Reconhecimento XML por CNPJ reforçado

- Reconhecimento de XML por CNPJ agora funciona mesmo se `data/default-data.js` estiver antigo ou não carregar no cache.
- Adicionado mapa oficial CNPJ → loja com nome/rede para Dia a Dia, Comper/Fort e Costa.
- Histórico de erros passa a permitir vincular manualmente um CNPJ não reconhecido à loja correta.
- Após vincular CNPJ, reimporte o XML/ZIP para registrar as notas.


## v50
- Reforçado reconhecimento de produtos no XML com catálogo ativo interno de segurança.
- Evita erro de Produto não reconhecido quando `data/default-data.js` não carrega no GitHub/cache ou quando o Firebase traz base antiga sem produtos.
- Mantém regras de produto: não usa produtos A GRANEL e preserva diferença entre Brócolis Americano e Filetado.


### Complemento v50
- Incluído mapa direto dos 40 produtos encontrados no ZIP XML Dia a Dia para evitar divergência de produto não reconhecido.
- Exemplos corrigidos: ALFACE AMERICANA BDJ, QUIABO, PIMENTA DEDO DE MOÇA, PIMENTA DE CHEIRO, PIMENTÃO COLORIDO, JILÓ, COUVE PICADO UND e COUVE FLOR UND.

## Versão v52
- Corrigido modal "Vincular CNPJ à loja" no histórico de erros.
- A lista de lojas agora carrega usando cadastro atual, cadastro padrão e mapa oficial de CNPJs, evitando seletor vazio quando Firebase/cache estiver antigo.
- Mantido reconhecimento do CNPJ 17.457.404/0005-35 como DD GAMA.


## Versão v53 - Data de saída como data de entrega no XML

- A importação de XML NF-e passa a gravar a data de saída/entrada (`dhSaiEnt` ou `dSaiEnt`) como a Data de entrega comercial.
- A data de emissão (`dhEmi` ou `dEmi`) permanece registrada apenas para auditoria e fallback, caso o XML não traga data de saída.
- Cada item importado por XML passa a armazenar também `deliveryDate`, `exitDate`, `emissionDate` e `xmlDateSource` para facilitar conferência futura.


## v54 - Duplicidades de importação

- Criada aba **Duplicidades** para XML/PDF e Base de Vendas.
- XML/PDF duplicado por chave NF-e ou por data + rede + loja + nota agora é recusado e enviado para decisão do operador.
- Base de Vendas com datas/rede já importadas agora é recusada e enviada para decisão do operador.
- Operador pode manter importação atual, substituir pela nova ou, em Base de Vendas, importar apenas datas novas.
- O sistema não soma duplicidades automaticamente.
