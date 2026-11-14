import Link from "next/link";
import { getActiveChild } from "@/lib/auth";
import { db } from "@/lib/db";
import { addEvent, deleteEvent, moveSession } from "@/app/actions";
import { addDaysIso, dayDate, ensurePlan, entOf, frDate, isoOf, todayIso } from "@/lib/services";
import { allowedHomeSessions, rulesFromDefaults } from "@/lib/engine";
import { getRules, historyOf, profileOf } from "@/lib/services";
import { Beginner, Notice, PageHead, Section, Upsell } from "@/components/ui";
import Submit from "@/components/Submit";

export const metadata = { title: "Calendrier" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { user, child } = await getActiveChild();
  const sp = await searchParams;
  const ent = entOf(user);
  if (!ent.calendar) return <div><PageHead title="Calendrier intelligent" /><Upsell title="Le calendrier intelligent" text="Séances, jours de repos, matchs et vacances sur une même vue. Déplacez une séance : le programme se réorganise en respectant la récupération. Inclus dans l'abonnement Famille." /></div>;
  await ensurePlan(child, ent);
  const today = todayIso();
  const month = /^\d{4}-\d{2}$/.test(sp.mois ?? "") ? sp.mois! : today.slice(0, 7);
  const first = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const daysIn = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const last = `${month}-${String(daysIn).padStart(2, "0")}`;
  const [sessions, events, reports, rules] = await Promise.all([
    db.plannedSession.findMany({ where: { childId: child.id, date: { gte: dayDate(first), lte: dayDate(last) } }, orderBy: { date: "asc" } }),
    db.calendarEvent.findMany({ where: { childId: child.id, date: { lte: dayDate(last) }, OR: [{ endDate: null, date: { gte: dayDate(first) } }, { endDate: { gte: dayDate(first) } }] }, orderBy: { date: "asc" } }),
    db.report.findMany({ where: { childId: child.id, kind: "mensuel", periodKey: month } }),
    getRules().catch(() => rulesFromDefaults()),
  ]);
  const allowed = allowedHomeSessions(profileOf(child), await historyOf(child, ent), rules);
  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysIn }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  const prev = isoOf(new Date(Date.UTC(y, m - 2, 1))).slice(0, 7), next = isoOf(new Date(Date.UTC(y, m, 1))).slice(0, 7);
  const info = (iso: string) => {
    const dow = dayDate(iso).getUTCDay();
    const s = sessions.find((x) => isoOf(x.date) === iso && x.status !== "SKIPPED");
    const ev = events.find((e) => isoOf(e.date) <= iso && (e.endDate ? isoOf(e.endDate) : isoOf(e.date)) >= iso);
    if (s?.status === "DONE") return { c: "bg-pitch-600 text-white", i: "✓", t: "Séance réalisée", s };
    if (s) return { c: "bg-sun-400 text-ink-900", i: "⚽", t: "Séance prévue", s };
    if (ev) return { c: ev.type === "VACATION" ? "bg-sky-100 text-sky-600" : ev.type === "MATCH" ? "bg-coral-100 text-coral-600" : "bg-ink-100 text-ink-700", i: ev.type === "VACATION" ? "🏖" : ev.type === "MATCH" ? "🏆" : ev.type === "REST" ? "😴" : "🏟", t: ev.label ?? "" };
    if (child.matchDay === dow) return { c: "bg-coral-100 text-coral-600", i: "🏆", t: "Match" };
    if (child.clubDays.includes(dow)) return { c: "bg-ink-100 text-ink-700", i: "🏟", t: "Club" };
    return { c: "bg-white text-ink-500", i: "", t: "Repos" };
  };
  const upcoming = sessions.filter((s) => s.status === "PLANNED" && isoOf(s.date) >= today);
  const done = sessions.filter((s) => s.status === "DONE").length;
  return (
    <div>
      <PageHead title="Calendrier" sub={`${child.nickname} · ${new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(dayDate(first))}`} />
      {sp.ok && <Notice tone="ok">Calendrier mis à jour. Les séances ont été réorganisées autour de ce nouvel évènement.</Notice>}
      {sp.deplace && <Notice tone="ok">Séance déplacée.</Notice>}
      {sp.ajuste && <Notice>🧠 {sp.ajuste}</Notice>}
      {sp.e && <Notice tone="warn">{sp.e}</Notice>}
      <Beginner show={user.beginnerMode}>Jaune : une séance est prévue. Vert : elle est faite. Les jours blancs sont des jours de repos — ils sont voulus. Ajoutez vos matchs et vos vacances : le programme s'organise autour.</Beginner>
      <div className="card mb-4">
        <div className="mb-3 flex items-center justify-between"><Link href={`/app/calendrier?mois=${prev}`} className="btn-ghost btn-sm" aria-label="Mois précédent">←</Link><span className="font-display font-extrabold capitalize">{new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(dayDate(first))}</span><Link href={`/app/calendrier?mois=${next}`} className="btn-ghost btn-sm" aria-label="Mois suivant">→</Link></div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-ink-500">{["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <div key={i}>{d}</div>)}</div>
        <div className="mt-1 grid grid-cols-7 gap-1">{cells.map((iso, i) => { if (!iso) return <div key={i} />; const x = info(iso); const inner = <><span className="text-[11px] font-bold leading-none">{Number(iso.slice(8))}</span><span className="text-sm leading-none">{x.i}</span></>; const cls = `flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl ${x.c} ${iso === today ? "ring-2 ring-ink-900" : ""}`; return x.s ? <Link key={i} href={x.s.status === "DONE" ? `/app/seance/${x.s.id}/bilan` : `/app/seance/${x.s.id}`} className={cls} title={x.t}>{inner}</Link> : <div key={i} className={cls} title={x.t}>{inner}</div>; })}</div>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-ink-500"><span>⚽ prévue</span><span>✓ réalisée</span><span>🏟 club</span><span>🏆 match</span><span>🏖 vacances</span><span>😴 repos</span></div>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2"><div className="card p-3"><div className="font-display text-2xl font-extrabold">{done}</div><div className="text-xs font-bold text-ink-500">séance{done > 1 ? "s" : ""} réalisée{done > 1 ? "s" : ""} ce mois</div></div><div className="card p-3"><div className="font-display text-2xl font-extrabold">{allowed.count}</div><div className="text-xs font-bold text-ink-500">séance{allowed.count > 1 ? "s" : ""} maison conseillée{allowed.count > 1 ? "s" : ""} par semaine</div></div></div>
      {allowed.reasons.length > 0 && <Notice>🧠 {allowed.reasons.join(" ")}</Notice>}
      <Section title="Séances à venir">{upcoming.length === 0 ? <div className="card muted">Aucune séance à venir ce mois-ci.</div> : <ul className="space-y-2">{upcoming.map((s) => <li key={s.id} className="card"><Link href={`/app/seance/${s.id}`} className="font-bold">{s.title}</Link><div className="muted">{frDate(isoOf(s.date))} · {s.durationMin} min</div><form action={moveSession} className="mt-2 flex gap-2"><input type="hidden" name="sessionId" value={s.id} /><input type="date" name="date" min={today} max={addDaysIso(today, 30)} defaultValue={isoOf(s.date)} className="input py-2" aria-label="Nouvelle date" required /><Submit className="btn-ghost btn-sm shrink-0">Déplacer</Submit></form></li>)}</ul>}</Section>
      <Section title="Ajouter un match, des vacances, un repos"><form action={addEvent} className="card space-y-3">
        <select name="type" className="input" aria-label="Type" defaultValue="MATCH"><option value="MATCH">🏆 Match ou tournoi</option><option value="VACATION">🏖 Vacances (sans séance)</option><option value="REST">😴 Jour de repos</option><option value="CLUB_TRAINING">🏟 Entraînement en club exceptionnel</option></select>
        <div className="grid grid-cols-2 gap-2"><div><label className="label" htmlFor="d1">Du</label><input id="d1" type="date" name="date" min={today} required className="input" /></div><div><label className="label" htmlFor="d2">Au (facultatif)</label><input id="d2" type="date" name="endDate" min={today} className="input" /></div></div>
        <input name="label" maxLength={60} className="input" placeholder="Libellé (facultatif)" aria-label="Libellé" />
        <Submit>Ajouter au calendrier</Submit>
      </form></Section>
      {events.length > 0 && <Section title="Évènements du mois"><ul className="space-y-2">{events.map((e) => <li key={e.id} className="card flex items-center justify-between"><span><b>{e.label ?? (e.type === "MATCH" ? "Match" : e.type === "VACATION" ? "Vacances" : e.type === "REST" ? "Repos" : "Club")}</b><span className="muted block">{frDate(isoOf(e.date), { day: "numeric", month: "long" })}{e.endDate ? ` → ${frDate(isoOf(e.endDate), { day: "numeric", month: "long" })}` : ""}</span></span><form action={deleteEvent}><input type="hidden" name="id" value={e.id} /><button className="text-sm font-bold text-coral-600">Retirer</button></form></li>)}</ul></Section>}
      <Section title="Bilan du mois"><div className="card flex items-center justify-between"><span className="text-sm">{reports.length ? "Le bilan de ce mois est disponible." : "Générez le bilan quand vous voulez."}</span><Link href={`/app/bilans?mois=${month}`} className="btn-ghost btn-sm">Voir</Link></div></Section>
    </div>
  );
}
