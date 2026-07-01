let allResults = [];
let currentTab = "fecha";
const edicionParams = { tipo: "", estado: "", keyword: "", region: "" };

// Mapa código de región (valor del <select id="ep-region">) → palabra clave que
// debe aparecer dentro de Organismo.RegionUnidad (texto libre que entrega la API,
// ej: "Región Metropolitana de Santiago", "Región de Valparaíso").
const REGION_KEYWORDS = {
  "1": "tarapaca",
  "2": "antofagasta",
  "3": "atacama",
  "4": "coquimbo",
  "5": "valparaiso",
  "6": "higgins",
  "7": "maule",
  "8": "biobio",
  "9": "araucania",
  "10": "los lagos",
  "11": "aysen",
  "12": "magallanes",
  "13": "metropolitana",
  "14": "los rios",
  "15": "arica",
  "16": "nuble",
};

function normalizarTexto(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // quita tildes/diacríticos
}

document.addEventListener("DOMContentLoaded", () => {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("input-fecha-desde").value = today;
  document.getElementById("input-fecha-hasta").value = today;

  checkHealth();

  // Tabs búsqueda
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  document.getElementById("btn-buscar").addEventListener("click", buscar);
  document.getElementById("btn-analizar").addEventListener("click", analizar);

  ["input-fecha-desde", "input-fecha-hasta", "input-org", "input-cod"].forEach((id) => {
    document.getElementById(id)?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") buscar();
    });
  });

  document.getElementById("filter-input").addEventListener("input", aplicarFiltros);
  document.getElementById("filter-estado").addEventListener("change", aplicarFiltros);

  // ── Barra Edición ──
  document.querySelectorAll(".edicion-section-toggle").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const targetId = btn.dataset.target;
      const body = document.getElementById(targetId);
      const expanded = btn.getAttribute("aria-expanded") === "true";
      // Cerrar todas las demás
      document.querySelectorAll(".edicion-section-toggle").forEach((b) => {
        if (b !== btn) {
          b.setAttribute("aria-expanded", "false");
          const t = document.getElementById(b.dataset.target);
          if (t) t.hidden = true;
        }
      });
      btn.setAttribute("aria-expanded", String(!expanded));
      body.hidden = expanded;
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".edicion-section")) {
      document.querySelectorAll(".edicion-section-toggle").forEach((b) => {
        b.setAttribute("aria-expanded", "false");
        const t = document.getElementById(b.dataset.target);
        if (t) t.hidden = true;
      });
    }
  });

  document.getElementById("ep-apply")?.addEventListener("click", () => {
    edicionParams.tipo    = document.getElementById("ep-tipo").value;
    edicionParams.estado  = document.getElementById("ep-estado").value;
    edicionParams.keyword = document.getElementById("ep-keyword").value.trim().toLowerCase();
    edicionParams.region  = document.getElementById("ep-region").value;
    actualizarIndicadorEdicion();
    if (allResults.Listado) aplicarFiltros();
    document.querySelectorAll(".edicion-section-toggle").forEach((b) => {
      b.setAttribute("aria-expanded", "false");
      const t = document.getElementById(b.dataset.target);
      if (t) t.hidden = true;
    });
  });

  document.getElementById("ep-clear")?.addEventListener("click", () => {
    document.getElementById("ep-tipo").value = "";
    document.getElementById("ep-estado").value = "";
    document.getElementById("ep-keyword").value = "";
    document.getElementById("ep-region").value = "";
    edicionParams.tipo = edicionParams.estado = edicionParams.keyword = edicionParams.region = "";
    actualizarIndicadorEdicion();
    if (allResults.Listado) aplicarFiltros();
  });
});

// ── Health ──
async function checkHealth() {
  const badge = document.getElementById("health-badge");
  try {
    const res = await fetch("/api/health");
    if (res.ok) {
      badge.innerHTML = `<span class="dot dot-green"></span><span>Sistema activo</span>`;
    } else throw new Error();
  } catch {
    badge.innerHTML = `<span class="dot dot-red"></span><span>Sistema sin conexión</span>`;
  }
}

// ── Tabs ──
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === `panel-${tab}`));
}

// ── Buscar ──
async function buscar() {
  const btn = document.getElementById("btn-buscar");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px;box-shadow:none;"></span> Buscando…`;
  mostrarCargando();

  try {
    let url = "";
    if (currentTab === "fecha") {
      const desde = document.getElementById("input-fecha-desde").value;
      const hasta = document.getElementById("input-fecha-hasta").value;
      if (!desde) throw new Error("Selecciona una fecha de inicio.");
      url = `/api/licitaciones-fecha?fecha=${desde}`;
      if (hasta && hasta !== desde) url += `&hasta=${hasta}`;
    } else if (currentTab === "organismo") {
      const cod = document.getElementById("input-org").value.trim();
      if (!cod) throw new Error("Ingresa un código de organismo.");
      url = `/api/licitaciones-organismo?codigo=${encodeURIComponent(cod)}`;
    } else {
      const cod = document.getElementById("input-cod").value.trim();
      if (!cod) throw new Error("Ingresa un código de licitación.");
      url = `/api/licitaciones-codigo?codigo=${encodeURIComponent(cod)}`;
    }

    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

    allResults = data;
    renderStats(data);
    aplicarFiltros();

    const demoBanner = document.getElementById("demo-banner");
    if (demoBanner) demoBanner.hidden = !data._demo;

    document.getElementById("stats-panel").hidden = false;
    document.getElementById("toolbar").hidden = false;
    document.getElementById("btn-analizar").hidden = false;
    document.getElementById("ai-panel").hidden = true;
  } catch (err) {
    mostrarError(err.message);
    document.getElementById("stats-panel").hidden = true;
    document.getElementById("toolbar").hidden = true;
    document.getElementById("btn-analizar").hidden = true;
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 10.5L13 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Buscar licitaciones`;
  }
}

// ── Analizar IA ──
async function analizar() {
  if (!allResults.Listado || !allResults.Listado.length) return;

  const btn = document.getElementById("btn-analizar");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px;box-shadow:none;border-top-color:#a855f7;"></span> Analizando con IA…`;

  const aiPanel = document.getElementById("ai-panel");
  const aiContent = document.getElementById("ai-content");
  aiPanel.hidden = false;
  aiContent.innerHTML = `<div class="ai-loading"><div class="spinner" style="border-top-color:#a855f7;"></div><span>Groq está analizando ${allResults.Listado.length} licitaciones…</span></div>`;
  aiPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });

  try {
    const res = await fetch("/api/analizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licitaciones: allResults.Listado }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    aiContent.innerHTML = `<div class="ai-text">${formatAnalysis(data.analysis)}</div>
      <div class="ai-footer">Análisis de ${data.total} licitaciones · Powered by Groq + Llama 3.3 70B</div>`;
  } catch (err) {
    aiContent.innerHTML = `<div class="ai-error">⚠️ ${escHtml(err.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2l1.5 3 3.5.5-2.5 2.5.5 3.5L8 10l-3 1.5.5-3.5L3 5.5 6.5 5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg> Analizar con IA`;
  }
}

function formatAnalysis(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}

// ── Filtros ──
function aplicarFiltros() {
  if (!allResults.Listado) return;
  const query = document.getElementById("filter-input").value.toLowerCase();
  const estadoToolbar = document.getElementById("filter-estado").value.toLowerCase();

  const filtradas = allResults.Listado.filter((l) => {
    const matchQuery = !query ||
      (l.Nombre || "").toLowerCase().includes(query) ||
      (l.CodigoExterno || "").toLowerCase().includes(query) ||
      (l.Organismo?.NombreOrganismo || "").toLowerCase().includes(query);
    const matchEstadoToolbar = !estadoToolbar || (l.Estado || "").toLowerCase().includes(estadoToolbar);
    const matchTipo    = !edicionParams.tipo    || (l.CodigoExterno || "").includes(edicionParams.tipo);
    const matchEstado  = !edicionParams.estado  || (l.Estado || "").toLowerCase().includes(edicionParams.estado);
    const matchKeyword = !edicionParams.keyword || (l.Nombre || "").toLowerCase().includes(edicionParams.keyword);
    const matchRegion  = !edicionParams.region  ||
      normalizarTexto(l.Organismo?.RegionUnidad).includes(REGION_KEYWORDS[edicionParams.region] || "\0");
    return matchQuery && matchEstadoToolbar && matchTipo && matchEstado && matchKeyword && matchRegion;
  });
  renderLicitaciones(filtradas);
}

// ── Stats ──
function renderStats(data) {
  const list = data.Listado || [];
  document.getElementById("stat-total").textContent = data.Cantidad ?? list.length;
  document.getElementById("stat-publicadas").textContent =
    list.filter((l) => (l.Estado || "").toLowerCase().includes("publicada")).length;
  const orgs = new Set(list.map((l) => l.Organismo?.CodigoOrganismo).filter(Boolean));
  document.getElementById("stat-organismos").textContent = orgs.size;
}

// ── Render cards ──
function renderLicitaciones(list) {
  const container = document.getElementById("results-container");
  if (!list || list.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <circle cx="19" cy="19" r="12" stroke="#4a5568" stroke-width="1.5"/>
        <path d="M28 28L37 37" stroke="#4a5568" stroke-width="2" stroke-linecap="round"/>
        <path d="M14 19h10" stroke="#4a5568" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <p class="empty-title">Sin resultados</p>
      <p class="empty-sub">No hay licitaciones con los filtros actuales</p>
    </div>`;
    return;
  }
  const cards = list.map((l) => {
    const badge = getBadgeClass(l.Estado);
    const orgNombre = l.Organismo?.NombreOrganismo || l.Organismo?.CodigoOrganismo || "—";
    const cierre = l.FechaCierre ? `<span class="lic-meta-item">${iconClock()}${l.FechaCierre}</span>` : "";
    const tipo = l.Tipo ? `<span class="lic-meta-item">${iconTag()}${l.Tipo}</span>` : "";
    return `<div class="lic-card">
      <div class="lic-top">
        <span class="lic-name">${escHtml(l.Nombre || "Sin nombre")}</span>
        <span class="lic-code">${escHtml(l.CodigoExterno)}</span>
      </div>
      <div class="lic-meta">
        <div class="lic-meta-items">
          <span class="lic-meta-item">${iconBuilding()}${escHtml(orgNombre)}</span>
          ${cierre}${tipo}
        </div>
        <span class="badge ${badge}">${escHtml(l.Estado || "Desconocido")}</span>
      </div>
    </div>`;
  });
  container.innerHTML = `<div class="lic-list">${cards.join("")}</div>`;
}

function mostrarCargando() {
  document.getElementById("results-container").innerHTML =
    `<div class="loading-state"><div class="spinner"></div>Consultando la API…</div>`;
}

function mostrarError(msg) {
  document.getElementById("results-container").innerHTML = `<div class="error-box">
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" style="flex-shrink:0;margin-top:1px;">
      <circle cx="9" cy="9" r="8" stroke="#fc814a" stroke-width="1.5"/>
      <path d="M9 5.5V9.5M9 12.5v.25" stroke="#fc814a" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
    <div><strong>No se pudo obtener resultados</strong>${escHtml(msg)}</div>
  </div>`;
}

function getBadgeClass(estado) {
  const e = (estado || "").toLowerCase();
  if (e.includes("publicada")) return "badge-publicada";
  if (e.includes("cerrada") || e.includes("cierre")) return "badge-cerrada";
  if (e.includes("adjudicada")) return "badge-adjudicada";
  return "badge-desierta";
}

function escHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function iconBuilding() {
  return `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><rect x="1.5" y="3" width="9" height="8" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M4 11V8h4v3" stroke="currentColor" stroke-width="1.2"/><path d="M1.5 5h9" stroke="currentColor" stroke-width="1.2"/></svg>`;
}
function iconClock() {
  return `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.2"/><path d="M6 3.5V6l1.5 1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;
}
function iconTag() {
  return `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 2h4l5 5-4 4-5-5V2z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><circle cx="4" cy="4" r="0.75" fill="currentColor"/></svg>`;
}

// ── Edición indicator ──
function actualizarIndicadorEdicion() {
  const toggle = document.querySelector("[data-target='esec-params-body']");
  if (!toggle) return;
  const hayFiltros = Object.values(edicionParams).some(Boolean);
  const dotExistente = toggle.querySelector(".active-dot");
  if (hayFiltros && !dotExistente) {
    const dot = document.createElement("span");
    dot.className = "active-dot";
    toggle.appendChild(dot);
  } else if (!hayFiltros && dotExistente) {
    dotExistente.remove();
  }
}
