let libros = [];
let librosFiltrados = [];
let carrito = [];
let stockOriginal = {};
const LIMITE_ENVIO_GRATIS = 50000;
const COSTO_ENVIO = 2500;

// utils
const $ = (s) => document.querySelector(s);
function debounce(fn, t = 300) {
  let id;
  return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), t); };
}
function formatearPrecio(n) { return n.toLocaleString("es-AR"); }

// toast (libreria de notificaciones)
function mostrarToast(mensaje, tipo = "info") {
  if (typeof Toastify === "function") {
    const colores = {
      success: "linear-gradient(to right, #00b09b, #96c93d)",
      error: "#dc3545",
      info: "#6c757d"
    };
    Toastify({
      text: mensaje,
      duration: tipo === "success" ? 1800 : 2000,
      gravity: "top",
      position: "left",
      style: { background: colores[tipo] || colores.info }
    }).showToast();
  } else {
    console.log(`[toast ${tipo}]`, mensaje);
  }
}

// tema
function cambiarTema() {
  const body = document.body;
  const temaActual = body.getAttribute("data-theme") || "light";
  const nuevoTema = temaActual === "light" ? "dark" : "light";
  body.setAttribute("data-theme", nuevoTema);
  try { localStorage.setItem("tema_guardado", nuevoTema); } catch { }
  const btn = document.getElementById("btnToggleTheme");
  if (btn) btn.textContent = nuevoTema === "dark" ? "☀️" : "🌙";
}
function temaInicial() {
  let tema = "light";
  try {
    const guardado = localStorage.getItem("tema_guardado");
    const prefiereOscuro = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    tema = guardado || (prefiereOscuro ? "dark" : "light");
  } catch { }
  document.body.setAttribute("data-theme", tema);
  const btn = document.getElementById("btnToggleTheme");
  if (btn) btn.textContent = tema === "dark" ? "☀️" : "🌙";
}

// data
async function cargarLibros() {
  const r = await fetch("./data/libros.json");
  if (!r.ok) throw new Error("No se pudo cargar el catálogo");
  const data = await r.json();
  // normalizo ids a string
  libros = data.map(b => ({ ...b, id: String(b.id) }));
  cargarStockGuardado();
  librosFiltrados = [...libros];
  return libros;
}

function cargarStockGuardado() {
  try {
    const guardado = localStorage.getItem("stock_biblioteca");
    if (!guardado) return;
    stockOriginal = JSON.parse(guardado) || {};
    libros.forEach(l => {
      if (stockOriginal[l.id] !== undefined) l.stock = stockOriginal[l.id];
    });
  } catch { }
}

function guardarStock() {
  try {
    const snapshot = {};
    libros.forEach(l => { snapshot[l.id] = l.stock; });
    stockOriginal = snapshot;
    localStorage.setItem("stock_biblioteca", JSON.stringify(snapshot));
  } catch { }
}

// ui
function llenarSelectGenero() {
  const generos = [...new Set(libros.map(b => b.genero))].sort((a, b) => a.localeCompare(b));
  $("#genre").innerHTML =
    `<option value="">Todos</option>` + generos.map(g => `<option>${g}</option>`).join("");
}

function cardTpl(b) {
  return `
  <div class="col-12 col-sm-6 col-lg-3">
    <div class="card h-100 shadow-sm">
      <img src="${b.portada}" class="card-img-top img-crop" alt="${b.titulo}">
      <div class="card-body d-flex flex-column">
        <h3 class="h6 mb-0" style="min-height:2.6rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
          ${b.titulo}
        </h3>
        <p class="text-muted small mb-2" style="min-height:2.2rem;margin-top:-0.4rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
          ${b.autor} • ${b.genero} • ${b.anio}
        </p>
        <div class="d-flex justify-content-between align-items-center">
          <strong>$${formatearPrecio(b.precio)}</strong>
          <small class="text-muted">Stock: ${b.stock}</small>
        </div>
      </div>
    </div>
  </div>`;
}

function renderLibros() {
  $("#grid").innerHTML = librosFiltrados.map(cardTpl).join("");
  $("#resultCount").textContent = `Mostrando ${librosFiltrados.length} resultados`;
  $("#empty").classList.toggle("d-none", librosFiltrados.length !== 0);
}

function aplicarFiltros() {
  const q = $("#q").value.trim().toLowerCase();
  const g = $("#genre").value;
  const s = $("#sort").value;

  librosFiltrados = libros.filter(b => {
    const okQ = !q || b.titulo.toLowerCase().includes(q) || b.autor.toLowerCase().includes(q);
    const okG = !g || b.genero === g;
    return okQ && okG;
  });

  switch (s) {
    case "precio-asc":
      librosFiltrados.sort((a, b) => a.precio - b.precio);
      break;
    case "precio-desc":
      librosFiltrados.sort((a, b) => b.precio - a.precio);
      break;
    case "titulo-az":
      librosFiltrados.sort((a, b) => a.titulo.localeCompare(b.titulo, "es", { sensitivity: "base" }));
      break;
    // "todos" mantiene orden original
  }

  renderLibros();
}

function limpiarFiltros() {
  $("#q").value = "";
  $("#genre").value = "";
  $("#sort").value = "todos";
  aplicarFiltros();
  mostrarToast("filtros limpios", "info");
}

// exponer reset para el logo del navbar
function resetearFiltros() { limpiarFiltros(); }
window.resetearFiltros = resetearFiltros;

// eventos
function setearEventos() {
  $("#q").addEventListener("input", debounce(aplicarFiltros, 400));
  $("#genre").addEventListener("change", aplicarFiltros);
  $("#sort").addEventListener("change", aplicarFiltros);
  $("#btnClear").addEventListener("click", limpiarFiltros);
  document.getElementById("btnToggleTheme")?.addEventListener("click", cambiarTema);
}

// init
(async function () {
  try {
    temaInicial();
    await cargarLibros();
    llenarSelectGenero();
    aplicarFiltros();
    setearEventos();
  } catch (e) {
    console.error(e);
    $("#grid").innerHTML = `<div class="alert alert-danger">Error cargando libros.</div>`;
  }
})();