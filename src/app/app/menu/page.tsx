import { FEATURES } from "@/lib/flags";
import Link from "next/link";
import { logout } from "@/app/actions";
import { getActiveChild } from "@/lib/auth";
import { PageHead } from "@/components/ui";
import LegalFooter from "@/components/LegalFooter";

const ITEMS = [
  ["/app/enfant", "🧒", "Mon enfant", "Profil, passeport, badges, album de souvenirs"],
  ["/app/calendrier", "📅", "Calendrier", "Séances, repos, matchs et vacances"],
  ["/app/guide", "🎓", "Guide parents", "L'académie des parents et « Dépenser intelligemment »"],
  ["/app/coach", "💬", "Coach IA", "Posez vos questions, à toute heure"],
  ["/app/bilans", "📝", "Bilans", "Bilan mensuel et bilan de fin de saison"],
  ["/app/boutique", "🛒", "Le matériel", "Kits de plots, mini-buts, échelle, ballons"],
  ["/app/videos", "🎬", "Vidéos des exercices", "Démonstrations animées et vidéos de familles"],
  ["/app/abonnement", "💳", "Mon abonnement", "Offre, factures, résiliation"],
  ["/app/parametres", "⚙️", "Paramètres", "Notifications, modes, confidentialité"],
];
export default async function Page() {
  const { user } = await getActiveChild();
  return (
    <div>
      <PageHead title="Menu" sub={user.email} />
      <ul className="space-y-2">{ITEMS.filter(([href]) => href !== "/app/coach" || FEATURES.coach).map(([href, icon, title, sub]) => <li key={href}><Link href={href} className="card flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-pitch-50 text-xl" aria-hidden>{icon}</span><span className="flex-1"><span className="block font-bold">{title}</span><span className="muted block">{sub}</span></span><span className="text-ink-300" aria-hidden>›</span></Link></li>)}</ul>
      <LegalFooter className="mt-5 px-1" />
      <form action={logout} className="mt-5"><button className="btn-ghost w-full">Se déconnecter</button></form>
    </div>
  );
}
