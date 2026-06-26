let allResults = [];
let currentTab = "fecha";

document.addEventListener("DOMContentLoaded", () => {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("input-fecha").value = today;

  checkHealth();

  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  document.getElementById("btn-buscar").addEventListener("click", buscar);

  ["input-fecha", "input-org", "input-cod", "input-ticket"].forEach((id) => {
    document.getElementById(id)?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") buscar();
    });
  });

  document.getElementById("filter-input").addEventListener("input", aplicarFiltros);
  document.getElementById("filter-estado").addEventListener("change", aplicarFiltros);

  ["input-fecha", "input-org", "input-cod", "input-ticket"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", actualizarUrlPreview);
  });

  actualizarUrlPreview();
});

async function checkHealth() {
  const badge = document.getElementById("health-badge");
  try {
    const res = await fetch("/api/health");
    if (res.ok) {
      badge.innerHTML = `<span class="dot dot-green"></span><span>Backend activo</span>`;
    } else throw new Error();
  } catch {
    badge.innerHTML = `<span class="dot dot-red"></span><span>Sin conexión</span>`;
  }
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === `panel-${tab}`));
  actualizarUrlPreview();
}

function actualizarUrlPreview() {
  const ticket = document.getElementById("input-ticket").value.trim();
  let path = "";
  if (currentTab === "fecha") {
    const fecha = document.getElementById("input-fecha").value || "YYYY-MM-DD";
    path = `/api/licitaciones/fecha?fecha=${fecha}`;
  } else if (currentTab === "organismo") {
    const cod = document.getElementById("input-org").value || "{codigo}";
    path = `/api/licitaciones/organismo?codigo=${cod}`;
  } else {
    const cod = document.getElementById("input-cod").value || "{codigo}";
    path = `/api/licitaciones/codigo?codigo=${cod}`;
  }
  if (ticket) path += `&ticket=***`;
  document.getElementById("url-preview").textContent = `GET ${path}`;
}

async function buscar() {
  const btn = document.getElementById("btn-buscar");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px;box-shadow:none;"></span> Buscando…`;

  mostrarCargando();

  try {
    const ticket = document.getElementById("input-ticket").value.trim();
    const headers = {};
    if (ticket) headers["x-chilecompra-ticket"] = ticket;

    let url = "";
    if (currentTab === "fecha") {
      const fecha = document.getElementById("input-fecha").value;
      if (!fecha) throw new Error("Selecciona una fecha.");
      url = `/api/licitaciones/fecha?fecha=${fecha}`;
    } else if (currentTab === "organismo") {
      const cod = document.getElementById("input-org").value.trim();
      if (!cod) throw new Error("Ingresa un código de organismo.");
      url = `/api/licitaciones/organismo?codigo=${encodeURIComponent(cod)}`;
    } else {
      const cod = document.getElementById("input-cod").value.trim();
      if (!cod) throw new Error("Ingresa un código de licitación.");
      url = `/api/licitaciones/codigo?codigo=${encodeURIComponent(cod)}`;
    }

    const res = await fetch(url, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

    allResults = data;
    renderStats(data);
    aplicarFiltros();

    const demoBanner = document.getElementById("demo-banner");
    if (demoBanner) demoBanner.hidden = !data._demo;

    document.getElementById("stats-panel").hidden = false;
    document.getElementById("toolbar").hidden = false;
  } catch (err) {
    mostrarError(err.message);
    document.getElementById("stats-panel").hidden = true;
    document.getElementById("toolbar").hidden = true;
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 10.5L13 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Buscar licitaciones`;
  }
}

function aplicarFiltros() {
  if (!allResults.Listado) return;
  const query = document.getElementById("filter-input").value.toLowerCase();
  const estadoFiltro = document.getElementById("filter-estado").value.toLowerCase();
  const filtradas = allResults.Listado.filter((l) => {
    const matchQuery = !query ||
      (l.Nombre || "").toLowerCase().includes(query) ||
      (l.CodigoExterno || "").toLowerCase().includes(query) ||
      (l.Organismo?.NombreOrganismo || "").toLowerCase().includes(query);
    const matchEstado = !estadoFiltro || (l.Estado || "").toLowerCase().includes(estadoFiltro);
    return matchQuery && matchEstado;
  });
  renderLicitaciones(filtradas);
}

function renderStats(data) {
  const list = data.Listado || [];
  document.getElementById("stat-total").textContent = data.Cantidad ?? list.length;
  document.getElementById("stat-publicadas").textContent =
    list.filter((l) => (l.Estado || "").toLowerCase().includes("publicada")).length;
  const orgs = new Set(list.map((l) => l.Organismo?.CodigoOrganismo).filter(Boolean));
  document.getElementById("stat-organismos").textContent = orgs.size;
}

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
