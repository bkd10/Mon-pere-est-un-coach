import Link from "next/link";
export const LEGAL_LINKS: [string, string][] = [
  ["/mentions-legales", "Mentions légales"], ["/confidentialite", "Confidentialité"], ["/cgu", "Conditions générales"], ["/remboursements", "Rétractation et remboursements"],
  ["/cookies", "Cookies"], ["/accessibilite", "Accessibilité"], ["/supprimer-mes-donnees", "Supprimer mes données"],
];
export default function LegalFooter({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Informations légales" className={`flex flex-wrap gap-x-4 gap-y-2 text-sm ${className}`}>
      {LEGAL_LINKS.map(([href, label]) => <Link key={href} href={href} className="font-semibold text-ink-700 underline underline-offset-2 hover:text-pitch-700">{label}</Link>)}
    </nav>
  );
}
