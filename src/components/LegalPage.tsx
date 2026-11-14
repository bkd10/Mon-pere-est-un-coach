import Link from "next/link";
import type { ReactNode } from "react";
import LegalFooter from "./LegalFooter";
import { LEGAL } from "@/content/legal";

export function LegalPage({ title, version, children }: { title: string; version?: string; children: ReactNode }) {
  return (
    <main id="contenu" className="mx-auto max-w-2xl px-5 py-8">
      <Link href="/" className="text-sm font-bold text-pitch-700">← {LEGAL.brand}</Link>
      <h1 className="mb-1 mt-2 font-display text-3xl font-extrabold">{title}</h1>
      {version && <p className="muted mb-6">Version du {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(version))}</p>}
      <div className="legal space-y-6 text-[15px] leading-relaxed text-ink-700">{children}</div>
      <LegalFooter className="mt-10 border-t border-ink-100 pt-6" />
    </main>
  );
}
export const S = ({ t, children }: { t: string; children: ReactNode }) => <section><h2 className="mb-2 font-display text-xl font-extrabold text-ink-900">{t}</h2><div className="space-y-2">{children}</div></section>;
export const UL = ({ children }: { children: ReactNode }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>;
