"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const ITEMS = [
  { href: "/app", label: "Accueil", icon: "🏠", match: (p: string) => p === "/app" },
  { href: "/app/entrainements", label: "Séances", icon: "⚽", match: (p: string) => p.startsWith("/app/entrainements") || p.startsWith("/app/seance") },
  { href: "/app/exercices", label: "Exercices", icon: "📚", match: (p: string) => p.startsWith("/app/exercices") },
  { href: "/app/progression", label: "Progrès", icon: "📈", match: (p: string) => p.startsWith("/app/progression") || p.startsWith("/app/bilans") },
  { href: "/app/menu", label: "Plus", icon: "☰", match: (p: string) => ["/app/menu", "/app/enfant", "/app/calendrier", "/app/guide", "/app/abonnement", "/app/parametres", "/app/notifications"].some((x) => p.startsWith(x)) },
];
export default function Nav({ coach = false }: { coach?: boolean }) {
  const p = usePathname();
  if (p.startsWith("/app/onboarding")) return null;
  return (
    <>
      {coach && !p.startsWith("/app/coach") && !/^\/app\/seance\/[^/]+$/.test(p) && <Link href="/app/coach" aria-label="Demander au coach IA" className="fixed bottom-24 right-4 z-30 flex items-center gap-2 rounded-full bg-ink-900 px-4 py-3 text-sm font-bold text-white shadow-card"><span aria-hidden>💬</span> Coach</Link>}
      <nav className="safe-b fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/95 backdrop-blur" aria-label="Navigation principale">
        <ul className="mx-auto flex max-w-xl">
          {ITEMS.map((i) => { const on = i.match(p); return (
            <li key={i.href} className="flex-1"><Link href={i.href} aria-current={on ? "page" : undefined} className={`flex flex-col items-center gap-0.5 pb-1 pt-2 text-[11px] font-bold ${on ? "text-pitch-700" : "text-ink-500"}`}><span className={`grid h-8 w-12 place-items-center rounded-full text-lg ${on ? "bg-pitch-100" : ""}`} aria-hidden>{i.icon}</span>{i.label}</Link></li>
          ); })}
        </ul>
      </nav>
    </>
  );
}
