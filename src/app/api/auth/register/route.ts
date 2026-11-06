import { ApiError, jsonError, jsonOk, readJson, readString } from '@/lib/api';
import { hashPassword, normalizeEmail, startSession } from '@/lib/auth';
import { query, withTransaction } from '@/lib/db';
import { createInitialProgress } from '@/lib/progress';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const name = readString(body.name, 'name', 1, 40).trim();
    const email = normalizeEmail(readString(body.email, 'email', 3, 254));
    const password = readString(body.password, 'password', 8, 200);
    if (!EMAIL_RE.test(email)) throw new ApiError(400, 'invalid_email');

    const passwordHash = await hashPassword(password);
    const userId = await withTransaction(async (client) => {
      const existing = await client.query('select 1 from users where email = $1', [email]);
      if (existing.rowCount) throw new ApiError(409, 'email_taken');
      const { rows } = await client.query<{ id: string }>(
        'insert into users (name, email, password_hash) values ($1, $2, $3) returning id::text',
        [name, email, passwordHash],
      );
      await createInitialProgress(client, rows[0].id);
      return rows[0].id;
    });

    await startSession(userId);
    return jsonOk({ ok: true }, 201);
  } catch (err) {
    return jsonError(err);
  }
}
