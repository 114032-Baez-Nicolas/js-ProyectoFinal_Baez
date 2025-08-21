let libros = [];
let librosFiltrados = [];

// utils
const $ = (s) => document.querySelector(s);
function debounce(fn, t = 300) {
  let id;
  return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), t); };
}
function formatearPrecio(n) { return n.toLocaleString("es-AR"); }

// data
async function cargarLibros() {
  const r = await fetch("./data/libros.json");
  if (!r.ok) throw new Error("No se pudo cargar el catálogo");
  const data = await r.json();
  // normalizo ids a string
  libros = data.map(b => ({ ...b, id: String(b.id) }));
  librosFiltrados = [...libros];
}

// ui
function renderGeneros() {
  const set = [...new Set(libros.map(b => b.genero))].sort((a, b) => a.localeCompare(b));
  $("#genre").innerHTML = `<option value="">Todos</option>` + set.map(g => `<option>${g}</option>`).join("");
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
}

// exponer reset para el logo del navbar
function resetearFiltros() { limpiarFiltros(); }
window.resetearFiltros = resetearFiltros;

// eventos
function setearEventos() {
  $("#q").addEventListener("input", debounce(aplicarFiltros, 250));
  $("#genre").addEventListener("change", aplicarFiltros);
  $("#sort").addEventListener("change", aplicarFiltros);
  $("#btnClear").addEventListener("click", limpiarFiltros);
}

// init
(async function () {
  try {
    await cargarLibros();
    renderGeneros();
    aplicarFiltros();
    setearEventos();
  } catch (e) {
    console.error(e);
    $("#grid").innerHTML = `<div class="alert alert-danger">Error cargando libros.</div>`;
  }
})();