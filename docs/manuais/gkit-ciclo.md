# Manual de uso - GKIT Ciclo

## Para que serve

O GKIT Ciclo e o modulo operacional de clientes. Ele concentra o cadastro mestre,
documentos, contratos, onboarding, regularidade, alertas, ocorrencias, atas e a
rotina de acompanhamento de clientes.

## Quem usa

- Equipe de relacionamento e acompanhamento.
- Gestores de carteira.
- Operadores responsaveis por documentos, contratos e regularidade.
- Areas que consomem o cadastro de clientes, como FAT, FLEX, DIR e ATE.

## Como acessar

- Cockpit operacional: `/modulos/gkit-ciclo`
- Dashboard: `/modulos/gkit-ciclo/dashboard`
- Clientes: `/modulos/gkit-ciclo/clientes`
- Novo cliente: `/modulos/gkit-ciclo/clientes/novo`
- Importacoes: `/modulos/gkit-ciclo/importacoes`
- Documentos: `/modulos/gkit-ciclo/documentos`
- Alertas: `/modulos/gkit-ciclo/alertas`
- Onboarding: `/modulos/gkit-ciclo/onboarding`
- Regularidade: `/modulos/gkit-ciclo/regularidade`
- Timeline: `/modulos/gkit-ciclo/timeline`
- Ocorrencias: `/modulos/gkit-ciclo/ocorrencias`
- Contratos: `/modulos/gkit-ciclo/contratos`
- Atas: `/modulos/gkit-ciclo/atas`
- Atendimento: `/modulos/gkit-ciclo/atendimento`

## Visao rapida do fluxo

1. Cadastre ou importe o cliente.
2. Classifique carteira, categoria e natureza do cliente.
3. Complete documentos e dados obrigatorios.
4. Registre contratos, atas e ocorrencias relevantes.
5. Acompanhe alertas, regularidade e timeline.
6. Use o cockpit e o dashboard para priorizar a rotina.

## Telas principais

### Cockpit operacional

Use como primeira tela do dia. Ele organiza a execucao diaria e destaca pontos
que exigem acompanhamento, atendimento, regularizacao ou decisao.

### Dashboard

Use para visao gerencial: clientes, risco, regularidade documental, alertas e
indicadores por carteira ou responsavel.

### Clientes

E o cadastro mestre. Mantenha aqui dados cadastrais, documento, contatos,
carteira, administradora, categoria do cliente, natureza do cliente e status.

Categorias usuais:

- Mensal: cliente com contrato recorrente.
- Pontual: cliente com demanda avulsa.
- Cobranca: cliente ligado a rotinas de cobranca.

Naturezas usuais:

- Pessoa fisica.
- Pessoa juridica.
- Condominio.

### Documentos

Use para controlar a matriz documental do cliente: contrato, cartao CNPJ, atas,
documentos de sindico, convencao, regulamento e outros arquivos essenciais.

#### Padrao de arquivos no Drive

Para permitir catalogacao automatica pelo rclone, nomeie os arquivos assim:

```text
cpf-ou-cnpj_cliente-slug__tipo-documento__YYYY-MM-DD.ext
```

Quando o documento nao tiver vencimento, use `sem-vencimento`:

```text
12345678000199_condominio-alfa__contrato__2027-12-31.pdf
12345678000199_condominio-alfa__cartao-cnpj__sem-vencimento.pdf
12345678000199_condominio-alfa__ata-eleicao__2026-10-15.pdf
```

Tipos esperados no onboarding:

- `contrato`
- `cartao-cnpj`
- `ata-eleicao`
- `ata-previsao-orcamentaria`
- `cpf-sindico`
- `cnpj-empresa-sindico`
- `convencao`
- `regulamento`
- `cadastro-unidade`

Use tudo em minusculo, sem acentos, com hifen entre palavras e `__` entre os
blocos. O CPF/CNPJ normalizado no inicio e a chave mais confiavel para cruzar o
arquivo com o cadastro do cliente.

Para testar a varredura sem gravar:

```bash
npm run ciclo:drive-sync -- --remote="gdrive:Base Cadastral"
```

Para aplicar os vinculos no Ciclo:

```bash
npm run ciclo:drive-sync -- --remote="gdrive:Base Cadastral" --apply
```

### Onboarding

Use para clientes em implantacao. Acompanhe checklist, documentos pendentes,
responsavel e passagem para cliente ativo.

### Regularidade

Use para verificar conformidade por cliente, carteira, administradora ou risco.
E a tela indicada para priorizar saneamento de cadastro e documentos.

### Alertas

Use para registrar e acompanhar pontos de atencao: documentos vencidos,
pendencias, risco, prazos, ocorrencias sensiveis ou demandas de acompanhamento.

### Ocorrencias

Use para registrar fatos do dia a dia que impactam o acompanhamento do cliente.
Inclua responsavel, prazo, impacto e relacao com alertas quando aplicavel.

### Contratos

Use para registrar contratos do cliente, vigencia, valores, reajustes e status.
Essas informacoes ajudam FAT e FLEX a tratarem faturamento e financeiro.

### Atas

Use para controlar assembleias, atas, validade, status e documentos vinculados.

### Timeline

Use para consultar a memoria operacional do cliente. A timeline ajuda a entender
o historico sem depender de conversas soltas.

## Rotina recomendada

1. Abra o cockpit e veja prioridades do dia.
2. Revise alertas e regularidade.
3. Atualize clientes com dados incompletos.
4. Registre ocorrencias importantes no mesmo dia.
5. Atualize documentos, atas e contratos assim que forem recebidos.
6. Use o dashboard para fechamento gerencial da carteira.

## Boas praticas

- O cadastro do cliente deve ser corrigido no Ciclo, nao nos modulos que apenas
  consomem essa informacao.
- Antes de faturar, confirme categoria, natureza, documento, endereco e carteira.
- Use alertas para pendencias acionaveis, nao como anotacao generica.
- Registre ocorrencias com responsavel e prazo sempre que houver proxima acao.
- Mantenha contratos e atas atualizados para evitar divergencia operacional.
