import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { CATEGORIES, catLabel } from "@/content/taxonomy";

export default async function Page({ searchParams }: { searchParams: Promise<{ cat?: string; ok?: string; decl?: string }> }) {
  await requirePerm("content");
  const { cat, ok, decl } = await searchParams;
  const list = await db.exercise.findMany({ where: { ...(cat ? { category: cat } : {}), ...(decl ? {} : { variantLabel: null }) }, orderBy: [{ category: "asc" }, { ageMin: "asc" }, { name: "asc" }] });
  return (
    <div>
      <div className="mb-4 flex items-center justify-between"><h1 className="font-display text-2xl font-extrabold">{decl ? "Toutes les fiches" : "Exercices de base"} ({list.length}) <Link href={decl ? "/admin/exercices" : "/admin/exercices?decl=1"} className="ml-2 text-sm font-bold text-pitch-700 underline">{decl ? "Voir seulement les exercices de base" : "Afficher aussi les progressions"}</Link></h1><Link href="/admin/exercices/nouveau" className="btn-primary btn-sm">+ Nouvel exercice</Link></div>
      {ok && <div className="mb-3 rounded-2xl bg-pitch-50 p-3 text-sm font-semibold text-pitch-800">Bibliothèque mise à jour. Les prochaines séances générées en tiennent compte.</div>}
      <div className="mb-3 flex flex-wrap gap-1.5"><Link href="/admin/exercices" className={`chip ${!cat ? "chip-on" : ""}`}>Toutes</Link>{CATEGORIES.map((c) => <Link key={c.key} href={`/admin/exercices?cat=${c.key}`} className={`chip ${cat === c.key ? "chip-on" : ""}`}>{c.label}</Link>)}</div>
      <div className="card overflow-x-auto p-0"><table className="w-full min-w-[760px] text-sm"><thead><tr className="bg-ink-50 text-left text-xs uppercase text-ink-500"><th className="p-3">Exercice</th><th>Catégorie</th><th>Âge</th><th>Diff.</th><th>Schéma</th><th>Vidéo</th><th>Gratuit</th><th>Publié</th><th /></tr></thead><tbody>
        {list.map((e) => <tr key={e.id} className="border-t border-ink-100"><td className="p-3 font-bold">{e.name}</td><td>{catLabel(e.category)}</td><td>{e.ageMin}-{e.ageMax}</td><td>{e.difficulty}/5</td><td>{(e.diagram as { kind?: string })?.kind}</td><td>{e.videoUrl ? "✓" : "—"}</td><td>{e.isFree ? "✓" : ""}</td><td>{e.published ? "✓" : "✗"}</td><td className="pr-3 text-right"><Link href={`/admin/exercices/${e.id}`} className="font-bold text-pitch-700">Modifier</Link></td></tr>)}
      </tbody></table></div>
    </div>
  );
}
