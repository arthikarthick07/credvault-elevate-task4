export type Gender = 'male' | 'female' | 'other';

export interface ApplicationInput {
  full_name: string;
  phone: string;
  gender: Gender;
  city: string;
  state: string;
}

const GENDERS: Gender[] = ['male', 'female', 'other'];
const NAME_PATTERN = /^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F .'-]*$/;
const PLACE_PATTERN = /^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F .'-]*$/;

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** Normalises Indian phone numbers to a bare 10 digit string, or null. */
export function normalisePhone(raw: string): string | null {
  let digits = raw.replace(/[\s()\-.]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export function validateApplicationInput(raw: unknown): {
  value?: ApplicationInput;
  errors: Record<string, string>;
} {
  const body = (raw ?? {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const fullName = collapseSpaces(asString(body.full_name));
  if (!fullName) {
    errors.full_name = 'Full name is required.';
  } else if (fullName.length < 3) {
    errors.full_name = 'Full name must be at least 3 characters.';
  } else if (fullName.length > 80) {
    errors.full_name = 'Full name must be 80 characters or fewer.';
  } else if (!NAME_PATTERN.test(fullName)) {
    errors.full_name = 'Use letters, spaces, hyphens and apostrophes only.';
  }

  const phoneInput = asString(body.phone);
  const phone = phoneInput ? normalisePhone(phoneInput) : null;
  if (!phoneInput) {
    errors.phone = 'Phone number is required.';
  } else if (!phone) {
    errors.phone = 'Enter a valid 10 digit Indian mobile number.';
  }

  const genderInput = asString(body.gender).toLowerCase();
  if (!genderInput) {
    errors.gender = 'Gender is required.';
  } else if (!GENDERS.includes(genderInput as Gender)) {
    errors.gender = 'Select Male, Female or Other.';
  }

  const city = collapseSpaces(asString(body.city));
  if (!city) {
    errors.city = 'City is required.';
  } else if (city.length < 2 || city.length > 60) {
    errors.city = 'City must be between 2 and 60 characters.';
  } else if (!PLACE_PATTERN.test(city)) {
    errors.city = 'Enter a valid city name.';
  }

  const state = collapseSpaces(asString(body.state));
  if (!state) {
    errors.state = 'State is required.';
  } else if (state.length < 2 || state.length > 60) {
    errors.state = 'State must be between 2 and 60 characters.';
  } else if (!PLACE_PATTERN.test(state)) {
    errors.state = 'Enter a valid state name.';
  }

  if (Object.keys(errors).length > 0) return { errors };

  return {
    errors,
    value: {
      full_name: fullName,
      phone: phone as string,
      gender: genderInput as Gender,
      city,
      state,
    },
  };
}

export function validateRemarks(raw: unknown, { required = false } = {}): {
  value: string | null;
  error?: string;
} {
  const remarks = collapseSpaces(asString(raw));
  if (!remarks) {
    return required ? { value: null, error: 'Please provide a reason.' } : { value: null };
  }
  if (remarks.length < 3) return { value: null, error: 'Please write at least 3 characters.' };
  if (remarks.length > 500) return { value: null, error: 'Keep the note under 500 characters.' };
  return { value: remarks };
}

export function validateEmail(raw: unknown): string | null {
  const email = asString(raw).toLowerCase();
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 120 ? email : null;
}

export function maskPhone(phone: string): string {
  if (phone.length < 4) return '******';
  return `${'*'.repeat(Math.max(phone.length - 4, 0))}${phone.slice(-4)}`;
}
