# Padroes UI operacional GKIT

Este guia consolida os ajustes graficos definidos no Novo Jur e no GKIT Ciclo. Ele deve orientar novas telas e revisoes dos demais modulos operacionais.

## Principios

- A primeira tela deve ser operacional, nao institucional.
- A interface deve ser densa, escaneavel e previsivel.
- Cada pagina deve ter um foco claro: dashboard mostra indicadores; paginas especificas mostram listas, detalhes e edicao.
- Cards sao usados para paineis reais, indicadores, itens repetidos e grupos de lista. Evitar cards dentro de cards.
- Textos redundantes devem ser removidos quando o contexto ja esta claro pelo header, filtro ou titulo da pagina.
- Modulos podem ter identidade propria, mas devem preservar hierarquia, espacamento e comportamento de lista comuns.

## Estrutura de pagina

### Header

- Usar um header compacto, com titulo/contexto a esquerda e acoes principais a direita.
- Quando houver botao de acao no header, ele nao deve aumentar a altura do bloco em relacao a paginas sem acao.
- Botoes de header devem ter altura consistente e ficar alinhados verticalmente ao titulo.
- Usuario logado deve aparecer de forma leve; dados como ID e perfil ficam fora da interface comum, salvo pagina administrativa.
- Em shells com busca global, a busca deve ficar centralizada e com largura proporcional, nao ocupando todo o header.
- Labels obvios como "Busca geral" podem ser removidos se o placeholder e a posicao ja explicam o campo.

### Acao primaria

- A acao principal da pagina fica no header ou no canto superior do painel relevante.
- Em Novo Jur, o botao "+" fica no canto esquerdo do header e abre o bloco de insercao manual abaixo do header.
- Em paginas do Ciclo, botoes como "Novo documento", "Iniciar onboarding", "Importar receita" ficam no header da pagina.
- Se a acao abrir um fluxo com contexto selecionado, carregar o cliente/objeto selecionado da tela anterior.

### Paineis

- Manter paineis com borda leve, raio moderado e espacamento interno consistente.
- Nao usar subtitulos internos quando repetem o header ou o proprio nome da lista.
- Quando houver resumo + lista, colocar resumo, filtros e lista no mesmo painel sempre que isso reduzir ruido.
- Headers de paineis de resumo podem ser escondidos quando os cards ja comunicam a informacao.

## Indicadores e cards

### Cards de resumo

- Cards devem ter duas linhas principais:
  - Linha 1: label curto.
  - Linha 2: valor.
- Texto auxiliar e microcopy devem ser usados com parcimonia; se poluir, remover.
- Todos os cards de uma mesma faixa devem ter mesma altura, mesmo padding e alinhamento vertical.
- Quando houver poucos cards, distribuir horizontalmente no espaco disponivel em vez de deixar lacunas grandes.
- Numeros grandes devem ficar visiveis, mas sem criar cartoes altos demais.
- Badges coloridos so entram quando agregam leitura de status; nao transformar todo card em badge.

### Dashboards

- Dashboard deve priorizar indicadores visuais: semaforos, barras, medidores, cards de atencao e indices.
- Nao colocar listas detalhadas em dashboard de cliente. Detalhes ficam em Documentos, Regularidade, Ocorrencias, Alertas etc.
- Alertas criticos podem aparecer como indicadores destacados, mas nao como tabela completa.
- Barras devem mostrar proporcao e tendencia, sem depender apenas de numeros.
- Acoes de edicao/cadastro devem ficar nas paginas especificas, nao no dashboard executivo.

## Filtros

### Padrao geral

- Filtros devem ficar acima da lista, dentro do painel da lista.
- Remover labels redundantes quando o controle e o placeholder ja forem claros.
- Preferir campos digitaveis quando a lista de opcoes pode ser grande, especialmente cliente.
- O campo de busca deve aceitar texto livre e filtrar por cliente, carteira, descricao ou identificador conforme a pagina.
- Sempre que houver "Pesquisar por", o campo escolhido deve condicionar placeholder, filtro e ordenacao.

### Ordenacao

- Cliente: filtrar por cliente e ordenar cliente A-Z.
- Carteira: ordenar por carteira e, dentro dela, por cliente.
- Movimentacao ou vencimento: respeitar a selecao especifica da pagina.
- Filtros devem preservar query string em paginacao e links de retorno.

## Listas

### Agrupamento

- Listas operacionais devem ser agrupadas por cliente quando o cliente for a unidade natural da operacao.
- Quando a carteira for o eixo de trabalho, agrupar por carteira e listar clientes dentro do bloco.
- Grupos devem abrir recolhidos por padrao.
- O resumo do grupo fica no cabecalho: nome do cliente/carteira e quantidade de itens.
- O botao de expandir deve ser um icone circular simples, com estado visual claro.

### Paginacao

- Padrao de paginacao: 20 grupos por pagina, nao 20 itens soltos.
- Contagem total deve ficar junto do titulo da lista, antes dos filtros, quando for uma informacao de contexto.
- Controles de pagina devem ficar no canto direito da lista.
- Repetir paginacao no topo e no rodape quando a lista for longa.
- Evitar blocos de paginacao grandes ou soltos no meio da tela.

### Linhas

- Linhas devem ter altura estavel e conteudo alinhado ao centro vertical.
- A informacao primaria fica a esquerda; estatisticas curtas ficam no meio ou a direita; acao fica no extremo direito.
- Evitar que botoes como "Detalhes" desalinhem a linha. Se necessario, criar uma coluna fixa para a acao.
- Se a informacao ja esta no grupo, nao repetir dentro da linha. Exemplo: nao mostrar carteira na linha se a lista esta agrupada por carteira.
- Micro-estatisticas devem ser compactas: "3 recebimentos / 2 em dia / 1 atrasado".

## Fluxos por etapas

- Fluxos como onboarding devem ser orientados por etapas horizontais: Cadastro, Recepcao, Documentacao e Operacao.
- Cada etapa deve ter suas tarefas em checklist.
- Evitar areas lado a lado quando elas competem pela atencao do operador.
- O checklist deve servir tanto para iniciar onboarding quanto para acompanhar qualquer cliente ja iniciado.
- A tela de workflow deve permitir cadastrar atividade com etapa, ordem, descricao, responsavel padrao e obrigatoriedade.

## Menu lateral

- Menu deve conter apenas paginas vivas e uteis para a rotina.
- Remover entradas que viraram fluxo interno ou detalhe de outra pagina.
- Modulos com muito detalhe devem concentrar acesso em paginas principais e dashboards.
- Usuario no rodape do menu deve ser discreto; informacao administrativa excessiva deve sair dali.

## Copy e nomenclatura

- Usar nomes operacionais diretos: "Clientes", "Documentos", "Onboarding", "Regularidade", "Ocorrencias".
- Evitar descricoes longas nos paineis quando o titulo e os dados ja explicam a funcao.
- Evitar repetir titulo da pagina dentro do primeiro painel.
- Preferir "cliente(s)", "documento(s)", "alerta(s)" em contadores objetivos.
- Em dashboards, substituir narrativas por indicadores e legendas curtas.

## Responsividade

- Desktop deve aproveitar largura com grids horizontais, mas sem esticar cards a ponto de perder leitura.
- Em tablet/mobile, filtros e cards quebram para uma coluna ou duas colunas, preservando ordem natural.
- Textos em botoes e cards nao podem estourar o container.
- Controles fixos como botoes circulares, cards de resumo e paginacao devem ter dimensoes previsiveis.

## Checklist de verificacao antes de fechar uma tela

- Header esta na mesma altura visual das demais paginas do modulo.
- Cards de resumo tem duas linhas e altura igual.
- Com poucos cards, a distribuicao horizontal esta equilibrada.
- Filtros estao acima da lista, sem labels redundantes.
- Lista esta agrupada pelo eixo correto: cliente ou carteira.
- Grupos abrem recolhidos por padrao.
- Paginacao usa 20 grupos por pagina.
- Contagem da lista esta junto do titulo, nao solta entre filtro e itens.
- Paginacao aparece no canto direito superior e inferior quando necessario.
- Linhas estao alinhadas verticalmente e a acao final nao desalinha.
- Dashboard nao contem listas detalhadas que pertencem a paginas especificas.
- `npm test` e `npm run build` passam antes de commit/push.

## Referencias implementadas

- Novo Jur: header compacto, busca centralizada, acao "+" no canto esquerdo, filtros dinamicos e listas agrupadas por cliente.
- Ciclo: shell lateral, cards de resumo com duas linhas, listas por carteira/cliente recolhidas, paginacao por grupos e dashboard de cliente apenas com indicadores.
