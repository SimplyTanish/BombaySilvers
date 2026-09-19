/**
 * Shared input validators used on both client and server.
 *
 * These are format checks (not identity checks): they keep junk and obvious
 * injection out of the pipeline. Identity and deliverability are verified by
 * the OTP email step, and all writes are bound to an authenticated session.
 */

const EMAIL_RE =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;

/** Keep only ASCII digits from an arbitrary input string. */
export function cleanDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Validate a practical email format (RFC-5321-ish, strict about the domain).
 * Rejects obviously malformed addresses like "abc", "@x.com", "a@b", "a..b@c.d".
 */
export function isValidEmail(raw: string): boolean {
  const email = raw.trim();
  if (!email || email.length > 254 || email.includes(" ")) return false;
  return EMAIL_RE.test(email);
}

/**
 * Validate an Indian 10-digit mobile number: exactly 10 digits, first digit 6–9.
 * Accepts loosely-masked input ("98765 43210", "+91 9876543210") via cleanDigits.
 */
export function isValidIndianMobile(raw: string): boolean {
  const digits = cleanDigits(raw);
  if (digits.length === 12 && digits.startsWith("91")) {
    return /^[6-9]\d{9}$/.test(digits.slice(2));
  }
  return /^[6-9]\d{9}$/.test(digits);
}
