'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { GkitNewSubmitButton } from '@/features/gkit-new/submit-button'
import type { GkitNewFormData, GkitNewOportunidadeRecord } from '@/features/gkit-new/types'

function moneyInput(value?: number | null) {
  return value ? String(value) : '0'
}

export function GkitNewOportunidadeForm({
  action,
  formData,
  oportunidade,
}: {
  action: (formData: FormData) => Promise<void>
  formData: GkitNewFormData
  oportunidade?: GkitNewOportunidadeRecord
}) {
  const [clienteId, setClienteId] = useState(oportunidade?.cliente_id ?? formData.clientes[0]?.id ?? '')
  const [contatoId, setContatoId] = useState(oportunidade?.contato_id ?? '')
  const contatoIds = useMemo(() => new Set(
    formData.clienteContatos
      .filter((vinculo) => vinculo.cliente_id === clienteId)
      .map((vinculo) => vinculo.contato_id),
  ), [clienteId, formData.clienteContatos])
  const contatos = formData.contatos.filter((contato) => contatoIds.has(contato.id))

  return (
    <form action={action} className="card module-form module-form-grid">
      {oportunidade ? <input type="hidden" name="id" value={oportunidade.id} /> : null}

      <label>
        <span>Cliente</span>
        <select
          name="cliente_id"
          required
          value={clienteId}
          onChange={(event) => {
            setClienteId(event.target.value)
            setContatoId('')
          }}
        >
          <option value="">Selecione</option>
          {formData.clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>{cliente.label}</option>
          ))}
        </select>
      </label>

      <label>
        <span>Contato</span>
        <select name="contato_id" required value={contatoId} onChange={(event) => setContatoId(event.target.value)}>
          <option value="">Selecione</option>
          {contatos.map((contato) => (
            <option key={contato.id} value={contato.id}>{contato.label}</option>
          ))}
        </select>
      </label>

      <label>
        <span>Data</span>
        <input name="data" required type="date" defaultValue={oportunidade?.data ?? new Date().toISOString().slice(0, 10)} />
      </label>

      <label>
        <span>Tipo</span>
        <select name="tipo" defaultValue={oportunidade?.tipo ?? 'mensal'}>
          <option value="mensal">Mensal</option>
          <option value="pontual">Pontual</option>
        </select>
      </label>

      <label>
        <span>Status</span>
        <select name="status" defaultValue={oportunidade?.status ?? 'nova'}>
          <option value="nova">Nova</option>
          <option value="proposta_enviada">Proposta enviada</option>
          <option value="em_negociacao">Em negociação</option>
          <option value="aprovada">Aprovada</option>
          <option value="encerrada">Encerrada</option>
        </select>
      </label>

      <label>
        <span>Valor</span>
        <input inputMode="decimal" name="valor" required defaultValue={moneyInput(oportunidade?.valor)} />
      </label>

      <div className="module-form-wide">
        <label>
          <span>Descrição</span>
          <input name="descricao" required defaultValue={oportunidade?.descricao ?? ''} />
        </label>
      </div>

      <div className="module-form-wide">
        <label>
          <span>Escopo</span>
          <textarea name="escopo" defaultValue={oportunidade?.escopo ?? ''} />
        </label>
      </div>

      <label>
        <span>Responsável</span>
        <select name="responsavel_id" defaultValue={oportunidade?.responsavel_id ?? ''}>
          <option value="">Sem responsável</option>
          {formData.usuarios.map((usuario) => (
            <option key={usuario.id} value={usuario.id}>{usuario.label}</option>
          ))}
        </select>
      </label>

      <div className="module-form-wide">
        <label>
          <span>Motivo de aprovação ou encerramento antecipado</span>
          <textarea name="motivo_encerramento_antecipado" defaultValue={oportunidade?.motivo_encerramento_antecipado ?? ''} />
        </label>
      </div>

      <div className="form-actions module-form-wide">
        <GkitNewSubmitButton>Salvar oportunidade</GkitNewSubmitButton>
        <Link className="button secondary" href="/modulos/gkit-new/oportunidades">Cancelar</Link>
      </div>
    </form>
  )
}
