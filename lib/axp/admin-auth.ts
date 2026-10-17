import { NextRequest } from 'next/server';
import { hmac, safeEqual } from './payment-core';

export const ADMIN_SESSION_COOKIE = 'axp_admin_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Both fallbacks below are published in this repository, so they guard nothing
 * on a real deployment. They are for local development only: a production
 * server without its own AXP_ADMIN_PIN and TICKET_SIGNING_SECRET refuses every
 * organiser sign-in instead of accepting a PIN anyone can read.
 */
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function getAdminPin(): string {
  return process.env.AXP_ADMIN_PIN || (IS_PRODUCTION ? '' : 'axp@2026');
}

function getSigningSecret(): string {
  return process.env.TICKET_SIGNING_SECRET || (IS_PRODUCTION ? '' : 'axp-social-ticket-secret-2026');
}

export function isAdminAuthConfigured(): boolean {
  return !!getAdminPin().trim() && !!getSigningSecret();
}

/**
 * Validate submitted PIN
 */
export function validatePin(pin: string): boolean {
  if (!pin || typeof pin !== 'string' || !isAdminAuthConfigured()) return false;
  const expected = getAdminPin().trim();
  const given = pin.trim();
  if (expected.length !== given.length) return false;
  return safeEqual(expected, given);
}

/**
 * Create a cryptographically signed session token for the admin cookie
 */
export function createAdminSessionToken(): { token: string; expires: Date } {
  const expires = new Date(Date.now() + SESSION_DURATION_MS);
  const expiresAt = String(expires.getTime());
  const secret = getSigningSecret();
  const signature = hmac(secret, `axp_admin:${expiresAt}`);
  const token = `${expiresAt}.${signature}`;
  return { token, expires };
}

/**
 * Verify whether an admin session token or header is valid
 */
export function verifyAdminSessionToken(token?: string | null): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [expiresAtStr, signature] = parts;
  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(expiresAt) || expiresAt < Date.now()) {
    return false; // Expired
  }

  const secret = getSigningSecret();
  if (!secret) return false;
  const expected = hmac(secret, `axp_admin:${expiresAtStr}`);
  return safeEqual(expected, signature);
}

/**
 * Verify incoming NextRequest for valid organiser authorization
 */
export function verifyAdminAuth(request: NextRequest): boolean {
  // 1. Check HTTP-only cookie
  const cookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (cookie && verifyAdminSessionToken(cookie)) {
    return true;
  }

  // 2. Check Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (verifyAdminSessionToken(bearer)) {
      return true;
    }
  }

  // 3. Check direct PIN header (x-admin-pin)
  const pinHeader = request.headers.get('x-admin-pin');
  if (pinHeader && validatePin(pinHeader)) {
    return true;
  }

  return false;
}
