# Dense Club - Formulas estimadas

Analisis practico de las metricas visibles en Dense Club. Estas formulas no pretenden ser exactas al 100%, pero sirven para aproximar rankings, puntos, e1RM, volumen y progresiones Dense.

## 1. Formula base del leaderboard

Para cualquier ranking, los puntos parecen calcularse como proporcion frente al lider:

```txt
puntos = round(5 * valor_usuario / valor_lider, 1)
```

Equivalente:

```txt
puntos = round(5 * min(valor_usuario, valor_lider) / max(valor_usuario, valor_lider), 1)
```

Como el lider suele ser el valor maximo:

```txt
puntos = round(5 * valor_usuario / valor_lider, 1)
```

Ejemplos:

```txt
valor_lider = 100
usuario = 80
puntos = 5 * 80 / 100 = 4.0 pts

usuario = 50
puntos = 5 * 50 / 100 = 2.5 pts
```

## 2. Progresiones Dense

Los esquemas tipo `10D3`, `10D1-2-3` o `10D2-3-5` representan bloques de densidad/EMOM.

```txt
XDn = X minutos con n reps por minuto
XD1-2-3 = X minutos alternando 1, 2, 3 reps
```

Formula general:

```txt
ciclos_completos = floor(minutos / longitud_ciclo)
resto = minutos % longitud_ciclo

reps_totales = ciclos_completos * suma_ciclo + suma(primeros elementos del resto)
```

Ejemplos:

```txt
10D1       = 10 * 1 = 10 reps
10D3       = 10 * 3 = 30 reps
10D5       = 10 * 5 = 50 reps
5D5        = 5 * 5 = 25 reps
20D3       = 20 * 3 = 60 reps

10D1-2-3   = 1+2+3 repetido 3 veces + 1 = 19 reps
10D2-3-5   = 2+3+5 repetido 3 veces + 2 = 32 reps
```

## 3. Weighted calisthenics

Ejemplos:

```txt
Weighted Chin-up
DB Jump Squats
Banded Stalder Press
Heavy Sled Push
Weighted Dips, si existen en el leaderboard
```

La app no muestra directamente la carga interna. Para weighted calisthenics, el valor mostrado como `+kg` se calcula asi:

```txt
kg_mostrados = max(0, value - bodyweight_at)
```

Por tanto:

```txt
value = bodyweight_at + lastre
```

En modo absoluto, el ranking y los puntos parecen usar `value`, no solo el lastre. Por eso dos atletas con el mismo `+kg` pueden puntuar diferente si tienen distinto peso corporal.

### e1RM estimado simple

Formula rapida:

```txt
e1RM +kg ~= lastre * multiplicador_del_esquema
```

Multiplicadores practicos:

```txt
5D1        x1.08
5D3        x1.15
5D5        x1.25

10D1       x1.17
10D3       x1.23
10D1-2-3   x1.20
10D2-3-5   x1.25
10D5       x1.30

20D1       x1.22
20D3       x1.32
20D5       x1.40
```

Ejemplos para Weighted Chin-up:

```txt
10D1 +40 kg       ~= 47 kg e1RM
10D1 +42 kg       ~= 49 kg e1RM
10D3 +38 kg       ~= 46-47 kg e1RM
10D1-2-3 +47 kg   ~= 56-57 kg e1RM
10D2-3-5 +40 kg   ~= 50 kg e1RM
5D5 +32 kg        ~= 40 kg e1RM
```

### e1RM estimado con peso corporal

Version mas parecida a la logica interna:

```txt
e1RM +kg ~= ((BW + lastre) * factor_total) - BW
```

Factores aproximados sobre carga total:

```txt
10D1       x1.05 - x1.07
10D3       x1.08 - x1.10
10D1-2-3   x1.07 - x1.09
10D2-3-5   x1.10 - x1.12
5D5        x1.07 - x1.09
10D5       x1.12 - x1.15
```

Ejemplo:

```txt
BW = 80 kg
lastre = 40 kg
scheme = 10D1
factor_total = 1.06

e1RM +kg = ((80 + 40) * 1.06) - 80
e1RM +kg = 127.2 - 80
e1RM +kg = 47.2 kg
```

## 4. Bodyweight

Ejemplos:

```txt
Chin-up
Dips
Handstand Push-up
Dead hang
Front lever hold
Front lever raises
Bodyweight Squat
Push-up variants
```

En bodyweight dinamico, el valor del leaderboard suele ser reps:

```txt
valor = reps
puntos = round(5 * reps_usuario / reps_lider, 1)
```

En algunos esquemas simples como `5D`, `10D` o `20D`:

```txt
reps_totales ~= minutos * value
```

Ejemplos:

```txt
Dips 5D value 13
reps_totales ~= 5 * 13 = 65 reps

Chin-up 10D value 5
reps_totales ~= 10 * 5 = 50 reps
```

## 5. Isometricos

Ejemplos:

```txt
Dead hang
Front lever hold
Handstand hold
Horse stance
Back bridge hold
Chin-up hold top
```

La app parece convertir tiempo sostenido a reps equivalentes:

```txt
reps_equiv = floor(segundos_totales / 5)
```

Es decir:

```txt
5 s  ~= 1 rep equivalente
30 s ~= 6 reps equivalentes
60 s ~= 12 reps equivalentes
```

Si el ejercicio es por lado:

```txt
reps_efectivas = reps_equiv * 2
```

## 6. Weighted normal

Ejemplos:

```txt
Barbell Back Squat
Front Squat
Bench Press
Barbell Row
ATG Split Squat
Goblet Squat
DB Bulgarian Split Squat
Clean
Snatch
```

Formula de carga efectiva:

```txt
carga_efectiva = peso * multiplicador_implemento
```

Multiplicadores:

```txt
barbell / machine       x1
dumbbell_pair           x2
kettlebell_pair         x2
dumbbell_single         x1
kettlebell_single       x1
```

Si el ejercicio es por lado:

```txt
reps_efectivas = reps * 2
```

Formula de tonelaje:

```txt
tonnage = (peso * multiplicador_implemento + BW * bodyweight_pct) * reps_efectivas * tonnage_factor
```

Donde:

```txt
bodyweight_pct = bodyweight_contribution_pct / 100
```

Ejemplo:

```txt
ATG Split Squat
peso = 20 kg por mancuerna
load_pattern = dumbbell_pair -> multiplicador = 2
BW = 80 kg
bodyweight_pct = 85% -> 0.85
reps = 5 por lado
reps_per_side = true -> reps_efectivas = 10

tonnage = (20 * 2 + 80 * 0.85) * 10
tonnage = (40 + 68) * 10
tonnage = 1080 kg
```

## 7. Bodyweight contribution

Algunos porcentajes visibles en el catalogo publico:

```txt
Chin-up                     100%
Dips                        100%
Handstand Push-up            95%
90 Degree HSPU               95%
Handstand Chest to Wall      90%
Floating Pike Push-ups       90%
Bodyweight Squat            100%
Bodyweight Walking Lunges    85%
Barbell Back Squat           85%
Front Squat                  85%
ATG Split Squat              85%
Goblet Squat                 85%
Clean / Snatch               75%
Back lever pulls             80%
Hanging Leg Raise            35%
Ab Rollout                   60%
Deficit Push-up              74%
Clap Push-Up                 70%
```

Uso:

```txt
carga_sistema = carga_externa + BW * bodyweight_pct
```

## 8. Banded

Ejemplos:

```txt
Banded Back Squat
Banded Pull Apart
Hip Adduction
```

En leaderboard, el valor suele comportarse como reps:

```txt
valor = reps
puntos = round(5 * reps_usuario / reps_lider, 1)
```

Si existe resistencia cuantificada, podria entrar como carga externa, pero en lo visible se trata principalmente como conteo de reps.

## 9. Conditioning y plyometrics

Ejemplos:

```txt
Assault Bike / AirDyne
Exercise Bike Sprint
Banded Resisted Sprints
Deadmill Push
Farmers Carry
Box Jump
Broad Jump
Drop Jump
```

Si el ejercicio trackea watts:

```txt
valor = max_watts
puntos = round(5 * watts_usuario / watts_lider, 1)
```

Si es distancia/tiempo:

```txt
valor = mejor tiempo, distancia, intervalos o reps segun modalidad
```

Para volumen de conditioning:

```txt
conditioning_volume = horas_totales
avg = horas_totales / ventana
```

Para PR count:

```txt
PR_count = numero de records en la ventana seleccionada
```

## 10. Resumen final

Formula mental rapida:

```txt
Weighted calisthenics:
e1RM ~= lastre * factor_esquema

Bodyweight:
score ~= reps o reps/min del bloque Dense

Weighted:
score ~= carga externa ajustada por implemento
tonnage ~= carga_sistema * reps_efectivas

Isometricos:
1 rep equivalente ~= 5 segundos

Conditioning:
score ~= watts maximos, tiempo, distancia o intervalos

Leaderboard:
pts ~= 5 * valor_usuario / valor_lider
```

Regla practica:

```txt
Cuanto mas volumen tiene el esquema Dense,
mayor es el multiplicador sobre el lastre o la carga.
```
