import { requirePerm } from "@/lib/auth";
import Submit from "@/components/Submit";
import { broadcast } from "../actions";
export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string; e?: string }> }) {
  await requirePerm("rules");
  const { ok, e } = await searchParams;
  return (
    <div className="max-w-xl">
      <h1 className="mb-1 font-display text-2xl font-extrabold">Notifications</h1><p className="muted mb-4">Envoi dans l'application, uniquement aux parents dont les préférences l'autorisent. Jamais de message culpabilisant : pas de relance pour séance manquée.</p>
      {ok && <div className="mb-3 rounded-2xl bg-pitch-50 p-3 text-sm font-semibold text-pitch-800">Notification envoyée à {ok} parent(s).</div>}{e && <div className="mb-3 rounded-2xl bg-coral-100 p-3 text-sm font-semibold">Titre et message obligatoires.</div>}
      <form action={broadcast} className="card space-y-3">
        <div><label className="label" htmlFor="kind">Type</label><select id="kind" name="kind" className="input"><option value="challenge">Nouveau défi</option><option value="guide">Nouveau guide</option><option value="report">Information importante</option></select></div>
        <div><label className="label" htmlFor="title">Titre</label><input id="title" name="title" maxLength={80} required className="input" /></div>
        <div><label className="label" htmlFor="body">Message</label><textarea id="body" name="body" rows={3} maxLength={300} required className="input" /></div>
        <div><label className="label" htmlFor="href">Lien dans l'application (facultatif)</label><input id="href" name="href" placeholder="/app/progression/evaluations" className="input" /></div>
        <Submit confirm="Envoyer cette notification à tous les parents concernés ?">Envoyer</Submit>
      </form>
    </div>
  );
}
