import Link from "next/link";
import { APP_NAME } from "@/content/taxonomy";
export default function AuthShell({ title, sub, children, error }: { title: string; sub: string; children: React.ReactNode; error?: string }) {
  return (
    <main id="contenu" className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-8">
      <Link href="/" className="mb-6 flex items-center gap-2 font-display text-xl font-extrabold"><img src="/icons/icon.svg" alt="" className="h-9 w-9 rounded-xl" />{APP_NAME}</Link>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">{title}</h1>
      <p className="muted mb-5 mt-1">{sub}</p>
      {error && <div role="alert" className="mb-4 rounded-2xl bg-coral-100 p-3 text-sm font-semibold text-ink-900">{error}</div>}
      {children}
    </main>
  );
}
