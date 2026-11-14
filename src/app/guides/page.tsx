import Link from "next/link";
import { db } from "@/lib/db";
import { LEGAL } from "@/content/legal";
import LegalFooter from "@/components/LegalFooter";
export const metadata = { title: "Guides pour les parents de jeunes footballeurs", description: "Comment accompagner son enfant au football sans être entraîneur : conseils concrets, à appliquer le soir même." };
export const dynamic = "force-dynamic";
export default async function Page() {
  const guides = await db.guide.findMany({ where: { published: true, isFree: true }, orderBy: { createdAt: "asc" } });
  return (
    <main id="contenu" className="mx-auto max-w-2xl px-5 py-8">
      <Link href="/" className="flex items-center gap-2 font-display text-xl font-extrabold"><img src="/icons/icon.svg" alt="" className="h-9 w-9 rounded-xl" />{LEGAL.brand}</Link>
      <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight">Guides pour les parents de jeunes footballeurs</h1>
      <p className="muted mb-5 mt-1">Trois minutes de lecture, des actions à essayer le soir même.</p>
      <ul className="space-y-2">{guides.map((g) => <li key={g.id}><Link href={`/guides/${g.slug}`} className="card block"><span className="block font-bold">{g.title}</span><span className="muted block">{g.summary}</span></Link></li>)}</ul>
      <div className="card mt-6 bg-pitch-700 text-center text-white"><p className="font-display text-xl font-extrabold">Et sur le terrain ?</p><p className="mt-1 text-sm text-white/90">L'application vous dit quoi faire avec votre enfant, séance par séance.</p><Link href="/inscription" className="btn-sun mt-3">Essayer gratuitement</Link></div>
      <LegalFooter className="mt-10 border-t border-ink-100 pt-6" />
    </main>
  );
}
