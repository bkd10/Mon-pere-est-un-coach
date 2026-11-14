// Offres, droits d'accès et valeurs par défaut (les tarifs sont modifiables depuis l'administration).
import type { PlanTier, Subscription } from "@prisma/client";

export const DEFAULT_PLANS = [
  { tier: "DECOUVERTE" as PlanTier, name: "Découverte", tagline: "Pour essayer la méthode, sans carte bancaire.", monthlyCents: 0, yearlyCents: 0, trialDays: 0, maxChildren: 1, sort: 0,
    features: ["1 profil enfant", "12 exercices gratuits avec schémas animés", "1 séance guidée par semaine", "Défi du jour", "Guides parents essentiels", "3 questions au coach IA"] },
  { tier: "ESSENTIEL" as PlanTier, name: "Essentiel", tagline: "Le programme complet pour un enfant.", monthlyCents: 399, yearlyCents: 3590, trialDays: 7, maxChildren: 1, sort: 1,
    features: ["Parcours personnalisé par âge et par niveau", "Bibliothèque complète d'exercices", "Séances guidées illimitées", "Calendrier intelligent", "Carnet de progression et mini-évaluations", "Académie des parents complète", "Album de souvenirs (20 photos et vidéos)", "10 questions au coach IA par mois"] },
  { tier: "PREMIUM" as PlanTier, name: "Premium", tagline: "Le coach IA et des séances ajustées après chaque retour, jusqu'à 3 enfants.", monthlyCents: 699, yearlyCents: 5990, trialDays: 7, maxChildren: 3, sort: 2,
    features: ["Tout Essentiel", "Coach IA personnalisé, sans limite", "Adaptation fine des séances après chaque retour", "Bilans mensuels et bilan de fin de saison rédigés", "Jusqu'à 3 enfants", "Album de souvenirs étendu (300 médias)", "Passeport football"] },
  { tier: "FAMILLE" as PlanTier, name: "Famille", tagline: "Pour les grandes fratries et les familles recomposées.", monthlyCents: 999, yearlyCents: 8990, trialDays: 7, maxChildren: 6, sort: 3,
    features: ["Tout Premium", "Jusqu'à 6 enfants", "Mode frères et sœurs : jeux communs à plusieurs âges", "Album de souvenirs familial (1 000 médias)"] },
];

export type Entitlements = {
  tier: PlanTier; maxChildren: number; fullLibrary: boolean; sessionsPerWeek: number; calendar: boolean; progression: boolean; allGuides: boolean;
  fineAdaptation: boolean; aiReports: boolean; coachQuota: number; mediaQuota: number; siblings: boolean; passport: boolean;
};
const E: Record<PlanTier, Omit<Entitlements, "tier">> = {
  DECOUVERTE: { maxChildren: 1, fullLibrary: false, sessionsPerWeek: 1, calendar: false, progression: false, allGuides: false, fineAdaptation: false, aiReports: false, coachQuota: 3, mediaQuota: 3, siblings: false, passport: false },
  ESSENTIEL: { maxChildren: 1, fullLibrary: true, sessionsPerWeek: 99, calendar: true, progression: true, allGuides: true, fineAdaptation: false, aiReports: false, coachQuota: 10, mediaQuota: 20, siblings: false, passport: false },
  PREMIUM: { maxChildren: 3, fullLibrary: true, sessionsPerWeek: 99, calendar: true, progression: true, allGuides: true, fineAdaptation: true, aiReports: true, coachQuota: 300, mediaQuota: 300, siblings: false, passport: true },
  FAMILLE: { maxChildren: 6, fullLibrary: true, sessionsPerWeek: 99, calendar: true, progression: true, allGuides: true, fineAdaptation: true, aiReports: true, coachQuota: 300, mediaQuota: 1000, siblings: true, passport: true },
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
