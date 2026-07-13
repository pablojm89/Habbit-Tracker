# S1 — Tirón vertical (dominadas → OAC)

> Sesión de patrón ejecutada el 13 jul 2026 según
> [plan-catalogo-por-patrones.md](../plan-catalogo-por-patrones.md). Cadena
> investigada (videoteca + fuentes externas), veredicto del usuario aplicado.
> Fuentes: Start Bodyweight (progresión de dominada), Hooper's Beta (OAC en 16
> niveles), Calisthenics Association, NinjaWarriorX, RR de r/bodyweightfitness.

## Cadena final (aceptada)

Niveles relativos dentro de cada familia (pull_up = 1.0; pueden superar 1).

### Puerta de entrada (enseñar a tirar) — decisión del usuario
- `incline_row` **Remo inclinado** (0.6, `horizontal_pull`) → `ring_row` (1.0):
  "aún no siendo tirón vertical, enseña a tirar de muy principiante".
- `scapular_pull` **Dominada escapular** (0.25, `strict_pull`): cuelgue activo por
  reps para poco dominio escapular. ∥ `cuelgue_active`.
- `lat_pulldown` **Jalón al pecho** (weighted, familia propia con vectores id):
  opción con material de gym. ∥ `pull_up`.
- Máquina de dominadas asistidas: **sin entrada** — es la modalidad `assisted`
  añadida a `pull_up`/`chin_up` (contrapeso resta peso).

### Cadena principal (`strict_pull`)
`scapular_pull` 0.25 → `pull_up_feet_assisted` 0.35 → `pull_up_band_assisted` 0.5
(nota: usar siempre la misma goma) → `pull_up_negative` 0.6 → `chin_up` 0.95 →
`pull_up` 1.0 — **supinas siempre antes que pronas** (veredicto usuario; la arista
chin→pull pasó de paralela a progresa). ∥ `l_pull_up` 1.1 (paralela, integra
compresión).

### Hito de lastre
Antes de archer: dominada lastrada ≈ **+BW/6** (modalidad `weighted_calisthenics`
de pull_up, no es nodo del grafo — queda como criterio de paso).

### Camino OAC (`one_arm_chin`)
`archer_chin_up` 0.65 → `oac_negative` 0.8 → `one_arm_chin_up` 1.0, con dos
paralelas de asistencia: `oac_assisted` **(goma/polea — renombrada, cubre ambas)**
y `oac_finger_assisted` **OAC con dedos de asistencia** (0.88, nueva).

## Rechazados (con motivo — no re-litigar)

| Ejercicio | Motivo |
|---|---|
| Jackknife pull-up | Redundante con asistida pies en suelo |
| Chest-to-bar | No seleccionada por el usuario (backlog; videoteca la tiene) |
| Typewriter pull-up | No seleccionada (backlog); el usuario prefiere lastre→archer |
| Uneven/toalla | Sustituida por OAC asistida con goma (misma función, mejor dosificable) |
| Dominada en anillas | Variante de `pull_up`, no cambia palanca/carga de forma medible |
| High pull / waist-to-bar | Difere a S10 (antesala del muscle up) |

## Calibraciones pendientes
- Chest-to-bar sin ratio (no probada) — irrelevante mientras no entre.
- Niveles de regresiones puestos por fuentes (0.35/0.5/0.6): el usuario está por
  encima de ese rango, así que solo importan como regresiones/deload; sus tests
  las corregirían si las usa.

## Notas técnicas de la sesión
- `denseFamilyDifficultyFactor` ganó un **suelo de 0.25**: con regresiones
  profundas en la familia (scap 0.25 vs pull 1.0) el default en frío del hermano
  duro colapsaba a ~0.
- `denseFormTargetHoldPerRound` ya no descarta estimaciones de hermana <2s: caía
  a un default MÁS alto e invertía dificultad (pillado por self-test).
- +3 self-tests S1 (65 total).
