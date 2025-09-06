import http.server
import socketserver
import json
import requests
from functools import partial

PORT = 8000
DIRECTORY = "public"

class MyHttpRequestHandler(http.server.SimpleHTTPRequestHandler):
    # do_GET is already implemented in SimpleHTTPRequestHandler to serve files from the 'public' directory.
    # We just need to add our custom do_POST method.

    def do_POST(self):
        if self.path == '/fetch-sheet':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                body = json.loads(post_data)

                sheet_url = body.get('url')
                if not sheet_url:
                    raise ValueError("URL da planilha não fornecida.")

                # Use requests to fetch the CSV, pretending to be a browser by setting the User-Agent header
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
                response = requests.get(sheet_url, headers=headers)
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

# We need to tell the handler to serve from the 'public' directory.
# This is done by creating a partial function that sets the 'directory' argument.
Handler = partial(MyHttpRequestHandler, directory=DIRECTORY)

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Servidor avançado iniciado. Abra http://localhost:{PORT} no seu navegador.")
    httpd.serve_forever()
