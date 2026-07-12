# Plan — dificultad relativa, progresiones y catálogo

> Escrito el 12 jul 2026 tras auditar el caso reportado: *Natural Leg Extension sugiere
> Sissy Squat a un nivel que lo trata como si fuera más fácil* (es al revés: sissy es
> bastante más duro). Complementa [PLAN-MAESTRO.md](PLAN-MAESTRO.md) y
> [motor-transferencias.md](motor-transferencias.md). Solo diagnóstico + plan; los fixes
> se implementan por fases (abajo).

## 1. Diagnóstico verificado (con referencias de código)

El motor de transferencias mide **similitud**, no **dificultad**. El bug reportado no es
un dato mal puesto en un ejercicio: es una carencia estructural que afecta a toda familia
de progresión que no sea de levers.

### 1.1 El coeficiente de transferencia es simétrico y ciego a la dificultad

`denseTransferCoefficient` (app.js ~1101) = coseno de patrones + coseno de músculos ×
modalidad × especificidad del destino. Los vectores de `natural_leg_extension` y
`sissy_squat` (app.js:1235-1236) son casi idénticos (`squat` + `range_strength` +
`quads 0.95`, specificity 0.3 ambos) → c ≈ 0.75 **en ambas direcciones**. Para el motor
son el mismo ejercicio con otro nombre.

Eso es correcto para propagar *mejoras porcentuales* (si mejoro NLE un 5%, mi sissy
también habrá mejorado algo), pero se vuelve mentira cuando se usa para poner un
**objetivo absoluto** al ejercicio destino.

### 1.2 El único mando de dificultad es `bodyweightContributionPct`, y no alcanza

- `natural_leg_extension`: 60% BW (app.js:499) · `sissy_squat`: 70% BW (app.js:535).
- Ratio 1.17×, cuando la diferencia real de dificultad es mucho mayor (la dureza del
  sissy viene del brazo de palanca en la rodilla, no de cuánta masa se mueve).
- Además ese % solo entra en las conversiones e1RM del **propio** ejercicio
  (`denseEntrySystemE1rm`, `denseCrossRpm`); **no** se usa para escalar objetivos entre
  hermanas de familia.

### 1.3 El objetivo de un ejercicio sin historial cae a un default por categoría

Cadena real del objetivo que muestra la tarjeta de test (`denseTestSuggestions`,
app.js:2882 → `densePlannedTargetValue` → `denseFormTargetRepsPerSet`):

1. capacidad propia (`denseBestCapacity`) → sissy sin marcas: nada;
2. hermana por palanca (`denseLeverSiblingEstimate`, app.js:7742) → **solo funciona con
   `leverLevel`**, que únicamente tienen los ejercicios generados de front/back lever
   (app.js:731-732, 1163) → nada;
3. `denseDefaultRepsPerSet` → `denseDefaultRpm` (app.js:8383) → **default por categoría:
   `legs` = 14 rpm**.

Resultado: la tarjeta propone testear sissy squat a ritmo de sentadilla al aire. Ese es
exactamente el bug reportado, y afecta a cualquier ejercicio duro sin historial cuya
categoría tenga un default alegre.

### 1.4 Instancias de la misma clase de error (auditoría del catálogo)

Familias con hermanas de dificultad muy distinta donde el modelo no distingue casi nada
(o nada) — mismo mecanismo, mismo riesgo:

| Familia | Miembros (%BW) | Problema |
|---|---|---|
| `knee_dominant` | NLE (60) · sissy (70) | reportado: gap real ≫ 1.17× |
| `single_leg_squat` | pistol (85) · bulgarian (85) | **idénticos** para el modelo; bulgarian es bastante más fácil |
| `hinge_bodyweight` | single leg GM (55) · nordic curl (70) | nordic muchísimo más duro que 1.27× |
| `one_arm_chin` | archer (95) · OAC negativa (100) · OAC (100) | negativa y OAC "iguales" |
| `cuelgue` | bilateral (100) · una mano (100) | idénticos; una mano es otro mundo |
| `hspu` | pike (60) · headstand (92) · full ROM (95) | gap headstand→full ROM infravalorado |
| `pushup` | floor (64) · clap (64) · déficit (68) | clap = floor para el modelo |
| `l_sit` | tuck (40) → v_sit (55) | escala corta: v-sit no es +37% de tuck, es mucho más |

Nota: donde no hay `leverLevel`, la estimación entre hermanas ni existe (paso 2 devuelve
null), así que el daño visible es vía defaults (§1.3) y vía tarjeta de test. En los
levers el problema está resuelto con la curva `^2.2` — esa es justo la pieza a
generalizar.

### 1.5 Tests sugeridos por transferencias débiles

`denseTestSuggestions` dispara con boost acumulado ≥ 3% + ≥ 14 días sin test. Los boosts
se acumulan de muchas fuentes con tope 12%, sin filtro por fuerza del par: varios goteos
de pares marginales (c ≈ 0.2) pueden sumar 3% y sugerir un test que no está justificado
por ninguna relación fuerte. Guards actuales (movilidad, `denseFamilyPairOverrides`)
son parches reactivos por par, no una regla.

## 2. Plan a corto plazo (1–2 sesiones) — corregir la clase de error

Objetivo: que ningún objetivo/test trate un ejercicio duro como fácil. Sin refactor.

1. **Generalizar `leverLevel` → `progressionLevel` (0–1) por familia.**
   - Añadir el campo a las familias de la tabla §1.4 con niveles curados a mano
     (ej. `knee_dominant`: NLE 0.55 · sissy 0.8; `single_leg_squat`: bulgarian 0.55 ·
     pistol 0.85; `hinge_bodyweight`: SL GM 0.45 · nordic 0.9; `one_arm_chin`: archer
     0.6 · negativa 0.8 · OAC 1.0; `cuelgue`: bilateral 0.35 · una mano 0.9…).
   - `denseLeverSiblingEstimate` pasa a leer `progressionLevel ?? leverLevel` — el resto
     de la cadena (formulario, tarjeta, badge "Desde…", sigma 0.18, modo test) ya está
     cableada a ese resolvedor y funciona sola.
   - Revisar el exponente: `DENSE_LEVER_ENDURANCE_EXP = 2.2` está calibrado para
     isométricos; para dinámicos de pierna puede necesitar otro valor (empezar con el
     mismo y ajustar con datos).
2. **Defaults honestos** (`denseDefaultRpm`, `denseDefaultHoldPerRound`): escalar el
   default de categoría por `progressionLevel` cuando exista (un `legs` con nivel 0.8 no
   puede arrancar en 14 rpm; la semilla de isométricos de 38s no vale para cuelgue a una
   mano). Regla simple: `default × (0.5/nivel)^exp` con tope inferior.
3. **Higiene de la tarjeta de test**:
   - contar para el 3% solo boosts cuyo par origen→destino tenga c ≥ ~0.35 (o subir el
     umbral global a 5% — decidir con datos de `state.transfer.events`);
   - si el destino no tiene ninguna marca directa, mostrar el objetivo por el extremo
     bajo del rango (−σ), no el central, y etiquetarlo "primer test — empieza corto".
4. **Self-tests de monotonicidad** (al final de `runDenseSelfTests`): para cada familia
   con niveles, con estado sintético, `objetivo(fácil) > objetivo(difícil)` — que el bug
   sissy/NLE quede blindado y no reaparezca en otra familia.
5. Actualizar `motor-transferencias.md` §9.5 y `anadir-ejercicios.md` (todo ejercicio
   nuevo de familia-progresión debe traer `progressionLevel`).

## 3. Plan a medio plazo — progresiones como grafo, no como línea

Objetivo: modelar lo que ya sabes que es verdad: **las progresiones no son lineales;
hay ramas paralelas que atacan el mismo patrón desde puntos distintos**.

1. **Grafo de progresión por patrón** (datos, no UI todavía): nodos = ejercicios con
   nivel; aristas tipadas: `progresa_a` (misma rama), `paralela_de` (misma meta por otro
   camino: p.ej. sissy y NLE son ramas paralelas hacia fuerza de rodilla en rango largo;
   pike→HSPU pared→HSPU libre vs negativas de HSPU). Vive junto al catálogo como datos
   declarativos.
   - Las ramas paralelas comparten transferencia fuerte pero **no** estimación 1:1 de
     objetivo: cada rama con su nivel.
2. **Transferencia asimétrica por dificultad**: amortiguar c(A→B) cuando
   `nivel_B ≫ nivel_A` (la fuerza transfiere "hacia abajo" casi entera, "hacia arriba"
   con descuento). Un factor `min(1, (nivel_A/nivel_B)^k)` encima del coseno resuelve de
   raíz la mitad de los pares raros sin más overrides a mano.
3. **Niveles aprendidos, no solo curados**: igual que `pairK`, reconciliar el ratio de
   dificultad real cuando hay tests directos en dos hermanas (tus datos ya dicen que
   sissy/NLE no es 1.17×). Curado como prior, datos como corrección, clamp prudente.
4. **UI mínima de árbol**: en el detalle del ejercicio, "de dónde vienes / a dónde vas /
   ramas paralelas" con la evidencia de cada nodo (directo/estimado + confianza). Encaja
   con la visión del PLAN-MAESTRO ("¿qué evidencia hay detrás de ese número?").
5. Revisión de **todas** las familias existentes con esta lente (no solo las de §1.4):
   pares dentro de familia y `densePairOverrides` actuales que queden obsoletos al
   existir el factor de dificultad.

## 4. Plan a largo plazo — ampliar y curar el catálogo

Objetivo: crecer el catálogo sin degradar el motor, mezclando investigación y tus
bibliotecas/conocimiento.

1. **Catálogo como datos separados del código**: mover ejercicios + vectores + niveles +
   aristas de progresión a un módulo/JSON propio (primer paso natural de la separación
   ya recomendada en `bittracker-architecture-notes.md`: `src/dense/catalog.js`).
   Validador al cargar: familia conocida, vectores completos, niveles monótonos dentro
   de cada rama, aristas sin ciclos.
2. **Pipeline de alta de ejercicios**: plantilla (ya existe `anadir-ejercicios.md`) +
   checklist: familia/rama, nivel curado, %BW, vectores patrón/músculo, naturalezas,
   par(es) paralelos. Un self-test genérico verifica que todo nuevo ejercicio queda
   cubierto por metadata y no fabrica pares espurios ≥ 0.15 fuera de su patrón.
3. **Fuentes**: tus bibliotecas y criterio como fuente primaria de niveles (eres tú
   quien los va a testear); investigación externa (progresiones estándar de calistenia,
   streetlifting, gimnasia) como contraste para ramas que aún no entrenas. Cada nivel
   curado con nota corta de por qué (evita re-litigar).
4. **Bucle de validación**: la sigma empírica por familia y las reconciliaciones dirán
   qué ratios de dificultad curados están mal; revisar trimestralmente los que más se
   desvíen. El catálogo converge a *tu* dificultad real, que es la única que importa.

## 5. Orden de ataque propuesto

1. Corto §2.1–§2.2 (niveles + defaults): mata el bug reportado y toda su clase.
2. Corto §2.3–§2.4 (tarjeta de test + self-tests): mata los tests injustificados.
3. Medio §3.2 (asimetría por dificultad): limpieza estructural de pares raros.
4. Medio §3.1 + §3.4 (grafo + UI): progresiones paralelas de verdad.
5. Largo §4: catálogo como datos + pipeline + validación continua.
