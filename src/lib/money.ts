/** "₦34,200" — formatted by hand so it doesn't depend on Intl support in the JS engine. */
export function formatNaira(amount: number) {
  return `₦${Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

/** Digits from free-typed input: "2,500" → 2500. Empty input gives 0. */
export function parseAmount(value: string) {
  const digits = value.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

/** Formats while typing: "2500" → "2,500". */
export function formatAmountInput(value: string) {
  const amount = parseAmount(value);
  return amount ? amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';
}
