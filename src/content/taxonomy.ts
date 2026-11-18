// Référentiel pédagogique : catégories, tranches d'âge, indicateurs, badges, défis.
// Les tranches d'âge sont des repères : le moteur tient aussi compte du niveau et du ressenti.

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Premiers Pas Foot";

export const CATEGORIES = [
  { key: "conduite", label: "Conduite de balle", icon: "🏃", color: "#1ca463" },
  { key: "jonglage", label: "Jonglage", icon: "🤹", color: "#f9a826" },
  { key: "controle", label: "Contrôle de balle", icon: "🧲", color: "#3b8fe0" },
  { key: "passes", label: "Passes", icon: "↔️", color: "#0f844f" },
  { key: "precision", label: "Précision", icon: "🎯", color: "#f2674b" },
  { key: "finition", label: "Finition et frappe", icon: "🥅", color: "#d94c31" },
  { key: "dribbles", label: "Dribbles", icon: "🌀", color: "#8b5cf6" },
  { key: "coordination", label: "Coordination", icon: "🪜", color: "#0ea5a4" },
  { key: "equilibre", label: "Équilibre", icon: "🦩", color: "#ec4899" },
  { key: "motricite", label: "Motricité", icon: "🤸", color: "#f59e0b" },
  { key: "vitesse", label: "Vitesse et réactivité", icon: "⚡", color: "#eab308" },
  { key: "agilite", label: "Agilité", icon: "🐆", color: "#fb7185" },
  { key: "vision", label: "Vision et prise d'information", icon: "👀", color: "#6366f1" },
  { key: "creativite", label: "Jeu et créativité", icon: "✨", color: "#a855f7" },
  { key: "confiance", label: "Confiance et concentration", icon: "💪", color: "#14b8a6" },
  { key: "parent-enfant", label: "Jeux parent-enfant", icon: "👨‍👧", color: "#22c55e" },
] as const;
export type CategoryKey = (typeof CATEGORIES)[number]["key"];
export const catLabel = (k: string) => CATEGORIES.find((c) => c.key === k)?.label ?? k;
export const catOf = (k: string) => CATEGORIES.find((c) => c.key === k) ?? CATEGORIES[0];

export const LEVELS = [
  { key: "debutant", label: "Débutant" },
  { key: "intermediaire", label: "Intermédiaire" },
  { key: "confirme", label: "Confirmé" },
] as const;
export const levelRank = (l: string) => Math.max(0, LEVELS.findIndex((x) => x.key === l));

export const GOALS = [
  { key: "decouvrir", label: "Découvrir le football", cats: ["motricite", "conduite", "parent-enfant", "creativite"] },
  { key: "technique", label: "Améliorer sa technique", cats: ["conduite", "controle", "passes", "jonglage", "dribbles"] },
  { key: "confiance", label: "Prendre confiance", cats: ["confiance", "parent-enfant", "creativite", "precision"] },
  { key: "coordination", label: "Améliorer sa coordination", cats: ["coordination", "equilibre", "agilite"] },
  { key: "motricite", label: "Développer sa motricité", cats: ["motricite", "equilibre", "coordination"] },
  { key: "club", label: "Progresser dans son club", cats: ["passes", "controle", "vision", "finition"] },
  { key: "categorie", label: "Préparer une nouvelle catégorie", cats: ["vision", "controle", "vitesse", "passes"] },
  { key: "plaisir", label: "Se faire plaisir", cats: ["creativite", "parent-enfant", "finition", "dribbles"] },
] as const;

export const EQUIPMENT = [
  { key: "ballon", label: "Un ballon" },
  { key: "plots", label: "Plots (ou bouteilles, chaussures…)" },
  { key: "mur", label: "Un mur ou un rebond" },
  { key: "but", label: "Un petit but (ou deux repères)" },
  { key: "cerceau", label: "Cerceau, craie ou ficelle" },
  { key: "echelle", label: "Échelle de rythme (ou traits à la craie)" },
] as const;

// Matériel d'entraînement : le vrai matériel (vendu dans le kit Premiers Pas Foot) est présenté en premier ;
// un remplaçant maison est indiqué pour commencer en attendant de l'avoir.
export type KitItem = { key: string; label: string; icon: string; qty: string; use: string; free: string };
export const KIT: KitItem[] = [
  { key: "ballon", label: "Ballon", icon: "⚽", qty: "1 par enfant", use: "Taille 3 jusqu'à 8-9 ans, taille 4 jusqu'à 12-13 ans environ, taille 5 ensuite.", free: "Pour les tout-petits ou à l'intérieur : un ballon en mousse." },
  { key: "plots", label: "Plots", icon: "🔺", qty: "lot de 6 à 12", use: "Slaloms, portes, zones et repères : le matériel le plus utilisé de la bibliothèque.", free: "Bouteilles vides lestées d'un fond d'eau." },
  { key: "but", label: "Mini-but pliable", icon: "🥅", qty: "1 ou 2", use: "Tirs, finition et petits matchs à la maison.", free: "Deux sacs posés au sol." },
  { key: "cerceau", label: "Cerceaux plats", icon: "⭕", qty: "lot de 4", use: "Cibles au sol, zones d'appui, jeux de précision.", free: "Un cercle tracé à la craie." },
  { key: "echelle", label: "Échelle de rythme", icon: "🪜", qty: "1 (4 à 6 m)", use: "Appuis, coordination et échauffements.", free: "Traits à la craie tous les 40 cm." },
  { key: "corde", label: "Corde à sauter", icon: "🪢", qty: "1", use: "Rythme, appuis légers et coordination bras-jambes.", free: "Pas de corde ? Il mime le geste, le travail est presque le même." },
  { key: "mur", label: "Rebondisseur", icon: "🧱", qty: "1", use: "Renvoie le ballon pour enchaîner les passes et les contrôles seul.", free: "Un mur de garage ou un muret." },
];
export const kitOf = (k: string) => KIT.find((x) => x.key === k);
export const eqLabel = (k: string) => KIT.find((x) => x.key === k)?.label ?? k;

export const PLACES = [
  { key: "jardin", label: "Jardin" },
  { key: "parc", label: "Parc" },
  { key: "synthetique", label: "Terrain synthétique" },
  { key: "interieur", label: "Intérieur adapté" },
] as const;

export const POSITIONS = ["Pas encore de poste", "Gardien", "Défenseur", "Milieu", "Attaquant", "Polyvalent"];

export type AgeBand = {
  key: string; label: string; min: number; max: number; theme: string;
  skills: string[]; priorities: string[]; recommended: CategoryKey[]; avoid: string[];
  sessionMin: [number, number]; // durée raisonnable d'une séance à la maison (minutes)
  maxHomePerWeek: number; // plafond de séances maison hebdomadaires
  methods: string[]; indicators: string[]; recovery: string; parentTips: string[];
};

export const AGE_BANDS: AgeBand[] = [
  {
    key: "4-5", label: "4-5 ans", min: 4, max: 5, theme: "Découverte, plaisir et familiarisation avec le ballon",
    skills: ["Courir, sauter, s'arrêter", "Pousser et arrêter le ballon", "Lancer et attraper", "Se repérer dans l'espace"],
    priorities: ["Le plaisir avant tout", "Bouger de plein de façons différentes", "Un ballon par enfant, tout le temps"],
    recommended: ["motricite", "parent-enfant", "conduite", "equilibre", "creativite"],
    avoid: ["Files d'attente et longues explications", "Répétitions techniques imposées", "Jongles « à compter »", "Tout travail physique ou chronométré contre un autre enfant"],
    sessionMin: [8, 15], maxHomePerWeek: 3,
    methods: ["Raconter une histoire (pirates, animaux, trésor)", "Montrer plutôt qu'expliquer", "Changer de jeu toutes les 3 à 4 minutes"],
    indicators: ["Il veut rejouer", "Il pousse le ballon sans le perdre sur quelques mètres", "Il s'arrête au signal"],
    recovery: "Pauses libres dès qu'il le demande. À cet âge, on s'arrête avant la lassitude.",
    parentTips: ["Jouez avec lui, pas à côté de lui.", "Laissez-le inventer les règles une fois par séance.", "Arrêtez pendant qu'il s'amuse encore : il aura envie de revenir."],
  },
  {
    key: "6-7", label: "6-7 ans", min: 6, max: 7, theme: "Conduite de balle, équilibre, coordination et premières frappes",
    skills: ["Conduire le ballon des deux pieds", "S'arrêter et repartir", "Premières passes courtes", "Premières frappes vers une cible"],
    priorities: ["Beaucoup de touches de balle", "Jeux et défis courts", "Découvrir le pied « faible » sans obligation"],
    recommended: ["conduite", "coordination", "equilibre", "finition", "parent-enfant", "motricite"],
    avoid: ["Séances longues", "Corriger plusieurs choses à la fois", "Comparaisons avec les copains", "Renforcement musculaire"],
    sessionMin: [10, 20], maxHomePerWeek: 3,
    methods: ["Un défi = une consigne", "Compter les réussites, pas les ratés", "Alterner jeu avec ballon et jeu de motricité"],
    indicators: ["Il garde le ballon près de lui en avançant", "Il utilise parfois l'autre pied", "Il vise une cible à 3-4 mètres"],
    recovery: "Au moins un jour sans séance entre deux séances à la maison ; aucune séance les jours d'entraînement en club.",
    parentTips: ["Une seule correction par exercice.", "Félicitez l'essai : « tu as osé avec ton pied gauche ».", "Proposez, n'imposez pas."],
  },
  {
    key: "8-9", label: "8-9 ans", min: 8, max: 9, theme: "Maîtrise technique, passes, dribbles, orientation et perception",
    skills: ["Passe et contrôle des deux pieds", "Dribbles simples (feinte, crochet)", "Lever la tête en conduisant", "Jongles avec rebond puis sans"],
    priorities: ["Âge d'or des apprentissages techniques", "Répéter en s'amusant", "Regarder avant de recevoir"],
    recommended: ["passes", "controle", "dribbles", "conduite", "jonglage", "vision", "coordination"],
    avoid: ["Spécialisation à un poste", "Travail de force ou d'endurance", "Pression sur le résultat"],
    sessionMin: [15, 25], maxHomePerWeek: 3,
    methods: ["Défis mesurables contre soi-même", "Variantes pied faible", "Questions plutôt que consignes : « qu'as-tu vu ? »"],
    indicators: ["Passes au sol précises à 5-8 mètres", "Quelques jongles enchaînés", "Il change de direction ballon au pied"],
    recovery: "Un jour de repos après un match. Maximum trois séances courtes à la maison par semaine.",
    parentTips: ["Demandez-lui de vous expliquer l'exercice : il le retiendra mieux.", "Laissez-le choisir le défi final.", "Notez ses records personnels, jamais ceux des autres."],
  },
  {
    key: "10-11", label: "10-11 ans", min: 10, max: 11, theme: "Précision, vitesse d'exécution, contrôle orienté et prise d'information",
    skills: ["Contrôle orienté", "Passes précises en mouvement", "Changements de direction rapides", "Prise d'information avant de recevoir"],
    priorities: ["Qualité avant vitesse, puis vitesse", "Les deux pieds", "Comprendre pourquoi on fait un geste"],
    recommended: ["controle", "precision", "passes", "vision", "agilite", "dribbles", "finition"],
    avoid: ["Musculation avec charges", "Volume trop élevé en plus du club", "Critiques après les matchs"],
    sessionMin: [15, 30], maxHomePerWeek: 3,
    methods: ["Enchaînements de deux ou trois gestes", "Contraintes ludiques (temps, zones, pied)", "Auto-évaluation simple après l'exercice"],
    indicators: ["Contrôle qui prépare le geste suivant", "Précision de passe régulière", "Il regarde autour de lui avant de recevoir"],
    recovery: "Lendemain de match : repos ou jeu libre. Écouter les douleurs de croissance (talons, genoux) et s'arrêter si elles apparaissent.",
    parentTips: ["Parlez du plaisir et de l'effort avant de parler du score.", "Laissez l'éducateur du club gérer la tactique.", "Proposez-lui de fixer lui-même son objectif du mois."],
  },
  {
    key: "12-13", label: "12-13 ans", min: 12, max: 13, theme: "Technique sous pression, coordination avancée et compréhension du jeu",
    skills: ["Technique avec peu de temps et d'espace", "Jeu sans ballon", "Coordination pendant la croissance", "Premiers gestes spécifiques au poste"],
    priorities: ["Adapter la charge à la poussée de croissance", "Garder le plaisir malgré les enjeux", "Coordination et appuis"],
    recommended: ["controle", "vision", "coordination", "agilite", "passes", "dribbles", "confiance"],
    avoid: ["Charges lourdes et répétitions de frappes en force", "Ajouter du volume pendant un pic de croissance", "Parler de « carrière »"],
    sessionMin: [20, 30], maxHomePerWeek: 3,
    methods: ["Exercices avec opposition légère ou contrainte de temps", "L'enfant choisit une partie de la séance", "Bilan en deux questions"],
    indicators: ["Gestes propres même quand ça va vite", "Il propose des solutions", "Coordination stable malgré la croissance"],
    recovery: "Pendant une poussée de croissance, une baisse passagère de coordination est fréquente : réduire le volume, garder le ballon et le plaisir.",
    parentTips: ["Votre rôle devient celui de partenaire, plus celui de guide.", "Respectez ses envies d'autonomie.", "En cas de douleur persistante, on arrête et on consulte."],
  },
  {
    key: "14-15", label: "14-15 ans", min: 14, max: 15, theme: "Perfectionnement technique, prise de décision et autonomie",
    skills: ["Technique à vitesse de jeu", "Décider vite et bien", "Travail spécifique au poste", "S'organiser seul"],
    priorities: ["Autonomie dans l'entraînement", "Régularité plutôt que quantité", "Sommeil et récupération"],
    recommended: ["vision", "finition", "controle", "passes", "agilite", "vitesse", "confiance"],
    avoid: ["Empiler séances maison, club et sélection", "Préparation physique non encadrée", "Régimes ou objectifs de poids"],
    sessionMin: [20, 35], maxHomePerWeek: 3,
    methods: ["Le jeune construit sa séance avec l'application", "Objectifs personnels mesurables", "Vidéo de soi pour s'auto-corriger (privée)"],
    indicators: ["Régularité technique", "Capacité à s'auto-évaluer", "Constance dans l'envie"],
    recovery: "Au moins un jour complet sans sport par semaine. Sommeil suffisant : c'est là que l'on progresse.",
    parentTips: ["Demandez « de quoi as-tu besoin ? » plutôt que « qu'as-tu fait ? ».", "Soutenez sans piloter.", "L'école et les amis comptent autant que le football."],
  },
  {
    key: "16-17", label: "16-18 ans", min: 16, max: 18, theme: "Optimisation individuelle, régularité et préparation adaptée",
    skills: ["Points forts à affirmer", "Points faibles à réduire", "Gestion de la charge", "Routines personnelles"],
    priorities: ["Autonomie complète", "Équilibre de vie", "Prévention : appuis, mobilité, récupération"],
    recommended: ["finition", "vision", "vitesse", "agilite", "controle", "confiance", "coordination"],
    avoid: ["Surcharge cachée (séances non déclarées à l'éducateur)", "Compléments ou régimes sans avis médical", "Tout miser sur le football"],
    sessionMin: [20, 40], maxHomePerWeek: 3,
    methods: ["Routines courtes et régulières", "Travail ciblé décidé par le jeune", "Bilan mensuel partagé s'il le souhaite"],
    indicators: ["Régularité", "Qualité d'exécution sous fatigue légère", "Capacité à dire stop"],
    recovery: "La préparation physique relève d'un encadrement qualifié. Ici : technique, coordination, mobilité, repos.",
    parentTips: ["Vous êtes son premier supporter, pas son agent.", "Laissez-le gérer sa relation avec l'éducateur.", "Valorisez son parcours, quel que soit le niveau atteint."],
  },
];

export function ageFromBirth(birth: Date, at = new Date()): number {
  let a = at.getFullYear() - birth.getFullYear();
  const m = at.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < birth.getDate())) a--;
  return a;
}
export function bandForAge(age: number): AgeBand {
  if (age <= 5) return AGE_BANDS[0];
  return AGE_BANDS.find((b) => age >= b.min && age <= b.max) ?? AGE_BANDS[AGE_BANDS.length - 1];
}
export function categoryLabelFFF(age: number): string {
  if (age <= 5) return "U6";
  if (age >= 18) return "Senior";
  return `U${age + 1}`;
}

// Indicateurs du carnet de progression. `kind` : count (nombre), pct (réussites sur 10), score (ressenti 1 à 5), time (secondes, plus bas = mieux).
export const METRICS = [
  { key: "jongles", label: "Jongles enchaînés", unit: "jongles", kind: "count", cat: "jonglage", how: "Meilleur enchaînement sur 3 essais." },
  { key: "passes", label: "Précision des passes", unit: "/10", kind: "pct", cat: "passes", how: "10 passes dans une porte de 1 m, à une distance adaptée à l'âge." },
  { key: "conduite", label: "Qualité de conduite", unit: "/5", kind: "score", cat: "conduite", how: "Votre ressenti : le ballon reste-t-il près du pied ?" },
  { key: "dribbles", label: "Réussite des dribbles", unit: "/10", kind: "pct", cat: "dribbles", how: "10 passages face à un plot ou à vous : combien réussis ?" },
  { key: "frappes", label: "Précision des frappes", unit: "/10", kind: "pct", cat: "finition", how: "10 frappes vers une cible." },
  { key: "coordination", label: "Coordination", unit: "/5", kind: "score", cat: "coordination", how: "Fluidité des appuis sur un parcours simple." },
  { key: "equilibre", label: "Équilibre", unit: "s", kind: "count", cat: "equilibre", how: "Secondes sur un pied (meilleur des deux), plafonné à 60." },
  { key: "controle", label: "Contrôle", unit: "/10", kind: "pct", cat: "controle", how: "10 ballons reçus : combien arrêtés en une touche près du pied ?" },
  { key: "slalom", label: "Parcours slalom", unit: "s", kind: "time", cat: "conduite", how: "Temps sur un slalom de 6 plots aller-retour. On se compare uniquement à soi-même." },
  { key: "confiance", label: "Confiance", unit: "/5", kind: "score", cat: "confiance", how: "Ose-t-il essayer, se tromper et recommencer ?" },
  { key: "motivation", label: "Motivation", unit: "/5", kind: "score", cat: "confiance", how: "Son envie de jouer cette semaine." },
] as const;
export const metricOf = (k: string) => METRICS.find((m) => m.key === k);

// Badges : valorisent l'effort, la régularité, la créativité et la progression — jamais uniquement le résultat.
export const BADGES = [
  { key: "premier-entrainement", label: "Premier entraînement", icon: "🌱", desc: "La toute première séance ensemble." },
  { key: "5-seances", label: "Bien lancé", icon: "🚀", desc: "5 séances réalisées." },
  { key: "10-seances", label: "10 séances réalisées", icon: "🔟", desc: "La régularité paie." },
  { key: "25-seances", label: "Habitué du terrain", icon: "🏟️", desc: "25 séances réalisées." },
  { key: "50-seances", label: "Passionné", icon: "🔥", desc: "50 séances réalisées." },
  { key: "roi-jonglage", label: "Roi du jonglage", icon: "🤹", desc: "Record personnel de jongles battu trois fois." },
  { key: "champion-precision", label: "Champion de la précision", icon: "🎯", desc: "Progression mesurée en passes ou en frappes." },
  { key: "perseverance", label: "Persévérance", icon: "🧗", desc: "A recommencé un exercice jugé difficile." },
  { key: "esprit-equipe", label: "Esprit d'équipe", icon: "🤝", desc: "5 jeux réalisés avec un parent, un frère ou une sœur." },
  { key: "progression-mois", label: "Progression du mois", icon: "📈", desc: "Un indicateur a progressé ce mois-ci." },
  { key: "deux-pieds", label: "Les deux pieds", icon: "👣", desc: "A essayé 5 exercices avec son pied faible." },
  { key: "createur", label: "Créateur", icon: "✨", desc: "A inventé sa propre règle ou son propre geste." },
  { key: "bien-repose", label: "Bien reposé", icon: "😴", desc: "A respecté un jour de repos conseillé." },
  { key: "explorateur", label: "Explorateur", icon: "🧭", desc: "A découvert 8 catégories d'exercices différentes." },
  { key: "defi-semaine", label: "Défi de la semaine", icon: "⭐", desc: "A tenté un défi hebdomadaire." },
  { key: "regulier-4", label: "Quatre semaines de suite", icon: "📅", desc: "Au moins une séance par semaine pendant quatre semaines." },
  { key: "premier-souvenir", label: "Premier souvenir", icon: "📸", desc: "Un souvenir ajouté à l'album." },
] as const;
export const badgeOf = (k: string) => BADGES.find((b) => b.key === k);

// Mini-évaluations ludiques : cibles progressives par tranche d'âge. 3 étoiles possibles : essayé / progressé / objectif atteint.
export type Challenge = { key: string; label: string; metric: string; how: string; targets: Record<string, number>; lowerIsBetter?: boolean };
export const EVALUATIONS: Challenge[] = [
  { key: "eval-jongles", label: "Défi jongles", metric: "jongles", how: "3 essais, on garde le meilleur. Rebond autorisé jusqu'à 9 ans.", targets: { "4-5": 1, "6-7": 3, "8-9": 5, "10-11": 15, "12-13": 30, "14-15": 50, "16-17": 80 } },
  { key: "eval-passes", label: "10 passes dans la porte", metric: "passes", how: "Porte de 1 m. Distance : 3 m (4-7 ans), 6 m (8-11 ans), 10 m (12 ans et plus).", targets: { "4-5": 3, "6-7": 5, "8-9": 6, "10-11": 7, "12-13": 8, "14-15": 8, "16-17": 9 } },
  { key: "eval-slalom", label: "Parcours de slalom", metric: "slalom", how: "6 plots espacés de 1,5 m, aller-retour ballon au pied. On cherche à battre son propre temps.", targets: { "4-5": 40, "6-7": 30, "8-9": 24, "10-11": 20, "12-13": 17, "14-15": 15, "16-17": 14 }, lowerIsBetter: true },
  { key: "eval-controles", label: "Contrôles orientés", metric: "controle", how: "10 ballons envoyés par le parent : contrôle qui emmène le ballon vers une porte sur le côté.", targets: { "4-5": 2, "6-7": 4, "8-9": 5, "10-11": 7, "12-13": 8, "14-15": 9, "16-17": 9 } },
  { key: "eval-frappes", label: "Touche la cible", metric: "frappes", how: "10 frappes vers une cible (carton, cerceau, coin de but). Distance adaptée.", targets: { "4-5": 2, "6-7": 4, "8-9": 5, "10-11": 6, "12-13": 6, "14-15": 7, "16-17": 7 } },
  { key: "eval-equilibre", label: "Le flamant rose", metric: "equilibre", how: "Tenir sur un pied, bras libres. Meilleur des deux pieds.", targets: { "4-5": 5, "6-7": 10, "8-9": 20, "10-11": 30, "12-13": 40, "14-15": 45, "16-17": 60 } },
  { key: "eval-dribbles", label: "Passe le gardien du trésor", metric: "dribbles", how: "10 duels face au parent (défense douce). Combien de passages réussis ?", targets: { "4-5": 3, "6-7": 4, "8-9": 5, "10-11": 6, "12-13": 6, "14-15": 7, "16-17": 7 } },
];

// Défis du jour (5 minutes) : une petite habitude quotidienne, sans obligation.
export const DAILY_CHALLENGES = [
  { key: "d-touches", label: "50 touches de balle", text: "Semelle, intérieur, extérieur : 50 petites touches sur place, en musique si tu veux.", minAge: 4 },
  { key: "d-pied-faible", label: "L'autre pied", text: "10 passes contre un mur ou vers un parent, uniquement avec le pied que tu utilises le moins.", minAge: 6 },
  { key: "d-jongles", label: "3 essais de jongles", text: "Trois essais, pas un de plus. Note ton meilleur si tu en as envie.", minAge: 6 },
  { key: "d-equilibre", label: "Flamant rose", text: "Tiens sur un pied pendant que tu te brosses les dents. Change de pied à mi-chemin.", minAge: 4 },
  { key: "d-geste", label: "Invente un geste", text: "Invente une feinte et donne-lui un nom. Montre-la à quelqu'un de la famille.", minAge: 5 },
  { key: "d-semelle", label: "La semelle magique", text: "Fais rouler le ballon sous ta semelle : avant-arrière puis droite-gauche, 30 secondes par pied.", minAge: 4 },
  { key: "d-cible", label: "5 tirs sur la cible", text: "Choisis une cible (un carton, un arbre). 5 tirs en douceur. Combien la touchent ?", minAge: 5 },
  { key: "d-regarde", label: "Tête levée", text: "Conduis le ballon 1 minute en annonçant à voix haute ce que tu vois autour de toi.", minAge: 7 },
  { key: "d-mur", label: "20 passes au mur", text: "20 passes contre un mur en deux touches : je contrôle, je passe.", minAge: 7 },
  { key: "d-repos", label: "Jour sans ballon", text: "Aujourd'hui, pas de ballon : on raconte son plus beau souvenir de foot à table.", minAge: 4 },
  { key: "d-souvenir", label: "Photo souvenir", text: "Prends une photo ou une vidéo d'un geste dont tu es fier pour ton album.", minAge: 4 },
  { key: "d-merci", label: "Le bon coéquipier", text: "Pense à un coéquipier qui a bien joué récemment et dis-le-lui la prochaine fois.", minAge: 7 },
] as const;

export const WEEKLY_CHALLENGES = [
  { key: "w-deux-pieds", label: "Semaine des deux pieds", text: "Dans chaque séance, refais un exercice avec le pied faible." },
  { key: "w-record", label: "Bats ton record", text: "Choisis un indicateur et essaie de battre ton propre record une fois cette semaine." },
  { key: "w-creatif", label: "Semaine créative", text: "Invente un jeu avec ton parent et note ses règles dans l'album." },
  { key: "w-regard", label: "Tête levée", text: "Pendant chaque exercice de conduite, lève la tête au moins trois fois." },
  { key: "w-famille", label: "Tous ensemble", text: "Joue une fois avec un frère, une sœur, un cousin ou un ami." },
  { key: "w-calme", label: "Champion du calme", text: "Après chaque séance, trois grandes respirations et un mot sur ce que tu as aimé." },
] as const;

export const MONTHLY_CHALLENGES = [
  { key: "m-regularite", label: "Le rendez-vous", text: "Quatre semaines avec au moins une séance. Peu importe laquelle." },
  { key: "m-progres", label: "Un progrès mesuré", text: "Refais une mini-évaluation en fin de mois et compare-la à toi-même." },
  { key: "m-decouverte", label: "Trois nouveautés", text: "Essaie trois exercices que tu n'as jamais faits." },
] as const;

export const FORMATS: Record<string, { label: string; desc: string }> = {
  decouverte: { label: "Séance découverte", desc: "Pour faire connaissance avec le ballon, sans enjeu." },
  technique: { label: "Séance technique", desc: "Un thème technique travaillé sous plusieurs formes." },
  coordination: { label: "Séance coordination", desc: "Appuis, équilibre et rythme, avec et sans ballon." },
  plaisir: { label: "Séance plaisir", desc: "Jeux, défis et créativité." },
  "parent-enfant": { label: "Séance parent-enfant", desc: "Vous jouez ensemble du début à la fin." },
  courte: { label: "Séance courte (10-15 min)", desc: "L'essentiel quand le temps manque." },
  perfectionnement: { label: "Séance de perfectionnement", desc: "Enchaînements adaptés à l'âge et au niveau." },
  douce: { label: "Séance douce", desc: "Récupération active : ballon, calme et équilibre." },
};

export const PAIN_AREAS = [
  { key: "pied", label: "Pied / talon" },
  { key: "cheville", label: "Cheville" },
  { key: "genou", label: "Genou" },
  { key: "jambe", label: "Cuisse / mollet" },
  { key: "hanche", label: "Hanche / aine" },
  { key: "dos", label: "Dos" },
  { key: "autre", label: "Autre" },
];

export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
export function weekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const w = Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(w).padStart(2, "0")}`;
}
export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
