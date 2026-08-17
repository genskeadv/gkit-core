import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyGkitJurProcessNature } from '../features/gkit-jur/process-nature'

test('classifies DataJud execution class as extrajudicial execution', () => {
  const result = classifyGkitJurProcessNature({
    classeNome: 'Execução de Título Extrajudicial',
    assuntos: [{ nome: 'Obrigações' }],
  })

  assert.equal(result.tipo, 'execucao_titulo_extrajudicial')
  assert.equal(result.confianca, 'alta')
})

test('classifies DataJud sentence enforcement class', () => {
  const result = classifyGkitJurProcessNature({
    classeNome: 'Cumprimento de Sentença',
  })

  assert.equal(result.tipo, 'cumprimento_sentenca')
  assert.equal(result.confianca, 'alta')
})

test('uses DataJud subjects and title to identify condominium collection', () => {
  const result = classifyGkitJurProcessNature({
    assuntos: [{ nome: 'Despesas Condominiais' }],
    classeNome: 'Procedimento Comum Cível',
    titulo: 'Condomínio Edifício Exemplo x Unidade inadimplente',
  })

  assert.equal(result.tipo, 'cobranca_condominial')
  assert.equal(result.confianca, 'media')
})

test('keeps generic civil procedure as low confidence knowledge case', () => {
  const result = classifyGkitJurProcessNature({
    classeNome: 'Procedimento Comum Cível',
    assuntos: [{ nome: 'Responsabilidade Civil' }],
  })

  assert.equal(result.tipo, 'conhecimento_civel')
  assert.equal(result.confianca, 'baixa')
})

