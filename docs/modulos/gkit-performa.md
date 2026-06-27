# Modulo GKIT Performa

O GKIT Performa mede a performance operacional a partir da exportacao XLSX da Agenda.

## Escopo atual

- Rota: `/modulos/gkit-performa`.
- Rota de auditoria: `/modulos/gkit-performa/auditoria`.
- Codigo do app no Core: `gkit_performa`.
- Codigo canonico de rota: `gkit-performa`.
- Permissao principal: `gkit_performa.dashboard.read`.
- Permissoes de ranking: `gkit_performa.rankings.read` e `gkit_performa.rankings.write`.
- Processamento da planilha em memoria, no navegador, sem gravar a planilha bruta no banco.
- A ultima importacao processada fica temporariamente no `localStorage` para alimentar a pagina de auditoria.
- O botao `Gravar ranking` salva snapshots compactos no schema `gkit_performa`.

## Regra de consolidacao

O ranking nao conta apenas linhas da agenda. Ele consolida:

- ATE unico: codigos `ATE` encontrados no titulo ou no titulo do processo/caso/atendimento.
- Prazo juridico real: prazo sem ATE cujo titulo indica ato juridico controlavel.

Linhas operacionais, follow-up, manifestacao, pre-processual e prazos cujo titulo identifica apenas cliente ou condominio ficam visiveis na auditoria de descartes.

## Score

O score usa a mesma ponderacao do MVP original:

- 20% volume de unidades validas.
- 25% taxa de conclusao.
- 25% cumprimento de prazo.
- 20% velocidade media de conclusao.
- -10% penalizacao por abertas atrasadas.

## Proximo passo recomendado

Depois de validar a regra com usuarios reais, evoluir os snapshots para comparativos visuais entre periodos, responsaveis e rankings gravados.

## Persistencia

Schema: `gkit_performa`.

- `gkit_performa.ranking_lotes`: cabecalho do snapshot, arquivo, filtros, resumo e usuario que gravou.
- `gkit_performa.ranking_itens`: linhas do ranking gravado, com posicao, nome, metricas e score.
