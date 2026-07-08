"""Dev server for the Databery site.

Same as `python -m http.server` but sends Cache-Control: no-cache on
every response, so browsers always revalidate and never show stale
pages. Run:  python serve.py   (serves on http://localhost:4321)
"""
import http.server

PORT = 4321


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, must-revalidate")
        super().end_headers()


if __name__ == "__main__":
    with http.server.ThreadingHTTPServer(("", PORT), NoCacheHandler) as httpd:
        print(f"Serving on http://localhost:{PORT} (no-cache)")
        httpd.serve_forever()
