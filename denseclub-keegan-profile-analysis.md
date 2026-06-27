# Denseclub - analisis publico de Keegan Smith

Snapshot: 2026-06-25.  
Perfil analizado: `https://win.denseclub.com/profile/db0652e0-424e-42a5-ac06-9763dc97ceaa`

Este documento usa solo datos visibles/publicos de la web y de los endpoints publicos que la propia aplicacion llama. No incluye tecnicas para saltar pagos, autenticacion ni contenido privado.

## Fuentes publicas detectadas

La pagina publica consume estos endpoints:

```txt
GET https://api.denseclub.com/api/public/profiles/{user_id}/dashboard
GET https://api.denseclub.com/api/public/activity-feed?limit=20&user_id={user_id}&cursor=...
GET https://api.denseclub.com/api/public/profiles/{user_id}/workout?workout_date=YYYY-MM-DD
```

Tambien hay un catalogo publico de ejercicios con naturaleza del ejercicio, patron de carga, contribucion de peso corporal y tipo de medicion.

## Resumen del perfil

```txt
Atleta: Keegan Smith
Pais: Australia
Estado: active
Ultimo entrenamiento publico: 2026-06-23
Entrenos ultimos 7 dias: 7
Entrenos publicos descargados: 100
Rango real del dataset: 2023-05-19 a 2026-06-23
Periodo denso real: 2026-03 a 2026-06
Frecuencia declarada por dashboard: 5.2 sesiones/semana
Tonnage ultimos 7 dias: 39,023.96 kg
Tonnage ultimos 30 dias: 199,574.53 kg
Tonnage total: 802,542.56 kg
PRs ultimos 30 dias: 81
PRs total: 351
Force score: 26.0, percentil 98.5
Skill score: 44.4, percentil 99.6
```

Hay dos sesiones antiguas en mayo de 2023, una sesion de skills en enero de 2026 y luego el bloque fuerte empieza en marzo de 2026.

## Distribucion de entrenos

Sesiones publicas por mes:

```txt
2023-05: 2
2026-01: 1
2026-02: 3
2026-03: 22
2026-04: 27
2026-05: 28
2026-06: 17, hasta 2026-06-23
```

Filas de trabajo por tipo:

```txt
weighted: 246
bodyweight: 134
skill: 96
conditioning: 54
weighted_calisthenics: 24
plyometrics: 15
banded: 12
active_recovery: 7
```

Esquemas mas usados:

```txt
total_time / skill sin esquema: 159
2D10: 77
5D3: 38
10D5: 31
5D5: 31
5D10: 30
2D20: 24
10D3: 20
5D1: 20
5D20: 14
2D5: 14
20D1: 12
10D1: 9
10D10: 8
```

Ejercicios mas repetidos:

```txt
Barbell Bench Press: 27
Juggle: 21
Rope Flow: 16
Barbell Overhead Press: 14
Soccer Ball / Foot Skills: 13
Skipping: 12
Long Lunge Pulse: 12
Barbell Back Squat: 12
Padel & racquets: 12
Nordic Curl: 11
Exercise Bike Sprint: 10
Snatch: 10
Assault Bike / AirDyne: 10
Face Pull: 9
Hanging Leg Raise: 9
Ski-Erg: 9
Jefferson Curl: 9
Weighted Dips: 9
Depth Drop: 9
Weighted Chin-up: 8
```

## Lectura de la rutina

No parece una rutina fija tipo lunes-pecho, martes-pierna. Parece una rotacion de alta frecuencia con bloques densos cortos, tests de PR y practica tecnica diaria o casi diaria.

La estructura dominante es:

```txt
1. Skill / coordinacion casi diaria
   Juggle, Rope Flow, Soccer Ball, Handstand, Skipping, Padel.

2. Fuerza densa con barra
   Bench Press, Overhead Press, Squat, Clean, Snatch, Row.

3. Calistenia y calistenia lastrada
   Chin-up, Pull-up, Dips, Weighted Chin-up, Weighted Dips.

4. Rodilla/cadera/tendon/accesorios
   VMO Bounces, Long Lunge Pulse, Nordic Curl, Jefferson Curl,
   Split Stance RDL, Bulgarian Split Squat, Belt March.

5. Potencia y elasticidad
   Depth Drop, Box Jump, Clap Push-Up, Jump Landings, Kneeling Jump.

6. Conditioning
   Bike, Ski-Erg, Rowing, Running, Skipping.
```

La logica no es "machacar un patron y descansar mucho", sino tocar muchos patrones con dosis pequenas y medir constantemente. El sistema favorece comparar PRs por esquema: 2D, 5D, 10D, 20D, ladders, max time, etc.

## Periodizacion deducida

### Marzo 2026: entrada y base de densidad

Marzo mezcla fuerza principal, accesorios y primeros benchmarks. Empiezan a aparecer:

```txt
Bench Press: 20D1, 10D1, 10D5, 5D20
Weighted Chin-up: 10D1-2-3, 5D1, 10D3
Clean/Snatch: 5D1, 5D3, 20D1
Nordic Curl: 5D3
Face Pull / Hip Flexor / Jefferson Curl: 2D10
```

Interpretacion: fase de calibracion. Prueba rangos de repeticiones distintos para crear baseline de leaderboard y de PR personal.

### Abril 2026: volumen mas alto y mucha variedad

Abril es el mes con mas filas de trabajo: 209. Sube el uso de 2D10, 5D10, 10D5 y skills.

Patron notable:

```txt
Overhead Press aparece mucho.
Back Squat aparece con 2D10, 5D10, 10D10, 5D3, 5D5.
Weighted Dips/Pull-ups se testean en 10D5 y 5D1.
Skills y conditioning se repiten casi semanalmente.
```

Interpretacion: bloque de acumulacion y exploracion amplia. Mucho PR no necesariamente significa maximo absoluto; tambien significa "primer registro" de muchos ejercicios/esquemas.

### Mayo 2026: especializacion de press y calistenia

Mayo tiene 28 sesiones. Aparece una secuencia muy clara de bench:

```txt
2026-05-05: 5D3 80kg, 5D1 107.5kg, 5D5 82.5kg
2026-05-17: 20D1 108kg, 10D5 84kg
2026-05-19: 5D3 90kg, 5D1 110kg, 5D5 90kg
2026-05-26: 5D3 80kg, 5D1 112.5kg, 5D5 90kg
```

Esto se parece a un microciclo de press donde alterna:

```txt
5D1 = exposicion pesada / neural
5D3 = fuerza tecnica
5D5 = volumen pesado
10D5 o 20D1 = densidad/resistencia de fuerza
```

Tambien aparecen bloques grandes de calistenia:

```txt
2026-05-14: Push-up 20D12, Chin-up 20D4
2026-05-24 a 2026-05-30: Chin-up 10D3, 20D3, 10D5, 10D4
```

Interpretacion: mayo parece el bloque mas "entrenamiento real" de fuerza + capacidad, no solo exploracion.

### Junio 2026: accesorios, rodilla/cadera y bloques muy cortos

Junio, hasta el dia 23, cambia hacia:

```txt
2D20: 19 registros
2D10 / 2D5: frecuentes
Mas Handstand, Soccer Ball, Rope Flow
Mas Long Lunge Pulse, Belt March, Deep Knee Bends, Nordic Curl, Depth Drop
```

Hay menos bench pesado, pero sigue tocandolo:

```txt
2026-06-12: Bench 10D3 70kg, Bench Pin Lockouts 2D5 140kg
2026-06-18: Bench 5D5 90kg
2026-06-21: Bench 2D5 92.5kg
```

Interpretacion: bloque de mantenimiento/test corto, tejido conectivo, movilidad cargada y potencia. Puede ser descarga relativa de patrones principales mientras se siguen creando PRs en accesorios.

## Rotaciones detectadas

### Rotacion upper push/pull

Press principal:

```txt
Bench Press
Overhead Press
Close Grip Bench
Bench with Bands
Bench Pin Lockouts
Behind the Neck Press
```

Pull/calistenia:

```txt
Weighted Chin-up
Weighted Pull-Up
Chin-up
Dips
Weighted Dips
Barbell Row / Inverted Row
Face Pull / Cable Face Pull
```

La rotacion suele tocar un press principal y un tiron o accesorio escapular en la misma semana, pero no siempre el mismo dia.

### Rotacion lower

```txt
Back Squat / Front Squat
Split Stance RDL
Bulgarian Split Squat
Belt March
Seated Good Morning
Nordic Curl
VMO Bounces / Deep Knee Bends / Long Lunge Pulse
Jefferson Curl
```

La pierna esta muy orientada a rodilla/tendon/rango y fuerza submaxima. Muchas cargas son esfuerzo 2-5, no maximos reales.

### Rotacion skill/athleticism

```txt
Juggle
Rope Flow
Soccer Ball / Foot Skills
Handstand
Skipping
Padel & racquets
Throw
Sprint Drills
```

Esto aparece como practica continua, normalmente por tiempo total o booleano, no como fuerza cuantificable.

## Formulas detectadas o deducidas

## Catalogo de esquemas XDY

Hay que separar dos cosas:

```txt
1. Esquemas base que ofrece el selector de la app.
2. Esquemas que aparecen en el historial publico de Keegan.
```

En el selector publico/cliente, los ejercicios no usan todos los esquemas. Depende de `exercise_nature`.

Prescripciones permitidas por tipo:

```txt
weighted: dense_sets, isometric_sets, straight_sets
weighted_calisthenics: dense_sets, isometric_sets, straight_sets
bodyweight: dense_sets, isometric_sets, straight_sets
banded: dense_sets, straight_sets
plyometrics: dense_sets, straight_sets
conditioning: total_time, intervals
skill: total_time, intervals
active_recovery: sin numeros
```

Lista base para weighted / weighted calisthenics / banded / normalmente plyometrics:

```txt
2D5
2D10
2D20
5D1
5D3
5D5
5D10
5D20
10D1
10D3
10D5
10D10
10D20
10D1-2-3
10D2-3-5
20D1
20D3
20D5
20D10
20D20
```

Total base: 20 esquemas densos.

Lista base para bodyweight:

```txt
2D
5D
10D
20D
```

En bodyweight la app parece guardar/mostrar a veces una version derivada con reps por minuto, por ejemplo `2D20`, `5D14`, `10D13`. Eso no significa necesariamente que todos sean opciones base del selector; significa:

```txt
2D20 = bloque 2D con 20 reps/min, 40 reps totales
5D14 = bloque 5D con 14 reps/min, 70 reps totales
10D13 = bloque 10D con 13 reps/min, 130 reps totales
```

Para isometricos existe otra familia:

```txt
rounds: 2, 5, 10, 20
hold seconds: 5, 10, 20, 30, 40, 60
```

Total isometrico posible:

```txt
4 * 6 = 24 esquemas tipo XDYs
```

Ejemplos:

```txt
2D10s
5D30s
10D20s
20D60s
```

En el perfil de Keegan aparecen 57 etiquetas de esquema distintas. De esas:

```txt
53 son XDY simples, tipo 5D3 o 10D5
2 son ladders: 10D1-2-3 y 10D2-3-5
2 son duracion sin Y: 2D y 3D
```

Por tanto, contando ladders como esquemas densos:

```txt
55 esquemas tipo XDY observados en Keegan
57 etiquetas de esquema observadas en total
```

Los mas importantes observados:

```txt
2D10: 77
5D3: 38
10D5: 31
5D5: 31
5D10: 30
2D20: 24
10D3: 20
5D1: 20
5D20: 14
2D5: 14
20D1: 12
10D1: 9
10D10: 8
```

Conclusion: no, todos los ejercicios no usan todos los esquemas. Los esquemas dependen del tipo de ejercicio, y en la practica Keegan usa una seleccion pequena por ejercicio. En su historial publico, de 145 ejercicios observados:

```txt
80 ejercicios aparecen con 1 solo esquema
32 ejercicios aparecen con 2 esquemas
12 ejercicios aparecen con 3 esquemas
10 ejercicios aparecen con 4 esquemas
3 ejercicios aparecen con 5 esquemas
1 ejercicio aparece con 6 esquemas
4 ejercicios aparecen con 7 esquemas
2 ejercicios aparecen con 8 esquemas
1 ejercicio aparece con 11 esquemas
```

El ejercicio con mas variedad es Barbell Bench Press, con 11 esquemas:

```txt
10D1
10D3
10D10
5D3
5D20
20D1
10D5
10D2-3-5
5D5
5D1
2D5
```

### 1. Repeticiones de esquemas Dense

La nomenclatura parece:

```txt
XDn = X minutos, n reps por minuto
```

Formula:

```txt
total_reps = minutos * reps_por_minuto
```

Ejemplos:

```txt
5D3 = 5 * 3 = 15 reps
10D5 = 10 * 5 = 50 reps
20D1 = 20 * 1 = 20 reps
2D20 = 2 * 20 = 40 reps
```

Para ladders:

```txt
XD1-2-3 = repetir 1,2,3 durante X minutos
XD2-3-5 = repetir 2,3,5 durante X minutos
```

Formula:

```txt
ciclo = [reps...]
ciclos_completos = floor(minutos / len(ciclo))
resto = minutos % len(ciclo)
total_reps = ciclos_completos * sum(ciclo) + sum(ciclo[0:resto])
```

Ejemplos:

```txt
10D1-2-3 = 3 ciclos completos de 1+2+3 + 1 minuto extra = 19 reps
10D2-3-5 = 3 ciclos completos de 2+3+5 + 1 minuto extra = 32 reps estimadas
```

Nota: en alguna captura aparece 10D2-3-5 con 28 participantes, no con reps. En el dataset hay filas donde el total_reps no esta informado, asi que esta formula es una deduccion del nombre del esquema.

### 2. Leaderboard points

La formula visible en el frontend es:

```txt
points = round_1_decimal(5 * min(valor_usuario, valor_lider) / max(valor_usuario, valor_lider))
```

Como el lider suele ser el maximo:

```txt
points = round_1_decimal(5 * valor_usuario / valor_lider)
```

Por eso el lider tiene 5.0 pts y los demas quedan como proporcion del mejor registro.

### 3. Weighted calisthenics

La app guarda `weight_kg` como carga total del sistema en movimientos lastrados:

```txt
carga_total = peso_corporal + lastre
lastre_mostrado = max(0, carga_total - peso_corporal)
```

Ejemplos observados:

```txt
Weighted Chin-up 101kg con BW 81kg => +20kg
Weighted Dips 111.1kg con BW 81.1kg => +30kg
Wide Weighted Pull-Ups 86kg con BW 81kg => +5kg
```

En modo relativo:

```txt
relative_value = carga_total / peso_corporal
```

Ejemplo:

```txt
101kg / 81kg = 1.25 x BW
```

### 4. Tonnage y system load

Para ejercicios con carga externa:

```txt
effective_reps = total_reps * (2 si reps_per_side, si no 1)
loaded_volume = weight_kg * load_multiplier * effective_reps
system_load = weight_kg * load_multiplier + bodyweight_kg * bodyweight_contribution_pct / 100
total_tonnage = system_load * effective_reps * tonnage_factor
```

Para weighted calisthenics:

```txt
lastre = max(carga_total - bodyweight_kg, 0)
loaded_volume = lastre * load_multiplier * effective_reps
system_load = lastre * load_multiplier + bodyweight_kg * bodyweight_contribution_pct / 100
total_tonnage = system_load * effective_reps * tonnage_factor
```

Para bodyweight:

```txt
system_load = bodyweight_kg * bodyweight_contribution_pct / 100
total_tonnage = system_load * effective_reps * tonnage_factor
```

Para isometricos:

```txt
reps_equiv = floor(total_hold_seconds / 5)
effective_reps = reps_equiv * (2 si reps_per_side, si no 1)
```

### 5. Force score y skill score

La formula encaja exactamente con una media ponderada por niveles:

```txt
score = 100 * sum(current_level * weight_factor) / sum(max_level * weight_factor)
```

Para Force Score de Keegan:

```txt
Barbell Back Squat: 1/5, peso 2.0
Deadlift: 0/5, peso 2.0
Barbell Bench Press: 3/5, peso 2.0
Barbell Overhead Press: 3/5, peso 1.5
Barbell Row: 0/5, peso 1.5
Weighted Pull-Up: 2/5, peso 2.0
Weighted Dips: 2/5, peso 1.5
Weighted Chin-up: 0/5, peso 1.5
Pistol Squat: 0/5, peso 1.0
```

Calculo:

```txt
numerador = 19.5
denominador = 75
score = 100 * 19.5 / 75 = 26.0
```

Para Skill Score:

```txt
Double Under Skipping Reps: 1/6
3-Ball Juggle: 3/6
Skipping Max Reps: 4/6
score = 100 * 8 / 18 = 44.4
```

### 6. Estimacion de 1RM por Dense

No hay una formula perfecta visible para `Estimated 1RM`; lo mas razonable es estimarlo como conversion de rendimiento denso a una carga unica. Hay dos formas practicas.

#### Version simple por carga externa

```txt
e1RM ~= weight_kg * multiplier_dense
```

Tabla de multiplicadores utiles:

```txt
2D5:       x1.04 - x1.07
5D1:       x1.03 - x1.06
5D3:       x1.08 - x1.12
5D5:       x1.12 - x1.17
10D1:      x1.05 - x1.08
10D3:      x1.12 - x1.17
10D5:      x1.18 - x1.25
10D10:     x1.30 - x1.45
20D1:      x1.08 - x1.13
20D3:      x1.18 - x1.28
20D5:      x1.30 - x1.45
```

Correccion por esfuerzo:

```txt
effort 2-3: usar limite alto del rango o incluso +2-4%, porque habia reps en reserva
effort 5: usar centro del rango
effort 7: usar limite bajo del rango, porque ya esta cerca del limite
effort 9: no extrapolar mucho; puede ser fatiga acumulada o fallo cercano
```

Ejemplos aproximados:

```txt
Bench 5D1 112.5kg e5 => e1RM 116-119kg
Bench 5D5 90kg e5/e7 => e1RM 101-105kg
Bench 20D1 108kg e5 => e1RM 117-122kg
OHP 5D1 62.5kg e5 => e1RM 64-66kg
Snatch 20D1 65kg e5 => e1RM 70-73kg tecnico
```

#### Version para calistenia lastrada

La app trabaja mejor con carga total:

```txt
carga_total = BW + lastre
e1RM_total ~= carga_total * multiplier_dense
e1RM_lastre ~= e1RM_total - BW
```

Ejemplo:

```txt
Weighted Chin-up 10D3: carga_total 101kg, BW 81kg
e1RM_total ~= 101 * 1.12 a 1.17 = 113-118kg
e1RM_lastre ~= 32-37kg
```

Para compararlo con los leaderboards de las capturas, el valor mostrado suele ser `+kg`, pero los puntos internos probablemente usan `carga_total` o `relative_value`.

## Progresiones concretas visibles

### Bench Press

Bench es el eje principal de fuerza:

```txt
2026-02-09: 10D3 85kg
2026-02-24: 10D1 105kg + 5D3 92kg
2026-03-04: 20D1 100kg + 10D1 105kg
2026-03-10: 10D5 82kg
2026-05-05: 5D1 107.5kg + 5D3 80kg + 5D5 82.5kg
2026-05-17: 20D1 108kg + 10D5 84kg
2026-05-19: 5D1 110kg + 5D3 90kg + 5D5 90kg
2026-05-26: 5D1 112.5kg + 5D5 90kg
2026-06-18: 5D5 90kg
2026-06-21: 2D5 92.5kg
```

Deduccion: usa 5D1 para exposicion pesada, 5D3/5D5 para consolidar volumen, y 10D5/20D1 para resistencia de fuerza. Mayo es el bloque mas claro de progreso en press.

### Overhead Press

```txt
2026-03-12: 5D5 50kg
2026-03-26: 5D3 50kg
2026-04-13: 5D10 40kg
2026-04-21: 10D5 55kg
2026-05-07: 5D1 62.5kg
2026-05-28: 10D5 50kg
```

Deduccion: alterna volumen denso y exposicion pesada. El 10D5 55kg es fuerte para densidad; el 5D1 62.5kg sirve como benchmark pesado.

### Weighted Chin-up

```txt
2026-03-06: 10D1-2-3 113kg total, BW 83kg, +30kg
2026-03-06: 5D1 124kg total, BW 83kg, +41kg
2026-03-12: 10D3 110.5kg total, BW 83kg, +27.5kg
2026-03-26: 10D3 110.5kg total, BW 83kg, +27.5kg
2026-05-07: 10D3 97kg total, BW 82kg, +15kg
2026-06-11: 10D3 101kg total, BW 81kg, +20kg
```

Deduccion: tras marzo baja la carga relativa y vuelve a construir con 10D3. Puede indicar fatiga, cambio de tecnica/ROM, o prioridad temporal hacia press y skill.

### Weighted Dips

```txt
2026-03-24: 5D1/10D1 84kg total, BW 83kg, casi peso corporal solo
2026-04-21: 10D5 92.1kg total, BW 82.1kg, +10kg
2026-04-28: 5D1 111.1kg total, BW 81.1kg, +30kg
2026-05-02: 5D5 86kg total, BW 82kg, +4kg
```

Deduccion: hay una subida rapida de benchmark en abril y luego una vuelta a volumen/control.

### Squat / lower

```txt
Back Squat 10D10 25-30kg en marzo/abril
Back Squat 5D5 74kg el 2026-04-29
Back Squat 10D5 55kg el 2026-05-01
Back Squat 10D5 60kg el 2026-05-29
Back Squat 10D5 50kg el 2026-06-19
```

Deduccion: la sentadilla esta tratada como volumen tecnico/submaximo, no como eje de maximo. Mucho trabajo complementario de rodilla/cadera sugiere objetivo de capacidad articular y elasticidad.

### Hanging Leg Raise

Progresion casi limpia:

```txt
3D12 -> 2D13 -> 2D14 -> 2D15 -> 2D16 -> 2D17
```

Formula visible:

```txt
2D17 = 2 minutos * 17 reps/min = 34 reps
```

Deduccion: aqui si hay progresion lineal de densidad: subir reps/min manteniendo tiempo corto.

### Push-up / Chin-up bodyweight

```txt
Push-up: 3D12, 5D10, 2D20, 2D22, 5D20, 20D12, 2D30, 10D13
Chin-up: 5D5, 20D4, 10D3, 20D3, 10D5, 10D4, 2D12
Dips: 5D13, 5D14, 5D10, 10D3, 10D10
```

Deduccion: progresion por densidad y duracion. Cambia el objetivo segun el dia: velocidad corta 2D, capacidad 10D/20D, volumen intermedio 5D.

## Plantilla de rutina deducida

No es una copia exacta de su calendario, pero representa bastante bien la logica:

```txt
Dia A - Press principal
  Bench u OHP: 5D1 + 5D3/5D5, o 10D5
  Pull accesorio: Row/Face Pull 2D10
  Skill: Rope/Juggle/Handstand 5-20 min

Dia B - Lower tissue + potencia
  VMO/Deep Knee/Long Lunge: 2D20-2D75
  Nordic/Jefferson/Belt March: 2D5-5D5
  Depth Drop/Jump: 5D3-10D5

Dia C - Calistenia
  Chin-up/Pull-up/Dips: 10D3, 10D5, 20D3/20D4
  Weighted version si toca benchmark: 5D1 o 10D3
  Skill/coordination

Dia D - Olympic / athletic
  Clean/Snatch: 5D1, 5D3 o 20D1
  Sprint/throw/bike/ski
  Mobility cargada

Dia E - Micro PR / accesorios
  2D10, 2D20, 2D5 en 4-8 ejercicios
  Objetivo: crear baseline, tocar tejidos, no destruir recuperacion
```

La semana no tiene que tener exactamente cinco dias. El perfil muestra picos de 6-7 dias/semana, con muchos dias de baja carga sistemica y skills.

## Algoritmo estimado para crear graficas

Para cada ejercicio y esquema:

```txt
1. Agrupar registros por exercise_id + dense_scheme.
2. Calcular mejor marca historica:
   - weighted: max(weight_kg)
   - weighted_calisthenics: max(weight_kg total o relative_value)
   - bodyweight: max(total_reps o value)
   - skill: max(value segun measurement_type)
   - conditioning: depende del eje, max distancia/potencia/duracion o min tiempo
3. Marcar PR si el registro supera el best anterior.
4. Para leaderboard:
   - absolute: comparar valor absoluto
   - relative: comparar valor / BW
5. Puntos:
   points = 5 * valor / valor_lider
6. Para progreso:
   mostrar serie temporal de best_value, last_value, current_level, next_threshold.
```

Para niveles:

```txt
current_level = max(level donde best_value >= threshold)
next_threshold = threshold del siguiente nivel
score_global = media ponderada de niveles / niveles maximos
```

## Conclusiones

El sistema de entrenamiento que se ve detras de este perfil es una mezcla de Dense Training + gamificacion por PR + exposiciones frecuentes. El autor no parece seguir una periodizacion clasica por bloques largos; usa ciclos cortos y rotaciones amplias:

```txt
Calibrar baseline -> repetir esquema -> subir carga/reps -> cambiar esquema -> registrar PR -> mantener con microdosis
```

Los esquemas 2D/5D/10D/20D permiten comparar fuerza, resistencia de fuerza y densidad sin necesitar sesiones largas. La app convierte todo a valores comparables: reps, carga total, lastre, relativo a BW, puntos de leaderboard, niveles y scores ponderados.

La formula perfecta de e1RM no es visible, pero una estimacion razonable es:

```txt
weighted_e1RM = weight_kg * multiplier_dense
weighted_calisthenics_e1RM_lastre = (carga_total * multiplier_dense) - BW
```

con multiplicadores por esquema como los de la tabla anterior y una correccion pequena por esfuerzo.
