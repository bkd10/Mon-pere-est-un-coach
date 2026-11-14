import { LEGAL, show } from "@/content/legal";
import { LegalPage, S, UL } from "@/components/LegalPage";
export const metadata = { title: "Accessibilité" };
export default function Page() {
  return (
    <LegalPage title="Accessibilité">
      <S t="Notre démarche"><p>{LEGAL.brand} est conçu pour être utilisable au clavier, avec un lecteur d'écran et sur petit écran. Chaque version est vérifiée automatiquement avec l'outil axe-core sur les principaux écrans (contraste, textes alternatifs, libellés de formulaires, structure).</p></S>
      <S t="Ce qui est en place"><UL><li>Navigation complète au clavier, focus visible, lien « Aller au contenu ».</li><li>Textes alternatifs sur les images ; schémas animés décrits et pouvant être mis en pause ; animations réduites si votre appareil le demande.</li><li>Contrastes de couleurs conformes au niveau AA.</li><li>Formulaires avec libellés explicites et messages d'erreur en texte.</li></UL></S>
      <S t="Limites connues"><UL><li>Aucun audit complet RGAA n'a encore été réalisé par un organisme indépendant.</li><li>Les vidéos proposées par les familles ne sont pas sous-titrées.</li></UL></S>
      <S t="Nous signaler un problème"><p>Écrivez-nous à {show(LEGAL.email)} : nous vous répondrons et vous fournirons l'information sous une autre forme si besoin.</p></S>
    </LegalPage>
  );
}
