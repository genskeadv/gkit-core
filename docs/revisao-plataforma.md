# Revisao da Plataforma GKIT

Data: 2026-05-24

## Consolidado

- Core: login central, painel de modulos, admin de usuarios, carteiras, perfis, permissoes, apps e auditoria.
- Painel: entrada unificada sem menu lateral, com atalhos filtrados pelo Core.
- CRM: cockpit, oportunidades, empresas, contatos, propostas, atividades e interacoes com dados reais no schema `crm`.
- Ciclo: clientes, importacao XLSX, administradoras, onboarding, regularidade, documentos, alertas, ocorrencias, contratos, atas e Cockpit Cliente Integral.
- Intr: colaboradores, times, receitas, comissoes, pagamentos, agenda de pagamentos, geracao de previstos e fechamentos mensais.
- Colab: portal individual do colaborador, sem menu lateral, alimentado pelo Intr.

## Estado Pronto

- Controle de acesso por `core.apps` e `security.usuario_app_acessos`.
- Escritas dos modulos protegidas por permissoes resolvidas no Core.
- App unificado validado com `typecheck`, `lint` e `build`.
- Rotas operacionais principais publicadas dentro de `gkli-core/app/modulos`.
- Documentacao por modulo criada em `docs/modulos`.
- Padrao visual revisado: marca GKIT, favicon, tipografia leve, menus recolhiveis e telas desktop com rolagem interna.
- Build atual aprovado com 81 rotas.

## Pendencias Prioritarias

1. Aplicar no Supabase as migrations `07_intr_receitas_comissoes.sql`, `08_intr_agenda_pagamentos.sql`, `09_intr_fechamentos_comissoes.sql` e `10_intr_permissoes_finas.sql`.
2. Validar em ambiente real o ciclo financeiro do Intr: receita -> comissao -> aprovacao -> pagamento previsto -> fechamento.
3. Validar permissoes finas do Intr com usuarios reais dos perfis `admin_carteira`, `operador`, `gestor` e `visualizador`. A checagem estatica ja confirma que a migration cobre as permissoes exigidas pelo app, incluindo receitas e comissoes.
4. Criar auditoria operacional por modulo, alem da auditoria administrativa do Core.
5. Criar testes minimos para login, permissoes, painel e rotas criticas dos modulos.
6. Validar visualmente em navegadores reais as telas com rolagem interna, especialmente listas longas, formularios e Cockpit Cliente Integral.

## Pendencias Nao Prioritarias Agora

- Reembolsos, documentos internos e comunicados no Intr.
- Documentos reais/anexos no Colab.
- Beneficios em tabela propria no Intr.
- Migracao de dados historicos dos apps antigos.

## Riscos Atuais

- As telas novas do Intr dependem das migrations `07`, `08`, `09` e `10` aplicadas na base real.
- O app usa service role no servidor em rotas operacionais; por isso a validacao de permissao antes de gravar precisa continuar obrigatoria.
- Se os schemas ou views novas nao estiverem expostos no Supabase API, as listas abrem vazias ou as gravacoes falham.
- A reducao de rolagem do browser melhora o uso desktop, mas exige validacao de conteudo real para garantir que nenhuma lista importante fique escondida em areas internas.
