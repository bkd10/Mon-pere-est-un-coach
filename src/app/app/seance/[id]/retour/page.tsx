import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { submitFeedback } from "@/app/actions";
import { metricOf, PAIN_AREAS } from "@/content/taxonomy";
import { Choice, PageHead } from "@/components/ui";
import Submit from "@/components/Submit";

const Q = ({ n, title, children }: { n?: number; title: string; children: React.ReactNode }) => <fieldset className="card"><legend className="sr-only">{title}</legend><div className="mb-3 font-bold">{n ? <span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-pitch-600 text-xs text-white">{n}</span> : null}{title}</div>{children}</fieldset>;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const s = await db.plannedSession.findUnique({ where: { id }, include: { child: true, feedback: true } });
  if (!s || s.child.parentId !== user.id) notFound();
  const blocks = s.blocks as { phase: string; exerciseSlug?: string; title: string }[];
  const exs = await db.exercise.findMany({ where: { slug: { in: blocks.map((b) => b.exerciseSlug).filter(Boolean) as string[] } }, select: { slug: true, name: true, metricKey: true } });
  const main = blocks.filter((b) => ["echauffement", "technique", "defi"].includes(b.phase) && b.exerciseSlug).map((b) => exs.find((e) => e.slug === b.exerciseSlug)!).filter(Boolean);
  const defi = blocks.find((b) => b.phase === "defi");
  const metric = metricOf(exs.find((e) => e.slug === defi?.exerciseSlug)?.metricKey ?? "");
  const n = s.child.nickname, f = s.feedback;
  return (
    <div>
      <PageHead title="Comment ça s'est passé ?" sub="30 secondes. Vos réponses adaptent les prochaines séances." back={`/app/seance/${s.id}`} />
      <form action={submitFeedback} className="space-y-3">
        <input type="hidden" name="sessionId" value={s.id} />
        <Q n={1} title={`${n} a-t-il aimé la séance ?`}><div className="grid grid-cols-3 gap-2"><Choice name="enjoyment" value="3" label={<>😄<br />Beaucoup</>} defaultChecked={!f || f.enjoyment === 3} required /><Choice name="enjoyment" value="2" label={<>🙂<br />Moyennement</>} defaultChecked={f?.enjoyment === 2} /><Choice name="enjoyment" value="1" label={<>😕<br />Pas vraiment</>} defaultChecked={f?.enjoyment === 1} /></div></Q>
        {s.child.healthConsentAt && <Q n={2} title="Comment était-il physiquement ?"><div className="grid grid-cols-3 gap-2"><Choice name="energy" value="3" label={<>💪<br />En pleine forme</>} defaultChecked={!f || f.energy === 3} required /><Choice name="energy" value="2" label={<>😮‍💨<br />Un peu fatigué</>} defaultChecked={f?.energy === 2} /><Choice name="energy" value="1" label={<>😴<br />Très fatigué</>} defaultChecked={f?.energy === 1} /></div></Q>}
        <Q n={3} title="Comment était sa motivation ?"><div className="grid grid-cols-3 gap-2"><Choice name="motivation" value="3" label={<>🔥<br />Très motivé</>} defaultChecked={f?.motivation === 3} /><Choice name="motivation" value="2" label={<>👍<br />Normale</>} defaultChecked={!f || f.motivation === 2} required /><Choice name="motivation" value="1" label={<>🫤<br />Peu motivé</>} defaultChecked={f?.motivation === 1} /></div></Q>
        <details className="card" open={Boolean(f)}>
          <summary className="cursor-pointer font-bold">Pour affiner (facultatif)</summary>
          <div className="mt-4 space-y-5">
            <div><div className="label">Les exercices étaient…</div><div className="grid grid-cols-3 gap-2"><Choice name="difficulty" value="facile" label="Trop faciles" defaultChecked={f?.difficulty === "facile"} /><Choice name="difficulty" value="ok" label="Adaptés" defaultChecked={!f || f.difficulty === "ok"} /><Choice name="difficulty" value="difficile" label="Trop difficiles" defaultChecked={f?.difficulty === "difficile"} /></div></div>
            <div><div className="label">Sa confiance pendant la séance</div><div className="grid grid-cols-3 gap-2"><Choice name="confidence" value="3" label="Confiant" defaultChecked={f?.confidence === 3} /><Choice name="confidence" value="2" label="Normale" defaultChecked={!f || f.confidence === 2} /><Choice name="confidence" value="1" label="En manque" defaultChecked={f?.confidence === 1} /></div></div>
            <div className="rounded-2xl bg-coral-100 p-3">{s.child.healthConsentAt ? <><label className="flex items-center gap-3 font-bold"><input type="checkbox" name="pain" defaultChecked={f?.pain} className="h-5 w-5 accent-coral-500" /> Il a eu mal quelque part</label><select name="painArea" className="input mt-2" defaultValue={f?.painArea ?? ""} aria-label="Zone douloureuse"><option value="">Où ? (facultatif)</option>{PAIN_AREAS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}</select></> : <p className="text-sm font-bold">Une douleur ?</p>}<p className="mt-2 text-xs text-ink-700">{!s.child.healthConsentAt && "Le suivi forme et santé n'est pas activé : la douleur n'est pas enregistrée. "}En cas de douleur, on arrête l'activité. Si elle persiste ou revient, demandez un avis médical. L'application ne pose aucun diagnostic.</p></div>
            <label className="flex items-center gap-3 font-semibold"><input type="checkbox" name="wantedMore" defaultChecked={f?.wantedMore} className="h-5 w-5 accent-pitch-600" /> Il a demandé à continuer</label>
            {main.length > 0 && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div><label className="label" htmlFor="liked">Son exercice préféré</label><select id="liked" name="likedSlug" className="input" defaultValue={f?.likedSlug ?? ""}><option value="">—</option>{main.map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}</select></div><div><label className="label" htmlFor="disliked">Celui qu'il n'a pas aimé</label><select id="disliked" name="dislikedSlug" className="input" defaultValue={f?.dislikedSlug ?? ""}><option value="">—</option>{main.map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}</select></div></div>}
            {metric && <div><label className="label" htmlFor="cv">Résultat du petit défi — {metric.label.toLowerCase()} ({metric.unit})</label><input type="hidden" name="challengeMetric" value={metric.key} /><input id="cv" name="challengeValue" type="number" inputMode="decimal" step="any" min="0" className="input" placeholder="Facultatif" /><p className="muted mt-1">{metric.how} Ajouté au carnet de progression.</p></div>}
            <div><label className="label" htmlFor="note">Une réussite ou un mot à retenir</label><textarea id="note" name="note" rows={2} maxLength={500} className="input" defaultValue={f?.note ?? ""} placeholder="Ex. : premier contrôle du pied gauche !" /><label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="saveMemory" className="h-4 w-4 accent-pitch-600" /> L'ajouter à son album de réussites</label></div>
          </div>
        </details>
        <Submit pendingText="Adaptation du programme…">Valider et adapter la suite</Submit>
      </form>
    </div>
  );
}
