import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { LEGAL } from "@/content/legal";
import { Rich } from "@/components/ui";
import LegalFooter from "@/components/LegalFooter";
export const dynamic = "force-dynamic";
const find = (slug: string) => db.guide.findFirst({ where: { slug, published: true, isFree: true } });
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const g = await find((await params).slug);
  return g ? { title: g.title, description: g.summary } : {};
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const g = await find((await params).slug);
  if (!g) notFound();
  return (
    <main id="contenu" className="mx-auto max-w-2xl px-5 py-8">
      <Link href="/guides" className="text-sm font-bold text-pitch-700">← Tous les guides</Link>
      <article>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">{g.title}</h1>
        <p className="mb-4 mt-2 text-lg font-semibold text-ink-700">{g.summary}</p>
        <div className="card mb-4"><Rich text={g.body} /></div>
        <div className="card mb-4 bg-pitch-50"><h2 className="mb-2 font-display text-lg font-extrabold">À appliquer dès maintenant</h2><ul className="space-y-2">{g.actions.map((a) => <li key={a} className="flex gap-2"><span aria-hidden>✅</span>{a}</li>)}</ul></div>
      </article>
      <div className="card bg-pitch-700 text-center text-white"><p className="font-display text-xl font-extrabold">Passez à la pratique</p><p className="mt-1 text-sm text-white/90">{LEGAL.brand} construit des séances de 10 à 20 minutes adaptées à l'âge de votre enfant.</p><Link href="/inscription" className="btn-sun mt-3">Essayer gratuitement</Link></div>
      <LegalFooter className="mt-10 border-t border-ink-100 pt-6" />
    </main>
  );
}
