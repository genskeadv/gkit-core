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

test('commission processor records receipt punctuality from due date and last receipt date', () => {
  const receivables = workbookBuffer([
    ['Cliente (Nome Fantasia)', 'Cliente (CNPJ/CPF)', 'Categoria', 'Situacao', 'Valor Liquido', 'Vencimento', 'Previsao de Recebimento', 'Ultimo Recebimento', 'Vendedor'],
    ['CLIENTE EM DIA', '55.555.555/0001-55', 'Mensalidade de Assessoria Juridica', 'Recebido', 1000, '10/08/2026', '20/08/2026', '10/08/2026', 'Carteira Fabia_Caio'],
    ['CLIENTE ATRASADO', '66.666.666/0001-66', 'Mensalidade de Assessoria Juridica', 'Recebido', 1000, '10/08/2026', '10/08/2026', '15/08/2026', 'Carteira Fabia_Caio'],
  ]);
  const clients = [
    {
      'Razao Social / Nome Completo': 'CLIENTE EM DIA',
      'CNPJ/CPF': '55.555.555/0001-55',
      'Vendedor padrao': 'Carteira Fabia_Caio',
    },
    {
      'Razao Social / Nome Completo': 'CLIENTE ATRASADO',
      'CNPJ/CPF': '66.666.666/0001-66',
      'Vendedor padrao': 'Carteira Fabia_Caio',
    },
  ];

  const result = processCommissionWithClients(receivables, clients);

  assert.equal(result.enrichedRows.length, 2);
  assert.deepEqual(
    result.enrichedRows.map((row) => [row.vencimentoEm, row.recebidoEm, row.pontualidadeStatus, row.diasAtraso]),
    [
      ['2026-08-10', '2026-08-10', 'em_dia', 0],
      ['2026-08-10', '2026-08-15', 'atrasado', 5],
    ],
  );
});

test('commission processor applies Aline_Lidiane wallet override after reduction', () => {
  const receivables = workbookBuffer([
    ['Cliente (Nome Fantasia)', 'Cliente (CNPJ/CPF)', 'Categoria', 'Situacao', 'Valor Liquido', 'Vendedor'],
    ['CLIENTE ALINE', '11.111.111/0001-11', 'Mensalidade de Assessoria Juridica', 'Recebido', 1800, 'Carteira Aline_Lidiane'],
  ]);
  const clients = [
    {
      'Razao Social / Nome Completo': 'CLIENTE ALINE',
      'CNPJ/CPF': '11.111.111/0001-11',
      'Vendedor padrao': 'Carteira Aline_Lidiane',
    },
  ];

  const result = processCommissionWithClients(receivables, clients);

  assert.equal(result.summaries.length, 1);
  assert.equal(result.summaries[0].valorAposReducao, 1548);
  assert.equal(result.summaries[0].percentualComissao, 1);
  assert.equal(result.summaries[0].comissaoFinal, 1548);
});

test('commission processor applies Vania_Lidiane wallet override after reduction', () => {
  const receivables = workbookBuffer([
    ['Cliente (Nome Fantasia)', 'Cliente (CNPJ/CPF)', 'Categoria', 'Situacao', 'Valor Liquido', 'Vendedor'],
    ['CLIENTE VANIA', '33.333.333/0001-33', 'Mensalidade de Assessoria Juridica', 'Recebido', 1000, 'Carteira Vania_Lidiane'],
  ]);
  const clients = [
    {
      'Razao Social / Nome Completo': 'CLIENTE VANIA',
      'CNPJ/CPF': '33.333.333/0001-33',
      'Vendedor padrao': 'Carteira Vania_Lidiane',
    },
  ];

  const result = processCommissionWithClients(receivables, clients);

  assert.equal(result.summaries[0].valorAposReducao, 860);
  assert.equal(result.summaries[0].percentualComissao, 1);
  assert.equal(result.summaries[0].comissaoFinal, 860);
  assert.equal(result.summaries[0].carteira, 'Carteira Vania_Lidiane');
  assert.deepEqual(
    result.collaboratorSummaries.map((row) => [row.colaborador, row.percentualRateio, row.comissaoFinal]),
    [
      ['Lidiane', 0.5, 430],
      ['Vania', 0.5, 430],
    ],
  );
});

test('commission processor canonicalizes old Vania wallet name before applying override', () => {
  const receivables = workbookBuffer([
    ['Cliente (Nome Fantasia)', 'Cliente (CNPJ/CPF)', 'Categoria', 'Situacao', 'Valor Liquido', 'Vendedor'],
    ['CLIENTE VANIA ANTIGA', '44.444.444/0001-44', 'Mensalidade de Assessoria Juridica', 'Recebido', 1000, 'Carteira_Vania'],
  ]);
  const clients = [
    {
      'Razao Social / Nome Completo': 'CLIENTE VANIA ANTIGA',
      'CNPJ/CPF': '44.444.444/0001-44',
      'Vendedor padrao': 'Carteira_Vania',
    },
  ];

  const result = processCommissionWithClients(receivables, clients);

  assert.equal(result.summaries[0].carteira, 'Carteira Vania_Lidiane');
  assert.equal(result.summaries[0].comissaoFinal, 860);
});

test('commission processor splits wallet commission by collaborator names', () => {
  const receivables = workbookBuffer([
    ['Cliente (Nome Fantasia)', 'Cliente (CNPJ/CPF)', 'Categoria', 'Situacao', 'Valor Liquido', 'Vendedor'],
    ['CONDOMINIO DUPLA', '22.222.222/0001-22', 'Mensalidade de Assessoria Juridica', 'Recebido', 1000, 'Carteira Fabia_Caio'],
  ]);
  const clients = [
    {
      'Razao Social / Nome Completo': 'CONDOMINIO DUPLA',
      'CNPJ/CPF': '22.222.222/0001-22',
      'Vendedor padrao': 'Carteira Fabia_Caio',
    },
  ];

  const result = processCommissionWithClients(receivables, clients);

  assert.equal(result.summaries[0].comissaoFinal, 12.9);
  assert.equal(result.collaboratorSummaries.length, 2);
  assert.deepEqual(
    result.collaboratorSummaries.map((row) => [row.colaborador, row.percentualRateio, row.comissaoFinal]),
    [
      ['Caio', 0.5, 6.45],
      ['Fabia', 0.5, 6.45],
    ],
  );
});
