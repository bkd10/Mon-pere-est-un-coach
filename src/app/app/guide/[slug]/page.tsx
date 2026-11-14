import { notFound } from "next/navigation";
import Link from "next/link";
import { getActiveChild } from "@/lib/auth";
import { db } from "@/lib/db";
import { markGuideRead } from "@/app/actions";
import { entOf } from "@/lib/services";
import { GUIDE_THEMES } from "@/content/guides";
import { PageHead, Rich, Upsell } from "@/components/ui";
import Submit from "@/components/Submit";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { user } = await getActiveChild();
  const { slug } = await params;
  const g = await db.guide.findFirst({ where: { slug, published: true } });
  if (!g) notFound();
  const locked = !entOf(user).allGuides && !g.isFree;
  const t = GUIDE_THEMES[g.theme];
  return (
    <article>
      <PageHead title={g.title} sub={`${t?.icon ?? ""} ${t?.label ?? ""} · ${g.readMin} min de lecture`} back="/app/guide" />
      <p className="mb-4 text-lg font-semibold text-ink-700">{g.summary}</p>
      {locked ? <Upsell title="Fiche réservée aux abonnés" text="L'académie complète des parents est incluse dans l'offre Essentiel." /> : (
        <>
          <div className="card mb-4"><Rich text={g.body} /></div>
          <div className="card mb-4 bg-pitch-50"><div className="mb-2 font-display text-lg font-extrabold">À appliquer dès maintenant</div><ul className="space-y-2">{g.actions.map((a) => <li key={a} className="flex gap-2 text-[15px]"><span aria-hidden>✅</span>{a}</li>)}</ul></div>
          <form action={markGuideRead}><input type="hidden" name="guideId" value={g.id} /><Submit>J'ai lu cette fiche</Submit></form>
          <Link href="/app/coach" className="mt-3 block text-center text-sm font-bold text-pitch-700">Une question sur ce sujet ? Demander au coach →</Link>
        </>
      )}
    </article>
  );
}
