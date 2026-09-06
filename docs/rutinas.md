# Banco de rutinas (sep 2026)

> Petición del usuario: "un creador de rutinas, y que al agregar pueda añadir rutinas
> completas de una… así las que suelo hacer las añado de golpe y tengo un banco".

## Modelo

- `state.denseRoutines = [{ id, name, items, created_at, updated_at, last_used_at }]`.
- Cada `item` tiene **la misma forma que un item de plan** (`denseDayPlans` v2):
  `{ exercise_id, nature?, scheme?, is_test? }`. Sin `scheme` → "esquema sugerido" (la app
  elige el bloque con `denseDefaultScheme` al planificar, como un ejercicio suelto).
- `denseNormalizeRoutine` (en `normalizeState`): nombre recortado, ids `weighted_*` → id
  unificado, items inválidos fuera. `stateHasTrainingData` cuenta el banco (no se pisa con
  un restore vacío). Viaja en el blob de estado completo al sync de Sheets.
- **Añadir al día** = `denseAppendRoutineToPlan(routine, key)`: concatena
  `denseRoutinePlanItems` (source `"routine"`, `routine_id`; esquema/modalidad solo si son
  válidos para el ejercicio) al plan del día y marca `last_used_at`.
- **Guardar el día como rutina** = `denseDayRoutineItems(date)`: marcas del día en orden de
  registro (con su modalidad y esquema) + programado sin marca.

## UI

- El botón del día pasa a **"Agregar ejercicio o rutina"**. El cajón tiene dos pestañas
  (`settings.workoutPickerTab`): **Ejercicios** (el buscador de siempre) y **Rutinas**.
- Pestaña Rutinas: "Nueva rutina", "Guardar este día como rutina (n)" (si el día tiene
  algo), tarjeta por rutina (nombre · nº ejercicios · resumen con esquemas · **Añadir al
  día** · editar · eliminar), ordenadas por último uso.
- **Editor** (`data-modal-kind="routine-editor"`, cajón casi completo en móvil): nombre,
  lista ordenable (subir/bajar/quitar), por ejercicio `<select>` de esquema (todos los
  permitidos: Dense · Fuerza · Máx, o "sugerido") y de modalidad si el ejercicio admite
  varias (cambiar la modalidad descarta un esquema que ya no encaje). "Añadir ejercicio"
  abre el buscador en **modo rutina** (`workoutPickerMode = "routine"`): cada toque añade
  al borrador sin cerrar, cabecera con contador y botón "Listo" que vuelve al editor.
- El borrador (`routineDraft`) vive en memoria: si se cierra el cajón sin guardar aparece
  "Borrador sin guardar · Continuar" en la pestaña Rutinas. Guardar vuelve a la pestaña
  Rutinas; eliminar pide confirmación.
- `openModal` ya no llama a `showModal` si el diálogo está abierto (encadenar cajones).

## Tests

5 self-tests nuevos (91): normalización + alias, añadir al día (esquema/modalidad válidos,
`last_used_at`), esquema inválido para la modalidad descartado, "día → rutina" (orden y
programado sin marca) y `normalizeState`/`stateHasTrainingData`. Probe de flujo completo
en Chromium (`probe-routines.js` del scratchpad): crear → 3 ejercicios → ordenar → esquema →
guardar → añadir al día (3 tarjetas con `5D3 / S5x5 / 10D`) → día→rutina → borrador →
editar → borrar → persistencia tras recarga.
