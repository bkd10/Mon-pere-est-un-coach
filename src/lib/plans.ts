// Offres, droits d'accès et valeurs par défaut (les tarifs sont modifiables depuis l'administration).
import type { PlanTier, Subscription } from "@prisma/client";

export const DEFAULT_PLANS = [
  { tier: "DECOUVERTE" as PlanTier, name: "Découverte", tagline: "Pour essayer la méthode, sans carte bancaire.", monthlyCents: 0, yearlyCents: 0, trialDays: 0, maxChildren: 1, sort: 0, active: true,
    features: ["1 profil enfant", "Les exercices de découverte avec schémas animés", "1 séance guidée par semaine", "Défi du jour", "Guides parents essentiels"] },
  // v1 : une seule offre payante. Les offres Essentiel et Premium existent toujours en base, désactivées.
  { tier: "ESSENTIEL" as PlanTier, name: "Essentiel", tagline: "Offre non commercialisée.", monthlyCents: 399, yearlyCents: 3590, trialDays: 7, maxChildren: 1, sort: 8, active: false, features: [] as string[] },
  { tier: "PREMIUM" as PlanTier, name: "Premium", tagline: "Offre non commercialisée.", monthlyCents: 699, yearlyCents: 5990, trialDays: 7, maxChildren: 3, sort: 9, active: false, features: [] as string[] },
  { tier: "FAMILLE" as PlanTier, name: "Famille", tagline: "Tout Petit Pont, pour toute la fratrie.", monthlyCents: 499, yearlyCents: 3490, trialDays: 7, maxChildren: 3, sort: 1, active: true,
    features: ["Jusqu'à 3 enfants", "Parcours personnalisé par âge et par niveau", "Séances guidées illimitées, adaptées après chaque retour", "Tous les exercices et leurs progressions", "Calendrier autour du club et des matchs", "Carnet de progression, mini-évaluations et bilans", "Tous les guides parents", "Album de souvenirs"] },
];

export type Entitlements = {
  tier: PlanTier; maxChildren: number; fullLibrary: boolean; sessionsPerWeek: number; calendar: boolean; progression: boolean; allGuides: boolean;
  fineAdaptation: boolean; aiReports: boolean; coachQuota: number; mediaQuota: number; siblings: boolean; passport: boolean;
};
const E: Record<PlanTier, Omit<Entitlements, "tier">> = {
  DECOUVERTE: { maxChildren: 1, fullLibrary: false, sessionsPerWeek: 1, calendar: false, progression: false, allGuides: false, fineAdaptation: false, aiReports: false, coachQuota: 3, mediaQuota: 3, siblings: false, passport: false },
  ESSENTIEL: { maxChildren: 1, fullLibrary: true, sessionsPerWeek: 99, calendar: true, progression: true, allGuides: true, fineAdaptation: false, aiReports: false, coachQuota: 10, mediaQuota: 20, siblings: false, passport: false },
  PREMIUM: { maxChildren: 3, fullLibrary: true, sessionsPerWeek: 99, calendar: true, progression: true, allGuides: true, fineAdaptation: true, aiReports: true, coachQuota: 300, mediaQuota: 300, siblings: false, passport: true },
  FAMILLE: { maxChildren: 3, fullLibrary: true, sessionsPerWeek: 99, calendar: true, progression: true, allGuides: true, fineAdaptation: true, aiReports: true, coachQuota: 300, mediaQuota: 1000, siblings: true, passport: true },
};

// Offre réellement applicable : un essai expiré ou un abonnement résilié et échu retombent sur Découverte.
export function effectiveTier(sub: Subscription | null | undefined, now = new Date()): PlanTier {
  if (!sub) return "DECOUVERTE";
  if (sub.status === "TRIALING") return sub.trialEndsAt && sub.trialEndsAt > now ? sub.tier : "DECOUVERTE";
  if (sub.status === "ACTIVE") return !sub.currentPeriodEnd || sub.currentPeriodEnd > now || sub.tier === "DECOUVERTE" ? sub.tier : "DECOUVERTE";
  if (sub.status === "PAST_DUE") return sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() + 7 * 86400000 > now.getTime() ? sub.tier : "DECOUVERTE"; // 7 jours de grâce
  if (sub.status === "CANCELED") return sub.currentPeriodEnd && sub.currentPeriodEnd > now ? sub.tier : "DECOUVERTE";
  return "DECOUVERTE";
}
export function entitlements(sub: Subscription | null | undefined, now = new Date()): Entitlements {
  const tier = effectiveTier(sub, now);
  return { tier, ...E[tier] };
}
export const euro = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
