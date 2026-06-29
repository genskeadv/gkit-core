export function normalizeCnj(value: string) {
  return value.replace(/\D/g, '');
}

export function formatCnj(value: string) {
  const digits = normalizeCnj(value);
  if (digits.length !== 20) return value;
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16)}`;
}

export function isValidCnj(value: string) {
  return normalizeCnj(value).length === 20;
}

