import { ApiError, jsonError, jsonOk } from '@/lib/api';
import { currentUser } from '@/lib/auth';
import { isPremium } from '@/lib/premium';
import { appUrl, getStripe, premiumPriceId } from '@/lib/stripe';

/** Crea una sesión de Stripe Checkout (modo pago) para el paso a Premium. */
export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) throw new ApiError(401, 'unauthorized');
    if (isPremium(user)) throw new ApiError(409, 'already_premium');

    const stripe = getStripe();
    const price = premiumPriceId();
    if (!stripe || !price) throw new ApiError(503, 'stripe_not_configured');

    const base = appUrl(req);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price, quantity: 1 }],
      client_reference_id: user.id,
      metadata: { user_id: user.id, product: 'premium' },
      success_url: `${base}/shop?status=success`,
      cancel_url: `${base}/shop?status=canceled`,
    });
    if (!session.url) throw new ApiError(502, 'checkout_unavailable');
    return jsonOk({ url: session.url });
  } catch (err) {
    return jsonError(err);
  }
}
