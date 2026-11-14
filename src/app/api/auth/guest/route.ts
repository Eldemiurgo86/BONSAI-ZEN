import { randomBytes, randomUUID } from 'node:crypto';
import { jsonError, jsonOk } from '@/lib/api';
import { currentUser, hashPassword, startSession } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { createInitialProgress } from '@/lib/progress';

/**
 * Entrada sin login: crea una cuenta de invitado con progreso propio y su sesión.
 * La contraseña es aleatoria y nadie la conoce, así que la cuenta solo se usa desde este navegador.
 */
export async function POST() {
  try {
    if (await currentUser()) return jsonOk({ ok: true, created: false });

    const passwordHash = await hashPassword(randomBytes(24).toString('base64url'));
    const email = `guest-${randomUUID()}@guest.bonsai-zen.local`;
    const userId = await withTransaction(async (client) => {
      const { rows } = await client.query<{ id: string }>(
        'insert into users (name, email, password_hash) values ($1, $2, $3) returning id::text',
        ['Invitado', email, passwordHash],
      );
      await createInitialProgress(client, rows[0].id);
      return rows[0].id;
    });

    await startSession(userId);
    return jsonOk({ ok: true, created: true }, 201);
  } catch (err) {
    return jsonError(err);
  }
}
