"use strict";
const $ = (s, el = document) => el.querySelector(s);
const h = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const KIND = { note: "Notes", link: "Liens", local: "Raccourcis locaux" };
const S = { meta: null, titles: new Map() };

async function api(path, { method = "GET", json, body, headers = {} } = {}) {
  const o = { method, headers: { ...headers }, body };
  if (method !== "GET") o.headers["X-Wiki"] = "1";
  if (json !== undefined) { o.body = JSON.stringify(json); o.headers["Content-Type"] = "application/json"; }
  const r = await fetch("/api" + path, o);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || r.statusText);
  return data;
}
function toast(msg) {
  const t = Object.assign(document.createElement("div"), { className: "toast", textContent: msg });
  document.body.append(t); setTimeout(() => t.remove(), 2200);
}
const go = hash => { location.hash = hash; };
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

// ------------------------------------------------------------ Markdown minimal (hors-ligne)
const safeUrl = u => /^(https?:\/\/|\/files\/|#)/i.test(u);
function inline(t) {
  const keep = [];
  t = t.replace(/`([^`]+)`/g, (m, c) => { keep.push(`<code>${h(c)}</code>`); return `\u0001${keep.length - 1}\u0001`; });
  t = h(t);
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, a, u) => safeUrl(u) ? `<img src="${u}" alt="${a}">` : m);
  t = t.replace(/\[\[([^\]]+)\]\]/g, (m, n) => {
    const it = S.titles.get(n.trim().toLowerCase());
    return it ? `<a href="#/note/${it}">${n}</a>`
      : `<a class="missing" title="Page à créer" href="#/edit/new?kind=note&title=${encodeURIComponent(n.replace(/&amp;/g, "&"))}">${n}</a>`;
  });
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, a, u) => safeUrl(u) ? `<a href="${u}" ${u[0] === "#" ? "" : 'target="_blank" rel="noopener"'}>${a}</a>` : m);
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*\w])\*([^*]+)\*/g, "$1<em>$2</em>");
  return t.replace(/\u0001(\d+)\u0001/g, (m, i) => keep[i]);
}
function md(src) {
  const blocks = [];
  src = src.replace(/\r/g, "").replace(/```[^\n]*\n([\s\S]*?)```/g, (m, c) => {
    blocks.push(`<pre><button class="copy">Copier</button><code>${h(c.replace(/\n$/, ""))}</code></pre>`);
    return `\n\u0002${blocks.length - 1}\u0002\n`;
  });
  const L = src.split("\n"), out = [];
  for (let i = 0; i < L.length;) {
    const l = L[i];
    let m;
    if (!l.trim()) { i++; continue; }
    if ((m = l.match(/^\u0002(\d+)\u0002$/))) { out.push(blocks[m[1]]); i++; continue; }
    if ((m = l.match(/^(#{1,4})\s+(.*)/))) { out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); i++; continue; }
    if (/^(-{3,}|\*{3,})$/.test(l.trim())) { out.push("<hr>"); i++; continue; }
    if (/^>\s?/.test(l)) {
      const q = []; while (i < L.length && /^>\s?/.test(L[i])) q.push(L[i++].replace(/^>\s?/, ""));
      out.push(`<blockquote>${inline(q.join("<br>"))}</blockquote>`); continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(l)) {
      const ord = /^\s*\d+\./.test(l), its = [];
      while (i < L.length && /^\s*([-*]|\d+\.)\s+/.test(L[i])) its.push(`<li>${inline(L[i++].replace(/^\s*([-*]|\d+\.)\s+/, ""))}</li>`);
      out.push(`<${ord ? "ol" : "ul"}>${its.join("")}</${ord ? "ol" : "ul"}>`); continue;
    }
    if (l.includes("|") && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(L[i + 1] || "")) {
      const cells = r => r.trim().replace(/^\||\|$/g, "").split("|").map(c => inline(c.trim()));
      const head = cells(l); i += 2; const rows = [];
      while (i < L.length && L[i].includes("|")) rows.push(cells(L[i++]));
      out.push(`<table><thead><tr>${head.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`); continue;
    }
    const p = []; while (i < L.length && L[i].trim() && !/^(#{1,4}\s|>|\u0002|\s*([-*]|\d+\.)\s)/.test(L[i])) p.push(L[i++]);
    out.push(`<p>${inline(p.join("<br>"))}</p>`);
  }
  return out.join("\n");
}

// ------------------------------------------------------------ données & navigation
async function refresh() {
  const [meta, notes] = await Promise.all([api("/meta"), api("/items?kind=note")]);
  S.meta = meta;
  S.titles = new Map(notes.map(n => [n.title.toLowerCase(), n.id]));
}
function route() {
  const [path, qs] = (location.hash.slice(1) || "/").split("?");
  return { parts: path.split("/").filter(Boolean), q: new URLSearchParams(qs || "") };
}
function renderSide(q, parts) {
  const c = S.meta.counts, cur = parts[0] === "list" ? q.get("kind") || "" : null;
  const nav = [["#/", "🏠 Accueil", "", parts.length === 0],
    ["#/list?fav=1", "⭐ Favoris", "", parts[0] === "list" && q.get("fav")],
    ["#/list?kind=note", "📝 Notes", c.note, cur === "note" && !q.get("fav")],
    ["#/list?kind=link", "🔗 Liens", c.link, cur === "link" && !q.get("fav")],
    ["#/list?kind=local", "🖥️ Raccourcis locaux", c.local, cur === "local" && !q.get("fav")],
    ["#/images", "🖼️ Images & fichiers", c.file, parts[0] === "images"],
    ["#/tools", "⚙️ Import / export", "", parts[0] === "tools"]];
  $("#nav").innerHTML = nav.map(([href, label, n, on]) => `<a href="${href}" class="${on ? "on" : ""}"><span>${label}</span><small>${n}</small></a>`).join("");
  const facet = (title, arr, key) => arr.length ? `<div class="facet"><h4>${title}</h4>${arr.map(x =>
    `<a href="#/list?${key}=${encodeURIComponent(x.name)}" class="${q.get(key) === x.name ? "on" : ""}"><span>${h(x.name)}</span><small>${x.count}</small></a>`).join("")}</div>` : "";
  $("#facets").innerHTML = facet("Catégories", S.meta.categories, "category") + facet("Tags", S.meta.tags, "tag");
}

async function render() {
  const { parts, q } = route();
  const main = $("#main");
  document.onpaste = null;
  try {
    await refresh();
    renderSide(q, parts);
    const [p, id] = parts;
    if (!p) await pageHome(main);
    else if (p === "list") await pageList(main, q);
    else if (p === "note") await pageNote(main, id);
    else if (p === "edit") await pageEdit(main, id, q);
    else if (p === "images") await pageImages(main);
    else if (p === "tools") pageTools(main);
    else main.innerHTML = `<p class="empty">Page introuvable.</p>`;
  } catch (e) { main.innerHTML = `<p class="empty">Erreur : ${h(e.message)}</p>`; }
  window.scrollTo(0, 0);
}

// ------------------------------------------------------------ cartes
function card(it) {
  const star = `<button data-fav="${it.id}" class="${it.favorite ? "fav-on" : ""}" title="Favori">${it.favorite ? "★" : "☆"}</button>`;
  const acts = `<span class="acts">${star}<button data-edit="${it.id}" title="Modifier">✎</button></span>`;
  const tags = it.tags.length ? `<div class="tags">${it.tags.map(t => `<span class="tag">${h(t)}</span>`).join("")}</div>` : "";
  const cat = it.category ? `<span class="cat">${h(it.category)}</span>` : "";
  const ico = `<span class="ico">${h([...it.title][0]?.toUpperCase() || "?")}</span>`;
  if (it.kind === "note")
    return `<div class="card" data-note="${it.id}">${acts}<span class="t">📝 ${h(it.title)}</span><span class="ex">${h(it.excerpt.replace(/[#*`>|-]/g, ""))}</span>${cat}${tags}</div>`;
  return `<div class="card tile" data-open="${it.id}" data-kind="${it.kind}" data-url="${h(it.url)}">${acts}${ico}<div><span class="t">${h(it.title)}</span><br><span class="u">${it.kind === "link" ? h(host(it.url)) : "🖥️ " + h(it.url)}</span>${cat}${tags}</div></div>`;
}
document.addEventListener("click", async e => {
  const el = e.target;
  if (el.matches(".copy")) { await navigator.clipboard.writeText(el.nextElementSibling.textContent); el.textContent = "Copié ✓"; setTimeout(() => el.textContent = "Copier", 1500); return; }
  const fav = el.closest("[data-fav]");
  if (fav) {
    e.stopPropagation();
    const it = await api(`/items/${fav.dataset.fav}`);
    await api(`/items/${it.id}`, { method: "PUT", json: { favorite: !it.favorite } }); return render();
  }
  const ed = el.closest("[data-edit]");
  if (ed) { e.stopPropagation(); return go(`#/edit/${ed.dataset.edit}`); }
  const c = el.closest("[data-open],[data-note]");
  if (!c) return;
  if (c.dataset.note) return go(`#/note/${c.dataset.note}`);
  if (c.dataset.kind === "link") return window.open(c.dataset.url, "_blank", "noopener");
  if (confirm(`Ouvrir sur cet ordinateur :\n${c.dataset.url}`))
    api(`/open/${c.dataset.open}`, { method: "POST" }).catch(err => toast("Échec : " + err.message));
});

// ------------------------------------------------------------ pages
async function pageHome(main) {
  const [favs, recent] = await Promise.all([api("/items?fav=1"), api("/items")]);
  const shortcuts = favs.filter(i => i.kind !== "note");
  main.innerHTML = `<img class="banner" src="/image1.png" alt="We are Be Web"><h1>Bienvenue 👋</h1><p class="sub">Ton espace de formation : notes, liens, raccourcis et captures, 100 % en local.</p>
  <form class="quick" id="quick"><input name="url" placeholder="Colle une adresse https://… puis Entrée : le titre est récupéré automatiquement"><button class="primary">Ajouter le lien</button></form>
  <div class="bar"><a class="btn primary" href="#/edit/new?kind=note">+ Note</a><a class="btn" href="#/edit/new?kind=link">+ Lien</a><a class="btn" href="#/edit/new?kind=local">+ Raccourci local</a></div>
  <h2>⭐ Mes raccourcis</h2>${shortcuts.length ? `<div class="grid">${shortcuts.map(card).join("")}</div>` : `<p class="empty">Clique sur ☆ sur un lien pour l'épingler ici.</p>`}
  <h2>🕘 Derniers ajouts</h2><div class="grid">${recent.slice(0, 12).map(card).join("")}</div>`;
  $("#quick").onsubmit = async e => {
    e.preventDefault();
    let url = new FormData(e.target).get("url").trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    try {
      const { title } = await api("/fetch-title", { method: "POST", json: { url } });
      await api("/items", { method: "POST", json: { kind: "link", url, title: title || url } });
      toast("Lien ajouté : " + (title || url)); render();
    } catch (err) { toast(err.message); }
  };
}

async function pageList(main, q) {
  const params = new URLSearchParams(q);
  const items = await api("/items?" + params);
  const kind = q.get("kind");
  const title = q.get("fav") ? "⭐ Favoris" : q.get("category") ? `Catégorie : ${q.get("category")}` : q.get("tag") ? `Tag : ${q.get("tag")}` : q.get("q") ? `Recherche : « ${q.get("q")} »` : KIND[kind] || "Tout";
  main.innerHTML = `<h1>${h(title)}</h1><p class="sub">${items.length} élément(s)</p>
  <div class="bar">${["note", "link", "local"].map(k => `<a class="btn ${kind === k ? "primary" : ""}" href="#/list?${new URLSearchParams({ ...Object.fromEntries(q), kind: k })}">${KIND[k]}</a>`).join("")}<a class="btn" href="#/edit/new?kind=${kind || "note"}">+ Nouveau</a></div>
  ${items.length ? `<div class="grid">${items.map(card).join("")}</div>` : `<p class="empty">Rien ici pour l'instant.</p>`}`;
}

async function pageNote(main, id) {
  const n = await api(`/items/${id}`);
  main.innerHTML = `<div class="bar"><a href="#/list?kind=note">← Notes</a><span class="grow"></span><button id="edit">✎ Modifier</button><button id="del" class="danger">Supprimer</button></div>
  <h1>${h(n.title)}</h1><p class="sub">${n.category ? h(n.category) + " · " : ""}modifié le ${h(n.updated_at.replace("T", " à "))}</p>
  <div class="tags" style="margin-bottom:12px">${n.tags.map(t => `<a class="tag" href="#/list?tag=${encodeURIComponent(t)}">${h(t)}</a>`).join("")}</div>
  <article class="note md">${md(n.body) || "<p class='empty'>Note vide.</p>"}</article>`;
  $("#edit").onclick = () => go(`#/edit/${id}`);
  $("#del").onclick = async () => { if (confirm("Supprimer cette note ?")) { await api(`/items/${id}`, { method: "DELETE" }); go("#/list?kind=note"); } };
}

async function upload(file) {
  const r = await api("/upload", { method: "POST", body: file, headers: { "Content-Type": file.type, "X-Filename": encodeURIComponent(file.name || "capture.png") } });
  return r;
}

async function pageEdit(main, id, q) {
  const isNew = id === "new";
  const it = isNew ? { kind: q.get("kind") || "note", title: q.get("title") || "", url: "", body: "", category: "", tags: [], favorite: false } : await api(`/items/${id}`);
  const k = it.kind, hasUrl = k !== "note";
  const cats = S.meta.categories.map(c => `<option value="${h(c.name)}">`).join("");
  main.innerHTML = `<h1>${isNew ? "Nouveau" : "Modifier"} : ${KIND[k].toLowerCase()}</h1>
  <form class="form" id="f">
    ${hasUrl ? `<label>${k === "link" ? "Adresse (https://…)" : "Chemin, dossier, programme ou URI (ex : C:\\Labs, compmgmt.msc, \\\\srv\\partage)"}<input name="url" required value="${h(it.url)}"></label>` : ""}
    <label>Titre<input name="title" ${hasUrl ? "" : "required"} value="${h(it.title)}"></label>
    <div class="row2"><label>Catégorie<input name="category" list="cats" value="${h(it.category)}" placeholder="ex : Windows Server"></label><datalist id="cats">${cats}</datalist>
    <label>Tags (séparés par des virgules)<input name="tags" value="${h(it.tags.join(", "))}"></label></div>
    <label>${k === "note" ? "Contenu (Markdown — colle ou glisse une image directement ; [[Titre]] crée un lien vers une autre note)" : "Description / notes"}
      <textarea name="body" ${hasUrl ? 'style="min-height:120px"' : ""}>${h(it.body)}</textarea></label>
    <div class="bar"><label style="display:flex;gap:6px;align-items:center;flex-direction:row"><input type="checkbox" name="favorite" ${it.favorite ? "checked" : ""}> ⭐ Favori (épinglé sur l'accueil)</label><span class="grow"></span>
      <label class="btn">📎 Image<input id="pick" type="file" accept="image/*,.pdf" hidden></label>
      <button type="button" id="cancel">Annuler</button><button class="primary">Enregistrer</button></div>
  </form>`;
  const f = $("#f"), ta = f.body;
  const insert = async file => {
    try {
      const r = await upload(file);
      const md_ = `${file.type.startsWith("image/") ? "!" : ""}[${r.name}](${r.url})`;
      const s = ta.selectionStart; ta.setRangeText(`\n${md_}\n`, s, ta.selectionEnd, "end"); toast("Fichier ajouté");
    } catch (err) { toast(err.message); }
  };
  ta.addEventListener("paste", e => { const fl = [...e.clipboardData.files]; if (fl.length) { e.preventDefault(); fl.forEach(insert); } });
  ta.addEventListener("dragover", e => e.preventDefault());
  ta.addEventListener("drop", e => { if (e.dataTransfer.files.length) { e.preventDefault(); [...e.dataTransfer.files].forEach(insert); } });
  $("#pick").onchange = e => [...e.target.files].forEach(insert);
  if (k === "link" && f.url) f.url.onblur = async () => {
    if (f.title.value || !/^https?:\/\//i.test(f.url.value)) return;
    const { title } = await api("/fetch-title", { method: "POST", json: { url: f.url.value } });
    if (title && !f.title.value) f.title.value = title;
  };
  $("#cancel").onclick = () => history.back();
  f.onsubmit = async e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(f));
    const data = { ...fd, kind: k, favorite: f.favorite.checked };
    try {
      if (isNew) { const r = await api("/items", { method: "POST", json: data }); go(k === "note" ? `#/note/${r.id}` : `#/list?kind=${k}`); }
      else { await api(`/items/${id}`, { method: "PUT", json: data }); go(k === "note" ? `#/note/${id}` : `#/list?kind=${k}`); }
      toast("Enregistré");
    } catch (err) { toast(err.message); }
  };
  if (!isNew && k !== "note") {
    const b = Object.assign(document.createElement("button"), { type: "button", className: "danger", textContent: "Supprimer" });
    b.onclick = async () => { if (confirm("Supprimer cet élément ?")) { await api(`/items/${id}`, { method: "DELETE" }); go(`#/list?kind=${k}`); } };
    $("#cancel").before(b);
  }
}

async function pageImages(main) {
  const files = await api("/files");
  main.innerHTML = `<h1>Images & fichiers</h1><p class="sub">Captures d'écran, schémas, PDF. Clique « Copier » puis colle dans une note.</p>
  <div class="drop" id="drop">Glisse des fichiers ici, colle une capture (Ctrl+V) ou <label class="btn">choisir<input id="pick" type="file" multiple accept="image/*,.pdf" hidden></label></div>
  ${files.length ? `<div class="gal">${files.map(f => `<figure>${f.mime === "application/pdf" ? `<a class="pdf" href="/files/${f.name}" target="_blank">📄</a>` : `<a href="/files/${f.name}" target="_blank"><img loading="lazy" src="/files/${f.name}"></a>`}
    <figcaption><span title="${h(f.orig)}">${h(f.orig.slice(0, 18))}</span><span><button data-md="${h(`${f.mime.startsWith("image/") ? "!" : ""}[${f.orig}](/files/${f.name})`)}">Copier</button><button class="danger" data-delf="${f.id}">✕</button></span></figcaption></figure>`).join("")}</div>` : `<p class="empty">Aucun fichier.</p>`}`;
  const add = async list => { for (const f of list) try { await upload(f); } catch (e) { toast(e.message); } render(); };
  $("#pick").onchange = e => add([...e.target.files]);
  const drop = $("#drop");
  drop.ondragover = e => { e.preventDefault(); drop.classList.add("over"); };
  drop.ondragleave = () => drop.classList.remove("over");
  drop.ondrop = e => { e.preventDefault(); add([...e.dataTransfer.files]); };
  document.onpaste = e => { if (e.clipboardData.files.length) add([...e.clipboardData.files]); };
  main.onclick = async e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.md) { await navigator.clipboard.writeText(b.dataset.md); toast("Copié : colle-le dans une note"); }
    if (b.dataset.delf && confirm("Supprimer ce fichier ? (les notes qui l'utilisent perdront l'image)")) { await api(`/files/${b.dataset.delf}`, { method: "DELETE" }); render(); }
  };
}

const RESETS = [
  { scope: "seed", label: "Restaurer le pack de départ", desc: "Rajoute les liens et notes d'origine manquants, sans rien supprimer.", btn: "Restaurer", n: () => "aucune perte" },
  { scope: "link", label: "Supprimer tous les liens", desc: "Efface tous les liens web.", btn: "Supprimer les liens", danger: true, n: c => c.link },
  { scope: "note", label: "Supprimer toutes les notes", desc: "Efface toutes les notes.", btn: "Supprimer les notes", danger: true, n: c => c.note },
  { scope: "local", label: "Supprimer les raccourcis locaux", desc: "Efface tous les raccourcis locaux.", btn: "Supprimer les raccourcis", danger: true, n: c => c.local },
  { scope: "files", label: "Supprimer images et fichiers", desc: "Efface le contenu du dossier uploads (les notes qui les utilisent perdront leurs images).", btn: "Supprimer les fichiers", danger: true, n: c => c.file },
  { scope: "factory", label: "Réinitialiser (retour à l'état initial)", desc: "Efface TOUT puis recharge le pack de départ.", btn: "Réinitialiser", danger: true, n: c => c.note + c.link + c.local + c.file },
  { scope: "all", label: "Tout vider", desc: "Efface TOUT, sans pack de départ : wiki complètement vide.", btn: "Tout supprimer", danger: true, n: c => c.note + c.link + c.local + c.file },
];

function pageTools(main) {
  main.innerHTML = `<h1>Import / export</h1><p class="sub">Alimente le wiki automatiquement et partage tes ressources.</p>
  <h2>Importer les favoris du navigateur</h2><p>Chrome / Edge / Firefox → gestionnaire de favoris → <em>Exporter</em> (fichier .html). Les dossiers deviennent des catégories.</p>
  <label class="btn">Choisir le fichier de favoris<input id="bm" type="file" accept=".html,.htm" hidden></label>
  <h2>Importer / exporter en JSON</h2><p>Pour échanger un lot de liens/notes avec un formateur ou un camarade (les doublons sont ignorés).</p>
  <div class="bar"><label class="btn">Importer un .json<input id="js" type="file" accept=".json" hidden></label><a class="btn" href="/api/export">Exporter tout en .json</a></div>
  <h2>Sauvegarde complète</h2><p>Copie simplement le dossier <code>${h(S.meta.data_dir)}</code> (base <code>wiki.db</code> + images dans <code>uploads</code>).</p>
  <h2 class="danger">⚠️ Zone de danger</h2>
  <p>Ces actions sont <strong>définitives</strong>. Pense à <a href="/api/export">exporter une sauvegarde JSON</a> avant (les images ne sont pas incluses dans l'export).</p>
  <div class="grid">${RESETS.map(r => `<div class="card" style="cursor:default"><span class="t">${r.label}</span><span class="ex">${r.desc} <b>(${r.n(S.meta.counts)})</b></span><button class="${r.danger ? "danger" : ""}" data-reset="${r.scope}">${r.btn}</button></div>`).join("")}</div>`;
  main.onclick = async e => {
    const b = e.target.closest("[data-reset]"); if (!b) return;
    const r = RESETS.find(x => x.scope === b.dataset.reset);
    if (r.danger) { if (prompt(`${r.label}

${r.desc}

Tape SUPPRIMER pour confirmer :`) !== "SUPPRIMER") return toast("Annulé"); }
    else if (!confirm(`${r.label} ?
${r.desc}`)) return;
    try { const res = await api("/reset", { method: "POST", json: { scope: r.scope } }); toast(res.added ? `Terminé (${res.added} élément(s) du pack ajoutés)` : "Terminé"); go("#/"); render(); }
    catch (err) { toast(err.message); }
  };
  const send = async items => { const r = await api("/import", { method: "POST", json: { items } }); toast(`${r.added} élément(s) ajouté(s)`); render(); };
  $("#bm").onchange = async e => {
    const doc = new DOMParser().parseFromString(await e.target.files[0].text(), "text/html");
    const items = [...doc.querySelectorAll("a[href^='http']")].map(a => {
      const dl = a.closest("dl"), hd = dl?.previousElementSibling;
      return { kind: "link", url: a.href, title: a.textContent.trim(), category: hd?.tagName === "H3" ? hd.textContent.trim() : "" };
    });
    send(items);
  };
  $("#js").onchange = async e => { try { send(JSON.parse(await e.target.files[0].text()).items || []); } catch { toast("JSON invalide"); } };
}

// ------------------------------------------------------------ recherche & démarrage
let timer;
$("#search").addEventListener("input", e => {
  clearTimeout(timer);
  timer = setTimeout(() => { const v = e.target.value.trim(); go(v ? `#/list?q=${encodeURIComponent(v)}` : "#/"); }, 250);
});
document.addEventListener("keydown", e => {
  if (e.key === "/" && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); $("#search").focus(); }
});
window.addEventListener("hashchange", render);
render();

// ------------------------------------------------------------ thème clair / sombre / auto
const THEMES = { auto: "🌗 Thème : auto", light: "☀️ Thème : clair", dark: "🌙 Thème : sombre" };
function applyTheme(t) {
  if (t === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.dataset.theme = t;
  $("#themebtn").textContent = THEMES[t];
}
let theme = "auto"; try { theme = localStorage.getItem("theme") || "auto"; } catch {}
$("#themebtn").onclick = () => {
  theme = { auto: "light", light: "dark", dark: "auto" }[theme];
  try { localStorage.setItem("theme", theme); } catch {}
  applyTheme(theme);
};
applyTheme(theme);
