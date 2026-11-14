import Link from "next/link";
import { getActiveChild } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteChild, switchChild } from "@/app/actions";
import { entOf, getLibrary } from "@/lib/services";
import { siblingGames } from "@/lib/engine";
import { ageFromBirth, BADGES, bandForAge, categoryLabelFFF, catLabel, GOALS, LEVELS } from "@/content/taxonomy";
import { Notice, PageHead, Section, Upsell } from "@/components/ui";
import Submit from "@/components/Submit";

export const metadata = { title: "Mon enfant" };
export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { user, child } = await getActiveChild();
  const sp = await searchParams;
  const ent = entOf(user);
  const age = ageFromBirth(child.birthDate);
  const band = bandForAge(age);
  const [badges, done, miles, firstSession, stars] = await Promise.all([
    db.badgeAward.findMany({ where: { childId: child.id } }),
    db.plannedSession.findMany({ where: { childId: child.id, status: "DONE" }, select: { blocks: true, durationMin: true, date: true } }),
    db.milestone.findMany({ where: { childId: child.id }, orderBy: { date: "desc" }, take: 5 }),
    db.plannedSession.findFirst({ where: { childId: child.id, status: "DONE" }, orderBy: { date: "asc" } }),
    db.challengeProgress.aggregate({ where: { childId: child.id }, _sum: { stars: true } }),
  ]);
  const slugs = done.flatMap((s) => (s.blocks as { exerciseSlug?: string; phase: string }[]).filter((b) => b.phase === "technique" || b.phase === "defi").map((b) => b.exerciseSlug).filter(Boolean) as string[]);
  const exs = await db.exercise.findMany({ where: { slug: { in: [...new Set(slugs)] } }, select: { slug: true, category: true } });
  const cats: Record<string, number> = {};
  for (const s of slugs) { const c = exs.find((e) => e.slug === s)?.category; if (c) cats[c] = (cats[c] ?? 0) + 1; }
  const top = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = Math.max(1, ...top.map((t) => t[1]));
  const owned = new Set(badges.map((b) => b.badgeKey));
  const siblings = user.children.filter((c) => c.id !== child.id);
  const games = ent.siblings && siblings.length ? siblingGames(user.children.map((c) => ageFromBirth(c.birthDate)), await getLibrary()) : [];
  return (
    <div>
      <PageHead title="Mon enfant" />
      {sp.ok && <Notice tone="ok">Profil mis à jour : le programme a été recalculé.</Notice>}
      {user.children.length > 1 && <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4">{user.children.map((c) => <form key={c.id} action={switchChild}><input type="hidden" name="childId" value={c.id} /><input type="hidden" name="back" value="/app/enfant" /><button className={`chip shrink-0 py-2 ${c.id === child.id ? "chip-on" : ""}`}>{c.avatar} {c.nickname}</button></form>)}</div>}
      <div className="card mb-4 bg-pitch-700 text-white">
        <div className="flex items-center gap-4"><span className="grid h-16 w-16 place-items-center rounded-full bg-white/15 text-4xl">{child.avatar}</span><div><div className="text-xs font-bold uppercase tracking-wide text-white/90">Profil joueur · privé</div><div className="font-display text-2xl font-extrabold">{child.nickname}</div><div className="text-sm text-white/85">{age} ans · {categoryLabelFFF(age)} · {LEVELS.find((l) => l.key === child.level)?.label}</div></div></div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-2xl bg-white/10 p-2"><div className="font-display text-xl font-extrabold">{done.length}</div><div className="text-[11px] font-bold text-white/90">séances</div></div><div className="rounded-2xl bg-white/10 p-2"><div className="font-display text-xl font-extrabold">{badges.length}</div><div className="text-[11px] font-bold text-white/90">badges</div></div><div className="rounded-2xl bg-white/10 p-2"><div className="font-display text-xl font-extrabold">{stars._sum.stars ?? 0}</div><div className="text-[11px] font-bold text-white/90">étoiles</div></div></div>
        <div className="mt-3 text-sm text-white/85">{child.club ? `Club : ${child.club}` : "Sans club"} · Pied {child.dominantFoot}{child.position ? ` · ${child.position}` : ""}</div>
        <div className="mt-2 flex flex-wrap gap-1.5">{child.goals.map((g) => <span key={g} className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold">{GOALS.find((x) => x.key === g)?.label}</span>)}</div>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-2"><Link href="/app/enfant/modifier" className="btn-ghost">✏️ Modifier le profil</Link><Link href="/app/enfant/album" className="btn-ghost">📸 Album de souvenirs</Link></div>

      <Section title={`Son étape : ${band.label}`}><div className="card"><p className="font-semibold">{band.theme}</p>
        <div className="mt-3 text-sm font-bold text-pitch-700">Compétences à développer</div><ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-700">{band.skills.map((s) => <li key={s}>{s}</li>)}</ul>
        <div className="mt-3 text-sm font-bold text-pitch-700">Priorités</div><ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-700">{band.priorities.map((s) => <li key={s}>{s}</li>)}</ul>
        <div className="mt-3 text-sm font-bold text-coral-600">À éviter ou à adapter</div><ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-700">{band.avoid.map((s) => <li key={s}>{s}</li>)}</ul>
        <div className="mt-3 text-sm font-bold text-pitch-700">Comment s'y prendre</div><ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-700">{band.methods.map((s) => <li key={s}>{s}</li>)}</ul>
        <div className="mt-3 text-sm font-bold text-pitch-700">Signes de progression</div><ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-700">{band.indicators.map((s) => <li key={s}>{s}</li>)}</ul>
        <div className="mt-3 rounded-2xl bg-sun-100 p-3 text-sm"><b>Durée et récupération : </b>séances de {band.sessionMin[0]} à {band.sessionMin[1]} minutes, {band.maxHomePerWeek} par semaine au maximum. {band.recovery}</div>
        <p className="muted mt-2">Ces repères ne sont pas des obligations : le niveau, la maturité et le ressenti de {child.nickname} comptent tout autant.</p>
      </div></Section>

      <Section title="Compétences travaillées">{top.length === 0 ? <div className="card muted">Elles s'afficheront après la première séance.</div> : <div className="card space-y-2">{top.map(([k, n]) => <div key={k}><div className="flex justify-between text-sm font-bold"><span>{catLabel(k)}</span><span className="text-ink-500">{n}</span></div><div className="h-2 rounded-full bg-ink-100"><div className="h-2 rounded-full bg-pitch-500" style={{ width: `${(n / max) * 100}%` }} /></div></div>)}</div>}</Section>

      <Section title="Badges">
        <div className="grid grid-cols-3 gap-2">{BADGES.map((b) => <div key={b.key} className={`card p-3 text-center ${owned.has(b.key) ? "" : "bg-ink-50 shadow-none"}`} title={b.desc}><div className={`text-3xl ${owned.has(b.key) ? "" : "opacity-30 grayscale"}`} aria-hidden>{b.icon}</div><div className={`mt-1 text-[11px] font-bold leading-tight ${owned.has(b.key) ? "" : "text-ink-500"}`}>{b.label}<span className="sr-only">{owned.has(b.key) ? " (obtenu)" : " (pas encore obtenu)"}</span></div></div>)}</div>
        <p className="muted mt-2 px-1">Les badges récompensent l'effort, la régularité, la créativité et la progression. Ils ne sont visibles que par votre famille.</p>
      </Section>

      <Section title="Passeport football" action={ent.passport ? <Link href="/app/enfant/album" className="text-sm font-bold text-pitch-700">Album →</Link> : undefined}>
        {ent.passport ? (
          <ol className="card space-y-3 text-sm">
            {miles.map((m) => <li key={m.id} className="flex gap-3"><span aria-hidden>{m.kind === "etape" ? "🚩" : m.kind === "reussite" ? "🌟" : "📸"}</span><span><b>{m.title}</b><span className="muted block">{new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(m.date)}</span></span></li>)}
            {badges.slice(0, 3).map((b) => <li key={b.id} className="flex gap-3"><span aria-hidden>{BADGES.find((x) => x.key === b.badgeKey)?.icon}</span><span><b>Badge : {BADGES.find((x) => x.key === b.badgeKey)?.label}</b><span className="muted block">{new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(b.awardedAt)}</span></span></li>)}
            {firstSession && <li className="flex gap-3"><span aria-hidden>🌱</span><span><b>Première séance</b><span className="muted block">{new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(firstSession.date)}</span></span></li>}
            <li className="flex gap-3"><span aria-hidden>📘</span><span><b>Ouverture du passeport</b><span className="muted block">{new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(child.createdAt)}</span></span></li>
          </ol>
        ) : <Upsell title="Le passeport football" text="Un carnet numérique qui suit votre enfant année après année : étapes, réussites, souvenirs. Inclus dans l'abonnement Famille." />}
      </Section>

      {siblings.length > 0 && <Section title="Mode frères et sœurs">{ent.siblings ? <div className="card"><p className="text-sm text-ink-700">Jeux adaptés à {user.children.map((c) => c.nickname).join(", ")} en même temps : le plus jeune joue la variante facile, les plus grands la variante difficile. Une seule équipe : la famille.</p><ul className="mt-2 space-y-1">{games.map((g) => <li key={g.slug}><Link href={`/app/exercices/${g.slug}`} className="text-sm font-bold text-pitch-700">→ {g.name}</Link></li>)}</ul></div> : <Upsell title="Jouer tous ensemble" text="Le mode frères et sœurs propose des jeux communs à des enfants d'âges différents. Inclus dans l'abonnement Famille." />}</Section>}

      <Section title="Ajouter ou retirer un profil"><div className="card space-y-3">
        {user.children.length < ent.maxChildren ? <Link href="/app/onboarding" className="btn-ghost w-full">➕ Ajouter un enfant</Link> : <p className="muted">Votre offre permet {ent.maxChildren} profil{ent.maxChildren > 1 ? "s" : ""}. <Link href="/app/abonnement" className="font-bold text-pitch-700">Changer d'offre</Link></p>}
        <form action={deleteChild}><input type="hidden" name="childId" value={child.id} /><Submit className="btn-danger w-full" confirm={`Supprimer définitivement le profil de ${child.nickname}, ses séances, ses mesures et ses souvenirs ?`}>Supprimer le profil de {child.nickname}</Submit></form>
      </div></Section>
    </div>
  );
}
