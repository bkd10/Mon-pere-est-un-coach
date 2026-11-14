import Link from "next/link";
import { redirect } from "next/navigation";
import { can, isStaff, requireUser } from "@/lib/auth";
import { APP_NAME } from "@/content/taxonomy";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administration" };
const NAV: [string, string, string][] = [["/admin", "Tableau de bord", "stats"], ["/admin/utilisateurs", "Utilisateurs", "users"], ["/admin/exercices", "Exercices", "content"], ["/admin/guides", "Guides", "content"], ["/admin/regles", "Règles de l'IA", "rules"], ["/admin/offres", "Offres et tarifs", "billing"], ["/admin/boutique", "Boutique", "billing"], ["/admin/moderation", "Modération et demandes", "moderation"], ["/admin/notifications", "Notifications", "rules"], ["/admin/conformite", "Conformité", "rules"]];
const ROLE: Record<string, string> = { ADMIN: "Administrateur", EDITOR: "Éditeur de contenus", MODERATOR: "Modérateur", SUPPORT: "Support" };

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!isStaff(user.role)) redirect("/app");
  return (
    <div className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-100 bg-ink-900 text-white"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3"><div className="font-display text-lg font-extrabold">{APP_NAME} · Administration</div><div className="flex items-center gap-3 text-sm"><span className="chip bg-white/15 text-white">{ROLE[user.role]}</span><Link href="/app" className="font-bold underline">Espace parent</Link></div></div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-2">{NAV.filter(([, , perm]) => can(user.role, perm)).map(([href, label]) => <Link key={href} href={href} className="shrink-0 rounded-full px-3 py-1.5 text-sm font-bold text-white/85 hover:bg-white/15">{label}</Link>)}</nav></header>
      <main id="contenu" className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
