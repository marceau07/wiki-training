"use strict";
// Calendrier : lecture ICS (récurrences, fuseaux) + vues Mois / Agenda. Chargé avant app.js.
const pad2 = n => String(n).padStart(2, "0");
const dayKey = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const fmtTime = d => d.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
const fmtDay = d => d.toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long" });

// ------------------------------------------------------------ parsing ICS
const TZMAP = { "W. Europe Standard Time": "Europe/Paris", "Romance Standard Time": "Europe/Paris", "Central Europe Standard Time": "Europe/Budapest", "Central European Standard Time": "Europe/Warsaw", "GMT Standard Time": "Europe/London", "Eastern Standard Time": "America/New_York", "Central Standard Time": "America/Chicago", "Pacific Standard Time": "America/Los_Angeles" };
function tzOffset(ts, tz) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
  const p = Object.fromEntries(f.formatToParts(new Date(ts)).map(x => [x.type, +x.value]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ts / 1000) * 1000;
}
function zoned(y, mo, d, h, mi, s, tz) {
  tz = TZMAP[tz] || tz;
  try { const g = Date.UTC(y, mo, d, h, mi, s); let t = g - tzOffset(g, tz); t = g - tzOffset(t, tz); return new Date(t); }
  catch { return new Date(y, mo, d, h, mi, s); }
}
function parseDate(v, params) {
  const m = v.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, Y, Mo, D, H, Mi, S, Z] = m;
  if (H === undefined) return { date: new Date(+Y, +Mo - 1, +D), allDay: true };
  if (Z) return { date: new Date(Date.UTC(+Y, +Mo - 1, +D, +H, +Mi, +(S || 0))) };
  if (params.TZID) return { date: zoned(+Y, +Mo - 1, +D, +H, +Mi, +(S || 0), params.TZID) };
  return { date: new Date(+Y, +Mo - 1, +D, +H, +Mi, +(S || 0)) };
}
function parseDuration(v) {
  const m = v.match(/^([-+])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return 0;
  const ms = ((+m[2] || 0) * 7 + (+m[3] || 0)) * 864e5 + (+m[4] || 0) * 36e5 + (+m[5] || 0) * 6e4 + (+m[6] || 0) * 1e3;
  return m[1] === "-" ? -ms : ms;
}
const unesc = t => (t || "").replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");

function splitLine(line) {
  let q = false, i = 0;
  for (; i < line.length; i++) { if (line[i] === '"') q = !q; else if (line[i] === ":" && !q) break; }
  const [name, ...ps] = line.slice(0, i).split(";");
  const params = {};
  ps.forEach(p => { const [k, ...v] = p.split("="); params[k.toUpperCase()] = v.join("=").replace(/"/g, ""); });
  return { name: name.toUpperCase(), params, value: line.slice(i + 1) };
}

function parseICS(text) {
  const lines = text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const events = []; let cur = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { cur = { exdates: [] }; continue; }
    if (line === "END:VEVENT") {
      if (cur && cur.start && cur.status !== "CANCELLED") {
        if (!cur.end) cur.end = cur.dur != null ? new Date(cur.start.getTime() + cur.dur) : cur.allDay ? addDays(cur.start, 1) : new Date(cur.start.getTime() + 36e5);
        cur.days = cur.allDay ? Math.max(1, Math.round((cur.end - cur.start) / 864e5)) : 0;
        events.push(cur);
      }
      cur = null; continue;
    }
    if (!cur || !line) continue;
    const { name, params, value } = splitLine(line);
    switch (name) {
      case "UID": cur.uid = value; break;
      case "SUMMARY": cur.summary = unesc(value); break;
      case "LOCATION": cur.loc = unesc(value); break;
      case "DESCRIPTION": cur.desc = unesc(value); break;
      case "URL": cur.url = value; break;
      case "STATUS": cur.status = value.toUpperCase(); break;
      case "DTSTART": { const r = parseDate(value, params); if (r) { cur.start = r.date; cur.allDay = !!r.allDay; } break; }
      case "DTEND": { const r = parseDate(value, params); if (r) cur.end = r.date; break; }
      case "DURATION": cur.dur = parseDuration(value); break;
      case "RECURRENCE-ID": { const r = parseDate(value, params); if (r) cur.recId = r.date; break; }
      case "EXDATE": value.split(",").forEach(v => { const r = parseDate(v, params); if (r) cur.exdates.push(r.date.getTime()); }); break;
      case "RRULE": {
        const r = {}; value.split(";").forEach(p => { const [k, v] = p.split("="); r[k] = v; });
        if (r.UNTIL) { const u = parseDate(r.UNTIL, {}); r.until = u && (u.allDay ? addDays(u.date, 1) : u.date); }
        cur.rrule = r; break;
      }
    }
  }
  return events;
}

// ------------------------------------------------------------ récurrences
const WD = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
function withTime(day, s) { const d = new Date(day); d.setHours(s.getHours(), s.getMinutes(), s.getSeconds(), 0); return d; }
function* occurrenceStarts(ev) {
  const r = ev.rrule, s = ev.start, step = +r.INTERVAL || 1;
  const byday = (r.BYDAY || "").split(",").filter(Boolean).map(x => { const m = x.match(/^([+-]?\d+)?(\w\w)$/); return m ? { n: m[1] ? +m[1] : 0, d: WD[m[2]] } : null; }).filter(Boolean);
  if (r.FREQ === "DAILY") for (let i = 0; ; i++) yield addDays(s, i * step);
  else if (r.FREQ === "WEEKLY") {
    const days = (byday.length ? byday.map(b => b.d) : [s.getDay()]).sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
    const ws = addDays(startOfDay(s), -((s.getDay() + 6) % 7));
    for (let w = 0; ; w++) for (const d of days) { const o = withTime(addDays(ws, w * 7 * step + (d + 6) % 7), s); if (o >= s) yield o; }
  } else if (r.FREQ === "MONTHLY") {
    for (let m = 0; ; m += step) {
      const y = s.getFullYear(), mo = s.getMonth() + m, dim = new Date(y, mo + 1, 0).getDate(), cand = [];
      if (byday.length) for (const b of byday) {
        const all = []; for (let d = 1; d <= dim; d++) if (new Date(y, mo, d).getDay() === b.d) all.push(d);
        const pick = b.n === 0 ? all : [b.n > 0 ? all[b.n - 1] : all[all.length + b.n]];
        pick.filter(Boolean).forEach(d => cand.push(d));
      } else (r.BYMONTHDAY ? r.BYMONTHDAY.split(",").map(Number) : [s.getDate()]).forEach(d => { if (d > 0 ? d <= dim : false) cand.push(d); });
      for (const d of cand.sort((a, b) => a - b)) { const o = withTime(new Date(y, mo, d), s); if (o >= s) yield o; }
    }
  } else if (r.FREQ === "YEARLY") {
    for (let i = 0; ; i += step) { const o = withTime(new Date(s.getFullYear() + i, s.getMonth(), s.getDate()), s); if (o.getMonth() === s.getMonth()) yield o; }
  }
}
function expand(ev, from, to) {
  const span = ev.allDay ? null : ev.end - ev.start;
  const mk = st => ({ ev, start: st, end: ev.allDay ? addDays(st, ev.days) : new Date(st.getTime() + span), allDay: ev.allDay });
  if (!ev.rrule) { const o = mk(ev.start); return o.end > from && o.start < to ? [o] : []; }
  const out = []; let n = 0, guard = 0;
  for (const st of occurrenceStarts(ev)) {
    if (++guard > 20000 || st >= to || (ev.rrule.until && st > ev.rrule.until)) break;
    if (ev.rrule.COUNT && ++n > +ev.rrule.COUNT) break;
    if (ev.exdates.includes(st.getTime())) continue;
    const o = mk(st); if (o.end > from) out.push(o);
  }
  return out;
}

// ------------------------------------------------------------ état & chargement
const mondayOf = d => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
const CAL = { cals: [], data: {}, view: "month", hidden: new Set(), occ: [], week: mondayOf(new Date()), cursor: new Date(new Date().getFullYear(), new Date().getMonth(), 1) };
try { CAL.hidden = new Set(JSON.parse(localStorage.getItem("calHidden") || "[]")); CAL.view = localStorage.getItem("calView") || "month"; } catch { }
const saveCal = () => { try { localStorage.setItem("calHidden", JSON.stringify([...CAL.hidden])); localStorage.setItem("calView", CAL.view); } catch { } };

async function calLoad(id, force) {
  if (!force && CAL.data[id]) return;
  try {
    const r = await fetch(`/api/calendars/${id}/ics`);
    if (!r.ok) throw new Error(apiMessage(await r.json().catch(() => ({})), r.statusText));
    CAL.data[id] = { events: parseICS(await r.text()) };
  } catch (e) { CAL.data[id] = { events: [], err: e.message }; }
}
async function calEnsure() {
  CAL.cals = await api("/calendars");
  await Promise.all(CAL.cals.map(c => calLoad(c.id)));
}
function calOccurrences(from, to) {
  const out = [];
  for (const cal of CAL.cals) {
    if (CAL.hidden.has(cal.id)) continue;
    const evs = CAL.data[cal.id]?.events || [];
    const overridden = new Set(evs.filter(e => e.recId).map(e => `${e.uid}|${e.recId.getTime()}`));
    for (const ev of evs) for (const o of expand(ev, from, to)) {
      if (ev.rrule && overridden.has(`${ev.uid}|${o.start.getTime()}`)) continue;
      out.push({ ...o, cal });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

// ------------------------------------------------------------ rendu
const linkify = t => h(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g, "<br>");
function timeLabel(o) {
  if (o.allDay) return t("cal.allday");
  const same = dayKey(o.start) === dayKey(o.end);
  return same ? `${fmtTime(o.start)} – ${fmtTime(o.end)}` : `${fmtDay(o.start)} ${fmtTime(o.start)} → ${fmtDay(o.end)} ${fmtTime(o.end)}`;
}
function byDay(occ) {
  const map = {};
  occ.forEach((o, i) => {
    o.i = i;
    let d = startOfDay(o.start); let last = o.allDay ? addDays(o.end, -1) : startOfDay(new Date(o.end.getTime() - 1));
    if (last < d) last = d;
    for (let n = 0; d <= last && n < 60; d = addDays(d, 1), n++) (map[dayKey(d)] ||= []).push(o);
  });
  return map;
}
function chip(o) {
  const tm = o.allDay ? "" : `<small>${fmtTime(o.start)}</small> `;
  return `<div class="chip ${o.allDay ? "allday" : ""}" data-ev="${o.i}" style="--c:${o.cal.color}" title="${h(o.ev.summary)}">${tm}${h(shortTitle(o.ev.summary))}</div>`;
}
function evCard(o) {
  return `<div class="evrow" data-ev="${o.i}" style="--c:${o.cal.color}" title="${h(o.ev.summary)}"><b>${h(shortTitle(o.ev.summary))}</b><span>${h(timeLabel(o))}${o.ev.loc ? " · 📍 " + h(o.ev.loc) : ""} · <em>${h(o.cal.name)}</em></span></div>`;
}

function calGrid(map) {
  const first = CAL.cursor, gs = addDays(first, -((first.getDay() + 6) % 7)), today = dayKey(new Date());
  const names = t("cal.dow").split(",").map(n => `<div class="dow">${n}</div>`).join("");
  let cells = "";
  for (let i = 0; i < 42; i++) {
    const d = addDays(gs, i), k = dayKey(d), list = map[k] || [];
    cells += `<div class="day ${d.getMonth() !== first.getMonth() ? "other" : ""} ${k === today ? "today" : ""}"><span class="dn">${d.getDate()}</span>${list.slice(0, 3).map(chip).join("")}${list.length > 3 ? `<button class="more" data-day="${k}">${t("cal.more", { n: list.length - 3 })}</button>` : ""}</div>`;
  }
  return `<div class="calgrid">${names}${cells}</div>`;
}
function calAgenda(map) {
  const keys = Object.keys(map).filter(k => k.slice(0, 7) === dayKey(CAL.cursor).slice(0, 7)).sort();
  if (!keys.length) return `<p class="empty">${t("cal.nomonthevents")}</p>`;
  return keys.map(k => { const [y, m, d] = k.split("-").map(Number); return `<h3 class="agday ${k === dayKey(new Date()) ? "today" : ""}">${h(fmtDay(new Date(y, m - 1, d)))}</h3>${map[k].map(evCard).join("")}`; }).join("");
}

// Titre raccourci pour la vue Semaine : on garde la partie utile après le dernier " - " si le titre est long
function shortTitle(title) {
  title = (title || t("cal.untitled")).trim();
  if (title.length <= 40) return title;
  const parts = title.split(/\s+[-–]\s+/);
  const last = parts[parts.length - 1];
  if (parts.length > 1 && last.length >= 8) title = last;
  return title.length > 60 ? title.slice(0, 57).trimEnd() + "…" : title;
}
const HR = 46; // hauteur (px) d'une heure dans la vue semaine
function calWeek(map) {
  const days = [...Array(7)].map((_, i) => addDays(CAL.week, i)), today = dayKey(new Date());
  // 1) découpe des événements horaires par jour (minutes depuis minuit) + bornes d'affichage
  let minH = 8, maxH = 18;
  const cols = days.map(d => {
    const ds = d.getTime(), de = addDays(d, 1).getTime(), items = [], allday = [];
    for (const o of map[dayKey(d)] || []) {
      if (o.allDay) { allday.push(o); continue; }
      const s = Math.max(o.start.getTime(), ds), e = Math.min(o.end.getTime(), de);
      const it = { o, s: (s - ds) / 6e4, e: Math.max((e - ds) / 6e4, (s - ds) / 6e4 + 20) };
      minH = Math.min(minH, Math.floor(it.s / 60)); maxH = Math.max(maxH, Math.ceil(it.e / 60));
      items.push(it);
    }
    return { d, items: items.sort((a, b) => a.s - b.s || b.e - a.e), allday };
  });
  maxH = Math.min(24, maxH);
  // 2) mise en colonnes des événements qui se chevauchent
  cols.forEach(c => {
    let cluster = [], end = 0, lanes = [];
    const flush = () => { cluster.forEach(i => i.n = lanes.length); cluster = []; lanes = []; };
    for (const it of c.items) {
      if (cluster.length && it.s >= end) flush();
      let l = lanes.findIndex(x => x <= it.s); if (l < 0) { l = lanes.length; lanes.push(0); }
      lanes[l] = it.e; it.l = l; cluster.push(it); end = Math.max(end, it.e);
    }
    flush();
  });
  const grid = `grid-template-columns:48px repeat(7,minmax(0,1fr))`;
  const head = cols.map(c => `<div class="wkd ${dayKey(c.d) === today ? "today" : ""}">${c.d.toLocaleDateString(locale(), { weekday: "short" })} <b>${c.d.getDate()}</b></div>`).join("");
  const anyAll = cols.some(c => c.allday.length);
  const allRow = anyAll ? `<div class="wkrow" style="${grid}"><div class="gut">${t("cal.day")}</div>${cols.map(c => `<div class="wkall">${c.allday.map(chip).join("")}</div>`).join("")}</div>` : "";
  const hours = [...Array(maxH - minH)].map((_, i) => `<span style="top:${i * HR}px">${pad2(minH + i)}h</span>`).join("");
  const now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
  const body = cols.map(c => `<div class="wkcol ${dayKey(c.d) === today ? "today" : ""}">${c.items.map(it => {
    const top = (it.s - minH * 60) / 60 * HR, h_ = Math.max((it.e - it.s) / 60 * HR, 18);
    return `<div class="wkev" data-ev="${it.o.i}" style="--c:${it.o.cal.color};top:${top}px;height:${h_}px;left:calc(${it.l / it.n * 100}% + 1px);width:calc(${100 / it.n}% - 3px)" title="${h(it.o.ev.summary)}"><small>${fmtTime(it.o.start)}</small> <b>${h(shortTitle(it.o.ev.summary))}</b>${it.o.ev.loc ? `<br><small>📍 ${h(it.o.ev.loc)}</small>` : ""}</div>`;
  }).join("")}${dayKey(c.d) === today && nowMin >= minH * 60 && nowMin <= maxH * 60 ? `<div class="wknow" style="top:${(nowMin - minH * 60) / 60 * HR}px"></div>` : ""}</div>`).join("");
  return `<div class="wk"><div class="wkrow wkhead" style="${grid}"><div></div>${head}</div>${allRow}
    <div class="wkscroll"><div class="wkrow wkbody" style="${grid};height:${(maxH - minH) * HR}px;--hr:${HR}px"><div class="gut hours">${hours}</div>${body}</div></div></div>`;
}
function weekTitle() {
  const a = CAL.week, b = addDays(a, 6), o = { day: "numeric", month: "short" };
  return `${a.toLocaleDateString(locale(), o)} – ${b.toLocaleDateString(locale(), { ...o, year: "numeric" })}`;
}

async function pageCalendar(main) {
  await calEnsure();
  const draw = () => {
    const first = CAL.cursor, wk = CAL.view === "week";
    const gs = wk ? CAL.week : addDays(first, -((first.getDay() + 6) % 7));
    const occ = calOccurrences(gs, addDays(gs, wk ? 7 : 42)); CAL.occ = occ;
    const map = byDay(occ); CAL.map = map;
    $("#calbody").innerHTML = wk ? calWeek(map) : CAL.view === "month" ? calGrid(map) : calAgenda(map);
    $("#caltitle").textContent = wk ? weekTitle() : first.toLocaleDateString(locale(), { month: "long", year: "numeric" });
    for (const [id, v] of [["vm", "month"], ["vw", "week"], ["va", "agenda"]]) $("#" + id).classList.toggle("primary", CAL.view === v);
  };
  const list = () => CAL.cals.length ? CAL.cals.map(c => {
    const d = CAL.data[c.id];
    return `<div class="calsrc" style="--c:${c.color}"><label><input type="checkbox" data-vis="${c.id}" ${CAL.hidden.has(c.id) ? "" : "checked"}><i></i> ${h(c.name)}</label>
      <small>${c.file ? t("cal.file") : h(host(c.url))} · ${d?.err ? `<span class="danger">⚠ ${h(d.err)}</span>` : t("cal.events", { n: d?.events.length ?? 0 })}</small>
      <span class="acts2">${c.file ? "" : `<button data-refresh="${c.id}" title="${t("cal.refresh")}">↻</button>`}<button data-rename="${c.id}" title="${t("cal.rename")}">✎</button><button data-delcal="${c.id}" class="danger" title="${t("delete")}">✕</button></span></div>`;
  }).join("") : `<p class="empty">${t("cal.none")}</p>`;

  main.innerHTML = `<h1>${t("cal.title")}</h1><p class="sub">${t("cal.sub")}</p>
  <div class="bar"><button id="prev">‹</button><button id="today">${t("cal.today")}</button><button id="next">›</button><strong id="caltitle" style="min-width:150px;text-transform:capitalize"></strong><span class="grow"></span>
    <button id="vm">${t("cal.month")}</button><button id="vw">${t("cal.week")}</button><button id="va">${t("cal.agenda")}</button><button id="addcal" class="primary">${t("cal.add")}</button></div>
  <div id="calbody"></div>
  <h2>${t("cal.mine")}</h2><div id="callist">${list()}</div>
  <dialog id="evdlg"><div id="evcontent"></div><form method="dialog"><button>${t("close")}</button></form></dialog>
  <dialog id="adddlg"><form id="addf" class="form"><h2 style="margin-top:0">${t("cal.add.h")}</h2>
    <label>${t("cal.add.url")}<input name="url" placeholder="https://…/calendar.ics"></label>
    <label>${t("cal.add.file")}<input name="file" type="file" accept=".ics,text/calendar"></label>
    <div class="row2"><label>${t("cal.add.name")}<input name="name"></label><label>${t("cal.add.color")}<input name="color" type="color" value="#d6154b" style="height:38px"></label></div>
    <details><summary>${t("cal.help.sum")}</summary><p class="sub">${t("cal.help")}</p></details>
    <div class="bar"><span class="grow"></span><button type="button" id="canc">${t("cancel")}</button><button class="primary">${t("cal.add.btn")}</button></div></form></dialog>`;
  draw();

  const rerender = () => pageCalendar(main);
  const step = k => {
    if (CAL.view === "week") CAL.week = addDays(CAL.week, 7 * k);
    else CAL.cursor = new Date(CAL.cursor.getFullYear(), CAL.cursor.getMonth() + k, 1);
    draw();
  };
  $("#prev").onclick = () => step(-1);
  $("#next").onclick = () => step(1);
  $("#today").onclick = () => { const n = new Date(); CAL.cursor = new Date(n.getFullYear(), n.getMonth(), 1); CAL.week = mondayOf(n); draw(); };
  const setView = v => {
    if (v !== "week" && CAL.view === "week") { const m = addDays(CAL.week, 3); CAL.cursor = new Date(m.getFullYear(), m.getMonth(), 1); }
    if (v === "week" && CAL.view !== "week") { const n = new Date(); CAL.week = n.getFullYear() === CAL.cursor.getFullYear() && n.getMonth() === CAL.cursor.getMonth() ? mondayOf(n) : mondayOf(CAL.cursor); }
    CAL.view = v; saveCal(); draw();
  };
  $("#vw").onclick = () => setView("week");
  $("#vm").onclick = () => setView("month");
  $("#va").onclick = () => setView("agenda");
  $("#addcal").onclick = () => $("#adddlg").showModal();
  $("#canc").onclick = () => $("#adddlg").close();
  $("#addf").onsubmit = async e => {
    e.preventDefault();
    const f = e.target, file = f.file.files[0];
    try {
      if (file) await api("/calendar-upload", { method: "POST", body: file, headers: { "Content-Type": "text/calendar", "X-Filename": encodeURIComponent(f.name.value || file.name), "X-Color": f.color.value } });
      else if (f.url.value.trim()) await api("/calendars", { method: "POST", json: { url: f.url.value, name: f.name.value, color: f.color.value } });
      else return toast(t("cal.need"));
      $("#adddlg").close(); toast(t("cal.added")); rerender();
    } catch (err) { toast(err.message); }
  };
  main.onclick = async e => {
    const tg = e.target, ev = tg.closest("[data-ev]"), more = tg.closest("[data-day]");
    if (ev) {
      const o = CAL.occ[+ev.dataset.ev], x = o.ev;
      $("#evcontent").innerHTML = `<h2 style="margin-top:0;color:${o.cal.color}">${h(x.summary || t("cal.untitled"))}</h2><p><b>${h(fmtDay(o.start))}</b><br>${h(timeLabel(o))}</p>
        ${x.loc ? `<p>📍 ${linkify(x.loc)}</p>` : ""}${x.desc ? `<p>${linkify(x.desc)}</p>` : ""}${x.url ? `<p><a href="${h(x.url)}" target="_blank" rel="noopener">${t("cal.link")}</a></p>` : ""}<p class="sub">${h(o.cal.name)}</p>`;
      return $("#evdlg").showModal();
    }
    if (more) {
      const [y, m, d] = more.dataset.day.split("-").map(Number);
      $("#evcontent").innerHTML = `<h2 style="margin-top:0">${h(fmtDay(new Date(y, m - 1, d)))}</h2>${CAL.map[more.dataset.day].map(evCard).join("")}`;
      return $("#evdlg").showModal();
    }
    const id = tg.dataset.refresh || tg.dataset.rename || tg.dataset.delcal;
    if (tg.dataset.vis) { const v = +tg.dataset.vis; CAL.hidden.has(v) ? CAL.hidden.delete(v) : CAL.hidden.add(v); saveCal(); draw(); }
    if (tg.dataset.refresh) { await calLoad(+id, true); toast(t("cal.refreshed")); rerender(); }
    if (tg.dataset.rename) { const c = CAL.cals.find(x => x.id == id), n = prompt(t("cal.renameprompt"), c.name); if (n) { await api(`/calendars/${id}`, { method: "PUT", json: { name: n } }); rerender(); } }
    if (tg.dataset.delcal && confirm(t("cal.confirmdel"))) { await api(`/calendars/${id}`, { method: "DELETE" }); delete CAL.data[id]; render(); }
  };
  $("#evdlg").addEventListener("click", e => { if (e.target.id === "evdlg") e.target.close(); });
}

// Bloc « À venir » pour la page d'accueil
async function calUpcomingHtml() {
  if (!S.meta.counts.calendar) return "";
  await calEnsure();
  const n = new Date(), occ = calOccurrences(n, addDays(n, 14)).filter(o => o.end > n).slice(0, 6);
  occ.forEach((o, i) => o.i = i);
  const rows = occ.map(o => `<a class="evrow" href="#/calendar" style="--c:${o.cal.color};color:inherit" title="${h(o.ev.summary)}"><b>${h(shortTitle(o.ev.summary))}</b><span>${h(fmtDay(o.start))} · ${h(o.allDay ? t("cal.allday").toLowerCase() : fmtTime(o.start))}${o.ev.loc ? " · 📍 " + h(o.ev.loc) : ""}</span></a>`).join("");
  return `<h2>${t("cal.upcoming")}</h2>${rows || `<p class="sub">${t("cal.upcoming.none")}</p>`}`;
}
