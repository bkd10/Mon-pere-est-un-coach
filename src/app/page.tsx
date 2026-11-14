import Link from "next/link";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { euro } from "@/lib/plans";
import { AGE_BANDS, APP_NAME, CATEGORIES } from "@/content/taxonomy";
import ExerciseAnimation from "@/components/ExerciseAnimation";
import LegalFooter from "@/components/LegalFooter";
import { giftPriceCents } from "@/lib/billing";
import { LEGAL } from "@/content/legal";

export const dynamic = "force-dynamic";

export default async function Landing({ searchParams }: { searchParams: Promise<{ supprime?: string }> }) {
  const [user, plans, exCount, guideCount, sp] = await Promise.all([getUser(), db.plan.findMany({ where: { active: true }, orderBy: { sort: "asc" } }), db.exercise.count({ where: { published: true } }), db.guide.count({ where: { published: true } }), searchParams]);
  const cta = user ? "/app" : "/inscription";
  const trial = plans.find((p) => p.tier === "FAMILLE")?.trialDays ?? 0;
  return (
    <main id="contenu" className="bg-white">
      {sp.supprime && <div className="bg-pitch-50 p-3 text-center text-sm font-semibold text-pitch-800">Votre compte et toutes vos données ont été supprimés. Merci d'avoir joué avec nous.</div>}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2 font-display text-xl font-extrabold"><img src="/icons/icon.svg" alt="" className="h-9 w-9 rounded-xl" />{APP_NAME}</div>
        <nav className="flex items-center gap-2">
          {user ? <Link href="/app" className="btn-primary btn-sm">Mon espace</Link> : <><Link href="/connexion" className="btn-ghost btn-sm">Connexion</Link><Link href="/inscription" className="btn-primary btn-sm hidden sm:inline-flex">Commencer</Link></>}
        </nav>
      </header>

      <section className="mx-auto grid max-w-5xl items-center gap-8 px-5 pb-12 pt-6 md:grid-cols-2">
        <div>
          <span className="chip bg-sun-100 text-ink-900">Pour les parents d'enfants de 4 à 18 ans</span>
          <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">Pas besoin d'être entraîneur pour aider votre enfant à progresser.</h1>
          <p className="mt-4 text-lg text-ink-700">Indiquez son âge et son niveau : {APP_NAME} vous dit quoi faire, pourquoi, comment — et quand le laisser se reposer. Dix à vingt minutes, un ballon, vous deux.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link href={cta} className="btn-primary text-base">Commencer gratuitement</Link><a href="#offres" className="btn-ghost text-base">Voir les offres</a></div>
          <p className="muted mt-3">{trial > 0 ? `${trial} jours d'essai gratuit, sans carte bancaire. ` : ""}Offre Découverte gratuite, sans limite de durée.</p>
          {LEGAL.founderLine && <p className="mt-3 text-sm font-bold text-pitch-800">⚽ {LEGAL.founderLine}</p>}
        </div>
        <div className="mx-auto w-full max-w-sm rounded-[2rem] bg-ink-900 p-3 shadow-card">
          <div className="rounded-[1.5rem] bg-ink-50 p-3">
            <div className="mb-2 text-sm font-bold text-ink-500">Séance du jour · 15 min</div>
            <ExerciseAnimation diagram={{ kind: "slalom", n: 6, caption: "Une touche à chaque pas" }} title="Le slalom des plots" />
            <div className="mt-3 rounded-2xl bg-white p-3 text-sm"><b>Pourquoi cet exercice ?</b><p className="text-ink-700">En match, on ne court jamais tout droit. Le slalom apprend à garder le ballon près du pied quand on tourne.</p></div>
            <div className="btn-primary mt-3 w-full">Commencer ma séance</div>
          </div>
        </div>
      </section>

      <section className="bg-ink-50 py-12">
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="font-display text-3xl font-extrabold">Ce que vous ne trouverez pas ailleurs</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["🧭", "Une méthode par âge", `7 tranches d'âge, ${exCount.toLocaleString("fr-FR")} fiches d'exercices classées, des séances construites dans l'ordre. Rien n'est laissé au hasard.`],
              ["🎬", "Chaque exercice montré", "Un schéma animé, les étapes, les erreurs fréquentes et la phrase à dire pour corriger sans décourager."],
              ["🧠", "Un coach qui s'adapte", "Trois questions après la séance. Fatigué ? On allège. Pas aimé ? On change d'approche. Et on vous explique pourquoi."],
              ["😴", "Le repos fait partie du plan", "Le calendrier tient compte du club et des matchs. Une séance manquée n'est jamais un échec."],
              ["💶", "Dépenser moins, mieux", "Quel matériel acheter, quand un stage vaut le coup, comment repérer les promesses creuses. Avec un calculateur de budget."],
              ["🔒", "Les données de votre enfant restent privées", "Aucun classement, aucun profil public. Export et suppression en un clic. Données sensibles chiffrées."],
            ].map(([i, t, d]) => <div key={t} className="card"><div className="text-3xl">{i}</div><h3 className="mt-2 font-display text-lg font-extrabold">{t}</h3><p className="mt-1 text-sm text-ink-700">{d}</p></div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-12">
        <h2 className="font-display text-3xl font-extrabold">Un parcours qui grandit avec lui</h2>
        <p className="muted mt-1">Des repères, pas des obligations : le niveau et le ressenti de chaque enfant comptent autant que son âge.</p>
        <div className="mt-5 flex snap-x gap-3 overflow-x-auto pb-3" tabIndex={0} role="region" aria-label="Parcours par tranche d'âge (défilement horizontal)">
          {AGE_BANDS.map((b) => <div key={b.key} className="card w-64 shrink-0 snap-start"><div className="font-display text-2xl font-extrabold text-pitch-700">{b.label}</div><p className="mt-1 text-sm font-semibold">{b.theme}</p><p className="muted mt-2">Séances de {b.sessionMin[0]} à {b.sessionMin[1]} min</p></div>)}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">{CATEGORIES.map((c) => <span key={c.key} className="chip">{c.icon} {c.label}</span>)}</div>
      </section>

      <section id="offres" className="bg-pitch-900 py-12 text-white">
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="font-display text-3xl font-extrabold">Des offres simples, sans engagement</h2>
          <p className="mt-1 text-white/90">Sans engagement. Résiliation en deux clics depuis l'application.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {plans.map((p) => (
              <div key={p.tier} className={`rounded-xl2 p-5 ${p.tier === "FAMILLE" ? "bg-sun-400 text-ink-900" : "bg-white/10"}`}>
                <div className="font-display text-xl font-extrabold">{p.name}</div>
                <div className="mt-1 font-display text-3xl font-extrabold">{p.monthlyCents === 0 ? "Gratuit" : <>{euro(p.monthlyCents)}<span className="text-base font-bold opacity-70"> / mois</span></>}</div>
                {p.yearlyCents > 0 && <div className="text-sm font-semibold opacity-80">ou {euro(p.yearlyCents)} / an (−{Math.round((1 - p.yearlyCents / (p.monthlyCents * 12)) * 100)} %)</div>}
                <p className="mt-2 text-sm opacity-90">{p.tagline}</p>
                <ul className="mt-3 space-y-1.5 text-sm">{p.features.map((f) => <li key={f} className="flex gap-2"><span>✓</span><span>{f}</span></li>)}</ul>
              </div>
            ))}
            <div className="rounded-xl2 bg-white/10 p-5"><div className="font-display text-xl font-extrabold">🎁 Carte cadeau</div><div className="mt-1 font-display text-3xl font-extrabold">{euro(giftPriceCents())}</div><div className="text-sm font-semibold opacity-90">paiement unique, 12 mois</div><p className="mt-2 text-sm opacity-90">Une saison de foot en famille à offrir. Aucun renouvellement.</p><Link href="/cadeau" className="btn-sun btn-sm mt-4">Offrir une saison</Link></div>
          </div>
          <div className="mt-8 text-center"><Link href={cta} className="btn-sun text-base">Créer mon compte</Link></div>
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-5 py-8 text-sm text-ink-500">
        <p>{APP_NAME} accompagne les familles ; il ne remplace ni un club, ni un éducateur diplômé, ni un professionnel de santé. <Link href="/guides" className="font-bold text-pitch-700 underline">{guideCount} guides pour les parents</Link> · <Link href="/cadeau" className="font-bold text-pitch-700 underline">Carte cadeau</Link></p>
        <LegalFooter className="mt-4" />
      </footer>
    </main>
  );
}
