import assert from 'node:assert/strict'
import test from 'node:test'
import * as XLSX from 'xlsx'
import { parsePayablesWorkbook } from '@/features/gkit-flex/contas-pagar/payableProcessor'

function workbookFile(rows: unknown[][], filename = 'extrato.xlsx') {
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  XLSX.utils.book_append_sheet(workbook, sheet, 'Extrato')
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return new File([buffer], filename, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

test('payable bank statement parser preserves decimal-dot amounts and statement categories', async () => {
  const file = workbookFile([
    ['Data Lancamento', 'Descricao', 'Valor', 'Categoria', 'Centro'],
    ['6/8/26', 'Pix enviado: motoboy', '-112.95', 'Servico de motoboy', 'Operacional'],
    ['6/30/26', 'Pagamento aluguel', '-3774.48', 'Aluguel', 'Estrutura'],
    ['6/30/26', 'Pix recebido', '510', 'Receita', 'Operacional'],
  ])

  const rows = await parsePayablesWorkbook(file)

  assert.equal(rows.length, 2)
  assert.equal(rows[0].vencimentoDia, 8)
  assert.equal(rows[0].valorPrevisto, 112.95)
  assert.equal(rows[0].categoria, 'Servico de motoboy')
  assert.equal(rows[0].centro, 'Operacional')
  assert.equal(rows[1].vencimentoDia, 30)
  assert.equal(rows[1].valorPrevisto, 3774.48)
  assert.equal(rows[1].categoria, 'Aluguel')
  assert.equal(rows[1].centro, 'Estrutura')
})

