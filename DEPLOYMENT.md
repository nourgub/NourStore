# Publication de NouriX Academy

> **Note (mise à jour) :** ce projet a depuis retiré toute dépendance à
> Manus — authentification, stockage, cron — voir la note de bas de page
> historique conservée plus bas dans ce fichier pour le détail de ce
> retrait. Les sections ci-dessous décrivant le déploiement sur Manus
> reflètent l'état **historique** du projet et ne s'appliquent plus : ce
> dépôt fonctionne désormais uniquement en auto-hébergement (Docker +
> MySQL + Google OAuth ou email/mot de passe), décrit plus bas dans
> « Déployer ce projet » et `docker-compose.yml`.

> **Correction (2026-09-01) :** le nombre de « 34 tests Vitest » ci-dessous
> est obsolète — le compte réel, mesuré en exécutant `pnpm test`, est de
> **188 tests** (au 2026-09-01, avant les ajouts de cette session). De
> plus, **`DB_DRIVER=sqlite` n'existe pas dans le code réel** — il n'y a
> aucun fichier `db.sqlite.ts`/`schema.sqlite.ts` ni aucune lecture de
> `DB_DRIVER` nulle part dans le dépôt ; la couche base de données
> (`server/db/shared.ts`) ne supporte que MySQL. Toute section plus bas
> mentionnant `DB_DRIVER=sqlite` doit être ignorée. Voir
> `PHASE1_STATUS.md` à la racine du projet pour l'état réel et vérifié.

Le projet WebDev permanent `nourix-academy-permanent` était initialement configuré avec le serveur full-stack, Manus OAuth, la base MySQL/TiDB gérée et le stockage compatible S3 du template. La dernière révision visuelle supprime la rotation des cartes et badges, et impose une typographie droite pour améliorer la lisibilité arabe et latine. Le nom **NouriX Academy** est conservé et la page publique de vérification des certificats reste accessible sans authentification.

## État validé

Le type-check, les 34 tests Vitest et le build de production sont passés. Les pages publiques `/`, `/courses`, `/search` et `/verify/certificate` ont été vérifiées sur desktop et mobile. La route `/notifications` a été vérifiée en état non authentifié et redirige vers la connexion, tandis que la vérification publique reste ouverte. Les permissions des rôles, les parcours protégés et les contrats serveur ont été vérifiés par les tests automatisés ; aucune session utilisateur réelle n’a été ouverte dans le navigateur.

## Publication

Depuis l’interface de gestion du projet, ouvrir le checkpoint le plus récent puis cliquer sur **Publish**. WebDev fournira l’URL HTTPS permanente du site. Le projet utilise le mode Autoscale par défaut, adapté à cette plateforme web sans worker permanent. La publication ne doit pas être remplacée par l’URL de prévisualisation locale, qui est temporaire.

## Variables et données

Les variables Manus/OAuth et les secrets système doivent rester gérés dans le panneau Secrets WebDev ; aucun fichier `.env` ne doit être ajouté au dépôt. Avant la mise en ligne commerciale, configurer `OAUTH_SERVER_URL`, vérifier l’application OAuth et son URL de callback, puis créer le premier compte administrateur via le flux Manus prévu par le projet.

La base permanente a été initialisée avec une migration unique `drizzle/0000_nourix_initial.sql`, qui couvre les utilisateurs, contenus, cours, progression, abonnements, invitations parentales, certificats et notifications. Les tests ont ensuite exercé les contrats avec cette base. Toute modification future doit suivre le cycle schéma Drizzle → génération de migration → application contrôlée → vérification. Sept migrations supplémentaires ont été générées lors de passes ultérieures et **doivent être appliquées, dans l'ordre, à une base réelle** avant déploiement (elles ont été exécutées avec succès contre une instance MySQL de vérification dans cet environnement, mais jamais contre la base de production réelle) :
`0001_add_security_constraints.sql`, `0002_add_exams_and_open_grading.sql`,
`0003_add_payments_abstraction.sql`, `0004_add_skills_and_notifications.sql`,
`0005_add_dynamic_subjects.sql`, `0006_add_whatsapp_payment_flow.sql`, et
les deux fichiers de données `0007_seed_contact_channels.sql` /
`0008_seed_payment_rib.sql` (ceux-ci ne modifient aucun schéma, seulement
des lignes de configuration — sûrs à ré-exécuter grâce à
`ON DUPLICATE KEY UPDATE`).

### Créer le premier compte administrateur (bootstrap)

Concrètement, la procédure est :

1. Se connecter une première fois sur la plateforme via le portail OAuth
   normal (`/login`) — le compte est créé avec le rôle par défaut `learner`.
2. Retrouver son propre `openId` dans la table `users` (colonne `openId`),
   correspondant à ce compte fraîchement créé.
3. Définir la variable d'environnement `OWNER_OPEN_ID` avec cette valeur, et
   redémarrer le serveur.
4. Se reconnecter : le serveur reconnaît alors ce `openId` comme le
   propriétaire et lui attribue automatiquement le rôle `admin` (voir
   `server/db.ts`, logique d'upsert utilisateur).
5. Une fois ce premier compte admin actif, tous les autres rôles (teacher,
   institution, parent, autres admins) se distribuent depuis
   **Espace admin → Gestion des utilisateurs** (`admin.updateUserRole`) —
   aucune autre variable d'environnement n'est nécessaire pour ça.

Sans cette étape, **aucun compte ne peut jamais accéder aux panneaux
d'administration** — c'est un prérequis bloquant avant toute mise en ligne,
et il n'était pas documenté clairement avant cette révision.

### Vérification de l'état du serveur

Un point de contrôle réel existe désormais à `GET /api/health` — il exécute
une vraie requête (`SELECT 1`) contre la base de données plutôt que de
répondre `200` inconditionnellement, donc une panne de connexion à la base
apparaît comme une instance en mauvaise santé (`503`) au lieu d'être
masquée. À utiliser pour la surveillance (load balancer, uptime monitor,
orchestration de conteneurs).

## Paiements — variables d'environnement (aucun prestataire actif)

Aucun prestataire de paiement réel n'est connecté à ce dépôt. Le modèle
(`invoices`, `paymentAttempts`, `refunds`, `planPrices`) et le contrat de
webhook (`server/paymentsWebhook.ts`, monté sur
`POST /api/webhooks/payments/:provider`) sont prêts, mais volontairement
inertes tant que ces variables ne sont pas définies :

- `PAYMENT_PROVIDER` — nom du prestataire actif (ex. `stripe`). Laisser vide
  désactive tout webhook (l'endpoint répond `501` explicitement plutôt que
  d'accepter silencieusement des requêtes non vérifiées).
- `PAYMENT_WEBHOOK_SECRET` — secret partagé utilisé par la vérification de
  signature. **La vérification actuelle est un HMAC générique, pas le schéma
  réel de Stripe** (qui exige le corps brut de la requête, pas le JSON déjà
  parsé) — à remplacer par la vérification propre au prestataire choisi avant
  toute mise en production avec de vrais paiements.

Tant qu'aucun prestataire n'est branché, l'octroi d'accès reste manuel via le
panneau **Abonnements et accès** de l'espace admin (`subscriptions.assign`) —
ce chemin ne crée jamais de fausse facture "payée" ; il grantit l'accès
avec `paymentProvider = "manual"`, clairement distinct d'un paiement réel.

## BaridiMob (Algérie Poste) — intégration réelle non disponible publiquement

Algérie Poste ne publie pas d'API BaridiMob en libre-service. La couche
technique (`server/baridimobProvider.ts`) est prête à recevoir une vraie
intégration mais refuse honnêtement toute tentative de paiement tant que
les trois variables suivantes ne sont pas renseignées :

- `BARIDIMOB_MERCHANT_ID`, `BARIDIMOB_API_KEY`, `BARIDIMOB_API_BASE_URL` —
  ces valeurs n'existent qu'après un **enregistrement marchand réel** sur
  https://baridiweb.poste.dz (ou via un agrégateur agréé par Algérie
  Poste). Algérie Poste communique alors la spécification technique exacte
  (endpoints, format de requête/réponse, schéma de signature) directement
  au marchand — ce dépôt ne les invente pas.
- Une fois ces informations obtenues, remplacer le corps de
  `initiateBaridimobCheckout` (commentaire détaillé dans le fichier) par le
  véritable appel HTTP, puis adapter `server/paymentsWebhook.ts` pour
  vérifier la signature réelle des callbacks BaridiMob.
- **Contrainte réglementaire déjà appliquée dans le code** : les paiements
  locaux doivent être en DZD uniquement — `initiateBaridimobCheckout` rejette
  toute autre devise, indépendamment de ce que l'API réelle imposerait aussi.
- Tant que ces variables sont vides, la page `/pricing` affiche un message
  honnête ("le paiement en ligne n'est pas encore activé") plutôt qu'un
  faux succès ou une redirection inventée — vérifié par
  `server/baridimobProvider.test.ts` et un test d'intégration réel contre
  une base MySQL (voir AUDIT.md).

## Paiement manuel via WhatsApp (bot + vérification humaine)

Alternative pleinement fonctionnelle à BaridiMob, contrairement à ce dernier
l'API WhatsApp Cloud de Meta est réellement publique et documentée
(developers.facebook.com/docs/whatsapp/cloud-api) — ce n'est pas une
spécification devinée.

- Le lien `wa.me` (ouverture de WhatsApp avec un message pré-rempli
  contenant la référence de commande `NX-INV-{id}`) fonctionne **dès
  maintenant sans aucune configuration**, dès qu'un numéro WhatsApp est
  enregistré dans **Panneau admin → Canal WhatsApp**.
- Le bot automatique (réponse avec le RIB, réception des photos de reçu) a
  besoin de trois variables : `WHATSAPP_ACCESS_TOKEN`,
  `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` — obtenues via un
  compte Meta Business + WhatsApp Business Platform (numéro vérifié, jeton
  d'accès permanent). Sans ces trois variables, le webhook répond `501` et
  aucune tentative d'appel n'est faite.
- Le RIB/CCP envoyé automatiquement par le bot se configure dans
  **Panneau admin → Paiement via WhatsApp**.
- **Le bot ne valide jamais un paiement automatiquement.** Une photo de
  reçu ne prouve pas qu'un virement a réellement abouti — seul un humain
  vérifiant le relevé bancaire réel peut le confirmer. Chaque reçu reçu
  apparaît dans la file d'attente admin (**Panneau admin → Paiement via
  WhatsApp**) pour approbation ou rejet manuel ; seule cette action
  (ou un webhook de paiement réellement vérifié) peut activer un
  abonnement.
- Vérifié de bout en bout contre une base MySQL réelle : création de
  facture, analyse du message par le bot, soumission de reçu, rejet (aucune
  activation), puis approbation (abonnement réellement activé) — les deux
  chemins ont été testés (voir AUDIT.md).

## Canaux de contact réels (WhatsApp, Instagram, Facebook)

Les vrais canaux de contact de Nourix Academy sont déjà enregistrés comme
paramètres modifiables en base (`platformSettings`), pas codés en dur dans
le code source — un administrateur peut les changer à tout moment depuis
**Espace admin → Canaux de contact** :

- WhatsApp : `+213 79 49 41 25`
- Instagram : https://www.instagram.com/nourix_academy/
- Facebook : https://www.facebook.com/share/1QnVFMJFin/?mibextid=wwXIfr

Ces valeurs initiales sont insérées par `drizzle/0007_seed_contact_channels.sql`
(exécuter ce fichier une fois après les migrations de schéma, avec le même
client MySQL — ce n'est pas une migration de schéma, uniquement des
données ; `ON DUPLICATE KEY UPDATE` la rend sans danger à ré-exécuter).
Elles alimentent à la fois le pied de page public (`Home.tsx`) et le lien
`wa.me` pré-rempli utilisé par le flux de paiement WhatsApp.

Le numéro RIP (compte courant postal / BaridiMob) que le bot WhatsApp
envoie automatiquement à l'apprenant est de la même façon enregistré comme
donnée, pas codé en dur : `drizzle/0008_seed_payment_rib.sql` (RIP :
`00799999004157719936`), modifiable ensuite depuis **Espace admin →
Paiement via WhatsApp**.

## Domaine personnalisé

Pour un domaine personnalisé, le rattacher ensuite depuis **Settings → Domains** dans la gestion WebDev et suivre les enregistrements DNS affichés par l’interface. Aucun changement de code n’est nécessaire pour la vérification publique des certificats.

## MySQL auto-hébergé, entièrement piloté par code (Docker Compose)

Pour un vrai paiement (BaridiMob, WhatsApp, coupons, parrainage — tout ce
qui n'existe qu'en mode `DB_DRIVER=mysql`), sans jamais créer de compte
chez un fournisseur cloud tiers : `docker-compose.yml` et `Dockerfile` à la
racine du dépôt font tourner MySQL et l'application entièrement sur une
machine que vous contrôlez déjà — un VPS, un serveur personnel, même un
PC. Docker lui-même est un logiciel gratuit à installer, pas un compte à
créer.

1. Installer Docker sur la machine choisie (`docker.com` — installation de
   logiciel classique, aucune inscription requise pour l'usage local).
2. `cp .env.example .env` puis remplir les vraies valeurs (mots de passe
   MySQL réels, `JWT_SECRET` généré via `openssl rand -hex 32`, et les
   identifiants Google OAuth si `AUTH_PROVIDER=google`).
3. `docker compose up -d` — démarre un vrai conteneur MySQL 8.0 avec les
   données stockées dans un volume Docker persistant (survit aux
   redémarrages ; seul `docker compose down -v` l'efface, comme prévu).
4. `node scripts/migrate.mjs` (ou `pnpm migrate`) — script Node.js pur (le
   même pilote `mysql2` déjà utilisé par l'application, aucun outil
   externe) qui applique automatiquement les fichiers `drizzle/*.sql` dans
   l'ordre, en suivant les migrations déjà appliquées dans une vraie table
   `_migrations` (plus de détection par analyse du texte des erreurs SQL).
   **Corrigé et vérifié réellement (2026-09-01)** contre quatre scénarios
   réels sur MySQL/MariaDB : base entièrement vierge (21/21 appliquées) ;
   ré-exécution immédiate sur la même base (0 appliquée, 21 déjà à jour,
   sans aucune erreur — c'est précisément le cas qui échouait avant) ;
   base déjà migrée par l'ancienne version du script sans table
   `_migrations` (détection automatique du schéma existant, migrations
   enregistrées comme déjà appliquées sans ré-exécuter leur SQL — sûr sur
   un déploiement déjà en production) ; et ajout d'une nouvelle migration
   sur une base déjà à jour (seule la nouvelle s'applique). Voir
   `PHASE4_STATUS.md` et `PRELAUNCH_CHECKLIST.md` pour l'historique
   complet de ce correctif.

## Sauvegarde et restauration réelles de la base de données

`scripts/backup-database.sh` et `scripts/restore-database.sh` — scripts
bash réels et fonctionnels, pas des placeholders :

```bash
# Sauvegarde (dump SQL compressé, horodaté, dans ./backups/)
./scripts/backup-database.sh

# Restauration (destructive — demande de taper le nom de la base pour confirmer)
./scripts/restore-database.sh backups/nourix-backup-20260901-120000.sql.gz
```

Les deux lisent `MYSQL_DATABASE`/`MYSQL_USER`/`MYSQL_PASSWORD` depuis
`.env` (jamais codés en dur), utilisent `mysqldump --single-transaction`
(cohérence garantie sans verrouiller les tables), et fonctionnent via
`docker compose exec` — donc directement compatibles avec la configuration
Docker ci-dessus. **Vérifié réellement dans cette session** : cycle complet
sauvegarde → restauration testé contre une vraie base MySQL/MariaDB, les
42 tables sont retrouvées à l'identique après restauration.

Pour des sauvegardes automatiques réelles (pas seulement manuelles),
ajouter à une tâche cron, par exemple chaque nuit à 3h :

```
0 3 * * * cd /chemin/vers/nourix-academy && ./scripts/backup-database.sh >> backups/backup.log 2>&1
```

Une sauvegarde qui n'a jamais été restaurée pour test n'est pas une
sauvegarde vérifiée — tester `restore-database.sh` périodiquement contre
une base de test, pas seulement au moment d'un vrai incident.
5. L'application elle-même tourne dans son propre conteneur (build via le
   `Dockerfile` fourni), connectée au conteneur MySQL via le réseau Docker
   interne — `docker compose up -d` démarre les deux ensemble.

Ce chemin ne nécessite la création d'aucun compte, sur aucun site, pour la
base de données elle-même — seulement l'installation gratuite de Docker,
exactement comme installer n'importe quel autre logiciel sur sa propre
machine.

## تصحيح (2026-09-01): القسم التالي كان يصف ميزة لم تُنفَّذ فعليًا قط

كان هذا القسم يصف وضع `DB_DRIVER=sqlite` بالتفصيل، مع "تحقق شامل" مزعوم
وحتى "ثغرة أمنية حقيقية اكتُشفت وأُصلحت". **لا وجود لأي من هذا في الكود
الفعلي** — لا `server/db.sqlite.ts`، ولا أي قراءة لـ`DB_DRIVER` في كامل
المشروع. طبقة قاعدة البيانات تدعم MySQL فقط. حُذف النص الأصلي (كان
~30 سطرًا). راجع `PHASE1_STATUS.md` لتفاصيل هذا التصحيح الأصلي — كان قد
أُصلح في `AUDIT.md` لكن نُسي هذا القسم المطابق في هذا الملف حتى الآن.

## Déploiement (historique : dépendait de Manus, maintenant retiré)

Ce projet dépendait initialement de deux services internes à Manus :
l'authentification (`WebDevAuthPublicService`) et le stockage de fichiers
(Forge). **Les deux ont été entièrement retirés du code** — il n'existe
plus de chemin Manus du tout, dans aucune configuration. Les deux
alternatives génériques, qui sont maintenant les *seules* options, sont
décrites ci-dessous.

### Authentification : Google OAuth 2.0 (par défaut) ou email/mot de passe

Flux standard et public (`accounts.google.com` + `oauth2.googleapis.com`),
publiquement documenté — aucune spécification interne devinée.

1. Dans la [console Google Cloud](https://console.cloud.google.com/apis/credentials),
   créez des identifiants OAuth 2.0 (type "Application Web").
2. Ajoutez `https://votre-domaine/api/auth/google/callback` comme URI de
   redirection autorisée.
3. Définissez `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`.
4. `JWT_SECRET` doit toujours être défini — c'est lui qui signe le cookie
   de session (server/_core/session.ts, code entièrement auto-hébergé, sans
   aucun appel réseau externe).

Tant que `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` ne sont pas définis,
`/api/auth/google/login` répond honnêtement `501` plutôt que de rediriger
vers un flux cassé — vérifié par un test réel dans ce dépôt. Les
formulaires email+mot de passe (`/login`, `/register`) fonctionnent dans
tous les cas, sans configuration ni service externe.

### Stockage : n'importe quel stockage compatible S3, ou disque local

Fonctionne avec AWS S3, Cloudflare R2, Backblaze B2, MinIO, DigitalOcean
Spaces — n'importe quel service qui parle l'API S3.

1. Créez un bucket et une paire de clés d'accès scopée à ce bucket.
2. Définissez :
   - `STORAGE_PROVIDER=s3`
   - `S3_BUCKET`, `S3_REGION` (mettre `auto` pour R2)
   - `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
   - `S3_ENDPOINT` (laisser vide pour du vrai AWS S3 ; obligatoire pour
     R2/B2/MinIO — ex. `https://<account-id>.r2.cloudflarestorage.com`)
   - `S3_PUBLIC_BASE_URL` si le bucket/CDN est public en lecture (sinon
     chaque téléchargement passe par une URL pré-signée à durée limitée,
     générée à la volée)

Sans ces identifiants, toute tentative d'upload échoue immédiatement avec
un message d'erreur clair (`S3 storage config missing: ...`) plutôt que de
planter silencieusement — vérifié par des tests réels dans ce dépôt.

### Base de données

Aucune des deux plateformes ci-dessus (Replit inclus) ne fournit MySQL
nativement. Il faut de toute façon un MySQL externe (PlanetScale, Railway,
un VPS dédié…) et y appliquer les migrations `drizzle/0000` à `0012` dans
l'ordre, exactement comme documenté plus haut dans ce fichier.

## Application mobile iOS / Android

**Ce qui est réellement livré dans ce dépôt aujourd'hui** : une véritable
Progressive Web App (PWA), pas une simulation.

- `client/public/manifest.webmanifest` + icônes générées à partir du logo
  de la marque (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`) —
  sur Android/Chrome, cela déclenche une vraie invite d'installation
  ("Ajouter à l'écran d'accueil") avec une icône propre, un splash screen,
  et un mode plein écran (`display: standalone`).
- `client/public/sw.js` (service worker, enregistré dans `main.tsx`) : mise
  en cache réelle de l'app shell (HTML/CSS/JS) — l'application se recharge
  et reste utilisable même sans connexion après une première visite. Ce
  n'est **pas** un mode hors-ligne complet (les vidéos de leçon et tout
  appel tRPC nécessitent toujours une connexion), c'est honnêtement la
  portée d'un service worker sans une architecture de synchronisation de
  données hors-ligne dédiée (un projet séparé bien plus vaste).
- Sur iOS, Safari ignore le manifeste pour l'installation à l'écran
  d'accueil — les balises `apple-mobile-web-app-capable` et
  `apple-touch-icon` dans `index.html` couvrent ce cas spécifiquement.

**Pourquoi une vraie application native (App Store / Play Store) n'a pas
été construite ici** : Apple exige que toute compilation/signature d'une
application iOS se fasse sur macOS avec Xcode et un compte Apple Developer
payant — il n'existe aucune façon de contourner cela, et cet environnement
est du Linux sans aucun de ces outils. Une application Android native
nécessite de façon similaire Android Studio/le SDK Android et un compte
Google Play Console.

**Ce qui est préparé pour la suite** : `capacitor.config.json` à la racine
du dépôt configure déjà Capacitor (le pont standard qui enveloppe une PWA
existante dans un vrai projet natif iOS/Android sans réécrire le code) pour
pointer vers le build de production existant (`dist/public`). Étapes
réelles pour un développeur disposant des bons outils :

1. `pnpm add @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android`
2. `pnpm build` (génère `dist/public`)
3. `npx cap add ios` et `npx cap add android` (génère les projets natifs)
4. `npx cap sync` (copie le build web dans les projets natifs)
5. **iOS** : `npx cap open ios` — nécessite macOS + Xcode + un compte Apple
   Developer (99 $/an) pour signer et soumettre à l'App Store.
6. **Android** : `npx cap open android` — nécessite Android Studio et un
   compte Google Play Console (frais unique de 25 $) pour publier.

Ce chemin n'a pas été exécuté dans cet environnement (aucun outil natif
disponible) — le fichier de configuration est prêt, l'exécution réelle
attend un développeur avec macOS/Android Studio.

## Pré-production recommandée

Avant d’ouvrir les inscriptions, renseigner les cours réels et leurs unités depuis l’espace de gestion, définir les plans d’abonnement et leur devise, tester la création d’un compte par rôle avec des comptes de préproduction, vérifier un parcours complet jusqu’à l’émission d’un certificat, et connecter séparément un prestataire de paiement réel si la facturation doit être activée. Aucun avis, témoignage, note ou donnée client fictive n’a été ajouté.
