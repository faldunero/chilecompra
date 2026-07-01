const axios = require("axios");

const BASE_URL =
  process.env.COMPRAAGIL_BASE_URL || "https://api2.mercadopublico.cl";

// A diferencia de la API de Licitaciones, Compra Ágil recibe el ticket
// como header HTTP "ticket", no como query param.
function getTicket(req) {
  return (
    req.headers["x-chilecompra-ticket"] ||
    req.query.ticket ||
    process.env.CHILECOMPRA_TICKET ||
    ""
  );
}

async function fetchCompraAgilListado(params, ticket, res) {
  if (!ticket) {
    return res.status(400).json({
      error: "Ticket no configurado. Define CHILECOMPRA_TICKET en las variables de entorno.",
    });
  }
  try {
    const { data } = await axios.get(`${BASE_URL}/v2/compra-agil`, {
      headers: { ticket },
      params,
      timeout: 15000,
    });
    return res.status(200).json(data);
  } catch (err) {
    return handleError(err, res);
  }
}

async function fetchCompraAgilDetalle(codigo, ticket, res) {
  if (!ticket) {
    return res.status(400).json({
      error: "Ticket no configurado. Define CHILECOMPRA_TICKET en las variables de entorno.",
    });
  }
  try {
    const { data } = await axios.get(`${BASE_URL}/v2/compra-agil/${encodeURIComponent(codigo)}`, {
      headers: { ticket },
      timeout: 15000,
    });
    return res.status(200).json(data);
  } catch (err) {
    return handleError(err, res);
  }
}

function handleError(err, res) {
  if (err.response) {
    const s = err.response.status;
    if (s === 401) return res.status(401).json({ error: "Falta el header ticket o no fue enviado." });
    if (s === 403) return res.status(403).json({ error: "Ticket inválido, inactivo o bloqueado." });
    if (s === 404) return res.status(404).json({ error: "No existe Compra Ágil con ese código." });
    if (s === 429) return res.status(429).json({ error: "Cuota diaria de la API de Compra Ágil agotada. Intenta mañana." });
    return res.status(s).json({ error: `Error de Compra Ágil: ${s}` });
  }
  if (err.code === "ECONNABORTED") return res.status(504).json({ error: "Tiempo de espera agotado." });
  console.error("[compra-agil]", err.message);
  return res.status(500).json({ error: "Error interno." });
}

module.exports = { getTicket, fetchCompraAgilListado, fetchCompraAgilDetalle };
