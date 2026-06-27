# Modulo GKIT Performa

O GKIT Performa mede a performance operacional a partir da exportacao XLSX da Agenda.

## Escopo atual

- Rota: `/modulos/gkit-performa`.
- Codigo do app no Core: `gkit_performa`.
- Codigo canonico de rota: `gkit-performa`.
- Permissao principal: `gkit_performa.dashboard.read`.
- Processamento inicial em memoria, no navegador, sem gravar a planilha no banco.

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

Depois de validar a regra com usuarios reais, persistir importacoes em um schema dedicado `gkit_performa` com lotes, registros, unidades consolidadas e snapshots de ranking.
