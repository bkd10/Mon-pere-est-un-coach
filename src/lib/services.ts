// Couche service : relie la base de données au moteur de personnalisation.
import type { Child, Exercise, Prisma } from "@prisma/client";
import { db } from "./db";
import { entitlements, type Entitlements } from "./plans";
import { buildSession, DEFAULT_RULES, planWeek, type Feedback, type History, type LibExercise, type Profile, type RuleSet } from "./engine";
import { ageFromBirth, BADGES, bandForAge, catLabel, EVALUATIONS, metricOf, monthKey, weekKey } from "@/content/taxonomy";
import { decryptJson } from "./crypto";

export function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}
export const dayDate = (iso: string) => new Date(iso + "T00:00:00Z");
export const isoOf = (d: Date) => d.toISOString().slice(0, 10);
export const addDaysIso = (iso: string, n: number) => { const d = dayDate(iso); d.setUTCDate(d.getUTCDate() + n); return isoOf(d); };
export const frDate = (iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) => new Intl.DateTimeFormat("fr-FR", { ...opts, timeZone: "UTC" }).format(dayDate(iso));

export async function getRules(): Promise<RuleSet> {
  const rows = await db.aiRule.findMany();
  const set: RuleSet = {};
  for (const d of DEFAULT_RULES) {
    const r = rows.find((x) => x.key === d.key);
    set[d.key] = { enabled: d.locked ? true : r?.enabled ?? true, params: { ...(d.params as Record<string, number>), ...((r?.params as Record<string, number>) ?? {}) } };
  }
  return set;
}

export const toLib = (e: Exercise): LibExercise => ({ slug: e.slug, name: e.name, category: e.category, ageMin: e.ageMin, ageMax: e.ageMax, level: e.level, difficulty: e.difficulty, durationMin: e.durationMin, equipment: e.equipment, space: e.space, indoorOk: e.indoorOk, parentRole: e.parentRole, intensity: e.intensity, bodyAreas: e.bodyAreas, recoverySec: e.recoverySec, metricKey: e.metricKey, isFree: e.isFree, family: e.familySlug ?? e.slug, isBase: !e.variantLabel });
export async function getLibrary() {
  return (await db.exercise.findMany({ where: { published: true } })).map(toLib);
}

export function profileOf(child: Child): Profile {
  return {
    age: ageFromBirth(child.birthDate), level: child.level, goals: child.goals, minutesAvailable: child.minutesAvailable, homeSessionsPerWeek: child.homeSessionsPerWeek,
    clubTrainingsPerWeek: child.clubTrainingsPerWeek, clubDays: child.clubDays, matchDay: child.matchDay, equipment: child.equipment, places: child.places,
    modes: (child.modes as Profile["modes"]) ?? {},
  };
}

export async function historyOf(child: Child, ent: Entitlements): Promise<History> {
  const done = await db.plannedSession.findMany({ where: { childId: child.id, status: "DONE" }, orderBy: { date: "desc" }, take: 8, include: { feedback: true } });
  const feedback: Feedback[] = done.filter((s) => s.feedback).map((s) => {
    const f = s.feedback!;
    const main = (s.blocks as { phase: string; exerciseSlug?: string }[]).find((b) => b.phase === "technique")?.exerciseSlug;
    return { date: isoOf(s.date), enjoyment: f.enjoyment, energy: f.energy ?? 3 /* non renseigné (pas de consentement santé) : aucune adaptation liée à la fatigue */, motivation: f.motivation, difficulty: f.difficulty, pain: f.pain, painArea: f.painArea, wantedMore: f.wantedMore, confidence: f.confidence, dislikedSlug: f.dislikedSlug, likedSlug: f.likedSlug, mainCategory: main ? undefined : undefined, _main: main } as Feedback & { _main?: string };
  });
  const slugs = [...new Set(done.flatMap((s) => (s.blocks as { exerciseSlug?: string }[]).map((b) => b.exerciseSlug).filter(Boolean) as string[]))];
  if (feedback.length) {
    const mains = feedback.map((f) => (f as Feedback & { _main?: string })._main).filter(Boolean) as string[];
    const ex = await db.exercise.findMany({ where: { slug: { in: mains } }, select: { slug: true, category: true } });
    for (const f of feedback) f.mainCategory = ex.find((e) => e.slug === (f as Feedback & { _main?: string })._main)?.category;
  }
  const doneCount = await db.plannedSession.count({ where: { childId: child.id, status: "DONE" } });
  const dev = await db.developmentEntry.findFirst({ where: { childId: child.id, date: { gte: dayDate(addDaysIso(todayIso(), -2)) } }, orderBy: { date: "desc" } });
  const sleep = dev ? decryptJson<{ sleepH?: number }>(dev.payload)?.sleepH ?? null : null;
  return { feedback, recentSlugs: slugs, doneCount, lastSleepH: sleep, freeOnly: !ent.fullLibrary, fineAdaptation: ent.fineAdaptation };
}

async function blockedDays(childId: string, fromIso: string, toIso: string): Promise<Record<string, string>> {
  const events = await db.calendarEvent.findMany({ where: { childId, date: { lte: dayDate(toIso) }, OR: [{ endDate: null, date: { gte: dayDate(addDaysIso(fromIso, -1)) } }, { endDate: { gte: dayDate(fromIso) } }] } });
  const out: Record<string, string> = {};
  for (const e of events) {
    const start = isoOf(e.date), end = e.endDate ? isoOf(e.endDate) : start;
    for (let d = start; d <= end; d = addDaysIso(d, 1)) {
      out[d] = e.type === "VACATION" ? "Vacances : on profite !" : e.type === "MATCH" ? "Jour de match." : e.type === "CLUB_TRAINING" ? "Entraînement en club." : "Jour de repos choisi.";
    }
    if (e.type === "MATCH") out[addDaysIso(start, 1)] ??= "Lendemain de match : le corps récupère.";
  }
  return out;
}

const sessionData = (childId: string, iso: string, plan: ReturnType<typeof buildSession>): Prisma.PlannedSessionUncheckedCreateInput => ({
  childId, date: dayDate(iso), format: plan.format, title: plan.title, objective: plan.objective, durationMin: plan.durationMin,
  blocks: plan.blocks as unknown as Prisma.InputJsonValue, parentTips: plan.parentTips, equipment: plan.equipment, explanation: plan.explanation, rulesApplied: plan.rulesApplied,
});

// Garantit qu'un programme existe pour les 7 prochains jours. Ne crée jamais plus que ce que les règles autorisent.
export async function ensurePlan(child: Child, ent: Entitlements): Promise<{ reasons: string[] }> {
  const today = todayIso();
  const end = addDaysIso(today, 6);
  const existing = await db.plannedSession.findMany({ where: { childId: child.id, date: { gte: dayDate(today), lte: dayDate(end) }, status: { in: ["PLANNED", "DONE"] } } });
  const lastPlan = await db.plannedSession.findFirst({ where: { childId: child.id }, orderBy: { createdAt: "desc" } });
  // On ne replanifie qu'une fois par jour au plus, et seulement s'il manque des séances.
  if (lastPlan && isoOf(lastPlan.createdAt) === today && existing.length > 0) return { reasons: [] };
  const [rules, lib, history, blocked] = await Promise.all([getRules(), getLibrary(), historyOf(child, ent), blockedDays(child.id, today, end)]);
  const profile = profileOf(child);
  if (ent.sessionsPerWeek < profile.homeSessionsPerWeek) profile.homeSessionsPerWeek = ent.sessionsPerWeek;
  const recentDone = await db.plannedSession.count({ where: { childId: child.id, status: "DONE", date: { gte: dayDate(addDaysIso(today, -6)), lt: dayDate(today) } } });
  if (!ent.fullLibrary && recentDone >= ent.sessionsPerWeek && existing.length === 0) return { reasons: ["L'offre Découverte comprend une séance guidée par semaine. La prochaine sera disponible dans quelques jours."] };
  const taken = existing.map((s) => isoOf(s.date));
  const yesterday = await db.plannedSession.findFirst({ where: { childId: child.id, date: dayDate(addDaysIso(today, -1)), status: "DONE" } });
  if (yesterday) blocked[today] ??= "Séance réalisée hier : un jour de récupération.";
  const { days, reasons } = planWeek(profile, history, rules, today, blocked, taken);
  let h = { ...history, recentSlugs: [...history.recentSlugs] };
  for (const d of days.filter((x) => x.kind === "session")) {
    const plan = buildSession(profile, lib, h, rules, d.date);
    await db.plannedSession.create({ data: sessionData(child.id, d.date, plan) });
    h = { ...h, recentSlugs: [...(plan.blocks.map((b) => b.exerciseSlug).filter(Boolean) as string[]), ...h.recentSlugs], doneCount: h.doneCount + 1 };
  }
  return { reasons };
}

// Après un retour parent : les séances à venir sont reconstruites avec le nouvel historique.
export async function regenerateFuture(child: Child, ent: Entitlements) {
  const today = todayIso();
  const future = await db.plannedSession.findMany({ where: { childId: child.id, status: "PLANNED", date: { gte: dayDate(today) } }, orderBy: { date: "asc" } });
  if (!future.length) return;
  const [rules, lib, history] = await Promise.all([getRules(), getLibrary(), historyOf(child, ent)]);
  const profile = profileOf(child);
  let h = { ...history };
  for (const [i, s] of future.entries()) {
    // Les ajustements liés au dernier retour ne s'appliquent qu'à la prochaine séance ; la douleur reste active pendant toute sa durée.
    const hist = i === 0 ? h : { ...h, feedback: h.feedback.filter((f) => f.pain) };
    const plan = buildSession(profile, lib, hist, rules, isoOf(s.date));
    const { childId: _c, date: _d, ...data } = sessionData(child.id, isoOf(s.date), plan);
    await db.plannedSession.update({ where: { id: s.id }, data });
    h = { ...h, recentSlugs: [...(plan.blocks.map((b) => b.exerciseSlug).filter(Boolean) as string[]), ...h.recentSlugs], doneCount: h.doneCount + 1 };
  }
}

export async function notify(userId: string, kind: string, title: string, body: string, href?: string) {
  const u = await db.user.findUnique({ where: { id: userId }, select: { notifPrefs: true } });
  const prefs = (u?.notifPrefs ?? {}) as Record<string, unknown>;
  if (prefs.frequency === "aucune" || prefs[kind] === false) return;
  if (prefs.frequency === "minimale" && !["report", "rest"].includes(kind)) return;
  await db.notification.create({ data: { userId, kind, title, body, href } });
}

// Attribution des badges : effort, régularité, créativité, progression.
export async function awardBadges(child: Child): Promise<string[]> {
  const [done, have, measures, miles, challenges] = await Promise.all([
    db.plannedSession.findMany({ where: { childId: child.id, status: "DONE" }, include: { feedback: true }, orderBy: { date: "asc" } }),
    db.badgeAward.findMany({ where: { childId: child.id } }),
    db.measurement.findMany({ where: { childId: child.id }, orderBy: { date: "asc" } }),
    db.milestone.count({ where: { childId: child.id } }),
    db.challengeProgress.findMany({ where: { childId: child.id } }),
  ]);
  const owned = new Set(have.map((b) => b.badgeKey));
  const earn: string[] = [];
  const give = (k: string, cond: boolean) => { if (cond && !owned.has(k) && BADGES.some((b) => b.key === k)) earn.push(k); };
  const n = done.length;
  give("premier-entrainement", n >= 1); give("5-seances", n >= 5); give("10-seances", n >= 10); give("25-seances", n >= 25); give("50-seances", n >= 50);
  const slugs = done.flatMap((s) => (s.blocks as { exerciseSlug?: string }[]).map((b) => b.exerciseSlug).filter(Boolean) as string[]);
  const exs = await db.exercise.findMany({ where: { slug: { in: [...new Set(slugs)] } }, select: { slug: true, category: true, parentRole: true } });
  give("explorateur", new Set(exs.map((e) => e.category)).size >= 8);
  give("esprit-equipe", slugs.filter((s) => exs.find((e) => e.slug === s)?.category === "parent-enfant").length >= 5);
  give("createur", slugs.some((s) => exs.find((e) => e.slug === s)?.category === "creativite"));
  // Persévérance : a refait une séance après en avoir trouvé une difficile.
  const hardIdx = done.findIndex((s) => s.feedback?.difficulty === "difficile");
  give("perseverance", hardIdx >= 0 && hardIdx < done.length - 1);
  const byMetric = (m: string) => measures.filter((x) => x.metric === m);
  const jong = byMetric("jongles");
  let records = 0, best = -1;
  for (const j of jong) if (j.value > best) { if (best >= 0) records++; best = j.value; }
  give("roi-jonglage", records >= 3);
  const improved = (m: string) => { const a = byMetric(m); return a.length >= 2 && a[a.length - 1].value > a[0].value; };
  give("champion-precision", improved("passes") || improved("frappes"));
  const mk = monthKey(new Date());
  give("progression-mois", measures.some((x) => monthKey(x.date) === mk && (() => { const prev = measures.filter((y) => y.metric === x.metric && y.date < x.date); const lower = metricOf(x.metric)?.kind === "time"; return prev.length > 0 && (lower ? x.value < prev[prev.length - 1].value : x.value > prev[prev.length - 1].value); })()));
  give("premier-souvenir", miles >= 1);
  give("defi-semaine", challenges.some((c) => c.challengeKey.startsWith("w-")));
  give("deux-pieds", challenges.filter((c) => c.challengeKey === "d-pied-faible").length >= 5);
  give("bien-repose", challenges.some((c) => c.challengeKey === "d-repos") || done.some((s, i) => s.feedback?.energy === 1 && done[i + 1] && (done[i + 1].date.getTime() - s.date.getTime()) / 86400000 >= 2));
  const weeks = new Set(done.map((s) => weekKey(s.date)));
  const now = new Date();
  give("regulier-4", [0, 1, 2, 3].every((i) => weeks.has(weekKey(new Date(now.getTime() - i * 7 * 86400000)))));
  for (const k of earn) await db.badgeAward.create({ data: { childId: child.id, badgeKey: k } }).catch(() => {});
  return earn;
}

// ───── Bilans : uniquement des faits mesurés. Aucun progrès n'est inventé. ─────
export type ReportFacts = {
  nickname: string; age: number; period: string; sessionsDone: number; sessionsSkipped: number; minutes: number;
  categories: { label: string; count: number }[]; favorites: string[]; disliked: string[]; difficultSessions: number;
  motivationAvg: number | null; enjoymentAvg: number | null; fatigueSessions: number; painReported: boolean;
  metrics: { label: string; unit: string; first: number; last: number; count: number; improved: boolean | null }[];
  badges: string[]; challengesTried: number; evaluationsDone: number;
};

export async function buildFacts(child: Child, fromIso: string, toIso: string, label: string): Promise<ReportFacts> {
  const range = { gte: dayDate(fromIso), lte: dayDate(toIso) };
  const end = new Date(dayDate(toIso).getTime() + 86400000);
  const [sessions, measures, badges, challenges] = await Promise.all([
    db.plannedSession.findMany({ where: { childId: child.id, date: range }, include: { feedback: true } }),
    db.measurement.findMany({ where: { childId: child.id, date: { gte: dayDate(fromIso), lt: end } }, orderBy: { date: "asc" } }),
    db.badgeAward.findMany({ where: { childId: child.id, awardedAt: { gte: dayDate(fromIso), lt: end } } }),
    db.challengeProgress.findMany({ where: { childId: child.id, createdAt: { gte: dayDate(fromIso), lt: end } } }),
  ]);
  const done = sessions.filter((s) => s.status === "DONE");
  const slugs = done.flatMap((s) => (s.blocks as { exerciseSlug?: string; phase: string }[]).filter((b) => b.phase === "technique" || b.phase === "defi").map((b) => b.exerciseSlug).filter(Boolean) as string[]);
  const exs = await db.exercise.findMany({ where: { slug: { in: [...new Set([...slugs, ...done.flatMap((s) => [s.feedback?.likedSlug, s.feedback?.dislikedSlug].filter(Boolean) as string[])])] } }, select: { slug: true, name: true, category: true } });
  const cat: Record<string, number> = {};
  for (const s of slugs) { const c = exs.find((e) => e.slug === s)?.category; if (c) cat[c] = (cat[c] ?? 0) + 1; }
  const fbs = done.map((s) => s.feedback).filter(Boolean) as NonNullable<(typeof done)[number]["feedback"]>[];
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
  const names = (keys: (string | null | undefined)[]) => [...new Set(keys.filter(Boolean).map((k) => exs.find((e) => e.slug === k)?.name).filter(Boolean) as string[])];
  const metricKeys = [...new Set(measures.map((m) => m.metric))];
  return {
    nickname: child.nickname, age: ageFromBirth(child.birthDate), period: label, sessionsDone: done.length, sessionsSkipped: sessions.filter((s) => s.status === "SKIPPED").length,
    minutes: done.reduce((a, s) => a + s.durationMin, 0),
    categories: Object.entries(cat).sort((a, b) => b[1] - a[1]).map(([k, count]) => ({ label: catLabel(k), count })),
    favorites: names(fbs.map((f) => f.likedSlug)), disliked: names(fbs.map((f) => f.dislikedSlug)), difficultSessions: fbs.filter((f) => f.difficulty === "difficile").length,
    motivationAvg: avg(fbs.map((f) => f.motivation)), enjoymentAvg: avg(fbs.map((f) => f.enjoyment)), fatigueSessions: fbs.filter((f) => f.energy === 1).length, painReported: fbs.some((f) => f.pain),
    metrics: metricKeys.map((k) => {
      const xs = measures.filter((m) => m.metric === k); const def = metricOf(k); const first = xs[0].value, last = xs[xs.length - 1].value;
      return { label: def?.label ?? k, unit: def?.unit ?? "", first, last, count: xs.length, improved: xs.length < 2 || first === last ? null : def?.kind === "time" ? last < first : last > first };
    }),
    badges: badges.map((b) => BADGES.find((x) => x.key === b.badgeKey)?.label ?? b.badgeKey), challengesTried: challenges.length,
    evaluationsDone: challenges.filter((c) => EVALUATIONS.some((e) => e.key === c.challengeKey)).length,
  };
}

// Rédaction déterministe (sans IA) : chaque phrase s'appuie sur un fait.
export function narrateFacts(f: ReportFacts, kind: "mensuel" | "saison"): string {
  const band = bandForAge(f.age);
  const out: string[] = [];
  const when = kind === "mensuel" ? "Ce mois-ci" : "Cette saison";
  if (f.sessionsDone === 0) {
    out.push(`${when}, aucune séance n'a été enregistrée pour ${f.nickname}. Ce n'est pas un problème : il y a des périodes pour jouer et des périodes pour souffler.`);
    out.push("Quand vous en aurez envie, une séance courte de 10 minutes suffit pour reprendre.");
    return out.join("\n\n");
  }
  out.push(`${when}, ${f.nickname} a réalisé ${f.sessionsDone} séance${f.sessionsDone > 1 ? "s" : ""}, soit environ ${f.minutes} minutes de ballon à la maison.`);
  if (f.categories.length) out.push(`Les compétences les plus travaillées : ${f.categories.slice(0, 3).map((c) => c.label.toLowerCase()).join(", ")}.`);
  const up = f.metrics.filter((m) => m.improved === true), flat = f.metrics.filter((m) => m.improved === null && m.count >= 2), down = f.metrics.filter((m) => m.improved === false);
  if (up.length) out.push(`Progrès mesurés : ${up.map((m) => `${m.label.toLowerCase()} (de ${m.first} à ${m.last} ${m.unit})`).join(" ; ")}.`);
  if (flat.length) out.push(`Stable : ${flat.map((m) => m.label.toLowerCase()).join(", ")}. Les paliers font partie de l'apprentissage.`);
  if (down.length) out.push(`En léger retrait sur la période : ${down.map((m) => m.label.toLowerCase()).join(", ")}. Cela arrive, notamment en période de croissance ou de fatigue ; rien d'inquiétant sur une mesure isolée.`);
  if (!f.metrics.some((m) => m.count >= 2)) out.push("Nous n'avons pas encore assez de mesures pour parler de progrès chiffrés : une mini-évaluation refaite le mois prochain permettra de comparer.");
  if (f.favorites.length) out.push(`${f.nickname} semble particulièrement apprécier : ${f.favorites.slice(0, 3).join(", ")}.`);
  if (f.difficultSessions || f.disliked.length) out.push(`Points plus délicats : ${[f.difficultSessions ? `${f.difficultSessions} séance${f.difficultSessions > 1 ? "s" : ""} jugée${f.difficultSessions > 1 ? "s" : ""} difficile${f.difficultSessions > 1 ? "s" : ""}` : "", f.disliked.length ? `moins d'envie sur ${f.disliked.slice(0, 2).join(", ")}` : ""].filter(Boolean).join(" ; ")}.`);
  if (f.motivationAvg !== null) out.push(`Motivation déclarée : ${f.motivationAvg >= 2.5 ? "élevée" : f.motivationAvg >= 1.8 ? "dans la moyenne" : "plutôt basse"} (${f.motivationAvg}/3).`);
  if (f.fatigueSessions) out.push(`${f.fatigueSessions} séance${f.fatigueSessions > 1 ? "s ont été vécues" : " a été vécue"} avec une forte fatigue : le programme a été allégé en conséquence.`);
  if (f.painReported) out.push("Une douleur a été signalée pendant la période. Si elle persiste ou revient, un avis médical est recommandé.");
  if (f.badges.length) out.push(`Badges obtenus : ${f.badges.join(", ")}.`);
  const next = f.motivationAvg !== null && f.motivationAvg < 1.8 ? "Pour la suite, nous allons privilégier le jeu et lui laisser davantage de choix." : f.fatigueSessions >= 2 ? "Pour la suite, priorité à la récupération : séances plus courtes et jours de repos respectés." : `Pour la suite, nous allons consolider ces acquis avec des exercices adaptés à son âge (${band.theme.toLowerCase()}).`;
  out.push(next);
  return out.join("\n\n");
}

export async function monthBounds(period: string) {
  const [y, m] = period.split("-").map(Number);
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const to = isoOf(new Date(Date.UTC(y, m, 0)));
  return { from, to, label: new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(dayDate(from)) };
}

export function entOf(user: { subscription: Parameters<typeof entitlements>[0] }) {
  return entitlements(user.subscription);
}
