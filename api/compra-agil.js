const { getTicket, fetchCompraAgilListado } = require("./_lib/compraagil");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "x-chilecompra-ticket");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });

  const ticket = getTicket(req);
  const {
    ttl_cambio_ms,
    cambio_desde,
    cambio_hasta,
    publicado_desde,
    publicado_hasta,
    estado,
    region,
    id,
    q,
    tamano_pagina,
    numero_pagina,
    ordenar_por,
  } = req.query;

  // id y q son mutuamente excluyentes según la documentación.
  if (id && q) {
    return res.status(400).json({ error: "Los parámetros 'id' y 'q' son mutuamente excluyentes." });
  }

  const params = {};
  if (ttl_cambio_ms) params.ttl_cambio_ms = ttl_cambio_ms;
  if (cambio_desde) params.cambio_desde = cambio_desde;
  if (cambio_hasta) params.cambio_hasta = cambio_hasta;
  if (publicado_desde) params.publicado_desde = publicado_desde;
  if (publicado_hasta) params.publicado_hasta = publicado_hasta;
  if (estado) params.estado = estado;
  if (region) params.region = region;
  if (id) params.id = id;
  if (q) params.q = q;
  if (tamano_pagina) params.tamano_pagina = tamano_pagina;
  if (numero_pagina) params.numero_pagina = numero_pagina;
  if (ordenar_por) params.ordenar_por = ordenar_por;

  return fetchCompraAgilListado(params, ticket, res);
};
