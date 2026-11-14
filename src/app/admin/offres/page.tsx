import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import Submit from "@/components/Submit";
import { savePlan } from "../actions";
export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await requirePerm("billing");
  const { ok } = await searchParams;
  const plans = await db.plan.findMany({ orderBy: { sort: "asc" } });
  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-extrabold">Offres et tarifs</h1><p className="muted mb-4">Les nouveaux tarifs s'appliquent aux prochaines souscriptions. Les abonnements en cours conservent leur prix jusqu'à ce que vous les migriez depuis Stripe.</p>
      {ok && <div className="mb-3 rounded-2xl bg-pitch-50 p-3 text-sm font-semibold text-pitch-800">Offre mise à jour.</div>}
      <div className="grid gap-4 md:grid-cols-2">{plans.map((p) => (
        <form key={p.tier} action={savePlan} className="card space-y-3"><input type="hidden" name="tier" value={p.tier} />
          <div className="flex items-center justify-between"><span className="chip">{p.tier}</span>{p.tier !== "DECOUVERTE" && <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={p.active} />Commercialisée</label>}</div>
          <div><label className="label">Nom</label><input name="name" defaultValue={p.name} className="input" aria-label="Nom" /></div>
          <div><label className="label">Accroche</label><input name="tagline" defaultValue={p.tagline} className="input" aria-label="Accroche" /></div>
          {p.tier !== "DECOUVERTE" && <div className="grid grid-cols-3 gap-2"><div><label className="label">Mensuel (€)</label><input name="monthly" defaultValue={(p.monthlyCents / 100).toFixed(2)} inputMode="decimal" className="input" aria-label="Prix mensuel" /></div><div><label className="label">Annuel (€)</label><input name="yearly" defaultValue={(p.yearlyCents / 100).toFixed(2)} inputMode="decimal" className="input" aria-label="Prix annuel" /></div><div><label className="label">Essai (jours)</label><input name="trialDays" type="number" min={0} max={60} defaultValue={p.trialDays} className="input" aria-label="Jours d'essai" /></div></div>}
          <div><label className="label">Fonctionnalités affichées (une par ligne)</label><textarea name="features" rows={6} defaultValue={p.features.join("\n")} className="input text-sm" aria-label="Fonctionnalités" /></div>
          <p className="muted">Profils enfants : {p.maxChildren}. Les droits techniques de chaque offre sont définis dans <code>src/lib/plans.ts</code>.</p>
          <Submit className="btn-primary">Enregistrer</Submit>
        </form>
      ))}</div>
    </div>
  );
}
