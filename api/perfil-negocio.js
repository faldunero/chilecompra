const { validarToken, extraerEmail } = require("./_lib/shelltiAuth");
const { supabaseAdmin } = require("./_lib/supabaseAdmin");

const RESOURCE = "mercadopublico";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-shellti-token");
  if (req.method === "OPTIONS") return res.status(200).end();

  const token = req.headers["x-shellti-token"] || req.query.token;
  const auth = await validarToken(token);

  if (!auth.valid) {
    return res.status(401).json({ error: "Sesión inválida o expirada. Vuelve a ingresar." });
  }
  if (auth.resources && auth.resources.length && !auth.resources.includes(RESOURCE)) {
    return res.status(403).json({ error: "Tu cuenta no tiene acceso a esta herramienta." });
  }

  const email = extraerEmail(auth);
  if (!email) {
    console.error("[perfil-negocio] La respuesta de /auth/validate no trajo email:", auth);
    return res.status(500).json({ error: "No se pudo determinar tu email desde la sesión." });
  }

  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("perfiles_negocio")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ perfil: data || null });
  }

  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");

        if (!payload.nombre_empresa || !payload.nombre_empresa.trim()) {
          return res.status(400).json({ error: "El nombre de la empresa es obligatorio." });
        }

        const registro = {
          email,
          nombre_empresa: payload.nombre_empresa.trim(),
          rubro: payload.rubro?.trim() || null,
          descripcion_negocio: payload.descripcion_negocio?.trim() || null,
          palabras_clave: Array.isArray(payload.palabras_clave) ? payload.palabras_clave : [],
          regiones: Array.isArray(payload.regiones) ? payload.regiones.map(Number) : [],
          tipos_licitacion: Array.isArray(payload.tipos_licitacion) ? payload.tipos_licitacion : [],
          monto_minimo: payload.monto_minimo === "" || payload.monto_minimo == null ? null : Number(payload.monto_minimo),
          monto_maximo: payload.monto_maximo === "" || payload.monto_maximo == null ? null : Number(payload.monto_maximo),
          frecuencia_alerta: ["diaria", "semanal"].includes(payload.frecuencia_alerta) ? payload.frecuencia_alerta : "diaria",
          fit_minimo: ["alto", "medio", "bajo"].includes(payload.fit_minimo) ? payload.fit_minimo : "medio",
          activo: payload.activo !== false,
          actualizado_en: new Date().toISOString(),
        };

        const { data, error } = await supabaseAdmin
          .from("perfiles_negocio")
          .upsert(registro, { onConflict: "email" })
          .select()
          .single();

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ perfil: data });
      } catch (err) {
        return res.status(400).json({ error: "Cuerpo de la solicitud inválido: " + err.message });
      }
    });
    return;
  }

  return res.status(405).json({ error: "Método no permitido" });
};
