/* Panel flotante de la demostración: cambia de usuario y de fase del ciclo. */
(function () {
  'use strict';
  var DEMO = window.PREPAR_DEMO;
  if (!DEMO) return;
  var FASES = ['Convocatoria', 'Diagnóstico y Registro', 'Dictaminación', 'Sorteo y Difusión', 'Consulta', 'Resultados', 'Ejecución y Seguimiento', 'Evaluación'];
  var FASES_EN = ['Call for participation', 'Assessment and Registration', 'Feasibility review', 'Draw and Promotion', 'Vote', 'Results', 'Execution and Monitoring', 'Evaluation'];
  var PERFILES = [
    { correo: 'maria.lopez@correo.mx', rol: 'Ciudadana', rolEn: 'Citizen', lugar: 'Clavería, Azcapotzalco', destino: 'ciudadano/inicio.html' },
    { correo: 'carlos.mendez@prepar.mx', rol: 'Funcionario', rolEn: 'Official', lugar: 'Alcaldía Azcapotzalco', destino: 'funcionario/inicio.html' },
    { correo: 'lucia.torres@prepar.mx', rol: 'Funcionaria', rolEn: 'Official', lugar: 'Alcaldía Coyoacán', destino: 'funcionario/inicio.html' },
    { correo: 'admin@prepar.mx', rol: 'Administrador', rolEn: 'Administrator', lugar: 'Todo el simulador', destino: 'admin/inicio.html' },
  ];
  var en = function () { return document.documentElement.getAttribute('lang') === 'en'; };
  var t = function (es, ing) { return en() ? ing : es; };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  var css = '' +
    '.demo-boton{position:fixed;left:14px;bottom:14px;z-index:950;display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:999px;border:1px solid var(--borde,#475569);background:var(--tarjeta,#1E293B);color:var(--texto,#F1F5F9);font:600 14px/1 "Public Sans",system-ui,sans-serif;box-shadow:0 10px 26px rgba(2,6,23,.35);cursor:pointer}' +
    '.demo-boton:hover{border-color:var(--acento,#E08E6D)}' +
    '.demo-boton .punto{width:9px;height:9px;border-radius:50%;background:var(--acento,#E08E6D);box-shadow:0 0 0 4px var(--acento-suave,rgba(224,142,109,.2))}' +
    '.demo-caja{position:fixed;left:14px;bottom:64px;z-index:951;width:min(360px,calc(100vw - 28px));max-height:calc(100vh - 90px);overflow:auto;padding:18px;border-radius:18px;border:1px solid var(--borde,#475569);background:var(--tarjeta,#1E293B);color:var(--texto,#F1F5F9);box-shadow:0 22px 50px rgba(2,6,23,.45);font:400 14px/1.45 "Public Sans",system-ui,sans-serif}' +
    '.demo-caja[hidden]{display:none}' +
    '.demo-caja h2{margin:0 0 2px;font:800 18px/1.2 "Bricolage Grotesque","Public Sans",sans-serif}' +
    '.demo-caja .sub{margin:0 0 14px;color:var(--tenue,#94A3B8);font-size:13px}' +
    '.demo-caja .titulo{margin:14px 0 8px;font-weight:700;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--tenue,#94A3B8)}' +
    '.demo-perfil{display:flex;width:100%;align-items:center;gap:10px;padding:9px 10px;margin-bottom:6px;border-radius:12px;border:1px solid var(--borde-suave,#334155);background:transparent;color:inherit;text-align:left;cursor:pointer;font:inherit}' +
    '.demo-perfil:hover{background:var(--hover,rgba(255,255,255,.06))}' +
    '.demo-perfil.activo{border-color:var(--acento,#E08E6D);background:var(--acento-suave,rgba(224,142,109,.16))}' +
    '.demo-perfil .ini{flex:none;display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--campo,#334155);font-weight:700;font-size:13px}' +
    '.demo-perfil strong{display:block;font-size:14px}.demo-perfil span.l{display:block;font-size:12px;color:var(--tenue,#94A3B8)}' +
    '.demo-fases{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}' +
    '.demo-fase{padding:8px 4px;border-radius:10px;border:1px solid var(--borde-suave,#334155);background:transparent;color:inherit;cursor:pointer;font:600 13px/1 "Public Sans",sans-serif}' +
    '.demo-fase.activa{background:var(--acento,#E08E6D);border-color:var(--acento,#E08E6D);color:var(--sobre-acento,#0F172A)}' +
    '.demo-fase-nombre{margin:8px 0 0;font-size:13px;color:var(--texto-2,#CBD5E1)}' +
    '.demo-acciones{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}' +
    '.demo-acciones button{flex:1 1 auto;padding:9px 12px;border-radius:10px;border:1px solid var(--borde,#475569);background:transparent;color:inherit;font:600 13px/1 "Public Sans",sans-serif;cursor:pointer}' +
    '.demo-acciones button:hover{background:var(--hover,rgba(255,255,255,.06))}' +
    '.demo-nota{margin:14px 0 0;padding:10px 12px;border-radius:10px;background:var(--info-fondo,rgba(118,189,215,.14));color:var(--texto-2,#CBD5E1);font-size:12.5px}' +
    '.demo-login{margin:0 0 18px;padding:14px;border-radius:14px;border:1px dashed var(--acento,#E08E6D);background:var(--acento-suave,rgba(224,142,109,.12))}' +
    '.demo-login p{margin:0 0 10px;font-size:14px}' +
    '.demo-login .demo-perfil{background:var(--tarjeta,#1E293B)}' +
    '@media (max-width:640px){.demo-boton{bottom:12px;left:10px;padding:9px 12px}.demo-caja{left:10px;bottom:58px}}' +
    '@media print{.demo-boton,.demo-caja{display:none!important}}';

  function iniciales(n) { return String(n).split(/\s+/).slice(0, 2).map(function (x) { return x.charAt(0); }).join(''); }
  function nombreDe(correo) {
    var db = DEMO.db();
    var u = db && db.usuarios.find(function (x) { return x.correo === correo; });
    return u ? u.nombre_completo : correo;
  }
  function entrarComo(perfil) {
    var db = DEMO.db();
    var u = db.usuarios.find(function (x) { return x.correo === perfil.correo; });
    DEMO.cambiar({ sesion: u ? u.id : null });
    location.href = perfil.destino;
  }
  function botonPerfil(p, actual) {
    var nombre = nombreDe(p.correo);
    return '<button type="button" class="demo-perfil' + (actual && actual.correo === p.correo ? ' activo' : '') + '" data-demo-correo="' + esc(p.correo) + '">' +
      '<span class="ini" aria-hidden="true">' + esc(iniciales(nombre)) + '</span><span><strong>' + esc(nombre) + '</strong><span class="l">' + esc(t(p.rol, p.rolEn)) + ' · ' + esc(p.lugar) + '</span></span></button>';
  }

  function montar() {
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
    var boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'demo-boton';
    boton.setAttribute('aria-expanded', 'false');
    boton.innerHTML = '<span class="punto" aria-hidden="true"></span><span>' + t('Demostración', 'Demo') + '</span>';
    var caja = document.createElement('div');
    caja.className = 'demo-caja';
    caja.hidden = true;
    caja.setAttribute('role', 'dialog');
    caja.setAttribute('aria-label', t('Panel de demostración', 'Demo panel'));
    document.body.appendChild(caja);
    document.body.appendChild(boton);

    function pintar() {
      var e = DEMO.estado();
      var actual = DEMO.usuarioActual();
      var f = e.fase;
      caja.innerHTML = '<h2>' + t('Modo demostración', 'Demo mode') + '</h2>' +
        '<p class="sub">' + t('Solo el front de Prepar, con datos de ejemplo. No hay servidor ni base de datos.', 'Prepar front end only, with sample data. No server or database.') + '</p>' +
        '<div class="titulo">' + t('Entrar como', 'Sign in as') + '</div>' +
        PERFILES.map(function (p) { return botonPerfil(p, actual); }).join('') +
        '<div class="titulo">' + t('Fase del ciclo', 'Cycle phase') + '</div>' +
        '<div class="demo-fases">' + FASES.map(function (n, i) {
          return '<button type="button" class="demo-fase' + (i + 1 === f ? ' activa' : '') + '" data-demo-fase="' + (i + 1) + '" title="' + esc(t(n, FASES_EN[i])) + '" aria-pressed="' + (i + 1 === f) + '">' + (i + 1) + '</button>';
        }).join('') + '</div>' +
        '<p class="demo-fase-nombre">' + t('Ahora', 'Now') + ': <strong>' + f + '. ' + esc(t(FASES[f - 1], FASES_EN[f - 1])) + '</strong></p>' +
        '<div class="demo-acciones">' +
        (actual ? '<button type="button" data-demo-salir>' + t('Cerrar sesión', 'Sign out') + '</button>' : '') +
        '<button type="button" data-demo-reiniciar>' + t('Restablecer datos', 'Reset data') + '</button></div>' +
        '<p class="demo-nota">' + t('Cada fase muestra el ciclo en ese momento: foro e ideas (2), dictámenes (3), boleta (4), votación abierta (5), ganadores (6), obras y Foto Denuncia (7) y calificaciones (8). Lo que publiques se guarda solo en este navegador.',
        'Each phase shows the cycle at that point: forum and ideas (2), reviews (3), ballot (4), open vote (5), winners (6), works and Photo Report (7) and ratings (8). What you post is saved only in this browser.') + '</p>';
    }
    function abrir(si) {
      if (si) pintar();
      caja.hidden = !si;
      boton.setAttribute('aria-expanded', si ? 'true' : 'false');
    }
    boton.addEventListener('click', function (ev) { ev.stopPropagation(); abrir(caja.hidden); });
    document.addEventListener('click', function (ev) {
      if (!caja.hidden && !caja.contains(ev.target) && ev.target !== boton) abrir(false);
    });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !caja.hidden) { abrir(false); boton.focus(); } });
    caja.addEventListener('click', function (ev) {
      var p = ev.target.closest('[data-demo-correo]');
      if (p) { entrarComo(PERFILES.find(function (x) { return x.correo === p.getAttribute('data-demo-correo'); })); return; }
      var f = ev.target.closest('[data-demo-fase]');
      if (f) { DEMO.cambiar({ fase: Number(f.getAttribute('data-demo-fase')), banderas: {} }); location.reload(); return; }
      if (ev.target.closest('[data-demo-salir]')) { DEMO.cambiar({ sesion: null }); location.href = './'; return; }
      if (ev.target.closest('[data-demo-reiniciar]')) {
        if (window.confirm(t('¿Borrar lo que publicaste en la demostración y volver a los datos de ejemplo?', 'Delete what you posted in the demo and go back to the sample data?'))) { DEMO.reiniciar(); location.reload(); }
      }
    });

    var formLogin = document.getElementById('form-login');
    if (formLogin) {
      var caja2 = document.createElement('div');
      caja2.className = 'demo-login';
      caja2.innerHTML = '<p><strong>' + t('Demostración:', 'Demo:') + '</strong> ' + t('elige una cuenta de ejemplo para entrar sin contraseña.', 'pick a sample account to sign in without a password.') + '</p>' +
        PERFILES.map(function (p) { return botonPerfil(p, null); }).join('');
      var ancla = document.getElementById('mensaje-login');
      if (ancla) ancla.parentNode.insertBefore(caja2, ancla.nextSibling);
      else formLogin.insertBefore(caja2, formLogin.firstChild);
      caja2.addEventListener('click', function (ev) {
        var p = ev.target.closest('[data-demo-correo]');
        if (p) entrarComo(PERFILES.find(function (x) { return x.correo === p.getAttribute('data-demo-correo'); }));
      });
    }
  }

  /* enlaces «#ancla» con <base>: se quedan en la misma página */
  document.addEventListener('click', function (ev) {
    var g = ev.target.closest && ev.target.closest('a[href*="api/"]');
    if (g) {
      ev.preventDefault();
      var msg = t('Esta opción necesita el servidor y no está disponible en la demostración. Usa una de las cuentas de ejemplo.', 'This option needs the server and is not available in the demo. Use one of the sample accounts.');
      if (window.Prepar && window.Prepar.aviso) window.Prepar.aviso(msg, 'info'); else window.alert(msg);
      return;
    }
    var a = ev.target.closest && ev.target.closest('a[href^="#"]');
    if (!a || ev.defaultPrevented) return;
    var h = a.getAttribute('href');
    ev.preventDefault();
    if (h.length > 1) {
      history.pushState(null, '', location.pathname + location.search + h);
      var dest = document.getElementById(h.slice(1));
      if (dest) { dest.scrollIntoView({ behavior: 'smooth' }); if (dest.tabIndex >= 0 || dest.hasAttribute('tabindex')) dest.focus({ preventScroll: true }); }
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
  else montar();
}());
