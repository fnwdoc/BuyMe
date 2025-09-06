import http.server
import socketserver
import json
import requests
from functools import partial
from urllib.parse import urlparse, parse_qs

PORT = 8000
DIRECTORY = "public"

class MyHttpRequestHandler(http.server.BaseHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # We need to serve files from the 'public' directory for GET requests
        self.file_handler = partial(http.server.SimpleHTTPRequestHandler, directory=DIRECTORY)
        super().__init__(*args, **kwargs)

    def do_GET(self):
        # For GET requests, we act like a simple file server
        # This will serve index.htm and any other assets (css, js) we add later
        return self.file_handler(self)

    def do_POST(self):
        # We only handle POST requests to the /fetch-sheet endpoint
        if self.path == '/fetch-sheet':
            try:
                # Get the length of the data
                content_length = int(self.headers['Content-Length'])
                # Read the data
                post_data = self.rfile.read(content_length)
                # Decode it as JSON
                body = json.loads(post_data)

                sheet_url = body.get('url')
                if not sheet_url:
                    raise ValueError("URL da planilha não fornecida.")

                # Use requests to fetch the CSV, it handles redirects automatically
                response = requests.get(sheet_url)
                response.raise_for_status()  # Raises an exception for bad status codes (4xx or 5xx)

                # Send a 200 OK response
                self.send_response(200)
                self.send_header('Content-type', 'text/csv')
                self.end_headers()

                # Send the CSV data back to the client
                self.wfile.write(response.content)

            except Exception as e:
                # If anything goes wrong, send a 500 internal server error
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                error_message = {"error": f"Erro no servidor ao buscar a planilha: {e}"}
                self.wfile.write(json.dumps(error_message).encode('utf-8'))
        else:
            # If the endpoint is not recognized, send a 404
            self.send_error(404, 'Endpoint não encontrado.')

# --- Main execution ---
with socketserver.TCPServer(("", PORT), MyHttpRequestHandler) as httpd:
    print(f"Servidor avançado iniciado. Abra http://localhost:{PORT} no seu navegador.")
    httpd.serve_forever()
