# Manual de uso - Painel

## Para que serve

O Painel e uma entrada unificada da Suite GKIT. Ele mostra modulos disponiveis,
atalhos principais e uma leitura executiva da esteira operacional conforme as
permissoes do usuario no Core.

## Quem usa

- Usuarios que precisam navegar entre varios modulos.
- Gestores que acompanham a esteira da suite.
- Administradores que validam se acessos e atalhos aparecem corretamente.

## Como acessar

- Painel: `/modulos/painel`
- Plataforma: `/plataforma`
- Administracao Core: `/admin`

## Visao rapida do fluxo

1. Acesse o Painel.
2. Confira os modulos ativos no fluxo operacional.
3. Use os cards de modulos para abrir o sistema desejado.
4. Use os atalhos publicados para ir direto a uma tela de trabalho.
5. Se algum modulo nao aparecer, revise acesso, app ativo e permissoes no Core.

## Telas e blocos principais

### Fluxo operacional

Mostra a esteira da suite: GKIT New, GKIT ATE, GKIT DIR, GKIT Jur, GKIT Ciclo,
GKIT Flex e Colab. O objetivo e orientar a sequencia de trabalho entre venda,
atendimento, consulta, operacao juridica, acompanhamento, financeiro e
publicacao ao colaborador.

### Atalhos publicados

Lista atalhos por modulo liberado. Os atalhos levam a telas recorrentes como
usuarios, carteiras, clientes, atendimentos, processos, publicacoes, comissoes,
colaboradores e portal Colab.

### Modulos disponiveis

Mostra os modulos que o usuario pode acessar. O Core aparece apenas para usuarios
com permissao administrativa. Modulos legados removidos nao devem aparecer no
Painel.

## Quando usar Painel ou Plataforma

Use `/plataforma` quando quiser a grade principal de sistemas com botao de manual
e acesso direto. Use `/modulos/painel` quando quiser atalhos operacionais e uma
visao resumida da esteira da suite.

## Boas praticas

- Se um atalho quebrar, revise primeiro se a rota ainda existe no modulo.
- Se um modulo nao aparecer, valide app ativo e vinculo do usuario no Core.
- Evite usar o Painel como cadastro; ele e uma entrada de navegacao.
- Revise os atalhos quando novas rotas forem publicadas nos modulos.
