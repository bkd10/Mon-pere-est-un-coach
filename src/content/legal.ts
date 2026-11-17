// Informations légales de l'éditeur. Elles se renseignent dans .env (LEGAL_*), jamais en dur :
// tant qu'un champ obligatoire manque, il s'affiche « [À COMPLÉTER] » et la page Conformité de l'administration le signale.
const env = (k: string) => (process.env[k] ?? "").trim();

export const LEGAL = {
  brand: env("NEXT_PUBLIC_APP_NAME") || "Premiers Pas Foot",
  founderLine: env("FOUNDER_LINE"), // mention affichée sur la page d'accueil ; doit rester exacte et vérifiable
  company: env("LEGAL_COMPANY"), // raison sociale (ou nom et prénom pour un entrepreneur individuel)
  form: env("LEGAL_FORM"), // SAS, SARL, EI…
  capital: env("LEGAL_CAPITAL"), // ex. « 1 000 € » (sociétés)
  address: env("LEGAL_ADDRESS"),
  siren: env("LEGAL_SIREN"), // SIREN / RCS (ex. « RCS Paris 123 456 789 »)
  vat: env("LEGAL_VAT"), // n° TVA intracommunautaire, ou « TVA non applicable, art. 293 B du CGI »
  director: env("LEGAL_DIRECTOR"), // directeur de la publication
  email: env("LEGAL_EMAIL"), // contact, réclamations et exercice des droits
  phone: env("LEGAL_PHONE"),
  dpo: env("LEGAL_DPO"), // délégué à la protection des données, si désigné (sinon le contact ci-dessus)
  hostName: env("LEGAL_HOST_NAME"), // hébergeur
  hostAddress: env("LEGAL_HOST_ADDRESS"),
  hostPhone: env("LEGAL_HOST_PHONE"),
  dataLocation: env("LEGAL_DATA_LOCATION"), // ex. « France » ou « Union européenne »
  mediatorName: env("LEGAL_MEDIATOR_NAME"), // médiateur de la consommation (obligatoire, art. L612-1 code de la consommation)
  mediatorUrl: env("LEGAL_MEDIATOR_URL"),
  mediatorAddress: env("LEGAL_MEDIATOR_ADDRESS"),
};

export const REQUIRED_LEGAL: [keyof typeof LEGAL, string][] = [
  ["company", "Raison sociale"], ["form", "Forme juridique"], ["address", "Adresse du siège"], ["siren", "SIREN / RCS"], ["vat", "TVA intracommunautaire ou mention de franchise"],
  ["director", "Directeur de la publication"], ["email", "E-mail de contact"], ["phone", "Téléphone"], ["hostName", "Hébergeur"], ["hostAddress", "Adresse de l'hébergeur"],
  ["hostPhone", "Téléphone de l'hébergeur"], ["dataLocation", "Localisation des données"], ["mediatorName", "Médiateur de la consommation"], ["mediatorUrl", "Site du médiateur"],
];
// Le médiateur n'est exigé que pour vendre : pendant la phase de lancement gratuite (ventes fermées), il n'est pas requis.
const selling = () => Boolean(LEGAL.mediatorName && LEGAL.mediatorUrl) || process.env.DEMO_SALES === "1";
export const missingLegal = () => REQUIRED_LEGAL.filter(([k]) => !LEGAL[k] && (selling() || !k.startsWith("mediator")));
export const mediatorText = (pre: string) => LEGAL.mediatorName ? `${pre}${LEGAL.mediatorName} — ${show(LEGAL.mediatorUrl)}${LEGAL.mediatorAddress ? ` — ${LEGAL.mediatorAddress}` : ""}.` : selling() ? `${pre}[À COMPLÉTER].` : "Aucune vente n'est proposée pendant la phase de lancement gratuite. Un médiateur de la consommation sera désigné et indiqué ici avant l'ouverture de toute offre payante.";
export const show = (v: string) => v || "[À COMPLÉTER]";

// Versions des documents : changer la version oblige les utilisateurs à accepter de nouveau les conditions.
export const DOC_VERSIONS = { cgu: "2026-11-12", privacy: "2026-11-12", cookies: "2026-11-12" };

// Durées de conservation appliquées par le script quotidien (scripts/daily.ts).
export const RETENTION = {
  inactiveAccountMonths: 36, chatMonths: 12, notificationMonths: 6, auditMonths: 12, emailLogMonths: 12, deletionRequestMonths: 36, invoiceYears: 10,
};

// Sous-traitants et outils tiers : chaque service qui reçoit des données doit figurer ici.
export const PROCESSORS = [
  { name: () => show(LEGAL.hostName), role: "Hébergement de l'application, de la base de données et des fichiers", data: "Toutes les données du service", place: () => show(LEGAL.dataLocation), guarantee: "Contrat de sous-traitance (art. 28 RGPD) à signer avec l'hébergeur" },
  { name: () => "Stripe Payments Europe Ltd.", role: "Paiement des abonnements", data: "E-mail du parent, moyen de paiement (saisi chez Stripe, jamais chez nous), montants", place: () => "Irlande ; transferts possibles vers les États-Unis", guarantee: "Accord de traitement des données de Stripe, clauses contractuelles types / Data Privacy Framework" },
  { name: () => "Anthropic (modèle Claude)", role: "Coach conversationnel et rédaction des bilans", data: "Âge, niveau, objectifs et dernières séances de l'enfant, questions du parent. Jamais : prénom, e-mail, carnet de santé, photos", place: () => "États-Unis", guarantee: "Conditions commerciales d'Anthropic et avenant de traitement des données (DPA), clauses contractuelles types ; les données de l'API ne servent pas à entraîner les modèles" },
  { name: () => "Service d'envoi d'e-mails (SMTP)", role: "E-mails de service : confirmation de résiliation, rappel de renouvellement", data: "E-mail et prénom du parent", place: () => "À préciser selon le prestataire choisi", guarantee: "Contrat de sous-traitance à signer" },
];
