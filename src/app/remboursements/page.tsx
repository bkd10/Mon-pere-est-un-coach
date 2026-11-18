import { LEGAL, show } from "@/content/legal";
import { salesOpen } from "@/lib/flags";
import { LegalPage, S, UL } from "@/components/LegalPage";
export const metadata = { title: "Rétractation et remboursements" };
export default function Page() {
  return (
    <LegalPage title="Rétractation et remboursements">
      <S t="Rétractation : 14 jours"><UL><li>Vous pouvez vous rétracter dans les 14 jours suivant la souscription d'un abonnement, sans donner de motif.</li><li><b>Le plus simple :</b> « Mon abonnement » → « Exercer mon droit de rétractation ». L'abonnement s'arrête immédiatement et le remboursement est lancé.</li><li>Vous pouvez aussi nous envoyer le formulaire ci-dessous, ou toute déclaration claire, à {show(LEGAL.email)}.</li></UL></S>
      <S t="Montant remboursé"><p>Le service ayant démarré à votre demande dès la souscription, nous remboursons le prix payé diminué de la part correspondant aux jours écoulés (article L221-25 du code de la consommation). Le remboursement intervient au plus tard 14 jours après votre demande, sur le moyen de paiement utilisé, sans frais.</p></S>
      <S t="Après 14 jours"><p>Vous pouvez résilier à tout moment : l'accès continue jusqu'à la fin de la période payée et rien n'est plus prélevé. La période en cours n'est pas remboursée, sauf défaut de conformité du service ou erreur de notre part.</p></S>
      <S t={salesOpen() ? "Essai gratuit" : "Lancement gratuit"}><p>{salesOpen() ? "Rien n'est payé pendant l'essai : il n'y a donc rien à rembourser ni à annuler." : "Pendant le lancement, l'application est gratuite : rien n'est payé, il n'y a donc rien à rembourser ni à annuler."}</p></S>
      <S t="Matériel"><p>Les kits et le matériel sont vendus sur notre boutique en ligne : rétractation de 14 jours à compter de la réception, garantie légale de conformité de 2 ans et garantie des vices cachés, selon les conditions de vente de la boutique.</p></S>
      <S t="Formulaire de rétractation"><div className="rounded-2xl bg-ink-50 p-4 text-sm"><p>À l'attention de {show(LEGAL.company)}, {show(LEGAL.address)}, {show(LEGAL.email)} :</p><p className="mt-2">Je vous notifie par la présente ma rétractation du contrat portant sur l'abonnement ci-dessous :<br />— Offre souscrite :<br />— Souscrite le :<br />— Nom du consommateur :<br />— Adresse e-mail du compte :<br />— Date :<br />— Signature (uniquement en cas d'envoi sur papier) :</p></div></S>
    </LegalPage>
  );
}
