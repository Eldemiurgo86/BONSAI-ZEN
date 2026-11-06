import { ApiError, jsonError, jsonOk, readJson, readOneOf } from '@/lib/api';
import { currentUser } from '@/lib/auth';
import { setDifficulty } from '@/lib/progress';
import { canUseDifficulty } from '@/lib/premium';

/** Guarda la dificultad elegida en el progreso del jugador (persiste entre sesiones). */
export async function PATCH(req: Request) {
  try {
    const user = await currentUser();
    if (!user) throw new ApiError(401, 'unauthorized');
    const body = await readJson(req);
    const difficulty = readOneOf(body.difficulty, 'difficulty', ['novato', 'pro'] as const);
    // Elegir Pro siempre se guarda; el acceso a cada nivel se valida al jugarlo.
    if (!canUseDifficulty(difficulty, 1, user.isPremium)) throw new ApiError(403, 'difficulty_premium_required');
    await setDifficulty(user, difficulty);
    return jsonOk({ ok: true, difficulty });
  } catch (err) {
    return jsonError(err);
  }
}
