export function onlyDigits(value: unknown): string {
  return String(value ?? "").replace(/\D+/g, "");
}

export function isValidCnpj(value: unknown): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calcDigit = (base: string, weights: number[]) => {
    const sum = weights.reduce((acc, weight, index) => acc + Number(base[index]) * weight, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const digit1 = calcDigit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const digit2 = calcDigit(cnpj.slice(0, 12) + digit1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return cnpj.endsWith(`${digit1}${digit2}`);
}

export function formatCnpj(value: unknown): string {
  const digits = onlyDigits(value);
  if (digits.length !== 14) return String(value ?? "").trim();
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

export function normalizeCnpj(value: unknown): {
  cnpj?: string;
  original: string;
  status: "vazio" | "valido" | "corrigido" | "incompleto" | "invalido";
  alerta?: string;
} {
  const original = String(value ?? "").trim();
  const digits = onlyDigits(original);
  if (!digits) return { original, status: "vazio" };

  if (digits.length === 14) {
    const formatted = formatCnpj(digits);
    if (isValidCnpj(digits)) {
      const normalizedOriginal = original.replace(/\s+/g, "");
      const alerta = normalizedOriginal && normalizedOriginal !== formatted ? `CNPJ formatado a partir de ${original}` : undefined;
      return { cnpj: formatted, original, status: alerta ? "corrigido" : "valido", alerta };
    }
    return { original, status: "invalido", alerta: `CNPJ inválido no fechamento: ${original}` };
  }

  // Caso comum no fechamento: 08.472.833/001-67, faltando um zero antes da ordem /0001.
  if (digits.length === 13) {
    const padded = `${digits.slice(0, 8)}0${digits.slice(8)}`;
    if (isValidCnpj(padded)) {
      return {
        cnpj: formatCnpj(padded),
        original,
        status: "corrigido",
        alerta: `CNPJ corrigido automaticamente de ${original} para ${formatCnpj(padded)}`,
      };
    }
  }

  return {
    original,
    status: "incompleto",
    alerta: `CNPJ incompleto/fora do padrão no fechamento: ${original}`,
  };
}

export function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[º°]/g, "")
    .replace(/&/g, " E ")
    .replace(/[^A-Z0-9]+/gi, " ")
    .toUpperCase()
    .replace(/\b(CONDOMINIO|COND|EDIFICIO|ED|RESIDENCIAL|ASSOCIACAO|ASSOC)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function moneyBR(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

export function parseMoney(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? "").trim();
  if (!raw) return 0;

  const clean = raw
    .replace(/R\$/gi, "")
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .replace(/[^0-9.-]/g, "");

  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

export function excelDateToText(value: unknown): string {
  if (value instanceof Date) return value.toLocaleDateString("pt-BR");
  if (typeof value === "number" && value > 30000 && value < 80000) {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  }
  return String(value ?? "").trim();
}
