import Link from "next/link";
import { getActiveChild } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDevEntry, deleteDevEntries } from "@/app/actions";
import { decryptJson } from "@/lib/crypto";
import { todayIso } from "@/lib/services";
import { LineChart, Notice, PageHead, Section } from "@/components/ui";
import Submit from "@/components/Submit";

export const metadata = { title: "Carnet de suivi" };
type Entry = { heightCm?: number; weightKg?: number; sleepH?: number; fatigue?: number; energy?: number; motivation?: number; wellbeing?: number; note?: string };
const short = (d: Date) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(d);

export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string; e?: string; efface?: string }> }) {
  const { child } = await getActiveChild();
  const sp = await searchParams;
  const rows = await db.developmentEntry.findMany({ where: { childId: child.id }, orderBy: { date: "asc" } });
  const entries = rows.map((r) => ({ date: r.date, ...(decryptJson<Entry>(r.payload) ?? {}) }));
  const series = (k: keyof Entry) => entries.filter((e) => typeof e[k] === "number").map((e) => ({ date: short(e.date), value: e[k] as number })).slice(-12);
  const charts: [keyof Entry, string, string, string][] = [["heightCm", "Taille", "cm", "#1ca463"], ["weightKg", "Poids", "kg", "#3b8fe0"], ["sleepH", "Sommeil", "h", "#6366f1"], ["energy", "Énergie", "/5", "#f9a826"], ["fatigue", "Fatigue", "/5", "#f2674b"], ["motivation", "Motivation", "/5", "#a855f7"], ["wellbeing", "Bien-être", "/5", "#14b8a6"]];
  const F = ({ name, label, step = "1", ph }: { name: string; label: string; step?: string; ph?: string }) => <div><label className="label" htmlFor={name}>{label}</label><input id={name} name={name} type="number" inputMode="decimal" step={step} className="input" placeholder={ph ?? "—"} /></div>;
  return (
    <div>
      <PageHead title="Carnet de suivi du développement" sub="Facultatif, privé, visible par vous seul." back="/app/progression" />
      {sp.ok && <Notice tone="ok">Entrée enregistrée.</Notice>}{sp.efface && <Notice>Toutes les entrées du carnet ont été supprimées.</Notice>}{sp.e && <Notice tone="warn">{sp.e}</Notice>}
      <div className="card mb-4 bg-sky-100 text-sm text-ink-700">🔒 Ces informations sont chiffrées dans notre base et ne sont jamais partagées. Elles servent uniquement de mémoire pour votre famille : l'application n'en tire <b>aucun diagnostic, aucune prédiction de croissance et aucun classement</b>. Seul le sommeil déclaré peut alléger une séance. Pour toute question de santé ou de croissance, adressez-vous à votre médecin.</div>
      {!child.healthConsentAt ? <div className="card mb-4"><p className="font-bold">Le carnet nécessite votre accord</p><p className="mt-1 text-sm text-ink-700">Taille, poids et sommeil sont des données de santé. Elles ne sont enregistrées qu'avec votre accord explicite (et celui de votre enfant s'il a moins de 15 ans), à donner dans son profil.</p><Link href="/app/enfant/modifier" className="btn-primary mt-3 w-full">Activer le suivi dans son profil</Link></div> : <Section title="Nouvelle entrée"><form action={addDevEntry} className="card space-y-3">
        <div><label className="label" htmlFor="date">Date</label><input id="date" name="date" type="date" defaultValue={todayIso()} max={todayIso()} className="input" /></div>
        <div className="grid grid-cols-2 gap-3"><F name="heightCm" label="Taille (cm)" step="0.5" /><F name="weightKg" label="Poids (kg)" step="0.1" /><F name="sleepH" label="Sommeil (heures)" step="0.5" /><F name="energy" label="Énergie (1 à 5)" /><F name="fatigue" label="Fatigue (1 à 5)" /><F name="motivation" label="Motivation (1 à 5)" /><F name="wellbeing" label="Bien-être (1 à 5)" /></div>
        <div><label className="label" htmlFor="note">Note</label><input id="note" name="note" maxLength={300} className="input" placeholder="Facultatif" /></div>
        <p className="muted">Tous les champs sont facultatifs : renseignez seulement ce qui vous est utile.</p>
        <Submit>Enregistrer</Submit>
      </form></Section>}
      {entries.length > 0 && <Section title="Évolution"><div className="space-y-3">{charts.filter(([k]) => series(k).length > 0).map(([k, label, unit, color]) => <div key={k} className="card"><div className="mb-1 text-sm font-bold">{label}</div><LineChart points={series(k)} unit={unit} color={color} /></div>)}</div></Section>}
      {entries.length > 0 && <form action={deleteDevEntries}><Submit className="btn-danger w-full" confirm="Supprimer définitivement toutes les entrées du carnet ?">Supprimer toutes les entrées du carnet</Submit></form>}
    </div>
  );
}
