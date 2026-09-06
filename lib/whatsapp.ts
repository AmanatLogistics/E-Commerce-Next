/**
 * Turning a phone number as a human writes it into a link WhatsApp will actually open.
 *
 * wa.me wants the number in full international form with NOTHING but digits — no plus, no
 * spaces, no dashes, no parentheses. "+93 70 280 0277" pasted straight into the URL gives a
 * page that says the number is invalid, which is the kind of failure nobody notices because
 * the button still looks fine.
 *
 * A leading 0 is a national-format trunk prefix and is not part of the international number,
 * so "0093..." and "093..." are both corrected rather than refused: an operator typing their
 * own number the way they say it out loud should still get a working button.
 */

export interface WhatsAppLink {
  href: string;
  /** Digits only, for display or debugging. */
  digits: string;
}

/**
 * Returns null when there is no usable number — an empty setting, or something too short to
 * be a real international number. The caller renders nothing rather than a broken link.
 */
export function whatsappLink(rawNumber: string, message?: string): WhatsAppLink | null {
  const trimmed = rawNumber.trim();
  if (trimmed.length === 0) return null;

  let digits = trimmed.replace(/\D/g, "");
  // 0093… is the old international dialling prefix; 093… is a national trunk prefix.
  digits = digits.replace(/^00/, "");
  digits = digits.replace(/^0/, "");

  // The shortest real international numbers are around eight digits including the country
  // code; anything under that is a typo, not a number worth linking to.
  if (digits.length < 8 || digits.length > 15) return null;

  const query = message && message.trim().length > 0
    ? `?text=${encodeURIComponent(message.trim())}`
    : "";

  return { href: `https://wa.me/${digits}${query}`, digits };
}
