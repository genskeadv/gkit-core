'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'

type MonthStatus = 'aberto' | 'fechado' | 'nao_aberto'

type SummaryRow = {
  categoria: string
  carteira: string
  quantidadeLancamentos: number
  valorRecebido: number
  valorAposReducao: number
  comissaoFinal: number
}

type ReceitaPreview = {
  arquivo: string
  competencia: string
  resumo: SummaryRow[]
  totals: { valorRecebido: number; valorAposReducao: number; comissaoFinal: number }
  auditCount: number
  executionId?: string | null
  saved?: boolean
  warning?: string | null
}

type CompetenciaStatus = {
  configured?: boolean
  status: MonthStatus
  canProcess: boolean
}

function currentMonthValue() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function competenciaDate(value: string) {
  return `${value}-01`
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { currency: 'BRL', style: 'currency' }).format(value || 0)
}

function statusLabel(status?: MonthStatus) {
  if (status === 'aberto') return 'Aberta'
  if (status === 'fechado') return 'Fechada'
  return 'Não aberta'
}

export function ImportarReceitasForm() {
  const [pending, startTransition] = useTransition()
  const [competencia, setCompetencia] = useState(currentMonthValue())
  const [status, setStatus] = useState<CompetenciaStatus | null>(null)
  const [preview, setPreview] = useState<ReceitaPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [previewedFile, setPreviewedFile] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const competenciaParam = useMemo(() => competenciaDate(competencia), [competencia])
  const canProcess = status?.canProcess === true

  useEffect(() => {
    let active = true
    setStatus(null)
    setPreview(null)
    setSuccess(null)
    setError(null)

    fetch(`/api/gkit-flex/comissoes/competencia?competencia=${encodeURIComponent(competenciaParam)}`)
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Não foi possível consultar a competência.')
        if (active) setStatus(payload)
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Não foi possível consultar a competência.')
      })

    return () => {
      active = false
    }
  }, [competenciaParam])

  function getFormData() {
    const file = fileRef.current?.files?.[0]
    if (!file) throw new Error('Selecione a planilha de receitas.')
    const formData = new FormData()
    formData.set('contasReceber', file)
    formData.set('competencia', competenciaParam)
    return { fileKey: `${file.name}:${file.size}:${file.lastModified}`, formData }
  }

  function onFileChange() {
    setPreview(null)
    setError(null)
    setSuccess(null)
    setPreviewedFile(null)
  }

  function updateCompetencia(value: string) {
    setCompetencia(value)
    setPreviewedFile(null)
  }

  function updateMonth(action: 'abrir' | 'reabrir') {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      try {
        const response = await fetch('/api/gkit-flex/comissoes/competencia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ competencia: competenciaParam, action }),
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Não foi possível atualizar a competência.')
        setStatus(payload)
        setSuccess(action === 'abrir' ? 'Competência aberta para receitas.' : 'Competência reaberta para receitas.')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Não foi possível atualizar a competência.')
      }
    })
  }

  function submit(action: 'preview' | 'save') {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      try {
        const { fileKey, formData } = getFormData()
        if (action === 'save' && fileKey !== previewedFile) {
          setPreview(null)
          setError('O arquivo mudou depois do preview. Gere a pré-visualização novamente.')
          return
        }

        formData.set('action', action)
        const response = await fetch('/api/gkit-flex/comissoes/calcular', { method: 'POST', body: formData })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error || (action === 'preview' ? 'Não foi possível gerar a prévia.' : 'Não foi possível gravar a receita.'))
        }

        setPreview(payload)
        setPreviewedFile(fileKey)
        setSuccess(action === 'preview'
          ? 'Prévia de receitas gerada.'
          : payload.warning || 'Receita gravada e disponível na regularidade.')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro na importação de receitas.')
      }
    })
  }

  return (
    <div className="ciclo-import-box ciclo-receita-import">
      <div className="ciclo-receita-toolbar">
        <label>
          <span>Competência</span>
          <input className="input" type="month" value={competencia} onChange={(event) => updateCompetencia(event.target.value)} />
        </label>
        <span className={`ciclo-pill ${canProcess ? 'success' : status?.status === 'fechado' ? 'danger' : 'warning'}`}>
          {statusLabel(status?.status)}
        </span>
        {status?.status === 'nao_aberto' ? (
          <button className="button secondary" disabled={pending} onClick={() => updateMonth('abrir')} type="button">Abrir competência</button>
        ) : null}
        {status?.status === 'fechado' ? (
          <button className="button secondary" disabled={pending} onClick={() => updateMonth('reabrir')} type="button">Reabrir competência</button>
        ) : null}
      </div>

      <input
        ref={fileRef}
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="input"
        name="contasReceber"
        onChange={onFileChange}
        type="file"
      />

      <div className="form-actions">
        <button className="button secondary" disabled={pending || !canProcess} onClick={() => submit('preview')} type="button">
          {pending ? 'Validando...' : 'Gerar prévia'}
        </button>
        <button className="button" disabled={pending || !canProcess || !preview?.resumo.length} onClick={() => submit('save')} type="button">
          {pending ? 'Gravando...' : 'Gravar receita'}
        </button>
      </div>

      {error ? <div className="suite-empty-block danger">{error}</div> : null}
      {success ? <div className="suite-empty-block success">{success}</div> : null}

      {preview ? (
        <section className="ciclo-import-preview">
          <div className="ciclo-import-stats">
            <span>Receita <strong>{formatMoney(preview.totals.valorRecebido)}</strong></span>
            <span>Base <strong>{formatMoney(preview.totals.valorAposReducao)}</strong></span>
            <span>Comissões <strong>{formatMoney(preview.totals.comissaoFinal)}</strong></span>
            <span>Linhas <strong>{preview.resumo.reduce((total, row) => total + row.quantidadeLancamentos, 0)}</strong></span>
            <span>Apontamentos <strong>{preview.auditCount}</strong></span>
            <span>Arquivo <strong>{preview.arquivo}</strong></span>
          </div>

          {preview.resumo.length ? (
            <div className="ciclo-receita-preview-table">
              <table>
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Carteira</th>
                    <th>Lançamentos</th>
                    <th>Receita</th>
                    <th>Comissão</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.resumo.map((row, index) => (
                    <tr key={`${row.categoria}-${row.carteira}-${index}`}>
                      <td>{row.categoria}</td>
                      <td>{row.carteira}</td>
                      <td>{row.quantidadeLancamentos}</td>
                      <td>{formatMoney(row.valorRecebido)}</td>
                      <td>{formatMoney(row.comissaoFinal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
