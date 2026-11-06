import type Stripe from 'stripe';
import { ApiError, jsonError, jsonOk } from '@/lib/api';
import { withTransaction } from '@/lib/db';
import { getStripe } from '@/lib/stripe';

/**
 * Webhook de Stripe. Verifica la firma y es idempotente: cada evento se procesa una sola vez
 * (la inserción en `stripe_events` y el cambio de estado van en la misma transacción).
 */
export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripe || !secret) throw new ApiError(503, 'stripe_not_configured');

    const signature = req.headers.get('stripe-signature');
    if (!signature) throw new ApiError(400, 'missing_signature');

    const payload = await req.text();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, secret);
    } catch {
      throw new ApiError(400, 'invalid_signature');
    }

    await withTransaction(async (client) => {
      const inserted = await client.query(
        'insert into stripe_events (id, type) values ($1, $2) on conflict (id) do nothing returning id',
        [event.id, event.type],
      );
      if (inserted.rowCount === 0) return; // ya procesado

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id ?? session.client_reference_id;
        if (session.mode === 'payment' && session.payment_status === 'paid' && userId) {
          const customer = typeof session.customer === 'string' ? session.customer : null;
          await client.query(
            `update users set is_premium = true, stripe_customer_id = coalesce(stripe_customer_id, $2)
              where id = $1`,
            [userId, customer],
          );
          await client.query(
            `insert into purchases (user_id, stripe_session_id, product, amount_cents, currency, status)
             values ($1, $2, 'premium', $3, $4, 'paid')
             on conflict (stripe_session_id) do nothing`,
            [userId, session.id, session.amount_total, session.currency],
          );
        }
      }
    });

    return jsonOk({ received: true });
  } catch (err) {
    return jsonError(err);
  }
}
