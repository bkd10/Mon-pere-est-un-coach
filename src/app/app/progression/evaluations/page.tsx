import { getActiveChild } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveEvaluation } from "@/app/actions";
import { entOf } from "@/lib/services";
import { ageFromBirth, bandForAge, EVALUATIONS, metricOf, monthKey, MONTHLY_CHALLENGES } from "@/content/taxonomy";
import { Notice, PageHead, Section, Stars, Upsell } from "@/components/ui";
import Submit from "@/components/Submit";

export const metadata = { title: "Mini-évaluations" };
export default async function Page({ searchParams }: { searchParams: Promise<{ fait?: string; etoiles?: string; e?: string }> }) {
  const { user, child } = await getActiveChild();
  const sp = await searchParams;
  const ent = entOf(user);
  const band = bandForAge(ageFromBirth(child.birthDate));
  const [progress, best] = await Promise.all([db.challengeProgress.findMany({ where: { childId: child.id } }), db.measurement.findMany({ where: { childId: child.id }, orderBy: { date: "desc" } })]);
  const period = monthKey(new Date());
  const list = ent.progression ? EVALUATIONS : EVALUATIONS.slice(0, 2);
  const total = progress.reduce((a, p) => a + p.stars, 0);
  const done = EVALUATIONS.find((e) => e.key === sp.fait);
  return (
    <div>
      <PageHead title="Mini-évaluations ludiques" sub={`Des défis ${band.label}, à refaire chaque mois pour se voir progresser.`} back="/app/progression" />
      {done && <Notice tone="ok"><b>{done.label}</b> — <Stars n={Number(sp.etoiles ?? 1)} /> {sp.etoiles === "3" ? "Objectif atteint, bravo !" : sp.etoiles === "2" ? "Mieux que la dernière fois : c'est ça, progresser." : "Une étoile pour avoir essayé. C'est l'essai qui compte."}</Notice>}
      {sp.e && <Notice tone="warn">{sp.e}</Notice>}
      <div className="card mb-4 flex items-center justify-between bg-sun-100"><div><div className="font-display text-3xl font-extrabold">⭐ {total}</div><div className="text-sm font-bold">étoiles gagnées</div></div><div className="max-w-[60%] text-right text-xs text-ink-700">★ j'ai essayé · ★★ j'ai fait mieux que la dernière fois · ★★★ objectif de mon âge atteint</div></div>
      <ul className="space-y-3">{list.map((e) => { const p = progress.find((x) => x.challengeKey === e.key && x.periodKey === period); const m = metricOf(e.metric)!; const last = best.find((x) => x.metric === e.metric); const target = e.targets[band.key]; return (
        <li key={e.key} className="card">
          <div className="flex items-start justify-between gap-2"><div><div className="font-bold">{e.label}</div><div className="muted">Objectif {band.label} : {e.lowerIsBetter ? "moins de " : ""}{target} {m.unit}</div></div><div className="text-xl"><Stars n={p?.stars ?? 0} /></div></div>
          <p className="mt-2 text-sm text-ink-700">{e.how}</p>
          {last && <p className="muted mt-1">Dernier résultat : <b className="text-ink-900">{last.value} {m.unit}</b></p>}
          <form action={saveEvaluation} className="mt-3 flex gap-2"><input type="hidden" name="key" value={e.key} /><input name="value" type="number" inputMode="decimal" step="any" min="0" required className="input" placeholder={`Résultat (${m.unit})`} aria-label={`Résultat : ${e.label}`} /><Submit className="btn-primary shrink-0">Valider</Submit></form>
        </li>
      ); })}</ul>
      {!ent.progression && <div className="mt-4"><Upsell title={`${EVALUATIONS.length - 2} autres mini-évaluations`} text="Slalom, contrôles orientés, frappes, équilibre, dribbles : toutes les évaluations sont dans l'offre Essentiel." /></div>}
      <Section title="Défis du mois" className="mt-6"><ul className="space-y-2">{MONTHLY_CHALLENGES.map((c) => <li key={c.key} className="card"><div className="font-bold">📆 {c.label}</div><p className="text-sm text-ink-700">{c.text}</p></li>)}</ul><p className="muted mt-2 px-1">Les défis récompensent l'effort, la régularité et la créativité — jamais uniquement le résultat. Il n'existe aucun classement entre enfants.</p></Section>
    </div>
  );
}
