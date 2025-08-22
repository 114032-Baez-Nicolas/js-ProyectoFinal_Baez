// Variables globales
let libros = [];
let librosFiltrados = [];
let carrito = [];
let stockOriginal = {};

// Constantes de la bilbioteca
const LIMITE_ENVIO_GRATIS = 50000;
const COSTO_ENVIO = 2500;

// Función para debounce (la copié de internet)
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Formatear precio en pesos argentinos
function formatearPrecio(precio) {
  return precio.toLocaleString("es-AR");
}

// Mostrar notificaciones con Toastify
function mostrarToast(mensaje, tipo = "success") {
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
    style: {
      background: colores[tipo] || colores.info
    }
  }).showToast();
}

// Cambiar tema claro/oscuro
function cambiarTema() {
  const body = document.body;
  const temaActual = body.getAttribute("data-theme") || "light";
  const nuevoTema = temaActual === "light" ? "dark" : "light";

  body.setAttribute("data-theme", nuevoTema);
  localStorage.setItem("tema_guardado", nuevoTema);

  const btn = document.getElementById("btnToggleTheme");
  if (btn) btn.textContent = nuevoTema === "dark" ? "☀️" : "🌙";
}

function temaInicial() {
  let tema = "light";
  try {
    const guardado = localStorage.getItem("tema_guardado");
    const prefiereOscuro = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    tema = guardado || (prefiereOscuro ? "dark" : "light");
  } catch (e) {
    // Si falla usar tema por defecto
  }
  document.body.setAttribute("data-theme", tema);
  const btn = document.getElementById("btnToggleTheme");
  if (btn) btn.textContent = tema === "dark" ? "☀️" : "🌙";
}

// Cargar datos de libros desde JSON
async function cargarLibros() {
  const resp = await fetch("./data/libros.json");
  if (!resp.ok) throw new Error("error cargando libros");
  const data = await resp.json();
  libros = data.map(l => ({ ...l, id: String(l.id) }));
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
  } catch (e) {
    // Error parseando stock, usar original
  }
}

function guardarStock() {
  try {
    const snapshot = {};
    libros.forEach(l => { snapshot[l.id] = l.stock; });
    stockOriginal = snapshot;
    localStorage.setItem("stock_biblioteca", JSON.stringify(snapshot));
  } catch (e) {
    // Error guardando
  }
}

// Funciones del carrito
function cargarCarrito() {
  try {
    const guardado = localStorage.getItem("carrito_baez");
    carrito = guardado ? JSON.parse(guardado) : [];
  } catch (e) {
    carrito = [];
  }
  actualizarBadgeCarrito();
}

function guardarCarrito() {
  try {
    localStorage.setItem("carrito_baez", JSON.stringify(carrito));
  } catch (e) {
    // Error guardando carrito
  }
  actualizarBadgeCarrito();
}

function actualizarBadgeCarrito() {
  let total = carrito.reduce((sum, item) => sum + item.cantindad, 0);
  const badge = document.querySelector("#badgeCart");
  if (badge) badge.textContent = total;
}

function obtenerCantidadCarrito(libroId) {
  const item = carrito.find(i => i.id === libroId);
  return item ? item.cantindad : 0;
}

// Agregar libro al carrito
function agregarAlCarrito(libroId) {
  const libro = libros.find(l => l.id === libroId);
  if (!libro) return;

  const existente = carrito.find(i => i.id === libroId);
  const qtyActual = existente ? existente.cantindad : 0;
  const nuevaQty = qtyActual + 1;

  if (nuevaQty > libro.stock) {
    Swal.fire({
      icon: "warning",
      title: "Sin stock suficiente",
      text: `Solo hay ${libro.stock} disponibles`
    });
    return;
  }

  if (existente) {
    existente.cantindad = nuevaQty;
  } else {
    carrito.push({
      id: libroId,
      titulo: libro.titulo,
      precio: libro.precio,
      portada: libro.portada,
      stockMax: libro.stock,
      cantindad: 1
    });
  }

  guardarCarrito();
  renderCarrito();
  renderLibros();
  mostrarToast(`"${libro.titulo}" agregado al carrito`);
}

function quitarDelCarrito(libroId) {
  const item = carrito.find(i => i.id === libroId);
  if (!item) return;

  const confirmar = () => {
    carrito = carrito.filter(i => i.id !== libroId);
    guardarCarrito();
    renderCarrito();
    renderLibros();
    mostrarToast("Producto eliminado", "error");
  };

  Swal.fire({
    title: 'Eliminar producto',
    text: `Sacar "${item.titulo}" del carrito?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Si, eliminar',
    cancelButtonText: 'No'
  }).then(r => { if (r.isConfirmed) confirmar(); });
}

function cambiarCantidad(libroId, nuevaCant) {
  const item = carrito.find(i => i.id === libroId);
  const libro = libros.find(l => l.id === libroId);
  if (!item || !libro) return;

  let cant = parseInt(nuevaCant, 10);
  if (isNaN(cant) || cant < 1) cant = 1;
  if (cant > libro.stock) cant = libro.stock;
  item.cantindad = cant;

  guardarCarrito();
  renderCarrito();
  renderLibros();
}

function vaciarCarrito() {
  if (carrito.length === 0) {
    Swal.fire('Info', 'El carrito ya esta vacio', 'info');
    return;
  }

  const confirmar = () => {
    carrito = [];
    guardarCarrito();
    renderCarrito();
    renderLibros();
    mostrarToast("Carrito vaciado", "info");
  };

  Swal.fire({
    title: "Vaciar carrito",
    text: "Seguro?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Si, vaciar",
    cancelButtonText: "Cancelar"
  }).then(r => { if (r.isConfirmed) confirmar(); });
}

// Renderizar grilla de libros
function renderLibros() {
  const grid = document.querySelector("#grid");

  let html = librosFiltrados.map(libro => {
    const enCarrito = obtenerCantidadCarrito(libro.id);
    const stockDisponible = libro.stock - enCarrito;
    const tieneStock = stockDisponible > 0;

    return `
        <div class="col-12 col-sm-6 col-lg-3">
            <div class="card h-100 shadow-sm">
                <img src="${libro.portada}" class="card-img-top img-crop" alt="${libro.titulo}">
                <div class="card-body d-flex flex-column">
                    <h3 class="h6 mb-0" style="min-height:2.6rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                        ${libro.titulo}
                    </h3>
                    <p class="text-muted small mb-2" style="min-height:2.2rem;margin-top:-0.4rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                        ${libro.autor} • ${libro.genero} • ${libro.anio}
                    </p>
                    <div class="d-flex justify-content-between align-items-center" style="min-height:1.8rem;">
                        <strong>$${formatearPrecio(libro.precio)}</strong>
                        <small class="text-muted">${tieneStock ? `Stock: ${stockDisponible}` : "Sin stock"}</small>
                    </div>
                    <button class="btn btn-primary btn-sm mt-auto" onclick="agregarAlCarrito('${libro.id}')" ${!tieneStock ? 'disabled' : ''}>
                        Agregar
                    </button>
                </div>
            </div>
        </div>`;
  }).join('');

  grid.innerHTML = html;
  document.querySelector("#resultCount").textContent = `Mostrando ${librosFiltrados.length} resultados`;
  document.querySelector("#empty").classList.toggle("d-none", librosFiltrados.length !== 0);
}

// Renderizar carrito lateral
function renderCarrito() {
  const cont = document.querySelector("#cartItems");
  if (!cont) return;

  if (carrito.length === 0) {
    cont.innerHTML = `<p class="text-center text-muted my-4">Carrito vacio</p>`;
  } else {
    cont.innerHTML = carrito.map(item => {
      const total = item.precio * item.cantindad;
      return `
                <div class="cart__row">
                    <img src="${item.portada}" alt="" class="cart__thumb">
                    <div class="flex-grow-1">
                        <div class="fw-semibold">${item.titulo}</div>
                        <div class="text-muted small">${formatearPrecio(item.precio)} c/u</div>
                        <div class="d-flex align-items-center gap-2 mt-1">
                            <label class="small text-muted">Cantidad:</label>
                            <input type="number" min="1" max="${item.stockMax}" value="${item.cantindad}"
                                class="form-control form-control-sm w-auto"
                                onchange="cambiarCantidad('${item.id}', this.value)">
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="fw-bold">${formatearPrecio(total)}</div>
                        <button class="btn btn-sm btn-outline-danger mt-1" onclick="quitarDelCarrito('${item.id}')">✕</button>
                    </div>
                </div>`;
    }).join('');
  }
  actualizarTotales();
}

function actualizarTotales() {
  const subtotal = carrito.reduce((sum, i) => sum + (i.precio * i.cantindad), 0);
  const envio = subtotal > LIMITE_ENVIO_GRATIS ? 0 : COSTO_ENVIO;
  const total = subtotal + envio;

  const elems = {
    subtotal: document.querySelector("#cSubtotal"),
    envio: document.querySelector("#cEnvio"),
    total: document.querySelector("#cTotal")
  };
  if (elems.subtotal) elems.subtotal.textContent = formatearPrecio(subtotal);
  if (elems.envio) elems.envio.textContent = formatearPrecio(envio);
  if (elems.total) elems.total.textContent = formatearPrecio(total);
}

// Funciones de filtros
function llenarSelectGenero() {
  const select = document.querySelector("#genre");
  const generos = [...new Set(libros.map(l => l.genero))].sort();
  const options = ['<option value="">Todos los géneros</option>']
    .concat(generos.map(genero => `<option value="${genero}">${genero}</option>`))
    .join('');
  select.innerHTML = options;
}

function aplicarFiltros() {
  const busqueda = document.querySelector("#q").value.toLowerCase().trim();
  const genroElegido = document.querySelector("#genre").value;
  const orden = document.querySelector("#sort").value;

  librosFiltrados = libros.filter(l => {
    const okBusq = !busqueda || l.titulo.toLowerCase().includes(busqueda) || l.autor.toLowerCase().includes(busqueda);
    const okGenro = !genroElegido || l.genero === genroElegido;
    return okBusq && okGenro;
  });

  const ordenes = {
    "precio-asc": (a, b) => a.precio - b.precio,
    "precio-desc": (a, b) => b.precio - a.precio,
    "titulo-az": (a, b) => a.titulo.localeCompare(b.titulo, "es", { sensitivity: "base" })
  };
  if (ordenes[orden]) librosFiltrados.sort(ordenes[orden]);

  renderLibros();
}

function limpiarFiltros() {
  document.querySelector("#q").value = "";
  document.querySelector("#genre").value = "";
  document.querySelector("#sort").value = "todos";
  aplicarFiltros();
  mostrarToast("filtros limpios", "info");
}

// Funciones del carrito UI
function abrirCarrito() {
  document.querySelector("#cart")?.classList.add("show");
  document.querySelector("#backdrop")?.classList.add("show");
  renderCarrito();
}

function cerrarCarrito() {
  document.querySelector("#cart")?.classList.remove("show");
  document.querySelector("#backdrop")?.classList.remove("show");
}

// Exponer función para el navbar
function resetearFiltros() {
  limpiarFiltros();
}
window.resetearFiltros = resetearFiltros;

// Configurar eventos del DOM
function setearEventos() {
  const busquedaDebounced = debounce(aplicarFiltros, 400);
  document.querySelector("#q").addEventListener("input", busquedaDebounced);
  document.querySelector("#genre").addEventListener("change", aplicarFiltros);
  document.querySelector("#sort").addEventListener("change", aplicarFiltros);
  document.querySelector("#btnClear").addEventListener("click", limpiarFiltros);

  document.getElementById("btnToggleTheme")?.addEventListener("click", cambiarTema);

  // Eventos del carrito
  document.querySelector("#btnOpenCart")?.addEventListener("click", abrirCarrito);
  document.querySelector("#btnCloseCart")?.addEventListener("click", cerrarCarrito);
  document.querySelector("#backdrop")?.addEventListener("click", cerrarCarrito);
  document.querySelector("#btnClearCart")?.addEventListener("click", vaciarCarrito);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") cerrarCarrito();
  });
}

// Inicialización de la aplicación
(async function inicializar() {
  try {
    temaInicial();
    cargarCarrito();
    await cargarLibros();
    llenarSelectGenero();
    renderLibros();
    setearEventos();
    renderCarrito();
  } catch (e) {
    document.querySelector("#grid").innerHTML = 
    `<div class="alert alert-danger">Error cargando libros.</div>`;
  }
})();