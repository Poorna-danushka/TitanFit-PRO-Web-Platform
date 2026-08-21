/**
 * Security utilities for GymFitPro
 * Covers: input sanitization, validation, rate limiting, XSS prevention, token management
 */

// ─── Input Sanitization ───────────────────────────────────────────────────────

/**
 * Strip HTML tags and dangerous characters from user input.
 * Prevents XSS via reflected/stored injections.
 */
export function sanitizeInput(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')            // strip HTML tags
    .replace(/javascript:/gi, '')       // strip JS protocol
    .replace(/on\w+\s*=/gi, '')         // strip inline event handlers
    .replace(/[<>"'`]/g, (c) => {       // HTML-encode remaining specials
      const map: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '`': '&#x60;',
      };
      return map[c] ?? c;
    })
    .trim();
}

/**
 * Sanitize an entire form data object.
 */
export function sanitizeFormData<T extends Record<string, string>>(data: T): T {
  const sanitized = {} as T;
  for (const key in data) {
    sanitized[key] = sanitizeInput(data[key]) as T[typeof key];
  }
  return sanitized;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/** Validate email format using RFC-compliant regex */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate password strength.
 * Returns score 0-4 and list of failures.
 */
export function validatePassword(password: string): {
  score: number;
  label: string;
  color: string;
  failures: string[];
} {
  const failures: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else failures.push('At least 8 characters');

  if (/[A-Z]/.test(password)) score++;
  else failures.push('One uppercase letter');

  if (/[0-9]/.test(password)) score++;
  else failures.push('One number');

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else failures.push('One special character (!@#$...)');

  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['bg-red-600', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

  return { score, label: labels[score] ?? 'Very Weak', color: colors[score] ?? 'bg-red-600', failures };
}

/** Validate login form fields */
export function validateLoginForm(email: string, password: string): ValidationResult {
  const errors: Record<string, string> = {};
  if (!email.trim()) errors.email = 'Email is required';
  else if (!isValidEmail(email)) errors.email = 'Enter a valid email address';
  if (!password) errors.password = 'Password is required';
  return { valid: Object.keys(errors).length === 0, errors };
}

/** Validate registration form fields */
export function validateRegisterForm(
  name: string,
  email: string,
  password: string,
  phone?: string
): ValidationResult {
  const errors: Record<string, string> = {};

  const cleanName = sanitizeInput(name);
  if (!cleanName) errors.name = 'Full name is required';
  else if (cleanName.length < 2) errors.name = 'Name must be at least 2 characters';
  else if (cleanName.length > 60) errors.name = 'Name must be under 60 characters';

  if (!email.trim()) errors.email = 'Email is required';
  else if (!isValidEmail(email)) errors.email = 'Enter a valid email address';

  if (phone && phone.trim()) {
    const digitsOnly = phone.replace(/[\s\-\+\(\)]/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      errors.phone = 'Enter a valid contact number';
    }
  }

  if (!password) {
    errors.password = 'Password is required';
  } else {
    const { score, failures } = validatePassword(password);
    if (score < 3) {
      errors.password = failures.length > 0
        ? `Password needs: ${failures.join(', ')}`
        : 'Password is too weak';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// ─── Rate Limiting (client-side guard) ───────────────────────────────────────

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}

const rateLimitStore: Record<string, RateLimitEntry> = {};

/**
 * Client-side rate limiter.
 * Blocks an action key after `maxAttempts` within `windowMs`.
 * After reaching limit, blocks for `lockoutMs`.
 *
 * NOTE: This supplements server-side rate limiting — never replaces it.
 */
export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 60_000,
  lockoutMs = 300_000
): { allowed: boolean; remainingMs?: number; attemptsLeft?: number } {
  const now = Date.now();
  const entry = rateLimitStore[key];

  if (entry?.blockedUntil) {
    if (now < entry.blockedUntil) {
      return { allowed: false, remainingMs: entry.blockedUntil - now };
    }
    // Lockout expired — reset
    delete rateLimitStore[key];
  }

  if (!entry || now - entry.firstAttempt > windowMs) {
    rateLimitStore[key] = { count: 1, firstAttempt: now };
    return { allowed: true, attemptsLeft: maxAttempts - 1 };
  }

  entry.count++;

  if (entry.count > maxAttempts) {
    entry.blockedUntil = now + lockoutMs;
    return { allowed: false, remainingMs: lockoutMs };
  }

  return { allowed: true, attemptsLeft: maxAttempts - entry.count };
}

/** Reset rate limit for a key (e.g. after successful login) */
export function resetRateLimit(key: string): void {
  delete rateLimitStore[key];
}

// ─── Token Management ─────────────────────────────────────────────────────────

const TOKEN_KEY = 'gymfit_token';
const REFRESH_TOKEN_KEY = 'gymfit_refresh_token';
const TOKEN_EXPIRY_KEY = 'gymfit_token_expiry';
const USER_KEY = 'gymfit_user';

/** Parse a JWT payload without verifying (verification is server-side) */
function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function storeToken(token: string, refreshToken?: string): void {
  const payload = parseJwtPayload(token);
  const expiry = payload?.exp ? (payload.exp as number) * 1000 : Date.now() + 86_400_000;
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(TOKEN_EXPIRY_KEY, String(expiry));
  if (refreshToken) {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function getToken(): string | null {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!token || !expiry) return null;
  if (Date.now() > Number(expiry)) {
    clearAuthStorage();
    return null;
  }
  return token;
}

export function getRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function storeUser(user: Record<string, unknown>): void {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser(): Record<string, unknown> | null {
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearAuthStorage(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
  sessionStorage.removeItem(USER_KEY);
}

/** Returns true if the stored token is valid and not expired */
export function isTokenValid(): boolean {
  return getToken() !== null;
}

/** Returns ms until token expires (negative if expired) */
export function tokenExpiresIn(): number {
  const expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!expiry) return -1;
  return Number(expiry) - Date.now();
}

// ─── CSRF helpers ─────────────────────────────────────────────────────────────

/** Generate a random CSRF token for form submissions */
export function generateCsrfToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ─── Content Security ─────────────────────────────────────────────────────────

/** Validate that a URL is safe (http/https only, no javascript: or data:) */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/** Mask email for display (e.g. j***@example.com) */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  return `${local[0]}***@${domain}`;
}

/** Format remaining lockout time as human-readable string */
export function formatLockoutTime(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}
