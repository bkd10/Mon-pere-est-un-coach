// Tests du moteur de personnalisation : règles de sécurité et d'adaptation.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BASES, LIBRARY, DECLINATIONS } from "../src/content/library";
import { CATEGORIES, AGE_BANDS, bandForAge, KIT } from "../src/content/taxonomy";
import { allowedHomeSessions, buildSession, planWeek, rulesFromDefaults, validateMove, type Feedback, type History, type LibExercise, type Profile } from "../src/lib/engine";
import { effectiveTier, entitlements } from "../src/lib/plans";
import { encryptJson, decryptJson } from "../src/lib/crypto";

const ALL = LIBRARY;
const LIB: LibExercise[] = ALL.map((e) => ({ slug: e.slug, name: e.name, category: e.category, ageMin: e.age[0], ageMax: e.age[1], level: e.level, difficulty: e.difficulty, durationMin: e.durationMin, equipment: e.equipment, space: e.space, indoorOk: e.indoorOk ?? false, parentRole: e.parentRole ?? "observe", intensity: e.intensity ?? 2, bodyAreas: e.bodyAreas ?? [], recoverySec: e.recoverySec ?? 30, metricKey: e.metricKey, isFree: e.isFree, family: e.family, isBase: !e.variantKey }));
const rules = rulesFromDefaults();
const profile = (o: Partial<Profile> = {}): Profile => ({ age: 9, level: "debutant", goals: ["technique"], minutesAvailable: 20, homeSessionsPerWeek: 2, clubTrainingsPerWeek: 2, clubDays: [3, 5], matchDay: 6, equipment: ["ballon", "plots"], places: ["jardin"], modes: {}, ...o });
const hist = (fb: Partial<Feedback>[] = [], o: Partial<History> = {}): History => ({ feedback: fb.map((f, i) => ({ date: `2026-11-0${9 - i}`, enjoyment: 3, energy: 3, motivation: 3, difficulty: "ok", pain: false, wantedMore: false, confidence: 2, ...f })), recentSlugs: [], doneCount: fb.length + 3, ...o });
const D = "2026-11-10";

test("bibliothèque : fiches complètes, slugs uniques, toutes les catégories et tous les âges couverts", () => {
  assert.equal(new Set(ALL.map((e) => e.slug)).size, ALL.length);
  assert.ok(ALL.length >= 1000, `${ALL.length} fiches`);
  assert.ok(BASES.length >= 120 && DECLINATIONS.length >= 15);
  for (const c of CATEGORIES) assert.ok(BASES.filter((e) => e.category === c.key).length >= 6, `catégorie ${c.key}`);
  for (const e of ALL) {
    assert.ok(e.steps.length >= 3 && e.mistakes.length >= 1 && e.corrections.length >= 1 && e.easy && e.medium && e.hard && e.success && e.why, e.slug);
    assert.ok(e.age[0] >= 4 && e.age[1] <= 18 && e.age[0] <= e.age[1], e.slug);
    assert.equal(e.mistakes.length >= 1 && e.corrections.length >= 1, true, e.slug);
  }
  for (let age = 5; age <= 18; age++) assert.ok(LIB.filter((e) => e.ageMin <= age && e.ageMax >= age).length >= 150, `âge ${age} : ${LIB.filter((e) => e.ageMin <= age && e.ageMax >= age).length}`);
  assert.ok(LIB.filter((e) => e.ageMin <= 4 && e.ageMax >= 4).length >= 40);
});

test("une séance est produite pour chaque âge et chaque niveau, dans les limites de durée", () => {
  for (let age = 4; age <= 18; age++) for (const level of ["debutant", "intermediaire", "confirme"]) for (const min of [10, 20, 45]) {
    const s = buildSession(profile({ age, level, minutesAvailable: min }), LIB, hist(), rules, D);
    const band = bandForAge(age);
    assert.ok(s.durationMin <= Math.min(min, band.sessionMin[1]) + 1, `${age} ans ${level} ${min} min → ${s.durationMin}`);
    assert.ok(s.blocks.some((b) => b.phase === "technique"), `technique ${age}/${level}`);
    assert.deepEqual([s.blocks[0].phase, s.blocks.at(-1)!.phase], ["accueil", "discussion"]);
    for (const b of s.blocks) if (b.exerciseSlug) { const e = LIB.find((x) => x.slug === b.exerciseSlug)!; assert.ok(e.ageMin <= age + 1 && e.ageMax >= age - 1, `${e.slug} pour ${age} ans`); }
    assert.ok(s.explanation.length >= 3);
    const fams = s.blocks.filter((b) => b.exerciseSlug).map((b) => LIB.find((x) => x.slug === b.exerciseSlug)!.family);
    assert.equal(new Set(fams).size, fams.length, `familles en double ${age}/${level}`);
  }
});

test("matériel : chaque objet est décrit et une séance reste rapide à installer", () => {
  for (const e of ALL) for (const k of e.equipment) assert.ok(KIT.some((x) => x.key === k), `${e.slug} : ${k}`);
  let total = 0, n = 0;
  for (let age = 5; age <= 18; age++) for (const min of [15, 30]) {
    const s = buildSession(profile({ age, minutesAvailable: min, equipment: ["ballon", "plots", "but", "cerceau", "echelle", "mur"] }), LIB, hist(), rules, D);
    const extra = s.equipment.filter((x) => x !== "ballon").length;
    assert.ok(extra <= 3, `${age} ans ${min} min : ${s.equipment.join(", ")}`);
    total += extra; n++;
  }
  assert.ok(total / n <= 2.5, `moyenne ${total / n}`);
});

test("douleur : les exercices de la zone sont suspendus, séance douce et conseil médical", () => {
  const s = buildSession(profile(), LIB, hist([{ pain: true, painArea: "genou" }]), rules, D);
  assert.equal(s.format, "douce");
  for (const b of s.blocks) if (b.exerciseSlug) assert.ok(!LIB.find((e) => e.slug === b.exerciseSlug)!.bodyAreas.includes("genou"), b.exerciseSlug);
  assert.ok(s.explanation.some((x) => /médecin/.test(x)));
  assert.ok(s.rulesApplied.includes("douleur"));
});

test("forte fatigue : séance plus courte et calme ; deux fois de suite : repos d'abord", () => {
  const normal = buildSession(profile(), LIB, hist(), rules, D);
  const tired = buildSession(profile(), LIB, hist([{ energy: 1 }]), rules, D);
  assert.ok(tired.durationMin < normal.durationMin);
  for (const b of tired.blocks) if (b.exerciseSlug && b.phase !== "echauffement") assert.ok(LIB.find((e) => e.slug === b.exerciseSlug)!.intensity <= 1);
  const { days, reasons } = planWeek(profile({ clubDays: [], matchDay: null, clubTrainingsPerWeek: 0 }), hist([{ energy: 1 }, { energy: 1 }]), rules, D);
  assert.ok(days.slice(0, 2).every((d) => d.kind === "rest"));
  assert.ok(reasons.some((r) => /repos/.test(r)));
});

test("« il voulait continuer » n'allonge jamais la séance", () => {
  const a = buildSession(profile(), LIB, hist(), rules, D);
  const b = buildSession(profile(), LIB, hist([{ wantedMore: true }]), rules, D);
  assert.ok(b.durationMin <= a.durationMin);
  assert.ok(b.rulesApplied.includes("pas-de-surenchere"));
});

test("trop facile deux fois : une seule catégorie progresse", () => {
  const s = buildSession(profile(), LIB, hist([{ difficulty: "facile", mainCategory: "passes" }, { difficulty: "facile", mainCategory: "passes" }]), rules, D);
  assert.ok(s.rulesApplied.includes("trop-facile"));
  assert.ok(s.explanation.some((x) => /uniquement/.test(x)));
  const once = buildSession(profile(), LIB, hist([{ difficulty: "facile", mainCategory: "passes" }]), rules, D);
  assert.ok(!once.rulesApplied.includes("trop-facile"));
});

test("manque de confiance et exercice non apprécié", () => {
  const s = buildSession(profile(), LIB, hist([{ confidence: 1, dislikedSlug: "slalom-des-plots", enjoyment: 1 }]), rules, D);
  assert.ok(s.rulesApplied.includes("confiance-faible") && s.rulesApplied.includes("plaisir-faible"));
  assert.ok(!s.blocks.some((b) => b.exerciseSlug === "slalom-des-plots"));
  assert.equal(s.format, "plaisir");
});

test("planification : ni jour de club, ni jour de match, ni lendemain ; un jour d'écart", () => {
  const pr = profile({ homeSessionsPerWeek: 3 });
  const { days } = planWeek(pr, hist(), rules, D);
  const sess = days.filter((d) => d.kind === "session");
  assert.ok(sess.length >= 1 && sess.length <= 2, "plafond hebdomadaire : 5 - 2 clubs - 1 match = 2");
  for (const d of sess) { const dow = new Date(d.date + "T12:00:00Z").getUTCDay(); assert.ok(![3, 5, 6, 0].includes(dow), d.date); }
  for (let i = 1; i < sess.length; i++) assert.ok((Date.parse(sess[i].date) - Date.parse(sess[i - 1].date)) / 864e5 >= 2);
});

test("charge hebdomadaire : semaine saturée → aucune séance maison, avec explication", () => {
  const r = allowedHomeSessions(profile({ age: 6, clubTrainingsPerWeek: 3, homeSessionsPerWeek: 3 }), hist(), rules);
  assert.equal(r.count, 0);
  assert.ok(r.reasons.length > 0);
});

test("motivation basse deux fois : une séance de moins", () => {
  const p0 = profile({ clubTrainingsPerWeek: 0, clubDays: [], matchDay: null, homeSessionsPerWeek: 3 });
  assert.equal(allowedHomeSessions(p0, hist(), rules).count, 3);
  assert.equal(allowedHomeSessions(p0, hist([{ motivation: 1 }, { motivation: 1 }]), rules).count, 2);
});

test("déplacement d'une séance : refus argumenté et date de remplacement valide", () => {
  const pr = profile();
  const bad = validateMove("2026-11-14", pr, rules, []); // samedi = match
  assert.equal(bad.ok, false);
  assert.ok(bad.reason && bad.date !== "2026-11-14");
  assert.ok(validateMove(bad.date, pr, rules, []).ok);
  assert.equal(validateMove("2026-11-10", pr, rules, ["2026-11-11"]).ok, false); // veille d'une autre séance
});

test("modes : sans matériel, petit espace, vacances, offre Découverte", () => {
  const s1 = buildSession(profile({ modes: { sansMateriel: true } }), LIB, hist(), rules, D);
  for (const b of s1.blocks) if (b.exerciseSlug) assert.ok(LIB.find((e) => e.slug === b.exerciseSlug)!.equipment.every((x) => x === "ballon"), b.exerciseSlug);
  const s2 = buildSession(profile({ modes: { petitEspace: true } }), LIB, hist(), rules, D);
  for (const b of s2.blocks) if (b.exerciseSlug) assert.equal(LIB.find((e) => e.slug === b.exerciseSlug)!.space, "petit");
  const s3 = buildSession(profile({ modes: { vacances: true }, minutesAvailable: 30 }), LIB, hist(), rules, D);
  assert.ok(s3.durationMin <= 16);
  const s4 = buildSession(profile({ age: 7 }), LIB, hist([], { freeOnly: true }), rules, D);
  for (const b of s4.blocks) if (b.exerciseSlug) assert.ok(LIB.find((e) => e.slug === b.exerciseSlug)!.isFree, b.exerciseSlug);
});

test("le moteur est déterministe pour une même date", () => {
  assert.deepEqual(buildSession(profile(), LIB, hist(), rules, D), buildSession(profile(), LIB, hist(), rules, D));
});

test("lancement : sans médiateur, ventes fermées et tout est offert", () => {
  const saved = { ...process.env }; delete process.env.DEMO_SALES; delete process.env.LEGAL_MEDIATOR_NAME; delete process.env.LEGAL_MEDIATOR_URL;
  try { assert.equal(entitlements(null).tier, "FAMILLE"); assert.equal(entitlements(null).maxChildren, 3); }
  finally { Object.assign(process.env, saved); }
});
test("abonnements : essai expiré et résiliation échue retombent sur Découverte", () => {
  process.env.DEMO_SALES = "1"; // ventes ouvertes : les règles d'abonnement s'appliquent
  const base = { id: "s", userId: "u", interval: "month", cancelAtPeriodEnd: false, provider: "demo", stripeCustomerId: null, stripeSubscriptionId: null, updatedAt: new Date() };
  const past = new Date(Date.now() - 864e5), future = new Date(Date.now() + 864e5);
  assert.equal(effectiveTier({ ...base, tier: "PREMIUM", status: "TRIALING", trialEndsAt: future, currentPeriodEnd: null }), "PREMIUM");
  assert.equal(effectiveTier({ ...base, tier: "PREMIUM", status: "TRIALING", trialEndsAt: past, currentPeriodEnd: null }), "DECOUVERTE");
  assert.equal(effectiveTier({ ...base, tier: "ESSENTIEL", status: "CANCELED", trialEndsAt: null, currentPeriodEnd: future }), "ESSENTIEL");
  assert.equal(effectiveTier({ ...base, tier: "ESSENTIEL", status: "CANCELED", trialEndsAt: null, currentPeriodEnd: past }), "DECOUVERTE");
  assert.equal(effectiveTier({ ...base, tier: "ESSENTIEL", status: "PAST_DUE", trialEndsAt: null, currentPeriodEnd: past }), "ESSENTIEL"); // 7 jours de grâce
  assert.equal(entitlements(null).fullLibrary, false);
  assert.equal(AGE_BANDS.length, 7);
});

test("chiffrement des données sensibles", () => {
  const c = encryptJson({ heightCm: 132, weightKg: 28 });
  assert.ok(!c.includes("132"));
  assert.deepEqual(decryptJson(c), { heightCm: 132, weightKg: 28 });
  assert.equal(decryptJson(c.slice(0, -4) + "AAAA"), null);
});
