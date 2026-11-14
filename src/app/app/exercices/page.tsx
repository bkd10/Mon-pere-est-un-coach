import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { getActiveChild } from "@/lib/auth";
import { db } from "@/lib/db";
import { entOf } from "@/lib/services";
import { ageFromBirth, AGE_BANDS, CATEGORIES, catOf, kitOf, LEVELS } from "@/content/taxonomy";
import { Beginner, PageHead } from "@/components/ui";

export const metadata = { title: "Exercices" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { user, child } = await getActiveChild();
  const sp = await searchParams;
  const ent = entOf(user);
  const age = ageFromBirth(child.birthDate);
  const ageSel = sp.age ?? "enfant";
  const where: Prisma.ExerciseWhereInput = { published: true };
  if (sp.cat) where.category = sp.cat;
  if (ageSel === "enfant") { where.ageMin = { lte: age }; where.ageMax = { gte: age }; }
  else if (ageSel !== "tous") { const b = AGE_BANDS.find((x) => x.key === ageSel); if (b) { where.ageMin = { lte: b.max }; where.ageMax = { gte: b.min }; } }
  if (sp.niveau) where.level = sp.niveau;
  if (sp.mode === "petit") where.space = "petit";
  if (sp.mode === "ballon") where.NOT = { equipment: { hasSome: ["plots", "mur", "but", "cerceau", "echelle"] } };
  if (sp.mode === "interieur") where.indoorOk = true;
  if (sp.mode === "duo") where.parentRole = "joue";
  if (sp.q) where.OR = [{ name: { contains: sp.q, mode: "insensitive" } }, { objective: { contains: sp.q, mode: "insensitive" } }, { skill: { contains: sp.q, mode: "insensitive" } }];
  const all = await db.exercise.findMany({ where, orderBy: [{ category: "asc" }, { difficulty: "asc" }, { name: "asc" }], select: { id: true, slug: true, name: true, category: true, equipment: true, ageMin: true, ageMax: true, durationMin: true, difficulty: true, isFree: true, familySlug: true, variantLabel: true } });
  // Une carte par exercice de base ; ses progressions correspondantes sont comptées dessus.
  const groups = new Map<string, typeof all>();
  for (const e of all) { const k = e.familySlug ?? e.slug; groups.set(k, [...(groups.get(k) ?? []), e]); }
  const list = [...groups.values()].map((g) => ({ ...(g.find((e) => !e.variantLabel) ?? g[0]), more: g.length - 1 }));
  const link = (patch: Record<string, string | undefined>) => { const q = new URLSearchParams(); for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) q.set(k, v); return `/app/exercices?${q}`; };
  const MODES = [["ballon", "⚽ Ballon seul"], ["petit", "🏠 Petit espace"], ["interieur", "🛋️ Intérieur"], ["duo", "👨‍👧 À deux"]];
  return (
    <div>
      <PageHead title="Bibliothèque d'exercices" sub={`${all.length.toLocaleString("fr-FR")} fiche${all.length > 1 ? "s" : ""} · ${list.length} exercice${list.length > 1 ? "s" : ""} de base · ${ageSel === "enfant" ? `adaptés à ${child.nickname} (${age} ans)` : ageSel === "tous" ? "tous âges" : ageSel + " ans"}`} />
      <Beginner show={user.beginnerMode}>Ici, vous pouvez explorer librement. Mais pour savoir quoi faire aujourd'hui, le plus simple reste la séance du jour : elle choisit pour vous.</Beginner>
      <form className="mb-3 flex gap-2" action="/app/exercices">{Object.entries(sp).filter(([k, v]) => k !== "q" && v).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}<input name="q" defaultValue={sp.q} placeholder="Rechercher : jongles, passe, équilibre…" className="input" aria-label="Rechercher un exercice" /><button className="btn-ghost shrink-0">🔍</button></form>
      <div className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1">
        <Link href={link({ cat: undefined })} className={`chip shrink-0 ${!sp.cat ? "chip-on" : ""}`}>Toutes</Link>
        {CATEGORIES.map((c) => <Link key={c.key} href={link({ cat: sp.cat === c.key ? undefined : c.key })} className={`chip shrink-0 ${sp.cat === c.key ? "chip-on" : ""}`}>{c.icon} {c.label}</Link>)}
      </div>
      <div className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1">
        <Link href={link({ age: "enfant" })} className={`chip shrink-0 ${ageSel === "enfant" ? "chip-on" : ""}`}>Pour {child.nickname}</Link>
        {AGE_BANDS.map((b) => <Link key={b.key} href={link({ age: b.key })} className={`chip shrink-0 ${ageSel === b.key ? "chip-on" : ""}`}>{b.label}</Link>)}
        <Link href={link({ age: "tous" })} className={`chip shrink-0 ${ageSel === "tous" ? "chip-on" : ""}`}>Tous âges</Link>
      </div>
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {MODES.map(([k, l]) => <Link key={k} href={link({ mode: sp.mode === k ? undefined : k })} className={`chip shrink-0 ${sp.mode === k ? "chip-on" : ""}`}>{l}</Link>)}
        {LEVELS.map((l) => <Link key={l.key} href={link({ niveau: sp.niveau === l.key ? undefined : l.key })} className={`chip shrink-0 ${sp.niveau === l.key ? "chip-on" : ""}`}>{l.label}</Link>)}
      </div>
      {list.length === 0 && <div className="card muted">Aucun exercice ne correspond à ces filtres. Essayez « Tous âges » ou retirez un filtre.</div>}
      <ul className="space-y-2">{list.map((e) => { const c = catOf(e.category); const locked = !ent.fullLibrary && !e.isFree; return (
        <li key={e.id}><Link href={`/app/exercices/${e.slug}`} className="card flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: c.color + "22" }} aria-hidden>{c.icon}</span>
          <span className="min-w-0 flex-1"><span className="block truncate font-bold">{e.name}</span><span className="muted block truncate">{c.label} · {e.ageMin}-{e.ageMax} ans · {e.durationMin} min</span><span className="mt-0.5 flex flex-wrap gap-x-3 text-xs font-bold"><span className="text-ink-700">{e.equipment.filter((k) => k !== "ballon").length === 0 ? "⚽ Ballon seul" : "⚽ + " + e.equipment.filter((k) => k !== "ballon").map((k) => kitOf(k)?.label.toLowerCase() ?? k).join(", ")}</span>{e.more > 0 && <span className="text-pitch-700">+ {e.more} progression{e.more > 1 ? "s" : ""}</span>}</span></span>
          <span className="shrink-0 text-right text-xs font-bold text-ink-500">{locked ? "🔒" : <span aria-label={`Difficulté ${e.difficulty} sur 5`}>{"●".repeat(e.difficulty)}<span className="text-ink-100">{"●".repeat(5 - e.difficulty)}</span></span>}</span>
        </Link></li>
      ); })}</ul>
    </div>
  );
}
