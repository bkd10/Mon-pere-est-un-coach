import AuthShell from "@/components/AuthShell";
import Submit from "@/components/Submit";
import { resetPassword } from "../public-actions";
export const metadata = { title: "Nouveau mot de passe" };
export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string; e?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell title="Nouveau mot de passe" sub="Choisissez un mot de passe d'au moins 8 caractères." error={sp.e}>
      <form action={resetPassword} className="space-y-4">
        <input type="hidden" name="t" value={sp.t ?? ""} />
        <div><label className="label" htmlFor="password">Nouveau mot de passe</label><input id="password" name="password" type="password" className="input" autoComplete="new-password" minLength={8} required /></div>
        <Submit>Enregistrer</Submit>
      </form>
    </AuthShell>
  );
}
