import Stripe from 'stripe';

let client: Stripe | null = null;

/** Cliente de Stripe, o null si falta STRIPE_SECRET_KEY (la tienda queda deshabilitada sin romper la app). */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key);
  return client;
}

export function premiumPriceId(): string | null {
  return process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || null;
}

export function appUrl(req: Request): string {
  return (process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin).replace(/\/$/, '');
}
