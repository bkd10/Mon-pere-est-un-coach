import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "../actions";
import { getUser } from "@/lib/auth";
import AuthShell from "@/components/AuthShell";
import Submit from "@/components/Submit";
import LegalFooter from "@/components/LegalFooter";

export const metadata = { title: "Connexion" };
export default async function Page({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  if (await getUser()) redirect("/app");
  const { e } = await searchParams;
  return (
    <AuthShell title="Bon retour !" sub="Votre séance vous attend." error={e}>
      <form action={login} className="space-y-4">
        <div><label className="label" htmlFor="email">E-mail</label><input id="email" name="email" type="email" className="input" autoComplete="email" required /></div>
        <div><label className="label" htmlFor="password">Mot de passe</label><input id="password" name="password" type="password" className="input" autoComplete="current-password" required /></div>
        <Submit>Se connecter</Submit>
        <p className="text-center text-sm"><Link href="/mot-de-passe-oublie" className="font-bold text-pitch-700">Mot de passe oublié ?</Link></p>
      </form>
      <p className="muted mt-5 text-center">Pas encore de compte ? <Link href="/inscription" className="font-bold text-pitch-700">Créer un compte</Link></p>
      <LegalFooter className="mt-6 justify-center" />
    </AuthShell>
  );
}
