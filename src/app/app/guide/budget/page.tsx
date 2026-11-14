import Link from "next/link";
import { getActiveChild } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveBudget } from "@/app/actions";
import { Notice, PageHead, Section } from "@/components/ui";
import Submit from "@/components/Submit";

export const metadata = { title: "Budget sportif" };
const FIELDS: [string, string, string][] = [["licence", "Licence et cotisation du club", "Le socle : encadrement, matchs, assurance."], ["stages", "Stages", "Vacances, perfectionnement."], ["coaching", "Coaching individuel", "Séances privées."], ["academies", "Académies privées", "Inscription à l'année."], ["materiel", "Matériel d'entraînement", "Ballons, plots, buts, accessoires."], ["equipements", "Équipements", "Chaussures, tenues, protège-tibias."], ["deplacements", "Déplacements", "Carburant, péages, transports."]];
const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { user } = await getActiveChild();
  const sp = await searchParams;
  const now = new Date(); const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1; const season = `${y}-${y + 1}`;
  const entry = await db.budgetEntry.findUnique({ where: { userId_season: { userId: user.id, season } } });
  const a = (entry?.amounts ?? {}) as Record<string, number>;
  const total = FIELDS.reduce((s, [k]) => s + (a[k] ?? 0), 0);
  const nKids = Math.max(1, user.children.length);
  const pct = (k: string) => (total ? Math.round(((a[k] ?? 0) / total) * 100) : 0);
  const tips: string[] = [];
  if ((a.coaching ?? 0) > 0) tips.push(`Coaching individuel : ${eur(a.coaching)} par saison. Avant de renouveler, vérifiez trois points : la demande vient-elle de votre enfant ? l'intervenant est-il diplômé ? un objectif précis a-t-il été fixé ? Huit semaines de séances à la maison permettent souvent de trancher.`);
  if ((a.academies ?? 0) > 0) tips.push(`Académie privée : ${eur(a.academies)}. Aucune académie ne peut garantir un résultat ou une détection. Comparez avec ce qu'apporte déjà le club, et demandez ce qui est précisément inclus.`);
  if ((a.stages ?? 0) > 400) tips.push("Stages : au-delà d'un ou deux par an, l'apport sportif supplémentaire est faible. Un stage est d'abord une bonne semaine de vacances : choisissez-le sur l'envie de votre enfant et le taux d'encadrement.");
  if ((a.equipements ?? 0) > 200 * nKids) tips.push("Équipements : les pieds grandissent vite. Chaussures de milieu de gamme, bourses aux équipements des clubs et dons entre familles réduisent facilement ce poste de moitié.");
  if ((a.materiel ?? 0) > 80) tips.push("Matériel : plots, cibles, échelle de rythme et mini-buts se fabriquent avec des bouteilles, de la craie et deux sacs. Un bon ballon à la bonne taille est le seul achat vraiment utile.");
  if ((a.deplacements ?? 0) > 300) tips.push("Déplacements : le covoiturage entre parents du club est l'économie la plus simple — et les enfants adorent faire la route ensemble.");
  const extras = (a.coaching ?? 0) + (a.academies ?? 0) + (a.stages ?? 0);
  if (total > 0 && extras / total > 0.5) tips.unshift(`Plus de la moitié du budget (${Math.round((extras / total) * 100)} %) part dans des prestations en plus du club. Ce n'est ni bien ni mal : posez-vous simplement la question de ce que chacune apporte réellement.`);
  if (total > 0 && tips.length === 0) tips.push("Votre budget est concentré sur l'essentiel : le club et l'équipement de base. Rien à signaler.");
  return (
    <div>
      <PageHead title="Calculateur de budget sportif" sub={`Saison ${season} · pour toute la famille`} back="/app/guide" />
      {sp.ok && <Notice tone="ok">Budget enregistré.</Notice>}
      <form action={saveBudget} className="card mb-4 space-y-3">
        {FIELDS.map(([k, l, h]) => <div key={k}><label className="label" htmlFor={k}>{l}</label><div className="relative"><input id={k} name={k} type="number" inputMode="numeric" min="0" step="1" defaultValue={a[k] || ""} placeholder="0" className="input pr-10" /><span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-ink-500">€</span></div><p className="muted mt-0.5">{h}</p></div>)}
        <Submit>Calculer ma synthèse</Submit>
      </form>
      {total > 0 && <>
        <Section title="Synthèse de la saison"><div className="card">
          <div className="flex items-end justify-between"><div><div className="font-display text-3xl font-extrabold">{eur(total)}</div><div className="muted">sur la saison</div></div><div className="text-right"><div className="font-display text-xl font-extrabold">{eur(Math.round(total / 12))}</div><div className="muted">par mois{nKids > 1 ? ` · ${eur(Math.round(total / nKids))} par enfant` : ""}</div></div></div>
          <div className="mt-4 space-y-2">{FIELDS.filter(([k]) => (a[k] ?? 0) > 0).sort((x, y) => (a[y[0]] ?? 0) - (a[x[0]] ?? 0)).map(([k, l]) => <div key={k}><div className="flex justify-between text-sm font-bold"><span>{l}</span><span>{eur(a[k])} · {pct(k)} %</span></div><div className="h-2 rounded-full bg-ink-100"><div className={`h-2 rounded-full ${["coaching", "academies", "stages"].includes(k) ? "bg-sun-500" : "bg-pitch-500"}`} style={{ width: `${pct(k)}%` }} /></div></div>)}</div>
        </div></Section>
        <Section title="Pistes d'économie"><ul className="space-y-2">{tips.map((t) => <li key={t} className="card flex gap-3 text-sm text-ink-700"><span aria-hidden>💡</span>{t}</li>)}</ul><p className="muted mt-2 px-1">Ces pistes sont indicatives. Un programme à la maison complète le club ; il ne remplace ni un club, ni un éducateur qualifié, ni une prise en charge spécialisée.</p></Section>
      </>}
      <Section title="Pour aller plus loin"><div className="grid grid-cols-1 gap-2">{[["eviter-les-depenses-inutiles", "Éviter les dépenses inutiles"], ["fabriquer-son-materiel", "Fabriquer son matériel"], ["coach-individuel-utile-ou-pas", "Coaching individuel : quand est-ce pertinent ?"], ["stages-et-academies", "Stages et académies : évaluer une offre"], ["ressources-gratuites", "Les ressources gratuites"]].map(([s, l]) => <Link key={s} href={`/app/guide/${s}`} className="card py-3 text-sm font-bold">📄 {l} →</Link>)}</div></Section>
    </div>
  );
}
