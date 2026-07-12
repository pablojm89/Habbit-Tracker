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
- **Guard de movilidad** (`denseIsSpuriousMobilityPair`): si CUALQUIERA de los
  dos ejercicios es `category: "mobility"` y las familias difieren → coeficiente
  **0**, en ambas direcciones. La movilidad solo transfiere dentro de su propia
  familia (progresiones de pancake entre sí, de side split entre sí…). Sin este
  guard, el patrón genérico `range_strength` + músculos compartidos fabricaba
  409 pares espurios ≥0.15 (side split→back squat 0.27, bridge→deadlift 0.25,
  bridge→back lever pull 0.24, deadlift→pancake 0.41…). Un `densePairOverride`
  explícito sigue pudiendo reactivar un par concreto si la transferencia es clara.
- `densePairOverrides` (~línea 1068): pares afinados a mano por **id** que los vectores no
  capturan (`pull_up>chin_up: 0.8`, gemelos con/sin lastre 0.85/0.9, `back_squat<>deadlift:
  0.45`, `front_squat<>deadlift: 0.35`, bench↔military...). El override sustituye a la
  fórmula pero sigue multiplicado por `pairK` y clampeado.
- `denseFamilyPairOverrides` (~línea 1273): igual pero por **familia** (cubre todos los
  ejercicios de la familia). Se consulta tras los overrides de id. Se usa para topar pares
  que los vectores sobreestiman: `handstand<>cuelgue: 0.1` (un pino no construye tu cuelgue
  ni viceversa, aunque compartan escápula + straight-arm sobre el papel).
- Correcciones de metadata tras auditoría (jul 2026): `back_lever_pull` se re-modeló como
  tirón real (fuera `horizontal_push` y `chest`; dentro `lats`/`biceps`/`vertical_pull`)
  para que dejara de fugar a press banca/flexiones/dips; `handstand` bajó `forearms_grip`
  0.4→0.15 (palmas planas, apenas hay agarre).
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
  (`renderTestSuggestionCard`/`denseTestSuggestion`): boost ≥ 3% sin verificar ≥ 14 días,
  **y** al menos una fuente del boost con coeficiente fuerte hacia el destino
  (`denseTestSourceStrength ≥ DENSE_TEST_MIN_PAIR_C = 0.35`) — goteos acumulados de pares
  marginales cuentan para las estimaciones pero no justifican gastar una sesión de test.
  Si el destino no tiene ninguna marca directa (`firstTest`), la tarjeta muestra el
  **rango** (`densePlannedTargetRange`) con "primer test: empieza por abajo" en vez del
  valor central.
- Tarjeta de calibración (`renderCalibrationCard`) con el kit principal y el tier
  "Anclas de barra".

## 9.5 Nivel de dificultad dentro de una familia (levers y progresiones)

Dos campos con la misma semántica, resueltos por `denseProgressionLevelOf(ex)`
(0–1, más alto = más duro, el hermano más duro de la familia ≈ 1; 0 = sin nivel):

- **`leverLevel`**: generado para front/back lever (`denseLeverProgressionLevel`,
  tuck 0.35 → full 1.0).
- **`progressionLevel`** (jul 2026): curado a mano en el catálogo para el resto de
  familias-progresión. Familias niveladas: `strict_pull` (chin 0.95 · pull 1),
  `pushup` (suelo 0.75 · déficit 0.85 · palmada 0.9), `single_leg_squat` (bulgarian 0.6 ·
  pistol 0.9), `hinge_bodyweight` (SL GM 0.45 · nordic 0.95), `knee_dominant` (NLE 0.6 ·
  sissy 0.85), `hspu` (pike 0.55 · HeSPU 0.85 · full ROM 1), `handstand` (straddle 0.9 ·
  straight 1), `toes_to_bar` (kip 0.65 · estricto 0.85), `cuelgue` (bilateral 0.4 ·
  activo 0.55 · activo IG 0.55 · pasivo 1 mano 0.7 · activo 1 mano 0.9), `one_arm_chin`
  (archer 0.65 · negativa 0.8 · OAC 1; la asistida va por carga), `l_sit` (tuck 0.5 ·
  1 pierna 0.62 · L 0.72 · straddle 0.82 · v-sit 1), `bridge` (iso 0.55 · push-up 0.7 ·
  walkover 0.95). Valores calibrados con el usuario (sesión 12 jul 2026); sus tests
  reales los corregirán (fase media: niveles aprendidos).

`denseLeverSiblingEstimate(ex, key)` escala la capacidad entre niveles por la curva de
resistencia: `capacidad_objetivo = capacidad_hermana × (nivel_hermana / nivel_objetivo)^2.2`
(`DENSE_LEVER_ENDURANCE_EXP`). Cadena de ejemplo desde tuck 30s (10D): 1/4 17s → adv 13s
→ 1 pierna 9s → straddle 6s → 1/2 5s → 3/4 4s → full 2s. La estimación solo cruza
hermanas del **mismo eje** (iso↔iso, dinámico↔dinámico) porque compara la misma
`capacity key`. Ejemplo dinámico: NLE 15 rpm → sissy ≈ 7 (×(0.6/0.85)^2.2 = 0.46).
Cuando varias hermanas tienen datos, manda la de **nivel más cercano** al objetivo
(mejor evidencia local), no la de mayor valor escalado: elegir la optimista invertía
dificultades (un test flojo del cuelgue pasivo a 1 mano quedaba ignorado frente al
cuelgue activo bilateral, y el activo a 1 mano salía con objetivo mayor que el pasivo).
Hallado en simulación de 6 semanas (jul 2026); self-test "hermana más cercana manda".

Está cableado en un único resolvedor (tarjeta y formulario siempre coinciden):
`denseFormTargetHoldPerRound`/`denseFormTargetRepsPerSet` (propio → hermana → default),
`denseEstimatedBodySuggestion` (razón "Estimado desde X por nivel… trátalo como test"),
`denseTargetSource` (kind **family**, badge "Desde …", sigma 0.18, auto modo test) y
`densePlannedTargetValue`/`densePlannedTargetRange`. Distinto del boost de transferencia:
esto es estimación de capacidad determinista entre niveles, no propagación de mejoras.

**Defaults en frío** (familia entera sin datos): `denseFamilyDifficultyFactor(ex)` ancla
el default de categoría al hermano más fácil de la familia (su "punto de entrada") y
escala hacia abajo con la misma curva: `denseDefaultRpm` (un sissy en frío arranca a
~6.5 rpm, no al ritmo de sentadilla al aire) y la semilla de 38s de
`denseDefaultHoldPerRound` (cuelgue a una mano siembra ~2s en 10D, no 12s).

La observación de calibración kind **family** ahora exige primer contacto con el
ejercicio (`!seenExercise`): con historial propio en otro bloque, el error cuenta como
**cross**, que es la estimación que realmente se usó.

## 10. Estructura de `state.transfer`

```js
{
  boosts:   { [exerciseId]: { pct: 0.034, from: [{name, date}×≤3], updatedAt } },
  events:   [ { at, source, sourceEntry, target, family|null, delta, reconciled, ratio? } ], // ≤150
  pairK:    { "vertical_pull>straight_arm": 1.12, ... },   // aprendidos, clamp [0.3, 2]
  pendingK: { "vertical_pull>straight_arm": [0.83], ... }, // colas de ratios (se vacían al llegar a 2)
}
```
