export interface StudentProfileFields {
  full_name?: string | null;
  phone?: string | null;
  batch?: string | null;
  iqmg_number?: string | null;
}
export function studentProfileProblem(profile: StudentProfileFields | null | undefined): string | null {
  if (!profile?.full_name?.trim()) return 'Enter your full name as printed in the college roster.';
  const phone = profile.phone?.trim() || '';
  const digits = phone.replace(/\D/g, '');
  if (!/^\+?[\d\s().-]+$/.test(phone) || digits.length < 10 || digits.length > 15) return 'Enter a valid phone number with 10–15 digits.';
  if (!profile.batch?.trim()) return 'Select your batch / year.';
  const number = profile.iqmg_number?.trim().toUpperCase() || '';
  const numberLength = number.replace(/[^A-Z0-9]/g, '').length;
  if (!/^[A-Z0-9 /_-]+$/.test(number) || numberLength < 3 || numberLength > 40) return 'Enter the IQMG number printed on your college ID.';
  return null;
}

/** Keep login callbacks on this site and avoid redirecting back into the login page. */
export function studentReturnPath(value: string | null | undefined): string {
  if (!value?.startsWith('/') || value.startsWith('//') || /[\\\x00-\x1f]/.test(value)) return '/dashboard';
  try {
    const url = new URL(value, 'https://rico.invalid');
    if (url.origin !== 'https://rico.invalid' || /^\/student\/login(?:\/|$)/.test(url.pathname)) return '/dashboard';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return '/dashboard'; }
}
