const { getTicket, formatFecha, getRangoFechas, getLicitaciones } = require("./_lib/mercadopublico");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "x-chilecompra-ticket");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });

  const ticket = getTicket(req);
  const { fecha, hasta } = req.query;
  if (!fecha) return res.status(400).json({ error: "Parámetro requerido: fecha (YYYY-MM-DD)" });

  // Sin "hasta" (o igual a "fecha"): comportamiento de siempre, un solo día.
  if (!hasta || hasta === fecha) {
    const fechaFormatted = formatFecha(fecha);
    if (!fechaFormatted) return res.status(400).json({ error: "Formato inválido. Usa YYYY-MM-DD" });

    const result = await getLicitaciones({ fecha: fechaFormatted, ticket });
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    return res.status(200).json(result.data);
  }

  // Con "hasta": arma el rango y consulta día por día (la API real no soporta rangos).
  const rango = getRangoFechas(fecha, hasta);
  if (!rango) return res.status(400).json({ error: "Formato de fecha inválido. Usa YYYY-MM-DD." });
  if (rango.error) return res.status(400).json({ error: rango.error });

  const resultados = [];
  for (const fechaDia of rango.fechas) {
    const result = await getLicitaciones({ fecha: fechaDia, ticket });
    if (!result.ok) return res.status(result.status).json({ error: `Falló la consulta del día ${fechaDia}: ${result.error}` });
    resultados.push(result.data);
  }

  const vistos = new Set();
  const listadoUnido = [];
  for (const r of resultados) {
    for (const l of r.Listado) {
      if (l.CodigoExterno && vistos.has(l.CodigoExterno)) continue;
      if (l.CodigoExterno) vistos.add(l.CodigoExterno);
      listadoUnido.push(l);
    }
  }

  return res.status(200).json({
    Cantidad: listadoUnido.length,
    Listado: listadoUnido,
    _rango: { desde: fecha, hasta, dias: rango.fechas.length },
  });
};
