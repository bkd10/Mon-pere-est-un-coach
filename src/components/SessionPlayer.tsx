"use client";
// Lecteur de séance : une étape à l'écran, comme un tutoriel. Chronomètre et temps de repos intégrés.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ExerciseAnimation from "./ExerciseAnimation";
import Materiel from "./Materiel";

export type PlayerExercise = { slug: string; name: string; objective: string; why: string; reps: string; steps: string[]; mistakes: string[]; corrections: string[]; safety: string; success: string; variantEasy: string; variantMedium: string; variantHard: string; equipment: string[]; diagram: { kind: string; n?: number; caption?: string } };
export type PlayerBlock = { phase: string; title: string; minutes: number; exerciseSlug?: string; text?: string; restSec?: number; variant?: "easy" | "medium" | "hard" };
const PHASE: Record<string, [string, string]> = { accueil: ["Accueil", "👋"], echauffement: ["Échauffement en jouant", "🔥"], technique: ["Exercice", "⚽"], defi: ["Petit défi", "🎯"], calme: ["Retour au calme", "🌿"], discussion: ["On en parle", "💬"] };
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function Timer({ seconds, auto = false, onDone, label }: { seconds: number; auto?: boolean; onDone?: () => void; label: string }) {
  const [left, setLeft] = useState(seconds);
  const [run, setRun] = useState(auto);
  const done = useRef(false);
  useEffect(() => { setLeft(seconds); setRun(auto); done.current = false; }, [seconds, auto]);
  useEffect(() => {
    if (!run) return;
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(t);
  }, [run]);
  useEffect(() => { if (left === 0 && !done.current) { done.current = true; setRun(false); if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(200); onDone?.(); } }, [left, onDone]);
  return (
    <div className="flex items-center justify-between rounded-2xl bg-ink-900 px-4 py-3 text-white">
      <div><div className="text-xs font-bold text-white/90">{label}</div><div className="font-display text-3xl font-extrabold tabular-nums" aria-live="off">{mmss(left)}</div></div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setRun(!run)} className="btn-sun btn-sm">{run ? "Pause" : left === 0 ? "Terminé" : left === seconds ? "Démarrer" : "Reprendre"}</button>
        {left !== seconds && <button type="button" onClick={() => { setLeft(seconds); setRun(false); done.current = false; }} className="btn btn-sm bg-white/15 text-white">↺</button>}
      </div>
    </div>
  );
}

export default function SessionPlayer({ sessionId, blocks, exercises, nickname, beginner, done, standalone = false }: { sessionId: string; blocks: PlayerBlock[]; exercises: Record<string, PlayerExercise>; nickname: string; beginner: boolean; done: boolean; standalone?: boolean }) {
  const [i, setI] = useState(-1);
  const [rest, setRest] = useState<number | null>(null);
  const [open, setOpen] = useState<string | null>(beginner ? "erreurs" : null);
  useEffect(() => { window.scrollTo({ top: 0 }); document.getElementById("etape")?.focus(); }, [i, rest]);
  useEffect(() => {
    if (i < 0) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setI(-1); setRest(null); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i]);
  // Garde l'écran allumé pendant la séance quand le navigateur le permet.
  useEffect(() => {
    if (i < 0) return;
    let lock: { release: () => Promise<void> } | null = null;
    (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => { lock?.release().catch(() => {}); };
  }, [i]);

  if (i < 0) return <button type="button" onClick={() => setI(0)} className="btn-primary w-full text-base">{standalone ? "Commencer l'exercice" : done ? "Refaire la séance pas à pas" : "Commencer la séance"}</button>;
  const b = blocks[i];
  const ex = b.exerciseSlug ? exercises[b.exerciseSlug] : undefined;
  const last = i === blocks.length - 1;
  const next = () => { if (b.restSec && !last && rest === null) setRest(b.restSec); else { setRest(null); setI(i + 1); } };
  const [phaseLabel, phaseIcon] = PHASE[b.phase] ?? ["Étape", "⚽"];
  const variant = ex ? (b.variant === "easy" ? ["Variante facile", ex.variantEasy] : b.variant === "hard" ? ["Variante difficile", ex.variantHard] : ["Variante conseillée", ex.variantMedium]) : null;
  const Acc = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
    <div className="rounded-2xl bg-white shadow-card"><button type="button" onClick={() => setOpen(open === id ? null : id)} aria-expanded={open === id} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold">{title}<span aria-hidden>{open === id ? "−" : "+"}</span></button>{open === id && <div className="px-4 pb-4 text-sm text-ink-700">{children}</div>}</div>
  );

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-ink-50" role="dialog" aria-modal="true" aria-label="Séance guidée">
      <div className="sticky top-0 z-10 bg-ink-50/95 px-4 pb-2 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <button type="button" onClick={() => { setI(-1); setRest(null); }} aria-label="Quitter la séance" className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-card">✕</button>
          <div className="flex flex-1 gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={blocks.length} aria-valuenow={i + 1}>{blocks.map((_, k) => <span key={k} className={`h-1.5 flex-1 rounded-full ${k <= i ? "bg-pitch-600" : "bg-ink-100"}`} />)}</div>
          <span className="text-xs font-bold text-ink-500">{i + 1}/{blocks.length}</span>
        </div>
      </div>
      <div className="mx-auto max-w-xl space-y-3 px-4 pb-32 pt-1">
        {rest !== null ? (
          <div className="pt-10 text-center">
            <div className="text-6xl" aria-hidden>💧</div>
            <h2 className="mt-3 font-display text-2xl font-extrabold">Pause</h2>
            <p className="muted mb-5">On boit, on souffle. Le repos fait partie de l'exercice.</p>
            <Timer seconds={rest} auto label="Temps de repos conseillé" />
            <p className="muted mt-4">Ensuite : <b className="text-ink-900">{blocks[i + 1]?.title}</b></p>
          </div>
        ) : (
          <>
            <div><span className="chip bg-pitch-100 text-pitch-800">{phaseIcon} {phaseLabel} · {b.minutes} min</span><h2 id="etape" tabIndex={-1} className="mt-2 font-display text-2xl font-extrabold leading-tight outline-none">{b.title}</h2></div>
            {ex ? (
              <>
                <ExerciseAnimation diagram={ex.diagram} title={ex.name} />
                <div className="card"><div className="text-sm font-bold text-pitch-700">Pourquoi ?</div><p className="text-sm text-ink-700">{ex.why}</p><div className="mt-2"><Materiel items={ex.equipment} compact /></div></div>
                <div className="card">
                  <div className="mb-2 flex items-center justify-between"><div className="font-bold">Comment faire</div><span className="chip">{ex.reps}</span></div>
                  <ol className="space-y-2.5">{ex.steps.map((s, k) => <li key={k} className="flex gap-3 text-[15px]"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-pitch-600 text-xs font-extrabold text-white">{k + 1}</span><span>{s}</span></li>)}</ol>
                  {variant && <div className="mt-3 rounded-2xl bg-sun-100 p-3 text-sm"><b>{variant[0]} : </b>{variant[1]}</div>}
                </div>
                {b.text && <p className="px-1 text-sm text-ink-700">{b.text}</p>}
                <Timer seconds={b.minutes * 60} label="Durée conseillée" />
                <Acc id="erreurs" title="Erreurs fréquentes et quoi dire">
                  <ul className="space-y-2">{ex.mistakes.map((m, k) => <li key={k}><span className="font-semibold text-ink-900">{m}</span>{ex.corrections[k] && <span className="block text-pitch-800">→ {ex.corrections[k]}</span>}</li>)}</ul>
                  {ex.corrections.length > ex.mistakes.length && <p className="mt-2 text-pitch-800">→ {ex.corrections.slice(ex.mistakes.length).join(" ")}</p>}
                  <p className="mt-2 text-ink-500">Une seule correction à la fois, de préférence après une réussite.</p>
                </Acc>
                <Acc id="variantes" title="Trop facile ? Trop difficile ?"><p><b>Plus facile :</b> {ex.variantEasy}</p><p className="mt-1"><b>Intermédiaire :</b> {ex.variantMedium}</p><p className="mt-1"><b>Plus difficile :</b> {ex.variantHard}</p></Acc>
                <Acc id="reussite" title="Critère de réussite et sécurité"><p><b>C'est réussi quand :</b> {ex.success}</p><p className="mt-2"><b>Sécurité :</b> {ex.safety}</p></Acc>
              </>
            ) : (
              <div className="card text-[15px] text-ink-700">{b.text}</div>
            )}
            {b.phase === "accueil" && <div className="card bg-sun-100 text-sm"><b>S'il dit non aujourd'hui</b> : fermez la séance et choisissez « Pas aujourd'hui ». {nickname} aura d'autant plus envie la prochaine fois.</div>}
          </>
        )}
      </div>
      <div className="safe-b fixed inset-x-0 bottom-0 border-t border-ink-100 bg-white px-4 pt-3">
        <div className="mx-auto flex max-w-xl gap-2">
          {i > 0 && rest === null && <button type="button" onClick={() => setI(i - 1)} className="btn-ghost">←</button>}
          {last && rest === null ? (standalone ? <button type="button" onClick={() => setI(-1)} className="btn-primary flex-1 text-base">Terminer l'exercice</button> : <Link href={`/app/seance/${sessionId}/retour`} className="btn-primary flex-1 text-base">Terminer · 3 questions rapides</Link>) : <button type="button" onClick={next} className="btn-primary flex-1 text-base">{rest !== null ? "Passer la pause" : "Étape suivante"}</button>}
        </div>
      </div>
    </div>
  );
}
