"use client";
// Schémas animés générés par l'application (aucune vidéo d'enfant réel).
// Chaque fiche décrit sa scène ({kind, n}) ; ce composant la dessine et l'anime en SVG.
import { useRef, useState, type ReactNode } from "react";

type Pt = [number, number];
type Mover = { at: Pt; path?: string; keyPoints?: string; keyTimes?: string; begin?: number };
type Scene = { cones?: Pt[]; kid?: Mover; parent?: Mover; ball?: Mover; trail?: string[]; extra?: ReactNode; dur: number; side?: ReactNode; view?: string };

const W = 320, H = 200;
const line = (pts: Pt[]) => "M" + pts.map((p) => p.join(",")).join(" L");
const smooth = (pts: Pt[]) => {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; const mx = (x0 + x1) / 2; d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`; }
  return d;
};


// Personnage de profil ou de face, dessiné en traits (aucun enfant réel) : mêmes couleurs que les autres schémas.
const SKIN = "#ffd7b0", SHIRT = "#f9a826", PANTS = "#10231b", BALL = <><circle r="11" fill="#fff" stroke="#10231b" strokeWidth="1.5" /><circle r="3.4" fill="#10231b" /></>;
const L = (d: string, w = 8, c = PANTS) => <path d={d} stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" fill="none" />;
const anim = (values: string[], dur: number, keyTimes?: number[]) => <animate attributeName="d" values={values.join(";")} {...(keyTimes ? { keyTimes: keyTimes.join(";") } : {})} dur={`${dur}s`} repeatCount="indefinite" />;
const A = (d: string[], dur: number, kt?: number[], w = 8, c = PANTS) => <path stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" fill="none" d={d[0]}>{anim(d, dur, kt)}</path>;

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
      if (nArg === 1) { const path = "M90,150 L90,50 L230,50 L230,150 L90,150"; return { cones, kid: { at: [90, 150], path, begin: 0.2 }, trail: [path], dur: 6 }; }
      if (nArg === 2) return { cones, kid: { at: [90, 150], path: "M90,150 L90,50 L90,150", keyPoints: "0;0;1;1", keyTimes: "0;0.3;0.5;1" }, parent: { at: [230, 150], path: "M230,150 L230,50 L230,150", keyPoints: "0;0;1;1", keyTimes: "0;0.3;0.5;1" }, ball: { at: [96, 150], path: "M96,150 L224,150 L224,50 L96,50 L96,150" }, trail: ["M96,150 L224,150", "M224,150 L224,50", "M224,50 L96,50"], dur: 6 };
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
      return { kid: { at: [110, 130], path: k, begin: 0.25 }, parent: { at: [110, 70], path: p2 }, ball: { at: [110, 142], path: "M110,146 L210,146 L150,146 L190,146 L110,146", begin: 0.25 }, dur: 6, extra: <g><path d="M40 100h240" stroke="#fff" strokeOpacity=".6" strokeDasharray="6 6" strokeWidth="2" />{nArg === 2 && <g fill="none" stroke="#fff" strokeWidth="3"><path d="M16 78h12v44H16" /><path d="M304 78h-12v44h12" /></g>}</g> };
    }
    case "pair": {
      const extra = nArg === 2 ? <path d="M126 100h68" stroke="#f2674b" strokeWidth="7" strokeLinecap="round" /> // obstacle à franchir
        : nArg === 3 ? <g stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M50 100h220" strokeDasharray="3 6" /><path d="M50 88v24M270 88v24" /></g> // ficelle ou ligne
        : nArg === 4 ? <path d="M150 44l-10 20M170 44l10 20" stroke="#2372c2" strokeWidth="5" strokeLinecap="round" /> // jambes écartées du parent
        : nArg === 5 ? <g transform="translate(184 0)"><animateMotion dur="3.4s" repeatCount="indefinite" path="M0,46 L0,154 L0,46" /><circle r="5.5" fill="#fff" stroke="#10231b" strokeWidth="1.2" /><circle r="1.8" fill="#10231b" /></g> : undefined; // deuxième ballon en sens inverse
      return { kid: { at: [160, 168] }, parent: { at: [160, 32] }, ball: { at: [nArg === 5 ? 140 : 160, 154], path: `M${nArg === 5 ? 140 : 160},154 L${nArg === 5 ? 140 : 160},46 L${nArg === 5 ? 140 : 160},154` }, trail: [`M${nArg === 5 ? 140 : 160},154 L${nArg === 5 ? 140 : 160},46`], dur: 3.4, extra };
    }
    case "triangle": {
      const cones: Pt[] = [[160, 40], [70, 160], [250, 160]];
      return { cones, parent: { at: [160, 56] }, kid: { at: [82, 146], path: "M82,146 L82,146 L238,146 L238,146 L82,146", keyPoints: "0;0;0.5;0.5;1", keyTimes: "0;0.2;0.5;0.7;1" }, ball: { at: [82, 146], path: "M90,140 L160,66 L230,140 L160,66 L90,140", keyPoints: "0;0.25;0.5;0.75;1", keyTimes: "0;0.2;0.5;0.7;1" }, trail: ["M90,140 L160,66 L230,140"], dur: 6 };
    }
    case "reaction":
      return { cones: [[280, 100]], kid: { at: [80, 100], path: "M80,100 L80,100 L262,100 L80,100", keyPoints: "0;0;0.5;1", keyTimes: "0;0.35;0.6;1" }, parent: { at: [40, 100] }, dur: 5,
        extra: <g><circle cx="160" cy="34" r="14" fill="#ffc640"><animate attributeName="fill" values="#e8eeeb;#e8eeeb;#ffc640;#ffc640;#e8eeeb" keyTimes="0;0.33;0.35;0.6;1" dur="5s" repeatCount="indefinite" /></circle><text x="160" y="39" textAnchor="middle" fontSize="13" fontWeight="800" fill="#10231b">GO</text></g> };
    case "juggle": {
      const jug = <g>
        <circle cx="150" cy="62" r="13" fill="#ffd7b0" /><path d="M150 76v52" stroke="#f9a826" strokeWidth="16" strokeLinecap="round" /><path d="M150 84l-22 26M150 84l22 22" stroke="#f9a826" strokeWidth="7" strokeLinecap="round" /><path d="M146 128l-4 44" stroke="#10231b" strokeWidth="8" strokeLinecap="round" />
        <path d="M154 128l16 20" stroke="#10231b" strokeWidth="8" strokeLinecap="round"><animate attributeName="d" values="M154 128l16 20;M154 128l24 6;M154 128l16 20" dur="1.6s" repeatCount="indefinite" /></path>
        <path d="M170 148l14 12" stroke="#10231b" strokeWidth="8" strokeLinecap="round"><animate attributeName="d" values="M170 148l14 12;M178 134l18 2;M170 148l14 12" dur="1.6s" repeatCount="indefinite" /></path>
        <g><circle cx="190" r="9" fill="#fff" stroke="#10231b" strokeWidth="1.5"><animate attributeName="cy" values="148;122;86;122;148" keyTimes="0;0.25;0.5;0.75;1" calcMode="spline" keySplines=".2 .6 .4 1;.2 .6 .4 1;.6 0 .8 .4;.6 0 .8 .4" dur="1.6s" repeatCount="indefinite" /></circle></g>
      </g>;
      return { dur: 1.6, side: nArg === 1 ? <g><animateTransform attributeName="transform" type="translate" values="-50 0;40 0" dur="4.8s" repeatCount="indefinite" /><animate attributeName="opacity" values="1;1;0" keyTimes="0;0.85;1" dur="4.8s" repeatCount="indefinite" />{jug}</g> : jug };
    }
    case "balance":
      return { dur: 3, side: <g>
        <g><animateTransform attributeName="transform" type="rotate" values="-3 160 172;3 160 172;-3 160 172" dur="3s" repeatCount="indefinite" />
          <circle cx="160" cy="60" r="13" fill="#ffd7b0" /><path d="M160 74v52" stroke="#f9a826" strokeWidth="16" strokeLinecap="round" /><path d="M160 84l-34 6M160 84l34 6" stroke="#f9a826" strokeWidth="7" strokeLinecap="round" /><path d="M158 126l2 46" stroke="#10231b" strokeWidth="8" strokeLinecap="round" /><path d="M164 126l22 10l-6 24" stroke="#10231b" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></g>
        {Array.from({ length: (nArg ?? 0) > 2 ? 5 : 0 }, (_, i) => <circle key={i} cx={100 + i * 30} cy={182 - Math.sin((i / 4) * Math.PI) * 6} r="4" fill="#f2674b" />)}
      </g> };
    case "sole": { // semelle sur le ballon : il le fait rouler (n = 1 : tap-tap, un pied après l'autre)
      const tap = nArg === 1;
      return { dur: 2.4, side: <g>
        <circle cx="150" cy="60" r="13" fill={SKIN} />{L("M150 74v52", 16, SHIRT)}{L("M150 84l-24 22M150 84l24 18", 7, SHIRT)}
        {tap ? <g>
          <g><animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="1.2s" repeatCount="indefinite" />
            {A(["M148 128L146 172", "M150 128L172 140L192 152", "M148 128L146 172"], 1.2, [0, 0.5, 1])}{A(["M152 128L172 140L192 152", "M152 128L154 172", "M152 128L172 140L192 152"], 1.2, [0, 0.5, 1])}</g>
          <g transform="translate(198 165)">{BALL}</g>
        </g> : <g>
          {L("M146 126L144 172")}{A(["M154 128L172 140L186 152", "M154 128L188 140L210 152", "M154 128L172 140L186 152"], 2.4, [0, 0.5, 1])}
          <g><animateTransform attributeName="transform" type="translate" values="190 165;214 165;190 165" dur="2.4s" repeatCount="indefinite" />{BALL}</g>
          <path d="M184 190h38M184 190l6-4M184 190l6 4M222 190l-6-4M222 190l-6 4" stroke="#fff" strokeOpacity=".7" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>}
      </g> };
    }
    case "rope": // corde à sauter, vue de face
      return { dur: 1.2, view: "Vue de face", side: <g>
        <g><animateTransform attributeName="transform" type="translate" values="0 -16;0 0;0 0;0 0;0 -16" keyTimes="0;0.25;0.5;0.75;1" dur="1.2s" repeatCount="indefinite" />
          <circle cx="160" cy="60" r="13" fill={SKIN} />{L("M160 74v52", 16, SHIRT)}{L("M160 84L132 104M160 84L188 104", 7, SHIRT)}{L("M155 126L154 172M165 126L166 172")}
          <circle cx="130" cy="105" r="4" fill="#ffc640" /><circle cx="190" cy="105" r="4" fill="#ffc640" />
          <path fill="none" stroke="#ffc640" strokeWidth="3" strokeLinecap="round" d="M130 105Q160 285 190 105">{anim(["M130 105Q160 285 190 105", "M130 105Q160 190 190 105", "M130 105Q160 -10 190 105", "M130 105Q160 -50 190 105", "M130 105Q160 -10 190 105", "M130 105Q160 190 190 105", "M130 105Q160 285 190 105"], 1.2, [0, 0.18, 0.32, 0.5, 0.68, 0.82, 1])}</path>
        </g>
      </g> };
    case "hop": { // saut par-dessus un plot, réception genoux fléchis, on tient la position
      const kt = [0, 0.3, 0.55, 0.85, 1];
      return { dur: 3.6, side: <g>
        <path d="M130 176L138 154L146 176z" fill="#f2674b" stroke="#fff" strokeWidth="1" strokeLinejoin="round" />
        <g><animateTransform attributeName="transform" type="translate" values="0 0;44 -36;96 0;96 0;96 0" keyTimes={kt.join(";")} dur="3.6s" repeatCount="indefinite" /><animate attributeName="opacity" values="1;1;1;1;0" keyTimes={kt.join(";")} dur="3.6s" repeatCount="indefinite" />
          <circle cx="86" cy="60" r="13" fill={SKIN} />{L("M86 74v52", 16, SHIRT)}{L("M86 84L66 108M86 84L108 100", 7, SHIRT)}
          {A(["M84 126L82 172", "M84 126L96 146L88 160", "M84 126L100 150L86 172", "M84 126L100 150L86 172", "M84 126L82 172"], 3.6, kt)}{A(["M90 126L96 172", "M90 126L104 146L96 160", "M90 126L106 150L94 172", "M90 126L106 150L94 172", "M90 126L96 172"], 3.6, kt)}
        </g>
      </g> };
    }
    case "walkline": // marcher sur une ligne, un pied devant l'autre
      return { dur: 5, side: <g>
        <rect x="30" y="173" width="260" height="4" rx="2" fill="#fff" opacity=".9" />
        <g><animateTransform attributeName="transform" type="translate" values="0 0;170 0" dur="5s" repeatCount="indefinite" /><animate attributeName="opacity" values="1;1;1;0" keyTimes="0;0.7;0.9;1" dur="5s" repeatCount="indefinite" />
          <circle cx="70" cy="62" r="13" fill={SKIN} />{L("M70 76v50", 16, SHIRT)}{L("M70 86L36 92M70 86L104 92", 7, SHIRT)}
          {A(["M66 126L56 172", "M66 126L84 172", "M66 126L56 172"], 1, [0, 0.5, 1])}{A(["M74 126L84 172", "M74 126L56 172", "M74 126L84 172"], 1, [0, 0.5, 1])}
        </g>
      </g> };
    case "mobility": // chevilles : le genou va toucher le mur, le talon reste au sol
      return { dur: 3, side: <g>
        <rect x="256" y="60" width="10" height="116" rx="2" fill="#8b9a93" />
        <circle cx="180" cy="68" r="13" fill={SKIN} />{L("M172 124L178 88", 16, SHIRT)}{L("M178 90L252 100", 7, SHIRT)}{L("M170 124L116 172")}
        {A(["M172 124L204 142L214 172", "M172 124L246 138L214 172", "M172 124L204 142L214 172"], 3, [0, 0.5, 1])}
      </g> };
    case "talk": { // se parler : trois réussites, un rituel, un objectif
      const star = (x: number, y: number, t: number) => <text x={x} y={y} textAnchor="middle" fontSize="26" fill="#ffc640" opacity="0">★<animate attributeName="opacity" values="0;0;1;1;0" keyTimes={`0;${t};${t + 0.1};0.92;1`} dur="6s" repeatCount="indefinite" /></text>;
      return { dur: 6, view: "Vue de face", side: <g>
        <circle cx="104" cy="76" r="15" fill={SKIN} />{L("M104 94V142", 20, "#2372c2")}{L("M98 142V174M110 142V174")}
        <circle cx="216" cy="98" r="12" fill={SKIN} />{L("M216 112V148", 16, SHIRT)}{L("M211 148V174M221 148V174")}
        <g transform="translate(160 165)">{BALL}</g>
        {star(142, 56, 0.1)}{star(160, 36, 0.3)}{star(178, 56, 0.5)}
      </g> };
    }
    case "breath": // la respiration du ballon : le ballon monte et descend sur le ventre
      return { dur: 10, side: <g>
        <circle cx="62" cy="160" r="12" fill={SKIN} />{L("M78 166L196 166", 18, SHIRT)}{L("M196 166L220 140L246 166")}
        <g><animateTransform attributeName="transform" type="translate" values="136 146;136 130;136 146" keyTimes="0;0.4;1" dur="10s" repeatCount="indefinite" />{BALL}</g>
        <text x="160" y="56" textAnchor="middle" fontSize="20" fontWeight="800" fill="#fff">Inspire…<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.39;0.4;1" dur="10s" repeatCount="indefinite" /></text>
        <text x="160" y="56" textAnchor="middle" fontSize="20" fontWeight="800" fill="#fff" opacity="0">Souffle…<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;0.4;0.41;1" dur="10s" repeatCount="indefinite" /></text>
      </g> };
    case "lane": { // conduite en ligne droite : couloir (0), sprint entre deux plots (2), trois zones (3), demi-tour (4), déménageurs (6)
      const k = nArg ?? 0;
      if (k === 2) return { cones: [[56, 100], [264, 100]], kid: { at: [56, 100], path: "M56,100 L264,100", keyPoints: "0;0.15;1", keyTimes: "0;0.3;1", begin: 0.2 }, ball: { at: [56, 100], path: "M56,100 L264,100", keyPoints: "0;0.15;1", keyTimes: "0;0.3;1" }, trail: ["M56,100 L264,100"], dur: 3.6 };
      if (k === 3) return { kid: { at: [30, 100], path: "M30,100 L290,100", keyPoints: "0;0.3;0.7;0.9;0.9", keyTimes: "0;0.33;0.6;0.8;1" }, ball: { at: [30, 100], path: "M30,100 L290,100", keyPoints: "0;0.3;0.7;0.9;0.9", keyTimes: "0;0.33;0.6;0.8;1" }, dur: 6,
        extra: <g fill="#fff" fontSize="11" fontWeight="800" textAnchor="middle"><path d="M110 50v100M212 50v100" stroke="#fff" strokeDasharray="5 5" strokeWidth="2" /><text x="64" y="44">lent</text><text x="160" y="44">vite</text><text x="258" y="44">stop</text></g> };
      if (k === 4) { const path = "M60,92 L250,92 C280,92 280,114 250,114 L60,114"; return { cones: [[60, 103], [250, 103]], kid: { at: [60, 92], path, begin: 0.2 }, ball: { at: [60, 92], path }, trail: [path], dur: 5 }; }
      if (k === 6) return { kid: { at: [64, 100], path: "M64,100 L256,100 L64,100" }, ball: { at: [64, 100], path: "M64,100 L256,100 L64,100" }, trail: ["M64,100 L256,100"], dur: 5,
        extra: <g><rect x="18" y="66" width="62" height="68" rx="6" fill="#fff" fillOpacity=".18" stroke="#fff" strokeWidth="2" /><rect x="240" y="66" width="62" height="68" rx="6" fill="#fff" fillOpacity=".18" stroke="#fff" strokeWidth="2" />{[[34, 84], [56, 84], [34, 112], [56, 112]].map(([x, y], i) => <rect key={i} x={x} y={y} width="10" height="10" rx="2" fill="#ffc640" />)}</g> };
      return { kid: { at: [28, 100], path: "M28,100 L298,100", begin: 0.2 }, ball: { at: [28, 100], path: "M28,100 L298,100" }, trail: ["M28,100 L298,100"], dur: 4, extra: <g stroke="#fff" strokeWidth="4" strokeLinecap="round"><path d="M20 76h280M20 124h280" /></g> };
    }
    case "shuttle": { // navette : trois plots alignés, aller-retour
      const path = "M160,100 L250,100 L160,100 L70,100 L160,100";
      return { cones: [[70, 100], [160, 100], [250, 100]], kid: { at: [160, 100], path }, trail: [path], dur: 5 };
    }
    case "tshape": { // parcours en T : course avant, pas chassés, course arrière
      const path = "M160,172 L160,76 L236,76 L84,76 L160,76 L160,172";
      return { cones: [[160, 178], [160, 70], [84, 70], [236, 70]], kid: { at: [160, 172], path }, trail: [path], dur: 7 };
    }
    case "line": { // plots alignés : pas chassés puis pas croisés, puis le geste
      const path = "M36,100 L130,100 L250,100";
      return { cones: [[70, 100], [130, 100], [190, 100], [250, 100]], kid: { at: [36, 100], path, keyPoints: "0;0.45;1", keyTimes: "0;0.5;1" }, ball: { at: [282, 100] }, trail: [path], dur: 5 };
    }
    case "sidebyside": // avancer côte à côte en se passant le ballon
      return { kid: { at: [30, 135], path: "M30,135 L290,135" }, parent: { at: [30, 65], path: "M30,65 L290,65" }, ball: { at: [30, 135], path: "M30,135 L100,65 L170,135 L240,65 L290,135" }, trail: ["M30,135 L100,65 L170,135 L240,65 L290,135"], dur: 6 };
    case "bounce": // dribble à la main : le ballon rebondit à côté de lui pendant qu'il avance
      return { dur: 4.8, side: <g>
        <g><animateTransform attributeName="transform" type="translate" values="-40 0;60 0" dur="4.8s" repeatCount="indefinite" /><animate attributeName="opacity" values="1;1;0" keyTimes="0;0.85;1" dur="4.8s" repeatCount="indefinite" />
          <circle cx="140" cy="62" r="13" fill={SKIN} />{L("M140 76v50", 16, SHIRT)}{L("M138 86L122 108", 7, SHIRT)}{A(["M142 86L168 112", "M142 86L166 98", "M142 86L168 112"], 0.6, [0, 0.5, 1], 7, SHIRT)}
          {A(["M138 126L128 172", "M138 126L152 172", "M138 126L128 172"], 1.2, [0, 0.5, 1])}{A(["M144 126L152 172", "M144 126L128 172", "M144 126L152 172"], 1.2, [0, 0.5, 1])}
          <g transform="translate(172 0)"><g><animateTransform attributeName="transform" type="translate" values="0 165;0 108;0 165" keyTimes="0;0.5;1" calcMode="spline" keySplines=".2 .6 .4 1;.6 0 .8 .4" dur="0.6s" repeatCount="indefinite" />{BALL}</g></g>
        </g>
      </g> };
    case "animal": // marche de l'ours : mains et pieds au sol, genoux décollés
      return { dur: 5, side: <g>
        <g><animateTransform attributeName="transform" type="translate" values="-30 0;80 0" dur="5s" repeatCount="indefinite" /><animate attributeName="opacity" values="1;1;0" keyTimes="0;0.85;1" dur="5s" repeatCount="indefinite" />
          {L("M112 108L172 118", 16, SHIRT)}<circle cx="192" cy="112" r="12" fill={SKIN} />
          {A(["M172 120L184 172", "M172 120L206 172", "M172 120L184 172"], 1.2, [0, 0.5, 1])}{A(["M172 120L206 172", "M172 120L184 172", "M172 120L206 172"], 1.2, [0, 0.5, 1])}
          {A(["M112 110L98 172", "M112 110L128 172", "M112 110L98 172"], 1.2, [0, 0.5, 1])}{A(["M112 110L128 172", "M112 110L98 172", "M112 110L128 172"], 1.2, [0, 0.5, 1])}
        </g>
      </g> };
    case "fastfeet": // appuis très rapides sur place pendant 5 secondes
      return { dur: 0.5, side: <g>
        <g><animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="0.5s" repeatCount="indefinite" />
          <circle cx="160" cy="62" r="13" fill={SKIN} />{L("M160 76v50", 16, SHIRT)}
          {A(["M160 88L142 106L156 116", "M160 88L178 102L172 90", "M160 88L142 106L156 116"], 0.5, [0, 0.5, 1], 7, SHIRT)}{A(["M160 88L178 102L172 90", "M160 88L142 106L156 116", "M160 88L178 102L172 90"], 0.5, [0, 0.5, 1], 7, SHIRT)}
          {A(["M156 126L152 172", "M156 126L166 146L158 156", "M156 126L152 172"], 0.5, [0, 0.5, 1])}{A(["M164 126L172 150L164 158", "M164 126L168 172", "M164 126L172 150L164 158"], 0.5, [0, 0.5, 1])}
        </g>
        <text x="258" y="52" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff">5 s</text>
      </g> };
    case "highknees": // gammes de course : montées de genoux en avançant
      return { dur: 5, side: <g>
        <g><animateTransform attributeName="transform" type="translate" values="-10 0;170 0" dur="5s" repeatCount="indefinite" /><animate attributeName="opacity" values="1;1;0" keyTimes="0;0.85;1" dur="5s" repeatCount="indefinite" />
          <circle cx="70" cy="62" r="13" fill={SKIN} />{L("M70 76v50", 16, SHIRT)}
          {A(["M70 88L88 104L96 92", "M70 88L52 104L44 96", "M70 88L88 104L96 92"], 0.9, [0, 0.5, 1], 7, SHIRT)}{A(["M70 88L52 104L44 96", "M70 88L88 104L96 92", "M70 88L52 104L44 96"], 0.9, [0, 0.5, 1], 7, SHIRT)}
          {A(["M66 126L98 128L98 156", "M66 126L62 172", "M66 126L98 128L98 156"], 0.9, [0, 0.5, 1])}{A(["M74 126L72 172", "M74 126L106 128L106 156", "M74 126L72 172"], 0.9, [0, 0.5, 1])}
        </g>
      </g> };
    case "getup": // debout-couché : allongé, il se relève au signal et court poser le pied sur le ballon
      return { dur: 5, side: <g>
        <g><animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.33;0.34;1" dur="5s" repeatCount="indefinite" /><circle cx="52" cy="164" r="11" fill={SKIN} />{L("M64 166L140 166", 14, SHIRT)}{L("M140 166L186 166")}</g>
        <g opacity="0"><animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.33;0.34;0.92;1" dur="5s" repeatCount="indefinite" /><animateTransform attributeName="transform" type="translate" values="0 0;0 0;150 0;150 0" keyTimes="0;0.34;0.8;1" dur="5s" repeatCount="indefinite" />
          <circle cx="70" cy="62" r="13" fill={SKIN} />{L("M70 76v50", 16, SHIRT)}{L("M70 86L56 108M70 86L86 104", 7, SHIRT)}
          {A(["M66 126L58 172", "M66 126L84 172", "M66 126L58 172"], 0.5, [0, 0.5, 1])}{A(["M74 126L84 172", "M74 126L58 172", "M74 126L84 172"], 0.5, [0, 0.5, 1])}
        </g>
        <g transform="translate(256 165)">{BALL}</g>
        <g fill="#ffc640"><circle cx="160" cy="36" r="14"><animate attributeName="fill" values="#e8eeeb;#e8eeeb;#ffc640;#ffc640;#e8eeeb" keyTimes="0;0.3;0.32;0.5;1" dur="5s" repeatCount="indefinite" /></circle></g>
        <text x="160" y="41" textAnchor="middle" fontSize="12" fontWeight="800" fill="#10231b">GO</text>
      </g> };
    case "visualize": // le film dans ma tête : yeux fermés, il se voit réussir son geste
      return { dur: 4, side: <g>
        <circle cx="96" cy="64" r="13" fill={SKIN} /><path d="M89 62h6M99 62h6" stroke="#10231b" strokeWidth="2" strokeLinecap="round" />{L("M96 78v48", 16, SHIRT)}{L("M96 88L78 112M96 88L114 112", 7, SHIRT)}{L("M92 126L90 172M100 126L104 172")}
        <circle cx="122" cy="54" r="4" fill="#fff" fillOpacity=".8" /><circle cx="134" cy="42" r="6" fill="#fff" fillOpacity=".8" />
        <ellipse cx="226" cy="64" rx="80" ry="46" fill="#fff" fillOpacity=".92" />
        <g fill="none" stroke="#10231b" strokeWidth="3"><rect x="252" y="46" width="30" height="36" rx="2" /></g>
        <g><circle r="6" fill="#fff" stroke="#10231b" strokeWidth="1.5"><animateMotion dur="4s" repeatCount="indefinite" path="M186,82 C210,40 250,40 266,62" keyTimes="0;1" /></circle></g>
        <text x="236" y="102" fontSize="22" fontWeight="800" fill="#1ca463">✓<animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.6;0.7;0.95;1" dur="4s" repeatCount="indefinite" /></text>
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
    <figure className="overflow-hidden rounded-2xl" style={{ background: "#0d6941" }}>
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
          <span className="shrink-0 opacity-90">{s.side ? (s.view ?? "Vue de côté") : <><b className="text-sun-300">E</b> enfant{s.parent ? <> · <b className="text-sky-100">P</b> parent</> : null}</>}</span>
        </figcaption>
      )}
    </figure>
  );
}
