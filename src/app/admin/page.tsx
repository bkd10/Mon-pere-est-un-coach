import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { effectiveTier, euro } from "@/lib/plans";
import { aiAvailable } from "@/lib/coach";
import { stripeEnabled } from "@/lib/billing";

const Stat = ({ l, v, s }: { l: string; v: string | number; s?: string }) => <div className="card"><div className="text-xs font-bold uppercase tracking-wide text-ink-500">{l}</div><div className="font-display text-3xl font-extrabold">{v}</div>{s && <div className="muted">{s}</div>}</div>;
export default async function Page() {
  await requirePerm("stats");
  const d30 = new Date(Date.now() - 30 * 86400000), d7 = new Date(Date.now() - 7 * 86400000);
  const [users, children, subs, plans, done30, active7, paid30, exercises, guides, pending, events, feedback, logs] = await Promise.all([
    db.user.count({ where: { role: "PARENT" } }), db.child.count(), db.subscription.findMany(), db.plan.findMany(),
    db.plannedSession.count({ where: { status: "DONE", completedAt: { gte: d30 } } }), db.user.count({ where: { role: "PARENT", lastSeenAt: { gte: d7 } } }),
    db.payment.aggregate({ where: { status: "paid", provider: { not: "demo" }, createdAt: { gte: d30 } }, _sum: { amountCents: true } }),
    db.exercise.count({ where: { published: true } }), db.guide.count({ where: { published: true } }), db.media.count({ where: { status: "PENDING" } }),
    db.usageEvent.groupBy({ by: ["name"], where: { day: { gte: d30 } }, _sum: { count: true } }),
    db.sessionFeedback.aggregate({ where: { createdAt: { gte: d30 } }, _avg: { enjoyment: true, motivation: true, energy: true }, _count: true }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
  ]);
  const tiers: Record<string, number> = { DECOUVERTE: 0, ESSENTIEL: 0, PREMIUM: 0, FAMILLE: 0 };
  let mrr = 0, trials = 0;
  for (const s of subs) { const t = effectiveTier(s); if (s.status === "TRIALING" && t !== "DECOUVERTE") { trials++; continue; } tiers[t]++; if (t !== "DECOUVERTE" && s.status === "ACTIVE" && s.provider !== "none") { const p = plans.find((x) => x.tier === t); if (p) mrr += s.interval === "year" ? p.yearlyCents / 12 : p.monthlyCents; } }
  tiers.DECOUVERTE += users - subs.length;
  const payers = tiers.ESSENTIEL + tiers.PREMIUM + tiers.FAMILLE;
  const ev = (n: string) => events.find((e) => e.name === n)?._sum.count ?? 0;
  const LABEL: Record<string, string> = { signup: "Inscriptions", login: "Connexions", child_created: "Profils enfants créés", session_done: "Séances terminées", challenge_done: "Défis validés", coach_question: "Questions au coach", checkout_started: "Paiements initiés", shop_interest: "Intérêts pour le matériel" };
  return (
    <div>
      <h1 className="mb-4 font-display text-2xl font-extrabold">Tableau de bord</h1>
      <div className="mb-4 flex flex-wrap gap-2 text-sm"><span className={`chip ${stripeEnabled() ? "bg-pitch-100 text-pitch-800" : "bg-sun-100"}`}>Paiement : {stripeEnabled() ? "Stripe actif" : "mode démonstration (STRIPE_SECRET_KEY absente)"}</span><span className={`chip ${aiAvailable() ? "bg-pitch-100 text-pitch-800" : "bg-sun-100"}`}>Coach IA : {aiAvailable() ? "Claude actif" : "mode fiches (ANTHROPIC_API_KEY absente)"}</span>{pending > 0 && <span className="chip bg-coral-100 text-coral-600">{pending} vidéo(s) à modérer</span>}</div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat l="Parents inscrits" v={users} s={`${active7} actifs sur 7 jours`} /><Stat l="Profils enfants" v={children} s="donnée agrégée" /><Stat l="Abonnés payants" v={payers} s={`${trials} essai(s) en cours`} /><Stat l="Revenu mensuel récurrent" v={euro(Math.round(mrr))} s={`${euro(paid30._sum.amountCents ?? 0)} encaissés sur 30 j`} />
        <Stat l="Séances réalisées" v={done30} s="30 derniers jours" /><Stat l="Conversion" v={users ? `${Math.round((payers / users) * 100)} %` : "—"} s="payants / inscrits" /><Stat l="Exercices publiés" v={exercises} /><Stat l="Guides publiés" v={guides} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="card"><h2 className="mb-2 font-bold">Répartition des offres</h2>{Object.entries(tiers).map(([k, n]) => <div key={k} className="mb-2"><div className="flex justify-between text-sm font-semibold"><span>{plans.find((p) => p.tier === k)?.name ?? k}</span><span>{n}</span></div><div className="h-2 rounded-full bg-ink-100"><div className="h-2 rounded-full bg-pitch-500" style={{ width: `${users ? (n / Math.max(users, 1)) * 100 : 0}%` }} /></div></div>)}</div>
        <div className="card"><h2 className="mb-2 font-bold">Usage agrégé · 30 jours</h2><table className="w-full text-sm"><tbody>{Object.entries(LABEL).map(([k, l]) => <tr key={k} className="border-t border-ink-100"><td className="py-1.5">{l}</td><td className="text-right font-bold">{ev(k)}</td></tr>)}</tbody></table><p className="muted mt-2">Compteurs journaliers sans identifiant d'utilisateur ni d'enfant.</p></div>
        <div className="card"><h2 className="mb-2 font-bold">Ressenti des familles · 30 jours</h2>{feedback._count ? <table className="w-full text-sm"><tbody><tr className="border-t border-ink-100"><td className="py-1.5">Plaisir moyen</td><td className="text-right font-bold">{feedback._avg.enjoyment?.toFixed(2)} / 3</td></tr><tr className="border-t border-ink-100"><td className="py-1.5">Motivation moyenne</td><td className="text-right font-bold">{feedback._avg.motivation?.toFixed(2)} / 3</td></tr><tr className="border-t border-ink-100"><td className="py-1.5">Forme moyenne</td><td className="text-right font-bold">{feedback._avg.energy?.toFixed(2)} / 3</td></tr><tr className="border-t border-ink-100"><td className="py-1.5">Questionnaires</td><td className="text-right font-bold">{feedback._count}</td></tr></tbody></table> : <p className="muted">Pas encore de questionnaire.</p>}</div>
      </div>
      <div className="card mt-4"><h2 className="mb-2 font-bold">Journal des actions sensibles</h2><table className="w-full text-sm"><tbody>{logs.map((l) => <tr key={l.id} className="border-t border-ink-100"><td className="py-1.5 text-ink-500">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(l.createdAt)}</td><td className="font-semibold">{l.action}</td><td className="text-ink-500">{l.detail}</td></tr>)}</tbody></table></div>
    </div>
  );
}
