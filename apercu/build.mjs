// Construit la page autonome de l'aperçu : node apercu/build.mjs → apercu/petit-pont-apercu.html
import { build } from "esbuild";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const r = await build({ entryPoints: [`${here}/demo.tsx`], bundle: true, minify: true, write: false, format: "iife", target: "es2019", jsx: "transform",
  alias: { "react-dom/client": `${here}/react-dom-shim.js`, react: `${here}/react-shim.js`, "@": `${here}/../src` }, define: { "process.env.NEXT_PUBLIC_APP_NAME": '"Petit Pont"', "process.env.NODE_ENV": '"production"' } });
const js = r.outputFiles[0].text.replace(/<\/script/g, "<\\/script");
writeFileSync(`${here}/in.css`, readFileSync(`${here}/../src/app/globals.css`, "utf8").replace("@tailwind base;", ""));
const css = execSync(`npx tailwindcss -c ${here}/tailwind.config.cjs -i ${here}/in.css --minify`, { cwd: `${here}/..`, stdio: ["ignore", "pipe", "ignore"] }).toString();
const html = `<title>Petit Pont</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Outfit:wght@700;800&display=swap">
<style>
/* Mise en page : une colonne de la largeur d'un téléphone, navigation fixe en bas, comme dans l'application.
   Aperçu fidèle à l'application, qui n'a qu'un thème clair : les couleurs sont donc fixées explicitement. */
:root { --bg: #f5f8f6; --fg: #10231b; --accent: #0f844f; --sun: #ffc640; --font-sans: "Nunito", system-ui, sans-serif; --font-display: "Outfit", "Nunito", system-ui, sans-serif; color-scheme: light; }
html, body { height: 100%; }
body { background: var(--bg); color: var(--fg); font-family: var(--font-sans); font-size: 16px; line-height: 1.5; }
body::before { content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 25; background: var(--bg); }
*, ::before, ::after { box-sizing: border-box; border: 0 solid #e8eeeb; }
h1, h2, p, ul, ol, figure { margin: 0; } ul, ol { padding: 0; list-style: none; } ul.list-disc { list-style: disc; }
button { font: inherit; color: inherit; background: none; padding: 0; cursor: pointer; text-align: inherit; } input, select { font: inherit; color: inherit; }
button:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid #78d9a4; outline-offset: 2px; }
svg { display: block; }
.gut { padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
.scroller { display: flex; gap: .5rem; overflow-x: auto; padding-bottom: .25rem; }
${css}
</style>
<div id="root"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script>${js}</script>
`;
writeFileSync(`${here}/petit-pont-apercu.html`, html);
console.log("page", (html.length / 1024).toFixed(0), "Ko");
