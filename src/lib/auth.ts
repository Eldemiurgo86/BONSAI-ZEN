import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { query } from './db';

export const SESSION_COOKIE = 'bz_session';
const SESSION_DAYS = 30;
const BCRYPT_ROUNDS = 10;

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  isPremium: boolean;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.SESSION_COOKIE_SECURE === 'true',
    path: '/',
    expires,
  };
}

/** Crea una sesión en la base de datos y la guarda en una cookie httpOnly. */
export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await query('insert into sessions (id, user_id, expires_at) values ($1, $2, $3)', [hashToken(token), userId, expires]);
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(expires));
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await query('delete from sessions where id = $1', [hashToken(token)]);
  }
  jar.set(SESSION_COOKIE, '', { ...cookieOptions(new Date(0)), maxAge: 0 });
}

/** Usuario de la sesión actual, o null si no hay sesión válida. */
export async function currentUser(): Promise<UserRecord | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const { rows } = await query<UserRecord>(
    `select u.id::text as id, u.name, u.email, u.is_premium as "isPremium"
       from sessions s
       join users u on u.id = s.user_id
      where s.id = $1 and s.expires_at > now()`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
}
