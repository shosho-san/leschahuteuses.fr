# Changelog — Les Chahuteuses

## 2026-05-28

### SEO, performance et nettoyage des images
- Ajout de métadonnées SEO complètes : description, canonical, Open Graph,
  Twitter Card, robots, JSON-LD `Organization`/`WebSite`/`BreadcrumbList` et
  sitemap public.
- Ajout des règles de production dans `src/.htaccess` : redirection canonique
  vers `https://www.leschahuteuses.fr/`, `X-Robots-Tag` en `noindex,nofollow`
  hors domaine public, robots/sitemap spécifiques pour les environnements de
  recette, et cache long des assets statiques.
- Optimisation du logo LCP : création de `src/img/logo-280.webp` avec fallback
  `src/img/logo-280.png`, utilisation de `<picture>`, ajout de
  `fetchpriority="high"` sur le logo de navigation et `loading="lazy"` sur le
  logo du footer.
- Nettoyage des anciennes variantes de logo devenues inutiles :
  `src/img/logo.png` et `src/img/logo-320.png` supprimés.
- Version du script public passée à `site.js?v=10` pour contourner le cache long
  après modification de `src/js/site.js`.
- Correction du rendu agenda sans événement futur : le rendu dynamique produit
  maintenant le même bloc riche que le HTML de fallback local.
- Vérification PageSpeed/Edge : le site ne charge pas les domaines publicitaires
  signalés dans l'arborescence réseau PageSpeed ; les seules ressources
  observées côté site sont les images locales, `site.js` et `/api/content`.
- Ajout de réponses `410 Gone` pour les anciennes URLs WordPress techniques
  (`/wp-admin/`, `/wp-content/`, `/wp-includes/`, `/wp-json/`, `/feed/`) afin
  d'aider Google à les retirer des rapports Search Console.

## 2026-05-21

### Compatibilité OVH mutualisé PHP 8
- Migration du back-office d'édition vers une implémentation **PHP 8 compatible OVH
  mutualisé**, sans dépendance Node.js/PM2 pour `vitrine2026.les-chahuteuses.fr`.
- Ajout de `src/.ovhconfig` pour sélectionner PHP 8 côté OVH.
- Ajout de `src/.htaccess` pour router `/admin`, `/admin/login`, `/admin/logout`,
  `/admin/setup` et les endpoints `/api/content`, `/api/session`, `/api/upload`.
- Nouveau back-office PHP :
  - `src/admin/index.php` : initialisation du mot de passe, connexion, déconnexion ;
  - `src/api/index.php` : session, lecture/écriture de `content.json`, upload d'images ;
  - `src/lib/cms.php` : authentification, cookies, validation et écriture JSON.
- Ajout de protections `.htaccess` pour `src/lib/` et `src/private/`.
- `src/private/auth.json` et `src/uploads/` sont exclus de Git, tout en versionnant leurs
  `.htaccess` de protection.
- Documentation mise à jour pour le déploiement OVH : le sous-domaine doit pointer vers
  `./vitrine2026/src` et PHP doit pouvoir écrire dans `content.json`, `private/` et `uploads/`.
- Nettoyage des fichiers devenus inutiles pour OVH mutualisé : suppression de l'ancien
  back-office Node.js (`backoffice/`), du script de déploiement Nginx `deploy.sh` et du
  doublon `.ovhconfig` à la racine.
- `og:image` pointe désormais vers le domaine public `vitrine2026.les-chahuteuses.fr`.
- Correction du clic sur le lien « Réserver ma place » des cartes formats : le calque
  décoratif de survol ne capte plus les événements souris.
- Remplacement des lecteurs YouTube intégrés par des cartes cliquables vers YouTube :
  certaines vidéos refusaient l'affichage en iframe en mode restreint.
- Ajout d'un filtre « moins d'un an » sur les vidéos YouTube : les cartes portent une
  date `data-published` et `site.js` masque automatiquement les vidéos trop anciennes.
- Version du script public passée à `site.js?v=4` pour éviter le cache navigateur.
- Mise à jour de la liste vidéo avec les dernières publications du flux YouTube :
  HdQ 27 - LaRude, Zohra l'exploratrice, Pauline, Féerosse, Djou et Freya.
- Ajout d'un carrousel Instagram sous les vidéos YouTube, compatible OVH sans API
  Instagram : cartes cliquables vers Instagram, navigation précédent/suivant.
- Version du script public passée à `site.js?v=5` pour charger le carrousel.
- Liens Instagram du carrousel et du footer remplacés par `@histoiresdeq`.
- Carrousel Instagram rendu sans fausses images de posts : suppression des anciennes
  images réutilisées en fond, remplacement par des cartes visuelles génériques.
- Remplacement du carrousel Instagram générique par un vrai post `histoiresdeq/p/DYkJtKmt_o-/`
  avec titre dédié et image distante issue des métadonnées Open Graph.
- Suppression de la copie locale de l'image Instagram : le carrousel pointe vers l'image
  CDN fournie par Instagram.
- Ajout de `/api/instagram` : récupération serveur des dernières publications Instagram
  via l'API Graph Meta, cache privé `src/private/instagram-cache.json`, et fallback
  statique si la configuration privée manque.
- Le carrousel Instagram est maintenant rendu depuis `/api/instagram`; version du script
  public passée à `site.js?v=6`.
- Uniformisation des largeurs responsive : les sections principales, l'agenda, les vidéos,
  le carrousel Instagram et le footer utilisent désormais une largeur de page commune
  centrée selon la résolution.
- Le contenu éditable n'est plus écrit dans le fichier versionné `src/content.json` :
  `/api/content` initialise et met à jour `src/private/content.json`, ignoré par Git
  et protégé par `.htaccess`, afin de préserver les modifications faites depuis le site
  lors des redéploiements GitHub.
- Ajout d'un fond mobile vertical `src/img/back_image-mobile.webp` et chargement dédié
  sous 768 px pour éviter le zoom excessif du fond paysage sur smartphone.
- Ajout du fond desktop `src/img/back_image.webp`, utilisé via `image-set()` avec
  fallback PNG, et préchargement des fonds hero desktop/mobile.
- Suppression complète de Google Fonts : les titres et textes utilisent désormais des
  piles de polices système, sans requête externe bloquante.
- Ajustement des piles de polices système pour se rapprocher du rendu précédent :
  Didot/Bodoni pour les titres, Segoe UI/Roboto/Helvetica pour le texte.
- Correction du contraste du footer : textes, liens, mentions légales et lien
  d'administration utilisent une opacité plus élevée sur le fond sombre.
- Correction de la hiérarchie des titres du footer : les titres de colonnes passent
  de `h4` à `h3` pour respecter l'ordre sémantique après les sections `h2`.
- Correction du contraste du bouton de navigation « Billetterie » : texte sombre
  sur fond orange, sans ombre héritée de la navigation transparente.
- Préparation du passage en production : `og:image` pointe désormais vers
  `https://www.leschahuteuses.fr/`.

### Formats en liste gérable + visibilité du header
- **Section « Nos formats »** convertie en liste gérable (`formats[]` dans
  `content.json`), sur le même principe que l'agenda : ajout / suppression /
  édition de chaque format depuis le back-office (emoji, badge, titre,
  description, lien). Les clés `format_cabaret_*` migrent dans la liste.
- **Header** : liens de navigation en blanc sur le hero (illisibles en gris
  auparavant), assombris une fois la page défilée ; idem pour l'icône burger.
- `server.js` : validation de la liste `formats`. Scripts en `?v=3`.
- Affichage des formats sur **2 colonnes**, grille responsive pleine largeur
  (`auto-fit` : 1 format → pleine largeur, 2+ → côte à côte, 1 colonne en mobile).

### Image d'accueil
- Fond du hero remplacé par `img/back_image.png` (bannière « Histoires de Q »,
  récupérée de la branche GitHub `vitrine2026`). Ancien `img/hero.jpg` supprimé,
  `og:image` mis à jour. Cadrage `center / cover`.

### Images d'événements + correction de l'affichage de l'agenda
- **Correction** : seul le 1er événement affichait toutes ses infos ; les suivants
  étaient réduits à date + titre. Désormais **chaque** événement affiche l'info
  complète (horaire, lieu, accès, description, lien, image).
- **Upload d'images d'événements** : nouvelle route `POST /api/upload` (connexion
  requise) — image en base64, validée (PNG/JPG/WebP/GIF, 4 Mo max), stockée dans
  `/var/www/chahuteuses/uploads/`. Champ `image` ajouté au schéma des événements.
- L'éditeur d'agenda gagne un contrôle « Affiche / image » (ajout, remplacement, retrait).
- `deploy.sh` : `--exclude=uploads/` pour ne pas effacer les images au déploiement.
- Scripts versionnés (`site.js?v=2`, `edit.js?v=2`) pour contourner le cache nginx 30 j.
- `server.js` : log de commit git corrigé (« nothing to commit » n'est plus un faux positif).

#### Modifications infra
- **nginx** : vhost `rougedog` — `client_max_body_size 8m` dans `location /api/`
  (sinon nginx bloque les uploads >1 Mo). Sauvegarde : `rougedog.backup-20260521b`.
- **PM2** : `chahuteuses-backoffice` redémarré (server.js modifié).

### Couverture d'édition étendue
- **Tout le texte du site est désormais éditable** : titres et labels de section,
  titres et descriptions des bulles (cartes valeurs, format, missions), libellés des
  boutons, textes du footer — soit 49 zones (contre 12 auparavant).
- Ajout d'un lien discret **« ✏️ Espace édition »** dans le footer (vers `/admin`).
- `edit.js` : lecture via `textContent` pour les champs simples (insensible au
  `text-transform` CSS — les libellés en majuscules ne sont plus enregistrés en majuscules).
- `site.js` / `edit.js` inchangés pour le reste : le système générique `data-field`
  rend l'extension transparente.

### Back-office d'édition en ligne
- Ajout d'un **back-office** permettant de modifier le site directement depuis la page,
  sans toucher au code (textes + agenda multi-événements).
- Nouveau service Node.js `backoffice/` (Express) servi par **PM2** (`chahuteuses-backoffice`,
  `localhost:3002`). Gère `/admin` (connexion, mot de passe partagé) et `/api/content`.
- Le site public reste **statique** : `index.html` + `content.json` servis par nginx,
  hydratés par `js/site.js`. Mode édition inline via `js/edit.js` (chargé seulement si connecté).
- Chaque enregistrement réécrit `content.json` (effet immédiat) et crée un **commit git**.

#### Modifications infra
- **nginx** : vhost `rougedog` — ajout de `location ^~ /admin` et `^~ /api/`
  (proxy vers `127.0.0.1:3002`). Sauvegarde : `rougedog.backup-20260521`.
- **PM2** : nouveau process `chahuteuses-backoffice` (`pm2 save` effectué).
- Aucun changement firewall (port 3002 en localhost ; 4443 déjà ouvert).

### Mise en ligne
- Récupération de la dernière version du collègue (branche GitHub `vitrine2026`) :
  suppression du format « Tendresse & Pyjama », date événement au 22 mai 2026.
- Déploiement `src/` → `/var/www/chahuteuses/`, site en ligne sur `https://qlf.ovh:4443`.
- `deploy.sh` : ajout de `--chmod=D755,F644` (rsync recopiait des permissions trop
  restrictives → nginx renvoyait 403).
- Ajout du fichier `LICENSE` (MIT).
