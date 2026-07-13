import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as XLSX from 'xlsx';
import { processCommissionWithClients } from '../features/gkit-flex/comissoes/commissionProcessor';

function workbookBuffer(rows: unknown[][]): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, 'financas');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

test('commission processor prioritizes receivable seller over Ciclo/Core carteira', () => {
  const receivables = workbookBuffer([
    ['Cliente (Nome Fantasia)', 'Cliente (CNPJ/CPF)', 'Categoria', 'Situação', 'Valor Líquido', 'Vendedor'],
    ['CONDOMINIO TESTE', '12.345.678/0001-90', 'Mensalidade de Assessoria Jurídica', 'Recebido', 1000, 'Carteira Fabia_Caio'],
  ]);
  const clients = [
    {
      'Razao Social / Nome Completo': 'CONDOMINIO TESTE',
      'CNPJ/CPF': '12.345.678/0001-90',
      'Vendedor padrao': 'Genske Advogados',
    },
  ];

  const result = processCommissionWithClients(receivables, clients);

  assert.equal(result.auditRows.length, 0);
  assert.equal(result.summaries.length, 1);
  assert.equal(result.summaries[0].carteira, 'Carteira Fabia_Caio');
  assert.equal(result.enrichedRows[0].vendedor, 'Carteira Fabia_Caio');
  assert.equal(result.enrichedRows[0].observacao, '');
});
