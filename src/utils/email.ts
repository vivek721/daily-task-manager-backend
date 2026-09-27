// Maximum length of an email address (RFC 5321 path limit)
export const MAX_EMAIL_LENGTH = 254;

const WHITESPACE = /\s/;

/**
 * Basic email shape check that runs in linear time.
 *
 * Replaces `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, which backtracks polynomially on long
 * inputs (CodeQL js/polynomial-redos). Accepts `local@domain` where:
 * - the whole value is at most 254 characters and contains no whitespace
 * - there is exactly one '@', with a non-empty local part before it
 * - the domain contains a '.', and does not start or end with '.'
 */
export const isValidEmail = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  if (value.length === 0 || value.length > MAX_EMAIL_LENGTH) return false;
  if (WHITESPACE.test(value)) return false;

  const at = value.indexOf('@');
  if (at <= 0 || at !== value.lastIndexOf('@')) return false;

  const domain = value.slice(at + 1);
  return domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.');
};
