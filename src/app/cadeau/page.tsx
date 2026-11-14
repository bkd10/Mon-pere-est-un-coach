import Link from "next/link";
import { euro } from "@/lib/plans";
import { giftPriceCents, stripeEnabled } from "@/lib/billing";
import { LEGAL } from "@/content/legal";
import LegalFooter from "@/components/LegalFooter";
import Submit from "@/components/Submit";
import { buyGift } from "../public-actions";

export const metadata = { title: "Carte cadeau Une saison", description: "Offrez une saison de séances de foot à faire en famille : 12 mois d'abonnement, sans renouvellement." };
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ e?: string; annule?: string }> }) {
  const sp = await searchParams;
  const price = giftPriceCents();
  return (
    <main id="contenu" className="mx-auto max-w-xl px-5 py-8">
      <Link href="/" className="flex items-center gap-2 font-display text-xl font-extrabold"><img src="/icons/icon.svg" alt="" className="h-9 w-9 rounded-xl" />{LEGAL.brand}</Link>
      <span className="chip mt-6 bg-sun-100 text-ink-900">Carte cadeau</span>
      <h1 className="mt-2 font-display text-4xl font-extrabold leading-tight tracking-tight">Offrez une saison de foot en famille.</h1>
      <p className="mt-3 text-lg text-ink-700">Douze mois de séances guidées à faire à la maison, adaptées à l'âge de l'enfant. Un ballon suffit pour commencer.</p>
      {sp.e && <p role="alert" className="mt-4 rounded-2xl bg-coral-100 p-3 text-sm font-semibold">{sp.e}</p>}
      {sp.annule && <p className="mt-4 rounded-2xl bg-sun-100 p-3 text-sm font-semibold">Paiement annulé : rien n'a été débité.</p>}
      {!stripeEnabled() && <p className="mt-4 rounded-2xl bg-sun-100 p-3 text-sm">🧪 Mode démonstration : aucun débit ne sera effectué.</p>}
      <div className="card my-5">
        <div className="flex items-end justify-between"><div className="font-display text-xl font-extrabold">Une saison</div><div className="font-display text-3xl font-extrabold">{euro(price)} <span className="text-sm font-bold text-ink-500">TTC</span></div></div>
        <ul className="mt-3 space-y-1.5 text-sm text-ink-700">{["12 mois d'abonnement Famille, jusqu'à 3 enfants", "Paiement unique : aucun renouvellement, aucun prélèvement ensuite", "Code envoyé par e-mail tout de suite, à imprimer ou à transférer", "Le code s'active quand la famille le saisit : l'année démarre ce jour-là"].map((x) => <li key={x} className="flex gap-2"><span className="text-pitch-600">✓</span>{x}</li>)}</ul>
      </div>
      <form action={buyGift} className="space-y-3">
        <div><label className="label" htmlFor="email">Votre e-mail (pour recevoir le code)</label><input id="email" name="email" type="email" required className="input" autoComplete="email" /></div>
        <label className="flex gap-3 rounded-2xl bg-white p-3 text-sm shadow-card"><input type="checkbox" name="cgv" required className="mt-0.5 h-5 w-5 shrink-0 accent-pitch-600" /><span>J'accepte les <Link href="/cgu" target="_blank" className="font-bold text-pitch-700 underline">conditions générales de vente</Link>. Je peux me rétracter pendant 14 jours tant que le code n'a pas été utilisé.</span></label>
        <Submit className="btn-primary w-full text-base">Commander avec obligation de paiement · {euro(price)}</Submit>
      </form>
      <LegalFooter className="mt-10 border-t border-ink-100 pt-6" />
    </main>
  );
}
