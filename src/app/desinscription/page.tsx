import { db } from "@/lib/db";
import { unsubscribeToken } from "@/lib/mail";
import { LegalPage, S } from "@/components/LegalPage";
import { DOC_VERSIONS } from "@/content/legal";
export const metadata = { title: "Désinscription" };
export const dynamic = "force-dynamic";
// Désinscription en un clic, sans connexion, depuis le lien présent dans chaque e-mail de conseils.
export default async function Page({ searchParams }: { searchParams: Promise<{ u?: string; t?: string }> }) {
  const { u, t } = await searchParams;
  let ok = false;
  if (u && t && t === unsubscribeToken(u)) {
    const user = await db.user.findUnique({ where: { id: u } });
    if (user) {
      await db.user.update({ where: { id: u }, data: { emailMarketing: false } });
      await db.consent.create({ data: { userId: u, type: "marketing_email", version: DOC_VERSIONS.privacy, granted: false, detail: "lien de désinscription" } });
      ok = true;
    }
  }
  return <LegalPage title="Désinscription"><S t={ok ? "C'est fait" : "Lien invalide"}><p>{ok ? "Vous ne recevrez plus nos e-mails de conseils. Les messages indispensables au service (confirmation de résiliation, rappel avant renouvellement annuel) restent envoyés." : "Ce lien n'est pas valide ou a expiré. Vous pouvez gérer vos préférences depuis Paramètres."}</p></S></LegalPage>;
}
