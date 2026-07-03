# Gestión de cargas: esquemas, conversiones, progresión y autorregulación

Todo en `app.js`. Los números de línea son orientativos (buscar por nombre de función).

## 1. Esquemas dense y tablas base (~línea 109–217)

```js
const bodyweightMultipliers = { "2D": 0.9, "5D": 0.6, "10D": 0.33, "20D": 0.27 };
```
Normalizador de capacidad: `capacidad = reps_por_min / multiplier`. Un 2D exige ~90% de tu
capacidad por minuto; un 20D solo ~27%. Así un 2D12 y un 20D4 pueden implicar la misma
capacidad subyacente.

```js
const denseWorkingPct = { "2D5": 0.778, "2D10": 0.535, ..., "20D20": 0.294 };
```
%1RM de sistema que representa cada esquema lastrado concreto. Es la tabla original del
método; **no inventar valores nuevos a ojo** — si hace falta un esquema intermedio, se
interpola con la curva (abajo).

```js
const denseBaseCurve = {
  "2D":  [[5,0.778],[10,0.535],[20,0.404]],
  "5D":  [[1,0.893],[3,0.794],[5,0.688],[10,0.445],[20,0.314]],
  "10D": [[1,0.864],[3,0.767],[5,0.665],[10,0.431],[20,0.304]],
  "20D": [[1,0.834],[3,0.741],[5,0.643],[10,0.416],[20,0.294]],
};
```
La misma tabla reorganizada como **curva continua reps↔%1RM por base** (puntos
`[reps/min, %1RM]`). Interpolación log-lineal en reps, extrapolada en los bordes:

- `densePctForReps(base, reps)` → %1RM sostenible a esas reps/min. Clamp `[0.12, 0.95]`.
- `denseRepsForPct(base, pct)` → inversa. Clamp `[0.5, 40]` reps.
- Round-trip garantizado por self-test: `densePctForReps("5D", denseRepsForPct("5D", 0.5)) ≈ 0.5`.

```js
function denseEnduranceFactor(fromBase, toBase) // [1, 0.95, 0.87, 0.78] según distancia
```
Penalización por especificidad de resistencia: estimar un 20D desde un test 2D (distancia 3)
multiplica por 0.78. `denseBaseOrder = { 2D:0, 5D:1, 10D:2, 20D:3 }`.

## 2. Cálculo de una marca al guardar — `computeDenseEntry(raw)` (~línea 7782)

Derivados que se guardan en cada entrada:

| Campo | Fórmula |
|---|---|
| `reps_per_min` | `total_reps / duration_minutes` |
| `total_system_load_kg` | weighted_calisthenics: `bw + lastre`; weighted: carga externa; bodyweight/banded/plyo/conditioning: 0 |
| `e1rm_kg` | **e1RM efectivo**: `total_system_load / densePctForReps(base, reps_per_min_real)` — sale de la densidad realmente hecha. Completar el esquema reproduce el % nominal exacto; un fallo con menos reps implica MENOS e1RM (nunca infla ni fabrica PRs falsos). Clamp `[0.5, 1.3]×nominal` contra typos; sin reps registradas cae al nominal `total_system_load / denseWorkingPct[scheme]` |
| `bodyweight_capacity` | `reps_per_min / bodyweightMultipliers[base]` |
| `isometric_capacity` | `(total_hold_seconds / minutos) / multiplier` |
| `effective_load_kg` | weighted_cal: sistema; resto: `carga + bw × bodyweightContributionPct/100` |
| `tonnage_kg` | `effective_load × total_reps × tonnageFactor` |
| `tut_load_kg_seconds` | ídem con segundos de TUT (isométricos) |
| `computed.pr_score` | `denseEntryScore(...)` — ver eje de puntuación |

**Eje de puntuación** (`denseEntryScore`, ~línea 8122): prioridad
`e1rm_kg → isometric_capacity → total_hold_seconds → bodyweight_capacity → reps_per_min → total_reps`.
El tipo de eje lo da `denseScoreType(entry)`: `"e1rm" | "iso" | "cap" | "other"`.
**Regla de oro: nunca comparar puntuaciones de ejes distintos.**

## 3. e1RM unificado y estimaciones cruzadas (~línea 6624)

- `denseEntrySystemE1rm(entry)` → `{e1rm, base, cross}` o `null`. Si la marca tiene
  `e1rm_kg` directo, lo usa (`cross:false`). Si es de peso corporal dinámico, **invierte**:
  `carga_implícita = bw × bodyweightContributionPct/100`, y
  `e1rm = carga / densePctForReps(base, rpm)` (`cross:true`). Isométricos devuelven `null`
  (van por su propio eje).
- `denseUnifiedE1rm(exerciseId)` → mejor e1RM implícito entre TODAS las marcas del
  ejercicio, con el boost de transferencia aplicado (`denseBoosted`).
- `denseCrossRpm(exercise, base)` → reps/min estimadas para un esquema de peso corporal
  desde el e1RM unificado (aplica `denseEnduranceFactor`).
- Las tarjetas de estimación mezclan 60/40 directo/invertido cuando hay ambos.

### Incertidumbre (~línea 6653)
```js
sigma = clamp(0.08 + 0.006×semanas + (cross ? 0.04 : 0) + baseGap×0.012, 0.06, 0.22)
```
`denseConfidenceLabel(sigma)`: alta ≤ 0.105, media ≤ 0.16, baja el resto. Los ejercicios
técnicos (specificity ≥ 0.45) ensanchan sigma extra en las tarjetas (techExtra). Los rangos
mostrados son `valor × (1 ± sigma)`.

## 4. Estimaciones suavizadas — `updateDenseEstimate` (~línea 7845)

`state.denseEstimates[exerciseId]` guarda una **EMA 70/30** por eje
(`nuevo = actual×0.7 + observado×0.3`), donde `observado = marca × denseEffortFactors[effort]`
(un fallo puntúa distinto que un esfuerzo fácil). `rebuildDenseEstimates()` la reconstruye
entera desde el historial ordenado — misma filosofía re-derivable que el motor de
transferencias.

`denseBestCapacity(exerciseId, key)` = máx(estimación suavizada, todas las marcas) con boost.
Es la fuente única que usan el formulario y la analítica (deben coincidir siempre).

**Para e1RM de lastrados, las superficies de ESTIMACIÓN prefieren la EMA, no el máximo
histórico** (`denseBestWeightedE1rmSource` y la tabla "Objetivo por densidad" en
`renderDenseEstimateCards`): tras un intento fallido la EMA baja y los objetivos
propuestos bajan con ella; el máximo de siempre solo se usa como fallback sin EMA y en la
página de PRs (donde "mejor marca" sí es la semántica correcta).

## 5. Sugerencia de progresión — `denseProgressionSuggestion(exercise, readiness, schemeFilter)` (~línea 6990)

**Memoria por bloque** (fix importante): el formulario pasa el esquema completo
seleccionado (`applyDenseFormTargets`). Resolución del historial de referencia:

1. **Esquema exacto** primero (`latestDenseEntryForExercise(id, scheme)`): en lastrados,
   5D5 y 5D10 llevan cargas distintas y no se prestan entre sí. En peso corporal el
   esquema ES la base, así que equivale al filtro por bloque.
2. **Misma base** como fallback, solo para NO-lastrados (reps/holds se mueven dentro del
   bloque 10D aunque la prescripción cambie).
3. **Sin historial en el bloque** → sugerencia "estimado" explícita (`estimated: true`,
   direction hold, razón "Estimado…"), nunca la recomendación de otro bloque:
   - Lastrados: `denseEstimatedLoadSuggestion` — carga = mejor e1RM (marcas + EMA,
     con boost) × `denseWorkingPct[scheme]`; en weighted_calisthenics resta el peso
     corporal (clamp ≥ 0); mancuernas divide entre 2.
   - Peso corporal/holds: `denseEstimatedBodySuggestion` — usa las MISMAS funciones que
     los inputs del formulario (`denseFormTargetRepsPerSet`/`denseFormTargetHoldPerRound`
     con sugerencia null → capacidad probada × multiplicador), para que tarjeta y
     prefill coincidan siempre.

Además `applyDenseFormTargets` escribe también los campos de carga (`addedLoadKg`/
`externalLoadKg`/`weightPerDumbbellKg`) cuando la sugerencia es de tipo load y coincide el
esquema, y los limpia (`resetStaleLoad`) al cambiar a un bloque sin datos ni estimación.
Verificado (harness DOM): lastrado recuerda 5D5↔2D5 en ambas direcciones, readiness
ajusta la carga sugerida, isométricos recuerdan hold por bloque, y los bloques sin
historial muestran "Estimado…" coherente entre tarjeta e inputs.

### Paso de progresión (`denseAppliedProgressStep`, ~línea 6888)

Entradas: `effort` de la última sesión (`VE/E/N/H/VH/fallo`), `failed`, `readiness` del día
(`low`/"Flojo", `normal`, `high`/"Fuerte"). Reglas **en este orden**:

1. `fallo` → siempre `-1` (bajar), sin excepciones.
2. Paso base según esfuerzo, ajustado por readiness: `high` +1, `low` −1.
3. `H`/`VH` **nunca suben**: si el paso quedó > 0, se fija a 0 (mantener).
4. `E`/`VE` **siempre suben**: si el paso quedó < 1, se fija a 1.

Consecuencia: `N` + readiness normal = mantener; `N` + fuerte = subir; `H` + fuerte =
mantener; `H` + normal/flojo = bajar.

### Aplicación del paso según tipo de ejercicio

- **Isométrico** (`hold`): ±3 s/ronda por paso; fallo = −3 s.
- **Lastrado/con carga** (`load`): ±2.5% por paso sobre la carga del campo correcto
  (`added_load_kg` weighted_cal, `weight_per_dumbbell_kg` mancuernas, `external_load_kg`
  resto); fallo = ×0.95 **con tope en lo que el e1RM efectivo de esa marca sostiene**
  (`e1rm_kg × denseWorkingPct[scheme]`, min de ambos): una estimación cruzada desastrosa
  se corrige en UNA sesión en vez de bajar 5% por sesión durante semanas. Redondeo a
  0.5 kg (`denseRoundLoad`).
- **Reps** (`reps`): ±1 rep/min por paso; fallo = bajar al menos 1 desde el rpm real.
  Siempre pasa por `denseCapRpm` (techo fisiológico de reps/min por ejercicio).

## 6. Autorregulación por fatiga (~línea 6714–6860)

Aviso + objetivo suave cuando un **grupo de movimiento** (push / pull / legs, vía
`denseGroupKeys` que mapea desde los patrones del ejercicio) se entrenó duro hace poco:

```js
const denseHardEfforts = new Set(["H", "VH", "fallo"]);
const denseEffortReduction = { H: 0.10, VH: 0.15, fallo: 0.20 };  // back-off base
const denseFatigueLookbackDays = 2;                                // ventana
const denseFatigueRecency = { 0: 1, 1: 0.6, 2: 0.35 };             // peso por antigüedad
```

`denseGroupFatigueWarning(exercise, dayKey)` busca ofensores en la ventana, calcula
`reduction = denseEffortReduction[effort] × denseFatigueRecency[daysAgo]` y devuelve el
peor, con `factor = max(0.5, 1 − reduction)`. Ejemplo: fallo ayer → 0.20×0.6 = 12% de
back-off. Si `reduction ≥ 0.05`, `denseSoftTarget` genera el objetivo suave concreto
(reps/hold/carga × factor) con botón "Aplicar" en el formulario. El borrador en edición
(`denseDraftEntryId`) se excluye para no auto-avisarse.

## 7. Kit de calibración (~línea 198)

- `denseCalibrationKit`: 6 tests ancla (pull_up 5D, weighted_pull_up 2D5, ring_row 5D,
  ring_push_up 5D, pike_push_up 5D, pistol_squat 10D). Frescura 28 días.
- `denseCalibrationKitBarbell`: anclas opcionales de barra (back_squat 5D5, deadlift 5D3,
  bench_press 5D5, military_press 2D5). Frescura 45 días. Definen niveles absolutos de
  fuerza con e1RM de bajo ruido y transfieren ancho.
- UI: `renderCalibrationCard` → `denseCalibrationRows(kit, staleDays)`. La sugerencia
  semanal de re-test (`denseTestSuggestion`) propone verificar ejercicios con boost ≥ 3%
  sin test directo en ≥ 14 días.
