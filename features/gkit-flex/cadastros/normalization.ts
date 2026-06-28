export type CadastroTipo = 'categoria' | 'centro' | 'carteira';

export function normalizeText(value: string | null | undefined): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_/\\|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function buildSlug(value: string | null | undefined): string {
  return normalizeText(value)
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '') || 'sem_nome';
}

export function toTitleName(value: string | null | undefined): string {
  const raw = String(value || '').trim();
  if (!raw) return 'Sem nome';
  return raw
    .replace(/[_/\\|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((part) => {
      const lower = part.toLowerCase();
      if (['de', 'da', 'do', 'das', 'dos', 'e'].includes(lower)) return lower;
      if (part.length <= 3 && part === part.toUpperCase()) return part;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

export function suggestCanonicalName(tipo: CadastroTipo, value: string): string {
  const normalized = normalizeText(value);
  if (!normalized) {
    if (tipo === 'categoria') return 'Sem categoria';
    if (tipo === 'centro') return 'Sem centro';
    return 'Sem carteira';
  }

  const categoryMap: Record<string, string> = {
    'pessoal': 'Pessoal',
    'impostos': 'Impostos',
    'operacional': 'Operacional',
    'despesas do negocio': 'Despesas do negocio',
    'despesa do negocio': 'Despesas do negocio',
    'comissoes': 'Comissoes',
    'comissao': 'Comissoes',
    'sem categoria': 'Sem categoria',
  };

  if (tipo === 'categoria' && categoryMap[normalized]) return categoryMap[normalized];
  if (tipo === 'centro' && categoryMap[normalized]) return categoryMap[normalized];

  if (tipo === 'carteira') {
    return String(value || '')
      .replace(/^carteira\s+/i, 'Carteira ')
      .replace(/[_/\\|-]+/g, '_')
      .replace(/\s+/g, ' ')
      .trim() || 'Sem carteira';
  }

  return toTitleName(value);
}
