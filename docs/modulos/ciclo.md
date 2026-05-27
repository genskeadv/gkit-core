# Modulo Ciclo

## Papel

O Ciclo acompanha a vida operacional do cliente no dia a dia. Cliente conquistado no CRM entra como onboarding no Ciclo e passa a ser monitorado por documentos, alertas, regularidade, ocorrencias, contratos, atas e Cockpit Cliente Integral.

## Funcionalidades prontas

- Cockpit operacional.
- Dashboard.
- Clientes e administradoras.
- Importacao XLSX de primeira carga de clientes.
- Detalhe de lote de importacao.
- Documentos, alertas, onboarding, regularidade e timeline.
- Ocorrencias, contratos e atas.
- Cockpit Cliente Integral.
- Criacao e edicao das entidades principais.
- Leituras principais filtradas por carteira para usuarios nao globais.

## Telas principais

- `/modulos/ciclo`
- `/modulos/ciclo/dashboard`
- `/modulos/ciclo/clientes`
- `/modulos/ciclo/clientes/[id]/cockpit`
- `/modulos/ciclo/administradoras`
- `/modulos/ciclo/importacoes`
- `/modulos/ciclo/importacoes/[id]`
- `/modulos/ciclo/documentos`
- `/modulos/ciclo/alertas`
- `/modulos/ciclo/onboarding`
- `/modulos/ciclo/regularidade`
- `/modulos/ciclo/timeline`
- `/modulos/ciclo/ocorrencias`
- `/modulos/ciclo/contratos`
- `/modulos/ciclo/atas`

## Base tecnica

- Schema: `ciclo`.
- Rotas: `app/modulos/ciclo/*`.
- Dados: `features/ciclo/queries.ts`.
- Escritas: `features/ciclo/actions.ts`.
- Importacao: `features/ciclo/importar-clientes-form.tsx`.
- Componentes: `features/ciclo/components.tsx`.
- Permissoes principais: `ciclo.clientes.write`, `ciclo.documentos.write`, `ciclo.alertas.write`.
- Escopo operacional: `admin_global` ve todas as carteiras; demais usuarios veem dados sem carteira ou vinculados as suas carteiras ativas em `security.usuario_carteiras`.
- A migration `sql/04_ciclo_p1.sql` inclui as tabelas de historico da importacao XLSX: `ciclo.importacao_lotes` e `ciclo.importacao_lote_itens`.

## UX/UI atual

- Shell lateral padrao.
- Grupos do menu recolhiveis.
- Telas desktop com rolagem interna no conteudo.
- Listas operacionais com altura limitada para manter cabecalho e contexto visiveis.
- Cockpit Cliente Integral como nomenclatura padrao.

## Pontos fracos e atencao

- Importacao XLSX precisa ser validada com a primeira carga real de clientes.
- Duplicidade, normalizacao de CNPJ, administradora e contatos devem ser acompanhados na primeira carga.
- Automacoes e IA no Ciclo permanecem como etapa futura.
- Necessario validar o fluxo completo CRM ganho -> onboarding Ciclo -> regularidade inicial.
- Historico de importacoes agora registra usuario e carteiras do lote; vale confirmar esse recorte com usuarios reais depois da primeira carga.
