import Link from "next/link";
import { db } from "@/lib/db";
import { LEGAL } from "@/content/legal";
export const metadata = { title: "Merci" };
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ g?: string }> }) {
  const { g } = await searchParams;
  const gift = g ? await db.giftCode.findUnique({ where: { id: g } }) : null;
  return (
    <main id="contenu" className="mx-auto max-w-xl px-5 py-10 text-center">
      <div className="text-6xl" aria-hidden>🎁</div>
      <h1 className="mt-2 font-display text-3xl font-extrabold">Merci !</h1>
      {gift?.paid ? <>
        <p className="mt-2 text-ink-700">Voici le code cadeau à offrir. Il vient aussi d'être envoyé à {gift.purchaserEmail}.</p>
        <div className="card my-5"><div className="text-xs font-bold uppercase tracking-wide text-ink-500">Code cadeau {LEGAL.brand}</div><div className="mt-1 select-all font-display text-3xl font-extrabold tracking-wider">{gift.code}</div><p className="muted mt-2">{gift.months} mois d'abonnement Famille. À saisir dans « Mon abonnement » après avoir créé un compte.</p></div>
      </> : <p className="mt-2 text-ink-700">Votre paiement est en cours de confirmation. Le code vous sera envoyé par e-mail dans quelques instants.</p>}
      <Link href="/" className="btn-ghost">Retour à l'accueil</Link>
    </main>
  );
}
