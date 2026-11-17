import Link from "next/link";
import type { ReactNode } from "react";

export function Section({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`mb-5 ${className}`}>
      {(title || action) && <div className="mb-2 flex items-end justify-between px-1"><h2 className="font-display text-[17px] font-extrabold">{title}</h2>{action}</div>}
      {children}
    </section>
  );
}
export const More = ({ href, children = "Tout voir" }: { href: string; children?: ReactNode }) => <Link href={href} className="text-sm font-bold text-pitch-700">{children} →</Link>;

export function PageHead({ title, sub, back }: { title: string; sub?: string; back?: string }) {
  return (
    <div className="mb-4">
      {back && <Link href={back} className="mb-1 inline-block text-sm font-bold text-pitch-700">← Retour</Link>}
      <h1 className="font-display text-2xl font-extrabold tracking-tight">{title}</h1>
      {sub && <p className="muted mt-0.5">{sub}</p>}
    </div>
  );
}

// Explication supplémentaire affichée en mode « parent débutant ».
export function Beginner({ show, children }: { show: boolean; children: ReactNode }) {
  if (!show) return null;
  return <div className="mb-4 flex gap-2 rounded-2xl bg-sky-100 p-3 text-sm text-sky-600"><span aria-hidden>💡</span><div className="text-ink-700">{children}</div></div>;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "ok" | "warn"; children: ReactNode }) {
  const c = tone === "ok" ? "bg-pitch-50 text-pitch-800" : tone === "warn" ? "bg-coral-100 text-ink-900" : "bg-sun-100 text-ink-900";
  return <div className={`mb-4 rounded-2xl p-3 text-sm ${c}`}>{children}</div>;
}

export function Upsell({ title, text, cta = "Voir les offres" }: { title: string; text: string; cta?: string }) {
  return (
    <div className="card border-2 border-dashed border-sun-400 bg-sun-100/60 text-center">
      <div className="text-3xl" aria-hidden>🔓</div>
      <h3 className="mt-1 font-display text-lg font-extrabold">{title}</h3>
      <p className="muted mx-auto mt-1 max-w-sm">{text}</p>
      <Link href="/app/abonnement" className="btn-sun mt-3">{cta}</Link>
    </div>
  );
}

export function Ring({ value, max, label, size = 76 }: { value: number; max: number; label?: string; size?: number }) {
  const r = 30, c = 2 * Math.PI * r, pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 72 72" className="absolute inset-0 -rotate-90"><circle cx="36" cy="36" r={r} fill="none" stroke="#e8eeeb" strokeWidth="8" /><circle cx="36" cy="36" r={r} fill="none" stroke="#22408f" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} /></svg>
      <div className="text-center leading-none"><div className="font-display text-lg font-extrabold">{value}</div>{label && <div className="text-[10px] font-bold text-ink-500">{label}</div>}</div>
    </div>
  );
}

// Courbe d'évolution d'un indicateur (un seul enfant, jamais de comparaison).
export function LineChart({ points, unit, lowerIsBetter = false, color = "#22408f" }: { points: { date: string; value: number }[]; unit?: string; lowerIsBetter?: boolean; color?: string }) {
  if (points.length === 0) return <div className="grid h-28 place-items-center rounded-2xl bg-ink-50 text-sm text-ink-500">Pas encore de mesure</div>;
  const W = 300, H = 110, pad = 14;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const x = (i: number) => (points.length === 1 ? W / 2 : pad + (i * (W - 2 * pad)) / (points.length - 1));
  const y = (v: number) => H - pad - ((v - min) / span) * (H - 2 * pad - 14);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const first = points[0].value, last = points[points.length - 1].value;
  const better = points.length > 1 && (lowerIsBetter ? last < first : last > first);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Évolution : de ${first} à ${last} ${unit ?? ""}`}>
        <path d={`${d} L${x(points.length - 1)},${H - pad} L${x(0)},${H - pad} Z`} fill={color} opacity=".1" />
        <path d={d} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 5 : 3} fill="#fff" stroke={color} strokeWidth="2.5" />)}
        <text x={x(points.length - 1)} y={y(last) - 9} textAnchor={points.length === 1 ? "middle" : "end"} fontSize="12" fontWeight="800" fill="#10231b">{last}{unit ? ` ${unit}` : ""}</text>
      </svg>
      <div className="flex justify-between text-[11px] font-semibold text-ink-500"><span>{points[0].date}</span>{points.length > 1 && <span className={better ? "text-pitch-700" : ""}>{better ? "En progrès" : last === first ? "Stable" : "À suivre, sans pression"}</span>}<span>{points[points.length - 1].date}</span></div>
    </div>
  );
}

// Mise en forme légère : **gras**, _italique_, listes, liens [slug] vers les fiches, {guide:slug}.
export function Rich({ text, names }: { text: string; names?: Record<string, string> }) {
  const inline = (s: string, key: number): ReactNode => {
    const parts = s.split(/(\*\*[^*]+\*\*|_[^_]+_|\[[a-z0-9-]{3,}\]|\{guide:[a-z0-9-]+\})/g).filter(Boolean);
    return <span key={key}>{parts.map((p, i) => {
      if (p.startsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
      if (p.startsWith("_") && p.endsWith("_")) return <em key={i} className="text-ink-500">{p.slice(1, -1)}</em>;
      if (p.startsWith("{guide:")) return <Link key={i} href={`/app/guide/${p.slice(7, -1)}`} className="font-bold text-pitch-700 underline">Lire la fiche</Link>;
      if (p.startsWith("[")) { const slug = p.slice(1, -1); return !names || names[slug] ? <Link key={i} href={`/app/exercices/${slug}`} className="font-bold text-pitch-700 underline">voir la fiche</Link> : <span key={i} />; }
      return p;
    })}</span>;
  };
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="prose-pp">
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^\s*[-•]\s+/.test(l))) return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*[-•]\s+/, ""), j)}</li>)}</ul>;
        const head = lines.filter((l) => !/^\s*[-•]\s+/.test(l)), items = lines.filter((l) => /^\s*[-•]\s+/.test(l));
        return <div key={i}><p>{head.map((l, j) => <span key={j}>{inline(l.replace(/^#+\s*/, ""), j)}{j < head.length - 1 && <br />}</span>)}</p>{items.length > 0 && <ul>{items.map((l, j) => <li key={j}>{inline(l.replace(/^\s*[-•]\s+/, ""), j)}</li>)}</ul>}</div>;
      })}
    </div>
  );
}

export function Stars({ n, max = 3 }: { n: number; max?: number }) {
  return <span aria-label={`${n} étoile${n > 1 ? "s" : ""} sur ${max}`}>{Array.from({ length: max }, (_, i) => <span key={i} className={i < n ? "text-sun-500" : "text-ink-100"}>★</span>)}</span>;
}

export function Choice({ name, value, label, defaultChecked, type = "radio", required }: { name: string; value: string; label: ReactNode; defaultChecked?: boolean; type?: "radio" | "checkbox"; required?: boolean }) {
  return <label className="choice-wrap"><input type={type} name={name} value={value} defaultChecked={defaultChecked} required={required} /><span className="choice block text-center">{label}</span></label>;
}
