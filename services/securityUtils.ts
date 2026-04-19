// securityUtils.ts - Utilitas keamanan untuk aplikasi HRMS Pro

/**
 * Fungsi untuk menghasilkan token CSRF
 * @returns Token CSRF yang unik
 */
export const generateCSRFToken = (): string => {
  const randomBytes = new Uint8Array(32);
  window.crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Menyimpan token CSRF di localStorage
 * @param token Token CSRF yang akan disimpan
 */
export const storeCSRFToken = (token: string): void => {
  localStorage.setItem('csrf_token', token);
};

/**
 * Mengambil token CSRF dari localStorage
 * @returns Token CSRF yang tersimpan atau null jika tidak ada
 */
export const getCSRFToken = (): string | null => {
  return localStorage.getItem('csrf_token');
};

/**
 * Memvalidasi token CSRF
 * @param token Token yang akan divalidasi
 * @returns Boolean yang menunjukkan apakah token valid
 */
export const validateCSRFToken = (token: string): boolean => {
  const storedToken = getCSRFToken();
  return storedToken === token;
};

/**
 * Sanitasi input untuk mencegah XSS
 * @param input String yang akan disanitasi
 * @returns String yang telah disanitasi
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};