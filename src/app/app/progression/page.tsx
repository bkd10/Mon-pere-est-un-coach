import Link from "next/link";
import { getActiveChild } from "@/lib/auth";
import { db } from "@/lib/db";
import { addMeasurement } from "@/app/actions";
import { entOf } from "@/lib/services";
import { METRICS } from "@/content/taxonomy";
import { Beginner, LineChart, Notice, PageHead, Section, Upsell } from "@/components/ui";
import Submit from "@/components/Submit";

export const metadata = { title: "Progression" };
const short = (d: Date) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(d);

export default async function Page({ searchParams }: { searchParams: Promise<{ m?: string; ok?: string; e?: string }> }) {
  const { user, child } = await getActiveChild();
  const sp = await searchParams;
  const ent = entOf(user);
  const [measures, sessions] = await Promise.all([
    db.measurement.findMany({ where: { childId: child.id }, orderBy: { date: "asc" } }),
    db.plannedSession.findMany({ where: { childId: child.id, status: "DONE" }, include: { feedback: true }, orderBy: { date: "asc" }, take: 60 }),
  ]);
  const sel = METRICS.find((m) => m.key === sp.m) ?? METRICS[0];
  const fbPoints = (k: "motivation" | "enjoyment" | "energy") => sessions.filter((s) => s.feedback && s.feedback[k] != null).map((s) => ({ date: short(s.date), value: s.feedback![k] as number }));
  return (
    <div>
      <PageHead title="Carnet de progression" sub={`Les progrès de ${child.nickname}, comparés uniquement à lui-même.`} />
      {sp.ok && <Notice tone="ok">Mesure enregistrée.</Notice>}{sp.e && <Notice tone="warn">{sp.e}</Notice>}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <Link href="/app/progression/evaluations" className="card p-3 text-center text-sm font-bold"><div className="text-2xl">🎯</div>Mini-évaluations</Link>
        <Link href="/app/bilans" className="card p-3 text-center text-sm font-bold"><div className="text-2xl">📝</div>Bilans</Link>
        <Link href="/app/progression/carnet" className="card p-3 text-center text-sm font-bold"><div className="text-2xl">📓</div>Carnet de suivi</Link>
      </div>
      {!ent.progression ? <Upsell title="Le carnet de progression" text="Suivez jongles, passes, frappes, équilibre et confiance dans le temps, avec des graphiques. Inclus dans l'offre Essentiel." /> : (
        <>
          <Beginner show={user.beginnerMode}>Choisissez un indicateur, faites le petit test décrit, notez le résultat. Refaites-le dans quelques semaines : la courbe montre le chemin parcouru. Une mesure moins bonne n'a aucune importance.</Beginner>
          <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">{METRICS.map((m) => <Link key={m.key} href={`/app/progression?m=${m.key}`} scroll={false} className={`chip shrink-0 ${sel.key === m.key ? "chip-on" : ""}`}>{m.label}</Link>)}</div>
          <Section title={sel.label}>
            <div className="card">
              <LineChart points={measures.filter((m) => m.metric === sel.key).slice(-12).map((m) => ({ date: short(m.date), value: m.value }))} unit={sel.unit} lowerIsBetter={sel.kind === "time"} />
              <p className="muted mt-3">📏 {sel.how}</p>
              <form action={addMeasurement} className="mt-3 flex gap-2"><input type="hidden" name="metric" value={sel.key} /><input name="value" type="number" inputMode="decimal" step="any" min="0" required className="input" placeholder={`Nouvelle mesure (${sel.unit})`} aria-label={`Nouvelle mesure : ${sel.label}`} /><Submit className="btn-primary shrink-0">Ajouter</Submit></form>
            </div>
          </Section>
          <Section title="Vue d'ensemble">
            <div className="grid grid-cols-2 gap-2">{METRICS.map((m) => { const xs = measures.filter((x) => x.metric === m.key); const last = xs[xs.length - 1], first = xs[0]; const up = xs.length > 1 && (m.kind === "time" ? last.value < first.value : last.value > first.value); return (
              <Link key={m.key} href={`/app/progression?m=${m.key}`} className="card p-3"><div className="text-xs font-bold text-ink-500">{m.label}</div><div className="font-display text-2xl font-extrabold">{last ? last.value : "—"}<span className="text-sm font-bold text-ink-500"> {last ? m.unit : ""}</span></div><div className={`text-xs font-bold ${up ? "text-pitch-700" : "text-ink-500"}`}>{xs.length === 0 ? "Pas encore mesuré" : xs.length === 1 ? "1 mesure" : up ? `En progrès depuis ${first.value}` : `${xs.length} mesures`}</div></Link>
            ); })}</div>
          </Section>
          <Section title="Ressenti après les séances"><div className="card space-y-4">
            <div><div className="mb-1 text-sm font-bold">Motivation (1 à 3)</div><LineChart points={fbPoints("motivation").slice(-12)} color="#f9a826" /></div>
            <div><div className="mb-1 text-sm font-bold">Plaisir (1 à 3)</div><LineChart points={fbPoints("enjoyment").slice(-12)} color="#3b8fe0" /></div>
            <div><div className="mb-1 text-sm font-bold">Forme physique (1 à 3)</div><LineChart points={fbPoints("energy").slice(-12)} color="#f2674b" /></div>
          </div></Section>
        </>
      )}
    </div>
  );
}
