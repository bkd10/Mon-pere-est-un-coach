import { FEATURES } from "@/lib/flags";
import { DOC_VERSIONS, LEGAL, PROCESSORS, RETENTION, show } from "@/content/legal";
import { LegalPage, S, UL } from "@/components/LegalPage";
export const metadata = { title: "Confidentialité" };
export const dynamic = "force-dynamic";
const ROWS: [string, string, string, string][] = [
  ["Compte du parent (prénom, e-mail, mot de passe chiffré)", "Créer et sécuriser le compte", "Exécution du contrat", `Durée du compte ; suppression après ${RETENTION.inactiveAccountMonths / 12} ans d'inactivité`],
  ["Profil de l'enfant (pseudonyme, mois et année de naissance, niveau, club facultatif, jours d'entraînement, objectifs, matériel)", "Construire des séances adaptées", "Exécution du contrat conclu avec le parent", "Durée du compte, ou jusqu'à suppression du profil"],
  ["Séances, plaisir, motivation, difficulté, mesures sportives, badges", "Adapter le programme, afficher la progression, rédiger les bilans", "Exécution du contrat", "Durée du compte"],
  ["Données de forme et de santé : fatigue, douleur signalée, sommeil, taille, poids, bien-être", "Alléger ou suspendre des exercices, tenir le carnet de suivi", "Consentement explicite du parent, facultatif et retirable (art. 9.2.a RGPD)", "Jusqu'au retrait du consentement ou à la suppression du profil"],
  ["Photos et vidéos de l'album", "Garder des souvenirs privés", "Consentement du parent", "Jusqu'à suppression par le parent"],
  ["Vidéos proposées à la communauté", "Illustrer les exercices pour les autres familles", "Consentement explicite, retirable à tout moment", "Jusqu'au retrait de l'accord"],
  ["Questions au coach IA", "Répondre au parent", "Exécution du contrat", `${RETENTION.chatMonths} mois`],
  ["Paiements et factures", "Facturer, tenir la comptabilité", "Obligation légale (code de commerce)", `${RETENTION.invoiceYears} ans, anonymisées si le compte est supprimé`],
  ["Journal de sécurité (connexions échouées, actions sensibles)", "Sécuriser le service", "Intérêt légitime", `${RETENTION.auditMonths} mois`],
  ["Préférence e-mails de conseils", "Envoyer des conseils, uniquement si vous l'avez demandé", "Consentement", "Jusqu'à désinscription"],
];
export default function Page() {
  return (
    <LegalPage title="Politique de confidentialité" version={DOC_VERSIONS.privacy}>
      <S t="En bref"><UL><li>C'est le parent qui utilise l'application ; l'enfant n'a pas de compte.</li><li>Nous ne demandons que ce qui sert à construire les séances : un pseudonyme suffit, et seuls le mois et l'année de naissance sont demandés.</li><li>Aucune publicité, aucune revente, aucun profil public, aucun classement entre enfants.</li><li>Les données de forme et de santé sont facultatives, chiffrées et jamais transmises à l'IA.</li><li>Vous pouvez tout exporter et tout supprimer depuis Paramètres, à tout moment.</li></UL></S>
      <S t="Responsable du traitement"><p>{show(LEGAL.company)}, {show(LEGAL.address)}. Contact pour vos données : {show(LEGAL.dpo || LEGAL.email)}.</p></S>
      <S t="Quelles données, pourquoi, sur quelle base, combien de temps">
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tableau (défilement horizontal possible)"><table className="w-full min-w-[640px] text-sm"><thead><tr className="text-left text-xs uppercase text-ink-500"><th className="py-2 pr-2">Données</th><th className="pr-2">Finalité</th><th className="pr-2">Base légale</th><th>Conservation</th></tr></thead>
          <tbody>{ROWS.filter((r) => (FEATURES.health || !r[0].startsWith("Données de forme")) && (FEATURES.familyVideos || !r[0].startsWith("Vidéos proposées")) && (FEATURES.coach || !r[0].startsWith("Questions au coach"))).map((r) => <tr key={r[0]} className="border-t border-ink-100 align-top">{r.map((c, i) => <td key={i} className="py-2 pr-2">{c}</td>)}</tr>)}</tbody></table></div>
        <p>Les champs marqués facultatifs peuvent rester vides : le service fonctionne sans eux, avec des séances simplement moins personnalisées.</p>
      </S>
      <S t="Les enfants">
        <p>Le parent déclare être titulaire de l'autorité parentale. Pour les données de forme et de santé d'un enfant de moins de 15 ans, nous recueillons le consentement du parent et lui demandons de confirmer que l'enfant en a été informé et est d'accord, conformément à l'article 45 de la loi Informatique et Libertés. Pour une vidéo proposée à la communauté, le parent confirme l'accord des deux titulaires de l'autorité parentale et que l'enfant y a été associé selon son âge et sa maturité (article 372-1 du code civil).</p>
        <p><b>À lire avec votre enfant :</b> « Tes parents utilisent cette application pour jouer au foot avec toi. Elle garde tes séances et tes progrès pour te proposer des jeux adaptés. Personne d'autre que ta famille ne les voit. Si tu ne veux plus, tes parents peuvent tout effacer. »</p>
      </S>
      <S t="Intelligence artificielle">
        <p>Les séances sont construites par un moteur de règles à partir des fiches de l'application : aucune décision n'est prise par une IA générative.{FEATURES.coach ? " Le coach conversationnel et la rédaction des bilans utilisent le modèle Claude d'Anthropic. Nous lui transmettons uniquement l'âge, le niveau, les objectifs et le résumé des dernières séances de l'enfant, sans son prénom ni ses données de santé, ainsi que la question posée par le parent." : " Aucune donnée n'est transmise à un service d'intelligence artificielle."}</p>
        <p>Aucune décision produisant des effets juridiques n'est prise de manière automatisée.</p>
      </S>
      <S t="Qui reçoit vos données">
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tableau (défilement horizontal possible)"><table className="w-full min-w-[640px] text-sm"><thead><tr className="text-left text-xs uppercase text-ink-500"><th className="py-2 pr-2">Prestataire</th><th className="pr-2">Rôle</th><th className="pr-2">Données</th><th className="pr-2">Lieu</th><th>Garanties</th></tr></thead>
          <tbody>{PROCESSORS.filter((p) => FEATURES.coach || !p.name().startsWith("Anthropic")).map((p) => <tr key={p.role} className="border-t border-ink-100 align-top"><td className="py-2 pr-2 font-semibold">{p.name()}</td><td className="pr-2">{p.role}</td><td className="pr-2">{p.data}</td><td className="pr-2">{p.place()}</td><td>{p.guarantee}</td></tr>)}</tbody></table></div>
        <p>Les modérateurs et le support de {LEGAL.brand} n'accèdent qu'aux informations nécessaires à leur mission ; les noms des enfants ne sont pas affichés dans l'administration.</p>
      </S>
      <S t="Sécurité"><p>Mots de passe hachés (bcrypt), sessions signées, données de santé chiffrées (AES-256-GCM), contrôle d'accès à chaque requête, photos et vidéos servies uniquement à leur propriétaire, journal des actions sensibles.</p></S>
      <S t="Vos droits"><p>Accès, rectification, effacement, limitation, opposition, portabilité et retrait du consentement à tout moment, sans effet sur la licéité des traitements passés. Depuis Paramètres : export complet et suppression immédiate du compte. Sans accès à votre compte : <a href="/supprimer-mes-donnees" className="font-bold text-pitch-700 underline">formulaire de demande</a> ou {show(LEGAL.dpo || LEGAL.email)}. Réponse sous un mois. Vous pouvez aussi saisir la CNIL (www.cnil.fr) et définir des directives sur le sort de vos données après votre décès.</p></S>
      <S t="Cookies"><p>Voir la <a href="/cookies" className="font-bold text-pitch-700 underline">politique cookies</a> : uniquement des cookies indispensables.</p></S>
    </LegalPage>
  );
}
