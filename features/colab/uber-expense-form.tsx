'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { CalendarDays, FileCheck2, FileText, ImageIcon, ReceiptText, UploadCloud, WalletCards, X } from 'lucide-react'
import type { ColabUberClientOption } from '@/features/colab/types'

type ReceiptPreview = {
  name: string
  size: string
  type: string
  url: string | null
}

type ColabUberExpenseFormProps = {
  action: (formData: FormData) => Promise<void>
  clients: ColabUberClientOption[]
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

export function ColabUberExpenseForm({ action, clients }: ColabUberExpenseFormProps) {
  const [receipt, setReceipt] = useState<ReceiptPreview | null>(null)
  const defaultDate = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const receiptInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (receipt?.url) URL.revokeObjectURL(receipt.url)
    }
  }, [receipt])

  function handleReceiptChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setReceipt((current) => {
      if (current?.url) URL.revokeObjectURL(current.url)

      if (!file) return null

      return {
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type || 'Arquivo',
        url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      }
    })
  }

  function clearReceipt() {
    if (receiptInputRef.current) {
      receiptInputRef.current.value = ''
    }
    setReceipt((current) => {
      if (current?.url) URL.revokeObjectURL(current.url)
      return null
    })
  }

  return (
    <form action={action} className="colab-uber-form colab-uber-flow">
      <section className="colab-uber-step colab-uber-step-main">
        <header>
          <span>1</span>
          <div>
            <strong>Dados da corrida</strong>
            <small>Cliente, data e valor do reembolso.</small>
          </div>
        </header>
        <div className="colab-uber-step-grid">
          <label className="colab-uber-field colab-uber-field-client">
            <span>Cliente Ciclo</span>
            <select name="cliente_id" required>
              <option value="">Selecione</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.label}{client.meta ? ` - ${client.meta}` : ''}</option>
              ))}
            </select>
          </label>
          <label className="colab-uber-field">
            <span>Data</span>
            <div className="colab-uber-input-shell">
              <CalendarDays aria-hidden="true" size={17} strokeWidth={2.2} />
              <input name="data_despesa" type="date" defaultValue={defaultDate} required />
            </div>
          </label>
          <label className="colab-uber-field">
            <span>Valor</span>
            <div className="colab-uber-input-shell">
              <WalletCards aria-hidden="true" size={17} strokeWidth={2.2} />
              <input name="valor" inputMode="decimal" placeholder="0,00" required />
            </div>
          </label>
        </div>
      </section>

      <section className="colab-uber-step colab-uber-step-description">
        <header>
          <span>2</span>
          <div>
            <strong>Contexto</strong>
            <small>Descreva a finalidade da corrida.</small>
          </div>
        </header>
        <label className="colab-uber-field">
          <span>Descrição</span>
          <textarea name="descricao" rows={3} placeholder="Ex.: ida ao cliente para assembleia / protocolo / reunião" required />
        </label>
      </section>

      <section className="colab-uber-step colab-uber-step-receipt">
        <header>
          <span>3</span>
          <div>
            <strong>Recibo</strong>
            <small>Anexe o comprovante emitido pela Uber.</small>
          </div>
        </header>
        <label className="colab-uber-dropzone">
          <input ref={receiptInputRef} name="recibo" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={handleReceiptChange} required />
          <span className="colab-uber-dropzone-icon">
            <ReceiptText aria-hidden="true" size={21} strokeWidth={2.2} />
          </span>
          <strong>{receipt ? 'Recibo selecionado' : 'Anexar recibo da Uber'}</strong>
          <small>PDF, JPG, PNG ou WebP</small>
        </label>
        {receipt ? (
          <div className="colab-receipt-preview">
            <div className="colab-receipt-preview-media">
              {receipt.url ? (
                <img alt="Prévia do recibo anexado" src={receipt.url} />
              ) : (
                <FileText aria-hidden="true" size={28} strokeWidth={2} />
              )}
            </div>
            <div>
              <span>
                {receipt.url ? <ImageIcon aria-hidden="true" size={15} strokeWidth={2.2} /> : <FileCheck2 aria-hidden="true" size={15} strokeWidth={2.2} />}
                {receipt.type}
              </span>
              <strong>{receipt.name}</strong>
              <small>{receipt.size}</small>
            </div>
            <button aria-label="Remover recibo selecionado" onClick={clearReceipt} type="button">
              <X aria-hidden="true" size={16} strokeWidth={2.2} />
            </button>
          </div>
        ) : null}
      </section>

      <div className="colab-uber-actions colab-uber-submit-bar">
        <button className="button" type="submit">
          <UploadCloud aria-hidden="true" size={17} strokeWidth={2.2} />
          Enviar despesa
        </button>
      </div>
    </form>
  )
}
