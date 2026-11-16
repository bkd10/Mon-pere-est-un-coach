// Liste de contrôle avant publication : 20 points + obligations complémentaires.
// Statuts calculés quand c'est vérifiable automatiquement ; sinon « À faire » avec l'action attendue.
import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { LEGAL, missingLegal, PROCESSORS } from "@/content/legal";
import { stripeEnabled } from "@/lib/billing";
import { mailEnabled } from "@/lib/mail";
import { aiAvailable } from "@/lib/coach";

type St = "ok" | "todo" | "warn";
const BADGE: Record<St, [string, string]> = { ok: ["Conforme", "bg-pitch-100 text-pitch-800"], warn: ["À vérifier", "bg-sun-100 text-ink-900"], todo: ["À faire avant publication", "bg-coral-100 text-coral-600"] };

export default async function Page() {
  await requirePerm("rules");
  const miss = missingLegal();
  const missKeys = new Set(miss.map(([k]) => k));
  const [consents, deletions, reports, lastDaily, unvalidated, totalEx, testimonials] = await Promise.all([
    db.consent.count(), db.deletionRequest.count({ where: { status: "recue" } }), db.contentReport.count({ where: { status: "ouvert" } }),
    db.auditLog.findFirst({ where: { action: "daily_run" }, orderBy: { createdAt: "desc" } }),
    db.exercise.count({ where: { published: true, OR: [{ validatedBy: null }, { validatedBy: { contains: "à faire relire" } }] } }), db.exercise.count({ where: { published: true } }),
    Promise.resolve(0),
  ]);
  const fields = (keys: (keyof typeof LEGAL)[]) => keys.filter((k) => missKeys.has(k)).map((k) => miss.find(([x]) => x === k)![1]);
  const legalMiss = fields(["company", "form", "address", "siren", "vat", "director", "email", "phone", "hostName", "hostAddress", "hostPhone"]);
  const items: { n: number; t: string; s: St; d: string; href?: string }[] = [
    { n: 1, t: "Mentions légales", s: legalMiss.length ? "todo" : "ok", d: legalMiss.length ? `Page en place. Champs manquants dans .env : ${legalMiss.join(", ")}.` : "Éditeur, directeur de publication et hébergeur renseignés.", href: "/mentions-legales" },
    { n: 2, t: "Politique de confidentialité", s: fields(["dataLocation", "hostName"]).length ? "todo" : "warn", d: "Finalités, bases légales, durées, destinataires, transferts, droits, mineurs et IA décrits. À faire relire par un juriste ; compléter la localisation des données.", href: "/confidentialite" },
    { n: 3, t: "Conditions générales (CGU et CGV)", s: fields(["mediatorName", "mediatorUrl"]).length ? "todo" : "warn", d: `Service, prix TTC, essai, renouvellement, résiliation, rétractation, médiation. ${fields(["mediatorName", "mediatorUrl"]).length ? "Adhérer à un médiateur de la consommation (obligatoire) et le renseigner." : ""} À faire relire par un avocat.`, href: "/cgu" },
    { n: 4, t: "Remboursements et rétractation", s: "ok", d: "14 jours, remboursement au prorata (L221-25), bouton de rétractation dans l'application, formulaire type publié.", href: "/remboursements" },
    { n: 5, t: "Politique cookies", s: "ok", d: "Uniquement des cookies indispensables, listés. Polices auto-hébergées : aucune requête vers un service tiers (vérifié par le test automatique).", href: "/cookies" },
    { n: 6, t: "Bandeau cookies", s: "ok", d: "Non requis tant qu'aucun traceur non exempté n'est utilisé (CNIL). Si vous ajoutez de la mesure d'audience ou de la publicité : bandeau obligatoire avant tout dépôt, avec « Refuser » aussi simple qu'« Accepter »." },
    { n: 7, t: "Consentements", s: "ok", d: `Journalisés avec version et date (${consents} enregistrés) : CGU, autorité parentale, santé (séparé, facultatif), e-mails (décoché par défaut), partage de vidéo, accès immédiat. Historique visible par le parent.` },
    { n: 8, t: "Zéro donnée inutile", s: lastDaily && Date.now() - lastDaily.createdAt.getTime() < 2 * 86400000 ? "ok" : "todo", d: `Mois et année de naissance seulement, pseudonyme, champ « expérience » supprimé, prénom et santé jamais envoyés à l'IA. Purge automatique : ${lastDaily ? `dernière exécution le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(lastDaily.createdAt)}` : "jamais exécutée — planifier « npm run daily » chaque nuit sur le serveur"}.` },
    { n: 9, t: "Audit des outils tiers", s: "todo", d: `${PROCESSORS.length} sous-traitants listés dans la politique (hébergeur, Stripe, Anthropic, e-mails). Signer leurs contrats de sous-traitance (DPA) et conserver les preuves. Aucun script, police ou traceur tiers chargé dans l'application.` },
    { n: 10, t: "Zéro piège (dark patterns)", s: "ok", d: "Essai sans carte et sans conversion automatique, mensuel présélectionné, aucune case précochée, résiliation et rétractation en quelques clics, pas de culpabilisation." },
    { n: 11, t: "Zéro frais caché", s: "ok", d: "Prix TTC partout, récapitulatif avant paiement, bouton « Commander avec obligation de paiement », aucun frais annexe." },
    { n: 12, t: "Zéro faux avis", s: testimonials === 0 ? "ok" : "todo", d: "Aucun avis, témoignage, note ni badge de popularité affiché (« Le plus choisi » supprimé). Si vous publiez des avis : préciser s'ils sont vérifiés et comment (L111-7-2)." },
    { n: 13, t: "Zéro promesse non prouvée", s: unvalidated ? "todo" : "ok", d: `Allégations reformulées (validation, prix, statistiques non sourcées, effets sur la santé). ${unvalidated} fiches sur ${totalEx} n'ont pas encore de relecture par un éducateur diplômé : ne pas les présenter comme « validées » avant.` },
    { n: 14, t: "Texte alternatif des images", s: "ok", d: "Images et schémas animés décrits ; contrôlé automatiquement (axe-core) sur les écrans principaux." },
    { n: 15, t: "Contraste des couleurs", s: "ok", d: "Niveau AA contrôlé automatiquement (axe-core) sur les écrans principaux." },
    { n: 16, t: "Navigation clavier", s: "ok", d: "Focus visible, lien « Aller au contenu », Échap pour quitter la séance guidée ; parcours au clavier testé.", href: "/accessibilite" },
    { n: 17, t: "Accord des parents", s: "ok", d: "Attestation d'autorité parentale à l'inscription ; santé : accord du parent + de l'enfant avant 15 ans ; vidéo : deux parents et enfant associé (art. 372-1 C. civ.)." },
    { n: 18, t: "Lien de désinscription", s: mailEnabled() ? "ok" : "warn", d: `Lien en un clic sans connexion (+ en-tête List-Unsubscribe) dans tout e-mail de conseils ; réglage dans Paramètres. ${mailEnabled() ? "" : "Aucun serveur d'envoi configuré (SMTP_URL) : les e-mails sont seulement journalisés."}` },
    { n: 19, t: "Droits sur polices et images", s: "warn", d: "Polices Nunito et Outfit sous licence SIL OFL (usage commercial autorisé), logo et schémas créés pour l'application, aucune image de tiers. Reste à vérifier la disponibilité de la marque « Premiers Pas Foot » (INPI, EUIPO) et des noms de domaine." },
    { n: 20, t: "Suppression des données", s: deletions ? "todo" : "ok", d: `Suppression immédiate du compte, d'un enfant, du carnet ou d'un média ; export JSON ; formulaire sans connexion. Factures conservées 10 ans, anonymisées. ${deletions ? `${deletions} demande(s) en attente.` : ""}`, href: "/supprimer-mes-donnees" },
  ];
  const extra: { t: string; s: St; d: string }[] = [
    { t: "Analyse d'impact (AIPD)", s: "todo", d: "Données de mineurs et données de santé : une AIPD est nécessaire avant le lancement (liste de la CNIL). À rédiger, idéalement avec un DPO ; envisager la désignation d'un DPO." },
    { t: "Hébergement des données de santé", s: "warn", d: "Faire confirmer par un juriste que le carnet (taille, poids, sommeil, douleur) relève du bien-être sportif et non d'une prise en charge sanitaire nécessitant un hébergeur certifié HDS. En cas de doute, choisir un hébergeur HDS." },
    { t: "IA : obligation de transparence (AI Act, art. 50)", s: "ok", d: "Le coach annonce qu'il est une IA ; les bilans rédigés par l'IA sont signalés. En vigueur depuis le 2 août 2026." },
    { t: "Contenus des familles (DSA)", s: reports ? "todo" : "ok", d: `Signalement sur chaque vidéo publiée, motifs communiqués en cas de retrait, modération humaine. ${reports ? `${reports} signalement(s) à traiter.` : ""}` },
    { t: "Résiliation (L215-1-1) et rappel de reconduction (L215-1)", s: mailEnabled() ? "ok" : "todo", d: "Bouton « Résilier mon abonnement », confirmation avec date d'effet, rappel un mois avant la reconduction annuelle. La confirmation doit arriver sur support durable : configurer SMTP_URL." },
    { t: "Paiement", s: stripeEnabled() ? "ok" : "todo", d: stripeEnabled() ? "Stripe configuré." : "Mode démonstration : configurer Stripe (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) et le taux de TVA (LEGAL_VAT_RATE) avec votre expert-comptable." },
    { t: "Coach IA", s: aiAvailable() ? "ok" : "warn", d: aiAvailable() ? "Clé configurée. Signer l'avenant de traitement des données d'Anthropic." : "Clé absente : le coach répond en mode fiches." },
    { t: "Boutique de matériel", s: "warn", d: "Les ventes se font sur votre boutique externe : elle doit avoir ses propres CGV (rétractation 14 jours, garantie légale de conformité 2 ans, livraison) et le matériel doit porter le marquage requis (jouets ou articles de sport)." },
    { t: "Relecture juridique", s: "todo", d: "Tous les textes légaux sont des modèles rédigés pour l'application : à faire valider par un avocat avant ouverture au public." },
  ];
  const todo = [...items, ...extra].filter((i) => i.s === "todo").length;
  const Row = ({ n, t, s, d, href }: { n?: number; t: string; s: St; d: string; href?: string }) => (
    <li className="card flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-4">
      <span className="w-8 shrink-0 font-display text-lg font-extrabold text-ink-500">{n ?? "+"}</span>
      <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><b>{t}</b><span className={`chip ${BADGE[s][1]}`}>{BADGE[s][0]}</span>{href && <Link href={href} className="text-sm font-bold text-pitch-700 underline">Voir</Link>}</span><span className="mt-1 block text-sm text-ink-700">{d}</span></span>
    </li>
  );
  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-extrabold">Conformité avant publication</h1>
      <p className="muted mb-4 max-w-3xl">{todo === 0 ? "Aucun point bloquant détecté." : `${todo} point(s) à traiter avant d'ouvrir au public.`} Cette liste vérifie ce qui peut l'être automatiquement ; elle ne remplace pas la relecture d'un avocat.</p>
      <ul className="space-y-2">{items.map((i) => <Row key={i.n} {...i} />)}</ul>
      <h2 className="mb-2 mt-6 font-display text-lg font-extrabold">Obligations complémentaires</h2>
      <ul className="space-y-2">{extra.map((i) => <Row key={i.t} {...i} />)}</ul>
    </div>
  );
}
