# FrontPrepar · Demostración del front de Prepar

Esta carpeta es **solo el front** de Prepar (simulador del Presupuesto Participativo de la CDMX, Equipo 04), listo para publicarse en **GitHub Pages**. No necesita Node.js, MySQL ni servidor: todas las respuestas de la API se simulan en el navegador con datos de ejemplo.

Ya viene lleno: ideas en el foro con comentarios y apoyos, proyectos registrados y dictaminados, boletas, votos y resultados, proyectos en el mapa, avances de obra, reportes de Foto Denuncia con fotos, calificaciones, avisos, notificaciones, usuarios, estadísticas y bitácora.

## Publicarlo en GitHub Pages

1. Crea un repositorio nuevo en GitHub (por ejemplo `FrontPrepar`), público.
2. Sube **el contenido** de esta carpeta a la raíz del repositorio (que `index.html` quede en la raíz, junto a las carpetas `css`, `js`, `img`…). Puedes arrastrar los archivos en «Add file → Upload files» o usar Git:
   ```bash
   cd FrontPrepar
   git init
   git add .
   git commit -m "Front de Prepar con datos de ejemplo"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/FrontPrepar.git
   git push -u origin main
   ```
3. En el repositorio entra a **Settings → Pages**. En «Build and deployment» elige **Deploy from a branch**, rama **main** y carpeta **/ (root)**. Guarda.
4. Espera uno o dos minutos. La página queda en `https://TU_USUARIO.github.io/FrontPrepar/`.

Funciona con cualquier nombre de repositorio y también abriendo `index.html` directamente en tu computadora.

## Cómo enseñarlo

- En la esquina inferior izquierda está el botón **Demostración**. Desde ahí:
  - **Entrar como**: María López (ciudadana de Clavería, Azcapotzalco), Carlos Méndez (funcionario de Azcapotzalco), Lucía Torres (funcionaria de Coyoacán) o el Administrador. No piden contraseña.
  - **Fase del ciclo (1 a 8)**: cambia en qué momento está el ciclo y los datos se ajustan solos.
  - **Restablecer datos**: borra lo que hayas publicado durante la demostración.
- En la página de inicio de sesión también aparecen las cuentas de ejemplo.

Recorrido sugerido:

| Fase | Qué enseñar |
|---|---|
| 2 · Diagnóstico y Registro | Foro vecinal (publicar idea, apoyar, comentar) y registro de proyecto con folio automático. |
| 3 · Dictaminación | Como funcionario: dictaminar proyectos con los 8 criterios. Como ciudadana: el dictamen en «Mis proyectos». |
| 4 · Sorteo y Difusión | Como funcionario: sortear la boleta de San Álvaro. Como ciudadana: ver la boleta. |
| 5 · Consulta | Como ciudadana: votar y descargar el comprobante en PDF. Como admin: resumen de la votación. |
| 6 · Resultados | Proyectos ganadores en el mapa, resultados por colonia y el empate resuelto por asamblea. |
| 7 · Ejecución y Seguimiento | Avance de obras, galería de fotos, Foto Denuncia y respuestas del funcionario. (Fase por defecto.) |
| 8 · Evaluación | Calificar del 1 al 5 el proyecto de la colonia. |

## Qué es de ejemplo

- Todos los nombres de ciudadanos, proyectos, ideas, votos y reportes son **ficticios**. Los catálogos (alcaldías, unidades territoriales, fases, rubros, criterios y directorio) vienen de la base de datos del proyecto.
- Lo que publiques se guarda **solo en tu navegador** (localStorage); nadie más lo ve.
- Las imágenes de los proyectos son ilustraciones de muestra (`img/demo/`).
- El mapa usa OpenStreetMap, así que necesita internet.
- No hay correos, Google ni captcha: esas partes dependen del servidor.

## Qué se agregó al front original

| Archivo | Para qué |
|---|---|
| `js/demo-semilla.js` | Catálogos tomados de `bd/prepar_bd_mysql.sql`. |
| `js/demo-datos.js` | Genera los datos de ejemplo según la fase. |
| `js/demo.js` | Sustituye al servidor: responde cada llamada a `/api/...` con las mismas formas que el backend de Express. |
| `js/demo-pdf.js` | El generador de PDF del servidor (`server/lib/pdf.js`) adaptado al navegador, para el comprobante y el reporte. |
| `js/demo-panel.js` | El botón «Demostración» y las cuentas de ejemplo del inicio de sesión. |
| `img/demo/` | Ilustraciones de proyectos, fotos de reportes y la convocatoria en PDF. |

Además, las rutas de los archivos se cambiaron de absolutas (`/css/app.css`) a relativas para que funcionen dentro de la subcarpeta de GitHub Pages. Todo lo demás (HTML, CSS, páginas y lógica de la interfaz) es el front original.

> Prepar es un simulador con fines académicos. No es un sitio oficial del Instituto Electoral de la Ciudad de México (IECM).
