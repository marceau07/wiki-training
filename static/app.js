"use strict";
const $ = (s, el = document) => el.querySelector(s);
const h = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const kindName = k => t("kind." + k);
const S = { meta: null, titles: new Map() };

async function api(path, { method = "GET", json, body, headers = {} } = {}) {
  const o = { method, headers: { ...headers }, body };
  if (method !== "GET") o.headers["X-Wiki"] = "1";
  if (json !== undefined) { o.body = JSON.stringify(json); o.headers["Content-Type"] = "application/json"; }
  const r = await fetch("/api" + path, o);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(apiMessage(data, r.statusText));
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
function inline(txt) {
  const keep = [];
  txt = txt.replace(/`([^`]+)`/g, (m, c) => { keep.push(`<code>${h(c)}</code>`); return `\u0001${keep.length - 1}\u0001`; });
  txt = h(txt);
  txt = txt.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, a, u) => safeUrl(u) ? `<img src="${u}" alt="${a}">` : m);
  txt = txt.replace(/\[\[([^\]]+)\]\]/g, (m, n) => {
    const it = S.titles.get(n.trim().toLowerCase());
    return it ? `<a href="#/note/${it}">${n}</a>`
      : `<a class="missing" title="${t("missing.title")}" href="#/edit/new?kind=note&title=${encodeURIComponent(n.replace(/&amp;/g, "&"))}">${n}</a>`;
  });
  txt = txt.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, a, u) => safeUrl(u) ? `<a href="${u}" ${u[0] === "#" ? "" : 'target="_blank" rel="noopener"'}>${a}</a>` : m);
  txt = txt.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*\w])\*([^*]+)\*/g, "$1<em>$2</em>");
  return txt.replace(/\u0001(\d+)\u0001/g, (m, i) => keep[i]);
}
function md(src) {
  const blocks = [];
  src = src.replace(/\r/g, "").replace(/```[^\n]*\n([\s\S]*?)```/g, (m, c) => {
    blocks.push(`<pre><button class="copy">${t("copy")}</button><code>${h(c.replace(/\n$/, ""))}</code></pre>`);
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
  const nav = [["#/", t("nav.home"), "", parts.length === 0],
    ["#/list?fav=1", t("nav.favs"), "", parts[0] === "list" && q.get("fav")],
    ["#/list?kind=note", t("nav.notes"), c.note, cur === "note" && !q.get("fav")],
    ["#/list?kind=link", t("nav.links"), c.link, cur === "link" && !q.get("fav")],
    ["#/list?kind=local", t("nav.local"), c.local, cur === "local" && !q.get("fav")],
    ["#/calendar", t("nav.calendar"), c.calendar, parts[0] === "calendar"],
    ["#/images", t("nav.images"), c.file, parts[0] === "images"],
    ["#/tools", t("nav.tools"), "", parts[0] === "tools"]];
  $("#nav").innerHTML = nav.map(([href, label, n, on]) => `<a href="${href}" class="${on ? "on" : ""}"><span>${label}</span><small>${n}</small></a>`).join("");
  const facet = (title, arr, key) => arr.length ? `<div class="facet"><h4>${title}</h4>${arr.map(x =>
    `<a href="#/list?${key}=${encodeURIComponent(x.name)}" class="${q.get(key) === x.name ? "on" : ""}"><span>${h(x.name)}</span><small>${x.count}</small></a>`).join("")}</div>` : "";
  $("#facets").innerHTML = facet(t("facet.categories"), S.meta.categories, "category") + facet(t("facet.tags"), S.meta.tags, "tag");
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
    else if (p === "calendar") await pageCalendar(main);
    else if (p === "images") await pageImages(main);
    else if (p === "tools") pageTools(main);
    else main.innerHTML = `<p class="empty">${t("page.notfound")}</p>`;
  } catch (e) { main.innerHTML = `<p class="empty">${h(t("error.prefix", { msg: e.message }))}</p>`; }
  window.scrollTo(0, 0);
}

// ------------------------------------------------------------ cartes
function card(it) {
  const star = `<button data-fav="${it.id}" class="${it.favorite ? "fav-on" : ""}" title="${t("card.fav")}">${it.favorite ? "★" : "☆"}</button>`;
  const acts = `<span class="acts">${star}<button data-edit="${it.id}" title="${t("card.edit")}">✎</button></span>`;
  const tags = it.tags.length ? `<div class="tags">${it.tags.map(t => `<span class="tag">${h(t)}</span>`).join("")}</div>` : "";
  const cat = it.category ? `<span class="cat">${h(it.category)}</span>` : "";
  const ico = `<span class="ico">${h([...it.title][0]?.toUpperCase() || "?")}</span>`;
  if (it.kind === "note")
    return `<div class="card" data-note="${it.id}">${acts}<span class="t">📝 ${h(it.title)}</span><span class="ex">${h(it.excerpt.replace(/[#*`>|-]/g, ""))}</span>${cat}${tags}</div>`;
  return `<div class="card tile" data-open="${it.id}" data-kind="${it.kind}" data-url="${h(it.url)}">${acts}${ico}<div><span class="t">${h(it.title)}</span><br><span class="u">${it.kind === "link" ? h(host(it.url)) : "🖥️ " + h(it.url)}</span>${cat}${tags}</div></div>`;
}
document.addEventListener("click", async e => {
  const el = e.target;
  if (el.matches(".copy")) { await navigator.clipboard.writeText(el.nextElementSibling.textContent); el.textContent = t("copied"); setTimeout(() => el.textContent = t("copy"), 1500); return; }
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
  if (confirm(t("open.confirm", { url: c.dataset.url })))
    api(`/open/${c.dataset.open}`, { method: "POST" }).catch(err => toast(t("failed", { msg: err.message })));
});

// ------------------------------------------------------------ pages
async function pageHome(main) {
  const [favs, recent] = await Promise.all([api("/items?fav=1"), api("/items")]);
  const shortcuts = favs.filter(i => i.kind !== "note");
  main.innerHTML = `<img class="banner" src="/image1.png" alt="We are Be Web"><h1>${t("home.title")}</h1><p class="sub">${t("home.sub")}</p>
  <form class="quick" id="quick"><input name="url" placeholder="${h(t("home.quick.placeholder"))}"><button class="primary">${t("home.quick.btn")}</button></form>
  <div class="bar"><a class="btn primary" href="#/edit/new?kind=note">${t("btn.note")}</a><a class="btn" href="#/edit/new?kind=link">${t("btn.link")}</a><a class="btn" href="#/edit/new?kind=local">${t("btn.local")}</a></div>
  <div id="upcoming"></div>
  <h2>${t("home.shortcuts")}</h2>${shortcuts.length ? `<div class="grid">${shortcuts.map(card).join("")}</div>` : `<p class="empty">${t("home.shortcuts.empty")}</p>`}
  <h2>${t("home.recent")}</h2><div class="grid">${recent.slice(0, 12).map(card).join("")}</div>`;
  calUpcomingHtml().then(x => { const el = $("#upcoming"); if (el) el.innerHTML = x; }).catch(() => { });
  $("#quick").onsubmit = async e => {
    e.preventDefault();
    let url = new FormData(e.target).get("url").trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    try {
      const { title } = await api("/fetch-title", { method: "POST", json: { url } });
      await api("/items", { method: "POST", json: { kind: "link", url, title: title || url } });
      toast(t("home.linkadded", { title: title || url })); render();
    } catch (err) { toast(err.message); }
  };
}

async function pageList(main, q) {
  const params = new URLSearchParams(q);
  const items = await api("/items?" + params);
  const kind = q.get("kind");
  const title = q.get("fav") ? t("nav.favs") : q.get("category") ? t("list.category", { v: q.get("category") }) : q.get("tag") ? t("list.tag", { v: q.get("tag") }) : q.get("q") ? t("list.search", { v: q.get("q") }) : kind ? kindName(kind) : t("list.all");
  main.innerHTML = `<h1>${h(title)}</h1><p class="sub">${t("list.count", { n: items.length })}</p>
  <div class="bar">${["note", "link", "local"].map(k => `<a class="btn ${kind === k ? "primary" : ""}" href="#/list?${new URLSearchParams({ ...Object.fromEntries(q), kind: k })}">${kindName(k)}</a>`).join("")}<a class="btn" href="#/edit/new?kind=${kind || "note"}">${t("list.new")}</a></div>
  ${items.length ? `<div class="grid">${items.map(card).join("")}</div>` : `<p class="empty">${t("list.empty")}</p>`}`;
}

async function pageNote(main, id) {
  const n = await api(`/items/${id}`);
  main.innerHTML = `<div class="bar"><a href="#/list?kind=note">${t("note.back")}</a><span class="grow"></span><button id="edit">${t("note.edit")}</button><button id="del" class="danger">${t("delete")}</button></div>
  <h1>${h(n.title)}</h1><p class="sub">${n.category ? h(n.category) + " · " : ""}${h(t("note.modified", { date: fmtDateTime(n.updated_at) }))}</p>
  <div class="tags" style="margin-bottom:12px">${n.tags.map(t => `<a class="tag" href="#/list?tag=${encodeURIComponent(t)}">${h(t)}</a>`).join("")}</div>
  <article class="note md">${md(n.body) || `<p class='empty'>${t("note.empty")}</p>`}</article>`;
  $("#edit").onclick = () => go(`#/edit/${id}`);
  $("#del").onclick = async () => { if (confirm(t("note.confirmdel"))) { await api(`/items/${id}`, { method: "DELETE" }); go("#/list?kind=note"); } };
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
  main.innerHTML = `<h1>${isNew ? t("edit.new") : t("edit.edit")} : ${kindName(k).toLowerCase()}</h1>
  <form class="form" id="f">
    ${hasUrl ? `<label>${k === "link" ? t("edit.url.link") : t("edit.url.local")}<input name="url" required value="${h(it.url)}"></label>` : ""}
    <label>${t("edit.title")}<input name="title" ${hasUrl ? "" : "required"} value="${h(it.title)}"></label>
    <div class="row2"><label>${t("edit.category")}<input name="category" list="cats" value="${h(it.category)}" placeholder="${h(t("edit.category.placeholder"))}"></label><datalist id="cats">${cats}</datalist>
    <label>${t("edit.tags")}<input name="tags" value="${h(it.tags.join(", "))}"></label></div>
    <label>${k === "note" ? t("edit.body.note") : t("edit.body.other")}
      <textarea name="body" ${hasUrl ? 'style="min-height:120px"' : ""}>${h(it.body)}</textarea></label>
    <div class="bar"><label style="display:flex;gap:6px;align-items:center;flex-direction:row"><input type="checkbox" name="favorite" ${it.favorite ? "checked" : ""}> ${t("edit.fav")}</label><span class="grow"></span>
      <label class="btn">${t("edit.image")}<input id="pick" type="file" accept="image/*,.pdf" hidden></label>
      <button type="button" id="cancel">${t("cancel")}</button><button class="primary">${t("save")}</button></div>
  </form>`;
  const f = $("#f"), ta = f.body;
  const insert = async file => {
    try {
      const r = await upload(file);
      const md_ = `${file.type.startsWith("image/") ? "!" : ""}[${r.name}](${r.url})`;
      const s = ta.selectionStart; ta.setRangeText(`\n${md_}\n`, s, ta.selectionEnd, "end"); toast(t("edit.fileadded"));
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
      toast(t("edit.saved"));
    } catch (err) { toast(err.message); }
  };
  if (!isNew && k !== "note") {
    const b = Object.assign(document.createElement("button"), { type: "button", className: "danger", textContent: t("delete") });
    b.onclick = async () => { if (confirm(t("edit.confirmdel"))) { await api(`/items/${id}`, { method: "DELETE" }); go(`#/list?kind=${k}`); } };
    $("#cancel").before(b);
  }
}

async function pageImages(main) {
  const files = await api("/files");
  main.innerHTML = `<h1>${t("images.title")}</h1><p class="sub">${t("images.sub")}</p>
  <div class="drop" id="drop">${t("images.drop")}<label class="btn">${t("images.choose")}<input id="pick" type="file" multiple accept="image/*,.pdf" hidden></label></div>
  ${files.length ? `<div class="gal">${files.map(f => `<figure>${f.mime === "application/pdf" ? `<a class="pdf" href="/files/${f.name}" target="_blank">📄</a>` : `<a href="/files/${f.name}" target="_blank"><img loading="lazy" src="/files/${f.name}"></a>`}
    <figcaption><span title="${h(f.orig)}">${h(f.orig.slice(0, 18))}</span><span><button data-md="${h(`${f.mime.startsWith("image/") ? "!" : ""}[${f.orig}](/files/${f.name})`)}">${t("copy")}</button><button class="danger" data-delf="${f.id}">✕</button></span></figcaption></figure>`).join("")}</div>` : `<p class="empty">${t("images.none")}</p>`}`;
  const add = async list => { for (const f of list) try { await upload(f); } catch (e) { toast(e.message); } render(); };
  $("#pick").onchange = e => add([...e.target.files]);
  const drop = $("#drop");
  drop.ondragover = e => { e.preventDefault(); drop.classList.add("over"); };
  drop.ondragleave = () => drop.classList.remove("over");
  drop.ondrop = e => { e.preventDefault(); add([...e.dataTransfer.files]); };
  document.onpaste = e => { if (e.clipboardData.files.length) add([...e.clipboardData.files]); };
  main.onclick = async e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.md) { await navigator.clipboard.writeText(b.dataset.md); toast(t("images.copied")); }
    if (b.dataset.delf && confirm(t("images.confirmdel"))) { await api(`/files/${b.dataset.delf}`, { method: "DELETE" }); render(); }
  };
}

const RESETS = [
  { scope: "seed", n: () => t("reset.seed.n") },
  { scope: "link", danger: true, n: c => c.link },
  { scope: "note", danger: true, n: c => c.note },
  { scope: "local", danger: true, n: c => c.local },
  { scope: "calendars", danger: true, n: c => c.calendar },
  { scope: "files", danger: true, n: c => c.file },
  { scope: "factory", danger: true, n: c => c.note + c.link + c.local + c.file + c.calendar },
  { scope: "all", danger: true, n: c => c.note + c.link + c.local + c.file + c.calendar },
];
const resetText = (r, f) => t(`reset.${r.scope}.${f}`);

function pageTools(main) {
  main.innerHTML = `<h1>${t("tools.title")}</h1><p class="sub">${t("tools.sub")}</p>
  <h2>${t("tools.bm.h")}</h2><p>${t("tools.bm.p")}</p>
  <label class="btn">${t("tools.bm.btn")}<input id="bm" type="file" accept=".html,.htm" hidden></label>
  <h2>${t("tools.json.h")}</h2><p>${t("tools.json.p")}</p>
  <div class="bar"><label class="btn">${t("tools.json.import")}<input id="js" type="file" accept=".json" hidden></label><a class="btn" href="/api/export">${t("tools.json.export")}</a></div>
  <h2>${t("tools.backup.h")}</h2><p>${t("tools.backup.p", { dir: h(S.meta.data_dir) })}</p>
  <h2 class="danger">${t("tools.danger.h")}</h2>
  <p>${t("tools.danger.p")}</p>
  <div class="grid">${RESETS.map(r => `<div class="card" style="cursor:default"><span class="t">${resetText(r, "label")}</span><span class="ex">${resetText(r, "desc")} <b>(${r.n(S.meta.counts)})</b></span><button class="${r.danger ? "danger" : ""}" data-reset="${r.scope}">${resetText(r, "btn")}</button></div>`).join("")}</div>`;
  main.onclick = async e => {
    const b = e.target.closest("[data-reset]"); if (!b) return;
    const r = RESETS.find(x => x.scope === b.dataset.reset), label = resetText(r, "label"), desc = resetText(r, "desc");
    if (r.danger) { const word = t("tools.confirmword"); if (prompt(t("tools.prompt", { label, desc, word })) !== word) return toast(t("tools.cancelled")); }
    else if (!confirm(t("tools.confirm", { label, desc }))) return;
    try { const res = await api("/reset", { method: "POST", json: { scope: r.scope } }); toast(res.added ? t("tools.doneseed", { n: res.added }) : t("tools.done")); go("#/"); render(); }
    catch (err) { toast(err.message); }
  };
  const send = async items => { const r = await api("/import", { method: "POST", json: { items } }); toast(t("tools.imported", { n: r.added })); render(); };
  $("#bm").onchange = async e => {
    const doc = new DOMParser().parseFromString(await e.target.files[0].text(), "text/html");
    const items = [...doc.querySelectorAll("a[href^='http']")].map(a => {
      const dl = a.closest("dl"), hd = dl?.previousElementSibling;
      return { kind: "link", url: a.href, title: a.textContent.trim(), category: hd?.tagName === "H3" ? hd.textContent.trim() : "" };
    });
    send(items);
  };
  $("#js").onchange = async e => { try { send(JSON.parse(await e.target.files[0].text()).items || []); } catch { toast(t("tools.badjson")); } };
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
applyStaticI18n();
render();

// Changement de langue : on redessine la page en conservant ce qui est en cours de saisie dans le formulaire d'édition.
$("#langsel").addEventListener("change", async e => {
  const f = $("#f"), saved = f ? [...f.elements].filter(x => x.name).map(x => [x.name, x.type === "checkbox" ? x.checked : x.value]) : [];
  setLang(e.target.value);
  await render();
  const nf = $("#f");
  if (nf && saved.length) for (const [name, v] of saved) { const x = nf.elements[name]; if (x) x.type === "checkbox" ? (x.checked = v) : (x.value = v); }
});
document.addEventListener("langchange", () => applyTheme(theme));

// ------------------------------------------------------------ thème clair / sombre / auto
function applyTheme(th) {
  if (th === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.dataset.theme = th;
  $("#themebtn").textContent = t("theme." + th);
}
let theme = "auto"; try { theme = localStorage.getItem("theme") || "auto"; } catch {}
$("#themebtn").onclick = () => {
  theme = { auto: "light", light: "dark", dark: "auto" }[theme];
  try { localStorage.setItem("theme", theme); } catch {}
  applyTheme(theme);
};
applyTheme(theme);
