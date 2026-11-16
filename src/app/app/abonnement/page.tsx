import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cancelSub, resumeSub, useGiftCode, withdrawSub } from "@/app/actions";
import { withdrawalWindow } from "@/lib/billing";
import { portalUrl, stripeEnabled } from "@/lib/billing";
import { effectiveTier, euro } from "@/lib/plans";
import { Notice, PageHead, Section } from "@/components/ui";
import Submit from "@/components/Submit";

export const metadata = { title: "Mon abonnement" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [plans, payments, portal] = await Promise.all([db.plan.findMany({ where: { active: true }, orderBy: { sort: "asc" } }), db.payment.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 24 }), portalUrl(user.id).catch(() => null)]);
  const sub = user.subscription;
  const tier = effectiveTier(sub);
  const yearly = sp.periode === "an"; // mensuel par défaut : on ne pré-sélectionne pas l'engagement le plus long
  const fmt = (d: Date) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(d);
  const trialing = sub?.status === "TRIALING" && sub.trialEndsAt && sub.trialEndsAt > new Date();
  const current = plans.find((p) => p.tier === tier);
  const w = await withdrawalWindow(user.id);
  return (
    <div>
      <PageHead title="Mon abonnement" back="/app/menu" />
      {sp.ok && <Notice tone="ok">C'est noté : votre offre est à jour.</Notice>}{sp.cadeau && <Notice tone="ok">🎁 Code cadeau activé : votre abonnement Famille est ouvert, sans aucun prélèvement à la fin.</Notice>}{sp.retracte && <Notice tone="ok">Rétractation enregistrée : l'abonnement est arrêté et le remboursement au prorata est lancé. Une confirmation est disponible dans vos notifications.</Notice>}{sp.resilie && <Notice>Abonnement résilié. Vous gardez l'accès jusqu'à la fin de la période déjà réglée, puis votre compte passe en offre Découverte. Vos données sont conservées.</Notice>}{sp.annule && <Notice>Paiement annulé : rien n'a été débité.</Notice>}{sp.e && <Notice tone="warn">{sp.e}</Notice>}
      {!stripeEnabled() && <Notice>🧪 <b>Mode démonstration</b> : le paiement en ligne n'est pas encore branché sur cette installation. Choisir une offre l'active immédiatement, sans aucun débit.</Notice>}
      <div className="card mb-5 bg-pitch-700 text-white">
        <div className="text-sm font-bold text-white/90">Offre actuelle</div><div className="font-display text-3xl font-extrabold">{current?.name ?? "Découverte"}</div>
        <p className="mt-1 text-sm text-white/85">{trialing ? `Essai gratuit jusqu'au ${fmt(sub!.trialEndsAt!)}. Sans action de votre part, vous passerez simplement en offre Découverte : aucun prélèvement.` : sub?.status === "CANCELED" && sub.currentPeriodEnd && sub.currentPeriodEnd > new Date() ? `Résilié — accès jusqu'au ${fmt(sub.currentPeriodEnd)}.` : sub?.status === "PAST_DUE" ? "Le dernier paiement n'a pas abouti. L'accès est maintenu 7 jours." : tier !== "DECOUVERTE" && sub?.currentPeriodEnd ? `Prochain renouvellement le ${fmt(sub.currentPeriodEnd)} (${sub.interval === "year" ? "annuel" : "mensuel"}).` : "Gratuite, sans limite de durée."}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {portal && <a href={portal} className="btn-sun btn-sm">Moyen de paiement et factures</a>}
          {tier !== "DECOUVERTE" && sub?.status !== "CANCELED" && <form action={cancelSub}><Submit className="btn btn-sm bg-white/15 text-white" confirm={trialing ? "Arrêter l'essai et passer en offre Découverte ?" : "Résilier l'abonnement ? Vous gardez l'accès jusqu'à la fin de la période payée."}>{trialing ? "Arrêter l'essai" : "Résilier mon abonnement"}</Submit></form>}
          {sub?.status === "CANCELED" && sub.currentPeriodEnd && sub.currentPeriodEnd > new Date() && <form action={resumeSub}><Submit className="btn-sun btn-sm">Reprendre mon abonnement</Submit></form>}
        </div>
      </div>
      {w && <div className="card mb-5"><div className="font-bold">Droit de rétractation</div><p className="text-sm text-ink-700">Vous pouvez vous rétracter jusqu'au {fmt(w.until)} : l'abonnement s'arrête tout de suite et vous êtes remboursé du prix diminué des jours utilisés.</p><form action={withdrawSub} className="mt-3"><Submit className="btn-ghost w-full" confirm="Exercer votre droit de rétractation ? L'abonnement s'arrête immédiatement.">Exercer mon droit de rétractation</Submit></form></div>}
      <div className="mb-3 flex justify-center"><div className="inline-flex rounded-full bg-white p-1 shadow-card"><a href="/app/abonnement" className={`rounded-full px-4 py-2 text-sm font-bold ${!yearly ? "bg-pitch-600 text-white" : "text-ink-700"}`}>Mensuel</a><a href="/app/abonnement?periode=an" className={`rounded-full px-4 py-2 text-sm font-bold ${yearly ? "bg-pitch-600 text-white" : "text-ink-700"}`}>Annuel</a></div></div>
      <div className="space-y-3">{plans.map((p) => { const price = yearly ? p.yearlyCents : p.monthlyCents; const isCurrent = p.tier === tier && !trialing; return (
        <div key={p.tier} className={`card ${p.tier === "FAMILLE" ? "ring-2 ring-sun-400" : ""}`}>
          <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="font-display text-xl font-extrabold">{p.name}</span></div><p className="muted">{p.tagline}</p></div>
            <div className="shrink-0 text-right"><div className="font-display text-2xl font-extrabold">{price === 0 ? "0 €" : euro(price)}</div><div className="text-xs font-bold text-ink-500">{price === 0 ? "pour toujours" : yearly ? `TTC par an, soit ${euro(Math.round(p.yearlyCents / 12))} par mois (${Math.round((1 - p.yearlyCents / (p.monthlyCents * 12)) * 100)} % de moins qu'en mensuel)` : "TTC par mois"}</div></div></div>
          <ul className="mt-3 space-y-1 text-sm text-ink-700">{p.features.map((f) => <li key={f} className="flex gap-2"><span className="text-pitch-600">✓</span>{f}</li>)}</ul>
          {p.tier !== "DECOUVERTE" && (isCurrent ? <div className="mt-3 rounded-full bg-pitch-50 py-2 text-center text-sm font-bold text-pitch-800">Votre offre actuelle</div> : <a href={`/app/abonnement/confirmer?tier=${p.tier}&interval=${yearly ? "year" : "month"}`} className="btn-primary mt-3 w-full">Choisir {p.name}</a>)}
        </div>
      ); })}</div>
      <p className="muted mt-3 px-1">{/* informations précontractuelles */}Prix TTC. Sans engagement de durée minimale : renouvellement automatique à chaque échéance, résiliable ici même à tout moment. Droit de rétractation de 14 jours. Paiement sécurisé par Stripe ; nous ne stockons aucun numéro de carte. <a href="/cgu" className="font-bold text-pitch-700 underline">Conditions générales</a></p>
      <Section title="J'ai un code cadeau" className="mt-6"><form action={useGiftCode} className="card flex gap-2"><input name="code" required placeholder="DUO-XXXXX-XXXXX" aria-label="Code cadeau" className="input uppercase" autoComplete="off" /><Submit className="btn-primary shrink-0">Activer</Submit></form></Section>
      <Section title="Historique des paiements et factures" className="mt-6">{payments.length === 0 ? <div className="card muted">Aucun paiement pour l'instant.</div> : <ul className="space-y-2">{payments.map((p) => <li key={p.id} className="card flex items-center justify-between py-3 text-sm"><span><b>{p.invoiceNumber}</b><span className="muted block">{fmt(p.createdAt)} · {p.description}</span></span><span className="shrink-0 text-right"><span className={`block font-bold ${p.status === "failed" ? "text-coral-600" : ""}`}>{p.status === "refunded" ? "− " : ""}{euro(p.amountCents)}{p.status === "failed" ? " · échec" : p.status === "refunded" ? " · remboursé" : ""}</span>{p.status !== "failed" && <a href={`/app/abonnement/facture/${p.id}`} className="text-xs font-bold text-pitch-700 underline">{p.status === "refunded" ? "Avoir" : "Facture"}</a>}</span></li>)}</ul>}</Section>
    </div>
  );
}
