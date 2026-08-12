'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { CalendarDays, CarFront, FileCheck2, FileText, Gauge, ImageIcon, ReceiptText, UploadCloud, WalletCards, X } from 'lucide-react'
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

const PRIVATE_VEHICLE_COST_PER_KM = 0.8

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

function parseDecimal(value: string) {
  const normalized = value.replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatMoneyInput(value: number) {
  if (!value) return ''
  return value.toFixed(2).replace('.', ',')
}

export function ColabUberExpenseForm({ action, clients }: ColabUberExpenseFormProps) {
  const [receipt, setReceipt] = useState<ReceiptPreview | null>(null)
  const [privateVehicle, setPrivateVehicle] = useState(false)
  const [kilometers, setKilometers] = useState('')
  const [amount, setAmount] = useState('')
  const defaultDate = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const receiptInputRef = useRef<HTMLInputElement>(null)
  const privateVehicleAmount = useMemo(() => {
    return Math.round(parseDecimal(kilometers) * PRIVATE_VEHICLE_COST_PER_KM * 100) / 100
  }, [kilometers])

  useEffect(() => {
    return () => {
      if (receipt?.url) URL.revokeObjectURL(receipt.url)
    }
  }, [receipt])

  useEffect(() => {
    if (privateVehicle) {
      clearReceipt()
      setAmount(formatMoneyInput(privateVehicleAmount))
    }
  }, [privateVehicle, privateVehicleAmount])

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
              <input
                inputMode="decimal"
                name="valor"
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0,00"
                readOnly={privateVehicle}
                required
                value={amount}
              />
            </div>
          </label>
          <label className="colab-uber-private-toggle">
            <input
              checked={privateVehicle}
              name="veiculo_proprio"
              onChange={(event) => {
                setPrivateVehicle(event.target.checked)
                if (!event.target.checked) {
                  setKilometers('')
                  setAmount('')
                }
              }}
              type="checkbox"
              value="on"
            />
            <span>
              <CarFront aria-hidden="true" size={17} strokeWidth={2.2} />
              Veiculo proprio
            </span>
          </label>
          {privateVehicle ? (
            <label className="colab-uber-field">
              <span>Quilometragem</span>
              <div className="colab-uber-input-shell">
                <Gauge aria-hidden="true" size={17} strokeWidth={2.2} />
                <input
                  inputMode="decimal"
                  min="0"
                  name="quilometragem"
                  onChange={(event) => setKilometers(event.target.value)}
                  placeholder="0"
                  required
                  type="text"
                  value={kilometers}
                />
              </div>
              <small>R$ 0,80 por km.</small>
            </label>
          ) : null}
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
            <strong>{privateVehicle ? 'Veiculo proprio' : 'Recibo'}</strong>
            <small>{privateVehicle ? 'Sem recibo obrigatorio para esse tipo de lancamento.' : 'Anexe o comprovante emitido pela Uber.'}</small>
          </div>
        </header>
        {privateVehicle ? (
          <div className="colab-uber-private-summary">
            <span className="colab-uber-dropzone-icon">
              <CarFront aria-hidden="true" size={21} strokeWidth={2.2} />
            </span>
            <strong>{kilometers ? `${kilometers.replace('.', ',')} km` : 'Informe a quilometragem'}</strong>
            <small>{privateVehicleAmount ? `Valor calculado: R$ ${formatMoneyInput(privateVehicleAmount)}` : 'O valor sera preenchido automaticamente.'}</small>
          </div>
        ) : (
          <label className="colab-uber-dropzone">
            <input ref={receiptInputRef} name="recibo" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={handleReceiptChange} required />
            <span className="colab-uber-dropzone-icon">
              <ReceiptText aria-hidden="true" size={21} strokeWidth={2.2} />
            </span>
            <strong>{receipt ? 'Recibo selecionado' : 'Anexar recibo da Uber'}</strong>
            <small>PDF, JPG, PNG ou WebP</small>
          </label>
        )}
        {!privateVehicle && receipt ? (
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
