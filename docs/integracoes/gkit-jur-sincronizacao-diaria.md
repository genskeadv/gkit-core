# Sincronização diária dos processos ativos

O worker DataJud percorre todos os processos com `status = ativo` e
`status_monitoramento = monitorando`, respeitando autorização de acompanhamento
externo. A fila usa o dia civil de Brasília (UTC-3).

Uma consulta DataJud com sucesso ou sem resultado conclui a tentativa daquele dia.
Uma publicação AASP não substitui essa consulta. Sem resultado não significa que
o processo esteja atualizado no tribunal: significa que a API não o encontrou.
Falhas permanecem pendentes e são tentadas novamente após uma hora, sem retirar
automaticamente o processo do monitoramento. Processos ainda não tentados têm
prioridade sobre falhas repetidas; dentro do grupo, os mais atrasados vêm primeiro.

Há 72 horários diários distribuídos a cada 20 minutos. Cada horário é um cron
diário independente, e a configuração mantém a coleta diferencial AASP das 6h UTC
(3h de Brasília) separada. No plano Hobby, a Vercel pode deslocar cada execução
dentro da hora; os horários não representam uma garantia de pontualidade.

O worker limita as consultas simultâneas a três e usa a trava persistida
`gkit_jur_datajud_catchup`, compartilhada com a recuperação manual. Quando o tempo
da função acaba, a próxima execução continua pelos registros persistidos. Uma
execução sem pendências encerra sem consultar o DataJud. A trava só é liberada
depois que todos os workers em andamento terminam.

Nos lotes diários, CNJs do mesmo tribunal são consultados juntos com filtro exato
`terms`, até 25 processos por lote. Cada processo recebe apenas os próprios
resultados e o log individual não inclui os CNJs dos demais processos. Consultas
agrupadas e as consultas individuais da rotina diária têm limite de 45 segundos
(preservando um timeout individual explicitamente configurado no ambiente). Respostas incompletas, truncadas, vazias ou
com falha voltam à consulta individual, sem concluir casos por uma resposta parcial.

O resultado persistido em `gkit_jur.cron_locks.metadata.result` inclui
`coberturaDiaria`: total ativo monitorado, consultas concluídas no dia, pendências,
falhas aguardando nova tentativa e bloqueios de cadastro/autorização. O marcador
`finalizado` só é verdadeiro quando não há pendências nem bloqueios.

## Recuperação e conferência

```powershell
npm run jur:catchup-daily -- --status
npm run jur:catchup-daily
```

O comando lê `.env.local`, chama o mesmo handler e usa a mesma trava do cron.
É retomável e não altera processos pausados, encerrados ou sem autorização.
Ao esgotar a fila disponível, imprime as falhas ainda em espera; estas continuam
pendentes para os próximos horários. SIGINT/SIGTERM pede parada ao fim do lote.

O cron precisa ser publicado na Vercel com `CRON_SECRET`, a chave DataJud e as
credenciais administrativas do Supabase configuradas. Alterar `vercel.json`
localmente não muda o agendamento em produção. A verificação de implantação deve
confirmar os horários publicados e um novo resultado com `coberturaDiaria`.

Referências: [Vercel — gerenciamento dos crons](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
e [limites e precisão por plano](https://vercel.com/docs/cron-jobs/usage-and-pricing).
