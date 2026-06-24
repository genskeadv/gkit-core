"use client"

import { useMemo, useState } from "react"
import * as XLSX from "xlsx"
import { OperationalKpiGrid } from "@/features/shared/operational-ui"
import { gerarWorkbookOmie } from "@/features/din/gerar-omie"
import { moneyBR } from "@/features/din/normalizar"
import { parseClientes, parseFechamento, readWorkbook } from "@/features/din/parser"
import { processarFaturamento } from "@/features/din/processar"
import { REGRAS_FATURAMENTO } from "@/features/din/regras-faturamento"
import type { GrupoFaturamento, ProcessamentoResultado, TipoFaturamento } from "@/features/din/tipos"

function FileInput({
  label,
  file,
  hint = "Selecione .xlsx",
  onChange,
}: {
  label: string
  file: File | null
  hint?: string
  onChange: (file: File | null) => void
}) {
  return (
    <label className="din-upload-card">
      <span>{label}</span>
      <strong>{file?.name || hint}</strong>
      <input accept=".xlsx,.xls" onChange={(event) => onChange(event.target.files?.[0] || null)} type="file" />
    </label>
  )
}

function StatusPill({ grupo }: { grupo: GrupoFaturamento }) {
  return <span className={`suite-pill ${grupo.status === "ok" ? "success" : "warning"}`}>{grupo.status === "ok" ? "Pronto" : "Atencao"}</span>
}

export function DinProcessor({ usuarioNome }: { usuarioNome: string }) {
  const [tipo, setTipo] = useState<TipoFaturamento>("extrajudicial")
  const [competencia, setCompetencia] = useState("05/2026")
  const [dataFaturamento, setDataFaturamento] = useState("16/06/2026")
  const [usuarioCore, setUsuarioCore] = useState(usuarioNome)
  const [fechamentoFile, setFechamentoFile] = useState<File | null>(null)
  const [clientesFile, setClientesFile] = useState<File | null>(null)
  const [omieFile, setOmieFile] = useState<File | null>(null)
  const [resultado, setResultado] = useState<ProcessamentoResultado | null>(null)
  const [template, setTemplate] = useState<XLSX.WorkBook | null>(null)
  const [erro, setErro] = useState("")
  const [loading, setLoading] = useState(false)
  const [filtro, setFiltro] = useState<"todos" | "ok" | "sem-cnpj" | "alertas" | "fora-ciclo">("todos")

  const regra = REGRAS_FATURAMENTO[tipo]
  const gruposFiltrados = useMemo(() => {
    const grupos = resultado?.grupos || []
    if (filtro === "ok") return grupos.filter((g) => g.status === "ok")
    if (filtro === "sem-cnpj") return grupos.filter((g) => !g.cnpj)
    if (filtro === "alertas") return grupos.filter((g) => g.alertas.length > 0)
    if (filtro === "fora-ciclo") return grupos.filter((g) => !g.clienteDoCiclo)
    return grupos
  }, [resultado, filtro])

  async function processar() {
    try {
      setErro("")
      setLoading(true)
      setResultado(null)

      if (!fechamentoFile) throw new Error("Informe a planilha de fechamento.")
      if (!clientesFile) throw new Error("Informe a base de clientes/CNPJs.")
      if (!competencia.trim()) throw new Error("Informe a competencia do fechamento.")
      if (!dataFaturamento.trim()) throw new Error("Informe a data de faturamento.")

      const fechamentoWb = await readWorkbook(fechamentoFile)
      const clientesWb = await readWorkbook(clientesFile)
      const omieWb = omieFile ? await readWorkbook(omieFile) : null
      const fechamento = parseFechamento(fechamentoWb)
      const clientes = parseClientes(clientesWb)

      setResultado(processarFaturamento({ fechamento, clientes, tipo, competencia }))
      setTemplate(omieWb)
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro inesperado ao processar.")
    } finally {
      setLoading(false)
    }
  }

  function gerarArquivo() {
    if (!resultado) return
    const wb = gerarWorkbookOmie(template, resultado.grupos, dataFaturamento, usuarioCore)
    const safeCompetencia = competencia.replace(/\D+/g, "-").replace(/^-|-$/g, "")
    XLSX.writeFile(wb, `Omie_${regra.categoria.replace(/\s+/g, "_")}_${safeCompetencia}.xlsx`)
  }

  const cards = resultado ? [
    { label: "OS geradas", value: String(resultado.grupos.length), hint: "ordens de servico" },
    { label: "Acordos/parcelas", value: String(resultado.totalLinhas), hint: "itens processados" },
    { label: "Total", value: moneyBR(resultado.total), hint: "valor apurado" },
    { label: "Sem CNPJ", value: String(resultado.totalSemCnpj), hint: "regularizar cadastro" },
    { label: "Com alertas", value: String(resultado.totalComAlertas), hint: "revisao manual" },
    { label: "Clientes ciclo", value: String(resultado.totalClientesCiclo), hint: `${resultado.totalClientesCore} no core` },
  ] : []

  return (
    <>
      <section className="suite-panel din-command-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>Entrada do fechamento</h2>
            <p>Competencia, tipo de repasse e arquivos de entrada.</p>
          </div>
          <div className="form-actions">
            <button className="button" disabled={loading} onClick={processar} type="button">{loading ? "Processando..." : "Processar"}</button>
            <button className="button secondary" disabled={!resultado} onClick={gerarArquivo} type="button">Gerar Omie</button>
          </div>
        </div>

        <div className="module-form-grid din-form-grid">
          <label>
            <span>Tipo</span>
            <select name="tipo" onChange={(event) => setTipo(event.target.value as TipoFaturamento)} value={tipo}>
              <option value="extrajudicial">Repasse de Cobranca Extrajudicial</option>
              <option value="judicial">Repasse de Acordos Judiciais</option>
            </select>
          </label>
          <label>
            <span>Competencia</span>
            <input className="input" onChange={(event) => setCompetencia(event.target.value)} value={competencia} />
          </label>
          <label>
            <span>Data faturamento</span>
            <input className="input" onChange={(event) => setDataFaturamento(event.target.value)} value={dataFaturamento} />
          </label>
          <label>
            <span>Usuario core</span>
            <input className="input" onChange={(event) => setUsuarioCore(event.target.value)} value={usuarioCore} />
          </label>
        </div>

        <div className="din-upload-grid">
          <FileInput file={fechamentoFile} label="Fechamento mensal" onChange={setFechamentoFile} />
          <FileInput file={clientesFile} label="Clientes do ciclo/core" onChange={setClientesFile} />
          <FileInput file={omieFile} hint="Opcional" label="Modelo Omie" onChange={setOmieFile} />
        </div>
        {erro ? <div className="suite-empty-block danger">{erro}</div> : null}
      </section>

      {resultado ? (
        <>
          <OperationalKpiGrid className="suite-kpi-grid compact din-kpi-grid" items={cards} />

          <section className="suite-panel din-core-panel">
            <div className="suite-panel-heading">
              <div>
                <h2>Core faturamento</h2>
                <p>Prontidao para incorporar o processamento ao core.</p>
              </div>
            </div>
            <div className="din-core-grid">
              <article>
                <span className="suite-pill primary">Core</span>
                <strong>{resultado.totalProntosCore} prontos</strong>
                <p>{resultado.totalClientesCiclo} clientes do ciclo localizados e aptos para seguir.</p>
              </article>
              <article>
                <span className="suite-pill primary">Usuario</span>
                <strong>{usuarioCore.trim() || "Nao informado"}</strong>
                <p>Informacao registrada no log da planilha exportada.</p>
              </article>
            </div>
          </section>

          <section className="suite-panel">
            <div className="suite-panel-heading">
              <div>
                <h2>Conferencia</h2>
                <p>Condominios, origem do CNPJ, cliente core e alertas.</p>
              </div>
              <div className="din-filter-bar">
                <button className={filtro === "todos" ? "button" : "button secondary"} onClick={() => setFiltro("todos")} type="button">Todos</button>
                <button className={filtro === "ok" ? "button" : "button secondary"} onClick={() => setFiltro("ok")} type="button">Prontos</button>
                <button className={filtro === "sem-cnpj" ? "button" : "button secondary"} onClick={() => setFiltro("sem-cnpj")} type="button">Sem CNPJ</button>
                <button className={filtro === "alertas" ? "button" : "button secondary"} onClick={() => setFiltro("alertas")} type="button">Alertas</button>
                <button className={filtro === "fora-ciclo" ? "button" : "button secondary"} onClick={() => setFiltro("fora-ciclo")} type="button">Fora ciclo</button>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Condominio</th>
                    <th>CNPJ</th>
                    <th>Core</th>
                    <th>Qtde</th>
                    <th>Valor</th>
                    <th>Alertas</th>
                  </tr>
                </thead>
                <tbody>
                  {gruposFiltrados.map((grupo) => (
                    <tr key={grupo.id}>
                      <td><StatusPill grupo={grupo} /></td>
                      <td>
                        <strong>{grupo.condominio}</strong>
                        <small>{grupo.cnpjStatus === "aproximado" ? "CNPJ por nome aproximado" : grupo.cnpjStatus === "corrigido_base" ? "CNPJ corrigido pela base" : regra.categoria}</small>
                      </td>
                      <td>{grupo.cnpj || <span className="empty-state">nao encontrado</span>}</td>
                      <td>
                        <strong>{grupo.clienteDoCiclo ? "Cliente do ciclo" : "Conferir core"}</strong>
                        <small>{grupo.clienteNomeBase || grupo.origemCnpj}</small>
                        {grupo.clienteTags ? <small>{grupo.clienteTags}</small> : null}
                      </td>
                      <td>{grupo.linhas.length}</td>
                      <td>{moneyBR(grupo.total)}</td>
                      <td>{grupo.alertas.join("; ") || <span className="empty-state">sem alertas</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </>
  )
}
