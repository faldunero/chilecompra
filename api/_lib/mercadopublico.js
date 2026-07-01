const axios = require("axios");

const BASE_URL =
  process.env.MERCADOPUBLICO_BASE_URL ||
  "https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json";

function getTicket(req) {
  return (
    req.headers["x-chilecompra-ticket"] ||
    req.query.ticket ||
    process.env.CHILECOMPRA_TICKET ||
    ""
  );
}

function formatFecha(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return null;
  return `${d}${m}${y}`;
}

// Genera un arreglo de fechas ddmmaaaa entre dos fechas ISO (YYYY-MM-DD), inclusive.
// La API de Licitaciones no soporta rangos nativamente (solo un "fecha" por
// consulta), así que el rango se arma consultando día por día.
function getRangoFechas(desdeISO, hastaISO, maxDias = 31) {
  const desde = new Date(desdeISO + "T00:00:00Z");
  const hasta = new Date(hastaISO + "T00:00:00Z");
  if (isNaN(desde) || isNaN(hasta) || hasta < desde) return null;

  const dias = Math.round((hasta - desde) / 86400000) + 1;
  if (dias > maxDias) return { error: `Rango muy amplio (${dias} días). Máximo permitido: ${maxDias} días.` };

  const fechas = [];
  for (let d = new Date(desde); d <= hasta; d.setUTCDate(d.getUTCDate() + 1)) {
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = d.getUTCFullYear();
    fechas.push(`${dd}${mm}${yyyy}`);
  }
  return { fechas };
}

function normalizeResponse(data) {
  const listado = data.Listado || data.listado || [];
  return {
    Cantidad: data.Cantidad ?? data.cantidad ?? listado.length,
    Listado: listado.map((l) => ({
      CodigoExterno: l.CodigoExterno || l.codigoExterno || "",
      Nombre: l.Nombre || l.nombre || "",
      Estado: l.Estado || l.estado || "",
      FechaCierre: l.FechaCierre || l.fechaCierre || null,
      FechaPublicacion: l.FechaPublicacion || l.fechaPublicacion || null,
      Tipo: l.Tipo || l.tipo || "",
      Organismo: {
        CodigoOrganismo:
          l.Comprador?.CodigoOrganismo ||
          l.Organismo?.CodigoOrganismo ||
          l.comprador?.codigoOrganismo ||
          l.organismo?.codigoOrganismo ||
          "",
        NombreOrganismo:
          l.Comprador?.NombreOrganismo ||
          l.Organismo?.NombreOrganismo ||
          l.comprador?.nombreOrganismo ||
          l.organismo?.nombreOrganismo ||
          "",
        RegionUnidad:
          l.Comprador?.RegionUnidad ||
          l.Organismo?.RegionUnidad ||
          l.comprador?.regionUnidad ||
          l.organismo?.regionUnidad ||
          "",
      },
    })),
  };
}

// Llama a la API real y devuelve { ok:true, data } o { ok:false, status, error },
// sin escribir en `res`. Permite reutilizar la llamada en endpoints que hacen
// una sola consulta y en endpoints que hacen varias (ej. rango de fechas).
async function getLicitaciones(params) {
  if (!params.ticket) {
    return { ok: false, status: 400, error: "Ticket no configurado. Define CHILECOMPRA_TICKET en las variables de entorno." };
  }
  try {
    const { data } = await axios.get(BASE_URL, { params, timeout: 15000 });
    return { ok: true, data: normalizeResponse(data) };
  } catch (err) {
    if (err.response) {
      const s = err.response.status;
      if (s === 401 || s === 403) return { ok: false, status: 401, error: "Ticket inválido o sin autorización." };
      return { ok: false, status: s, error: `Error de MercadoPublico: ${s}` };
    }
    if (err.code === "ECONNABORTED") return { ok: false, status: 504, error: "Tiempo de espera agotado." };
    console.error("[chilecompra]", err.message);
    return { ok: false, status: 500, error: "Error interno." };
  }
}

// Wrapper para endpoints de una sola consulta (código, organismo, activas):
// llama a getLicitaciones y escribe la respuesta HTTP directamente.
async function fetchLicitaciones(params, res) {
  const result = await getLicitaciones(params);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.status(200).json(result.data);
}

module.exports = { getTicket, formatFecha, getRangoFechas, getLicitaciones, fetchLicitaciones };
