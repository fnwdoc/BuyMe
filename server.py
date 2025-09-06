import http.server
import socketserver
from functools import partial

PORT = 8000
DIRECTORY = "public"

# This is a simple handler that will serve files from the 'public' directory.
# No API logic is needed anymore, as the data will be pasted directly by the user.
Handler = partial(http.server.SimpleHTTPRequestHandler, directory=DIRECTORY)

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Servidor local iniciado. Abra http://localhost:{PORT} no seu navegador.")
    httpd.serve_forever()
