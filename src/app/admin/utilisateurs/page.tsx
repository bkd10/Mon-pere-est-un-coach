import { can, requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { effectiveTier } from "@/lib/plans";
import { grantTier, setRole } from "../actions";

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; ok?: string }> }) {
  const me = await requirePerm("users");
  const { q, ok } = await searchParams;
  const users = await db.user.findMany({ where: q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { firstName: { contains: q, mode: "insensitive" } }] } : {}, include: { subscription: true, _count: { select: { children: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  const TIERS = ["DECOUVERTE", "ESSENTIEL", "PREMIUM", "FAMILLE"], ROLES = ["PARENT", "EDITOR", "MODERATOR", "SUPPORT", "ADMIN"];
  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-extrabold">Utilisateurs</h1><p className="muted mb-4">Les profils enfants ne sont jamais affichés nominativement ici : seul leur nombre apparaît (minimisation).</p>
      {ok && <div className="mb-3 rounded-2xl bg-pitch-50 p-3 text-sm font-semibold text-pitch-800">Modification enregistrée.</div>}
      <form className="mb-4 flex max-w-md gap-2"><input name="q" defaultValue={q} placeholder="E-mail ou prénom" className="input" aria-label="Rechercher" /><button className="btn-ghost">Rechercher</button></form>
      <div className="card overflow-x-auto p-0"><table className="w-full min-w-[820px] text-sm"><thead><tr className="bg-ink-50 text-left text-xs uppercase text-ink-500"><th className="p-3">Parent</th><th>Inscription</th><th>Enfants</th><th>Offre</th><th>Statut</th><th>Rôle</th><th>Accorder une offre</th></tr></thead><tbody>
        {users.map((u) => <tr key={u.id} className="border-t border-ink-100 align-middle"><td className="p-3"><b>{u.firstName}</b><div className="text-ink-500">{u.email}</div></td><td>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(u.createdAt)}</td><td>{u._count.children}</td><td className="font-bold">{effectiveTier(u.subscription)}</td><td>{u.subscription?.status ?? "—"}{u.subscription?.provider && u.subscription.provider !== "none" ? ` · ${u.subscription.provider}` : ""}</td>
          <td>{can(me.role, "rules") && u.id !== me.id ? <form action={setRole} className="flex gap-1"><input type="hidden" name="userId" value={u.id} /><select name="role" defaultValue={u.role} className="rounded-lg border border-ink-100 px-2 py-1" aria-label="Rôle">{ROLES.map((r) => <option key={r}>{r}</option>)}</select><button className="font-bold text-pitch-700">OK</button></form> : u.role}</td>
          <td>{can(me.role, "billing") ? <form action={grantTier} className="flex gap-1"><input type="hidden" name="userId" value={u.id} /><select name="tier" className="rounded-lg border border-ink-100 px-2 py-1" aria-label="Offre">{TIERS.map((t) => <option key={t}>{t}</option>)}</select><input name="days" type="number" defaultValue={30} min={1} max={366} className="w-16 rounded-lg border border-ink-100 px-2 py-1" aria-label="Jours" /><button className="font-bold text-pitch-700">OK</button></form> : "—"}</td></tr>)}
      </tbody></table></div>
    </div>
  );
}
