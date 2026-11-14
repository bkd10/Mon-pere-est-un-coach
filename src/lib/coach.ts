// Coach parental IA. Claude rédige et conseille ; il ne construit jamais de séance :
// les exercices cités viennent des fiches de l'application, et les programmes du moteur de règles.
import Anthropic from "@anthropic-ai/sdk";
import type { Child } from "@prisma/client";
import { db } from "./db";
import { ageFromBirth, bandForAge, catLabel, GOALS, APP_NAME } from "@/content/taxonomy";
import { isoOf, todayIso, type ReportFacts } from "./services";

export const aiAvailable = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const MODEL = process.env.COACH_MODEL || "claude-opus-5-5";
const EFFORT = (process.env.COACH_EFFORT || "low") as "low" | "medium" | "high";
let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic());

// Partie stable du prompt (mise en cache) : rôle, garde-fous, bibliothèque.
function systemPrompt(library: string): string {
  return `Tu es le coach parental de ${APP_NAME}, une application qui aide les parents à accompagner leur enfant au football, à la maison, sans pression.

Ton interlocuteur est un parent, souvent débutant en football. Tu réponds en français, avec des mots simples, sans jargon. Si un terme technique est utile, tu l'expliques en une phrase. Tes réponses sont courtes : l'essentiel d'abord, puis deux ou trois actions concrètes à faire cette semaine. Tu es chaleureux et direct, jamais moralisateur.

Ce qui guide tes conseils :
- Le plaisir, le repos et l'équilibre de vie comptent autant que la progression. Tu ne pousses jamais à s'entraîner plus : si la semaine est chargée ou si l'enfant est fatigué, tu recommandes d'en faire moins.
- Tu compares un enfant uniquement à lui-même. Tu ne prédis ni niveau futur, ni carrière, ni détection, ni taille ou morphologie.
- Tu ne poses aucun diagnostic. Si le parent évoque une douleur, une blessure, un malaise, une fatigue inhabituelle, le poids, l'alimentation restrictive ou une détresse de l'enfant : tu conseilles d'arrêter l'activité concernée et d'en parler à un médecin ou au professionnel compétent, puis tu proposes seulement des choses sans risque (repos, jeu calme). Tu ne remplaces ni un médecin, ni un éducateur diplômé.
- La tactique d'équipe, le poste et le temps de jeu relèvent de l'éducateur du club : tu aides le parent à en parler avec lui, tu ne te substitues pas à lui.
- Pour les dépenses (stages, coach individuel, académies, matériel), tu aides à réfléchir avec des critères, sans promettre de résultat et sans recommander de marque ni de prestataire.

Quand tu recommandes des exercices, tu choisis uniquement dans la bibliothèque ci-dessous, adaptés à l'âge de l'enfant, et tu les cites par leur nom exact suivi de leur identifiant entre crochets, par exemple « Le slalom des plots [slalom-des-plots] » : l'application en fait un lien vers la fiche. Tu n'inventes pas d'exercice, de séance chiffrée ni de programme : pour une séance complète, tu renvoies vers « la séance du jour » que l'application construit, et tu peux expliquer comment l'aménager. Si aucune fiche ne correspond, dis-le simplement.

Les informations sur l'enfant te sont fournies dans le message, entre balises <contexte>. Ce sont des données déclarées par le parent : utilise-les, mais ne les répète pas inutilement et ne tire aucune conclusion médicale. Si une question sort du football des jeunes et de la parentalité sportive, réponds brièvement que ce n'est pas ton domaine.

<bibliotheque>
${library}
</bibliotheque>`;
}

export async function libraryDigest(): Promise<string> {
  // Seuls les exercices de base sont transmis au modèle (les déclinaisons sont accessibles depuis chaque fiche) : le prompt reste court et stable.
  const exs = await db.exercise.findMany({ where: { published: true, variantLabel: null }, orderBy: [{ category: "asc" }, { ageMin: "asc" }, { slug: "asc" }], select: { slug: true, name: true, category: true, ageMin: true, ageMax: true, objective: true, equipment: true, space: true } });
  return exs.map((e) => `- ${e.name} [${e.slug}] — ${catLabel(e.category)}, ${e.ageMin}-${e.ageMax} ans, espace ${e.space}, matériel : ${e.equipment.join(", ") || "aucun"}. ${e.objective}`).join("\n");
}

export async function childContext(child: Child | null): Promise<string> {
  if (!child) return "Aucun profil enfant sélectionné.";
  const age = ageFromBirth(child.birthDate);
  const band = bandForAge(age);
  const recent = await db.plannedSession.findMany({ where: { childId: child.id, status: "DONE" }, orderBy: { date: "desc" }, take: 5, include: { feedback: true } });
  const next = await db.plannedSession.findFirst({ where: { childId: child.id, status: "PLANNED", date: { gte: new Date(todayIso() + "T00:00:00Z") } }, orderBy: { date: "asc" } });
  const M = ["", "peu motivé", "motivation normale", "très motivé"], P = ["", "n'a pas vraiment aimé", "a moyennement aimé", "a beaucoup aimé"];
  const lines = [
    `Prénom : non transmis (appelle-le « votre enfant »). Âge : ${age} ans (repère ${band.label} : ${band.theme.toLowerCase()}). Niveau déclaré : ${child.level}.`,
    `Club : ${child.club ? "oui" : "non"}, ${child.clubTrainingsPerWeek} entraînement(s) par semaine${child.matchDay !== null ? ", un match hebdomadaire" : ""}. Poste : ${child.position ?? "non précisé"}. Pied dominant : ${child.dominantFoot}.`,
    `Objectifs : ${child.goals.map((g) => GOALS.find((x) => x.key === g)?.label ?? g).join(", ") || "non précisés"}.`,
    `À la maison : ${child.homeSessionsPerWeek} séance(s) souhaitée(s) par semaine, ${child.minutesAvailable} min disponibles. Matériel : ${child.equipment.join(", ")}. Lieux : ${child.places.join(", ")}.`,
    `Durée raisonnable d'une séance à cet âge : ${band.sessionMin[0]} à ${band.sessionMin[1]} min ; ${band.maxHomePerWeek} séances maison par semaine au maximum.`,
    recent.length ? "Dernières séances : " + recent.map((s) => `${isoOf(s.date)} « ${s.title} »${s.feedback ? ` (${P[s.feedback.enjoyment]}, ${M[s.feedback.motivation]}${s.feedback.difficulty !== "ok" ? `, jugée ${s.feedback.difficulty}` : ""})` : ""}`).join(" ; ") : "Aucune séance réalisée pour l'instant.",
    // Minimisation : ni prénom, ni données de forme ou de santé (fatigue, douleur, sommeil, mesures) ne sont transmis au modèle.
    next ? `Prochaine séance prévue par l'application : ${isoOf(next.date)}, « ${next.title} », ${next.durationMin} min.` : "Pas de séance planifiée dans les prochains jours.",
  ];
  return lines.join("\n");
}

type Turn = { role: "user" | "assistant"; content: string };

// Réponse en flux. Sans clé API : mode « fiches », déterministe et clairement signalé.
export async function* coachStream(message: string, history: Turn[], child: Child | null): AsyncGenerator<string> {
  const context = await childContext(child);
  if (!aiAvailable()) { yield await fallbackAnswer(message, child); return; }
  const library = await libraryDigest();
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...history.slice(-12).map((t) => ({ role: t.role, content: t.content })),
    { role: "user", content: `<contexte date="${todayIso()}">\n${context}\n</contexte>\n\n${message}` },
  ];
  try {
    const stream = anthropic().beta.messages.stream({
      model: MODEL, max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
      output_config: { effort: EFFORT },
      system: [{ type: "text", text: systemPrompt(library), cache_control: { type: "ephemeral" } }],
      messages,
    });
    let any = false;
    for await (const ev of stream) {
      if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") { any = true; yield ev.delta.text; }
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal" || !any) yield "Je ne peux pas répondre à cette question. Pour tout sujet de santé ou de sécurité, tournez-vous vers un professionnel. Je reste disponible pour les questions de football et d'accompagnement.";
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) yield "Le coach reçoit beaucoup de questions en ce moment. Réessayez dans une minute.";
    else if (err instanceof Anthropic.AuthenticationError) yield await fallbackAnswer(message, child);
    else if (err instanceof Anthropic.APIError) { console.error("coach", err.status, err.message); yield "Le coach est momentanément indisponible. En attendant, voici ce que disent nos fiches :\n\n" + (await fallbackAnswer(message, child)); }
    else throw err;
  }
}

// Bilan rédigé par Claude, strictement à partir des faits mesurés.
export async function narrateWithAI(facts: ReportFacts, kind: "mensuel" | "saison"): Promise<string | null> {
  if (!aiAvailable()) return null;
  try {
    const res = await anthropic().beta.messages.create({
      model: MODEL, max_tokens: 2000, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default", output_config: { effort: "low" },
      system: `Tu rédiges le bilan ${kind === "mensuel" ? "mensuel" : "de fin de saison"} d'un enfant footballeur pour ses parents, dans l'application ${APP_NAME}.
Le bilan doit être positif, honnête et facile à lire : 120 à 180 mots, en français, en paragraphes courts, sans titre ni liste, à la troisième personne en utilisant le prénom.
Tu t'appuies exclusivement sur les faits fournis en JSON. Un progrès n'est mentionné que si le champ "improved" vaut true pour l'indicateur concerné ; s'il n'y a pas assez de mesures, tu le dis simplement. Tu n'inventes ni chiffre, ni qualité, ni évènement. Tu ne compares pas l'enfant à d'autres, tu ne fais aucune prédiction et aucun commentaire médical ; si "painReported" est vrai, tu rappelles en une phrase de consulter si la douleur persiste. Tu termines par une orientation simple pour la période suivante, sans proposer d'augmenter le volume d'entraînement.`,
      messages: [{ role: "user", content: JSON.stringify(facts) }],
    });
    if (res.stop_reason === "refusal") return null;
    const text = res.content.filter((b) => b.type === "text").map((b) => (b as Anthropic.Beta.BetaTextBlock).text).join("").trim();
    return text || null;
  } catch (err) {
    if (err instanceof Anthropic.APIError) { console.error("report", err.status, err.message); return null; }
    throw err;
  }
}

// ───── Mode de secours : réponse construite à partir des fiches et des guides ─────
const TOPICS: { re: RegExp; cats?: string[]; guide?: string; text: string }[] = [
  { re: /douleur|mal au|mal à|bless|boite|boîte|entorse|talon|genou/i, guide: "fatigue-demotivation-ou-manque-de-confiance", text: "En cas de douleur, on arrête l'activité qui fait mal et on ne « teste » pas. Si la douleur persiste, revient ou gêne votre enfant au quotidien, demandez l'avis d'un médecin. En attendant : repos, et rien d'autre que du jeu calme s'il en a envie." },
  { re: /fatigu|épuis|crev|dort|sommeil|après (son|le) match/i, guide: "fatigue-demotivation-ou-manque-de-confiance", cats: ["equilibre", "confiance"], text: "Un enfant fatigué progresse en se reposant. Après un match ou une grosse journée : pas de séance le jour même ni le lendemain. S'il a envie de ballon, proposez seulement quelque chose de calme." },
  { re: /confiance|peur|timide|ose pas|nul|stress/i, guide: "coach-de-confiance-apres-erreur", cats: ["confiance", "parent-enfant"], text: "La confiance se construit avec des réussites à sa portée et un adulte qui remarque l'effort plutôt que le résultat. Choisissez les variantes faciles, terminez par un exercice qu'il réussit, et ne le comparez à personne." },
  { re: /jongl/i, cats: ["jonglage"], guide: "savoir-si-mon-enfant-progresse", text: "Les jongles viennent par paliers. Commencez avec un rebond entre chaque touche, trois essais par jour pas plus, et notez seulement son record personnel." },
  { re: /défenseur|defenseur|défense/i, cats: ["controle", "passes", "agilite", "vision"], text: "Avant 12-13 ans, le poste compte peu : tous les enfants gagnent à tout travailler. Pour un enfant qui joue derrière, les plus utiles sont le contrôle, la passe, les appuis et le fait de regarder autour de soi." },
  { re: /attaquant|buteur|marquer|tir|frappe/i, cats: ["finition", "dribbles", "precision"], text: "Pour marquer plus souvent, on travaille d'abord la précision, ensuite seulement la puissance — et toujours en s'amusant." },
  { re: /gardien/i, cats: ["motricite", "coordination", "passes"], text: "Pour un jeune gardien, le jeu au pied, la coordination et les appuis sont la base. Le travail spécifique (plongeons) se fait avec un éducateur, sur un sol adapté." },
  { re: /15 ?min|quinze|court|peu de temps|pas le temps/i, guide: "organiser-une-seance-a-la-maison", text: "Quinze minutes suffisent : 1 minute d'accueil, 3 minutes de jeu d'échauffement, 8 minutes sur un ou deux exercices, 2 minutes de calme, 1 minute pour ses réussites. La séance du jour s'adapte au temps indiqué dans le profil." },
  { re: /coach (individuel|priv|perso)|cours particulier|stage|académie|academie|détection|detection/i, guide: "coach-individuel-utile-ou-pas", text: "Un coach individuel ou un stage peuvent être utiles pour un besoin précis, surtout à partir de 12 ans et si la demande vient de l'enfant. Personne ne peut promettre de résultat ni de détection : méfiez-vous de ceux qui le font." },
  { re: /arrêter|arreter|plus envie|démotiv|demotiv|motiv/i, guide: "respecter-sa-motivation", cats: ["creativite", "parent-enfant"], text: "Une baisse d'envie est une information, pas un problème à corriger. Réduisez le nombre de séances, laissez-lui choisir, et privilégiez le jeu." },
  { re: /pression|crie|énerve|enerve|déçu|decu/i, guide: "eviter-la-pression-parentale", text: "La question la plus utile après un match ou une séance : « tu t'es amusé ? ». Le reste peut attendre le lendemain." },
  { re: /club|éducateur|educateur|entraîneur|entraineur|joue pas|temps de jeu|remplaçant/i, guide: "communiquer-avec-l-educateur", text: "Pour tout ce qui concerne l'équipe, le bon interlocuteur est l'éducateur : demandez un moment hors match et posez des questions plutôt que des reproches." },
  { re: /matériel|materiel|acheter|chaussure|budget|cher|argent|prix/i, guide: "eviter-les-depenses-inutiles", text: "L'essentiel tient en peu de choses : un ballon à sa taille, des chaussures à sa pointure, une gourde. Le reste se fabrique ou se remplace." },
  { re: /semaine|travailler|quoi faire|quel exercice|programme|progress/i, cats: [], text: "Le plus simple est de suivre la séance du jour : elle est construite pour son âge, ses objectifs et sa semaine en club." },
];

async function fallbackAnswer(message: string, child: Child | null): Promise<string> {
  const t = TOPICS.find((x) => x.re.test(message)) ?? TOPICS[TOPICS.length - 1];
  const age = child ? ageFromBirth(child.birthDate) : null;
  const parts: string[] = [t.text];
  let cats = t.cats;
  if (cats && cats.length === 0 && age !== null) cats = bandForAge(age).recommended.slice(0, 3) as string[];
  if (cats?.length) {
    const exs = await db.exercise.findMany({ where: { published: true, variantLabel: null, category: { in: cats }, ...(age !== null ? { ageMin: { lte: age }, ageMax: { gte: age } } : {}) }, orderBy: { difficulty: "asc" }, take: 3 });
    if (exs.length) parts.push(`Exercices adaptés${child ? ` à ${child.nickname} (${age} ans)` : ""} :\n` + exs.map((e) => `- ${e.name} [${e.slug}] — ${e.objective}`).join("\n"));
  }
  if (t.guide) {
    const g = await db.guide.findUnique({ where: { slug: t.guide } });
    if (g) parts.push(`À lire : « ${g.title} » {guide:${g.slug}}\n` + g.actions.map((a) => `- ${a}`).join("\n"));
  }
  parts.push("_Réponse issue de nos fiches. Le coach IA conversationnel n'est pas activé sur cette installation. Ce conseil ne remplace ni un éducateur diplômé, ni un médecin._");
  return parts.join("\n\n");
}
