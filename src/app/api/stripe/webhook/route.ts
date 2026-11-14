import { NextRequest } from "next/server";
import { handleStripeEvent, stripe, stripeEnabled } from "@/lib/billing";

export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  if (!stripeEnabled() || !process.env.STRIPE_WEBHOOK_SECRET) return new Response("Stripe non configuré", { status: 503 });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Signature manquante", { status: 400 });
  let event;
  try { event = stripe().webhooks.constructEvent(await req.text(), sig, process.env.STRIPE_WEBHOOK_SECRET); } catch { return new Response("Signature invalide", { status: 400 }); }
  try { await handleStripeEvent(event); } catch (e) { console.error("stripe webhook", e); return new Response("Erreur de traitement", { status: 500 }); }
  return Response.json({ received: true });
}
