import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import Submit from "@/components/Submit";
import { saveProduct } from "../actions";

export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await requirePerm("billing");
  const { ok } = await searchParams;
  const products = await db.product.findMany({ orderBy: { sort: "asc" }, include: { _count: { select: { interests: true } } } });
  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-extrabold">Boutique</h1>
      <p className="muted mb-4 max-w-3xl">Saisissez le prix et le lien vers la page de commande (votre boutique en ligne). Sans lien, les parents peuvent demander à être prévenus : la colonne « Intéressés » mesure la demande avant le lancement.</p>
      {ok && <div className="mb-3 rounded-2xl bg-pitch-50 p-3 text-sm font-semibold text-pitch-800">Produit mis à jour.</div>}
      <div className="grid gap-4 md:grid-cols-2">{products.map((p) => (
        <form key={p.id} action={saveProduct} className="card space-y-3"><input type="hidden" name="id" value={p.id} />
          <div className="flex items-center justify-between gap-2"><span className="chip">{p.isBundle ? "Kit" : "À l'unité"} · {p.ageMin}-{p.ageMax} ans</span><span className="chip bg-sun-100">{p._count.interests} intéressé{p._count.interests > 1 ? "s" : ""}</span></div>
          <div><label className="label">Nom</label><input name="name" defaultValue={p.name} className="input" aria-label="Nom" /></div>
          <div><label className="label">Accroche</label><input name="tagline" defaultValue={p.tagline} className="input" aria-label="Accroche" /></div>
          <div><label className="label">Contenu (une ligne par article)</label><textarea name="contents" rows={4} defaultValue={p.contents.join("\n")} className="input text-sm" aria-label="Contenu" /></div>
          <div className="grid grid-cols-2 gap-2"><div><label className="label">Prix (€)</label><input name="price" inputMode="decimal" defaultValue={p.priceCents != null ? (p.priceCents / 100).toFixed(2) : ""} placeholder="Non annoncé" className="input" aria-label="Prix" /></div><div><label className="label">Ordre</label><input name="sort" type="number" defaultValue={p.sort} className="input" aria-label="Ordre" /></div></div>
          <div><label className="label">Lien de commande (https)</label><input name="buyUrl" defaultValue={p.buyUrl ?? ""} placeholder="https://…" className="input" aria-label="Lien de commande" /></div>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={p.active} />Visible dans l'application</label>
          <Submit className="btn-primary">Enregistrer</Submit>
        </form>
      ))}</div>
    </div>
  );
}
