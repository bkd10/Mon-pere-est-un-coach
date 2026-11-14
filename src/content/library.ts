// Bibliothèque complète = exercices de base (rédigés un par un) + leurs déclinaisons.
// Une déclinaison est une progression pédagogique appliquée à un exercice de base (pied faible, contre la montre,
// avec défenseur, version histoire…). Chaque déclinaison produit une fiche complète, avec ses propres consignes,
// erreurs, variantes et critère de réussite. Les règles ci-dessous disent à quels exercices et à quels âges
// chaque déclinaison s'applique : rien n'est généré au hasard.
import { EXERCISES_A, SAFE, type ExerciseSeed } from "./exercises-a";
import { EXERCISES_B } from "./exercises-b";
import { EXERCISES_C } from "./exercises-c";

export type Fiche = ExerciseSeed & { family: string; variantKey?: string; variantLabel?: string };

export const MAX_AGE = 18;
// Les fiches « jusqu'à 17 ans » couvrent aussi les 18 ans.
const norm = (e: ExerciseSeed): ExerciseSeed => ({ ...e, age: [e.age[0], e.age[1] >= 17 ? MAX_AGE : e.age[1]] });
export const BASES: ExerciseSeed[] = [...EXERCISES_A, ...EXERCISES_B, ...EXERCISES_C].map(norm);

const TECH = ["conduite", "jonglage", "controle", "passes", "precision", "finition", "dribbles"];
const has = (b: ExerciseSeed, ...c: string[]) => c.includes(b.category);
const ball = (b: ExerciseSeed) => b.equipment.includes("ballon");
const uniq = (xs: string[]) => [...new Set(xs)];

type Decl = {
  key: string; label: string; applies: (b: ExerciseSeed) => boolean; age: (b: ExerciseSeed) => [number, number];
  objective: (b: ExerciseSeed) => string; why: string; steps: string[]; mistake: string; correction: string;
  easy: string; medium: string; hard: string; success: string; caption: string;
  patch?: (b: ExerciseSeed) => Partial<ExerciseSeed>;
};
const from = (min: number) => (b: ExerciseSeed): [number, number] => [Math.max(b.age[0], min), b.age[1]];
const up = (b: ExerciseSeed, n = 1) => Math.min(5, b.difficulty + n);

export const DECLINATIONS: Decl[] = [
  { key: "pied-faible", label: "pied faible", applies: (b) => has(b, ...TECH) && ball(b), age: from(6),
    objective: (b) => `Refaire « ${b.name} » en utilisant uniquement le pied le moins habile.`,
    why: "Un joueur à l'aise des deux pieds a deux fois plus de solutions. Le pied faible progresse vite quand on le fait travailler sur un exercice déjà connu.",
    steps: ["Refaites ensuite tout l'exercice en n'utilisant que le pied faible.", "Comptez à part les réussites du pied faible : c'est ce score-là qu'il cherche à améliorer."],
    mistake: "Il repasse sur son bon pied sans s'en rendre compte.", correction: "Il annonce « gauche » ou « droit » à voix haute avant chaque répétition.",
    easy: "Une répétition sur trois avec le pied faible.", medium: "Une répétition sur deux avec le pied faible.", hard: "Tout l'exercice du pied faible, à la même allure que du pied fort.",
    success: "Du pied faible, il réussit au moins la moitié de ce qu'il réussit du pied fort.", caption: "Uniquement le pied faible", patch: (b) => ({ difficulty: up(b) }) },
  { key: "chrono", label: "contre la montre", applies: (b) => has(b, "conduite", "dribbles", "coordination", "agilite", "motricite") && (b.intensity ?? 2) >= 2, age: from(7),
    objective: (b) => `Réaliser « ${b.name} » en cherchant à battre son propre temps.`,
    why: "Se chronométrer contre soi-même donne un but clair et rend les progrès visibles, sans se comparer à personne.",
    steps: ["Chronométrez un premier passage à allure normale : c'est son temps de référence.", "Laissez-le récupérer complètement, au moins une minute, puis faites un deuxième essai.", "Trois essais chronométrés au maximum : au-delà, la qualité baisse."],
    mistake: "Il va vite mais bâcle le geste.", correction: "Un passage raté ne compte pas : la précision d'abord, le chrono ensuite.",
    easy: "On chronomètre seulement le dernier passage.", medium: "Trois essais, on garde le meilleur.", hard: "Il annonce son temps cible avant de partir.",
    success: "Il égale ou améliore son temps de référence sans faute technique.", caption: "Je bats mon propre temps",
    patch: (b) => ({ difficulty: up(b), intensity: 3, recoverySec: 60, reps: "3 essais chronométrés, 1 minute de pause entre chacun", safety: `${b.safety ?? SAFE.sol} Échauffement avant tout passage chronométré ; jamais un jour de fatigue.` }) },
  { key: "tete-levee", label: "tête levée", applies: (b) => has(b, "conduite", "dribbles", "controle", "passes", "coordination") && ball(b), age: from(7),
    objective: (b) => `Réaliser « ${b.name} » en regardant le parent plutôt que le ballon.`,
    why: "Un joueur qui lève la tête voit ses partenaires et le danger. On l'entraîne en ajoutant une information à lire pendant le geste.",
    steps: ["Placez-vous face à lui et montrez des doigts de la main pendant qu'il travaille.", "Il annonce le nombre à voix haute sans s'arrêter.", "Changez de place pour l'obliger à vous chercher du regard."],
    mistake: "Il s'arrête pour regarder.", correction: "Ralentissez l'exercice : marcher est permis, s'arrêter non.",
    easy: "Un signal toutes les cinq secondes, exercice au ralenti.", medium: "Un signal toutes les trois secondes.", hard: "Le signal indique aussi quoi faire : pair = continuer, impair = demi-tour.",
    success: "8 annonces justes sur 10 sans perdre le ballon.", caption: "Je regarde autour de moi", patch: (b) => ({ difficulty: up(b), parentRole: "joue" }) },
  { key: "conclusion", label: "avec conclusion", applies: (b) => has(b, "conduite", "dribbles", "controle", "coordination", "agilite", "vitesse"), age: from(7),
    objective: (b) => `Enchaîner « ${b.name} » avec une passe ou un tir dans une porte.`,
    why: "En match, un geste n'est jamais isolé : il sert à préparer le suivant. Terminer par une passe ou un tir donne un sens à l'exercice.",
    steps: ["Installez une porte d'un mètre à 5 ou 6 mètres de la fin de l'exercice.", "Dès qu'il a terminé, il conclut par une passe au sol ou un tir dans la porte (donnez-lui un ballon à ce moment-là s'il n'en a pas).", "Il va chercher son ballon en marchant : c'est son temps de repos."],
    mistake: "Il s'arrête entre l'exercice et la conclusion.", correction: "« La fin de l'exercice, c'est le ballon dans la porte. »",
    easy: "Porte de 2 mètres, à 4 mètres.", medium: "Porte d'un mètre, à 6 mètres.", hard: "Deux portes : vous annoncez laquelle au dernier moment.",
    success: "Il enchaîne sans arrêt et trouve la porte 2 fois sur 3.", caption: "Je termine dans la porte",
    patch: (b) => ({ difficulty: up(b), equipment: uniq([...b.equipment, "ballon", "plots"]), space: b.space === "petit" ? "moyen" : b.space, indoorOk: false, metricKey: b.metricKey ?? "passes" }) },
  { key: "defenseur", label: "avec défenseur", applies: (b) => has(b, "conduite", "dribbles", "controle", "passes", "finition") && ball(b), age: from(8),
    objective: (b) => `Réussir « ${b.name} » malgré la présence d'un défenseur bienveillant.`,
    why: "Un geste réussi seul doit ensuite tenir quand quelqu'un s'approche. Une opposition douce fait le lien avec le match.",
    steps: ["Vous devenez défenseur : placez-vous sur son chemin, sans chercher à prendre le ballon.", "Avancez vers lui en marchant pendant qu'il réalise l'exercice.", "Augmentez votre présence petit à petit : il doit réussir au moins deux fois sur trois."],
    mistake: "Il se précipite dès que vous approchez.", correction: "« Je suis un défenseur gentil : garde ton rythme. »",
    easy: "Défenseur immobile, qui gêne seulement par sa présence.", medium: "Défenseur qui marche.", hard: "Défenseur qui tend une jambe d'un côté : il doit choisir l'autre.",
    success: "Il réussit l'exercice 2 fois sur 3 avec le défenseur qui marche.", caption: "Avec un défenseur gentil",
    patch: (b) => ({ difficulty: up(b), parentRole: "joue", level: b.level === "debutant" ? "intermediaire" : b.level, safety: `${b.safety ?? SAFE.sol} ${SAFE.duo}` }) },
  { key: "histoire", label: "version histoire", applies: (b) => b.age[0] <= 6, age: (b) => [b.age[0], Math.min(b.age[1], 8)],
    objective: (b) => `Vivre « ${b.name} » comme une aventure racontée.`,
    why: "Avant 8 ans, un enfant entre dans un exercice par l'imaginaire. Une histoire remplace dix consignes.",
    steps: ["Avant de commencer, choisissez ensemble un univers : pirates, animaux de la jungle, explorateurs de l'espace.", "Renommez tout : les repères deviennent des îles ou des planètes, le ballon un trésor.", "Laissez-le ajouter un personnage ou un rebondissement à chaque passage."],
    mistake: "L'histoire prend toute la place et on ne joue plus.", correction: "Une phrase d'histoire, puis on joue : l'aventure avance à chaque passage.",
    easy: "Vous racontez, il joue.", medium: "Il choisit l'univers.", hard: "Il raconte lui-même la suite pendant qu'il joue.",
    success: "Il réclame la suite de l'histoire.", caption: "Il était une fois…", patch: () => ({ level: "debutant", parentRole: "joue" }) },
  { key: "etoiles", label: "défi 3 étoiles", applies: () => true, age: from(6),
    objective: (b) => `Transformer « ${b.name} » en défi à trois paliers, contre soi-même.`,
    why: "Trois paliers donnent une réussite à chacun : la première étoile récompense l'essai, la dernière la maîtrise.",
    steps: ["Annoncez les paliers : une étoile pour avoir fait l'exercice en entier.", "Deux étoiles s'il atteint le critère de réussite une fois.", "Trois étoiles s'il l'atteint deux fois de suite. Notez ses étoiles dans l'application."],
    mistake: "Il ne pense qu'aux trois étoiles et se crispe.", correction: "Rappelez que la première étoile est déjà gagnée : le reste est du bonus.",
    easy: "Deux étoiles suffisent aujourd'hui.", medium: "Les trois paliers.", hard: "Il fixe lui-même un quatrième palier.",
    success: "Il gagne une étoile de plus que la dernière fois, ou au moins la même.", caption: "Une, deux, trois étoiles" },
  { key: "duo", label: "à deux enfants", applies: () => true, age: from(5),
    objective: (b) => `Réaliser « ${b.name} » avec un frère, une sœur ou un ami.`,
    why: "À deux, on s'encourage, on s'imite et on rit. C'est aussi la bonne formule pour des enfants d'âges différents.",
    steps: ["Les deux enfants passent chacun leur tour ; celui qui attend encourage et compte.", "Le plus jeune utilise la variante facile, le plus grand la variante difficile.", "Terminez par un passage où ils additionnent leurs réussites : un score d'équipe."],
    mistake: "La comparaison s'installe entre les deux.", correction: "Un seul score : celui de l'équipe. On ne commente pas les scores individuels.",
    easy: "Chacun son tour, sans score.", medium: "Score d'équipe additionné.", hard: "Le plus grand explique l'exercice au plus jeune.",
    success: "Les deux enfants ont participé et le score d'équipe est noté.", caption: "Une équipe, deux joueurs", patch: () => ({ parentRole: "observe" }) },
  { key: "coach", label: "c'est lui le coach", applies: (b) => b.age[1] >= 7, age: from(7),
    objective: (b) => `Faire expliquer et diriger « ${b.name} » par l'enfant : c'est vous qui jouez.`,
    why: "On retient ce qu'on enseigne. Expliquer un geste oblige à le comprendre, et diriger un adulte donne une belle confiance.",
    steps: ["Inversez les rôles : il vous explique l'exercice avec ses mots.", "Vous le faites, en commettant volontairement une erreur.", "Il doit repérer l'erreur et vous donner un seul conseil."],
    mistake: "Le parent reprend la parole.", correction: "Posez uniquement des questions : « et là, coach, je fais quoi ? »",
    easy: "Il vous montre, vous imitez.", medium: "Il explique sans montrer.", hard: "Il invente une variante et vous la fait essayer.",
    success: "Il a su expliquer l'exercice et donner un conseil utile.", caption: "Aujourd'hui, c'est lui le coach", patch: () => ({ parentRole: "joue" }) },
  { key: "express", label: "version express", applies: (b) => b.durationMin >= 4, age: (b) => b.age,
    objective: (b) => `Faire l'essentiel de « ${b.name} » en trois minutes.`,
    why: "Trois minutes bien faites valent mieux que rien : idéal un soir chargé ou pour finir une séance sur une réussite.",
    steps: ["Aujourd'hui : deux ou trois passages seulement, sans se presser.", "Une seule consigne pour toute la durée ; choisissez la plus importante.", "On s'arrête sur une réussite, même s'il reste du temps."],
    mistake: "On veut tout faire en trois minutes.", correction: "Moins de répétitions, la même qualité.",
    easy: "Deux passages.", medium: "Trois passages.", hard: "Trois passages, en gardant la variante habituelle.",
    success: "Un passage propre, et l'envie d'y revenir.", caption: "Trois minutes, une consigne", patch: () => ({ durationMin: 3, reps: "2 à 3 passages", intensity: 1 }) },
  { key: "miroir", label: "en miroir avec le parent", applies: (b) => (b.parentRole ?? "observe") !== "joue" && b.category !== "parent-enfant", age: (b) => b.age,
    objective: (b) => `Faire « ${b.name} » côte à côte, en même temps que le parent.`,
    why: "Un enfant apprend d'abord en imitant. Et vous voir essayer, réussir ou rater change toute l'ambiance de la séance.",
    steps: ["Placez-vous à côté de lui et faites l'exercice en même temps.", "Essayez de rester synchronisés : même rythme, mêmes gestes.", "Laissez-le vous corriger : il adore ça."],
    mistake: "Le parent va plus vite que l'enfant.", correction: "C'est lui qui donne le rythme, vous suivez.",
    easy: "Vous démarrez ensemble, chacun à son rythme.", medium: "Synchronisés sur un passage.", hard: "Synchronisés sur tout l'exercice.",
    success: "Un passage réalisé ensemble, au même rythme.", caption: "Ensemble, au même rythme", patch: () => ({ parentRole: "joue" }) },
  { key: "petit-espace", label: "version petit espace", applies: (b) => b.space !== "petit" && (b.intensity ?? 2) <= 2 && !b.equipment.includes("but") && !b.equipment.includes("mur"), age: (b) => b.age,
    objective: (b) => `Adapter « ${b.name} » à quelques mètres carrés.`,
    why: "Pas de jardin, il pleut, il fait nuit : l'exercice reste possible en réduisant les distances. Moins d'espace, c'est aussi plus de précision.",
    steps: ["Divisez toutes les distances par deux, voire par trois.", "À l'intérieur : ballon en mousse ou légèrement dégonflé, tout se joue au sol.", "Ralentissez : dans un petit espace, on cherche la précision, pas la vitesse."],
    mistake: "Il joue à la même vitesse que dehors.", correction: "« Ici, c'est le plus précis qui gagne. »",
    easy: "En marchant.", medium: "À allure tranquille.", hard: "Dans un espace encore réduit, avec le pied faible.",
    success: "L'exercice est réalisé en entier sans que le ballon quitte la zone.", caption: "Quelques mètres suffisent",
    patch: (b) => ({ space: "petit", indoorOk: true, intensity: 1, safety: `${b.safety ?? SAFE.sol} ${SAFE.int}` }) },
  { key: "touches", label: "touches limitées", applies: (b) => has(b, "passes", "controle", "finition", "vision") && ball(b), age: from(9),
    objective: (b) => `Réaliser « ${b.name} » avec un nombre de touches de balle limité.`,
    why: "Jouer en une ou deux touches oblige à savoir quoi faire avant de recevoir le ballon : c'est ce qui accélère le jeu.",
    steps: ["Première série : deux touches maximum, un contrôle et un geste.", "Deuxième série : une touche chaque fois que c'est possible.", "Avant chaque ballon, il annonce « une » ou « deux »."],
    mistake: "Il force une touche impossible et perd le ballon.", correction: "Une bonne touche de plus vaut mieux qu'une mauvaise touche de moins.",
    easy: "Trois touches maximum.", medium: "Deux touches maximum.", hard: "Une touche, des deux pieds.",
    success: "Il tient la contrainte de touches sur 6 ballons sur 8.", caption: "Une ou deux touches, pas plus", patch: (b) => ({ difficulty: up(b), level: b.level === "debutant" ? "intermediaire" : b.level }) },
  { key: "signal", label: "au signal", applies: (b) => has(b, "vision", "agilite", "vitesse", "conduite", "dribbles", "passes", "motricite"), age: from(7),
    objective: (b) => `Réaliser « ${b.name} » en réagissant à un signal du parent.`,
    why: "Au football, on agit en fonction de ce qu'on voit et de ce qu'on entend. Ajouter un signal entraîne la réaction autant que le geste.",
    steps: ["Convenez de deux signaux : par exemple « bleu » = on continue, « rouge » = on change de sens.", "Donnez un signal au milieu de l'exercice, sans prévenir.", "Passez ensuite à des signaux visuels : un bras levé, une couleur montrée."],
    mistake: "Il devine au lieu d'attendre le signal.", correction: "Faites de faux départs et variez le moment du signal.",
    easy: "Un seul signal, annoncé à voix haute.", medium: "Deux signaux à voix haute.", hard: "Signaux visuels uniquement.",
    success: "Il réagit juste à 5 signaux sur 6.", caption: "Je réagis au signal", patch: (b) => ({ difficulty: up(b), parentRole: "joue" }) },
  { key: "ralenti", label: "au ralenti", applies: (b) => has(b, ...TECH, "coordination", "equilibre", "agilite"), age: from(6),
    objective: (b) => `Refaire « ${b.name} » au ralenti, en cherchant le geste parfait.`,
    why: "Le ralenti permet de sentir chaque étape du geste. C'est aussi une excellente façon de travailler un jour de fatigue, sans effort intense.",
    steps: ["Tout l'exercice se fait deux fois plus lentement que d'habitude.", "À chaque passage, il se concentre sur un seul détail : le pied d'appui, la surface de contact ou le regard.", "Il termine par un passage à vitesse normale pour sentir la différence."],
    mistake: "Il accélère sans s'en rendre compte.", correction: "Comptez lentement à voix haute pour lui donner le tempo.",
    easy: "En marchant.", medium: "Au ralenti, avec un détail à soigner.", hard: "Il décrit à voix haute ce qu'il fait pendant le geste.",
    success: "Il réalise un passage lent sans aucune faute technique.", caption: "Lentement, pour faire juste", patch: () => ({ intensity: 1, recoverySec: 20 }) },
  { key: "surface", label: "surface imposée", applies: (b) => has(b, "conduite", "dribbles", "controle", "passes") && ball(b), age: from(7),
    objective: (b) => `Réaliser « ${b.name} » avec une seule surface du pied, annoncée à l'avance.`,
    why: "Semelle, intérieur, extérieur, lacets : chaque surface a son usage. Les imposer une par une enrichit la palette technique.",
    steps: ["Premier passage : intérieur du pied uniquement.", "Deuxième passage : extérieur du pied uniquement.", "Troisième passage : semelle uniquement. Dernier passage : il choisit la surface la plus adaptée."],
    mistake: "Il revient à sa surface préférée.", correction: "Annoncez la surface à voix haute avant chaque passage, et faites-la-lui toucher sur son pied.",
    easy: "Deux surfaces : intérieur et semelle.", medium: "Trois surfaces.", hard: "Vous annoncez un changement de surface au milieu du passage.",
    success: "Chaque passage est réalisé avec la surface annoncée.", caption: "Une surface à la fois", patch: (b) => ({ difficulty: up(b) }) },
  { key: "petit-ballon", label: "avec un petit ballon", applies: (b) => has(b, "conduite", "jonglage", "controle", "passes", "dribbles", "coordination") && ball(b), age: from(8),
    objective: (b) => `Réaliser « ${b.name} » avec une balle de tennis ou un ballon de taille 1.`,
    why: "Un ballon plus petit demande plus de précision. Quand on revient au ballon normal, tout paraît plus facile.",
    steps: ["Remplacez le ballon par une balle de tennis ou un mini-ballon.", "Réduisez un peu les distances et la vitesse.", "Terminez par deux passages avec le ballon habituel pour sentir le progrès."],
    mistake: "Il s'énerve : la petite balle s'échappe.", correction: "C'est normal et c'est le but : comptez seulement les réussites.",
    easy: "Mini-ballon de taille 1.", medium: "Balle de tennis.", hard: "Balle de tennis, pied faible.",
    success: "Il réussit avec le petit ballon la moitié de ce qu'il réussit avec le ballon normal.", caption: "Plus petit, plus précis", patch: (b) => ({ difficulty: up(b), level: b.level === "debutant" ? "intermediaire" : b.level }) },
  { key: "musique", label: "en musique", applies: (b) => has(b, "coordination", "motricite", "equilibre", "agilite", "conduite", "jonglage") && b.age[0] <= 10, age: (b) => [b.age[0], Math.min(b.age[1], 13)],
    objective: (b) => `Réaliser « ${b.name} » au rythme d'une musique ou de vos claquements de mains.`,
    why: "Le rythme est la base de la coordination. Bouger en mesure rend le geste plus fluide, et la séance plus joyeuse.",
    steps: ["Choisissez une musique qu'il aime, ou frappez dans vos mains.", "Il cale ses appuis ou ses touches de balle sur le tempo.", "Changez de tempo : lent, puis rapide, puis lent."],
    mistake: "Il perd le rythme dès qu'il se concentre sur le geste.", correction: "Ralentissez le tempo jusqu'à ce que geste et rythme tiennent ensemble.",
    easy: "Tempo lent.", medium: "Tempo qui change une fois.", hard: "Il s'arrête net quand la musique se coupe.",
    success: "Il tient le rythme sur un passage complet.", caption: "En rythme", patch: () => ({ parentRole: "joue" }) },
];

function decline(b: ExerciseSeed, d: Decl): Fiche | null {
  const age = d.age(b);
  if (age[0] > age[1]) return null;
  const p = d.patch?.(b) ?? {};
  return {
    ...b, ...p, slug: `${b.slug}--${d.key}`, name: `${b.name} — ${d.label}`, age, isFree: false,
    objective: d.objective(b), why: `${d.why} ${b.why}`,
    steps: [...b.steps, ...d.steps], mistakes: [d.mistake, ...b.mistakes.slice(0, 2)], corrections: [d.correction, ...b.corrections.slice(0, 2)],
    easy: d.easy, medium: d.medium, hard: d.hard, success: d.success,
    diagram: { ...b.diagram, caption: d.caption }, family: b.slug, variantKey: d.key, variantLabel: d.label,
  };
}

export const LIBRARY: Fiche[] = BASES.flatMap((b) => [
  { ...b, family: b.slug } as Fiche,
  ...DECLINATIONS.filter((d) => d.applies(b)).map((d) => decline(b, d)).filter((f): f is Fiche => f !== null),
]);
