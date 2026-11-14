// Initialise les contenus de référence. Idempotent : peut être relancé sans dupliquer.
// Aucun faux résultat ni faux utilisateur n'est créé — seulement le compte administrateur.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SAFE } from "../src/content/exercises-a";
import { BASES, LIBRARY } from "../src/content/library";
import { GUIDES } from "../src/content/guides";
import { DEFAULT_PLANS } from "../src/lib/plans";
import { DEFAULT_PRODUCTS } from "../src/content/products";
import { DEFAULT_RULES } from "../src/lib/engine";

const db = new PrismaClient();

async function main() {
  for (const p of DEFAULT_PLANS) await db.plan.upsert({ where: { tier: p.tier }, update: { features: p.features, sort: p.sort, maxChildren: p.maxChildren }, create: p });
  for (const r of DEFAULT_RULES) await db.aiRule.upsert({ where: { key: r.key }, update: { label: r.label, description: r.description, locked: r.locked }, create: { key: r.key, label: r.label, description: r.description, locked: r.locked, params: r.params } });
  // Boutique : les prix et liens saisis dans l'administration ne sont jamais écrasés.
  for (const p of DEFAULT_PRODUCTS) await db.product.upsert({ where: { slug: p.slug }, update: { contents: p.contents, equipment: p.equipment }, create: p });
  const all = LIBRARY;
  for (const e of all) {
    const data = {
      name: e.name, category: e.category, ageMin: e.age[0], ageMax: e.age[1], level: e.level, difficulty: e.difficulty, objective: e.objective, skill: e.skill, why: e.why,
      durationMin: e.durationMin, reps: e.reps, equipment: e.equipment, space: e.space, indoorOk: e.indoorOk ?? false, parentRole: e.parentRole ?? "observe", intensity: e.intensity ?? 2,
      bodyAreas: e.bodyAreas ?? [], safety: e.safety ?? (e.indoorOk ? `${SAFE.sol} ${SAFE.int}` : SAFE.sol), steps: e.steps, mistakes: e.mistakes, corrections: e.corrections,
      variantEasy: e.easy, variantMedium: e.medium, variantHard: e.hard, successCriteria: e.success, recoverySec: e.recoverySec ?? 30, diagram: e.diagram, metricKey: e.metricKey ?? null, isFree: e.isFree ?? false, familySlug: e.family, variantLabel: e.variantLabel ?? null,
      validatedBy: "Référentiel initial — à faire relire par un éducateur diplômé avant commercialisation",
    };
    await db.exercise.upsert({ where: { slug: e.slug }, update: data, create: { slug: e.slug, ...data } });
  }
  for (const g of GUIDES) {
    const data = { title: g.title, theme: g.theme, kind: g.kind ?? "article", summary: g.summary, body: g.body, actions: g.actions, readMin: g.readMin ?? Math.max(2, Math.round(g.body.split(/\s+/).length / 200)), isFree: g.isFree ?? false };
    await db.guide.upsert({ where: { slug: g.slug }, update: data, create: { slug: g.slug, ...data } });
  }
  const email = (process.env.ADMIN_EMAIL || "admin@petitpont.local").toLowerCase();
  if (!(await db.user.findUnique({ where: { email } }))) {
    await db.user.create({ data: { email, firstName: "Admin", role: "ADMIN", passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || "ChangeMoi!2026", 12), consentAt: new Date(), consentVersion: "2026-11" } });
    console.log(`Compte administrateur créé : ${email}`);
  }
  console.log(`${all.length} fiches (${BASES.length} exercices de base), ${GUIDES.length} guides, ${DEFAULT_PLANS.length} offres, ${DEFAULT_RULES.length} règles.`);
}
main().finally(() => db.$disconnect());
