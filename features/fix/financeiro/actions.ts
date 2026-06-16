'use server'

import {
  aceitarFixSugestaoAction as baseaceitarFixSugestaoAction,
  atualizarFixOrcamentoFuturoPorValidacaoAction as baseatualizarFixOrcamentoFuturoPorValidacaoAction,
  gerarFixOrcamentoDespesasAction as basegerarFixOrcamentoDespesasAction,
  gerarFixPrevisaoMensalAction as basegerarFixPrevisaoMensalAction,
  gerarFixSugestoesInteligentesAction as basegerarFixSugestoesInteligentesAction,
  ignorarFixValidacaoDespesaAction as baseignorarFixValidacaoDespesaAction,
  importarFixExtratoCsvAction as baseimportarFixExtratoCsvAction,
  registrarFixDesvioDespesaAction as baseregistrarFixDesvioDespesaAction,
  rejeitarFixSugestaoAction as baserejeitarFixSugestaoAction,
} from '@/features/fix/actions'

// Wrappers explícitos exigidos pelo Next 16/Turbopack em arquivos `use server`.


export async function aceitarFixSugestaoAction(...args: Parameters<typeof baseaceitarFixSugestaoAction>) {
  return baseaceitarFixSugestaoAction(...args)
}


export async function atualizarFixOrcamentoFuturoPorValidacaoAction(...args: Parameters<typeof baseatualizarFixOrcamentoFuturoPorValidacaoAction>) {
  return baseatualizarFixOrcamentoFuturoPorValidacaoAction(...args)
}


export async function gerarFixOrcamentoDespesasAction(...args: Parameters<typeof basegerarFixOrcamentoDespesasAction>) {
  return basegerarFixOrcamentoDespesasAction(...args)
}


export async function gerarFixPrevisaoMensalAction(...args: Parameters<typeof basegerarFixPrevisaoMensalAction>) {
  return basegerarFixPrevisaoMensalAction(...args)
}


export async function gerarFixSugestoesInteligentesAction(...args: Parameters<typeof basegerarFixSugestoesInteligentesAction>) {
  return basegerarFixSugestoesInteligentesAction(...args)
}


export async function ignorarFixValidacaoDespesaAction(...args: Parameters<typeof baseignorarFixValidacaoDespesaAction>) {
  return baseignorarFixValidacaoDespesaAction(...args)
}


export async function importarFixExtratoCsvAction(...args: Parameters<typeof baseimportarFixExtratoCsvAction>) {
  return baseimportarFixExtratoCsvAction(...args)
}


export async function registrarFixDesvioDespesaAction(...args: Parameters<typeof baseregistrarFixDesvioDespesaAction>) {
  return baseregistrarFixDesvioDespesaAction(...args)
}


export async function rejeitarFixSugestaoAction(...args: Parameters<typeof baserejeitarFixSugestaoAction>) {
  return baserejeitarFixSugestaoAction(...args)
}
