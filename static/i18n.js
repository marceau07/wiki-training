"use strict";
// Traductions de l'interface (fr / en / es). Chargé avant calendar.js et app.js.
// Le contenu des utilisateurs (notes, liens, pack de départ) n'est jamais traduit.
const LANGS = {
  fr: { name: "Français", locale: "fr-FR" },
  en: { name: "English", locale: "en-GB" },
  es: { name: "Español", locale: "es-ES" },
};

const DICT = {
  fr: {
    "search.placeholder": "Rechercher…  ( / )",
    "lang.label": "Langue",
    "kind.note": "Notes", "kind.link": "Liens", "kind.local": "Raccourcis locaux",
    "nav.home": "🏠 Accueil", "nav.favs": "⭐ Favoris", "nav.notes": "📝 Notes", "nav.links": "🔗 Liens",
    "nav.local": "🖥️ Raccourcis locaux", "nav.calendar": "📅 Calendrier", "nav.images": "🖼️ Images & fichiers",
    "nav.tools": "⚙️ Import / export",
    "facet.categories": "Catégories", "facet.tags": "Tags",
    "theme.auto": "🌗 Thème : auto", "theme.light": "☀️ Thème : clair", "theme.dark": "🌙 Thème : sombre",
    "page.notfound": "Page introuvable.", "error.prefix": "Erreur : {msg}", "failed": "Échec : {msg}",
    "missing.title": "Page à créer",
    "card.fav": "Favori", "card.edit": "Modifier",
    "copy": "Copier", "copied": "Copié ✓",
    "open.confirm": "Ouvrir sur cet ordinateur :\n{url}",
    "close": "Fermer", "cancel": "Annuler", "save": "Enregistrer", "delete": "Supprimer",

    "home.title": "Bienvenue 👋",
    "home.sub": "Ton espace de formation : notes, liens, raccourcis et captures, 100 % en local.",
    "home.quick.placeholder": "Colle une adresse https://… puis Entrée : le titre est récupéré automatiquement",
    "home.quick.btn": "Ajouter le lien",
    "btn.note": "+ Note", "btn.link": "+ Lien", "btn.local": "+ Raccourci local",
    "home.shortcuts": "⭐ Mes raccourcis", "home.shortcuts.empty": "Clique sur ☆ sur un lien pour l'épingler ici.",
    "home.recent": "🕘 Derniers ajouts", "home.linkadded": "Lien ajouté : {title}",

    "list.category": "Catégorie : {v}", "list.tag": "Tag : {v}", "list.search": "Recherche : « {v} »", "list.all": "Tout",
    "list.count": "{n} élément(s)", "list.new": "+ Nouveau", "list.empty": "Rien ici pour l'instant.",

    "note.back": "← Notes", "note.edit": "✎ Modifier", "note.modified": "modifié le {date}",
    "note.empty": "Note vide.", "note.confirmdel": "Supprimer cette note ?",

    "edit.new": "Nouveau", "edit.edit": "Modifier",
    "edit.url.link": "Adresse (https://…)",
    "edit.url.local": "Chemin, dossier, programme ou URI (ex : C:\\Labs, compmgmt.msc, \\\\srv\\partage)",
    "edit.title": "Titre", "edit.category": "Catégorie", "edit.category.placeholder": "ex : Windows Server",
    "edit.tags": "Tags (séparés par des virgules)",
    "edit.body.note": "Contenu (Markdown — colle ou glisse une image directement ; [[Titre]] crée un lien vers une autre note)",
    "edit.body.other": "Description / notes",
    "edit.fav": "⭐ Favori (épinglé sur l'accueil)", "edit.image": "📎 Image",
    "edit.fileadded": "Fichier ajouté", "edit.saved": "Enregistré", "edit.confirmdel": "Supprimer cet élément ?",

    "images.title": "Images & fichiers",
    "images.sub": "Captures d'écran, schémas, PDF. Clique « Copier » puis colle dans une note.",
    "images.drop": "Glisse des fichiers ici, colle une capture (Ctrl+V) ou ", "images.choose": "choisir",
    "images.none": "Aucun fichier.", "images.copied": "Copié : colle-le dans une note",
    "images.confirmdel": "Supprimer ce fichier ? (les notes qui l'utilisent perdront l'image)",

    "tools.title": "Import / export", "tools.sub": "Alimente le wiki automatiquement et partage tes ressources.",
    "tools.bm.h": "Importer les favoris du navigateur",
    "tools.bm.p": "Chrome / Edge / Firefox → gestionnaire de favoris → <em>Exporter</em> (fichier .html). Les dossiers deviennent des catégories.",
    "tools.bm.btn": "Choisir le fichier de favoris",
    "tools.json.h": "Importer / exporter en JSON",
    "tools.json.p": "Pour échanger un lot de liens/notes avec un formateur ou un camarade (les doublons sont ignorés).",
    "tools.json.import": "Importer un .json", "tools.json.export": "Exporter tout en .json",
    "tools.backup.h": "Sauvegarde complète",
    "tools.backup.p": "Copie simplement le dossier <code>{dir}</code> (base <code>wiki.db</code> + images dans <code>uploads</code>).",
    "tools.danger.h": "⚠️ Zone de danger",
    "tools.danger.p": "Ces actions sont <strong>définitives</strong>. Pense à <a href=\"/api/export\">exporter une sauvegarde JSON</a> avant (les images ne sont pas incluses dans l'export).",
    "tools.confirmword": "SUPPRIMER",
    "tools.prompt": "{label}\n\n{desc}\n\nTape {word} pour confirmer :",
    "tools.confirm": "{label} ?\n{desc}",
    "tools.cancelled": "Annulé", "tools.done": "Terminé", "tools.doneseed": "Terminé ({n} élément(s) du pack ajoutés)",
    "tools.imported": "{n} élément(s) ajouté(s)", "tools.badjson": "JSON invalide",
    "reset.seed.label": "Restaurer le pack de départ",
    "reset.seed.desc": "Rajoute les liens et notes d'origine manquants, sans rien supprimer.",
    "reset.seed.btn": "Restaurer", "reset.seed.n": "aucune perte",
    "reset.link.label": "Supprimer tous les liens", "reset.link.desc": "Efface tous les liens web.", "reset.link.btn": "Supprimer les liens",
    "reset.note.label": "Supprimer toutes les notes", "reset.note.desc": "Efface toutes les notes.", "reset.note.btn": "Supprimer les notes",
    "reset.local.label": "Supprimer les raccourcis locaux", "reset.local.desc": "Efface tous les raccourcis locaux.", "reset.local.btn": "Supprimer les raccourcis",
    "reset.calendars.label": "Supprimer les calendriers", "reset.calendars.desc": "Retire tous les calendriers (liens et fichiers .ics importés).", "reset.calendars.btn": "Supprimer les calendriers",
    "reset.files.label": "Supprimer images et fichiers", "reset.files.desc": "Efface le contenu du dossier uploads (les notes qui les utilisent perdront leurs images).", "reset.files.btn": "Supprimer les fichiers",
    "reset.factory.label": "Réinitialiser (retour à l'état initial)", "reset.factory.desc": "Efface TOUT puis recharge le pack de départ.", "reset.factory.btn": "Réinitialiser",
    "reset.all.label": "Tout vider", "reset.all.desc": "Efface TOUT, sans pack de départ : wiki complètement vide.", "reset.all.btn": "Tout supprimer",

    "cal.title": "📅 Calendrier",
    "cal.sub": "Affiche un ou plusieurs calendriers au format .ics (planning de formation, Google Agenda, Outlook, Moodle…).",
    "cal.today": "Aujourd'hui", "cal.month": "Mois", "cal.week": "Semaine", "cal.agenda": "Agenda", "cal.add": "+ Calendrier",
    "cal.allday": "Toute la journée", "cal.untitled": "(sans titre)", "cal.day": "Jour",
    "cal.dow": "Lun,Mar,Mer,Jeu,Ven,Sam,Dim",
    "cal.more": "+{n} autre(s)", "cal.nomonthevents": "Aucun événement ce mois-ci.",
    "cal.mine": "Mes calendriers", "cal.none": "Aucun calendrier. Ajoute un lien .ics ou importe un fichier.",
    "cal.file": "fichier", "cal.events": "{n} événement(s)",
    "cal.refresh": "Actualiser", "cal.rename": "Renommer", "cal.link": "Lien",
    "cal.add.h": "Ajouter un calendrier", "cal.add.url": "Lien .ics ou webcal://", "cal.add.file": "…ou fichier .ics",
    "cal.add.name": "Nom (facultatif)", "cal.add.color": "Couleur", "cal.add.btn": "Ajouter",
    "cal.help.sum": "Où trouver le lien ?",
    "cal.help": "Google Agenda : Paramètres du calendrier → « Adresse secrète au format iCal ». Outlook : Calendrier publié → lien ICS. Moodle : Calendrier → Exporter le calendrier. Ton formateur peut aussi te fournir un fichier .ics.",
    "cal.need": "Indique un lien ou choisis un fichier", "cal.added": "Calendrier ajouté", "cal.refreshed": "Calendrier actualisé",
    "cal.renameprompt": "Nouveau nom :", "cal.confirmdel": "Supprimer ce calendrier du wiki ?",
    "cal.upcoming": "📅 À venir (14 jours)",
    "cal.upcoming.none": "Rien de prévu. <a href=\"#/calendar\">Ouvrir le calendrier</a>",

    "err.kind": "Type d'élément invalide", "err.url_required": "L'adresse est obligatoire",
    "err.link_scheme": "Un lien doit commencer par http:// ou https://", "err.title_required": "Le titre est obligatoire",
    "err.scope": "Action invalide", "err.url_invalid": "URL invalide",
    "err.ics_scheme": "L'adresse doit commencer par https:// ou webcal://",
    "err.cal_big": "Calendrier trop volumineux (5 Mo max)",
    "err.ics_bad_url": "Cette adresse ne renvoie pas un calendrier .ics valide",
    "err.ics_invalid": "Adresse .ics invalide (https:// ou webcal://)", "err.cal_notfound": "Calendrier introuvable",
    "err.cal_fetch": "Impossible de récupérer le calendrier : {msg}", "err.method": "Méthode non permise",
    "err.file_big5": "Fichier trop volumineux (5 Mo max)", "err.ics_bad_file": "Ce fichier n'est pas un calendrier .ics valide",
    "err.shortcut_notfound": "Raccourci introuvable", "err.json": "JSON invalide", "err.notfound": "Introuvable",
    "err.filetype": "Type de fichier non supporté (png, jpg, gif, webp, pdf)", "err.file_big25": "Fichier trop gros (25 Mo max)",
    "err.host": "Hôte refusé", "err.denied": "Requête refusée", "err.internal": "Erreur interne : {msg}",
  },

  en: {
    "search.placeholder": "Search…  ( / )",
    "lang.label": "Language",
    "kind.note": "Notes", "kind.link": "Links", "kind.local": "Local shortcuts",
    "nav.home": "🏠 Home", "nav.favs": "⭐ Favorites", "nav.notes": "📝 Notes", "nav.links": "🔗 Links",
    "nav.local": "🖥️ Local shortcuts", "nav.calendar": "📅 Calendar", "nav.images": "🖼️ Images & files",
    "nav.tools": "⚙️ Import / export",
    "facet.categories": "Categories", "facet.tags": "Tags",
    "theme.auto": "🌗 Theme: auto", "theme.light": "☀️ Theme: light", "theme.dark": "🌙 Theme: dark",
    "page.notfound": "Page not found.", "error.prefix": "Error: {msg}", "failed": "Failed: {msg}",
    "missing.title": "Page to create",
    "card.fav": "Favorite", "card.edit": "Edit",
    "copy": "Copy", "copied": "Copied ✓",
    "open.confirm": "Open on this computer:\n{url}",
    "close": "Close", "cancel": "Cancel", "save": "Save", "delete": "Delete",

    "home.title": "Welcome 👋",
    "home.sub": "Your training space: notes, links, shortcuts and screenshots, 100% local.",
    "home.quick.placeholder": "Paste an https://… address then press Enter: the title is fetched automatically",
    "home.quick.btn": "Add link",
    "btn.note": "+ Note", "btn.link": "+ Link", "btn.local": "+ Local shortcut",
    "home.shortcuts": "⭐ My shortcuts", "home.shortcuts.empty": "Click ☆ on a link to pin it here.",
    "home.recent": "🕘 Recently added", "home.linkadded": "Link added: {title}",

    "list.category": "Category: {v}", "list.tag": "Tag: {v}", "list.search": "Search: “{v}”", "list.all": "All",
    "list.count": "{n} item(s)", "list.new": "+ New", "list.empty": "Nothing here yet.",

    "note.back": "← Notes", "note.edit": "✎ Edit", "note.modified": "modified on {date}",
    "note.empty": "Empty note.", "note.confirmdel": "Delete this note?",

    "edit.new": "New", "edit.edit": "Edit",
    "edit.url.link": "Address (https://…)",
    "edit.url.local": "Path, folder, program or URI (e.g. C:\\Labs, compmgmt.msc, \\\\srv\\share)",
    "edit.title": "Title", "edit.category": "Category", "edit.category.placeholder": "e.g. Windows Server",
    "edit.tags": "Tags (comma-separated)",
    "edit.body.note": "Content (Markdown — paste or drop an image directly; [[Title]] links to another note)",
    "edit.body.other": "Description / notes",
    "edit.fav": "⭐ Favorite (pinned on the home page)", "edit.image": "📎 Image",
    "edit.fileadded": "File added", "edit.saved": "Saved", "edit.confirmdel": "Delete this item?",

    "images.title": "Images & files",
    "images.sub": "Screenshots, diagrams, PDFs. Click “Copy” then paste into a note.",
    "images.drop": "Drop files here, paste a screenshot (Ctrl+V) or ", "images.choose": "browse",
    "images.none": "No files.", "images.copied": "Copied: paste it into a note",
    "images.confirmdel": "Delete this file? (notes using it will lose the image)",

    "tools.title": "Import / export", "tools.sub": "Fill the wiki automatically and share your resources.",
    "tools.bm.h": "Import browser bookmarks",
    "tools.bm.p": "Chrome / Edge / Firefox → bookmark manager → <em>Export</em> (.html file). Folders become categories.",
    "tools.bm.btn": "Choose the bookmarks file",
    "tools.json.h": "Import / export as JSON",
    "tools.json.p": "To exchange a batch of links/notes with a trainer or a classmate (duplicates are ignored).",
    "tools.json.import": "Import a .json", "tools.json.export": "Export everything as .json",
    "tools.backup.h": "Full backup",
    "tools.backup.p": "Simply copy the folder <code>{dir}</code> (<code>wiki.db</code> database + images in <code>uploads</code>).",
    "tools.danger.h": "⚠️ Danger zone",
    "tools.danger.p": "These actions are <strong>permanent</strong>. Remember to <a href=\"/api/export\">export a JSON backup</a> first (images are not included in the export).",
    "tools.confirmword": "DELETE",
    "tools.prompt": "{label}\n\n{desc}\n\nType {word} to confirm:",
    "tools.confirm": "{label}?\n{desc}",
    "tools.cancelled": "Cancelled", "tools.done": "Done", "tools.doneseed": "Done ({n} item(s) from the pack added)",
    "tools.imported": "{n} item(s) added", "tools.badjson": "Invalid JSON",
    "reset.seed.label": "Restore the starter pack",
    "reset.seed.desc": "Re-adds any missing original links and notes, without deleting anything.",
    "reset.seed.btn": "Restore", "reset.seed.n": "no loss",
    "reset.link.label": "Delete all links", "reset.link.desc": "Deletes all web links.", "reset.link.btn": "Delete links",
    "reset.note.label": "Delete all notes", "reset.note.desc": "Deletes all notes.", "reset.note.btn": "Delete notes",
    "reset.local.label": "Delete local shortcuts", "reset.local.desc": "Deletes all local shortcuts.", "reset.local.btn": "Delete shortcuts",
    "reset.calendars.label": "Delete calendars", "reset.calendars.desc": "Removes all calendars (links and imported .ics files).", "reset.calendars.btn": "Delete calendars",
    "reset.files.label": "Delete images and files", "reset.files.desc": "Deletes the contents of the uploads folder (notes using them will lose their images).", "reset.files.btn": "Delete files",
    "reset.factory.label": "Reset (back to initial state)", "reset.factory.desc": "Deletes EVERYTHING then reloads the starter pack.", "reset.factory.btn": "Reset",
    "reset.all.label": "Empty everything", "reset.all.desc": "Deletes EVERYTHING, with no starter pack: a completely empty wiki.", "reset.all.btn": "Delete everything",

    "cal.title": "📅 Calendar",
    "cal.sub": "Shows one or more calendars in .ics format (training schedule, Google Calendar, Outlook, Moodle…).",
    "cal.today": "Today", "cal.month": "Month", "cal.week": "Week", "cal.agenda": "Agenda", "cal.add": "+ Calendar",
    "cal.allday": "All day", "cal.untitled": "(untitled)", "cal.day": "Day",
    "cal.dow": "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    "cal.more": "+{n} more", "cal.nomonthevents": "No events this month.",
    "cal.mine": "My calendars", "cal.none": "No calendars. Add an .ics link or import a file.",
    "cal.file": "file", "cal.events": "{n} event(s)",
    "cal.refresh": "Refresh", "cal.rename": "Rename", "cal.link": "Link",
    "cal.add.h": "Add a calendar", "cal.add.url": ".ics or webcal:// link", "cal.add.file": "…or .ics file",
    "cal.add.name": "Name (optional)", "cal.add.color": "Color", "cal.add.btn": "Add",
    "cal.help.sum": "Where to find the link?",
    "cal.help": "Google Calendar: Calendar settings → “Secret address in iCal format”. Outlook: Published calendar → ICS link. Moodle: Calendar → Export calendar. Your trainer can also give you an .ics file.",
    "cal.need": "Enter a link or choose a file", "cal.added": "Calendar added", "cal.refreshed": "Calendar refreshed",
    "cal.renameprompt": "New name:", "cal.confirmdel": "Remove this calendar from the wiki?",
    "cal.upcoming": "📅 Coming up (14 days)",
    "cal.upcoming.none": "Nothing planned. <a href=\"#/calendar\">Open the calendar</a>",

    "err.kind": "Invalid item type", "err.url_required": "The address is required",
    "err.link_scheme": "A link must start with http:// or https://", "err.title_required": "The title is required",
    "err.scope": "Invalid action", "err.url_invalid": "Invalid URL",
    "err.ics_scheme": "The address must start with https:// or webcal://",
    "err.cal_big": "Calendar too large (5 MB max)",
    "err.ics_bad_url": "This address does not return a valid .ics calendar",
    "err.ics_invalid": "Invalid .ics address (https:// or webcal://)", "err.cal_notfound": "Calendar not found",
    "err.cal_fetch": "Unable to fetch the calendar: {msg}", "err.method": "Method not allowed",
    "err.file_big5": "File too large (5 MB max)", "err.ics_bad_file": "This file is not a valid .ics calendar",
    "err.shortcut_notfound": "Shortcut not found", "err.json": "Invalid JSON", "err.notfound": "Not found",
    "err.filetype": "Unsupported file type (png, jpg, gif, webp, pdf)", "err.file_big25": "File too large (25 MB max)",
    "err.host": "Host refused", "err.denied": "Request refused", "err.internal": "Internal error: {msg}",
  },

  es: {
    "search.placeholder": "Buscar…  ( / )",
    "lang.label": "Idioma",
    "kind.note": "Notas", "kind.link": "Enlaces", "kind.local": "Accesos directos locales",
    "nav.home": "🏠 Inicio", "nav.favs": "⭐ Favoritos", "nav.notes": "📝 Notas", "nav.links": "🔗 Enlaces",
    "nav.local": "🖥️ Accesos directos locales", "nav.calendar": "📅 Calendario", "nav.images": "🖼️ Imágenes y archivos",
    "nav.tools": "⚙️ Importar / exportar",
    "facet.categories": "Categorías", "facet.tags": "Etiquetas",
    "theme.auto": "🌗 Tema: automático", "theme.light": "☀️ Tema: claro", "theme.dark": "🌙 Tema: oscuro",
    "page.notfound": "Página no encontrada.", "error.prefix": "Error: {msg}", "failed": "Fallo: {msg}",
    "missing.title": "Página por crear",
    "card.fav": "Favorito", "card.edit": "Editar",
    "copy": "Copiar", "copied": "Copiado ✓",
    "open.confirm": "Abrir en este equipo:\n{url}",
    "close": "Cerrar", "cancel": "Cancelar", "save": "Guardar", "delete": "Eliminar",

    "home.title": "Bienvenido 👋",
    "home.sub": "Tu espacio de formación: notas, enlaces, accesos directos y capturas, 100 % en local.",
    "home.quick.placeholder": "Pega una dirección https://… y pulsa Intro: el título se obtiene automáticamente",
    "home.quick.btn": "Añadir enlace",
    "btn.note": "+ Nota", "btn.link": "+ Enlace", "btn.local": "+ Acceso directo local",
    "home.shortcuts": "⭐ Mis accesos directos", "home.shortcuts.empty": "Haz clic en ☆ en un enlace para fijarlo aquí.",
    "home.recent": "🕘 Últimas incorporaciones", "home.linkadded": "Enlace añadido: {title}",

    "list.category": "Categoría: {v}", "list.tag": "Etiqueta: {v}", "list.search": "Búsqueda: «{v}»", "list.all": "Todo",
    "list.count": "{n} elemento(s)", "list.new": "+ Nuevo", "list.empty": "Nada por aquí todavía.",

    "note.back": "← Notas", "note.edit": "✎ Editar", "note.modified": "modificado el {date}",
    "note.empty": "Nota vacía.", "note.confirmdel": "¿Eliminar esta nota?",

    "edit.new": "Nuevo", "edit.edit": "Editar",
    "edit.url.link": "Dirección (https://…)",
    "edit.url.local": "Ruta, carpeta, programa o URI (p. ej.: C:\\Labs, compmgmt.msc, \\\\srv\\recurso)",
    "edit.title": "Título", "edit.category": "Categoría", "edit.category.placeholder": "p. ej.: Windows Server",
    "edit.tags": "Etiquetas (separadas por comas)",
    "edit.body.note": "Contenido (Markdown — pega o arrastra una imagen directamente; [[Título]] crea un enlace a otra nota)",
    "edit.body.other": "Descripción / notas",
    "edit.fav": "⭐ Favorito (fijado en el inicio)", "edit.image": "📎 Imagen",
    "edit.fileadded": "Archivo añadido", "edit.saved": "Guardado", "edit.confirmdel": "¿Eliminar este elemento?",

    "images.title": "Imágenes y archivos",
    "images.sub": "Capturas de pantalla, esquemas, PDF. Haz clic en «Copiar» y pega en una nota.",
    "images.drop": "Arrastra archivos aquí, pega una captura (Ctrl+V) o ", "images.choose": "elegir",
    "images.none": "Ningún archivo.", "images.copied": "Copiado: pégalo en una nota",
    "images.confirmdel": "¿Eliminar este archivo? (las notas que lo usan perderán la imagen)",

    "tools.title": "Importar / exportar", "tools.sub": "Alimenta el wiki automáticamente y comparte tus recursos.",
    "tools.bm.h": "Importar los favoritos del navegador",
    "tools.bm.p": "Chrome / Edge / Firefox → administrador de favoritos → <em>Exportar</em> (archivo .html). Las carpetas se convierten en categorías.",
    "tools.bm.btn": "Elegir el archivo de favoritos",
    "tools.json.h": "Importar / exportar en JSON",
    "tools.json.p": "Para intercambiar un lote de enlaces/notas con un formador o un compañero (los duplicados se ignoran).",
    "tools.json.import": "Importar un .json", "tools.json.export": "Exportar todo en .json",
    "tools.backup.h": "Copia de seguridad completa",
    "tools.backup.p": "Copia simplemente la carpeta <code>{dir}</code> (base de datos <code>wiki.db</code> + imágenes en <code>uploads</code>).",
    "tools.danger.h": "⚠️ Zona de peligro",
    "tools.danger.p": "Estas acciones son <strong>definitivas</strong>. Recuerda <a href=\"/api/export\">exportar una copia JSON</a> antes (las imágenes no se incluyen en la exportación).",
    "tools.confirmword": "ELIMINAR",
    "tools.prompt": "{label}\n\n{desc}\n\nEscribe {word} para confirmar:",
    "tools.confirm": "¿{label}?\n{desc}",
    "tools.cancelled": "Cancelado", "tools.done": "Hecho", "tools.doneseed": "Hecho ({n} elemento(s) del paquete añadidos)",
    "tools.imported": "{n} elemento(s) añadidos", "tools.badjson": "JSON no válido",
    "reset.seed.label": "Restaurar el paquete inicial",
    "reset.seed.desc": "Vuelve a añadir los enlaces y notas originales que falten, sin eliminar nada.",
    "reset.seed.btn": "Restaurar", "reset.seed.n": "sin pérdida",
    "reset.link.label": "Eliminar todos los enlaces", "reset.link.desc": "Borra todos los enlaces web.", "reset.link.btn": "Eliminar enlaces",
    "reset.note.label": "Eliminar todas las notas", "reset.note.desc": "Borra todas las notas.", "reset.note.btn": "Eliminar notas",
    "reset.local.label": "Eliminar los accesos directos locales", "reset.local.desc": "Borra todos los accesos directos locales.", "reset.local.btn": "Eliminar accesos",
    "reset.calendars.label": "Eliminar los calendarios", "reset.calendars.desc": "Quita todos los calendarios (enlaces y archivos .ics importados).", "reset.calendars.btn": "Eliminar calendarios",
    "reset.files.label": "Eliminar imágenes y archivos", "reset.files.desc": "Borra el contenido de la carpeta uploads (las notas que los usan perderán sus imágenes).", "reset.files.btn": "Eliminar archivos",
    "reset.factory.label": "Restablecer (volver al estado inicial)", "reset.factory.desc": "Borra TODO y vuelve a cargar el paquete inicial.", "reset.factory.btn": "Restablecer",
    "reset.all.label": "Vaciarlo todo", "reset.all.desc": "Borra TODO, sin paquete inicial: wiki completamente vacío.", "reset.all.btn": "Eliminar todo",

    "cal.title": "📅 Calendario",
    "cal.sub": "Muestra uno o varios calendarios en formato .ics (planificación de la formación, Google Calendar, Outlook, Moodle…).",
    "cal.today": "Hoy", "cal.month": "Mes", "cal.week": "Semana", "cal.agenda": "Agenda", "cal.add": "+ Calendario",
    "cal.allday": "Todo el día", "cal.untitled": "(sin título)", "cal.day": "Día",
    "cal.dow": "Lun,Mar,Mié,Jue,Vie,Sáb,Dom",
    "cal.more": "+{n} más", "cal.nomonthevents": "No hay eventos este mes.",
    "cal.mine": "Mis calendarios", "cal.none": "Ningún calendario. Añade un enlace .ics o importa un archivo.",
    "cal.file": "archivo", "cal.events": "{n} evento(s)",
    "cal.refresh": "Actualizar", "cal.rename": "Renombrar", "cal.link": "Enlace",
    "cal.add.h": "Añadir un calendario", "cal.add.url": "Enlace .ics o webcal://", "cal.add.file": "…o archivo .ics",
    "cal.add.name": "Nombre (opcional)", "cal.add.color": "Color", "cal.add.btn": "Añadir",
    "cal.help.sum": "¿Dónde encontrar el enlace?",
    "cal.help": "Google Calendar: Configuración del calendario → «Dirección secreta en formato iCal». Outlook: Calendario publicado → enlace ICS. Moodle: Calendario → Exportar calendario. Tu formador también puede darte un archivo .ics.",
    "cal.need": "Indica un enlace o elige un archivo", "cal.added": "Calendario añadido", "cal.refreshed": "Calendario actualizado",
    "cal.renameprompt": "Nuevo nombre:", "cal.confirmdel": "¿Quitar este calendario del wiki?",
    "cal.upcoming": "📅 Próximamente (14 días)",
    "cal.upcoming.none": "Nada previsto. <a href=\"#/calendar\">Abrir el calendario</a>",

    "err.kind": "Tipo de elemento no válido", "err.url_required": "La dirección es obligatoria",
    "err.link_scheme": "Un enlace debe empezar por http:// o https://", "err.title_required": "El título es obligatorio",
    "err.scope": "Acción no válida", "err.url_invalid": "URL no válida",
    "err.ics_scheme": "La dirección debe empezar por https:// o webcal://",
    "err.cal_big": "Calendario demasiado grande (5 MB máx.)",
    "err.ics_bad_url": "Esta dirección no devuelve un calendario .ics válido",
    "err.ics_invalid": "Dirección .ics no válida (https:// o webcal://)", "err.cal_notfound": "Calendario no encontrado",
    "err.cal_fetch": "No se pudo obtener el calendario: {msg}", "err.method": "Método no permitido",
    "err.file_big5": "Archivo demasiado grande (5 MB máx.)", "err.ics_bad_file": "Este archivo no es un calendario .ics válido",
    "err.shortcut_notfound": "Acceso directo no encontrado", "err.json": "JSON no válido", "err.notfound": "No encontrado",
    "err.filetype": "Tipo de archivo no admitido (png, jpg, gif, webp, pdf)", "err.file_big25": "Archivo demasiado grande (25 MB máx.)",
    "err.host": "Host rechazado", "err.denied": "Solicitud rechazada", "err.internal": "Error interno: {msg}",
  },
};

// ------------------------------------------------------------ langue courante
function detectLang() {
  try { const s = localStorage.getItem("lang"); if (LANGS[s]) return s; } catch { }
  const b = (navigator.language || "fr").slice(0, 2).toLowerCase();
  return LANGS[b] ? b : "fr";
}
let LANG = detectLang();

const locale = () => LANGS[LANG].locale;
function t(key, params) {
  const s = DICT[LANG][key] ?? DICT.fr[key] ?? key;
  return params ? s.replace(/\{(\w+)\}/g, (m, k) => params[k] ?? m) : s;
}
// Message d'erreur d'une réponse API : traduit via la clé fournie par le serveur, sinon texte brut.
const apiMessage = (data, fallback) => (data && data.key && (DICT[LANG]["err." + data.key] ?? DICT.fr["err." + data.key]) ? t("err." + data.key, data.params) : data?.error) || fallback;

const fmtDateTime = iso => { const d = new Date(iso); return isNaN(d) ? iso : d.toLocaleString(locale(), { dateStyle: "long", timeStyle: "short" }); };

// Textes statiques de index.html : data-i18n (texte), data-i18n-placeholder, data-i18n-aria-label.
function applyStaticI18n() {
  document.documentElement.lang = LANG;
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  document.querySelectorAll("[data-i18n-aria-label]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel)); });
  const sel = document.getElementById("langsel");
  if (sel) sel.value = LANG;
}
function setLang(l) {
  if (!LANGS[l] || l === LANG) return;
  LANG = l;
  try { localStorage.setItem("lang", l); } catch { }
  applyStaticI18n();
  document.dispatchEvent(new Event("langchange"));
}
