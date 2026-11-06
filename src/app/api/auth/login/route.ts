import { ApiError, jsonError, jsonOk, readJson, readString } from '@/lib/api';
import { normalizeEmail, startSession, verifyPassword } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const email = normalizeEmail(readString(body.email, 'email', 3, 254));
    const password = readString(body.password, 'password', 1, 200);

    const { rows } = await query<{ id: string; password_hash: string }>(
      'select id::text, password_hash from users where email = $1',
      [email],
    );
    const user = rows[0];
    const valid = user ? await verifyPassword(password, user.password_hash) : false;
    if (!user || !valid) throw new ApiError(401, 'invalid_credentials');

    await startSession(user.id);
    return jsonOk({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
