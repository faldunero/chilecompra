const axios = require("axios");

const SCANNER_URL = "https://web-production-372660.up.railway.app";

// Valida el token contra el mismo backend que usa shellti-guard.js en el
// navegador. Se hace también en el servidor porque el navegador NUNCA debe
// escribir directo en Supabase — todo pasa por acá, con la service_role key.
async function validarToken(token) {
  if (!token) return { valid: false, error: "Falta el token." };
  try {
    const { data } = await axios.post(
      `${SCANNER_URL}/auth/validate`,
      { token, strict: true },
      { timeout: 10000 }
    );
    return data;
  } catch (err) {
    console.error("[shelltiAuth]", err.message);
    return { valid: false, error: "No se pudo validar el token." };
  }
}

// El resto del sistema (admin.html) usa "email" como identificador canónico
// del usuario (ver /admin/revoke, /admin/update-resources). Se intentan un
// par de formas comunes en que podría venir en la respuesta de /auth/validate.
function extraerEmail(auth) {
  return auth.email || auth.user?.email || null;
}

module.exports = { validarToken, extraerEmail };
