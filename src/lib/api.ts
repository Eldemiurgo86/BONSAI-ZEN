import { NextResponse } from 'next/server';
import { DatabaseNotConfiguredError } from './db';

/** Error controlado que se traduce a una respuesta JSON con código HTTP. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly extra?: Record<string, unknown>,
  ) {
    super(code);
    this.name = 'ApiError';
  }
}

export function jsonOk<T extends object>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function jsonError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.code, ...err.extra }, { status: err.status, headers: { 'Cache-Control': 'no-store' } });
  }
  if (err instanceof DatabaseNotConfiguredError) {
    return NextResponse.json({ error: 'database_not_configured' }, { status: 503 });
  }
  console.error('[api] error inesperado:', err);
  return NextResponse.json({ error: 'internal_error' }, { status: 500 });
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new ApiError(400, 'invalid_body');
    }
    return body as Record<string, unknown>;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(400, 'invalid_json');
  }
}

export function readInt(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new ApiError(400, `invalid_${field}`);
  }
  return value;
}

export function readBool(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new ApiError(400, `invalid_${field}`);
  return value;
}

export function readString(value: unknown, field: string, minLen: number, maxLen: number): string {
  if (typeof value !== 'string' || value.length < minLen || value.length > maxLen) {
    throw new ApiError(400, `invalid_${field}`);
  }
  return value;
}

export function readOneOf<T extends string>(value: unknown, field: string, options: readonly T[]): T {
  if (typeof value !== 'string' || !(options as readonly string[]).includes(value)) {
    throw new ApiError(400, `invalid_${field}`);
  }
  return value as T;
}

/** Usuario autenticado o error 401. */
export function requireAuth<T>(user: T | null): T {
  if (!user) throw new ApiError(401, 'unauthorized');
  return user;
}
