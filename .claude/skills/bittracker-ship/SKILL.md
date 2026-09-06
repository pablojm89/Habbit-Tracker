---
name: bittracker-ship
description: Flujo de trabajo de BitTracker (PWA de entrenamiento, vanilla JS sin build) para cualquier bug, mejora o feature — reproducir, cambio mínimo, verificar con self-tests + crawl + auditoría, subir versión de caché, documentar, commit y merge a main. Usar SIEMPRE que se toque app.js, styles.css, index.html o sw.js, y cuando Pablo diga "prueba ahora", "arréglalo", "empieza con esto" o pegue capturas del iPhone.
---

# BitTracker — flujo de trabajo con puntos de control

Trabajamos sobre `app.js` (~11k líneas, un solo archivo), `styles.css`, `index.html`,
`sw.js`. GitHub Pages sirve **`main`**; el usuario prueba en iPhone (PWA instalada) y
fuerza el cierre de la app para actualizar. Nada está "hecho" hasta que está en `main`.

## 0. Antes de tocar nada

- [ ] Lee `docs/ESTADO-SESIONES.md` (sección "Cómo trabajar aquí" y el último bloque de
      "Trabajo reciente"). Ahí están la versión actual, el nº de self-tests y las trampas
      conocidas (TDZ, iOS, brace-matching).
- [ ] Localiza el punto exacto con `grep -n` antes de leer bloques grandes. Nunca leas
      `app.js` entero.
- [ ] Si es un bug: **reprodúcelo primero** (ver §1). Si no reproduce en headless, dilo:
      Chromium headless no emula el scroll táctil de iOS ni carga los iconos (CDN
      bloqueado en los probes).

## 1. Reproducir (bugs) / definir (features)

- Bug: escribe un probe en el scratchpad copiando `tools/qa/selftests.js` como plantilla
  (`page.evaluate` con las globales de `app.js`: `state`, `nodes`, `open…Modal()`).
  Punto de control: **el probe falla antes del cambio**.
- Feature: enumera en 3–6 líneas qué verá el usuario y qué datos cambian (`state.*`).
  Si hay dos lecturas razonables que llevan a trabajo distinto, pregunta; si no, decide
  y dilo.

## 2. Cambio mínimo, en rebanadas

- Ediciones con anclas exactas (script Python con pre-check de anclas o `Edit`). Cada
  rebanada: editar → `node --check app.js` → seguir. **Nunca** recortes funciones de
  `app.js` por conteo de llaves (ya truncó el archivo una vez).
- Reglas del código:
  - **TDZ**: toda `const` de nivel superior usada por el render va en el bloque de
    constantes de arriba (cerca de `trainingAnalyticsTabs` / `bodyweightSchemes`). El
    `render()` inicial está al final del archivo y debe seguir ahí.
  - Chips/selectores: resaltado por JS (`.is-selected`) **acotado al fieldset**, nunca
    `:has()` ni clases estáticas.
  - Inputs ≥16px (zoom iOS), checkboxes dibujados (no nativos), un solo scroller en
    cajones (`.modal-body`), sin `backdrop-filter` en cajones móviles, sin `mask-image`
    bajo `backdrop-filter`.
  - Estado nuevo: default en `defaultState` **y** en `normalizeState`, contarlo en
    `stateHasTrainingData` si debe sobrevivir a un restore vacío, alias `weighted_*` →
    id unificado si guarda ids de ejercicio.
  - Textos en español, tono directo, sin anglicismos en la UI.

## 3. Verificar (obligatorio, en este orden)

- [ ] `node --check app.js`
- [ ] **Self-tests**: añade 1–5 asserts al final de `runDenseSelfTests()` para lo nuevo,
      luego `tools/qa/run.sh selftests` → `N/N OK` (N sube con cada feature).
- [ ] `tools/qa/run.sh crawl` → `findings=0`, `tools/qa/run.sh audit` → `findings=0` y
      `tools/qa/run.sh plan` → `issues=0` (dos pasadas) si tocaste plan, tarjeta o formulario.
- [ ] El probe de §1 **pasa** después del cambio. Para UI, una captura a 390×844 y mírala.
- [ ] Si tocaste móvil: revisa desbordes (`scrollWidth > clientWidth`) en el modal.
- Si algo falla, no se maquilla: se arregla o se reporta con la salida.

## 4. Ship

- [ ] Sube el string `?v=…` **a la vez** en `index.html` y `sw.js`
      (formato `AAAAMMDD-tema-NN`, NN correlativo).
- [ ] Docs: `docs/ESTADO-SESIONES.md` (versión, nº de asserts, bloque en "Trabajo
      reciente"); doc del sistema si es nuevo (`docs/<tema>.md`), corto y con nombres de
      funciones para poder hacer `grep`.
- [ ] Commit descriptivo en español (qué ve el usuario + qué cambia por dentro). Sin
      identificadores de modelo en el mensaje.
- [ ] `git push -u origin <rama>` y **fast-forward a main**:
      `git fetch origin main && git merge-base --is-ancestor origin/main HEAD && git push origin HEAD:main`.
      Si no es fast-forward, para y avisa.
- [ ] Mensaje final al usuario: commit y versión en `main`, qué verá (lista corta), qué
      se verificó, qué queda de su lado ("cierra la PWA del todo y reabre").

## Atajos de diagnóstico

- "Sigue pasando" tras un fix → primero comprueba `git log origin/main -1`: casi siempre
  es que no estaba en `main` o que la versión de caché no subió.
- Números absurdos en tarjetas (81 reps/min, holds sin tope) → `denseCapHold`,
  `denseMaxRepsPerMin`, `denseFamilyDifficultyFactor`; mira `denseTargetSource` para
  saber de dónde sale el objetivo.
- Cajón que no desliza en iOS → doble scroller anidado o `overflow` en el `<dialog>`.
