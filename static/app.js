const EMOJIS = ["🌲", "🌋", "🏝️", "❄️", "🏰", "🌌", "🏜️", "🌊", "🍄", "👻", "💎", "🐉"];
const COLORES = ["#4caf50", "#f44336", "#2196f3", "#ff9800", "#9c27b0", "#00bcd4", "#e91e63", "#ffeb3b"];
const SECCIONES = [
  { clave: "enemigos", titulo: "👾 Enemigos", ejemplo: "Ej: Goblin" },
  { clave: "desafios", titulo: "🧩 Desafíos", ejemplo: "Ej: Resolver el acertijo" },
  { clave: "recompensas", titulo: "💰 Recompensas", ejemplo: "Ej: 100 monedas" },
  { clave: "objetivos", titulo: "🎯 Objetivos", ejemplo: "Ej: Rescatar al aldeano" },
];

let mundos = [];
let mundoActual = null;
let mundoEditando = null;
let nivelEditando = null;
let borrador = {};

const $ = (id) => document.getElementById(id);

const escapar = (texto) =>
  String(texto).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Comunicación con el servidor
async function api(metodo, ruta, cuerpo) {
  const res = await fetch(ruta, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  return res.json();
}

async function cargar() {
  mundos = await api("GET", "/api/mundos");
  if (mundoActual && !mundos.some((m) => m.id === mundoActual)) mundoActual = null;
  pintar();
}

function avisar(texto) {
  const aviso = $("aviso");
  aviso.textContent = texto;
  aviso.classList.add("visible");
  clearTimeout(aviso.timer);
  aviso.timer = setTimeout(() => aviso.classList.remove("visible"), 2000);
}

function confeti() {
  const piezas = ["🎉", "⭐", "✨", "🪙", "🎊"];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement("div");
    p.className = "confeti";
    p.textContent = piezas[i % piezas.length];
    p.style.left = Math.random() * 100 + "vw";
    p.style.animationDuration = 1.5 + Math.random() * 1.5 + "s";
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 3000);
  }
}

function porcentaje(mundo) {
  if (!mundo.niveles.length) return 0;
  return Math.round((mundo.niveles.filter((n) => n.completado).length / mundo.niveles.length) * 100);
}

// Dibuja la lista de mundos y el marcador
function pintar() {
  const niveles = mundos.flatMap((m) => m.niveles);
  const hechos = niveles.filter((n) => n.completado).length;
  $("marcador").innerHTML = `
    <span class="ficha">🌍 ${mundos.length} mundos</span>
    <span class="ficha">🚩 ${niveles.length} niveles</span>
    <span class="ficha">🏆 ${hechos} completados</span>`;

  $("listaMundos").innerHTML = mundos
    .map(
      (m) => `
      <div class="mundo ${m.id === mundoActual ? "activo" : ""}" data-id="${m.id}">
        <span class="icono">${escapar(m.emoji)}</span>
        <div class="info">
          <div class="nombre">${escapar(m.nombre)}</div>
          <div class="progreso"><div style="width:${porcentaje(m)}%;background:${escapar(m.color)}"></div></div>
        </div>
      </div>`
    )
    .join("");

  document.querySelectorAll(".mundo").forEach((el) =>
    el.addEventListener("click", () => {
      mundoActual = el.dataset.id;
      pintar();
    })
  );

  pintarMapa();
}

// Dibuja los niveles del mundo elegido
function pintarMapa() {
  const mundo = mundos.find((m) => m.id === mundoActual);
  if (!mundo) {
    $("mapa").innerHTML = `
      <div class="vacio">
        <div class="vacio-emoji">🧭</div>
        <p>Elige un mundo o crea uno nuevo para empezar la aventura</p>
      </div>`;
    return;
  }

  const tarjetas = mundo.niveles
    .map(
      (n, i) => `
      <div class="nivel ${n.completado ? "hecho" : ""}" data-id="${n.id}">
        <span class="numero" style="background:${escapar(mundo.color)}">${i + 1}</span>
        <div>${"⭐".repeat(n.dificultad)}</div>
        <h3>${escapar(n.nombre)}</h3>
        <div class="detalle">
          <span>👾 ${n.enemigos.length}</span>
          <span>🧩 ${n.desafios.length}</span>
          <span>💰 ${n.recompensas.length}</span>
          <span>🎯 ${n.objetivos.length}</span>
        </div>
        <button class="check" data-check="${n.id}">${n.completado ? "🏆 ¡Superado!" : "▶ Marcar superado"}</button>
      </div>`
    )
    .join("");

  $("mapa").innerHTML = `
    <div class="cabecera">
      <span class="icono">${escapar(mundo.emoji)}</span>
      <div>
        <h2>${escapar(mundo.nombre)}</h2>
        <div style="color:var(--suave)">${porcentaje(mundo)}% explorado</div>
      </div>
      <span class="espacio"></span>
      <button class="btn btn-gris btn-chico" id="btnEditarMundo">✏️ Editar</button>
      <button class="btn btn-rojo btn-chico" id="btnBorrarMundo">🗑️ Borrar</button>
    </div>
    <div class="camino">
      ${tarjetas}
      <div class="nivel nuevo" id="btnNuevoNivel">＋ Agregar nivel</div>
    </div>`;

  $("btnEditarMundo").onclick = () => abrirMundo(mundo);
  $("btnBorrarMundo").onclick = () => borrarMundo(mundo);
  $("btnNuevoNivel").onclick = () => abrirNivel(null);

  document.querySelectorAll(".nivel[data-id]").forEach((el) =>
    el.addEventListener("click", () => abrirNivel(mundo.niveles.find((n) => n.id === el.dataset.id)))
  );

  document.querySelectorAll("[data-check]").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const nivel = mundo.niveles.find((n) => n.id === btn.dataset.check);
      await api("PUT", `/api/niveles/${nivel.id}`, { completado: !nivel.completado });
      if (!nivel.completado) {
        confeti();
        avisar("¡Nivel superado! 🎉");
      }
      cargar();
    })
  );
}

function elegirOpciones(contenedor, valores, actual, alElegir, esColor) {
  contenedor.innerHTML = valores
    .map(
      (v) =>
        `<button type="button" class="opcion ${v === actual ? "elegida" : ""}" data-v="${v}"
          ${esColor ? `style="background:${v}"` : ""}>${esColor ? "" : v}</button>`
    )
    .join("");
  contenedor.querySelectorAll(".opcion").forEach((b) =>
    b.addEventListener("click", () => {
      alElegir(b.dataset.v);
      contenedor.querySelectorAll(".opcion").forEach((o) => o.classList.toggle("elegida", o === b));
    })
  );
}

function abrirMundo(mundo) {
  mundoEditando = mundo;
  borrador = { emoji: mundo?.emoji || EMOJIS[0], color: mundo?.color || COLORES[0] };
  $("tituloMundo").textContent = mundo ? "Editar mundo" : "Nuevo mundo";
  $("formMundo").nombre.value = mundo?.nombre || "";
  elegirOpciones($("opcionesEmoji"), EMOJIS, borrador.emoji, (v) => (borrador.emoji = v));
  elegirOpciones($("opcionesColor"), COLORES, borrador.color, (v) => (borrador.color = v), true);
  $("modalMundo").classList.add("abierto");
  $("formMundo").nombre.focus();
}

async function borrarMundo(mundo) {
  if (!confirm(`¿Borrar el mundo "${mundo.nombre}" y todos sus niveles?`)) return;
  await api("DELETE", `/api/mundos/${mundo.id}`);
  mundoActual = null;
  avisar("Mundo eliminado 💥");
  cargar();
}

function pintarEstrellas() {
  $("estrellas").innerHTML = [1, 2, 3, 4, 5]
    .map((i) => `<span data-i="${i}" class="${i <= borrador.dificultad ? "on" : ""}">⭐</span>`)
    .join("");
  $("estrellas").querySelectorAll("span").forEach((s) =>
    s.addEventListener("click", () => {
      borrador.dificultad = Number(s.dataset.i);
      pintarEstrellas();
    })
  );
}

function pintarSecciones() {
  $("secciones").innerHTML = SECCIONES.map(
    (s) => `
    <div class="seccion">
      <h4>${s.titulo}</h4>
      <div class="chips">
        ${borrador[s.clave]
          .map((v, i) => `<span class="chip">${escapar(v)}<button type="button" data-borrar="${s.clave}:${i}">✖</button></span>`)
          .join("")}
      </div>
      <input data-lista="${s.clave}" placeholder="${s.ejemplo} y pulsa Enter">
    </div>`
  ).join("");

  $("secciones").querySelectorAll("[data-lista]").forEach((input) =>
    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const valor = input.value.trim();
      if (!valor) return;
      borrador[input.dataset.lista].push(valor);
      pintarSecciones();
      $("secciones").querySelector(`[data-lista="${input.dataset.lista}"]`).focus();
    })
  );

  $("secciones").querySelectorAll("[data-borrar]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const [clave, i] = btn.dataset.borrar.split(":");
      borrador[clave].splice(Number(i), 1);
      pintarSecciones();
    })
  );
}

// Formulario de nivel
function abrirNivel(nivel) {
  nivelEditando = nivel;
  borrador = { dificultad: nivel?.dificultad || 1 };
  SECCIONES.forEach((s) => (borrador[s.clave] = [...(nivel?.[s.clave] || [])]));
  $("tituloNivel").textContent = nivel ? "Editar nivel" : "Nuevo nivel";
  $("formNivel").nombre.value = nivel?.nombre || "";
  $("btnBorrarNivel").style.display = nivel ? "" : "none";
  pintarEstrellas();
  pintarSecciones();
  $("modalNivel").classList.add("abierto");
  $("formNivel").nombre.focus();
}

function cerrarModales() {
  document.querySelectorAll(".modal").forEach((m) => m.classList.remove("abierto"));
}

$("btnNuevoMundo").onclick = () => abrirMundo(null);

$("formMundo").addEventListener("submit", async (e) => {
  e.preventDefault();
  const datos = { nombre: e.target.nombre.value, emoji: borrador.emoji, color: borrador.color };
  if (mundoEditando) {
    await api("PUT", `/api/mundos/${mundoEditando.id}`, datos);
    avisar("Mundo actualizado ✨");
  } else {
    const nuevo = await api("POST", "/api/mundos", datos);
    mundoActual = nuevo.id;
    avisar("¡Nuevo mundo descubierto! 🌍");
  }
  cerrarModales();
  cargar();
});

$("formNivel").addEventListener("submit", async (e) => {
  e.preventDefault();
  SECCIONES.forEach((s) => {
    const pendiente = $("secciones").querySelector(`[data-lista="${s.clave}"]`).value.trim();
    if (pendiente) borrador[s.clave].push(pendiente);
  });
  const datos = { ...borrador, nombre: e.target.nombre.value };
  if (nivelEditando) {
    await api("PUT", `/api/niveles/${nivelEditando.id}`, datos);
    avisar("Nivel guardado 💾");
  } else {
    await api("POST", `/api/mundos/${mundoActual}/niveles`, datos);
    avisar("¡Nivel creado! 🚩");
  }
  cerrarModales();
  cargar();
});

$("btnBorrarNivel").onclick = async () => {
  if (!confirm(`¿Borrar el nivel "${nivelEditando.nombre}"?`)) return;
  await api("DELETE", `/api/niveles/${nivelEditando.id}`);
  cerrarModales();
  avisar("Nivel eliminado 💥");
  cargar();
};

document.querySelectorAll("[data-cerrar]").forEach((b) => (b.onclick = cerrarModales));
document.querySelectorAll(".modal").forEach((m) =>
  m.addEventListener("click", (e) => e.target === m && cerrarModales())
);
document.addEventListener("keydown", (e) => e.key === "Escape" && cerrarModales());

cargar();
