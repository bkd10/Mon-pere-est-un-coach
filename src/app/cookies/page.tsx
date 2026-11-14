import { DOC_VERSIONS, LEGAL } from "@/content/legal";
import { LegalPage, S } from "@/components/LegalPage";
export const metadata = { title: "Cookies" };
const C: [string, string, string, string][] = [
  ["pp_session", "Garder votre session ouverte", "30 jours", "Indispensable"],
  ["pp_child", "Mémoriser l'enfant sélectionné", "30 jours", "Indispensable"],
  ["Stockage du navigateur (service worker)", "Afficher une page hors ligne et charger l'application plus vite", "Jusqu'à mise à jour", "Indispensable, aucune donnée personnelle"],
];
export default function Page() {
  return (
    <LegalPage title="Politique cookies" version={DOC_VERSIONS.cookies}>
      <S t="Ce que nous utilisons"><p>{LEGAL.brand} n'utilise que des cookies strictement nécessaires au fonctionnement du service. Ils sont exemptés de consentement (article 82 de la loi Informatique et Libertés, lignes directrices de la CNIL) : c'est pourquoi aucun bandeau ne vous est présenté.</p>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tableau (défilement horizontal possible)"><table className="w-full min-w-[520px] text-sm"><thead><tr className="text-left text-xs uppercase text-ink-500"><th className="py-2 pr-2">Nom</th><th className="pr-2">Rôle</th><th className="pr-2">Durée</th><th>Catégorie</th></tr></thead><tbody>{C.map((r) => <tr key={r[0]} className="border-t border-ink-100">{r.map((c, i) => <td key={i} className="py-2 pr-2">{c}</td>)}</tr>)}</tbody></table></div></S>
      <S t="Ce que nous n'utilisons pas"><p>Aucun cookie publicitaire, aucune mesure d'audience tierce, aucun bouton de réseau social, aucune police ni script chargé depuis un service tiers. Le paiement s'effectue sur la page sécurisée de Stripe, qui applique sa propre politique.</p></S>
      <S t="Si cela change"><p>Avant d'ajouter un outil de mesure d'audience non exempté ou tout autre traceur, nous vous demanderons votre accord par un bandeau permettant d'accepter ou de refuser aussi simplement, et cette page sera mise à jour.</p></S>
    </LegalPage>
  );
}
