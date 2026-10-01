#!/usr/bin/env python3
"""Wiki Training local : serveur HTTP + SQLite, sans aucune dépendance externe."""
import json
import os
import re
import sqlite3
import subprocess
import sys
import unicodedata
import urllib.parse
import urllib.request
import uuid
import webbrowser
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

BASE = Path(__file__).resolve().parent
DATA = BASE / "data"
UPLOADS = DATA / "uploads"
STATIC = BASE / "static"
DB_PATH = DATA / "wiki.db"
SEED = BASE / "seed.json"

KINDS = ("note", "link", "local")
UPLOAD_TYPES = {
    "image/png": ".png", "image/jpeg": ".jpg", "image/gif": ".gif",
    "image/webp": ".webp", "application/pdf": ".pdf",
}
MAX_UPLOAD = 25 * 1024 * 1024


class ApiError(Exception):
    def __init__(self, message, code=400):
        super().__init__(message)
        self.code = code


# ---------------------------------------------------------------- base de données
def fold(s):
    """Minuscules + sans accents, pour une recherche tolérante."""
    s = unicodedata.normalize("NFD", (s or "").casefold())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.create_function("fold", 1, fold)
    return conn


def now():
    return datetime.now().isoformat(timespec="seconds")


def init_db():
    DATA.mkdir(exist_ok=True)
    UPLOADS.mkdir(exist_ok=True)
    with db() as c:
        c.executescript(
            """
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                kind TEXT NOT NULL,
                title TEXT NOT NULL,
                url TEXT NOT NULL DEFAULT '',
                body TEXT NOT NULL DEFAULT '',
                category TEXT NOT NULL DEFAULT '',
                tags TEXT NOT NULL DEFAULT '',
                favorite INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                orig TEXT NOT NULL,
                mime TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )
        empty = c.execute("SELECT COUNT(*) FROM items").fetchone()[0] == 0
    if empty and SEED.exists():
        import_items(seed_items())


def norm_tags(tags):
    if isinstance(tags, str):
        tags = re.split(r"[,;]", tags)
    seen, out = set(), []
    for t in tags or []:
        t = str(t).strip().lstrip("#")
        if t and t.casefold() not in seen:
            seen.add(t.casefold())
            out.append(t)
    return ",".join(out)


def clean(d):
    kind = d.get("kind")
    if kind not in KINDS:
        raise ApiError("kind invalide")
    title = str(d.get("title", "")).strip()
    url = str(d.get("url", "")).strip()
    if kind in ("link", "local") and not url:
        raise ApiError("L'adresse est obligatoire")
    if kind == "link" and not re.match(r"^https?://", url, re.I):
        raise ApiError("Un lien doit commencer par http:// ou https://")
    if not title:
        title = url if kind != "note" else ""
    if not title:
        raise ApiError("Le titre est obligatoire")
    return {
        "kind": kind, "title": title, "url": url,
        "body": str(d.get("body", "")),
        "category": str(d.get("category", "")).strip(),
        "tags": norm_tags(d.get("tags", "")),
        "favorite": 1 if d.get("favorite") else 0,
    }


def to_dict(r, full=True):
    d = dict(r)
    d["favorite"] = bool(d["favorite"])
    d["tags"] = [t for t in d["tags"].split(",") if t]
    if not full:
        d["excerpt"] = d.pop("body")[:240]
    return d


def import_items(items):
    """Ajoute des éléments en ignorant les doublons (même lien / même titre de note)."""
    added = 0
    with db() as c:
        for raw in items:
            try:
                d = clean(raw)
            except ApiError:
                continue
            if d["kind"] == "note":
                dup = c.execute("SELECT 1 FROM items WHERE kind='note' AND title=?", (d["title"],))
            else:
                dup = c.execute("SELECT 1 FROM items WHERE kind=? AND url=?", (d["kind"], d["url"]))
            if dup.fetchone():
                continue
            t = now()
            c.execute(
                "INSERT INTO items(kind,title,url,body,category,tags,favorite,created_at,updated_at)"
                " VALUES(?,?,?,?,?,?,?,?,?)",
                (d["kind"], d["title"], d["url"], d["body"], d["category"], d["tags"], d["favorite"], t, t),
            )
            added += 1
    return added


def seed_items():
    return json.loads(SEED.read_text(encoding="utf-8")).get("items", []) if SEED.exists() else []


def reset(scope):
    """Suppression en masse. scope : note | link | local | files | all | factory | seed."""
    with db() as c:
        if scope in KINDS:
            c.execute("DELETE FROM items WHERE kind=?", (scope,))
        if scope in ("files", "all", "factory"):
            c.execute("DELETE FROM files")
            for f in UPLOADS.glob("*"):
                f.unlink(missing_ok=True)
        if scope in ("all", "factory"):
            c.execute("DELETE FROM items")
            c.execute("DELETE FROM sqlite_sequence")
    if scope in ("factory", "seed"):
        return import_items(seed_items())
    if scope not in KINDS + ("files", "all"):
        raise ApiError("scope invalide")
    return 0


def list_items(q):
    sql, params = "SELECT * FROM items WHERE 1=1", []
    one = lambda k: (q.get(k) or [""])[0]
    if one("kind"):
        sql += " AND kind=?"
        params.append(one("kind"))
    if one("category"):
        sql += " AND category=?"
        params.append(one("category"))
    if one("tag"):
        sql += " AND (','||fold(tags)||',') LIKE ?"
        params.append(f"%,{fold(one('tag'))},%")
    if one("fav"):
        sql += " AND favorite=1"
    for word in fold(one("q")).split():
        sql += " AND fold(title||' '||body||' '||tags||' '||url||' '||category) LIKE ?"
        params.append(f"%{word}%")
    sql += " ORDER BY updated_at DESC"
    with db() as c:
        return [to_dict(r, full=False) for r in c.execute(sql, params)]


def meta():
    with db() as c:
        rows = list(c.execute("SELECT kind, category, tags FROM items"))
        files = c.execute("SELECT COUNT(*) FROM files").fetchone()[0]
    cats, tags, counts = {}, {}, {k: 0 for k in KINDS}
    for r in rows:
        counts[r["kind"]] += 1
        if r["category"]:
            cats[r["category"]] = cats.get(r["category"], 0) + 1
        for t in r["tags"].split(","):
            if t:
                tags[t] = tags.get(t, 0) + 1
    counts["file"] = files
    srt = lambda d: [{"name": k, "count": v} for k, v in sorted(d.items(), key=lambda x: fold(x[0]))]
    return {"categories": srt(cats), "tags": srt(tags), "counts": counts, "data_dir": str(DATA)}


def fetch_title(url):
    if not re.match(r"^https?://", url, re.I):
        raise ApiError("URL invalide")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 WikiTraining"})
    with urllib.request.urlopen(req, timeout=6) as r:
        raw = r.read(400_000)
        charset = r.headers.get_content_charset() or "utf-8"
    html = raw.decode(charset, errors="replace")
    m = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
    if not m:
        return ""
    import html as htmllib
    return re.sub(r"\s+", " ", htmllib.unescape(m.group(1))).strip()


def open_local(target):
    if sys.platform.startswith("win"):
        os.startfile(target)  # noqa: S606 - action voulue : ouvrir fichier/dossier/appli
    elif sys.platform == "darwin":
        subprocess.Popen(["open", target])
    else:
        subprocess.Popen(["xdg-open", target])


# ---------------------------------------------------------------- HTTP
class Handler(BaseHTTPRequestHandler):
    server_version = "WikiTraining"

    def log_message(self, *a):
        pass

    def send_bytes(self, code, data, ctype, extra=None):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("X-Content-Type-Options", "nosniff")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(data)

    def send_json(self, obj, code=200, extra=None):
        self.send_bytes(code, json.dumps(obj, ensure_ascii=False).encode(), "application/json; charset=utf-8", extra)

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        return self.rfile.read(n) if n else b""

    def json_body(self):
        try:
            return json.loads(self.body() or b"{}")
        except ValueError:
            raise ApiError("JSON invalide")

    def handle_any(self, method):
        u = urllib.parse.urlparse(self.path)
        # Protection DNS-rebinding / requêtes inter-sites : on n'accepte que localhost + en-tête maison
        if self.headers.get("Host", "").split(":")[0] not in ("localhost", "127.0.0.1"):
            return self.send_json({"error": "hôte refusé"}, 403)
        if method != "GET" and self.headers.get("X-Wiki") != "1":
            return self.send_json({"error": "requête refusée"}, 403)
        try:
            if u.path.startswith("/api/"):
                self.api(method, u.path[5:], urllib.parse.parse_qs(u.query))
            elif method == "GET":
                self.static(u.path)
            else:
                raise ApiError("introuvable", 404)
        except ApiError as e:
            self.send_json({"error": str(e)}, e.code)
        except Exception as e:  # noqa: BLE001
            self.send_json({"error": f"erreur interne : {e}"}, 500)

    do_GET = lambda self: self.handle_any("GET")
    do_POST = lambda self: self.handle_any("POST")
    do_PUT = lambda self: self.handle_any("PUT")
    do_DELETE = lambda self: self.handle_any("DELETE")

    def static(self, path):
        if path.startswith("/files/"):
            root, rel = UPLOADS, path[7:]
        else:
            root, rel = STATIC, ("index.html" if path == "/" else path.lstrip("/"))
        f = (root / urllib.parse.unquote(rel)).resolve()
        if root.resolve() not in f.parents or not f.is_file():
            raise ApiError("introuvable", 404)
        types = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
                 ".css": "text/css; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg",
                 ".gif": "image/gif", ".webp": "image/webp", ".pdf": "application/pdf"}
        self.send_bytes(200, f.read_bytes(), types.get(f.suffix.lower(), "application/octet-stream"),
                        {"Cache-Control": "no-cache"})

    def api(self, method, path, q):
        m = re.fullmatch(r"items(?:/(\d+))?", path)
        if m:
            return self.items(method, m.group(1), q)
        m = re.fullmatch(r"open/(\d+)", path)
        if m and method == "POST":
            with db() as c:
                r = c.execute("SELECT url FROM items WHERE id=? AND kind='local'", (m.group(1),)).fetchone()
            if not r:
                raise ApiError("raccourci introuvable", 404)
            open_local(r["url"])
            return self.send_json({"ok": True})
        if path == "meta" and method == "GET":
            return self.send_json(meta())
        if path == "fetch-title" and method == "POST":
            try:
                return self.send_json({"title": fetch_title(str(self.json_body().get("url", "")))})
            except ApiError:
                raise
            except Exception:
                return self.send_json({"title": ""})
        if path == "reset" and method == "POST":
            return self.send_json({"added": reset(str(self.json_body().get("scope", "")))})
        if path == "import" and method == "POST":
            return self.send_json({"added": import_items(self.json_body().get("items", []))})
        if path == "export" and method == "GET":
            with db() as c:
                items = [to_dict(r) for r in c.execute("SELECT * FROM items ORDER BY id")]
            for i in items:
                i["tags"] = ",".join(i["tags"])
                for k in ("id", "created_at", "updated_at"):
                    i.pop(k)
            data = json.dumps({"items": items}, ensure_ascii=False, indent=1).encode()
            return self.send_bytes(200, data, "application/json; charset=utf-8",
                                   {"Content-Disposition": 'attachment; filename="wiki-export.json"'})
        if path == "upload" and method == "POST":
            return self.upload()
        if path == "files" and method == "GET":
            with db() as c:
                return self.send_json([dict(r) for r in c.execute("SELECT * FROM files ORDER BY id DESC")])
        m = re.fullmatch(r"files/(\d+)", path)
        if m and method == "DELETE":
            with db() as c:
                r = c.execute("SELECT name FROM files WHERE id=?", (m.group(1),)).fetchone()
                if r:
                    (UPLOADS / r["name"]).unlink(missing_ok=True)
                    c.execute("DELETE FROM files WHERE id=?", (m.group(1),))
            return self.send_json({"ok": True})
        raise ApiError("introuvable", 404)

    def items(self, method, id_, q):
        with db() as c:
            if id_ is None:
                if method == "GET":
                    return self.send_json(list_items(q))
                if method == "POST":
                    d, t = clean(self.json_body()), now()
                    cur = c.execute(
                        "INSERT INTO items(kind,title,url,body,category,tags,favorite,created_at,updated_at)"
                        " VALUES(:kind,:title,:url,:body,:category,:tags,:favorite,:t,:t)", {**d, "t": t})
                    return self.send_json({"id": cur.lastrowid}, 201)
                raise ApiError("méthode non permise", 405)
            r = c.execute("SELECT * FROM items WHERE id=?", (id_,)).fetchone()
            if not r:
                raise ApiError("introuvable", 404)
            if method == "GET":
                return self.send_json(to_dict(r))
            if method == "PUT":
                d = clean({**to_dict(r), **self.json_body(), "kind": r["kind"]})
                c.execute("UPDATE items SET title=:title,url=:url,body=:body,category=:category,tags=:tags,"
                          "favorite=:favorite,updated_at=:t WHERE id=:id", {**d, "t": now(), "id": id_})
                return self.send_json({"ok": True})
            if method == "DELETE":
                c.execute("DELETE FROM items WHERE id=?", (id_,))
                return self.send_json({"ok": True})
        raise ApiError("méthode non permise", 405)

    def upload(self):
        mime = (self.headers.get("Content-Type") or "").split(";")[0].strip()
        if mime not in UPLOAD_TYPES:
            raise ApiError("Type de fichier non supporté (png, jpg, gif, webp, pdf)")
        if int(self.headers.get("Content-Length") or 0) > MAX_UPLOAD:
            raise ApiError("Fichier trop gros (25 Mo max)", 413)
        data = self.body()
        orig = urllib.parse.unquote(self.headers.get("X-Filename") or "image")[:120]
        name = uuid.uuid4().hex[:12] + UPLOAD_TYPES[mime]
        (UPLOADS / name).write_bytes(data)
        with db() as c:
            c.execute("INSERT INTO files(name,orig,mime,created_at) VALUES(?,?,?,?)", (name, orig, mime, now()))
        self.send_json({"url": f"/files/{name}", "name": orig}, 201)


def main():
    init_db()
    port = int(os.environ.get("WIKI_PORT", 8080))
    for p in range(port, port + 20):
        try:
            srv = ThreadingHTTPServer(("127.0.0.1", p), Handler)
            break
        except OSError:
            continue
    else:
        sys.exit("Aucun port libre trouvé.")
    url = f"http://localhost:{p}/"
    print(f"Wiki Training disponible sur {url}  (Ctrl+C pour arrêter)")
    if "--no-browser" not in sys.argv:
        webbrowser.open(url)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
