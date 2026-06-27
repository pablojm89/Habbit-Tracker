# Denseclub - Keegan Smith: ejercicios y marcos de reps

Snapshot: 2026-06-26. Datos publicos del perfil hasta 2026-06-25.

Perfil: https://win.denseclub.com/profile/db0652e0-424e-42a5-ac06-9763dc97ceaa

Endpoints publicos usados: `https://api.denseclub.com/api/public/profiles/{user_id}/dashboard`, `https://api.denseclub.com/api/public/activity-feed`, `https://api.denseclub.com/api/public/profiles/{user_id}/workout?workout_date=YYYY-MM-DD`.

## Resumen

- Eventos publicos del feed: 438
- Dias de entreno descargados: 102
- Filas de ejercicio: 607
- Ejercicios distintos observados: 151
- Rango: 2023-05-19 -> 2026-06-25
- Tonnage total dashboard: 828874.56 kg
- PRs totales dashboard: 361

## Lectura principal

Tu observacion encaja con los datos:

- En ejercicios con peso, el marco suele ser fijo: `5D10`, `10D5`, `2D10`, etc. La progresion principal es subir o ajustar kg dentro del mismo marco.
- En peso corporal, lo fijo suele ser el tiempo: `2D`, `5D`, `10D`, `20D`. La progresion real es subir reps totales o reps/min. En el detalle aparecen etiquetas derivadas tipo `2D15`, `5D14`, `10D7`.
- En calistenia lastrada, la app guarda carga total del sistema: `BW + lastre`. Para el usuario se ve como +kg, pero para estimar conviene trabajar con carga total.
- Conditioning y skills no se comportan como XDY puro: usan tiempo total, distancia, watts, intervalos, booleanos o ejes especificos.

## Distribucion por tipo

| Tipo | Filas | Ejercicios | Esquemas principales |
|---|---:|---:|---|
| active_recovery | 7 | 2 | (sin esquema):7 |
| banded | 12 | 5 | 2D10:5, 2D20:3, 5D20:2, 3D5:1, 5D3:1 |
| bodyweight | 140 | 40 | (sin esquema):10, 5D3:10, 2D20:9, 5D5:9, 5D10:7, 2D5:6, 2D:5, 2D50:5, 2D10:4, 10D5:4, 2D30:3, 3D12:3 |
| conditioning | 56 | 9 | (sin esquema):56 |
| plyometrics | 15 | 4 | (sin esquema):9, 5D3:3, 5D5:2, 10D5:1 |
| skill | 97 | 15 | (sin esquema):97 |
| weighted | 256 | 71 | 2D10:73, 5D3:23, 5D10:23, 10D5:21, 5D5:18, 5D1:15, 2D20:12, 10D3:12, (sin esquema):10, 20D1:10, 5D20:9, 2D5:8 |
| weighted_calisthenics | 24 | 5 | 10D3:5, 10D5:5, 5D1:3, 5D5:2, 10D1:2, (sin esquema):1, 2D5:1, 2D10:1, 5D3:1, 10D1-2-3:1, 10D10:1, 20D5:1 |

## Con peso: marco fijo, progresa la carga

| Ejercicio | Filas | Rango fechas | Esquemas usados | Rango carga | Mejores cargas por esquema |
|---|---:|---|---|---:|---|
| 3 Position Snatch | 4 | 2026-04-08 -> 2026-05-20 | 5D3 | 40-56 kg | 5D3 56kg e5 |
| Barbell Back Squat | 12 | 2026-03-30 -> 2026-06-19 | 2D10, 5D3, 5D5, 5D10, 10D5, 10D10 | 25-74 kg | 2D10 44kg e2; 5D3 64kg e2; 5D5 74kg e3; 5D10 40kg e3; 10D5 60kg e2; 10D10 30kg e5 |
| Barbell Bench Press | 28 | 2023-05-25 -> 2026-06-25 | 2D5, 5D1, 5D3, 5D5, 5D20, 10D1, 10D2-3-5, 10D3, 10D5, 10D10, 20D1, 20D5 | 40-112.5 kg | 2D5 92.5kg e5; 5D1 112.5kg e5; 5D3 92kg e5; 5D5 90kg e7; 5D20 45kg e7; 10D1 112.5kg e5; 10D2-3-5 70kg e3; 10D3 85kg e5; 10D5 84kg e7; 10D10 52kg e5; 20D1 108kg e5; 20D5 65kg e3 |
| Barbell Bench Press Pin Lockouts | 2 | 2026-03-10 -> 2026-06-12 | 2D5, 5D5 | 130-140 kg | 2D5 140kg e5; 5D5 130kg e5 |
| Barbell Biceps Curl | 4 | 2026-04-09 -> 2026-04-30 | 2D10 | 25-35 kg | 2D10 35kg e9 |
| Barbell Close Grip Bench Press | 1 | 2026-05-30 -> 2026-05-30 | 10D5 | 60-60 kg | 10D5 60kg e5 |
| Barbell Overhead Press | 14 | 2023-05-19 -> 2026-05-28 | (sin esquema), 2D10, 5D1, 5D3, 5D5, 5D10, 10D1, 10D5 | 0-75 kg | 2D10 45kg e5; 5D1 62.5kg e5; 5D3 50kg e5; 5D5 50kg e5; 5D10 40kg e7; 10D1 75kg e5; 10D5 55kg e5 |
| Barbell Overhead Press / Full, Top, Bottom | 1 | 2026-05-07 -> 2026-05-07 | 5D20 | 20-20 kg | 5D20 20kg e3 |
| Barbell Romanian Deadlift | 1 | 2026-03-09 -> 2026-03-09 | 5D10 | 60-60 kg | 5D10 60kg e5 |
| Barbell Row | 2 | 2026-05-05 -> 2026-05-19 | 5D10 | 40-60 kg | 5D10 60kg e5 |
| Behind the Neck Press | 1 | 2026-06-11 -> 2026-06-11 | 10D3 | 42.5-42.5 kg | 10D3 42.5kg e5 |
| Belt March | 8 | 2026-05-11 -> 2026-06-22 | (sin esquema), 2D5, 10D3 | 1-150 kg | 2D5 100kg e5; 10D3 60kg e5 |
| Bench Press with Bands | 1 | 2026-06-09 -> 2026-06-09 | 10D5 | 42-42 kg | 10D5 42kg e5 |
| Cable Face Pull | 3 | 2026-06-11 -> 2026-06-25 | 2D10, 2D20 | 27-45 kg | 2D10 45kg e5; 2D20 27kg e5 |
| Clean | 10 | 2026-03-11 -> 2026-06-25 | 5D1, 5D3, 10D1, 10D5, 20D1 | 60-100 kg | 5D1 100kg e5; 5D3 80kg e5; 10D1 100kg e5; 10D5 60kg e5; 20D1 70kg e2 |
| Clean & Jerk | 5 | 2026-04-08 -> 2026-04-29 | 5D1, 5D3 | 54-90 kg | 5D1 90kg e5; 5D3 80kg e5 |
| Cross Bench Pullover | 2 | 2026-03-12 -> 2026-03-26 | 2D10 | 15-20 kg | 2D10 20kg e5 |
| DB Bench Press | 1 | 2026-04-04 -> 2026-04-04 | 5D5 | 25-25 kg | 5D5 25kg e5 |
| DB Biceps Curl | 1 | 2026-05-07 -> 2026-05-07 | 2D10 | 12.5-12.5 kg | 2D10 12.5kg e5 |
| DB Bulgarian Split Squat | 5 | 2026-04-27 -> 2026-05-25 | 5D3, 10D3, 10D5 | 5-20 kg | 5D3 20kg e5; 10D3 20kg e5; 10D5 15kg e5 |
| DB Flies | 3 | 2026-06-11 -> 2026-06-25 | 2D10, 2D20 | 5-10 kg | 2D10 10kg e3; 2D20 5kg e3 |
| DB Incline Bench Press | 4 | 2026-04-07 -> 2026-04-28 | 5D10 | 20-22.5 kg | 5D10 22.5kg e7 |
| DB Lying Triceps Extension | 4 | 2026-04-09 -> 2026-04-30 | 2D10 | 5-20 kg | 2D10 20kg e5 |
| DB Tricep Extension | 1 | 2026-05-07 -> 2026-05-07 | 2D10 | 6-6 kg | 2D10 6kg e5 |
| DB Wrist Pronation | 1 | 2026-06-24 -> 2026-06-24 | 2D10 | 10-10 kg | 2D10 10kg e5 |
| DB Wrist Supination | 1 | 2026-06-24 -> 2026-06-24 | 2D10 | 10-10 kg | 2D10 10kg e5 |
| Deadlift | 1 | 2026-03-27 -> 2026-03-27 | 10D3 | 100-100 kg | 10D3 100kg e5 |
| Deep knee bends | 1 | 2026-06-01 -> 2026-06-01 | 2D20 | 2-2 kg | 2D20 2kg e3 |
| Dip Lockouts | 2 | 2026-04-26 -> 2026-05-02 | 5D20, 20D20 | 1-5 kg | 5D20 1kg e5; 20D20 5kg e5 |
| Face Pull | 9 | 2026-03-10 -> 2026-04-28 | 2D10, 5D10, 5D20 | 25-65 kg | 2D10 65kg e5; 5D10 40kg e3; 5D20 25kg e3 |
| Front Squat | 5 | 2026-03-13 -> 2026-05-22 | 2D10, 5D1, 5D3, 5D5 | 45-80 kg | 2D10 45kg e3; 5D1 80kg e5; 5D3 50kg e3; 5D5 65kg e3 |
| Goblet Squat | 4 | 2026-03-06 -> 2026-04-13 | 5D10, 10D3, 10D5 | 20-40 kg | 5D10 40kg e5; 10D3 40kg e3; 10D5 40kg e3 |
| Hamstring Curl | 1 | 2026-06-19 -> 2026-06-19 | 2D20 | 37.5-37.5 kg | 2D20 37.5kg e5 |
| High Hang Split Snatch | 3 | 2026-05-06 -> 2026-05-20 | 5D3, 10D3 | 40-40 kg | 5D3 40kg e5; 10D3 40kg e5 |
| High Step Up | 3 | 2026-03-09 -> 2026-03-23 | 5D3, 10D2-3-5, 10D5 | 10-20 kg | 5D3 20kg e5; 10D2-3-5 15kg e5; 10D5 10kg e3 |
| Hip Flexor Cable Pull In | 7 | 2026-03-16 -> 2026-04-27 | 2D10 | 35-60 kg | 2D10 60kg e7 |
| Jefferson Curl | 9 | 2026-03-16 -> 2026-06-19 | (sin esquema), 2D5, 2D10 | 0-20 kg | 2D5 20kg e5; 2D10 20kg e2 |
| Jerk | 3 | 2026-03-06 -> 2026-03-25 | 5D1, 20D1 | 60-92 kg | 5D1 92kg e5; 20D1 85kg e5 |
| Kettlebell Suitcase March | 3 | 2026-04-30 -> 2026-05-29 | 2D10 | 27.5-28 kg | 2D10 28kg e5 |
| Kneeling Jump To Vertical | 3 | 2026-06-10 -> 2026-06-24 | 2D5 | 1-12 kg | 2D5 12kg e5 |
| Lat Pulldown | 1 | 2026-04-23 -> 2026-04-23 | 5D10 | 50-50 kg | 5D10 50kg e5 |
| Marinovich Super Cat Combo | 1 | 2026-03-24 -> 2026-03-24 | 5D20 | 30-30 kg | 5D20 30kg e5 |
| Muscle Snatch | 1 | 2026-06-24 -> 2026-06-24 | 2D10 | 20-20 kg | 2D10 20kg e3 |
| Overhead Cable Triceps Extension | 2 | 2026-06-09 -> 2026-06-23 | 2D10 | 5-15 kg | 2D10 15kg e5 |
| Patrick Step-Up (6 inches default) | 1 | 2026-03-09 -> 2026-03-09 | 10D20 | 45-45 kg | 10D20 45kg e3 |
| Poliquin Step Up | 1 | 2026-06-19 -> 2026-06-19 | 2D20 | 35-35 kg | 2D20 35kg e3 |
| Prone Reverse Shoulder Fly | 3 | 2026-06-02 -> 2026-06-23 | 2D20 | 1-2.5 kg | 2D20 2.5kg e3 |
| Quarter Squat (Pins) | 2 | 2026-03-09 -> 2026-04-08 | 5D5, 10D5 | 90-130 kg | 5D5 90kg e3; 10D5 130kg e5 |
| Rack Pull (Top of knees) | 1 | 2026-06-19 -> 2026-06-19 | 10D10 | 90-90 kg | 10D10 90kg e3 |
| Rack Pull ISO | 2 | 2026-05-06 -> 2026-05-27 | 2D5, 5D5 | 150-170 kg | 2D5 150kg e3; 5D5 170kg e5 |
| Reactive High Pull into Hang Clean | 3 | 2026-05-06 -> 2026-05-20 | 5D3, 5D5, 10D3 | 70-80 kg | 5D3 70kg e5; 5D5 70kg e5; 10D3 80kg e5 |
| Seated Calf Raise | 1 | 2026-03-18 -> 2026-03-18 | 5D20 | 40-40 kg | 5D20 40kg e5 |
| Seated Good Morning | 6 | 2026-04-08 -> 2026-06-22 | 2D20, 5D5, 5D10 | 2-35 kg | 2D20 30kg e5; 5D5 35kg e5; 5D10 12kg e3 |
| Seated Good Morning (Dumbbell) | 1 | 2026-04-29 -> 2026-04-29 | 5D10 | 30-30 kg | 5D10 30kg e3 |
| Shoulder External Rotations / Long Range | 2 | 2026-05-05 -> 2026-05-19 | 2D10 | 8-8 kg | 2D10 8kg e5 |
| Single Leg Back Extension | 3 | 2026-04-06 -> 2026-04-20 | 5D5, 10D5 | 1-5 kg | 5D5 5kg e5; 10D5 2.5kg e3 |
| Single Leg Hamstring Curl | 2 | 2026-03-16 -> 2026-03-23 | 10D2-3-5, 10D3 | 30-35 kg | 10D2-3-5 35kg e5; 10D3 30kg e5 |
| Single Leg Romanian Deadlift | 1 | 2026-04-27 -> 2026-04-27 | 10D5 | 20-20 kg | 10D5 20kg e3 |
| Smith Curls | 7 | 2026-03-10 -> 2026-05-19 | 2D10 | 7.5-10 kg | 2D10 10kg e5 |
| Snatch | 11 | 2026-03-11 -> 2026-06-24 | 5D1, 5D3, 10D5, 20D1 | 40-65 kg | 5D1 63kg e5; 5D3 55kg e7; 10D5 40kg e5; 20D1 65kg e5 |
| Split Stance Pull-Through | 5 | 2026-03-16 -> 2026-04-06 | 2D10, 5D10 | 30-65 kg | 2D10 65kg e5; 5D10 60kg e5 |
| Split Stance Romanian Deadlift | 4 | 2026-05-04 -> 2026-05-25 | 5D5, 5D10, 10D3, 10D5 | 20-50 kg | 5D5 40kg e3; 5D10 20kg e3; 10D3 50kg e3; 10D5 40kg e5 |
| Squat ISO Pin | 1 | 2026-05-29 -> 2026-05-29 | 5D3 | 160-160 kg | 5D3 160kg e5 |
| Stahl Rotation | 4 | 2026-04-13 -> 2026-05-13 | 2D10, 5D10 | 0-5 kg | 2D10 5kg e5; 5D10 5kg e3 |
| Standing Calf Raise | 5 | 2026-03-18 -> 2026-06-19 | 5D20, 10D10, 10D20, 20D20 | 1-80 kg | 5D20 20kg e5; 10D10 80kg e3; 10D20 1kg e5; 20D20 20kg e3 |
| Straddle Pull Throughs | 3 | 2026-04-13 -> 2026-04-27 | 2D10 | 50-60 kg | 2D10 60kg e5 |
| Super Cat Calf Raise | 1 | 2026-04-23 -> 2026-04-23 | 5D20 | 40-40 kg | 5D20 40kg e3 |
| Weighted Jump Squat | 1 | 2026-04-10 -> 2026-04-10 | 10D5 | 20-20 kg | 10D5 20kg e5 |
| Wrist Flexion & Extension Combined (Short Range) | 3 | 2026-05-05 -> 2026-05-26 | 2D10, 2D20 | 20-40 kg | 2D10 40kg e5; 2D20 20kg e3 |
| Zercher Jefferson Curl | 2 | 2026-05-04 -> 2026-05-25 | 2D10 | 20-20 kg | 2D10 20kg e2 |
| Zottman Curl | 1 | 2026-05-01 -> 2026-05-01 | 2D10 | 10-10 kg | 2D10 10kg e5 |

## Calistenia lastrada: carga total y lastre

| Ejercicio | Filas | Fechas | Esquemas | Mejores por esquema |
|---|---:|---|---|---|
| DB Jump Squats | 1 | 2026-05-01 -> 2026-05-01 | 5D5 | 5D5 total 10kg / +0kg e3 |
| Weighted Chin-up | 8 | 2023-05-25 -> 2026-06-11 | 5D1, 5D3, 10D1, 10D1-2-3, 10D3 | 5D1 total 124kg / +41kg e7; 5D3 total 91kg / +10kg e3; 10D1 total 123kg / +42kg e5; 10D1-2-3 total 113kg / +30kg e5; 10D3 total 110.5kg / +27.5kg e5 |
| Weighted Dips | 9 | 2026-03-24 -> 2026-05-02 | 2D5, 5D1, 5D5, 10D1, 10D5, 10D10, 20D5 | 2D5 total 82.5kg / +0kg e5; 5D1 total 111.1kg / +30kg e3; 5D5 total 86kg / +4kg e5; 10D1 total 84kg / +1kg e3; 10D5 total 92.1kg / +10kg e5; 10D10 total 82.1kg / +0kg e7; 20D5 total 84kg / +1kg e3 |
| Weighted Pull-Up | 5 | 2026-04-09 -> 2026-05-09 | (sin esquema), 2D10, 10D5 | 2D10 total 84kg / +1kg e5; 10D5 total 93.1kg / +12.5kg e5 |
| Wide Weighted Pull-Ups | 1 | 2026-06-09 -> 2026-06-09 | 10D3 | 10D3 total 86kg / +5kg e5 |

## Peso corporal: tiempo fijo, progresa reps/min

| Ejercicio | Filas | Fechas | Esquemas/tiempos vistos | Mejores por tiempo |
|---|---:|---|---|---|
| Ab Rollout | 2 | 2026-03-27 -> 2026-06-09 | 2D18, 3D10 | 2D 36 reps (18 rpm, 2026-06-09, e5); 3D 30 reps (10 rpm, 2026-03-27, e5) |
| Back Bridge (Lats & Thoracic Spine) | 4 | 2026-04-09 -> 2026-04-30 | 2D5, 2D8 | 2D 16 reps (8 rpm, 2026-04-30, e3) |
| Back Bridge Push-Up (Reps) | 1 | 2026-05-07 -> 2026-05-07 | 2D5 | 2D 10 reps (5 rpm, 2026-05-07, e5) |
| Back Extension | 4 | 2026-03-11 -> 2026-03-27 | 3D10, 5D9, 5D12, 5D13 | 3D 30 reps (10 rpm, 2026-03-27, e5); 5D 65 reps (13 rpm, 2026-03-25, e5) |
| Bar Muscle-Up | 1 | 2026-05-09 -> 2026-05-09 | 5D3 | 5D 15 reps (3 rpm, 2026-05-09, e5) |
| Bodyweight Romanian Rhythm Squat | 1 | 2026-06-01 -> 2026-06-01 | 2D50 | 2D 100 reps (50 rpm, 2026-06-01, e3) |
| Bodyweight Walking Lunges | 1 | 2026-06-01 -> 2026-06-01 | 10D8 | 10D 80 reps (8 rpm, 2026-06-01, e5) |
| Borzov Jumps | 1 | 2026-05-29 -> 2026-05-29 | 5D10 | 5D 50 reps (10 rpm, 2026-05-29, e5) |
| Chin-up | 8 | 2026-03-30 -> 2026-06-18 | 2D12, 5D5, 10D3, 10D4, 10D5, 20D3, 20D4 | 2D 24 reps (12 rpm, 2026-06-18, e5); 5D 25 reps (5 rpm, 2026-03-30, e3); 10D 50 reps (5 rpm, 2026-05-28, e3); 20D 80 reps (4 rpm, 2026-05-14, e5) |
| Clap Push-Up | 7 | 2026-05-27 -> 2026-06-25 | 5D10, 5D11, 10D5, 10D7, 20D5 | 5D 55 reps (11 rpm, 2026-06-18, e5); 10D 70 reps (7 rpm, 2026-06-25, e5); 20D 100 reps (5 rpm, 2026-05-27, e3) |
| Deep Knee Bends (bodyweight) | 5 | 2026-04-20 -> 2026-06-22 | 2D12, 2D25, 2D30, 5D15 | 2D 60 reps (30 rpm, 2026-06-22, e7); 5D 75 reps (15 rpm, 2026-04-20, e3) |
| Deficit Push-up | 1 | 2026-03-24 -> 2026-03-24 | 5D12 | 5D 60 reps (12 rpm, 2026-03-24, e5) |
| Dips | 5 | 2026-03-10 -> 2026-06-09 | 5D10, 5D13, 5D14, 10D3, 10D10 | 5D 70 reps (14 rpm, 2026-03-17, e7); 10D 100 reps (10 rpm, 2026-06-09, e5) |
| Floating Pike Push-ups | 1 | 2026-04-30 -> 2026-04-30 | 5D5 | 5D 25 reps (5 rpm, 2026-04-30, e5) |
| Front Splits (Assisted) | 3 | 2026-05-04 -> 2026-05-25 | 2D10, 2D20 | 2D 40 reps (20 rpm, 2026-05-18, e5) |
| GHD / GHR | 1 | 2026-04-12 -> 2026-04-12 | 5D3 | 5D 15 reps (3 rpm, 2026-04-12, e5) |
| Handstand Push-up | 5 | 2026-04-19 -> 2026-05-27 | 5D1, 5D2, 20D1 | 5D 10 reps (2 rpm, 2026-05-27, e5); 20D 20 reps (1 rpm, 2026-04-19, e3) |
| Hanging Leg Raise | 9 | 2026-03-10 -> 2026-06-17 | 2D13, 2D14, 2D15, 2D16, 2D17, 3D, 3D12 | 2D 34 reps (17 rpm, 2026-06-17, e5); 3D 36 reps (12 rpm, 2026-03-10, e5) |
| Inverted Row | 1 | 2026-05-26 -> 2026-05-26 | 5D10 | 5D 50 reps (10 rpm, 2026-05-26, e7) |
| Jump Landings | 3 | 2026-05-15 -> 2026-06-19 | 2D5, 10D5 | 2D 10 reps (5 rpm, 2026-06-19, e5); 10D 50 reps (5 rpm, 2026-05-15, e5) |
| L Sit | 1 | 2026-06-24 -> 2026-06-24 | 2D10 | 2D 20 reps (10 rpm, 2026-06-24, e5) |
| Long Lunge Pulse | 12 | 2026-03-16 -> 2026-06-22 | (sin esquema), 2D, 2D20, 3D | 2D 40 reps (20 rpm, 2026-03-16, e5) |
| Lunge ISO | 4 | 2026-05-08 -> 2026-05-20 | (sin esquema), 5D5, 5D15 | 5D 75 reps (15 rpm, 2026-05-08, e5) |
| Nordic Curl | 11 | 2026-03-13 -> 2026-06-22 | 2D4, 2D5, 5D1, 5D3, 5D4, 5D5, 10D1 | 2D 10 reps (5 rpm, 2026-04-29, e5); 5D 25 reps (5 rpm, 2026-05-01, e5); 10D 10 reps (1 rpm, 2026-06-08, e2) |
| One Arm Chin-up | 1 | 2026-06-25 -> 2026-06-25 | 5D1 | 5D 5 reps (1 rpm, 2026-06-25, e5) |
| Pole Vault Pull-Up | 3 | 2026-04-14 -> 2026-04-28 | 5D3, 5D5 | 5D 25 reps (5 rpm, 2026-04-14, e5) |
| Pull-Ups | 2 | 2026-04-26 -> 2026-04-27 | 5D3, 10D2 | 5D 15 reps (3 rpm, 2026-04-27, e2); 10D 20 reps (2 rpm, 2026-04-26, e2) |
| Push Up Bounces | 3 | 2026-05-05 -> 2026-05-26 | 2D50, 2D55, 2D60 | 2D 120 reps (60 rpm, 2026-05-26, e5) |
| Push-up | 8 | 2026-03-31 -> 2026-05-30 | 2D20, 2D22, 2D30, 3D12, 5D10, 5D20, 10D13, 20D12 | 2D 60 reps (30 rpm, 2026-05-25, e5); 3D 36 reps (12 rpm, 2026-03-31, e5); 5D 100 reps (20 rpm, 2026-05-06, e7); 10D 130 reps (13 rpm, 2026-05-30, e5); 20D 240 reps (12 rpm, 2026-05-14, e5) |
| Reverse nordics | 2 | 2026-04-10 -> 2026-05-01 | (sin esquema), 2D |  |
| Ring Chin-Up | 2 | 2026-04-20 -> 2026-04-21 | 5D3, 5D6 | 5D 30 reps (6 rpm, 2026-04-20, e5) |
| Side Split | 2 | 2026-03-13 -> 2026-05-29 | (sin esquema), 3D20 | 3D 60 reps (20 rpm, 2026-03-13, e3) |
| Side Split Push-ups | 2 | 2026-04-10 -> 2026-05-01 | (sin esquema), 2D |  |
| Single Leg Hinge | 1 | 2026-06-01 -> 2026-06-01 | 10D10 | 10D 100 reps (10 rpm, 2026-06-01, e5) |
| sissy squats | 2 | 2026-04-08 -> 2026-04-12 | 2D10, 5D10 | 2D 20 reps (10 rpm, 2026-04-08, e5); 5D 50 reps (10 rpm, 2026-04-12, e5) |
| Slant Calf Raise | 4 | 2026-04-27 -> 2026-05-06 | 5D20, 10D20 | 5D 100 reps (20 rpm, 2026-04-27, e5); 10D 200 reps (20 rpm, 2026-04-27, e3) |
| Smith Hang | 4 | 2026-06-09 -> 2026-06-25 | (sin esquema) |  |
| Sternum Chin-up | 3 | 2026-03-10 -> 2026-03-31 | 5D5, 5D6 | 5D 30 reps (6 rpm, 2026-03-17, e5) |
| Toe Presses | 3 | 2026-05-29 -> 2026-06-24 | 2D10, 2D11, 2D15 | 2D 30 reps (15 rpm, 2026-06-17, e5) |
| VMO Bounces | 6 | 2026-05-04 -> 2026-05-29 | 2D30, 2D50, 2D70, 2D75 | 2D 150 reps (75 rpm, 2026-05-25, e5) |

## Banded

| Ejercicio | Filas | Fechas | Esquemas | Mejores/metricas |
|---|---:|---|---|---|
| Banded Biceps Curl | 2 | 2026-03-12 -> 2026-03-26 | 2D10, 5D20 | 2D 20 reps (10 rpm, 2026-03-26, e5); 5D 100 reps (20 rpm, 2026-03-12, e3) |
| Banded Knee Lockouts | 3 | 2026-06-08 -> 2026-06-22 | 2D20 | 2D 40 reps (20 rpm, 2026-06-08, e5) |
| Banded Triceps Extension | 2 | 2026-03-12 -> 2026-03-26 | 2D10, 5D20 | 2D 20 reps (10 rpm, 2026-03-26, e5); 5D 100 reps (20 rpm, 2026-03-12, e3) |
| Rotational Mobility | 4 | 2026-03-10 -> 2026-04-28 | 2D10, 3D5 | 2D 20 reps (10 rpm, 2026-04-14, e5); 3D 15 reps (5 rpm, 2026-03-10, e3) |
| Single Ring Chin Up | 1 | 2026-05-07 -> 2026-05-07 | 5D3 | 5D 15 reps (3 rpm, 2026-05-07, e5) |

## Pliometria

| Ejercicio | Filas | Fechas | Esquemas/ejes | Metricas |
|---|---:|---|---|---|
| Box Jump | 2 | 2026-06-12 -> 2026-06-19 | 5D3, 5D5 | intervals_completed 15-25 |
| Depth Drop | 9 | 2026-05-20 -> 2026-06-22 | (sin esquema), 5D3, 5D5, 10D5 | total_time_minutes 3-10; intervals_completed 10-100 |
| Drop Jump | 1 | 2026-05-25 -> 2026-05-25 | (sin esquema) | total_time_minutes 2-2; intervals_completed 10-10 |
| Jumps | 3 | 2026-03-13 -> 2026-05-01 | (sin esquema) | total_time_minutes 10-15 |

## Conditioning

| Ejercicio | Filas | Fechas | Modalidad | Metricas vistas |
|---|---:|---|---|---|
| Assault Bike / AirDyne | 10 | 2026-03-12 -> 2026-05-07 | ergometer | max_wattage 1510-1546; total_time_minutes 1-5; intervals_completed 1-1 |
| Banded Resisted Sprints / Piston Sprints | 3 | 2026-04-20 -> 2026-05-04 | sled | total_time_minutes 5-5 |
| Deadmill Push | 2 | 2026-06-24 -> 2026-06-25 | sled | total_time_minutes 5-5 |
| Exercise Bike Sprint | 10 | 2026-03-09 -> 2026-05-04 | ergometer | max_wattage 450-956; total_time_minutes 1-10; intervals_completed 2-4 |
| Farmers Carry | 1 | 2026-06-09 -> 2026-06-09 | carry | distance_m 40-40; total_time_minutes 1-1; intervals_completed 1-1 |
| Rowing Machine (Erg) | 6 | 2026-03-13 -> 2026-05-01 | ergometer | max_wattage 701-793; total_time_minutes 1-10; intervals_completed 1-3 |
| Running | 3 | 2026-06-10 -> 2026-06-11 | running | distance_m 1000-18000; total_time_minutes 1-120 |
| Ski-Erg | 9 | 2026-03-10 -> 2026-05-05 | ergometer | max_wattage 547-589; total_time_minutes 1-10; intervals_completed 1-5 |
| Skipping | 12 | 2026-03-11 -> 2026-06-18 | skipping | total_time_minutes 1-10; intervals_completed 5-200 |

## Skills

| Skill | Filas | Fechas | Metricas vistas |
|---|---:|---|---|
| 3-Ball Juggle (10s) | 1 | 2026-04-15 -> 2026-04-15 | total_time_minutes 5-5; skill_value 27-27 |
| Basketball skills | 2 | 2026-04-18 -> 2026-04-25 | total_time_minutes 5-5 |
| Double Under Skipping Reps | 1 | 2026-01-21 -> 2026-01-21 | total_time_minutes 60-60; skill_value 15-15 |
| Foot Dribbling | 1 | 2026-05-18 -> 2026-05-18 | total_time_minutes 10-10; skill_value 10-10 |
| Handstand | 8 | 2026-05-08 -> 2026-06-20 | total_time_minutes 5-20; skill_value 5-20 |
| Juggle | 22 | 2026-03-12 -> 2026-06-25 | total_time_minutes 1-20; skill_value 100-100 |
| Padel & racquets | 12 | 2026-04-05 -> 2026-05-30 | total_time_minutes 5-60; skill_value 5-60 |
| Rope Flow | 16 | 2026-03-14 -> 2026-06-20 | total_time_minutes 5-10; skill_value 5-10 |
| Skipping Max Reps (10 seconds) (⏫Foundation Test) | 1 | 2026-01-21 -> 2026-01-21 | total_time_minutes 5-5; skill_value 34-34 |
| Soccer Ball / Foot Skills | 13 | 2026-04-05 -> 2026-06-23 | total_time_minutes 5-60 |
| Speed Coordination | 1 | 2026-06-20 -> 2026-06-20 | total_time_minutes 10-10; skill_value 10-10 |
| Sprint Drills | 3 | 2026-05-06 -> 2026-05-27 | total_time_minutes 5-5; skill_value 5-5 |
| Swiss Ball / Yoga Ball Balance | 6 | 2026-03-13 -> 2026-05-01 | total_time_minutes 5-10; skill_value 5-5 |
| Table Tennis | 3 | 2026-03-10 -> 2026-04-25 | total_time_minutes 5-10; skill_value 5-5 |
| Throw | 7 | 2026-03-26 -> 2026-05-07 | total_time_minutes 1-10; skill_value 3000-3000 |

## Active recovery

| Ejercicio | Filas | Fechas |
|---|---:|---|
| Floor Acrobatics | 1 | 2026-04-05 -> 2026-04-05 |
| Light movement | 6 | 2026-03-15 -> 2026-04-19 |

## Reglas que se pueden copiar a BitTracker

### Weighted

Para cada ejercicio con peso:

```txt
clave = exercise + scheme
progreso = subir weight_kg dentro del mismo scheme
si effort bajo y completo => proponer +kg siguiente vez
si effort alto o falla => mantener o bajar
```

Ejemplo: si un ejercicio tiene `5D10`, no inventar automaticamente `5D12`; mantener `5D10` y progresar kg.

### Bodyweight

Para cada ejercicio de peso corporal:

```txt
clave = exercise + base_time, por ejemplo 5D
progreso = subir total_reps o reps/min
5D8 -> 5D9, 5D10...
```

Aqui si tiene sentido que el estimador use una curva de reps/min entre `2D`, `5D`, `10D`, `20D`.

### Weighted calisthenics

```txt
internal_load = bodyweight + added_load
visible_load = internal_load - bodyweight
progreso por scheme = subir internal_load / added_load
```

### Conditioning / skills

No forzarlos al modelo XDY si la metrica no es reps. Definir eje por ejercicio: tiempo, distancia, watts, intervalos o booleano.
