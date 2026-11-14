import Link from "next/link";
import { getActiveChild } from "@/lib/auth";
import { db } from "@/lib/db";
import { quickSession } from "@/app/actions";
import { dayDate, ensurePlan, entOf, frDate, isoOf, todayIso } from "@/lib/services";
import { FORMATS } from "@/content/taxonomy";
import { Beginner, Notice, PageHead, Section, Upsell } from "@/components/ui";
import Submit from "@/components/Submit";

export const metadata = { title: "Entraînements" };
export default async function Page({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { user, child } = await getActiveChild();
  const ent = entOf(user);
  const { e } = await searchParams;
  const { reasons } = await ensurePlan(child, ent);
  const today = todayIso();
  const [upcoming, past] = await Promise.all([
    db.plannedSession.findMany({ where: { childId: child.id, status: "PLANNED", date: { gte: dayDate(today) } }, orderBy: { date: "asc" } }),
    db.plannedSession.findMany({ where: { childId: child.id, status: "DONE" }, orderBy: { date: "desc" }, take: 10, include: { feedback: true } }),
  ]);
  const face = ["", "😕", "🙂", "😄"];
  return (
    <div>
      <PageHead title="Entraînements" sub={`Des séances complètes, dans le bon ordre, pour ${child.nickname}.`} />
      {e && <Notice tone="warn">{e}</Notice>}
      <Beginner show={user.beginnerMode}>Une séance suit toujours six temps : accueil, échauffement en jouant, exercices, petit défi, retour au calme, discussion. Vous n'avez rien à préparer : suivez l'écran.</Beginner>
      <Section title="À venir">
        {upcoming.length === 0 && <div className="card muted">{reasons[0] ?? "Aucune séance prévue pour l'instant : la semaine est déjà bien remplie, ou c'est le moment de souffler."}</div>}
        <ul className="space-y-2">{upcoming.map((s) => (
          <li key={s.id}><Link href={`/app/seance/${s.id}`} className="card flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-pitch-100 text-center text-xs font-extrabold leading-tight text-pitch-800">{frDate(isoOf(s.date), { weekday: "short" }).replace(".", "")}<br />{isoOf(s.date).slice(8)}</span>
            <span className="flex-1"><span className="block font-bold">{s.title}</span><span className="muted block">{s.objective}</span></span>
            <span className="chip">{s.durationMin} min</span>
          </Link></li>
        ))}</ul>
        {reasons.length > 0 && upcoming.length > 0 && <p className="muted mt-2 px-1">ℹ️ {reasons.join(" ")}</p>}
      </Section>
      <Section title="Lancer une séance maintenant">
        {ent.fullLibrary ? (
          <div className="grid grid-cols-2 gap-2">{["courte", "technique", "coordination", "plaisir", "parent-enfant", "perfectionnement"].map((k) => (
            <form key={k} action={quickSession}><input type="hidden" name="format" value={k} /><Submit className="card h-full w-full text-left" pendingText="Préparation…"><span className="block font-bold">{FORMATS[k].label}</span><span className="muted block">{FORMATS[k].desc}</span></Submit></form>
          ))}</div>
        ) : <Upsell title="Séances à la demande" text="Avec l'abonnement Famille, lancez une séance quand vous voulez et choisissez son format. Les règles de récupération restent appliquées." />}
        <p className="muted mt-2 px-1">Le moteur vérifie toujours la récupération : il peut refuser une séance au lendemain d'un match ou d'une autre séance.</p>
      </Section>
      <Section title="Séances réalisées">
        {past.length === 0 ? <div className="card muted">Vos séances terminées apparaîtront ici.</div> : <ul className="space-y-2">{past.map((s) => <li key={s.id} className="card flex items-center gap-3"><span className="text-2xl" aria-hidden>{face[s.feedback?.enjoyment ?? 2]}</span><span className="flex-1"><span className="block font-bold">{s.title}</span><span className="muted block">{frDate(isoOf(s.date))} · {s.durationMin} min</span></span><Link href={`/app/seance/${s.id}/bilan`} className="text-sm font-bold text-pitch-700">Détail</Link></li>)}</ul>}
      </Section>
    </div>
  );
}
