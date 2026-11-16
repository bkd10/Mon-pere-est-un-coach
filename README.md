# Premiers Pas Foot — le foot en famille, pas à pas

Application SaaS qui aide les parents (même débutants) à accompagner leur enfant de 4 à 17 ans au football : séances guidées, exercices expliqués, repos respecté, progrès suivis, dépenses maîtrisées.

> **Nom.** « Pour les Nuls » est une marque déposée : le produit porte le nom de travail **Premiers Pas Foot**, modifiable en une ligne (`NEXT_PUBLIC_APP_NAME`). Sa disponibilité reste à vérifier (INPI, nom de domaine).

## Démarrer

```bash
cp .env.example .env        # puis renseigner AUTH_SECRET et DATA_ENCRYPTION_KEY
npm install
npm run setup               # crée les tables et charge exercices, guides, offres, règles
npm run dev                 # http://localhost:3000
```

Prérequis : Node 20+, PostgreSQL 14+. Compte administrateur créé par le seed : `ADMIN_EMAIL` / `ADMIN_PASSWORD` (à changer).

| Variable | Rôle | Sans elle |
|---|---|---|
| `DATABASE_URL` | PostgreSQL | obligatoire |
| `AUTH_SECRET` | signature des sessions (32+ caractères) | obligatoire en production |
| `DATA_ENCRYPTION_KEY` | chiffrement du carnet de développement (32 octets, base64) | obligatoire en production |
| `ANTHROPIC_API_KEY` | coach conversationnel et bilans rédigés par Claude | **mode fiches** : réponses déterministes tirées des fiches et guides |
| `COACH_MODEL`, `COACH_EFFORT` | modèle Claude (défaut `claude-opus-5-5`, effort `low`) | — |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | paiement réel (Checkout, portail, webhooks sur `/api/stripe/webhook`) | **mode démonstration** : abonnement activé sans débit, signalé à l'écran |

## Architecture

- **Next.js 15 (App Router) + TypeScript + Tailwind** : une seule base de code pour le site public, l'espace parent (PWA mobile-first) et le back-office. Actions serveur plutôt qu'une API séparée : moins de code, vérification d'origine intégrée.
- **PostgreSQL + Prisma** : 24 tables (`prisma/schema.prisma`). Relationnel, sauvegardes standard, hébergeable dans l'UE.
- **Authentification maison légère** : bcrypt (coût 12), cookie JWT `httpOnly`, verrouillage après 5 échecs. Peut être remplacée par un service tiers sans toucher au reste (`src/lib/auth.ts`).
- **Moteur de personnalisation** (`src/lib/engine.ts`) : fonctions pures, sans IA générative. Il sélectionne dans la bibliothèque validée, applique 14 règles (7 de sécurité, non désactivables), planifie la semaine et explique chaque décision.
- **Claude** (`src/lib/coach.ts`) : conversation avec le parent et rédaction des bilans, uniquement. Il ne construit pas de séance et ne cite que des exercices de la bibliothèque. Prompt système mis en cache ; bascule automatique en cas de refus du modèle.
- **Médias** : démonstrations = schémas animés SVG générés par l'application (`src/components/ExerciseAnimation.tsx`), aucun enfant réel. Photos et vidéos des familles : stockage privé (`storage/`, à remplacer par un stockage objet en production), diffusion authentifiée, partage soumis à double consentement et modération.

```
src/content/   référentiel : 7 tranches d'âge, 16 catégories, 126 exercices de base et leurs progressions (1 273 fiches), 22 guides, badges, défis
src/lib/       moteur, services, coach IA, facturation, authentification, chiffrement, offres
src/app/app/   espace parent (accueil, séances, exercices, progression, calendrier, guide, coach, abonnement…)
src/app/admin/ back-office (contenus, règles, offres, utilisateurs, modération, statistiques)
tests/         15 tests du moteur + parcours de bout en bout (53 vérifications)
```

## Ce qui fonctionne (par étape du cahier des charges)

1. **Architecture et expérience** : séance lancée en 2 clics depuis l'accueil ; mode « parent débutant » activé par défaut.
2. **Pages** : 44 routes — accueil public, inscription, profil enfant, tableau de bord, séance guidée, questionnaire, bibliothèque, fiches, progression, mini-évaluations, carnet de développement, calendrier, académie des parents, calculateur de budget, coach, bilans, album, vidéothèque, abonnement, paramètres, notifications, administration.
3. **Base de données** : utilisateurs, enfants, exercices, séances, retours, mesures, badges, défis, bilans, médias, guides, offres, abonnements, paiements, règles, journal d'audit.
4. **Bibliothèque et parcours par âge** : 1 273 fiches (126 exercices de base rédigés un par un, déclinés en 18 progressions) ; chaque fiche est complète (objectif, pourquoi, étapes, erreurs, corrections, 3 variantes, critère de réussite, sécurité, récupération, schéma animé) ; repères détaillés pour chaque tranche d'âge.
5. **Calendrier et progression** : planification autour du club et des matchs, déplacement contrôlé, évènements (match, vacances, repos) ; 11 indicateurs avec courbes ; 7 mini-évaluations à cibles progressives.
6. **Adaptation** : fatigue, douleur, plaisir, motivation, confiance, difficulté, sommeil, charge hebdomadaire ; chaque ajustement est expliqué au parent. « Il voulait continuer » n'allonge jamais une séance.
7. **Abonnement** : 4 offres (Découverte gratuite, Essentiel 3,99 €, Premium 6,99 €, Famille 9,99 € ; annuel réduit), essai configurable, factures, résiliation, reprise, échec de paiement avec 7 jours de grâce, Stripe prêt à brancher.
8. **Administration** : 5 rôles (parent, éditeur, modérateur, support, administrateur), CRUD exercices et guides, tarifs, règles de l'IA bornées, modération, diffusion de notifications, statistiques agrégées.
9. **Contenus** : 22 guides parents, rubrique « Dépenser intelligemment », défis quotidiens, hebdomadaires et mensuels, 17 badges.
10. **Tests et sécurité** : voir ci-dessous.

Fonctions supplémentaires : passeport football, profil joueur privé, modes vacances / petit espace / sans matériel / parent débutant / frères et sœurs, bilan de fin de saison, guide du choix du club, coach de confiance, défi du jour de 5 minutes, export et suppression RGPD.

## Tests

```bash
npm test          # moteur : 15 tests (règles de sécurité, planification, offres, chiffrement)
npm run build && npx next start -p 3100 &
npm run test:e2e  # navigateur : 53 vérifications, captures dans docs/captures/
```

Le parcours de bout en bout couvre : inscription avec consentement, création du profil, séance pas à pas, questionnaire (fatigue + douleur) et adaptation expliquée, défis, bibliothèque, progression, évaluation, carnet chiffré, déplacement refusé un jour de match, coach, guides, budget, album, bilan factuel, modes, souscription et résiliation, export, cloisonnement entre familles, back-office, suppression du compte et de ses fichiers.

**Non testé en conditions réelles** (pas de clés disponibles dans l'environnement de développement) : les appels à Claude et le paiement Stripe. Le code est écrit et compile ; il faut le valider avec vos clés, en mode test Stripe d'abord.

## Avant d'ouvrir aux premiers clients

- **Relecture pédagogique** : faire valider les 126 exercices de base, les 18 progressions et les règles par un éducateur diplômé (BMF/BEF) et, pour la partie récupération, par un médecin du sport. Le champ « Validé par » de chaque fiche sert à tracer cette relecture.
- **Juridique** : compléter la politique de confidentialité (mentions entre crochets), rédiger CGU/CGV, désigner l'hébergeur (UE), vérifier la marque.
- **Paiement** : créer le compte Stripe, configurer le webhook, tester les échecs de paiement.
- **Production** : stockage objet pour les médias, sauvegardes automatiques de la base, envoi d'e-mails (réinitialisation de mot de passe, bilans), limitation de débit, supervision.
- **Reste à développer** : notifications push et e-mail (aujourd'hui : centre de notifications dans l'application), réinitialisation du mot de passe par e-mail, éditeur de questionnaires et de séances-types dans l'administration (les séances sont générées par le moteur), vidéos tournées avec de vrais éducateurs (emplacement `videoUrl` prévu), applications natives.

## Conformité juridique (avant publication)

L'administration contient une page **Conformité** (`/admin/conformite`) qui reprend les 20 points de contrôle et les obligations complémentaires, avec un statut calculé automatiquement quand c'est possible.

Déjà en place dans le code :
- Pages publiques : mentions légales, confidentialité, conditions générales (CGU + CGV), rétractation et remboursements (avec formulaire type), cookies, accessibilité, demande de suppression sans connexion, désinscription en un clic.
- Consentements journalisés avec version (CGU, autorité parentale, santé séparé et facultatif, e-mails décochés par défaut, partage de vidéo, accès immédiat) et visibles par le parent.
- Données de forme et de santé soumises à un consentement explicite (et à l'accord de l'enfant avant 15 ans) ; jamais envoyées à l'IA, pas plus que le prénom.
- Récapitulatif avant paiement, bouton « Commander avec obligation de paiement », rétractation 14 jours au prorata, résiliation en quelques clics avec confirmation, rappel avant reconduction annuelle (`npm run daily`).
- Signalement des vidéos publiées et motifs communiqués en cas de retrait ; annonce explicite que le coach est une IA.
- Contrôles automatiques : aucune requête vers un service tiers, aucun cookie avant connexion, accessibilité WCAG A/AA (axe-core) sur 19 écrans.

À faire par vous avant d'ouvrir : renseigner les variables `LEGAL_*` de `.env`, adhérer à un médiateur de la consommation, choisir l'hébergeur (UE, éventuellement HDS), configurer `SMTP_URL` et Stripe, planifier `npm run daily` chaque nuit, signer les contrats de sous-traitance, réaliser l'analyse d'impact (AIPD), faire relire les fiches par un éducateur diplômé et tous les textes légaux par un avocat, vérifier la marque.

## Mise en ligne

Le fichier `render.yaml` décrit toute l'installation (site, base PostgreSQL, tâche nocturne) chez Render, région Francfort :
1. Sur render.com : « New » → « Blueprint » → choisir ce dépôt.
2. Renseigner les variables demandées (adresse du site, compte administrateur, Stripe, e-mails, informations légales).
3. Brancher le nom de domaine dans « Settings » → « Custom Domains », puis créer le webhook Stripe vers `/api/stripe/webhook`.

À chaque démarrage, `npm run release` met la base à jour et recharge les contenus. Les photos de l'album sont désactivées par défaut (`FEATURE_UPLOADS`) : elles demandent un disque persistant.

## Configuration de lancement (v1)

- Une seule offre payante, **Famille** (4,99 € par mois ou 34,90 € par an, jusqu'à 3 enfants), l'offre Découverte gratuite, et la **carte cadeau « Une saison »** (`/cadeau`, 29 €, paiement unique, 12 mois sans renouvellement).
- Désactivés par défaut, réactivables par variable d'environnement : coach IA (`FEATURE_COACH`), suivi santé (`FEATURE_HEALTH`), vidéos partagées entre familles (`FEATURE_FAMILY_VIDEOS`).
- Guides publics pour le référencement (`/guides`), plan du site, mot de passe oublié (nécessite `SMTP_URL`).
- Tests : `npm run test:e2e` sur un serveur lancé avec `FEATURE_ALL=1` (88 vérifications), et `node tests/e2e/v1.mjs` sur un serveur sans interrupteur (configuration de lancement).

## Repères économiques (estimations)

- Coût du coach IA avec `claude-opus-5-5` et prompt mis en cache : de l'ordre de 0,01 à 0,02 $ par question. Les quotas (3 à l'essai, 10 par mois en Essentiel) bornent le coût par abonné ; `COACH_MODEL` permet de choisir un modèle moins cher.
- 100 000 abonnés payants ne se gagnent pas par le produit seul : il faudra de l'acquisition (clubs, ligues, écoles de foot, bouche-à-oreille entre parents). Le produit est conçu pour la rétention : rendez-vous hebdomadaire planifié, défi quotidien de 5 minutes, bilans mensuels, album de souvenirs qui prend de la valeur avec le temps.
