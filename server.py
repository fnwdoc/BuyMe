import http.server
import socketserver
import json
import requests
import re
from functools import partial

PORT = 8000
DIRECTORY = "public"

class MyHttpRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/fetch-sheet':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                body = json.loads(post_data)

                raw_url = body.get('url')
                if not raw_url:
                    raise ValueError("URL da planilha não fornecida.")

                # Server-side parsing of the Google Sheet URL
                regex = r"spreadsheets/d/([a-zA-Z0-9-_]+)/(?:edit|htmlview)?(?:#gid=([0-9]+))?"
                matches = re.search(regex, raw_url)

                if not matches or not matches.group(1):
                    raise ValueError("URL do Google Sheets inválida ou formato não reconhecido.")

                sheet_id = matches.group(1)
                gid = matches.group(2) or '0'

                export_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}"

                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
                response = requests.get(export_url, headers=headers)
                response.raise_for_status()

                self.send_response(200)
                self.send_header('Content-type', 'text/csv')
                self.end_headers()
                self.wfile.write(response.content)

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                error_message = {"error": f"Erro no servidor: {e}"}
                self.wfile.write(json.dumps(error_message).encode('utf-8'))
        else:
            self.send_error(404, 'Endpoint não encontrado.')

Handler = partial(MyHttpRequestHandler, directory=DIRECTORY)

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Servidor avançado iniciado. Abra http://localhost:{PORT} no seu navegador.")
    httpd.serve_forever()
