import assert from 'node:assert/strict'
import test from 'node:test'
import * as XLSX from 'xlsx'
import { parsePayablesWorkbook } from '@/features/gkit-flex/contas-pagar/payableProcessor'

function workbookFile(rows: unknown[][], filename = 'extrato.xlsx') {
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  XLSX.utils.book_append_sheet(workbook, sheet, 'Extrato')
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return new File([new Uint8Array(buffer)], filename, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

function textFile(content: string, filename: string, type = 'text/plain') {
  return new File([content], filename, { type })
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

test('payable parser imports OFX debits and ignores credits', async () => {
  const file = textFile(`OFXHEADER:100
DATA:OFXSGML
VERSION:102

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>CREDIT</TRNTYPE>
<DTPOSTED>20260730</DTPOSTED>
<TRNAMT>25478.29</TRNAMT>
<FITID>credit-1</FITID>
<MEMO>Pix recebido</MEMO>
<NAME>Cliente</NAME>
</STMTTRN>
<STMTTRN>
<TRNTYPE>PAYMENT</TRNTYPE>
<DTPOSTED>20260730</DTPOSTED>
<TRNAMT>-542.04</TRNAMT>
<FITID>debit-1</FITID>
<MEMO>Pix enviado: "TELEFONICA BRAS"</MEMO>
<NAME>Telefonica Bras</NAME>
</STMTTRN>
<STMTTRN>
<TRNTYPE>PAYMENT</TRNTYPE>
<DTPOSTED>20260707</DTPOSTED>
<TRNAMT>-34485.83</TRNAMT>
<FITID>debit-2</FITID>
<MEMO>Pix enviado: "RECEITA FEDERAL"</MEMO>
<NAME>Receita Federal</NAME>
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`, 'extrato.ofx', 'application/x-ofx')

  const rows = await parsePayablesWorkbook(file)

  assert.equal(rows.length, 2)
  assert.equal(rows[0].descricao, 'Pix enviado: "TELEFONICA BRAS"')
  assert.equal(rows[0].vencimentoDia, 30)
  assert.equal(rows[0].vencimentoTexto, '30/07/2026')
  assert.equal(rows[0].valorPrevisto, 542.04)
  assert.equal(rows[0].categoria, 'Sem categoria')
  assert.equal(rows[0].pago, true)
  assert.equal(rows[0].raw.origem_importacao, 'extrato_bancario_ofx')
  assert.equal(rows[1].descricao, 'Pix enviado: "RECEITA FEDERAL"')
  assert.equal(rows[1].vencimentoDia, 7)
  assert.equal(rows[1].valorPrevisto, 34485.83)
})
