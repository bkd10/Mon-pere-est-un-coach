import Link from "next/link";
import { getActiveChild } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateReport } from "@/app/actions";
import { entOf, type ReportFacts } from "@/lib/services";
import { monthKey } from "@/content/taxonomy";
import { Notice, PageHead, Rich, Section, Upsell } from "@/components/ui";
import Submit from "@/components/Submit";
import PrintButton from "@/components/PrintButton";

export const metadata = { title: "Bilans" };
export default async function Page({ searchParams }: { searchParams: Promise<{ p?: string; mois?: string; e?: string }> }) {
  const { user, child } = await getActiveChild();
  const sp = await searchParams;
  const ent = entOf(user);
  const reports = await db.report.findMany({ where: { childId: child.id }, orderBy: { createdAt: "desc" } });
  const [kind, key] = (sp.p ?? "").split(":");
  const current = reports.find((r) => r.kind === kind && r.periodKey === key) ?? reports.find((r) => r.kind === "mensuel" && r.periodKey === sp.mois) ?? reports[0];
  const f = current?.facts as ReportFacts | undefined;
  const months = Array.from({ length: 4 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); return monthKey(d); });
  const mLabel = (k: string) => new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(k + "-15"));
  const Stat = ({ v, l }: { v: string | number; l: string }) => <div className="rounded-2xl bg-ink-50 p-3 text-center"><div className="font-display text-2xl font-extrabold">{v}</div><div className="text-[11px] font-bold text-ink-500">{l}</div></div>;
  return (
    <div>
      <PageHead title="Bilans" sub={`Ce que ${child.nickname} a fait, mesuré et ressenti. Rien d'inventé.`} back="/app/progression" />
      {sp.e && <Notice tone="warn">{sp.e}</Notice>}
      <Section title="Générer un bilan"><div className="card space-y-3 print:hidden">
        <form action={generateReport} className="flex gap-2"><input type="hidden" name="kind" value="mensuel" /><select name="period" className="input capitalize" aria-label="Mois" defaultValue={sp.mois ?? months[0]}>{months.map((m) => <option key={m} value={m}>{mLabel(m)}</option>)}</select><Submit className="btn-primary shrink-0" pendingText="Rédaction…">Bilan du mois</Submit></form>
        {ent.aiReports ? <form action={generateReport}><input type="hidden" name="kind" value="saison" /><Submit className="btn-ghost w-full" pendingText="Rédaction…">📘 Bilan de fin de saison</Submit></form> : <p className="muted">Le bilan de fin de saison et la rédaction personnalisée par le coach IA font partie de l'offre Premium.</p>}
      </div></Section>
      {current && f ? (
        <article className="card mb-5">
          <div className="flex items-start justify-between gap-2"><div><div className="text-xs font-bold uppercase tracking-wide text-pitch-700">{current.kind === "saison" ? "Bilan de fin de saison" : "Bilan mensuel"}</div><h2 className="font-display text-2xl font-extrabold capitalize">{f.nickname} · {f.period}</h2></div><PrintButton /></div>
          <div className="my-4 grid grid-cols-4 gap-2"><Stat v={f.sessionsDone} l="séances" /><Stat v={f.minutes} l="minutes" /><Stat v={f.challengesTried} l="défis tentés" /><Stat v={f.badges.length} l="badges" /></div>
          <Rich text={current.narrative} />
          {f.metrics.length > 0 && <div className="mt-2"><div className="mb-1 text-sm font-bold">Mesures de la période</div><table className="w-full text-sm"><thead><tr className="text-left text-xs text-ink-500"><th className="py-1">Indicateur</th><th>Début</th><th>Fin</th><th>Mesures</th></tr></thead><tbody>{f.metrics.map((m) => <tr key={m.label} className="border-t border-ink-100"><td className="py-1.5 font-semibold">{m.label}</td><td>{m.first} {m.unit}</td><td className={m.improved ? "font-bold text-pitch-700" : ""}>{m.last} {m.unit}</td><td>{m.count}</td></tr>)}</tbody></table></div>}
          {f.categories.length > 0 && <div className="mt-4"><div className="mb-1 text-sm font-bold">Compétences travaillées</div><div className="flex flex-wrap gap-1.5">{f.categories.map((c) => <span key={c.label} className="chip">{c.label} · {c.count}</span>)}</div></div>}
          <p className="muted mt-4">{current.generatedBy === "ia" ? "Rédigé par le coach IA à partir des seules données enregistrées." : "Rédigé automatiquement à partir des seules données enregistrées."} Généré le {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(current.createdAt)}. Ce bilan n'est ni une évaluation de potentiel ni un avis médical.</p>
        </article>
      ) : <div className="card muted mb-5">Aucun bilan pour l'instant. Générez le premier ci-dessus : il résume les séances, les mesures et le ressenti du mois.</div>}
      {!ent.aiReports && <div className="mb-5"><Upsell title="Des bilans rédigés sur mesure" text="Avec Premium, le coach IA rédige chaque bilan dans un langage naturel, toujours à partir des faits mesurés, et prépare le bilan de fin de saison." /></div>}
      {reports.length > 1 && <Section title="Historique"><ul className="space-y-2 print:hidden">{reports.map((r) => <li key={r.id}><Link href={`/app/bilans?p=${r.kind}:${r.periodKey}`} className="card flex justify-between py-3 text-sm font-bold"><span className="capitalize">{r.kind === "saison" ? `Saison ${r.periodKey}` : mLabel(r.periodKey)}</span><span aria-hidden>›</span></Link></li>)}</ul></Section>}
    </div>
  );
}
