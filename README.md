# 🗺️ Aventura Maker

Plataforma sencilla para administrar los mundos y niveles de un videojuego de aventura.
Cada nivel tiene sus propios **enemigos**, **desafíos**, **recompensas** y **objetivos**.

## Cómo usarlo

Solo necesitas Python 3 (no hay que instalar nada más).

```bash
python app.py
```

Se abrirá el navegador en `http://localhost:8000`.

## Qué puedes hacer

- 🌍 Crear, editar y borrar mundos (con ícono y color)
- 🚩 Agregar niveles a cada mundo con dificultad de 1 a 5 estrellas
- 👾 Añadir enemigos, desafíos, recompensas y objetivos (escribe y pulsa Enter)
- 🏆 Marcar niveles como superados y ver el progreso de cada mundo

Los datos se guardan automáticamente en `datos.json`.

## Estructura

```
app.py            Servidor en Python y API
static/index.html Página principal
static/style.css  Estilos
static/app.js     Lógica de la interfaz
```
