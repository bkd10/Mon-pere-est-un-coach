// Interrupteurs de la v1. Les fonctions désactivées restent dans le code et se réactivent par variable d'environnement.
const on = (k: string) => process.env[k] === "1" || process.env.FEATURE_ALL === "1";
export const FEATURES = {
  get coach() { return on("FEATURE_COACH"); }, // coach conversationnel IA
  get health() { return on("FEATURE_HEALTH"); }, // suivi fatigue/douleur et carnet de santé (données sensibles)
  get familyVideos() { return on("FEATURE_FAMILY_VIDEOS"); }, // partage de vidéos entre familles
};
