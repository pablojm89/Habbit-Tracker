# Denseclub - Keegan Smith: tarjetas visibles y metricas de pagina

Snapshot: 2026-06-26. Fuente: perfil publico y endpoints publicos de Denseclub.

Este documento complementa `denseclub-keegan-exercise-frameworks.md`: aqui no se resume solo por fechas, sino con el formato de informacion que muestra la pagina en las tarjetas de PR/resultados.

## Campos visibles que hay que copiar a BitTracker

| Campo pagina | Campo/API | Regla de display |
|---|---|---|
| Nombre | `exercise_name` | texto normal |
| Esquema | `dense_scheme` | `Dense 2D10`; si es isometrico `2D20s` => `2x20s Iso`; si `dumbbell_pair` => `(per DB)` |
| Valor absoluto | `pr_value` | weighted: kg; weighted calisthenics: `+(pr_value-BW)kg`; bodyweight: reps |
| Relativo | `pr_value / bodyweight_at_pr` | solo weighted y weighted_calisthenics: `0.56x BW`, `1.25x BW` |
| Peso corporal usado | `bodyweight_at_pr` | base para relativo y lastre |
| Esfuerzo | `effort` | deducido: 2=VE, 3=E, 5=N, 7=H, 9=VH |
| Ranking | `rank_position / rank_total` | `#6 / 22` |
| Load pattern | `load_pattern` | `dumbbell_pair`, `barbell`, `machine`, etc. |
| Notas del entreno | `notes` en workout detail | ej. top weight, started at... |

## Tarjetas recientes visibles

| Fecha | Ejercicio | Tipo | Esquema display | Valor display | Relativo | Effort | Ranking | Load pattern | BW | Notas |
|---|---|---|---|---:|---:|---|---:|---|---:|---|
| 2026-06-25 | Clap Push-Up | bodyweight | Dense 10D | 70 reps |  | N | #3/23 | bodyweight | 80 |  |
| 2026-06-25 | L Sit | bodyweight | Dense 2D | 20 reps |  | N | #1/1 | bodyweight | 80 |  |
| 2026-06-25 | One Arm Chin-up | bodyweight | Dense 5D | 5 reps |  | N | #1/2 | bodyweight | 80 |  |
| 2026-06-25 | Cable Face Pull | weighted | Dense 2D10 | 45kg | 0.56x BW | N | #6/22 | machine | 80 |  |
| 2026-06-25 | DB Flies | weighted | Dense 2D10 | 10kg | 0.13x BW | E | #8/20 | barbell | 80 |  |
| 2026-06-25 | Barbell Bench Press | weighted | Dense 20D5 | 65kg | 0.81x BW | E | #1/1 | barbell | 80 | Started at 82.5kg |
| 2026-06-25 | DB Wrist Pronation | weighted | Dense 2D10 (per DB) | 10kg | 0.13x BW | N | #5/26 | dumbbell_pair | 80 |  |
| 2026-06-25 | DB Wrist Supination | weighted | Dense 2D10 (per DB) | 10kg | 0.13x BW | N | #5/26 | dumbbell_pair | 80 |  |
| 2026-06-25 | Deadmill Push | conditioning | for_reps | 5 reps |  | N | #3/4 | bodyweight | 80 |  |
| 2026-06-25 | Muscle Snatch | weighted | Dense 2D10 | 20kg | 0.25x BW | E | #1/1 | barbell | 80 |  |
| 2026-06-25 | Clean | weighted | Dense 10D1 | 100kg | 1.25x BW | N | #5/21 | barbell | 80 | Top weight 105kg from reactive hang clean. |
| 2026-06-23 | Overhead Cable Triceps Extension | weighted | Dense 2D10 | 15kg | 0.19x BW | N | #21/30 | barbell | 80 |  |
| 2026-06-23 | Prone Reverse Shoulder Fly | weighted | Dense 2D20 | 2.5kg | 0.03x BW | E | #31/33 | barbell | 80 |  |
| 2026-06-22 | Deep Knee Bends (bodyweight) | bodyweight | Dense 2D | 60 reps |  | H | #4/36 | bodyweight | 82 |  |
| 2026-06-22 | Belt March | weighted | 2x20s Iso | 150kg | 1.83x BW | N | #1/1 | barbell | 82 |  |
| 2026-06-22 | Seated Good Morning | weighted | Dense 2D20 | 30kg | 0.37x BW | N | #9/35 | barbell | 82 |  |
| 2026-06-21 | Barbell Bench Press | weighted | Dense 2D5 | 92.5kg | 1.14x BW | N | #1/2 | barbell | 81 |  |
| 2026-06-21 | Speed Coordination | skill | total_time | 10 |  |  | #5/24 |  | 82 |  |
| 2026-06-20 | Jefferson Curl | weighted | Dense 2D10 | 20kg | 0.24x BW | VE | #23/42 | barbell | 82.2 |  |
| 2026-06-20 | Jump Landings | bodyweight | Dense 2D | 10 reps |  | N | #1/1 | bodyweight | 82.2 |  |
| 2026-06-20 | Skipping | conditioning | for_time | 1 |  | VE | #10/10 | barbell | 82.2 |  |
| 2026-06-20 | Chin-up | bodyweight | Dense 2D | 24 reps |  | N | #1/2 | bodyweight | 82.2 |  |
| 2026-06-20 | Clap Push-Up | bodyweight | Dense 5D | 55 reps |  | N | #3/29 | bodyweight | 82.2 |  |
| 2026-06-20 | Rack Pull (Top of knees) | weighted | Dense 10D10 | 90kg | 1.09x BW | E | #1/1 | barbell | 82.2 |  |
| 2026-06-20 | Standing Calf Raise | weighted | Dense 10D20 | 1kg | 0.01x BW | N | #16/22 | barbell | 82.2 |  |
| 2026-06-19 | Hamstring Curl | weighted | Dense 2D20 | 37.5kg | 0.46x BW | N | #6/24 | barbell | 82.2 |  |
| 2026-06-19 | Poliquin Step Up | weighted | Dense 2D20 | 35kg | 0.43x BW | E | #5/31 | barbell | 82.2 |  |
| 2026-06-17 | Hanging Leg Raise | bodyweight | Dense 2D | 34 reps |  | N | #8/57 | bodyweight | 81 |  |
| 2026-06-17 | Toe Presses | bodyweight | Dense 2D | 30 reps |  | N | #27/40 | bodyweight | 81 |  |
| 2026-06-17 | Kneeling Jump To Vertical | weighted | Dense 2D5 | 12kg | 0.15x BW | N | #14/32 | barbell | 81 |  |
| 2026-06-16 | Farmers Carry | conditioning | for_reps | 40 reps |  | E | #2/4 | barbell | 81 |  |
| 2026-06-16 | Dips | bodyweight | Dense 10D | 100 reps |  | N | #2/11 | bodyweight | 81 |  |
| 2026-06-16 | Wide Weighted Pull-Ups | weighted_calisthenics | Dense 10D3 | +5kg | 1.06x BW | N | #8/13 | barbell | 81 |  |
| 2026-06-16 | Ab Rollout | bodyweight | Dense 2D | 36 reps |  | N | #3/29 | bodyweight | 81 |  |
| 2026-06-16 | Bench Press with Bands | weighted | Dense 10D5 | 42kg | 0.52x BW | N | #2/2 | barbell | 81 |  |
| 2026-06-16 | Box Jump | plyometrics | axis_max_box_height | 45 |  | N | #27/32 | barbell | 81 |  |
| 2026-06-16 | Depth Drop | plyometrics | Dense 5D5 | 25 |  | N | #4/5 | barbell | 81 |  |
| 2026-06-16 | Banded Knee Lockouts | banded | Dense 2D20 | 40 reps |  | N | #32/37 | barbell | 81 |  |
| 2026-06-14 | Handstand | skill | total_time | 20 |  |  | #1/36 |  | 82 |  |
| 2026-06-12 | Barbell Bench Press Pin Lockouts | weighted | Dense 2D5 | 140kg | 1.71x BW | N | #1/1 | barbell | 82 |  |
| 2026-06-12 | Running | conditioning | axis_longest_duration | 9000 |  | H | #2/8 | barbell | 82 |  |
| 2026-06-11 | Behind the Neck Press | weighted | Dense 10D3 | 42.5kg | 0.52x BW | N | #1/2 | barbell | 81 |  |
| 2026-06-11 | Cable Face Pull | weighted | Dense 2D20 | 27kg | 0.33x BW | N | #7/27 | machine | 81 |  |
| 2026-06-11 | DB Flies | weighted | Dense 2D20 | 5kg | 0.06x BW | E | #25/32 | barbell | 81 |  |
| 2026-06-11 | Clean | weighted | Dense 20D1 | 70kg | 0.85x BW | VE | #11/25 | barbell | 82 |  |
| 2026-06-11 | Depth Drop | plyometrics | Dense 5D3 | 15 |  | E | #2/4 | barbell | 82 |  |
| 2026-06-11 | Nordic Curl | bodyweight | Dense 10D | 10 reps |  | VE | #26/29 | bodyweight | 82 |  |
| 2026-06-01 | Bodyweight Walking Lunges | bodyweight | Dense 10D | 80 reps |  | N | #1/2 | bodyweight | 84 |  |
| 2026-06-01 | Single Leg Hinge | bodyweight | Dense 10D | 100 reps |  | N | #1/1 | bodyweight | 84 |  |
| 2026-06-01 | Bodyweight Romanian Rhythm Squat | bodyweight | Dense 2D | 100 reps |  | E | #1/3 | bodyweight | 84 |  |

## Deducciones de display

### Relativo x BW

Para weighted normal:

```txt
relative = weight_kg / bodyweight_at_pr
```

Ejemplos visibles:

- Cable Face Pull 45kg, BW 80kg => 45/80 = 0.56x BW.
- Barbell Bench Press 65kg, BW 80kg => 0.81x BW.
- Clean 100kg, BW 80kg => 1.25x BW.

Para weighted calisthenics:

```txt
internal_value = bodyweight + added_load
visible_added_load = internal_value - bodyweight
relative = internal_value / bodyweight
```

Ejemplo visible:

- Wide Weighted Pull-Ups: +5kg y 1.06x BW con BW 81kg => internal ~= 86kg.

### Dumbbell pair / per DB

Cuando `load_pattern = dumbbell_pair`, la pagina muestra `(per DB)`. El valor visible es por mancuerna, y BitTracker deberia guardar ambos:

```txt
weight_per_db = pr_value
total_external_load = pr_value * 2
relative_display = pr_value / BW   // igual que pagina
relative_total_internal = (pr_value * 2) / BW // util para calculos propios si se desea
```

Ejemplos visibles:

- DB Wrist Pronation `2D10 (per DB)` 10kg, BW 80kg => display 0.13x BW.
- DB Wrist Supination `2D10 (per DB)` 10kg, BW 80kg => display 0.13x BW.

### Isometricos

`2D20s` se muestra como:

```txt
2x20s Iso
```

Ejemplo visible:

- Belt March `2x20s Iso`, 150kg, BW 82kg => 1.83x BW.

### Esfuerzo

La letra visible parece mapearse asi:

```txt
2 => VE = very easy
3 => E  = easy
5 => N  = normal
7 => H  = hard
9 => VH = very hard
```

Este esfuerzo debe afectar a la siguiente recomendacion: VE/E sube, N progresa normal, H/VH mantiene o baja.

## Implicacion para BitTracker

No basta con guardar `date + exercise + scheme`. La ficha de resultado deberia guardar y mostrar:

```txt
exercise_name
exercise_nature
dense_scheme
scheme_display
value_absolute
value_display
bodyweight_at
relative_to_bw
effort_number
effort_label
rank_position
rank_total
load_pattern
notes
```

Con eso BitTracker puede replicar la lectura de Denseclub y, ademas, alimentar el estimador progresivo.
