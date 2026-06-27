# Denseclub - auditoria visible de sistema y metricas

Snapshot: 2026-06-26.  
Perfil base: https://win.denseclub.com/profile/db0652e0-424e-42a5-ac06-9763dc97ceaa

Este documento usa solo datos visibles/publicos: pagina publica, endpoints publicos y bundle frontend descargado por el navegador. No incluye bypass de pago, autenticacion ni contenido privado.

## Resumen corto

Denseclub no es solo un tracker de kilos. Es un sistema de:

- fuerza absoluta: kg externos o lastre visible.
- fuerza relativa: carga / peso corporal diario.
- carga total de sistema: especialmente en calistenia lastrada, `BW + lastre`.
- densidad: trabajo dentro de ventanas `2D`, `5D`, `10D`, `20D`.
- PR por esquema: no compara solo "mejor ejercicio", compara ejercicio + esquema.
- e1RM: estimacion desde tablas de porcentajes por esquema.
- bodyweight performance: reps/min en una duracion fija.
- volumen/tonnage: probable suma de carga efectiva * reps, ajustada por contribucion de peso corporal y factor de tonnage.
- skill: tiempo, reps, distancia o booleano segun definicion.
- conditioning: watts, distancia, tiempo e intervalos.
- readiness/wellness: peso corporal, energia, dolor, sueno, fatigue score, CNS y exertion.

Para BitTracker, la idea buena es copiar la arquitectura, no cada numero exacto: definir ejercicios, definir que miden, registrar esfuerzo, calcular equivalencias y aprender desde el historial del usuario.

## Fuentes publicas usadas

Endpoints publicos confirmados:

```txt
GET https://api.denseclub.com/api/public/profiles/{user_id}/dashboard
GET https://api.denseclub.com/api/public/activity-feed?limit=20&user_id={user_id}&cursor=...
GET https://api.denseclub.com/api/public/profiles/{user_id}/workout?workout_date=YYYY-MM-DD
GET https://api.denseclub.com/api/public/exercises
GET https://api.denseclub.com/api/public/exercises/with-alternatives
GET https://api.denseclub.com/api/public/prediction-tables
GET https://api.denseclub.com/api/public/community-stats
GET https://api.denseclub.com/api/public/skills/types
GET https://api.denseclub.com/api/public/skills/definitions
GET https://api.denseclub.com/api/public/skill-definitions/list
GET https://api.denseclub.com/api/public/leaderboard/exercises/{exercise_id}
GET https://api.denseclub.com/api/public/leaderboard/metric/{metric}
GET https://api.denseclub.com/api/public/leaderboard/skills/{skill_definition_id}
```

Metric leaderboards publicos aceptados:

```txt
volume
dense_blocks
personal_records
skill_time
points
points_relative
```

## Opciones visibles en el frontend

Rutas de atleta vistas en el bundle:

```txt
/today
/dashboard
/calculator
/community
/education
/education/:courseSlug
/education/:courseSlug/:lessonSlug
/media/:itemSlug
/skills
/analytics
/shop
/profile
/profile/subscription
/profile/:userId
/notifications
/onboarding
```

Rutas de coaching/admin visibles, normalmente privadas:

```txt
/coaching/dashboard
/coaching/programs
/coaching/assignments
/coaching/athletes
/coaching/exercises
/coaching/skills
/coaching/routines
/coaching/education
/coaching/invitations
/coaching/settings
/admin/dashboard
/admin/users
/admin/athletes/:userId
/admin/settings/working-percentages
/admin/settings/bw-multipliers
/admin/settings/volume-landmarks
/admin/settings/structural-balance
```

Endpoints privados/auth visibles en el bundle, utiles como inspiracion de producto:

```txt
athlete/bodyweight
athlete/wellness/pre
athlete/wellness/post
athlete/wellness/today
athlete/wellness/trend
athlete/wellness/thresholds
athlete/analytics/bodyweight-trend
athlete/analytics/relative-strength
athlete/analytics/fatigue-score
athlete/analytics/cns/weekly
athlete/analytics/exertion/today
athlete/analytics/exertion/weekly
athlete/analytics/movement-pattern-balance
athlete/analytics/volume-per-muscle
athlete/analytics/structural-balance
athlete/analytics/scores
athlete/analytics/progress
athlete/analytics/prs-trend
athlete/analytics/dense-blocks-trend
athlete/analytics/effort-progression
athlete/analytics/conditioning/global
athlete/analytics/conditioning/exercises
athlete/exercises/predictions/batch
athlete/performances/latest-by-exercise
athlete/workouts/today
athlete/workouts/week
```

## Catalogo publico de ejercicios

Total publico: 200 ejercicios.

Por naturaleza:

| Tipo | Cantidad | Lectura |
|---|---:|---|
| bodyweight | 86 | reps por tiempo, isometricos, control corporal |
| weighted | 82 | kg externos, e1RM, tonnage |
| active_recovery | 10 | check-in/log sin carga importante |
| banded | 8 | reps por tiempo o resistencia cualitativa |
| conditioning | 6 | watts, distancia, tiempo, intervalos |
| plyometrics | 5 | reps/intervalos, altura/distancia, potencia |
| weighted_calisthenics | 3 | carga total `BW + lastre`, visible como +kg |

Campos importantes del ejercicio:

```txt
exercise_nature
load_pattern
movement_pattern
compound_type
conditioning_modality
contraction_type
bodyweight_contribution_pct
tonnage_factor
reps_per_side
tracks_watts
muscle_group_macros
equipment_required
video_url
```

Distribuciones relevantes:

| Campo | Valores principales |
|---|---|
| load_pattern | bodyweight 87, barbell 84, dumbbell_pair 22, machine 6, kettlebell_single 1 |
| movement_pattern | horizontal_push 16, isolation_pull 16, squat 15, hip_hinge 13, horizontal_pull 10, isolation_push 9, conditioning 9, vertical_push 7, vertical_pull 5 |
| contraction_type | mixed 96, isometric 18, concentric 2 |
| conditioning_modality | ergometer 3, sled 2, jumping 5, carry 1 |
| reps_per_side | 8 ejercicios |
| tracks_watts | 2 ejercicios |

La clave para BitTracker: cada ejercicio debe declarar que mide y como suma carga. No todos los ejercicios deben usar la misma formula.

## Esquemas Dense

Esquemas fijos de fuerza detectados:

```txt
2D5, 2D10, 2D20
5D1, 5D3, 5D5, 5D10, 5D20
10D1, 10D3, 10D5, 10D10, 10D20
10D1-2-3, 10D2-3-5
20D1, 20D3, 20D5, 20D10, 20D20
```

Para peso corporal la base es:

```txt
2D, 5D, 10D, 20D
```

Y luego el resultado se muestra como `XDY`, donde `Y` es reps/min. Ejemplo:

```txt
10D7 = 10 minutos, 70 reps totales, 7 reps/min
2D15 = 2 minutos, 30 reps totales, 15 reps/min
20D4 = 20 minutos, 80 reps totales, 4 reps/min
```

Isometricos:

```txt
2D, 5D, 10D, 20D rondas
5s, 10s, 20s, 30s, 40s, 60s hold
default visible: 5D30s
```

Effort/RPE interno:

| Valor | Label | Abreviado |
|---:|---|---|
| 2 | Very Easy | VE |
| 3 | Easy | E |
| 5 | Normal | N |
| 7 | Hard | H |
| 9 | Very Hard | VH |
| 10 | Very Hard | VH |

## Formula de fuerza con peso

Las tablas publicas de prediccion contienen porcentajes por esquema:

```txt
e1RM estimado = carga_usada / working_pct_del_esquema
```

Tambien hay bandas:

```txt
e1RM_min = carga / max_pct
e1RM_central = carga / working_pct
e1RM_max = carga / starting_pct
```

Tabla publica:

| Esquema | starting | working | max |
|---|---:|---:|---:|
| 2D5 | 0.733 | 0.778 | 0.822 |
| 2D10 | 0.475 | 0.535 | 0.595 |
| 2D20 | 0.371 | 0.404 | 0.436 |
| 5D1 | 0.826 | 0.893 | 0.960 |
| 5D3 | 0.723 | 0.794 | 0.864 |
| 5D5 | 0.620 | 0.688 | 0.756 |
| 5D10 | 0.362 | 0.445 | 0.529 |
| 5D20 | 0.258 | 0.314 | 0.370 |
| 10D1 | 0.800 | 0.864 | 0.927 |
| 10D3 | 0.700 | 0.767 | 0.835 |
| 10D5 | 0.600 | 0.665 | 0.730 |
| 10D10 | 0.350 | 0.431 | 0.511 |
| 10D20 | 0.250 | 0.304 | 0.358 |
| 10D1-2-3 | 0.725 | 0.803 | 0.881 |
| 10D2-3-5 | 0.613 | 0.753 | 0.793 |
| 20D1 | 0.773 | 0.834 | 0.896 |
| 20D3 | 0.676 | 0.741 | 0.806 |
| 20D5 | 0.580 | 0.643 | 0.705 |
| 20D10 | 0.338 | 0.416 | 0.494 |
| 20D20 | 0.242 | 0.294 | 0.346 |

Ejemplo:

```txt
Bench 10D5 con 84 kg
e1RM central = 84 / 0.665 = 126.3 kg
```

## Formula de peso corporal

La app usa multiplicadores publicos por duracion:

| Base | Multiplicador |
|---|---:|
| 2D | 0.900 |
| 5D | 0.600 |
| 10D | 0.330 |
| 20D | 0.270 |

Inferencia operativa:

```txt
capacidad_base = reps_por_minuto_origen / multiplicador_origen
reps_por_minuto_destino = floor(capacidad_base * multiplicador_destino)
reps_totales_destino = reps_por_minuto_destino * minutos_destino
```

Ejemplo basado:

```txt
Si haces 10D7 en dominadas:
capacidad_base = 7 / 0.330 = 21.21

2D estimado = floor(21.21 * 0.900) = 19 rpm => 38 reps
5D estimado = floor(21.21 * 0.600) = 12 rpm => 60 reps
20D estimado = floor(21.21 * 0.270) = 5 rpm => 100 reps
```

Esto no pretende ser fisiologicamente perfecto. Es una regla consistente para que BitTracker pueda estimar marcas cruzadas y luego corregirse con tus registros reales.

## Peso corporal diario

Si pide peso diario en bascula, tiene todo el sentido. El peso corporal afecta:

- fuerza relativa: `carga / BW`.
- calistenia lastrada: `BW + lastre`.
- estimacion de lastre real visible: `lastre = carga_total - BW`.
- comparacion justa entre dias si subes/bajas de peso.
- analitica de bodyweight trend.
- fatigue/readiness si cruza peso, wellness y rendimiento.

Formulas utiles:

```txt
relative_strength_weighted = external_load / bodyweight
weighted_calisthenics_total = bodyweight + added_load
weighted_calisthenics_relative = weighted_calisthenics_total / bodyweight
weighted_calisthenics_visible_added = weighted_calisthenics_total - bodyweight
```

Para ejercicios de peso corporal con contribucion parcial:

```txt
effective_bodyweight_load = bodyweight * bodyweight_contribution_pct / 100
effective_load = external_load + effective_bodyweight_load
tonnage = effective_load * reps * tonnage_factor
```

Esta ultima formula es deducida por los campos publicos `bodyweight_contribution_pct` y `tonnage_factor`; no es una confirmacion exacta del backend.

## Metricas por tipo

| Tipo | Input principal | Output/PR | Relativo | e1RM |
|---|---|---|---|---|
| weighted | kg, esquema, esfuerzo | kg por esquema, e1RM, tonnage | kg/BW | si |
| weighted_calisthenics | BW, lastre, esquema, esfuerzo | +kg visible, total interno | (BW+lastre)/BW | si, usando carga total |
| bodyweight | duracion, reps totales, esfuerzo | reps/min y reps totales | posible por BW contribution | no clasico |
| banded | duracion/reps o esquema | reps/min o nivel banda | normalmente no | no fiable |
| conditioning | tiempo, distancia, watts, intervalos | watts/distancia/tiempo/intervalos | no o especifico | no |
| plyometrics | reps, altura/distancia, tiempo | potencia/cantidad | no o especifico | no |
| skill | tiempo/reps/distancia/booleano | nivel, best value, skill time | no | no |
| active_recovery | completado/notas | adherencia | no | no |

## Skills

Catalogo publico:

- 8 tipos declarados en `/public/skills/types`.
- 43 definiciones publicas en `/public/skills/definitions`.

Tipos visibles:

```txt
Acrobat
Baller
Dancer
Endurer
Fastest
Giant
Health Yogi
Intellect
```

Measurement types:

| Tipo de medicion | Cantidad | Ejemplos |
|---|---:|---|
| reps | 19 | double unders, juggling counts, skipping reps |
| time_seconds | 14 | handstand, rope flow, padel, throw |
| boolean | 6 | ground movement, rope flow, sprint drills |
| distance_cm | 4 | lizard crawl, throw distance |

## Perfil de Keegan: maxima informacion publica

Dataset publico descargado:

```txt
Eventos publicos del feed: 438
Dias de entreno descargados: 102
Filas de ejercicio: 607
Ejercicios distintos observados: 151
Rango: 2023-05-19 -> 2026-06-25
```

Dashboard publico:

```txt
Tonnage all time: 828874.56 kg
PRs totales: 361
Ultimo entrenamiento publico: 2026-06-25
Frecuencia: 5.5 sesiones/semana
Workouts ultimos 7 dias: 8
```

Distribucion por naturaleza en sus registros:

| Tipo | Filas |
|---|---:|
| weighted | 256 |
| bodyweight | 140 |
| skill | 97 |
| conditioning | 56 |
| weighted_calisthenics | 24 |
| plyometrics | 15 |
| banded | 12 |
| active_recovery | 7 |

Esquemas mas usados:

```txt
2D10: 83
5D3: 38
10D5: 31
5D5: 31
5D10: 30
2D20: 24
5D1: 21
10D3: 20
2D5: 15
5D20: 14
20D1: 13
10D1: 11
10D10: 8
```

Ejercicios mas repetidos:

```txt
Barbell Bench Press: 28
Juggle: 22
Rope Flow: 16
Barbell Overhead Press: 14
Soccer Ball / Foot Skills: 13
Skipping: 12
Long Lunge Pulse: 12
Barbell Back Squat: 12
Padel & racquets: 12
Snatch: 11
Nordic Curl: 11
Clean: 10
Exercise Bike Sprint: 10
Assault Bike / AirDyne: 10
Face Pull: 9
Hanging Leg Raise: 9
Ski-Erg: 9
Jefferson Curl: 9
Weighted Dips: 9
Depth Drop: 9
```

Lectura de rutina:

- Mucha frecuencia y mucha variedad.
- Skills casi diarias o muy frecuentes.
- Fuerza principal con barra se mide con esquemas fijos.
- Peso corporal se mide por reps/min dentro de tiempos fijos.
- Accesorios y tendon/rodilla/cadera aparecen como trabajo recurrente.
- Conditioning aparece con bloques cortos y medibles.
- No parece una periodizacion lineal clasica; parece una rotacion por benchmarks, PRs por esquema y mantenimiento amplio.

## Community stats

Metricas globales publicas:

| Periodo | PRs | Dense blocks | Loaded volume |
|---|---:|---:|---:|
| today | 67 | 114 | 195526.98 |
| week | 316 | 622 | 958885.44 |
| month | 2146 | 3676 | 6079752.48 |
| all_time | 7098 | 14901 | 21436372.12 |

## Como llevarlo a BitTracker

Modelo de datos recomendado:

```txt
Exercise
- id
- name
- category/nature
- movement_pattern
- load_pattern
- measurement_mode
- bodyweight_contribution_pct
- tonnage_factor
- supports_external_load
- supports_added_load
- supports_reps_per_minute
- supports_isometric
- supports_distance
- supports_watts
- supports_skill_value

Performance
- exercise_id
- date
- scheme_base: 2D/5D/10D/20D
- scheme_target: 1/3/5/10/20 or reps_per_minute
- duration_minutes
- total_reps
- external_load
- added_load
- bodyweight
- total_system_load
- effort
- notes
- computed_e1rm
- computed_relative
- computed_tonnage
```

Motor de estimacion:

```txt
1. Si es weighted:
   usar working_pct por esquema para estimar e1RM.
   desde e1RM estimar kg de otros esquemas.

2. Si es weighted_calisthenics:
   convertir lastre a carga total: BW + lastre.
   aplicar la misma tabla de fuerza a carga total.
   volver a mostrar como lastre: carga_total_objetivo - BW_actual.

3. Si es bodyweight:
   convertir marca a reps/min.
   usar multiplicadores 2D/5D/10D/20D.
   ajustar con historial personal y esfuerzo.

4. Si el entreno fue facil:
   subir objetivo siguiente dentro del mismo esquema.

5. Si fue normal:
   mantener o subir ligeramente si hubo PR.

6. Si fue dificil:
   mantener.

7. Si no se llego:
   bajar objetivo o repetir con margen.
```

Regla simple de aprendizaje:

```txt
estimated_capacity_new =
  0.70 * estimated_capacity_old +
  0.30 * observed_capacity_adjusted_by_effort
```

Ajuste por esfuerzo:

```txt
VE: observed * 1.08
E:  observed * 1.04
N:  observed * 1.00
H:  observed * 0.97
VH: observed * 0.94
fallo/no_llego: observed * 0.90
```

## Decision de producto

Para tu app no necesitas clonar todas las pantallas. El nucleo potente seria:

1. Registro diario de peso corporal.
2. Registro de entrenamiento con ejercicio + esquema + resultado + esfuerzo.
3. Tabla de e1RM para ejercicios con peso.
4. Tabla de multiplicadores por duracion para peso corporal.
5. Carga total para calistenia lastrada.
6. PR por ejercicio + esquema, no solo PR absoluto.
7. Recomendacion siguiente por esquema: subir, mantener o bajar.
8. Analiticas: fuerza absoluta, fuerza relativa, volumen, PRs, densidad, balance de patrones, fatiga subjetiva.

