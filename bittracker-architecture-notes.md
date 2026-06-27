# BitTracker Architecture Notes

## Objetivo

BitTracker puede seguir creciendo, pero las reglas importantes deben vivir fuera de la memoria del chat. Este documento fija las decisiones que no conviene romper al separar la app en módulos.

## Invariantes Dense

- `scheme` representa el esquema intentado, no el resultado derivado.
- `target_reps_per_min` representa el objetivo por minuto/set. Ejemplo: en `5D` con objetivo 9, el intento visible es `5D9`.
- `target_total_reps` representa el total planificado. Ejemplo: `5D9 = 45 reps`.
- `total_reps` representa el total real conseguido y es editable manualmente.
- `missed_reps = max(0, target_total_reps - total_reps)`.
- Una marca fallida conserva el intento. Ejemplo: si intento `5D9` y hago 40 reps, se guarda como objetivo `5D9`, resultado `40/45`, no como `5D8`.
- En isometricos, `hold_seconds_per_round` y `total_hold_seconds` son la fuente principal; las reps pueden quedar a cero.
- En calistenia lastrada, `added_load_kg` es el lastre visible y `total_system_load_kg = bodyweight_kg + added_load_kg`.
- En mancuernas, `weight_per_dumbbell_kg` se guarda separado y `external_load_kg` puede calcularse como par total.

## Separacion Recomendada

Cuando la pantalla de entreno este estable, conviene pasar de `app.js` monolitico a ES modules:

- `src/state.js`: estado, persistencia local, migraciones y helpers de fechas.
- `src/cloud/google-sheets.js`: configuracion, payloads y sincronizacion.
- `src/dense/catalog.js`: ejercicios, categorias, naturalezas y esquemas permitidos.
- `src/dense/formulas.js`: e1RM, capacidad, tonnage, TUT, PR score y estimaciones cruzadas.
- `src/dense/training-log.js`: crear, editar, borrar y reconstruir estimaciones.
- `src/dense/timer.js`: quick timer, metronomo y holds.
- `src/ui/training.js`: pantalla Workout, selector semanal y formulario Dense.
- `src/ui/analytics.js`: tabs Progress, Volume, Strength, Conditioning, Recovery, Balance y Consistency.

## Orden Prudente

1. Mantener primero estable el flujo movil de registrar entrenos.
2. Documentar cada cambio de schema antes de tocar Apps Script.
3. Extraer primero formulas y catalogo, porque son los bloques menos dependientes del DOM.
4. Extraer despues pantallas UI.
5. Actualizar `sw.js` cada vez que cambie la lista de archivos cacheados.

## Tests Manuales Minimos

- Registrar bodyweight `5D9` con `40` reps reales y comprobar que vuelve como `objetivo 5D9 · 40/45`.
- Editar una marca ya guardada y comprobar que no se duplica.
- Registrar un isometrico con `hold_seconds_per_round` y comprobar que se guarda como TUT.
- Registrar calistenia lastrada y comprobar lastre visible, carga total y e1RM.
- Sincronizar con Google Sheets y verificar columnas DenseTraining.
