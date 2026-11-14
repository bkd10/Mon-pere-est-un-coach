import { reportMedia } from "@/app/actions";
import Submit from "./Submit";
// Signalement d'une vidéo publiée : traité par un modérateur, qui retire le contenu s'il est illicite ou inapproprié.
export default function ReportForm({ mediaId, back }: { mediaId: string; back: string }) {
  return (
    <details className="mt-1 text-xs">
      <summary className="cursor-pointer font-bold text-ink-500">Signaler cette vidéo</summary>
      <form action={reportMedia} className="mt-2 space-y-2">
        <input type="hidden" name="mediaId" value={mediaId} /><input type="hidden" name="back" value={back} />
        <select name="reason" className="input py-2 text-sm" aria-label="Motif du signalement" defaultValue="vie-privee"><option value="vie-privee">Atteinte à la vie privée ou au droit à l'image</option><option value="enfant-tiers">Un enfant apparaît sans accord</option><option value="inapproprie">Contenu inapproprié</option><option value="danger">Exercice dangereux</option><option value="autre">Autre</option></select>
        <input name="detail" maxLength={500} placeholder="Précisions (facultatif)" aria-label="Précisions" className="input py-2 text-sm" />
        <Submit className="btn-ghost btn-sm w-full">Envoyer le signalement</Submit>
      </form>
    </details>
  );
}
