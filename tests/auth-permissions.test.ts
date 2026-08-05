import assert from 'node:assert/strict'
import test from 'node:test'
import { canAccess } from '@/lib/auth/permissions'

test('canAccess allows exact and global permissions', () => {
  assert.equal(canAccess(['admin.usuarios.read'], 'admin.usuarios.read'), true)
  assert.equal(canAccess(['*'], 'gkit_flex.uber.write'), true)
})

test('canAccess allows module wildcard permissions', () => {
  assert.equal(canAccess(['gkit_flex.*'], 'gkit_flex.uber.read'), true)
  assert.equal(canAccess(['gkit_flex.*'], 'gkit_flex.uber.write'), true)
})

test('canAccess treats write permission as enough for read actions', () => {
  assert.equal(canAccess(['gkit_flex.uber.write'], 'gkit_flex.uber.read'), true)
  assert.equal(canAccess(['gkit_flex.uber.read'], 'gkit_flex.uber.write'), false)
})
