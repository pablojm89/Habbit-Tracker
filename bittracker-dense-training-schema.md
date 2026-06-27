# BitTracker - schema definitivo DenseTraining

Objetivo: una entrada debe soportar bodyweight, weighted, weighted calisthenics, ladders, PRs, estimaciones, cloud sync y edicion futura sin romper compatibilidad.

## Decision Principal

Una entrada `DenseTrainingEntry` representa un bloque completo de un ejercicio dentro de un entrenamiento, no cada set individual.

Mas adelante se podran guardar sets/rondas individuales en `rounds`, pero la fuente final para calculos sera siempre el resumen de la entrada:

```txt
total_reps
duration_minutes
external_load_kg
added_load_kg
bodyweight_kg
effort
failed
```

Esto mantiene la app simple ahora y deja camino para detalle futuro.

## Schema

```js
const denseTrainingEntry = {
  id: "uuid",
  version: 1,

  date: "2026-06-27",
  created_at: "2026-06-27T10:00:00.000Z",
  updated_at: "2026-06-27T10:00:00.000Z",

  exercise_id: "pull-up",
  exercise_name: "Dominadas",
  exercise_family_id: "pull-up",
  variant_id: "weighted", // bodyweight | weighted | rings | full_rom | etc.

  nature: "bodyweight", // weighted | weighted_calisthenics | bodyweight | banded | conditioning | plyometrics | skill | active_recovery
  movement_pattern: "vertical_pull",
  load_pattern: "bodyweight",

  scheme: "10D7",
  scheme_base: "10D",
  scheme_target: "7",
  scheme_type: "dense_reps", // dense_reps | dense_load | ladder | isometric | conditioning | skill

  duration_minutes: 10,
  target_reps_per_min: 7,
  target_total_reps: 70,
  total_reps: 68,
  reps_per_min: 6.8,
  total_reps_is_manual: true,

  ladder_sequence_planned: null, // ejemplo: [1,2,3]
  ladder_sequence_actual: null,
  rounds: null,

  bodyweight_kg: 80,
  bodyweight_source: "daily_snapshot", // daily_snapshot | manual | default

  external_load_kg: 0,
  added_load_kg: 0,
  weight_per_dumbbell_kg: null,
  dumbbell_count: null,
  total_system_load_kg: 80,

  bodyweight_contribution_pct: 100,
  tonnage_factor: 1,

  effort: "N", // VE | E | N | H | VH | F
  effort_value: 5,
  failed: false,
  missed_reps: 2,

  notes: "",

  computed: {
    e1rm: null,
    relative_strength: 1,
    effective_load_kg: 80,
    tonnage: 5440,
    capacity: 20.6,
    pr_score: 68,
  },

  source: "manual", // manual | imported | cloud
  deleted_at: null,
};
```

## Decisiones Cerradas

### Entrada Completa Vs Sets

Guardar una entrada como bloque completo. Si queremos detalle:

```js
rounds: [
  { round: 1, reps: 7, load_kg: 0, seconds: null },
  { round: 2, reps: 7, load_kg: 0, seconds: null }
]
```

Pero `total_reps` sigue siendo la verdad final.

### Bodyweight

`total_reps` siempre editable y fuente final de verdad.

`reps_per_min` se calcula:

```txt
reps_per_min = total_reps / duration_minutes
```

En esquemas tipo `10D7`, el `7` es objetivo de reps/min planificadas. El resultado real puede ser `10D6.8`.

### Ladders

Para `10D1-2-3`:

- guardar `ladder_sequence_planned: [1,2,3]`
- guardar `ladder_sequence_actual` si el usuario mete detalle
- si no hay detalle, estimar target con promedio
- `total_reps` sigue mandando

### Peso Corporal

Cada entrada debe guardar snapshot de `bodyweight_kg`, aunque venga del peso diario.

Tambien debe existir una tabla separada:

```js
bodyweightLog = {
  date: "2026-06-27",
  bodyweight_kg: 80,
  source: "manual",
  note: ""
}
```

Motivo: si en el futuro cambia el peso diario, no queremos que cambien PRs antiguos sin querer.

### Lastre Y Mancuernas

En calistenia lastrada:

```txt
added_load_kg = lastre externo visible
total_system_load_kg = bodyweight_kg + added_load_kg
```

En mancuernas:

```txt
weight_per_dumbbell_kg = peso de una mancuerna
dumbbell_count = 2
external_load_kg = weight_per_dumbbell_kg * dumbbell_count
```

Guardar ambos: peso por mancuerna y total calculado.

### Variantes

Mantener ejercicios separados cuando cambie mucho la mecanica o leaderboard:

- Pull-up bodyweight
- Weighted Pull-up
- Ring Dips
- Weighted Ring Dips
- HeSPU
- HSPU full ROM

Pero unirlos con `exercise_family_id` para comparar familias.

### PRs

El PR se decide por `nature`:

| Nature | PR principal |
|---|---|
| weighted | mayor `e1rm`; desempate por mayor carga |
| weighted_calisthenics | mayor `e1rm` sobre carga total; visible como lastre |
| bodyweight | mayor `total_reps` dentro del mismo `scheme_base`; desempate por `reps_per_min` |
| banded | mayor `total_reps` o reps/min |
| conditioning | depende de modalidad: watts, distancia, tiempo o intervalos |
| skill | mejor `skill_value` segun measurement_type |
| isometric | mayor hold total o hold por ronda |

Para mostrar calistenia lastrada:

```txt
PR interno = total_system_load_kg
PR visible = +added_load_kg
```

### Estimaciones

Aprender por:

```txt
exercise_id + nature + scheme_base
```

Y mantener una segunda capa por familia:

```txt
exercise_family_id
```

Asi una dominada lastrada no pisa una dominada bodyweight, pero ambas pueden informar tendencias de la familia.

Aplicar effort factor sobre:

- weighted: `e1rm`
- weighted_calisthenics: `e1rm` de carga total
- bodyweight: `capacity`
- banded/bodyweight simple: `capacity` o reps/min normalizado

No aplicar directamente sobre `total_reps` como valor final historico; solo sobre la estimacion futura.

### Fallo

Guardar ambos:

```txt
effort = "F"
failed = true
```

Y calcular:

```txt
missed_reps = max(0, target_total_reps - total_reps)
```

`missed_reps` puede guardarse como campo calculado para Sheets, pero se puede recalcular.

### Cloud

Ahora:

```txt
snapshot completo -> Apps Script -> Google Sheets
```

Mas adelante:

```txt
append incremental por entry
```

Decision: Google Sheets es fuente de verdad auditable en fase actual; `localStorage` es cache/fallback.

Cuando haya login/multiusuario, migrar a Supabase como fuente de verdad y Sheets queda como auditoria/export.

### DenseEstimates

Calcular en ambos sitios:

- frontend: para feedback inmediato
- Sheets: para auditoria, graficas y recalculo

Guardar resultados en una tabla derivada:

```txt
DenseEstimates
- entry_id
- exercise_id
- target_scheme
- estimated_total_reps
- estimated_load_kg
- estimated_added_load_kg
- confidence
```

### Edicion Y Borrado

Editar una entrada pasada debe recalcular:

- PRs
- estimaciones
- graficas
- recomendaciones

Borrar no debe eliminar fisicamente por defecto:

```txt
deleted_at = timestamp
```

Asi no rompemos auditoria ni sync.

### Favoritos Y Filtros

Sincronizar favoritos y configuracion de ejercicios.

Filtros temporales de UI pueden quedarse locales.

## Regla De Compatibilidad

Nunca eliminar campos. Si cambia el schema:

```txt
version: 2
migrateDenseEntryV1ToV2(entry)
```

Los campos calculados pueden regenerarse. Los campos manuales nunca se pisan automaticamente.

