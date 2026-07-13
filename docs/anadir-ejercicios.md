# Cómo añadir ejercicios sin romper el motor

El catálogo es el array `denseExerciseCatalog` en `app.js` (buscar la definición; los
levers se generan con `leverSkillExercises(prefix, label, bodyweightContributionPct)` y no
se tocan a mano).

## Anatomía de una entrada

```js
{
  id: "bulgarian_split_squat",        // snake_case, ÚNICO, nunca se renombra (las marcas lo referencian)
  name: "Bulgarian Split Squat",
  category: "push|pull|legs|core|skills|mobility",
  family: "single_leg_squat",         // ← CLAVE: conecta con denseTransferFamilyMeta
  nature: "bodyweight",               // modalidad POR DEFECTO al abrir el formulario
  allowedNatures: ["bodyweight", "weighted_calisthenics"], // modalidades seleccionables:
    // con >1 opción, el formulario muestra un selector "Modalidad" que reescribe
    // qué campos (reps/hold/carga) y esquemas aparecen y con qué nature se guarda
    // la marca. La 1ª suele ser la de defecto. `denseFormNatureOverride` guarda la
    // elección transitoria; `saveDenseTrainingForm` valida data.nature contra esta
    // lista. Ponla siempre coherente con lo que el ejercicio admite de verdad.
  isometric: true,                    // SOLO holds (levers, l-sit, cuelgues, hollow)
  bodyweightContributionPct: 80,      // % del peso corporal que mueve el ejercicio
  tonnageFactor: 1,
  repsPerSide: true,                  // unilaterales
  alpha: 0.12,                        // suavizado visual de gráficas
  icon: "person-standing",            // nombre de icono lucide
  video: "https://www.youtube.com/watch?v=...",  // opcional
  allowedSchemes: bodyweightSchemes,  // opcional; por defecto según nature
  loadPattern: "dumbbell_pair",       // opcional, solo mancuernas por pareja
}
```

## Checklist (en orden)

1. **`id` único y definitivo.** Comprobar que no existe: `grep '"id_nuevo"' app.js`.
   Renombrar un id rompe todas las marcas históricas que lo referencian.

2. **Elegir `family` existente si encaja.** Es lo que activa el motor de transferencias
   sin más trabajo: la metadata (patrones/músculos/especificidad) se hereda de
   `denseTransferFamilyMeta[family]`. Familias disponibles: `strict_pull, horizontal_pull,
   strict_dip, ring_push, pushup, hspu, handstand, press_to_handstand, front_lever,
   front_lever_pull, back_lever, back_lever_pull, cuelgue, single_leg_squat,
   squat_bodyweight, squat_weighted, hinge_weighted, hinge_bodyweight, atg_split_squat,
   toes_to_bar, l_sit, hollow, bridge, mobility_strength, accessory`.

3. **Si ninguna familia encaja**, dos opciones:
   - Ejercicio suelto: añadir override en `denseTransferIdMeta` con `patterns` (vocabulario
     en [motor-transferencias.md](motor-transferencias.md) §1), `muscles` (los 12 ejes) y
     `specificity`. Sin metadata cae al fallback de `category`, que es genérico y flojo.
   - Grupo nuevo de ejercicios: crear la familia en `denseTransferFamilyMeta`. Pesos 0–1;
     comparar con familias vecinas para calibrar (un coseno de patrones de ~0.5–0.7 con la
     familia más parecida es razonable).

4. **`bodyweightContributionPct` con criterio.** Es lo que convierte marcas de peso
   corporal en e1RM de sistema (`carga = bw × pct/100`). Referencias actuales: pull-up/dip
   ~100 (cuelga todo el cuerpo), push-up ~64, pike push-up ~70, ATG split squat 80,
   pistol ~95, levers 88. Un valor disparatado fabrica e1RM disparatados.

5. **`isometric: true` solo si se mide en segundos de hold.** Cambia el eje de puntuación
   (`iso`), el formulario (hold/ronda) y el factor de modalidad (0.6 con dinámicos).

6. **Variante con lastre de un ejercicio existente**: misma `family`, y añadir los dos
   overrides direccionales en `densePairOverrides` como los gemelos existentes
   (`sin_lastre>con_lastre: 0.85`, `con_lastre>sin_lastre: 0.9`).

7. **Si el ejercicio es una progresión de skill** (nueva palanca de lever, etc.): revisar
   `denseProgressionFamilies` (recibe boosts en bloque) y `denseLeverProgressionLevel`
   (factor de palanca por progresión).

7a. **Aristas del grafo de progresión** (`denseProgressionEdges`, junto al catálogo):
   declara de dónde viene (`progresa`), a dónde va y sus ramas `paralela`. El
   validador self-testeado exige ids reales, sin ciclos y que `progresa` suba de
   nivel dentro de la familia. Cadenas de referencia: `biblioteca-referencia.md`.

7b. **`progressionLevel` obligatorio si entra en una familia nivelada** (ver
   [motor-transferencias.md](motor-transferencias.md) §9.5: strict_pull, pushup,
   single_leg_squat, hinge_bodyweight, knee_dominant, hspu, handstand, toes_to_bar,
   cuelgue, one_arm_chin, l_sit, bridge — y cualquier otra que niveles después).
   Es la dificultad relativa dentro de la familia (0–1, el más duro ≈ 1): alimenta la
   estimación entre hermanas (`denseLeverSiblingEstimate`) y los defaults en frío
   (`denseFamilyDifficultyFactor`). Un ejercicio sin nivel en familia nivelada no estima
   ni recibe estimación de sus hermanas y arranca con el default de categoría sin
   escalar. Regla para elegirlo: pregunta "¿cuántas reps/segundos de éste salen por N
   del hermano conocido?" y despeja `nivel = nivel_hermano / ratio^(1/2.2)`. El
   self-test de monotonicidad valida que el default decrece al subir nivel.

8. **No hace falta tocar nada más.** Vecinos, coeficientes, calibración, sugerencias y
   analítica se derivan solos del catálogo + metadata.

## Verificación obligatoria tras el cambio

1. `node --check` no funciona con el fichero directamente si lo copias como `.gs`; para
   `app.js` basta: `node --check app.js`.
2. Abrir la app con **`?selftest=1`** → deben pasar todos (57 a jul 2026, consola). Si
   tocaste coeficientes, revisar los asserts de la matriz en `runDenseSelfTests` y
   actualizarlos SOLO si el cambio de valor es intencionado.
3. Sanity manual en consola:
   ```js
   denseTransferNeighbors(denseExerciseById("id_nuevo"))
   // → vecinos razonables con c entre 0.15 y 0.9; ninguna familia absurda
   denseMetaFor(denseExerciseById("id_nuevo"))
   // → debe devolver la metadata esperada, no el fallback de categoría
   ```
4. Subir la versión de caché en `index.html` **y** `sw.js` (mismo string
   `?v=20260701-cloud-pull-NN`).

## Errores que ya han pasado (no repetir)

- **TDZ**: declarar un `const` de nivel superior después del código que lo usa en el primer
  render → "Cannot access X before initialization". Las constantes nuevas del motor van al
  bloque de arriba (cerca de `const bodyweightSchemes`).
- **Comparar ejes distintos**: cualquier lógica nueva de "mejora" debe filtrar por
  `denseScoreType` igual que `denseTransferStep`.
- **Mutar `state.transfer` a mano**: siempre `rebuildTransferState()`.
- **Olvidar `denseNeighborCache = null`** tras cambiar coeficientes/overrides en caliente.
- **Coeficientes > 0.9 o boosts > 12%**: los clamps existen porque las estimaciones
  alimentan objetivos de entrenamiento reales; ser conservador.
