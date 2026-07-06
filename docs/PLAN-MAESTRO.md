# Plan maestro — BitTracker como app definitiva de entrenamiento

> Escrito tras revisar el estado real: `app.js` (9.384 líneas), `styles.css` (7.306),
> `google-sheets-apps-script.gs` (536, 11 hojas), docs del motor, y el historial de
> ~30 commits de las últimas sesiones. No es un plan para una app imaginaria.

---

## 1. Diagnóstico general

**El motor va por delante del producto.** Lo difícil ya está construido y es raro
encontrarlo en apps comerciales: curva continua reps↔%1RM entre esquemas Dense, e1RM
efectivo que se recalibra con fallos, transferencias entre ejercicios con coeficientes
aprendibles (`pairK`), memoria por esquema exacto, autorregulación por fatiga de patrón y
readiness, fuente+confianza en cada objetivo, ROM para movilidad, modalidad asistida por
contrapeso. Y con 34 self-tests que lo blindan.

**Lo que va por detrás:**
1. **La capa de datos es la más frágil** (localStorage sin try/catch, snapshot único en
   Sheets que se pisa, token en cliente, sin migraciones de schema).
2. **Residuo de la era habit-tracker**: `state.mesocycle` es una demo hardcodeada
   (`mesocycleDefault`, "summer-base-1", ejercicios con RIR que no existen en el catálogo
   Dense), y `habits`, `records`, `trainingLogs`, `dayNotes` viajan en cada snapshot
   aunque `TRAINING_ONLY = true`. Es peso muerto y fuente de confusión.
3. **La planificación no existe de verdad**: `denseDayPlans` guarda solo arrays de ids de
   ejercicio por fecha. No hay dónde colgar "esquema planificado", "es un test", ni
   plantillas semanales. Todo lo de "rutinas" que se quiera construir chocará con esto.
4. **Monolito de 9.4k líneas**: el motor (puro, testeable) vive mezclado con el render.
   Los bugs TDZ recurrentes son el síntoma.

## 2. Problemas principales actuales (por orden de daño)

1. **Riesgo de pérdida/corrupción de datos**: `saveState` sin try/catch (cuota de
   localStorage en iOS = fallo silencioso); la nube guarda solo el último snapshot (un
   estado corrupto pisa el bueno; el harness de pruebas ya lo hizo una vez); sin
   export automático periódico.
2. **`denseDayPlans` demasiado pobre** para cualquier futuro de planificación.
3. **Legacy habit-tracker** inflando snapshots y el código de render.
4. **Sin marca de "test"**: cuando intentas un objetivo estimado y fallas, el motor ya
   recalibra (e1RM efectivo), pero la sesión cuenta como "fallo" para fatiga/progresión
   igual que un fallo real de un peso conocido. Conceptualmente son cosas distintas.
5. **Sin registro de calidad técnica ni reps por lado reales** (unilaterales: `repsPerSide`
   existe como flag del catálogo pero el total es ambiguo).
6. **Analytics aún con grasa**: 7 pestañas (Recovery ya condicional), CNS con unidad
   inventada 0–100, Consistency casi vacía de decisión.
7. **Monolito** — coste creciente de cada cambio.

## 3. Visión de app definitiva

**"Un entrenador de bolsillo que aprende de tus datos."** Cada pantalla responde una sola
pregunta:

- **Workout** → *¿qué toca hoy, con qué objetivo, por qué, y cuánto me fío?*
- **Detalle de ejercicio** → *¿qué evidencia hay detrás de ese número?*
- **Analytics** → *¿estoy progresando, estancado o pasándome?*
- **PR lab** → *¿qué he demostrado de verdad y qué es extrapolación?*

**Diferenciadores reales** (mantener y profundizar):
- El sistema de esquemas Dense con conversión honesta entre bloques.
- Transferencias calistenia↔lastre↔skills con confianza explícita — ninguna app lo tiene.
- Autorregulación integrada (fallo semanal por patrón, fatiga, readiness) en vez de
  planes rígidos.
- Local-first, tus datos en tu Sheets, sin suscripción ni nube obligatoria.

**Qué evitar (criterios de rechazo):**
- Métricas que no cambian una decisión de entrenamiento (el tonelaje global mezcla
  modalidades: degradarlo, no ampliarlo).
- Gamificación vacía (XP/niveles del residuo habit — fuera).
- Dependencia de IA externa en runtime: el aprendizaje debe ser estadística local
  (EMA, pairK, sigmas empíricas), reproducible y explicable.
- Planificación rígida tipo "programa de 12 semanas": tu estilo es registro libre +
  sugerencia; la planificación debe ser una capa opcional encima, nunca una jaula.
- Más pestañas. La app ya enseña de más; el trabajo es jerarquía, no superficie.

**Principios de decisión:** (1) cada número visible lleva fuente y confianza; (2) el motor
nunca miente para motivar (e1RM efectivo antes que PRs falsos); (3) registrar un set debe
costar < 15 segundos; (4) todo estado derivado se re-deriva del historial (patrón
`rebuildTransferState`); (5) los datos del usuario sobreviven a cualquier bug de UI.

## 4. Arquitectura funcional recomendada

Cuatro capas (hoy mezcladas en `app.js`):

1. **Captura** — formulario del set, picker, timers. Ya bien resuelta.
2. **Motor** (puro, sin DOM): curva, e1RM, estimaciones, transferencias, progresión,
   fatiga. *Meta a medio plazo:* extraerlo a `engine.js` (módulo ES nativo, sin build)
   con `app.js` importándolo. Mata los TDZ, permite testear con node directamente, y
   es el prerequisito barato de todo lo demás. No urgente, sí importante.
3. **Presentación** — renders + tarjetas. Se queda en `app.js`.
4. **Persistencia** — local-first (localStorage hoy; IndexedDB solo si el historial
   crece a miles de marcas), Sheets como espejo/backup versionado, backend real
   **solo si** algún día hay multi-dispositivo en tiempo real. No antes.

## 5. Modelo de datos recomendado

**La entrada de entrenamiento ya es rica** (objetivo vs real, esfuerzo, readiness,
fallo, ROM, asistencia, e1RM efectivo, tonnage). Añadir poco y con criterio:

```js
// añadir a cada entry (retrocompatible, opcionales):
schema_version: 3,          // versionado por entrada, no global
is_test: false,             // sesión de test/calibración (ver §6)
technique_quality: null,    // 1 limpio · 2 aceptable · 3 sucio (opcional, 1 tap)
reps_left / reps_right: null, // solo unilaterales, si difieren del total/2
plan_ref: null,             // id del plan/plantilla que la originó
```

**`denseDayPlans` v2 (el cambio estructural que desbloquea la planificación):**
```js
// hoy:    { "2026-07-05": ["bench_press", "pull_up"] }
// futuro: { "2026-07-05": [{ exercise_id, scheme?, target?, is_test?, source: "manual"|"template"|"suggestion" }] }
```
Migración perezosa: si el elemento es string, se trata como `{exercise_id}`.

**Purga legacy:** eliminar `mesocycleDefault` y las claves `habits`, `records`,
`trainingLogs` del estado activo (export previo a un JSON de despedida). El calendario
semanal/carousel no los necesita — ya se alimenta de `denseTrainingEntries`.

**Sheets:** mantener las 11 hojas; cambiar RawState de "snapshot único" a **últimos N
snapshots con fecha** (p. ej. 10) — restaurar elige el más reciente válido; un estado
corrupto ya no destruye el bueno.

## 6. Sistema de progresión recomendado

Lo esencial ya está y está bien calibrado. Refinar, no rehacer:

1. **Modo test explícito** (`is_test`): cuando el objetivo viene de estimación/
   transferencia con confianza < alta, la tarjeta ya lo dice — el paso que falta es que
   al abrir ese set, el formulario lo marque como test. Consecuencias: un "fallo" en
   test **no** dispara el back-off de fatiga del patrón con la misma dureza (fue
   exploración, no sobreesfuerzo planificado), no rompe rachas de progresión, y sí
   recalibra (eso ya lo hace el e1RM efectivo). Es la pieza que une audit #4 con el motor.
2. **Rangos en la tarjeta** cuando la fuente no es directa: "92 kg (87–97)" usando la
   sigma que ya existe. En el modal ya está; falta en la tarjeta del workout.
3. **Doble progresión explícita para lastre**: hoy la sugerencia sube carga %.
   Añadir la alternativa "sube 1 rep/min antes que carga" cuando el esquema lo permita,
   y que el usuario elija su sesgo (carga-primero vs densidad-primero) por ejercicio.
4. **Deload sugerido**: si un ejercicio acumula N sesiones H/VH/fallo sin PR (p. ej. 4),
   sugerir explícitamente "-10% y reconstruye" en la tarjeta de recomendación. La señal
   ya existe en los datos; solo falta la regla y la frase.
5. **No hacer**: periodización automática por bloques. Contradice el estilo
   registro-libre + autorregulación. La rotación de énfasis puede sugerirse desde el
   balance semanal, no imponerse.

## 7. Sistema de aprendizaje recomendado

Ya hay 3 mecanismos locales (EMA 70/30 por esfuerzo, pairK de transferencias con
reconciliación 2-observaciones, e1RM efectivo). Los siguientes pasos, todos estadística
local sin IA externa:

1. **Sigma empírica** (el de más valor): hoy la confianza sale de una fórmula fija
   (`denseEstimateSigma`). Guardar, por cada estimación que luego se testea, el error
   real `|predicho − real| / real` en un log (`state.calibrationLog`, derivable).
   Con ≥5 observaciones, la sigma mostrada pasa a ser tu percentil-80 empírico por tipo
   de fuente (mismo-bloque / cruzado / transferencia). La app aprende *cuánto se
   equivoca contigo* en vez de asumirlo.
2. **Curva personal por ejercicio**: el caso bench 5D10→5D5 demostró que la curva
   genérica puede ser optimista para ti. Con ≥2 pares (esquema, e1RM efectivo) del mismo
   ejercicio a distintas reps, ajustar un bias multiplicativo de pendiente por ejercicio
   (clamp ±15%). Es una regresión de 2 puntos, no ML.
3. **Decay de confianza ya existe** (staleness en sigma) — suficiente.
4. **Regla de oro**: todo aprendizaje debe ser (a) re-derivable del historial,
   (b) explicable en una frase en la UI, (c) con clamps duros. Igual que pairK.

## 8. Rediseño de pantallas recomendado

Poca cirugía; es afinado de jerarquía:

- **Workout (principal)**: ya casi ideal tras el audit. Pendiente: degradar el tonelaje
  del resumen del día a secundario y mostrar **sets por patrón** (empuje/tirón/pierna)
  como métrica cabecera — es la que cambia decisiones. Rangos en tarjetas estimadas (§6.2).
- **Detalle de ejercicio**: ya fuerte (historial, estimaciones con rango, transferencias,
  técnica, ROM). Añadir mini historial por esquema (tus últimos 3 del bloque elegido)
  y el botón "testear esto" que abra el set en modo test.
- **Analytics: de 7 a 5 pestañas.** Progreso (fusionando lo único útil de Consistency:
  racha + heatmap), Volumen (por patrón, no global), Fuerza (ya anclada a unidades
  reales), Balance, Recovery (condicional, ya hecho). Conditioning: fusionar su gráfica
  CNS en Recovery y eliminar la pestaña; su unidad 0–100 inventada no gana decisiones.
- **PR lab**: correcto tras separar real/estimado. Añadir timeline de PRs (fecha → PR)
  como única gráfica nueva justificable.
- **Minimal**: la regla es "solo lo accionable": nombre, esquema, objetivo, fuente.
  Ya casi cumple.
- **Navegación**: 3 pestañas actuales + modales están bien. No añadir pestañas.

## 9. Roadmap por fases

> Cada fase es pequeña, no rompe lo anterior, y pasa por: `node --check`, suite
> `?selftest=1` (ampliándola), prueba manual en harness móvil, bump de versión SW.

### Fase 1 — Fiabilidad de datos (1-2 sesiones) ⭐ la más importante
- **Objetivo:** que ningún bug ni límite de cuota pueda costarte historial.
- **Cambios:** try/catch + aviso en `saveState`; snapshots con fecha (N=10) en RawState
  (.gs `appendSnapshot`/`latestSnapshot`); indicador "última copia hace X" en Backup;
  purga del legacy habit (mesocycleDefault, habits, records, trainingLogs) con export
  de despedida; `schema_version` en entradas nuevas.
- **Zona:** `saveState`/`loadState`/`mergeState` (~5400-5500), `google-sheets-apps-script.gs`,
  render del hero/trainingCard que aún lee legacy.
- **Riesgos:** el purge toca renders que leen `state.records` (hero, calendar) — hacerlo
  con grep exhaustivo y probar todas las vistas; redeploy del .gs (proceso ya conocido).
- **Notarás:** nada visible — y exactamente esa es la señal de éxito. Más un "backup ✓ hace 2h".

### Fase 2 — Progresión redonda (1-2 sesiones)
- **Objetivo:** cerrar audit #4 y el modo test.
- **Cambios:** `is_test` end-to-end (§6.1); rango en tarjeta cuando fuente ≠ directa;
  deload sugerido tras estancamiento; `denseDayPlans` v2 (necesario para marcar un plan
  como test).
- **Zona:** `denseTargetSource`, `plannedWorkoutCard`, `saveDenseTrainingForm`,
  `denseGroupFatigueWarning`, `addPlannedExerciseToSelectedDate`.
- **Riesgos:** migración de denseDayPlans (perezosa, con self-test).
- **Notarás:** "92kg (87–97) · test" en la tarjeta; los tests fallidos dejan de
  penalizarte la semana.

### Fase 3 — Analytics con menos y mejor (1 sesión)
- **Objetivo:** cada pestaña responde una pregunta.
- **Cambios:** 7→5 pestañas (fusión Consistency→Progreso, Conditioning→Recovery);
  tonelaje degradado + sets por patrón en el resumen del día (audit #3); timeline de PRs.
- **Zona:** `trainingAnalyticsTabs`, `renderMesocycle` (resumen), renders de analytics.
- **Riesgos:** bajos; cuidado con `state.settings.trainingAnalyticsTab` guardada (clamp ya existe).
- **Notarás:** el resumen del día habla de patrones, no de toneladas; menos ruido.

### Fase 4 — Aprendizaje profundo (2 sesiones)
- **Objetivo:** que la confianza mostrada sea la TUYA.
- **Cambios:** `calibrationLog` derivable + sigma empírica por tipo de fuente (§7.1);
  bias de curva personal por ejercicio (§7.2); exponerlo: "confianza alta (±4% en tus
  últimos 6 tests)".
- **Zona:** `denseEstimateSigma`, `denseTransferStep`/reconciliación, estimate cards,
  self-tests nuevos.
- **Riesgos:** medio — es motor; hacerlo con fold re-derivable y clamps como siempre.
- **Notarás:** los rangos se estrechan donde aciertas y se ensanchan donde no.

### Fase 5 — Planificación ligera (2-3 sesiones)
- **Objetivo:** plantillas sin jaula.
- **Cambios:** plantillas de día nombradas ("Empuje A") que rellenan denseDayPlans v2;
  sugerencia semanal de rotación desde el balance (no automática); días test/deload
  como tipo de día; **eliminar del todo el mesociclo demo** y, si se quiere fase/bloque,
  un simple `state.cycle = {name, focus, startDate}` conectado a datos reales.
- **Zona:** picker (guardar como plantilla), `plannedExercisesForDate`, weekly cards.
- **Riesgos:** scope creep — resistir la periodización completa.
- **Notarás:** montar tu día habitual en 2 taps; la semana te propone qué patrón toca.

### Fase 6 — Sistema completo (cuando duela, no antes)
- **Objetivo:** escala y apertura.
- **Cambios:** extraer `engine.js` (módulos ES, si no cayó antes); IndexedDB si el
  historial supera ~2-3k marcas; onboarding de calibración (los 6+4 tests como flujo
  guiado); export/import completo con versionado; evaluar backend real solo si aparece
  multi-dispositivo simultáneo.
- **Riesgos:** migración de storage — hacerla con doble escritura temporal.
- **Notarás:** app instantánea con años de historial; alta desde cero en 20 minutos.

## 10. Próximas 10 acciones priorizadas

1. `saveState` con try/catch + toast de error (30 min, riesgo 0, protege todo).
2. Snapshots con fecha (N=10) en RawState + restaurar-el-último-válido (.gs + app).
3. Indicador "última copia hace X" en el modal Backup.
4. Purga del legacy habit-era (mesocycleDefault, habits, records, trainingLogs) con
   export de despedida.
5. `denseDayPlans` v2 (objetos con scheme/target/is_test/source, migración perezosa).
6. `is_test` end-to-end: badge → formulario → guardado → fatiga suavizada.
7. Rangos en la tarjeta del workout cuando la fuente no es directa (audit #4).
8. Resumen del día: sets por patrón como cabecera, tonelaje secundario (audit #3).
9. Analytics 7→5 pestañas (fusiones, no borrados de datos).
10. Sigma empírica desde `calibrationLog` (la app aprende su propio error).

---

*Actualizar este documento al cerrar cada fase. Estado y convenciones de trabajo en
[ESTADO-SESIONES.md](ESTADO-SESIONES.md).*
