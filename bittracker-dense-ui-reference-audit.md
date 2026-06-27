# Dense UI Reference Audit

## Revisado

- Capturas de Workout: semana compacta, selector de dia, resumen diario, tarjeta de ejercicio, estados complete/PR, herramientas.
- Capturas de Analytics: Progress, Volume, Strength, Conditioning, Recovery, Balance y Consistency.
- Captura de Tools: Quick Timer, esquemas 2D/5D/10D/20D, rondas custom, hold por ronda y metronomo.
- PDF `Nueva nota.pdf`: 78 paginas revisadas como hojas de contacto.

## Implementado En BitTracker

- Navegacion Training con `Workout`, `Analytics` y `Dashboard`.
- Vista Workout con semana compacta, dias clicables, resumen diario, EXR, Tools y registro Dense.
- Registro Dense con esquema intentado separado de resultado real.
- Log de los ultimos 5 entrenos por ejercicio seleccionado.
- Quick Timer con esquemas Dense, rondas, hold por ronda, reset, pausa y metronomo.
- Analytics con tabs reales:
  - Progress: senales recientes, PRs, effort easier than before, level-ups.
  - Volume: sets equivalentes, reps, tonnage y volumen por patron.
  - Strength: e1RM, fuerza relativa, capacidad bodyweight y PRs.
  - Conditioning: minutos Dense, CNS load, TUT y ultimas senales.
  - Recovery: score, fallos, sets duros/faciles, thresholds y bodyweight trend.
  - Balance: set balance, ratios y filas de balance tipo Dense.
  - Consistency: heatmap de 28 dias, streak, most logged, skipped y completion by day.
- Modo compacto/normal para entrenar en movil.
- Versionado de cache PWA para que el movil reciba cambios de JS/CSS.

## Decisiones

- No se copian vistas comerciales de DenseClub como `Book a call`, `Browse Products`, `Shop` o `Education`.
- No se implementa todavia almacenamiento de fotos de transformacion. Meter fotos en `localStorage` puede romper la PWA por peso; conviene hacerlo despues con backend/cloud claro.
- Dashboard queda orientado a PRs, estimaciones y logbook; la capa de fotos/progreso visual se deja para una fase propia.

## Siguiente Capa Recomendada

- Crear `Training Dashboard > Transformation` con fotos usando almacenamiento cloud, no localStorage.
- Crear modal post-entreno tipo `How did that session go?` para fatiga, comparacion contra esperado y nota final.
- Convertir filas `tap to view` de Analytics en detalles desplegables reales.
- Separar `app.js` en modulos cuando el flujo movil quede estable.
