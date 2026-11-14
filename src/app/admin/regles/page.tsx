import { requirePerm } from "@/lib/auth";
import { DEFAULT_RULES } from "@/lib/engine";
import { getRules } from "@/lib/services";
import Submit from "@/components/Submit";
import { saveRule } from "../actions";
const P: Record<string, string> = { suspendDays: "Jours de suspension", max4to7: "Rendez-vous max / semaine (4-7 ans)", max8to11: "Rendez-vous max / semaine (8-11 ans)", max12plus: "Rendez-vous max / semaine (12 ans et +)", restDaysAfterMatch: "Jours de repos après un match", durationPct: "Durée de la séance (% de la normale)", restAfterConsecutive: "Repos imposé après N séances « très fatigué »", minHoursUnder12: "Sommeil attendu avant 12 ans (h)", minHours12plus: "Sommeil attendu à 12 ans et + (h)", consecutive: "Nombre de séances consécutives", maxPerWeek: "Séances max / semaine", maxMinutes: "Durée max (min)" };
export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await requirePerm("rules");
  const { ok } = await searchParams;
  const rules = await getRules();
  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-extrabold">Règles d'adaptation de l'IA</h1>
      <p className="muted mb-4 max-w-3xl">Le moteur choisit les exercices dans la bibliothèque de fiches, puis applique ces règles avant toute proposition. Chaque règle déclenchée est expliquée au parent. Les règles 🔒 protègent la santé des enfants : elles restent toujours actives et leurs paramètres sont bornés. Aucune règle ne permet d'augmenter automatiquement le temps d'entraînement.</p>
      {ok && <div className="mb-3 rounded-2xl bg-pitch-50 p-3 text-sm font-semibold text-pitch-800">Règle mise à jour. Elle s'applique aux prochaines séances générées.</div>}
      <div className="grid gap-3 md:grid-cols-2">{DEFAULT_RULES.map((d) => { const r = rules[d.key]; return (
        <form key={d.key} action={saveRule} className="card space-y-3"><input type="hidden" name="key" value={d.key} />
          <div className="flex items-start justify-between gap-2"><div><div className="font-bold">{d.locked ? "🔒 " : ""}{d.label}</div><p className="muted">{d.description}</p></div>{d.locked ? <span className="chip shrink-0 bg-pitch-100 text-pitch-800">Sécurité</span> : <label className="flex shrink-0 items-center gap-2 text-sm font-semibold"><input type="checkbox" name="enabled" defaultChecked={r.enabled} />Active</label>}</div>
          {Object.keys(d.params).length > 0 && <div className="grid grid-cols-2 gap-2">{Object.keys(d.params).map((k) => <div key={k}><label className="label text-xs" htmlFor={`${d.key}-${k}`}>{P[k] ?? k}</label><input id={`${d.key}-${k}`} name={`p_${k}`} type="number" step="any" min={0} defaultValue={r.params[k]} className="input py-2" /></div>)}</div>}
          {(!d.locked || Object.keys(d.params).length > 0) && <Submit className="btn-ghost btn-sm">Enregistrer</Submit>}
        </form>
      ); })}</div>
    </div>
  );
}
