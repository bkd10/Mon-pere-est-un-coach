import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { GUIDE_THEMES } from "@/content/guides";
import Submit from "@/components/Submit";
import { deleteGuide, saveGuide } from "../../actions";
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ e?: string }> }) {
  await requirePerm("content");
  const { id } = await params; const { e: err } = await searchParams;
  const g = id === "nouveau" ? null : await db.guide.findUnique({ where: { id } });
  if (id !== "nouveau" && !g) notFound();
  return (
    <div className="max-w-3xl">
      <Link href="/admin/guides" className="text-sm font-bold text-pitch-700">← Guides</Link>
      <h1 className="mb-4 font-display text-2xl font-extrabold">{g ? g.title : "Nouveau guide"}</h1>
      {err && <div className="mb-3 rounded-2xl bg-coral-100 p-3 text-sm font-semibold">{err}</div>}
      <form action={saveGuide} className="card space-y-4">
        {g && <input type="hidden" name="id" value={g.id} />}
        <div><label className="label" htmlFor="title">Titre</label><input id="title" name="title" defaultValue={g?.title} required className="input" /></div>
        <div className="grid grid-cols-3 gap-3"><div><label className="label" htmlFor="theme">Thème</label><select id="theme" name="theme" defaultValue={g?.theme} className="input">{Object.entries(GUIDE_THEMES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}</select></div><div><label className="label" htmlFor="kind">Format</label><select id="kind" name="kind" defaultValue={g?.kind} className="input"><option value="article">Article</option><option value="fiche">Fiche pratique</option><option value="conseil">Conseil</option></select></div><div><label className="label" htmlFor="readMin">Lecture (min)</label><input id="readMin" name="readMin" type="number" min={1} defaultValue={g?.readMin ?? 3} className="input" /></div></div>
        <div><label className="label" htmlFor="summary">Résumé</label><textarea id="summary" name="summary" rows={2} defaultValue={g?.summary} className="input" /></div>
        <div><label className="label" htmlFor="body">Contenu (paragraphes séparés par une ligne vide, **gras**)</label><textarea id="body" name="body" rows={14} defaultValue={g?.body} required className="input font-mono text-sm" /></div>
        <div><label className="label" htmlFor="actions">Actions « à appliquer dès maintenant » (une par ligne)</label><textarea id="actions" name="actions" rows={3} defaultValue={g?.actions.join("\n")} className="input" /></div>
        <div className="flex flex-wrap gap-5 text-sm font-semibold"><label className="flex items-center gap-2"><input type="checkbox" name="isFree" defaultChecked={g?.isFree} />Accessible en offre Découverte</label><label className="flex items-center gap-2"><input type="checkbox" name="published" defaultChecked={g?.published ?? true} />Publié</label>{!g && <label className="flex items-center gap-2"><input type="checkbox" name="notify" />Notifier les parents (selon leurs préférences)</label>}</div>
        <Submit>Enregistrer</Submit>
      </form>
      {g && <form action={deleteGuide} className="mt-3"><input type="hidden" name="id" value={g.id} /><Submit className="btn-danger" confirm="Supprimer ce guide ?">Supprimer le guide</Submit></form>}
    </div>
  );
}
