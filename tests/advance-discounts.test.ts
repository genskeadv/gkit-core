import assert from 'node:assert/strict'
import test from 'node:test'
import { applyAdvanceDiscounts, isAdvanceCategory, isFirstDayPayment } from '@/features/gkit-flex/adiantamentos'

test('advance category and first-day payments are detected', () => {
  assert.equal(isAdvanceCategory('Adiantamento'), true)
  assert.equal(isAdvanceCategory('Outros Benefícios'), false)
  assert.equal(isFirstDayPayment({ vencimento_dia: 1, vencimento_texto: '01/09/2026' }), true)
  assert.equal(isFirstDayPayment({ vencimento_dia: 15, vencimento_texto: '15/09/2026' }), false)
})

test('paid advances reduce the collaborator payment due on the first day', () => {
  const [result] = applyAdvanceDiscounts(
    [{
      descricao: 'Colaborador - Aline Conrado',
      matchName: 'Aline Conrado',
      categoria: 'Colaboradores',
      vencimento_dia: 1,
      vencimento_texto: '01/09/2026',
      valor_previsto: 9000,
    }],
    [{
      id: 'advance-1',
      descricao: 'Pix enviado: "Cp :60701190-Aline Conrado de Souza"',
      categoria: 'Adiantamento',
      valor_previsto: 1800,
      pago: true,
    }],
  )

  assert.equal(result.originalValue, 9000)
  assert.equal(result.advanceApplied, 1800)
  assert.equal(result.discountedValue, 7200)
  assert.deepEqual(result.advanceSourceIds, ['advance-1'])
})

test('paid advances can match a collaborator alias', () => {
  const [result] = applyAdvanceDiscounts(
    [{
      descricao: 'Colaborador - Marina Figueiredo',
      matchName: 'Marina Figueiredo Marina Araujo',
      categoria: 'Colaboradores',
      vencimento_dia: 1,
      vencimento_texto: '01/09/2026',
      valor_previsto: 1809,
    }],
    [{
      id: 'advance-alias',
      descricao: 'Pix enviado: "00019 284271322 MARINA ARAUJO"',
      categoria: 'Adiantamento',
      valor_previsto: 1000,
      pago: true,
    }],
  )

  assert.equal(result.advanceApplied, 1000)
  assert.equal(result.discountedValue, 809)
  assert.deepEqual(result.advanceSourceIds, ['advance-alias'])
})

test('advance discounts are distributed across multiple first-day rows for the same person', () => {
  const results = applyAdvanceDiscounts(
    [
      {
        descricao: 'Pix enviado: "Cp :18236120-Isabella Mariah Oliveira Menezes"',
        categoria: 'Outros Benefícios',
        vencimento_dia: 1,
        vencimento_texto: '01/09/2026',
        valor_previsto: 1750,
      },
      {
        descricao: 'Pix enviado: "Cp :18236120-Isabella Mariah Oliveira Menezes"',
        categoria: 'Outros Benefícios',
        vencimento_dia: 1,
        vencimento_texto: '01/09/2026',
        valor_previsto: 1440.89,
      },
    ],
    [{
      id: 'advance-2',
      descricao: 'Pix enviado: "Cp :18236120-Isabella Mariah Oliveira Menezes"',
      categoria: 'Adiantamento',
      valor_previsto: 1800,
      pago: true,
    }],
  )

  assert.equal(results[0].advanceApplied, 1750)
  assert.equal(results[0].discountedValue, 0)
  assert.equal(results[1].advanceApplied, 50)
  assert.equal(results[1].discountedValue, 1390.89)
})

test('unpaid advances and non-first-day targets are ignored', () => {
  const results = applyAdvanceDiscounts(
    [{
      descricao: 'Colaborador - Aline Conrado',
      matchName: 'Aline Conrado',
      categoria: 'Colaboradores',
      vencimento_dia: 5,
      vencimento_texto: '05/09/2026',
      valor_previsto: 9000,
    }],
    [{
      id: 'advance-3',
      descricao: 'Aline Conrado',
      categoria: 'Adiantamento',
      valor_previsto: 1800,
      pago: true,
    }],
  )

  assert.equal(results[0].advanceApplied, 0)
  assert.equal(results[0].discountedValue, 9000)
})
