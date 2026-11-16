"use server";
import { FEATURES } from "@/lib/flags";
// Actions serveur de l'espace parent. Chaque action vérifie la session et l'appartenance de l'enfant.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mkdir, writeFile, unlink, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { PlanTier } from "@prisma/client";
import { db } from "@/lib/db";
import { audit, createSession, destroySession, getActiveChild, hashPassword, ownChild, requireUser, setActiveChild, track, verifyPassword } from "@/lib/auth";
import { entitlements } from "@/lib/plans";
import { addDaysIso, awardBadges, buildFacts, dayDate, ensurePlan, entOf, getLibrary, getRules, historyOf, isoOf, monthBounds, narrateFacts, notify, profileOf, regenerateFuture, todayIso } from "@/lib/services";
import { buildSession, validateMove } from "@/lib/engine";
import { encryptJson } from "@/lib/crypto";
import { narrateWithAI } from "@/lib/coach";
import { cancelSubscription, redeemGift, resumeSubscription, startCheckout, withdrawSubscription, withdrawalWindow } from "@/lib/billing";
import { sendEmail } from "@/lib/mail";
import { DOC_VERSIONS } from "@/content/legal";
import { ageFromBirth, BADGES, EVALUATIONS, METRICS, bandForAge, metricOf, monthKey, weekKey } from "@/content/taxonomy";

const fail = (to: string, msg: string): never => redirect(`${to}${to.includes("?") ? "&" : "?"}e=${encodeURIComponent(msg)}`);
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string, d = 0) => { const n = Number(String(f.get(k) ?? "").replace(",", ".")); return Number.isFinite(n) ? n : d; };
const list = (f: FormData, k: string) => f.getAll(k).map(String).filter(Boolean);

// ───────────── Compte ─────────────
export async function signup(f: FormData) {
  const parsed = z.object({ firstName: z.string().min(1).max(40), email: z.string().email().max(120), password: z.string().min(8).max(100) }).safeParse({ firstName: str(f, "firstName"), email: str(f, "email").toLowerCase(), password: String(f.get("password") ?? "") });
  if (!parsed.success) fail("/inscription", "Vérifiez votre prénom, votre e-mail et un mot de passe d'au moins 8 caractères.");
  if (f.get("cgu") !== "on") fail("/inscription", "Merci d'accepter les conditions générales pour créer votre compte.");
  if (f.get("consent") !== "on") fail("/inscription", "Merci de confirmer que vous êtes titulaire de l'autorité parentale.");
  const { firstName, email, password } = parsed.data!;
  if (await db.user.findUnique({ where: { email } })) fail("/inscription", "Un compte existe déjà avec cet e-mail. Connectez-vous.");
  const premium = await db.plan.findUnique({ where: { tier: "FAMILLE" } });
  const trialDays = premium?.trialDays ?? 7;
  const user = await db.user.create({ data: {
    firstName, email, passwordHash: await hashPassword(password), consentAt: new Date(), consentVersion: DOC_VERSIONS.privacy, emailMarketing: f.get("marketing") === "on",
    consents: { create: [
      { type: "cgu", version: DOC_VERSIONS.cgu, granted: true },
      { type: "parental", version: DOC_VERSIONS.privacy, granted: true, detail: "Titulaire de l'autorité parentale, accepte le traitement des données de l'enfant (politique de confidentialité)" },
      { type: "marketing_email", version: DOC_VERSIONS.privacy, granted: f.get("marketing") === "on" },
    ] },
    subscription: { create: trialDays > 0 ? { tier: "FAMILLE", status: "TRIALING", trialEndsAt: new Date(Date.now() + trialDays * 86400000) } : { tier: "DECOUVERTE", status: "ACTIVE" } },
  } });
  await audit(user.id, "signup", `CGU ${DOC_VERSIONS.cgu}, confidentialité ${DOC_VERSIONS.privacy}`);
  await track("signup");
  await createSession(user.id);
  redirect("/app/onboarding");
}

export async function login(f: FormData) {
  const email = str(f, "email").toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  const generic = "E-mail ou mot de passe incorrect.";
  if (!user) fail("/connexion", generic);
  const u = user!;
  if (u.lockedUntil && u.lockedUntil > new Date()) fail("/connexion", "Trop de tentatives. Réessayez dans quelques minutes.");
  if (!(await verifyPassword(String(f.get("password") ?? ""), u.passwordHash))) {
    const n = u.failedLogins + 1;
    await db.user.update({ where: { id: u.id }, data: { failedLogins: n >= 5 ? 0 : n, lockedUntil: n >= 5 ? new Date(Date.now() + 15 * 60000) : null } });
    fail("/connexion", generic);
  }
  await db.user.update({ where: { id: u.id }, data: { failedLogins: 0, lockedUntil: null, lastSeenAt: new Date() } });
  await createSession(u.id);
  await track("login");
  redirect(u.role === "PARENT" ? "/app" : "/admin");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

// ───────────── Profil enfant ─────────────
function childData(f: FormData) {
  const clubDays = list(f, "clubDays").map(Number).filter((n) => n >= 0 && n <= 6);
  const matchDay = str(f, "matchDay");
  const club = str(f, "club");
  return {
    nickname: str(f, "nickname").slice(0, 30), birthDate: new Date((/^\d{4}-\d{2}$/.test(str(f, "birthMonth")) ? str(f, "birthMonth") + "-01" : "invalid") + "T00:00:00Z"), // minimisation : mois et année seulement level: ["debutant", "intermediaire", "confirme"].includes(str(f, "level")) ? str(f, "level") : "debutant",
    club: club || null, clubTrainingsPerWeek: clubDays.length, clubDays, matchDay: matchDay === "" ? null : Math.min(6, Math.max(0, Number(matchDay))),
    position: str(f, "position") || null, dominantFoot: ["droit", "gauche", "les deux"].includes(str(f, "dominantFoot")) ? str(f, "dominantFoot") : "droit",
    goals: list(f, "goals").slice(0, 4), minutesAvailable: Math.min(45, Math.max(10, num(f, "minutesAvailable", 20))), homeSessionsPerWeek: Math.min(3, Math.max(1, num(f, "homeSessionsPerWeek", 2))),
    equipment: ["ballon", ...list(f, "equipment").filter((e) => e !== "ballon")], places: list(f, "places").length ? list(f, "places") : ["jardin"], avatar: str(f, "avatar") || "⚽",
  };
}

export async function saveChild(f: FormData) {
  const user = await requireUser();
  const id = str(f, "id");
  const back = id ? "/app/enfant/modifier" : "/app/onboarding";
  const data = childData(f);
  if (!data.nickname) fail(back, "Indiquez un prénom ou un pseudonyme.");
  if (Number.isNaN(data.birthDate.getTime())) fail(back, "Indiquez son mois et son année de naissance.");
  const age = ageFromBirth(data.birthDate);
  if (age < 4 || age > 18) fail(back, "L'application s'adresse aux enfants et aux jeunes de 4 à 18 ans.");
  const ent = entOf(user);
  // Données de forme et de santé : consentement explicite et séparé (art. 9 RGPD) ; avant 15 ans, l'enfant doit aussi être d'accord.
  const wantsHealth = FEATURES.health && f.get("health") === "on";
  if (wantsHealth && age < 15 && f.get("healthChild") !== "on") fail(back, "Avant 15 ans, confirmez aussi que votre enfant a été informé et est d'accord, ou décochez le suivi forme et santé.");
  const prev = id ? user.children.find((c) => c.id === id) : undefined;
  const healthConsentAt = wantsHealth ? prev?.healthConsentAt ?? new Date() : null;
  const logHealth = async (childId: string) => {
    if (Boolean(prev?.healthConsentAt) === wantsHealth) return;
    await db.consent.create({ data: { userId: user.id, childId, type: "health", version: DOC_VERSIONS.privacy, granted: wantsHealth, detail: wantsHealth ? (age < 15 ? "parent + enfant informé et d'accord" : "parent") : "retrait" } });
    if (!wantsHealth) { // retrait : on efface les données de santé déjà collectées
      await db.developmentEntry.deleteMany({ where: { childId } });
      await db.sessionFeedback.updateMany({ where: { session: { childId } }, data: { energy: null, pain: false, painArea: null } });
    }
  };
  if (id) {
    await ownChild(id);
    const child = await db.child.update({ where: { id }, data: { ...data, healthConsentAt } });
    await logHealth(id);
    // Le profil a changé : les séances à venir sont recalculées.
    await db.plannedSession.deleteMany({ where: { childId: id, status: "PLANNED", date: { gte: dayDate(todayIso()) } } });
    await ensurePlan(child, ent);
    revalidatePath("/app", "layout");
    redirect("/app/enfant?ok=1");
  }
  if (user.children.length >= ent.maxChildren) fail("/app/abonnement", `Votre offre permet ${ent.maxChildren} profil${ent.maxChildren > 1 ? "s" : ""} enfant.`);
  const child = await db.child.create({ data: { ...data, healthConsentAt, parentId: user.id } });
  await logHealth(child.id);
  await setActiveChild(child.id);
  await ensurePlan(child, ent);
  await track("child_created");
  redirect("/app?bienvenue=1");
}

export async function switchChild(f: FormData) {
  const { child } = await ownChild(str(f, "childId"));
  await setActiveChild(child.id);
  revalidatePath("/app", "layout");
  redirect(str(f, "back") || "/app");
}

export async function deleteChild(f: FormData) {
  const { user, child } = await ownChild(str(f, "childId"));
  const media = await db.media.findMany({ where: { childId: child.id } });
  for (const m of media) await unlink(path.join(process.cwd(), "storage", m.storageKey)).catch(() => {});
  await db.media.deleteMany({ where: { childId: child.id } });
  await db.child.delete({ where: { id: child.id } });
  await audit(user.id, "child_deleted");
  revalidatePath("/app", "layout");
  redirect("/app");
}

export async function setModes(f: FormData) {
  const { user, child } = await getActiveChild();
  const modes = { vacances: f.get("vacances") === "on", petitEspace: f.get("petitEspace") === "on", sansMateriel: f.get("sansMateriel") === "on" };
  const updated = await db.child.update({ where: { id: child.id }, data: { modes } });
  await db.plannedSession.deleteMany({ where: { childId: child.id, status: "PLANNED", date: { gte: dayDate(todayIso()) } } });
  await ensurePlan(updated, entOf(user));
  revalidatePath("/app", "layout");
  redirect(str(f, "back") || "/app/parametres?ok=1");
}

// ───────────── Séances ─────────────
async function ownSession(id: string) {
  const user = await requireUser();
  const s = await db.plannedSession.findUnique({ where: { id }, include: { child: true } });
  if (!s || s.child.parentId !== user.id) throw new Error("Séance introuvable.");
  return { user, session: s, child: s.child };
}

export async function submitFeedback(f: FormData) {
  const { user, session, child } = await ownSession(str(f, "sessionId"));
  const clamp = (k: string) => Math.min(3, Math.max(1, num(f, k, 2)));
  const health = Boolean(child.healthConsentAt); // sans consentement santé : ni fatigue ni douleur enregistrées
  const pain = health && f.get("pain") === "on";
  const data = {
    enjoyment: clamp("enjoyment"), energy: health ? clamp("energy") : null, motivation: clamp("motivation"), confidence: clamp("confidence"),
    difficulty: ["facile", "ok", "difficile"].includes(str(f, "difficulty")) ? str(f, "difficulty") : "ok", pain, painArea: pain ? str(f, "painArea") || "autre" : null,
    wantedMore: f.get("wantedMore") === "on", likedSlug: str(f, "likedSlug") || null, dislikedSlug: str(f, "dislikedSlug") || null, note: str(f, "note").slice(0, 500) || null,
  };
  await db.sessionFeedback.upsert({ where: { sessionId: session.id }, update: data, create: { sessionId: session.id, ...data } });
  await db.plannedSession.update({ where: { id: session.id }, data: { status: "DONE", completedAt: new Date() } });
  // Résultat du petit défi (facultatif) → carnet de progression.
  const metric = str(f, "challengeMetric");
  if (metric && metricOf(metric) && str(f, "challengeValue") !== "") await db.measurement.create({ data: { childId: child.id, metric, value: num(f, "challengeValue"), source: "evaluation" } });
  if (data.note && f.get("saveMemory") === "on") await db.milestone.create({ data: { childId: child.id, title: data.note.slice(0, 80), kind: "reussite" } });
  const ent = entOf(user);
  const earned = await awardBadges(child);
  for (const k of earned) { const b = BADGES.find((x) => x.key === k)!; await notify(user.id, "goal", `Nouveau badge : ${b.label} ${b.icon}`, b.desc, "/app/enfant"); }
  if (pain) await notify(user.id, "rest", "Douleur signalée", "Les exercices concernés sont suspendus. Si la douleur persiste ou revient, demandez un avis médical.", "/app/calendrier");
  else if (data.energy === 1) await notify(user.id, "rest", "Repos recommandé", `${child.nickname} était très fatigué : la prochaine séance est allégée. Un jour de repos lui fera du bien.`, "/app/calendrier");
  await regenerateFuture(child, ent);
  await ensurePlan(child, ent);
  await track("session_done");
  revalidatePath("/app", "layout");
  redirect(`/app/seance/${session.id}/bilan`);
}

export async function skipSession(f: FormData) {
  const { session } = await ownSession(str(f, "sessionId"));
  await db.plannedSession.update({ where: { id: session.id }, data: { status: "SKIPPED" } });
  revalidatePath("/app", "layout");
  redirect((str(f, "back") || "/app") + "?reporte=1");
}

export async function moveSession(f: FormData) {
  const { session, child } = await ownSession(str(f, "sessionId"));
  const target = str(f, "date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(target) || target < todayIso()) fail("/app/calendrier", "Choisissez une date à venir.");
  const others = (await db.plannedSession.findMany({ where: { childId: child.id, id: { not: session.id }, status: { in: ["PLANNED", "DONE"] }, date: { gte: dayDate(addDaysIso(target, -5)), lte: dayDate(addDaysIso(target, 5)) } } })).map((s) => isoOf(s.date));
  const events = await db.calendarEvent.findMany({ where: { childId: child.id, date: { gte: dayDate(addDaysIso(target, -6)), lte: dayDate(addDaysIso(target, 6)) } } });
  const blocked: Record<string, string> = {};
  for (const e of events) { blocked[isoOf(e.date)] = e.type === "MATCH" ? "Jour de match." : e.type === "VACATION" ? "Vacances." : e.type === "REST" ? "Jour de repos choisi." : "Entraînement en club."; if (e.type === "MATCH") blocked[addDaysIso(isoOf(e.date), 1)] ??= "Lendemain de match : le corps récupère."; }
  const res = validateMove(target, profileOf(child), await getRules(), others, blocked);
  await db.plannedSession.update({ where: { id: session.id }, data: { date: dayDate(res.date) } });
  revalidatePath("/app", "layout");
  redirect(`/app/calendrier?${res.ok ? "deplace=1" : `ajuste=${encodeURIComponent(`${res.reason} La séance a été placée le ${new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(dayDate(res.date))}.`)}`}`);
}

// Séance à la demande (« j'ai 10 minutes maintenant ») — soumise aux mêmes règles de sécurité.
export async function quickSession(f: FormData) {
  const { user, child } = await getActiveChild();
  const ent = entOf(user);
  if (!ent.fullLibrary) fail("/app/entrainements", "Les séances à la demande font partie de l'abonnement Famille.");
  const today = todayIso();
  const profile = profileOf(child);
  const rules = await getRules();
  const others = (await db.plannedSession.findMany({ where: { childId: child.id, status: { in: ["PLANNED", "DONE"] }, date: { gte: dayDate(addDaysIso(today, -1)), lte: dayDate(addDaysIso(today, 1)) } } }));
  const todays = others.find((s) => isoOf(s.date) === today && s.status === "PLANNED");
  if (todays) redirect(`/app/seance/${todays.id}`);
  const v = validateMove(today, profile, rules, others.map((s) => isoOf(s.date)));
  if (!v.ok) fail("/app/entrainements", `Pas de séance supplémentaire aujourd'hui. ${v.reason}`);
  const format = str(f, "format") || undefined;
  if (format === "courte") profile.minutesAvailable = Math.min(profile.minutesAvailable, 14);
  const plan = buildSession(profile, await getLibrary(), await historyOf(child, ent), rules, today, format);
  const s = await db.plannedSession.create({ data: { childId: child.id, date: dayDate(today), format: plan.format, title: plan.title, objective: plan.objective, durationMin: plan.durationMin, blocks: plan.blocks as never, parentTips: plan.parentTips, equipment: plan.equipment, explanation: plan.explanation, rulesApplied: plan.rulesApplied } });
  redirect(`/app/seance/${s.id}`);
}

// ───────────── Calendrier ─────────────
export async function addEvent(f: FormData) {
  const { user, child } = await getActiveChild();
  const type = str(f, "type") as "MATCH" | "VACATION" | "REST" | "CLUB_TRAINING";
  const date = str(f, "date"), end = str(f, "endDate");
  if (!["MATCH", "VACATION", "REST", "CLUB_TRAINING"].includes(type) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) fail("/app/calendrier", "Indiquez un type et une date.");
  await db.calendarEvent.create({ data: { childId: child.id, type, date: dayDate(date), endDate: end && end > date ? dayDate(end) : null, label: str(f, "label").slice(0, 60) || null } });
  // Les séances planifiées qui entrent en conflit sont déplacées ou retirées, sans conséquence.
  const last = end && end > date ? end : type === "MATCH" ? addDaysIso(date, 1) : date;
  await db.plannedSession.deleteMany({ where: { childId: child.id, status: "PLANNED", date: { gte: dayDate(date), lte: dayDate(last) } } });
  await ensurePlan(child, entOf(user));
  revalidatePath("/app", "layout");
  redirect("/app/calendrier?ok=1");
}
export async function deleteEvent(f: FormData) {
  const { child } = await getActiveChild();
  await db.calendarEvent.deleteMany({ where: { id: str(f, "id"), childId: child.id } });
  revalidatePath("/app/calendrier");
  redirect("/app/calendrier");
}

// ───────────── Progression, évaluations, défis ─────────────
export async function addMeasurement(f: FormData) {
  const { child } = await getActiveChild();
  const metric = str(f, "metric");
  const def = metricOf(metric);
  if (!def || str(f, "value") === "") fail("/app/progression", "Indiquez une valeur.");
  let v = num(f, "value");
  v = def!.kind === "pct" ? Math.min(10, Math.max(0, v)) : def!.kind === "score" ? Math.min(5, Math.max(1, v)) : Math.min(metric === "equilibre" ? 60 : 9999, Math.max(0, v));
  await db.measurement.create({ data: { childId: child.id, metric, value: v, note: str(f, "note").slice(0, 200) || null } });
  await awardBadges(child);
  revalidatePath("/app/progression");
  redirect(`/app/progression?m=${metric}&ok=1`);
}

export async function saveEvaluation(f: FormData) {
  const { user, child } = await getActiveChild();
  const ev = EVALUATIONS.find((e) => e.key === str(f, "key"));
  if (!ev || str(f, "value") === "") fail("/app/progression/evaluations", "Indiquez le résultat.");
  const e = ev!;
  const value = Math.max(0, num(f, "value"));
  const band = bandForAge(ageFromBirth(child.birthDate));
  const target = e.targets[band.key];
  const prev = await db.measurement.findFirst({ where: { childId: child.id, metric: e.metric }, orderBy: { date: "desc" } });
  const reached = e.lowerIsBetter ? value <= target : value >= target;
  const progressed = prev ? (e.lowerIsBetter ? value < prev.value : value > prev.value) : false;
  const stars = reached ? 3 : progressed ? 2 : 1; // 1 étoile pour avoir essayé : l'effort est toujours récompensé
  await db.measurement.create({ data: { childId: child.id, metric: e.metric, value, source: "evaluation" } });
  const period = monthKey(new Date());
  const existing = await db.challengeProgress.findUnique({ where: { childId_challengeKey_periodKey: { childId: child.id, challengeKey: e.key, periodKey: period } } });
  await db.challengeProgress.upsert({ where: { childId_challengeKey_periodKey: { childId: child.id, challengeKey: e.key, periodKey: period } }, update: { stars: Math.max(stars, existing?.stars ?? 0), value }, create: { childId: child.id, challengeKey: e.key, periodKey: period, stars, value } });
  const earned = await awardBadges(child);
  for (const k of earned) { const b = BADGES.find((x) => x.key === k)!; await notify(user.id, "goal", `Nouveau badge : ${b.label} ${b.icon}`, b.desc, "/app/enfant"); }
  revalidatePath("/app", "layout");
  redirect(`/app/progression/evaluations?fait=${e.key}&etoiles=${stars}`);
}

export async function completeChallenge(f: FormData) {
  const { child } = await getActiveChild();
  const key = str(f, "key");
  const period = key.startsWith("d-") ? todayIso() : key.startsWith("w-") ? weekKey(new Date()) : monthKey(new Date());
  await db.challengeProgress.upsert({ where: { childId_challengeKey_periodKey: { childId: child.id, challengeKey: key, periodKey: period } }, update: {}, create: { childId: child.id, challengeKey: key, periodKey: period, stars: 1 } });
  await awardBadges(child);
  await track("challenge_done");
  revalidatePath("/app", "layout");
  redirect((str(f, "back") || "/app") + "?defi=1");
}

// ───────────── Carnet de développement (facultatif, chiffré) ─────────────
export async function addDevEntry(f: FormData) {
  const { child } = await getActiveChild();
  if (!child.healthConsentAt) fail("/app/progression/carnet", "Le carnet de suivi nécessite votre accord pour les données de forme et de santé.");
  const opt = (k: string, min: number, max: number) => (str(f, k) === "" ? undefined : Math.min(max, Math.max(min, num(f, k))));
  const payload = { heightCm: opt("heightCm", 80, 220), weightKg: opt("weightKg", 10, 150), sleepH: opt("sleepH", 3, 14), fatigue: opt("fatigue", 1, 5), energy: opt("energy", 1, 5), motivation: opt("motivation", 1, 5), wellbeing: opt("wellbeing", 1, 5), note: str(f, "note").slice(0, 300) || undefined };
  if (Object.values(payload).every((v) => v === undefined)) fail("/app/progression/carnet", "Renseignez au moins une information.");
  const date = dayDate(/^\d{4}-\d{2}-\d{2}$/.test(str(f, "date")) ? str(f, "date") : todayIso());
  await db.developmentEntry.create({ data: { childId: child.id, date, payload: encryptJson(payload) } });
  revalidatePath("/app/progression/carnet");
  redirect("/app/progression/carnet?ok=1");
}
export async function deleteDevEntries() {
  const { user, child } = await getActiveChild();
  await db.developmentEntry.deleteMany({ where: { childId: child.id } });
  await audit(user.id, "dev_entries_deleted");
  redirect("/app/progression/carnet?efface=1");
}

// ───────────── Bilans ─────────────
export async function generateReport(f: FormData) {
  const { user, child } = await getActiveChild();
  const kind = str(f, "kind") === "saison" ? "saison" : "mensuel";
  const ent = entOf(user);
  let from: string, to: string, label: string, periodKey: string;
  if (kind === "mensuel") {
    periodKey = /^\d{4}-\d{2}$/.test(str(f, "period")) ? str(f, "period") : monthKey(new Date());
    ({ from, to, label } = await monthBounds(periodKey));
  } else {
    const now = new Date(); const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1; // saison d'août à juillet
    periodKey = `${y}-${y + 1}`; from = `${y}-08-01`; to = `${y + 1}-07-31`; label = `saison ${y}-${y + 1}`;
    if (!ent.aiReports) fail("/app/bilans", "Le bilan de fin de saison fait partie de l'abonnement Famille.");
  }
  const facts = await buildFacts(child, from, to, label);
  const ai = ent.aiReports && facts.sessionsDone > 0 ? await narrateWithAI(facts, kind) : null;
  const narrative = ai ?? narrateFacts(facts, kind);
  await db.report.upsert({ where: { childId_kind_periodKey: { childId: child.id, kind, periodKey } }, update: { facts: facts as never, narrative, generatedBy: ai ? "ia" : "regles", createdAt: new Date() }, create: { childId: child.id, kind, periodKey, facts: facts as never, narrative, generatedBy: ai ? "ia" : "regles" } });
  revalidatePath("/app/bilans");
  redirect(`/app/bilans?p=${kind}:${periodKey}`);
}

// ───────────── Guides, budget ─────────────
export async function markGuideRead(f: FormData) {
  const user = await requireUser();
  const guideId = str(f, "guideId");
  await db.guideRead.upsert({ where: { userId_guideId: { userId: user.id, guideId } }, update: {}, create: { userId: user.id, guideId } });
  revalidatePath("/app/guide");
  redirect("/app/guide?lu=1");
}
export async function saveBudget(f: FormData) {
  const user = await requireUser();
  const keys = ["licence", "stages", "coaching", "academies", "materiel", "equipements", "deplacements"];
  const amounts = Object.fromEntries(keys.map((k) => [k, Math.min(50000, Math.max(0, Math.round(num(f, k))))]));
  const now = new Date(); const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const season = `${y}-${y + 1}`;
  await db.budgetEntry.upsert({ where: { userId_season: { userId: user.id, season } }, update: { amounts }, create: { userId: user.id, season, amounts } });
  redirect("/app/guide/budget?ok=1");
}

// ───────────── Album de souvenirs, vidéos des familles ─────────────
const MIME: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };
export async function addMemory(f: FormData) {
  const { user, child } = await getActiveChild();
  const ent = entOf(user);
  const title = str(f, "title").slice(0, 80);
  if (!title) fail("/app/enfant/album", "Donnez un titre à ce souvenir.");
  const file = FEATURES.uploads ? f.get("file") : null;
  let mediaId: string | undefined;
  if (file instanceof File && file.size > 0) {
    const ext = MIME[file.type];
    if (!ext) fail("/app/enfant/album", "Format non pris en charge (JPEG, PNG, WebP, MP4, MOV, WebM).");
    const isVideo = file.type.startsWith("video/");
    if (file.size > (isVideo ? 50 : 10) * 1024 * 1024) fail("/app/enfant/album", isVideo ? "Vidéo trop lourde (50 Mo maximum)." : "Photo trop lourde (10 Mo maximum).");
    if ((await db.media.count({ where: { ownerId: user.id } })) >= ent.mediaQuota) fail("/app/enfant/album", `Votre album a atteint la limite de votre offre (${ent.mediaQuota} médias).`);
    const key = `${user.id}/${randomUUID()}.${ext}`;
    const dir = path.join(process.cwd(), "storage", user.id);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(process.cwd(), "storage", key), Buffer.from(await file.arrayBuffer()));
    const m = await db.media.create({ data: { ownerId: user.id, childId: child.id, kind: isVideo ? "video" : "photo", title, storageKey: key, mimeType: file.type, sizeBytes: file.size, exerciseSlug: str(f, "exerciseSlug") || null } });
    mediaId = m.id;
  }
  await db.milestone.create({ data: { childId: child.id, title, detail: str(f, "detail").slice(0, 300) || null, kind: str(f, "kind") === "etape" ? "etape" : "souvenir", mediaId, date: /^\d{4}-\d{2}-\d{2}$/.test(str(f, "date")) ? dayDate(str(f, "date")) : new Date() } });
  await awardBadges(child);
  revalidatePath("/app/enfant/album");
  redirect("/app/enfant/album?ok=1");
}

export async function deleteMemory(f: FormData) {
  const { user, child } = await getActiveChild();
  const m = await db.milestone.findFirst({ where: { id: str(f, "id"), childId: child.id } });
  if (m?.mediaId) {
    const media = await db.media.findFirst({ where: { id: m.mediaId, ownerId: user.id } });
    if (media) { await unlink(path.join(process.cwd(), "storage", media.storageKey)).catch(() => {}); await db.media.delete({ where: { id: media.id } }); }
  }
  if (m) await db.milestone.delete({ where: { id: m.id } });
  revalidatePath("/app/enfant/album");
  redirect("/app/enfant/album");
}

// Proposer une vidéo à la communauté : consentement explicite, puis modération humaine.
export async function shareMedia(f: FormData) {
  const user = await requireUser();
  if (!FEATURES.familyVideos) fail("/app/enfant/album", "Le partage de vidéos n'est pas disponible pour le moment.");
  const media = await db.media.findFirst({ where: { id: str(f, "mediaId"), ownerId: user.id } });
  if (!media) fail("/app/enfant/album", "Média introuvable.");
  if (["consentShare", "consentAuthority", "consentBoth", "consentChild", "consentOthers"].some((k) => f.get(k) !== "on")) fail("/app/enfant/album", "Toutes les confirmations sont nécessaires pour proposer une vidéo.");
  await db.media.update({ where: { id: media!.id }, data: { status: "PENDING", shareConsentAt: new Date(), minorIdentifiable: f.get("identifiable") === "on" } });
  await db.consent.create({ data: { userId: user.id, childId: media!.childId, type: "media_share", version: DOC_VERSIONS.cgu, granted: true, detail: `média ${media!.id} : titulaire de l'autorité parentale, accord des deux parents, enfant associé, aucun tiers sans accord` } });
  await audit(user.id, "media_share_consent", media!.id);
  redirect("/app/enfant/album?propose=1");
}
export async function unshareMedia(f: FormData) {
  const user = await requireUser();
  await db.media.updateMany({ where: { id: str(f, "mediaId"), ownerId: user.id }, data: { status: "PRIVATE", shareConsentAt: null } });
  await db.consent.create({ data: { userId: user.id, type: "media_share", version: DOC_VERSIONS.cgu, granted: false, detail: `retrait média ${str(f, "mediaId")}` } });
  await audit(user.id, "media_share_withdrawn", str(f, "mediaId"));
  redirect("/app/enfant/album?retire=1");
}

// ───────────── Paramètres, RGPD ─────────────
export async function saveSettings(f: FormData) {
  const user = await requireUser();
  const notifPrefs = { frequency: ["normal", "minimale", "aucune"].includes(str(f, "frequency")) ? str(f, "frequency") : "normal", ...Object.fromEntries(["session", "report", "challenge", "goal", "rest", "guide"].map((k) => [k, f.get(`n_${k}`) === "on"])) };
  const marketing = f.get("emailMarketing") === "on";
  await db.user.update({ where: { id: user.id }, data: { firstName: str(f, "firstName").slice(0, 40) || user.firstName, beginnerMode: f.get("beginnerMode") === "on", notifPrefs, emailMarketing: marketing } });
  if (marketing !== user.emailMarketing) await db.consent.create({ data: { userId: user.id, type: "marketing_email", version: DOC_VERSIONS.privacy, granted: marketing } });
  revalidatePath("/app", "layout");
  redirect("/app/parametres?ok=1");
}
export async function changePassword(f: FormData) {
  const user = await requireUser();
  const next = String(f.get("next") ?? "");
  if (!(await verifyPassword(String(f.get("current") ?? ""), user.passwordHash))) fail("/app/parametres", "Mot de passe actuel incorrect.");
  if (next.length < 8) fail("/app/parametres", "Le nouveau mot de passe doit contenir au moins 8 caractères.");
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  await audit(user.id, "password_changed");
  redirect("/app/parametres?ok=1");
}
export async function markNotificationsRead() {
  const user = await requireUser();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/app", "layout");
  redirect("/app/notifications");
}
export async function deleteAccount(f: FormData) {
  const user = await requireUser();
  if (!(await verifyPassword(String(f.get("password") ?? ""), user.passwordHash))) fail("/app/parametres", "Mot de passe incorrect : le compte n'a pas été supprimé.");
  if (user.subscription?.provider === "stripe") await cancelSubscription(user.id).catch(() => {});
  await rm(path.join(process.cwd(), "storage", user.id), { recursive: true, force: true });
  await db.user.delete({ where: { id: user.id } }); // suppression en cascade de toutes les données liées
  await audit(null, "account_deleted");
  await destroySession();
  redirect("/?supprime=1");
}

// ───────────── Abonnement ─────────────
export async function checkout(f: FormData) {
  const user = await requireUser();
  const tier = str(f, "tier") as PlanTier;
  const interval = str(f, "interval") === "year" ? "year" : "month";
  // Rétractation : le service démarre tout de suite à la demande expresse du consommateur (art. L221-25).
  if (f.get("immediate") !== "on" || f.get("cgv") !== "on") fail(`/app/abonnement/confirmer?tier=${tier}&interval=${interval}`, "Merci de cocher les deux cases pour valider la commande.");
  await db.consent.createMany({ data: [
    { userId: user.id, type: "cgu", version: DOC_VERSIONS.cgu, granted: true, detail: `commande ${tier} ${interval}` },
    { userId: user.id, type: "withdrawal_waiver", version: DOC_VERSIONS.cgu, granted: true, detail: "demande d'exécution immédiate ; rétractation possible 14 jours avec remboursement au prorata" },
  ] });
  const res = await startCheckout(user.id, user.email, tier, interval);
  await track("checkout_started");
  if (res.url) redirect(res.url);
  revalidatePath("/app", "layout");
  redirect("/app/abonnement?ok=1");
}
export async function cancelSub() {
  const user = await requireUser();
  await cancelSubscription(user.id);
  await audit(user.id, "subscription_canceled");
  // Confirmation sur support durable : date de prise d'effet et conséquences (art. L215-1-1).
  const sub = await db.subscription.findUnique({ where: { userId: user.id } });
  const end = sub?.currentPeriodEnd && sub.currentPeriodEnd > new Date() ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(sub.currentPeriodEnd) : null;
  const text = end ? `Votre abonnement est résilié. Vous gardez l'accès jusqu'au ${end} ; aucun prélèvement n'aura lieu ensuite. Votre compte passera alors en offre Découverte gratuite et vos données sont conservées.` : "Votre essai est arrêté. Votre compte est en offre Découverte gratuite ; aucun prélèvement n'aura lieu et vos données sont conservées.";
  await db.notification.create({ data: { userId: user.id, kind: "report", title: "Confirmation de résiliation", body: text, href: "/app/abonnement" } });
  await sendEmail({ userId: user.id, to: user.email, subject: "Confirmation de résiliation", text: `Bonjour ${user.firstName},\n\n${text}`, kind: "resiliation" });
  revalidatePath("/app", "layout");
  redirect("/app/abonnement?resilie=1");
}
export async function withdrawSub() {
  const user = await requireUser();
  const w = await withdrawalWindow(user.id);
  if (!w) fail("/app/abonnement", "Le délai de rétractation de 14 jours est dépassé. Vous pouvez résilier : l'accès continue jusqu'à la fin de la période payée.");
  const refund = await withdrawSubscription(user.id);
  await audit(user.id, "withdrawal", `${refund} centimes`);
  const text = `Votre rétractation est enregistrée. L'abonnement est arrêté immédiatement et ${(refund / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} vous seront remboursés sur votre moyen de paiement sous 14 jours au plus (prix diminué de la part correspondant aux jours utilisés).`;
  await db.notification.create({ data: { userId: user.id, kind: "report", title: "Confirmation de rétractation", body: text, href: "/app/abonnement" } });
  await sendEmail({ userId: user.id, to: user.email, subject: "Confirmation de rétractation", text: `Bonjour ${user.firstName},\n\n${text}`, kind: "retractation" });
  revalidatePath("/app", "layout");
  redirect("/app/abonnement?retracte=1");
}
export async function resumeSub() {
  const user = await requireUser();
  await resumeSubscription(user.id);
  revalidatePath("/app", "layout");
  redirect("/app/abonnement?ok=1");
}
export async function clearChat() {
  const user = await requireUser();
  await db.chatMessage.deleteMany({ where: { userId: user.id } });
  redirect("/app/coach");
}
void entitlements; void METRICS;

export async function toggleInterest(f: FormData) {
  const user = await requireUser();
  const productId = str(f, "productId");
  const key = { userId_productId: { userId: user.id, productId } };
  if (await db.productInterest.findUnique({ where: key })) await db.productInterest.delete({ where: key });
  else { await db.productInterest.create({ data: { userId: user.id, productId } }); await track("shop_interest"); }
  revalidatePath("/app/boutique");
  redirect("/app/boutique?ok=1");
}

// ───────────── Demandes sans connexion, signalements ─────────────
export async function requestDeletion(f: FormData) {
  const email = str(f, "email").toLowerCase();
  if (!z.string().email().safeParse(email).success) fail("/supprimer-mes-donnees", "Indiquez une adresse e-mail valide.");
  const recent = await db.deletionRequest.count({ where: { email, createdAt: { gte: new Date(Date.now() - 86400000) } } });
  if (!recent) await db.deletionRequest.create({ data: { email, message: str(f, "message").slice(0, 1000) || null } });
  await audit(null, "deletion_request");
  redirect("/supprimer-mes-donnees?ok=1");
}
export async function reportMedia(f: FormData) {
  const user = await requireUser();
  const reason = ["vie-privee", "enfant-tiers", "inapproprie", "danger", "autre"].includes(str(f, "reason")) ? str(f, "reason") : "autre";
  await db.contentReport.create({ data: { mediaId: str(f, "mediaId"), userId: user.id, reason, detail: str(f, "detail").slice(0, 500) || null } });
  await audit(user.id, "content_report", str(f, "mediaId"));
  redirect((str(f, "back") || "/app/videos") + "?signale=1");
}

export async function useGiftCode(f: FormData) {
  const user = await requireUser();
  const err = await redeemGift(user.id, str(f, "code"));
  if (err) fail("/app/abonnement", err);
  await audit(user.id, "gift_redeemed");
  await track("gift_redeemed");
  revalidatePath("/app", "layout");
  redirect("/app/abonnement?cadeau=1");
}
