// Variables globales
let libros = [];
let librosFiltrados = [];
let carrito = [];
let stockOriginal = {};

// Constantes del negocio
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
    duration: tipo === "success" ? 1800 : 2500,
    gravity: "top",
    position: "left",
    style: {
      background: colores[tipo]
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

  const boton = document.getElementById("btnToggleTheme");
  if (boton) {
    boton.textContent = nuevoTema === "dark" ? "☀️" : "🌙";
  }
}

function configurarTemaInicial() {
  const temaGuardado = localStorage.getItem("tema_guardado");
  const prefiereOscuro = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const tema = temaGuardado || (prefiereOscuro ? "dark" : "light");

  document.body.setAttribute("data-theme", tema);

  const boton = document.getElementById("btnToggleTheme");
  if (boton) {
    boton.textContent = tema === "dark" ? "☀️" : "🌙";
  }
}

// Cargar datos de libros desde JSON
async function cargarLibros() {
  try {
    const response = await fetch("./data/libros.json");
    if (!response.ok) {
      throw new Error("Error al cargar los libros");
    }
    const data = await response.json();

    // Convertir IDs a string por las dudas vinieran como números
    libros = data.map(libro => ({
      ...libro,
      id: String(libro.id)
    }));

    cargarStockGuardado();
    librosFiltrados = [...libros];

    return libros;
  } catch (error) {
    throw new Error("No se pudieron cargar los libros");
  }
}

function cargarStockGuardado() {
  const stockGuardado = localStorage.getItem("stock_biblioteca");
  if (stockGuardado) {
    try {
      stockOriginal = JSON.parse(stockGuardado);
      libros.forEach(libro => {
        if (stockOriginal[libro.id] !== undefined) {
          libro.stock = stockOriginal[libro.id];
        }
      });
    } catch (e) {
      // Si hay error parseando, usar stock original
    }
  }
}

function guardarStock() {
  stockOriginal = {};
  libros.forEach(libro => {
    stockOriginal[libro.id] = libro.stock;
  });
  localStorage.setItem("stock_biblioteca", JSON.stringify(stockOriginal));
}

// Funciones del carrito
function cargarCarrito() {
  const carritoGuardado = localStorage.getItem("carrito_baez");
  if (carritoGuardado) {
    try {
      carrito = JSON.parse(carritoGuardado);
    } catch (e) {
      carrito = [];
    }
  }
  actualizarBadgeCarrito();
}

function guardarCarrito() {
  localStorage.setItem("carrito_baez", JSON.stringify(carrito));
  actualizarBadgeCarrito();
}

function actualizarBadgeCarrito() {
  let total = carrito.reduce((suma, item) => suma + item.cantidad, 0);
  const badge = document.querySelector("#badgeCart");
  if (badge) {
    badge.textContent = total;
  }
}

function obtenerCantidadCarrito(libroId) {
  const item = carrito.find(item => item.id === libroId);
  return item ? item.cantidad : 0;
}

// Agregar libro al carrito
function agregarAlCarrito(libroId) {
  const libro = libros.find(l => l.id === libroId);
  if (!libro) return;

  const existente = carrito.find(item => item.id === libroId);
  const cantidadActual = existente ? existente.cantidad : 0;
  const nuevaCantidad = cantidadActual + 1;

  // Verificar stock
  if (nuevaCantidad > libro.stock) {
    Swal.fire({
      icon: "warning",
      title: "Sin stock suficiente",
      text: `Solo quedan ${libro.stock} ejemplares disponibles`
    });
    return;
  }

  if (existente) {
    existente.cantidad = nuevaCantidad;
  } else {
    carrito.push({
      id: libroId,
      titulo: libro.titulo,
      precio: libro.precio,
      portada: libro.portada,
      stockMax: libro.stock,
      cantidad: 1
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

  Swal.fire({
    title: 'Eliminar producto',
    text: `¿Estás seguro de quitar "${item.titulo}" del carrito?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  }).then((resultado) => {
    if (resultado.isConfirmed) {
      carrito = carrito.filter(i => i.id !== libroId);
      guardarCarrito();
      renderCarrito();
      renderLibros();
      mostrarToast("Producto eliminado del carrito", "error");
    }
  });
}

function cambiarCantidad(libroId, nuevaCantidad) {
  const item = carrito.find(i => i.id === libroId);
  const libro = libros.find(l => l.id === libroId);

  if (!item || !libro) return;

  let cantidad = parseInt(nuevaCantidad, 10);
  if (isNaN(cantidad) || cantidad < 1) {
    cantidad = 1;
  }
  if (cantidad > libro.stock) {
    cantidad = libro.stock;
  }

  item.cantidad = cantidad;
  guardarCarrito();
  renderCarrito();
  renderLibros();
}

function vaciarCarrito() {
  if (carrito.length === 0) {
    Swal.fire('Carrito vacío', 'El carrito ya está vacío', 'info');
    return;
  }

  Swal.fire({
    title: "¿Vaciar carrito?",
    text: "Se eliminarán todos los productos",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, vaciar",
    cancelButtonText: "Cancelar"
  }).then((resultado) => {
    if (resultado.isConfirmed) {
      carrito = [];
      guardarCarrito();
      renderCarrito();
      renderLibros();
      mostrarToast("Carrito vaciado", "info");
    }
  });
}

// Renderizar la grilla de libros
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
                            Agregar al carrito
                        </button>
                    </div>
                </div>
            </div>`;
  }).join('');

  grid.innerHTML = html;
  document.querySelector("#resultCount").textContent = `Mostrando ${librosFiltrados.length} resultados`;

  // Mostrar/ocultar mensaje de sin resultados
  const vacio = document.querySelector("#empty");
  vacio.classList.toggle("d-none", librosFiltrados.length > 0);
}

// Renderizar carrito lateral
function renderCarrito() {
  const contenedor = document.querySelector("#cartItems");
  if (!contenedor) return;

  if (carrito.length === 0) {
    contenedor.innerHTML = `<p class="text-center text-muted my-4">El carrito está vacío</p>`;
  } else {
    contenedor.innerHTML = carrito.map(item => {
      const total = item.precio * item.cantidad;
      return `
                <div class="cart__row">
                    <img src="${item.portada}" alt="" class="cart__thumb">
                    <div class="flex-grow-1">
                        <div class="fw-semibold">${item.titulo}</div>
                        <div class="text-muted small">$${formatearPrecio(item.precio)} c/u</div>
                        <div class="d-flex align-items-center gap-2 mt-1">
                            <label class="small text-muted">Cantidad:</label>
                            <input type="number" min="1" max="${item.stockMax}" value="${item.cantidad}"
                                class="form-control form-control-sm w-auto"
                                onchange="cambiarCantidad('${item.id}', this.value)">
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="fw-bold">$${formatearPrecio(total)}</div>
                        <button class="btn btn-sm btn-outline-danger mt-1" onclick="quitarDelCarrito('${item.id}')">
                            ✕
                        </button>
                    </div>
                </div>`;
    }).join('');
  }

  actualizarTotales();
}

function actualizarTotales() {
  const subtotal = carrito.reduce((suma, item) => suma + (item.precio * item.cantidad), 0);
  const envio = subtotal > LIMITE_ENVIO_GRATIS ? 0 : COSTO_ENVIO;
  const total = subtotal + envio;

  // Actualizar elementos del DOM
  const elementos = {
    subtotal: document.querySelector("#cSubtotal"),
    envio: document.querySelector("#cEnvio"),
    total: document.querySelector("#cTotal")
  };

  if (elementos.subtotal) elementos.subtotal.textContent = formatearPrecio(subtotal);
  if (elementos.envio) elementos.envio.textContent = formatearPrecio(envio);
  if (elementos.total) elementos.total.textContent = formatearPrecio(total);
}

// Llenar select de géneros
function llenarSelectGeneros() {
  const select = document.querySelector("#genre");
  const generos = [...new Set(libros.map(libro => libro.genero))].sort();

  const opciones = ['<option value="">Todos los géneros</option>']
    .concat(generos.map(genero => `<option value="${genero}">${genero}</option>`))
    .join('');

  select.innerHTML = opciones;
}

// Aplicar filtros de búsqueda
function aplicarFiltros() {
  const busqueda = document.querySelector("#q").value.toLowerCase().trim();
  const generoSeleccionado = document.querySelector("#genre").value;
  const ordenamiento = document.querySelector("#sort").value;

  // Filtrar libros
  librosFiltrados = libros.filter(libro => {
    const coincideBusqueda = !busqueda ||
      libro.titulo.toLowerCase().includes(busqueda) ||
      libro.autor.toLowerCase().includes(busqueda);

    const coincideGenero = !generoSeleccionado || libro.genero === generoSeleccionado;

    return coincideBusqueda && coincideGenero;
  });

  // Ordenar resultados
  if (ordenamiento === "precio-asc") {
    librosFiltrados.sort((a, b) => a.precio - b.precio);
  } else if (ordenamiento === "precio-desc") {
    librosFiltrados.sort((a, b) => b.precio - a.precio);
  } else if (ordenamiento === "titulo-az") {
    librosFiltrados.sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));
  }

  renderLibros();
}

// Limpiar todos los filtros
function limpiarFiltros() {
  document.querySelector("#q").value = "";
  document.querySelector("#genre").value = "";
  document.querySelector("#sort").value = "todos";
  aplicarFiltros();
  mostrarToast("Filtros limpiados", "info");
}

// Abrir carrito lateral
function abrirCarrito() {
  const cart = document.querySelector("#cart");
  const backdrop = document.querySelector("#backdrop");

  if (cart) cart.classList.add("show");
  if (backdrop) backdrop.classList.add("show");

  renderCarrito();
}

// Cerrar carrito lateral
function cerrarCarrito() {
  const cart = document.querySelector("#cart");
  const backdrop = document.querySelector("#backdrop");

  if (cart) cart.classList.remove("show");
  if (backdrop) backdrop.classList.remove("show");
}

// Función para resetear filtros (expuesta globalmente para el navbar)
function resetearFiltros() {
  limpiarFiltros();
}

// Configurar eventos del DOM
function configurarEventos() {
  // Búsqueda con debounce
  const busquedaConDebounce = debounce(aplicarFiltros, 400);
  document.querySelector("#q").addEventListener("input", busquedaConDebounce);

  // Filtros
  document.querySelector("#genre").addEventListener("change", aplicarFiltros);
  document.querySelector("#sort").addEventListener("change", aplicarFiltros);
  document.querySelector("#btnClear").addEventListener("click", limpiarFiltros);

  // Tema
  const btnTema = document.getElementById("btnToggleTheme");
  if (btnTema) {
    btnTema.addEventListener("click", cambiarTema);
  }

  // Eventos del carrito
  document.querySelector("#btnOpenCart").addEventListener("click", abrirCarrito);
  document.querySelector("#btnCloseCart").addEventListener("click", cerrarCarrito);
  document.querySelector("#backdrop").addEventListener("click", cerrarCarrito);
  document.querySelector("#btnClearCart").addEventListener("click", vaciarCarrito);

  // Cerrar carrito con la tecla Escape
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") {
      cerrarCarrito();
    }
  });
}

window.resetearFiltros = resetearFiltros;

// Inicialización de la aplicación
(async function inicializarApp() {
  try {
    configurarTemaInicial();
    cargarCarrito();
    await cargarLibros();
    llenarSelectGeneros();
    renderLibros();
    configurarEventos();
    renderCarrito();
  } catch (error) {
    document.querySelector("#grid").innerHTML = 
    `<div class="alert alert-danger">Error cargando libros. Por favor recargá la página.</div>`;
  }
})();