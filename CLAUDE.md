# Les Chahuteuses — Site vitrine

## Le projet
Site vitrine de l'association **Les Chahuteuses** (loi 1901, Paris, fondée en 2014) :
événements autour du corps et des sexualités joyeuses — cabaret, ateliers, scène ouverte.

Ce dépôt est une **refonte** réalisée à deux (Vincent + un collègue). Le site officiel de
l'association `www.leschahuteuses.fr` est hébergé ailleurs et **n'est pas géré ici**.

## État actuel
- **Page publique** : site statique mono-page, HTML/CSS/JS **vanilla** — aucun framework,
  aucun build. `src/index.html` (CSS inline) + `src/js/site.js` (logique) + `src/img/`.
- **Contenu éditable** : `src/content.json` (textes + agenda) — hydraté côté client par
  `site.js`. Si le fichier est absent, le HTML statique par défaut reste affiché.
- **Back-office OVH** : PHP 8 dans `src/admin/`, `src/api/` et `src/lib/`, routé par
  `src/.htaccess`. Il permet d'éditer le site en ligne sans Node/PM2 sur hébergement
  mutualisé OVH.
- **Externe** : Google Fonts, 6 vidéos YouTube intégrées, billetterie HelloAsso, réseaux sociaux.
- **Sections** : Nav · Hero · À propos · Nos formats · Agenda/Événement · Vidéos · Bénévolat · Footer.
- **En ligne** : `https://vitrine2026.les-chahuteuses.fr/` (OVH mutualisé, PHP 8).

## Structure du dépôt
```
chahuteuses/
├── CLAUDE.md          ← ce fichier
├── CHANGELOG.md       ← historique des changements
├── README.md
├── LICENSE
├── src/               ← SOURCE DE VÉRITÉ du site public
│   ├── .ovhconfig     ← sélection PHP 8 pour OVH
│   ├── .htaccess      ← routes Apache : /admin et /api/*
│   ├── index.html
│   ├── content.json   ← données éditables (textes + événements)
│   ├── js/            ← site.js (public) + edit.js (mode édition)
│   ├── img/
│   ├── admin/         ← page de connexion / initialisation PHP
│   ├── api/           ← endpoints PHP : session, content, upload
│   ├── lib/           ← fonctions communes PHP (protégé par .htaccess)
│   ├── private/       ← auth.json créé en production, gitignoré
│   └── uploads/       ← images uploadées, gitignorées
```

## Workflow
1. Modifier les fichiers dans `src/` (source de vérité).
2. Tester en local : `python3 -m http.server -d src 8080` → http://localhost:8080
   (le back-office PHP nécessite un serveur PHP/Apache ou équivalent pour tester `/admin`).
3. Déployer sur OVH via Git ou FTP en gardant le sous-domaine pointé vers `src/`.
4. Versionner : `git add -A && git commit`.

Remote `origin` = dépôt GitHub du collègue (`shosho-san/leschahuteuses.fr`). Les commits
restent **locaux** sauf demande explicite de push.

## Déploiement OVH mutualisé
- **Dossier racine du sous-domaine** : `./vitrine2026/src`.
- **Runtime** : PHP 8 via `.ovhconfig` et Apache `.htaccess`.
- `src/.htaccess` route `/admin`, `/admin/login`, `/admin/logout`, `/admin/setup`
  vers `src/admin/index.php`, et `/api/content`, `/api/session`, `/api/upload`
  vers `src/api/index.php`.
- Le site public reste statique pour les visiteurs : `index.html`, `content.json`,
  `js/`, `img/`.
- Les éditions depuis `/admin` réécrivent directement `src/content.json`. Les images
  uploadées sont stockées dans `src/uploads/`.
- `src/private/auth.json` est créé au premier accès `/admin` lors de l'initialisation
  du mot de passe. Il est gitignoré et protégé par `.htaccess`.

Permissions à vérifier côté OVH :
```
src/content.json
src/private/
src/uploads/
```

## Back-office d'édition
- **Accès** : `https://vitrine2026.les-chahuteuses.fr/admin`.
- **Initialisation** : au premier accès, créer le mot de passe. PHP écrit le hash dans
  `src/private/auth.json`.
- **Édition inline** : après connexion, la page d'accueil passe en mode édition (barre
  flottante, textes cliquables, agenda en formulaires). `js/edit.js` n'est chargé que
  pour une éditrice connectée (cookie `co_editor`).
- **Enregistrement** : réécrit `content.json` avec effet immédiat en ligne.
- **Upload** : `POST /api/upload`, images PNG/JPG/WebP/GIF, 4 Mo max, dans `src/uploads/`.
- Périmètre éditable : agenda multi-événements + textes (hero, à propos, formats, bénévolat).

## Périmètre des améliorations
Pistes restantes (à cadrer avec Vincent) :
- Durcissement back-office : limitation de tentatives persistante, journalisation, éventuel
  second facteur si l'usage l'exige.
- Formulaire de contact / candidature bénévole (actuellement simple `mailto:`).
- Inscription newsletter.
- Galerie / vidéos chargées dynamiquement.

## Points d'attention / dette connue
- Aucun `404.html` n'existe dans `src/` pour l'instant.
- Les fichiers `js/*.js` peuvent être gardés en cache par le navigateur ; versionner l'URL
  (`?v=...`) après modification.
- Dossier `/var/www/rougedog/` : ancienne variante du site, **non servie**, hors périmètre
  — ne pas confondre avec la cible `/var/www/chahuteuses/`.

## Règles
- Garder la **page publique simple et statique** ; toute logique dynamique passe par les
  endpoints PHP du back-office, jamais dans le rendu public standard.
- Toute mise en ligne / modif OVH = action infra → **confirmer** et documenter dans
  `CHANGELOG.md`.
- Tester avant de déployer. Sur OVH mutualisé, tester au minimum `/`, `/admin`,
  `/api/session` et un enregistrement de contenu.
- Réponses en français, concises.
