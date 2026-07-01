// Se ejecuta apenas carga la página, antes que app.js.
// El overlay #auth-loading-overlay (definido en index.html, justo después de
// <body>) ya está tapando toda la pantalla mientras esto corre, así que no
// hay parpadeo de contenido sin autorizar.
(async function verificarAcceso() {
  const overlay = document.getElementById("auth-loading-overlay");
  const overlayContent = document.getElementById("auth-loading-content");

  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.replace("login.html");
    return;
  }

  const { data: perfil, error } = await supabaseClient
    .from("perfiles")
    .select("aprobado, es_admin, nombre, email, avatar_url")
    .eq("id", session.user.id)
    .single();

  if (error || !perfil) {
    overlayContent.innerHTML = `
      <div style="text-align:center;max-width:320px;">
        <p style="color:#e2e8f0;font-size:14px;margin-bottom:16px;">No pudimos cargar tu perfil. Intenta recargar la página.</p>
        <button id="auth-logout" style="background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:6px;padding:8px 16px;cursor:pointer;">Cerrar sesión</button>
      </div>`;
    document.getElementById("auth-logout").addEventListener("click", cerrarSesion);
    return;
  }

  if (!perfil.aprobado) {
    overlayContent.innerHTML = `
      <div style="text-align:center;max-width:340px;padding:24px;">
        <p style="color:#e2e8f0;font-size:16px;font-weight:600;margin-bottom:8px;">Cuenta pendiente de aprobación</p>
        <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin-bottom:20px;">
          Ingresaste correctamente como <strong style="color:#cbd5e1;">${escapeHtml(perfil.email)}</strong>, pero tu cuenta todavía no ha sido habilitada por un administrador. Te avisaremos apenas esté lista.
        </p>
        <button id="auth-logout" style="background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:6px;padding:8px 16px;cursor:pointer;">Cerrar sesión</button>
      </div>`;
    document.getElementById("auth-logout").addEventListener("click", cerrarSesion);
    return;
  }

  // Aprobado: mostrar info de usuario en el header y liberar la app.
  const headerUser = document.getElementById("header-user");
  if (headerUser) {
    headerUser.hidden = false;
    headerUser.innerHTML = `
      ${perfil.avatar_url ? `<img src="${escapeHtml(perfil.avatar_url)}" alt="" style="width:24px;height:24px;border-radius:50%;" />` : ""}
      <span style="font-size:12px;color:#cbd5e1;">${escapeHtml(perfil.nombre || perfil.email)}</span>
      <button id="btn-logout" style="background:none;border:none;color:#64748b;font-size:12px;cursor:pointer;text-decoration:underline;">Salir</button>
    `;
    document.getElementById("btn-logout").addEventListener("click", cerrarSesion);
  }

  overlay.remove();
})();

async function cerrarSesion() {
  await supabaseClient.auth.signOut();
  window.location.replace("login.html");
}

function escapeHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
