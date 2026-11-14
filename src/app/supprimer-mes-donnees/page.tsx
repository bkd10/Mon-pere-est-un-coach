import Link from "next/link";
import { LEGAL, show } from "@/content/legal";
import { LegalPage, S } from "@/components/LegalPage";
import Submit from "@/components/Submit";
import { requestDeletion } from "../actions";
export const metadata = { title: "Supprimer mes données" };
export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string; e?: string }> }) {
  const sp = await searchParams;
  return (
    <LegalPage title="Supprimer mes données">
      <S t="Vous avez accès à votre compte"><p>La suppression est immédiate : <Link href="/app/parametres" className="font-bold text-pitch-700 underline">Paramètres → Supprimer mon compte</Link>. Vous pouvez d'abord exporter vos données au même endroit. Pour un seul enfant : « Mon enfant » → « Supprimer le profil ».</p></S>
      <S t="Vous n'avez plus accès à votre compte">
        {sp.ok ? <p className="rounded-2xl bg-pitch-50 p-3 font-semibold text-pitch-800">Demande enregistrée. Nous vérifions que vous êtes bien titulaire du compte, puis nous supprimons les données et vous le confirmons, dans un délai d'un mois au plus.</p> : (
          <form action={requestDeletion} className="space-y-3">
            {sp.e && <p role="alert" className="rounded-2xl bg-coral-100 p-3 text-sm font-semibold">{sp.e}</p>}
            <div><label className="label" htmlFor="email">E-mail du compte</label><input id="email" name="email" type="email" required className="input" autoComplete="email" /></div>
            <div><label className="label" htmlFor="message">Précisions (facultatif)</label><textarea id="message" name="message" rows={3} maxLength={1000} className="input" /></div>
            <Submit>Demander la suppression</Submit>
            <p className="muted">Vous pouvez aussi écrire à {show(LEGAL.dpo || LEGAL.email)}.</p>
          </form>
        )}
      </S>
    </LegalPage>
  );
}
