import crypto from 'node:crypto';

// Ambiguous characters (0/O, 1/I) are excluded so IDs can be read aloud or
// copied from a printed certificate without mistakes.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomBlock(length = 6): string {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let index = 0; index < length; index += 1) {
    code += ALPHABET[bytes[index] % ALPHABET.length];
  }
  return code;
}

export function generateApplicationId(year = new Date().getFullYear()): string {
  return `APP-${year}-${randomBlock()}`;
}

export function generateCertificateId(year = new Date().getFullYear()): string {
  return `CERT-${year}-${randomBlock(7)}`;
}

/** Generates a code that is guaranteed not to exist yet according to `exists`. */
export function generateUniqueId(prefix: 'APP' | 'CERT', exists: (id: string) => boolean): string {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const id = prefix === 'APP' ? generateApplicationId(year) : generateCertificateId(year);
    if (!exists(id)) return id;
  }
  throw new Error('Unable to allocate a unique identifier. Please try again.');
}
