import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { GUIDE_THEMES } from "@/content/guides";
export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await requirePerm("content");
  const { ok } = await searchParams;
  const list = await db.guide.findMany({ orderBy: [{ theme: "asc" }, { createdAt: "asc" }], include: { _count: { select: { reads: true } } } });
  return (
    <div>
      <div className="mb-4 flex items-center justify-between"><h1 className="font-display text-2xl font-extrabold">Guides ({list.length})</h1><Link href="/admin/guides/nouveau" className="btn-primary btn-sm">+ Nouveau guide</Link></div>
      {ok && <div className="mb-3 rounded-2xl bg-pitch-50 p-3 text-sm font-semibold text-pitch-800">Guides mis à jour.</div>}
      <div className="card overflow-x-auto p-0"><table className="w-full min-w-[640px] text-sm"><thead><tr className="bg-ink-50 text-left text-xs uppercase text-ink-500"><th className="p-3">Titre</th><th>Thème</th><th>Lectures</th><th>Gratuit</th><th>Publié</th><th /></tr></thead><tbody>{list.map((g) => <tr key={g.id} className="border-t border-ink-100"><td className="p-3 font-bold">{g.title}</td><td>{GUIDE_THEMES[g.theme]?.label ?? g.theme}</td><td>{g._count.reads}</td><td>{g.isFree ? "✓" : ""}</td><td>{g.published ? "✓" : "✗"}</td><td className="pr-3 text-right"><Link href={`/admin/guides/${g.id}`} className="font-bold text-pitch-700">Modifier</Link></td></tr>)}</tbody></table></div>
    </div>
  );
}
