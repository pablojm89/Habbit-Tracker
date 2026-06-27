# Denseclub - estimador progresivo para todos los esquemas

Objetivo: que cada entrenamiento nuevo recalibre tus marcas estimadas en otros esquemas.

Ejemplo:

```txt
Dia 1: haces dominadas 10D7
=> estima 2D9, 5D8, 20D6

Dia 2: haces dominadas 2D15
=> el modelo aprende que tu potencia corta es mas alta
=> sube estimacion de 5D, mantiene o sube poco 10D, y sube con cuidado 20D
```

## 1. Parsear cualquier esquema

Para `XDY`:

```txt
minutes = X
rpm = Y
total_reps = X * Y
```

Ejemplos:

```txt
2D15 = 2 min * 15 reps/min = 30 reps
5D8 = 5 min * 8 reps/min = 40 reps
10D7 = 10 min * 7 reps/min = 70 reps
20D6 = 20 min * 6 reps/min = 120 reps
```

Para ladders:

```txt
10D1-2-3
10D2-3-5
```

Formula:

```txt
cycle = [1,2,3]
full_cycles = floor(minutes / cycle.length)
remainder = minutes % cycle.length
total_reps = full_cycles * sum(cycle) + sum(first remainder values)
rpm_equivalent = total_reps / minutes
```

Ejemplos:

```txt
10D1-2-3 = 19 reps => 1.9 rpm
10D2-3-5 = 32 reps => 3.2 rpm
```

## 2. Curva base de fatiga

La conversion entre tiempos usa:

```txt
target_rpm = base_rpm * (base_minutes / target_minutes) ^ alpha
```

`alpha` depende del tipo de ejercicio.

```txt
0.08 = muy resistente, poca caida al alargar
0.12 = resistencia buena
0.15 = calistenia estricta default
0.18 = explosivo, cae mas al alargar
0.22 = test corto muy potente, mala transferencia a largo
```

## 3. Alphas por familia

Usa esto como default:

```txt
Dominadas / chin-ups estrictos:           0.15
Dips estrictos:                           0.14
Pull-up/chin-up lastrado, reps a mismo peso: 0.16
Push-ups:                                 0.12
Handstand push-up:                        0.16
Core reps, hanging leg raise/ab rollout:  0.13
Nordic curl:                              0.16
Pierna bodyweight facil/pulses:           0.10
Pierna unilateral pesada:                 0.12
Barra pesada principal:                   0.10
Oly lifts / tecnica potente:              0.14
Accesorios cable/mancuerna:               0.11
Banded:                                   0.10
Pliometria:                               0.16
Conditioning por reps/intervalos:         0.08
Skills por tiempo/booleano:               no convertir como reps
```

## 4. Actualizar con cada marca nueva

Cada marca genera una "capacidad normalizada":

```txt
capacity = adjusted_rpm * minutes ^ alpha
```

Donde:

```txt
adjusted_rpm = logged_rpm * effort_factor
```

Effort factor:

```txt
effort 2: 1.12
effort 3: 1.08
effort 5: 1.00
effort 7: 0.97
effort 9: 0.93
sin effort: 1.00
```

Luego para estimar cualquier objetivo:

```txt
predicted_rpm = weighted_average(capacity_i) / target_minutes ^ alpha
predicted_total_reps = predicted_rpm * target_minutes
```

## 5. Peso de cada registro

No todos los registros deben pesar igual.

Peso recomendado:

```txt
base_weight = 1.0

si effort 2-3:     weight = 0.7   porque no fue un test real
si effort 5:       weight = 1.0
si effort 7:       weight = 1.1
si effort 9:       weight = 0.8   porque puede estar contaminado por fallo/fatiga
```

Recencia:

```txt
0-14 dias:     * 1.00
15-30 dias:    * 0.85
31-60 dias:    * 0.70
61-90 dias:    * 0.55
90+ dias:      * 0.40
```

Especificidad al tiempo objetivo:

```txt
specificity = 1 / (1 + abs(log(target_minutes / logged_minutes)))
```

Ejemplo:

```txt
Un 2D pesa mucho para estimar 2D y 5D.
Un 10D pesa mucho para estimar 5D, 10D y 20D.
Un 20D pesa mucho para estimar 10D y 20D.
```

Peso total:

```txt
weight_total = effort_weight * recency_weight * specificity^2
```

Uso `specificity^2` para que los tests cercanos al objetivo manden mucho mas. Un `2D15` debe pesar muchisimo al estimar `2D` y bastante al estimar `5D`, pero no deberia reescribir por completo tu `20D`.

## 6. Ejemplo progresivo: dominadas

Registro 1:

```txt
10D7 effort 5
minutes = 10
rpm = 7
alpha = 0.15
capacity = 7 * 10^0.15 = 9.89
```

Estimacion inicial:

```txt
2D  = 9
5D  = 8
10D = 7
20D = 6
```

Registro 2:

```txt
2D15 effort 7
minutes = 2
rpm = 15
adjusted_rpm = 15 * 0.97 = 14.55
capacity = 14.55 * 2^0.15 = 16.14
```

Ese `2D15` dice que tu capacidad corta es mucho mas alta que lo que predecia `10D7`. Pero no debe subir igual el `20D`, porque un 2D transfiere mal a 20D.

Lectura basada:

```txt
2D: sube mucho
5D: sube bastante
10D: sube algo
20D: sube poco hasta que lo confirmes con 10D/20D
```

Prediccion practica despues de ambos:

```txt
2D:  2D14-15
5D:  5D10-11
10D: 10D8-9
20D: 20D7
```

Si haces luego:

```txt
20D7 effort 5
```

Entonces ya confirmas resistencia larga y el modelo ajusta:

```txt
2D:  2D14-15
5D:  5D10
10D: 10D8-9
20D: 20D7
```

Si en cambio haces:

```txt
20D5 effort 9
```

El modelo aprende que eres muy potente en corto pero caes mucho en largo:

```txt
2D:  2D14-15
5D:  5D9-10
10D: 10D7
20D: 20D5-6
```

## 7. Regla de mezcla basada

Cuando hay conflicto entre un test corto y uno largo:

```txt
2D alto + 20D bajo = perfil explosivo
2D normal + 20D alto = perfil resistente
5D/10D altos = perfil equilibrado
```

Ajusta alpha por ejercicio/persona:

```txt
Si el 2D predice demasiado alto el 20D: subir alpha.
Si el 20D predice demasiado bajo el 2D: bajar alpha.
```

Regla practica:

```txt
Cada vez que un test real falla por mas de 10% contra la prediccion,
ajusta alpha 0.02 hacia la direccion correcta.
```

Ejemplo:

```txt
Predije 20D7 desde 2D15, pero haces 20D5.
=> alpha era demasiado bajo
=> subir de 0.15 a 0.17 o 0.18
```

## 8. Todos los objetivos Dense

Para cada ejercicio reps-based, recalcula:

```txt
2D
3D
5D
10D
20D
```

Y si quieres aproximar variantes mas concretas:

```txt
2D5, 2D10, 2D20
5D1, 5D3, 5D5, 5D10, 5D20
10D1, 10D3, 10D5, 10D10, 10D20
20D1, 20D3, 20D5, 20D10, 20D20
```

Para bodyweight, lo que importa es el `Y` estimado:

```txt
predicted 5D = 8.4 rpm
=> objetivo conservador: 5D8
=> objetivo basado: 5D8-9
=> objetivo agresivo: 5D9
```

## 9. Ejercicios con peso: dos modelos

### Modelo A: mismo peso, estimar reps/min

Ejemplo:

```txt
Bench 80kg 10D5
```

Estima:

```txt
80kg 2D?
80kg 5D?
80kg 20D?
```

Formula:

```txt
target_rpm = base_rpm * (base_minutes / target_minutes) ^ alpha
```

Usa alpha de barra:

```txt
0.10 default
```

### Modelo B: mismo esquema, estimar carga

Ejemplo:

```txt
Bench 10D5 80kg
```

Estima:

```txt
5D5 carga?
20D5 carga?
2D5 carga?
```

Formula:

```txt
target_load = base_load * (base_minutes / target_minutes) ^ beta
```

Betas:

```txt
barra pesada principal:      0.04 - 0.07
calistenia lastrada total:   0.05 - 0.08
accesorios/cable/mancuerna:  0.03 - 0.06
```

Ejemplo:

```txt
Bench 10D5 80kg, beta 0.06
2D5  ~= 88kg
5D5  ~= 83kg
20D5 ~= 77kg
```

## 10. Calistenia lastrada

Para weighted chin-up, weighted pull-up, weighted dips:

```txt
carga_total = bodyweight + lastre
```

No conviertas solo el lastre, porque la app trabaja con carga total.

Ejemplo:

```txt
BW 80kg
Weighted Chin-up 10D3 +20kg
carga_total = 100kg
```

Si quieres estimar `5D3`, `2D3`, `20D3`:

```txt
target_total_load = base_total_load * (base_minutes / target_minutes) ^ beta
target_added_load = target_total_load - BW
```

Con beta 0.06:

```txt
2D3  ~= +30kg
5D3  ~= +24kg
10D3 = +20kg
20D3 ~= +16kg
```

## 11. Como decidir el siguiente entreno

Para cada prediccion genera tres niveles:

```txt
seguro = predicted_rpm * 0.93
basado = predicted_rpm * 1.00
agresivo = predicted_rpm * 1.07
```

Regla:

```txt
Si vienes fresco y tecnica limpia: basado
Si vienes cansado o es ejercicio nuevo: seguro
Si el ultimo registro fue effort 2-3: agresivo
Si el ultimo registro fue effort 7-9: seguro o basado
```

Ejemplo:

```txt
Prediccion dominadas 5D = 10.4 rpm

seguro: 5D10
basado: 5D10-11
agresivo: 5D11
```

## 12. Salida recomendada por ejercicio

Para cada ejercicio guarda una ficha:

```txt
Exercise: Chin-up
Family: strict_pull
Alpha: 0.15
Last tests:
  2026-06-01 10D7 e5
  2026-06-04 2D15 e7

Estimated profile:
  2D:  14-15 rpm
  5D:  10-11 rpm
  10D: 8-9 rpm
  20D: 7 rpm

Next suggested:
  safe: 5D10
  based: 10D8
  aggressive: 2D16
```

## 13. Pseudocodigo

```txt
for each exercise:
  alpha = alpha_by_family(exercise)
  observations = all dense reps logs for exercise

  for target_minutes in [2, 3, 5, 10, 20]:
    numerator = 0
    denominator = 0

    for obs in observations:
      obs_minutes = parse_minutes(obs.scheme)
      obs_rpm = parse_rpm(obs.scheme, obs.total_reps)
      adjusted_rpm = obs_rpm * effort_factor(obs.effort)
      capacity = adjusted_rpm * obs_minutes ^ alpha

      w = effort_weight(obs.effort)
      w *= recency_weight(obs.date)
      w *= specificity_weight(obs_minutes, target_minutes)

      numerator += capacity * w
      denominator += w

    predicted_capacity = numerator / denominator
    predicted_rpm = predicted_capacity / target_minutes ^ alpha
    predicted_scheme = round_to_dense(predicted_rpm)
```

## 14. Round to Dense

```txt
if rpm < 3:
  usar decimal o ladder si existe
else:
  redondear a entero cercano
```

Para entrenar:

```txt
decimal .00 - .29 => redondear abajo
decimal .30 - .69 => rango
decimal .70 - .99 => redondear arriba
```

Ejemplos:

```txt
7.2 => 7
7.5 => 7-8
7.8 => 8
```

## 15. Interpretacion rapida

Si cada nuevo entreno va entrando al modelo:

```txt
Un 2D actualiza potencia corta.
Un 5D actualiza zona media.
Un 10D actualiza capacidad base.
Un 20D actualiza resistencia larga.
```

La prediccion buena no sale de una sola marca: sale de la mezcla.
