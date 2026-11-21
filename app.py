"""Native Python entry point. SQLite commits evidence and records together."""

import base64
import io
import json
import os
import sqlite3
from contextlib import closing
from pathlib import Path

from flask import Flask, jsonify, request, send_file
from waitress import serve

from freight.api import handle
from freight.common import new_db

app = Flask(__name__, static_folder="public", static_url_path="")
app.config["MAX_CONTENT_LENGTH"] = 4_300_000


@app.get("/")
def index():
    return app.send_static_file("index.html")


@app.route("/api/freight/<path:path>", methods=["GET", "POST", "PATCH", "OPTIONS"])
def freight(path):
    raw = request.get_data(as_text=True)
    req = dict(
        path=path,
        method=request.method,
        raw=raw,
        host=request.host,
        secure=request.is_secure,
        headers={k.lower(): v for k, v in request.headers},
        password=os.getenv("BROKER_ADMIN_PASSWORD", ""),
        secret=os.getenv("BROKER_SESSION_SECRET", ""),
    )
    directory = Path(os.getenv("BROKER_DATA_DIR", "data"))
    directory.mkdir(parents=True, exist_ok=True)
    with closing(
        sqlite3.connect(directory / "broker.sqlite", timeout=20)
    ) as conn, conn:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS state(id INTEGER PRIMARY KEY, payload TEXT NOT NULL)"
        )
        conn.execute(
            "CREATE TABLE IF NOT EXISTS attachments(id TEXT PRIMARY KEY, content BLOB NOT NULL)"
        )
        conn.execute("BEGIN IMMEDIATE" if request.method != "GET" else "BEGIN")
        row = conn.execute("SELECT payload FROM state WHERE id=1").fetchone()
        result = handle(json.loads(row[0]) if row else new_db(), req)
        if "db" in result:
            if "upload" in result:
                conn.execute(
                    "INSERT INTO attachments VALUES (?,?)",
                    (result["upload"], base64.b64decode(json.loads(raw)["base64"])),
                )
            conn.execute(
                "INSERT OR REPLACE INTO state VALUES (1,?)", (json.dumps(result["db"]),)
            )
        if doc := result.get("download"):
            row = conn.execute(
                "SELECT content FROM attachments WHERE id=?", (doc["id"],)
            ).fetchone()
            if row:
                response = send_file(
                    io.BytesIO(row[0]),
                    mimetype=doc["mime"],
                    as_attachment=True,
                    download_name=doc["name"],
                )
                response.headers.update(
                    {
                        "Content-Security-Policy": "default-src 'none'; sandbox",
                        "X-Robots-Tag": "noindex, nofollow",
                    }
                )
            else:
                response = jsonify(error="Document content unavailable.")
                response.status_code = 404
        else:
            response = jsonify(result["body"])
            response.status_code = result["status"]
        if "cookie" in result:
            response.headers["Set-Cookie"] = result["cookie"]
        response.headers.update(
            {"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"}
        )
        return response


if __name__ == "__main__":
    serve(app, host="0.0.0.0", port=int(os.getenv("PORT", "3000")))
