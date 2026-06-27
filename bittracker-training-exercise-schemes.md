# BitTracker Training - ejercicios y esquemas Dense propios

Objetivo: definir un catalogo inicial de ejercicios que a mi me gustan, con sus variantes, esquemas Dense recomendados y compatibilidad con estimaciones progresivas.

Este documento es la base para la futura seccion `training` de BitTracker.

## Principios

Quiero que cada ejercicio tenga:

```txt
nombre
familia de estimacion
tipo: bodyweight, weighted, weighted_calisthenics, rings, mobility_strength, lower_body
variantes: sin peso, con peso, anillas, suelo, unilateral, bilateral
esquemas permitidos
si puede usar carga externa
si usa peso corporal como carga principal
si el estimador debe calcular 2D, 5D, 10D, 20D
```

Para todos los ejercicios de reps se busca poder estimar:

```txt
2D
3D
5D
10D
20D
```

Y para ejercicios con carga:

```txt
1. mismo peso -> estimar reps/min en otros tiempos
2. mismo esquema -> estimar carga en otros tiempos
```

## Familias de estimacion

Estas familias conectan cada ejercicio con el estimador progresivo.

```txt
strict_pull
strict_dip
ring_push
horizontal_pull
pushup
squat_bodyweight
single_leg_squat
hinge_bodyweight
hinge_weighted
mobility_strength
loaded_calisthenics
accessory
core
plyometric
conditioning
skill
```

Alphas iniciales:

```txt
strict_pull:          0.15
strict_dip:           0.14
ring_push:            0.14
horizontal_pull:      0.13
pushup:               0.12
squat_bodyweight:     0.10
single_leg_squat:     0.13
hinge_bodyweight:     0.11
hinge_weighted:       0.10
mobility_strength:    0.10
loaded_calisthenics:  0.16
accessory:            0.11
core:                 0.13
plyometric:           0.16
conditioning:         0.08
skill:                sin conversion reps
```

## Esquemas base

### Bodyweight variable

Para ejercicios sin carga externa donde el reto es reps/min:

```txt
2D
3D
5D
10D
20D
```

La app puede mostrar el resultado como:

```txt
2D15
5D8
10D7
20D6
```

### Weighted / weighted calisthenics

Para versiones con peso:

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

### Isometricos opcionales

Para posiciones o holds:

```txt
2D10s
2D20s
2D30s
5D10s
5D20s
5D30s
10D10s
10D20s
20D10s
```

## Catalogo inicial

## Tirones verticales

### Dominadas

```txt
id: pull_up
familia: strict_pull
tipo principal: bodyweight
versiones:
  - Dominada sin peso
  - Dominada lastrada
  - Dominada agarre neutro
  - Chin-up / supina
  - Dominada pausa arriba
  - Dominada chest-to-bar, opcional
```

Esquemas sin peso:

```txt
2D
3D
5D
10D
20D
```

Esquemas con peso:

```txt
2D5
5D1
5D3
5D5
10D1
10D3
10D5
10D1-2-3
20D1
20D3
```

Notas:

```txt
Sin peso: estimar reps/min.
Con peso: usar carga total = BW + lastre.
Para lastre pesado, priorizar 5D1, 5D3, 10D1, 10D3.
Para capacidad, usar 10D5 o 20D3.
```

### Chin-up

```txt
id: chin_up
familia: strict_pull
tipo principal: bodyweight
versiones:
  - Chin-up sin peso
  - Chin-up lastrado
  - Chin-up pausa
```

Esquemas:

```txt
sin peso: 2D, 3D, 5D, 10D, 20D
con peso: 2D5, 5D1, 5D3, 5D5, 10D1, 10D3, 10D5, 20D1, 20D3
```

Notas:

```txt
Puede compartir curva con dominadas al principio, pero idealmente tendra perfil propio.
```

## Empujes en anillas

### Dips en anillas

```txt
id: ring_dip
familia: strict_dip
tipo principal: rings
versiones:
  - Ring dip sin peso
  - Ring dip lastrado
  - Ring dip con pausa abajo
  - Ring support hold, opcional isometrico
```

Esquemas sin peso:

```txt
2D
3D
5D
10D
20D
```

Esquemas con peso:

```txt
2D5
5D1
5D3
5D5
10D1
10D3
10D5
10D1-2-3
20D1
20D3
```

Notas:

```txt
En anillas la estabilidad fatiga mas que en paralelas.
Alpha inicial 0.14, pero si el 20D cae mucho subir a 0.16.
Con peso usar carga total = BW + lastre.
```

### Flexiones en anillas

```txt
id: ring_push_up
familia: ring_push
tipo principal: rings
versiones:
  - Flexion en anillas
  - Flexion en anillas pies elevados
  - Flexion en anillas con lastre
  - Flexion profunda en anillas
```

Esquemas sin peso:

```txt
2D
3D
5D
10D
20D
```

Esquemas con peso:

```txt
2D10
5D5
5D10
10D5
10D10
20D5
```

Notas:

```txt
Sin peso puede progresar por reps/min.
Con peso normalmente no hace falta ir a 5D1 salvo que sea muy pesado.
```

### Remo horizontal con anillas

```txt
id: ring_row
familia: horizontal_pull
tipo principal: rings
versiones:
  - Remo en anillas
  - Remo en anillas pies elevados
  - Remo archer, opcional
```

Esquemas:

```txt
2D
3D
5D
10D
20D
```

Notas:

```txt
Principalmente sin peso.
La dificultad se ajusta por inclinacion corporal, altura de pies y tempo.
La app deberia permitir una nota de dificultad: low, medium, high, feet elevated.
No mezclar automaticamente marcas de inclinaciones distintas si la diferencia es grande.
```

## Empujes en suelo

### HeSPU - Headstand Push-Up nariz a suelo

```txt
id: headstand_push_up
familia: hspu
tipo principal: bodyweight
versiones:
  - HeSPU estricta, nariz/cabeza a suelo
  - HeSPU con pausa abajo
  - HeSPU deficit pequeno, opcional
  - HeSPU con lastre, opcional avanzado
```

Definicion:

```txt
Flexion de pino normal con manos a altura de suelo.
ROM: cabeza/nariz toca suelo.
No confundir con full ROM HSPU en paralelas/bloques.
```

Esquemas sin peso:

```txt
2D
3D
5D
10D
20D
```

Esquemas con peso, solo si algun dia aplica:

```txt
2D5
5D1
5D3
5D5
10D1
10D3
10D5
20D1
20D3
```

Notas:

```txt
Ejercicio de empuje vertical estricto.
Alpha inicial: 0.16.
Si hay mucha fatiga neural o tecnica, subir a 0.18.
No mezclar automaticamente con HSPU full ROM.
Puede transferir parcialmente a HSPU full ROM, pero la full ROM debe tener curva propia.
```

## Empujes con mancuernas

### Press militar sentado con mancuernas

```txt
id: seated_db_overhead_press
familia: accessory
tipo principal: weighted
load_pattern: dumbbell_pair
versiones:
  - Press militar sentado con mancuernas
  - Press militar sentado con pausa abajo
  - Press militar sentado alterno, opcional
  - Press militar sentado agarre neutro, opcional
```

Campos de carga:

```txt
weight_per_dumbbell_kg
total_external_load_kg = weight_per_dumbbell_kg * 2
```

Ejemplo:

```txt
Mancuernas de 22.5kg
peso por mancuerna = 22.5kg
peso total = 45kg
```

Esquemas recomendados:

```txt
2D5
2D10

5D1
5D3
5D5
5D10

10D1
10D3
10D5
10D10

20D1
20D3
20D5
```

Notas:

```txt
Para mostrar al usuario: usar peso por mancuerna.
Para calculos internos, tonnage y estimacion: usar peso total externo.
No sumar peso corporal como carga principal.
Alpha inicial para reps a mismo peso: 0.11.
Beta inicial para carga a mismo esquema: 0.05.
```

Salida recomendada en UI:

```txt
22.5kg x2
45kg total
5D5
25 reps
```

### HSPU full ROM

```txt
id: full_rom_hspu
familia: hspu
tipo principal: bodyweight
versiones:
  - HSPU full ROM en paralelas/bloques
  - HSPU full ROM con deficit medido
  - HSPU full ROM con pausa abajo
  - HSPU full ROM con lastre, opcional avanzado
```

Definicion:

```txt
Flexion de pino con manos elevadas sobre soportes/bloques/paralelas.
La cabeza baja por debajo del nivel de las manos.
El objetivo es maxima flexion de brazos y ROM completo.
```

Esquemas sin peso:

```txt
2D
3D
5D
10D
20D
```

Esquemas con peso, solo si algun dia aplica:

```txt
2D5
5D1
5D3
5D5
10D1
10D3
10D5
20D1
20D3
```

Notas:

```txt
Mucho mas dificil que HeSPU.
Registrar deficit/altura si cambia, porque altera mucho la marca.
Alpha inicial: 0.17.
Si el 2D predice demasiado alto el 10D/20D, subir a 0.18-0.20.
```

Transferencia HeSPU -> HSPU full ROM:

```txt
No convertir 1:1.
Estimacion inicial muy aproximada:
HSPU_full_rom_rpm ~= HeSPU_rpm * 0.45 a 0.65

Si el deficit es muy grande: usar 0.45-0.55.
Si el deficit es moderado y eres fuerte en rango profundo: usar 0.55-0.65.
```

Ejemplo:

```txt
HeSPU 5D6
=> HSPU full ROM estimada inicial: 5D3-4
```

### Flexiones en el suelo

```txt
id: floor_push_up
familia: pushup
tipo principal: bodyweight
versiones:
  - Flexion normal
  - Flexion pies elevados
  - Flexion diamante
  - Flexion con pausa
  - Flexion con lastre
```

Esquemas sin peso:

```txt
2D
3D
5D
10D
20D
```

Esquemas con peso:

```txt
2D10
5D5
5D10
10D5
10D10
20D5
20D10
```

Notas:

```txt
Buen ejercicio para volumen.
Alpha bajo: 0.12.
Si las reps son muy altas, permitir 2D30, 5D20, 10D15, etc.
```

## Pierna - squat pattern

### Sentadilla normal

```txt
id: bodyweight_squat
familia: squat_bodyweight
tipo principal: bodyweight
versiones:
  - Sentadilla normal
  - Sentadilla profunda
  - Sentadilla con pausa
  - Sentadilla con peso
```

Esquemas sin peso:

```txt
2D
3D
5D
10D
20D
```

Esquemas con peso:

```txt
2D10
2D20
5D10
5D20
10D10
10D20
20D10
20D20
```

Notas:

```txt
Sin peso puede ir a reps altas.
Con peso ligero se trata como weighted/accessory, no como max strength.
```

### Sentadilla en puntillas

```txt
id: tiptoe_squat
familia: squat_bodyweight
tipo principal: mobility_strength
versiones:
  - Sentadilla en puntillas sin peso
  - Sentadilla en puntillas con peso ligero
  - Sentadilla en puntillas con pausa abajo
```

Esquemas:

```txt
2D
3D
5D
10D
20D
```

Con peso:

```txt
2D10
5D10
10D10
20D10
```

Notas:

```txt
Mas de tendon, movilidad y control que de carga maxima.
Mantener effort 3-5 la mayor parte del tiempo.
```

### Pistol squat

```txt
id: pistol_squat
familia: single_leg_squat
tipo principal: bodyweight
reps_per_side: true
versiones:
  - Pistol squat asistida
  - Pistol squat
  - Pistol squat con contrapeso
  - Pistol squat lastrada
```

Esquemas sin peso:

```txt
2D
3D
5D
10D
20D
```

Esquemas con peso:

```txt
2D5
5D1
5D3
5D5
10D1
10D3
10D5
20D1
20D3
```

Notas:

```txt
Registrar si las reps son por pierna o totales.
Recomendacion: guardar total_reps y marcar reps_per_side=true.
Para calidad tecnica, no usar esquemas muy altos hasta tener control.
```

## Hinge / posterior chain

### Good morning sentado con pierna flexionada

```txt
id: seated_bent_leg_good_morning
familia: mobility_strength
tipo principal: mobility_strength
versiones:
  - Sin peso
  - Con mancuerna/kettlebell
  - Con barra ligera
  - Pausa abajo
```

Esquemas sin peso:

```txt
2D
3D
5D
10D
20D
```

Esquemas con peso:

```txt
2D10
2D20
5D5
5D10
5D20
10D5
10D10
20D5
20D10
```

Notas:

```txt
No tratar como max strength.
Mejor medir capacidad, rango, control y carga moderada.
Alpha 0.10.
```

### Good morning a una pierna

```txt
id: single_leg_good_morning
familia: hinge_bodyweight
tipo principal: lower_body
reps_per_side: true
versiones:
  - Sin peso
  - Con mancuerna
  - Con kettlebell
  - Con barra ligera
```

Esquemas sin peso:

```txt
2D
3D
5D
10D
20D
```

Esquemas con peso:

```txt
2D5
2D10
5D5
5D10
10D5
10D10
20D5
```

Notas:

```txt
Importa mucho la calidad tecnica.
Si hay carga, guardar lado y/o reps_per_side.
```

## Ejercicios candidatos para anadir despues

Estos encajan bien con el estilo que estas describiendo:

```txt
Nordic curl
Reverse nordic
Hanging leg raise
Ab rollout
L-sit / tuck hold
Handstand hold
Deep knee bend
Long lunge pulse
Split squat
Bulgarian split squat
Calf raise
Tibialis raise
Jefferson curl
Hip flexor raise
Back bridge push-up
Clap push-up
Jump squat
Depth drop
Skipping
Sprint drills
```

## Plantilla para nuevos ejercicios

Copiar y rellenar:

```txt
### Nombre del ejercicio

id:
familia:
tipo principal:
reps_per_side:
versiones:
  -
  -

Esquemas sin peso:
  2D
  3D
  5D
  10D
  20D

Esquemas con peso:
  2D5
  5D3
  10D3
  20D3

Notas:
  -
```

## Estructura sugerida para la app

```json
{
  "id": "pull_up",
  "name": "Dominada",
  "family": "strict_pull",
  "nature": "bodyweight",
  "variants": [
    {
      "id": "pull_up_bodyweight",
      "name": "Dominada sin peso",
      "load_mode": "bodyweight",
      "allowed_schemes": ["2D", "3D", "5D", "10D", "20D"],
      "estimate_mode": "rpm"
    },
    {
      "id": "weighted_pull_up",
      "name": "Dominada lastrada",
      "load_mode": "weighted_calisthenics",
      "allowed_schemes": ["2D5", "5D1", "5D3", "5D5", "10D1", "10D3", "10D5", "20D1", "20D3"],
      "estimate_mode": "total_load_and_rpm"
    }
  ]
}
```

## Reglas para integracion con el estimador

Cada registro debe guardar:

```txt
exercise_id
variant_id
date
scheme
total_reps
weight_kg, si aplica
bodyweight_kg, si aplica
effort
notes
```

Para bodyweight:

```txt
usar estimator rpm
```

Para weighted normal:

```txt
modo A: estimar rpm a mismo peso
modo B: estimar carga a mismo esquema
```

Para weighted calisthenics:

```txt
carga_total = bodyweight + lastre
estimar con carga_total
mostrar al usuario lastre = carga_total - bodyweight
```

## Primer set oficial de ejercicios

Lista inicial para implementar:

```txt
pull_up
chin_up
ring_dip
ring_push_up
ring_row
headstand_push_up
full_rom_hspu
seated_db_overhead_press
floor_push_up
bodyweight_squat
tiptoe_squat
pistol_squat
seated_bent_leg_good_morning
single_leg_good_morning
```

Este set ya cubre:

```txt
tiron vertical
empuje vertical/anillas
empuje horizontal
tiron horizontal
squat bilateral
squat unilateral
hinge/mobility posterior
calistenia con y sin peso
```
