# BitTracker - almacenamiento cloud y hoja de calculo

Objetivo: que los entrenamientos y metricas no vivan solo en `localStorage`, sino en una fuente externa donde podamos calcular fuerza, densidad, e1RM, progreso, peso corporal y recomendaciones.

## Decision recomendada

Para la fase actual de esta app estatica:

```txt
Frontend BitTracker -> Apps Script Web App -> Google Sheet
```

Por que:

- La app actual es HTML/CSS/JS sin backend.
- Google Sheets permite ver y auditar los datos a mano.
- Apps Script actua como backend simple y evita meter credenciales de Google Sheets en el navegador.
- Podemos tener pestanas con datos crudos, datos normalizados y formulas/metadatos.

Para una version mas seria/multiusuario:

```txt
Frontend BitTracker -> Supabase/Postgres -> vistas SQL -> Google Sheets/Looker export opcional
```

Supabase es mejor si quieres login, historico grande, permisos reales y queries potentes. Google Sheets es mejor ahora si quieres iterar rapido y tocar formulas.

## Lo que ya se agrego a la app

En el panel `Data` hay un bloque nuevo:

```txt
Cloud / Google Sheets
- Endpoint URL
- Token privado
- Sync automatico
- Sync ahora
```

Cada vez que guardas un cambio, la app envia un payload JSON al endpoint configurado. Por limitacion de una app estatica, se mantiene una copia local como cache/fallback, pero la fuente de verdad pasa a ser la hoja cuando Cloud esta activado.

## Archivo servidor

Plantilla:

```txt
google-sheets-apps-script.gs
```

Ese script crea y mantiene estas pestanas:

| Pestana | Uso |
|---|---|
| RawState | Snapshot completo del estado recibido |
| HabitRecords | Habitos diarios normalizados |
| DayNotes | Energia, sueno, FROG, familia, nota |
| TrainingExercises | Mesociclo actual, ejercicios prescritos y completados |
| DenseTraining | Registros futuros con formulas de Dense/e1RM |
| WorkingPercentages | Tabla e1RM por esquema |
| BodyweightMultipliers | Multiplicadores 2D/5D/10D/20D |
| FormulaGuide | Guia de formulas usadas |

## Como configurarlo

1. Crea una Google Sheet nueva.
2. En la hoja, abre `Extensiones -> Apps Script`.
3. Pega el contenido de `google-sheets-apps-script.gs`.
4. En Apps Script, ve a `Project Settings -> Script Properties`.
5. Crea:

```txt
BITTRACKER_SYNC_TOKEN = un-token-largo-privado
```

6. Despliega como Web App:

```txt
Deploy -> New deployment -> Web app
Execute as: Me
Who has access: Anyone with the link
```

7. Copia la URL `/exec`.
8. En BitTracker, panel `Data`, pega:

```txt
Endpoint URL = URL del Web App
Token privado = mismo token de Script Properties
```

9. Activa `Sincronizar automaticamente al guardar`.
10. Pulsa `Sync ahora`.

## Seguridad practica

Este sistema es bueno para uso personal. No es seguridad de producto SaaS.

- El token viaja desde el navegador al Apps Script.
- No metas datos extremadamente sensibles.
- Si la URL/token se filtran, rota el token en Script Properties.
- Para login real por usuario, pasar a Supabase con RLS.

## Datos actuales + datos Dense

Ahora la app registra:

- habitos
- notas diarias
- mesociclo
- ejercicios completados
- nota de sesion
- marcas DenseTraining normalizadas
- PRs y estimaciones aprendidas en el estado

La pestana `DenseTraining` recibe entradas como:

```txt
date
exercise_id
exercise_name
nature
scheme
duration_minutes
total_reps
external_load_kg
weight_per_dumbbell_kg
added_load_kg
bodyweight_kg
total_system_load_kg
visible_added_load_kg
reps_per_min
relative_strength
e1rm_kg
bodyweight_capacity
effective_load_kg
tonnage_kg
effort
bodyweight_contribution_pct
tonnage_factor
notes
```

La pestana `DenseEstimates` recibe equivalencias cruzadas por ejercicio:

```txt
bodyweight_capacity -> 2D, 5D, 10D, 20D
e1rm_kg -> esquemas weighted 2D5, 5D3, 10D5, 20D5...
weighted_calisthenics -> target_added_load_kg = target_load_kg - bodyweight_kg
```

## Formulas base

Con peso:

```txt
e1RM = load_kg / working_pct(scheme)
relative_strength = load_kg / bodyweight_kg
```

Calistenia lastrada:

```txt
total_system_load = bodyweight_kg + added_load_kg
relative_strength = total_system_load / bodyweight_kg
e1RM = total_system_load / working_pct(scheme)
visible_added_load = total_system_load - bodyweight_kg
```

Peso corporal:

```txt
reps_per_min = total_reps / duration_minutes
capacity = reps_per_min / multiplier(source_scheme_base)
target_reps_per_min = floor(capacity * multiplier(target_scheme_base))
target_total_reps = target_reps_per_min * target_duration_minutes
```

Tonnage estimado:

```txt
effective_load = load_kg + bodyweight_kg * bodyweight_contribution_pct / 100
tonnage = effective_load * total_reps * tonnage_factor
```

Aprendizaje por esfuerzo:

```txt
VE: observed * 1.08
E:  observed * 1.04
N:  observed * 1.00
H:  observed * 0.97
VH: observed * 0.94
fallo: observed * 0.90

new_estimate = old_estimate * 0.70 + adjusted_observed * 0.30
```

## Registro en la app

El bloque `Training -> DenseTraining` registra rendimiento:

```txt
Dominada
- modo: bodyweight / weighted
- esquema: 2D, 5D, 10D, 20D, 5D3, 10D5...
- reps totales
- peso corporal
- lastre o carga
- esfuerzo: VE/E/N/H/VH
- nota
```

Con eso, la hoja ya podria calcular e1RM, equivalencias entre esquemas y la propuesta del proximo entrenamiento.
