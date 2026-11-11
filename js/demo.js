/* Prepar · versión de demostración (solo front).
   Sustituye al servidor: responde las llamadas a /api/... con datos de ejemplo
   que viven en el navegador. Lo que hagas (ideas, votos, comentarios…) se guarda
   en este navegador hasta que presiones «Restablecer datos». */
(function () {
  'use strict';
  var D = window.PREPAR_DATOS;
  var S = window.PREPAR_SEMILLA;
  var CLAVE = 'prepar_demo_v1';
  var fmt = D.fmt;

  /* ---------- estado guardado ---------- */
  function leer() {
    try { var e = JSON.parse(localStorage.getItem(CLAVE) || 'null'); if (e && e.fase) return e; } catch (x) { }
    return { fase: 7, sesion: null, ops: [], banderas: {} };
  }
  var est = leer();
  est.ops = est.ops || [];
  est.banderas = est.banderas || {};
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(est)); }
    catch (x) {
      est.ops = est.ops.map(function (o) { if (o.b && o.b.__archivo) { o.b = Object.assign({}, o.b, { __archivo: null }); } return o; });
      try { localStorage.setItem(CLAVE, JSON.stringify(est)); } catch (y) { }
    }
  }

  /* ---------- base de datos en memoria ---------- */
  var DB = null;
  var reproduciendo = false;
  function construir() {
    DB = D.generar(est.fase, new Date());
    var c = DB.ciclos[0];
    if (est.banderas.sinPublicar && est.fase >= 6) c.resultados_publicados_en = null;
    if (est.banderas.votacionCerrada && est.fase === 5) { c.votacion_abierta = 0; c.votacion_cerrada_en = fmt(new Date()); }
    if (est.banderas.votacionCerrada === false && est.fase === 5) c.votacion_abierta = 1;
    DB.seq.usuarios = 5000;
    reproduciendo = true;
    est.ops.forEach(function (op) {
      try { despachar(op.m, op.url, op.b, op.uid, new Date(op.t)); } catch (e) { }
    });
    reproduciendo = false;
  }

  /* ---------- utilidades de consulta ---------- */
  var porId = function (lista, id) { return lista.find(function (x) { return x.id === Number(id); }) || null; };
  var U = function (id) { return porId(DB.usuarios, id); };
  var UT = function (id) { return porId(DB.unidades, id); };
  var ALC = function (id) { return porId(DB.alcaldias, id); };
  var RUB = function (id) { return porId(DB.rubros, id); };
  var PRO = function (id) { return porId(DB.proyectos, id); };
  var GANADOR = ['ganador', 'en_ejecucion', 'concluido', 'inejecutable'];
  var b2 = function (x) { return x ? 1 : 0; };
  var redondea2 = function (n) { return Math.round(n * 100) / 100; };

  function Err(estado, msg, extra) { this.estado = estado; this.error = msg; this.extra = extra; }
  var no = function (msg) { return new Err(404, msg || 'No encontrado'); };
  var mal = function (msg) { return new Err(400, msg); };
  var choque = function (msg) { return new Err(409, msg); };

  function fase() { return DB.fasesCat.find(function (f) { return f.orden === est.fase; }); }
  function ciclo() {
    var c = DB.ciclos[0];
    var f = fase();
    return {
      id: c.id, nombre: c.nombre, anio_simulado: c.anio_simulado, estado: c.estado, presupuesto_total: c.presupuesto_total,
      votacion_abierta: c.votacion_abierta, votacion_abierta_en: c.votacion_abierta_en, votacion_cerrada_en: c.votacion_cerrada_en,
      computo_realizado_en: c.computo_realizado_en, resultados_publicados_en: c.resultados_publicados_en, origen_indices: c.origen_indices,
      porcentaje_partes_iguales: c.porcentaje_partes_iguales, creado_en: c.creado_en, cerrado_en: c.cerrado_en, tipo: c.tipo, pausado_en: c.pausado_en,
      convocatoria_uuid: c.convocatoria_uuid, fase_id: f.id, fase: f.clave, fase_es: f.nombre_es, fase_en: f.nombre_en, fase_orden: f.orden,
      que_ocurre_es: f.que_ocurre_es, que_ocurre_en: f.que_ocurre_en, que_puedes_hacer_es: f.que_puedes_hacer_es, que_puedes_hacer_en: f.que_puedes_hacer_en,
    };
  }
  function cicloPorId(id) {
    if (Number(id) === 1) return ciclo();
    var c = porId(DB.ciclos, id);
    if (!c) throw no('El ciclo no existe');
    var f = c.fase_orden ? DB.fasesCat.find(function (x) { return x.orden === c.fase_orden; }) : null;
    return Object.assign({}, c, { fase_id: f && f.id, fase: f && f.clave, fase_es: f && f.nombre_es, fase_en: f && f.nombre_en, fase_orden: f && f.orden,
      que_ocurre_es: f && f.que_ocurre_es, que_ocurre_en: f && f.que_ocurre_en, que_puedes_hacer_es: f && f.que_puedes_hacer_es, que_puedes_hacer_en: f && f.que_puedes_hacer_en });
  }
  function fasesCiclo(id) {
    var real = Number(id || 1) === 1;
    return DB.fasesCat.map(function (f) {
      var c = DB.cal[f.orden];
      return { fase_id: f.id, orden: f.orden, clave: f.clave, nombre_es: f.nombre_es, nombre_en: f.nombre_en,
        fecha_inicio: real ? D.fmtDia(c.inicio) : null, fecha_fin: real ? D.fmtDia(c.fin) : null, es_fase_activa: b2(real && f.orden === est.fase),
        que_ocurre_es: f.que_ocurre_es, que_ocurre_en: f.que_ocurre_en, que_puedes_hacer_es: f.que_puedes_hacer_es, que_puedes_hacer_en: f.que_puedes_hacer_en };
    });
  }
  function perfil(u) {
    if (!u) return null;
    var ut = u.unidad_id ? UT(u.unidad_id) : null;
    var alcId = u.alcaldia_id || (ut && ut.alcaldia_id) || null;
    return {
      id: u.id, rol: u.rol, nombre: u.nombre_completo, correo: u.correo, telefono: u.telefono || null, idioma: u.idioma || 'es',
      recibirCorreos: u.recibir_correos !== 0, fotoUuid: u.foto_uuid || null, unidadId: u.unidad_id || null, unidad: ut ? ut.nombre : null,
      genero: u.genero || null, fechaNacimiento: u.fecha_nacimiento || null, alcaldiaId: alcId, alcaldia: alcId ? ALC(alcId).nombre : null,
      funciones: u.funciones || [], debeCambiarPassword: false, debeAceptarTerminos: false, terminosVigentes: S.terminos_condiciones.version, debeVerificarCorreo: false,
    };
  }
  var visible = function (p) { return p.estatus !== 'retirado' && p.estado_moderacion === 'visible'; };
  function resultadosPublicados() { return !!DB.ciclos[0].resultados_publicados_en; }
  function fotoDe(uid) { var u = U(uid); return u ? u.foto_uuid || null : null; }
  function fotosProyecto(pid) {
    return DB.reportes.filter(function (r) { return r.proyecto_id === pid && r.estatus !== 'eliminado'; })
      .reduce(function (s, r) { return s + r.fotos.length; }, 0);
  }
  function califProm(pid) {
    var l = DB.calificaciones.filter(function (c) { return c.proyecto_id === pid; });
    return l.length ? redondea2(l.reduce(function (s, c) { return s + c.puntuacion; }, 0) / l.length) : null;
  }
  function ficha(p) {
    var ut = UT(p.unidad_id);
    var a = ALC(ut.alcaldia_id);
    return {
      id: p.id, folio: p.folio, ciclo_id: 1, ciclo: DB.ciclos[0].nombre, anio_simulado: DB.ciclos[0].anio_simulado, alcaldia_id: a.id, alcaldia: a.nombre,
      unidad_territorial_id: ut.id, unidad_territorial: ut.nombre, titulo: p.titulo, descripcion: p.descripcion, rubro_id: p.rubro_id, rubro: RUB(p.rubro_id).nombre_es,
      categoria: p.categoria, costo_estimado: p.costo_estimado, presupuesto_asignado: ut.presupuesto_asignado, calle: p.calle, numero: p.numero, referencias: p.referencias,
      latitud: p.latitud, longitud: p.longitud, estado_ubicacion: p.estado_ubicacion, imagen_uuid: p.imagen_uuid, estatus: p.estatus, numero_sorteo: p.numero_sorteo,
      avance_porcentaje: p.avance_porcentaje, monto_ejercido: p.monto_ejercido, total_votos: resultadosPublicados() ? p.total_votos : null,
      total_fotos: fotosProyecto(p.id), calificacion_promedio: califProm(p.id),
    };
  }
  function etapasDe(p) {
    var et = DB.etapas_rubro.filter(function (e) { return e.rubro_id === p.rubro_id; });
    if (!et.length) et = DB.etapas_rubro.filter(function (e) { return e.rubro_id === null; });
    return et.slice().sort(function (a, b) { return a.orden - b.orden; }).map(function (e) {
      var h = DB.etapas_proyecto.find(function (x) { return x.proyecto_id === p.id && x.etapa_id === e.id; });
      return { id: e.id, orden: e.orden, nombre_es: e.nombre_es, nombre_en: e.nombre_en, peso: e.peso, cumplida_en: h ? h.cumplida_en : null, evidencia: h ? h.evidencia : null };
    });
  }
  function pctEtapas(et) { return Math.min(100, Math.round(et.filter(function (e) { return e.cumplida_en; }).reduce(function (t, e) { return t + e.peso; }, 0) * 100) / 100); }
  function financiero(p) {
    var base = Number(p.costo_estimado) > 0 ? Number(p.costo_estimado) : UT(p.unidad_id).presupuesto_asignado;
    return base > 0 ? Math.round(Math.min(999, (Number(p.monto_ejercido) / base) * 100) * 10) / 10 : 0;
  }
  function conEtapas(o, p) {
    o.etapas = etapasDe(p);
    o.avance_financiero = financiero(p);
    o.alerta_gasto = o.avance_financiero - Number(p.avance_porcentaje) >= 40;
    return o;
  }
  function dictamenDe(pid) { return DB.dictamenes.find(function (d) { return d.proyecto_id === pid; }) || null; }
  function correccionDe(pid) { return DB.revisiones.find(function (r) { return r.proyecto_id === pid && r.resultado === 'correccion_solicitada'; }) || null; }
  function texto(v, campo, min, max) {
    var s = typeof v === 'string' ? v.trim() : '';
    if (!s && min) throw mal('Escribe ' + campo);
    if (min && Array.from(s).length < min) throw mal(campo.charAt(0).toUpperCase() + campo.slice(1) + ' debe tener al menos ' + min + ' caracteres');
    if (max && Array.from(s).length > max) throw mal(campo.charAt(0).toUpperCase() + campo.slice(1) + ' admite hasta ' + max + ' caracteres');
    return s || null;
  }
  function pagina(q, def) {
    var lim = Math.min(Number(q.limite) || def, 200);
    var pag = Math.max(1, Number(q.pagina) || 1);
    return { limite: lim, desde: (pag - 1) * lim };
  }
  function like(hay, q) { return !q || D.sinAcentos(hay).indexOf(D.sinAcentos(q)) >= 0; }
  function notificar(uid, tipo, titulo, mensaje, pid, ahora) {
    DB.notificaciones.push({ id: DB.siguiente('notificaciones'), usuario_id: uid, tipo: tipo, titulo: titulo, mensaje: mensaje, proyecto_id: pid || null, leida: 0, creada_en: fmt(ahora) });
  }
  function bitacora(u, accion, entidad, id, detalle, ahora) {
    DB.bitacora.unshift({ id: DB.siguiente('bitacora'), realizada_en: fmt(ahora), usuario_id: u.id, rol: u.rol, alcaldia_id: u.alcaldia_id || null, ciclo_id: 1, accion: accion, entidad: entidad, entidad_id: id, detalle: detalle ? JSON.stringify(detalle) : null });
  }
  function adivinarCategoria(titulo, desc) {
    var t = ' ' + D.sinAcentos(titulo) + ' ';
    var t2 = ' ' + D.sinAcentos((titulo || '') + ' ' + (desc || '')) + ' ';
    function buscar(txt) {
      var gana = null; var pos = -1;
      DB.categorias.filter(function (c) { return c.activa; }).forEach(function (c) {
        String(c.palabras || '').split(',').map(function (x) { return D.sinAcentos(x).trim(); }).filter(Boolean).forEach(function (pal) {
          var i = txt.indexOf(pal);
          if (i >= 0 && (pos < 0 || i < pos)) { gana = c.clave; pos = i; }
        });
      });
      return gana;
    }
    return buscar(t) || buscar(t2) || 'otro';
  }
  function csv(columnas, filas) {
    var celda = function (v) {
      if (v === null || v === undefined) return '';
      var s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return /[",\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    var lineas = [columnas.map(function (c) { return celda(c[0]); }).join(',')];
    filas.forEach(function (f) { lineas.push(columnas.map(function (c) { return celda(typeof c[1] === 'function' ? c[1](f) : f[c[1]]); }).join(',')); });
    return '﻿' + lineas.join('\r\n') + '\r\n';
  }
  function Archivo(contenido, tipo, nombre) { this.contenido = contenido; this.tipo = tipo; this.nombre = nombre; }

  function rangoEdad(nac) {
    if (!nac) return '60+';
    var e = (DB.hoy - new Date(nac + 'T00:00:00')) / (365.25 * 86400000);
    return e < 30 ? '18-29' : (e < 45 ? '30-44' : (e < 60 ? '45-59' : '60+'));
  }
  function participacionFilas(f) {
    f = f || {};
    var votaron = {};
    DB.participaciones.forEach(function (p) { votaron[p.ciudadano_id] = p; });
    return DB.usuarios.filter(function (u) {
      if (u.rol !== 'ciudadano' || u.eliminado) return false;
      var ut = UT(u.unidad_id);
      if (f.alcaldia && ut.alcaldia_id !== Number(f.alcaldia)) return false;
      if (f.unidad && ut.id !== Number(f.unidad)) return false;
      if (f.genero && u.genero !== f.genero) return false;
      if (f.rango && rangoEdad(u.fecha_nacimiento) !== f.rango) return false;
      return true;
    }).map(function (u) { var ut = UT(u.unidad_id); return { u: u, ut: ut, alc: ALC(ut.alcaldia_id), voto: votaron[u.id] || null }; });
  }
  function agrupar(filas, clave, orden) {
    var m = {};
    filas.forEach(function (x) {
      var k = clave(x);
      if (!m[k]) m[k] = { etiqueta: k, registrados: 0, votantes: 0 };
      m[k].registrados += 1;
      if (x.voto) m[k].votantes += 1;
    });
    var l = Object.keys(m).map(function (k) { return m[k]; });
    return l.sort(orden || function (a, b) { return String(a.etiqueta).localeCompare(String(b.etiqueta), 'es'); });
  }

  /* ---------- rutas ---------- */
  var RUTAS = [];
  function ruta(metodo, patron, fn, opciones) {
    var nombres = [];
    var re = new RegExp('^' + patron.replace(/:(\w+)/g, function (m, n) { nombres.push(n); return '([^/]+)'; }) + '$');
    RUTAS.push({ m: metodo, re: re, nombres: nombres, fn: fn, o: opciones || {} });
  }
  function requiere(ctx, rol) {
    if (!ctx.u) throw new Err(401, 'Inicia sesión para continuar');
    if (rol && (Array.isArray(rol) ? rol.indexOf(ctx.u.rol) < 0 : ctx.u.rol !== rol)) throw new Err(403, 'No tienes permiso para realizar esta acción');
  }

  /* públicas */
  ruta('GET', 'publico/estado', function () {
    return {
      aviso: { es: 'Simulador educativo sin validez oficial. No tiene relación con el IECM ni con las alcaldías.', en: 'Educational simulator with no official validity. Not affiliated with IECM or the boroughs.' },
      ciclo: ciclo(), fases: fasesCiclo(1),
      totales: { ciudadanos: DB.usuarios.filter(function (u) { return u.rol === 'ciudadano' && u.estado === 'activa'; }).length, proyectos: DB.proyectos.filter(visible).length, alcaldias: DB.alcaldias.length, unidades: DB.unidades.length },
    };
  });
  ruta('GET', 'catalogos', function () {
    return {
      alcaldias: DB.alcaldias.slice().sort(function (a, b) { return a.nombre.localeCompare(b.nombre); }),
      unidades: DB.unidades.map(function (u) { return { id: u.id, clave: u.clave, nombre: u.nombre, tipo: u.tipo, alcaldia_id: u.alcaldia_id, latitud: u.latitud, longitud: u.longitud, participa: u.participa }; })
        .sort(function (a, b) { return a.nombre.localeCompare(b.nombre); }),
      rubros: DB.rubros, fases: DB.fasesCat.map(function (f) { return { id: f.id, clave: f.clave, orden: f.orden, nombre_es: f.nombre_es, nombre_en: f.nombre_en }; }),
      criterios: DB.criterios,
      atribuciones: DB.fuentes.filter(function (f) { return f.activa && f.atribucion; }).map(function (f) { return { clave: f.clave, atribucion: f.atribucion }; }),
    };
  });
  ruta('GET', 'categorias', function () { return DB.categorias.slice().sort(function (a, b) { return a.orden - b.orden; }); });
  ruta('GET', 'publico/privacidad', function () { return S.avisos_privacidad; });
  ruta('GET', 'publico/terminos', function () { return S.terminos_condiciones; });
  ruta('GET', 'directorio', function (c) {
    var ord = { alcaldia: 0, titular: 1, sede_atencion: 2 };
    return DB.directorio.filter(function (d) {
      var a = ALC(d.alcaldia_id);
      return (!c.q.alcaldia || d.alcaldia_id === Number(c.q.alcaldia)) && like([d.cargo, d.nombre_titular, d.temas, a.nombre].join(' '), c.q.q);
    }).map(function (d) { return Object.assign({}, d, { alcaldia: ALC(d.alcaldia_id).nombre }); })
      .sort(function (a, b) { return a.alcaldia.localeCompare(b.alcaldia) || ord[a.tipo] - ord[b.tipo] || a.cargo.localeCompare(b.cargo); });
  });
  ruta('GET', 'directorio/ciudad', function () { return DB.directorio_ciudad; });

  /* sesión y cuenta */
  ruta('GET', 'auth/opciones', function () { return { google: false, captcha: false }; });
  ruta('GET', 'captcha', function () { return { id: 'demo', imagen: '' }; });
  var destinoPorRol = function (rol) { return rol === 'administrador' ? 'admin/inicio.html' : (rol === 'funcionario' ? 'funcionario/inicio.html' : 'ciudadano/inicio.html'); };
  ruta('POST', 'auth/login', function (c) {
    var correo = String(c.b.correo || '').trim().toLowerCase();
    if (!c.b.password) throw mal('Escribe tu contraseña');
    var u = DB.usuarios.find(function (x) { return x.correo.toLowerCase() === correo && !x.eliminado; });
    if (!u) throw new Err(401, 'Correo o contraseña incorrectos');
    if (u.estado === 'suspendida') throw new Err(403, 'Tu cuenta está suspendida. Comunícate con el Administrador');
    if (u.estado !== 'activa') throw new Err(403, 'Tu cuenta está desactivada');
    est.sesion = u.id;
    guardar();
    return { rol: u.rol, nombre: u.nombre_completo, idioma: u.idioma, debeCambiarPassword: false, debeAceptarTerminos: false, destino: destinoPorRol(u.rol) };
  }, { sinRegistro: true });
  ruta('POST', 'auth/logout', function () { est.sesion = null; guardar(); return { ok: true }; }, { sinRegistro: true });
  ruta('GET', 'auth/yo', function (c) {
    if (!c.u) throw new Err(401, 'Sin sesión');
    return perfil(c.u);
  });
  ruta('GET', 'auth/google/pendiente', function () { throw no('No hay un registro con Google pendiente. Vuelve a presionar «Continuar con Google»'); });
  ruta('POST', 'auth/aceptar-terminos', function (c) { requiere(c); return { ok: true, version: S.terminos_condiciones.version, destino: destinoPorRol(c.u.rol), mensaje: 'Gracias. Aceptaste los Términos y condiciones' }; });
  ruta('POST', 'auth/registro', function (c) {
    var b = c.b;
    var nombre = texto(b.nombre, 'tu nombre completo', 5, 100);
    var correo = String(b.correo || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) throw mal('Escribe un correo válido');
    if (DB.usuarios.some(function (u) { return u.correo === correo && !u.eliminado; })) throw choque('Ya existe una cuenta con ese correo');
    if (!b.password || String(b.password).length < 8) throw mal('La contraseña debe tener al menos 8 caracteres');
    if (b.confirmar !== b.password) throw mal('Las contraseñas no coinciden: escribe la misma contraseña en los dos campos');
    if (!b.unidad_territorial_id) throw mal('Elige tu colonia, barrio o pueblo');
    var u = { id: DB.siguiente('usuarios'), rol: 'ciudadano', nombre_completo: nombre, correo: correo, fecha_nacimiento: b.fecha_nacimiento || null, genero: b.genero || 'prefiero_no_decir',
      unidad_id: Number(b.unidad_territorial_id), estado: 'activa', idioma: 'es', creado_en: fmt(c.ahora) };
    DB.usuarios.push(u);
    if (!reproduciendo) { est.sesion = u.id; }
    return { rol: 'ciudadano', nombre: nombre, idioma: 'es', debeCambiarPassword: false, debeAceptarTerminos: false, destino: 'ciudadano/inicio.html' };
  }, { estado: 201 });
  ruta('POST', 'auth/recuperar', function () { return { ok: true, mensaje: 'Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. (En esta demostración no se envían correos.)' }; }, { sinRegistro: true });
  ruta('POST', 'auth/restablecer', function () { return { ok: true, mensaje: 'Tu contraseña se actualizó. Ya puedes iniciar sesión.' }; }, { sinRegistro: true });
  ruta('POST', 'auth/verificar-correo', function (c) { return { ok: true, mensaje: 'Tu correo quedó confirmado. Ya puedes participar.', conSesion: !!c.u }; }, { sinRegistro: true });
  ruta('POST', 'auth/reenviar-verificacion', function () { return { ok: true, mensaje: 'Tu correo ya está confirmado' }; }, { sinRegistro: true });
  ruta('POST', 'auth/cambiar-password', function (c) {
    requiere(c);
    if (!c.b.actual) throw mal('Escribe tu contraseña actual');
    if (!c.b.nueva || String(c.b.nueva).length < 8) throw mal('La nueva contraseña debe tener al menos 8 caracteres');
    if (c.b.confirmar !== undefined && c.b.confirmar !== c.b.nueva) throw mal('Las contraseñas nuevas no coinciden');
    return { ok: true, mensaje: 'Tu contraseña se actualizó', destino: destinoPorRol(c.u.rol) };
  }, { sinRegistro: true });
  ruta('PUT', 'perfil', function (c) {
    requiere(c);
    var u = c.u;
    u.nombre_completo = texto(c.b.nombre, 'tu nombre completo', 5, 100);
    if (c.b.idioma) u.idioma = c.b.idioma;
    if (c.b.recibir_correos !== undefined) u.recibir_correos = c.b.recibir_correos ? 1 : 0;
    if (u.rol !== 'ciudadano' && c.b.telefono !== undefined) u.telefono = c.b.telefono || null;
    if (u.rol === 'ciudadano') {
      if (c.b.genero) u.genero = c.b.genero;
      if (c.b.unidad_territorial_id) u.unidad_id = Number(c.b.unidad_territorial_id);
    }
    return { ok: true, mensaje: 'Tus datos se guardaron', usuario: perfil(u) };
  });
  ruta('PUT', 'perfil/idioma', function (c) { requiere(c); c.u.idioma = c.b.idioma === 'en' ? 'en' : 'es'; return { ok: true }; });
  ruta('PUT', 'perfil/foto', function (c) {
    requiere(c);
    var uuid = 'sub-' + DB.siguiente('archivos');
    DB.archivos[uuid] = c.b.__archivo;
    c.u.foto_uuid = c.b.__archivo ? uuid : null;
    return { ok: true, fotoUuid: c.u.foto_uuid };
  });
  ruta('DELETE', 'perfil/foto', function (c) { requiere(c); c.u.foto_uuid = null; return { ok: true }; });
  ruta('POST', 'perfil/eliminar', function (c) {
    requiere(c, 'ciudadano');
    if (c.b.confirmar !== 'ELIMINAR') throw mal('Escribe ELIMINAR para confirmar');
    throw choque('En esta demostración no se pueden eliminar cuentas. Usa «Restablecer datos» en el panel de demostración.');
  }, { sinRegistro: true });

  /* ciudadano */
  function contexto(u) {
    var ut = UT(u.unidad_id);
    var a = ALC(ut.alcaldia_id);
    return { ciclo: ciclo(), unidad: { presupuesto_asignado: ut.presupuesto_asignado, nombre: ut.nombre, alcaldia: a.nombre }, participa: true };
  }
  function avisosPara(alcId) {
    var hoy = D.fmtDia(DB.hoy);
    return DB.avisos.filter(function (a) { return a.activo && (!a.alcaldia_id || a.alcaldia_id === alcId) && (!a.vigente_hasta || a.vigente_hasta >= hoy); })
      .sort(function (a, b) { return a.publicado_en < b.publicado_en ? 1 : -1; });
  }
  function votoDe(uid) {
    var p = DB.participaciones.find(function (x) { return x.ciudadano_id === uid; });
    return p ? { folio_comprobante: p.folio_comprobante, participo_en: p.participo_en } : null;
  }
  ruta('GET', 'ciudadano/panel', function (c) {
    requiere(c, 'ciudadano');
    var u = c.u;
    var ctx = contexto(u);
    var ut = UT(u.unidad_id);
    var ru = DB.resultados_unidad.find(function (r) { return r.unidad_id === ut.id; });
    var g = ru && resultadosPublicados() ? PRO(ru.proyecto_ganador_id) : null;
    var n = DB.unidades.length;
    var igual = Math.round(DB.ciclos[0].presupuesto_total * 0.5 / n * 100) / 100;
    var mias = DB.ideas.filter(function (i) { return i.autor_id === u.id && i.estado === 'visible'; });
    var misP = DB.proyectos.filter(function (p) { return p.proponente_id === u.id && p.estatus !== 'retirado'; }).sort(function (a, b) { return a.creado_en < b.creado_en ? 1 : -1; });
    return Object.assign(ctx, {
      avisos: avisosPara(ut.alcaldia_id).slice(0, 5).map(function (a) { return { id: a.id, titulo: a.titulo, mensaje: a.mensaje, publicado_en: a.publicado_en, alcaldia: a.alcaldia_id ? ALC(a.alcaldia_id).nombre : null }; }),
      voto: votoDe(u.id),
      resumen: { mis_proyectos: misP.length, ideas_foro: DB.ideas.filter(function (i) { return i.unidad_id === ut.id && i.estado === 'visible'; }).length, no_leidas: DB.notificaciones.filter(function (x) { return x.usuario_id === u.id && !x.leida; }).length },
      ganador: g && GANADOR.indexOf(g.estatus) >= 0 ? { id: g.id, folio: g.folio, titulo: g.titulo, estatus: g.estatus, avance_porcentaje: g.avance_porcentaje } : null,
      presupuesto: { total: ut.presupuesto_asignado, igual: Math.min(igual, ut.presupuesto_asignado), indices: Math.max(0, redondea2(ut.presupuesto_asignado - igual)), porcentaje: DB.ciclos[0].porcentaje_partes_iguales, unidades: n },
      misProyectos: misP.slice(0, 3).map(function (p) { return { id: p.id, folio: p.folio, titulo: p.titulo, estatus: p.estatus }; }),
      miIdea: { ideas: mias.length, apoyos: mias.reduce(function (m, i) { return Math.max(m, i.apoyos.length); }, 0) },
    });
  });
  function ideaVista(i, u) {
    var a = U(i.autor_id);
    return { id: i.id, unidad_territorial_id: i.unidad_id, colonia: UT(i.unidad_id).nombre, de_mi_colonia: b2(i.unidad_id === u.unidad_id), editada_en: i.editada_en || null, contenido: i.contenido, rubro_id: i.rubro_id, rubro: RUB(i.rubro_id).nombre_es, total_apoyos: i.apoyos.length,
      total_comentarios: DB.comentarios_idea.filter(function (k) { return k.idea_id === i.id && k.estado === 'visible'; }).length,
      creada_en: i.creada_en, autor: a ? a.nombre_completo : 'Cuenta eliminada', es_mia: b2(i.autor_id === u.id), apoyada: b2(i.apoyos.indexOf(u.id) >= 0), autor_foto: fotoDe(i.autor_id) };
  }
  ruta('GET', 'foro', function (c) {
    requiere(c, 'ciudadano');
    var u = c.u; var q = c.q;
    var ctx = contexto(u);
    var miAlc = UT(u.unidad_id).alcaldia_id;
    if (est.fase < 2) return Object.assign(ctx, { ideas: [], total: 0, colonias: [], alcaldia: ctx.unidad.alcaldia });
    var colonias = DB.unidades.filter(function (x) { return x.alcaldia_id === miAlc && DB.ideas.some(function (i) { return i.unidad_id === x.id && i.estado === 'visible'; }); })
      .sort(function (a, b) { return a.nombre.localeCompare(b.nombre); }).map(function (x) { return { id: x.id, nombre: x.nombre, mia: b2(x.id === u.unidad_id) }; });
    var l = DB.ideas.filter(function (i) {
      return i.estado === 'visible' && UT(i.unidad_id).alcaldia_id === miAlc && (!q.colonia || i.unidad_id === Number(q.colonia)) && like(i.contenido, q.q) && (!q.rubro || i.rubro_id === Number(q.rubro))
        && (!q.desde || i.creada_en >= q.desde) && (!q.hasta || i.creada_en.slice(0, 10) <= q.hasta) && (!q.min_apoyos || i.apoyos.length >= Number(q.min_apoyos));
    });
    l.sort(q.orden === 'apoyos' ? function (a, b) { return b.apoyos.length - a.apoyos.length || (a.creada_en < b.creada_en ? 1 : -1); } : function (a, b) { return a.creada_en < b.creada_en ? 1 : -1; });
    var pg = pagina(q, 30);
    return Object.assign(ctx, { ideas: l.slice(pg.desde, pg.desde + pg.limite).map(function (i) { return ideaVista(i, u); }), total: l.length, colonias: colonias, alcaldia: ctx.unidad.alcaldia });
  });
  function ideaMia(c) {
    var i = porId(DB.ideas, c.p.id);
    if (!i || i.estado !== 'visible' || UT(i.unidad_id).alcaldia_id !== UT(c.u.unidad_id).alcaldia_id) throw no('La idea no existe o ya no está disponible');
    return i;
  }
  ruta('POST', 'foro/ideas', function (c) {
    requiere(c, 'ciudadano');
    var contenido = texto(c.b.contenido, 'tu idea', 5, 500);
    if (!c.b.rubro_id) throw mal('Elige el rubro');
    var i = { id: DB.siguiente('ideas'), ciclo_id: 1, unidad_id: c.u.unidad_id, autor_id: c.u.id, contenido: contenido, rubro_id: Number(c.b.rubro_id), creada_en: fmt(c.ahora), estado: 'visible', apoyos: [] };
    DB.ideas.push(i);
    return { ok: true, id: i.id, mensaje: 'Tu idea se publicó en el foro' };
  }, { estado: 201 });
  ruta('GET', 'foro/ideas/:id/comentarios', function (c) {
    requiere(c, 'ciudadano');
    var i = ideaMia(c);
    return DB.comentarios_idea.filter(function (k) { return k.idea_id === i.id && k.estado === 'visible'; })
      .sort(function (a, b) { return a.creado_en < b.creado_en ? -1 : 1; })
      .map(function (k) { var a = U(k.autor_id); return { id: k.id, contenido: k.contenido, creado_en: k.creado_en, editado_en: k.editado_en || null, autor: a.nombre_completo, es_mio: b2(k.autor_id === c.u.id), autor_foto: fotoDe(k.autor_id) }; });
  });
  ruta('POST', 'foro/ideas/:id/comentarios', function (c) {
    requiere(c, 'ciudadano');
    var i = ideaMia(c);
    var contenido = texto(c.b.contenido, 'tu comentario', 2, 250);
    DB.comentarios_idea.push({ id: DB.siguiente('comentarios_idea'), idea_id: i.id, autor_id: c.u.id, contenido: contenido, creado_en: fmt(c.ahora), estado: 'visible' });
    return { ok: true, mensaje: 'Comentario publicado' };
  }, { estado: 201 });
  ruta('PUT', 'foro/ideas/:id', function (c) {
    requiere(c, 'ciudadano');
    var i = ideaMia(c);
    if (i.autor_id !== c.u.id) throw new Err(403, 'Solo puedes cambiar las ideas que tú publicaste');
    i.contenido = texto(c.b.contenido, 'tu idea', 5, 500);
    if (c.b.rubro_id) i.rubro_id = Number(c.b.rubro_id);
    i.editada_en = fmt(c.ahora);
    return { ok: true, mensaje: 'Tu idea se actualizó' };
  });
  ruta('DELETE', 'foro/ideas/:id', function (c) {
    requiere(c, 'ciudadano');
    var i = ideaMia(c);
    if (i.autor_id !== c.u.id) throw new Err(403, 'Solo puedes cambiar las ideas que tú publicaste');
    var pr = DB.proyectos.find(function (p) { return p.idea_id === i.id && p.estatus !== 'retirado'; });
    if (pr) throw choque('Esta idea ya se convirtió en el proyecto ' + pr.folio + '. Si ya no quieres seguir, retira el proyecto desde Mis proyectos');
    i.estado = 'eliminado';
    return { ok: true, mensaje: 'Borraste tu idea del foro' };
  });
  function miComentario(c) {
    var k = porId(DB.comentarios_idea, c.p.id);
    if (!k || k.estado !== 'visible') throw no('El comentario no existe o ya no está disponible');
    if (k.autor_id !== c.u.id) throw new Err(403, 'Solo puedes cambiar los comentarios que tú escribiste');
    return k;
  }
  ruta('PUT', 'foro/comentarios/:id', function (c) {
    requiere(c, 'ciudadano');
    var k = miComentario(c);
    k.contenido = texto(c.b.contenido, 'tu comentario', 2, 250);
    k.editado_en = fmt(c.ahora);
    return { ok: true, mensaje: 'Tu comentario se actualizó' };
  });
  ruta('DELETE', 'foro/comentarios/:id', function (c) {
    requiere(c, 'ciudadano');
    miComentario(c).estado = 'eliminado';
    return { ok: true, mensaje: 'Borraste tu comentario' };
  });
  ruta('POST', 'foro/ideas/:id/apoyo', function (c) {
    requiere(c, 'ciudadano');
    var i = ideaMia(c);
    if (i.apoyos.indexOf(c.u.id) < 0) i.apoyos.push(c.u.id);
    return { ok: true, apoyada: true, total_apoyos: i.apoyos.length };
  });
  ruta('DELETE', 'foro/ideas/:id/apoyo', function (c) {
    requiere(c, 'ciudadano');
    var i = ideaMia(c);
    i.apoyos = i.apoyos.filter(function (x) { return x !== c.u.id; });
    return { ok: true, apoyada: false, total_apoyos: i.apoyos.length };
  });
  ruta('POST', 'archivos', function (c) {
    requiere(c, 'ciudadano');
    var uuid = 'sub-' + DB.siguiente('archivos');
    DB.archivos[uuid] = c.b.__archivo;
    return { uuid: uuid };
  }, { estado: 201 });
  function datosProyecto(b) {
    var d = {
      titulo: texto(b.titulo, 'el título', 5, 150), descripcion: texto(b.descripcion, 'la descripción', 10, 2000), rubro: Number(b.rubro_id),
      costo: Number(b.costo_estimado), calle: texto(b.calle, 'la calle', 2, 150), numero: b.numero || null, referencias: b.referencias || null, cp: b.codigo_postal || null,
    };
    if (!d.rubro) throw mal('Elige el rubro');
    if (!(d.costo >= 1000)) throw mal('El costo estimado debe ser de al menos $1,000');
    d.categoria = b.categoria || adivinarCategoria(d.titulo, d.descripcion);
    return d;
  }
  function ubicar(u, b, previo) {
    if (b.latitud !== undefined && b.latitud !== null && b.longitud !== undefined) return { latitud: Number(b.latitud), longitud: Number(b.longitud), estado: 'ubicado' };
    if (previo && previo.latitud !== null) return { latitud: previo.latitud, longitud: previo.longitud, estado: previo.estado_ubicacion };
    var ut = UT(u.unidad_id);
    var h = 0;
    String(b.calle || '').split('').forEach(function (ch) { h = (h * 31 + ch.charCodeAt(0)) % 1000; });
    return { latitud: Math.round((ut.latitud + (h % 40 - 20) / 10000) * 1e6) / 1e6, longitud: Math.round((ut.longitud + ((h / 40 | 0) % 40 - 20) / 10000) * 1e6) / 1e6, estado: 'ubicado' };
  }
  ruta('POST', 'proyectos', function (c) {
    requiere(c, 'ciudadano');
    var d = datosProyecto(c.b);
    var u = c.u;
    var ut = UT(u.unidad_id);
    if (d.costo > ut.presupuesto_asignado) throw mal('El costo estimado no puede ser mayor al presupuesto de tu colonia ($' + ut.presupuesto_asignado.toLocaleString('es-MX', { maximumFractionDigits: 2 }) + ')');
    var a = ALC(ut.alcaldia_id);
    var n = DB.proyectos.filter(function (p) { return p.alcaldia_id === a.id; }).length + 1;
    var ub = ubicar(u, c.b);
    var p = { id: DB.siguiente('proyectos'), folio: 'PP-2026-' + a.clave + '-' + String(n).padStart(4, '0'), ciclo_id: 1, unidad_id: ut.id, alcaldia_id: a.id, proponente_id: u.id,
      titulo: d.titulo, descripcion: d.descripcion, rubro_id: d.rubro, categoria: d.categoria, costo_estimado: d.costo, calle: d.calle, numero: d.numero, referencias: d.referencias, codigo_postal: d.cp,
      latitud: ub.latitud, longitud: ub.longitud, estado_ubicacion: ub.estado, imagen_uuid: c.b.imagen_uuid || null, estatus: 'registrado', numero_sorteo: null,
      avance_porcentaje: 0, monto_ejercido: 0, estado_moderacion: 'visible', creado_en: fmt(c.ahora), actualizado_en: fmt(c.ahora), idea_id: c.b.idea_id || null, total_votos: null, posicion: null };
    DB.proyectos.push(p);
    return { ok: true, id: p.id, folio: p.folio, estado_ubicacion: p.estado_ubicacion, latitud: p.latitud, longitud: p.longitud, mensaje: 'Tu proyecto quedó registrado con el folio ' + p.folio };
  }, { estado: 201 });
  ruta('PUT', 'proyectos/:id', function (c) {
    requiere(c, 'ciudadano');
    var p = PRO(c.p.id);
    if (!p || p.proponente_id !== c.u.id) throw no('El proyecto no existe');
    var d = datosProyecto(c.b);
    var ub = ubicar(c.u, c.b, p.calle === d.calle ? p : null);
    Object.assign(p, { titulo: d.titulo, descripcion: d.descripcion, rubro_id: d.rubro, categoria: d.categoria, costo_estimado: d.costo, calle: d.calle, numero: d.numero, referencias: d.referencias, codigo_postal: d.cp,
      latitud: ub.latitud, longitud: ub.longitud, estado_ubicacion: ub.estado, actualizado_en: fmt(c.ahora) });
    if (c.b.quitar_imagen) p.imagen_uuid = null; else if (c.b.imagen_uuid) p.imagen_uuid = c.b.imagen_uuid;
    return { ok: true, mensaje: 'Los cambios de tu proyecto se guardaron' };
  });
  ruta('POST', 'proyectos/:id/retirar', function (c) {
    requiere(c, 'ciudadano');
    var p = PRO(c.p.id);
    if (!p || p.proponente_id !== c.u.id) throw no('El proyecto no existe');
    if (p.estatus === 'retirado') throw choque('El proyecto ya estaba retirado');
    p.estatus = 'retirado';
    return { ok: true, mensaje: 'Retiraste tu proyecto. Su folio no se volverá a usar' };
  });
  ruta('GET', 'proyectos/mios', function (c) {
    requiere(c, 'ciudadano');
    return DB.proyectos.filter(function (p) { return p.proponente_id === c.u.id; }).sort(function (a, b) { return a.creado_en < b.creado_en ? 1 : -1; }).map(function (p) {
      var d = dictamenDe(p.id);
      var emitido = d && d.emitido_en ? d : null;
      var cor = correccionDe(p.id);
      return { id: p.id, folio: p.folio, ciclo_id: 1, ciclo: DB.ciclos[0].nombre, ciclo_estado: 'activo', titulo: p.titulo, descripcion: p.descripcion, rubro_id: p.rubro_id, categoria: p.categoria,
        rubro: RUB(p.rubro_id).nombre_es, costo_estimado: p.costo_estimado, calle: p.calle, numero: p.numero, referencias: p.referencias, codigo_postal: p.codigo_postal,
        latitud: p.latitud, longitud: p.longitud, estado_ubicacion: p.estado_ubicacion, estatus: p.estatus, numero_sorteo: p.numero_sorteo, avance_porcentaje: p.avance_porcentaje,
        monto_ejercido: p.monto_ejercido, estado_moderacion: p.estado_moderacion, creado_en: p.creado_en, imagen_uuid: p.imagen_uuid,
        dictamen: emitido ? emitido.resultado : null, dictamen_justificacion: emitido ? emitido.justificacion : null, dictamen_emitido_en: emitido ? emitido.emitido_en : null,
        correccion: cor ? cor.observacion : null, fase_ciclo: fase().clave };
    });
  });
  ruta('GET', 'proyectos/alcaldia', function (c) {
    requiere(c, 'ciudadano');
    var u = c.u;
    var ut = UT(u.unidad_id);
    var a = ALC(ut.alcaldia_id);
    var cols = DB.unidades.filter(function (x) { return x.alcaldia_id === a.id; }).sort(function (x, y) { return x.nombre.localeCompare(y.nombre); });
    var lista = DB.proyectos.filter(function (p) { return p.alcaldia_id === a.id && visible(p) && (!c.q.unidad || p.unidad_id === Number(c.q.unidad)); })
      .sort(function (x, y) { return (y.unidad_id === ut.id) - (x.unidad_id === ut.id) || UT(x.unidad_id).nombre.localeCompare(UT(y.unidad_id).nombre) || (x.creado_en < y.creado_en ? 1 : -1); });
    return {
      alcaldia: a.nombre, mi_colonia: ut.id,
      colonias: cols.map(function (x) { return { id: x.id, nombre: x.nombre, presupuesto_asignado: x.presupuesto_asignado, proyectos: DB.proyectos.filter(function (p) { return p.unidad_id === x.id && visible(p); }).length }; }),
      proyectos: lista.map(function (p) {
        return { id: p.id, folio: p.folio, titulo: p.titulo, descripcion: p.descripcion, rubro: RUB(p.rubro_id).nombre_es, costo_estimado: p.costo_estimado, estatus: p.estatus, numero_sorteo: p.numero_sorteo,
          unidad_territorial_id: p.unidad_id, colonia: UT(p.unidad_id).nombre, es_mio: b2(p.proponente_id === u.id), de_mi_colonia: b2(p.unidad_id === ut.id), imagen_uuid: p.imagen_uuid };
      }),
    };
  });
  ruta('GET', 'proyectos/unidad', function (c) {
    requiere(c, 'ciudadano');
    return DB.proyectos.filter(function (p) { return p.unidad_id === c.u.unidad_id && visible(p); }).map(function (p) {
      return { id: p.id, folio: p.folio, titulo: p.titulo, descripcion: p.descripcion, rubro: RUB(p.rubro_id).nombre_es, costo_estimado: p.costo_estimado, estatus: p.estatus, numero_sorteo: p.numero_sorteo, es_mio: b2(p.proponente_id === c.u.id), imagen_uuid: p.imagen_uuid };
    });
  });
  ruta('GET', 'votacion', function (c) {
    requiere(c, 'ciudadano');
    var u = c.u;
    var ctx = contexto(u);
    var boleta = DB.proyectos.filter(function (p) { return p.unidad_id === u.unidad_id && p.numero_sorteo && visible(p) && ['en_consulta'].concat(GANADOR).indexOf(p.estatus) >= 0; })
      .sort(function (a, b) { return a.numero_sorteo - b.numero_sorteo; })
      .map(function (p) { return { proyecto_id: p.id, numero_sorteo: p.numero_sorteo, folio: p.folio, titulo: p.titulo, descripcion: p.descripcion, rubro: RUB(p.rubro_id).nombre_es, costo_estimado: p.costo_estimado, imagen_uuid: p.imagen_uuid }; });
    var ru = DB.resultados_unidad.find(function (r) { return r.unidad_id === u.unidad_id; });
    var resultados = resultadosPublicados() && ru ? DB.proyectos.filter(function (p) { return p.unidad_id === u.unidad_id && p.total_votos !== null && p.numero_sorteo; })
      .sort(function (a, b) { return a.posicion - b.posicion || a.numero_sorteo - b.numero_sorteo; })
      .map(function (p) { return { folio: p.folio, titulo: p.titulo, numero_sorteo: p.numero_sorteo, total_votos: p.total_votos, posicion: p.posicion, ganador: b2(ru.proyecto_ganador_id === p.id), caso_especial: ru.caso_especial, metodo: ru.metodo }; }) : [];
    return Object.assign(ctx, { boleta: boleta, voto: votoDe(u.id), resultados: resultados });
  });
  ruta('POST', 'votacion', function (c) {
    requiere(c, 'ciudadano');
    var u = c.u;
    var p = PRO(c.b.proyecto_id);
    if (!DB.ciclos[0].votacion_abierta) throw choque('La recepción de votos no está abierta');
    if (!p || p.unidad_id !== u.unidad_id || p.estatus !== 'en_consulta') throw mal('El proyecto no está en la boleta de tu unidad territorial');
    if (votoDe(u.id)) throw choque('Ya votaste en este ciclo');
    var folio = 'CP-2026-' + ((u.id * 2654435761 + c.ahora.getTime()) >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 8) + String(u.id % 97).padStart(2, '0');
    DB.participaciones.push({ ciclo_id: 1, ciudadano_id: u.id, unidad_id: u.unidad_id, folio_comprobante: folio, participo_en: fmt(c.ahora) });
    return { ok: true, folio_comprobante: folio, participo_en: fmt(c.ahora), mensaje: 'Tu voto quedó registrado. Descarga tu comprobante' };
  }, { estado: 201 });
  ruta('GET', 'votacion/comprobante', function (c) {
    requiere(c, 'ciudadano');
    var u = c.u;
    var pa = DB.participaciones.find(function (x) { return x.ciudadano_id === u.id; });
    if (!pa) throw no('No has votado en este ciclo');
    var ut = UT(pa.unidad_id);
    var cy = DB.ciclos[0];
    var doc = window.PREPAR_PDF.documento({
      titulo: 'Comprobante de participación', subtitulo: cy.nombre + ' · Consulta simulada del Presupuesto Participativo',
      bloques: [
        { tipo: 'destacado', etiqueta: 'Folio del comprobante', valor: pa.folio_comprobante },
        { tipo: 'dato', etiqueta: 'Participante', valor: u.nombre_completo },
        { tipo: 'dato', etiqueta: 'Unidad territorial', valor: ut.nombre + ', ' + ALC(ut.alcaldia_id).nombre },
        { tipo: 'dato', etiqueta: 'Fecha y hora', valor: pa.participo_en + ' (hora de la CDMX)' },
        { tipo: 'dato', etiqueta: 'Ciclo', valor: cy.nombre + ' (' + cy.anio_simulado + ')' },
        { tipo: 'parrafo', texto: 'Este comprobante acredita que la persona participó en la consulta. Por ser un voto secreto, no indica el proyecto elegido.', color: '#475569' },
        { tipo: 'parrafo', texto: 'Documento de demostración generado por la versión estática de Prepar. Sin validez oficial.', color: '#94A3B8' },
      ],
    });
    return new Archivo(doc, 'application/pdf', 'comprobante-' + pa.folio_comprobante + '.pdf');
  });
  ruta('GET', 'notificaciones', function (c) {
    requiere(c);
    var l = DB.notificaciones.filter(function (n) { return n.usuario_id === c.u.id; }).sort(function (a, b) { return a.creada_en < b.creada_en ? 1 : (a.creada_en > b.creada_en ? -1 : b.id - a.id); });
    return { notificaciones: l.slice(0, 50).map(function (n) { return { id: n.id, tipo: n.tipo, titulo: n.titulo, mensaje: n.mensaje, proyecto_id: n.proyecto_id, leida: n.leida, creada_en: n.creada_en }; }), no_leidas: l.filter(function (n) { return !n.leida; }).length };
  });
  ruta('POST', 'notificaciones/leidas', function (c) {
    requiere(c);
    var ids = Array.isArray(c.b.ids) ? c.b.ids.map(Number) : null;
    DB.notificaciones.forEach(function (n) { if (n.usuario_id === c.u.id && (!ids || !ids.length || ids.indexOf(n.id) >= 0)) n.leida = 1; });
    return { ok: true };
  });

  /* mapa y seguimiento */
  ruta('GET', 'ciclos', function (c) {
    requiere(c);
    return DB.ciclos.filter(function (x) { return x.estado !== 'borrador' || c.u.rol === 'administrador'; }).map(function (x) {
      var f = DB.fasesCat.find(function (k) { return k.orden === (x.id === 1 ? est.fase : x.fase_orden); });
      return { id: x.id, nombre: x.nombre, anio_simulado: x.anio_simulado, estado: x.estado, fase_es: f && f.nombre_es, fase_en: f && f.nombre_en };
    });
  });
  ruta('GET', 'mapa/proyectos', function (c) {
    requiere(c);
    var q = c.q;
    if (q.ciclo && Number(q.ciclo) !== 1) return { ciclo_id: Number(q.ciclo), proyectos: [] };
    var l = DB.proyectos.filter(function (p) {
      return visible(p) && (!q.alcaldia || p.alcaldia_id === Number(q.alcaldia)) && (!q.unidad || p.unidad_id === Number(q.unidad))
        && (!q.rubro || p.rubro_id === Number(q.rubro)) && (!q.estatus || p.estatus === q.estatus);
    }).map(ficha).sort(function (a, b) { return a.alcaldia.localeCompare(b.alcaldia) || a.unidad_territorial.localeCompare(b.unidad_territorial) || (a.folio < b.folio ? -1 : 1); });
    return { ciclo_id: 1, proyectos: l };
  });
  ruta('GET', 'mapa/proyectos/:id', function (c) {
    requiere(c);
    var p = PRO(c.p.id);
    if (!p || !visible(p)) throw no('El proyecto no existe o no está disponible');
    var f = ficha(p);
    f.galeria = [];
    DB.reportes.filter(function (r) { return r.proyecto_id === p.id && r.estatus !== 'eliminado'; }).forEach(function (r) {
      r.fotos.forEach(function (uuid, k) { f.galeria.push({ foto_id: r.id * 10 + k, archivo_uuid: uuid, reporte_id: r.id, tipo: r.tipo, descripcion: r.descripcion, estatus: r.estatus, subida_en: r.creado_en }); });
    });
    f.galeria.sort(function (a, b) { return a.subida_en < b.subida_en ? 1 : -1; });
    f.avances = DB.avances.filter(function (a) { return a.proyecto_id === p.id; }).sort(function (a, b) { return a.registrado_en < b.registrado_en ? 1 : -1; })
      .map(function (a) { return { porcentaje: a.porcentaje, monto_ejercido: a.monto_ejercido, estatus: a.estatus, nota: a.nota, justificacion_inejecutable: a.justificacion_inejecutable, registrado_en: a.registrado_en }; });
    f.etapas = GANADOR.indexOf(p.estatus) >= 0 ? etapasDe(p) : [];
    return f;
  });
  ruta('GET', 'mapa/unidades', function (c) {
    requiere(c);
    return DB.unidades.map(function (u) { return { id: u.id, clave: u.clave, nombre: u.nombre, tipo: u.tipo, alcaldia_id: u.alcaldia_id, alcaldia: ALC(u.alcaldia_id).nombre, latitud: u.latitud, longitud: u.longitud }; })
      .sort(function (a, b) { return a.alcaldia.localeCompare(b.alcaldia) || a.nombre.localeCompare(b.nombre); });
  });
  ruta('GET', 'foto-denuncia/proyectos', function (c) {
    requiere(c);
    var u = c.u;
    var l = DB.proyectos.filter(function (p) { return GANADOR.indexOf(p.estatus) >= 0 && p.estado_moderacion === 'visible' && (!c.q.alcaldia || p.alcaldia_id === Number(c.q.alcaldia)); }).map(function (p) {
      var ut = UT(p.unidad_id);
      var cal = DB.calificaciones.filter(function (k) { return k.proyecto_id === p.id; });
      var mia = cal.find(function (k) { return k.ciudadano_id === u.id; });
      return { id: p.id, folio: p.folio, titulo: p.titulo, estatus: p.estatus, avance_porcentaje: p.avance_porcentaje, monto_ejercido: p.monto_ejercido, presupuesto_asignado: ut.presupuesto_asignado,
        unidad_territorial_id: ut.id, unidad_territorial: ut.nombre, alcaldia_id: ut.alcaldia_id, alcaldia: ALC(ut.alcaldia_id).nombre, calificacion_promedio: califProm(p.id), total_calificaciones: cal.length,
        total_reportes: DB.reportes.filter(function (r) { return r.proyecto_id === p.id && r.estatus !== 'eliminado'; }).length,
        mi_calificacion: mia ? mia.puntuacion : null, mi_comentario: mia ? mia.comentario : null, es_de_mi_unidad: b2(p.unidad_id === u.unidad_id), imagen_uuid: p.imagen_uuid };
    });
    l.sort(function (a, b) {
      return (a.calificacion_promedio === null) - (b.calificacion_promedio === null) || (b.calificacion_promedio || 0) - (a.calificacion_promedio || 0)
        || b.total_calificaciones - a.total_calificaciones || b.avance_porcentaje - a.avance_porcentaje || (a.folio < b.folio ? -1 : 1);
    });
    return { ciclo_id: 1, fase: fase().clave, proyectos: l };
  });
  function reporteVista(r, u) {
    var p = PRO(r.proyecto_id);
    var a = U(r.autor_id);
    return { id: r.id, proyecto_id: r.proyecto_id, folio: p.folio, proyecto: p.titulo, alcaldia: ALC(p.alcaldia_id).nombre, alcaldia_id: p.alcaldia_id, tipo: r.tipo, descripcion: r.descripcion,
      estatus: r.estatus, respuesta: r.respuesta, creado_en: r.creado_en, autor: a ? a.nombre_completo : 'Cuenta eliminada',
      total_comentarios: DB.comentarios_reporte.filter(function (k) { return k.reporte_id === r.id && k.estado === 'visible'; }).length, es_mio: b2(u && r.autor_id === u.id), fotos: r.fotos.slice() };
  }
  ruta('GET', 'foto-denuncia/reportes', function (c) {
    requiere(c);
    var q = c.q;
    var l = DB.reportes.filter(function (r) {
      var p = PRO(r.proyecto_id);
      return r.estatus !== 'eliminado' && (!q.proyecto || r.proyecto_id === Number(q.proyecto)) && (!q.alcaldia || p.alcaldia_id === Number(q.alcaldia))
        && (!q.tipo || r.tipo === q.tipo) && (!q.estatus || r.estatus === q.estatus) && (!q.desde || r.creado_en >= q.desde) && (!q.hasta || r.creado_en.slice(0, 10) <= q.hasta);
    }).sort(function (a, b) { return a.creado_en < b.creado_en ? 1 : -1; });
    var pg = pagina(q, 30);
    return { reportes: l.slice(pg.desde, pg.desde + pg.limite).map(function (r) { return reporteVista(r, c.u); }), total: l.length };
  });
  ruta('GET', 'foto-denuncia/reportes/:id', function (c) {
    requiere(c);
    var r = porId(DB.reportes, c.p.id);
    if (!r || r.estatus === 'eliminado') throw no('El reporte no existe o fue eliminado');
    var v = reporteVista(r, c.u);
    delete v.es_mio;
    v.comentarios = DB.comentarios_reporte.filter(function (k) { return k.reporte_id === r.id && k.estado === 'visible'; }).sort(function (a, b) { return a.creado_en < b.creado_en ? -1 : 1; })
      .map(function (k) { var a = U(k.autor_id); return { id: k.id, contenido: k.contenido, creado_en: k.creado_en, autor: a.nombre_completo, autor_foto: fotoDe(k.autor_id) }; });
    return v;
  });
  ruta('POST', 'foto-denuncia/reportes', function (c) {
    requiere(c, 'ciudadano');
    var p = PRO(c.b.proyecto_id);
    if (!p) throw no('El proyecto no existe');
    var tipo = c.b.tipo === 'irregularidad' ? 'irregularidad' : 'avance';
    var desc = texto(c.b.descripcion, 'la descripción', 10, 2000);
    var fotos = Array.isArray(c.b.fotos) ? c.b.fotos : [];
    if (!fotos.length) throw mal('Agrega al menos una fotografía');
    if (fotos.length > 5) throw mal('Un reporte admite como máximo 5 fotografías');
    var r = { id: DB.siguiente('reportes'), proyecto_id: p.id, autor_id: c.u.id, tipo: tipo, descripcion: desc, estatus: 'pendiente', respuesta: null, creado_en: fmt(c.ahora), fotos: fotos };
    DB.reportes.push(r);
    return { ok: true, id: r.id, mensaje: 'Tu reporte se publicó' };
  }, { estado: 201 });
  ruta('POST', 'foto-denuncia/reportes/:id/comentarios', function (c) {
    requiere(c, 'ciudadano');
    var r = porId(DB.reportes, c.p.id);
    if (!r || r.estatus === 'eliminado') throw no('El reporte no existe o fue eliminado');
    DB.comentarios_reporte.push({ id: DB.siguiente('comentarios_reporte'), reporte_id: r.id, autor_id: c.u.id, contenido: texto(c.b.contenido, 'tu comentario', 2, 250), creado_en: fmt(c.ahora), estado: 'visible' });
    return { ok: true, mensaje: 'Comentario publicado' };
  }, { estado: 201 });
  ruta('POST', 'foto-denuncia/proyectos/:id/calificacion', function (c) {
    requiere(c, 'ciudadano');
    var p = PRO(c.p.id);
    if (!p) throw no('El proyecto no existe');
    var n = Number(c.b.puntuacion);
    if (!(n >= 1 && n <= 5)) throw mal('La calificación debe estar entre 1 y 5');
    var k = DB.calificaciones.find(function (x) { return x.proyecto_id === p.id && x.ciudadano_id === c.u.id; });
    if (!k) { k = { proyecto_id: p.id, ciudadano_id: c.u.id }; DB.calificaciones.push(k); }
    k.puntuacion = Math.round(n); k.comentario = c.b.comentario || null; k.creada_en = fmt(c.ahora);
    return { ok: true, mensaje: 'Gracias, tu calificación se guardó' };
  });

  /* funcionario */
  function deMiAlcaldia(c, p) { return p.alcaldia_id === c.u.alcaldia_id; }
  function funcion(c, f) { requiere(c, 'funcionario'); if (f && (c.u.funciones || []).indexOf(f) < 0) throw new Err(403, 'No tienes asignada la función "' + ({ directorio: 'Directorio', moderacion: 'Moderación', revision_registros: 'Revisión de registros', dictaminacion: 'Dictaminación', consulta: 'Consulta', seguimiento: 'Seguimiento' })[f] + '"'); }
  ruta('GET', 'func/panel', function (c) {
    funcion(c);
    var u = c.u;
    var mias = DB.proyectos.filter(function (p) { return deMiAlcaldia(c, p); });
    var uts = DB.unidades.filter(function (x) { return x.alcaldia_id === u.alcaldia_id; });
    var hace7 = fmt(new Date(c.ahora.getTime() - 7 * 86400000));
    var conteos = {
      registros: mias.filter(function (p) { return p.estatus === 'registrado' && p.estado_moderacion === 'visible'; }).length,
      dictaminar: mias.filter(function (p) { return p.estatus === 'en_dictaminacion'; }).length,
      sin_ubicar: mias.filter(function (p) { return ['pendiente', 'no_ubicado'].indexOf(p.estado_ubicacion) >= 0 && p.estatus !== 'retirado'; }).length,
      en_seguimiento: mias.filter(function (p) { return ['ganador', 'en_ejecucion'].indexOf(p.estatus) >= 0; }).length,
      sorteos_pendientes: est.fase >= 3 ? uts.filter(function (x) { return !DB.sorteos.some(function (s) { return s.unidad_id === x.id; }) && mias.some(function (p) { return p.unidad_id === x.id && visible(p); }); }).length : 0,
      casos: DB.resultados_unidad.filter(function (r) { return UT(r.unidad_id).alcaldia_id === u.alcaldia_id && r.caso_especial && !r.proyecto_ganador_id; }).length,
      reportes: DB.reportes.filter(function (r) { return PRO(r.proyecto_id).alcaldia_id === u.alcaldia_id && r.estatus === 'pendiente'; }).length,
      ideas_recientes: DB.ideas.filter(function (i) { return UT(i.unidad_id).alcaldia_id === u.alcaldia_id && i.estado === 'visible' && i.creada_en > hace7; }).length,
    };
    var dir = DB.directorio.filter(function (d) { return d.alcaldia_id === u.alcaldia_id; });
    return {
      ciclo: ciclo(), funciones: u.funciones, conteos: conteos,
      avisos: DB.avisos.filter(function (a) { return a.activo && (!a.alcaldia_id || a.alcaldia_id === u.alcaldia_id); }).sort(function (a, b) { return a.publicado_en < b.publicado_en ? 1 : -1; }).slice(0, 10)
        .map(function (a) { return { id: a.id, titulo: a.titulo, mensaje: a.mensaje, publicado_en: a.publicado_en, alcaldia_id: a.alcaldia_id, alcaldia: a.alcaldia_id ? ALC(a.alcaldia_id).nombre : null, es_mio: b2(a.autor_id === u.id) }; }),
      directorio: { ultima: dir.reduce(function (m, d) { return d.actualizado_en > m ? d.actualizado_en : m; }, ''), n: dir.length },
    };
  });
  ruta('GET', 'func/registros', function (c) {
    funcion(c, 'revision_registros');
    var todos = c.q.estatus === 'todos';
    return DB.proyectos.filter(function (p) { return deMiAlcaldia(c, p) && visible(p) && (todos || p.estatus === 'registrado'); })
      .sort(function (a, b) { return a.creado_en < b.creado_en ? -1 : 1; }).map(function (p) {
        var ut = UT(p.unidad_id);
        var cor = correccionDe(p.id);
        return { id: p.id, folio: p.folio, titulo: p.titulo, descripcion: p.descripcion, rubro: RUB(p.rubro_id).nombre_es, costo_estimado: p.costo_estimado, calle: p.calle, numero: p.numero,
          referencias: p.referencias, codigo_postal: p.codigo_postal, estatus: p.estatus, estado_ubicacion: p.estado_ubicacion, creado_en: p.creado_en, actualizado_en: p.actualizado_en,
          unidad_territorial: ut.nombre, proponente: U(p.proponente_id).nombre_completo, presupuesto_asignado: ut.presupuesto_asignado, imagen_uuid: p.imagen_uuid,
          correccion: cor ? cor.observacion : null, correccion_en: cor ? cor.revisado_en : null };
      });
  });
  ruta('POST', 'func/registros/:id/revision', function (c) {
    funcion(c, 'revision_registros');
    var p = PRO(c.p.id);
    if (!p) throw no('El proyecto no existe');
    var res = c.b.resultado === 'correccion_solicitada' ? 'correccion_solicitada' : 'completo';
    if (res === 'correccion_solicitada') {
      var obs = texto(c.b.observacion, 'la observación', 3, 250);
      if (correccionDe(p.id)) throw choque('Ya se solicitó una corrección para este proyecto');
      DB.revisiones.push({ proyecto_id: p.id, resultado: res, observacion: obs, revisado_en: fmt(c.ahora) });
      notificar(p.proponente_id, 'correccion_solicitada', 'Se solicitó una corrección', 'Proyecto ' + p.folio + ': ' + obs, p.id, c.ahora);
    } else {
      DB.revisiones.push({ proyecto_id: p.id, resultado: res, observacion: null, revisado_en: fmt(c.ahora) });
      p.estatus = 'en_dictaminacion';
      notificar(p.proponente_id, 'proyecto_en_dictaminacion', 'Tu proyecto pasó a dictaminación', 'El proyecto ' + p.folio + ' está completo y fue enviado al Órgano Dictaminador.', p.id, c.ahora);
    }
    bitacora(c.u, 'registro_revisar', 'proyectos', p.id, { resultado: res }, c.ahora);
    return { ok: true, mensaje: res === 'completo' ? 'El proyecto pasó a dictaminación' : 'Se envió la solicitud de corrección al proponente' };
  });
  ruta('GET', 'func/moderacion', function (c) {
    funcion(c, 'moderacion');
    var tipo = c.q.tipo || 'idea';
    var e = c.q.estado;
    var alc = c.u.alcaldia_id;
    var l = [];
    if (tipo === 'idea') l = DB.ideas.filter(function (i) { return UT(i.unidad_id).alcaldia_id === alc; }).map(function (i) { return { id: i.id, texto: i.contenido, estado: i.estado, fecha: i.creada_en, autor: U(i.autor_id).nombre_completo, unidad_territorial: UT(i.unidad_id).nombre, contexto: RUB(i.rubro_id).nombre_es }; });
    if (tipo === 'comentario_idea') l = DB.comentarios_idea.filter(function (k) { var i = porId(DB.ideas, k.idea_id); return i && UT(i.unidad_id).alcaldia_id === alc; }).map(function (k) { var i = porId(DB.ideas, k.idea_id); return { id: k.id, texto: k.contenido, estado: k.estado, fecha: k.creado_en, autor: U(k.autor_id).nombre_completo, unidad_territorial: UT(i.unidad_id).nombre, contexto: i.contenido.slice(0, 80) }; });
    if (tipo === 'proyecto') l = DB.proyectos.filter(function (p) { return p.alcaldia_id === alc && p.estatus !== 'retirado'; }).map(function (p) { return { id: p.id, texto: p.folio + ' · ' + p.titulo + ' — ' + p.descripcion, estado: p.estado_moderacion, fecha: p.creado_en, autor: U(p.proponente_id).nombre_completo, unidad_territorial: UT(p.unidad_id).nombre, contexto: p.estatus }; });
    if (tipo === 'comentario_reporte') l = DB.comentarios_reporte.filter(function (k) { var r = porId(DB.reportes, k.reporte_id); return r && PRO(r.proyecto_id).alcaldia_id === alc; }).map(function (k) { var r = porId(DB.reportes, k.reporte_id); var p = PRO(r.proyecto_id); return { id: k.id, texto: k.contenido, estado: k.estado, fecha: k.creado_en, autor: U(k.autor_id).nombre_completo, unidad_territorial: UT(p.unidad_id).nombre, contexto: p.folio + ' · reporte #' + r.id }; });
    return l.filter(function (x) { return (!e || x.estado === e) && like(x.texto, c.q.q); }).sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; }).slice(0, 200);
  });
  ruta('POST', 'func/moderacion', function (c) {
    funcion(c, 'moderacion');
    texto(c.b.motivo, 'el motivo', 3, 250);
    var nuevo = { ocultar: 'oculto', eliminar: 'eliminado', restaurar: 'visible' }[c.b.accion];
    if (!nuevo) throw mal('Elige la acción');
    var tabla = { idea: DB.ideas, comentario_idea: DB.comentarios_idea, proyecto: DB.proyectos, comentario_reporte: DB.comentarios_reporte }[c.b.tipo_objeto];
    var x = tabla && porId(tabla, c.b.objeto_id);
    if (!x) throw no('El contenido no existe');
    if (c.b.tipo_objeto === 'proyecto') x.estado_moderacion = nuevo; else x.estado = nuevo;
    bitacora(c.u, 'moderar_' + c.b.accion, c.b.tipo_objeto, x.id, { motivo: c.b.motivo }, c.ahora);
    return { ok: true, mensaje: { ocultar: 'El contenido quedó oculto', eliminar: 'El contenido se eliminó', restaurar: 'El contenido se restauró' }[c.b.accion] };
  });
  function filaDictamen(p) {
    var ut = UT(p.unidad_id);
    var d = dictamenDe(p.id);
    return { id: p.id, folio: p.folio, titulo: p.titulo, descripcion: p.descripcion, rubro: RUB(p.rubro_id).nombre_es, costo_estimado: p.costo_estimado, calle: p.calle, numero: p.numero, referencias: p.referencias,
      codigo_postal: p.codigo_postal, estatus: p.estatus, unidad_territorial: ut.nombre, presupuesto_asignado: ut.presupuesto_asignado, imagen_uuid: p.imagen_uuid,
      dictamen_id: d ? d.id : null, resultado: d ? d.resultado : null, justificacion: d ? d.justificacion : null, emitido_en: d ? d.emitido_en : null };
  }
  ruta('GET', 'func/dictamenes', function (c) {
    funcion(c, 'dictaminacion');
    var mias = DB.proyectos.filter(function (p) { return deMiAlcaldia(c, p) && p.estado_moderacion === 'visible'; });
    var pend = mias.filter(function (p) { return p.estatus === 'en_dictaminacion'; }).sort(function (a, b) { return a.creado_en < b.creado_en ? -1 : 1; }).map(function (p) {
      var f = filaDictamen(p);
      var d = dictamenDe(p.id);
      f.criterios = d ? d.criterios.map(function (k) { return { dictamen_id: d.id, criterio_id: k.criterio_id, cumple: k.cumple, observacion: k.observacion }; }) : [];
      return f;
    });
    var emi = mias.filter(function (p) { var d = dictamenDe(p.id); return d && d.emitido_en; }).map(filaDictamen).sort(function (a, b) { return a.emitido_en < b.emitido_en ? 1 : -1; }).slice(0, 100);
    return { ciclo: { id: 1, fase: fase().clave }, pendientes: pend, emitidos: emi };
  });
  ruta('POST', 'func/dictamenes/:id', function (c) {
    funcion(c, 'dictaminacion');
    var p = PRO(c.p.id);
    if (!p) throw no('El proyecto no existe');
    var crit = (c.b.criterios || []).map(function (k) { return { criterio_id: Number(k.criterio_id), cumple: k.cumple ? 1 : 0, observacion: k.observacion || null }; });
    var d = dictamenDe(p.id);
    if (d && d.emitido_en) throw choque('El dictamen ya fue emitido y es definitivo');
    if (c.b.emitir) {
      if (crit.length < DB.criterios.length) throw mal('Evalúa todos los criterios antes de emitir el dictamen');
      if (c.b.resultado === 'viable' && crit.some(function (k) { return !k.cumple; })) throw mal('Un proyecto que no cumple todos los criterios no puede declararse viable');
      texto(c.b.justificacion, 'la justificación', 10, 1000);
    }
    if (!d) { d = { id: DB.siguiente('dictamenes'), proyecto_id: p.id, resultado: null, justificacion: null, emitido_en: null, criterios: [] }; DB.dictamenes.push(d); }
    crit.forEach(function (k) { var x = d.criterios.find(function (y) { return y.criterio_id === k.criterio_id; }); if (x) Object.assign(x, k); else d.criterios.push(k); });
    if (c.b.emitir) {
      d.resultado = c.b.resultado; d.justificacion = c.b.justificacion; d.emitido_en = fmt(c.ahora); d.autor_id = c.u.id;
      p.estatus = d.resultado === 'viable' ? 'viable' : 'no_viable';
      notificar(p.proponente_id, 'dictamen_emitido', 'Dictamen de tu proyecto: ' + d.resultado.replace('_', ' '), 'Proyecto ' + p.folio + '. Justificación: ' + d.justificacion, p.id, c.ahora);
      bitacora(c.u, 'dictamen_emitir', 'dictamenes', d.id, { resultado: d.resultado }, c.ahora);
    }
    return { ok: true, mensaje: c.b.emitir ? 'El dictamen se emitió y se notificó al proponente' : 'La evaluación se guardó como borrador' };
  });
  ruta('GET', 'func/sorteos', function (c) {
    funcion(c, 'dictaminacion');
    var uts = DB.unidades.filter(function (x) { return x.alcaldia_id === c.u.alcaldia_id; }).sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });
    var l = uts.map(function (x) {
      var ps = DB.proyectos.filter(function (p) { return p.unidad_id === x.id && visible(p); });
      var s = DB.sorteos.find(function (k) { return k.unidad_id === x.id; });
      return { id: x.id, nombre: x.nombre, tipo: x.tipo, presupuesto_asignado: x.presupuesto_asignado, realizado_en: s ? s.realizado_en : null,
        viables: ps.filter(function (p) { return ['viable', 'en_consulta'].indexOf(p.estatus) >= 0; }).length,
        sin_dictamen: ps.filter(function (p) { return ['registrado', 'en_dictaminacion'].indexOf(p.estatus) >= 0; }).length, proyectos: ps.length,
        boleta: ps.filter(function (p) { return p.numero_sorteo; }).sort(function (a, b) { return a.numero_sorteo - b.numero_sorteo; }).map(function (p) { return { unidad_territorial_id: x.id, numero_sorteo: p.numero_sorteo, folio: p.folio, titulo: p.titulo }; }),
        proyectos_viables: ps.filter(function (p) { return ['viable', 'en_consulta'].indexOf(p.estatus) >= 0; }).map(function (p) { return { unidad_territorial_id: x.id, folio: p.folio, titulo: p.titulo }; }) };
    });
    var con = l.filter(function (x) { return x.proyectos > 0 || x.realizado_en; });
    return { ciclo: { id: 1, fase: fase().clave }, unidades: con, sin_proyectos: l.length - con.length };
  });
  ruta('POST', 'func/sorteos/:ut', function (c) {
    funcion(c, 'dictaminacion');
    var ut = UT(c.p.ut);
    if (!ut) throw no('La unidad territorial no existe');
    if (DB.sorteos.some(function (s) { return s.unidad_id === ut.id; })) throw choque('El sorteo de esta unidad ya se realizó');
    var vs = DB.proyectos.filter(function (p) { return p.unidad_id === ut.id && p.estatus === 'viable' && visible(p); });
    var n = vs.length;
    var orden = vs.map(function (p, i) { return { p: p, k: ((p.id * 2654435761 + c.ahora.getTime()) >>> 0) % 1000 + i / 10 }; }).sort(function (a, b) { return a.k - b.k; });
    orden.forEach(function (x, i) { x.p.numero_sorteo = i + 1; x.p.estatus = 'en_consulta'; });
    DB.sorteos.push({ unidad_id: ut.id, realizado_en: fmt(c.ahora) });
    bitacora(c.u, 'sorteo_realizar', 'sorteos', ut.id, { unidad: ut.nombre }, c.ahora);
    var boleta = orden.map(function (x) { return { numero_sorteo: x.p.numero_sorteo, folio: x.p.folio, titulo: x.p.titulo }; });
    return { ok: true, boleta: boleta, mensaje: n ? 'Sorteo realizado: la boleta tiene ' + n + ' proyecto(s)' : 'Sorteo realizado: no hubo proyectos viables en esta unidad' };
  });
  ruta('GET', 'func/casos', function (c) {
    funcion(c, 'consulta');
    var cy = DB.ciclos[0];
    var casos = DB.resultados_unidad.filter(function (r) { return UT(r.unidad_id).alcaldia_id === c.u.alcaldia_id && r.caso_especial; }).map(function (r) {
      var g = r.proyecto_ganador_id ? PRO(r.proyecto_ganador_id) : null;
      var cand = DB.proyectos.filter(function (p) { return p.unidad_id === r.unidad_id && p.total_votos !== null && p.numero_sorteo && (r.caso_especial !== 'empate' || p.posicion === 1); })
        .sort(function (a, b) { return a.posicion - b.posicion || a.numero_sorteo - b.numero_sorteo; })
        .map(function (p) { return { unidad_territorial_id: r.unidad_id, proyecto_id: p.id, total_votos: p.total_votos, posicion: p.posicion, folio: p.folio, titulo: p.titulo, numero_sorteo: p.numero_sorteo }; });
      return { unidad_territorial_id: r.unidad_id, unidad_territorial: UT(r.unidad_id).nombre, total_votos: r.total_votos, caso_especial: r.caso_especial, metodo: r.metodo, justificacion: r.justificacion,
        resuelto_en: r.resuelto_en, ganador_folio: g ? g.folio : null, ganador_titulo: g ? g.titulo : null, candidatos: cand };
    });
    return { ciclo: { id: 1, fase: fase().clave, publicados: !!cy.resultados_publicados_en, computo: !!cy.computo_realizado_en }, casos: casos };
  });
  ruta('POST', 'func/casos/:ut', function (c) {
    funcion(c, 'consulta');
    var r = DB.resultados_unidad.find(function (x) { return x.unidad_id === Number(c.p.ut); });
    if (!r || !r.caso_especial) throw no('No hay un caso especial en esta unidad');
    if (r.proyecto_ganador_id && r.resuelto_en) throw choque('El caso especial ya está resuelto');
    texto(c.b.justificacion, 'la justificación', 10, 500);
    var cand = DB.proyectos.filter(function (p) { return p.unidad_id === r.unidad_id && p.total_votos !== null && (r.caso_especial !== 'empate' || p.posicion === 1); });
    var g = c.b.metodo === 'asamblea_seleccion' ? PRO(c.b.proyecto_id) : cand[c.ahora.getTime() % cand.length];
    r.proyecto_ganador_id = g.id; r.metodo = c.b.metodo; r.justificacion = c.b.justificacion; r.resuelto_en = fmt(c.ahora);
    bitacora(c.u, 'caso_especial_resolver', 'resultados_unidad', r.unidad_id, { metodo: c.b.metodo }, c.ahora);
    return { ok: true, proyecto_ganador_id: g.id, mensaje: 'El caso especial quedó resuelto' };
  });
  ruta('GET', 'func/ubicaciones', function (c) {
    funcion(c);
    var ord = { no_ubicado: 0, pendiente: 1, ubicado: 2, corregido: 3 };
    return DB.proyectos.filter(function (p) { return deMiAlcaldia(c, p) && visible(p) && (!c.q.estado || p.estado_ubicacion === c.q.estado); })
      .sort(function (a, b) { return ord[a.estado_ubicacion] - ord[b.estado_ubicacion] || (a.folio < b.folio ? -1 : 1); }).map(function (p) {
        var ut = UT(p.unidad_id);
        return { id: p.id, folio: p.folio, titulo: p.titulo, calle: p.calle, numero: p.numero, referencias: p.referencias, codigo_postal: p.codigo_postal, latitud: p.latitud, longitud: p.longitud,
          estado_ubicacion: p.estado_ubicacion, estatus: p.estatus, rubro_id: p.rubro_id, categoria: p.categoria, unidad_territorial_id: ut.id, unidad_territorial: ut.nombre, ut_latitud: ut.latitud, ut_longitud: ut.longitud };
      });
  });
  ruta('PUT', 'func/ubicaciones/:id', function (c) {
    funcion(c);
    var p = PRO(c.p.id);
    if (!p) throw no('El proyecto no existe');
    p.calle = texto(c.b.calle, 'la calle', 2, 150); p.numero = c.b.numero || null; p.referencias = c.b.referencias || null;
    var ub = ubicar({ unidad_id: p.unidad_id }, c.b);
    p.latitud = ub.latitud; p.longitud = ub.longitud; p.estado_ubicacion = 'corregido';
    return { ok: true, ubicado: true, latitud: p.latitud, longitud: p.longitud, mensaje: 'La ubicación del proyecto se corrigió' };
  });
  function lugarDe(u) { var ut = u.unidad_id ? UT(u.unidad_id) : null; var a = ALC(u.alcaldia_id || ut.alcaldia_id); return { colonia: ut ? ut.nombre : null, alcaldia: a.nombre, alcaldia_id: a.id, ut: ut }; }
  ruta('POST', 'geocodificar', function (c) {
    requiere(c);
    var l = lugarDe(c.u);
    var base = l.ut || DB.unidades.find(function (x) { return x.alcaldia_id === l.alcaldia_id; });
    return { encontrado: true, latitud: base.latitud + 0.0006, longitud: base.longitud - 0.0004, direccion: (c.b.direccion || '') + ', Ciudad de México' };
  }, { sinRegistro: true });
  ruta('GET', 'direcciones/locales', function (c) {
    requiere(c);
    var l = lugarDe(c.u);
    var vistas = {};
    return DB.proyectos.filter(function (p) { return p.alcaldia_id === l.alcaldia_id && like(p.calle, c.q.q); }).filter(function (p) {
      var k = p.calle + '|' + p.unidad_id; if (vistas[k]) return false; vistas[k] = 1; return true;
    }).slice(0, 8).map(function (p) { return { calle: p.calle, codigo_postal: p.codigo_postal, colonia: UT(p.unidad_id).nombre }; });
  }, { sinRegistro: true });
  ruta('POST', 'direcciones/buscar', function (c) {
    requiere(c);
    var l = lugarDe(c.u);
    var base = l.ut || DB.unidades.find(function (x) { return x.alcaldia_id === l.alcaldia_id; });
    var calle = String(c.b.calle || '').trim();
    var num = c.b.numero || null;
    var cp = c.b.codigo_postal || null;
    var sug = [0, 1].map(function (k) {
      var lat = Math.round((base.latitud + (k ? -0.0011 : 0.0007)) * 1e6) / 1e6;
      var lon = Math.round((base.longitud + (k ? 0.0009 : -0.0005)) * 1e6) / 1e6;
      return { texto: calle + (num ? ' ' + num : '') + ', ' + (k ? base.nombre + ' (otra cuadra)' : base.nombre) + ', ' + l.alcaldia + ', Ciudad de México', calle: calle, numero: num, colonia: base.nombre,
        alcaldia: l.alcaldia, codigo_postal: cp, latitud: lat, longitud: lon, en_tu_alcaldia: true };
    });
    return { disponible: true, sugerencias: sug };
  }, { sinRegistro: true });
  ruta('POST', 'direcciones/punto', function (c) {
    requiere(c);
    var l = lugarDe(c.u);
    return { encontrado: true, fuera: null, texto: 'Punto elegido en el mapa, ' + (l.colonia ? l.colonia + ', ' : '') + l.alcaldia, calle: null, numero: null, colonia: l.colonia, alcaldia: l.alcaldia, codigo_postal: null, latitud: Number(c.b.latitud), longitud: Number(c.b.longitud) };
  }, { sinRegistro: true });
  ruta('GET', 'func/seguimiento', function (c) {
    funcion(c, 'seguimiento');
    var l = DB.proyectos.filter(function (p) { return deMiAlcaldia(c, p) && GANADOR.indexOf(p.estatus) >= 0; }).sort(function (a, b) { return a.folio < b.folio ? -1 : 1; }).map(function (p) {
      var ut = UT(p.unidad_id);
      var av = DB.avances.filter(function (a) { return a.proyecto_id === p.id; }).sort(function (a, b) { return a.registrado_en < b.registrado_en ? 1 : -1; })[0];
      return { id: p.id, folio: p.folio, titulo: p.titulo, estatus: p.estatus, avance_porcentaje: p.avance_porcentaje, monto_ejercido: p.monto_ejercido, presupuesto_asignado: ut.presupuesto_asignado,
        costo_estimado: p.costo_estimado, unidad_territorial: ut.nombre, ultima_nota: av ? av.nota : null, ultimo_avance: av ? av.registrado_en : null,
        reportes_pendientes: DB.reportes.filter(function (r) { return r.proyecto_id === p.id && r.estatus === 'pendiente'; }).length };
    }).map(function (o) { return conEtapas(o, PRO(o.id)); });
    return { ciclo: { id: 1, fase: fase().clave, fase_orden: est.fase }, proyectos: l };
  });
  function obraMia(c) {
    var p = PRO(c.p.id);
    if (!p) throw no('El proyecto no existe');
    if (p.alcaldia_id !== c.u.alcaldia_id) throw new Err(403, 'El proyecto no es de tu alcaldía');
    if (GANADOR.indexOf(p.estatus) < 0) throw choque('Solo se registra avance de proyectos ganadores');
    return p;
  }
  ruta('POST', 'func/seguimiento/:id/avance', function (c) {
    funcion(c, 'seguimiento');
    var p = obraMia(c);
    var estatus = c.b.estatus;
    var pct = pctEtapas(etapasDe(p));
    if (estatus === 'concluido' && pct < 100) throw mal('Para marcar el proyecto como concluido deben estar cumplidas todas sus etapas');
    var just = estatus === 'inejecutable' ? texto(c.b.justificacion_inejecutable, 'la justificación de por qué es inejecutable', 10, 1000) : null;
    var monto = Number(c.b.monto_ejercido) || 0;
    DB.avances.push({ proyecto_id: p.id, porcentaje: pct, monto_ejercido: monto, estatus: estatus, nota: c.b.nota || null, justificacion_inejecutable: just, registrado_en: fmt(c.ahora) });
    p.avance_porcentaje = pct; p.monto_ejercido = monto; p.estatus = estatus;
    bitacora(c.u, 'avance_registrar', 'proyectos', p.id, { porcentaje: pct }, c.ahora);
    return { ok: true, mensaje: 'El avance se registró y ya lo pueden ver los vecinos' };
  });
  ruta('POST', 'func/seguimiento/:id/etapa', function (c) {
    funcion(c, 'seguimiento');
    var p = obraMia(c);
    var evidencia = texto(c.b.evidencia, 'la evidencia de la etapa', 10, 250);
    if (p.estatus === 'concluido') throw choque('El proyecto ya está concluido');
    if (p.estatus === 'inejecutable') throw choque('El proyecto se declaró inejecutable');
    var et = etapasDe(p);
    var e = et.find(function (x) { return x.id === Number(c.b.etapa_id); });
    if (!e) throw mal('Esa etapa no corresponde a este proyecto');
    if (e.cumplida_en) throw choque('Esa etapa ya está marcada como cumplida');
    var sig = et.find(function (x) { return !x.cumplida_en; });
    if (sig.id !== e.id) throw choque('Las etapas se cumplen en orden: primero marca «' + sig.nombre_es + '»');
    DB.etapas_proyecto.push({ proyecto_id: p.id, etapa_id: e.id, cumplida_en: fmt(c.ahora), evidencia: evidencia });
    e.cumplida_en = fmt(c.ahora);
    var pct = pctEtapas(et);
    var estatus = pct >= 100 ? 'concluido' : 'en_ejecucion';
    DB.avances.push({ proyecto_id: p.id, porcentaje: pct, monto_ejercido: p.monto_ejercido, estatus: estatus, nota: evidencia, justificacion_inejecutable: null, registrado_en: fmt(c.ahora) });
    p.avance_porcentaje = pct; p.estatus = estatus;
    bitacora(c.u, 'etapa_marcar', 'proyectos', p.id, { etapa: e.nombre_es }, c.ahora);
    return { ok: true, porcentaje: pct, estatus: estatus, mensaje: estatus === 'concluido' ? 'Se cumplieron todas las etapas: el proyecto quedó concluido' : 'La etapa se marcó como cumplida y ya la pueden ver los vecinos' };
  });
  ruta('GET', 'func/reportes', function (c) {
    funcion(c, 'seguimiento');
    return DB.reportes.filter(function (r) { return PRO(r.proyecto_id).alcaldia_id === c.u.alcaldia_id && r.estatus !== 'eliminado' && (!c.q.estatus || r.estatus === c.q.estatus); })
      .sort(function (a, b) { return (b.estatus === 'pendiente') - (a.estatus === 'pendiente') || (a.creado_en < b.creado_en ? 1 : -1); })
      .map(function (r) { var v = reporteVista(r, c.u); delete v.es_mio; delete v.alcaldia; delete v.alcaldia_id; return v; });
  });
  ruta('POST', 'func/reportes/:id', function (c) {
    funcion(c, 'seguimiento');
    var r = porId(DB.reportes, c.p.id);
    if (!r) throw no('El reporte no existe');
    if (r.estatus !== 'pendiente') throw choque('Este reporte ya fue revisado');
    var t = texto(c.b.texto, c.b.accion === 'atender' ? 'la respuesta al vecino' : 'el motivo de eliminación', 5, 250);
    if (c.b.accion === 'atender') { r.estatus = 'atendido'; r.respuesta = t; notificar(r.autor_id, 'reporte_atendido', 'Tu reporte fue atendido', t, r.proyecto_id, c.ahora); }
    else { r.estatus = 'eliminado'; notificar(r.autor_id, 'reporte_eliminado', 'Tu reporte fue eliminado', t, r.proyecto_id, c.ahora); }
    return { ok: true, mensaje: c.b.accion === 'atender' ? 'El reporte quedó como Atendido y se notificó al vecino' : 'El reporte se eliminó' };
  });
  function datosDir(c) {
    var b = c.b;
    return { alcaldia_id: Number(b.alcaldia_id || c.u.alcaldia_id), tipo: b.tipo || 'sede_atencion', cargo: texto(b.cargo, 'el cargo', 2, 150), nombre_titular: b.nombre_titular || null,
      temas: b.temas || null, direccion: b.direccion || null, telefono: b.telefono ? String(b.telefono).replace(/\D/g, '') : null, correo: b.correo || null, sitio_web: b.sitio_web || null };
  }
  ruta('POST', 'func/directorio', function (c) {
    requiere(c, ['funcionario', 'administrador']);
    var d = Object.assign({ id: DB.siguiente('directorio'), origen: 'manual', actualizado_en: fmt(c.ahora), fuente_nombre: 'Captura de un funcionario de la alcaldía', fuente_url: null, consultado_en: D.fmtDia(c.ahora) }, datosDir(c));
    DB.directorio.push(d);
    return { ok: true, id: d.id, mensaje: 'El registro se agregó al directorio' };
  }, { estado: 201 });
  ruta('PUT', 'func/directorio/:id', function (c) {
    requiere(c, ['funcionario', 'administrador']);
    var d = porId(DB.directorio, c.p.id);
    if (!d) throw no('El registro no existe');
    Object.assign(d, datosDir(c), { actualizado_en: fmt(c.ahora), fuente_nombre: 'Captura de un funcionario de la alcaldía', fuente_url: null, consultado_en: D.fmtDia(c.ahora) });
    return { ok: true, cambios: 1, mensaje: 'El registro del directorio se actualizó' };
  });
  ruta('DELETE', 'func/directorio/:id', function (c) {
    requiere(c, ['funcionario', 'administrador']);
    DB.directorio = DB.directorio.filter(function (d) { return d.id !== Number(c.p.id); });
    return { ok: true, mensaje: 'El registro se eliminó del directorio' };
  });
  ruta('GET', 'avisos', function (c) {
    requiere(c, ['funcionario', 'administrador']);
    var u = c.u;
    return DB.avisos.filter(function (a) { return u.rol === 'administrador' || !a.alcaldia_id || a.alcaldia_id === u.alcaldia_id; }).sort(function (a, b) { return a.publicado_en < b.publicado_en ? 1 : -1; })
      .map(function (a) { return { id: a.id, titulo: a.titulo, mensaje: a.mensaje, publicado_en: a.publicado_en, activo: a.activo, vigente_hasta: a.vigente_hasta, alcaldia_id: a.alcaldia_id, alcaldia: a.alcaldia_id ? ALC(a.alcaldia_id).nombre : null, autor: U(a.autor_id).nombre_completo, es_mio: b2(a.autor_id === u.id) }; });
  });
  ruta('POST', 'avisos', function (c) {
    requiere(c, ['funcionario', 'administrador']);
    var alc = c.u.rol === 'funcionario' ? ((c.b.alcance || 'mi_alcaldia') === 'todas' ? null : c.u.alcaldia_id) : (c.b.alcaldia_id ? Number(c.b.alcaldia_id) : null);
    DB.avisos.push({ id: DB.siguiente('avisos'), ciclo_id: 1, alcaldia_id: alc, autor_id: c.u.id, titulo: texto(c.b.titulo, 'el título del aviso', 3, 100), mensaje: texto(c.b.mensaje, 'el mensaje', 5, 1000), publicado_en: fmt(c.ahora), activo: 1, vigente_hasta: c.b.vigente_hasta || null });
    return { ok: true, mensaje: 'El aviso se publicó en el panel de los ciudadanos' };
  }, { estado: 201 });
  ruta('POST', 'avisos/:id/retirar', function (c) {
    requiere(c, ['funcionario', 'administrador']);
    var a = porId(DB.avisos, c.p.id);
    if (!a || (a.autor_id !== c.u.id && c.u.rol !== 'administrador')) throw no('El aviso no existe o no lo publicaste tú');
    a.activo = 0;
    return { ok: true, mensaje: 'El aviso se retiró' };
  });

  /* administrador */
  function adm(c) { requiere(c, 'administrador'); }
  function estatusConteo() {
    var m = {};
    DB.proyectos.forEach(function (p) { m[p.estatus] = (m[p.estatus] || 0) + 1; });
    return Object.keys(m).map(function (k) { return { estatus: k, n: m[k] }; });
  }
  function partGeneral() {
    var f = participacionFilas();
    var v = f.filter(function (x) { return x.voto; }).length;
    return { registrados: f.length, votantes: v, porcentaje: f.length ? redondea2(100 * v / f.length) : null };
  }
  ruta('GET', 'admin/resumen', function (c) {
    adm(c);
    return {
      ciclo_id: 1,
      totales: { ciudadanos: DB.usuarios.filter(function (u) { return u.rol === 'ciudadano' && !u.eliminado; }).length, suspendidos: DB.usuarios.filter(function (u) { return u.rol === 'ciudadano' && u.estado === 'suspendida'; }).length,
        funcionarios: DB.usuarios.filter(function (u) { return u.rol === 'funcionario' && u.estado === 'activa' && !u.eliminado; }).length, correos_pendientes: 0, ciclos: DB.ciclos.length },
      proyectos: estatusConteo(), participacion: partGeneral(), correo_configurado: true,
    };
  });
  ruta('GET', 'admin/ciclos', function (c) {
    adm(c);
    return DB.ciclos.map(function (x) {
      var f = DB.fasesCat.find(function (k) { return k.orden === (x.id === 1 ? est.fase : x.fase_orden); });
      return { id: x.id, nombre: x.nombre, anio_simulado: x.anio_simulado, estado: x.estado, presupuesto_total: x.presupuesto_total, creado_en: x.creado_en, cerrado_en: x.cerrado_en, tipo: x.tipo, pausado_en: x.pausado_en,
        fase_es: x.estado === 'borrador' ? null : f.nombre_es, fase_en: x.estado === 'borrador' ? null : f.nombre_en, unidades: x.id === 1 ? DB.unidades.length : 32 };
    });
  });
  ruta('GET', 'admin/ciclos/:id', function (c) {
    adm(c);
    var cy = cicloPorId(c.p.id);
    var real = cy.id === 1;
    var unidades = DB.unidades.map(function (u) {
      var a = ALC(u.alcaldia_id);
      return { unidad_territorial_id: u.id, clave: u.clave, nombre: u.nombre, tipo: u.tipo, alcaldia_id: a.id, alcaldia: a.nombre, poblacion: u.poblacion, poblacion_flotante: u.poblacion_flotante,
        indice_pobreza: u.indice_pobreza, indice_delictivo: u.indice_delictivo, es_pueblo_originario: u.es_pueblo_originario, presupuesto_asignado: real ? u.presupuesto_asignado : redondea2(u.presupuesto_asignado * 19.2) };
    }).sort(function (a, b) { return a.alcaldia.localeCompare(b.alcaldia) || a.nombre.localeCompare(b.nombre); });
    if (!real) cy.fase = null;
    return {
      ciclo: cy, fases: fasesCiclo(cy.id), unidades: unidades, estatus: real ? estatusConteo() : [],
      pendientes: real ? {
        sin_dictamen: DB.proyectos.filter(function (p) { return ['registrado', 'en_dictaminacion'].indexOf(p.estatus) >= 0 && p.estado_moderacion === 'visible'; }).length,
        sorteos_pendientes: DB.unidades.filter(function (u) { return !DB.sorteos.some(function (s) { return s.unidad_id === u.id; }) && DB.proyectos.some(function (p) { return p.unidad_id === u.id && visible(p); }); }).length,
        casos_sin_resolver: DB.resultados_unidad.filter(function (r) { return !r.proyecto_ganador_id; }).length,
        casos_especiales: DB.resultados_unidad.filter(function (r) { return r.caso_especial; }).length, votos: DB.participaciones.length,
      } : { sin_dictamen: 0, sorteos_pendientes: 0, casos_sin_resolver: 0, casos_especiales: 0, votos: 0 },
    };
  });
  function soloDemo(msg) { return function (c) { adm(c); throw choque(msg || 'En esta demostración solo hay un ciclo de práctica. Usa el panel «Demostración» para cambiar de fase.'); }; }
  ruta('POST', 'admin/ciclos', soloDemo('En esta demostración no se crean ciclos nuevos: el ciclo de práctica ya está cargado con datos de ejemplo.'), { sinRegistro: true });
  ruta('PUT', 'admin/ciclos/:id', function (c) { adm(c); var x = porId(DB.ciclos, c.p.id); if (x && c.b.nombre) x.nombre = c.b.nombre; return { ok: true, mensaje: 'Los datos del ciclo se guardaron' }; });
  ruta('DELETE', 'admin/ciclos/:id', soloDemo('En esta demostración no se eliminan ciclos.'), { sinRegistro: true });
  ruta('PUT', 'admin/ciclos/:id/fases', function (c) { adm(c); return { ok: true, mensaje: 'Las fechas de las fases se guardaron' }; }, { sinRegistro: true });
  ruta('PUT', 'admin/ciclos/:id/unidades/:ut', function (c) { adm(c); return { ok: true, mensaje: 'Los índices se guardaron. Recalcula el presupuesto para aplicarlos' }; }, { sinRegistro: true });
  ruta('POST', 'admin/ciclos/:id/presupuesto', function (c) { adm(c); return { ok: true, unidades: DB.unidades.map(function (u) { return { unidad_territorial_id: u.id, presupuesto_asignado: u.presupuesto_asignado }; }), mensaje: 'La distribución del presupuesto se recalculó' }; }, { sinRegistro: true });
  ruta('POST', 'admin/ciclos/:id/fase', function (c) {
    adm(c);
    if (Number(c.p.id) !== 1) throw choque('En esta demostración solo se mueve el ciclo de práctica');
    var i = D.FASES_CLAVE.indexOf(c.b.fase);
    if (i < 0) throw mal('Elige la fase');
    est.fase = i + 1; est.banderas = {};
    guardar();
    olvidarMarco();
    construir();
    return { ok: true, mensaje: 'La fase del ciclo cambió' };
  }, { sinRegistro: true });
  ruta('GET', 'admin/modo', function (c) {
    adm(c);
    var act = DB.ciclos[0];
    var f = fase();
    var fila = { id: 1, nombre: act.nombre, tipo: 'practica', estado: 'activo', pausado_en: null, votacion_abierta: act.votacion_abierta, fase: f.clave, fase_es: f.nombre_es, fase_en: f.nombre_en, fases_con_fecha: 8 };
    var b = DB.ciclos[1];
    var filaB = { id: b.id, nombre: b.nombre, tipo: 'practica', estado: 'borrador', pausado_en: null, votacion_abierta: 0, fase: 'convocatoria', fase_es: 'Convocatoria', fase_en: 'Call for participation', fases_con_fecha: 0 };
    return { modo: 'practica', activo: fila, practicas: [fila, filaB], hoy: D.fmtDia(DB.hoy) };
  });
  ruta('POST', 'admin/modo', function (c) {
    adm(c);
    if (Number(c.b.ciclo_id) === 1) return { ok: true, sinCambio: true, mensaje: 'Ese ciclo ya es el activo' };
    throw choque('Configura las fechas de las fases de ese ciclo antes de activarlo');
  }, { sinRegistro: true });
  ruta('POST', 'admin/modo/cargar-oficial', function (c) { adm(c); return { ok: true, id: 2, mensaje: 'El ciclo oficial ya estaba cargado' }; }, { sinRegistro: true });
  ruta('POST', 'admin/ciclos/:id/votacion', function (c) {
    adm(c);
    if (est.fase !== 5) throw choque('La votación solo se abre o se cierra en la fase de Consulta');
    var abrir = c.b.accion === 'abrir';
    if (abrir && DB.ciclos[0].votacion_abierta) throw choque('La votación ya está abierta');
    if (!abrir && !DB.ciclos[0].votacion_abierta) throw choque('La votación no está abierta');
    est.banderas.votacionCerrada = !abrir;
    guardar(); olvidarMarco(); construir();
    return { ok: true, computo: abrir ? null : { unidades: DB.unidades.length, casos_especiales: 2 }, mensaje: abrir ? 'La recepción de votos está abierta' : 'La votación se cerró. En la demostración, el conteo aparece al pasar a la fase de Resultados' };
  }, { sinRegistro: true });
  ruta('GET', 'admin/ciclos/:id/votacion/resumen', function (c) {
    adm(c);
    var cy = DB.ciclos[0];
    var contado = !!cy.computo_realizado_en;
    var filas = participacionFilas();
    var votantes = filas.filter(function (x) { return x.voto; });
    var porDia = {};
    DB.participaciones.forEach(function (p) { var d = p.participo_en.slice(0, 10); porDia[d] = (porDia[d] || 0) + 1; });
    var colonias = DB.unidades.filter(function (u) { return DB.proyectos.some(function (p) { return p.unidad_id === u.id && p.numero_sorteo; }); }).map(function (u) {
      var r = DB.resultados_unidad.find(function (x) { return x.unidad_id === u.id; });
      var g = r && r.proyecto_ganador_id ? PRO(r.proyecto_ganador_id) : null;
      return { colonia: u.nombre, alcaldia: ALC(u.alcaldia_id).nombre, padron: filas.filter(function (x) { return x.ut.id === u.id; }).length,
        participantes: DB.participaciones.filter(function (p) { return p.unidad_id === u.id; }).length,
        en_boleta: DB.proyectos.filter(function (p) { return p.unidad_id === u.id && p.numero_sorteo && p.estado_moderacion === 'visible'; }).length,
        total_votos: r ? r.total_votos : null, caso_especial: r ? r.caso_especial : null, metodo: r ? r.metodo : null, ganador: !!g,
        proyectos: contado ? DB.proyectos.filter(function (p) { return p.unidad_id === u.id && p.total_votos !== null && p.numero_sorteo; }).sort(function (a, b) { return a.posicion - b.posicion || a.numero_sorteo - b.numero_sorteo; })
          .map(function (p) { return { folio: p.folio, titulo: p.titulo, numero: p.numero_sorteo, votos: p.total_votos, posicion: p.posicion, ganador: !!g && g.id === p.id }; }) : [] };
    }).sort(function (a, b) { return a.alcaldia.localeCompare(b.alcaldia) || a.colonia.localeCompare(b.colonia); });
    return {
      ciclo: { id: 1, nombre: cy.nombre, votacion_abierta: !!cy.votacion_abierta, votacion_cerrada_en: cy.votacion_cerrada_en, computo_realizado_en: cy.computo_realizado_en, resultados_publicados_en: cy.resultados_publicados_en },
      totales: { padron: filas.length, participantes: votantes.length, porcentaje: filas.length ? Math.round(1000 * votantes.length / filas.length) / 10 : 0,
        colonias_con_boleta: colonias.filter(function (x) { return x.en_boleta > 0; }).length, colonias_con_votos: colonias.filter(function (x) { return x.participantes > 0; }).length,
        ganadores: DB.resultados_unidad.filter(function (r) { return r.proyecto_ganador_id; }).length, casos_especiales: colonias.filter(function (x) { return x.caso_especial && !x.ganador; }).length },
      por_genero: agrupar(filas, function (x) { return x.u.genero; }), por_edad: agrupar(filas, function (x) { return rangoEdad(x.u.fecha_nacimiento); }),
      por_dia: Object.keys(porDia).sort().map(function (d) { return { dia: d, votantes: porDia[d] }; }), colonias: colonias,
      participantes: DB.participaciones.slice().sort(function (a, b) { return a.participo_en < b.participo_en ? 1 : -1; }).map(function (p) { var u = U(p.ciudadano_id); var ut = UT(p.unidad_id); return { nombre: u.nombre_completo, colonia: ut.nombre, alcaldia: ALC(ut.alcaldia_id).nombre, fecha: p.participo_en.replace(' ', 'T') }; }),
      participantes_total: votantes.length,
    };
  });
  ruta('GET', 'admin/ciclos/:id/obras', function (c) {
    adm(c);
    if (Number(c.p.id) !== 1) return { umbral: 40, obras: [], alertas: 0 };
    var obras = DB.proyectos.filter(function (p) { return GANADOR.indexOf(p.estatus) >= 0; }).map(function (p) {
      var ut = UT(p.unidad_id);
      return conEtapas({ id: p.id, folio: p.folio, titulo: p.titulo, estatus: p.estatus, avance_porcentaje: p.avance_porcentaje, monto_ejercido: p.monto_ejercido, costo_estimado: p.costo_estimado,
        presupuesto_asignado: ut.presupuesto_asignado, colonia: ut.nombre, alcaldia: ALC(ut.alcaldia_id).nombre }, p);
    }).sort(function (a, b) { return a.alcaldia.localeCompare(b.alcaldia) || a.colonia.localeCompare(b.colonia) || (a.folio < b.folio ? -1 : 1); });
    obras.sort(function (a, b) { return Number(b.alerta_gasto) - Number(a.alerta_gasto); });
    return { umbral: 40, obras: obras, alertas: obras.filter(function (o) { return o.alerta_gasto; }).length };
  });
  ruta('POST', 'admin/proyectos/:id/etapas/:etapa/desmarcar', function (c) {
    adm(c);
    var p = PRO(c.p.id);
    if (!p) throw no('El proyecto no existe');
    var motivo = texto(c.b.motivo, 'el motivo de la corrección', 10, 250);
    var et = etapasDe(p);
    var hechas = et.filter(function (e) { return e.cumplida_en; });
    if (!hechas.length) throw choque('El proyecto no tiene etapas cumplidas');
    var ult = hechas[hechas.length - 1];
    if (ult.id !== Number(c.p.etapa)) throw choque('Solo se puede corregir la última etapa cumplida («' + ult.nombre_es + '»)');
    DB.etapas_proyecto = DB.etapas_proyecto.filter(function (x) { return !(x.proyecto_id === p.id && x.etapa_id === ult.id); });
    ult.cumplida_en = null;
    var pct = pctEtapas(et);
    var estatus = p.estatus === 'concluido' ? 'en_ejecucion' : p.estatus;
    DB.avances.push({ proyecto_id: p.id, porcentaje: pct, monto_ejercido: p.monto_ejercido, estatus: estatus, nota: ('Corrección: ' + motivo).slice(0, 250), justificacion_inejecutable: estatus === 'inejecutable' ? motivo : null, registrado_en: fmt(c.ahora) });
    p.avance_porcentaje = pct; p.estatus = estatus;
    bitacora(c.u, 'etapa_desmarcar', 'proyectos', p.id, { etapa: ult.nombre_es, motivo: motivo }, c.ahora);
    return { ok: true, porcentaje: pct, estatus: estatus, mensaje: 'Se corrigió la etapa y quedó registrado en la bitácora' };
  });
  ruta('POST', 'admin/ciclos/:id/ganadores', function (c) {
    adm(c);
    if (est.fase < 6) throw choque('Primero cierra la votación y pasa a la fase de Resultados');
    est.banderas.sinPublicar = false; guardar(); olvidarMarco(); construir();
    return { ok: true, ganadores: DB.resultados_unidad.length, mensaje: 'Se publicaron los proyectos ganadores' };
  }, { sinRegistro: true });
  ruta('POST', 'admin/ciclos/:id/cerrar', soloDemo('En esta demostración el ciclo no se cierra para que siempre puedas mostrar los datos.'), { sinRegistro: true });
  ruta('PUT', 'admin/ciclos/:id/convocatoria', function (c) { adm(c); return { ok: true, uuid: 'demo:convocatoria', mensaje: 'La convocatoria se publicó' }; }, { sinRegistro: true });
  ruta('GET', 'admin/ciclos/:id/resultados.csv', function (c) {
    adm(c);
    var filas = [];
    DB.resultados_unidad.forEach(function (r) {
      var u = UT(r.unidad_id);
      DB.proyectos.filter(function (p) { return p.unidad_id === u.id && p.total_votos !== null && p.numero_sorteo; }).forEach(function (p) {
        filas.push({ ciclo: DB.ciclos[0].nombre, alcaldia: ALC(u.alcaldia_id).nombre, clave_ut: u.clave, unidad_territorial: u.nombre, numero_sorteo: p.numero_sorteo, folio: p.folio, titulo: p.titulo,
          rubro: RUB(p.rubro_id).nombre_es, total_votos: p.total_votos, posicion: p.posicion, ganador: r.proyecto_ganador_id === p.id, caso_especial: r.caso_especial, metodo: r.metodo });
      });
    });
    filas.sort(function (a, b) { return a.alcaldia.localeCompare(b.alcaldia) || a.unidad_territorial.localeCompare(b.unidad_territorial) || a.posicion - b.posicion; });
    var t = csv([['Ciclo', 'ciclo'], ['Alcaldía', 'alcaldia'], ['Clave UT', 'clave_ut'], ['Unidad territorial', 'unidad_territorial'], ['Número en boleta', 'numero_sorteo'], ['Folio', 'folio'], ['Proyecto', 'titulo'],
      ['Rubro', 'rubro'], ['Votos', 'total_votos'], ['Posición', 'posicion'], ['Ganador', function (f) { return f.ganador ? 'Sí' : 'No'; }], ['Caso especial', 'caso_especial'], ['Método', 'metodo']], filas);
    return new Archivo(t, 'text/csv; charset=utf-8', 'resultados-ciclo-practica-2026.csv');
  });
  ruta('GET', 'admin/ciclos/:id/reporte.pdf', function (c) {
    adm(c);
    var cy = ciclo();
    var part = partGeneral();
    var gan = DB.resultados_unidad.map(function (r) { var u = UT(r.unidad_id); var p = r.proyecto_ganador_id ? PRO(r.proyecto_ganador_id) : null; return [ALC(u.alcaldia_id).nombre, u.nombre, p ? p.folio : '—', p ? p.titulo : 'Sin resolver', r.total_votos]; })
      .sort(function (a, b) { return a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]); });
    var doc = window.PREPAR_PDF.documento({
      titulo: 'Reporte del ciclo: ' + cy.nombre, subtitulo: 'Año simulado ' + cy.anio_simulado + ' · Estado: ' + cy.estado + ' · Fase: ' + cy.fase_es,
      bloques: [
        { tipo: 'titulo', texto: 'Datos generales' },
        { tipo: 'dato', etiqueta: 'Presupuesto total', valor: '$' + Number(cy.presupuesto_total).toLocaleString('es-MX', { minimumFractionDigits: 2 }) },
        { tipo: 'dato', etiqueta: 'Ciudadanos registrados', valor: String(part.registrados) },
        { tipo: 'dato', etiqueta: 'Votantes', valor: part.votantes + ' (' + (part.porcentaje || 0) + ' %)' },
        { tipo: 'titulo', texto: 'Proyectos por estatus' },
        { tipo: 'tabla', columnas: ['Estatus', 'Proyectos'], anchos: [300, 200], filas: estatusConteo().sort(function (a, b) { return b.n - a.n; }).map(function (e) { return [e.estatus.replace(/_/g, ' '), e.n]; }) },
        { tipo: 'titulo', texto: 'Resultados por unidad territorial' },
        { tipo: 'tabla', columnas: ['Alcaldía', 'Unidad territorial', 'Folio', 'Proyecto ganador', 'Votos'], anchos: [90, 110, 90, 150, 60], filas: gan },
      ],
    });
    return new Archivo(doc, 'application/pdf', 'reporte-ciclo-practica-2026.pdf');
  });
  ruta('GET', 'admin/funcionarios', function (c) {
    adm(c);
    return DB.usuarios.filter(function (u) { return u.rol === 'funcionario' && !u.eliminado; }).sort(function (a, b) { return (b.estado === 'activa') - (a.estado === 'activa') || ALC(a.alcaldia_id).nombre.localeCompare(ALC(b.alcaldia_id).nombre) || a.nombre_completo.localeCompare(b.nombre_completo); })
      .map(function (u) { return { id: u.id, nombre_completo: u.nombre_completo, correo: u.correo, estado: u.estado, creado_en: u.creado_en, alcaldia_id: u.alcaldia_id, alcaldia: ALC(u.alcaldia_id).nombre, debe_cambiar_password: u.debe_cambiar_password || 0, funciones: u.funciones.slice().sort(), ultimo_acceso: u.ultimo_acceso || null }; });
  });
  ruta('GET', 'admin/administradores', function (c) {
    adm(c);
    return DB.usuarios.filter(function (u) { return u.rol === 'administrador' && !u.eliminado; }).map(function (u) { return { id: u.id, nombre: u.nombre_completo, correo: u.correo, estado: u.estado, creado_en: u.creado_en, soy_yo: b2(u.id === c.u.id) }; });
  });
  ruta('POST', 'admin/administradores', function (c) {
    adm(c);
    var u = { id: DB.siguiente('usuarios'), rol: 'administrador', nombre_completo: texto(c.b.nombre, 'el nombre', 5, 100), correo: String(c.b.correo || '').toLowerCase(), estado: 'activa', idioma: 'es', creado_en: fmt(c.ahora) };
    if (!/@/.test(u.correo)) throw mal('Escribe un correo válido');
    DB.usuarios.push(u);
    return { ok: true, id: u.id, mensaje: 'Se creó la cuenta de administrador de ' + u.nombre_completo + '. Comparte la contraseña en persona, no por chat.' };
  }, { estado: 201 });
  function eliminarUsuario(rol) {
    return function (c) {
      adm(c);
      if (c.b.confirmar !== 'ELIMINAR') throw mal('Escribe ELIMINAR para confirmar');
      var u = U(c.p.id);
      if (!u || u.rol !== rol) throw no('La cuenta no existe');
      if (u.id === c.u.id) throw choque('No puedes eliminar tu propia cuenta');
      u.eliminado = true;
      return { ok: true, mensaje: rol === 'funcionario' ? 'El funcionario se eliminó: se borraron sus datos personales y su correo quedó libre. Sus dictámenes y avisos se conservan.'
        : (rol === 'ciudadano' ? 'El ciudadano se eliminó: se borraron sus datos personales y su correo quedó libre. Sus votos siguen siendo anónimos.' : 'La cuenta de administrador se eliminó') };
    };
  }
  ruta('POST', 'admin/administradores/:id/eliminar', eliminarUsuario('administrador'));
  ruta('POST', 'admin/funcionarios/:id/eliminar', eliminarUsuario('funcionario'));
  ruta('POST', 'admin/ciudadanos/:id/eliminar', eliminarUsuario('ciudadano'));
  ruta('POST', 'admin/funcionarios', function (c) {
    adm(c);
    var b = c.b;
    if (!Array.isArray(b.funciones) || !b.funciones.length) throw mal('Selecciona al menos una función');
    var u = { id: DB.siguiente('usuarios'), rol: 'funcionario', nombre_completo: texto(b.nombre, 'el nombre', 5, 100), correo: String(b.correo || '').toLowerCase(), estado: 'activa', idioma: 'es', creado_en: fmt(c.ahora),
      alcaldia_id: Number(b.alcaldia_id), funciones: b.funciones.slice(), debe_cambiar_password: 1, telefono: b.telefono || null };
    if (!/@/.test(u.correo)) throw mal('Escribe un correo válido');
    if (!u.alcaldia_id) throw mal('Elige la alcaldía');
    DB.usuarios.push(u);
    bitacora(c.u, 'funcionario_registrar', 'usuarios', u.id, { nombre: u.nombre_completo }, c.ahora);
    return { ok: true, id: u.id, passwordTemporal: 'Demo-2026-Prep', correoEnviado: false, mensaje: 'El funcionario quedó registrado. Comparte la contraseña temporal en persona' };
  }, { estado: 201 });
  ruta('PUT', 'admin/funcionarios/:id', function (c) {
    adm(c);
    var u = U(c.p.id);
    if (!u) throw no('El funcionario no existe');
    if (c.b.nombre) u.nombre_completo = c.b.nombre;
    if (c.b.alcaldia_id) u.alcaldia_id = Number(c.b.alcaldia_id);
    if (Array.isArray(c.b.funciones)) u.funciones = c.b.funciones.slice();
    if (c.b.telefono !== undefined) u.telefono = c.b.telefono || null;
    return { ok: true, mensaje: 'Los datos del funcionario se guardaron' };
  });
  ruta('POST', 'admin/funcionarios/:id/estado', function (c) {
    adm(c);
    var u = U(c.p.id);
    if (!u) throw no('El funcionario no existe');
    u.estado = c.b.estado === 'desactivada' ? 'desactivada' : 'activa';
    return { ok: true, mensaje: u.estado === 'activa' ? 'La cuenta se activó' : 'La cuenta se desactivó' };
  });
  ruta('POST', 'admin/funcionarios/:id/restablecer', function (c) { adm(c); return { ok: true, passwordTemporal: 'Temp-' + (1000 + Number(c.p.id)) + '-Prep', correoEnviado: false, mensaje: 'Se generó una nueva contraseña temporal' }; }, { sinRegistro: true });
  ruta('GET', 'admin/ciudadanos', function (c) {
    adm(c);
    var q = c.q;
    var l = DB.usuarios.filter(function (u) {
      if (u.rol !== 'ciudadano' || u.eliminado) return false;
      var ut = UT(u.unidad_id);
      return like(u.nombre_completo + ' ' + u.correo, q.q) && (!q.estado || u.estado === q.estado) && (!q.alcaldia || ut.alcaldia_id === Number(q.alcaldia));
    }).sort(function (a, b) { return a.creado_en < b.creado_en ? 1 : (a.creado_en > b.creado_en ? -1 : b.id - a.id); });
    var pg = pagina(q, 50);
    return { ciudadanos: l.slice(pg.desde, pg.desde + pg.limite).map(function (u) {
      var ut = UT(u.unidad_id);
      return { id: u.id, nombre_completo: u.nombre_completo, correo: u.correo, estado: u.estado, creado_en: u.creado_en, unidad_territorial: ut.nombre, alcaldia: ALC(ut.alcaldia_id).nombre,
        rango_edad: rangoEdad(u.fecha_nacimiento), ultimo_motivo: u.motivo || (u.estado === 'suspendida' ? 'Publicó contenido ofensivo de forma reiterada en el foro' : null) };
    }), total: l.length };
  });
  ruta('POST', 'admin/ciudadanos/:id/suspension', function (c) {
    adm(c);
    var u = U(c.p.id);
    if (!u) throw no('El ciudadano no existe');
    var susp = c.b.accion === 'suspender';
    if (susp && u.estado === 'suspendida') throw choque('La cuenta ya está suspendida');
    if (!susp && u.estado === 'activa') throw choque('La cuenta ya está activa');
    if (susp) u.motivo = texto(c.b.motivo, 'el motivo', 5, 250);
    u.estado = susp ? 'suspendida' : 'activa';
    return { ok: true, mensaje: susp ? 'La cuenta se suspendió y se cerraron sus sesiones' : 'La cuenta se reactivó' };
  });
  ruta('GET', 'admin/estadisticas', function (c) {
    adm(c);
    var q = c.q;
    var tipo = q.tipo || 'participacion';
    if (q.ciclo && Number(q.ciclo) !== 1) return { tipo: tipo, ciclo: Number(q.ciclo), total: { registrados: 0, votantes: 0, porcentaje: null }, porAlcaldia: [], porDia: [], porGenero: [], porEdad: [], porRubro: [], porEstatus: [], proyectos: [] };
    if (tipo === 'participacion' || tipo === 'demograficas') {
      var filas = participacionFilas(q);
      var v = filas.filter(function (x) { return x.voto; }).length;
      var total = { registrados: filas.length, votantes: v, porcentaje: filas.length ? redondea2(100 * v / filas.length) : null };
      var porAlc = agrupar(filas, function (x) { return x.alc.nombre; });
      if (tipo === 'participacion') {
        var dias = {};
        filas.forEach(function (x) { if (x.voto && (!q.desde || x.voto.participo_en >= q.desde) && (!q.hasta || x.voto.participo_en.slice(0, 10) <= q.hasta)) { var d = x.voto.participo_en.slice(0, 10); dias[d] = (dias[d] || 0) + 1; } });
        return { tipo: tipo, ciclo: 1, total: total, porAlcaldia: porAlc, porDia: Object.keys(dias).sort().map(function (d) { return { dia: d, votantes: dias[d] }; }) };
      }
      var og = ['mujer', 'hombre', 'no_binario', 'prefiero_no_decir'];
      var eg = {};
      filas.forEach(function (x) {
        var k = rangoEdad(x.u.fecha_nacimiento) + '|' + x.u.genero;
        if (!eg[k]) eg[k] = { etiqueta: rangoEdad(x.u.fecha_nacimiento), genero: x.u.genero, registrados: 0, votantes: 0 };
        eg[k].registrados += 1; if (x.voto) eg[k].votantes += 1;
      });
      return { tipo: tipo, ciclo: 1, total: total, porGenero: agrupar(filas, function (x) { return x.u.genero; }, function (a, b) { return og.indexOf(a.etiqueta) - og.indexOf(b.etiqueta); }),
        porEdadGenero: Object.keys(eg).map(function (k) { return eg[k]; }).sort(function (a, b) { return a.etiqueta < b.etiqueta ? -1 : (a.etiqueta > b.etiqueta ? 1 : og.indexOf(a.genero) - og.indexOf(b.genero)); }) };
    }
    var ps = DB.proyectos.filter(function (p) {
      return (!q.alcaldia || p.alcaldia_id === Number(q.alcaldia)) && (!q.unidad || p.unidad_id === Number(q.unidad)) && (!q.rubro || p.rubro_id === Number(q.rubro))
        && (!q.desde || p.creado_en >= q.desde) && (!q.hasta || p.creado_en.slice(0, 10) <= q.hasta);
    });
    if (tipo === 'proyectos') {
      var ganadoresIds = DB.resultados_unidad.map(function (r) { return r.proyecto_ganador_id; });
      var resume = function (l, etiqueta) {
        var o = { registrados: 0, viables: 0, no_viables: 0, ganadores: 0 };
        if (etiqueta !== undefined) o.etiqueta = etiqueta;
        l.forEach(function (p) { var d = dictamenDe(p.id); if (p.estatus !== 'retirado') o.registrados += 1; if (d && d.emitido_en && d.resultado === 'viable') o.viables += 1; if (d && d.emitido_en && d.resultado === 'no_viable') o.no_viables += 1; if (ganadoresIds.indexOf(p.id) >= 0) o.ganadores += 1; });
        return o;
      };
      var est2 = {};
      ps.forEach(function (p) { est2[p.estatus] = (est2[p.estatus] || 0) + 1; });
      var ideasN = DB.ideas.filter(function (i) {
        return i.estado === 'visible' && (!q.alcaldia || UT(i.unidad_id).alcaldia_id === Number(q.alcaldia)) && (!q.unidad || i.unidad_id === Number(q.unidad))
          && (!q.rubro || i.rubro_id === Number(q.rubro)) && (!q.desde || i.creada_en >= q.desde) && (!q.hasta || i.creada_en.slice(0, 10) <= q.hasta);
      }).length;
      var votacion = null;
      if (q.unidad) {
        var ru = DB.resultados_unidad.find(function (r) { return r.unidad_id === Number(q.unidad); });
        votacion = { colonia: UT(q.unidad) ? UT(q.unidad).nombre : '', proyectos: resultadosPublicados() ? DB.proyectos.filter(function (p) { return p.unidad_id === Number(q.unidad) && p.total_votos !== null && p.numero_sorteo; })
          .sort(function (a, b) { return a.numero_sorteo - b.numero_sorteo; }).map(function (p) { return { numero_sorteo: p.numero_sorteo, titulo: p.titulo, total_votos: p.total_votos, ganador: b2(ru && ru.proyecto_ganador_id === p.id) }; }) : [] };
      }
      return { tipo: tipo, ciclo: 1, total: resume(ps), ideas: ideasN,
        porRubro: DB.rubros.map(function (r) { return resume(ps.filter(function (p) { return p.rubro_id === r.id; }), r.nombre_es); }), votacion: votacion };
    }
    var seg = ps.filter(function (p) { return DB.resultados_unidad.some(function (r) { return r.proyecto_ganador_id === p.id; }); }).map(function (p) {
      var reps = DB.reportes.filter(function (r) { return r.proyecto_id === p.id && r.estatus !== 'eliminado'; });
      var cal = DB.calificaciones.filter(function (k) { return k.proyecto_id === p.id; });
      return { folio: p.folio, alcaldia: ALC(p.alcaldia_id).nombre, rubro: RUB(p.rubro_id).nombre_es, estatus: p.estatus, avance_porcentaje: p.avance_porcentaje, monto_ejercido: p.monto_ejercido,
        presupuesto_asignado: UT(p.unidad_id).presupuesto_asignado, reportes: reps.length, irregularidades: reps.filter(function (r) { return r.tipo === 'irregularidad'; }).length,
        reportes_atendidos: reps.filter(function (r) { return r.estatus === 'atendido'; }).length, calificacion_promedio: califProm(p.id), total_calificaciones: cal.length };
    });
    var suma = function (l, k) { return l.reduce(function (s, x) { return s + (Number(x[k]) || 0); }, 0); };
    var prom = function (l, k) { var v = l.filter(function (x) { return x[k] !== null; }); return v.length ? redondea2(suma(v, k) / v.length) : null; };
    var tc = suma(seg, 'total_calificaciones');
    var alcs = {};
    seg.forEach(function (x) { (alcs[x.alcaldia] = alcs[x.alcaldia] || []).push(x); });
    return { tipo: tipo, ciclo: 1,
      total: { proyectos: seg.length, avance_promedio: prom(seg, 'avance_porcentaje'), monto_ejercido: suma(seg, 'monto_ejercido'), presupuesto_asignado: suma(seg, 'presupuesto_asignado'), reportes: suma(seg, 'reportes'),
        irregularidades: suma(seg, 'irregularidades'), reportes_atendidos: suma(seg, 'reportes_atendidos'), calificacion_promedio: tc ? redondea2(seg.reduce(function (s, x) { return s + (x.calificacion_promedio || 0) * x.total_calificaciones; }, 0) / tc) : null },
      porAlcaldia: Object.keys(alcs).sort().map(function (k) { var l = alcs[k]; return { etiqueta: k, avance_promedio: prom(l, 'avance_porcentaje'), monto_ejercido: suma(l, 'monto_ejercido'), presupuesto_asignado: suma(l, 'presupuesto_asignado'), reportes: suma(l, 'reportes'), calificacion_promedio: prom(l, 'calificacion_promedio') }; }),
      proyectos: seg.sort(function (a, b) { return a.alcaldia.localeCompare(b.alcaldia) || (a.folio < b.folio ? -1 : 1); }) };
  });
  function bitacoraFiltrada(q) {
    return DB.bitacora.filter(function (b) {
      return (!q.funcionario || b.usuario_id === Number(q.funcionario)) && (!q.accion || b.accion === q.accion) && (!q.alcaldia || b.alcaldia_id === Number(q.alcaldia))
        && (!q.ciclo || b.ciclo_id === Number(q.ciclo)) && (!q.desde || b.realizada_en >= q.desde) && (!q.hasta || b.realizada_en.slice(0, 10) <= q.hasta);
    }).map(function (b) { var u = U(b.usuario_id); return Object.assign({}, b, { responsable: u ? u.nombre_completo : null, alcaldia: b.alcaldia_id ? ALC(b.alcaldia_id).nombre : null }); });
  }
  ruta('GET', 'admin/bitacora', function (c) {
    adm(c);
    var l = bitacoraFiltrada(c.q);
    var pg = pagina(c.q, 50);
    return { registros: l.slice(pg.desde, pg.desde + pg.limite), total: l.length,
      acciones: DB.bitacora.map(function (b) { return b.accion; }).filter(function (x, i, a) { return a.indexOf(x) === i; }).sort(),
      responsables: DB.usuarios.filter(function (u) { return u.rol !== 'ciudadano'; }).sort(function (a, b) { return a.nombre_completo.localeCompare(b.nombre_completo); }).map(function (u) { return { id: u.id, nombre_completo: u.nombre_completo, rol: u.rol }; }) };
  });
  ruta('GET', 'admin/bitacora.csv', function (c) {
    adm(c);
    var t = csv([['Fecha', 'realizada_en'], ['Responsable', 'responsable'], ['Rol', 'rol'], ['Alcaldía', 'alcaldia'], ['Ciclo', 'ciclo_id'], ['Acción', 'accion'], ['Entidad', 'entidad'], ['Id', 'entidad_id'], ['Detalle', 'detalle']], bitacoraFiltrada(c.q));
    return new Archivo(t, 'text/csv; charset=utf-8', 'bitacora.csv');
  });
  ruta('GET', 'admin/categorias', function (c) {
    adm(c);
    return { tipos: DB.categorias.slice().sort(function (a, b) { return a.orden - b.orden; }).map(function (k) { return Object.assign({}, k, { activa: k.activa ? 1 : 0, proyectos: DB.proyectos.filter(function (p) { return p.categoria === k.clave; }).length }); }),
      iconos: ['arbol', 'cono', 'foco', 'estrella', 'escudo', 'gota', 'banca', 'proyecto', 'obra', 'colonia', 'balon', 'basura', 'bici', 'libro', 'casa', 'corazon', 'persona', 'punto'], respaldo: 'otro' };
  });
  ruta('POST', 'admin/categorias', function (c) {
    adm(c);
    var nom = texto(c.b.nombre_es, 'el nombre del tipo', 3, 60);
    if (DB.categorias.some(function (k) { return k.nombre_es.toLowerCase() === nom.toLowerCase(); })) throw choque('Ya existe un tipo con ese nombre');
    var clave = D.sinAcentos(nom).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 17) || 'tipo';
    DB.categorias.push({ clave: clave, nombre_es: nom, nombre_en: c.b.nombre_en || nom, color: String(c.b.color || '#5F7387').toUpperCase(), icono: c.b.icono || 'punto', palabras: c.b.palabras || '', orden: Number(c.b.orden) || 900, activa: 1 });
    return { ok: true, clave: clave, mensaje: 'Se agregó «' + nom + '». Ya aparece en los formularios, los mapas y la simbología.' };
  }, { estado: 201 });
  ruta('PUT', 'admin/categorias/:clave', function (c) {
    adm(c);
    var k = DB.categorias.find(function (x) { return x.clave === c.p.clave; });
    if (!k) throw no('El tipo de proyecto no existe');
    Object.assign(k, { nombre_es: c.b.nombre_es || k.nombre_es, nombre_en: c.b.nombre_en || k.nombre_en, color: String(c.b.color || k.color).toUpperCase(), icono: c.b.icono || k.icono, palabras: c.b.palabras !== undefined ? c.b.palabras : k.palabras,
      orden: c.b.orden ? Number(c.b.orden) : k.orden, activa: c.b.activa === undefined ? k.activa : (c.b.activa ? 1 : 0) });
    return { ok: true, mensaje: 'Se guardaron los cambios. Los mapas ya usan el color y el dibujo nuevos.' };
  });
  ruta('DELETE', 'admin/categorias/:clave', function (c) {
    adm(c);
    if (c.p.clave === 'otro') throw mal('«Otro» no se puede borrar');
    var n = DB.proyectos.filter(function (p) { return p.categoria === c.p.clave; }).length;
    if (n) throw choque('Hay ' + n + ' proyecto(s) con este tipo. Desactívalo en lugar de borrarlo: los proyectos conservan su color.');
    DB.categorias = DB.categorias.filter(function (k) { return k.clave !== c.p.clave; });
    return { ok: true, mensaje: 'Se borró el tipo de proyecto' };
  });
  ruta('POST', 'admin/categorias/reclasificar', function (c) {
    adm(c);
    var l = DB.proyectos.filter(function (p) { return !p.categoria || p.categoria === 'otro'; });
    var n = 0;
    l.forEach(function (p) { var k = adivinarCategoria(p.titulo, p.descripcion); if (k !== 'otro') { p.categoria = k; n += 1; } });
    return { ok: true, revisados: l.length, n: n, mensaje: n ? 'Se asignó un tipo a ' + n + ' de ' + l.length + ' proyecto(s) que estaban como «Otro».' : 'Ningún proyecto marcado como «Otro» coincide con las palabras clave.' };
  });
  ruta('GET', 'admin/correo', function (c) {
    adm(c);
    return { configurado: true, faltante: [], proveedor: 'smtp', remitente: 'equipoprepar@gmail.com', servidor: 'smtp.gmail.com:465', pendientes: 0, enviados: 148, fallidos: 2, ultimoError: null,
      recientes: DB.correos.map(function (x) { return Object.assign({}, x, { destinatario: String(x.destinatario).replace(/^(.{2}).*(@.*)$/, '$1•••$2') }); }) };
  });
  ruta('POST', 'admin/correo/prueba', function (c) { adm(c); return { ok: true, mensaje: 'Se envió un correo de prueba a ' + (c.b.destinatario || '') + '. Revisa la bandeja de entrada (y la de spam).' }; }, { sinRegistro: true });
  ruta('GET', 'admin/integraciones', function (c) {
    adm(c);
    return { fuentes: DB.fuentes.slice().sort(function (a, b) { return a.tipo.localeCompare(b.tipo) || a.nombre.localeCompare(b.nombre); }),
      errores: [{ mensaje: 'Fila sin clave de colonia: se omitió', id_externo: 'FGJ-2026-118204', creado_en: fmt(new Date(DB.hoy.getTime() - 13 * 3600000)), fuente: 'Incidencia delictiva por colonia' },
        { mensaje: 'Fila sin clave de colonia: se omitió', id_externo: 'FGJ-2026-118377', creado_en: fmt(new Date(DB.hoy.getTime() - 13 * 3600000)), fuente: 'Incidencia delictiva por colonia' }] };
  });
  ruta('PUT', 'admin/integraciones/:clave', function (c) {
    adm(c);
    var f = DB.fuentes.find(function (x) { return x.clave === c.p.clave; });
    if (!f) throw no('La fuente no existe');
    f.activa = c.b.activa ? 1 : 0; if (c.b.recurso !== undefined) f.recurso = c.b.recurso || null; if (c.b.frecuencia_minutos) f.frecuencia_minutos = Number(c.b.frecuencia_minutos);
    return { ok: true, cambios: 1, mensaje: 'La fuente se actualizó' };
  });
  ruta('POST', 'admin/integraciones/:clave/sincronizar', function (c) {
    adm(c);
    var f = DB.fuentes.find(function (x) { return x.clave === c.p.clave; });
    if (!f) throw no('La fuente de datos no existe');
    if (!f.activa) throw choque('Activa la fuente antes de sincronizarla');
    f.ultimo_intento = fmt(c.ahora); f.ultima_sincronizacion_exitosa = fmt(c.ahora); f.ultimo_estado = 'exitosa'; f.ultimo_mensaje = 'Sincronización completa (demostración)';
    return { ok: true, mensaje: 'La sincronización comenzó. Actualiza en unos minutos para ver el resultado' };
  });

  /* ---------- despacho ---------- */
  function partirUrl(url) {
    var s = String(url);
    var i = s.indexOf('/api/');
    var resto = i >= 0 ? s.slice(i + 5) : s.replace(/^api\//, '');
    var j = resto.indexOf('?');
    var camino = j >= 0 ? resto.slice(0, j) : resto;
    var q = {};
    if (j >= 0) new URLSearchParams(resto.slice(j + 1)).forEach(function (v, k) { q[k] = v; });
    return { camino: camino.replace(/\/+$/, ''), q: q };
  }
  function despachar(metodo, url, cuerpo, uid, ahora) {
    var pu = partirUrl(url);
    for (var i = 0; i < RUTAS.length; i += 1) {
      var r = RUTAS[i];
      if (r.m !== metodo) continue;
      var m = r.re.exec(pu.camino);
      if (!m) continue;
      var p = {};
      r.nombres.forEach(function (n, k) { p[n] = decodeURIComponent(m[k + 1]); });
      var ctx = { q: pu.q, b: cuerpo || {}, p: p, u: uid ? U(uid) : null, ahora: ahora || new Date() };
      if (ctx.u && (ctx.u.eliminado || ctx.u.estado !== 'activa')) ctx.u = null;
      return { datos: r.fn(ctx), ruta: r };
    }
    throw new Err(404, 'Ruta no encontrada');
  }
  function olvidarMarco() { try { sessionStorage.removeItem('prepar_marco'); } catch (e) { } }

  function aDataUrl(blob) {
    return new Promise(function (ok) {
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () {
        var max = 1000;
        var k = Math.min(1, max / Math.max(img.width, img.height));
        var cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        try { ok(cv.toDataURL('image/jpeg', 0.78)); } catch (e) { ok(null); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); ok(null); };
      img.src = url;
    });
  }

  var fetchOriginal = window.fetch ? window.fetch.bind(window) : null;
  function esApi(url) { var s = String(url); if (/^https?:/i.test(s) && s.indexOf(location.origin) !== 0) return false; return /(^|\/)api\//.test(s); }
  window.fetch = function (entrada, init) {
    var url = typeof entrada === 'string' ? entrada : (entrada && entrada.url) || '';
    if (!esApi(url)) return fetchOriginal(entrada, init);
    init = init || {};
    var metodo = String(init.method || 'GET').toUpperCase();
    var preparar = Promise.resolve(undefined);
    if (init.body && typeof Blob !== 'undefined' && init.body instanceof Blob) {
      preparar = aDataUrl(init.body).then(function (d) { return { __archivo: d }; });
    } else if (typeof init.body === 'string') {
      try { preparar = Promise.resolve(JSON.parse(init.body)); } catch (e) { preparar = Promise.resolve({}); }
    }
    return preparar.then(function (cuerpo) {
      return new Promise(function (ok) { setTimeout(ok, metodo === 'GET' ? 40 + Math.random() * 90 : 160 + Math.random() * 220); }).then(function () {
        var ahora = new Date();
        var res;
        try {
          res = despachar(metodo, url, cuerpo, est.sesion, ahora);
        } catch (e) {
          if (!(e instanceof Err)) { console.error('[Prepar demo]', e); e = new Err(500, 'Ocurrió un error inesperado en la demostración'); }
          return new Response(JSON.stringify(Object.assign({ error: e.error }, e.extra || {})), { status: e.estado, headers: { 'content-type': 'application/json' } });
        }
        if (metodo !== 'GET' && !(res.ruta.o.sinRegistro)) {
          est.ops.push({ m: metodo, url: partirUrl(url).camino + (url.indexOf('?') >= 0 ? url.slice(url.indexOf('?')) : ''), b: cuerpo, uid: est.sesion, t: ahora.getTime() });
          if (res.ruta.re.source.indexOf('auth\\/registro') >= 0) est.sesion = DB.usuarios[DB.usuarios.length - 1].id;
          guardar();
          olvidarMarcoSiPerfil(url);
        }
        if (res.datos instanceof Archivo) {
          return new Response(new Blob([res.datos.contenido], { type: res.datos.tipo }), { status: 200, headers: { 'content-type': res.datos.tipo, 'content-disposition': 'attachment; filename="' + res.datos.nombre + '"' } });
        }
        return new Response(JSON.stringify(res.datos === undefined ? {} : res.datos), { status: res.ruta.o.estado || 200, headers: { 'content-type': 'application/json' } });
      });
    });
  };
  function olvidarMarcoSiPerfil(url) { if (/perfil|registro/.test(url)) olvidarMarco(); }

  /* imágenes de ejemplo */
  var BASE_IMG = 'img/demo/';
  window.PREPAR_DEMO = {
    img: function (uuid) {
      if (!uuid) return '';
      if (uuid.indexOf('demo:') === 0) {
        var n = uuid.slice(5);
        return n === 'convocatoria' ? BASE_IMG + 'convocatoria.pdf' : BASE_IMG + n + '.svg';
      }
      return (DB && DB.archivos[uuid]) || BASE_IMG + 'subida.svg';
    },
    estado: function () { return est; },
    db: function () { return DB; },
    cambiar: function (cambios) {
      Object.assign(est, cambios);
      guardar(); olvidarMarco();
    },
    reiniciar: function () {
      var sesion = est.sesion;
      est = { fase: est.fase, sesion: sesion, ops: [], banderas: {} };
      guardar(); olvidarMarco();
    },
    usuarioActual: function () { return est.sesion && DB ? U(est.sesion) : null; },
  };

  construir();
}());
