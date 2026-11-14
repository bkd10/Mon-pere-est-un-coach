"use client";
// Schémas animés générés par l'application (aucune vidéo d'enfant réel).
// Chaque fiche décrit sa scène ({kind, n}) ; ce composant la dessine et l'anime en SVG.
import { useRef, useState, type ReactNode } from "react";

type Pt = [number, number];
type Mover = { at: Pt; path?: string; keyPoints?: string; keyTimes?: string; begin?: number };
type Scene = { cones?: Pt[]; kid?: Mover; parent?: Mover; ball?: Mover; trail?: string[]; extra?: ReactNode; dur: number; side?: ReactNode };

const W = 320, H = 200;
const line = (pts: Pt[]) => "M" + pts.map((p) => p.join(",")).join(" L");
const smooth = (pts: Pt[]) => {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; const mx = (x0 + x1) / 2; d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`; }
  return d;
};

function build(kind: string, nArg?: number): Scene {
  const n = nArg ?? 5;
  switch (kind) {
    case "slalom": {
      const k = Math.max(2, n), x0 = 70, x1 = 262, step = (x1 - x0) / (k - 1);
      const cones: Pt[] = Array.from({ length: k }, (_, i) => [x0 + i * step, 100]);
      const pts: Pt[] = [[28, 100], ...cones.map(([x], i): Pt => [x, 100 + (i % 2 ? 24 : -24)]), [298, 100]];
      const path = smooth(pts);
      return { cones, kid: { at: pts[0], path, begin: 0.35 }, ball: { at: pts[0], path }, trail: [path], dur: 5.5 };
    }
    case "zigzag": {
      const k = Math.max(2, n);
      const cones: Pt[] = Array.from({ length: k }, (_, i) => [60 + (i * 210) / Math.max(1, k - 1), i % 2 ? 60 : 140]);
      const pts: Pt[] = [[24, 150], ...cones.map(([x, y]): Pt => [x - 4, y + (y > 100 ? -20 : 20)]), [300, 100]];
      const path = line(pts);
      return { cones, kid: { at: pts[0], path, begin: 0.3 }, ball: { at: pts[0], path }, trail: [path], dur: 5 };
    }
    case "circle": {
      const cones: Pt[] = [[115, 100], [205, 100]];
      const path = "M160,100 C160,60 250,60 250,100 C250,140 160,140 160,100 C160,60 70,60 70,100 C70,140 160,140 160,100";
      return { cones, kid: { at: [160, 100], path, begin: 0.3 }, ball: { at: [160, 100], path }, trail: [path], dur: 6 };
    }
    case "gates": {
      const k = n === 1 ? 1 : 2;
      const cones: Pt[] = k === 1 ? [[146, 100], [174, 100]] : [[52, 118], [52, 150], [268, 118], [268, 150]];
      if (k === 1) {
        const path = "M160,168 L160,36 L160,168";
        return { cones, kid: { at: [160, 178] }, parent: { at: [160, 24] }, ball: { at: [160, 168], path }, trail: ["M160,168 L160,36"], dur: 3.6 };
      }
      const ball = "M160,36 L160,128 L52,134 L160,128";
      return { cones, kid: { at: [160, 140], path: "M160,140 L160,140 L64,140 L160,140", keyPoints: "0;0;0.5;1", keyTimes: "0;0.4;0.75;1" }, parent: { at: [160, 24] }, ball: { at: [160, 36], path: ball, keyPoints: "0;0.42;0.8;1", keyTimes: "0;0.4;0.75;1" }, trail: ["M160,36 L160,128", "M160,128 L52,134"], dur: 4.5 };
    }
    case "wall":
      return { kid: { at: [160, 170] }, ball: { at: [160, 158], path: "M160,158 L190,34 L172,158 L140,34 L160,158" }, trail: ["M160,158 L190,34 L172,158 L140,34 L160,158"], dur: 4.4,
        extra: <g><rect x="60" y="14" width="200" height="14" rx="3" fill="#8b9a93" /><path d="M60 21h200M100 14v14M140 14v14M180 14v14M220 14v14" stroke="#6f7f78" strokeWidth="1" /></g> };
    case "target": {
      const goal = n === 0;
      const xs = n >= 3 ? [90, 160, 230] : [160];
      const tx = xs[xs.length - 1 - (n >= 3 ? 1 : 0)];
      const path = `M160,150 L${tx},${goal ? 26 : 44} L160,150`;
      return { cones: goal ? [] : xs.map((x): Pt => [x, 40]), kid: { at: [160, 168], path: "M150,186 L160,168 L150,186", keyPoints: "0;1;1;0", keyTimes: "0;0.2;0.8;1" }, ball: { at: [160, 150], path, keyPoints: "0;0;0.5;0.5;1", keyTimes: "0;0.2;0.5;0.8;1" }, trail: [`M160,150 L${tx},${goal ? 26 : 44}`], dur: 4,
        extra: goal ? <g><rect x="100" y="10" width="120" height="22" fill="none" stroke="#fff" strokeWidth="3" rx="2" /><path d="M100 16h120M100 24h120M120 10v22M140 10v22M160 10v22M180 10v22M200 10v22" stroke="#fff" strokeOpacity=".45" /></g> : undefined };
    }
    case "square": {
      const cones: Pt[] = [[90, 50], [230, 50], [230, 150], [90, 150]];
      const path = "M120,130 C140,70 190,70 200,100 C210,130 150,140 140,100 C135,80 100,100 120,130";
      return { cones, kid: { at: [120, 130], path, begin: 0.3 }, ball: { at: [120, 130], path }, parent: { at: [270, 60], path: "M270,60 L270,140 L270,60" }, trail: [path], dur: 6 };
    }
    case "ladder": {
      const path = smooth([[30, 100], ...Array.from({ length: 8 }, (_, i): Pt => [70 + i * 24, i % 2 ? 108 : 92]), [290, 100]]);
      return { kid: { at: [30, 100], path }, trail: [], dur: 4.5,
        extra: <g stroke="#ffc640" strokeWidth="3" fill="none"><rect x="58" y="80" width="192" height="40" rx="2" />{Array.from({ length: 7 }, (_, i) => <path key={i} d={`M${82 + i * 24} 80v40`} />)}</g> };
    }
    case "mirror": {
      const k = "M110,130 L210,130 L150,130 L190,130 L110,130", p2 = "M110,70 L210,70 L150,70 L190,70 L110,70";
      return { kid: { at: [110, 130], path: k, begin: 0.25 }, parent: { at: [110, 70], path: p2 }, ball: { at: [110, 142], path: "M110,146 L210,146 L150,146 L190,146 L110,146", begin: 0.25 }, dur: 6, extra: <path d="M40 100h240" stroke="#fff" strokeOpacity=".6" strokeDasharray="6 6" strokeWidth="2" /> };
    }
    case "pair":
      return { kid: { at: [160, 168] }, parent: { at: [160, 32] }, ball: { at: [160, 154], path: "M160,154 L160,46 L160,154" }, trail: ["M160,154 L160,46"], dur: 3.4 };
    case "triangle": {
      const cones: Pt[] = [[160, 40], [70, 160], [250, 160]];
      return { cones, parent: { at: [160, 56] }, kid: { at: [82, 146], path: "M82,146 L82,146 L238,146 L238,146 L82,146", keyPoints: "0;0;0.5;0.5;1", keyTimes: "0;0.2;0.5;0.7;1" }, ball: { at: [82, 146], path: "M90,140 L160,66 L230,140 L160,66 L90,140", keyPoints: "0;0.25;0.5;0.75;1", keyTimes: "0;0.2;0.5;0.7;1" }, trail: ["M90,140 L160,66 L230,140"], dur: 6 };
    }
    case "reaction":
      return { cones: [[280, 100]], kid: { at: [80, 100], path: "M80,100 L80,100 L262,100 L80,100", keyPoints: "0;0;0.5;1", keyTimes: "0;0.35;0.6;1" }, parent: { at: [40, 100] }, dur: 5,
        extra: <g><circle cx="160" cy="34" r="14" fill="#ffc640"><animate attributeName="fill" values="#e8eeeb;#e8eeeb;#ffc640;#ffc640;#e8eeeb" keyTimes="0;0.33;0.35;0.6;1" dur="5s" repeatCount="indefinite" /></circle><text x="160" y="39" textAnchor="middle" fontSize="13" fontWeight="800" fill="#10231b">GO</text></g> };
    case "juggle":
      return { dur: 1.6, side: <g>
        <circle cx="150" cy="62" r="13" fill="#ffd7b0" /><path d="M150 76v52" stroke="#f9a826" strokeWidth="16" strokeLinecap="round" /><path d="M150 84l-22 26M150 84l22 22" stroke="#f9a826" strokeWidth="7" strokeLinecap="round" /><path d="M146 128l-4 44" stroke="#10231b" strokeWidth="8" strokeLinecap="round" />
        <path d="M154 128l16 20" stroke="#10231b" strokeWidth="8" strokeLinecap="round"><animate attributeName="d" values="M154 128l16 20;M154 128l24 6;M154 128l16 20" dur="1.6s" repeatCount="indefinite" /></path>
        <path d="M170 148l14 12" stroke="#10231b" strokeWidth="8" strokeLinecap="round"><animate attributeName="d" values="M170 148l14 12;M178 134l18 2;M170 148l14 12" dur="1.6s" repeatCount="indefinite" /></path>
        <g><circle cx="190" r="9" fill="#fff" stroke="#10231b" strokeWidth="1.5"><animate attributeName="cy" values="148;122;86;122;148" keyTimes="0;0.25;0.5;0.75;1" calcMode="spline" keySplines=".2 .6 .4 1;.2 .6 .4 1;.6 0 .8 .4;.6 0 .8 .4" dur="1.6s" repeatCount="indefinite" /></circle></g>
      </g> };
    case "balance":
      return { dur: 3, side: <g>
        <g><animateTransform attributeName="transform" type="rotate" values="-3 160 172;3 160 172;-3 160 172" dur="3s" repeatCount="indefinite" />
          <circle cx="160" cy="60" r="13" fill="#ffd7b0" /><path d="M160 74v52" stroke="#f9a826" strokeWidth="16" strokeLinecap="round" /><path d="M160 84l-34 6M160 84l34 6" stroke="#f9a826" strokeWidth="7" strokeLinecap="round" /><path d="M158 126l2 46" stroke="#10231b" strokeWidth="8" strokeLinecap="round" /><path d="M164 126l22 10l-6 24" stroke="#10231b" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></g>
        {Array.from({ length: (nArg ?? 0) > 2 ? 5 : 0 }, (_, i) => <circle key={i} cx={100 + i * 30} cy={182 - Math.sin((i / 4) * Math.PI) * 6} r="4" fill="#f2674b" />)}
      </g> };
    default: {
      const path = "M50,150 C90,60 140,170 180,90 C210,40 280,80 262,140 C250,180 120,190 50,150";
      return { kid: { at: [50, 150], path, begin: 0.3 }, ball: { at: [50, 150], path }, trail: [path], dur: 7 };
    }
  }
}

function Motion({ m, dur }: { m: Mover; dur: number }) {
  if (!m.path) return null;
  return <animateMotion dur={`${dur}s`} repeatCount="indefinite" path={m.path} begin={m.begin ? `${m.begin}s` : undefined} {...(m.keyPoints ? { keyPoints: m.keyPoints, keyTimes: m.keyTimes, calcMode: "linear" } : {})} />;
}
const origin = (m: Mover): Pt => (m.path ? [0, 0] : m.at);

export default function ExerciseAnimation({ diagram, title, compact = false, controls = true }: { diagram: { kind: string; n?: number; caption?: string }; title?: string; compact?: boolean; controls?: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  const [paused, setPaused] = useState(false);
  const s = build(diagram.kind, diagram.n);
  const toggle = () => { const el = ref.current; if (!el) return; paused ? el.unpauseAnimations() : el.pauseAnimations(); setPaused(!paused); };
  return (
    <figure className="overflow-hidden rounded-2xl bg-pitch-700">
      <div className="relative">
        <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`Schéma animé : ${title ?? diagram.caption ?? "exercice"}`}>
          <defs><pattern id="stripes" width="40" height="200" patternUnits="userSpaceOnUse"><rect width="20" height="200" fill="#1ca463" /><rect x="20" width="20" height="200" fill="#19985c" /></pattern></defs>
          <rect width={W} height={H} fill="url(#stripes)" />
          {s.side ? (
            <g><rect y="176" width={W} height="24" fill="#0f844f" /><path d={`M0 176h${W}`} stroke="#fff" strokeOpacity=".5" strokeWidth="2" />{s.side}</g>
          ) : (
            <g>
              <rect x="6" y="6" width={W - 12} height={H - 12} rx="6" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="2" />
              {s.extra}
              {s.trail?.map((d, i) => <path key={i} d={d} fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="2" strokeDasharray="5 6" strokeLinecap="round" />)}
              {s.cones?.map(([x, y], i) => <g key={i} transform={`translate(${x} ${y})`}><ellipse cy="6" rx="8" ry="3" fill="#0b442e" opacity=".35" /><path d="M0-9L7 6H-7z" fill="#f2674b" stroke="#fff" strokeWidth="1" strokeLinejoin="round" /></g>)}
              {s.parent && <g transform={`translate(${origin(s.parent).join(" ")})`}><Motion m={s.parent} dur={s.dur} /><circle r="12" fill="#2372c2" stroke="#fff" strokeWidth="2" /><text y="4" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">P</text></g>}
              {s.kid && <g transform={`translate(${origin(s.kid).join(" ")})`} opacity={s.kid.path && s.kid.begin ? 0 : 1}>{s.kid.path && s.kid.begin ? <set attributeName="opacity" to="1" begin={`${s.kid.begin}s`} fill="freeze" /> : null}<Motion m={s.kid} dur={s.dur} /><circle r="10" fill="#ffc640" stroke="#fff" strokeWidth="2" /><text y="4" textAnchor="middle" fontSize="10" fontWeight="800" fill="#10231b">E</text></g>}
              {s.ball && <g transform={`translate(${origin(s.ball).join(" ")})`} opacity={s.ball.path && s.ball.begin ? 0 : 1}>{s.ball.path && s.ball.begin ? <set attributeName="opacity" to="1" begin={`${s.ball.begin}s`} fill="freeze" /> : null}<Motion m={s.ball} dur={s.dur} /><circle r="5.5" fill="#fff" stroke="#10231b" strokeWidth="1.2" /><circle r="1.8" fill="#10231b" /></g>}
            </g>
          )}
        </svg>
        {controls && <button type="button" onClick={toggle} aria-label={paused ? "Lire l'animation" : "Mettre l'animation en pause"} className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur">{paused ? "▶" : "❚❚"}</button>}
      </div>
      {!compact && (
        <figcaption className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-white/90">
          <span className="font-bold">{diagram.caption}</span>
          <span className="shrink-0 opacity-90">{s.side ? "Vue de côté" : <><b className="text-sun-300">E</b> enfant{s.parent ? <> · <b className="text-sky-100">P</b> parent</> : null}</>}</span>
        </figcaption>
      )}
    </figure>
  );
}
