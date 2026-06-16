# Modulo CRM

## Papel

O CRM acompanha captacao comercial, oportunidades, empresas, contatos, propostas, atividades e interacoes. Cliente conquistado no CRM vira entrada operacional no Ciclo.

## Funcionalidades prontas

- Cockpit comercial.
- Dashboard de pipeline.
- Empresas, clientes consolidados, contatos, oportunidades, propostas, atividades e interacoes.
- Criacao e edicao das entidades principais.
- Envio de oportunidade ganha para o Ciclo.
- Carteiras e usuarios lidos a partir do Core.
- Leituras principais filtradas por carteira para usuarios nao globais.
- Importacoes removidas do fluxo ativo do CRM.

## Telas principais

- `/modulos/crm`
- `/modulos/crm/dashboard`
- `/modulos/crm/oportunidades`
- `/modulos/crm/empresas`
- `/modulos/crm/clientes`
- `/modulos/crm/contatos`
- `/modulos/crm/propostas`
- `/modulos/crm/atividades`
- `/modulos/crm/interacoes`

## Base tecnica

- Schema: `crm`.
- Rotas: `app/modulos/crm/*`.
- Dados: `features/crm/queries.ts`.
- Escritas: `features/crm/actions.ts`.
- Componentes: `features/crm/components.tsx`.
- Permissoes principais: `crm.oportunidades.write`, `crm.propostas.write`.
- Escopo operacional: `admin_global` ve todas as carteiras; demais usuarios veem dados sem carteira ou vinculados as suas carteiras ativas em `security.usuario_carteiras`.

## UX/UI atual

- Usa o shell lateral padrao dos modulos.
- Menu lateral com grupos recolhiveis.
- Listas e kanban com rolagem interna.
- Tipografia suavizada para reduzir uso de negrito.

## Pontos fracos e atencao

- O kanban ainda vive dentro do fluxo de pipeline; uma rota dedicada so faz sentido se houver ganho real de uso.
- Falta teste ponta a ponta do envio CRM -> Ciclo com usuario e carteira reais.
- Filtros e ordenacoes ainda podem evoluir para uso diario com alto volume.
- Contatos sem empresa/oportunidade vinculada podem ficar pouco visiveis para usuarios nao globais; o ideal e evoluir o vinculo contato-carteira ou reforcar o cadastro sempre a partir de uma empresa.
- Importacoes nao serao mais usadas no CRM; rotas antigas devem ser mantidas apenas enquanto houver compatibilidade visual ou removidas em limpeza futura.
