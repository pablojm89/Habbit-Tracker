# Control de peso corporal

> Sep 2026. Petición del usuario: que la app pida el peso al abrirla por primera
> vez cada día, y un controlador que, según el objetivo (subir / bajar /
> mantener), diga si va bien y qué ajustar.

## Datos
- `state.bodyweightLogs[YYYY-MM-DD] = kg` (ya existía: lo rellenaban las marcas).
- `state.settings.bodyweightGoal = { mode: "gain"|"lose"|"maintain", since }`.
- `state.settings.bodyweightPromptedOn` — día en que ya se preguntó (o se pulsó "Hoy no").

## Aviso diario (`maybePromptBodyweight`)
Tras el primer render, si hoy no hay peso ni se ha preguntado, abre el modal
"¿Cuánto pesas hoy?" con el último peso prellenado y el objetivo. Botón "Hoy no"
silencia hasta mañana. Nunca salta bajo automatización (`navigator.webdriver`,
`?selftest`, `?noprompt`).

## Tendencia (`bodyweightTrend`)
- **Peso actual** = media de los pesos de los últimos 7 días (quita el ruido diario).
- **Ritmo semanal** = pendiente por mínimos cuadrados sobre los últimos 28 días,
  ×7. Requiere ≥3 pesos que abarquen ≥7 días; antes, "acumulando datos".

## Veredicto (`bodyweightVerdict`, reglas en `BODYWEIGHT_GOAL_RULES`)
| Objetivo | Rango "va bien" | Fuera de rango |
|---|---|---|
| Subir | +0,2 … +0,6 kg/sem | < +0,2: **come más** (+200/300 kcal/día) · > +0,6: demasiado rápido, recorta ~200 kcal |
| Bajar | −1,0 … −0,25 kg/sem | ≥ −0,25: **cuida la alimentación** (−300 kcal, proteína/verdura) o añade 8-10k pasos/cardio · < −1,0: demasiado rápido |
| Mantener | ±0,3 kg/sem | deriva arriba/abajo: ajuste de ~150 kcal |

## UI
- Tarjeta **Peso corporal** en la vista de entreno, bajo el resumen del día:
  peso (media 7 d), etiqueta de objetivo, veredicto con consejo, botones
  "Registrar peso de hoy" / "Objetivo".
- Modal `#bodyweightForm`: peso + objetivo (radios) + nota de método + veredicto
  actual. `saveBodyweightForm` guarda ambos y re-renderiza.
- La analítica de recuperación ya dibujaba la serie de peso (`bodyweightTrendRows`).

## Pendiente
- Objetivo con ritmo personalizado (p. ej. +0,3 kg/sem exactos) en vez de rangos.
- Aviso de "hace X días que no te pesas" cuando el registro se abandona.
