import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import Submit from "@/components/Submit";
import { handleDeletion, handleReport, moderate } from "../actions";
export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await requirePerm("moderation");
  const { ok } = await searchParams;
  const [reports, deletions] = await Promise.all([db.contentReport.findMany({ where: { status: "ouvert" }, orderBy: { createdAt: "asc" } }), db.deletionRequest.findMany({ where: { status: "recue" }, orderBy: { createdAt: "asc" } })]);
  const [pending, exs, approved] = await Promise.all([db.media.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } }), db.exercise.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } }), db.media.count({ where: { status: "APPROVED" } })]);
  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-extrabold">Modération des vidéos de familles</h1>
      <p className="muted mb-4 max-w-3xl">{pending.length} en attente · {approved} publiée(s). À vérifier avant validation : la vidéo montre bien un exercice, aucun enfant tiers identifiable sans accord, aucune tenue ou situation inappropriée, aucune information personnelle visible (nom, adresse, école, maillot nominatif). Dans le doute, refusez : la vidéo reste dans l'album privé de la famille.</p>
      {ok && <div className="mb-3 rounded-2xl bg-pitch-50 p-3 text-sm font-semibold text-pitch-800">Décision enregistrée. La famille a été prévenue.</div>}
      <h2 className="mb-2 mt-2 font-display text-lg font-extrabold">Signalements ({reports.length})</h2>
      {reports.length === 0 ? <div className="card muted mb-6">Aucun signalement ouvert.</div> : <div className="mb-6 grid gap-3 md:grid-cols-2">{reports.map((r) => <div key={r.id} className="card"><video src={`/api/media/${r.mediaId}`} controls preload="metadata" className="mb-2 w-full rounded-2xl bg-ink-900" /><div className="text-sm"><b>Motif :</b> {r.reason}{r.detail ? ` — ${r.detail}` : ""}</div><form action={handleReport} className="mt-2 space-y-2"><input type="hidden" name="id" value={r.id} /><input name="note" maxLength={200} placeholder="Motif communiqué à l'auteur en cas de retrait" className="input" aria-label="Motif" /><div className="flex gap-2"><button name="decision" value="remove" className="btn-danger btn-sm flex-1">Retirer la vidéo</button><button name="decision" value="keep" className="btn-ghost btn-sm flex-1">Classer sans suite</button></div></form></div>)}</div>}
      <h2 className="mb-2 font-display text-lg font-extrabold">Demandes de suppression sans connexion ({deletions.length})</h2>
      <p className="muted mb-2">Vérifiez que la demande vient bien du titulaire du compte (réponse depuis l'adresse e-mail du compte), puis traitez-la sous un mois.</p>
      {deletions.length === 0 ? <div className="card muted mb-6">Aucune demande en attente.</div> : <div className="mb-6 space-y-2">{deletions.map((d) => <form key={d.id} action={handleDeletion} className="card flex flex-wrap items-center justify-between gap-2 text-sm"><input type="hidden" name="id" value={d.id} /><span><b>{d.email}</b> · reçue le {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(d.createdAt)}{d.message ? ` · « ${d.message} »` : ""}</span><span className="flex gap-2"><button name="decision" value="delete" className="btn-danger btn-sm">Supprimer le compte</button><button name="decision" value="reject" className="btn-ghost btn-sm">Rejeter</button></span></form>)}</div>}
      <h2 className="mb-2 font-display text-lg font-extrabold">Vidéos proposées ({pending.length})</h2>
      {pending.length === 0 && <div className="card muted">Aucune vidéo à modérer.</div>}
      <div className="grid gap-4 md:grid-cols-2">{pending.map((m) => (
        <div key={m.id} className="card"><video src={`/api/media/${m.id}`} controls preload="metadata" className="mb-3 w-full rounded-2xl bg-ink-900" />
          <div className="font-bold">{m.title}</div><div className="muted">Consentement au partage : {m.shareConsentAt ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(m.shareConsentAt) : "absent"} · Enfant identifiable : {m.minorIdentifiable ? "oui" : "non"}</div>
          <form action={moderate} className="mt-3 space-y-2"><input type="hidden" name="mediaId" value={m.id} /><select name="exerciseSlug" defaultValue={m.exerciseSlug ?? ""} className="input" aria-label="Exercice illustré"><option value="">Exercice illustré…</option>{exs.map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}</select><input name="note" maxLength={200} placeholder="Note pour la famille (en cas de refus)" className="input" aria-label="Note" /><div className="flex gap-2"><button name="decision" value="approve" className="btn-primary btn-sm flex-1">Valider</button><button name="decision" value="reject" className="btn-danger btn-sm flex-1">Refuser</button></div></form>
        </div>
      ))}</div>
    </div>
  );
}
