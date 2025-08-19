// Estado mínimo
let lLibros = [];
let lFiltrados = [];

// Utils
const $ = (s) => document.querySelector(s);
function lFormatearPrecio(n) { return n.toLocaleString("es-AR"); }
function lDebounce(fn, t = 300) { let id; return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), t); }; }

// Data
async function lCargarLibros() {
  const r = await fetch("./data/libros.json");
  if (!r.ok) throw new Error("No se pudo cargar el catálogo");
  const data = await r.json();
  // normalizo ids a string
  lLibros = data.map(b => ({ ...b, id: String(b.id) }));
  lFiltrados = [...lLibros];
}

// UI
function lRenderGeneros() {
  const lSet = [...new Set(lLibros.map(b => b.genero))].sort((a, b) => a.localeCompare(b));
  $("#genre").innerHTML = `<option value="">Todos</option>` + lSet.map(g => `<option>${g}</option>`).join("");
}

function lCardTpl(b) {
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
          <strong>$${lFormatearPrecio(b.precio)}</strong>
          <small class="text-muted">Stock: ${b.stock}</small>
        </div>
      </div>
    </div>
  </div>`;
}

function lRenderGrid() {
  $("#grid").innerHTML = lFiltrados.map(lCardTpl).join("");
  $("#resultCount").textContent = `Mostrando ${lFiltrados.length} resultados`;
  $("#empty").classList.toggle("d-none", lFiltrados.length !== 0);
}

function lAplicarFiltros() {
  const q = $("#q").value.trim().toLowerCase();
  const g = $("#genre").value;
  const s = $("#sort").value;

  lFiltrados = lLibros.filter(b => {
    const okQ = !q || b.titulo.toLowerCase().includes(q) || b.autor.toLowerCase().includes(q);
    const okG = !g || b.genero === g;
    return okQ && okG;
  });

  if (s === "precio-asc") lFiltrados.sort((a, b) => a.precio - b.precio);

  lRenderGrid();
}

function lLimpiarFiltros() {
  $("#q").value = "";
  $("#genre").value = "";
  $("#sort").value = "todos";
  lAplicarFiltros();
}

// Bootstrap
function lBindUI() {
  $("#q").addEventListener("input", lDebounce(lAplicarFiltros, 250));
  $("#genre").addEventListener("change", lAplicarFiltros);
  $("#sort").addEventListener("change", lAplicarFiltros);
  $("#btnClear").addEventListener("click", lLimpiarFiltros);
}

// Init
(async function lInit() {
  try {
    await lCargarLibros();
    lRenderGeneros();
    lAplicarFiltros();
    lBindUI();
  } catch (e) {
    console.error(e);
    $("#grid").innerHTML = `<div class="alert alert-danger">Error cargando libros.</div>`;
  }
})();