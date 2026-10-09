/** 04 §2.1 — 8 characters without ambiguous ones (no 0/O, 1/I/L). */
export const REFERRAL_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const REFERRAL_CODE_LENGTH = 8;

const PATTERN = new RegExp(`^[${REFERRAL_ALPHABET}]{${String(REFERRAL_CODE_LENGTH)}}$`);

/** Generates a referral code from an injectable random source (`() => [0, 1)`). */
export function generateReferralCode(random: () => number): string {
  let code = '';
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i += 1) {
    const index = Math.min(
      REFERRAL_ALPHABET.length - 1,
      Math.floor(random() * REFERRAL_ALPHABET.length),
    );
    code += REFERRAL_ALPHABET.charAt(index);
  }
  return code;
}

/** Normalises user input (`abc-def 23` → `ABCDEF23`) and validates the format. */
export function normalizeReferralCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, '');
  return PATTERN.test(code) ? code : null;
}
