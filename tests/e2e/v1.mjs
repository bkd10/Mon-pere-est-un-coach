// Vérifie la configuration de lancement (interrupteurs désactivés) sur un serveur démarré SANS FEATURE_*.
// Usage : BASE_URL=http://localhost:3101 node tests/e2e/v1.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const BASE = process.env.BASE_URL || "http://localhost:3101";
const stamp = Date.now().toString(36); let fail = 0;
const ok = (n, c, d = "") => { if (!c) fail++; console.log(`${c ? "✔" : "✖"} ${n}${d ? " — " + d : ""}`); };
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const has = async (re) => { try { await p.waitForFunction((s) => new RegExp(s, "i").test(document.body.innerText), re.source, { timeout: 10000 }); return true; } catch { return false; } };
await p.goto(BASE); let t = await p.locator("body").innerText();
ok("accueil : offre unique et carte cadeau", /4,99/.test(t) && /Carte cadeau/.test(t) && !/Premium|Essentiel/.test(t));
await p.goto(`${BASE}/inscription`); await p.fill("#firstName", "V1"); await p.fill("#email", `v1-${stamp}@test.local`); await p.fill("#password", "motdepasse-test-4"); await p.check('input[name="cgu"]'); await p.check('input[name="consent"]'); await p.getByRole("button", { name: "Créer mon compte" }).click(); await p.waitForURL("**/app/onboarding");
ok("profil : aucun champ santé", (await p.locator('input[name="health"]').count()) === 0);
const d = new Date(); d.setFullYear(d.getFullYear() - 8);
await p.fill("#nickname", "Test"); await p.fill("#birthMonth", d.toISOString().slice(0, 7)); await p.getByRole("button", { name: "Créer son programme" }).click(); ok("programme créé", await has(/programme de Test est prêt/));
ok("pas de bouton coach", (await p.locator('a[href="/app/coach"]').count()) === 0);
await p.goto(`${BASE}/app/coach`); await p.waitForTimeout(500); ok("page coach fermée", !p.url().includes("/coach"));
ok("API coach fermée", (await p.request.post(`${BASE}/api/coach`, { data: { message: "test" } })).status() === 404);
await p.goto(`${BASE}/app/progression/carnet`); await p.waitForTimeout(500); ok("carnet de santé fermé", !p.url().includes("/carnet"));
await p.goto(`${BASE}/app/entrainements`); await p.locator('a[href^="/app/seance/"]').first().click(); await p.waitForURL("**/app/seance/*"); const u = p.url();
await p.goto(`${u}/retour`); t = await p.locator("body").innerText(); ok("questionnaire : ni fatigue ni douleur enregistrées, rappel de sécurité présent", !/Comment était-il physiquement/.test(t) && (await p.locator('input[name="pain"]').count()) === 0);
await p.getByRole("button", { name: "Valider et adapter la suite" }).click(); ok("séance validée sans données de santé", await has(/Bravo à vous deux/));
await p.goto(`${BASE}/confidentialite`); t = await p.locator("body").innerText(); ok("confidentialité : ni Anthropic ni données de santé annoncées", !/Anthropic/.test(t) && !/Données de forme et de santé :/.test(t));
await p.goto(`${BASE}/app/parametres`); await p.locator("summary", { hasText: "Supprimer mon compte" }).click(); await p.fill('form:has(button:has-text("Supprimer définitivement")) input[name="password"]', "motdepasse-test-4"); p.once("dialog", (x) => x.accept()); await p.getByRole("button", { name: "Supprimer définitivement" }).click(); await p.waitForURL("**supprime=1");
await b.close(); console.log(fail ? `${fail} échec(s)` : "configuration v1 : tout est conforme"); process.exit(fail ? 1 : 0);
