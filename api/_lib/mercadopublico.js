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

async function fetchLicitaciones(params, res) {
  if (!params.ticket) {
    return res.status(400).json({
      error: "Ticket no configurado. Define CHILECOMPRA_TICKET en las variables de entorno.",
    });
  }
  try {
    const { data } = await axios.get(BASE_URL, { params, timeout: 15000 });
    return res.status(200).json(normalizeResponse(data));
  } catch (err) {
    if (err.response) {
      const s = err.response.status;
      if (s === 401 || s === 403)
        return res.status(401).json({ error: "Ticket inválido o sin autorización." });
      return res.status(s).json({ error: `Error de MercadoPublico: ${s}` });
    }
    if (err.code === "ECONNABORTED")
      return res.status(504).json({ error: "Tiempo de espera agotado." });
    console.error("[chilecompra]", err.message);
    return res.status(500).json({ error: "Error interno." });
  }
}

module.exports = { getTicket, formatFecha, fetchLicitaciones };
