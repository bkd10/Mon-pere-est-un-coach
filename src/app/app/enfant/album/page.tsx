import { FEATURES } from "@/lib/flags";
import { getActiveChild } from "@/lib/auth";
import { db } from "@/lib/db";
import { addMemory, deleteMemory, shareMedia, unshareMedia } from "@/app/actions";
import { entOf, todayIso } from "@/lib/services";
import { Notice, PageHead, Section } from "@/components/ui";
import Submit from "@/components/Submit";

export const metadata = { title: "Album de souvenirs" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { user, child } = await getActiveChild();
  const sp = await searchParams;
  const ent = entOf(user);
  const [miles, used, exs] = await Promise.all([
    db.milestone.findMany({ where: { childId: child.id }, orderBy: { date: "desc" } }),
    db.media.count({ where: { ownerId: user.id } }),
    db.exercise.findMany({ where: { published: true }, select: { slug: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const media = await db.media.findMany({ where: { id: { in: miles.map((m) => m.mediaId).filter(Boolean) as string[] }, ownerId: user.id } });
  const STATUS: Record<string, string> = { PRIVATE: "Privé", PENDING: "Proposé — en attente de modération", APPROVED: "Partagé avec la communauté", REJECTED: "Non retenu — reste privé" };
  return (
    <div>
      <PageHead title={`L'album de ${child.nickname}`} sub="Ses réussites, ses étapes, ses souvenirs. Privé par défaut." back="/app/enfant" />
      {sp.ok && <Notice tone="ok">Souvenir ajouté à l'album.</Notice>}{sp.propose && <Notice tone="ok">Vidéo proposée. Elle restera privée tant qu'un modérateur ne l'a pas validée, et vous pouvez retirer votre accord à tout moment.</Notice>}{sp.retire && <Notice>Partage retiré : la vidéo est de nouveau strictement privée.</Notice>}{sp.e && <Notice tone="warn">{sp.e}</Notice>}
      <Section title="Ajouter un souvenir"><form action={addMemory} className="card space-y-3">
        <div><label className="label" htmlFor="title">Titre</label><input id="title" name="title" required maxLength={80} className="input" placeholder="Ex. : premier petit pont à papa !" /></div>
        <div className="grid grid-cols-2 gap-2"><div><label className="label" htmlFor="date">Date</label><input id="date" name="date" type="date" defaultValue={todayIso()} max={todayIso()} className="input" /></div><div><label className="label" htmlFor="kind">Type</label><select id="kind" name="kind" className="input"><option value="souvenir">📸 Souvenir</option><option value="etape">🚩 Étape franchie</option></select></div></div>
        <div><label className="label" htmlFor="file">Photo ou vidéo (facultatif)</label><input id="file" name="file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" className="input" /><p className="muted mt-1">Photo jusqu'à 10 Mo, vidéo jusqu'à 50 Mo. {used} / {ent.mediaQuota} médias utilisés. Stockage privé : visible uniquement depuis votre compte.</p></div>
        <div><label className="label" htmlFor="ex">Exercice concerné (facultatif)</label><select id="ex" name="exerciseSlug" className="input"><option value="">—</option>{exs.map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}</select></div>
        <div><label className="label" htmlFor="detail">Quelques mots</label><textarea id="detail" name="detail" rows={2} maxLength={300} className="input" /></div>
        <Submit pendingText="Envoi…">Ajouter à l'album</Submit>
      </form></Section>
      <Section title="Souvenirs">
        {miles.length === 0 && <div className="card muted">L'album est vide pour l'instant. Le premier souvenir débloque un badge.</div>}
        <ul className="space-y-3">{miles.map((m) => { const md = media.find((x) => x.id === m.mediaId); return (
          <li key={m.id} className="card">
            {md && (md.kind === "video" ? <video src={`/api/media/${md.id}`} controls playsInline preload="metadata" className="mb-3 w-full rounded-2xl bg-ink-900" /> : <img src={`/api/media/${md.id}`} alt={m.title} className="mb-3 w-full rounded-2xl" loading="lazy" />)}
            <div className="flex items-start justify-between gap-2"><div><div className="font-bold">{m.kind === "etape" ? "🚩" : m.kind === "reussite" ? "🌟" : "📸"} {m.title}</div><div className="muted">{new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(m.date)}</div>{m.detail && <p className="mt-1 text-sm text-ink-700">{m.detail}</p>}</div>
              <form action={deleteMemory}><input type="hidden" name="id" value={m.id} /><Submit className="text-sm font-bold text-coral-600" confirm="Supprimer ce souvenir ?" pendingText="…">Supprimer</Submit></form></div>
            {FEATURES.familyVideos && md?.kind === "video" && (
              <details className="mt-3 rounded-2xl bg-ink-50 p-3 text-sm"><summary className="cursor-pointer font-bold">Partage : {STATUS[md.status]}</summary>
                {md.status === "PRIVATE" || md.status === "REJECTED" ? (
                  <form action={shareMedia} className="mt-3 space-y-2"><input type="hidden" name="mediaId" value={md.id} />
                    <p className="text-ink-700">Vous pouvez proposer cette vidéo pour illustrer un exercice auprès des autres familles. C'est entièrement facultatif. Elle sera vérifiée par un modérateur avant toute diffusion, et visible uniquement par les abonnés connectés.</p>
                    {md.moderationNote && <p className="text-coral-600">Note du modérateur : {md.moderationNote}</p>}
                    <label className="flex gap-2"><input type="checkbox" name="consentAuthority" required className="mt-0.5 h-4 w-4 accent-pitch-600" /><span>Je suis titulaire de l'autorité parentale de l'enfant visible sur cette vidéo.</span></label>
                    <label className="flex gap-2"><input type="checkbox" name="consentBoth" required className="mt-0.5 h-4 w-4 accent-pitch-600" /><span>L'autre parent titulaire de l'autorité parentale est d'accord (les parents protègent ensemble le droit à l'image de leur enfant, art. 372-1 du code civil).</span></label>
                    <label className="flex gap-2"><input type="checkbox" name="consentChild" required className="mt-0.5 h-4 w-4 accent-pitch-600" /><span>J'en ai parlé avec mon enfant, selon son âge et sa maturité, et il est d'accord.</span></label>
                    <label className="flex gap-2"><input type="checkbox" name="consentOthers" required className="mt-0.5 h-4 w-4 accent-pitch-600" /><span>Aucune autre personne n'est reconnaissable, ni aucune information personnelle (nom, école, adresse, maillot floqué).</span></label>
                    <label className="flex gap-2"><input type="checkbox" name="consentShare" required className="mt-0.5 h-4 w-4 accent-pitch-600" /><span>J'autorise sa diffusion dans la vidéothèque de l'application et je sais que je peux retirer cet accord à tout moment.</span></label>
                    <label className="flex gap-2"><input type="checkbox" name="identifiable" defaultChecked className="mt-0.5 h-4 w-4 accent-pitch-600" /><span>Le visage de l'enfant est reconnaissable sur la vidéo.</span></label>
                    <Submit className="btn-ghost btn-sm w-full">Proposer cette vidéo</Submit></form>
                ) : <form action={unshareMedia} className="mt-3"><input type="hidden" name="mediaId" value={md.id} /><Submit className="btn-danger btn-sm w-full">Retirer mon accord et repasser en privé</Submit></form>}
              </details>
            )}
          </li>
        ); })}</ul>
      </Section>
    </div>
  );
}
