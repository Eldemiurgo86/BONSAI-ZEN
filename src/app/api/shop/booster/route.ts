import { ApiError, jsonError, jsonOk, readJson, readOneOf } from '@/lib/api';
import { currentUser } from '@/lib/auth';
import { buyBooster } from '@/lib/progress';
import { BOOSTERS } from '@/game/types';

/** Compra un booster con monedas del juego. */
export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) throw new ApiError(401, 'unauthorized');
    const body = await readJson(req);
    const booster = readOneOf(body.booster, 'booster', BOOSTERS);
    const result = await buyBooster(user, booster);
    return jsonOk({ ok: true, ...result });
  } catch (err) {
    return jsonError(err);
  }
}
