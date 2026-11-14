import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { markNotificationsRead } from "@/app/actions";
import { PageHead } from "@/components/ui";

export const metadata = { title: "Notifications" };
const ICON: Record<string, string> = { session: "⚽", report: "📝", challenge: "🏅", goal: "🌟", rest: "😴", guide: "🎓" };
export default async function Page() {
  const user = await requireUser();
  const list = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 40 });
  const unread = list.some((n) => !n.readAt);
  return (
    <div>
      <PageHead title="Notifications" sub="Réglez leur fréquence dans Paramètres." back="/app" />
      {unread && <form action={markNotificationsRead} className="mb-3"><button className="btn-ghost btn-sm w-full">Tout marquer comme lu</button></form>}
      {list.length === 0 && <div className="card muted">Rien de nouveau. Profitez-en pour jouer !</div>}
      <ul className="space-y-2">{list.map((n) => { const inner = <><span className="text-2xl" aria-hidden>{ICON[n.kind] ?? "🔔"}</span><span className="flex-1"><span className="block font-bold">{n.title}</span><span className="block text-sm text-ink-700">{n.body}</span><span className="muted block text-xs">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(n.createdAt)}</span></span>{!n.readAt && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-coral-500" aria-label="Non lue" />}</>; return <li key={n.id}>{n.href ? <Link href={n.href} className="card flex gap-3">{inner}</Link> : <div className="card flex gap-3">{inner}</div>}</li>; })}</ul>
    </div>
  );
}
