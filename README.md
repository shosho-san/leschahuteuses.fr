# Les Chahuteuses — site vitrine

Site vitrine de l'association **Les Chahuteuses**.
Site mono-page HTML/CSS/JS vanilla avec un petit back-office PHP 8 compatible
hébergement web OVH mutualisé.

Branches actives :

- `main` : branche principale / production ;
- `rec` : branche de recette ;
- `vitrine2026` : ancienne branche de travail, fermée après intégration dans `main` et `rec`.

## Démarrage rapide

Pour consulter la vitrine en local :

```bash
python3 -m http.server -d src 8080
# puis ouvrir http://localhost:8080
```

Le mode édition `/admin` nécessite PHP et les règles Apache `.htaccess`; il est
prévu pour être testé directement sur l'hébergement OVH.

## Workflow Git

Le site est maintenu directement depuis `main` et `rec`.

```bash
git switch main
git pull origin main

# modification des fichiers
git add -A
git commit -m "Description du changement"

git push origin main
git switch rec
git merge --ff-only main
git push origin rec
```

Avant de pousser, vérifier l'état local :

```bash
git status --short --branch
```

## Déploiement OVH

Le domaine ou sous-domaine doit pointer vers `src/`, par exemple :

```text
./leschahuteuses.fr/src
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
https://<domaine>/
https://<domaine>/admin
https://<domaine>/api/session
```

PHP doit pouvoir écrire dans :

```text
src/private/
src/uploads/
```

## Instagram automatique

Le carrousel Instagram appelle `/api/instagram`. Pour récupérer automatiquement
les dernières publications, créer sur OVH un fichier privé non versionné :

```text
src/private/instagram.php
```

Contenu attendu :

```php
<?php
return [
  'ig_user_id' => 'ID_DU_COMPTE_INSTAGRAM',
  'access_token' => 'TOKEN_META_LONG_LIVED',
  'limit' => 6,
  'cache_ttl' => 3600,
];
```

Le token reste côté serveur. PHP met les résultats en cache dans
`src/private/instagram-cache.json`. Si la configuration manque ou si l'API échoue,
le site garde une carte de secours.

## Liens externes

- Billetterie HelloAsso : lien direct dans la navigation, l'agenda et le footer.
- Newsletter Mailchimp : lien direct dans la navigation et le footer, ouvert dans un nouvel onglet.
- YouTube et réseaux sociaux : liens publics depuis la page.

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
