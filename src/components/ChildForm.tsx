import type { Child } from "@prisma/client";
import { saveChild } from "@/app/actions";
import { EQUIPMENT, GOALS, LEVELS, PLACES, POSITIONS } from "@/content/taxonomy";
import { Choice } from "./ui";
import Submit from "./Submit";

const DAYS = [["1", "Lun"], ["2", "Mar"], ["3", "Mer"], ["4", "Jeu"], ["5", "Ven"], ["6", "Sam"], ["0", "Dim"]];
const AVATARS = ["⚽", "🦁", "🐯", "🦊", "🐼", "🦄", "🚀", "⭐", "🔥", "🌈"];
const Group = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => <fieldset className="card"><legend className="sr-only">{title}</legend><div className="mb-3"><div className="font-display text-lg font-extrabold">{title}</div>{hint && <p className="muted">{hint}</p>}</div><div className="space-y-4">{children}</div></fieldset>;

export default function ChildForm({ child }: { child?: Child }) {
  const c = child;
  return (
    <form action={saveChild} className="space-y-4">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Group title="Qui est votre footballeur ?" hint="Un pseudonyme suffit : nous n'avons pas besoin de son nom.">
        <div><label className="label" htmlFor="nickname">Prénom ou pseudonyme</label><input id="nickname" name="nickname" className="input" required maxLength={30} defaultValue={c?.nickname} /></div>
        <div><label className="label" htmlFor="birthMonth">Mois et année de naissance</label><input id="birthMonth" name="birthMonth" type="month" className="input" required defaultValue={c ? c.birthDate.toISOString().slice(0, 7) : ""} placeholder="AAAA-MM" /><p className="muted mt-1">Le jour n'est pas demandé : le mois suffit pour choisir des exercices de son âge.</p></div>
        <div><span className="label">Son avatar</span><div className="flex flex-wrap gap-2">{AVATARS.map((a, i) => <Choice key={a} name="avatar" value={a} label={<span className="text-xl">{a}</span>} defaultChecked={c ? c.avatar === a : i === 0} />)}</div></div>
      </Group>
      <Group title="Où en est-il ?">
        <div><span className="label">Niveau</span><div className="grid grid-cols-3 gap-2">{LEVELS.map((l, i) => <Choice key={l.key} name="level" value={l.key} label={l.label} defaultChecked={c ? c.level === l.key : i === 0} />)}</div><p className="muted mt-1">Dans le doute, choisissez « Débutant » : le programme s'ajuste ensuite.</p></div>
        <div><span className="label">Pied préféré</span><div className="grid grid-cols-3 gap-2">{["droit", "gauche", "les deux"].map((x) => <Choice key={x} name="dominantFoot" value={x} label={x[0].toUpperCase() + x.slice(1)} defaultChecked={(c?.dominantFoot ?? "droit") === x} />)}</div></div>
        <div><label className="label" htmlFor="position">Poste préféré (facultatif)</label><select id="position" name="position" className="input" defaultValue={c?.position ?? ""}><option value="">—</option>{POSITIONS.map((x) => <option key={x}>{x}</option>)}</select></div>
      </Group>
      <Group title="Sa semaine de football" hint="Pour ne jamais surcharger : nous plaçons les séances loin des entraînements et des matchs.">
        <div><label className="label" htmlFor="club">Club (facultatif)</label><input id="club" name="club" className="input" maxLength={60} defaultValue={c?.club ?? ""} placeholder="Laissez vide s'il ne joue pas en club" /></div>
        <div><span className="label">Jours d'entraînement en club</span><div className="grid grid-cols-7 gap-1">{DAYS.map(([v, l]) => <Choice key={v} type="checkbox" name="clubDays" value={v} label={l} defaultChecked={c?.clubDays.includes(Number(v))} />)}</div></div>
        <div><label className="label" htmlFor="matchDay">Jour de match habituel</label><select id="matchDay" name="matchDay" className="input" defaultValue={c?.matchDay ?? ""}><option value="">Pas de match</option>{DAYS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
      </Group>
      <Group title="Ses envies" hint="Jusqu'à quatre objectifs.">
        <div className="grid grid-cols-2 gap-2">{GOALS.map((g) => <Choice key={g.key} type="checkbox" name="goals" value={g.key} label={g.label} defaultChecked={c ? c.goals.includes(g.key) : g.key === "plaisir"} />)}</div>
      </Group>
      <Group title="À la maison">
        <div><span className="label">Temps disponible par séance</span><div className="grid grid-cols-4 gap-2">{[10, 15, 20, 30].map((m) => <Choice key={m} name="minutesAvailable" value={String(m)} label={`${m} min`} defaultChecked={(c?.minutesAvailable ?? 15) === m} />)}</div></div>
        <div><span className="label">Séances souhaitées par semaine</span><div className="grid grid-cols-3 gap-2">{[1, 2, 3].map((m) => <Choice key={m} name="homeSessionsPerWeek" value={String(m)} label={String(m)} defaultChecked={(c?.homeSessionsPerWeek ?? 2) === m} />)}</div><p className="muted mt-1">Un maximum, pas un objectif : l'application en proposera moins si la semaine est chargée.</p></div>
        <div><span className="label">Où pouvez-vous jouer ?</span><div className="grid grid-cols-2 gap-2">{PLACES.map((p) => <Choice key={p.key} type="checkbox" name="places" value={p.key} label={p.label} defaultChecked={c ? c.places.includes(p.key) : p.key === "jardin"} />)}</div></div>
        <div><span className="label">Matériel disponible</span><div className="grid grid-cols-1 gap-2">{EQUIPMENT.filter((e) => e.key !== "ballon").map((e) => <Choice key={e.key} type="checkbox" name="equipment" value={e.key} label={e.label} defaultChecked={c ? c.equipment.includes(e.key) : e.key === "plots"} />)}</div><p className="muted mt-1">Un ballon suffit pour commencer. Les plots se remplacent par des bouteilles.</p></div>
      </Group>
      <fieldset className="card"><legend className="sr-only">Suivi forme et santé</legend>
        <div className="font-display text-lg font-extrabold">Suivi forme et santé <span className="text-sm font-bold text-ink-500">(facultatif)</span></div>
        <p className="muted mb-3">Avec votre accord, l'application enregistre la fatigue et les douleurs signalées après les séances pour alléger ou suspendre des exercices, et vous permet de tenir un carnet (taille, poids, sommeil). Ces données sont chiffrées, visibles par vous seul, jamais transmises à l'IA ni utilisées pour un diagnostic. Sans cet accord, les séances fonctionnent normalement mais ne s'adaptent pas à la fatigue. Vous pouvez retirer votre accord à tout moment : les données correspondantes sont alors effacées.</p>
        <label className="flex gap-3 text-sm"><input type="checkbox" name="health" defaultChecked={Boolean(c?.healthConsentAt)} className="mt-0.5 h-5 w-5 shrink-0 accent-pitch-600" /><span>J'accepte que les données de forme et de santé de mon enfant soient utilisées pour adapter ses séances.</span></label>
        <label className="mt-2 flex gap-3 text-sm"><input type="checkbox" name="healthChild" defaultChecked={Boolean(c?.healthConsentAt)} className="mt-0.5 h-5 w-5 shrink-0 accent-pitch-600" /><span>Si mon enfant a moins de 15 ans : je lui ai expliqué ce suivi et il est d'accord.</span></label>
      </fieldset>
      <Submit pendingText="Création du programme…">{c ? "Enregistrer et recalculer le programme" : "Créer son programme"}</Submit>
    </form>
  );
}
