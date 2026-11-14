import { FEATURES } from "@/lib/flags";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { entOf } from "@/lib/services";
import Nav from "@/components/Nav";
import { APP_NAME } from "@/content/taxonomy";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [unread] = await Promise.all([db.notification.count({ where: { userId: user.id, readAt: null } }), db.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } }).catch(() => null)]);
  const ent = entOf(user);
  const sub = user.subscription;
  const trialLeft = sub?.status === "TRIALING" && sub.trialEndsAt && sub.trialEndsAt > new Date() ? Math.ceil((sub.trialEndsAt.getTime() - Date.now()) / 86400000) : 0;
  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-ink-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-2.5">
          <Link href="/app" className="flex items-center gap-2 font-display text-lg font-extrabold"><img src="/icons/icon.svg" alt="" className="h-8 w-8 rounded-lg" />{APP_NAME}</Link>
          <div className="flex items-center gap-2">
            {user.role !== "PARENT" && <Link href="/admin" className="chip bg-ink-900 text-white">Admin</Link>}
            <Link href="/app/abonnement" className="chip bg-sun-100 text-ink-900">{ent.tier === "DECOUVERTE" ? "Découverte" : "Famille"}</Link>
            <Link href="/app/notifications" aria-label={`Notifications${unread ? ` (${unread} non lues)` : ""}`} className="relative grid h-10 w-10 place-items-center rounded-full bg-white text-lg shadow-card">🔔{unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-coral-500 px-1 text-[11px] font-bold text-white">{unread}</span>}</Link>
          </div>
        </div>
        {trialLeft > 0 && <Link href="/app/abonnement" className="block bg-sun-400 px-4 py-1.5 text-center text-xs font-bold text-ink-900">Essai gratuit : encore {trialLeft} jour{trialLeft > 1 ? "s" : ""}. Choisir mon offre →</Link>}
        {sub?.status === "PAST_DUE" && <Link href="/app/abonnement" className="block bg-coral-100 px-4 py-1.5 text-center text-xs font-bold text-ink-900">Paiement à régulariser — vous gardez l'accès quelques jours →</Link>}
      </header>
      <main id="contenu" className="mx-auto max-w-xl px-4 pt-4">{children}</main>
      <Nav coach={FEATURES.coach} />
    </div>
  );
}
