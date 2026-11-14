import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { moveSession, skipSession } from "@/app/actions";
import { frDate, isoOf, todayIso } from "@/lib/services";
import { DEFAULT_RULES } from "@/lib/engine";
import SessionPlayer, { type PlayerBlock, type PlayerExercise } from "@/components/SessionPlayer";
import { eqLabel } from "@/content/taxonomy";
import Materiel from "@/components/Materiel";
import { Beginner, PageHead, Section } from "@/components/ui";
import Submit from "@/components/Submit";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const s = await db.plannedSession.findUnique({ where: { id }, include: { child: true } });
  if (!s || s.child.parentId !== user.id) notFound();
  const blocks = s.blocks as unknown as PlayerBlock[];
  const slugs = blocks.map((b) => b.exerciseSlug).filter(Boolean) as string[];
  const exs = await db.exercise.findMany({ where: { slug: { in: slugs } } });
  const map: Record<string, PlayerExercise> = Object.fromEntries(exs.map((e) => [e.slug, { slug: e.slug, name: e.name, objective: e.objective, why: e.why, reps: e.reps, steps: e.steps, mistakes: e.mistakes, corrections: e.corrections, safety: e.safety, success: e.successCriteria, variantEasy: e.variantEasy, variantMedium: e.variantMedium, variantHard: e.variantHard, equipment: e.equipment, diagram: e.diagram as PlayerExercise["diagram"] }]));
  const iso = isoOf(s.date);
  const icons: Record<string, string> = { accueil: "👋", echauffement: "🔥", technique: "⚽", defi: "🎯", calme: "🌿", discussion: "💬" };
  const rules = s.rulesApplied.map((k) => DEFAULT_RULES.find((r) => r.key === k)?.label).filter(Boolean);
  return (
    <div>
      <PageHead title={s.title} sub={`${frDate(iso)} · ${s.durationMin} minutes · pour ${s.child.nickname}`} back="/app/entrainements" />
      <Beginner show={user.beginnerMode}>Préparez le matériel, appelez {s.child.nickname}, puis appuyez sur « Commencer ». Chaque étape s'affiche une par une, avec un schéma animé et ce qu'il faut dire.</Beginner>
      <div className="card mb-4"><div className="text-sm font-bold text-pitch-700">Objectif</div><p>{s.objective}</p>
        <div className="mt-4"><Materiel items={s.equipment} shopHref="/app/boutique" /></div>
      </div>
      <SessionPlayer sessionId={s.id} blocks={blocks} exercises={map} nickname={s.child.nickname} beginner={user.beginnerMode} done={s.status === "DONE"} />
      <Section title="Déroulé" className="mt-5">
        <ol className="card space-y-3">{blocks.map((b, i) => <li key={i} className="flex items-start gap-3"><span className="text-xl" aria-hidden>{icons[b.phase]}</span><span className="flex-1"><span className="block font-bold">{b.title}</span>{b.restSec ? <span className="muted block">puis {b.restSec} s de pause</span> : null}</span><span className="chip">{b.minutes} min</span></li>)}</ol>
      </Section>
      <Section title="Vos consignes de parent"><ul className="card space-y-2 text-sm text-ink-700">{s.parentTips.map((t) => <li key={t} className="flex gap-2"><span aria-hidden>💡</span>{t}</li>)}</ul></Section>
      <Section title="Pourquoi cette séance ?"><div id="pourquoi" className="card"><ul className="space-y-2 text-sm text-ink-700">{s.explanation.map((t) => <li key={t} className="flex gap-2"><span aria-hidden>🧠</span>{t}</li>)}</ul>{rules.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{rules.map((r) => <span key={r} className="chip bg-pitch-50 text-pitch-800">Règle : {r}</span>)}</div>}<p className="muted mt-3">Les exercices viennent uniquement des fiches de l'application ; le moteur les choisit et les ordonne selon des règles fixes, il n'invente pas d'exercice.</p></div></Section>
      {s.status === "PLANNED" && (
        <Section title="Pas le bon moment ?">
          <div className="card space-y-3">
            <form action={moveSession} className="flex gap-2"><input type="hidden" name="sessionId" value={s.id} /><input type="date" name="date" min={todayIso()} defaultValue={iso} className="input" aria-label="Nouvelle date" required /><Submit className="btn-ghost shrink-0">Déplacer</Submit></form>
            <form action={skipSession}><input type="hidden" name="sessionId" value={s.id} /><Submit className="btn-ghost w-full">Pas aujourd'hui</Submit></form>
            <p className="muted">Reporter ou sauter une séance n'a aucune conséquence. Le programme se réorganise tout seul.</p>
          </div>
        </Section>
      )}
      {s.status === "PLANNED" && <Link href={`/app/seance/${s.id}/retour`} className="mb-6 block text-center text-sm font-bold text-pitch-700">Séance déjà faite sans l'application ? Répondre au questionnaire →</Link>}
    </div>
  );
}
