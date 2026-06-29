import assert from 'node:assert/strict'
import test from 'node:test'
import { isRetiredModuleCode, isRetiredModulePath, RETIRED_MODULE_CODES } from '@/lib/auth/retired-modules'

test('retired module codes include the removed legacy modules', () => {
  assert.deepEqual([...RETIRED_MODULE_CODES].sort(), ['crm', 'din', 'fix', 'flex', 'intr'])
})

test('retired module paths are detected for root and nested module routes', () => {
  assert.equal(isRetiredModulePath('/modulos/crm'), true)
  assert.equal(isRetiredModulePath('/modulos/flex/financeiro'), true)
  assert.equal(isRetiredModulePath('/modulos/intr/pagamentos/novo'), true)
})

test('active canonical module paths are not treated as retired', () => {
  assert.equal(isRetiredModuleCode('gkit_flex'), false)
  assert.equal(isRetiredModulePath('/modulos/gkit-flex'), false)
  assert.equal(isRetiredModulePath('/modulos/gkit-jur'), false)
  assert.equal(isRetiredModulePath('/modulos/gkit-new/oportunidades'), false)
  assert.equal(isRetiredModulePath('/modulos/ciclo/clientes'), false)
})
