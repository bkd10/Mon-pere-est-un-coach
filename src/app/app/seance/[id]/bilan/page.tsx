import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dayDate, frDate, isoOf, todayIso } from "@/lib/services";
import { badgeOf } from "@/content/taxonomy";
import { Notice, Section } from "@/components/ui";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const s = await db.plannedSession.findUnique({ where: { id }, include: { child: true, feedback: true } });
  if (!s || s.child.parentId !== user.id) notFound();
  const [next, fresh, count] = await Promise.all([
    db.plannedSession.findFirst({ where: { childId: s.childId, status: "PLANNED", date: { gte: dayDate(todayIso()) } }, orderBy: { date: "asc" } }),
    db.badgeAward.findMany({ where: { childId: s.childId, awardedAt: { gte: new Date(Date.now() - 10 * 60000) } } }),
    db.plannedSession.count({ where: { childId: s.childId, status: "DONE" } }),
  ]);
  const f = s.feedback;
  const adapt = next?.explanation.slice(3) ?? [];
  return (
    <div className="pt-4">
      <div className="text-center"><div className="text-6xl" aria-hidden>🎉</div><h1 className="mt-2 font-display text-3xl font-extrabold">Bravo à vous deux !</h1><p className="muted">{count === 1 ? "Première séance terminée." : `${count} séances réalisées ensemble.`}</p></div>
      {f?.pain && <Notice tone="warn"><b>Douleur signalée.</b> Ne faites pas poursuivre une activité douloureuse. Si la douleur persiste, revient ou gêne {s.child.nickname} au quotidien, demandez l'avis d'un médecin. Les exercices concernés sont suspendus.</Notice>}
      {fresh.length > 0 && <Section title="Nouveaux badges" className="mt-5"><div className="grid grid-cols-2 gap-2">{fresh.map((b) => { const d = badgeOf(b.badgeKey); return <div key={b.id} className="card text-center"><div className="text-4xl">{d?.icon}</div><div className="font-bold">{d?.label}</div><div className="muted">{d?.desc}</div></div>; })}</div></Section>}
      <Section title="Ce que le programme a adapté" className="mt-5">
        <div className="card">
          {adapt.length ? <ul className="space-y-2 text-sm text-ink-700">{adapt.map((t) => <li key={t} className="flex gap-2"><span aria-hidden>🧠</span>{t}</li>)}</ul> : <p className="text-sm text-ink-700">🧠 Tout s'est bien passé : nous continuons sur le même rythme, sans rien ajouter.</p>}
          {next ? <Link href={`/app/seance/${next.id}`} className="mt-3 flex items-center justify-between rounded-2xl bg-ink-50 p-3 text-sm"><span><b>Prochaine séance</b><br /><span className="text-ink-500">{frDate(isoOf(next.date))} · {next.title} · {next.durationMin} min</span></span><span aria-hidden>›</span></Link> : <p className="muted mt-3">Aucune autre séance cette semaine : place au repos et au jeu libre.</p>}
        </div>
      </Section>
      <div className="mt-2 grid grid-cols-2 gap-2"><Link href="/app/enfant/album" className="btn-ghost">📸 Ajouter un souvenir</Link><Link href="/app" className="btn-primary">Retour à l'accueil</Link></div>
    </div>
  );
}
