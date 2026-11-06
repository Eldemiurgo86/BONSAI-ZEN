import { ApiError, jsonError, jsonOk, readInt } from '@/lib/api';
import { currentUser } from '@/lib/auth';
import { leaderboard } from '@/lib/progress';

export async function GET(req: Request) {
  try {
    const user = await currentUser();
    if (!user) throw new ApiError(401, 'unauthorized');
    const url = new URL(req.url);
    const raw = url.searchParams.get('difficulty') ?? 'all';
    if (!['all', 'novato', 'pro'].includes(raw)) throw new ApiError(400, 'invalid_difficulty');
    const limit = readInt(Number(url.searchParams.get('limit') ?? 20), 'limit', 1, 100);
    const entries = await leaderboard(raw as 'all' | 'novato' | 'pro', limit);
    return jsonOk({ entries });
  } catch (err) {
    return jsonError(err);
  }
}
