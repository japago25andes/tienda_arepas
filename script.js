/* =========================================================
   AREPA TRICOLOR — Lógica del prototipo
   - Render del menú y filtros por categoría
   - Carrito (agregar, sumar, restar, eliminar, vaciar)
   - Persistencia del carrito en localStorage
   - Envío del pedido por WhatsApp
   - Menú responsive, validación de formularios y toasts
   ========================================================= */

/* ---------- Configuración ---------- */
const CONFIG = {
  // Cambia este número por el WhatsApp real del negocio (código de país + número, sin + ni espacios)
  whatsappNumber: "573000000000",
  deliveryFee: 4000,          // Valor del domicilio
  freeDeliveryFrom: 40000,    // Domicilio gratis desde este subtotal
  storageKey: "arepaTricolorCart"
};

/* ---------- Catálogo de productos ---------- */
const PRODUCTS = [
  // Clásicas
  { id: 1,  name: "Arepa de queso",        category: "clasicas", price: 7000,  emoji: "🧀", desc: "Arepa de maíz blanco a la plancha, rellena de queso campesino derretido.", badge: "Favorita" },
  { id: 2,  name: "Arepa de chócolo",      category: "clasicas", price: 9500,  emoji: "🌽", desc: "Dulce arepa de maíz tierno con mantequilla y cuajada fresca encima." },
  { id: 3,  name: "Arepa boyacense",       category: "clasicas", price: 8500,  emoji: "🫓", desc: "Receta de la abuela: maíz amarillo, un toque de panela y queso por dentro." },
  { id: 4,  name: "Arepa de huevo",        category: "clasicas", price: 8000,  emoji: "🥚", desc: "Crocante, frita y con un huevo entero adentro. Puro sabor costeño." },

  // Rellenas
  { id: 5,  name: "Reina pepiada",         category: "rellenas", price: 14000, emoji: "🥑", desc: "Pollo desmechado con aguacate, mayonesa de la casa y cilantro." },
  { id: 6,  name: "Paisa completa",        category: "rellenas", price: 16000, emoji: "🥩", desc: "Carne desmechada, hogao, chicharrón crocante y maduro.", badge: "Grande" },
  { id: 7,  name: "Pollo y champiñones",   category: "rellenas", price: 14500, emoji: "🍗", desc: "Pollo en salsa cremosa de champiñones con queso gratinado." },
  { id: 8,  name: "Pabellón",              category: "rellenas", price: 15500, emoji: "🫘", desc: "Carne mechada, fríjol negro, tajadas de maduro y queso rallado." },
  { id: 9,  name: "Vegetariana del huerto",category: "rellenas", price: 13000, emoji: "🥗", desc: "Aguacate, champiñones salteados, tomate, maíz tierno y queso.", badge: "Veggie", veg: true },

  // Bebidas
  { id: 10, name: "Avena colombiana",      category: "bebidas",  price: 5000,  emoji: "🥛", desc: "Fría, espesa y con canela. Ideal para acompañar cualquier arepa." },
  { id: 11, name: "Jugo de lulo",          category: "bebidas",  price: 6000,  emoji: "🍹", desc: "Jugo natural en agua o en leche, recién hecho." },
  { id: 12, name: "Chocolate santafereño", category: "bebidas",  price: 5500,  emoji: "☕", desc: "Chocolate caliente de taza con un trozo de queso para meterle." }
];

/* ---------- Utilidades ---------- */
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const formatCOP = (value) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(value);

/* ---------- Referencias del DOM ---------- */
const productsGrid   = $("#products");
const filterButtons  = $$(".filter");
const cartEl         = $("#cart");
const overlay        = $("#overlay");
const cartItemsEl    = $("#cartItems");
const cartEmptyEl    = $("#cartEmpty");
const cartFooterEl   = $("#cartFooter");
const cartCountEl    = $("#cartCount");
const cartSubtotalEl = $("#cartSubtotal");
const cartDeliveryEl = $("#cartDelivery");
const cartTotalEl    = $("#cartTotal");
const cartHintEl     = $("#cartHint");
const toastEl        = $("#toast");
const header         = $("#header");
const nav            = $("#nav");
const menuToggle     = $("#menuToggle");

/* =========================================================
   1. MENÚ DE PRODUCTOS
   ========================================================= */
function renderProducts(filter = "todas") {
  const list = filter === "todas"
    ? PRODUCTS
    : PRODUCTS.filter((p) => p.category === filter);

  productsGrid.innerHTML = list.map((p, index) => `
    <article class="product" style="animation-delay:${index * 0.05}s">
      <div class="product__image product__image--${p.category}">
        ${p.badge ? `<span class="product__badge ${p.veg ? "product__badge--veg" : ""}">${p.badge}</span>` : ""}
        <span aria-hidden="true">${p.emoji}</span>
      </div>
      <div class="product__body">
        <h3 class="product__name">${p.name}</h3>
        <p class="product__desc">${p.desc}</p>
        <div class="product__footer">
          <span class="product__price">${formatCOP(p.price)}</span>
          <button class="product__add" data-id="${p.id}" aria-label="Agregar ${p.name} al carrito">+ Agregar</button>
        </div>
      </div>
    </article>
  `).join("");
}

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => {
      b.classList.remove("is-active");
      b.setAttribute("aria-selected", "false");
    });
    btn.classList.add("is-active");
    btn.setAttribute("aria-selected", "true");
    renderProducts(btn.dataset.filter);
  });
});

// Delegación de eventos: un solo listener para todos los botones "Agregar"
productsGrid.addEventListener("click", (e) => {
  const btn = e.target.closest(".product__add");
  if (!btn) return;
  addToCart(Number(btn.dataset.id));
});

/* =========================================================
   2. CARRITO
   ========================================================= */
let cart = loadCart();

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONFIG.storageKey));
    // Solo conserva productos que existan en el catálogo
    return Array.isArray(saved)
      ? saved.filter((item) => PRODUCTS.some((p) => p.id === item.id) && item.qty > 0)
      : [];
  } catch {
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(cart));
  } catch {
    /* Si el navegador bloquea el almacenamiento, el carrito sigue funcionando en memoria */
  }
}

function getProduct(id) {
  return PRODUCTS.find((p) => p.id === id);
}

function addToCart(id) {
  const item = cart.find((i) => i.id === id);
  if (item) {
    item.qty += 1;
  } else {
    cart.push({ id, qty: 1 });
  }
  updateCart();
  bumpCounter();
  showToast(`✅ ${getProduct(id).name} agregada al carrito`);
}

function changeQty(id, delta) {
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    removeFromCart(id);
    return;
  }
  updateCart();
}

function removeFromCart(id) {
  cart = cart.filter((i) => i.id !== id);
  updateCart();
}

function clearCart() {
  cart = [];
  updateCart();
}

function getTotals() {
  const subtotal = cart.reduce((sum, i) => sum + getProduct(i.id).price * i.qty, 0);
  const delivery = subtotal === 0 || subtotal >= CONFIG.freeDeliveryFrom ? 0 : CONFIG.deliveryFee;
  const units = cart.reduce((sum, i) => sum + i.qty, 0);
  return { subtotal, delivery, total: subtotal + delivery, units };
}

function renderCart() {
  const { subtotal, delivery, total, units } = getTotals();
  const isEmpty = cart.length === 0;

  cartEmptyEl.hidden = !isEmpty;
  cartFooterEl.classList.toggle("is-hidden", isEmpty);
  cartCountEl.textContent = units;

  cartItemsEl.innerHTML = cart.map(({ id, qty }) => {
    const p = getProduct(id);
    return `
      <li class="cart-item">
        <span class="cart-item__icon" aria-hidden="true">${p.emoji}</span>
        <div>
          <p class="cart-item__name">${p.name}</p>
          <p class="cart-item__price">${formatCOP(p.price)} c/u · ${formatCOP(p.price * qty)}</p>
        </div>
        <div class="cart-item__controls">
          <div class="qty">
            <button data-action="minus" data-id="${id}" aria-label="Quitar una ${p.name}">−</button>
            <span>${qty}</span>
            <button data-action="plus" data-id="${id}" aria-label="Agregar una ${p.name}">+</button>
          </div>
          <button class="cart-item__remove" data-action="remove" data-id="${id}">Eliminar</button>
        </div>
      </li>
    `;
  }).join("");

  cartSubtotalEl.textContent = formatCOP(subtotal);
  cartDeliveryEl.textContent = delivery === 0 && subtotal > 0 ? "¡Gratis!" : formatCOP(delivery);
  cartTotalEl.textContent = formatCOP(total);

  if (subtotal > 0 && subtotal < CONFIG.freeDeliveryFrom) {
    cartHintEl.textContent = `Te faltan ${formatCOP(CONFIG.freeDeliveryFrom - subtotal)} para domicilio gratis 🛵`;
  } else if (subtotal >= CONFIG.freeDeliveryFrom) {
    cartHintEl.textContent = "🎉 Tienes domicilio gratis";
  } else {
    cartHintEl.textContent = "";
  }
}

function updateCart() {
  saveCart();
  renderCart();
}

cartItemsEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const actions = {
    plus: () => changeQty(id, 1),
    minus: () => changeQty(id, -1),
    remove: () => removeFromCart(id)
  };
  actions[btn.dataset.action]?.();
});

$("#cartClear").addEventListener("click", () => {
  if (cart.length === 0) return;
  if (confirm("¿Seguro que quieres vaciar el carrito?")) {
    clearCart();
    showToast("🗑️ Carrito vacío");
  }
});

function bumpCounter() {
  cartCountEl.classList.remove("bump");
  void cartCountEl.offsetWidth; // reinicia la animación
  cartCountEl.classList.add("bump");
}

/* ---------- Abrir / cerrar el panel del carrito ---------- */
function openCart() {
  cartEl.classList.add("is-open");
  cartEl.setAttribute("aria-hidden", "false");
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add("is-visible"));
  document.body.classList.add("no-scroll");
  closeNav();
  $("#cartClose").focus();
}

function closeCart() {
  cartEl.classList.remove("is-open");
  cartEl.setAttribute("aria-hidden", "true");
  overlay.classList.remove("is-visible");
  document.body.classList.remove("no-scroll");
  setTimeout(() => { overlay.hidden = true; }, 250);
}

$("#cartOpen").addEventListener("click", openCart);
$("#cartClose").addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && cartEl.classList.contains("is-open")) closeCart();
});

/* =========================================================
   3. VALIDACIÓN DE FORMULARIOS
   ========================================================= */
function setError(input, message) {
  const field = input.closest(".field");
  field.classList.toggle("has-error", Boolean(message));
  $(".field__error", field).textContent = message || "";
}

function validateRequired(input, message) {
  const ok = input.value.trim().length > 0;
  setError(input, ok ? "" : message);
  return ok;
}

function validateEmail(input) {
  const value = input.value.trim();
  if (!value) {
    setError(input, "Escribe tu correo.");
    return false;
  }
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  setError(input, ok ? "" : "El correo no parece válido.");
  return ok;
}

// Limpia el error mientras el usuario escribe
$$(".field input, .field textarea").forEach((input) => {
  input.addEventListener("input", () => setError(input, ""));
});

/* ---------- Checkout: pedido por WhatsApp ---------- */
$("#checkoutForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (cart.length === 0) return;

  const nameInput = $("#customerName");
  const addressInput = $("#customerAddress");
  const payment = $("#paymentMethod").value;

  const validName = validateRequired(nameInput, "Escribe tu nombre.");
  const validAddress = validateRequired(addressInput, "Escribe la dirección de entrega.");
  if (!validName || !validAddress) return;

  const { subtotal, delivery, total } = getTotals();
  const lines = cart.map(({ id, qty }) => {
    const p = getProduct(id);
    return `• ${qty} x ${p.name} — ${formatCOP(p.price * qty)}`;
  });

  const message = [
    "¡Hola, Arepa Tricolor! 🫓 Quiero hacer este pedido:",
    "",
    ...lines,
    "",
    `Subtotal: ${formatCOP(subtotal)}`,
    `Domicilio: ${delivery === 0 ? "Gratis" : formatCOP(delivery)}`,
    `*Total: ${formatCOP(total)}*`,
    "",
    `👤 Nombre: ${nameInput.value.trim()}`,
    `📍 Dirección: ${addressInput.value.trim()}`,
    `💳 Pago: ${payment}`
  ].join("\n");

  const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener");

  showToast("💬 Abriendo WhatsApp con tu pedido…");
});

/* ---------- Formulario de contacto (simulado) ---------- */
$("#contactForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const ok = [
    validateRequired($("#contactName"), "Escribe tu nombre."),
    validateEmail($("#contactEmail")),
    validateRequired($("#contactMessage"), "Escribe un mensaje.")
  ].every(Boolean);

  if (!ok) return;
  form.reset();
  showToast("📨 ¡Gracias! Te responderemos pronto.");
});

/* =========================================================
   4. INTERFAZ GENERAL
   ========================================================= */

/* ---------- Toast ---------- */
let toastTimer;
function showToast(text) {
  toastEl.textContent = text;
  toastEl.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 2200);
}

/* ---------- Menú hamburguesa ---------- */
function closeNav() {
  nav.classList.remove("is-open");
  menuToggle.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
}

menuToggle.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  menuToggle.classList.toggle("is-open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
});

$$(".nav__link").forEach((link) => link.addEventListener("click", closeNav));

/* ---------- Sombra del header al hacer scroll ---------- */
window.addEventListener("scroll", () => {
  header.classList.toggle("is-scrolled", window.scrollY > 10);
}, { passive: true });

/* ---------- Resalta el enlace de la sección visible ---------- */
const sections = $$("main section[id]");
const navLinks = $$(".nav__link");

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`);
    });
  });
}, { rootMargin: "-45% 0px -50% 0px" });

sections.forEach((section) => observer.observe(section));

/* ---------- Año del footer ---------- */
$("#year").textContent = new Date().getFullYear();

/* ---------- Inicio ---------- */
renderProducts();
renderCart();
