/** Client-side checks that mirror the server's account rules, for instant feedback in forms. */

export function isValidUsername(value: string) {
  return /^[a-z0-9._]{3,24}$/i.test(value.trim());
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** "At least 8 characters, with a number." */
export function isValidPassword(value: string) {
  return value.length >= 8 && /\d/.test(value);
}

/** 0–4, one point each for length ≥ 8, a digit, a capital or symbol, and length ≥ 12. */
export function passwordStrength(value: string) {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[A-Z]/.test(value) || /[^a-z0-9]/i.test(value)) score += 1;
  if (value.length >= 12) score += 1;
  return score;
}
