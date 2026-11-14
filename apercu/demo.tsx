// Aperçu interactif publié comme page autonome : il embarque le VRAI moteur de séances et la VRAIE bibliothèque.
// Ce qui n'y figure pas (comptes, calendrier, suivi, coach IA, paiement) vit dans l'application complète.
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import ExerciseAnimation from "../src/components/ExerciseAnimation";
import Materiel from "../src/components/Materiel";
import { BASES, LIBRARY, DECLINATIONS, type Fiche } from "../src/content/library";
import { AGE_BANDS, bandForAge, CATEGORIES, catOf, eqLabel, GOALS, kitOf, LEVELS, PAIN_AREAS } from "../src/content/taxonomy";
import { buildSession, rulesFromDefaults, DEFAULT_RULES, type Feedback, type History, type LibExercise, type Profile, type SessionPlan } from "../src/lib/engine";
import { DEFAULT_PLANS, euro } from "../src/lib/plans";
import { DEFAULT_PRODUCTS } from "../src/content/products";

const LIB: LibExercise[] = LIBRARY.map((e) => ({ slug: e.slug, name: e.name, category: e.category, ageMin: e.age[0], ageMax: e.age[1], level: e.level, difficulty: e.difficulty, durationMin: e.durationMin, equipment: e.equipment, space: e.space, indoorOk: e.indoorOk ?? false, parentRole: e.parentRole ?? "observe", intensity: e.intensity ?? 2, bodyAreas: e.bodyAreas ?? [], recoverySec: e.recoverySec ?? 30, metricKey: e.metricKey, isFree: e.isFree, family: e.family, isBase: !e.variantKey }));
const BY = new Map(LIBRARY.map((e) => [e.slug, e]));
const RULES = rulesFromDefaults();
const TODAY = new Date().toISOString().slice(0, 10);
const nf = (n: number) => n.toLocaleString("fr-FR");
type P = { name: string; age: number; level: string; minutes: number; club: number; goal: string; petit: boolean; ballon: boolean };
const DEF: P = { name: "Lucas", age: 9, level: "debutant", minutes: 20, club: 2, goal: "technique", petit: false, ballon: false };
const load = (): P => { try { return { ...DEF, ...JSON.parse(localStorage.getItem("pp-demo") || "{}") }; } catch { return DEF; } };
const toProfile = (p: P): Profile => ({ age: p.age, level: p.level, goals: [p.goal], minutesAvailable: p.minutes, homeSessionsPerWeek: 2, clubTrainingsPerWeek: p.club, clubDays: [3, 5, 1].slice(0, p.club), matchDay: p.club ? 6 : null, equipment: ["ballon", "plots"], places: ["jardin"], modes: { petitEspace: p.petit, sansMateriel: p.ballon } });
const PH: Record<string, [string, string]> = { accueil: ["Accueil", "👋"], echauffement: ["Échauffement en jouant", "🔥"], technique: ["Exercice", "⚽"], defi: ["Petit défi", "🎯"], calme: ["Retour au calme", "🌿"], discussion: ["On en parle", "💬"] };

function Fiche({ f, onOpen, onBack }: { f: Fiche; onOpen: (s: string) => void; onBack: () => void }) {
  const c = catOf(f.category);
  const fam = LIBRARY.filter((x) => x.family === f.family && x.slug !== f.slug);
  const I = ({ l, v }: { l: string; v: string }) => <div className="rounded-2xl bg-ink-50 p-2.5"><div className="text-[11px] font-bold uppercase tracking-wide text-ink-500">{l}</div><div className="text-sm font-bold">{v}</div></div>;
  return (
    <div>
      <button onClick={onBack} className="mb-1 text-sm font-bold text-pitch-700">← Retour</button>
      <h1 className="font-display text-2xl font-extrabold tracking-tight">{f.name}</h1>
      <p className="muted mb-3">{c.icon} {c.label}</p>
      <ExerciseAnimation diagram={f.diagram} title={f.name} />
      <div className="card my-4"><div className="text-sm font-bold text-pitch-700">Objectif pédagogique</div><p>{f.objective}</p><div className="mt-3 text-sm font-bold text-pitch-700">Pourquoi cet exercice est utile</div><p className="text-ink-700">{f.why}</p></div>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3"><I l="Âge conseillé" v={`${f.age[0]}-${f.age[1]} ans`} /><I l="Niveau" v={LEVELS.find((l) => l.key === f.level)?.label ?? ""} /><I l="Difficulté" v={`${f.difficulty} / 5`} /><I l="Durée" v={`${f.durationMin} min`} /><I l="Répétitions" v={f.reps} /><I l="Lieu" v={f.indoorOk ? "Dehors ou intérieur" : "Dehors"} /></div>
      <div className="card mb-4"><Materiel items={f.equipment} shopHref="#materiel" /></div>
      <h2 className="mb-2 font-display text-[17px] font-extrabold">Étape par étape</h2>
      <ol className="card mb-4 space-y-3">{f.steps.map((s, i) => <li key={i} className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-pitch-600 text-xs font-extrabold text-white">{i + 1}</span><span>{s}</span></li>)}</ol>
      <h2 className="mb-2 font-display text-[17px] font-extrabold">Erreurs fréquentes et quoi dire</h2>
      <ul className="card mb-4 space-y-3">{f.mistakes.map((m, i) => <li key={i}><div className="font-semibold">⚠️ {m}</div>{f.corrections[i] && <div className="text-pitch-800">→ {f.corrections[i]}</div>}</li>)}</ul>
      <h2 className="mb-2 font-display text-[17px] font-extrabold">Variantes</h2>
      <div className="mb-4 space-y-2"><div className="card"><span className="chip bg-pitch-50 text-pitch-800">Facile</span><p className="mt-1">{f.easy}</p></div><div className="card"><span className="chip bg-sun-100">Intermédiaire</span><p className="mt-1">{f.medium}</p></div><div className="card"><span className="chip bg-coral-100 text-coral-600">Difficile</span><p className="mt-1">{f.hard}</p></div></div>
      <div className="card mb-4"><p>🎯 <b>Critère de réussite :</b> {f.success}</p></div>
      {fam.length > 0 && <><h2 className="mb-2 font-display text-[17px] font-extrabold">{f.variantKey ? "Autres versions" : `${fam.length} progressions de cet exercice`}</h2><ul className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">{fam.map((x) => <li key={x.slug}><button onClick={() => onOpen(x.slug)} className="card flex w-full items-center justify-between gap-2 py-3 text-left text-sm"><span><span className="block font-bold">{x.variantLabel ? x.variantLabel[0].toUpperCase() + x.variantLabel.slice(1) : "Exercice de base"}</span><span className="muted">{x.age[0]}-{x.age[1]} ans · difficulté {x.difficulty}/5</span></span><span aria-hidden>›</span></button></li>)}</ul></>}
    </div>
  );
}

function Player({ plan, onDone, onQuit }: { plan: SessionPlan; onDone: () => void; onQuit: () => void }) {
  const [i, setI] = useState(0);
  const b = plan.blocks[i], ex = b.exerciseSlug ? BY.get(b.exerciseSlug) : undefined, last = i === plan.blocks.length - 1;
  useEffect(() => { document.getElementById("player")?.scrollTo(0, 0); }, [i]);
  const v = ex ? (b.variant === "easy" ? ["Variante facile", ex.easy] : b.variant === "hard" ? ["Variante difficile", ex.hard] : ["Variante conseillée", ex.medium]) : null;
  return (
    <div id="player" className="fixed inset-0 z-40 overflow-y-auto bg-ink-50">
      <div className="sticky top-0 z-10 bg-ink-50 gut pb-2 pt-3"><div className="mx-auto flex max-w-xl items-center gap-3"><button onClick={onQuit} aria-label="Quitter la séance" className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-card">✕</button><div className="flex flex-1 gap-1">{plan.blocks.map((_, k) => <span key={k} className={`h-1.5 flex-1 rounded-full ${k <= i ? "bg-pitch-600" : "bg-ink-100"}`} />)}</div><span className="text-xs font-bold text-ink-500">{i + 1}/{plan.blocks.length}</span></div></div>
      <div className="gut mx-auto max-w-xl space-y-3 pb-32 pt-1">
        <div><span className="chip bg-pitch-100 text-pitch-800">{PH[b.phase][1]} {PH[b.phase][0]} · {b.minutes} min</span><h2 className="mt-2 font-display text-2xl font-extrabold leading-tight">{b.title}</h2></div>
        {ex ? <>
          <ExerciseAnimation diagram={ex.diagram} title={ex.name} />
          <div className="card"><div className="text-sm font-bold text-pitch-700">Pourquoi ?</div><p className="text-sm text-ink-700">{ex.why}</p><div className="mt-2"><Materiel items={ex.equipment} compact /></div></div>
          <div className="card"><div className="mb-2 flex items-center justify-between gap-2"><div className="font-bold">Comment faire</div><span className="chip">{ex.reps}</span></div><ol className="space-y-2.5">{ex.steps.map((s, k) => <li key={k} className="flex gap-3 text-[15px]"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-pitch-600 text-xs font-extrabold text-white">{k + 1}</span><span>{s}</span></li>)}</ol>{v && <div className="mt-3 rounded-2xl bg-sun-100 p-3 text-sm"><b>{v[0]} : </b>{v[1]}</div>}</div>
          <div className="card text-sm"><div className="mb-1 font-bold">Erreurs fréquentes et quoi dire</div><ul className="space-y-2">{ex.mistakes.map((m, k) => <li key={k}><span className="font-semibold">{m}</span>{ex.corrections[k] && <span className="block text-pitch-800">→ {ex.corrections[k]}</span>}</li>)}</ul></div>
          {b.restSec ? <p className="muted px-1">💧 Ensuite : {b.restSec} secondes de pause.</p> : null}
        </> : <div className="card text-[15px] text-ink-700">{b.text}</div>}
      </div>
      <div className="fixed inset-x-0 bottom-0 border-t border-ink-100 bg-white gut pb-3 pt-3"><div className="mx-auto flex max-w-xl gap-2">{i > 0 && <button onClick={() => setI(i - 1)} className="btn-ghost">←</button>}<button onClick={() => (last ? onDone() : setI(i + 1))} className="btn-primary flex-1 text-base">{last ? "Terminer · 3 questions rapides" : "Étape suivante"}</button></div></div>
    </div>
  );
}

function Pick({ label, value, set, opts }: { label: string; value: number; set: (n: number) => void; opts: [number, string][] }) {
  return <div className="card"><div className="mb-2 font-bold">{label}</div><div className="grid grid-cols-3 gap-2">{opts.map(([v, l]) => <button key={v} onClick={() => set(v)} aria-pressed={value === v} className={`choice text-center ${value === v ? "border-pitch-500 bg-pitch-50 text-pitch-800" : ""}`}>{l}</button>)}</div></div>;
}

function Seance({ p }: { p: P }) {
  const [fb, setFb] = useState<Feedback | null>(null);
  const [stage, setStage] = useState<"plan" | "play" | "quiz" | "next">("plan");
  const [q, setQ] = useState({ enjoyment: 3, energy: 3, motivation: 2, pain: false, area: "genou", more: false, diff: "ok" });
  const profile = useMemo(() => toProfile(p), [p]);
  const plan = useMemo(() => buildSession(profile, LIB, { feedback: [], recentSlugs: [], doneCount: 0 }, RULES, TODAY), [profile]);
  useEffect(() => { setStage("plan"); setFb(null); }, [profile]);
  const next = useMemo(() => { if (!fb) return null; const h: History = { feedback: [{ ...fb, mainCategory: plan.mainCategory }], recentSlugs: plan.blocks.map((b) => b.exerciseSlug).filter(Boolean) as string[], doneCount: 1 }; return buildSession(profile, LIB, h, RULES, TODAY); }, [fb, plan, profile]);
  const band = bandForAge(p.age);
  const Plan = ({ s, title }: { s: SessionPlan; title: string }) => (
    <section className="mb-4 overflow-hidden rounded-xl2 bg-pitch-700 text-white shadow-card"><div className="p-5">
      <div className="flex items-center justify-between text-sm font-bold text-white/80"><span>{title}</span><span>{s.durationMin} min</span></div>
      <h2 className="mt-1 font-display text-2xl font-extrabold">{s.title}</h2><p className="mt-1 text-sm text-white/85">{s.objective}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">{(s.equipment.length ? s.equipment : ["ballon"]).map((e) => <span key={e} className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold">{eqLabel(e)}</span>)}</div>
      <ol className="mt-4 space-y-2">{s.blocks.map((b, i) => <li key={i} className="flex items-center gap-3 text-sm"><span aria-hidden>{PH[b.phase][1]}</span><span className="flex-1 font-semibold">{b.title}</span><span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-bold">{b.minutes} min</span></li>)}</ol>
    </div></section>
  );
  const Why = ({ s }: { s: SessionPlan }) => <div className="card mb-4"><div className="mb-2 font-bold">🧠 Pourquoi cette séance ?</div><ul className="space-y-2 text-sm text-ink-700">{s.explanation.map((t) => <li key={t}>{t}</li>)}</ul><div className="mt-3 flex flex-wrap gap-1.5">{s.rulesApplied.map((k) => <span key={k} className="chip bg-pitch-50 text-pitch-800">Règle : {DEFAULT_RULES.find((r) => r.key === k)?.label}</span>)}</div></div>;
  if (stage === "play") return <Player plan={plan} onQuit={() => setStage("plan")} onDone={() => setStage("quiz")} />;
  if (stage === "quiz") return (
    <div className="space-y-3">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Comment ça s'est passé ?</h1><p className="muted">30 secondes. Vos réponses adaptent la prochaine séance : essayez « très fatigué » ou cochez une douleur.</p>
      <Pick label={`${p.name} a-t-il aimé la séance ?`} value={q.enjoyment} set={(v) => setQ({ ...q, enjoyment: v })} opts={[[3, "😄 Beaucoup"], [2, "🙂 Moyennement"], [1, "😕 Pas vraiment"]]} />
      <Pick label="Comment était-il physiquement ?" value={q.energy} set={(v) => setQ({ ...q, energy: v })} opts={[[3, "💪 En forme"], [2, "😮‍💨 Un peu fatigué"], [1, "😴 Très fatigué"]]} />
      <Pick label="Comment était sa motivation ?" value={q.motivation} set={(v) => setQ({ ...q, motivation: v })} opts={[[3, "🔥 Très motivé"], [2, "👍 Normale"], [1, "🫤 Peu motivé"]]} />
      <div className="card space-y-3 text-sm font-semibold">
        <label className="flex items-center gap-3"><input id="q-pain" type="checkbox" checked={q.pain} onChange={(e) => setQ({ ...q, pain: e.target.checked })} className="h-5 w-5 accent-coral-500" />Il a eu mal quelque part</label>
        {q.pain && <select id="q-area" value={q.area} onChange={(e) => setQ({ ...q, area: e.target.value })} className="input" aria-label="Zone douloureuse">{PAIN_AREAS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}</select>}
        <label className="flex items-center gap-3"><input id="q-more" type="checkbox" checked={q.more} onChange={(e) => setQ({ ...q, more: e.target.checked })} className="h-5 w-5 accent-pitch-600" />Il a demandé à continuer</label>
        <label className="flex items-center gap-3"><input id="q-hard" type="checkbox" checked={q.diff === "difficile"} onChange={(e) => setQ({ ...q, diff: e.target.checked ? "difficile" : "ok" })} className="h-5 w-5 accent-pitch-600" />Les exercices étaient trop difficiles</label>
      </div>
      <button className="btn-primary w-full" onClick={() => { setFb({ date: TODAY, enjoyment: q.enjoyment, energy: q.energy, motivation: q.motivation, difficulty: q.diff, pain: q.pain, painArea: q.pain ? q.area : null, wantedMore: q.more, confidence: 2 }); setStage("next"); }}>Valider et adapter la suite</button>
    </div>
  );
  if (stage === "next" && next) return (
    <div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight">La suite s'est adaptée</h1><p className="muted mb-3">Voici la prochaine séance, recalculée à partir de vos réponses.</p>
      {fb?.pain && <div className="mb-4 rounded-2xl bg-coral-100 p-3 text-sm"><b>Douleur signalée.</b> Ne faites pas poursuivre une activité douloureuse. Si la douleur persiste ou revient, demandez l'avis d'un médecin.</div>}
      <Plan s={next} title="Prochaine séance" /><Why s={next} />
      <div className="grid grid-cols-2 gap-2"><button className="btn-ghost" onClick={() => setStage("quiz")}>Changer mes réponses</button><button className="btn-primary" onClick={() => { setFb(null); setStage("plan"); }}>Recommencer</button></div>
    </div>
  );
  return (
    <div>
      <p className="muted">Séance construite pour</p><h1 className="mb-3 font-display text-2xl font-extrabold tracking-tight">{p.name}, {p.age} ans <span className="text-base font-bold text-ink-500">· repère {band.label}</span></h1>
      <Plan s={plan} title="Séance du jour" />
      <div className="card mb-4"><Materiel items={plan.equipment} shopHref="#materiel" /></div>
      <button className="btn-sun mb-4 w-full text-base" onClick={() => setStage("play")}>Commencer ma séance</button>
      <Why s={plan} />
      <div className="card text-sm text-ink-700"><div className="mb-1 font-bold text-ink-900">Vos consignes de parent</div><ul className="space-y-1">{plan.parentTips.map((t) => <li key={t}>💡 {t}</li>)}</ul></div>
    </div>
  );
}

function Accueil({ p, set, go }: { p: P; set: (p: P) => void; go: (v: string) => void }) {
  const band = bandForAge(p.age);
  const n = LIBRARY.filter((e) => e.age[0] <= p.age && e.age[1] >= p.age).length;
  const reco = recoKit(p.age);
  const Sel = ({ id, label, value, onChange, children }: { id: string; label: string; value: string | number; onChange: (v: string) => void; children: React.ReactNode }) => <div><label className="label" htmlFor={id}>{label}</label><select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>{children}</select></div>;
  return (
    <div>
      <span className="chip bg-sun-100 text-ink-900">Aperçu interactif · rien n'est enregistré</span>
      <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight">Pas besoin d'être entraîneur pour aider votre enfant à progresser.</h1>
      <p className="mt-2 text-ink-700">Réglez le profil ci-dessous : la séance et la bibliothèque s'adaptent tout de suite, avec le vrai moteur de l'application.</p>
      <div className="card my-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="p-name">Prénom</label><input id="p-name" className="input" maxLength={20} value={p.name} onChange={(e) => set({ ...p, name: e.target.value || "Lucas" })} /></div>
          <Sel id="p-age" label="Âge" value={p.age} onChange={(v) => set({ ...p, age: Number(v) })}>{Array.from({ length: 15 }, (_, i) => i + 4).map((a) => <option key={a} value={a}>{a} ans</option>)}</Sel>
          <Sel id="p-level" label="Niveau" value={p.level} onChange={(v) => set({ ...p, level: v })}>{LEVELS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}</Sel>
          <Sel id="p-min" label="Temps disponible" value={p.minutes} onChange={(v) => set({ ...p, minutes: Number(v) })}>{[10, 15, 20, 30].map((m) => <option key={m} value={m}>{m} minutes</option>)}</Sel>
          <Sel id="p-club" label="Entraînements en club" value={p.club} onChange={(v) => set({ ...p, club: Number(v) })}>{[0, 1, 2, 3].map((m) => <option key={m} value={m}>{m} par semaine</option>)}</Sel>
          <Sel id="p-goal" label="Objectif" value={p.goal} onChange={(v) => set({ ...p, goal: v })}>{GOALS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}</Sel>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold"><label className="flex items-center gap-2"><input id="p-petit" type="checkbox" checked={p.petit} onChange={(e) => set({ ...p, petit: e.target.checked })} className="h-5 w-5 accent-pitch-600" />Mode petit espace</label><label className="flex items-center gap-2"><input id="p-ballon" type="checkbox" checked={p.ballon} onChange={(e) => set({ ...p, ballon: e.target.checked })} className="h-5 w-5 accent-pitch-600" />Mode sans matériel</label></div>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <button onClick={() => go("seance")} className="rounded-xl2 bg-pitch-700 p-4 text-left text-white shadow-card"><div className="text-3xl">⚽</div><div className="mt-1 font-display text-lg font-extrabold">Sa séance du jour</div><div className="text-sm text-white/85">Guidée pas à pas, puis adaptée à vos réponses.</div></button>
        <button onClick={() => go("exercices")} className="card text-left"><div className="text-3xl">📚</div><div className="mt-1 font-display text-lg font-extrabold">{nf(n)} fiches pour son âge</div><div className="muted">Sur {nf(LIBRARY.length)} au total, de 4 à 18 ans.</div></button>
      </div>
      <button onClick={() => go("materiel")} className="card mb-4 flex w-full items-center gap-3 bg-sun-100 text-left"><span className="text-3xl" aria-hidden>🛒</span><span className="flex-1"><span className="block font-display text-lg font-extrabold">{reco.name}</span><span className="block text-sm text-ink-700">{reco.contents.join(" · ")}</span></span><span aria-hidden>›</span></button>
      <div className="card mb-4"><div className="font-display text-lg font-extrabold">Son étape : {band.label}</div><p className="font-semibold text-ink-700">{band.theme}</p><div className="mt-2 text-sm font-bold text-pitch-700">Priorités</div><ul className="list-disc pl-5 text-sm text-ink-700">{band.priorities.map((x) => <li key={x}>{x}</li>)}</ul><div className="mt-2 text-sm font-bold text-coral-600">À éviter ou à adapter</div><ul className="list-disc pl-5 text-sm text-ink-700">{band.avoid.map((x) => <li key={x}>{x}</li>)}</ul><div className="mt-3 rounded-2xl bg-sun-100 p-3 text-sm">Séances de {band.sessionMin[0]} à {band.sessionMin[1]} minutes, {band.maxHomePerWeek} par semaine au maximum. {band.recovery}</div></div>
      <div className="card text-sm text-ink-700"><div className="mb-1 font-bold text-ink-900">Dans l'application complète, en plus de cet aperçu</div>Compte famille et plusieurs enfants, calendrier autour du club et des matchs, carnet de progression et mini-évaluations, badges, album de souvenirs, 22 guides parents, calculateur de budget, bilans mensuels, carte cadeau, abonnement et administration.</div>
    </div>
  );
}

function Biblio({ p }: { p: P }) {
  const [cat, setCat] = useState(""); const [q, setQ] = useState(""); const [mine, setMine] = useState(true); const [solo, setSolo] = useState(false); const [open, setOpen] = useState<string | null>(null); const [n, setN] = useState(30);
  const list = useMemo(() => { const t = q.trim().toLowerCase(); return LIBRARY.filter((e) => (!cat || e.category === cat) && (!solo || e.equipment.every((x) => x === "ballon")) && (!mine || (e.age[0] <= p.age && e.age[1] >= p.age)) && (!t || `${e.name} ${e.objective} ${e.skill}`.toLowerCase().includes(t))); }, [cat, q, mine, solo, p.age]);
  const groups = useMemo(() => { const m = new Map<string, Fiche[]>(); for (const e of list) m.set(e.family, [...(m.get(e.family) ?? []), e]); return [...m.values()].map((g) => ({ f: g.find((e) => !e.variantKey) ?? g[0], more: g.length - 1 })); }, [list]);
  useEffect(() => { setN(30); }, [cat, q, mine, solo]);
  useEffect(() => { window.scrollTo(0, 0); }, [open]);
  if (open && BY.get(open)) return <Fiche f={BY.get(open)!} onOpen={setOpen} onBack={() => setOpen(null)} />;
  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Bibliothèque d'exercices</h1>
      <p className="muted mb-3">{nf(list.length)} fiches · {groups.length} exercices de base · {mine ? `adaptés à ${p.name} (${p.age} ans)` : "tous âges"}</p>
      <input id="b-q" className="input mb-3" placeholder="Rechercher : jongles, passe, équilibre…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un exercice" />
      <div className="scroller mb-2"><button onClick={() => setMine(true)} className={`chip shrink-0 ${mine ? "chip-on" : ""}`}>Pour {p.name}</button><button onClick={() => setMine(false)} className={`chip shrink-0 ${!mine ? "chip-on" : ""}`}>Tous âges</button><button onClick={() => setSolo(!solo)} aria-pressed={solo} className={`chip shrink-0 ${solo ? "chip-on" : ""}`}>⚽ Ballon seul</button></div>
      <div className="scroller mb-4"><button onClick={() => setCat("")} className={`chip shrink-0 ${!cat ? "chip-on" : ""}`}>Toutes</button>{CATEGORIES.map((c) => <button key={c.key} onClick={() => setCat(cat === c.key ? "" : c.key)} className={`chip shrink-0 ${cat === c.key ? "chip-on" : ""}`}>{c.icon} {c.label}</button>)}</div>
      {groups.length === 0 && <div className="card muted">Aucun exercice ne correspond. Essayez « Tous âges » ou un autre mot.</div>}
      <ul className="space-y-2">{groups.slice(0, n).map(({ f, more }) => { const c = catOf(f.category); return <li key={f.slug}><button onClick={() => setOpen(f.slug)} className="card flex w-full items-center gap-3 text-left"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: c.color + "22" }} aria-hidden>{c.icon}</span><span className="min-w-0 flex-1"><span className="block truncate font-bold">{f.name}</span><span className="muted block truncate">{c.label} · {f.age[0]}-{f.age[1]} ans · {f.durationMin} min</span><span className="mt-0.5 flex flex-wrap gap-x-3 text-xs font-bold"><span className="text-ink-700">{f.equipment.filter((k) => k !== "ballon").length === 0 ? "⚽ Ballon seul" : "⚽ + " + f.equipment.filter((k) => k !== "ballon").map((k) => kitOf(k)?.label.toLowerCase() ?? k).join(", ")}</span>{more > 0 && <span className="text-pitch-700">+ {more} progression{more > 1 ? "s" : ""}</span>}</span></span><span className="shrink-0 text-xs font-bold text-ink-500" aria-label={`Difficulté ${f.difficulty} sur 5`}>{"●".repeat(f.difficulty)}<span className="text-ink-100">{"●".repeat(5 - f.difficulty)}</span></span></button></li>; })}</ul>
      {groups.length > n && <button className="btn-ghost mt-3 w-full" onClick={() => setN(n + 40)}>Afficher plus ({groups.length - n} restants)</button>}
    </div>
  );
}

const recoKit = (age: number) => DEFAULT_PRODUCTS.find((k) => k.isBundle && age >= k.ageMin && age <= k.ageMax) ?? DEFAULT_PRODUCTS[0];
function Boutique({ p }: { p: P }) {
  const reco = recoKit(p.age);
  const mine = LIBRARY.filter((e) => e.age[0] <= p.age && e.age[1] >= p.age);
  const Card = ({ k, featured }: { k: (typeof DEFAULT_PRODUCTS)[number]; featured?: boolean }) => (
    <div className={`card ${featured ? "ring-2 ring-sun-400" : ""}`}>
      <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className="font-display text-lg font-extrabold">{k.name}</span>{featured && <span className="chip bg-sun-400 text-ink-900">Recommandé pour {p.name}</span>}</div><p className="muted">{k.tagline}</p></div><div className="shrink-0 text-right text-sm font-bold text-ink-500">Prix bientôt annoncé</div></div>
      <ul className="mt-3 space-y-1 text-sm text-ink-700">{k.contents.map((c) => <li key={c}>✓ {c}</li>)}</ul>
      {k.isBundle && <p className="mt-2 text-sm font-bold text-pitch-700">{nf(mine.filter((e) => e.equipment.every((x) => k.equipment.includes(x))).length)} fiches sur {nf(mine.length)} réalisables pour {p.name} avec ce kit.</p>}
      <div className="mt-3 rounded-full bg-ink-100 py-3 text-center text-sm font-bold text-ink-700">Me prévenir de sa sortie</div>
    </div>
  );
  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Le matériel Petit Pont</h1><p className="muted mb-4">Le matériel utilisé dans les fiches, sélectionné par l'équipe Petit Pont. Prix et lien de commande se règlent dans l'administration.</p>
      <h2 className="mb-2 font-display text-[17px] font-extrabold">Le kit conseillé</h2><div className="mb-5"><Card k={reco} featured /></div>
      <h2 className="mb-2 font-display text-[17px] font-extrabold">Les autres kits</h2><div className="mb-5 space-y-3">{DEFAULT_PRODUCTS.filter((k) => k.isBundle && k.slug !== reco.slug).map((k) => <Card key={k.slug} k={k} />)}</div>
      <h2 className="mb-2 font-display text-[17px] font-extrabold">À l'unité</h2><div className="mb-4 space-y-3">{DEFAULT_PRODUCTS.filter((k) => !k.isBundle).map((k) => <Card key={k.slug} k={k} />)}</div>
    </div>
  );
}

function Offres() {
  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Les offres</h1><p className="muted mb-4">Sans engagement. 7 jours d'essai gratuit, sans carte bancaire. Carte cadeau « Une saison » à 29 € en paiement unique. Tarifs modifiables depuis l'administration.</p>
      <div className="space-y-3">{DEFAULT_PLANS.filter((pl) => pl.active).map((pl) => <div key={pl.tier} className={`card ${pl.tier === "FAMILLE" ? "ring-2 ring-sun-400" : ""}`}><div className="flex items-start justify-between gap-3"><div><div className="font-display text-xl font-extrabold">{pl.name}</div><p className="muted">{pl.tagline}</p></div><div className="shrink-0 text-right"><div className="font-display text-2xl font-extrabold">{pl.monthlyCents ? euro(pl.monthlyCents) : "0 €"}</div><div className="text-xs font-bold text-ink-500">{pl.monthlyCents ? `par mois · ou ${euro(pl.yearlyCents)} par an` : "pour toujours"}</div></div></div><ul className="mt-3 space-y-1 text-sm text-ink-700">{pl.features.map((f) => <li key={f} className="flex gap-2"><span className="text-pitch-600">✓</span>{f}</li>)}</ul></div>)}</div>
      <p className="muted mt-3">La bibliothèque compte {nf(LIBRARY.length)} fiches : {BASES.length} exercices de base, chacun décliné en progressions parmi {DECLINATIONS.length} ({AGE_BANDS.length} tranches d'âge).</p>
    </div>
  );
}

const TABS: [string, string, string][] = [["accueil", "Accueil", "🏠"], ["seance", "Séance", "⚽"], ["exercices", "Exercices", "📚"], ["materiel", "Matériel", "🛒"], ["offres", "Offres", "💳"]];
function App() {
  const view = () => { const h = location.hash.slice(1); return TABS.some((t) => t[0] === h) ? h : "accueil"; };
  const [v, setV] = useState(view); const [p, setP] = useState<P>(load);
  useEffect(() => { const f = () => { setV(view()); window.scrollTo(0, 0); }; window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f); }, []);
  useEffect(() => { try { localStorage.setItem("pp-demo", JSON.stringify(p)); } catch {} }, [p]);
  const go = (x: string) => { location.hash = x; };
  return (
    <div className="min-h-full pb-28">
      <header className="gut sticky z-20 border-b border-ink-100 bg-ink-50" style={{ top: "env(safe-area-inset-top, 0px)" }}><div className="mx-auto flex max-w-xl items-center justify-between py-2.5"><button onClick={() => go("accueil")} className="flex items-center gap-2 font-display text-lg font-extrabold"><svg viewBox="0 0 512 512" className="h-8 w-8 rounded-lg" aria-hidden><rect width="512" height="512" rx="112" fill="#0f844f" /><path d="M96 380c50-150 110-230 160-230s110 80 160 230" fill="none" stroke="#ffc640" strokeWidth="34" strokeLinecap="round" /><circle cx="256" cy="330" r="62" fill="#fff" /><path d="M256 296l30 22-11 36h-38l-11-36z" fill="#10231b" /></svg>Petit Pont</button><span className="chip bg-sun-100 text-ink-900">{p.name} · {p.age} ans</span></div></header>
      <main className="gut mx-auto max-w-xl pt-4">{v === "accueil" ? <Accueil p={p} set={setP} go={go} /> : v === "seance" ? <Seance p={p} /> : v === "exercices" ? <Biblio p={p} /> : v === "materiel" ? <Boutique p={p} /> : <Offres />}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }} aria-label="Navigation"><ul className="mx-auto flex max-w-xl">{TABS.map(([k, l, i]) => <li key={k} className="flex-1"><button onClick={() => go(k)} aria-current={v === k ? "page" : undefined} className={`flex w-full flex-col items-center gap-0.5 pb-2 pt-2 text-[11px] font-bold ${v === k ? "text-pitch-700" : "text-ink-500"}`}><span className={`grid h-8 w-12 place-items-center rounded-full text-lg ${v === k ? "bg-pitch-100" : ""}`} aria-hidden>{i}</span>{l}</button></li>)}</ul></nav>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
