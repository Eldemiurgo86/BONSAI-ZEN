import { jsonError, jsonOk } from '@/lib/api';
import { currentUser } from '@/lib/auth';
import { getProgressSummary } from '@/lib/progress';

/**
 * Estado de la sesión. Un visitante sin cuenta recibe `user: null` con código 200
 * (así el navegador no registra un error en consola por cada comprobación).
 */
export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return jsonOk({ user: null, progress: null });
    const progress = await getProgressSummary(user);
    return jsonOk({
      user: { id: user.id, name: user.name, email: user.email, isPremium: user.isPremium },
      progress,
    });
  } catch (err) {
    return jsonError(err);
  }
}
