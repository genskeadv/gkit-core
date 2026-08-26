import assert from 'node:assert/strict'
import test from 'node:test'
import { firstDayDueText } from '@/features/gkit-flex/previsoes/forecastPersistence'

test('automatic collaborator forecasts are due on the first day of their payment month', () => {
  assert.equal(firstDayDueText('2026-09-01'), '01/09/2026')
  assert.equal(firstDayDueText('2027-01-01'), '01/01/2027')
})
