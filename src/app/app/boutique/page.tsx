import { getActiveChild } from "@/lib/auth";
import { db } from "@/lib/db";
import { toggleInterest } from "@/app/actions";
import { euro } from "@/lib/plans";
import { ageFromBirth, kitOf } from "@/content/taxonomy";
import { Notice, PageHead, Section } from "@/components/ui";
import Submit from "@/components/Submit";

export const metadata = { title: "Le matériel" };
export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { user, child } = await getActiveChild();
  const sp = await searchParams;
  const age = ageFromBirth(child.birthDate);
  const [products, mine, exs] = await Promise.all([
    db.product.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
    db.productInterest.findMany({ where: { userId: user.id } }),
    db.exercise.findMany({ where: { published: true, ageMin: { lte: age }, ageMax: { gte: age } }, select: { equipment: true } }),
  ]);
  const covered = (eq: string[]) => exs.filter((e) => e.equipment.every((k) => eq.includes(k))).length;
  const bundles = products.filter((p) => p.isBundle), singles = products.filter((p) => !p.isBundle);
  const reco = bundles.find((p) => age >= p.ageMin && age <= p.ageMax) ?? bundles[0];
  const Card = ({ p, featured }: { p: (typeof products)[number]; featured?: boolean }) => {
    const wanted = mine.some((m) => m.productId === p.id);
    return (
      <div className={`card ${featured ? "ring-2 ring-sun-400" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          <div><div className="flex flex-wrap items-center gap-2"><span className="font-display text-lg font-extrabold">{p.name}</span>{featured && <span className="chip bg-sun-400 text-ink-900">Recommandé pour {child.nickname}</span>}</div><p className="muted">{p.tagline}</p></div>
          <div className="shrink-0 text-right">{p.priceCents != null ? <div className="font-display text-2xl font-extrabold">{euro(p.priceCents)}</div> : <div className="text-sm font-bold text-ink-500">Prix bientôt annoncé</div>}</div>
        </div>
        <ul className="mt-3 space-y-1 text-sm text-ink-700">{p.contents.map((c) => <li key={c} className="flex gap-2"><span aria-hidden>{kitOf(p.equipment.find((k) => c.toLowerCase().includes(kitOf(k)?.label.toLowerCase().split(" ")[0] ?? "§")) ?? "")?.icon ?? "✓"}</span>{c}</li>)}</ul>
        {p.isBundle && <p className="mt-2 text-sm font-bold text-pitch-700">{covered(p.equipment)} fiches sur {exs.length} réalisables pour {child.nickname} avec ce kit.</p>}
        <div className="mt-3">{p.buyUrl ? <a href={p.buyUrl} target="_blank" rel="noopener" className={featured ? "btn-sun w-full" : "btn-primary w-full"}>Commander</a>
          : <form action={toggleInterest}><input type="hidden" name="productId" value={p.id} /><Submit className={wanted ? "btn-ghost w-full" : "btn-primary w-full"}>{wanted ? "✓ Vous serez prévenu · annuler" : "Me prévenir de sa sortie"}</Submit></form>}</div>
      </div>
    );
  };
  return (
    <div>
      <PageHead title="Le matériel Mon Duo Foot" sub="Le matériel utilisé dans les fiches, sélectionné par notre équipe." back="/app/menu" />
      {sp.ok && <Notice tone="ok">C'est noté. Nous vous préviendrons dans l'application dès que ce matériel sera disponible.</Notice>}
      {reco && <Section title="Le kit conseillé"><Card p={reco} featured /></Section>}
      <Section title="Les autres kits"><div className="space-y-3">{bundles.filter((p) => p.id !== reco?.id).map((p) => <Card key={p.id} p={p} />)}</div></Section>
      <Section title="À l'unité"><div className="space-y-3">{singles.map((p) => <Card key={p.id} p={p} />)}</div></Section>
      <p className="muted mb-4 px-1">Le matériel facilite les séances mais n'est jamais obligatoire pour commencer : chaque fiche indique une solution maison en attendant.</p>
    </div>
  );
}
