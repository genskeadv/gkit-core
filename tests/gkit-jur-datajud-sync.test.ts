import assert from 'node:assert/strict'
import test from 'node:test'
import { bestHit, processUpdatePayload } from '../features/gkit-jur/datajud-sync'

test('fallback refuses to assign another CNJ returned by a broad search', () => {
  assert.equal(bestHit({ hits: { hits: [{ _source: { numeroProcesso: '222', grau: 'G1' } }] } }, '111'), null)
})

test('fallback prefers first instance only among exact CNJ matches', () => {
  const correct = { _source: { numeroProcesso: '111', grau: 'G1' } }
  assert.equal(bestHit({ hits: { hits: [{ _source: { numeroProcesso: '222', grau: 'G1' } },
    { _source: { numeroProcesso: '111', grau: 'G2' } }, correct] } }, '111'), correct)
})

test('fallback accepts masked CNJs while preserving exact identity', () => {
  const correct = { _source: { numeroProcesso: '0000001-11.2026.8.26.0100', grau: 'G1' } }
  assert.equal(bestHit({ hits: { hits: [correct] } }, '00000011120268260100'), correct)
})

test('preserves the stored filing date when DataJud omits it', () => {
  const payload = processUpdatePayload({
    _id: 'datajud-id',
    _source: {
      classe: {},
      orgaoJulgador: {},
    },
  }, [])

  assert.equal(Object.hasOwn(payload, 'data_ajuizamento'), false)
})

test('updates the filing date when DataJud returns a valid value', () => {
  const payload = processUpdatePayload({
    _id: 'datajud-id',
    _source: {
      classe: {},
      dataAjuizamento: '2026-08-05T00:00:00Z',
      orgaoJulgador: {},
    },
  }, [])

  assert.equal(payload.data_ajuizamento, '2026-08-05T00:00:00.000Z')
})
