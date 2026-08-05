import assert from 'node:assert/strict'
import test from 'node:test'
import { parseUberVoucherCsv, reconcileUberRows } from '@/features/gkit-flex/uber/uberReconciliation'

test('uber csv parser reads voucher report rows', () => {
  const rows = parseUberVoucherCsv(`Creation Date,Voucher Link,Guest Name,Guest Email,Guest Phone,Voucher Status,Amount Spent,Orders/Trips
2026-08-03 18:46:10.776 -0300 -03,https://r.uber.com/RYWKWHVEEWY,Vania Schutz,vania.schutz@genskeadvogados.com.br,,VOUCHER_CLAIMED,32.3,1
2026-08-03 18:46:10.77 -0300 -03,https://r.uber.com/RFVBPFYQQFQ,Fabia David,fabia.david@genskeadvogados.com.br,,VOUCHER_CLAIMED,0,0`)

  assert.equal(rows.length, 2)
  assert.equal(rows[0].line, 2)
  assert.equal(rows[0].guestEmail, 'vania.schutz@genskeadvogados.com.br')
  assert.equal(rows[0].amountSpent, 32.3)
  assert.equal(rows[0].ordersTrips, 1)
})

test('uber reconciliation reports rides without collaborator submission', () => {
  const rows = parseUberVoucherCsv(`Creation Date,Voucher Link,Guest Name,Guest Email,Guest Phone,Voucher Status,Amount Spent,Orders/Trips
2026-08-03 18:46:10.776 -0300 -03,https://r.uber.com/RYWKWHVEEWY,Vania Schutz,vania.schutz@genskeadvogados.com.br,,VOUCHER_CLAIMED,32.30,1
2026-08-03 18:46:10.77 -0300 -03,https://r.uber.com/RFVBPFYQQFQ,Fabia David,fabia.david@genskeadvogados.com.br,,VOUCHER_CLAIMED,0,0
2026-08-03 18:46:10.794 -0300 -03,https://r.uber.com/RVESJYVGSCH,Denys,denys.valinhos@genskeadvogados.com.br,,VOUCHER_CLAIMED,18.90,1`)

  const reconciled = reconcileUberRows(rows, [
    { id: 'expense-1', collaboratorEmail: 'vania.schutz@genskeadvogados.com.br', amount: 32.3 },
  ])

  assert.equal(reconciled[0].reconciliationStatus, 'conciliado')
  assert.equal(reconciled[1].reconciliationStatus, 'sem_corrida')
  assert.equal(reconciled[2].reconciliationStatus, 'sem_lancamento')
})

test('uber reconciliation ignores rejected collaborator submissions', () => {
  const rows = parseUberVoucherCsv(`Creation Date,Voucher Link,Guest Name,Guest Email,Guest Phone,Voucher Status,Amount Spent,Orders/Trips
2026-08-04 09:12:00 -0300,https://r.uber.com/R1,Marina,marina@genskeadvogados.com.br,,VOUCHER_CLAIMED,41,1`)

  const reconciled = reconcileUberRows(rows, [
    { id: 'expense-rejected', collaboratorEmail: 'marina@genskeadvogados.com.br', amount: 41, status: 'rejeitado' },
  ])

  assert.equal(reconciled[0].matchedExpenseId, null)
  assert.equal(reconciled[0].reconciliationStatus, 'sem_lancamento')
})

test('uber reconciliation consumes one matching expense per report ride', () => {
  const rows = parseUberVoucherCsv(`Creation Date,Voucher Link,Guest Name,Guest Email,Guest Phone,Voucher Status,Amount Spent,Orders/Trips
2026-08-04 09:12:00 -0300,https://r.uber.com/R1,Denys,denys@genskeadvogados.com.br,,VOUCHER_CLAIMED,22.50,1
2026-08-04 10:18:00 -0300,https://r.uber.com/R2,Denys,denys@genskeadvogados.com.br,,VOUCHER_CLAIMED,22.50,1`)

  const reconciled = reconcileUberRows(rows, [
    { id: 'expense-1', collaboratorEmail: 'denys@genskeadvogados.com.br', amount: 22.5 },
  ])

  assert.equal(reconciled[0].matchedExpenseId, 'expense-1')
  assert.equal(reconciled[0].reconciliationStatus, 'conciliado')
  assert.equal(reconciled[1].matchedExpenseId, null)
  assert.equal(reconciled[1].reconciliationStatus, 'sem_lancamento')
})
