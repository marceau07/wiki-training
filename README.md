# Wiki Training — wiki local pour apprenants (toutes formations)

Notes, liens, raccourcis et captures d'écran, **100 % en local** (SQLite). Aucune connexion cloud, aucune dépendance à installer.

## Démarrage

1. Installer **Python 3.9+** (https://www.python.org/downloads/, cocher *Add python.exe to PATH*).
2. Double-clic sur **`start.bat`** → le navigateur s'ouvre sur http://localhost:8080.
   (Linux/macOS : `python3 server.py`)

Arrêt : fermer la fenêtre noire (ou Ctrl+C).

## Fonctions

| Fonction | Comment |
|---|---|
| Notes Markdown | titres, listes, tableaux, code avec bouton *Copier*, `[[Titre]]` = lien entre notes |
| Liens | colle une URL sur l'accueil : le titre est récupéré automatiquement |
| Raccourcis locaux | ouvre un dossier, un `.msc`, un script, un partage réseau (confirmation avant ouverture) |
| Images / PDF | Ctrl+V ou glisser-déposer dans une note, ou page *Images & fichiers* |
| Calendrier | ajoute un lien `.ics` / `webcal://` (Google Agenda, Outlook, Moodle…) ou un fichier `.ics` ; vues Mois / Agenda, récurrences, fuseaux, bloc « À venir » sur l'accueil. Fichier de test : `exemple-planning.ics` |
| Favoris | ★ épingle sur l'accueil |
| Recherche | plein texte, insensible aux accents et à la casse (touche `/`) |
| Import | favoris du navigateur (.html), ou lot JSON (partage entre apprenants / formateur) |

## Données et sauvegarde

Tout est dans `data/` : `wiki.db` (SQLite) + `uploads/` (images). **Sauvegarder = copier ce dossier.**
Au premier lancement, `seed.json` pré-remplit une base de départ (pack TSSR : liens + notes modèles, à remplacer par celui de votre formation) ; le formateur peut
l'éditer avant distribution. Supprimer `data/` remet le wiki à zéro.

## Distribution (formateur)

- Distribuer le dossier `wiki/` sans `data/` (zip). Chaque apprenant obtient sa propre base.
- Pour mettre à jour le pack de départ : *Import / export → Exporter* puis remplacer le contenu de `seed.json`
  (les imports ignorent les doublons, donc un apprenant peut aussi importer un JSON à tout moment).

## Sécurité

Le serveur n'écoute que sur `127.0.0.1`, refuse les autres noms d'hôte et exige un en-tête propre à l'application
pour toute modification. Les raccourcis locaux ne s'exécutent qu'après confirmation : **n'importe pas un JSON dont tu
ne connais pas la source** sans avoir vérifié ses raccourcis locaux.

## Structure

```
wiki/
  start.bat      lanceur Windows
  server.py      serveur + API + SQLite (stdlib uniquement)
  seed.json      contenu de départ
  static/        interface (index.html, app.js, style.css)
  data/          créé automatiquement (base + images)
```
