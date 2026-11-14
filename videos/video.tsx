// Vidéo verticale « schéma animé » d'un exercice (1080 × 1920), générée image par image.
// La page expose window.__dur (durée en secondes) et window.__seek(t) : scripts/videos.mjs s'en sert pour filmer.
import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import ExerciseAnimation from "../src/components/ExerciseAnimation";
import { BASES } from "../src/content/library";
import { catOf, eqLabel } from "../src/content/taxonomy";

const slug = decodeURIComponent(location.hash.slice(1));
const f = BASES.find((b) => b.slug === slug) ?? BASES[0];
const cat = catOf(f.category);
const steps = f.steps.slice(0, 4);

// Découpage : accroche, étapes une par une, erreur fréquente et quoi dire, puis invitation.
type Seg = { a: number; b: number; node: React.ReactNode };
const segs: Seg[] = [];
let t = 0;
const push = (d: number, node: React.ReactNode) => { segs.push({ a: t, b: t + d, node }); t += d; };
const Label = ({ children, color = "#ffc640" }: { children: React.ReactNode; color?: string }) => <div style={{ font: "800 34px Outfit", letterSpacing: 2, textTransform: "uppercase", color, marginBottom: 14 }}>{children}</div>;
push(3, <div><Label>Pourquoi cet exercice ?</Label><div style={{ font: "700 46px/1.3 Nunito" }}>{f.why.split(". ")[0].replace(/\.$/, "")}.</div></div>);
steps.forEach((s, i) => push(3.6, <div style={{ display: "flex", gap: 28, alignItems: "flex-start" }}><div style={{ flex: "none", width: 92, height: 92, borderRadius: 46, background: "#ffc640", color: "#10231b", font: "800 54px/92px Outfit", textAlign: "center" }}>{i + 1}</div><div style={{ font: "700 46px/1.3 Nunito" }}>{s}</div></div>));
if (f.mistakes[0]) push(4.4, <div><Label color="#ff9d8a">L'erreur fréquente</Label><div style={{ font: "700 42px/1.3 Nunito" }}>{f.mistakes[0]}</div>{f.corrections[0] && <div style={{ font: "800 42px/1.3 Nunito", color: "#aeeac6", marginTop: 18 }}>→ {f.corrections[0]}</div>}</div>);
push(3.4, <div style={{ textAlign: "center" }}><div style={{ font: "800 56px/1.2 Outfit" }}>La séance complète est gratuite</div><div style={{ font: "700 42px/1.3 Nunito", color: "#aeeac6", marginTop: 16 }}>dans l'application Petit Pont</div></div>);
const DUR = t;

function Card() {
  return (
    <div style={{ width: 1080, height: 1920, background: "linear-gradient(180deg,#0b442e 0%,#0d5336 55%,#0b442e 100%)", color: "#fff", position: "relative", overflow: "hidden", fontFamily: "Nunito" }}>
      <div style={{ position: "absolute", left: 70, top: 150, display: "flex", alignItems: "center", gap: 20 }}>
        <svg viewBox="0 0 512 512" width="84" height="84"><rect width="512" height="512" rx="112" fill="#0f844f" /><path d="M96 380c50-150 110-230 160-230s110 80 160 230" fill="none" stroke="#ffc640" strokeWidth="34" strokeLinecap="round" /><circle cx="256" cy="330" r="62" fill="#fff" /><path d="M256 296l30 22-11 36h-38l-11-36z" fill="#10231b" /></svg>
        <div style={{ font: "800 50px Outfit" }}>Petit Pont</div>
      </div>
      <div style={{ position: "absolute", left: 70, right: 70, top: 280 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[cat.label, `${f.age[0]}-${f.age[1]} ans`, `${f.durationMin} min`].map((x, i) => <span key={x} style={{ font: "800 32px Nunito", padding: "10px 24px", borderRadius: 40, background: i === 0 ? "#ffc640" : "rgba(255,255,255,.16)", color: i === 0 ? "#10231b" : "#fff" }}>{x}</span>)}
        </div>
        <div style={{ font: "800 84px/1.05 Outfit", marginTop: 26, letterSpacing: -1 }}>{f.name}</div>
      </div>
      <div className="pitch" style={{ position: "absolute", left: 40, right: 40, top: 600, borderRadius: 36, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.35)", border: "6px solid rgba(255,255,255,.9)" }}>
        <ExerciseAnimation diagram={f.diagram} title={f.name} compact />
      </div>
      <div style={{ position: "absolute", left: 60, top: 1240, display: "flex", gap: 26, font: "700 30px Nunito", color: "rgba(255,255,255,.9)", alignItems: "center" }}>
        <span><b style={{ color: "#ffc640" }}>E</b> l'enfant</span>{["gates", "square", "mirror", "pair", "triangle", "reaction"].includes(f.diagram.kind) && <span><b style={{ color: "#8ec5ff" }}>P</b> le parent</span>}<span>Matériel : {f.equipment.map(eqLabel).join(", ").toLowerCase() || "aucun"}</span>
      </div>
      <div style={{ position: "absolute", left: 70, right: 150, top: 1320, height: 330 }}>
        {segs.map((s, i) => <div key={i} className="seg" data-a={s.a} data-b={s.b} style={{ position: "absolute", inset: 0, opacity: 0 }}>{s.node}</div>)}
      </div>
      <div style={{ position: "absolute", left: 70, right: 70, top: 1296, height: 8, borderRadius: 4, background: "rgba(255,255,255,.18)" }}><div id="bar" style={{ height: 8, borderRadius: 4, background: "#ffc640", width: 0 }} /></div>
    </div>
  );
}

flushSync(() => createRoot(document.getElementById("root")!).render(<Card />));
const svg = document.querySelector<SVGSVGElement>(".pitch svg")!;
svg.pauseAnimations();
const w = window as unknown as { __dur: number; __seek: (t: number) => void; __ready: boolean };
w.__dur = DUR;
w.__seek = (time: number) => {
  svg.setCurrentTime(time);
  document.querySelectorAll<HTMLElement>(".seg").forEach((el) => {
    const a = Number(el.dataset.a), b = Number(el.dataset.b);
    const o = time < a || time >= b ? 0 : Math.min(1, (time - a) / 0.3, (b - time) / 0.25);
    el.style.opacity = String(Math.max(0, o));
    el.style.transform = `translateY(${(1 - Math.min(1, Math.max(0, (time - a) / 0.3))) * 24}px)`;
  });
  (document.getElementById("bar") as HTMLElement).style.width = `${(time / DUR) * 100}%`;
};
w.__seek(0);
document.fonts.ready.then(() => { w.__ready = true; });
