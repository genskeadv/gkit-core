'use server'

import {
  aprovarFixComissaoAction as baseaprovarFixComissaoAction,
  aprovarFixComissoesCompetenciaAction as baseaprovarFixComissoesCompetenciaAction,
  confirmarPagamentosPorTipoAction as baseconfirmarPagamentosPorTipoAction,
  createIntrColaboradorAction as basecreateIntrColaboradorAction,
  createIntrComissaoAction as basecreateIntrComissaoAction,
  createIntrComissaoTipoAction as basecreateIntrComissaoTipoAction,
  createIntrPagamentoAction as basecreateIntrPagamentoAction,
  createIntrPagamentoAgendaAction as basecreateIntrPagamentoAgendaAction,
  createIntrTimeAction as basecreateIntrTimeAction,
  gerarPagamentosComissoesAprovadasAction as basegerarPagamentosComissoesAprovadasAction,
  gerarPagamentosPrevistosAction as basegerarPagamentosPrevistosAction,
  rejeitarFixComissaoAction as baserejeitarFixComissaoAction,
  devolverFixComissaoParaAprovacaoAction as basedevolverFixComissaoParaAprovacaoAction,
  updateIntrColaboradorAction as baseupdateIntrColaboradorAction,
  updateIntrComissaoAction as baseupdateIntrComissaoAction,
  updateIntrComissaoStatusAction as baseupdateIntrComissaoStatusAction,
  updateIntrComissaoTipoAction as baseupdateIntrComissaoTipoAction,
  updateIntrPagamentoAction as baseupdateIntrPagamentoAction,
  updateIntrPagamentoAgendaAction as baseupdateIntrPagamentoAgendaAction,
  updateIntrTimeAction as baseupdateIntrTimeAction,
} from '@/features/fix/actions'

// Wrappers explícitos exigidos pelo Next 16/Turbopack em arquivos `use server`.


export async function createFixColaboradorAction(...args: Parameters<typeof basecreateIntrColaboradorAction>) {
  return basecreateIntrColaboradorAction(...args)
}


export async function updateFixColaboradorAction(...args: Parameters<typeof baseupdateIntrColaboradorAction>) {
  return baseupdateIntrColaboradorAction(...args)
}


export async function createFixTimeAction(...args: Parameters<typeof basecreateIntrTimeAction>) {
  return basecreateIntrTimeAction(...args)
}


export async function updateFixTimeAction(...args: Parameters<typeof baseupdateIntrTimeAction>) {
  return baseupdateIntrTimeAction(...args)
}


export async function createFixComissaoTipoAction(...args: Parameters<typeof basecreateIntrComissaoTipoAction>) {
  return basecreateIntrComissaoTipoAction(...args)
}


export async function updateFixComissaoTipoAction(...args: Parameters<typeof baseupdateIntrComissaoTipoAction>) {
  return baseupdateIntrComissaoTipoAction(...args)
}


export async function createFixComissaoAction(...args: Parameters<typeof basecreateIntrComissaoAction>) {
  return basecreateIntrComissaoAction(...args)
}


export async function updateFixComissaoAction(...args: Parameters<typeof baseupdateIntrComissaoAction>) {
  return baseupdateIntrComissaoAction(...args)
}


export async function updateFixComissaoStatusAction(...args: Parameters<typeof baseupdateIntrComissaoStatusAction>) {
  return baseupdateIntrComissaoStatusAction(...args)
}


export async function createFixPagamentoAction(...args: Parameters<typeof basecreateIntrPagamentoAction>) {
  return basecreateIntrPagamentoAction(...args)
}


export async function updateFixPagamentoAction(...args: Parameters<typeof baseupdateIntrPagamentoAction>) {
  return baseupdateIntrPagamentoAction(...args)
}


export async function createFixPagamentoAgendaAction(...args: Parameters<typeof basecreateIntrPagamentoAgendaAction>) {
  return basecreateIntrPagamentoAgendaAction(...args)
}


export async function updateFixPagamentoAgendaAction(...args: Parameters<typeof baseupdateIntrPagamentoAgendaAction>) {
  return baseupdateIntrPagamentoAgendaAction(...args)
}


export async function gerarFixPagamentosPrevistosAction(...args: Parameters<typeof basegerarPagamentosPrevistosAction>) {
  return basegerarPagamentosPrevistosAction(...args)
}


export async function confirmarFixPagamentosPorTipoAction(...args: Parameters<typeof baseconfirmarPagamentosPorTipoAction>) {
  return baseconfirmarPagamentosPorTipoAction(...args)
}


export async function aprovarFixComissaoAction(...args: Parameters<typeof baseaprovarFixComissaoAction>) {
  return baseaprovarFixComissaoAction(...args)
}


export async function aprovarFixComissoesPorCompetenciaAction(...args: Parameters<typeof baseaprovarFixComissoesCompetenciaAction>) {
  return baseaprovarFixComissoesCompetenciaAction(...args)
}


export async function gerarPagamentosComissoesAprovadasAction(...args: Parameters<typeof basegerarPagamentosComissoesAprovadasAction>) {
  return basegerarPagamentosComissoesAprovadasAction(...args)
}


export async function rejeitarFixComissaoAction(...args: Parameters<typeof baserejeitarFixComissaoAction>) {
  return baserejeitarFixComissaoAction(...args)
}


export async function retornarFixComissaoParaAprovacaoAction(...args: Parameters<typeof basedevolverFixComissaoParaAprovacaoAction>) {
  return basedevolverFixComissaoParaAprovacaoAction(...args)
}
