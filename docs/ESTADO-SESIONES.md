# Estado del proyecto — registro de sesiones

Documento vivo para no perder contexto entre sesiones. Resume **qué se ha construido**,
**dónde vive en el código** y **qué queda pendiente**. Complementa los docs del motor
([README-motor.md](README-motor.md), [gestion-cargas.md](gestion-cargas.md),
[motor-transferencias.md](motor-transferencias.md), [anadir-ejercicios.md](anadir-ejercicios.md)).

> App: PWA de entrenamiento (Dense training). Vanilla JS sin build: `app.js` (~9000
> líneas), `styles.css`, `index.html`, `sw.js`. Sincroniza a Google Sheets vía Apps Script.
> Modo training-only (`TRAINING_ONLY = true`). Cache busting: string `?v=…` en `index.html`
> **y** `sw.js` a la vez. **Última versión: `20260713-s1-tiron-vertical-25`.**

## Cómo trabajar aquí (imprescindible)

- **Self-tests**: abrir con `?selftest=1` → `runDenseSelfTests()`. Ahora **65 asserts**.
  Correr siempre tras tocar el motor.
- **Simulación de entrenamiento** (nueva herramienta de QA): 6 semanas × 4 días con un
  atleta sintético que sigue las sugerencias reales de la app vía Playwright+Chromium
  (formulario y guardado reales, red externa bloqueada, capturas por semana). Guion de
  referencia en el scratchpad de la sesión del 12 jul (`sim.js`); reproducir con
  `playwright-core` + chromium local. Detecta objetivos absurdos, inversiones de
  dificultad, NaN/undefined en pantalla y spam de tests.
- **TDZ**: cualquier `const` de nivel superior que use el render debe declararse en el
  bloque de constantes de arriba (cerca de `trainingAnalyticsTabs` / `bodyweightSchemes`).
  Ya nos ha mordido varias veces (la última, `DENSE_RECOVERY_MIN_WELLNESS`).
- **Cache**: subir `?v=…` en `index.html` y `sw.js` juntos en cada cambio de JS/CSS.
- **iOS/WebKit**: nunca `mask-image` en scroll dentro de ancestro con `backdrop-filter`
  (renderiza negro). El `.swipe-wrap` recorta con `overflow:hidden`, así que su
  `border-radius` debe igualar el de la tarjeta (fallo en minimal ya arreglado).
- **styles.css** fue WIP de una sesión paralela de iconos; ya consolidado.
- **Harness de verificación** (para comprobar de verdad, no de memoria): servir la carpeta
  (`localhost:4173`) e iframear en un tab de Chrome MCP a 390px (móvil). Recarga limpia =
  desregistrar el SW + borrar caches + `iframe.src` con `?fresh=<ts>`. Luego `w.eval(...)`
  accede al `state`/funciones del módulo. Inyectar estado sintético SIEMPRE con restauración
  en `finally`. Las claves sensibles (p.ej. `sessions`) se redactan en la salida del eval.
- **Convención self-tests**: los de una fase nueva van AL FINAL de `runDenseSelfTests()`
  (si van en medio, sus marcas sintéticas contaminan los tests del motor posteriores).
- **git push lo hace el usuario.** Commits locales sin subir desde `acbc696` (cierre de
  sesión, deploy .gs `871b9f4`+`ec652fa`, recovery real `e304ecb`).

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

### S1 Tirón vertical — primera sesión de patrón (13 jul 2026)
- 8 altas con veredicto del usuario: `scapular_pull` 0.25 · `pull_up_feet_assisted`
  0.35 · `pull_up_band_assisted` 0.5 · `pull_up_negative` 0.6 · `l_pull_up` 1.1 ·
  `incline_row` 0.6 (`horizontal_pull` nivelada con `ring_row` 1.0) · `lat_pulldown`
  (weighted, vectores id) · `oac_finger_assisted` 0.88.
- Modalidades: `assisted` en pull_up/chin_up (máquina/contrapeso); `oac_assisted`
  renombrada "goma/polea". Arista chin→pull ahora `progresa` (supinas antes).
- Rechazos documentados en `patrones/tiron-vertical.md` (chest-to-bar, typewriter,
  uneven, jackknife, anillas-variante, high pull → S10).
- Fixes de paso: suelo 0.25 en `denseFamilyDifficultyFactor` (regresiones profundas
  hundían el default del hermano duro) y `denseFormTargetHoldPerRound` ya no descarta
  estimaciones de hermana <2s (invertía dificultad vía default). +3 self-tests (65).

### Fase 2 — grafo, asimetría y niveles aprendidos (12 jul 2026, noche)
- **§3.1 Grafo de progresión** (`denseProgressionEdges` + `leverChainEdges`): aristas
  `progresa`/`paralela` declarativas, validador self-testeado
  (`denseProgressionGraphIssues`). Solo UI/semántica; el motor sigue vectorial.
- **§3.2 Asimetría** (`denseDifficultyAsymmetry`): misma familia hacia arriba
  `×(la/lb)^1.5`; no-barra→`weighted` `×0.8`. Solo ruta de fórmula (overrides exentos).
- **§3.3 Exponente aprendido** (`denseFamilyEnduranceExp`): mediana de pares de
  hermanas con tests directos, clamp [1.6, 3.4]; cache re-derivada en cada fold.
- **§3.4 UI "Ruta de progresión"** en detalle de ejercicio: vienes de / siguiente /
  paralelas, nodos navegables con evidencia (directo verde · estimado ámbar · sin datos).
- **Videoteca leída completa** y mapeada → `biblioteca-referencia.md` (backlog fase 3
  priorizado: regresiones dips/dominadas, sissy full ROM, shrimp, curl isquio anillas,
  one-arm toes to bar, muscle up).
- +4 self-tests (62 total) · sim de regresión limpia (114 sets, 0 inversiones, 0 leaks).

### Simulación 6 semanas + fixes (12 jul 2026, tarde)
- **`loadCloudConfig` re-activaba el sync desactivado** al recargar si endpoint/token
  estaban vacíos (rellenaba defaults y forzaba `enabled: true`). Ahora un `enabled: false`
  explícito sobrevive siempre. **Bug de seguridad de datos.**
- **Inversión de dificultad entre hermanas**: `denseLeverSiblingEstimate` elegía la
  hermana con mayor valor escalado (la optimista); ahora manda la de **nivel más
  cercano**. Detectado: cuelgue activo 1 mano (4s) > pasivo 1 mano testeado (3s).
- **Defaults en frío ~2× calientes en 10D/20D**: el factor de esquema de
  `denseDefaultRpm` ({10D: 0.75}) no seguía el modelo de capacidad
  (`bodyweightMultipliers`, ratio 0.55); ahora derivado de él. Además
  `denseColdStartFactor` (×0.7) si la familia entera está sin datos.
- **Tarjeta de test**: hermanas de familia nivelada ya no se sugieren por boosts de su
  propia familia (la estimación determinista ya lo cubre); dedupe 1 por familia; sin
  "objetivo -" cuando no hay target.
- **"10D55 (50 reps)"**: los esquemas con objetivo embebido (10D5) ya no concatenan el
  rpm otra vez (`denseSchemeCode`, aplicado en 4 sitios).
- **Strength momentum vacío** con la ventana cubriendo todo el historial: fallback a
  progresión primera→mejor marca dentro de la ventana.
- **Level-ups desbordaban** a 390px con objetivos largos (CSS `.dc-pr-row`).
- Observaciones para el medio plazo (no tocadas): iconos lucide desde unpkg (sin red no
  hay iconos pese a la PWA); gap de dificultad absoluta entre familias (primer archer
  sugiere 3 rpm aunque el atleta no llegue — se autocorrige tras el primer test);
  transferencias bodyweight→barra (pistol→peso muerto +3%) pendientes de la asimetría
  por dificultad (§3.2 del plan); el boost llega al tope del 12% en ~1 semana de marcas
  buenas dentro de una familia-progresión.

### Niveles de dificultad por familia (12 jul 2026 — plan corto §2 completo)
- **`progressionLevel`** curado en 34 ejercicios de 12 familias (calibrado con el
  usuario: sissy/NLE ~la mitad de reps, 4 negativas OAC ≈ 1 OAC, 60s bilateral ≈ 20s
  a una mano, bridge iso < push-up < walkover). `denseProgressionLevelOf` unifica con
  `leverLevel`; `denseLeverSiblingEstimate` ahora escala TODAS las familias niveladas
  (mata el bug "NLE sugiere sissy como si fuera más fácil" y toda su clase).
- **Defaults en frío honestos**: `denseFamilyDifficultyFactor` (ancla = hermano más
  fácil) escala `denseDefaultRpm` y la semilla de 38s de holds.
- **Higiene tarjeta de test**: fuente fuerte requerida (`DENSE_TEST_MIN_PAIR_C 0.35`)
  y primer test muestra rango "empieza por abajo".
- Observación de calibración `family` solo en primer contacto (si hay historial propio
  en otro bloque → `cross`).
- +5 self-tests (57 total). Detalle en `motor-transferencias.md` §9.5 y plan en
  `plan-progresiones-y-catalogo.md`.

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

### Codex — verificados, aún por hacer (viven también en PLAN-MAESTRO)
- **#2 Columnas de `DenseTraining` en el `.gs` — HECHO (11 jul 2026).** `871b9f4` añade 8
  columnas (`schema_version`, `target_total_hold_seconds`, `rom_cm`, `assist_load_kg`,
  `readiness`, `is_test`, `ladder_planned`, `ladder_actual`) a fila+cabecera (verificado
  alineado 58=58). **Desplegado a script.google.com como "Versión 4 del 11 jul 2026"** en
  la implementación existente (mismo ID `AKfycbxbs5_ucjo9cf_iSsxYE…`, endpoint sin cambios).
  El editor Monaco se editó por `setValue` con edits de string deterministas (mismas 11
  sustituciones que el commit) y se verificó char-length + región byte-idéntica. Prueba de
  vida sin token → `{"ok":false,"error":"unauthorized"}` (fail-closed OK). Las columnas
  nuevas se poblarán en la próxima sincronización (rewrite completo de la hoja).
- **#3 Recovery real — HECHO (11 jul 2026).** `e304ecb`: `recPct` ya no es 0 fijo.
  `denseRecoveryTrendPct(days)` compara la media de recuperación (solo días con marca, los
  de descanso no diluyen) de la ventana reciente vs la anterior. Recovery es un nivel, no un
  acumulado → sin baseline previo devuelve 0 (nunca +100% espurio); sin señales de wellness
  todo queda en base 60 → 0% (plano honesto). Self-test nuevo (52/52).
  Versión `20260711-recovery-real-21`.
- **#5 Extraer `engine.js`**: el monolito `app.js` (~9.9k líneas) provoca TDZ recurrentes;
  separar el motor puro (curvas, transferencias, calibración) en su módulo. Adelantado del plan.
- **#6 Micro-UX**: pulir presentación del campo "Peso corporal kg" en modo lastre
  (no es redundante — hace falta para `carga total = BW + lastre` — es cuestión de UI).

### Backlog / higiene
- **Token de Sheets** hardcodeado en `app.js` (líneas ~4-5): ocultar / rotar; el repo debe
  seguir privado. El usuario lo sabe (deprioritizado). Idea: pantalla de config para el token.
- Rename de marca "Habbit Tracker" (pendiente antiguo).
- **Purga legacy de hábitos**: `records`/`habits`/`mesocycle`/`trainingLogs` aún alimentan
  renders ocultos que corren en cada `render()`; purga total diferida a Fase 6.
- Otras ideas: onboarding de calibración, cronómetro de descanso auto.

### Fases 5–6 del plan maestro (siguientes)
- **Fase 5 — planificación ligera**: plantillas de día sobre `denseDayPlans` v2, rotación
  sugerida desde el balance por patrón. (`denseDayPlans` v2 + nature en plan ya preparados.)
- **Fase 6 — infra**: `engine.js`, IndexedDB, onboarding, purga total del legacy de hábitos.
- Antes de la Fase 5: el usuario quería **entrenar unos días** con lo ya hecho y validarlo en real.

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
- 52/52 self-tests en verde.
- Móvil "no carga bien" resuelto: era deploy de GitHub Pages + de paso lucide fijado y SW cache-first.
