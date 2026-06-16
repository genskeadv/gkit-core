# Padrão de UI/UX para Módulos Operacionais GKIT

## Objetivo

Elevar os módulos internos para uma experiência de produto operacional: clara, densa na medida certa, fácil de escanear e consistente entre cockpit, listas, formulários e rotinas de aprovação.

Este padrão foi aplicado primeiro ao GKLI Flex e deve ser replicado nos demais módulos por etapas.

## Princípios

- A primeira tela deve ser trabalho real, não apresentação.
- O usuário deve entender o próximo passo sem depender do menu lateral.
- Cards existem para agrupar tarefas, não para decorar a página.
- A tipografia deve ser leve: poucos pesos fortes, tamanhos contidos e hierarquia clara.
- Listas precisam ser escaneáveis por título, status, valor e data.
- Formulários precisam mostrar somente os campos necessários para a ação atual.
- Estados vazios devem orientar a próxima ação.
- Módulos diferentes devem manter a mesma estrutura, mudando apenas conteúdo e cor de acento quando fizer sentido.

## Estrutura Padrão

Cada módulo deve usar:

1. Sidebar fixa com grupos curtos.
2. Header superior com retorno e usuário.
3. Hero operacional compacto.
4. Seções de trabalho com título, descrição curta e ação opcional.
5. KPIs em cards simples.
6. Atalhos operacionais para os fluxos principais.
7. Lista de pendências ou registros recentes.

## Componentes Compartilhados

O padrão operacional deve nascer em componentes compartilhados e ser exposto por wrappers finos de cada módulo.

Base comum:

- `OperationalSection`
- `OperationalQuickLinks`
- `OperationalKpiGrid`

Arquivo de referência:

- `features/shared/operational-ui.tsx`

Os módulos devem manter wrappers específicos apenas para preservar linguagem, classe visual e API local:

- `FlexSection`, `FlexQuickLinks`, `FlexKpis`
- `CrmSection`, `CrmQuickLinks`, `CrmKpis`
- `CicloSection`, `CicloQuickLinks`, `CicloKpis`

Evitar duplicar markup de seção, atalhos e KPIs diretamente em novos módulos. Quando um novo módulo precisar de outro padrão repetido, criar primeiro a base compartilhada e depois o wrapper do módulo.

## Sidebar

- Largura no desktop: cerca de 300px.
- Grupos sempre abertos em módulos operacionais.
- Link ativo com cor sólida.
- Links sem excesso de peso tipográfico.
- Evitar listas muito longas: agrupar por Operação, Cadastros e Configurações.

## Hero

O hero deve ser compacto e funcional:

- Fundo claro.
- Borda sutil.
- Linha superior de acento do módulo.
- Título de 24 a 32px.
- Descrição de uma frase.
- Ações principais no canto direito.

Evitar:

- Gradientes grandes.
- Texto hero excessivo.
- Altura visual que empurre o trabalho para baixo.

## Seções

Usar o componente conceitual `Section`:

- Eyebrow opcional.
- Título objetivo.
- Descrição curta.
- Conteúdo direto.
- Ação opcional.

Exemplos:

- Visão diária / Atalhos operacionais.
- Base / Fundação do módulo.
- Financeiro / Situação operacional.
- Rotina / Centros de trabalho.

## KPIs

Cards de métricas devem ter:

- Label pequena.
- Valor principal.
- Hint curto.
- Sem ícones decorativos obrigatórios.
- Altura estável.

O KPI não deve parecer botão se não for clicável.

## Atalhos Operacionais

Atalhos devem representar tarefas reais:

- Entrada de dados.
- Aprovação.
- Pagamento.
- Fechamento.
- Validação.

Cada card deve ter:

- Categoria curta.
- Título.
- Descrição de uma frase.
- Meta ou status curto.

## Listas

Listas devem favorecer leitura em linha:

- Coluna principal: título e subtítulo.
- Status em pill.
- Valor numérico.
- Metadata curta.

Estados:

- Sucesso: verde discreto.
- Alerta: amarelo discreto.
- Erro/cancelado: vermelho discreto.
- Neutro: acento do módulo.

## Formulários

- Grid de duas colunas no desktop.
- Uma coluna no mobile.
- Labels pequenas e consistentes.
- Inputs com borda clara e foco visível.
- Submit no final.
- Campos de competência obrigatórios quando a ação depende deles.

## Estados Vazios

Estado vazio deve responder:

- O que falta?
- Por que importa?
- Qual é o próximo passo?

Texto recomendado:

- "Nenhum registro encontrado."
- "Cadastre X para liberar Y."
- "Nenhuma pendência financeira."

## Tokens Visuais

Base recomendada:

- Background: `#f6f8fb`.
- Surface: branco ou quase branco.
- Texto: `#172033`.
- Muted: `#64748b`.
- Borda: `rgba(148, 163, 184, 0.2)`.
- Sombra: `0 12px 30px rgba(15, 23, 42, 0.045)`.
- Radius principal: 16px.
- Radius dos controles: 10px.

## Critérios de Aceite

Antes de considerar um módulo revisado:

- Cockpit tem atalhos operacionais claros.
- Nenhuma tela depende somente do menu lateral para orientar o usuário.
- Build passa.
- Typecheck passa.
- Lint não adiciona erros novos.
- Rotas principais protegidas respondem sem 404/500.
- Mobile não tem sobreposição de texto em cards, listas ou formulários.

## Ordem Sugerida de Replicação

1. Flex como referência viva.
2. CRM cockpit e listas.
3. Ciclo cockpit e listas.
4. Colab com adaptação para portal individual.
5. Core/admin com maior densidade e menos cards.

## Status no Flex

O Flex já aplica este padrão em:

- Cockpit.
- Financeiro.
- Importações.
- Receitas, despesas e extratos.
- Orçamento, validação e sugestões.
- Comissões e aprovação.
- Pagamentos e agenda.
- Fechamentos e detalhe de fechamento.
- Colaboradores, times e configurações.

Componentes de referência:

- `FlexShell`
- `FlexSection`
- `FlexQuickLinks`
- `FlexKpis`
- `FlexList`
- formulários Flex em `features/flex/components.tsx`

Classe visual de referência:

- `.flex-shell` em `app/globals.css`

## Status no CRM

O CRM agora aplica este padrão em:

- Cockpit comercial.
- Dashboard executivo.
- Pipeline de oportunidades.
- Propostas.
- Atividades.
- Interações.
- Empresas.
- Clientes.
- Contatos.
- Formulários de criação e edição dos fluxos comerciais principais.

Componentes de referência:

- `CrmShell`
- `CrmSection`
- `CrmQuickLinks`
- `CrmKpis`
- `CrmBoard`
- `CrmGenericList`
- formulários CRM em `features/crm/components.tsx`

Classe visual de referência:

- `.crm-shell` em `app/globals.css`

## Status no Ciclo

O Ciclo agora aplica este padrão em:

- Cockpit operacional.
- Dashboard executivo.
- Clientes e cockpit integral do cliente.
- Administradoras.
- Importações e detalhe de importação.
- Documentos.
- Alertas.
- Onboarding e detalhe de onboarding.
- Regularidade.
- Timeline.
- Ocorrências.
- Contratos.
- Atas.
- Formulários de criação e edição dos fluxos operacionais principais.

Componentes de referência:

- `CicloShell`
- `CicloSection`
- `CicloQuickLinks`
- `CicloKpis`
- `CicloClienteList`
- `CicloGenericList`
- `CicloImportacaoDetalhe`
- formulários Ciclo em `features/ciclo/components.tsx`

Classe visual de referência:

- `.ciclo-shell` em `app/globals.css`
