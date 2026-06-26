const https = require("https");

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

const SHELLTI_PERFIL = `
ShellTI es una pyme chilena de tecnología que ofrece:
- Desarrollo de software y aplicaciones web/móvil
- Infraestructura TI (servidores, redes, cloud)
- Integraciones de sistemas y APIs
- Agentes e IA aplicada a procesos
- Consultoría en Ley 21.719 de Protección de Datos Personales
- Ciberseguridad (auditorías, pentesting, hardening)
- Consultorías TI generales
- Implementaciones de sistemas (ERP, CRM, plataformas)

Es una pyme sin experiencia previa con el Estado, por lo que prioriza:
- Licitaciones de monto accesible (Trato Directo o Licitación Privada/LE)
- Organismos que liciten servicios TI, no hardware masivo
- Proyectos donde pueda destacar por especialización técnica
- Licitaciones con plazo de cierre mayor a 5 días (para preparar bien la oferta)
`;

function groqRequest(messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.3,
      max_tokens: 1500,
    });

    const options = {
      hostname: "api.groq.com",
      path: "/openai/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          resolve(parsed.choices[0].message.content);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  if (!GROQ_API_KEY) {
    return res.status(400).json({ error: "GROQ_API_KEY no configurada en variables de entorno." });
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    try {
      const { licitaciones } = JSON.parse(body);
      if (!licitaciones || !licitaciones.length) {
        return res.status(400).json({ error: "No hay licitaciones para analizar." });
      }

      const listaTexto = licitaciones.map((l, i) =>
        `${i + 1}. [${l.CodigoExterno}] ${l.Nombre}
   Organismo: ${l.Organismo?.NombreOrganismo || "N/A"}
   Estado: ${l.Estado} | Tipo: ${l.Tipo || "N/A"} | Cierre: ${l.FechaCierre || "N/A"}`
      ).join("\n\n");

      const messages = [
        {
          role: "system",
          content: `Eres un asesor experto en licitaciones públicas chilenas (Mercado Público). 
Tu misión es analizar licitaciones y ayudar a una empresa a identificar oportunidades relevantes.
Responde siempre en español, de forma concisa y estructurada.
Usa emojis para hacer el análisis más legible.`,
        },
        {
          role: "user",
          content: `Analiza estas licitaciones para ShellTI:

PERFIL DE LA EMPRESA:
${SHELLTI_PERFIL}

LICITACIONES A ANALIZAR:
${listaTexto}

Entrega:
1. **Resumen ejecutivo** (2-3 líneas del panorama general)
2. **Top 3 oportunidades** para ShellTI, con código, razón y nivel de fit (Alto/Medio/Bajo)
3. **Alertas** (licitaciones que cierran pronto o requieren atención inmediata)
4. **Recomendación** (qué hacer hoy)

Sé directo y accionable. Si ninguna licitación es relevante, dilo claramente.`,
        },
      ];

      const analysis = await groqRequest(messages);
      return res.status(200).json({ analysis, total: licitaciones.length });
    } catch (err) {
      console.error("[groq]", err.message);
      return res.status(500).json({ error: "Error al analizar con IA: " + err.message });
    }
  });
};
