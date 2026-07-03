# Motor de transferencias entre ejercicios

Bloque principal en `app.js` ~líneas 980–1305 (buscar `denseTransferFamilyMeta`).
Fases implementadas: 1 conversor universal · 2 vectores + propagación · 3 maestría técnica ·
4 reconciliación personal · 5 kit de calibración · endurecimiento (fold re-derivable,
guardas de modalidad, self-tests).

## 1. Metadatos: vectores de patrón y músculo

Cada ejercicio se describe con dos vectores dispersos y una especificidad:

- **`patterns`**: pesos 0–1 sobre patrones de movimiento. Vocabulario actual:
  `vertical_pull, horizontal_pull, vertical_push, horizontal_push, squat, hinge,
  straight_arm, core_compression, core_anti_ext, core_ext, range_strength`.
- **`muscles`**: pesos 0–1 sobre **12 ejes fijos**: `lats, upper_back, biceps, chest,
  front_delt, triceps, quads, glutes_hams, core_flex, core_ext, forearms_grip, scap`.
- **`specificity`** (0–1): cuánto depende el ejercicio de técnica/palancas propias.
  Bajo (~0.1–0.25) = básico que absorbe transferencia fácil; alto (~0.6–0.7) = skill
  (front lever, handstand) que apenas absorbe fuerza ajena sin técnica.

Resolución en cascada — `denseMetaFor(exercise)`:
```
denseTransferIdMeta[id]  →  denseTransferFamilyMeta[family]  →  denseCategoryFallbackMeta[category]  →  fallback skills
```
La metadata vive **por familia** (`denseTransferFamilyMeta`, ~25 familias) para cubrir todo
el catálogo sin tocar cada entrada; `denseTransferIdMeta` es para excepciones puntuales
(bench_press, sissy_squat...). **Un ejercicio nuevo con `family` conocida ya queda cubierto.**

## 2. Coeficiente de transferencia — `denseTransferCoefficient(e, f)` (~línea 1101)

```
c = (0.55·cos(patterns_e, patterns_f) + 0.45·cos(muscles_e, muscles_f))
    × modalityFactor × (1 − specificity_f × 0.7) × pairK
clamp [0, 0.9]
```

- `denseVecCos`: coseno entre vectores dispersos (claves faltantes = 0).
- Patrones Y músculos suman siempre: patrones disjuntos (pull vertical vs remo) siguen
  transfiriendo por musculatura compartida. **No reintroducir el early-return si
  `pat < 0.15`** — ya se quitó porque mataba pull→row.
- `denseModalityFactor`: iso↔dinámico 0.6; naturalezas distintas (weighted vs bodyweight)
  0.9; igual 1.
- La especificidad **del destino** amortigua: un skill absorbe poco.
- **Guard de movilidad** (`denseIsSpuriousMobilityPair`): dos ejercicios de
  `category: "mobility"` de **familias distintas** dan coeficiente **0**. Solo
  comparten el patrón genérico `range_strength`, que no es transferencia real
  (un bridge = extensión de columna vs un side split = abducción de cadera). La
  movilidad de la **misma familia** (progresiones de pancake, de side split…) sí
  transfiere, y un `densePairOverride` explícito puede reactivar un par concreto.
- `densePairOverrides` (~línea 1068): pares afinados a mano que los vectores no capturan
  (`pull_up>chin_up: 0.8`, gemelos con/sin lastre 0.85/0.9, `back_squat<>deadlift: 0.45`,
  `front_squat<>deadlift: 0.35`, bench↔military...). El override sustituye a la fórmula
  pero sigue multiplicado por `pairK` y clampeado.
- `densePairK(e, f)`: multiplicador **personal aprendido** por par de patrones dominantes
  (`densePrimaryPattern`), guardado en `state.transfer.pairK["patrónA>patrónB"]`,
  clamp `[0.3, 2]`, inicial 1. Ver reconciliación.

Matriz de referencia (self-tested): pull_up→chin_up 0.80 · pull→FL pull ~0.39 ·
pull→ring_row ~0.29 · pull→bench 0 · bench→dips ~0.66 · military→HSPU 0.55 ·
back_squat→pistol ~0.67.

## 3. Vecinos — `denseTransferNeighbors(exercise)` (~línea 1119)

Top-8 destinos con `c ≥ 0.15`, con **un solo representante por familia** (el de mayor c)
para que 8 progresiones de front lever no desplacen a otras familias. Cacheado en
`denseNeighborCache` — **invalidar (`denseNeighborCache = null`) si cambian coeficientes**
(ya se hace al aprender pairK; hacerlo también si se mutara el catálogo en caliente).

`denseProgressionFamilies = {front_lever, front_lever_pull, back_lever, back_lever_pull,
hspu, handstand, cuelgue}`: familias-progresión que comparten latente; reciben el boost
**en bloque** (todos los miembros a la vez).

## 4. Maestría técnica T — `denseTechMasteryInfo(exercise)` (~línea 1143)

Solo aplica si `specificity ≥ 0.45` (si no, T = 1). Determinista desde el historial:

```
sessions = nº de días distintos con marcas de la familia (o del ejercicio)
weeks    = semanas desde la última sesión
T = clamp((1 − 0.65 × 0.93^sessions) × 0.995^weeks, 0.3, 1)
sin historial → T = 0.35
```

Crece saturando con la práctica, decae despacio con el abandono. En la propagación, el
destino técnico solo absorbe `×(0.4 + 0.6·T)` del boost. En las tarjetas de estimación
ensancha la incertidumbre.

## 5. Propagación — `denseTransferStep(entry, priorEntries)` (~línea 1229)

Para cada marca, **contra las marcas estrictamente anteriores**:

1. `denseScoreType(entry)` fija el eje (`e1rm`/`iso`/`cap`/`other`). El "prior" es el mejor
   score previo **del mismo ejercicio y mismo eje**. Sin prior → primera marca en ese eje
   = **calibración**: borra el boost pendiente del ejercicio y no propaga. (Guarda
   anti-cross-modalidad: cambiar de bodyweight a lastre no puede fingir +1000%.)
2. `rawDelta = (score − prior) / prior`. Primero se reconcilia (fase 4, abajo), luego se
   **absorbe** el boost propio (`delete boosts[ejercicio]` — el test directo sustituye a la
   estimación indirecta). Si `rawDelta ≤ 0.4%`, fin.
3. `delta = min(rawDelta, 0.25) × denseTransferQuality(entry)` — calidad: fallo 0.6,
   VH 0.85, readiness low 0.8, resto 1 (una marca al fallo es evidencia sucia).
4. Para cada vecino: `gain = clamp(delta × c × 0.5 × (0.4 + 0.6·T_destino), 0, 0.03)`.
   Ignora ganancias < 0.5%. Familias-progresión reciben en bloque. Tope acumulado por
   ejercicio: 12% (`slot.pct`). Cada aplicación registra un evento en
   `state.transfer.events` (`{at, source, sourceEntry, target, family, delta, reconciled}`,
   máx. 150).

## 6. Reconciliación personal — `denseReconcileTransfers(entry, rawDelta)` (~línea 1196)

Cuando se testea directo un ejercicio que llevaba boost **predicho ≥ 2%**:

```
ratio = clamp(clamp(rawDelta, −0.1, 0.3) / predicho, 0, 2)
```

El ratio se encola en `state.transfer.pendingK["patrónOrigen>patrónDestino"]` para cada
origen pendiente. **Solo con 2 observaciones** se mueve el multiplicador:
`k ×= (1 + 0.25 × (avgRatio − 1))`, clamp `[0.3, 2]`, y se vacía la cola (robustez al
ruido: una sesión mala no destruye el modelo). Los eventos implicados se marcan
`reconciled: true` con su ratio. Al cambiar k se invalida `denseNeighborCache`.

## 7. Fold re-derivable — `rebuildTransferState({excludeId})` (~línea 1284)

```js
state.transfer = { boosts: {}, events: [], pairK: {}, pendingK: {} };
// ordena TODAS las marcas por created_at y aplica denseTransferStep una a una
```

Todo `state.transfer` es una **función determinista del historial**. Se ejecuta en:
carga de la app, borrado de marca (`deleteDenseEntry`) y cada guardado. No puede quedar
estado fantasma tras editar/borrar.

`runTransferEngine(entry)` (wrapper de guardado): hace el fold **sin** la marca nueva y
**con** ella, y devuelve el diff de boosts (top 3 ≥ 0.5%) para el toast "transferencia
aplicada".

## 8. Dónde se aplican los boosts

`denseTransferBoost(id)` (clamp 0–12%) y `denseBoosted(id, valor)` se aplican en:
`denseBestCapacity`, `denseUnifiedE1rm`, mejores métricas de las tarjetas de estimación,
defaults de hold y la rama de estimación del formulario. **Si añades una superficie nueva
que muestre "mejor marca estimada", pásala por `denseBoosted`.**

## 9. Visibilidad en UI

- Feed "Transferencias recientes" en `renderProgressAnalytics` (últimos 6 eventos:
  origen→destino, +%, fecha, reconciliado/pendiente).
- Tarjeta de sugerencia de test semanal en `renderMesocycle`
  (`renderTestSuggestionCard`/`denseTestSuggestion`): boost ≥ 3% sin verificar ≥ 14 días.
- Tarjeta de calibración (`renderCalibrationCard`) con el kit principal y el tier
  "Anclas de barra".

## 10. Estructura de `state.transfer`

```js
{
  boosts:   { [exerciseId]: { pct: 0.034, from: [{name, date}×≤3], updatedAt } },
  events:   [ { at, source, sourceEntry, target, family|null, delta, reconciled, ratio? } ], // ≤150
  pairK:    { "vertical_pull>straight_arm": 1.12, ... },   // aprendidos, clamp [0.3, 2]
  pendingK: { "vertical_pull>straight_arm": [0.83], ... }, // colas de ratios (se vacían al llegar a 2)
}
```
