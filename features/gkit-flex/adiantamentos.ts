export type AdvanceDiscountSource = {
  id?: string | null;
  descricao: string;
  categoria?: string | null;
  valor_previsto: number | string;
  pago?: boolean | null;
};

export type AdvanceDiscountTarget<T = Record<string, unknown>> = T & {
  descricao: string;
  categoria?: string | null;
  vencimento_dia?: number | null;
  vencimento_texto?: string | null;
  valor_previsto: number | string;
  matchName?: string | null;
};

export type AdvanceDiscountApplied<T> = {
  item: T;
  originalValue: number;
  discountedValue: number;
  advanceApplied: number;
  advanceSourceIds: string[];
};

const NAME_STOPWORDS = new Set([
  'colaborador',
  'colaboradora',
  'pix',
  'enviado',
  'pagamento',
  'efetuado',
  'cp',
  'de',
  'da',
  'das',
  'do',
  'dos',
  'e',
]);

function roundMoney(value: number): number {
  return Math.round((value || 0) * 100) / 100;
}

export function normalizeAdvanceText(value?: string | null): string {
  return String(value || '')
    .replace(/^Pix enviado:\s*/i, '')
    .replace(/^Pagamento efetuado:\s*/i, '')
    .replace(/^"|"$/g, '')
    .replace(/^Cp\s*:\d+-/i, '')
    .replace(/^\d+\s+\d+\s+/i, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function nameTokens(value?: string | null): string[] {
  return normalizeAdvanceText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !NAME_STOPWORDS.has(token));
}

export function isAdvanceCategory(category?: string | null): boolean {
  return normalizeAdvanceText(category).includes('adiantamento');
}

export function isFirstDayPayment(row: { vencimento_dia?: number | null; vencimento_texto?: string | null }): boolean {
  if (Number(row.vencimento_dia || 0) === 1) return true;
  return /^0?1(?:\/|$)/.test(String(row.vencimento_texto || '').trim());
}

function matchScore(advanceDescription: string, targetName: string): number {
  const advanceTokens = nameTokens(advanceDescription);
  const targetTokens = nameTokens(targetName);
  if (!advanceTokens.length || !targetTokens.length) return 0;

  const advanceSet = new Set(advanceTokens);
  const targetSet = new Set(targetTokens);
  const targetContained = targetTokens.every((token) => advanceSet.has(token));
  const advanceContained = advanceTokens.every((token) => targetSet.has(token));

  if (!targetContained && !advanceContained) return 0;
  return Math.max(advanceTokens.length, targetTokens.length) * 100 + Math.min(advanceTokens.length, targetTokens.length);
}

function targetGroupKey(target: AdvanceDiscountTarget): string {
  return normalizeAdvanceText(target.matchName || target.descricao);
}

export function applyAdvanceDiscounts<T extends AdvanceDiscountTarget>(
  targets: T[],
  advances: AdvanceDiscountSource[],
): Array<AdvanceDiscountApplied<T>> {
  const eligibleTargets = targets.filter((target) => isFirstDayPayment(target));
  const groups = new Map<string, { key: string; label: string; items: T[]; advance: number; advanceSourceIds: string[] }>();

  for (const target of eligibleTargets) {
    const key = targetGroupKey(target);
    if (!key) continue;
    const current = groups.get(key) || { key, label: target.matchName || target.descricao, items: [], advance: 0, advanceSourceIds: [] };
    current.items.push(target);
    groups.set(key, current);
  }

  for (const advance of advances) {
    if (!isAdvanceCategory(advance.categoria)) continue;
    if (advance.pago === false) continue;

    const value = roundMoney(Number(advance.valor_previsto || 0));
    if (value <= 0) continue;

    const candidates = Array.from(groups.values())
      .map((group) => ({ group, score: matchScore(advance.descricao, group.label) }))
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score);

    if (!candidates.length) continue;
    if (candidates[1] && candidates[1].score === candidates[0].score) continue;

    candidates[0].group.advance = roundMoney(candidates[0].group.advance + value);
    if (advance.id) candidates[0].group.advanceSourceIds.push(String(advance.id));
  }

  const adjusted = new Map<T, AdvanceDiscountApplied<T>>();
  for (const group of groups.values()) {
    let remainingAdvance = group.advance;
    for (const item of group.items) {
      const originalValue = roundMoney(Number(item.valor_previsto || 0));
      const advanceApplied = roundMoney(Math.min(originalValue, remainingAdvance));
      const discountedValue = roundMoney(originalValue - advanceApplied);
      remainingAdvance = roundMoney(remainingAdvance - advanceApplied);
      adjusted.set(item, {
        item,
        originalValue,
        discountedValue,
        advanceApplied,
        advanceSourceIds: advanceApplied > 0 ? group.advanceSourceIds : [],
      });
    }
  }

  return targets.map((item) => adjusted.get(item) || {
    item,
    originalValue: roundMoney(Number(item.valor_previsto || 0)),
    discountedValue: roundMoney(Number(item.valor_previsto || 0)),
    advanceApplied: 0,
    advanceSourceIds: [],
  });
}
