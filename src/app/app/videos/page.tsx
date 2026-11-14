import { FEATURES } from "@/lib/flags";
import Link from "next/link";
import { getActiveChild } from "@/lib/auth";
import { db } from "@/lib/db";
import { entOf } from "@/lib/services";
import { ageFromBirth, CATEGORIES, catOf } from "@/content/taxonomy";
import ExerciseVideo from "@/components/ExerciseVideo";
import { Notice, PageHead, Section } from "@/components/ui";
import ReportForm from "@/components/ReportForm";

export const metadata = { title: "Vidéothèque" };
export default async function Page({ searchParams }: { searchParams: Promise<{ cat?: string; signale?: string }> }) {
  const { user, child } = await getActiveChild();
  const sp = await searchParams;
  const ent = entOf(user);
  const age = ageFromBirth(child.birthDate);
  const [exs, community, official] = await Promise.all([
    db.exercise.findMany({ where: { published: true, ageMin: { lte: age }, ageMax: { gte: age }, variantLabel: null, ...(sp.cat ? { category: sp.cat } : {}), ...(ent.fullLibrary ? {} : { isFree: true }) }, orderBy: [{ category: "asc" }, { difficulty: "asc" }], take: 40 }),
    db.media.findMany({ where: { status: "APPROVED", kind: "video" }, orderBy: { createdAt: "desc" }, take: 12 }),
    db.exercise.findMany({ where: { published: true, videoUrl: { not: null } }, take: 12 }),
  ]);
  return (
    <div>
      <PageHead title="Vidéothèque" sub="Une vidéo courte par exercice, à regarder avec votre enfant avant de jouer." back="/app/menu" />
      {sp.signale && <Notice tone="ok">Merci, votre signalement a été transmis à la modération.</Notice>}
      <div className="card mb-4 text-sm text-ink-700">🎬 Chaque vidéo est un <b>schéma animé</b> de l'exercice, avec les consignes qui s'affichent une par une. Aucun enfant réel n'y apparaît.</div>
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1"><Link href="/app/videos" className={`chip shrink-0 ${!sp.cat ? "chip-on" : ""}`}>Toutes</Link>{CATEGORIES.map((c) => <Link key={c.key} href={`/app/videos?cat=${c.key}`} className={`chip shrink-0 ${sp.cat === c.key ? "chip-on" : ""}`}>{c.icon} {c.label}</Link>)}</div>
      <Section title={`Les vidéos pour ${child.nickname}`}><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{exs.map((e) => <div key={e.id}><Link href={`/app/exercices/${e.slug}`} className="mb-1.5 block px-1"><span className="block font-bold">{e.name}</span><span className="muted">{catOf(e.category).label} · {e.ageMin}-{e.ageMax} ans · voir la fiche →</span></Link><ExerciseVideo fiche={{ name: e.name, why: e.why, steps: e.steps, mistakes: e.mistakes, corrections: e.corrections, success: e.successCriteria, diagram: e.diagram as { kind: string; n?: number; caption?: string } }} /></div>)}</div>{exs.length === 0 && <div className="card muted">Aucune démonstration dans cette catégorie pour son âge.</div>}</Section>
      {official.length > 0 && <Section title="Tutoriels vidéo"><div className="space-y-3">{official.map((e) => <div key={e.id} className="card p-2"><video src={e.videoUrl!} controls playsInline preload="metadata" className="w-full rounded-2xl" /><Link href={`/app/exercices/${e.slug}`} className="block px-2 pt-2 font-bold">{e.name} →</Link></div>)}</div></Section>}
      {FEATURES.familyVideos && <Section title="Vidéos de familles">{community.length === 0 ? <div className="card muted">Aucune vidéo partagée pour le moment. Vous pouvez proposer la vôtre depuis <Link href="/app/enfant/album" className="font-bold text-pitch-700">l'album de souvenirs</Link> — c'est entièrement facultatif.</div> : <div className="space-y-3">{community.map((v) => <div key={v.id} className="card p-2"><video src={`/api/media/${v.id}`} controls playsInline preload="metadata" className="w-full rounded-2xl" /><div className="px-2 pt-2 text-sm font-bold">{v.title}</div><div className="px-2"><ReportForm mediaId={v.id} back="/app/videos" /></div></div>)}</div>}</Section>}
    </div>
  );
}
