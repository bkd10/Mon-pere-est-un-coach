import Link from "next/link";
import { getActiveChild } from "@/lib/auth";
import { db } from "@/lib/db";
import { entOf } from "@/lib/services";
import { GUIDE_THEMES } from "@/content/guides";
import { Notice, PageHead, Section } from "@/components/ui";

export const metadata = { title: "Guide parents" };
export default async function Page({ searchParams }: { searchParams: Promise<{ lu?: string; theme?: string }> }) {
  const { user } = await getActiveChild();
  const sp = await searchParams;
  const ent = entOf(user);
  const [guides, reads] = await Promise.all([db.guide.findMany({ where: { published: true, ...(sp.theme ? { theme: sp.theme } : {}) }, orderBy: [{ theme: "asc" }, { createdAt: "asc" }] }), db.guideRead.findMany({ where: { userId: user.id } })]);
  const read = new Set(reads.map((r) => r.guideId));
  return (
    <div>
      <PageHead title="L'académie des parents" sub={`${reads.length} fiche${reads.length > 1 ? "s" : ""} lue${reads.length > 1 ? "s" : ""} sur ${guides.length}. Trois minutes par fiche, applicables le soir même.`} />
      {sp.lu && <Notice tone="ok">Fiche marquée comme lue. Essayez une des actions dès aujourd'hui !</Notice>}
      <Link href="/app/guide/budget" className="card mb-4 flex items-center gap-3 bg-sun-100"><span className="text-3xl" aria-hidden>💶</span><span className="flex-1"><span className="block font-bold">Calculateur de budget sportif</span><span className="text-sm text-ink-700">Voyez où part l'argent sur une saison, et où économiser.</span></span><span aria-hidden>›</span></Link>
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1"><Link href="/app/guide" className={`chip shrink-0 ${!sp.theme ? "chip-on" : ""}`}>Tout</Link>{Object.entries(GUIDE_THEMES).map(([k, t]) => <Link key={k} href={`/app/guide?theme=${k}`} className={`chip shrink-0 ${sp.theme === k ? "chip-on" : ""}`}>{t.icon} {t.label}</Link>)}</div>
      {Object.entries(GUIDE_THEMES).map(([k, t]) => { const list = guides.filter((g) => g.theme === k); if (!list.length) return null; return (
        <Section key={k} title={`${t.icon} ${t.label}`}><ul className="space-y-2">{list.map((g) => { const locked = !ent.allGuides && !g.isFree; return (
          <li key={g.id}><Link href={`/app/guide/${g.slug}`} className="card flex items-center gap-3"><span className="flex-1"><span className="block font-bold">{g.title}</span><span className="muted block">{g.summary}</span><span className="mt-1 block text-xs font-bold text-ink-500">{g.kind === "fiche" ? "Fiche pratique" : "Article"} · {g.readMin} min</span></span><span className="shrink-0 text-lg" aria-label={locked ? "Réservé aux abonnés" : read.has(g.id) ? "Lu" : "À lire"}>{locked ? "🔒" : read.has(g.id) ? "✅" : "›"}</span></Link></li>
        ); })}</ul></Section>
      ); })}
    </div>
  );
}
