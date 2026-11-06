import { ApiError, jsonError, jsonOk, readJson } from '@/lib/api';
import { currentUser } from '@/lib/auth';
import { finishLevel, parseFinishInput } from '@/lib/progress';

/** Registra el resultado de una partida. El servidor calcula estrellas, monedas y logros. */
export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) throw new ApiError(401, 'unauthorized');
    const body = await readJson(req);
    const input = parseFinishInput(body);
    const result = await finishLevel(user, input);
    return jsonOk({ ok: true, ...result });
  } catch (err) {
    return jsonError(err);
  }
}
