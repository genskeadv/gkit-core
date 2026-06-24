import { REGRAS_FATURAMENTO } from "./regras-faturamento";
import { formatCnpj, moneyBR, normalizeText, onlyDigits } from "./normalizar";
import type { ClienteCnpj, FechamentoLinha, GrupoFaturamento, ProcessamentoResultado, TipoFaturamento } from "./tipos";

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aWords = new Set(a.split(" ").filter(Boolean));
  const bWords = new Set(b.split(" ").filter(Boolean));
  const intersection = [...aWords].filter((word) => bWords.has(word)).length;
  const union = new Set([...aWords, ...bWords]).size;
  return union ? intersection / union : 0;
}

function clienteAliases(cliente: ClienteCnpj): string[] {
  const aliases = cliente.aliases?.length ? cliente.aliases : [cliente.nome];
  return aliases.map(normalizeText).filter(Boolean);
}

function clientePriority(cliente: ClienteCnpj): number {
  const tags = normalizeText(cliente.tags || "");
  const situacao = normalizeText(cliente.situacao || "");
  let score = 0;
  if (situacao.includes("ATIVO")) score += 2;
  if (tags.includes("CLIENTE")) score += 2;
  if (tags.includes("MENSAL")) score += 1;
  return score;
}

function isClienteDoCiclo(cliente?: ClienteCnpj): boolean {
  if (!cliente) return false;
  const tags = normalizeText(cliente.tags || "");
  const situacao = normalizeText(cliente.situacao || "");
  const ativo = !situacao || situacao.includes("ATIVO");
  return ativo && (tags.includes("CLIENTE") || tags.includes("MENSAL"));
}

function findCliente(condominio: string, clientes: ClienteCnpj[]): {
  cnpj?: string;
  status: "ok" | "aproximado" | "nao_encontrado";
  nomeBase?: string;
  cliente?: ClienteCnpj;
} {
  const normalized = normalizeText(condominio);

  const exact = clientes
    .filter((c) => clienteAliases(c).some((alias) => alias === normalized))
    .sort((a, b) => clientePriority(b) - clientePriority(a))[0];

  if (exact) return { cnpj: exact.cnpj, status: "ok", nomeBase: exact.nome, cliente: exact };

  const candidates = clientes
    .flatMap((c) => clienteAliases(c).map((alias) => ({ c, alias, score: similarity(normalized, alias) + clientePriority(c) * 0.01 })))
    .sort((a, b) => b.score - a.score);

  if (candidates[0]?.score >= 0.62) {
    return { cnpj: candidates[0].c.cnpj, status: "aproximado", nomeBase: candidates[0].c.nome, cliente: candidates[0].c };
  }

  return { status: "nao_encontrado" };
}

function findClienteByCnpj(cnpj: string, clientes: ClienteCnpj[]): ClienteCnpj | undefined {
  const digits = onlyDigits(cnpj);
  return clientes.find((cliente) => onlyDigits(cliente.cnpj) === digits);
}

function firstCnpjFromFechamento(linhas: FechamentoLinha[]): string | undefined {
  const cnpjs = linhas
    .map((linha) => linha.cnpj)
    .filter((cnpj): cnpj is string => !!cnpj && onlyDigits(cnpj).length === 14);
  return cnpjs[0];
}

function cnpjsValidosDoFechamento(linhas: FechamentoLinha[]): string[] {
  return [...new Set(
    linhas
      .map((linha) => linha.cnpj)
      .filter((cnpj): cnpj is string => !!cnpj && onlyDigits(cnpj).length === 14)
      .map((cnpj) => formatCnpj(cnpj)),
  )];
}

function hasDivergentCnpjs(linhas: FechamentoLinha[]): boolean {
  return cnpjsValidosDoFechamento(linhas).length > 1;
}

function buildNota(condominio: string, linhas: FechamentoLinha[], total: number, tipo: TipoFaturamento): string {
  const regra = REGRAS_FATURAMENTO[tipo];
  const detalhe = linhas.map((linha) => {
    const parts = [
      linha.unidade ? `Unid. ${linha.unidade}` : "Unid. não informada",
      linha.bloco ? `Bloco ${linha.bloco}` : "",
      linha.parcela ? `Parcela ${linha.parcela}` : "",
      linha.periodo ? `Período ${linha.periodo}` : "",
      tipo === "judicial" && linha.referencia ? `Ref. ${linha.referencia}` : "",
      `Repasse ${moneyBR(linha.valorRepasse)}`,
    ].filter(Boolean);
    return `- ${parts.join(" | ")}`;
  });

  return [
    `${regra.prefixoNota} - ${condominio}`,
    "",
    "Composição do repasse do mês:",
    ...detalhe,
    "",
    `Total do repasse do mês: ${moneyBR(total)}`,
  ].join("\n");
}

function uniqueAlerts(linhas: FechamentoLinha[]): string[] {
  const alerts = linhas
    .map((linha) => linha.cnpjAlerta)
    .filter((alerta): alerta is string => !!alerta);
  return [...new Set(alerts)];
}

export function processarFaturamento(params: {
  fechamento: FechamentoLinha[];
  clientes: ClienteCnpj[];
  tipo: TipoFaturamento;
  competencia: string;
}): ProcessamentoResultado {
  const { fechamento, clientes, tipo, competencia } = params;
  const linhasDoTipo = fechamento.filter((linha) => !linha.tipoOrigem || linha.tipoOrigem === tipo);
  const byCondo = new Map<string, FechamentoLinha[]>();

  linhasDoTipo.forEach((linha) => {
    const key = normalizeText(linha.condominio);
    const current = byCondo.get(key) || [];
    current.push(linha);
    byCondo.set(key, current);
  });

  const grupos: GrupoFaturamento[] = [...byCondo.entries()]
    .map(([normalizado, linhas], index): GrupoFaturamento => {
      const condominio = linhas[0]?.condominio || normalizado;
      const total = linhas.reduce((sum, linha) => sum + linha.valorRepasse, 0);
      const cnpjFechamento = firstCnpjFromFechamento(linhas);
      const clientePorNome = findCliente(condominio, clientes);
      const clientePorCnpj = cnpjFechamento ? findClienteByCnpj(cnpjFechamento, clientes) : undefined;

      let cnpj = cnpjFechamento || clientePorNome.cnpj;
      let cnpjStatus: GrupoFaturamento["cnpjStatus"] = cnpjFechamento ? "ok" : clientePorNome.status;

      // Se o fechamento trouxe CNPJ inválido/incompleto e a base achou pelo nome, usa a base e alerta.
      if (!cnpjFechamento && clientePorNome.cnpj) {
        cnpj = clientePorNome.cnpj;
        cnpjStatus = clientePorNome.status;
      }

      // Se o fechamento trouxe CNPJ válido mas diferente da base localizada pelo nome, mantém o fechamento,
      // mas sinaliza para conferência. O usuário decide se a base ou o fechamento está mais atualizado.
      const cnpjBasePorNome = clientePorNome.cnpj;
      const cnpjDivergenteDaBase = !!cnpjFechamento && !!cnpjBasePorNome && onlyDigits(cnpjFechamento) !== onlyDigits(cnpjBasePorNome);
      const clienteBase = clientePorNome.cliente || clientePorCnpj;
      const origemCnpj: GrupoFaturamento["origemCnpj"] = cnpjFechamento
        ? "fechamento"
        : clientePorNome.cnpj
          ? clientePorNome.status === "aproximado" ? "base_clientes_aproximada" : "base_clientes"
          : "nao_encontrado";

      const dadosNota = buildNota(condominio, linhas, total, tipo);
      const alertas: string[] = [];
      const clienteForaDoCiclo = clienteBase && !isClienteDoCiclo(clienteBase);

      if (!cnpj) alertas.push("CNPJ não encontrado");
      if (cnpjStatus === "aproximado") alertas.push(`CNPJ localizado por nome aproximado${clientePorNome.nomeBase ? `: ${clientePorNome.nomeBase}` : ""}`);
      if (clienteForaDoCiclo) alertas.push("Cliente localizado no core, mas fora das tags Cliente/Mensal do ciclo");
      if (!cnpjFechamento && cnpjBasePorNome) alertas.push("CNPJ ausente no fechamento; usado CNPJ da base de clientes");
      if (cnpjFechamento && clientePorCnpj && normalizeText(clientePorCnpj.nome) !== normalizeText(condominio)) {
        alertas.push(`CNPJ do fechamento existe na base com outro nome: ${clientePorCnpj.nome}`);
      }
      if (cnpjDivergenteDaBase) alertas.push(`CNPJ do fechamento diverge da base por nome (${cnpjBasePorNome})`);
      if (cnpjFechamento && hasDivergentCnpjs(linhas)) alertas.push("Mais de um CNPJ encontrado no fechamento para o mesmo condomínio");
      if (total <= 0) alertas.push("Total zerado ou negativo");
      if (dadosNota.length > 1800) alertas.push("Texto da NF longo; conferir limite aceito no Omie/prefeitura");
      if (linhas.some((linha) => !linha.tipoOrigem)) alertas.push("Algumas linhas não tinham categoria; foram incluídas pelo tipo selecionado");
      if (linhas.some((linha) => linha.categoriaReconhecidaPorAproximacao)) alertas.push("Categoria reconhecida por aproximação; conferir digitação no fechamento");

      uniqueAlerts(linhas).forEach((alerta) => alertas.push(alerta));

      if (linhas.some((linha) => linha.cnpjStatus === "corrigido")) {
        cnpjStatus = cnpjFechamento ? "ok" : cnpjStatus;
      }
      if (!cnpjFechamento && cnpjBasePorNome && linhas.some((linha) => linha.cnpjStatus === "invalido" || linha.cnpjStatus === "incompleto")) {
        cnpjStatus = "corrigido_base";
      }

      return {
        id: `${tipo}-${index + 1}`,
        condominio,
        condominioNormalizado: normalizado,
        cnpj,
        cnpjStatus,
        origemCnpj,
        clienteNomeBase: clienteBase?.nome,
        clienteSituacao: clienteBase?.situacao,
        clienteTags: clienteBase?.tags,
        clienteDoCiclo: isClienteDoCiclo(clienteBase),
        tipo,
        competencia,
        linhas,
        total,
        dadosNota,
        observacao: `Fechamento ${competencia} | ${REGRAS_FATURAMENTO[tipo].categoria} | ${linhas.length} parcela(s)/acordo(s)`,
        status: alertas.length ? "atencao" : "ok",
        alertas: [...new Set(alertas)],
      };
    })
    .filter((grupo) => grupo.total > 0)
    .sort((a, b) => a.condominio.localeCompare(b.condominio, "pt-BR"));

  return {
    grupos,
    total: grupos.reduce((sum, grupo) => sum + grupo.total, 0),
    totalLinhas: grupos.reduce((sum, grupo) => sum + grupo.linhas.length, 0),
    totalSemCnpj: grupos.filter((g) => !g.cnpj).length,
    totalComAlertas: grupos.filter((g) => g.alertas.length > 0).length,
    totalClientesCore: grupos.filter((g) => !!g.clienteNomeBase).length,
    totalClientesCiclo: grupos.filter((g) => g.clienteDoCiclo).length,
    totalProntosCore: grupos.filter((g) => g.status === "ok" && g.clienteDoCiclo).length,
    alertas: grupos.flatMap((g) => g.alertas),
  };
}
