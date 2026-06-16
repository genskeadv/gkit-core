# Matriz de migracao dos modulos

## Situacao atual

O app unificado vive em `gkli-core`, publicado como `gkli-suite`.

Os arquivos novos de cada modulo ficam dentro do Core:

- Rotas: `gkli-core/app/modulos/*`
- Logica de dados: `gkli-core/features/*/queries.ts`
- Componentes de modulo: `gkli-core/features/*/components.tsx`
- Tipos: `gkli-core/features/*/types.ts`

Os apps antigos (`gkli-crm`, `gkli-ciclo`, `gkli-intr`, `gkli-colab`, `gkli-painel`) continuam como referencia durante a transicao.

Documentacao detalhada por modulo:

- `docs/modulos/core.md`
- `docs/modulos/crm.md`
- `docs/modulos/ciclo.md`
- `docs/modulos/fix.md`
- `docs/modulos/flex.md`
- `docs/modulos/intr.md`
- `docs/modulos/colab.md`
- `docs/modulos/painel.md`

## Atalhos publicados no app unificado

No Painel, os atalhos sao filtrados pelo Core:

- Core aparece somente para usuarios com `admin.dashboard.read`.
- CRM, Ciclo, Intr e Colab aparecem somente quando o usuario tem acesso ativo ao app em `security.usuario_app_acessos`.
- Admin global continua vendo todos os apps ativos cadastrados em `core.apps`.

### Core

- `/admin`
- `/admin/usuarios`
- `/admin/carteiras`
- `/admin/perfis`
- `/admin/permissoes`
- `/admin/apps`
- `/admin/auditoria`

### CRM

- `/modulos/crm`
- `/modulos/crm/dashboard`
- `/modulos/crm/oportunidades`
- `/modulos/crm/empresas`
- `/modulos/crm/clientes`
- `/modulos/crm/contatos`
- `/modulos/crm/propostas`
- `/modulos/crm/atividades`
- `/modulos/crm/interacoes`

Pendente opcional do app antigo: Kanban como rota separada, caso seja mantido alem da tela de Pipeline.

Fluxo acionavel publicado:

- Criar oportunidade: `/modulos/crm/oportunidades/nova`
- Editar oportunidade: `/modulos/crm/oportunidades/[id]`
- Criar empresa: `/modulos/crm/empresas/nova`
- Editar empresa: `/modulos/crm/empresas/[id]`
- Criar contato: `/modulos/crm/contatos/novo`
- Editar contato: `/modulos/crm/contatos/[id]`
- Criar proposta: `/modulos/crm/propostas/nova`
- Editar proposta: `/modulos/crm/propostas/[id]`
- Criar atividade: `/modulos/crm/atividades/nova`
- Editar atividade: `/modulos/crm/atividades/[id]`

### Ciclo

- `/modulos/ciclo`
- `/modulos/ciclo/dashboard`
- `/modulos/ciclo/clientes`
- `/modulos/ciclo/administradoras`
- `/modulos/ciclo/importacoes`
- `/modulos/ciclo/documentos`
- `/modulos/ciclo/alertas`
- `/modulos/ciclo/onboarding`
- `/modulos/ciclo/regularidade`
- `/modulos/ciclo/timeline`
- `/modulos/ciclo/ocorrencias`
- `/modulos/ciclo/contratos`
- `/modulos/ciclo/atas`

Pendentes do app antigo: Automacoes, IA e Carteiras x Usuarios.

Fluxo acionavel publicado:

- Criar cliente: `/modulos/ciclo/clientes/novo`
- Editar cliente: `/modulos/ciclo/clientes/[id]`
- Clientes com status `novo` ou `implantacao` alimentam a fila de onboarding quando a view dedicada ainda nao retorna linhas.
- Importar clientes por XLSX: `/modulos/ciclo/importacoes`
- Detalhar lote de importacao: `/modulos/ciclo/importacoes/[id]`

### FIX / Intr

O desenvolvimento funcional novo esta em `/modulos/fix`. As rotas `/modulos/intr/*` ficam como compatibilidade e redirecionam para FIX na maior parte dos fluxos.

Especificacao detalhada: `docs/modulos/fix.md`.

- `/modulos/fix`
- `/modulos/fix/importacoes`
- `/modulos/fix/financeiro`
- `/modulos/fix/financeiro/extratos`
- `/modulos/fix/financeiro/receitas`
- `/modulos/fix/financeiro/despesas`
- `/modulos/fix/financeiro/orcamento`
- `/modulos/fix/financeiro/validacao`
- `/modulos/fix/financeiro/sugestoes`
- `/modulos/fix/financeiro/inteligencia`
- `/modulos/fix/colaboradores`
- `/modulos/fix/times`
- `/modulos/fix/tipos-comissao`
- `/modulos/fix/comissoes`
- `/modulos/fix/comissoes/conferir`
- `/modulos/fix/comissoes/aprovacao`
- `/modulos/fix/pagamentos`
- `/modulos/fix/pagamentos/agenda`
- `/modulos/fix/pagamentos/importacoes`
- `/modulos/fix/pagamentos/conciliar-extrato`
- `/modulos/fix/fechamentos`
- `/modulos/fix/dashboard`
- `/modulos/fix/relatorios`
- `/modulos/fix/configuracoes`

Fluxo acionavel publicado:

- Criar colaborador: `/modulos/fix/colaboradores/novo`
- Editar colaborador: `/modulos/fix/colaboradores/[id]`
- Criar time: `/modulos/fix/times/novo`
- Editar time: `/modulos/fix/times/[id]`
- Importar receitas e extratos: `/modulos/fix/importacoes`
- Criar comissao: `/modulos/fix/comissoes/nova`
- Editar comissao: `/modulos/fix/comissoes/[id]`
- Conferir comissoes: `/modulos/fix/comissoes/conferir`
- Aprovar comissoes: `/modulos/fix/comissoes/aprovacao`
- Atualizar status de comissao e gerar pagamentos de comissoes aprovadas: `/modulos/fix/comissoes`
- As acoes de status de comissao ficam disponiveis diretamente por linha, sem necessidade de copiar o ID.
- Criar pagamento: `/modulos/fix/pagamentos/novo`
- Editar pagamento: `/modulos/fix/pagamentos/[id]`
- Criar agenda de pagamento: `/modulos/fix/pagamentos/agenda/nova`
- Editar agenda de pagamento: `/modulos/fix/pagamentos/agenda/[id]`
- Gerar pagamentos previstos por competencia: `/modulos/fix/pagamentos/agenda`
- Importar recibos: `/modulos/fix/pagamentos/importacoes`
- Conciliar extrato: `/modulos/fix/pagamentos/conciliar-extrato`
- Gerar orcamento: `/modulos/fix/financeiro/orcamento`
- Validar despesas: `/modulos/fix/financeiro/validacao`
- Gerar sugestoes inteligentes: `/modulos/fix/financeiro/sugestoes`
- Recalcular fechamento: `/modulos/fix/fechamentos`
- Editar/fechar competencia: `/modulos/fix/fechamentos/[id]`

Pendentes do app antigo ou de etapa futura: destino final de documentos internos, reembolsos, comunicados e integridade; CRUD de categorias financeiras e regras de classificacao; decisao final sobre renomear schema/permissoes `intr.*` para `fix.*`.

### Colab

- `/modulos/colab`
- `/modulos/colab/pagamentos`
- `/modulos/colab/comissoes`
- `/modulos/colab/beneficios`
- `/modulos/colab/documentos`
- `/modulos/colab/perfil`

Leituras principais publicadas no app unificado. O Colab permanece sem menu lateral, com navegacao superior.

O Colab consome o cadastro do colaborador, pagamentos e comissoes a partir das views publicas do schema `gkli_intr`, filtradas pelo e-mail do usuario autenticado e pelo `colaborador_id`.

## Sobre arquivos de instalacao Next nas pastas antigas

Quando a suite tiver paridade funcional e o deploy unico estiver validado, as pastas antigas nao precisam mais manter `node_modules`, `.next`, package locks e configs de Next para producao.

Antes disso, nao remover:

- `package.json`
- `package-lock.json`
- `next.config.*`
- `tsconfig.json`
- `postcss.config.*`
- `tailwind.config.*`

Esses arquivos ainda permitem rodar os apps legados para comparar comportamento e migrar telas com seguranca. A limpeza deve ser feita somente depois da paridade funcional de cada modulo.
