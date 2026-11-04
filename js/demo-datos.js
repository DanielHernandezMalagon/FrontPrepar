/* Prepar · versión de demostración (solo front).
   Genera datos de ejemplo coherentes con la fase elegida del ciclo.
   No hay servidor: todo se arma en el navegador. */
(function () {
  'use strict';
  var S = window.PREPAR_SEMILLA;

  /* ---------- utilidades ---------- */
  function rngDe(semilla) {
    var a = semilla >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var dos = function (n) { return String(n).padStart(2, '0'); };
  function fmt(d) {
    return d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate()) + ' ' + dos(d.getHours()) + ':' + dos(d.getMinutes()) + ':' + dos(d.getSeconds());
  }
  function fmtDia(d) { return fmt(d).slice(0, 10); }
  function diaA(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); }
  function sumarDias(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
  function sinAcentos(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

  var FASES_CLAVE = ['convocatoria', 'diagnostico_registro', 'dictaminacion', 'sorteo_difusion', 'consulta', 'resultados', 'ejecucion_seguimiento', 'evaluacion'];
  var DURACION = { 1: 14, 2: 28, 3: 21, 4: 10, 5: 7, 6: 14, 7: 120, 8: 30 };

  function calendario(activa, hoy) {
    var ini = {};
    var base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    ini[activa] = sumarDias(base, -Math.round(DURACION[activa] * 0.4));
    for (var i = activa - 1; i >= 1; i -= 1) ini[i] = sumarDias(ini[i + 1], -DURACION[i]);
    for (var j = activa + 1; j <= 8; j += 1) ini[j] = sumarDias(ini[j - 1], DURACION[j - 1]);
    var cal = {};
    for (var k = 1; k <= 8; k += 1) cal[k] = { inicio: ini[k], fin: sumarDias(ini[k], DURACION[k] - 1) };
    return cal;
  }

  /* ---------- catálogos ---------- */
  function construirCatalogos() {
    var alcaldias = S.alcaldias.map(function (a) { return { id: a.id, clave: a.clave, nombre: a.nombre, latitud: null, longitud: null }; });
    var porClave = {};
    alcaldias.forEach(function (a) { porClave[a.clave] = a; });
    var raw = S.unidades_raw.slice().sort(function (x, y) { return x[1] < y[1] ? -1 : 1; });
    var unidades = raw.map(function (r, i) {
      return { id: i + 1, clave: r[1], nombre: r[2], tipo: r[3], alcaldia_id: porClave[r[0]].id, latitud: r[4], longitud: r[5] };
    });
    alcaldias.forEach(function (a) {
      var us = unidades.filter(function (u) { return u.alcaldia_id === a.id; });
      a.latitud = Math.round(us.reduce(function (s, u) { return s + u.latitud; }, 0) / us.length * 10000) / 10000;
      a.longitud = Math.round(us.reduce(function (s, u) { return s + u.longitud; }, 0) / us.length * 10000) / 10000;
    });
    return { alcaldias: alcaldias, unidades: unidades, porClave: porClave };
  }

  /* ---------- contenido ---------- */
  var NOM_M = ['Juan', 'José Luis', 'Carlos', 'Miguel', 'Jorge', 'Luis', 'Alejandro', 'Ricardo', 'Fernando', 'Roberto', 'Eduardo', 'Sergio', 'Arturo', 'Raúl', 'Héctor', 'Óscar', 'Javier', 'Francisco', 'Manuel', 'Pedro', 'Diego', 'Andrés', 'Emiliano', 'Santiago', 'Mateo', 'Iván', 'Gerardo', 'Alberto', 'Rodrigo', 'Hugo'];
  var NOM_F = ['María José', 'Guadalupe', 'Verónica', 'Adriana', 'Leticia', 'Gabriela', 'Alejandra', 'Claudia', 'Silvia', 'Laura', 'Mónica', 'Diana', 'Daniela', 'Valeria', 'Ximena', 'Regina', 'Sofía', 'Camila', 'Paola', 'Karla', 'Lorena', 'Elena', 'Beatriz', 'Norma', 'Rocío', 'Teresa', 'Yolanda', 'Itzel', 'Fernanda', 'Andrea'];
  var NOM_N = ['Alex', 'Sam', 'Ari', 'Dani', 'Cris'];
  var APE = ['García', 'Hernández', 'Martínez', 'López', 'González', 'Pérez', 'Rodríguez', 'Sánchez', 'Ramírez', 'Cruz', 'Flores', 'Gómez', 'Morales', 'Vázquez', 'Jiménez', 'Reyes', 'Díaz', 'Torres', 'Gutiérrez', 'Ruiz', 'Mendoza', 'Aguilar', 'Ortiz', 'Moreno', 'Castillo', 'Romero', 'Álvarez', 'Méndez', 'Chávez', 'Rivera', 'Juárez', 'Ramos', 'Domínguez', 'Herrera', 'Medina', 'Castro', 'Vargas', 'Guzmán', 'Velázquez', 'Salazar'];

  var CALLES = ['Calle Hidalgo', 'Av. Juárez', 'Calle Morelos', 'Calle Allende', 'Calle Zaragoza', 'Calle 5 de Mayo', 'Calle Independencia', 'Calle Aldama', 'Calle Guerrero', 'Calle Matamoros', 'Calle Victoria', 'Calle Abasolo', 'Calle Corregidora', 'Calle Galeana', 'Calle Iturbide', 'Calle Mina'];

  // [título, descripción, categoría, rubro, costo mínimo, costo máximo (miles)]
  var PLANTILLAS = [
    ['Rehabilitación del parque {L}', 'Cambio de juegos infantiles, poda, pasto nuevo y bancas en el parque de {L}. Incluye un bebedero y rampas de acceso para personas con discapacidad.', 'areas_verdes', 1, 600, 1200],
    ['Huerto comunitario {L}', 'Huerto urbano con camas de cultivo, riego por goteo y talleres de composta para vecinas y vecinos de todas las edades.', 'areas_verdes', 1, 250, 500],
    ['Reforestación del camellón de {S}', 'Plantación de 120 árboles nativos y jardineras en el camellón de {S}, con riego durante el primer año.', 'areas_verdes', 1, 300, 700],
    ['Luminarias LED en {S}', 'Sustitución de lámparas fundidas por luminarias LED de bajo consumo en {S} y calles aledañas para caminar con más seguridad por las noches.', 'alumbrado', 2, 450, 950],
    ['Senderos iluminados rumbo a la escuela', 'Iluminación peatonal en el trayecto que usan niñas y niños para llegar a la primaria de {L}.', 'alumbrado', 2, 400, 800],
    ['Banquetas accesibles en {S}', 'Reconstrucción de banquetas dañadas y rampas para sillas de ruedas y carriolas en {S}.', 'vialidad', 2, 700, 1400],
    ['Cruces seguros frente al mercado', 'Pasos peatonales a nivel de banqueta, señalización y reductores de velocidad en las calles que rodean el mercado de {L}.', 'vialidad', 2, 500, 900],
    ['Cámaras de videovigilancia en {S}', 'Instalación de cámaras y alarmas vecinales en los puntos de {L} con más reportes de robo.', 'seguridad', 2, 600, 1100],
    ['Alarmas vecinales en {L}', 'Sistema de alarmas sonoras con botón de pánico para cada cuadra de la colonia, coordinado con el comité vecinal.', 'seguridad', 2, 300, 600],
    ['Captación de agua de lluvia en {L}', 'Sistemas de captación pluvial en la escuela y el centro comunitario para reducir la falta de agua en temporada de estiaje.', 'agua', 2, 500, 1000],
    ['Desazolve y coladeras nuevas en {S}', 'Limpieza del drenaje y cambio de rejillas para evitar las inundaciones que se forman en {S} cada temporada de lluvias.', 'agua', 2, 400, 900],
    ['Bebederos en la plaza principal', 'Instalación de bebederos con filtro de agua potable en la plaza y el deportivo de {L}.', 'agua', 1, 200, 450],
    ['Plaza {L} con mobiliario urbano', 'Bancas, botes de basura para separar residuos, jardineras y una techumbre ligera en la plaza principal.', 'mobiliario', 1, 400, 800],
    ['Techumbre para la cancha de {L}', 'Estructura de techumbre para usar la cancha con lluvia o sol intenso, con gradas y luminarias.', 'recreacion', 3, 900, 1600],
    ['Talleres culturales para jóvenes', 'Equipamiento y talleres gratuitos de música, pintura y teatro los fines de semana en el centro comunitario de {L}.', 'recreacion', 3, 250, 500],
    ['Gimnasio al aire libre en {L}', 'Aparatos de ejercicio para todas las edades, con piso de hule y señalética de uso.', 'recreacion', 3, 300, 650],
    ['Ludoteca y biblioteca vecinal', 'Adecuación de un salón como ludoteca y biblioteca con mobiliario, libros y juegos de mesa para niñas y niños de {L}.', 'recreacion', 3, 300, 600],
    ['Ciclovía recreativa {L}', 'Carril confinado para bicicletas y biciestacionamientos en los puntos más concurridos de la colonia.', 'vialidad', 2, 500, 1000],
  ];

  var COMENTARIOS = [
    'De acuerdo, por las noches está muy oscuro.',
    'Yo apoyo, mis hijos juegan ahí todos los días.',
    'Habría que ver cuánto cuesta, pero es muy necesario.',
    'Propongo que se haga junto con la mejora del alumbrado.',
    'En la junta vecinal del sábado lo platicamos y casi todos estuvieron de acuerdo.',
    '¡Excelente idea! Cuenten conmigo para organizar.',
    'Ojo con el mantenimiento: luego nadie lo cuida.',
    'Ya lo reportamos a la alcaldía y no hicieron caso, ojalá con el presupuesto sí.',
    'Podríamos sumar esta idea a la del parque, así alcanza el presupuesto.',
    'También podrían poner un bebedero.',
    'Me parece bien, pero que se consulte a las personas que viven sobre esa calle.',
    'Las personas mayores lo agradeceríamos mucho.',
    'Sería bueno que incluyera rampas para sillas de ruedas.',
    'Totalmente de acuerdo, hace años que se necesita.',
  ];

  var COMENTARIOS_REPORTE = [
    'Confirmo, ya se ve mucho mejor.',
    'Pasé hoy y siguen trabajando, van bien.',
    'Gracias por subir las fotos, así sabemos cómo va.',
    'Yo también vi el material en la banqueta, ojalá lo retiren pronto.',
    'La alcaldía ya respondió, esperemos que lo arreglen esta semana.',
  ];

  /* ---------- generador principal ---------- */
  function generar(faseOrden, hoyReal) {
    var hoy = hoyReal || new Date();
    var o = faseOrden;
    var rng = rngDe(20260404);
    var rngT = rngDe(777);
    var rt = function (a, b) { return a + Math.floor(rngT() * (b - a + 1)); };
    var r = function (a, b) { return a + Math.floor(rng() * (b - a + 1)); };
    var elige = function (lista) { return lista[Math.floor(rng() * lista.length)]; };
    var cat = construirCatalogos();
    var cal = calendario(o, hoy);
    var ahora = new Date(hoy.getTime());

    function enFase(n, frac, hora) {
      var f = cal[n];
      var ini = f.inicio.getTime();
      var fin = Math.min(f.fin.getTime() + 86399000, n === o ? ahora.getTime() - 3600000 : f.fin.getTime() + 86399000);
      if (fin < ini) fin = ini + 3600000;
      var t = new Date(ini + (fin - ini) * Math.max(0, Math.min(1, frac)));
      if (hora !== undefined) t.setHours(hora, rt(0, 59), rt(0, 59));
      if (t.getTime() > ahora.getTime()) t = new Date(ahora.getTime() - rt(10, 300) * 60000);
      return t;
    }

    var DB = {
      fase: o, cal: cal, hoy: ahora,
      alcaldias: cat.alcaldias, unidades: cat.unidades,
      usuarios: [], proyectos: [], dictamenes: [], revisiones: [], ideas: [], comentarios_idea: [],
      participaciones: [], resultados_unidad: [], sorteos: [], avances: [], reportes: [], comentarios_reporte: [],
      calificaciones: [], notificaciones: [], avisos: [], bitacora: [], archivos: {}, moderaciones: [],
      categorias: S.categorias.map(function (c) { return Object.assign({}, c); }),
      rubros: S.rubros, criterios: S.criterios, fasesCat: S.fases,
      directorio: [], directorio_ciudad: S.directorio_ciudad.map(function (d) { return Object.assign({}, d); }),
      fuentes: [], correos: [], seq: {},
    };
    DB.siguiente = function (tabla) { DB.seq[tabla] = (DB.seq[tabla] || 1000) + 1; return DB.seq[tabla]; };
    var utPorClave = {};
    DB.unidades.forEach(function (u) { utPorClave[u.clave] = u; });
    var alcPorClave = cat.porClave;

    /* ciclos */
    var anio = 2026;
    var inicioCiclo = cal[1].inicio;
    DB.ciclos = [{
      id: 1, nombre: 'Ciclo de práctica 2026 · Simulación Equipo 04', anio_simulado: anio, estado: 'activo', tipo: 'practica',
      presupuesto_total: 120000000, porcentaje_partes_iguales: 50, origen_indices: 'aleatorio',
      votacion_abierta: o === 5 ? 1 : 0,
      votacion_abierta_en: o >= 5 ? fmt(enFase(5, 0, 8)) : null,
      votacion_cerrada_en: o >= 6 ? fmt(enFase(6, 0, 9)) : null,
      computo_realizado_en: o >= 6 ? fmt(enFase(6, 0.02, 10)) : null,
      resultados_publicados_en: o >= 6 ? fmt(enFase(6, 0.1, 12)) : null,
      creado_en: fmt(sumarDias(inicioCiclo, -5)), cerrado_en: null, pausado_en: null,
      convocatoria_uuid: 'demo:convocatoria', fase_orden: o,
    }, {
      id: 2, nombre: 'Presupuesto Participativo 2026-2027 (IECM)', anio_simulado: 2026, estado: 'borrador', tipo: 'oficial',
      presupuesto_total: 2304009505, porcentaje_partes_iguales: 50, origen_indices: 'api', votacion_abierta: 0,
      votacion_abierta_en: null, votacion_cerrada_en: null, computo_realizado_en: null, resultados_publicados_en: null,
      creado_en: fmt(sumarDias(inicioCiclo, -20)), cerrado_en: null, pausado_en: null, convocatoria_uuid: null, fase_orden: 1,
    }];

    /* presupuesto por unidad */
    var total = 120000000;
    var igual = Math.round(total * 0.5 / DB.unidades.length * 100) / 100;
    var pesos = DB.unidades.map(function (u) {
      u.poblacion = r(9000, 42000);
      u.poblacion_flotante = r(1500, 18000);
      u.indice_pobreza = Math.round(rng() * 8000 + 1000) / 10000;
      u.indice_delictivo = Math.round(rng() * 8000 + 1000) / 10000;
      u.es_pueblo_originario = u.tipo === 'pueblo_originario' ? 1 : 0;
      return u.indice_pobreza + u.indice_delictivo + u.poblacion / 42000 + u.poblacion_flotante / 18000 + u.es_pueblo_originario;
    });
    var sumaPesos = pesos.reduce(function (s, x) { return s + x; }, 0);
    DB.unidades.forEach(function (u, i) {
      u.presupuesto_asignado = Math.round((igual + total * 0.5 * pesos[i] / sumaPesos) * 100) / 100;
      u.participa = 1;
    });

    /* usuarios */
    var nid = 1;
    function usuario(o2) { o2.id = nid; nid += 1; DB.usuarios.push(o2); return o2; }
    var creado = function (dias) { return fmt(sumarDias(inicioCiclo, dias)); };
    var admin = usuario({ rol: 'administrador', nombre_completo: 'Administración Prepar', correo: 'admin@prepar.mx', estado: 'activa', idioma: 'es', creado_en: creado(-40) });
    var carlos = usuario({ rol: 'funcionario', nombre_completo: 'Carlos Méndez Ruiz', correo: 'carlos.mendez@prepar.mx', estado: 'activa', idioma: 'es', creado_en: creado(-35), alcaldia_id: alcPorClave.AZC.id, funciones: ['consulta', 'dictaminacion', 'directorio', 'moderacion', 'revision_registros', 'seguimiento'], telefono: '5512345678' });
    var lucia = usuario({ rol: 'funcionario', nombre_completo: 'Lucía Torres Vega', correo: 'lucia.torres@prepar.mx', estado: 'activa', idioma: 'es', creado_en: creado(-35), alcaldia_id: alcPorClave.COY.id, funciones: ['consulta', 'dictaminacion', 'directorio', 'moderacion', 'revision_registros', 'seguimiento'] });
    usuario({ rol: 'administrador', nombre_completo: 'Soporte Equipo 04', correo: 'soporte@prepar.mx', estado: 'activa', idioma: 'es', creado_en: creado(-30) });
    usuario({ rol: 'funcionario', nombre_completo: 'Jorge Salinas Medina', correo: 'jorge.salinas@prepar.mx', estado: 'activa', idioma: 'es', creado_en: creado(-28), alcaldia_id: alcPorClave.BJU.id, funciones: ['directorio', 'moderacion'] });
    usuario({ rol: 'funcionario', nombre_completo: 'Andrea Campos Ruiz', correo: 'andrea.campos@prepar.mx', estado: 'activa', idioma: 'es', creado_en: creado(-27), alcaldia_id: alcPorClave.IZP.id, funciones: ['dictaminacion', 'revision_registros', 'seguimiento'] });
    usuario({ rol: 'funcionario', nombre_completo: 'Valeria Ortiz Gómez', correo: 'valeria.ortiz@prepar.mx', estado: 'activa', idioma: 'es', creado_en: creado(-5), alcaldia_id: alcPorClave.TLP.id, funciones: ['consulta', 'seguimiento'], debe_cambiar_password: 1 });
    usuario({ rol: 'funcionario', nombre_completo: 'Ricardo Núñez Soto', correo: 'ricardo.nunez@prepar.mx', estado: 'desactivada', idioma: 'es', creado_en: creado(-33), alcaldia_id: alcPorClave.CUH.id, funciones: ['directorio'] });
    var funcionarios = DB.usuarios.filter(function (u) { return u.rol === 'funcionario'; });
    funcionarios.forEach(function (f) { f.ultimo_acceso = f.estado === 'activa' ? fmt(new Date(ahora.getTime() - rt(1, 70) * 3600000)) : creado(2); });

    var EQUIPO = [
      ['María López Hernández', 'maria.lopez@correo.mx', '1998-04-12', 'mujer', 'AZC-001'],
      ['José Ramírez Cruz', 'jose.ramirez@correo.mx', '1985-09-03', 'hombre', 'AZC-001'],
      ['Ana Sofía Gutiérrez', 'ana.gutierrez@correo.mx', '2001-01-22', 'mujer', 'AZC-001'],
      ['Luis Hernández Soto', 'luis.hernandez@correo.mx', '1972-11-30', 'hombre', 'AZC-001'],
      ['Alex Moreno Díaz', 'alex.moreno@correo.mx', '1995-06-18', 'no_binario', 'AZC-001'],
      ['Patricia Flores Ruiz', 'patricia.flores@correo.mx', '1960-02-14', 'mujer', 'AZC-002'],
      ['Jorge Castillo Peña', 'jorge.castillo@correo.mx', '1990-08-08', 'hombre', 'AZC-002'],
      ['Rosa Martínez León', 'rosa.martinez@correo.mx', '1979-12-01', 'mujer', 'AZC-002'],
      ['Daniel Ortega Lima', 'daniel.ortega@correo.mx', '1988-03-25', 'prefiero_no_decir', 'COY-001'],
      ['Fernanda Reyes Mora', 'fernanda.reyes@correo.mx', '2003-07-07', 'mujer', 'COY-001'],
      ['Miguel Ángel Torres', 'miguel.torres@correo.mx', '1955-05-05', 'hombre', 'COY-002'],
      ['Carmen Aguilar Ríos', 'carmen.aguilar@correo.mx', '1993-10-10', 'mujer', 'COY-002'],
    ];
    var equipo = {};
    EQUIPO.forEach(function (p) {
      var u = usuario({ rol: 'ciudadano', nombre_completo: p[0], correo: p[1], fecha_nacimiento: p[2], genero: p[3], unidad_id: utPorClave[p[4]].id, estado: 'activa', idioma: 'es', creado_en: creado(r(-10, 6)) });
      equipo[p[1].split('@')[0]] = u;
    });
    var maria = equipo['maria.lopez'];
    maria.creado_en = creado(-12);
    var cuantos = { 'AZC-001': 30, 'AZC-002': 22, 'COY-001': 20, 'COY-002': 18 };
    var usados = {};
    DB.unidades.forEach(function (u) {
      var n = cuantos[u.clave] || r(8, 15);
      var ya = DB.usuarios.filter(function (x) { return x.unidad_id === u.id; }).length;
      for (var i = ya; i < n; i += 1) {
        var g = rng();
        var genero = g < 0.5 ? 'mujer' : (g < 0.95 ? 'hombre' : (g < 0.98 ? 'no_binario' : 'prefiero_no_decir'));
        var nom = genero === 'mujer' ? elige(NOM_F) : (genero === 'hombre' ? elige(NOM_M) : elige(NOM_N.concat(NOM_F, NOM_M)));
        var a1 = elige(APE);
        var a2 = elige(APE);
        var base = sinAcentos(nom.split(' ')[0]) + '.' + sinAcentos(a1);
        usados[base] = (usados[base] || 0) + 1;
        var correo = base + (usados[base] > 1 ? usados[base] : '') + '@correo.mx';
        var nac = r(1950, 2006) + '-' + dos(r(1, 12)) + '-' + dos(r(1, 28));
        var est = rng() < 0.012 ? 'suspendida' : 'activa';
        usuario({ rol: 'ciudadano', nombre_completo: nom + ' ' + a1 + ' ' + a2, correo: correo, fecha_nacimiento: nac, genero: genero, unidad_id: u.id, estado: est, idioma: 'es', creado_en: creado(r(-14, 30)) });
      }
    });
    var ciudadanos = DB.usuarios.filter(function (u) { return u.rol === 'ciudadano'; });
    ciudadanos.forEach(function (u) { if (diaA(u.creado_en) > ahora) u.creado_en = fmt(new Date(ahora.getTime() - rt(1, 48) * 3600000)); });
    var vecinosDe = function (utId) { return ciudadanos.filter(function (c) { return c.unidad_id === utId && c.estado === 'activa'; }); };

    /* directorio */
    var did = 1;
    DB.alcaldias.forEach(function (a) {
      DB.directorio.push({ id: did, alcaldia_id: a.id, tipo: 'alcaldia', cargo: 'Alcaldía ' + a.nombre, nombre_titular: null, temas: 'Presupuesto participativo, atención ciudadana', direccion: null, telefono: null, correo: null, sitio_web: null, origen: 'manual', actualizado_en: creado(-40), fuente_nombre: null, fuente_url: null, consultado_en: null });
      did += 1;
    });
    S.directorio.forEach(function (d) {
      DB.directorio.push({ id: did, alcaldia_id: alcPorClave[d.clave].id, tipo: d.tipo, cargo: d.cargo, nombre_titular: d.nombre_titular, temas: d.temas, direccion: d.direccion, telefono: d.telefono, correo: d.correo, sitio_web: null, origen: 'manual', actualizado_en: creado(-40), fuente_nombre: d.fuente_nombre, fuente_url: d.fuente_url, consultado_en: '2026-10-31' });
      did += 1;
    });
    DB.seq.directorio = did + 100;

    if (o < 2) { terminar(); return DB; }

    /* ---------- ideas del foro ---------- */
    var iid = 1;
    function idea(autor, ut, rubro, texto, frac, apoyos) {
      var x = { id: iid, ciclo_id: 1, unidad_id: ut.id, autor_id: autor.id, contenido: texto, rubro_id: rubro, creada_en: fmt(enFase(2, frac, r(7, 22))), estado: 'visible', apoyos: [] };
      iid += 1;
      var vec = vecinosDe(ut.id).filter(function (v) { return v.id !== autor.id; });
      for (var i = 0; i < Math.min(apoyos, vec.length); i += 1) x.apoyos.push(vec[(i * 7 + x.id) % vec.length].id);
      x.apoyos = x.apoyos.filter(function (v, i, a) { return a.indexOf(v) === i; });
      DB.ideas.push(x);
      return x;
    }
    var cid = 1;
    function comentar(id, autor, texto, horas) {
      var i = DB.ideas.find(function (x) { return x.id === id; });
      var t = new Date(diaA(i.creada_en).getTime() + (Number(i.creada_en.slice(11, 13)) + horas) * 3600000);
      if (t > ahora) t = new Date(ahora.getTime() - rt(5, 90) * 60000);
      DB.comentarios_idea.push({ id: cid, idea_id: id, autor_id: autor.id, contenido: texto, creado_en: fmt(t), estado: 'visible' });
      cid += 1;
    }
    var CLA = utPorClave['AZC-001'];
    var SAL = utPorClave['AZC-002'];
    var DCA = utPorClave['COY-001'];
    var SUC = utPorClave['COY-002'];
    var vecCla = vecinosDe(CLA.id);
    var vc = function (k) { return vecCla[k % vecCla.length]; };
    var ideasCla = [
      [maria, 1, 'Rehabilitar el parque de la calle Norte 45: faltan luminarias y los juegos están rotos.', 0.05, 23],
      [equipo['jose.ramirez'], 2, 'Hace falta reparar las banquetas cerca del mercado; hay muchas personas mayores que se tropiezan.', 0.08, 17],
      [equipo['ana.gutierrez'], 3, 'Talleres gratuitos de música y pintura para jóvenes en el deportivo los fines de semana.', 0.12, 14],
      [equipo['luis.hernandez'], 2, 'Poner luminarias en la calle Egipto: de noche no se ve nada y han asaltado a varias personas al salir del metro.', 0.15, 19],
      [equipo['alex.moreno'], 1, 'Un huerto comunitario en el terreno baldío junto a la escuela. Podríamos cuidarlo entre todas las familias.', 0.2, 11],
      [vc(5), 2, 'Cámaras en la esquina de Clavería y Egipto.', 0.24, 8],
      [vc(6), 1, 'Bebederos y sombra en el parque; en verano no hay dónde refugiarse.', 0.3, 9],
      [vc(7), 3, 'Clases de baile y activación física para personas adultas mayores en la explanada.', 0.36, 12],
      [vc(8), 2, 'Arreglar las coladeras de la avenida: cada que llueve se inunda la esquina y no se puede pasar.', 0.42, 15],
      [vc(9), 2, 'Una ciclovía hacia el metro para no arriesgarnos entre los coches.', 0.47, 6],
      [vc(10), 1, 'Botes de basura para separar residuos en la plaza, siempre hay bolsas tiradas.', 0.55, 7],
      [vc(11), 2, 'Rampas en todas las esquinas para sillas de ruedas y carriolas.', 0.6, 10],
      [vc(12), 3, 'Cine al aire libre una vez al mes en el parque.', 0.68, 5],
      [maria, 2, 'Captación de agua de lluvia en la primaria: en temporada de secas los baños se quedan sin agua y suspenden clases.', 0.72, 13],
      [vc(13), 1, 'Reforestar el camellón de Av. Azcapotzalco con árboles nativos.\nTambién se podría poner riego por goteo para que no se sequen como la vez pasada.', 0.8, 4],
      [vc(14), 3, 'Un gimnasio al aire libre como el que tienen en otras colonias.', 0.9, 3],
    ];
    var idsCla = ideasCla.map(function (x) { return idea(x[0], CLA, x[1], x[2], x[3], x[4]).id; });
    comentar(idsCla[0], equipo['jose.ramirez'], 'De acuerdo, por las noches está muy oscuro.', 3);
    comentar(idsCla[0], equipo['ana.gutierrez'], 'También podrían poner un bebedero.', 7);
    comentar(idsCla[0], vc(7), 'Mis nietos van todos los días a ese parque, ojalá lo arreglen pronto.', 26);
    comentar(idsCla[0], equipo['luis.hernandez'], 'Podríamos sumar la idea de las luminarias de la calle Egipto, quedan muy cerca.', 30);
    comentar(idsCla[1], maria, 'Totalmente de acuerdo, mi mamá ya se cayó una vez ahí.', 5);
    comentar(idsCla[1], vc(9), 'Que incluyan rampas en las esquinas.', 20);
    comentar(idsCla[2], equipo['alex.moreno'], '¡Excelente idea! Cuenten conmigo para organizar.', 2);
    comentar(idsCla[2], vc(12), 'Yo doy clases de guitarra, podría apoyar como voluntario.', 9);
    comentar(idsCla[3], vc(5), 'Ya lo reportamos a la alcaldía y no hicieron caso, ojalá con el presupuesto sí.', 4);
    comentar(idsCla[3], maria, 'Apoyo, yo también salgo tarde del metro.', 12);
    comentar(idsCla[3], vc(8), 'Habría que ver cuánto cuesta, pero es muy necesario.', 28);
    comentar(idsCla[4], vc(6), 'Ojo con el mantenimiento: luego nadie lo cuida.', 6);
    comentar(idsCla[6], vc(10), 'Sí, y que sean árboles que den sombra rápido.', 3);
    comentar(idsCla[8], vc(11), 'La esquina de Clavería es la peor, el agua llega a la banqueta.', 8);
    comentar(idsCla[13], equipo['ana.gutierrez'], 'Muy buena idea, en mi escuela pasó lo mismo.', 4);
    comentar(idsCla[13], vc(13), 'Sería bueno que la escuela también participe en el mantenimiento.', 18);
    var ideasSal = [
      [equipo['patricia.flores'], 1, 'Instalar bancas y botes de basura en la plaza de San Álvaro.', 0.1, 9],
      [equipo['jorge.castillo'], 3, 'La cancha no tiene gradas ni sombra: con una techumbre se podría usar todo el año.', 0.2, 12],
      [equipo['rosa.martinez'], 2, 'Luminarias en la calle Ferrocarriles Nacionales, está muy oscura.', 0.3, 6],
      [vecinosDe(SAL.id)[4], 2, 'Esta colonia es un asco y los vecinos de la esquina son unos ladrones, que se larguen.', 0.5, 0],
      [vecinosDe(SAL.id)[5], 1, 'Un huerto en la azotea del centro comunitario.', 0.6, 4],
    ];
    var idsSal = ideasSal.map(function (x) { return idea(x[0], SAL, x[1], x[2], x[3], x[4]).id; });
    comentar(idsSal[0], equipo['rosa.martinez'], 'Sí, y que pongan jardineras.', 5);
    comentar(idsSal[1], equipo['patricia.flores'], 'Los jóvenes la usarían mucho más.', 3);
    comentar(idsSal[1], vecinosDe(SAL.id)[6], 'Ojalá incluyan iluminación para jugar en la noche.', 15);
    var ideaOfensiva = DB.ideas.find(function (x) { return x.id === idsSal[3]; });
    if (o >= 3) ideaOfensiva.estado = 'oculto';
    idea(equipo['daniel.ortega'], DCA, 2, 'Mejorar el alumbrado de la calle Cerro del Agua por las noches.', 0.15, 11);
    idea(equipo['fernanda.reyes'], DCA, 1, 'Un huerto comunitario con talleres de composta en Del Carmen.', 0.3, 8);
    idea(equipo['miguel.torres'], SUC, 3, 'Rehabilitar la cancha de usos múltiples de Santa Úrsula y ponerle gradas.', 0.2, 10);
    idea(equipo['carmen.aguilar'], SUC, 1, 'Más árboles y bancas en el parque de la calle Papalotl.', 0.4, 6);
    DB.unidades.forEach(function (u) {
      if (['AZC-001', 'AZC-002', 'COY-001', 'COY-002'].indexOf(u.clave) >= 0) return;
      var vec = vecinosDe(u.id);
      var n = r(1, 3);
      for (var i = 0; i < n; i += 1) {
        var pl = elige(PLANTILLAS);
        var txt = pl[1].replace(/\{L\}/g, u.nombre).replace(/\{S\}/g, elige(CALLES));
        idea(vec[i % vec.length], u, pl[3], txt, rng() * 0.9, r(2, 14));
      }
    });
    DB.seq.ideas = iid + 100;
    DB.seq.comentarios_idea = cid + 100;

    /* ---------- proyectos ---------- */
    var folios = {};
    var pid = 1;
    function proyecto(d) {
      var ut = DB.unidades.find(function (u) { return u.id === d.ut.id; });
      var alc = DB.alcaldias.find(function (a) { return a.id === ut.alcaldia_id; });
      folios[alc.clave] = (folios[alc.clave] || 0) + 1;
      var dl = d.delta || [(rng() - 0.5) * 0.008, (rng() - 0.5) * 0.008];
      var p = {
        id: pid, folio: 'PP-' + anio + '-' + alc.clave + '-' + String(folios[alc.clave]).padStart(4, '0'), ciclo_id: 1,
        unidad_id: ut.id, alcaldia_id: alc.id, proponente_id: d.autor.id, titulo: d.titulo, descripcion: d.descripcion,
        rubro_id: d.rubro, categoria: d.categoria, costo_estimado: d.costo, calle: d.calle, numero: d.numero || null,
        referencias: d.referencias || null, codigo_postal: d.cp || null,
        latitud: Math.round((ut.latitud + dl[0]) * 1e6) / 1e6, longitud: Math.round((ut.longitud + dl[1]) * 1e6) / 1e6,
        estado_ubicacion: 'ubicado', imagen_uuid: d.imagen === false ? null : 'demo:' + d.categoria + '-' + (1 + (pid % 2)),
        estatus: 'registrado', numero_sorteo: null, avance_porcentaje: 0, monto_ejercido: 0, estado_moderacion: 'visible',
        creado_en: fmt(enFase(2, d.frac !== undefined ? d.frac : rng() * 0.85, r(8, 21))), idea_id: d.idea || null,
        destino: d.destino, total_votos: null, posicion: null,
      };
      p.actualizado_en = p.creado_en;
      pid += 1;
      DB.proyectos.push(p);
      return p;
    }
    var pMaria = proyecto({ ut: CLA, autor: maria, titulo: 'Rehabilitación del parque Norte 45', descripcion: 'Nuevas luminarias, juegos infantiles, bebedero y áreas verdes en el parque de la calle Norte 45. El parque lo usan diario las familias de la primaria y del mercado.', rubro: 1, categoria: 'areas_verdes', costo: 850000, calle: 'Norte 45', numero: '12', referencias: 'Frente al mercado', cp: '02090', delta: [0.0012, -0.0008], idea: idsCla[0], destino: 'ganador', frac: 0.18 });
    proyecto({ ut: CLA, autor: equipo['jose.ramirez'], titulo: 'Banquetas accesibles en Clavería', descripcion: 'Reparación de banquetas y rampas para sillas de ruedas alrededor del mercado.', rubro: 2, categoria: 'vialidad', costo: 1200000, calle: 'Calle Clavería', numero: '45', cp: '02080', delta: [-0.0015, 0.0011], idea: idsCla[1], destino: 'perdedor', frac: 0.22 });
    proyecto({ ut: CLA, autor: equipo['ana.gutierrez'], titulo: 'Talleres culturales para jóvenes', descripcion: 'Equipamiento y talleres de música y pintura en el deportivo de la colonia, los sábados y domingos.', rubro: 3, categoria: 'recreacion', costo: 400000, calle: 'Av. Azcapotzalco', numero: '210', referencias: 'Deportivo', delta: [0.0005, 0.0019], idea: idsCla[2], destino: 'perdedor', frac: 0.3 });
    proyecto({ ut: CLA, autor: equipo['luis.hernandez'], titulo: 'Cámaras y alumbrado en calles oscuras', descripcion: 'Alumbrado LED y cámaras en tres calles de la colonia, desde el metro hasta la calle Egipto.', rubro: 2, categoria: 'alumbrado', costo: 2950000, calle: 'Calle Egipto', delta: [-0.0006, -0.0014], idea: idsCla[3], destino: 'no_viable', frac: 0.35, imagen: false });
    proyecto({ ut: CLA, autor: equipo['alex.moreno'], titulo: 'Huerto comunitario Clavería', descripcion: 'Huerto urbano con camas de cultivo y talleres de composta en el terreno junto a la escuela.', rubro: 1, categoria: 'areas_verdes', costo: 320000, calle: 'Calle Irapuato', numero: '8', delta: [0.0018, 0.0006], idea: idsCla[4], destino: 'perdedor', frac: 0.4 });
    var pMaria2 = proyecto({ ut: CLA, autor: maria, titulo: 'Captación de agua de lluvia en la primaria', descripcion: 'Sistema de captación pluvial con cisterna de 10 000 litros para los baños de la primaria de la colonia.', rubro: 2, categoria: 'agua', costo: 690000, calle: 'Calle Tebas', numero: '33', referencias: 'Escuela primaria', delta: [-0.0011, 0.0002], idea: idsCla[13], destino: 'no_viable', frac: 0.75 });
    var pPatricia = proyecto({ ut: SAL, autor: equipo['patricia.flores'], titulo: 'Plaza San Álvaro con mobiliario urbano', descripcion: 'Bancas, botes de basura y jardineras en la plaza principal.', rubro: 1, categoria: 'mobiliario', costo: 700000, calle: 'Plaza San Álvaro', referencias: 'Junto a la parroquia', delta: [0.0007, -0.0006], idea: idsSal[0], destino: 'ganador', frac: 0.2 });
    var pJorge = proyecto({ ut: SAL, autor: equipo['jorge.castillo'], titulo: 'Techumbre para la cancha de San Álvaro', descripcion: 'Techumbre, gradas y luminarias para la cancha de usos múltiples.', rubro: 3, categoria: 'recreacion', costo: 1350000, calle: 'Calle Sabino', numero: '120', delta: [-0.0009, 0.0012], idea: idsSal[1], destino: 'perdedor', frac: 0.28 });
    proyecto({ ut: SAL, autor: equipo['rosa.martinez'], titulo: 'Luminarias en Ferrocarriles Nacionales', descripcion: 'Luminarias LED en la avenida y en el paso peatonal hacia el metro.', rubro: 2, categoria: 'alumbrado', costo: 760000, calle: 'Av. Ferrocarriles Nacionales', delta: [0.0013, 0.0015], idea: idsSal[2], destino: 'perdedor', frac: 0.45 });
    var pSinUbicar = proyecto({ ut: SAL, autor: vecinosDe(SAL.id)[7], titulo: 'Alberca techada para la colonia', descripcion: 'Construcción de una alberca semiolímpica techada con vestidores.', rubro: 3, categoria: 'recreacion', costo: 9800000, calle: 'Calle sin nombre', numero: 'S/N', destino: 'no_viable', frac: 0.6, imagen: false });
    if (o <= 3) { pSinUbicar.estado_ubicacion = 'no_ubicado'; pSinUbicar.latitud = null; pSinUbicar.longitud = null; }
    else pSinUbicar.estado_ubicacion = 'corregido';
    proyecto({ ut: DCA, autor: equipo['daniel.ortega'], titulo: 'Alumbrado en Cerro del Agua', descripcion: 'Luminarias LED en la calle Cerro del Agua y su cruce con Av. Universidad.', rubro: 2, categoria: 'alumbrado', costo: 600000, calle: 'Cerro del Agua', numero: '120', delta: [0.001, 0.0005], destino: 'ganador', frac: 0.2 });
    proyecto({ ut: DCA, autor: equipo['fernanda.reyes'], titulo: 'Huerto comunitario Del Carmen', descripcion: 'Huerto urbano con talleres de composta para vecinos.', rubro: 1, categoria: 'areas_verdes', costo: 350000, calle: 'Calle Francisco Sosa', numero: '80', delta: [-0.0009, -0.0012], destino: 'perdedor', frac: 0.3 });
    proyecto({ ut: SUC, autor: equipo['miguel.torres'], titulo: 'Cancha de usos múltiples Santa Úrsula', descripcion: 'Rehabilitación de la cancha y gradas.', rubro: 3, categoria: 'recreacion', costo: 900000, calle: 'Calle Papalotl', numero: '15', delta: [0.0011, 0.0004], destino: 'ganador', frac: 0.25 });
    proyecto({ ut: SUC, autor: equipo['carmen.aguilar'], titulo: 'Árboles y bancas en el parque Papalotl', descripcion: 'Reforestación con especies nativas y bancas de concreto en el parque.', rubro: 1, categoria: 'areas_verdes', costo: 420000, calle: 'Calle Papalotl', numero: '40', delta: [-0.0012, 0.0009], destino: 'perdedor', frac: 0.4 });

    var unicoViable = utPorClave['MAL-002'];
    var retirada = utPorClave['BJU-001'];
    var inejecutable = utPorClave['GAM-002'];
    DB.unidades.forEach(function (u) {
      var ya = DB.proyectos.filter(function (p) { return p.unidad_id === u.id; }).length;
      var n = ya ? Math.max(0, 4 - ya) : r(2, 4);
      if (u.clave === 'COY-001' || u.clave === 'COY-002') n = 2;
      if (u.clave === unicoViable.clave) n = 2;
      var vec = vecinosDe(u.id);
      var usadas = {};
      for (var i = 0; i < n; i += 1) {
        var k;
        do { k = r(0, PLANTILLAS.length - 1); } while (usadas[k]);
        usadas[k] = 1;
        var pl = PLANTILLAS[k];
        var calle = elige(CALLES);
        var destino = (!ya && i === 0) ? 'ganador' : (rng() < 0.2 ? 'no_viable' : 'perdedor');
        if (u.clave === unicoViable.clave) destino = i === 0 ? 'ganador' : 'no_viable';
        proyecto({
          ut: u, autor: vec[(i * 3 + 1) % vec.length], titulo: pl[0].replace(/\{L\}/g, u.nombre).replace(/\{S\}/g, calle),
          descripcion: pl[1].replace(/\{L\}/g, u.nombre).replace(/\{S\}/g, calle), rubro: pl[3], categoria: pl[2],
          costo: r(pl[4], pl[5]) * 1000, calle: calle, numero: String(r(2, 250)), destino: destino, imagen: rng() < 0.8 ? undefined : false,
        });
      }
      if (u.clave === retirada.clave) {
        var pr = proyecto({ ut: u, autor: vec[0], titulo: 'Bodega para el comité vecinal', descripcion: 'Construcción de una bodega para guardar el material del comité.', rubro: 2, categoria: 'otro', costo: 380000, calle: elige(CALLES), destino: 'retirado', imagen: false });
        pr.estatus = 'retirado';
      }
    });
    DB.seq.proyectos = pid + 100;

    /* estatus según la fase */
    var porUt = {};
    DB.proyectos.forEach(function (p) { (porUt[p.unidad_id] = porUt[p.unidad_id] || []).push(p); });
    var sorteoPendiente = o === 4 ? [SAL.id, utPorClave['IZP-001'].id, utPorClave['TLH-002'].id] : [];
    var NO_VIABLE = [
      ['viabilidad_financiera', 'El costo estimado excede el presupuesto asignado a la unidad territorial.'],
      ['no_sustituye_servicios', 'El alumbrado y la pavimentación son servicios que ya presta la alcaldía; el proyecto los sustituye.'],
      ['viabilidad_juridica', 'El predio propuesto es propiedad privada y no puede intervenirse con recursos públicos.'],
      ['viabilidad_tecnica', 'El sitio no tiene las condiciones técnicas para la obra propuesta sin un estudio de suelo previo.'],
    ];
    var dicId = 1;
    function dictamen(p, resultado, frac) {
      var autor = p.alcaldia_id === carlos.alcaldia_id ? carlos : (p.alcaldia_id === lucia.alcaldia_id ? lucia : admin);
      var motivo = NO_VIABLE[p.id % NO_VIABLE.length];
      if (p === pMaria2) motivo = ['no_sustituye_servicios', 'El abastecimiento de agua en escuelas públicas corresponde a la Autoridad Educativa Federal; el proyecto sustituye un servicio a su cargo.'];
      if (p.costo_estimado > p.unidadPresupuesto) motivo = NO_VIABLE[0];
      var crit = S.criterios.map(function (c, i) {
        var falla = resultado === 'no_viable' && c.clave === motivo[0];
        return { criterio_id: c.id, cumple: falla ? 0 : 1, observacion: falla ? motivo[1] : null };
      });
      DB.dictamenes.push({
        id: dicId, proyecto_id: p.id, resultado: resultado,
        justificacion: resultado === 'viable' ? 'Cumple con los criterios técnicos, jurídicos, ambientales y financieros.' : motivo[1],
        emitido_en: fmt(enFase(3, frac, r(9, 18))), criterios: crit, autor_id: autor.id,
      });
      dicId += 1;
    }
    DB.seq.dictamenes = 500;
    DB.unidades.forEach(function (u) { (porUt[u.id] || []).forEach(function (p) { p.unidadPresupuesto = u.presupuesto_asignado; }); });

    DB.proyectos.forEach(function (p, i) {
      if (p.estatus === 'retirado') return;
      var viable = p.destino !== 'no_viable';
      var revisado = o > 2 || (o === 2 && (i % 10) < 3);
      if (o === 2) { p.estatus = revisado ? 'en_dictaminacion' : 'registrado'; if (p === pMaria) p.estatus = 'en_dictaminacion'; if (p === pMaria2) p.estatus = 'registrado'; }
      if (revisado) DB.revisiones.push({ proyecto_id: p.id, resultado: 'completo', observacion: null, revisado_en: fmt(enFase(o === 2 ? 2 : 2, o === 2 ? 0.6 : 0.95, r(9, 18))) });
      if (o === 3) {
        var decidido = (i % 5) < 3 || p === pMaria || p === pMaria2;
        if (p.alcaldia_id === carlos.alcaldia_id && p !== pMaria && p !== pMaria2) decidido = (i % 2) === 0;
        p.estatus = decidido ? (viable ? 'viable' : 'no_viable') : 'en_dictaminacion';
        if (decidido) dictamen(p, viable ? 'viable' : 'no_viable', 0.2 + (i % 7) / 10);
        else if (i % 3 === 0) DB.dictamenes.push({ id: DB.siguiente('dictamenes'), proyecto_id: p.id, resultado: null, justificacion: null, emitido_en: null, autor_id: null,
          criterios: S.criterios.slice(0, 4).map(function (c) { return { criterio_id: c.id, cumple: 1, observacion: null }; }) });
      }
      if (o >= 4) {
        dictamen(p, viable ? 'viable' : 'no_viable', 0.15 + (i % 8) / 10);
        p.estatus = viable ? 'viable' : 'no_viable';
      }
    });
    var luisP = DB.proyectos.find(function (p) { return p.proponente_id === equipo['luis.hernandez'].id; });
    DB.revisiones.push({ proyecto_id: luisP.id, resultado: 'correccion_solicitada', observacion: 'Indica el número exterior de la calle y una referencia para ubicar el proyecto.', revisado_en: fmt(enFase(2, 0.5, 11)) });
    if (o === 2) luisP.estatus = 'registrado';

    /* sorteo y boleta */
    if (o >= 4) {
      DB.unidades.forEach(function (u) {
        if (sorteoPendiente.indexOf(u.id) >= 0) return;
        var lista = (porUt[u.id] || []).filter(function (p) { return p.estatus === 'viable'; });
        var orden = lista.slice().sort(function (a, b) { return ((a.id * 7919) % 13) - ((b.id * 7919) % 13); });
        orden.forEach(function (p, k) { p.numero_sorteo = k + 1; p.estatus = 'en_consulta'; });
        DB.sorteos.push({ unidad_id: u.id, realizado_en: fmt(enFase(4, 0.1 + (u.id % 5) / 10, r(10, 13))) });
      });
    }

    /* participación y votos */
    if (o >= 5) {
      var tasa = o === 5 ? 0.38 : 0.64;
      DB.unidades.forEach(function (u) {
        var boleta = (porUt[u.id] || []).filter(function (p) { return p.estatus === 'en_consulta'; });
        if (!boleta.length) return;
        var vec = vecinosDe(u.id);
        var votantes = vec.filter(function (c, k) { return c !== maria && ((k * 37 + u.id * 11) % 100) / 100 < tasa; });
        if (o >= 6 && u.id === CLA.id) votantes.push(maria);
        votantes.forEach(function (c, k) {
          var t = enFase(5, (k + 0.5) / (votantes.length + 1), r(8, 21));
          DB.participaciones.push({ ciclo_id: 1, ciudadano_id: c.id, unidad_id: u.id, folio_comprobante: 'CP-2026-' + ((c.id * 2654435761) >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 8) + dos(c.id % 97), participo_en: fmt(t) });
        });
        if (o < 6) return;
        var nVotos = votantes.length;
        var gan = boleta.find(function (p) { return p.destino === 'ganador'; }) || boleta[0];
        var otros = boleta.filter(function (p) { return p !== gan; });
        var caso = null;
        if (boleta.length === 1) caso = 'unico_viable';
        var votosGan = otros.length ? Math.max(Math.ceil(nVotos * 0.42), Math.floor(nVotos / boleta.length) + 2) : nVotos;
        if (u.id === SAL.id) { votosGan = Math.ceil(nVotos * 0.4); caso = 'empate'; }
        votosGan = Math.min(votosGan, nVotos);
        gan.total_votos = votosGan;
        var resto = nVotos - votosGan;
        otros.forEach(function (p, k) {
          var v = k === otros.length - 1 ? resto : Math.floor(resto * (0.55 - k * 0.1));
          if (u.id === SAL.id && p === pJorge) v = votosGan;
          v = Math.max(0, Math.min(v, resto));
          if (u.id !== SAL.id && v >= votosGan) v = votosGan - 1;
          p.total_votos = v;
          resto -= v;
        });
        if (resto > 0) gan.total_votos += resto;
        var orden = boleta.slice().sort(function (a, b) { return b.total_votos - a.total_votos; });
        orden.forEach(function (p) { p.posicion = 1 + orden.filter(function (x) { return x.total_votos > p.total_votos; }).length; });
        DB.resultados_unidad.push({
          unidad_id: u.id, total_votos: nVotos, caso_especial: caso, proyecto_ganador_id: gan.id,
          metodo: caso ? (caso === 'empate' ? 'asamblea_sorteo' : 'asamblea_seleccion') : 'votacion',
          justificacion: caso === 'empate' ? 'La asamblea informativa resolvió el empate mediante un sorteo público ante 40 vecinas y vecinos.'
            : (caso ? 'La asamblea ratificó el único proyecto viable de la unidad territorial.' : null),
          resuelto_en: caso ? fmt(enFase(6, 0.05, 11)) : null,
        });
        gan.estatus = 'ganador';
      });
    }

    /* ejecución */
    var ganadores = DB.proyectos.filter(function (p) { return p.estatus === 'ganador'; });
    if (o >= 7) {
      ganadores.forEach(function (p, k) {
        var meta = o === 8 ? (k % 6 === 0 ? 88 : 100) : [35, 60, 15, 80, 45, 25, 70, 100][k % 8];
        if (p === pMaria) meta = o === 8 ? 100 : 65;
        if (p.unidad_id === inejecutable.id) meta = 20;
        var pasos = meta >= 60 ? 3 : 2;
        var ppto = DB.unidades.find(function (u) { return u.id === p.unidad_id; }).presupuesto_asignado;
        var costo = Math.min(p.costo_estimado, ppto);
        for (var s = 1; s <= pasos; s += 1) {
          var pct = Math.round(meta * s / pasos);
          var est = pct >= 100 ? 'concluido' : 'en_ejecucion';
          var nota = s === 1 ? 'Arrancaron los trabajos: limpieza del área y trazo de la obra.'
            : (pct >= 100 ? 'Obra entregada a la comunidad en la asamblea de rendición de cuentas.' : 'Trabajos en proceso conforme al calendario; se instaló el primer frente de obra.');
          var just = null;
          if (p.unidad_id === inejecutable.id && s === pasos) { est = 'inejecutable'; nota = null; just = 'El predio presentó hundimientos; Protección Civil determinó que no es seguro construir en el sitio.'; }
          DB.avances.push({ proyecto_id: p.id, porcentaje: pct, monto_ejercido: Math.round(costo * pct / 105), estatus: est, nota: nota, justificacion_inejecutable: just,
            registrado_en: fmt(enFase(o === 8 ? 7 : 7, o === 8 ? s / (pasos + 0.5) : s / (pasos + 1.2), r(9, 17))) });
          p.avance_porcentaje = pct;
          p.monto_ejercido = Math.round(costo * pct / 105);
          p.estatus = est;
        }
      });
    }

    /* reportes de foto denuncia */
    if (o >= 7) {
      var rid = 1;
      var fotoN = 1;
      var crid = 1;
      var TXT_AV = ['Ya se instalaron las primeras luminarias y se limpió el área.', 'Avanzan los trabajos: ya están colocando el piso nuevo.', 'Se ve muy bien, ya pusieron las bancas y los botes de basura.', 'Ya terminaron la estructura, faltan los detalles finales.'];
      var TXT_IRR = ['La obra está detenida desde hace una semana y hay material en la banqueta.', 'Dejaron una zanja abierta sin señalización, es peligroso de noche.', 'Los trabajadores tiran escombro en el camellón.'];
      ganadores.forEach(function (p, k) {
        var n = p.alcaldia_id === carlos.alcaldia_id || p.alcaldia_id === lucia.alcaldia_id ? 3 : (k % 3 === 0 ? 1 : 0);
        if (p.unidad_id === inejecutable.id) n = 1;
        var vec = vecinosDe(p.unidad_id);
        for (var j = 0; j < n; j += 1) {
          var tipo = j === 1 ? 'irregularidad' : 'avance';
          var autor = (p === pMaria && j === 0) ? maria : vec[(j * 5 + 2) % vec.length];
          var fotos = [];
          for (var f = 0; f < (j === 2 ? 1 : 2); f += 1) { fotos.push('demo:foto-' + (((fotoN - 1) % 8) + 1)); fotoN += 1; }
          var atendido = j === 0 || (j === 1 && k % 2 === 0);
          var rep = { id: rid, proyecto_id: p.id, autor_id: autor.id, tipo: tipo, descripcion: tipo === 'avance' ? TXT_AV[(k + j) % TXT_AV.length] : TXT_IRR[k % TXT_IRR.length],
            estatus: atendido ? 'atendido' : 'pendiente', respuesta: atendido ? (tipo === 'avance' ? 'Gracias por tu reporte. La obra sigue el calendario.' : 'La empresa retiró el material y colocó señalización. Gracias por avisar.') : null,
            creado_en: fmt(enFase(7, Math.min(0.95, 0.25 + j * 0.25 + (k % 4) / 20), r(8, 20))), fotos: fotos };
          if (o === 8) rep.creado_en = fmt(enFase(7, 0.3 + j * 0.2, r(8, 20)));
          DB.reportes.push(rep);
          var nc = j === 0 ? 2 : (j === 1 ? 1 : 0);
          for (var c = 0; c < nc; c += 1) {
            var aut = vec[(c * 3 + j + 4) % vec.length];
            if (p === pMaria && j === 0 && c === 1) aut = equipo['jose.ramirez'];
            var t2 = new Date(Math.min(ahora.getTime() - 3600000, new Date(rep.creado_en.replace(' ', 'T')).getTime() + (c + 1) * 26 * 3600000));
            DB.comentarios_reporte.push({ id: crid, reporte_id: rid, autor_id: aut.id, contenido: COMENTARIOS_REPORTE[(c + k) % COMENTARIOS_REPORTE.length], creado_en: fmt(t2), estado: 'visible' });
            crid += 1;
          }
          rid += 1;
        }
      });
      DB.seq.reportes = rid + 100;
      DB.seq.comentarios_reporte = crid + 100;
    }

    /* calificaciones */
    if (o >= 8) {
      ganadores.forEach(function (p, k) {
        var vec = vecinosDe(p.unidad_id).filter(function (v) { return v !== maria; });
        var n = Math.min(vec.length, 3 + (k % 6));
        for (var j = 0; j < n; j += 1) {
          var punt = p.estatus === 'inejecutable' ? 1 + (j % 2) : [5, 4, 5, 3, 4, 5, 2, 4][(j + k) % 8];
          DB.calificaciones.push({ proyecto_id: p.id, ciudadano_id: vec[j].id, puntuacion: punt, comentario: punt >= 4 ? 'Buen trabajo de la alcaldía.' : (punt === 3 ? 'Quedó bien, pero tardaron mucho.' : 'Le faltan detalles y no se terminó a tiempo.'),
            creada_en: fmt(enFase(8, 0.1 + j / 20, r(9, 20))) });
        }
      });
    }

    /* notificaciones de María */
    var nid2 = 1;
    function notificar(u, tipo, titulo, mensaje, proyectoId, cuando, leida) {
      DB.notificaciones.push({ id: nid2, usuario_id: u.id, tipo: tipo, titulo: titulo, mensaje: mensaje, proyecto_id: proyectoId || null, leida: leida ? 1 : 0, creada_en: fmt(cuando) });
      nid2 += 1;
    }
    notificar(maria, 'bienvenida', 'Bienvenida a Prepar', 'Tu cuenta quedó lista. Ya puedes participar en el ciclo de práctica.', null, enFase(1, 0.6, 10), true);
    if (o >= 2) notificar(maria, 'proyecto_en_dictaminacion', 'Tu proyecto pasó a dictaminación', 'El proyecto ' + pMaria.folio + ' está completo y fue enviado al Órgano Dictaminador.', pMaria.id, enFase(2, 0.55, 12), o > 3);
    if (o >= 3) {
      var dm = DB.dictamenes.find(function (d) { return d.proyecto_id === pMaria.id && d.emitido_en; });
      var dm2 = DB.dictamenes.find(function (d) { return d.proyecto_id === pMaria2.id && d.emitido_en; });
      if (dm) notificar(maria, 'dictamen_emitido', 'Dictamen de tu proyecto: viable', 'Proyecto ' + pMaria.folio + '. Justificación: ' + dm.justificacion, pMaria.id, new Date(dm.emitido_en.replace(' ', 'T')), o > 4);
      if (dm2) notificar(maria, 'dictamen_emitido', 'Dictamen de tu proyecto: no viable', 'Proyecto ' + pMaria2.folio + '. Justificación: ' + dm2.justificacion, pMaria2.id, new Date(dm2.emitido_en.replace(' ', 'T')), o > 4);
    }
    if (o >= 6) notificar(maria, 'proyecto_ganador', '¡Tu proyecto ganó la consulta!', 'El proyecto ' + pMaria.folio + ' resultó ganador en tu unidad territorial.', pMaria.id, enFase(6, 0.12, 12), o > 6);
    if (o >= 7) {
      var rm = DB.reportes.find(function (x) { return x.autor_id === maria.id; });
      if (rm) notificar(maria, 'reporte_atendido', 'Tu reporte fue atendido', rm.respuesta, rm.proyecto_id, new Date(new Date(rm.creado_en.replace(' ', 'T')).getTime() + 30 * 3600000), false);
    }
    [carlos, lucia, admin].forEach(function (u) {
      notificar(u, 'aviso', 'Nueva fase del ciclo', 'El ciclo de práctica avanzó a la fase ' + o + '. Revisa tus pendientes en el panel.', null, enFase(o, 0.02, 9), false);
    });
    DB.seq.notificaciones = nid2 + 100;

    terminar();
    return DB;

    function terminar() {
      /* avisos */
      var aid = 1;
      function aviso(autor, alc, titulo, mensaje, cuando, hasta) {
        DB.avisos.push({ id: aid, ciclo_id: 1, alcaldia_id: alc, autor_id: autor.id, titulo: titulo, mensaje: mensaje, publicado_en: fmt(cuando), activo: 1, vigente_hasta: hasta || null });
        aid += 1;
      }
      aviso(admin, null, 'Bienvenidos al ciclo de práctica', 'Consulta el calendario y el presupuesto de tu colonia en el panel. Este ciclo es una simulación con fines educativos.', enFase(1, 0.1, 9));
      if (o >= 2) aviso(carlos, alcPorClave.AZC.id, 'Registro de proyectos abierto', 'Registra tu proyecto antes del cierre de la fase de Diagnóstico y Registro. Si tienes dudas, acude a la asamblea vecinal del sábado a las 11:00 en la explanada de la alcaldía.', enFase(2, 0.05, 10));
      if (o >= 2) aviso(lucia, alcPorClave.COY.id, 'Asamblea de diagnóstico en Coyoacán', 'Te esperamos el jueves a las 18:00 en la Casa de Cultura para platicar las necesidades de tu colonia.', enFase(2, 0.1, 12));
      if (o >= 4) aviso(admin, null, 'Ya se publicaron las boletas', 'Cada proyecto viable ya tiene su número en la boleta. Conócelos en la sección Votación.', enFase(4, 0.4, 10));
      if (o >= 5) aviso(carlos, alcPorClave.AZC.id, 'Mesas receptoras de votos', 'Además del voto por internet, habrá una mesa receptora en el mercado de Clavería de 9:00 a 17:00.', enFase(5, 0.05, 9));
      if (o >= 6) aviso(admin, null, 'Resultados publicados', 'Ya puedes consultar los proyectos ganadores de cada colonia en el Mapa de Proyectos.', enFase(6, 0.15, 13));
      if (o >= 7) aviso(carlos, alcPorClave.AZC.id, 'Inician las obras en Azcapotzalco', 'Los proyectos ganadores ya están en ejecución. Sube fotos del avance en Seguimiento para que todos sepamos cómo van.', enFase(7, 0.05, 10));
      if (o >= 8) aviso(admin, null, 'Califica el proyecto de tu colonia', 'Ayúdanos a evaluar si los proyectos se cumplieron. Tu calificación es anónima.', enFase(8, 0.05, 10));
      DB.seq.avisos = aid + 100;

      /* bitácora */
      var bid = 1;
      function bit(u, accion, entidad, entidadId, detalle, cuando, alc) {
        DB.bitacora.push({ id: bid, realizada_en: fmt(cuando), usuario_id: u.id, rol: u.rol, alcaldia_id: alc !== undefined ? alc : (u.alcaldia_id || null), ciclo_id: 1, accion: accion, entidad: entidad, entidad_id: entidadId, detalle: detalle ? JSON.stringify(detalle) : null });
        bid += 1;
      }
      bit(admin, 'ciclo_crear', 'ciclos', 1, { nombre: DB.ciclos[0].nombre }, sumarDias(inicioCiclo, -5));
      DB.usuarios.filter(function (x) { return x.rol === 'funcionario'; }).forEach(function (f) { bit(admin, 'funcionario_registrar', 'usuarios', f.id, { nombre: f.nombre_completo }, new Date(f.creado_en.replace(' ', 'T'))); });
      for (var k = 1; k <= o; k += 1) bit(admin, 'fase_cambiar', 'ciclos', 1, { fase: FASES_CLAVE[k - 1] }, enFase(k, 0, 8));
      DB.revisiones.slice(0, 30).forEach(function (rv) {
        var p = DB.proyectos.find(function (x) { return x.id === rv.proyecto_id; });
        var f = p.alcaldia_id === carlos.alcaldia_id ? carlos : (p.alcaldia_id === lucia.alcaldia_id ? lucia : null);
        if (f) bit(f, 'registro_revisar', 'proyectos', p.id, { resultado: rv.resultado }, new Date(rv.revisado_en.replace(' ', 'T')));
      });
      DB.dictamenes.filter(function (d) { return d.emitido_en && d.autor_id; }).forEach(function (d) {
        var f = DB.usuarios.find(function (x) { return x.id === d.autor_id; });
        if (f && f.rol === 'funcionario') bit(f, 'dictamen_emitir', 'dictamenes', d.id, { resultado: d.resultado }, new Date(d.emitido_en.replace(' ', 'T')));
      });
      DB.sorteos.forEach(function (s) {
        var u = DB.unidades.find(function (x) { return x.id === s.unidad_id; });
        var f = u.alcaldia_id === carlos.alcaldia_id ? carlos : (u.alcaldia_id === lucia.alcaldia_id ? lucia : null);
        if (f) bit(f, 'sorteo_realizar', 'sorteos', u.id, { unidad: u.nombre }, new Date(s.realizado_en.replace(' ', 'T')));
      });
      if (o >= 3) bit(carlos, 'moderar_ocultar', 'ideas', idsSalOfensiva(), { motivo: 'Lenguaje ofensivo contra vecinos' }, enFase(3, 0.05, 10));
      if (o >= 5) bit(admin, 'votacion_abrir', 'ciclos', 1, null, enFase(5, 0, 8));
      if (o >= 6) { bit(admin, 'votacion_cerrar', 'ciclos', 1, null, enFase(6, 0, 9)); bit(admin, 'votos_contar', 'ciclos', 1, null, enFase(6, 0.02, 10)); bit(carlos, 'caso_especial_resolver', 'resultados_unidad', SAL.id, { metodo: 'asamblea_sorteo' }, enFase(6, 0.05, 11)); bit(admin, 'ganadores_publicar', 'ciclos', 1, null, enFase(6, 0.1, 12)); }
      DB.avances.filter(function (a) { return a.registrado_en; }).slice(0, 25).forEach(function (a) {
        var p = DB.proyectos.find(function (x) { return x.id === a.proyecto_id; });
        var f = p.alcaldia_id === carlos.alcaldia_id ? carlos : (p.alcaldia_id === lucia.alcaldia_id ? lucia : null);
        if (f) bit(f, 'avance_registrar', 'proyectos', p.id, { porcentaje: a.porcentaje }, new Date(a.registrado_en.replace(' ', 'T')));
      });
      DB.bitacora.sort(function (a, b) { return a.realizada_en < b.realizada_en ? 1 : -1; });
      DB.seq.bitacora = bid + 100;

      /* integraciones */
      DB.fuentes = S.fuentes.map(function (f, i) {
        var ok = f.activa && f.tipo === 'datos';
        var ult = ok ? fmt(new Date(ahora.getTime() - (3 + i * 5) * 3600000)) : null;
        return Object.assign({}, f, {
          id: i + 1, activa: f.activa ? 1 : 0, ultima_sincronizacion_exitosa: ult, ultimo_estado: ok ? (i === 2 ? 'parcial' : 'exitosa') : null,
          ultimo_intento: ult, ultimos_errores: ok ? (i === 2 ? 3 : 0) : null,
          proxima_sincronizacion: f.frecuencia_minutos && ult ? fmt(new Date(new Date(ult.replace(' ', 'T')).getTime() + f.frecuencia_minutos * 60000)) : null,
          ultimo_mensaje: ok ? (i === 2 ? 'Se importaron 1,248 registros; 3 filas sin colonia se omitieron' : 'Sincronización completa') : null,
        });
      });
      DB.correos = [
        { destinatario: 'maria.lopez@correo.mx', asunto: 'Prepar · Tu proyecto ganó la consulta', estado: 'enviado', intentos: 1, creado_en: fmt(new Date(ahora.getTime() - 50 * 3600000)), enviado_en: fmt(new Date(ahora.getTime() - 50 * 3600000 + 40000)) },
        { destinatario: 'jose.ramirez@correo.mx', asunto: 'Prepar · Confirma tu correo', estado: 'enviado', intentos: 1, creado_en: fmt(new Date(ahora.getTime() - 80 * 3600000)), enviado_en: fmt(new Date(ahora.getTime() - 80 * 3600000 + 30000)) },
        { destinatario: 'valeria.ortiz@prepar.mx', asunto: 'Prepar · Tu cuenta de funcionario', estado: 'enviado', intentos: 1, creado_en: fmt(new Date(ahora.getTime() - 120 * 3600000)), enviado_en: fmt(new Date(ahora.getTime() - 120 * 3600000 + 25000)) },
      ];
    }
    function idsSalOfensiva() { var x = DB.ideas.find(function (i) { return /asco/.test(i.contenido); }); return x ? x.id : null; }
  }

  window.PREPAR_DATOS = { generar: generar, fmt: fmt, fmtDia: fmtDia, FASES_CLAVE: FASES_CLAVE, calendario: calendario, sinAcentos: sinAcentos };
}());
