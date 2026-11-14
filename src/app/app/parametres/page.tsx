import Link from "next/link";
import { getActiveChild } from "@/lib/auth";
import { changePassword, deleteAccount, saveSettings, setModes } from "@/app/actions";
import { Notice, PageHead, Section } from "@/components/ui";
import { db } from "@/lib/db";

const LABELS: Record<string, string> = { cgu: "Conditions générales", parental: "Attestation d'autorité parentale", health: "Données de forme et de santé", marketing_email: "Conseils par e-mail", media_share: "Partage d'une vidéo", withdrawal_waiver: "Accès immédiat (rétractation)" };
async function ConsentHistory({ userId }: { userId: string }) {
  const list = await db.consent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 });
  if (!list.length) return null;
  return <details><summary className="cursor-pointer font-bold">Historique de mes consentements</summary><ul className="mt-2 space-y-1">{list.map((c) => <li key={c.id}>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(c.createdAt)} · {LABELS[c.type] ?? c.type} · <b>{c.granted ? "accordé" : "retiré"}</b> <span className="text-ink-500">(version {c.version})</span></li>)}</ul></details>;
}
import Submit from "@/components/Submit";

export const metadata = { title: "Paramètres" };
const Toggle = ({ name, label, hint, on }: { name: string; label: string; hint?: string; on?: boolean }) => <label className="flex items-start justify-between gap-3 py-2"><span><span className="block font-semibold">{label}</span>{hint && <span className="muted block">{hint}</span>}</span><input type="checkbox" name={name} defaultChecked={on} className="mt-1 h-5 w-5 shrink-0 accent-pitch-600" /></label>;

export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string; e?: string }> }) {
  const { user, child } = await getActiveChild();
  const sp = await searchParams;
  const n = (user.notifPrefs ?? {}) as Record<string, unknown>;
  const modes = (child.modes ?? {}) as Record<string, boolean>;
  return (
    <div>
      <PageHead title="Paramètres" back="/app/menu" />
      {sp.ok && <Notice tone="ok">Modifications enregistrées.</Notice>}{sp.e && <Notice tone="warn">{sp.e}</Notice>}
      <Section title={`Modes pour ${child.nickname}`}><form action={setModes} className="card divide-y divide-ink-100">
        <Toggle name="vacances" label="🏖 Mode vacances" hint="Deux séances courtes et ludiques par semaine au maximum, pour garder le plaisir sans rien imposer." on={modes.vacances} />
        <Toggle name="petitEspace" label="🏠 Mode petit espace" hint="Uniquement des exercices réalisables sur quelques mètres carrés." on={modes.petitEspace} />
        <Toggle name="sansMateriel" label="⚽ Mode sans matériel" hint="Un ballon, rien d'autre." on={modes.sansMateriel} />
        <div className="pt-3"><Submit pendingText="Recalcul du programme…">Appliquer et recalculer le programme</Submit></div>
      </form></Section>
      <Section title="Mon compte et mes notifications"><form action={saveSettings} className="card space-y-3">
        <div><label className="label" htmlFor="firstName">Prénom</label><input id="firstName" name="firstName" defaultValue={user.firstName} maxLength={40} className="input" /></div>
        <Toggle name="emailMarketing" label="✉️ Conseils par e-mail" hint="Environ un e-mail par mois. Désinscription en un clic dans chaque message." on={user.emailMarketing} />
        <Toggle name="beginnerMode" label="🎓 Mode parent débutant" hint="Affiche des explications supplémentaires sur chaque écran, sans supposer que vous connaissez le football." on={user.beginnerMode} />
        <div><label className="label" htmlFor="frequency">Fréquence des notifications</label><select id="frequency" name="frequency" defaultValue={String(n.frequency ?? "normal")} className="input"><option value="normal">Normale</option><option value="minimale">Minimale (bilans et repos conseillé uniquement)</option><option value="aucune">Aucune</option></select></div>
        <div className="divide-y divide-ink-100">
          <Toggle name="n_session" label="Séance programmée" on={n.session !== false} /><Toggle name="n_report" label="Bilan mensuel disponible" on={n.report !== false} /><Toggle name="n_challenge" label="Nouveau défi" on={n.challenge !== false} /><Toggle name="n_goal" label="Objectif atteint, nouveau badge" on={n.goal !== false} /><Toggle name="n_rest" label="Repos recommandé" on={n.rest !== false} /><Toggle name="n_guide" label="Nouveau guide parental" on={n.guide !== false} />
        </div>
        <p className="muted">Nous ne vous relançons jamais pour une séance manquée.</p>
        <Submit>Enregistrer</Submit>
      </form></Section>
      <Section title="Mot de passe"><form action={changePassword} className="card space-y-3"><input name="current" type="password" autoComplete="current-password" placeholder="Mot de passe actuel" aria-label="Mot de passe actuel" required className="input" /><input name="next" type="password" autoComplete="new-password" minLength={8} placeholder="Nouveau mot de passe (8 caractères min.)" aria-label="Nouveau mot de passe" required className="input" /><Submit className="btn-ghost w-full">Changer le mot de passe</Submit></form></Section>
      <Section title="Mes données (RGPD)"><div className="card space-y-3 text-sm text-ink-700">
        <p>Consentement parental enregistré le {user.consentAt ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(user.consentAt) : "—"} (version {user.consentVersion ?? "—"}). <Link href="/confidentialite" className="font-bold text-pitch-700">Politique de confidentialité</Link></p>
        <ConsentHistory userId={user.id} />
        <div className="flex flex-wrap gap-x-4 gap-y-1"><Link href="/cgu" className="font-bold text-pitch-700 underline">Conditions générales</Link><Link href="/cookies" className="font-bold text-pitch-700 underline">Cookies</Link><Link href="/mentions-legales" className="font-bold text-pitch-700 underline">Mentions légales</Link></div>
        <a href="/api/export" className="btn-ghost w-full">⬇️ Exporter toutes mes données (JSON)</a>
        <details className="rounded-2xl bg-coral-100 p-3"><summary className="cursor-pointer font-bold text-coral-600">Supprimer mon compte</summary>
          <form action={deleteAccount} className="mt-3 space-y-2"><p>Suppression immédiate et définitive : compte, profils enfants, séances, mesures, carnet, photos et vidéos. L'abonnement en cours est résilié.</p><input name="password" type="password" required placeholder="Confirmez avec votre mot de passe" aria-label="Mot de passe" className="input" /><Submit className="btn-danger w-full" confirm="Supprimer définitivement le compte et toutes les données ?">Supprimer définitivement</Submit></form>
        </details>
      </div></Section>
    </div>
  );
}
