# Les Chahuteuses — site vitrine

Refonte du site de l'association **Les Chahuteuses**.
Site mono-page HTML/CSS/JS vanilla avec un petit back-office PHP 8 compatible
hébergement web OVH mutualisé.

## Démarrage rapide

Pour consulter la vitrine en local :

```bash
python3 -m http.server -d src 8080
# puis ouvrir http://localhost:8080
```

Le mode édition `/admin` nécessite PHP et les règles Apache `.htaccess`; il est
prévu pour être testé directement sur l'hébergement OVH.

## Déploiement OVH

Le sous-domaine doit pointer vers `src/`, par exemple :

```text
./vitrine2026/src
```

Fichiers importants pour OVH :

- `src/.ovhconfig` sélectionne PHP 8 ;
- `src/.htaccess` route `/admin` et `/api/...` vers le back-office PHP ;
- `/admin` permet de modifier le contenu directement depuis le site ;
- `src/content.json` sert de modèle initial versionné ;
- `src/private/content.json` contient les données réellement modifiées depuis le site ;
- les images téléversées sont stockées dans `src/uploads/`.

Au premier accès à `/admin`, le site demande de créer le mot de passe
d'administration. Il écrit ensuite `src/private/auth.json`, volontairement ignoré
par Git et protégé par `.htaccess`.

Au premier appel à `/api/content`, PHP crée automatiquement
`src/private/content.json` depuis `src/content.json` si le fichier privé n'existe
pas encore. Ensuite, les enregistrements depuis `/admin` modifient uniquement ce
JSON privé non versionné. Un redéploiement GitHub ne doit donc plus écraser les
modifications faites directement sur le site.

Après déploiement, vérifier :

```text
https://vitrine2026.les-chahuteuses.fr/
https://vitrine2026.les-chahuteuses.fr/admin
https://vitrine2026.les-chahuteuses.fr/api/session
```

PHP doit pouvoir écrire dans :

```text
src/private/
src/uploads/
```

## Instagram

La section Instagram est volontairement simple : elle affiche un lien direct vers
le compte `@histoiresdeq`. Le site n'appelle plus l'API Graph Meta et ne dépend
plus de token, cache serveur ou URL d'image Instagram temporaire.

## Performance et cache

Les assets statiques sont servis avec un cache long via `src/.htaccess`. À chaque
modification de `src/js/site.js`, incrémenter la version appelée dans
`src/index.html` (`js/site.js?v=...`) pour forcer les navigateurs à récupérer le
nouveau fichier.

Images principales :

- `src/img/logo-280.webp` — logo affiché dans la page ;
- `src/img/logo-280.png` — fallback PNG, favicon et logo JSON-LD ;
- `src/img/back_image.webp` — fond hero desktop ;
- `src/img/back_image-mobile.webp` — fond hero mobile ;
- `src/img/back_image.png` — fallback CSS et image Open Graph/Twitter.

## Structure

- `src/index.html` — page publique
- `src/content.json` — modèle initial versionné des textes, formats et événements
- `src/js/site.js` — rendu public
- `src/js/edit.js` — mode édition inline
- `src/admin/` — connexion et initialisation du back-office
- `src/api/` — API PHP pour session, contenu et uploads
- `src/lib/` — fonctions PHP communes, non exposées publiquement
- `src/private/` — contenu édité, secrets et caches créés en production, ignorés par Git
- `src/uploads/` — images ajoutées depuis le back-office, ignorées par Git

Voir `CLAUDE.md` pour le contexte complet (déploiement, périmètre, dette technique).
