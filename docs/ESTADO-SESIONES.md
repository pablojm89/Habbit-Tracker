# Estado del proyecto — registro de sesiones

Documento vivo para no perder contexto entre sesiones. Resume **qué se ha construido**,
**dónde vive en el código** y **qué queda pendiente**. Complementa los docs del motor
([README-motor.md](README-motor.md), [gestion-cargas.md](gestion-cargas.md),
[motor-transferencias.md](motor-transferencias.md), [anadir-ejercicios.md](anadir-ejercicios.md)).

> App: PWA de entrenamiento (Dense training). Vanilla JS sin build: `app.js` (~9000
> líneas), `styles.css`, `index.html`, `sw.js`. Sincroniza a Google Sheets vía Apps Script.
> Modo training-only (`TRAINING_ONLY = true`). Cache busting: string `?v=…` en `index.html`
> **y** `sw.js` a la vez. **Última versión: `20260707-unify-weighted-20`.**

## Cómo trabajar aquí (imprescindible)

- **Self-tests**: abrir con `?selftest=1` → `runDenseSelfTests()`. Ahora **51 asserts**.
  Correr siempre tras tocar el motor.
- **TDZ**: cualquier `const` de nivel superior que use el render debe declararse en el
  bloque de constantes de arriba (cerca de `trainingAnalyticsTabs` / `bodyweightSchemes`).
  Ya nos ha mordido varias veces (la última, `DENSE_RECOVERY_MIN_WELLNESS`).
- **Cache**: subir `?v=…` en `index.html` y `sw.js` juntos en cada cambio de JS/CSS.
- **iOS/WebKit**: nunca `mask-image` en scroll dentro de ancestro con `backdrop-filter`
  (renderiza negro). El `.swipe-wrap` recorta con `overflow:hidden`, así que su
  `border-radius` debe igualar el de la tarjeta (fallo en minimal ya arreglado).
- **styles.css** fue WIP de una sesión paralela de iconos; ya consolidado.

## Sistemas grandes (base sólida)

- **Modelo Dense**: esquemas 2D/5D/10D/20D (peso corporal) y 2D5/5D5/10D3… (con carga).
  `denseWorkingPct`, curva continua reps↔%1RM (`denseBaseCurve`, `densePctForReps`).
- **e1RM efectivo** (`computeDenseEntry`): sale de la densidad realmente hecha, no del %
  nominal. Un fallo baja el e1RM (nada de PRs falsos). Clamp `[0.5,1.3]×nominal`.
- **Motor de transferencias**: vectores patrón+músculo por familia, coeficiente
  `denseTransferCoefficient`, propagación con topes, reconciliación que aprende `pairK`,
  fold determinista `rebuildTransferState`. Todo re-derivable del historial.
- **Fatiga por patrón** (push/pull/legs), **readiness** (Flojo/Normal/Fuerte),
  **progresión** conservadora por esfuerzo, **memoria por bloque/esquema**.
- **Sync Sheets endurecido** (`google-sheets-apps-script.gs`): gzip+chunking, auth
  fail-closed, LockService, hojas de transferencias. Auto-restore al arrancar vacío.

## Trabajo reciente por tema (con commits)

### Almacenamiento y bugs base
- `bb36f7f` Apps Script endurecido (compresión, auth fail-closed, lock).
- `d06d4da` Fix picker en negro (iOS) + memoria de progresión por bloque.
- `2353c4f` / `08e498e` Memoria por **esquema exacto** en cargas + estimaciones honestas
  cuando el bloque no tiene historial (`denseEstimatedLoadSuggestion`).
- `23b547b` e1RM efectivo: los fallos recalibran al instante.
- `8618f72` Fix estrella de favorito que no se actualizaba en el picker.

### Motor / relaciones entre ejercicios
- `46717c8` Selector de **modalidad** en el formulario (conectado a `allowedNatures`;
  antes era metadata muerta). Permite alternar bodyweight ↔ con peso, etc.
- `0549ee1` Unificado el esquema por defecto (tarjeta, formulario y sugerencia de test
  coinciden): `denseDefaultScheme`.
- `b49b971` La movilidad **no transfiere** entre familias distintas (solo misma familia).
- `4d243bd` Guard reforzado (409 pares espurios a 0) + **bíceps/tríceps en anillas 45º**.
- `aec59ab` Dos transferencias sobreestimadas corregidas: back-lever-pull ya no fuga a
  empuje; handstand↔cuelgue capado (`denseFamilyPairOverrides`).

### Catálogo de ejercicios
- `beb4712` Progresiones L-Sit, Side Split, Pancake (agrupadas, movilidad).
- `4d243bd` Curl/extensión de tríceps en anillas 45º.
- `eaf068c` **ROM (rango) para movilidad**: cm al suelo/objetivo, menos es mejor,
  desacoplado del motor de fuerza. PR = más cerca del suelo; sparkline en el detalle.
- `6d4f794` **One Arm Chin-up**: archer, negativa, asistida, OAC. Nueva modalidad
  **`assisted`**: el contrapeso resta peso (`carga = bw − contrapeso`, aprox. por fricción);
  la progresión baja el contrapeso hacia la OAC completa.

### UX / flujo "qué hago hoy y por qué" (auditoría)
- `7add4f1` **Set al fallo semanal**: tocar el fuego de un patrón → picker de básicos →
  formulario preconfigurado al fallo (esfuerzo "fallo", reps objetivo estimadas).
- `bc1ccae` **Tests pendientes** en desplegable por prioridad (audit #5).
- `9c0e6c7` Fix esquinas recortadas de tarjetas en modo minimal.
- `a32829c` Limpieza del experimento de iconos + iconos curados por patrón.
- `76053ca` **(audit #1)** Tarjeta planificada con badge de **fuente + confianza**
  (Directo / Desde 5D10 / Transferencia / Estimado / Primer test) y **peso objetivo**
  en ejercicios con carga. `denseTargetSource`.
- `3a83bd4` **(punto crítico)** Eliminado el panel "register" muerto.
- `64d7ca4` **(audit #2 + #6)**: Recovery se oculta sin 3+ check-ins de wellness;
  "abandonados" solo con marcas previas; gráfica de fuerza anclada a unidades reales;
  badge "NEW PR" vs "PR + margen"; PR lab con "reales" vs "estimado · no testeado".

## Pendiente

### Backlog / higiene
- **Push**: subir todos los commits de la sesión (el usuario hace el push).
- **Token de Sheets** hardcodeado en `app.js` (líneas ~4-5): ocultar / rotar; el repo debe
  seguir privado. El usuario lo sabe.
- Rename de marca "Habbit Tracker" (pendiente antiguo).
- Otras ideas: red de seguridad de datos (try/catch en `saveState`, snapshots con fecha),
  onboarding de calibración, cronómetro de descanso auto.

### Fases 1–4 del plan maestro (jul 2026) — hechas
- `b19e786`/`aeba24f` Fase 1: saveState con try/catch + push forzado a nube en fallo de
  cuota; `lastCloudSyncAt` + indicador "última copia hace X" en Backup; `schema_version:3`;
  badge EXR (hábitos) → sets de hoy. Snapshots con historial ya existían en el .gs.
- `66e18f6` Fase 2: `denseDayPlans` v2 (objetos, normalizador perezoso `densePlanItem`);
  modo test end-to-end (`is_test`: auto por fuente, toggle en form, fatiga a la mitad,
  badge en tarjeta); rangos en tarjeta (`densePlannedTargetRange`, sigma expuesta en
  `denseTargetSource`); deload tras 4 duras sin PR (`denseStagnationInfo`+`denseMaybeDeload`).
- Convención nueva: los self-tests de una fase van AL FINAL de la suite (contaminaban
  tests posteriores con marcas sintéticas).
- `c890c2b` Fase 3: Analytics 7→5 pestañas (Consistency→Progreso con racha+heatmap;
  Conditioning disuelta — su CNS estaba triplicada; minutos/TUT→Volumen); resumen del
  día con **split por patrón semanal** (`densePatternSplitHtml`, audit #3 cerrado) y
  tonelaje degradado a texto secundario; **PR timeline** (12 semanas) en PR lab.
- `fd2c3c9` **Levers por palanca**: `leverLevel` en cada progresión; `denseLeverSiblingEstimate`
  escala capacidad entre niveles (curva ^2.2). Tuck 30s → estima cada nivel hasta full.
  Fuente "family" en tarjeta, auto-test, tarjeta y formulario alineados (mismo resolvedor).
- `deb5a84` Fase 4: **sigma empírica** (`denseCalibrationObservations` deriva del historial
  el error real de cada primera-marca-en-esquema; con ≥4 obs, `denseEmpiricalSigma`
  sustituye la fórmula en `denseTargetSource` — "error real ±X% (N tests)" en el form) y
  **curva personal** (`denseCurveSlopeBias`: pendiente log-log rpm↔e1RM efectivo por
  ejercicio, clamp ±0.15, corrige `denseEstimatedLoadSuggestion` — caso bench 5D10→5D5).
  Toggle de test dinámico al cambiar de esquema en el form.

### Unificación de ejercicios con lastre (Codex, jul 2026)
- `c5d9e2b` fix scroll del picker móvil (`overflow-y:auto` en la regla del modal; la media
  query lo ponía a `visible`).
- `bfd9a2e` **Un ejercicio por biomecánica**: eliminados los 4 gemelos `weighted_*`
  (pull_up/ring_dip/parallel_bar_dip/atg_split_squat) — la base ya tenía la modalidad.
  `denseExerciseAliases` + resolución en los getters + `denseMigrateUnifiedExercises`
  (idempotente en `normalizeState`) reescribe marcas/planes/favoritos históricos al id base.
  La estimación de lastre cae a `denseUnifiedE1rm` desde marcas BW (ya no sale "-"), y
  `applyDenseFormTargets` respeta la modalidad elegida (leía sólo el id, no `nature`).
  Los planes del día llevan `nature`. **Al arrancar con tus datos, los `weighted_*` viejos
  migran solos** (RawState los conservaba).

## Estado actual conocido
- 51/51 self-tests en verde.
- Móvil "no carga bien" resuelto: era deploy de GitHub Pages + de paso lucide fijado y SW cache-first.
