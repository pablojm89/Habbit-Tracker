# Denseclub - modo BASADO para estimar esquemas

Objetivo: si haces un primer registro tipo `10D7` en dominadas, poder estimar tus otros esquemas (`2D`, `5D`, `20D`, etc.) sin necesitar probarlos todos.

Esto no busca la formula perfecta. Busca una estimacion util para programar entrenos y elegir el siguiente reto.

## Idea central

Un esquema `XDY` significa:

```txt
X = minutos
Y = reps por minuto
total_reps = X * Y
```

Ejemplo:

```txt
10D7 = 10 minutos * 7 reps/min = 70 reps
```

Para convertir de un tiempo a otro uso una curva de fatiga:

```txt
ritmo_objetivo = ritmo_base * (tiempo_base / tiempo_objetivo) ^ alpha
```

Donde `alpha` es el factor de fatiga:

```txt
alpha bajo  = aguantas bien el ritmo al alargar tiempo
alpha alto  = tienes mucha potencia corta pero caes mas en tiempos largos
```

## Valores alpha por tipo de ejercicio

Usar estos valores como default:

```txt
Dominadas / chin-ups / dips estrictos:        0.15
Push-ups / bodyweight mas faciles:            0.12
Pierna bodyweight / rodilla / pulses:         0.10
Barra pesada, mismo peso:                     0.08 - 0.12
Accesorios con mancuerna/cable:               0.10 - 0.14
Pliometria:                                   0.12 - 0.18
Conditioning continuo:                        0.05 - 0.10
Skills por tiempo:                            no convertir como reps
```

Rangos utiles:

```txt
alpha 0.10 = atleta muy resistente / ritmo sostenible
alpha 0.15 = default basado para calistenia estricta
alpha 0.20 = explosivo, cae mas al alargar
```

## Ejemplo: dominadas 10D7

Input:

```txt
Ejercicio: Dominadas
Registro: 10D7
Total: 70 reps
Alpha usado: 0.15
```

Calculo:

```txt
ritmo_objetivo = 7 * (10 / tiempo_objetivo) ^ 0.15
```

Estimacion:

```txt
2D:  8.9 reps/min  => 2D9  ~= 18 reps
3D:  8.4 reps/min  => 3D8-9 ~= 25 reps
5D:  7.8 reps/min  => 5D8  ~= 39-40 reps
10D: 7.0 reps/min  => 10D7 = 70 reps
20D: 6.3 reps/min  => 20D6-6.5 ~= 126 reps
```

Version practica para entrenar:

```txt
2D objetivo seguro: 2D8
2D objetivo basado: 2D9
2D objetivo agresivo: 2D10

5D objetivo seguro: 5D7
5D objetivo basado: 5D8
5D objetivo agresivo: 5D8-9

20D objetivo seguro: 20D6
20D objetivo basado: 20D6
20D objetivo agresivo: 20D7
```

Mi lectura: si tu primer entreno real de dominadas es `10D7`, tu perfil estimado seria:

```txt
2D9
5D8
10D7
20D6
```

Si el `10D7` fue muy facil, subiria a:

```txt
2D10
5D8-9
20D7
```

Si fue al limite, bajaria a:

```txt
2D8
5D7
20D5-6
```

## Regla de redondeo

Para elegir esquema:

```txt
ritmo_estimado >= N + 0.70  => redondear arriba
ritmo_estimado entre N+0.30 y N+0.70 => dejar rango
ritmo_estimado < N + 0.30 => redondear abajo
```

Ejemplo:

```txt
7.77 reps/min en 5D
=> rango 5D7-8
=> si quieres objetivo basado: 5D8
=> si quieres objetivo conservador: 5D7
```

## Ajuste por esfuerzo

La estimacion cambia segun como sentiste el registro.

```txt
effort 2-3: +5% a +10% al ritmo estimado
effort 5: sin ajuste
effort 7: -3% a -5%
effort 9: -8% a -12%
```

Ejemplo:

```txt
10D7 dominadas effort 3:
2D ~= 9.4-9.8
5D ~= 8.2-8.5
20D ~= 6.6-6.9

10D7 dominadas effort 9:
2D ~= 8.0
5D ~= 7.0
20D ~= 5.6
```

## Conversion general entre esquemas

Si tienes cualquier esquema:

```txt
base = XDY
tiempo_base = X
ritmo_base = Y
```

Entonces:

```txt
Y_objetivo = Y_base * (X_base / X_objetivo) ^ alpha
total_objetivo = X_objetivo * Y_objetivo
```

Ejemplo desde `5D8` dominadas:

```txt
10D = 8 * (5 / 10)^0.15 = 7.21 reps/min => 10D7
20D = 8 * (5 / 20)^0.15 = 6.50 reps/min => 20D6-7
2D  = 8 * (5 / 2)^0.15 = 9.18 reps/min => 2D9
```

## Tabla rapida desde 10D

Para calistenia estricta, `alpha = 0.15`.

Si haces `10DY`, estima:

```txt
2D  ~= Y * 1.27
3D  ~= Y * 1.20
5D  ~= Y * 1.11
10D =  Y
20D ~= Y * 0.90
```

Ejemplos:

```txt
10D5 -> 2D6, 5D5-6, 20D4-5
10D6 -> 2D8, 5D7,   20D5
10D7 -> 2D9, 5D8,   20D6
10D8 -> 2D10,5D9,   20D7
10D10 -> 2D13,5D11, 20D9
```

## Para ejercicios con peso

Hay dos casos.

### Caso A: mismo peso, estimar reps/min

Ejemplo:

```txt
Bench Press 10D5 con 80kg
```

Quieres saber que ritmo podrias hacer con los mismos 80kg en 5D o 20D.

Formula igual:

```txt
ritmo_objetivo = ritmo_base * (tiempo_base / tiempo_objetivo) ^ alpha
```

Usaria alpha mas bajo:

```txt
barra pesada: 0.08 - 0.12
```

Ejemplo con alpha 0.10:

```txt
10D5 80kg
2D:  5 * (10/2)^0.10 = 5.87 => 2D6
5D:  5 * (10/5)^0.10 = 5.36 => 5D5-6
20D: 5 * (10/20)^0.10 = 4.67 => 20D4-5
```

### Caso B: mismo esquema, estimar carga

Ejemplo:

```txt
Bench 10D5 80kg
Quiero estimar 5D5, 20D5, 2D5 en carga.
```

Modelo simple:

```txt
carga_objetivo = carga_base * (tiempo_base / tiempo_objetivo) ^ beta
```

Valores beta:

```txt
barra pesada principal:       0.04 - 0.07
accesorio/mancuerna/cable:    0.03 - 0.06
calistenia lastrada total:    0.04 - 0.08
```

Ejemplo con beta 0.06:

```txt
10D5 80kg
2D5:  80 * (10/2)^0.06 = 88.1kg
5D5:  80 * (10/5)^0.06 = 83.4kg
20D5: 80 * (10/20)^0.06 = 76.7kg
```

## Para calistenia lastrada

Usar carga total, no solo lastre:

```txt
carga_total = peso_corporal + lastre
```

Convertir:

```txt
carga_total_objetivo = carga_total_base * (tiempo_base / tiempo_objetivo) ^ beta
lastre_objetivo = carga_total_objetivo - peso_corporal
```

Ejemplo:

```txt
Weighted Chin-up 10D3 con BW 80kg y +20kg
carga_total = 100kg
beta = 0.06

5D3: 100 * (10/5)^0.06 = 104.2kg total => +24.2kg
20D3: 100 * (10/20)^0.06 = 95.9kg total => +15.9kg
2D3: 100 * (10/2)^0.06 = 110.1kg total => +30.1kg
```

## Como usarlo en la practica

Despues de tu primer registro:

```txt
1. Identifica tiempo base: 2, 5, 10 o 20.
2. Identifica ritmo base: reps por minuto.
3. Elige alpha segun ejercicio.
4. Estima 2D, 5D, 10D, 20D.
5. Ajusta por effort.
6. El siguiente entreno usa el objetivo seguro o basado, no el agresivo.
```

Regla de seleccion:

```txt
Si estas aprendiendo el estilo: objetivo seguro.
Si el registro base fue effort 5: objetivo basado.
Si fue effort 2-3 y tecnica limpia: objetivo agresivo.
Si fue effort 7-9: objetivo seguro.
```

## Mini funcion mental

Para calistenia estricta desde `10D`:

```txt
2D  = 10D * 1.27
5D  = 10D * 1.11
20D = 10D * 0.90
```

Asi, desde `10D7`:

```txt
2D  = 7 * 1.27 = 8.9 => 2D9
5D  = 7 * 1.11 = 7.8 => 5D8
20D = 7 * 0.90 = 6.3 => 20D6
```

