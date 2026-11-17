// Interrupteurs de la v1. Les fonctions désactivées restent dans le code et se réactivent par variable d'environnement.
const on = (k: string) => process.env[k] === "1" || process.env.FEATURE_ALL === "1";
// Ventes ouvertes seulement quand un médiateur de la consommation est renseigné (obligatoire pour vendre, art. L612-1).
// Avant cela, c'est la phase de lancement : tout est offert, rien ne peut être acheté. DEMO_SALES=1 ouvre les ventes en démonstration (tests).
export const salesOpen = () => Boolean(process.env.LEGAL_MEDIATOR_NAME?.trim() && process.env.LEGAL_MEDIATOR_URL?.trim()) || process.env.DEMO_SALES === "1";
export const FEATURES = {
  get coach() { return on("FEATURE_COACH"); }, // coach conversationnel IA
  get health() { return on("FEATURE_HEALTH"); }, // suivi fatigue/douleur et carnet de santé (données sensibles)
  get uploads() { return on("FEATURE_UPLOADS"); }, // photos et vidéos dans l'album (nécessite un disque persistant ou un stockage objet)
  get familyVideos() { return on("FEATURE_FAMILY_VIDEOS"); }, // partage de vidéos entre familles
};
