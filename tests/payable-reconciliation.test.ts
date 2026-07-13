import assert from 'node:assert/strict'
import test from 'node:test'
import { planPayablesImportReconciliation } from '@/features/gkit-flex/contas-pagar/payablePersistence'
import type { PayableImportRow, PayableItem } from '@/features/gkit-flex/contas-pagar/types'

function currentPayment(patch: Partial<PayableItem> & Pick<PayableItem, 'id' | 'descricao' | 'valor_previsto' | 'pago'>): PayableItem {
  return {
    competencia_id: 'competencia-1',
    competencia: '2026-07-01',
    vencimento_dia: 10,
    vencimento_texto: '10/07/2026',
    categoria: 'Sem categoria',
    centro: 'Operacional',
    origem_tipo: 'importacao',
    ...patch,
  }
}

function importedPayment(patch: Partial<PayableImportRow> & Pick<PayableImportRow, 'descricao' | 'valorPrevisto'>): PayableImportRow {
  return {
    linha: 2,
    vencimentoDia: 10,
    vencimentoTexto: '10/07/2026',
    categoria: 'Sem categoria',
    centro: 'Operacional',
    pago: true,
    raw: {},
    ...patch,
  }
}

test('payable import reconciliation preserves confirmed payments and removes only open rows missing from statement', () => {
  const confirmed = currentPayment({ id: 'confirmed', descricao: 'Pagamento aluguel', valor_previsto: 1000, pago: true })
  const sameAsStatement = currentPayment({ id: 'same-open', descricao: 'Energia', valor_previsto: 320.45, pago: false })
  const missingOpen = currentPayment({ id: 'missing-open', descricao: 'Internet antiga', valor_previsto: 199.9, pago: false })

  const plan = planPayablesImportReconciliation(
    [confirmed, sameAsStatement, missingOpen],
    [
      importedPayment({ descricao: 'Pagamento aluguel', valorPrevisto: 1000 }),
      importedPayment({ descricao: 'Energia', valorPrevisto: 320.45 }),
      importedPayment({ descricao: 'Fornecedor novo', valorPrevisto: 88.75 }),
    ],
  )

  assert.deepEqual(plan.rowsToDelete.map((row) => row.id), ['missing-open'])
  assert.deepEqual(plan.rowsToInsert.map((row) => row.descricao), ['Fornecedor novo'])
  assert.equal(plan.rowsToUpdate.length, 1)
  assert.equal(plan.rowsToUpdate[0].current.id, 'same-open')
  assert.deepEqual(plan.preservedConfirmed.map((row) => row.id), ['confirmed'])
})

test('payable import reconciliation matches confirmed duplicate before open duplicate', () => {
  const openDuplicate = currentPayment({ id: 'open-duplicate', descricao: 'Tarifa bancaria', valor_previsto: 42, pago: false })
  const confirmedDuplicate = currentPayment({ id: 'confirmed-duplicate', descricao: 'Tarifa bancaria', valor_previsto: 42, pago: true })

  const plan = planPayablesImportReconciliation(
    [openDuplicate, confirmedDuplicate],
    [importedPayment({ descricao: 'Tarifa bancaria', valorPrevisto: 42 })],
  )

  assert.deepEqual(plan.rowsToDelete.map((row) => row.id), ['open-duplicate'])
  assert.equal(plan.rowsToInsert.length, 0)
  assert.equal(plan.rowsToUpdate.length, 0)
})
