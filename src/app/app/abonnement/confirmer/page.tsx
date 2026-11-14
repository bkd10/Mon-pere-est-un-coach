import Link from "next/link";
import { notFound } from "next/navigation";
import type { PlanTier } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkout } from "@/app/actions";
import { euro } from "@/lib/plans";
import { stripeEnabled } from "@/lib/billing";
import { LEGAL } from "@/content/legal";
import { Notice, PageHead } from "@/components/ui";
import Submit from "@/components/Submit";

export const metadata = { title: "Récapitulatif de commande" };
// Récapitulatif précontractuel (art. L221-5 et L221-14 du code de la consommation) avant tout paiement.
export default async function Page({ searchParams }: { searchParams: Promise<{ tier?: string; interval?: string; e?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const plan = await db.plan.findUnique({ where: { tier: (sp.tier ?? "") as PlanTier } });
  if (!plan || !plan.active || plan.tier === "DECOUVERTE") notFound();
  const yearly = sp.interval === "year";
  const price = yearly ? plan.yearlyCents : plan.monthlyCents;
  const Row = ({ l, v }: { l: string; v: string }) => <div className="flex justify-between gap-4 border-t border-ink-100 py-2 text-sm first:border-0"><span className="text-ink-500">{l}</span><span className="text-right font-semibold">{v}</span></div>;
  return (
    <div>
      <PageHead title="Récapitulatif de votre commande" back="/app/abonnement" />
      {sp.e && <Notice tone="warn">{sp.e}</Notice>}
      {!stripeEnabled() && <Notice>🧪 Mode démonstration : aucun débit ne sera effectué.</Notice>}
      <div className="card mb-4">
        <Row l="Offre" v={`${LEGAL.brand} ${plan.name}`} />
        <Row l="Prix" v={`${euro(price)} TTC ${yearly ? "par an" : "par mois"}`} />
        <Row l="Contenu" v={plan.features.slice(0, 3).join(" · ")} />
        <Row l="Durée" v={yearly ? "1 an, renouvelé automatiquement" : "1 mois, renouvelé automatiquement"} />
        <Row l="Premier paiement" v="Aujourd'hui" />
        <Row l="Résiliation" v="À tout moment depuis « Mon abonnement » ; accès jusqu'à la fin de la période payée" />
        <Row l="Rétractation" v="14 jours, remboursement au prorata des jours utilisés" />
        {yearly && <Row l="Rappel" v="Nous vous prévenons un mois avant la reconduction" />}
        <Row l="Frais supplémentaires" v="Aucun" />
      </div>
      <form action={checkout} className="space-y-3">
        <input type="hidden" name="tier" value={plan.tier} /><input type="hidden" name="interval" value={yearly ? "year" : "month"} />
        <label className="flex gap-3 rounded-2xl bg-white p-3 text-sm shadow-card"><input type="checkbox" name="cgv" required className="mt-0.5 h-5 w-5 shrink-0 accent-pitch-600" /><span>J'ai lu et j'accepte les <Link href="/cgu" target="_blank" className="font-bold text-pitch-700 underline">conditions générales de vente</Link>.</span></label>
        <label className="flex gap-3 rounded-2xl bg-white p-3 text-sm shadow-card"><input type="checkbox" name="immediate" required className="mt-0.5 h-5 w-5 shrink-0 accent-pitch-600" /><span>Je demande l'accès immédiat au service. Je garde mon droit de rétractation pendant 14 jours ; si je l'exerce, le prix correspondant aux jours utilisés restera dû.</span></label>
        <Submit className="btn-primary w-full text-base">Commander avec obligation de paiement · {euro(price)}</Submit>
      </form>
      <p className="muted mt-3">Vous serez redirigé vers la page de paiement sécurisée de Stripe.</p>
    </div>
  );
}
