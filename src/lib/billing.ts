// Abonnements. Avec STRIPE_SECRET_KEY : Stripe Checkout + portail + webhooks.
// Sans clé : mode démonstration (aucun débit), clairement signalé dans l'interface.
import Stripe from "stripe";
import type { PlanTier } from "@prisma/client";
import { db } from "./db";
import { APP_NAME } from "@/content/taxonomy";

export const stripeEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY);
let s: Stripe | null = null;
export const stripe = () => (s ??= new Stripe(process.env.STRIPE_SECRET_KEY!));
const base = () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function nextInvoiceNumber(): Promise<string> {
  const y = new Date().getFullYear();
  const n = await db.payment.count({ where: { invoiceNumber: { startsWith: `F${y}-` } } });
  return `F${y}-${String(n + 1).padStart(6, "0")}`;
}

export async function startCheckout(userId: string, email: string, tier: PlanTier, interval: "month" | "year"): Promise<{ url?: string; demo?: boolean }> {
  const plan = await db.plan.findUnique({ where: { tier } });
  if (!plan || !plan.active || tier === "DECOUVERTE") throw new Error("Offre indisponible.");
  const amount = interval === "year" ? plan.yearlyCents : plan.monthlyCents;
  const sub = await db.subscription.findUnique({ where: { userId } });
  const hadPaid = await db.payment.count({ where: { userId, status: "paid" } });
  const trialDays = hadPaid === 0 && (!sub?.trialEndsAt || sub.trialEndsAt > new Date()) ? plan.trialDays : 0;

  if (!stripeEnabled()) {
    const now = new Date();
    const end = new Date(now); interval === "year" ? end.setFullYear(end.getFullYear() + 1) : end.setMonth(end.getMonth() + 1);
    await db.subscription.upsert({ where: { userId }, update: { tier, status: "ACTIVE", interval, currentPeriodEnd: end, cancelAtPeriodEnd: false, provider: "demo", trialEndsAt: null }, create: { userId, tier, status: "ACTIVE", interval, currentPeriodEnd: end, provider: "demo" } });
    await db.payment.create({ data: { userId, amountCents: amount, status: "paid", description: `${APP_NAME} ${plan.name} — ${interval === "year" ? "annuel" : "mensuel"} (démonstration, aucun débit)`, invoiceNumber: await nextInvoiceNumber(), provider: "demo" } });
    return { demo: true };
  }
  let customer = sub?.stripeCustomerId ?? undefined;
  if (!customer) {
    customer = (await stripe().customers.create({ email, metadata: { userId } })).id;
    await db.subscription.upsert({ where: { userId }, update: { stripeCustomerId: customer }, create: { userId, stripeCustomerId: customer } });
  }
  const session = await stripe().checkout.sessions.create({
    mode: "subscription", customer, locale: "fr",
    line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: amount, recurring: { interval }, product_data: { name: `${APP_NAME} ${plan.name}` } } }],
    subscription_data: { metadata: { userId, tier, interval }, ...(trialDays > 0 ? { trial_period_days: trialDays } : {}) },
    metadata: { userId, tier, interval },
    success_url: `${base()}/app/abonnement?ok=1`, cancel_url: `${base()}/app/abonnement?annule=1`,
  });
  return { url: session.url ?? undefined };
}

export async function cancelSubscription(userId: string) {
  const sub = await db.subscription.findUnique({ where: { userId } });
  if (!sub) return;
  if (sub.provider === "stripe" && sub.stripeSubscriptionId && stripeEnabled()) await stripe().subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
  // Résiliation effective à la fin de la période payée ; un essai s'arrête immédiatement.
  await db.subscription.update({ where: { userId }, data: sub.status === "TRIALING" ? { status: "ACTIVE", tier: "DECOUVERTE", trialEndsAt: null, cancelAtPeriodEnd: false, currentPeriodEnd: null } : { cancelAtPeriodEnd: true, status: "CANCELED" } });
}
export async function resumeSubscription(userId: string) {
  const sub = await db.subscription.findUnique({ where: { userId } });
  if (!sub || !sub.currentPeriodEnd || sub.currentPeriodEnd < new Date()) return;
  if (sub.provider === "stripe" && sub.stripeSubscriptionId && stripeEnabled()) await stripe().subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: false });
  await db.subscription.update({ where: { userId }, data: { cancelAtPeriodEnd: false, status: "ACTIVE" } });
}
export async function portalUrl(userId: string): Promise<string | null> {
  const sub = await db.subscription.findUnique({ where: { userId } });
  if (!stripeEnabled() || !sub?.stripeCustomerId) return null;
  return (await stripe().billingPortal.sessions.create({ customer: sub.stripeCustomerId, return_url: `${base()}/app/abonnement` })).url;
}

// Traitement des évènements Stripe (signature vérifiée dans la route).
export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const cs = event.data.object as Stripe.Checkout.Session;
      if (cs.metadata?.giftId && cs.payment_status === "paid") await markGiftPaid(cs.metadata.giftId, "stripe", typeof cs.payment_intent === "string" ? cs.payment_intent : cs.payment_intent?.id);
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (!userId) return;
      const item = sub.items.data[0] as Stripe.SubscriptionItem & { current_period_end?: number };
      const periodEnd = item?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;
      const status = sub.status === "trialing" ? "TRIALING" : sub.status === "active" ? (sub.cancel_at_period_end ? "CANCELED" : "ACTIVE") : sub.status === "past_due" || sub.status === "unpaid" ? "PAST_DUE" : "CANCELED";
      await db.subscription.update({ where: { userId }, data: {
        tier: (sub.metadata.tier as PlanTier) ?? "ESSENTIEL", interval: sub.metadata.interval ?? "month", status, provider: "stripe", stripeSubscriptionId: sub.id,
        cancelAtPeriodEnd: sub.cancel_at_period_end, trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null, currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      } });
      return;
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice;
      const customer = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
      const sub = customer ? await db.subscription.findFirst({ where: { stripeCustomerId: customer } }) : null;
      if (!sub) return;
      const paid = event.type === "invoice.paid";
      if ((inv.amount_paid ?? 0) === 0 && paid) return; // facture d'essai à 0 €
      if (await db.payment.findFirst({ where: { providerRef: inv.id, status: paid ? "paid" : "failed" } })) return; // idempotence
      await db.payment.create({ data: { userId: sub.userId, amountCents: paid ? inv.amount_paid : inv.amount_due, status: paid ? "paid" : "failed", description: `${APP_NAME} — abonnement`, invoiceNumber: await nextInvoiceNumber(), provider: "stripe", providerRef: inv.id } });
      if (!paid) {
        await db.subscription.update({ where: { userId: sub.userId }, data: { status: "PAST_DUE" } });
        await db.notification.create({ data: { userId: sub.userId, kind: "report", title: "Paiement non abouti", body: "Votre dernier paiement n'a pas pu être prélevé. Vous gardez l'accès pendant 7 jours : mettez à jour votre moyen de paiement quand vous le pouvez.", href: "/app/abonnement" } });
      }
      return;
    }
  }
}

// ───── Droit de rétractation (14 jours, remboursement au prorata des jours utilisés : art. L221-25) ─────
export async function withdrawalWindow(userId: string) {
  const sub = await db.subscription.findUnique({ where: { userId } });
  if (!sub || sub.tier === "DECOUVERTE") return null;
  const pay = await db.payment.findFirst({ where: { userId, status: "paid", amountCents: { gt: 0 } }, orderBy: { createdAt: "desc" } });
  if (!pay || Date.now() - pay.createdAt.getTime() > 14 * 86400000) return null;
  if (await db.payment.findFirst({ where: { userId, status: "refunded", createdAt: { gte: pay.createdAt } } })) return null;
  return { pay, sub, until: new Date(pay.createdAt.getTime() + 14 * 86400000) };
}

export async function withdrawSubscription(userId: string): Promise<number> {
  const w = await withdrawalWindow(userId);
  if (!w) throw new Error("Hors délai de rétractation.");
  const periodDays = w.sub.interval === "year" ? 365 : 30;
  const used = Math.min(periodDays, Math.ceil((Date.now() - w.pay.createdAt.getTime()) / 86400000));
  const refund = Math.max(0, Math.round(w.pay.amountCents * (1 - used / periodDays)));
  let providerRef: string | null = null;
  if (w.sub.provider === "stripe" && stripeEnabled()) {
    if (w.sub.stripeSubscriptionId) await stripe().subscriptions.cancel(w.sub.stripeSubscriptionId);
    if (w.pay.providerRef && refund > 0) {
      const inv = (await stripe().invoices.retrieve(w.pay.providerRef, { expand: ["payments"] })) as unknown as { payment_intent?: string | { id: string }; payments?: { data?: { payment?: { payment_intent?: string | { id: string } } }[] } };
      const pi = inv.payment_intent ?? inv.payments?.data?.[0]?.payment?.payment_intent;
      const id = typeof pi === "string" ? pi : pi?.id;
      if (id) providerRef = (await stripe().refunds.create({ payment_intent: id, amount: refund })).id;
      else console.error("rétractation : paiement Stripe introuvable, remboursement à faire manuellement", w.pay.providerRef);
    }
  }
  await db.payment.create({ data: { userId, amountCents: refund, status: "refunded", description: `Remboursement — rétractation (${used} jour${used > 1 ? "s" : ""} utilisé${used > 1 ? "s" : ""})`, invoiceNumber: await nextInvoiceNumber(), provider: w.sub.provider, providerRef } });
  await db.subscription.update({ where: { userId }, data: { tier: "DECOUVERTE", status: "ACTIVE", currentPeriodEnd: null, cancelAtPeriodEnd: false, trialEndsAt: null } });
  return refund;
}

// ───── Carte cadeau « Une saison » : 12 mois d'abonnement Famille, paiement unique, sans renouvellement ─────
export const giftPriceCents = () => Number(process.env.GIFT_PRICE_CENTS ?? "2900");

export async function markGiftPaid(giftId: string, provider: string, providerRef?: string) {
  const g = await db.giftCode.findUnique({ where: { id: giftId } });
  if (!g || g.paid) return g;
  const paid = await db.giftCode.update({ where: { id: giftId }, data: { paid: true, provider, providerRef } });
  await db.payment.create({ data: { amountCents: g.amountCents, status: "paid", description: `${APP_NAME} — carte cadeau Une saison${provider === "demo" ? " (démonstration, aucun débit)" : ""}`, invoiceNumber: await nextInvoiceNumber(), provider, providerRef } });
  const { sendEmail } = await import("./mail");
  await sendEmail({ to: g.purchaserEmail, subject: "Votre carte cadeau Premiers Pas Foot", kind: "cadeau", text: `Merci !\n\nVoici le code cadeau à offrir : ${g.code}\n\nIl donne ${g.months} mois d'abonnement Famille (jusqu'à 3 enfants), sans renouvellement automatique.\nPour l'utiliser : créer un compte sur ${base()}/inscription, puis « Mon abonnement » → « J'ai un code cadeau ».\n\nVous disposez de 14 jours pour vous rétracter tant que le code n'a pas été utilisé.` });
  return paid;
}

export async function startGiftCheckout(giftId: string): Promise<{ url?: string }> {
  const g = await db.giftCode.findUnique({ where: { id: giftId } });
  if (!g) throw new Error("Carte introuvable.");
  if (!stripeEnabled()) { await markGiftPaid(giftId, "demo"); return {}; }
  const session = await stripe().checkout.sessions.create({
    mode: "payment", locale: "fr", customer_email: g.purchaserEmail,
    line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: g.amountCents, product_data: { name: `${APP_NAME} — carte cadeau Une saison (${g.months} mois)` } } }],
    metadata: { giftId }, success_url: `${base()}/cadeau/merci?g=${giftId}`, cancel_url: `${base()}/cadeau?annule=1`,
  });
  return { url: session.url ?? undefined };
}

export async function redeemGift(userId: string, rawCode: string): Promise<string | null> {
  const code = rawCode.trim().toUpperCase();
  const g = await db.giftCode.findUnique({ where: { code } });
  if (!g || !g.paid) return "Ce code n'est pas reconnu. Vérifiez les tirets et les lettres.";
  if (g.redeemedAt) return "Ce code a déjà été utilisé.";
  const sub = await db.subscription.findUnique({ where: { userId } });
  // Si un abonnement payant est en cours, les mois offerts s'ajoutent à la suite.
  const from = sub && sub.tier !== "DECOUVERTE" && sub.status !== "TRIALING" && sub.currentPeriodEnd && sub.currentPeriodEnd > new Date() ? new Date(sub.currentPeriodEnd) : new Date();
  if (sub?.provider === "stripe" && sub.status === "ACTIVE" && !sub.cancelAtPeriodEnd) return "Vous avez déjà un abonnement en cours avec renouvellement. Résiliez-le d'abord : les mois offerts s'ajouteront à la fin de la période payée.";
  from.setMonth(from.getMonth() + g.months);
  await db.subscription.upsert({ where: { userId }, update: { tier: "FAMILLE", status: "CANCELED", cancelAtPeriodEnd: true, currentPeriodEnd: from, trialEndsAt: null, provider: sub?.provider === "stripe" ? "stripe" : "gift" }, create: { userId, tier: "FAMILLE", status: "CANCELED", cancelAtPeriodEnd: true, currentPeriodEnd: from, provider: "gift" } });
  await db.giftCode.update({ where: { id: g.id }, data: { redeemedById: userId, redeemedAt: new Date() } });
  return null;
}
