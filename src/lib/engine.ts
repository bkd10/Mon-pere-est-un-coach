// Moteur de personnalisation — fonctions pures, testables, sans IA générative.
// Il SÉLECTIONNE des exercices dans la bibliothèque de fiches, applique des règles de sécurité, puis explique ses choix.
// Principe directeur : il ne cherche jamais à augmenter le temps d'entraînement. Repos, plaisir et équilibre sont des objectifs.
import { AGE_BANDS, bandForAge, catLabel, FORMATS, GOALS, levelRank, type AgeBand } from "@/content/taxonomy";

export type LibExercise = {
  slug: string; name: string; category: string; ageMin: number; ageMax: number; level: string; difficulty: number; durationMin: number;
  equipment: string[]; space: string; indoorOk: boolean; parentRole: string; intensity: number; bodyAreas: string[]; recoverySec: number; metricKey?: string | null; isFree?: boolean;
  family?: string; isBase?: boolean; // famille = exercice de base ; une séance ne contient jamais deux fiches de la même famille
};
export type Profile = {
  age: number; level: string; goals: string[]; minutesAvailable: number; homeSessionsPerWeek: number; clubTrainingsPerWeek: number;
  clubDays: number[]; matchDay: number | null; equipment: string[]; places: string[]; modes: { vacances?: boolean; petitEspace?: boolean; sansMateriel?: boolean };
};
export type Feedback = { date: string; enjoyment: number; energy: number; motivation: number; difficulty: string; pain: boolean; painArea?: string | null; wantedMore: boolean; confidence: number; dislikedSlug?: string | null; likedSlug?: string | null; mainCategory?: string };
export type History = { feedback: Feedback[]; recentSlugs: string[]; doneCount: number; lastSleepH?: number | null; freeOnly?: boolean; fineAdaptation?: boolean };
export type RuleSet = Record<string, { enabled: boolean; params: Record<string, number> }>;
export type Block = { phase: "accueil" | "echauffement" | "technique" | "defi" | "calme" | "discussion"; title: string; minutes: number; exerciseSlug?: string; text?: string; restSec?: number; variant?: "easy" | "medium" | "hard" };
export type SessionPlan = { format: string; title: string; objective: string; durationMin: number; blocks: Block[]; parentTips: string[]; equipment: string[]; explanation: string[]; rulesApplied: string[]; mainCategory: string };

// Règles par défaut. `locked` = règle de sécurité : paramétrable mais non désactivable depuis l'administration.
export const DEFAULT_RULES = [
  { key: "douleur", label: "Douleur signalée", locked: true, description: "Suspend les exercices sollicitant la zone douloureuse, propose une séance douce et rappelle de consulter si la douleur persiste.", params: { suspendDays: 10 } },
  { key: "charge-hebdo", label: "Plafond de charge hebdomadaire", locked: true, description: "Limite le nombre de rendez-vous sportifs par semaine (club, match et maison) selon l'âge.", params: { max4to7: 4, max8to11: 5, max12plus: 6 } },
  { key: "recuperation-match", label: "Récupération autour des matchs", locked: true, description: "Aucune séance à la maison le jour du match ni le lendemain ; pas de séance les jours d'entraînement en club.", params: { restDaysAfterMatch: 1 } },
  { key: "duree-age", label: "Durée maximale par âge", locked: true, description: "La durée d'une séance ne dépasse jamais le repère de la tranche d'âge ni le temps déclaré par le parent.", params: {} },
  { key: "fatigue-forte", label: "Forte fatigue", locked: true, description: "Après une séance vécue « très fatigué » : séance douce et raccourcie ; deux fois de suite : jour de repos.", params: { durationPct: 60, restAfterConsecutive: 2 } },
  { key: "fatigue-legere", label: "Fatigue légère", locked: false, description: "Après une séance vécue « un peu fatigué » : durée réduite et intensité modérée.", params: { durationPct: 85 } },
  { key: "sommeil", label: "Sommeil insuffisant déclaré", locked: false, description: "Si le dernier sommeil déclaré est court, la séance est allégée.", params: { minHoursUnder12: 9, minHours12plus: 8, durationPct: 75 } },
  { key: "plaisir-faible", label: "Séance peu appréciée", locked: false, description: "Remplace l'exercice non apprécié par un autre du même objectif et oriente la séance suivante vers le jeu.", params: {} },
  { key: "motivation-faible", label: "Motivation en baisse", locked: false, description: "Deux séances « peu motivé » : une séance de moins par semaine, format plaisir, l'enfant choisit un exercice.", params: { consecutive: 2 } },
  { key: "confiance-faible", label: "Manque de confiance", locked: false, description: "Défis plus accessibles, variantes faciles, un exercice de confiance ajouté. Aucune comparaison.", params: {} },
  { key: "trop-facile", label: "Exercices jugés trop faciles", locked: false, description: "Après deux séances « trop faciles », une seule catégorie progresse d'un cran — jamais toutes à la fois.", params: { consecutive: 2 } },
  { key: "trop-difficile", label: "Exercices jugés trop difficiles", locked: false, description: "Difficulté abaissée d'un cran et variantes faciles proposées.", params: {} },
  { key: "pas-de-surenchere", label: "Pas de surenchère", locked: true, description: "« Il voulait continuer » n'allonge pas les séances : on garde l'envie pour la prochaine fois.", params: {} },
  { key: "vacances", label: "Mode vacances", locked: false, description: "Séances courtes et ludiques, deux par semaine au maximum.", params: { maxPerWeek: 2, maxMinutes: 15 } },
] as const;

export function rulesFromDefaults(): RuleSet {
  return Object.fromEntries(DEFAULT_RULES.map((r) => [r.key, { enabled: true, params: { ...r.params } as Record<string, number> }]));
}
const on = (rules: RuleSet, k: string) => rules[k]?.enabled !== false;
const p = (rules: RuleSet, k: string, name: string, dflt: number) => rules[k]?.params?.[name] ?? dflt;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

export function weeklyCap(age: number, rules: RuleSet): number {
  if (age <= 7) return p(rules, "charge-hebdo", "max4to7", 4);
  if (age <= 11) return p(rules, "charge-hebdo", "max8to11", 5);
  return p(rules, "charge-hebdo", "max12plus", 6);
}

// Nombre de séances maison autorisées cette semaine, avec l'explication.
export function allowedHomeSessions(profile: Profile, history: History, rules: RuleSet): { count: number; reasons: string[] } {
  const band = bandForAge(profile.age);
  const reasons: string[] = [];
  let n = Math.min(profile.homeSessionsPerWeek, band.maxHomePerWeek);
  if (n < profile.homeSessionsPerWeek) reasons.push(`À ${profile.age} ans, nous conseillons au maximum ${band.maxHomePerWeek} séances à la maison par semaine.`);
  const clubLoad = profile.clubTrainingsPerWeek + (profile.matchDay !== null ? 1 : 0);
  const cap = weeklyCap(profile.age, rules) - clubLoad;
  if (n > cap) {
    n = Math.max(0, cap);
    reasons.push(`Avec ${profile.clubTrainingsPerWeek} entraînement(s) en club${profile.matchDay !== null ? " et un match" : ""}, la semaine est déjà bien remplie : nous limitons les séances à la maison à ${n}.`);
  }
  if (profile.modes.vacances && on(rules, "vacances")) {
    const m = p(rules, "vacances", "maxPerWeek", 2);
    if (n > m) n = m;
    reasons.push("Mode vacances : quelques séances courtes pour le plaisir, rien de plus.");
  }
  const last2 = history.feedback.slice(0, p(rules, "motivation-faible", "consecutive", 2));
  if (on(rules, "motivation-faible") && last2.length >= 2 && last2.every((f) => f.motivation === 1) && n > 1) {
    n -= 1;
    reasons.push("Sa motivation était basse sur les deux dernières séances : nous retirons une séance cette semaine pour lui laisser de l'air.");
  }
  return { count: n, reasons };
}

// Jours possibles pour une séance maison (0 = dimanche … 6 = samedi).
export function dayAllowed(dow: number, profile: Profile, rules: RuleSet): { ok: boolean; reason?: string } {
  if (profile.modes.vacances) return { ok: true };
  if (profile.clubDays.includes(dow)) return { ok: false, reason: "C'est un jour d'entraînement en club." };
  if (profile.matchDay !== null) {
    if (dow === profile.matchDay) return { ok: false, reason: "C'est le jour du match." };
    const rest = p(rules, "recuperation-match", "restDaysAfterMatch", 1);
    for (let i = 1; i <= rest; i++) if (dow === (profile.matchDay + i) % 7) return { ok: false, reason: "Lendemain de match : le corps récupère, c'est là qu'il progresse." };
  }
  return { ok: true };
}

export type DayPlan = { date: string; kind: "session" | "rest" | "club" | "match"; reason?: string };
const toDate = (iso: string) => new Date(iso + "T12:00:00Z");
const addDays = (iso: string, n: number) => { const d = toDate(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// Répartit les séances sur 7 jours à partir de `startIso`, en espaçant d'au moins un jour.
export function planWeek(profile: Profile, history: History, rules: RuleSet, startIso: string, blocked: Record<string, string> = {}, taken: string[] = []): { days: DayPlan[]; reasons: string[] } {
  const { count, reasons } = allowedHomeSessions(profile, history, rules);
  const days: DayPlan[] = [];
  const candidates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const iso = addDays(startIso, i);
    const dow = toDate(iso).getUTCDay();
    if (blocked[iso]) { days.push({ date: iso, kind: "rest", reason: blocked[iso] }); continue; }
    if (!profile.modes.vacances && profile.clubDays.includes(dow)) { days.push({ date: iso, kind: "club" }); continue; }
    if (!profile.modes.vacances && profile.matchDay === dow) { days.push({ date: iso, kind: "match" }); continue; }
    const a = dayAllowed(dow, profile, rules);
    if (!a.ok) { days.push({ date: iso, kind: "rest", reason: a.reason }); continue; }
    candidates.push(iso);
    days.push({ date: iso, kind: "rest" });
  }
  // Repos forcé après deux séances « très fatigué ».
  const k = p(rules, "fatigue-forte", "restAfterConsecutive", 2);
  const tired = history.feedback.slice(0, k);
  let skipFirst = 0;
  if (tired.length >= k && tired.every((f) => f.energy === 1)) {
    skipFirst = 2;
    reasons.push("Il était très fatigué lors des deux dernières séances : nous commençons par deux jours de repos.");
  }
  const chosen: string[] = [...taken];
  const need = Math.max(0, count - taken.length);
  const pool = candidates.filter((c) => !taken.includes(c) && (toDate(c).getTime() - toDate(startIso).getTime()) / 86400000 >= skipFirst);
  for (let s = 0; s < need; s++) {
    // Choisit le jour qui maximise l'écart avec les séances déjà placées.
    let best: string | null = null, bestGap = -1;
    for (const c of pool) {
      if (chosen.includes(c)) continue;
      const gap = chosen.length ? Math.min(...chosen.map((x) => Math.abs(toDate(x).getTime() - toDate(c).getTime()) / 86400000)) : 7 - pool.indexOf(c) * 0.1;
      if (gap > bestGap) { bestGap = gap; best = c; }
    }
    if (!best || (chosen.length && bestGap < 2)) break;
    chosen.push(best);
  }
  for (const d of days) if (chosen.includes(d.date) && !taken.includes(d.date)) d.kind = "session";
  return { days, reasons };
}

// Déplacement d'une séance : vérifie les règles de récupération et propose la date valide la plus proche.
export function validateMove(targetIso: string, profile: Profile, rules: RuleSet, otherSessionDates: string[], blocked: Record<string, string> = {}): { ok: boolean; date: string; reason?: string } {
  const check = (iso: string): string | null => {
    if (blocked[iso]) return blocked[iso];
    const a = dayAllowed(toDate(iso).getUTCDay(), profile, rules);
    if (!a.ok) return a.reason!;
    if (otherSessionDates.some((o) => Math.abs(toDate(o).getTime() - toDate(iso).getTime()) < 86400000 * 1.5 && o !== iso)) return "Une autre séance est prévue la veille ou le lendemain : on laisse un jour de récupération entre deux séances.";
    if (otherSessionDates.includes(iso)) return "Une séance est déjà prévue ce jour-là.";
    return null;
  };
  const why = check(targetIso);
  if (!why) return { ok: true, date: targetIso };
  for (const delta of [1, -1, 2, -2, 3, -3, 4]) {
    const alt = addDays(targetIso, delta);
    if (!check(alt)) return { ok: false, date: alt, reason: why };
  }
  return { ok: false, date: targetIso, reason: why + " Aucune autre date proche ne convient : la séance est annulée sans conséquence." };
}

type Adapt = { durationPct: number; maxIntensity: number; diffShift: Record<string, number>; globalDiffShift: number; forceFormat?: string; excludeAreas: string[]; excludeSlugs: string[]; preferSlugs: string[]; addConfidence: boolean; variant: "easy" | "medium" | "hard"; explanation: string[]; rules: string[]; restAdvised: boolean };

// Traduit les retours des parents en ajustements, chacun accompagné de son explication.
export function adaptations(profile: Profile, history: History, rules: RuleSet, todayIso: string): Adapt {
  const a: Adapt = { durationPct: 100, maxIntensity: 3, diffShift: {}, globalDiffShift: 0, excludeAreas: [], excludeSlugs: [], preferSlugs: [], addConfidence: false, variant: "medium", explanation: [], rules: [], restAdvised: false };
  const fb = history.feedback;
  const last = fb[0];
  const use = (k: string, text: string) => { a.rules.push(k); a.explanation.push(text); };

  // Douleur : règle prioritaire.
  const suspend = p(rules, "douleur", "suspendDays", 10);
  for (const f of fb) {
    if (!f.pain) continue;
    const days = (toDate(todayIso).getTime() - toDate(f.date.slice(0, 10)).getTime()) / 86400000;
    if (days > suspend) continue;
    const area = f.painArea || "autre";
    if (!a.excludeAreas.includes(area)) a.excludeAreas.push(area);
  }
  if (a.excludeAreas.length) {
    a.forceFormat = "douce"; a.maxIntensity = 1; a.durationPct = Math.min(a.durationPct, 60);
    use("douleur", `Une douleur a été signalée récemment : nous avons retiré les exercices qui sollicitent cette zone et prévu une séance douce. Ne faites pas poursuivre une activité douloureuse. Si la douleur persiste, revient ou gêne votre enfant au quotidien, demandez l'avis d'un médecin.`);
  }
  if (last) {
    if (last.energy === 1) {
      a.durationPct = Math.min(a.durationPct, p(rules, "fatigue-forte", "durationPct", 60)); a.maxIntensity = 1; a.forceFormat = a.forceFormat ?? "douce"; a.restAdvised = true;
      use("fatigue-forte", "Il était très fatigué la dernière fois : la prochaine séance est plus courte et très calme. Un vrai jour de repos avant serait encore mieux.");
    } else if (last.energy === 2 && on(rules, "fatigue-legere")) {
      a.durationPct = Math.min(a.durationPct, p(rules, "fatigue-legere", "durationPct", 85)); a.maxIntensity = Math.min(a.maxIntensity, 2);
      use("fatigue-legere", "Il était un peu fatigué la dernière fois : nous allégeons légèrement la durée et l'intensité.");
    }
    if (last.enjoyment === 1 && on(rules, "plaisir-faible")) {
      a.forceFormat = a.forceFormat ?? "plaisir";
      use("plaisir-faible", "La dernière séance ne lui a pas vraiment plu : nous gardons les mêmes objectifs, mais sous forme de jeux.");
    }
    if (last.confidence === 1 && on(rules, "confiance-faible")) {
      a.globalDiffShift -= 1; a.addConfidence = true; a.variant = "easy";
      use("confiance-faible", "Il semblait manquer de confiance : nous proposons des défis plus accessibles et un petit rituel pour repérer ses réussites. Aucune comparaison avec d'autres enfants.");
    }
    if (last.difficulty === "difficile" && on(rules, "trop-difficile")) {
      a.globalDiffShift = Math.min(a.globalDiffShift, -1); a.variant = "easy";
      use("trop-difficile", "Les exercices étaient trop difficiles : nous revenons un cran en dessous, avec les variantes faciles.");
    }
    if (last.wantedMore) use("pas-de-surenchere", "Il voulait continuer : excellente nouvelle ! Nous gardons la même durée pour qu'il ait toujours cette envie la prochaine fois.");
  }
  // Trop facile deux fois de suite : une seule catégorie progresse.
  const kEasy = p(rules, "trop-facile", "consecutive", 2);
  const easy = fb.slice(0, kEasy);
  if (on(rules, "trop-facile") && history.fineAdaptation !== false && easy.length >= kEasy && easy.every((f) => f.difficulty === "facile") && !a.excludeAreas.length && a.globalDiffShift === 0 && (!last || last.energy >= 2)) {
    const cat = easy[0].mainCategory;
    if (cat) {
      a.diffShift[cat] = 1; a.variant = "hard";
      use("trop-facile", `Il a trouvé les deux dernières séances faciles : nous montons d'un cran en ${catLabel(cat).toLowerCase()} uniquement. Le reste ne change pas.`);
    }
  }
  if (on(rules, "plaisir-faible")) for (const f of fb.slice(0, 6)) if (f.dislikedSlug && !a.excludeSlugs.includes(f.dislikedSlug)) a.excludeSlugs.push(f.dislikedSlug);
  if (history.fineAdaptation !== false) for (const f of fb.slice(0, 6)) if (f.likedSlug && !a.preferSlugs.includes(f.likedSlug)) a.preferSlugs.push(f.likedSlug);
  // Sommeil déclaré (facultatif).
  if (on(rules, "sommeil") && history.lastSleepH != null) {
    const min = profile.age < 12 ? p(rules, "sommeil", "minHoursUnder12", 9) : p(rules, "sommeil", "minHours12plus", 8);
    if (history.lastSleepH < min - 1) {
      a.durationPct = Math.min(a.durationPct, p(rules, "sommeil", "durationPct", 75)); a.maxIntensity = Math.min(a.maxIntensity, 2);
      use("sommeil", "La dernière nuit déclarée était courte : séance allégée aujourd'hui.");
    }
  }
  return a;
}

function eligible(ex: LibExercise, profile: Profile, a: Adapt, history: History, cap: number): boolean {
  const shift = levelRank(profile.level) - 1; // un confirmé peut prendre des exercices d'un an plus âgés, un débutant d'un an plus jeunes
  const effAge = profile.age + (shift > 0 ? 1 : 0);
  const lowAge = profile.age - (shift < 0 ? 1 : 0);
  if (ex.ageMin > effAge || ex.ageMax < lowAge) return false;
  if (history.freeOnly && !ex.isFree) return false;
  if (a.excludeSlugs.includes(ex.slug)) return false;
  if (ex.intensity > a.maxIntensity) return false;
  if (a.excludeAreas.length && (a.excludeAreas.includes("autre") ? ex.bodyAreas.length > 0 && ex.intensity > 1 : ex.bodyAreas.some((b) => a.excludeAreas.includes(b)))) return false;
  const have = profile.modes.sansMateriel ? ["ballon"] : [...profile.equipment, "ballon"];
  if (!ex.equipment.every((e) => have.includes(e) || (!profile.modes.sansMateriel && (e === "plots" || e === "cerceau" || e === "echelle" || e === "but")))) return false; // plots, repères, but : toujours fabricables
  if (profile.modes.petitEspace && ex.space !== "petit") return false;
  const indoorOnly = profile.places.length > 0 && profile.places.every((x) => x === "interieur");
  if (indoorOnly && !ex.indoorOk) return false;
  if (ex.difficulty > cap + (a.diffShift[ex.category] ?? 0)) return false;
  return true;
}

function difficultyCap(profile: Profile, a: Adapt): number {
  const byAge = profile.age <= 5 ? 1 : profile.age <= 7 ? 2 : profile.age <= 9 ? 3 : profile.age <= 11 ? 3 : 4;
  const byLevel = [0, 0, 1][levelRank(profile.level)] ?? 0;
  const base = Math.min(5, byAge + byLevel) - (levelRank(profile.level) === 0 && profile.age >= 8 ? 1 : 0);
  return Math.max(1, base + a.globalDiffShift);
}

const WARMUP_CATS = ["motricite", "coordination", "parent-enfant", "agilite", "conduite"];
const CALM_SLUGS = ["la-respiration-du-ballon", "le-flamant-rose", "etoile-d-equilibre"];

function pickFormat(profile: Profile, history: History, a: Adapt, target: number): string {
  if (a.forceFormat) return a.forceFormat;
  if (history.doneCount === 0) return "decouverte";
  if (profile.modes.vacances) return "plaisir";
  const cycle = profile.age <= 7 ? ["parent-enfant", "technique", "plaisir", "coordination"] : profile.age <= 11 ? ["technique", "coordination", "technique", "plaisir", "parent-enfant"] : ["technique", "perfectionnement", "coordination", "technique", "plaisir"];
  const f = cycle[history.doneCount % cycle.length];
  return target <= 14 && f === "technique" ? "courte" : f;
}

function formatCats(format: string, profile: Profile, band: AgeBand): string[] {
  const goalCats = profile.goals.flatMap((g) => GOALS.find((x) => x.key === g)?.cats ?? []) as string[];
  const base = [...new Set([...goalCats, ...band.recommended])];
  switch (format) {
    case "coordination": return ["coordination", "equilibre", "agilite", "motricite"];
    case "plaisir": return ["creativite", "parent-enfant", "finition", "dribbles", "precision"];
    case "parent-enfant": return ["parent-enfant", "passes", "creativite", "precision"];
    case "decouverte": return ["conduite", "passes", "parent-enfant", "precision", "finition"];
    case "douce": return ["equilibre", "confiance", "jonglage", "precision", "passes"];
    case "perfectionnement": return base.filter((c) => !["motricite", "parent-enfant"].includes(c));
    default: return base.filter((c) => !["motricite", "confiance"].includes(c));
  }
}

export function buildSession(profile: Profile, library: LibExercise[], history: History, rules: RuleSet, dateIso: string, wantedFormat?: string): SessionPlan {
  const band = bandForAge(profile.age);
  const a = adaptations(profile, history, rules, dateIso);
  // Durée : jamais au-dessus du temps déclaré ni du repère d'âge.
  let maxMin = Math.min(profile.minutesAvailable, band.sessionMin[1]);
  if (profile.modes.vacances && on(rules, "vacances")) maxMin = Math.min(maxMin, p(rules, "vacances", "maxMinutes", 15));
  const target = Math.max(8, Math.round((maxMin * a.durationPct) / 100));
  const format = wantedFormat && FORMATS[wantedFormat] && !a.forceFormat ? wantedFormat : pickFormat(profile, history, a, target);
  const cap = difficultyCap(profile, a);
  const pool = library.filter((e) => eligible(e, profile, a, history, cap));
  const cats = formatCats(format, profile, band);
  const used = new Set<string>();
  const usedFam = new Set<string>();
  const fam = (e: LibExercise) => e.family ?? e.slug;
  const famBySlug = new Map(library.map((e) => [e.slug, fam(e)]));
  const recentFam = history.recentSlugs.map((s) => famBySlug.get(s) ?? s);
  const score = (e: LibExercise, wanted: string[]) => {
    let s = 0;
    const i = wanted.indexOf(e.category);
    s += i >= 0 ? 6 - Math.min(i, 5) * 0.6 : 0;
    if (band.recommended.includes(e.category as never)) s += 1.5;
    if (a.preferSlugs.includes(e.slug)) s += 2;
    const r = history.recentSlugs.indexOf(e.slug);
    if (r >= 0) s -= 4 - Math.min(r, 8) * 0.4; // nouveauté : on évite de refaire le même exercice trop vite
    else { const rf = recentFam.indexOf(fam(e)); if (rf >= 0) s -= 2 - Math.min(rf, 8) * 0.2; } // … et la même famille
    if (e.isBase !== false) s += history.doneCount < 3 ? 3 : 0.4; // les premières séances commencent par les exercices de base
    s += 1.2 - Math.abs(e.difficulty - (cap + (a.diffShift[e.category] ?? 0))) * 0.6; // proche du bon niveau
    return s + hash(dateIso + e.slug) * 0.9;
  };
  // Installation rapide : à intérêt égal, un exercice qui réutilise le matériel déjà sorti est préféré.
  const kit = new Set<string>(["ballon"]);
  const kitCost = (e: LibExercise) => e.equipment.filter((x) => !kit.has(x)).length * 0.3;
  const take = (wanted: string[], filter: (e: LibExercise) => boolean = () => true) => {
    const c = pool.filter((e) => !used.has(e.slug) && !usedFam.has(fam(e)) && filter(e)).sort((x, y) => score(y, wanted) - kitCost(y) - (score(x, wanted) - kitCost(x)))[0];
    if (c) { used.add(c.slug); usedFam.add(fam(c)); c.equipment.forEach((x) => kit.add(x)); }
    return c;
  };

  // Le retour au calme et la discussion sont réservés d'abord : leurs exercices ne seront pas repris ailleurs dans la séance.
  const calm = library.find((e) => CALM_SLUGS.includes(e.slug) && e.slug === (profile.age >= 6 ? "la-respiration-du-ballon" : "le-flamant-rose") && (!history.freeOnly || e.isFree)) ?? library.find((e) => e.slug === "le-flamant-rose");
  for (const slug of [calm?.slug, "mes-trois-reussites"]) if (slug) { used.add(slug); usedFam.add(famBySlug.get(slug) ?? slug); }
  const blocks: Block[] = [];
  blocks.push({ phase: "accueil", title: "Comment ça va aujourd'hui ?", minutes: 1, text: "Demandez-lui comment il se sent et s'il a envie de jouer. S'il est fatigué ou n'a pas envie, on allège ou on reporte : ce n'est jamais un échec." });
  let remaining = target - 2; // accueil + discussion
  // Échauffement ludique.
  const warm = take(WARMUP_CATS, (e) => WARMUP_CATS.includes(e.category) && e.isBase !== false && e.difficulty <= 2 && e.intensity <= Math.max(2, a.maxIntensity) && e.durationMin <= 6);
  if (warm) { const m = Math.min(warm.durationMin, target <= 12 ? 3 : 4); blocks.push({ phase: "echauffement", title: warm.name, minutes: m, exerciseSlug: warm.slug, variant: "easy" }); remaining -= m; }
  // Retour au calme réservé.
  const calmMin = target >= 15 ? 2 : 1;
  remaining -= calmMin;
  // Défi réservé si la durée le permet.
  const wantChallenge = remaining >= 8 && format !== "douce";
  const challengeMin = wantChallenge ? 3 : 0;
  remaining -= challengeMin;
  // Exercices techniques.
  const tech: LibExercise[] = [];
  const maxTech = target <= 12 ? 1 : target <= 22 ? 2 : 3;
  let budget = remaining;
  for (let i = 0; i < maxTech && budget >= 3; i++) {
    const usedCats = tech.map((t) => t.category);
    const e = take(cats, (x) => !["confiance"].includes(x.category) && (format === "technique" || format === "courte" || !usedCats.includes(x.category) || i === 0) && x.durationMin <= budget + 2);
    if (!e) break;
    tech.push(e);
    budget -= Math.min(e.durationMin, Math.ceil(budget / (maxTech - i)));
  }
  const per = tech.length ? Math.floor(remaining / tech.length) : 0;
  tech.forEach((e, i) => blocks.push({ phase: "technique", title: e.name, minutes: Math.max(3, Math.min(e.durationMin + 1, per)), exerciseSlug: e.slug, restSec: i < tech.length - 1 ? Math.max(30, e.recoverySec) : e.recoverySec, variant: a.diffShift[e.category] ? "hard" : a.variant }));
  if (wantChallenge) {
    const ch = take(["precision", "finition", "jonglage", "dribbles", "creativite"], (e) => (!!e.metricKey || e.category === "creativite") && e.durationMin <= 8);
    if (ch) blocks.push({ phase: "defi", title: `Petit défi : ${ch.name}`, minutes: challengeMin, exerciseSlug: ch.slug, variant: a.variant, text: "Il se mesure uniquement à lui-même. On note l'essai, pas seulement la réussite." });
  }
  if (a.addConfidence && !blocks.some((b) => b.exerciseSlug === "le-defi-rate-volontaire")) {
    const c = pool.find((e) => e.slug === "le-defi-rate-volontaire" && !used.has(e.slug) && !usedFam.has(fam(e)));
    if (c && tech.length > 1) { const lastTech = blocks.findLastIndex((b) => b.phase === "technique"); used.delete(blocks[lastTech].exerciseSlug!); blocks[lastTech] = { phase: "technique", title: c.name, minutes: blocks[lastTech].minutes, exerciseSlug: c.slug, variant: "easy" }; used.add(c.slug); }
  }
  blocks.push({ phase: "calme", title: calm ? calm.name : "Retour au calme", minutes: calmMin, exerciseSlug: calm?.slug, text: "On marche, on respire, on boit de l'eau." });
  blocks.push({ phase: "discussion", title: "Ses trois réussites", minutes: 1, exerciseSlug: library.some((e) => e.slug === "mes-trois-reussites") ? "mes-trois-reussites" : undefined, text: "Il cite ce qu'il a réussi ou osé. Ensuite, répondez au questionnaire : 30 secondes qui permettent d'adapter la suite." });

  const mainCategory = tech[0]?.category ?? warm?.category ?? "conduite";
  const durationMin = blocks.reduce((s, b) => s + b.minutes, 0);
  const slugs = blocks.map((b) => b.exerciseSlug).filter(Boolean) as string[];
  const equipment = [...new Set(library.filter((e) => slugs.includes(e.slug)).flatMap((e) => e.equipment))];
  const explanation = [
    `Séance construite pour un enfant de ${profile.age} ans (${band.theme.toLowerCase()}).`,
    tech.length ? `Thème principal : ${catLabel(mainCategory).toLowerCase()}${profile.goals.length ? ", en lien avec ses objectifs" : ""}.` : "Séance très légère aujourd'hui.",
    `Durée : ${durationMin} minutes — nous ne dépassons ni le temps que vous avez indiqué (${profile.minutesAvailable} min) ni le repère de son âge (${band.sessionMin[1]} min).`,
    ...a.explanation,
  ];
  if (profile.modes.petitEspace) explanation.push("Mode petit espace : uniquement des exercices réalisables sur quelques mètres carrés.");
  if (profile.modes.sansMateriel) explanation.push("Mode sans matériel : un ballon suffit pour toute la séance.");
  const tips = [...band.parentTips.slice(0, 2)];
  if (a.variant === "easy") tips.unshift("Aujourd'hui, privilégiez les variantes faciles : l'objectif est qu'il réussisse.");
  if (history.feedback[0]?.motivation === 1) tips.unshift("Laissez-le choisir l'ordre des exercices ou en remplacer un par un jeu de son choix.");
  return {
    format, title: FORMATS[format]?.label ?? "Séance", objective: tech.length ? `${catLabel(mainCategory)} — ${band.priorities[0].toLowerCase()}` : "Bouger en douceur et retrouver de l'énergie",
    durationMin, blocks, parentTips: tips.slice(0, 3), equipment, explanation, rulesApplied: ["duree-age", ...a.rules], mainCategory,
  };
}

// Jeu commun pour une fratrie : exercices compatibles avec le plus jeune, variantes pour les plus grands.
export function siblingGames(ages: number[], library: LibExercise[]): LibExercise[] {
  const min = Math.min(...ages), max = Math.max(...ages);
  return library.filter((e) => e.isBase !== false && e.ageMin <= min && e.ageMax >= Math.min(max, e.ageMax) && e.ageMax >= min && ["parent-enfant", "creativite", "precision", "motricite", "agilite", "confiance"].includes(e.category) && (e.ageMax >= max - 3)).slice(0, 8);
}
export { AGE_BANDS };
