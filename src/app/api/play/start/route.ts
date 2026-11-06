import { ApiError, jsonError, jsonOk, readInt, readJson, readOneOf } from '@/lib/api';
import { currentUser } from '@/lib/auth';
import { startLevel } from '@/lib/progress';
import { TOTAL_LEVELS } from '@/data/levels';

/** Inicia un nivel: valida acceso y consume una vida (modo gratis). */
export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) throw new ApiError(401, 'unauthorized');
    const body = await readJson(req);
    const levelId = readInt(body.levelId, 'level', 1, TOTAL_LEVELS);
    const difficulty = readOneOf(body.difficulty, 'difficulty', ['novato', 'pro'] as const);
    const result = await startLevel(user, levelId, difficulty);
    return jsonOk({ ok: true, ...result });
  } catch (err) {
    return jsonError(err);
  }
}
