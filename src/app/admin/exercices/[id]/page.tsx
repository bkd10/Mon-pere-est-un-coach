import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { CATEGORIES, EQUIPMENT, LEVELS, METRICS, PAIN_AREAS } from "@/content/taxonomy";
import ExerciseAnimation from "@/components/ExerciseAnimation";
import Submit from "@/components/Submit";
import { deleteExercise, saveExercise } from "../../actions";

const KINDS = ["slalom", "zigzag", "circle", "gates", "wall", "target", "square", "ladder", "mirror", "pair", "triangle", "reaction", "juggle", "balance", "free"];
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ e?: string }> }) {
  await requirePerm("content");
  const { id } = await params; const { e: err } = await searchParams;
  const e = id === "nouveau" ? null : await db.exercise.findUnique({ where: { id } });
  if (id !== "nouveau" && !e) notFound();
  const d = (e?.diagram ?? { kind: "free" }) as { kind: string; n?: number; caption?: string };
  const T = ({ n, l, v, rows = 1, req }: { n: string; l: string; v?: string | number | null; rows?: number; req?: boolean }) => <div><label className="label" htmlFor={n}>{l}</label>{rows > 1 ? <textarea id={n} name={n} rows={rows} defaultValue={v ?? ""} required={req} className="input" /> : <input id={n} name={n} defaultValue={v ?? ""} required={req} className="input" />}</div>;
  return (
    <div className="max-w-3xl">
      <Link href="/admin/exercices" className="text-sm font-bold text-pitch-700">← Exercices</Link>
      <h1 className="mb-4 font-display text-2xl font-extrabold">{e ? e.name : "Nouvel exercice"}</h1>
      {err && <div className="mb-3 rounded-2xl bg-coral-100 p-3 text-sm font-semibold">{err}</div>}
      {e && <div className="mb-4 max-w-sm"><ExerciseAnimation diagram={d} title={e.name} /></div>}
      <form action={saveExercise} className="card space-y-4">
        {e && <input type="hidden" name="id" value={e.id} />}
        <T n="name" l="Nom de l'exercice" v={e?.name} req />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div><label className="label" htmlFor="category">Catégorie</label><select id="category" name="category" defaultValue={e?.category} className="input">{CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></div>
          <div><label className="label" htmlFor="level">Niveau</label><select id="level" name="level" defaultValue={e?.level} className="input">{LEVELS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></div>
          <T n="ageMin" l="Âge minimum" v={e?.ageMin ?? 4} /><T n="ageMax" l="Âge maximum" v={e?.ageMax ?? 17} />
          <T n="difficulty" l="Difficulté (1-5)" v={e?.difficulty ?? 1} /><T n="intensity" l="Intensité (1-3)" v={e?.intensity ?? 2} /><T n="durationMin" l="Durée (min)" v={e?.durationMin ?? 5} /><T n="recoverySec" l="Récupération (s)" v={e?.recoverySec ?? 30} />
        </div>
        <T n="objective" l="Objectif pédagogique" v={e?.objective} rows={2} req /><T n="skill" l="Compétence travaillée" v={e?.skill} /><T n="why" l="Pourquoi cet exercice est utile" v={e?.why} rows={2} /><T n="reps" l="Répétitions" v={e?.reps} />
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="space">Espace</label><select id="space" name="space" defaultValue={e?.space ?? "moyen"} className="input"><option value="petit">Petit</option><option value="moyen">Moyen</option><option value="grand">Grand</option></select></div>
          <div><label className="label" htmlFor="parentRole">Rôle du parent</label><select id="parentRole" name="parentRole" defaultValue={e?.parentRole ?? "observe"} className="input"><option value="joue">Joue avec l'enfant</option><option value="observe">Observe et encourage</option><option value="aucun">Aucun</option></select></div>
        </div>
        <div><span className="label">Matériel nécessaire</span><div className="flex flex-wrap gap-3 text-sm">{EQUIPMENT.map((x) => <label key={x.key} className="flex items-center gap-1.5"><input type="checkbox" name="equipment" value={x.key} defaultChecked={e?.equipment.includes(x.key)} />{x.label.split(" (")[0]}</label>)}</div></div>
        <div><span className="label">Zones sollicitées (règle « douleur »)</span><div className="flex flex-wrap gap-3 text-sm">{PAIN_AREAS.filter((a) => a.key !== "autre").map((x) => <label key={x.key} className="flex items-center gap-1.5"><input type="checkbox" name="bodyAreas" value={x.key} defaultChecked={e?.bodyAreas.includes(x.key)} />{x.label}</label>)}</div></div>
        <T n="safety" l="Consignes de sécurité" v={e?.safety} rows={2} />
        <T n="steps" l="Étapes (une par ligne)" v={e?.steps.join("\n")} rows={5} req /><T n="mistakes" l="Erreurs fréquentes (une par ligne)" v={e?.mistakes.join("\n")} rows={3} /><T n="corrections" l="Corrections (une par ligne, dans le même ordre)" v={e?.corrections.join("\n")} rows={3} />
        <T n="variantEasy" l="Variante facile" v={e?.variantEasy} /><T n="variantMedium" l="Variante intermédiaire" v={e?.variantMedium} /><T n="variantHard" l="Variante difficile" v={e?.variantHard} /><T n="successCriteria" l="Critère de réussite" v={e?.successCriteria} />
        <fieldset className="rounded-2xl bg-ink-50 p-3"><legend className="px-1 text-sm font-bold">Schéma animé</legend><div className="grid grid-cols-3 gap-3"><div><label className="label" htmlFor="diagramKind">Type de scène</label><select id="diagramKind" name="diagramKind" defaultValue={d.kind} className="input">{KINDS.map((k) => <option key={k}>{k}</option>)}</select></div><T n="diagramN" l="Nombre d'éléments" v={d.n ?? ""} /><T n="diagramCaption" l="Légende" v={d.caption} /></div><p className="muted mt-2">Le schéma est généré par l'application à partir de ces paramètres. Enregistrez pour voir l'aperçu.</p></fieldset>
        <T n="videoUrl" l="Vidéo de démonstration (URL https, facultatif)" v={e?.videoUrl} />
        <div className="grid grid-cols-2 gap-3"><div><label className="label" htmlFor="metricKey">Indicateur de progression lié</label><select id="metricKey" name="metricKey" defaultValue={e?.metricKey ?? ""} className="input"><option value="">Aucun</option>{METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</select></div><T n="validatedBy" l="Validé par (nom, diplôme, date)" v={e?.validatedBy} /></div>
        <div className="flex flex-wrap gap-5 text-sm font-semibold"><label className="flex items-center gap-2"><input type="checkbox" name="indoorOk" defaultChecked={e?.indoorOk} />Réalisable en intérieur</label><label className="flex items-center gap-2"><input type="checkbox" name="isFree" defaultChecked={e?.isFree} />Inclus dans l'offre Découverte</label><label className="flex items-center gap-2"><input type="checkbox" name="published" defaultChecked={e?.published ?? false} />Publié</label></div>
        <p className="muted">Un exercice n'est proposé aux familles qu'une fois publié. Renseignez « Validé par » pour tracer la relecture par un éducateur diplômé.</p>
        <Submit>Enregistrer</Submit>
      </form>
      {e && <form action={deleteExercise} className="mt-3"><input type="hidden" name="id" value={e.id} /><Submit className="btn-danger" confirm="Supprimer définitivement cet exercice ?">Supprimer l'exercice</Submit></form>}
    </div>
  );
}
