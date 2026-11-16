// Test de bout en bout (Playwright) : parcours complet d'une famille + administration + contrôles d'accès.
// Usage : BASE_URL=http://localhost:3100 node tests/e2e/parcours.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright"); // Playwright installé globalement ou en devDependency
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const SHOTS = process.env.SHOTS_DIR || "docs/captures";
mkdirSync(SHOTS, { recursive: true });
const stamp = Date.now().toString(36);
const email = `parent-${stamp}@test.local`, email2 = `autre-${stamp}@test.local`;
const results = [];
const ok = (name, cond, detail = "") => { results.push({ name, pass: !!cond, detail }); console.log(`${cond ? "✔" : "✖"} ${name}${detail ? " — " + detail : ""}`); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "fr-FR" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("response", (r) => { if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`); });
const shot = async (n) => { await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(150); await page.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: false }); };
// Les actions serveur naviguent côté client : on attend le contenu, pas seulement l'URL.
const has = async (re, target = page, timeout = 10000) => { try { await target.waitForFunction((src) => new RegExp(src, "i").test(document.body.innerText), re.source, { timeout }); return true; } catch { return false; } };
const text = () => page.locator("body").innerText();
const submit = (label) => page.getByRole("button", { name: label }).first().click();

try {
  // 1. Accueil public et inscription
  await page.goto(BASE); ok("page d'accueil publique", (await text()).includes("Pas besoin d'être entraîneur")); await shot("01-accueil-public");
  await page.goto(`${BASE}/app`); ok("espace parent protégé (redirection vers connexion)", page.url().includes("/connexion"));
  await page.goto(`${BASE}/inscription`);
  await page.fill("#firstName", "Camille"); await page.fill("#email", email); await page.fill("#password", "motdepasse-test-1");
  await submit("Créer mon compte"); await page.waitForTimeout(400);
  ok("consentement parental obligatoire", page.url().includes("/inscription"));
  ok("inscription : e-mails de conseils non cochés par défaut", !(await page.isChecked('input[name="marketing"]')));
  await page.check('input[name="cgu"]'); await page.check('input[name="consent"]'); await submit("Créer mon compte"); await page.waitForURL("**/app/onboarding");
  ok("inscription → profil enfant", true);

  // 2. Profil enfant (9 ans, club mercredi + vendredi, match samedi)
  const birth = new Date(); birth.setFullYear(birth.getFullYear() - 9); birth.setMonth(birth.getMonth() - 2);
  await page.fill("#nickname", "Lucas"); await page.fill("#birthMonth", birth.toISOString().slice(0, 7));
  ok("minimisation : seuls le mois et l'année de naissance sont demandés", (await page.getAttribute("#birthMonth", "type")) === "month" && !(await page.locator("#experience").count()));
  for (const d of ["3", "5"]) await page.locator(`input[name="clubDays"][value="${d}"] + span`).click();
  await page.selectOption("#matchDay", "6");
  await page.locator('input[name="goals"][value="technique"] + span').click();
  await page.locator('input[name="minutesAvailable"][value="20"] + span').click();
  await page.locator('input[name="homeSessionsPerWeek"][value="3"] + span').click();
  ok("santé : consentement facultatif, non coché par défaut", !(await page.isChecked('input[name="health"]')));
  await page.check('input[name="health"]'); await submit("Créer son programme"); await page.waitForTimeout(500);
  ok("santé : avant 15 ans, l'accord de l'enfant est exigé", await has(/votre enfant a été informé et est d'accord/));
  await page.fill("#nickname", "Lucas"); await page.fill("#birthMonth", birth.toISOString().slice(0, 7));
  for (const d of ["3", "5"]) await page.locator(`input[name="clubDays"][value="${d}"] + span`).click();
  await page.selectOption("#matchDay", "6"); await page.locator('input[name="goals"][value="technique"] + span').click();
  await page.locator('input[name="minutesAvailable"][value="20"] + span').click(); await page.locator('input[name="homeSessionsPerWeek"][value="3"] + span').click();
  await page.check('input[name="health"]'); await page.check('input[name="healthChild"]');
  await shot("02-profil-enfant");
  await submit("Créer son programme"); await page.waitForURL("**/app?bienvenue=1");
  let t = await text();
  await has(/programme de Lucas est prêt/); t = await text();
  ok("tableau de bord personnalisé", t.includes("Camille") && t.includes("Lucas") && t.includes("Défi du jour"));
  ok("une séance est planifiée", /Séance du jour|Prochaine séance/.test(t)); await shot("03-tableau-de-bord");

  // 3. Calendrier : pas de séance un jour de club / match / lendemain ; charge plafonnée
  await page.goto(`${BASE}/app/calendrier`); t = await text();
  ok("calendrier : plafond de charge expliqué", /semaine est déjà bien remplie/.test(t), "3 demandées, 2 clubs + 1 match"); await shot("04-calendrier");
  const planned = await page.evaluate(() => [...document.querySelectorAll('a[title="Séance prévue"]')].length);
  ok("séances planifiées dans le mois (≤ 2 sur 7 jours)", planned >= 1 && planned <= 2, `${planned}`);

  // 4. Séance guidée
  await page.goto(`${BASE}/app/entrainements`);
  await page.locator('a[href^="/app/seance/"]').first().click(); await page.waitForURL("**/app/seance/*");
  const sessionUrl = page.url(); t = await text();
  ok("fiche séance : objectif, déroulé, consignes, explication", t.includes("Objectif") && t.includes("Déroulé") && t.includes("Pourquoi cette séance") && t.includes("Vos consignes de parent")); await shot("05-seance");
  await submit("Commencer la séance"); let steps = 0, sawExercise = false, sawRest = false;
  for (let i = 0; i < 20; i++) {
    const body = await text();
    if (body.includes("Comment faire") && !sawExercise) { sawExercise = true; ok("étape exercice : schéma animé + étapes + variante", (await page.locator("figure svg animateMotion, figure svg animate, figure svg animateTransform").count()) > 0 && /Variante/.test(body)); await shot("06-lecteur-exercice"); }
    if (body.includes("Temps de repos conseillé")) sawRest = true;
    if (await page.getByRole("link", { name: /Terminer/ }).count()) break;
    await page.getByRole("button", { name: /Étape suivante|Passer la pause/ }).click(); steps++;
  }
  ok("lecteur pas à pas avec temps de repos", steps >= 4 && sawExercise, `${steps} écrans, pause vue : ${sawRest}`);
  await page.getByRole("link", { name: /Terminer/ }).click(); await page.waitForURL("**/retour");

  // 5. Questionnaire : très fatigué + douleur au genou → adaptation expliquée
  await page.locator('input[name="energy"][value="1"] + span').click();
  await page.locator("summary").first().click();
  await page.check('input[name="pain"]'); await page.selectOption('select[name="painArea"]', "genou");
  await page.check('input[name="wantedMore"]'); await shot("07-questionnaire");
  await submit("Valider et adapter la suite"); await page.waitForURL("**/bilan"); await has(/Bravo à vous deux/); t = await text();
  ok("bilan de séance : badge « Premier entraînement »", t.includes("Premier entraînement"));
  ok("douleur : avis médical conseillé, exercices suspendus", /avis d'un médecin/.test(t) && /douleur a été signalée/i.test(t));
  ok("« il voulait continuer » n'allonge pas la séance", /gardons la même durée/.test(t)); await shot("08-adaptation");
  await page.goto(`${BASE}/app`); t = await text(); ok("accueil : état de récupération affiché", t.includes("Douleur signalée"));

  // 6. Défi du jour, exercices, fiche
  if (await page.getByRole("button", { name: "C'est fait !" }).count()) { await submit("C'est fait !"); await page.waitForURL("**defi=1"); ok("défi du jour validé", await has(/Fait aujourd'hui/)); }
  await page.goto(`${BASE}/app/exercices`); t = await text(); ok("bibliothèque filtrée sur l'âge de l'enfant", /adaptés à Lucas \(9 ans\)/.test(t)); await shot("09-bibliotheque");
  await page.goto(`${BASE}/app/exercices?age=tous`); const all = await page.locator('a[href^="/app/exercices/"]').count(); ok("bibliothèque complète", all >= 120 && /1\s?2\d\d fiches/.test(await text()), `${all} exercices de base affichés`);
  await page.goto(`${BASE}/app/exercices/slalom-des-plots`); t = await text();
  ok("fiche exercice complète", ["Objectif pédagogique", "Étape par étape", "Erreurs fréquentes", "Variantes", "Critère de réussite", "Consignes de sécurité", "Récupération", "Pourquoi cet exercice est utile", "Matériel", "Répétitions"].every((x) => t.toLowerCase().includes(x.toLowerCase()))); await page.getByRole("button", { name: /Lire la démonstration/ }).click(); await page.waitForTimeout(4200);
  ok("vidéo de démonstration dans la fiche : lecture et consignes qui défilent", await has(/Étape 1/) && (await page.getByRole("button", { name: /Pause/ }).count()) === 1);
  await page.getByRole("button", { name: /Pause/ }).click(); await shot("10-fiche-exercice");
  await page.goto(`${BASE}/app/videos`); ok("page des vidéos : une vidéo par exercice", (await page.getByRole("button", { name: /Lire la démonstration/ }).count()) >= 10); await shot("10b-videos");

  // 7. Progression, évaluation, carnet chiffré
  await page.goto(`${BASE}/app/progression?m=jongles`);
  await page.fill('input[name="value"]', "4"); await submit("Ajouter"); await has(/Mesure enregistrée/); await has(/1 mesure/);
  await page.fill('input[name="value"]', "7"); await submit("Ajouter");
  ok("carnet de progression : courbe et tendance", await has(/En progrès depuis 4/)); await shot("11-progression");
  await page.goto(`${BASE}/app/progression/evaluations`); await page.locator('form:has(input[value="eval-passes"]) input[name="value"]').fill("7"); await page.locator('form:has(input[value="eval-passes"]) button').click(); 
  ok("mini-évaluation : 3 étoiles quand l'objectif d'âge est atteint", await has(/Objectif atteint, bravo/));
  await page.goto(`${BASE}/app/progression/carnet`); await page.fill("#heightCm", "134"); await page.fill("#sleepH", "9.5"); await submit("Enregistrer"); ok("carnet de développement enregistré (graphique affiché)", await has(/Entrée enregistrée/) && await has(/134 cm/));

  // 8. Calendrier : ajout d'un match, déplacement vers un jour interdit
  await page.goto(`${BASE}/app/calendrier`);
  const nextSat = new Date(); nextSat.setDate(nextSat.getDate() + ((6 - nextSat.getDay() + 7) % 7 || 7));
  const moveForm = page.locator('form:has(input[name="sessionId"])').first();
  if (await moveForm.count()) { await moveForm.locator('input[type="date"]').fill(nextSat.toISOString().slice(0, 10)); await moveForm.getByRole("button").click(); ok("déplacement un jour de match : refusé, replacé et expliqué", await has(/jour du match\. La séance a été placée/)); await shot("12-deplacement"); } else ok("déplacement de séance (aucune séance à venir à déplacer)", true, "ignoré");

  // 9. Coach (mode fiches sans clé API), guides, budget
  await page.goto(`${BASE}/app/coach`); await page.getByRole("button", { name: /jongles/ }).click(); await page.waitForFunction(() => document.body.innerText.includes("rebond"), null, { timeout: 30000 });
  t = await text(); ok("coach : réponse avec exercices de la bibliothèque et limites rappelées", /voir la fiche/.test(t) && /ne remplace/.test(t)); await shot("13-coach");
  await page.goto(`${BASE}/app/guide`); ok("académie des parents", (await page.locator('a[href^="/app/guide/"]').count()) >= 20);
  await page.goto(`${BASE}/app/guide/gerer-une-defaite`); await submit("J'ai lu cette fiche"); ok("guide lu et suivi", await has(/1 fiche lue/));
  await page.goto(`${BASE}/app/guide/budget`); await page.fill("#licence", "180"); await page.fill("#coaching", "600"); await page.fill("#stages", "450"); await submit("Calculer ma synthèse");
  ok("calculateur de budget : synthèse et pistes d'économie", await has(/1.230\s€/) && await has(/Plus de la moitié du budget \(85 %\)/)); await shot("14-budget");

  // 10. Album : photo privée
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
  await page.goto(`${BASE}/app/enfant/album`); await page.fill("#title", "Premier petit pont"); await page.setInputFiles("#file", { name: "souvenir.png", mimeType: "image/png", buffer: png }); await submit("Ajouter à l'album"); await has(/Souvenir ajouté/);
  const mediaSrc = await page.locator('img[src^="/api/media/"]').first().getAttribute("src"); ok("souvenir avec photo ajouté", !!mediaSrc);
  await page.goto(`${BASE}/app/enfant`); t = await text(); ok("profil joueur, repères d'âge, badges, passeport", t.includes("8-9 ans") && t.includes("À éviter ou à adapter") && t.includes("Passeport football")); await shot("15-enfant");

  // 11. Bilan mensuel factuel
  await page.goto(`${BASE}/app/bilans`); await submit("Bilan du mois");
  ok("bilan mensuel : faits mesurés uniquement", await has(/a réalisé 1 séance/) && await has(/jongles enchaînés \(de 4 à 7/) && await has(/douleur a été signalée/) && await has(/Rédigé automatiquement à partir des seules données/)); await shot("16-bilan");

  // 11b. Boutique : intérêt enregistré
  await page.goto(`${BASE}/app/boutique`); ok("boutique : kit recommandé selon l'âge", (await text()).includes("Recommandé pour Lucas") && (await text()).includes("Kit Complet"));
  await page.getByRole("button", { name: "Me prévenir de sa sortie" }).first().click(); ok("boutique : demande d'information enregistrée", await has(/Vous serez prévenu/)); await shot("16b-boutique");

  // 12. Modes, paramètres, abonnement (démonstration)
  await page.goto(`${BASE}/app/parametres`); await page.check('input[name="sansMateriel"]'); await submit("Appliquer et recalculer le programme"); ok("mode sans matériel appliqué", await has(/Modifications enregistrées/));
  await page.goto(`${BASE}/app/abonnement`); t = await text(); ok("abonnement : essai gratuit, offre unique, mode démonstration signalé", t.includes("Essai gratuit") && /4,99\s€/.test(t) && t.includes("Annuel") && t.includes("Mode démonstration") && ["Découverte", "Famille"].every((x) => t.includes(x)) && !t.includes("Premium") && !t.includes("Essentiel")); await shot("17-abonnement");
  ok("abonnement : mensuel présélectionné, aucun badge de popularité", !t.includes("Le plus choisi") && t.includes("TTC par mois"));
  await page.locator('a[href*="tier=FAMILLE"]').click(); await page.waitForURL("**/confirmer**"); t = await text();
  ok("récapitulatif avant paiement : prix TTC, renouvellement, rétractation, bouton d'obligation de paiement", /4,99\s€ TTC par mois/.test(t) && /renouvelé automatiquement/.test(t) && /14 jours/.test(t) && /Commander avec obligation de paiement/.test(t)); await shot("17b-recapitulatif");
  await submit("Commander avec obligation de paiement"); await page.waitForTimeout(500); ok("commande bloquée sans les deux cases", page.url().includes("/confirmer") && (await page.locator("input[name=cgv]:invalid").count()) === 1);
  await page.check('input[name="cgv"]'); await page.check('input[name="immediate"]'); await submit("Commander avec obligation de paiement");
  ok("souscription Famille + facture", await has(/Votre offre actuelle/) && await has(/F\d{4}-\d{6}/));
  await page.getByRole("link", { name: "Facture" }).first().click(); ok("facture avec mentions du vendeur et TVA", await has(/Vendeur/) && await has(/TVA/)); await page.goBack();
  page.once("dialog", (d) => d.accept()); await submit("Exercer mon droit de rétractation");
  ok("rétractation : arrêt immédiat et remboursement au prorata", await has(/Rétractation enregistrée/) && await has(/remboursé/));
  await page.locator('a[href*="tier=FAMILLE"]').click(); await page.waitForURL("**/confirmer**"); await page.check('input[name="cgv"]'); await page.check('input[name="immediate"]'); await submit("Commander avec obligation de paiement"); await has(/Votre offre actuelle/);
  page.once("dialog", (d) => d.accept()); await submit("Résilier mon abonnement"); ok("résiliation avec accès conservé jusqu'à l'échéance", await has(/Résilié — accès jusqu'au/));
  await page.goto(`${BASE}/app/notifications`); ok("confirmation de résiliation avec date d'effet", await has(/Confirmation de résiliation/) && await has(/accès jusqu'au/));

  // 13. Export RGPD
  const exp = await page.request.get(`${BASE}/api/export`); const data = await exp.json();
  ok("export des données", exp.ok() && data.children?.[0]?.nickname === "Lucas" && !("passwordHash" in data) && data.children[0].devEntries[0].heightCm === 134);

  // 14. Cloisonnement : un autre parent ne voit ni la séance ni la photo
  const ctx2 = await browser.newContext(); const p2 = await ctx2.newPage();
  await p2.goto(`${BASE}/inscription`); await p2.fill("#firstName", "Autre"); await p2.fill("#email", email2); await p2.fill("#password", "motdepasse-test-2"); await p2.check('input[name="cgu"]'); await p2.check('input[name="consent"]'); await p2.getByRole("button", { name: "Créer mon compte" }).click(); await p2.waitForURL("**/app/onboarding");
  const r1 = await p2.request.get(sessionUrl); const r2 = await p2.request.get(`${BASE}${mediaSrc}`); const r3 = await p2.request.get(`${BASE}/admin`);
  ok("séance d'une autre famille inaccessible", r1.status() === 404, String(r1.status()));
  ok("photo d'une autre famille inaccessible", r2.status() === 404, String(r2.status()));
  ok("administration interdite aux parents", !r3.url().includes("/admin"), r3.url());
  const anon = await (await browser.newContext()).request.get(`${BASE}${mediaSrc}`); ok("photo inaccessible sans connexion", anon.status() === 401);
  await ctx2.close();

  // 15. Administration
  const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const a = await ctx3.newPage();
  await a.goto(`${BASE}/connexion`); await a.fill("#email", process.env.ADMIN_EMAIL || "admin@petitpont.local"); await a.fill("#password", "mauvais"); await a.getByRole("button", { name: "Se connecter" }).click(); await a.waitForURL("**e=**"); ok("mauvais mot de passe refusé", true);
  await a.fill("#email", process.env.ADMIN_EMAIL || "admin@petitpont.local"); await a.fill("#password", process.env.ADMIN_PASSWORD || "ChangeMoi!2026"); await a.getByRole("button", { name: "Se connecter" }).click(); await a.waitForURL("**/admin");
  ok("tableau de bord administrateur", await has(/Revenu mensuel récurrent/, a)); await a.screenshot({ path: `${SHOTS}/18-admin.png` });
  for (const [path, needle] of [["/admin/utilisateurs", email], ["/admin/exercices", "Le slalom des plots"], ["/admin/guides", "Gérer une défaite"], ["/admin/regles", "Douleur signalée"], ["/admin/offres", "Offres et tarifs"], ["/admin/moderation", "Modération"], ["/admin/notifications", "Envoyer"]]) { await a.goto(BASE + path); ok(`admin ${path}`, (await a.locator("body").innerText()).includes(needle)); }
  await a.goto(`${BASE}/admin/exercices/nouveau`); await a.fill("#name", `Exercice test ${stamp}`); await a.fill("#objective", "Objectif de test"); await a.fill("#steps", "Étape une\nÉtape deux\nÉtape trois"); await a.getByRole("button", { name: "Enregistrer" }).click(); await a.waitForURL("**/admin/exercices?ok=1");
  ok("création d'un exercice (non publié par défaut)", (await a.locator("body").innerText()).includes(`Exercice test ${stamp}`));
  await a.getByRole("row", { name: new RegExp(`Exercice test ${stamp}`) }).getByRole("link", { name: "Modifier" }).click(); await a.waitForURL("**/admin/exercices/*"); a.once("dialog", (d) => d.accept()); await a.getByRole("button", { name: "Supprimer l'exercice" }).click(); await a.waitForURL("**/admin/exercices?ok=1"); ok("suppression d'un exercice", !(await a.locator("body").innerText()).includes(`Exercice test ${stamp}`));
  await a.goto(`${BASE}/admin/regles`); await a.screenshot({ path: `${SHOTS}/19-admin-regles.png` });
  await ctx3.close();

  // 15b. Accessibilité des écrans de l'espace parent (axe-core, WCAG A/AA)
  {
    const axeSrc = (await import("node:fs")).readFileSync(new URL("../../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
    const issues = [];
    for (const path of ["/app", "/app/videos", "/app/entrainements", "/app/exercices", "/app/exercices/slalom-des-plots", "/app/progression", "/app/calendrier", "/app/enfant", "/app/guide", "/app/boutique", "/app/abonnement", "/app/parametres", "/app/coach", "/app/bilans"]) {
      await page.goto(BASE + path); await page.addScriptTag({ content: axeSrc });
      const res = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((v) => `${v.id}(${v.nodes.length}) ${v.nodes[0]?.target}`));
      issues.push(...res.map((x) => `${path} ${x}`));
    }
    ok("accessibilité WCAG A/AA (axe-core) sur l'espace parent", issues.length === 0, issues.slice(0, 8).join(" | "));
  }

  // 16. Suppression du compte (droit à l'effacement)
  await page.goto(`${BASE}/app/parametres`); await page.locator("summary", { hasText: "Supprimer mon compte" }).click(); await page.fill('form:has(button:has-text("Supprimer définitivement")) input[name="password"]', "motdepasse-test-1"); page.once("dialog", (d) => d.accept()); await submit("Supprimer définitivement"); await page.waitForURL("**supprime=1");
  await page.goto(`${BASE}/connexion`); await page.fill("#email", email); await page.fill("#password", "motdepasse-test-1"); await submit("Se connecter"); await page.waitForURL("**e=**"); ok("compte supprimé : connexion impossible", true);
  const gone = await (await browser.newContext()).request.get(`${BASE}${mediaSrc}`); ok("fichiers supprimés avec le compte", gone.status() !== 200);
} catch (e) {
  ok("exécution du parcours", false, String(e).slice(0, 400)); await shot("zz-erreur").catch(() => {});
}
// 16b. Carte cadeau, mot de passe oublié, guides publics.
{
  const c5 = await browser.newContext({ viewport: { width: 390, height: 844 } }); const g = await c5.newPage();
  await g.goto(`${BASE}/guides`); ok("guides publics (référencement)", (await g.locator('a[href^="/guides/"]').count()) >= 5);
  await g.locator('a[href^="/guides/"]').first().click(); ok("guide public lisible sans compte", await has(/À appliquer dès maintenant/, g));
  const sm = await g.request.get(`${BASE}/sitemap.xml`); ok("plan du site", sm.ok() && (await sm.text()).includes("/guides/"));
  await g.goto(`${BASE}/mot-de-passe-oublie`); await g.fill("#email", "personne@test.local"); await g.getByRole("button", { name: "Recevoir le lien" }).click(); ok("mot de passe oublié : même réponse que le compte existe ou non", await has(/Si un compte existe/, g));
  await g.goto(`${BASE}/reinitialiser?t=faux`); await g.fill("#password", "nouveau-mot-de-passe"); await g.getByRole("button", { name: "Enregistrer" }).click(); ok("réinitialisation : jeton invalide refusé", await has(/n'est plus valable/, g));
  await g.goto(`${BASE}/cadeau`); await g.fill("#email", `cadeau-${stamp}@test.local`); await g.check('input[name="cgv"]'); await g.getByRole("button", { name: /Commander avec obligation de paiement/ }).click();
  ok("carte cadeau : achat et code délivré", await has(/DUO-[0-9A-F]{5}-[0-9A-F]{5}/, g)); await g.screenshot({ path: `${SHOTS}/21-cadeau.png` });
  const code = (await g.locator("body").innerText()).match(/DUO-[0-9A-F]{5}-[0-9A-F]{5}/)?.[0];
  await g.goto(`${BASE}/inscription`); await g.fill("#firstName", "Cadeau"); await g.fill("#email", `cadeau-${stamp}@test.local`); await g.fill("#password", "motdepasse-test-3"); await g.check('input[name="cgu"]'); await g.check('input[name="consent"]'); await g.getByRole("button", { name: "Créer mon compte" }).click(); await g.waitForURL("**/app/onboarding");
  await g.goto(`${BASE}/app/abonnement`); await g.fill('input[name="code"]', code ?? ""); await g.getByRole("button", { name: "Activer" }).click();
  ok("carte cadeau : code activé, 12 mois sans renouvellement", await has(/Code cadeau activé/, g) && await has(/Résilié — accès jusqu'au/, g));
  await g.fill('input[name="code"]', code ?? ""); await g.getByRole("button", { name: "Activer" }).click(); ok("carte cadeau : un code ne sert qu'une fois", await has(/déjà été utilisé/, g));
  await c5.close();
}

// 17. Conformité : pages légales, aucun tiers, accessibilité automatique, clavier.
{
  const ctx4 = await browser.newContext({ viewport: { width: 390, height: 844 } }); const q = await ctx4.newPage();
  const external = new Set(); q.on("request", (r) => { const u = new URL(r.url()); if (!["localhost", "127.0.0.1"].includes(u.hostname) && !u.protocol.startsWith("data")) external.add(u.hostname); });
  for (const [path, needle] of [["/mentions-legales", "Directeur de la publication"], ["/confidentialite", "Vos droits"], ["/cgu", "Droit de rétractation"], ["/remboursements", "Formulaire de rétractation"], ["/cookies", "strictement nécessaires"], ["/accessibilite", "Limites connues"], ["/supprimer-mes-donnees", "Demander la suppression"]]) {
    await q.goto(BASE + path); ok(`page légale ${path}`, (await q.locator("body").innerText()).includes(needle));
  }
  await q.goto(`${BASE}/supprimer-mes-donnees`); await q.fill("#email", email); await q.getByRole("button", { name: "Demander la suppression" }).click(); ok("demande de suppression sans connexion", await has(/Demande enregistrée/, q));
  await q.goto(`${BASE}/desinscription?u=x&t=y`); ok("désinscription : lien falsifié refusé", await has(/Lien invalide/, q));
  await q.goto(BASE); await q.goto(`${BASE}/inscription`); await q.goto(`${BASE}/connexion`);
  ok("aucune requête vers un service tiers (polices, scripts, traceurs)", external.size === 0, [...external].join(", "));
  const cookies = await ctx4.cookies(); ok("aucun cookie déposé avant connexion", cookies.length === 0, cookies.map((c) => c.name).join(","));
  await q.goto(BASE); await q.keyboard.press("Tab"); ok("clavier : lien « Aller au contenu » en premier", (await q.evaluate(() => document.activeElement?.textContent)) === "Aller au contenu");
  const axeSrc = (await import("node:fs")).readFileSync(new URL("../../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
  const login = await ctx4.newPage(); await login.goto(`${BASE}/connexion`); await login.fill("#email", process.env.ADMIN_EMAIL || "admin@petitpont.local"); await login.fill("#password", process.env.ADMIN_PASSWORD || "ChangeMoi!2026"); await login.getByRole("button", { name: "Se connecter" }).click(); await login.waitForURL("**/admin");
  await login.goto(`${BASE}/admin/conformite`); ok("admin : page de conformité des 20 points", (await login.locator("body").innerText()).includes("Conformité avant publication")); await login.screenshot({ path: `${SHOTS}/20-conformite.png`, fullPage: true });
  const pages = ["/", "/inscription", "/connexion", "/cgu", "/confidentialite", "/mentions-legales"];
  const issues = [];
  for (const path of pages) {
    await q.goto(BASE + path); await q.addScriptTag({ content: axeSrc });
    const res = await q.evaluate(async () => (await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((v) => `${v.id}(${v.nodes.length}) ${v.nodes[0]?.target}`));
    issues.push(...res.map((x) => `${path} ${x}`));
  }
  ok("accessibilité WCAG A/AA (axe-core) sur les pages publiques", issues.length === 0, issues.slice(0, 6).join(" | "));
  await ctx4.close();
}
ok("aucune erreur serveur ou JavaScript", errors.length === 0, errors.slice(0, 3).join(" | "));
await browser.close();
const failed = results.filter((r) => !r.pass);
writeFileSync(`${SHOTS}/resultats.json`, JSON.stringify(results, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} vérifications réussies`);
process.exit(failed.length ? 1 : 0);
