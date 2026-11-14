// Génère des vidéos verticales (1080 × 1920, MP4) à partir des fiches d'exercices, sans rien filmer.
// Usage : node scripts/videos.mjs slalom-des-plots le-bowling     (ou --all, ou --count 10)
import { build } from "esbuild";
import { execFileSync, execSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const { chromium } = createRequire(import.meta.url)("playwright");
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = `${root}/videos`, out = `${dir}/out`, FPS = 30;
mkdirSync(out, { recursive: true });

// 1. Page autonome : moteur d'animation de l'application + polices embarquées (aucun accès réseau).
const r = await build({ entryPoints: [`${dir}/video.tsx`], bundle: true, minify: true, write: false, format: "iife", jsx: "automatic", alias: { "@": `${root}/src` }, define: { "process.env.NEXT_PUBLIC_APP_NAME": '"Petit Pont"', "process.env.NODE_ENV": '"production"' } });
const font = (pkg, file, family, weight) => `@font-face{font-family:${family};font-weight:${weight};src:url(data:font/woff2;base64,${readFileSync(`${root}/node_modules/@fontsource/${pkg}/files/${file}`).toString("base64")}) format("woff2")}`;
writeFileSync(`${dir}/in.css`, "@tailwind utilities;");
const tw = execSync(`npx tailwindcss -c ${dir}/tailwind.config.cjs -i ${dir}/in.css --minify`, { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString();
const html = `<!doctype html><meta charset="utf-8"><style>${[["nunito", "nunito-latin-400-normal.woff2", "Nunito", 400], ["nunito", "nunito-latin-700-normal.woff2", "Nunito", 700], ["nunito", "nunito-latin-800-normal.woff2", "Nunito", 800], ["outfit", "outfit-latin-700-normal.woff2", "Outfit", 700], ["outfit", "outfit-latin-800-normal.woff2", "Outfit", 800]].map((a) => font(...a)).join("")}
html,body{margin:0;background:#0b442e}*{box-sizing:border-box}svg{display:block}figure{margin:0}.pitch button{display:none}${tw}</style><div id="root"></div><script>${r.outputFiles[0].text.replace(/<\/script/g, "<\\/script")}</script>`;
writeFileSync(`${dir}/page.html`, html);

// 2. Liste des exercices demandés.
const all = JSON.parse(execSync(`npx tsx -e 'import("./src/content/library.ts").then(m=>console.log(JSON.stringify(m.BASES.map(b=>({slug:b.slug,name:b.name,category:b.category,age:b.age,objective:b.objective})))))'`, { cwd: root }).toString());
const args = process.argv.slice(2);
const count = args.includes("--count") ? Number(args[args.indexOf("--count") + 1]) : null;
const list = args.includes("--all") ? all : count ? all.slice(0, count) : all.filter((b) => args.includes(b.slug));
if (!list.length) { console.error("Aucun exercice. Exemple : node scripts/videos.mjs slalom-des-plots"); process.exit(1); }

// 3. Tournage image par image, puis encodage.
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })).newPage();
for (const b of list) {
  const frames = `${dir}/frames-${b.slug}`; rmSync(frames, { recursive: true, force: true }); mkdirSync(frames);
  await page.goto(`file://${dir}/page.html#${b.slug}`); await page.reload(); await page.waitForFunction(() => window.__ready === true);
  const dur = await page.evaluate(() => window.__dur), n = Math.round(dur * FPS);
  for (let i = 0; i < n; i++) { await page.evaluate((t) => window.__seek(t), i / FPS); await page.screenshot({ path: `${frames}/${String(i).padStart(4, "0")}.jpg`, type: "jpeg", quality: 92 }); }
  execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", String(FPS), "-i", `${frames}/%04d.jpg`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", `${out}/${b.slug}.mp4`]);
  rmSync(frames, { recursive: true, force: true });
  // Légende prête à coller avec la vidéo.
  writeFileSync(`${out}/${b.slug}.txt`, `${b.name} — ${b.objective}\nPour les ${b.age[0]}-${b.age[1]} ans, à faire à la maison avec un parent. La séance complète est gratuite dans l'application Petit Pont.\n\n#football #foot #entrainementfoot #footenfant #parents #exercicefoot #petitpont\n`);
  console.log(`✔ ${b.slug}.mp4 (${dur.toFixed(1)} s)`);
}
await browser.close();
