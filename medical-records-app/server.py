import http.server
import socketserver
import json
import os
import urllib.request
import urllib.error
import ssl
from urllib.parse import urlparse

PORT = 8090
DEEPSEEK_API = 'https://api.deepseek.com'
API_KEY = 'sk-350206ad117d434881848a7c3a944c07'

MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
}

APP_DIR = os.path.dirname(os.path.abspath(__file__))

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=APP_DIR, **kwargs)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/chat/completions':
            self.proxy_deepseek()
        else:
            self.send_error(404)

    def proxy_deepseek(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        req = urllib.request.Request(
            DEEPSEEK_API + '/chat/completions',
            data=body,
            headers={
                'Content-Type': 'application/json',
                'Authorization': self.headers.get('Authorization', 'Bearer ' + API_KEY),
            },
            method='POST'
        )

        try:
            ctx = ssl.create_default_context()
            response = urllib.request.urlopen(req, context=ctx)
            content_type = response.headers.get('Content-Type', '')

            if 'text/event-stream' in content_type:
                self.send_response(200)
                self.send_header('Content-Type', 'text/event-stream; charset=utf-8')
                self.send_header('Cache-Control', 'no-cache')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()

                try:
                    while True:
                        line = response.readline()
                        if not line:
                            break
                        self.wfile.write(line)
                        self.wfile.flush()
                except Exception:
                    pass
            else:
                data = response.read()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(data)

        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8', errors='replace')
            self.send_response(e.code)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(error_body.encode('utf-8'))
        except Exception as e:
            self.send_response(502)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        super().end_headers()

    def guess_type(self, path):
        ext = os.path.splitext(path)[1].lower()
        return MIME_TYPES.get(ext, 'application/octet-stream')

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True

if __name__ == '__main__':
    with ThreadedHTTPServer(('', PORT), ProxyHandler) as httpd:
        print(f'Server running at http://localhost:{PORT}')
        print(f'Static files served from: {APP_DIR}')
        print(f'DeepSeek API proxy: /api/chat/completions -> {DEEPSEEK_API}/chat/completions')
        httpd.serve_forever()
