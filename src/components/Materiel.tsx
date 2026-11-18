// Matériel d'une séance ou d'un exercice : le vrai matériel d'abord, la solution maison en attendant.
import { kitOf } from "@/content/taxonomy";

export default function Materiel({ items, compact = false, shopHref }: { items: string[]; compact?: boolean; shopHref?: string }) {
  const keys = items.filter((k, i, a) => a.indexOf(k) === i).sort((a, b) => (a === "ballon" ? -1 : b === "ballon" ? 1 : 0));
  if (keys.length === 0) return compact ? <p className="text-sm text-ink-700"><b>Matériel :</b> aucun.</p> : <div className="rounded-2xl bg-ink-50 p-3 text-sm"><span className="font-bold">Matériel</span> : aucun, rien à acheter ni à préparer.</div>;
  if (compact) return <p className="text-sm text-ink-700"><b>Matériel :</b> {keys.map((k) => kitOf(k)?.label.toLowerCase() ?? k).join(", ")}.</p>;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2"><span className="font-bold">Matériel</span>{shopHref && <a href={shopHref} className="chip bg-sun-100 text-ink-900">Voir le kit →</a>}</div>
      <ul className="space-y-2">{keys.map((k) => { const it = kitOf(k); if (!it) return null; return (
        <li key={k} className="flex gap-3 rounded-2xl bg-ink-50 p-3 text-sm">
          <span className="text-xl" aria-hidden>{it.icon}</span>
          <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><b>{it.label}</b><span className="chip bg-pitch-50 text-pitch-800">{it.qty}</span></span>
            <span className="block text-ink-700">{it.use}</span>
            <span className="block text-ink-500">Pas encore équipé ? {it.free}</span></span>
        </li>); })}</ul>
    </div>
  );
}
