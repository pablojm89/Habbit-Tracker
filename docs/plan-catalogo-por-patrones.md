# Plan fino — ampliación del catálogo por patrones (fase 3)

> Escrito el 12 jul 2026. Ejecuta el §4 de
> [plan-progresiones-y-catalogo.md](plan-progresiones-y-catalogo.md) con un método
> repetible: **una sesión = un patrón**, cadena completa investigada (videoteca +
> internet), veredicto del usuario ejercicio a ejercicio, y alta solo de lo aceptado.
> Registro canónico por patrón en `docs/patrones/<patron>.md`.

## 0. Principios (no negociables)

1. **El catálogo no es la videoteca ni una enciclopedia.** La CADENA completa se
   documenta en el doc del patrón (incluidos los rechazados y por qué); al catálogo
   entra solo lo aceptado por el usuario y entrenable a corto/medio plazo.
2. **La videoteca es punto de partida, nunca techo**: cada sesión investiga qué
   progresiones adicionales circulan por las fuentes serias — el usuario no tiene todo
   lo que existe grabado.
3. **El usuario es el árbitro**: nada entra, se ordena ni se nivela sin su veredicto
   explícito (progresión ↑ / regresión ↓ / paralela ∥ / rechazado ✗).
4. **Cada alta es completa o no es**: `progressionLevel` + %BW + vectores + naturalezas
   + aristas del grafo + video (si existe en videoteca) + self-tests verdes. Sin
   entradas a medias.
5. **Los rechazos se registran con motivo** para no re-litigar en sesiones futuras.

## 1. Metodología de una sesión de patrón (guion repetible)

**Duración objetivo: 1 sesión = 1 patrón.** Si el patrón es enorme (empuje vertical),
se parte en dos sin mezclar patrones.

### Paso 1 — Inventario (sin juicio)
Tres columnas de origen, deduplicadas:
- **Catálogo**: qué familias/ejercicios BitTracker ya cubren el patrón.
- **Videoteca**: entradas de `biblioteca-referencia.md` (con link).
- **Investigación**: barrido web de progresiones reconocidas. Fuentes canónicas de
  arranque (contrastar SIEMPRE ≥2 independientes antes de proponer un orden):
  - *Overcoming Gravity* (Steven Low) — cartas de progresión por patrón con niveles.
  - *Recommended Routine* de r/bodyweightfitness — progresiones estándar consensuadas.
  - FitnessFAQs, Calisthenics Movement, GymnasticBodies/foros de gimnasia — variantes
    y pasos intermedios.
  - Streetlifting/gimnasia federada para las expresiones lastradas y de anillas.
  Búsqueda dirigida: "<patrón> progression chart", "<ejercicio> harder/easier
  variation", "<ejercicio> prerequisite".

### Paso 2 — Cadena propuesta (con juicio, aún sin catálogo)
Tabla única del patrón, una fila por ejercicio (plantilla en §3): tipo propuesto
respecto al ancla de la familia, nivel tentativo, eje (dinámico/iso), equipamiento,
fuente, y **por qué** (una línea). Donde las fuentes discrepen del orden → se marca
`[DISPUTA]` y se convierte en pregunta de calibración.

### Paso 3 — Veredicto del usuario (por lotes)
- Lotes de ≤4 preguntas (AskUserQuestion): primero pertenencia y tipo (¿entra? ¿es
  progresión, regresión o paralela?), después orden dentro de la rama, y por último
  **calibración de niveles por ratio** ("si haces N de A, ¿cuántas de B?" →
  `nivel = nivel_ancla / ratio^(1/exp)` con el exp vigente de la familia).
- Los ejercicios que el usuario no pueda valorar (nunca probados) entran con nivel
  de las fuentes + etiqueta mental "primer test: empieza por abajo" (ya automático).

### Paso 4 — Alta en catálogo
Por cada aceptado, checklist de `anadir-ejercicios.md` completa: entrada de catálogo
(id, familia o familia nueva, naturalezas, %BW, `progressionLevel`), metadata de
vectores si la familia es nueva, aristas `progresa`/`paralela` en
`denseProgressionEdges`, video de la videoteca si existe.

### Paso 5 — Verificación y cierre
1. Self-tests (`?selftest=1`): validador del grafo, monotonicidad de la familia,
   sin pares espurios nuevos ≥0.15 fuera de patrón (test genérico).
2. Humo con el simulador si la familia cambió mucho (targets de primer contacto sanos).
3. `docs/patrones/<patron>.md` con la cadena final (aceptados + rechazados con motivo).
4. Versión de caché + `ESTADO-SESIONES.md` + commit.

## 2. Calendario de sesiones (orden propuesto, ajustable)

| # | Patrón | Ancla actual | Qué se investiga (semilla, no límite) |
|---|--------|--------------|----------------------------------------|
| S1 🔰 | **Tirón vertical (dominadas → OAC)** — piloto | pull_up/chin_up, one_arm_chin | Regresiones (australiana vertical, asistida pies/goma, negativas, scap pulls), chest-to-bar, L-pull-up, dominada arqueada, typewriter, OAC chain fina (asistida dedos, arco unilateral) |
| S2 | Empuje vertical (pike → HSPU libre) | hspu, handstand, accessory | Box/Wall HeSPU (videoteca), déficit HSPU, negativas HSPU, wall runs, press militar unilateral; shoulder stand y bent arm press como rama skill |
| S3 | Dips / empuje descendente | strict_dip, parallel_dip | Regresiones (banco, asistidos, goma, negativas, ring support), RTO/Korean/Bulgarian dips, dips lastrados como eje weighted |
| S4 | Empuje horizontal (flexiones → anillas → …) | pushup, ring_push, bench | Rodillas, inclinadas, protraídas, arqueras, pseudo-planche PU, one-arm PU chain; decidir si planche abre familia nueva o queda fuera |
| S5 | Rodilla dominante | knee_dominant, single_leg_squat, squat_* | Sissy rango completo, step-up → split → bulgarian fino, shrimp chain (elevado manos delante/atrás, lastrado), dragon squat, 4D squats, sillín/skater |
| S6 | Cadera dominante / isquios | hinge_bodyweight, hinge_weighted, posterior_chain | Nordic asistido→completo→lastrado, curl isquio anillas/deslizante, razor curl, GM variantes, hip thrust si procede |
| S7 | Core compresión y anti-extensión | l_sit, toes_to_bar, hollow | Leg raises suelo→cuelgue→one-arm TTB, dragon flag (straddle→full), manna como horizonte de V-sit, ab wheel |
| S8 | Cuelgues, grip y straight-arm | cuelgue | Shawarma, arching/hollow hang, german hang, hiperprono, swings; niveles intermedios de una mano (asistido dedos) |
| S9 | Levers FL/BL — pasos intermedios | front/back_lever(_pull) | Open tuck y piked straddle (videoteca) dentro de `denseLeverProgressionLevel`, lastres/bandas, ice cream makers |
| S10 | Skills nuevas (solo si se van a entrenar) | — | Muscle up (false grip → transición → MU), OAHS, planche — cada una decide familia nueva sí/no |

Movilidad/ROM queda fuera del calendario (motor desacoplado); se ampliará bajo demanda.

## 3. Plantilla de ficha (tabla del doc de patrón)

| Campo | Ejemplo |
|---|---|
| Nombre / id propuesto | Dominada negativa / `pull_up_negative` |
| Origen | videoteca ✓ (link) · investigado (fuente) · catálogo |
| Tipo propuesto | regresión de `pull_up` |
| Rama | asistencias de dominada (misma familia `strict_pull` o familia nueva `pull_regression`) |
| Eje | dinámico (bodyweight_capacity) |
| Nivel tentativo | 0.45 (vs pull_up 1.0) |
| Naturalezas | bodyweight |
| Equipamiento | barra |
| Por qué | excéntrico puro; estándar en todas las fuentes como paso previo a la 1ª dominada |
| `[DISPUTA]` | — |
| Veredicto usuario | (pendiente) ✓ entra / ✗ fuera / ∥ paralela / reordenar |

**Criterio variante vs entrada**: si no cambia palanca, carga o rango de forma
medible/registrable (p. ej. un cue técnico, un agarre cosmético), NO es entrada de
catálogo: va como nota o video en la entrada existente.

**Criterio familia nueva vs familia existente**: misma expresión de fuerza y eje →
misma familia con nivel; patrón de movimiento distinto o eje distinto → familia nueva
con vectores propios (y guard de espurios verificado).

## 4. Reglas de investigación

1. **≥2 fuentes independientes** para afirmar un orden de dificultad; una sola fuente
   → `[DISPUTA]` automática y pregunta al usuario.
2. Preferir cartas de progresión completas (Overcoming Gravity, RR) para el esqueleto
   y canales técnicos para pasos intermedios y matices.
3. La dificultad publicada es población general: el nivel FINAL siempre se calibra
   con ratios del usuario cuando los conozca, y si no, queda como prior que sus tests
   corregirán (`denseFamilyEnduranceExp` ya aprende la curva real).
4. Registrar la fuente de cada nivel en la ficha (evita re-litigar).

## 5. Estado de ejecución

| Sesión | Estado | Doc |
|---|---|---|
| S1 Tirón vertical | ⬜ pendiente (piloto) | docs/patrones/tiron-vertical.md |
| S2–S10 | ⬜ | — |

> Al completar cada sesión: actualizar esta tabla, `ESTADO-SESIONES.md` y la tabla de
> familias niveladas de `motor-transferencias.md` §9.5.
