import Link from "next/link";
import { salesOpen } from "@/lib/flags";
import { redirect } from "next/navigation";
import { signup } from "../actions";
import { getUser } from "@/lib/auth";
import AuthShell from "@/components/AuthShell";
import Submit from "@/components/Submit";
import LegalFooter from "@/components/LegalFooter";

export const metadata = { title: "Créer un compte" };
export default async function Page({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  if (await getUser()) redirect("/app");
  const { e } = await searchParams;
  return (
    <AuthShell title="Créer mon compte" sub="Deux minutes, puis votre première séance est prête." error={e}>
      <form action={signup} className="space-y-4">
        <div><label className="label" htmlFor="firstName">Votre prénom</label><input id="firstName" name="firstName" className="input" autoComplete="given-name" required maxLength={40} /></div>
        <div><label className="label" htmlFor="email">E-mail</label><input id="email" name="email" type="email" className="input" autoComplete="email" required /></div>
        <div><label className="label" htmlFor="password">Mot de passe</label><input id="password" name="password" type="password" className="input" autoComplete="new-password" minLength={8} required /><p className="muted mt-1">8 caractères minimum.</p></div>
        <div className="space-y-2 rounded-2xl bg-white p-3 text-sm text-ink-700 shadow-card">
          <label className="flex gap-3"><input type="checkbox" name="cgu" required className="mt-0.5 h-5 w-5 shrink-0 accent-pitch-600" /><span>J'accepte les <Link href="/cgu" className="font-bold text-pitch-700 underline" target="_blank">conditions générales</Link>. <span className="text-ink-500">(obligatoire)</span></span></label>
          <label className="flex gap-3"><input type="checkbox" name="consent" required className="mt-0.5 h-5 w-5 shrink-0 accent-pitch-600" /><span>Je suis titulaire de l'autorité parentale (ou représentant légal) de l'enfant dont je créerai le profil, et j'ai lu la <Link href="/confidentialite" className="font-bold text-pitch-700 underline" target="_blank">politique de confidentialité</Link>. <span className="text-ink-500">(obligatoire)</span></span></label>
          <label className="flex gap-3"><input type="checkbox" name="marketing" className="mt-0.5 h-5 w-5 shrink-0 accent-pitch-600" /><span>Je souhaite recevoir des conseils par e-mail (environ un par mois). Désinscription en un clic. <span className="text-ink-500">(facultatif)</span></span></label>
        </div>
        <p className="muted">{salesOpen() ? "L'essai gratuit de 7 jours ne demande aucune carte bancaire et ne se transforme jamais en abonnement payant sans votre accord." : "Toute l'application est gratuite pendant le lancement : aucune carte bancaire, aucun abonnement."}</p>
        <Submit>Créer mon compte</Submit>
      </form>
      <p className="muted mt-5 text-center">Déjà inscrit ? <Link href="/connexion" className="font-bold text-pitch-700">Se connecter</Link></p>
      <LegalFooter className="mt-6 justify-center" />
    </AuthShell>
  );
}
