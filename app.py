import json
import os
import uuid
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BASE = os.path.dirname(os.path.abspath(__file__))
DATOS = os.path.join(BASE, "datos.json")
STATIC = os.path.join(BASE, "static")
PUERTO = 8000

TIPOS = {".html": "text/html", ".css": "text/css", ".js": "application/javascript"}
LISTAS = ("enemigos", "desafios", "recompensas", "objetivos")


# Datos iniciales de ejemplo
def ejemplo():
    return {
        "mundos": [
            {
                "id": nuevo_id(),
                "nombre": "Bosque Encantado",
                "emoji": "🌲",
                "color": "#4caf50",
                "niveles": [
                    {
                        "id": nuevo_id(),
                        "nombre": "La entrada del bosque",
                        "dificultad": 1,
                        "completado": False,
                        "enemigos": ["Slime verde", "Murciélago"],
                        "desafios": ["Saltar sobre el río"],
                        "recompensas": ["50 monedas", "Espada de madera"],
                        "objetivos": ["Encontrar la llave dorada"],
                    }
                ],
            },
            {
                "id": nuevo_id(),
                "nombre": "Volcán Ardiente",
                "emoji": "🌋",
                "color": "#f44336",
                "niveles": [],
            },
        ]
    }


def nuevo_id():
    return uuid.uuid4().hex[:8]


# Lectura y escritura del archivo JSON
def cargar():
    if not os.path.exists(DATOS):
        guardar(ejemplo())
    with open(DATOS, encoding="utf-8") as f:
        return json.load(f)


def guardar(datos):
    with open(DATOS, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)


def buscar_mundo(datos, mundo_id):
    return next((m for m in datos["mundos"] if m["id"] == mundo_id), None)


def buscar_nivel(datos, nivel_id):
    for mundo in datos["mundos"]:
        for nivel in mundo["niveles"]:
            if nivel["id"] == nivel_id:
                return mundo, nivel
    return None, None


def limpiar_nivel(cuerpo, nivel=None):
    nivel = nivel or {"id": nuevo_id(), "completado": False}
    nivel["nombre"] = str(cuerpo.get("nombre", nivel.get("nombre", "Nivel sin nombre"))).strip() or "Nivel sin nombre"
    nivel["dificultad"] = max(1, min(5, int(cuerpo.get("dificultad", nivel.get("dificultad", 1)))))
    if "completado" in cuerpo:
        nivel["completado"] = bool(cuerpo["completado"])
    for lista in LISTAS:
        valores = cuerpo.get(lista, nivel.get(lista, []))
        nivel[lista] = [str(v).strip() for v in valores if str(v).strip()]
    return nivel


# Servidor web y rutas de la API
class Servidor(BaseHTTPRequestHandler):
    def responder(self, codigo, cuerpo=None):
        texto = json.dumps(cuerpo if cuerpo is not None else {}, ensure_ascii=False).encode("utf-8")
        self.send_response(codigo)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(texto)))
        self.end_headers()
        self.wfile.write(texto)

    def leer_cuerpo(self):
        largo = int(self.headers.get("Content-Length", 0))
        if not largo:
            return {}
        return json.loads(self.rfile.read(largo).decode("utf-8"))

    def partes(self):
        return [p for p in self.path.split("?")[0].split("/") if p]

    def do_GET(self):
        partes = self.partes()
        if partes == ["api", "mundos"]:
            return self.responder(200, cargar()["mundos"])
        archivo = "index.html" if not partes else os.path.join(*partes[1:]) if partes[0] == "static" else None
        ruta = os.path.normpath(os.path.join(STATIC, archivo)) if archivo else None
        if not ruta or not ruta.startswith(STATIC) or not os.path.isfile(ruta):
            return self.responder(404, {"error": "No encontrado"})
        with open(ruta, "rb") as f:
            contenido = f.read()
        self.send_response(200)
        self.send_header("Content-Type", TIPOS.get(os.path.splitext(ruta)[1], "text/plain") + "; charset=utf-8")
        self.send_header("Content-Length", str(len(contenido)))
        self.end_headers()
        self.wfile.write(contenido)

    def do_POST(self):
        partes, datos, cuerpo = self.partes(), cargar(), self.leer_cuerpo()

        if partes == ["api", "mundos"]:
            mundo = {
                "id": nuevo_id(),
                "nombre": str(cuerpo.get("nombre", "")).strip() or "Mundo misterioso",
                "emoji": cuerpo.get("emoji") or "🏝️",
                "color": cuerpo.get("color") or "#2196f3",
                "niveles": [],
            }
            datos["mundos"].append(mundo)
            guardar(datos)
            return self.responder(201, mundo)

        if len(partes) == 4 and partes[:2] == ["api", "mundos"] and partes[3] == "niveles":
            mundo = buscar_mundo(datos, partes[2])
            if not mundo:
                return self.responder(404, {"error": "Mundo no encontrado"})
            nivel = limpiar_nivel(cuerpo)
            mundo["niveles"].append(nivel)
            guardar(datos)
            return self.responder(201, nivel)

        self.responder(404, {"error": "Ruta no válida"})

    def do_PUT(self):
        partes, datos, cuerpo = self.partes(), cargar(), self.leer_cuerpo()

        if len(partes) == 3 and partes[:2] == ["api", "mundos"]:
            mundo = buscar_mundo(datos, partes[2])
            if not mundo:
                return self.responder(404, {"error": "Mundo no encontrado"})
            for campo in ("nombre", "emoji", "color"):
                if cuerpo.get(campo):
                    mundo[campo] = cuerpo[campo]
            guardar(datos)
            return self.responder(200, mundo)

        if len(partes) == 3 and partes[:2] == ["api", "niveles"]:
            _, nivel = buscar_nivel(datos, partes[2])
            if not nivel:
                return self.responder(404, {"error": "Nivel no encontrado"})
            limpiar_nivel(cuerpo, nivel)
            guardar(datos)
            return self.responder(200, nivel)

        self.responder(404, {"error": "Ruta no válida"})

    def do_DELETE(self):
        partes, datos = self.partes(), cargar()

        if len(partes) == 3 and partes[:2] == ["api", "mundos"]:
            datos["mundos"] = [m for m in datos["mundos"] if m["id"] != partes[2]]
            guardar(datos)
            return self.responder(200, {"ok": True})

        if len(partes) == 3 and partes[:2] == ["api", "niveles"]:
            mundo, nivel = buscar_nivel(datos, partes[2])
            if nivel:
                mundo["niveles"].remove(nivel)
                guardar(datos)
            return self.responder(200, {"ok": True})

        self.responder(404, {"error": "Ruta no válida"})

    def log_message(self, formato, *args):
        pass


if __name__ == "__main__":
    print(f"🎮 Servidor listo en http://localhost:{PUERTO}  (Ctrl+C para salir)")
    webbrowser.open(f"http://localhost:{PUERTO}")
    try:
        ThreadingHTTPServer(("localhost", PUERTO), Servidor).serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Hasta la próxima aventura")
