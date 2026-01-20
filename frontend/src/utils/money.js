export function formatMoney(value, currency = 'EUR', locale = 'es-ES') {
  const number = typeof value === 'number' ? value : parseFloat(value);
  const safe = Number.isFinite(number) ? number : 0;
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(safe);
  } catch {
    // Fallback si la divisa es inválida
    return `${safe.toFixed(2)} ${currency}`;
  }
}

