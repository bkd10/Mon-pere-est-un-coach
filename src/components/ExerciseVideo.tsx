"use client";
// Vidéo de démonstration jouée dans l'application : le schéma animé de l'exercice, avec les consignes
// qui s'affichent une par une (pourquoi, étapes, erreur fréquente, critère de réussite).
// Rien n'est filmé ni téléchargé : la séquence est construite à partir de la fiche.
import { useEffect, useMemo, useRef, useState } from "react";
import ExerciseAnimation from "./ExerciseAnimation";

export type VideoFiche = { name: string; why: string; steps: string[]; mistakes: string[]; corrections: string[]; success: string; diagram: { kind: string; n?: number; caption?: string } };
type Seg = { d: number; label: string; tone: string; text: string; sub?: string; n?: number };

export default function ExerciseVideo({ fiche, poster = true }: { fiche: VideoFiche; poster?: boolean }) {
  const segs = useMemo<Seg[]>(() => {
    const s: Seg[] = [{ d: 3.2, label: "Pourquoi cet exercice ?", tone: "text-sun-300", text: fiche.why.split(". ")[0].replace(/\.$/, "") + "." }];
    fiche.steps.slice(0, 5).forEach((x, i) => s.push({ d: 3.8, label: `Étape ${i + 1}`, tone: "text-sun-300", text: x, n: i + 1 }));
    if (fiche.mistakes[0]) s.push({ d: 4.6, label: "L'erreur fréquente", tone: "text-coral-100", text: fiche.mistakes[0], sub: fiche.corrections[0] });
    s.push({ d: 3.6, label: "C'est réussi quand…", tone: "text-pitch-200", text: fiche.success });
    return s;
  }, [fiche]);
  const total = segs.reduce((a, s) => a + s.d, 0);
  const [t, setT] = useState(0);
  const [state, setState] = useState<"idle" | "play" | "pause" | "end">("idle");
  const box = useRef<HTMLDivElement>(null);
  const svg = () => box.current?.querySelector("svg") as SVGSVGElement | null;

  // Le schéma reste figé tant que la lecture n'est pas lancée.
  useEffect(() => { const el = svg(); if (!el) return; if (state === "play") el.unpauseAnimations(); else el.pauseAnimations(); }, [state]);
  useEffect(() => {
    if (state !== "play") return;
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      setT((v) => { const n = v + dt; if (n >= total) { setState("end"); return total; } return n; });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state, total]);

  let acc = 0, idx = segs.length - 1;
  for (let i = 0; i < segs.length; i++) { if (t < acc + segs[i].d) { idx = i; break; } acc += segs[i].d; }
  const seg = segs[idx];
  const start = () => { if (state === "end" || state === "idle") { setT(0); svg()?.setCurrentTime(0); } setState("play"); };
  const jump = (i: number) => { setT(segs.slice(0, i).reduce((a, s) => a + s.d, 0)); if (state === "idle" || state === "end") setState("pause"); };

  return (
    <div className="overflow-hidden rounded-xl2 bg-pitch-900 text-white shadow-card">
      <div ref={box} className="relative">
        <ExerciseAnimation diagram={fiche.diagram} title={fiche.name} compact controls={false} />
        {(state === "idle" || state === "end") && poster && (
          <button type="button" onClick={start} className="absolute inset-0 grid place-items-center bg-black/35" aria-label={state === "end" ? "Revoir la démonstration" : `Lire la démonstration, ${Math.round(total)} secondes`}>
            <span className="flex items-center gap-3 rounded-full bg-sun-400 px-5 py-3 font-bold text-ink-900 shadow-card"><span aria-hidden>{state === "end" ? "↺" : "▶"}</span>{state === "end" ? "Revoir" : `Voir la démonstration · ${Math.round(total)} s`}</span>
          </button>
        )}
      </div>
      <div className="flex gap-1 px-4 pt-3" role="group" aria-label="Chapitres de la démonstration">
        {segs.map((s, i) => { const from = segs.slice(0, i).reduce((a, x) => a + x.d, 0); const pct = Math.max(0, Math.min(1, (t - from) / s.d)); return (
          <button key={i} type="button" onClick={() => jump(i)} aria-label={`Aller à : ${s.label}`} aria-current={i === idx ? "step" : undefined} className="h-3 flex-1 py-1"><span className="block h-1 overflow-hidden rounded-full bg-white/25"><span className="block h-1 rounded-full bg-sun-400" style={{ width: `${pct * 100}%` }} /></span></button>
        ); })}
      </div>
      <div className="min-h-[9.5rem] px-4 pb-2 pt-2">
        <div className={`text-xs font-extrabold uppercase tracking-wider ${seg.tone}`}>{seg.label}</div>
        <div className="mt-1 flex gap-3">
          {seg.n && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sun-400 font-display font-extrabold text-ink-900" aria-hidden>{seg.n}</span>}
          <p className="text-[17px] font-bold leading-snug">{seg.text}</p>
        </div>
        {seg.sub && <p className="mt-1.5 text-[15px] font-bold leading-snug text-pitch-200">→ {seg.sub}</p>}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-white/15 px-4 py-2.5">
        <button type="button" onClick={() => (state === "play" ? setState("pause") : start())} className="btn btn-sm bg-white/15 text-white">{state === "play" ? "❚❚ Pause" : state === "end" ? "↺ Revoir" : "▶ Lire"}</button>
        <div className="flex gap-2">
          <button type="button" onClick={() => jump(Math.max(0, idx - 1))} disabled={idx === 0} className="btn btn-sm bg-white/15 text-white" aria-label="Chapitre précédent">←</button>
          <button type="button" onClick={() => jump(Math.min(segs.length - 1, idx + 1))} disabled={idx === segs.length - 1} className="btn btn-sm bg-white/15 text-white" aria-label="Chapitre suivant">→</button>
        </div>
      </div>
    </div>
  );
}
