# Manual de uso - GKIT FAT

## Para que serve

O GKIT FAT e o modulo de faturamento de servicos advocaticios, com foco no
codigo de servico 03220. Ele organiza contratos, ordens de servico, conferencia
fiscal e preparo de NFS-e.

## Quem usa

- Equipe de faturamento.
- Financeiro.
- Gestores que revisam contratos mensais, pontuais ou de cobranca.
- Usuarios que conferem dados fiscais antes da emissao de nota.

## Como acessar

- Cockpit: `/modulos/gkit-fat`
- Contratos: `/modulos/gkit-fat/contratos`
- Novo contrato: `/modulos/gkit-fat/contratos/novo`
- OS e faturas: `/modulos/gkit-fat/faturas`
- Configuracoes: `/modulos/gkit-fat/configuracoes`
- Cadastro de clientes: `/modulos/gkit-ciclo/clientes`

## Visao rapida do fluxo

1. Confira o cadastro do cliente no Ciclo.
2. Cadastre ou revise o contrato no FAT.
3. Gere a ordem de servico da competencia.
4. Confira o snapshot fiscal da OS.
5. Prepare a NFS-e e registre retorno manual quando aplicavel.
6. Acompanhe historico e status da fatura.

## Telas principais

### Cockpit

Use para acompanhar contratos, OS, pendencias fiscais e atalhos de faturamento.

### Contratos

Mantem a base recorrente e avulsa que alimenta ordens de servico. Um contrato
pode representar mensalidade, atendimento pontual ou cobranca.

Antes de salvar contrato, confira:

- Cliente correto.
- Categoria do cliente.
- Natureza do tomador.
- Carteira.
- Valor.
- Competencia ou vigencia.
- Descricao do servico.
- Status.

### OS e faturas

Cada ordem de servico e uma fotografia do contrato e do cliente naquela
competencia. Use essa tela para gerar OS, revisar valores e acompanhar faturas.

### Detalhe da fatura

Use para conferencia fiscal, pre-nota e retorno manual da NFS-e. A tela pode
mostrar payload fiscal e historico da NFS-e.

### Configuracoes fiscais

Use para manter parametros fiscais, empresa emissora e dados usados na conferencia
e preparo de NFS-e.

## Como faturar um contrato mensal

1. Abra o cliente no Ciclo e confirme documento, endereco, categoria e natureza.
2. Abra ou crie o contrato em `/modulos/gkit-fat/contratos`.
3. Confirme valor mensal, descricao, vigencia e status ativo.
4. Acesse `/modulos/gkit-fat/faturas`.
5. Gere a OS da competencia.
6. Confira os dados da OS antes de preparar NFS-e.
7. Registre retorno da NFS-e quando a emissao for feita fora do sistema.

## Emissao de NFS-e

O FAT prepara os dados fiscais e organiza a conferencia da NFS-e. A emissao
integrada depende do conector fiscal configurado. Enquanto nao houver emissao
automatica ativa, use o detalhe da fatura para conferir payload, pre-nota,
historico e retorno manual.

## Boas praticas

- Corrija dados cadastrais no Ciclo antes de gerar OS.
- Nao gere fatura para cliente com documento ou natureza duvidosa.
- Use contrato ativo e competencia correta.
- Mantenha configuracoes fiscais revisadas antes do fechamento mensal.
- Confira valor e descricao do servico 03220 antes de emitir nota.
