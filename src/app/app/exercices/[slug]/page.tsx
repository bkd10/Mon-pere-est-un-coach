import { notFound } from "next/navigation";
import Link from "next/link";
import { getActiveChild } from "@/lib/auth";
import { db } from "@/lib/db";
import { entOf } from "@/lib/services";
import { ageFromBirth, catOf, EQUIPMENT, LEVELS, metricOf } from "@/content/taxonomy";
import ExerciseAnimation from "@/components/ExerciseAnimation";
import Materiel from "@/components/Materiel";
import ReportForm from "@/components/ReportForm";
import SessionPlayer from "@/components/SessionPlayer";
import { PageHead, Section, Upsell } from "@/components/ui";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { user, child } = await getActiveChild();
  const { slug } = await params;
  const e = await db.exercise.findFirst({ where: { slug, published: true } });
  if (!e) notFound();
  const ent = entOf(user);
  const c = catOf(e.category);
  const age = ageFromBirth(child.birthDate);
  const fits = age >= e.ageMin && age <= e.ageMax;
  const diagram = e.diagram as { kind: string; n?: number; caption?: string };
  if (!ent.fullLibrary && !e.isFree) return (
    <div><PageHead title={e.name} sub={`${c.label} · ${e.ageMin}-${e.ageMax} ans`} back="/app/exercices" />
      <ExerciseAnimation diagram={diagram} title={e.name} /><div className="card my-4"><div className="text-sm font-bold text-pitch-700">Objectif</div><p>{e.objective}</p></div>
      <Upsell title="Fiche complète dans l'abonnement Famille" text="Étapes détaillées, erreurs fréquentes, corrections, variantes et critère de réussite pour toute la bibliothèque." /></div>
  );
  const family = await db.exercise.findMany({ where: { published: true, familySlug: e.familySlug ?? e.slug, NOT: { id: e.id } }, orderBy: [{ variantLabel: "asc" }], select: { slug: true, name: true, variantLabel: true, ageMin: true, ageMax: true, difficulty: true } });
  const communityVideos = await db.media.findMany({ where: { exerciseSlug: e.slug, status: "APPROVED", kind: "video" }, take: 3 });
  const Info = ({ l, v }: { l: string; v: string }) => <div className="rounded-2xl bg-ink-50 p-2.5"><div className="text-[11px] font-bold uppercase tracking-wide text-ink-500">{l}</div><div className="text-sm font-bold">{v}</div></div>;
  const metric = e.metricKey ? metricOf(e.metricKey) : null;
  return (
    <div>
      <PageHead title={e.name} sub={`${c.icon} ${c.label}`} back="/app/exercices" />
      {!fits && <div className="mb-3 rounded-2xl bg-sun-100 p-3 text-sm">Cet exercice est prévu pour les {e.ageMin}-{e.ageMax} ans. {child.nickname} a {age} ans : {age < e.ageMin ? "attendez un peu ou choisissez la variante facile." : "il peut servir d'échauffement ou de jeu avec un plus jeune."}</div>}
      <ExerciseAnimation diagram={diagram} title={e.name} />
      {e.videoUrl && <video src={e.videoUrl} controls playsInline preload="metadata" className="mt-3 w-full rounded-2xl" />}
      <div className="my-4"><SessionPlayer sessionId="" blocks={[{ phase: "technique", title: e.name, minutes: e.durationMin, exerciseSlug: e.slug }]} exercises={{ [e.slug]: { slug: e.slug, name: e.name, objective: e.objective, why: e.why, reps: e.reps, steps: e.steps, mistakes: e.mistakes, corrections: e.corrections, safety: e.safety, success: e.successCriteria, variantEasy: e.variantEasy, variantMedium: e.variantMedium, variantHard: e.variantHard, equipment: e.equipment, diagram } }} nickname={child.nickname} beginner={user.beginnerMode} done={false} standalone /></div>
      <div className="card mb-4"><div className="text-sm font-bold text-pitch-700">Objectif pédagogique</div><p>{e.objective}</p><div className="mt-3 text-sm font-bold text-pitch-700">Pourquoi cet exercice est utile</div><p className="text-ink-700">{e.why}</p></div>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Info l="Âge conseillé" v={`${e.ageMin}-${e.ageMax} ans`} /><Info l="Niveau" v={LEVELS.find((l) => l.key === e.level)?.label ?? e.level} /><Info l="Difficulté" v={`${e.difficulty} / 5`} />
        <Info l="Durée" v={`${e.durationMin} min`} /><Info l="Répétitions" v={e.reps} /><Info l="Récupération" v={`${e.recoverySec} s entre les séries`} />
        <Info l="Compétence" v={e.skill} /><Info l="Espace" v={e.space === "petit" ? "Petit (quelques m²)" : e.space === "moyen" ? "Moyen (jardin)" : "Grand (terrain)"} /><Info l="Lieu" v={e.indoorOk ? "Dehors ou intérieur" : "Dehors"} />
      </div>
      <Section title="À préparer"><div className="card"><Materiel items={e.equipment} shopHref="/app/boutique" /></div></Section>
      <Section title="Étape par étape"><ol className="card space-y-3">{e.steps.map((s, i) => <li key={i} className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-pitch-600 text-xs font-extrabold text-white">{i + 1}</span><span>{s}</span></li>)}</ol></Section>
      <Section title="Erreurs fréquentes et comment corriger"><ul className="card space-y-3">{e.mistakes.map((m, i) => <li key={i}><div className="font-semibold">⚠️ {m}</div>{e.corrections[i] && <div className="text-pitch-800">→ {e.corrections[i]}</div>}</li>)}</ul></Section>
      <Section title="Variantes"><div className="space-y-2"><div className="card"><span className="chip bg-pitch-50 text-pitch-800">Facile</span><p className="mt-1">{e.variantEasy}</p></div><div className="card"><span className="chip bg-sun-100">Intermédiaire</span><p className="mt-1">{e.variantMedium}</p></div><div className="card"><span className="chip bg-coral-100 text-coral-600">Difficile</span><p className="mt-1">{e.variantHard}</p></div></div></Section>
      <Section title="Critère de réussite"><div className="card"><p>🎯 {e.successCriteria}</p>{metric && <Link href={`/app/progression?m=${metric.key}`} className="mt-2 inline-block text-sm font-bold text-pitch-700">Noter dans le carnet : {metric.label.toLowerCase()} →</Link>}</div></Section>
      {family.length > 0 && <Section title={e.variantLabel ? "Autres versions de cet exercice" : `${family.length} progressions de cet exercice`}>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">{family.map((f) => <li key={f.slug}><Link href={`/app/exercices/${f.slug}`} className="card flex items-center justify-between gap-2 py-3 text-sm"><span><span className="block font-bold">{f.variantLabel ? f.variantLabel[0].toUpperCase() + f.variantLabel.slice(1) : "Exercice de base"}</span><span className="muted">{f.ageMin}-{f.ageMax} ans · difficulté {f.difficulty}/5</span></span><span aria-hidden>›</span></Link></li>)}</ul>
        <p className="muted mt-2 px-1">Une progression reprend l'exercice de base avec une contrainte ou un objectif supplémentaire. {age < 7 ? "Avant 7 ans, restez sur la version de base et la version histoire." : "Passez à une progression quand la version de base est réussie."}</p>
      </Section>}
      <Section title="Consignes de sécurité"><div className="card bg-sun-100 text-sm">{e.safety}</div></Section>
      <Section title="Vidéos">
        <div className="card text-sm text-ink-700">
          <p>La démonstration de cet exercice est le <b>schéma animé</b> en haut de page, généré par l'application.</p>
          {communityVideos.length > 0 && <div className="mt-3 space-y-2">{communityVideos.map((v) => <div key={v.id}><video src={`/api/media/${v.id}`} controls playsInline preload="metadata" className="w-full rounded-2xl" /><div className="muted mt-1">{v.title} · partagée par une famille, avec son accord</div><ReportForm mediaId={v.id} back={`/app/exercices/${e.slug}`} /></div>)}</div>}
          <Link href="/app/enfant/album" className="mt-3 inline-block font-bold text-pitch-700">Filmer {child.nickname} pour son album privé →</Link>
        </div>
      </Section>
    </div>
  );
}
