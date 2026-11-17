import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { euro } from "@/lib/plans";
import { LEGAL, show } from "@/content/legal";
import PrintButton from "@/components/PrintButton";

export const metadata = { title: "Facture" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const p = await db.payment.findFirst({ where: { id, userId: user.id } });
  if (!p || p.status === "failed") notFound();
  // Franchise en base (art. 293 B du CGI) : pas de TVA facturée, le prix payé est le prix net.
  const franchise = /293 ?B/i.test(LEGAL.vat);
  const vatRate = franchise ? 0 : Number(process.env.LEGAL_VAT_RATE ?? "20");
  const ht = Math.round(p.amountCents / (1 + vatRate / 100));
  return (
    <div className="card my-4 text-sm">
      <div className="flex items-start justify-between gap-3"><div><div className="font-display text-xl font-extrabold">{p.status === "refunded" ? "Avoir" : "Facture"} {p.invoiceNumber}</div><div className="muted">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(p.createdAt)}</div></div><PrintButton /></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div><div className="text-xs font-bold uppercase text-ink-500">Vendeur</div><p>{show(LEGAL.company)} {LEGAL.form}<br />{show(LEGAL.address)}<br />{show(LEGAL.siren)}<br />{show(LEGAL.vat)}</p></div>
        <div><div className="text-xs font-bold uppercase text-ink-500">Client</div><p>{user.firstName}<br />{user.email}</p></div>
      </div>
      <table className="mt-4 w-full"><tbody>
        <tr className="border-t border-ink-100"><td className="py-2">{p.description}</td><td className="text-right">{euro(ht)}{franchise ? "" : " HT"}</td></tr>
        {franchise ? null : <tr className="border-t border-ink-100"><td className="py-2">TVA {vatRate} %</td><td className="text-right">{euro(p.amountCents - ht)}</td></tr>}
        <tr className="border-t border-ink-100 font-bold"><td className="py-2">Total{franchise ? "" : " TTC"} {p.status === "refunded" ? "remboursé" : "payé"}</td><td className="text-right">{euro(p.amountCents)}</td></tr>
      </tbody></table>
      <p className="muted mt-4">{p.provider === "demo" ? "Document de démonstration, sans valeur comptable : aucun paiement réel n'a eu lieu." : "Paiement par carte via Stripe."}{franchise ? " TVA non applicable, art. 293 B du CGI." : ""}</p>
    </div>
  );
}
