import { LEGAL, show, mediatorText } from "@/content/legal";
import { LegalPage, S } from "@/components/LegalPage";
export const metadata = { title: "Mentions légales" };
export default function Page() {
  return (
    <LegalPage title="Mentions légales">
      <S t="Éditeur"><p>{show(LEGAL.company)}{LEGAL.form ? `, ${LEGAL.form}` : ""}{LEGAL.capital ? ` au capital de ${LEGAL.capital}` : ""}<br />Siège : {show(LEGAL.address)}<br />Immatriculation : {show(LEGAL.siren)}<br />TVA : {show(LEGAL.vat)}<br />Contact : {show(LEGAL.email)} · {show(LEGAL.phone)}</p></S>
      <S t="Directeur de la publication"><p>{show(LEGAL.director)}</p></S>
      <S t="Hébergeur"><p>{show(LEGAL.hostName)}<br />{show(LEGAL.hostAddress)}<br />{show(LEGAL.hostPhone)}</p></S>
      <S t="Médiation de la consommation"><p>{mediatorText("En cas de litige non résolu avec notre service client, vous pouvez saisir gratuitement le médiateur de la consommation : ")}</p></S>
      <S t="Propriété intellectuelle"><p>Les textes, fiches d'exercices, schémas animés, illustrations et logiciels de {LEGAL.brand} sont protégés. Toute reproduction sans autorisation est interdite. Les polices de caractères (Nunito, Outfit) sont distribuées sous licence SIL Open Font License 1.1. {LEGAL.brand} n'est affilié à aucune fédération ni à aucun club.</p></S>
      <S t="Données personnelles"><p>Voir la politique de confidentialité et la politique cookies.</p></S>
    </LegalPage>
  );
}
