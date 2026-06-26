const { getTicket, formatFecha, fetchLicitaciones } = require("../_lib/mercadopublico");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "x-chilecompra-ticket");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });

  const ticket = getTicket(req);
  const { fecha } = req.query;
  if (!fecha) return res.status(400).json({ error: "Parámetro requerido: fecha (YYYY-MM-DD)" });

  const fechaFormatted = formatFecha(fecha);
  if (!fechaFormatted) return res.status(400).json({ error: "Formato inválido. Usa YYYY-MM-DD" });

  return fetchLicitaciones({ ticket, fecha: fechaFormatted, formato: "json" }, res);
};
