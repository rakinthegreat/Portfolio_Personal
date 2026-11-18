#!/usr/bin/env python3
"""Tiny read-only stats endpoint for the HP Pavilion home server.

Serves GET /stats as JSON: uptime, running Docker container count, 1-minute load.
Nothing else is exposed: no container names, no IPs, no paths.

Run it on the server (stdlib only, Python 3.8+):
    python3 stats.py --port 8787 --origin https://rakin-talukder.me

Then expose it through the existing Cloudflare Tunnel, e.g. in ~/.cloudflared/config.yml:
    ingress:
      - hostname: stats.rakin-talukder.me
        service: http://localhost:8787
      - service: http_status:404

and build the site with VITE_SERVER_STATS_URL=https://stats.rakin-talukder.me/stats
"""
import argparse
import json
import os
import subprocess
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

CACHE_SECONDS = 30
_cache = {"at": 0.0, "body": b"{}"}


def read_stats() -> dict:
    with open("/proc/uptime") as f:
        uptime = float(f.read().split()[0])
    try:
        out = subprocess.run(["docker", "ps", "-q"], capture_output=True, text=True, timeout=5).stdout
        containers = len([line for line in out.splitlines() if line.strip()])
    except (OSError, subprocess.SubprocessError):
        containers = 0
    return {"uptime_s": int(uptime), "containers": containers, "load1": round(os.getloadavg()[0], 2)}


class Handler(BaseHTTPRequestHandler):
    origin = "*"

    def do_GET(self):
        if self.path.split("?")[0] != "/stats":
            self.send_error(404)
            return
        now = time.time()
        if now - _cache["at"] > CACHE_SECONDS:
            _cache["body"] = json.dumps(read_stats()).encode()
            _cache["at"] = now
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", f"public, max-age={CACHE_SECONDS}")
        self.send_header("Access-Control-Allow-Origin", self.origin)
        self.end_headers()
        self.wfile.write(_cache["body"])

    def log_message(self, *args):  # keep the server quiet
        pass


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8787)
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--origin", default="*", help="allowed CORS origin, e.g. https://rakin-talukder.me")
    a = ap.parse_args()
    Handler.origin = a.origin
    print(f"stats on http://{a.host}:{a.port}/stats (CORS: {a.origin})")
    ThreadingHTTPServer((a.host, a.port), Handler).serve_forever()
