const axios = require("axios");

const BASE_URL =
  process.env.MERCADOPUBLICO_BASE_URL ||
  "https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json";

const DEMO_MODE = process.env.DEMO_MODE === "true";

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

function getMockData(params) {
  const base = [
    {
      CodigoExterno: "1234-5-LE26",
      Nombre: "Adquisición de equipos computacionales para oficinas regionales",
      Estado: "Publicada",
      FechaCierre: "30-06-2026 15:00:00",
      FechaPublicacion: "20-06-2026 09:00:00",
      Tipo: "Licitación Pública",
      Organismo: { CodigoOrganismo: "89100", NombreOrganismo: "Ministerio de Educación", RegionUnidad: "Región Metropolitana de Santiago" },
    },
    {
      CodigoExterno: "2345-1-LE26",
      Nombre: "Servicio de mantención de infraestructura tecnológica",
      Estado: "Publicada",
      FechaCierre: "05-07-2026 12:00:00",
      FechaPublicacion: "21-06-2026 10:30:00",
      Tipo: "Licitación Pública",
      Organismo: { CodigoOrganismo: "11201", NombreOrganismo: "Ministerio de Salud", RegionUnidad: "Región de Valparaíso" },
    },
    {
      CodigoExterno: "3456-2-LP26",
      Nombre: "Consultoría en ciberseguridad y protección de datos Ley 21.719",
      Estado: "Publicada",
      FechaCierre: "15-07-2026 17:00:00",
      FechaPublicacion: "22-06-2026 08:00:00",
      Tipo: "Licitación Pública",
      Organismo: { CodigoOrganismo: "20501", NombreOrganismo: "Subsecretaría del Interior", RegionUnidad: "Región Metropolitana de Santiago" },
    },
    {
      CodigoExterno: "4567-3-LE26",
      Nombre: "Arriendo de solución cloud para gestión documental",
      Estado: "Cerrada",
      FechaCierre: "15-06-2026 15:00:00",
      FechaPublicacion: "01-06-2026 09:00:00",
      Tipo: "Licitación Privada",
      Organismo: { CodigoOrganismo: "89100", NombreOrganismo: "Ministerio de Educación", RegionUnidad: "Región Metropolitana de Santiago" },
    },
    {
      CodigoExterno: "5678-4-TD26",
      Nombre: "Soporte técnico especializado en redes y telecomunicaciones",
      Estado: "Adjudicada",
      FechaCierre: "10-06-2026 12:00:00",
      FechaPublicacion: "28-05-2026 11:00:00",
      Tipo: "Trato Directo",
      Organismo: { CodigoOrganismo: "74000", NombreOrganismo: "Municipalidad de Santiago", RegionUnidad: "Región Metropolitana de Santiago" },
    },
    {
      CodigoExterno: "6789-5-LE26",
      Nombre: "Desarrollo de plataforma web para trámites ciudadanos",
      Estado: "Publicada",
      FechaCierre: "20-07-2026 16:00:00",
      FechaPublicacion: "23-06-2026 14:00:00",
      Tipo: "Licitación Pública",
      Organismo: { CodigoOrganismo: "30100", NombreOrganismo: "Servicio de Registro Civil", RegionUnidad: "Región del Biobío" },
    },
    {
      CodigoExterno: "7890-6-LP26",
      Nombre: "Licencias de software de seguridad endpoint para 500 equipos",
      Estado: "Publicada",
      FechaCierre: "25-07-2026 15:00:00",
      FechaPublicacion: "24-06-2026 09:00:00",
      Tipo: "Licitación Pública",
      Organismo: { CodigoOrganismo: "11201", NombreOrganismo: "Ministerio de Salud", RegionUnidad: "Región de Valparaíso" },
    },
    {
      CodigoExterno: "8901-7-LE26",
      Nombre: "Implementación de sistema ERP para gestión financiera",
      Estado: "Desierta",
      FechaCierre: "01-06-2026 12:00:00",
      FechaPublicacion: "15-05-2026 10:00:00",
      Tipo: "Licitación Privada",
      Organismo: { CodigoOrganismo: "74000", NombreOrganismo: "Municipalidad de Santiago", RegionUnidad: "Región Metropolitana de Santiago" },
    },
  ];

  if (params.CodigoOrganismo) {
    const filtered = base.filter(
      (l) => l.Organismo.CodigoOrganismo === params.CodigoOrganismo
    );
    return { Cantidad: filtered.length, Listado: filtered };
  }
  if (params.codigo) {
    const filtered = base.filter((l) =>
      l.CodigoExterno.toLowerCase().includes(params.codigo.toLowerCase())
    );
    return { Cantidad: filtered.length, Listado: filtered };
  }
  return { Cantidad: base.length, Listado: base };
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
  if (DEMO_MODE || !params.ticket) {
    const mock = getMockData(params);
    return res.status(200).json({ ...mock, _demo: true });
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
