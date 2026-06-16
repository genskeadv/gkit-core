'use server'

import {
  analisarFixFechamentoAction as baseanalisarFixFechamentoAction,
  fecharFixCompetenciaAction as basefecharFixCompetenciaAction,
  importarFixExtratoCsvAction as baseimportarFixExtratoCsvAction,
  reabrirFixCompetenciaAction as basereabrirFixCompetenciaAction,
  recalcularFixFechamentoCompetenciaAction as baserecalcularFixFechamentoCompetenciaAction,
} from '@/features/fix/actions'

// Wrappers explícitos exigidos pelo Next 16/Turbopack em arquivos `use server`.


export async function abrirAnaliseFixFechamentoCompetenciaAction(...args: Parameters<typeof baseanalisarFixFechamentoAction>) {
  return baseanalisarFixFechamentoAction(...args)
}


export async function fecharFixCompetenciaAction(...args: Parameters<typeof basefecharFixCompetenciaAction>) {
  return basefecharFixCompetenciaAction(...args)
}


export async function importarFixExtratoCsvAction(...args: Parameters<typeof baseimportarFixExtratoCsvAction>) {
  return baseimportarFixExtratoCsvAction(...args)
}


export async function reabrirFixCompetenciaAction(...args: Parameters<typeof basereabrirFixCompetenciaAction>) {
  return basereabrirFixCompetenciaAction(...args)
}


export async function recalcularFixFechamentoCompetenciaAction(...args: Parameters<typeof baserecalcularFixFechamentoCompetenciaAction>) {
  return baserecalcularFixFechamentoCompetenciaAction(...args)
}
