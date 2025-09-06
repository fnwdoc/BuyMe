import http.server
import socketserver
from functools import partial

PORT = 8000
DIRECTORY = "public"

# This custom handler will serve files from the specified directory
# It's a cleaner approach than changing the working directory globally
Handler = partial(http.server.SimpleHTTPRequestHandler, directory=DIRECTORY)

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Servidor local iniciado. Abra http://localhost:{PORT} no seu navegador.")
    httpd.serve_forever()
