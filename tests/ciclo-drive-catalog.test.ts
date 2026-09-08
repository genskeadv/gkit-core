import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseCicloDriveFileName,
  parseCicloDrivePath,
  resolveCicloDriveDocumentType,
  suggestCicloDriveFileName,
} from '@/features/ciclo/drive-catalog'

test('parses canonical Ciclo Drive file names', () => {
  const parsed = parseCicloDriveFileName('12345678000199_condominio-alfa__contrato__2027-12-31.pdf')

  assert.equal(parsed.ok, true)
  assert.equal(parsed.documentoCliente, '12345678000199')
  assert.equal(parsed.clienteSlug, 'condominio-alfa')
  assert.equal(parsed.tipoDocumento, 'contrato')
  assert.equal(parsed.dataVencimento, '2027-12-31')
  assert.equal(parsed.extensao, 'pdf')
})

test('accepts document type aliases and keeps canonical type', () => {
  const parsed = parseCicloDriveFileName('12345678000199_alpha__cartao-do-cnpj__sem-vencimento.PDF')

  assert.equal(parsed.ok, true)
  assert.equal(parsed.tipoDocumento, 'cartao_cnpj')
  assert.equal(parsed.semVencimento, true)
  assert.equal(parsed.canonicalName, '12345678000199_alpha__cartao-cnpj__sem-vencimento.pdf')
})

test('reports invalid file names without guessing unsafe fields', () => {
  const parsed = parseCicloDriveFileName('contrato_alpha_31-12-2027.pdf')

  assert.equal(parsed.ok, false)
  assert.equal(parsed.documentoCliente, null)
  assert.equal(parsed.tipoDocumento, null)
  assert.match(parsed.errors.join(','), /padrao_cliente_tipo_data_incompleto/)
})

test('validates ISO calendar dates', () => {
  const parsed = parseCicloDriveFileName('12345678000199_alpha__contrato__2027-02-29.pdf')

  assert.equal(parsed.ok, false)
  assert.match(parsed.errors.join(','), /data_vencimento_invalida/)
})

test('suggests canonical Ciclo Drive file names', () => {
  assert.equal(
    suggestCicloDriveFileName({
      clienteDocumento: '12.345.678/0001-99',
      clienteNome: 'Condomínio Alfa',
      dataVencimento: '2027-12-31',
      tipoDocumento: 'ata_eleicao',
    }),
    '12345678000199_condominio-alfa__ata-eleicao__2027-12-31.pdf',
  )
})

test('resolves known type aliases', () => {
  assert.equal(resolveCicloDriveDocumentType('cpf-do-sindico'), 'cpf_sindico')
  assert.equal(resolveCicloDriveDocumentType('cadastro_unidade'), 'cadastro_unidade')
})

test('parses current Drive folders as a fallback', () => {
  const parsed = parseCicloDrivePath('CONDOMINIO ALPHA STAY - 22.191.0480001-67/1. CNPJ/CNPJ Alpha stay.pdf')

  assert.equal(parsed.ok, true)
  assert.equal(parsed.documentoCliente, '22191048000167')
  assert.equal(parsed.clienteSlug, 'condominio-alpha-stay')
  assert.equal(parsed.tipoDocumento, 'cartao_cnpj')
  assert.equal(parsed.semVencimento, true)
})

test('parses numbered onboarding folders with accented names', () => {
  const parsed = parseCicloDrivePath('CONDOMINIO ALPHA STAY - 22.191.0480001-67/2. Ata de eleicao/ATA Eleição de síndico.pdf')

  assert.equal(parsed.ok, true)
  assert.equal(parsed.tipoDocumento, 'ata_eleicao')
})
