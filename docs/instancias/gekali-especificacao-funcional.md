# Especificacao funcional - nova instancia GKIT Core para GEKALI

## Objetivo

Criar uma instancia separada do GKIT Core para a GEKALI, com codigo-fonte proprio, banco Supabase proprio e operacao independente da instancia Genske Advogados.

A nova instancia deve preservar o conceito do produto: um app central com modulos sob medida, controle de usuarios, permissoes, carteiras, times e modulos operacionais. A separacao deve permitir evoluir a GEKALI sem risco direto sobre dados, deploy e customizacoes do Genske.

## Principio de separacao

- A GEKALI tera uma pasta de codigo propria, por exemplo `C:\Users\Genske\Documents\gekali-core`.
- A GEKALI tera um projeto Supabase proprio.
- A GEKALI tera variaveis de ambiente proprias.
- A GEKALI tera deploy proprio, idealmente em projeto Vercel separado.
- Dados, usuarios, permissoes, imports e historicos nao serao compartilhados com a instancia Genske.

## Escopo funcional inicial

### Plataforma e Admin Core

Funcionalidades esperadas:

- Login via Supabase Auth.
- Cadastro e manutencao de usuarios.
- Controle de status de usuarios: ativo, inativo, bloqueado, pendente.
- Perfis e permissoes por modulo.
- Vinculo de usuarios a apps/modulos.
- Vinculo de usuarios a carteiras.
- Cadastro de carteiras e times.
- Auditoria administrativa basica.
- Painel de modulos ativos.

### Modulos transportados

O clone deve carregar o codigo completo do GKIT Core e permitir ativar ou inativar modulos conforme necessidade da GEKALI.

Modulos reconhecidos pelo bootstrap:

- `core`: Admin Core.
- `painel`: Hub operacional.
- `ciclo`: operacao de clientes/contratos/documentos/onboarding/regularidade.
- `colab`: area do colaborador.
- `gkit_new`: CRM/oportunidades.
- `gkit_flex`: financeiro operacional, comissoes, pagamentos, previsoes e cadastros.
- `gkit_jur`: operacao juridica.
- `gkit_ate`: atendimento consultivo.
- `gkit_dir`: diretoria.
- `gkit_performa`: rankings/performance.

Nem todos precisam permanecer ativos na GEKALI. O Admin Core deve permitir desativar apps sem remover codigo.

## GKIT Flex - regras funcionais importantes

Se o Flex for usado na GEKALI, devem ser preservadas estas regras:

- Receitas sao importadas/processadas por competencia.
- Comissoes sao calculadas com base nas receitas da competencia.
- Comissoes calculadas em um mes geram previsao de pagamento no mes subsequente.
- Ao gerar pagamentos previstos com base no mes anterior, itens de comissao nao devem ser copiados dos pagamentos realizados.
- Categorias podem ser marcadas com a regra `Nao gerar automaticamente na previa`.
- Categorias marcadas com essa regra nao entram na geracao automatica de previsao a partir do mes anterior.
- Pagamentos manuais devem coexistir com importacoes.
- Centros e categorias devem ficar registrados em cadastros normalizados.

## Dados iniciais recomendados

Antes de liberar a operacao:

- Criar pelo menos um usuario admin global.
- Criar as carteiras/areas iniciais da GEKALI.
- Criar times internos, se aplicavel.
- Ativar apenas os modulos necessarios.
- Criar perfis operacionais por funcao.
- Vincular usuarios aos modulos e carteiras correspondentes.
- Definir logo, nome exibido e textos da marca GEKALI no codigo copiado.

## Fora de escopo do bootstrap

O bootstrap nao importa dados historicos da GEKALI.

Ficam para uma etapa posterior:

- Importacao de planilhas historicas.
- Migracao de dados externos.
- Integracoes especificas.
- Customizacao visual profunda.
- Remocao fisica de modulos nao usados.

## Criterios de aceite funcional

A nova instancia pode ser considerada pronta quando:

- O app sobe localmente com `npm run dev`.
- O build passa com `npm run build`.
- Um usuario admin global consegue entrar.
- O admin lista usuarios, apps, permissoes, perfis, carteiras e times.
- A pagina `/plataforma` lista os modulos ativos.
- Um modulo ativo abre sem erro de schema ou permissao.
- Um modulo inativo nao aparece para usuario sem permissao.
- O Supabase usado e o da GEKALI, confirmado pelas variaveis de ambiente.

## Prompt sugerido para outra instancia do Codex

Use este contexto ao abrir uma nova instancia do Codex para continuar o trabalho:

```text
Estamos criando uma instancia separada do GKIT Core para a GEKALI.
O objetivo e copiar o codigo do gkit-core para uma pasta propria, usar um projeto Supabase novo, rodar o bootstrap em sql/63_bootstrap_nova_instancia_supabase.sql e depois aplicar as migrations/scripts de modulo.
A instancia deve manter isolamento total da base Genske.
Validar com npm install, npm test, npm run build e login de um admin global.
Preservar a arquitetura atual de Next.js + Supabase + Admin Core + modulos.
```
