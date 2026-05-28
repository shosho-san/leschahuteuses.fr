# Notes pour les prochaines évolutions

Ce site est une page HTML/CSS/JS vanilla servie depuis `src/`, avec un petit
back-office PHP compatible OVH mutualisé.

## Règles importantes

- Après chaque modification de `src/js/site.js`, incrémenter la version appelée
  dans `src/index.html` :
  `js/site.js?v=10` -> `js/site.js?v=11`, etc.
- Faire la même chose pour `src/js/edit.js` si ce fichier change :
  `js/edit.js?v=...`.
- Les assets statiques ont un cache long dans `src/.htaccess`; ne pas remplacer
  une image ou un fichier versionné sans changer son nom ou sa version d'appel.
- Pour les images affichées dans la page, préférer WebP avec fallback PNG via
  `<picture>`.
- Conserver `back_image.png` tant qu'il est utilisé comme fallback CSS et image
  Open Graph/Twitter.
- Ne pas réintroduire l'API Instagram Meta : la section Instagram est un simple
  lien vers `@histoiresdeq`.
- Ne pas supprimer `src/private/.htaccess` ni `src/uploads/.htaccess`; ils sont
  versionnés volontairement alors que le contenu des dossiers est ignoré.
- Ne pas écraser `src/private/content.json` en production : c'est le contenu
  réellement modifié depuis le back-office.

## Vérifications utiles après modification

- Vérifier les références cassées avec `rg`.
- Tester `https://www-rec.leschahuteuses.fr/` avant `https://www.leschahuteuses.fr/`.
- Contrôler que `/api/content` répond encore.
- Refaire un test Edge/PageSpeed si la modification touche le premier écran,
  les images, le cache ou `site.js`.
