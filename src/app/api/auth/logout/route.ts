import { endSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';

export async function POST() {
  try {
    await endSession();
    return jsonOk({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
