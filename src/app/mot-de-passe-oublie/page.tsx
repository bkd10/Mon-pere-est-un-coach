import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import Submit from "@/components/Submit";
import { requestPasswordReset } from "../public-actions";
export const metadata = { title: "Mot de passe oublié" };
export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string; e?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell title="Mot de passe oublié" sub="Nous vous envoyons un lien pour en choisir un nouveau." error={sp.e}>
      {sp.ok ? <p className="rounded-2xl bg-pitch-50 p-3 font-semibold text-pitch-800">Si un compte existe avec cette adresse, un e-mail vient de partir. Le lien est valable une heure. Pensez à regarder vos courriers indésirables.</p> : (
        <form action={requestPasswordReset} className="space-y-4">
          <div><label className="label" htmlFor="email">E-mail du compte</label><input id="email" name="email" type="email" className="input" autoComplete="email" required /></div>
          <Submit>Recevoir le lien</Submit>
        </form>
      )}
      <p className="muted mt-5 text-center"><Link href="/connexion" className="font-bold text-pitch-700">Retour à la connexion</Link></p>
    </AuthShell>
  );
}
