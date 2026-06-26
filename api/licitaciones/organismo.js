const { getTicket, fetchLicitaciones } = require("../_lib/mercadopublico");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "x-chilecompra-ticket");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });

  const ticket = getTicket(req);
  const { codigo } = req.query;
  if (!codigo) return res.status(400).json({ error: "Parámetro requerido: codigo" });

  const params = { CodigoOrganismo: codigo, formato: "json" };
  if (ticket) params.ticket = ticket;

  return fetchLicitaciones(params, res);
};
