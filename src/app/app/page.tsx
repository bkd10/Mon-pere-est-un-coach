import { FEATURES } from "@/lib/flags";
import Link from "next/link";
import { getActiveChild } from "@/lib/auth";
import { db } from "@/lib/db";
import { completeChallenge, quickSession } from "@/app/actions";
import { addDaysIso, dayDate, ensurePlan, entOf, frDate, isoOf, todayIso } from "@/lib/services";
import { ageFromBirth, badgeOf, bandForAge, categoryLabelFFF, DAILY_CHALLENGES, monthKey, WEEKLY_CHALLENGES, weekKey } from "@/content/taxonomy";
import { eqLabel } from "@/content/taxonomy";
import { Beginner, More, Notice, Ring, Section } from "@/components/ui";
import Submit from "@/components/Submit";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { user, child } = await getActiveChild();
  const sp = await searchParams;
  const ent = entOf(user);
  const { reasons } = await ensurePlan(child, ent);
  const today = todayIso();
  const age = ageFromBirth(child.birthDate);
  const band = bandForAge(age);
  const monthStart = dayDate(today.slice(0, 8) + "01");
  const [next, doneMonth, plannedMonth, lastDone, badges, guide, challenges, stars] = await Promise.all([
    db.plannedSession.findFirst({ where: { childId: child.id, status: "PLANNED", date: { gte: dayDate(today) } }, orderBy: { date: "asc" } }),
    db.plannedSession.count({ where: { childId: child.id, status: "DONE", date: { gte: monthStart } } }),
    db.plannedSession.count({ where: { childId: child.id, status: { in: ["DONE", "PLANNED"] }, date: { gte: monthStart, lte: dayDate(addDaysIso(today, 6)) } } }),
    db.plannedSession.findFirst({ where: { childId: child.id, status: "DONE" }, orderBy: { date: "desc" }, include: { feedback: true } }),
    db.badgeAward.findMany({ where: { childId: child.id }, orderBy: { awardedAt: "desc" }, take: 4 }),
    db.guide.findMany({ where: { published: true, ...(ent.allGuides ? {} : { isFree: true }), reads: { none: { userId: user.id } } }, orderBy: { createdAt: "asc" }, take: 1 }),
    db.challengeProgress.findMany({ where: { childId: child.id, periodKey: { in: [today, weekKey(new Date()), monthKey(new Date())] } } }),
    db.challengeProgress.aggregate({ where: { childId: child.id }, _sum: { stars: true } }),
  ]);
  const dayIdx = Math.floor(dayDate(today).getTime() / 86400000);
  const dailies = DAILY_CHALLENGES.filter((d) => d.minAge <= age);
  const daily = dailies[dayIdx % dailies.length];
  const weekly = WEEKLY_CHALLENGES[Math.floor(dayIdx / 7) % WEEKLY_CHALLENGES.length];
  const dailyDone = challenges.some((c) => c.challengeKey === daily.key && c.periodKey === today);
  const weeklyDone = challenges.some((c) => c.challengeKey === weekly.key);
  const isToday = next && isoOf(next.date) === today;
  const fb = lastDone?.feedback;
  const state = !child.healthConsentAt ? { icon: "🌱", label: "Forme et récupération", text: FEATURES.health ? "Suivi de la fatigue non activé. Vous pouvez l'activer dans le profil de votre enfant." : "Écoutez-le : fatigué ou douloureux, on reporte. Le repos fait progresser.", tone: "" } : !fb ? null : fb.pain ? { icon: "🩹", label: "Douleur signalée", text: "Exercices concernés suspendus. Consultez si elle persiste.", tone: "bg-coral-100" } : fb.energy === 1 ? { icon: "😴", label: "Très fatigué la dernière fois", text: "Priorité au repos : la suite est allégée.", tone: "bg-sun-100" } : fb.energy === 2 ? { icon: "🙂", label: "Un peu fatigué la dernière fois", text: "Séance suivante légèrement réduite.", tone: "bg-sun-100" } : { icon: "💪", label: "En forme la dernière fois", text: "On continue tranquillement, sans en rajouter.", tone: "bg-pitch-50" };
  const adapt = next?.explanation.slice(3) ?? [];
  const reco = adapt[0] ?? reasons[0] ?? (next ? next.explanation[1] : null);
  const tip = band.parentTips[dayIdx % band.parentTips.length];
  const hour = Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hour12: false, timeZone: "Europe/Paris" }).format(new Date()));

  return (
    <div>
      {sp.bienvenue && <Notice tone="ok"><b>Le programme de {child.nickname} est prêt.</b> Il tient compte de son âge, de ses objectifs et de sa semaine en club.</Notice>}
      {sp.defi && <Notice tone="ok">Défi validé : une étoile de plus ⭐</Notice>}
      {sp.reporte && <Notice>Séance mise de côté. Ce n'est jamais un échec : on jouera une autre fois.</Notice>}
      <div className="mb-4 flex items-center justify-between">
        <div><p className="muted">{hour < 18 ? "Bonjour" : "Bonsoir"} {user.firstName} 👋</p><h1 className="font-display text-2xl font-extrabold tracking-tight">Le foot de {child.nickname}</h1></div>
        <Link href="/app/enfant" className="flex items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-3 shadow-card"><span className="grid h-9 w-9 place-items-center rounded-full bg-pitch-100 text-xl">{child.avatar}</span><span className="text-sm font-bold leading-tight">{age} ans<span className="block text-[11px] font-semibold text-ink-500">{categoryLabelFFF(age)} · {band.label}</span></span></Link>
      </div>
      <Beginner show={user.beginnerMode}>Chaque jour, cette page vous dit quoi faire. S'il y a une séance, appuyez sur le bouton vert et laissez-vous guider. S'il n'y en a pas, c'est voulu : le repos fait progresser.</Beginner>

      <section className="mb-5 overflow-hidden rounded-xl2 bg-pitch-700 text-white shadow-card">
        {next ? (
          <div className="p-5">
            <div className="flex items-center justify-between text-sm font-bold text-white/80"><span>{isToday ? "Séance du jour" : `Prochaine séance · ${frDate(isoOf(next.date))}`}</span><span>{next.durationMin} min</span></div>
            <h2 className="mt-1 font-display text-2xl font-extrabold">{next.title}</h2>
            <p className="mt-1 text-sm text-white/85">{next.objective}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{(next.equipment.length ? next.equipment : ["ballon"]).map((e) => <span key={e} className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold">{eqLabel(e)}</span>)}</div>
            <Link href={`/app/seance/${next.id}`} className="btn-sun mt-4 w-full text-base">{isToday ? "Commencer ma séance" : "Voir la séance"}</Link>
            {!isToday && <p className="mt-2 text-center text-xs text-white/90">Aujourd'hui : repos ou jeu libre. C'est aussi comme ça qu'on progresse.</p>}
          </div>
        ) : (
          <div className="p-5">
            <div className="text-sm font-bold text-white/80">Cette semaine</div>
            <h2 className="mt-1 font-display text-2xl font-extrabold">Pas de séance prévue</h2>
            <p className="mt-1 text-sm text-white/85">{reasons[0] ?? "La semaine est bien remplie : profitez-en pour souffler ou jouer librement."}</p>
            <Link href="/app/entrainements" className="btn-sun mt-4 w-full">Voir les séances possibles</Link>
          </div>
        )}
      </section>

      {reco && <Section title="Le conseil du jour"><div className="card flex gap-3"><span className="text-2xl" aria-hidden>🧠</span><div><p className="text-sm text-ink-700">{reco}</p>{next && <Link href={`/app/seance/${next.id}#pourquoi`} className="mt-1 inline-block text-sm font-bold text-pitch-700">Pourquoi cette séance ? →</Link>}</div></div></Section>}

      <div className="mb-5 grid grid-cols-2 gap-3">
        <Link href="/app/progression" className="card flex items-center gap-3"><Ring value={doneMonth} max={Math.max(plannedMonth, doneMonth, 1)} label="ce mois" /><div><div className="text-sm font-bold">Séances réalisées</div><div className="muted">⭐ {stars._sum.stars ?? 0} étoiles</div></div></Link>
        <div className={`card ${state?.tone ?? ""}`}><div className="text-2xl" aria-hidden>{state?.icon ?? "🌱"}</div><div className="text-sm font-bold">{state?.label ?? "Forme et récupération"}</div><div className="muted">{state?.text ?? "Répondez au questionnaire après la première séance."}</div></div>
      </div>

      <Section title="Défi du jour · 5 minutes">
        <div className="card">
          <div className="font-bold">{daily.label}</div><p className="mt-0.5 text-sm text-ink-700">{daily.text}</p>
          {dailyDone ? <div className="mt-3 rounded-full bg-pitch-50 py-2 text-center text-sm font-bold text-pitch-800">Fait aujourd'hui ⭐</div> : <form action={completeChallenge} className="mt-3"><input type="hidden" name="key" value={daily.key} /><Submit className="btn-ghost btn-sm w-full">C'est fait !</Submit></form>}
          <p className="muted mt-2 text-center">Facultatif. Pas fait ? Aucune importance.</p>
        </div>
      </Section>

      <Section title="Défi de la semaine">
        <div className="card flex items-center gap-3"><span className="text-3xl" aria-hidden>🏅</span><div className="flex-1"><div className="font-bold">{weekly.label}</div><p className="text-sm text-ink-700">{weekly.text}</p></div>
          {weeklyDone ? <span className="chip bg-pitch-50 text-pitch-800">Tenté ⭐</span> : <form action={completeChallenge}><input type="hidden" name="key" value={weekly.key} /><Submit className="btn-ghost btn-sm">On l'a tenté</Submit></form>}
        </div>
      </Section>

      <Section title="Dernières réussites" action={<More href="/app/enfant" />}>
        {badges.length ? <div className="grid grid-cols-4 gap-2">{badges.map((b) => { const d = badgeOf(b.badgeKey); return <div key={b.id} className="card p-2 text-center"><div className="text-3xl">{d?.icon}</div><div className="mt-1 text-[11px] font-bold leading-tight">{d?.label}</div></div>; })}</div> : <div className="card muted">Le premier badge arrive dès la première séance terminée.</div>}
      </Section>

      <Section title="Conseil parent du jour" action={<More href="/app/guide" />}>
        <div className="card"><p className="font-semibold">« {tip} »</p>{guide[0] && <Link href={`/app/guide/${guide[0].slug}`} className="mt-3 flex items-center gap-3 rounded-2xl bg-ink-50 p-3"><span className="text-2xl" aria-hidden>🎓</span><span className="flex-1 text-sm"><span className="block font-bold">{guide[0].title}</span><span className="text-ink-500">{guide[0].readMin} min de lecture</span></span><span aria-hidden>›</span></Link>}</div>
      </Section>

      {ent.fullLibrary && <form action={quickSession} className="mb-5"><input type="hidden" name="format" value="courte" /><Submit className="btn-ghost w-full">⚡ J'ai 10 minutes maintenant</Submit></form>}
    </div>
  );
}
