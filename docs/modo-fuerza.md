# Modo Fuerza clásica (esquemas "S")

> Sesión gym — sep 2026. Un segundo formato de entreno junto a la densidad:
> **series × reps con descanso completo** (2-5 min en básicos, 45-60 s en
> accesorios), sin reloj EMOM. Decidido con el usuario: formatos fijos Y rangos,
> RIR deducido del esfuerzo, accesorios en el mismo modo con descanso corto, y
> el 5x5 como esquema por defecto de los básicos.

## Modelo

- **Esquema `S{series}x{reps}`** o `S{series}x{min}-{max}`: `S5x5`, `S5x3`,
  `S3x5`, `S4x6`, `S3x8`, `S3x10`, `S3x12`, `S3x8-12`, `S3x10-15`, `S4x6-10`
  (`strengthSchemes`). `denseSchemeBase("S5x5") === "S"`, minutos = 0.
- **Descanso explícito** (`rest_seconds`): chips 45 s · 1:00 · 1:30 · 2:00 ·
  3:00 · 5:00. Por defecto `exercise.defaultRestSeconds` o 3:00.
- **Reps reales por serie** opcionales (`reps_done`, "5,5,4"); vacío = todas las
  series al objetivo. `total_reps` = suma o series × reps.
- **e1RM = Epley sobre reps medias + RIR** (`denseStrengthE1rm`), RIR implícito
  en el chip de esfuerzo: VE 5 · E 4 · **N 2** · H 1 · VH/fallo 0. Cae en el mismo
  `e1rm_kg` que la densidad → transferencias, hitos, analytics y unificación
  bodyweight↔lastre funcionan sin cambios. `bodyweight_capacity` = 0 (no hay
  reps/min comparables).
- `duration_minutes` aproximado (series × (descanso + 30 s)) solo para tiempo;
  `denseEquivalentSets` devuelve las series.

## Formulario

- Selector **Formato**: Densidad (EMOM) | Fuerza (series × descanso). Aparece en
  ejercicios dinámicos con carga o peso corporal (nunca en isométricos).
- Resolución del formato al abrir: switch manual > plan del día > **última marca
  del ejercicio** > `defaultScheme` del catálogo (los básicos de gym abren en S)
  > densidad. Un usuario con historial dense en banca sigue abriendo en dense
  hasta que cambie el switch; al cambiar a Fuerza se reutiliza su última marca S.
- En Fuerza: chips de series×reps, chips de descanso, campo "Reps por serie
  (real, opcional)", "Reps totales" autocalculado. Sin "Reps fijas esquema".
- El cronómetro del ejercicio pasa a **modo descanso**: una ronda = un descanso
  (`quickTimerState.roundSeconds`), tantas rondas como series; chips de descanso
  también en el propio timer.

## Sugerencias

- **Sin marca en ese esquema S** (`denseEstimatedStrengthSuggestion`): carga =
  e1RM × %Epley(reps + 2) — primera exposición con 2 en recámara.
- **Con marca** (`denseStrengthProgressionSuggestion`): progresión lineal
  clásica — fácil/normal +2,5 % (≈ +2,5 kg en barra), duro mantener, fallo −5 %
  con techo en la carga que sostiene el e1RM honesto. **Rangos**: doble
  progresión — si la media de reps no llegó al máximo del rango, sube 1 rep con
  la misma carga; solo al llenar el rango añade peso.
- Nunca se responde a un formulario dense con una marca S ni al revés.

## Catálogo de gimnasio (20 altas, todas `nature: weighted`, id-metas propios)

| Grupo | Ejercicios | Apertura |
|---|---|---|
| Brazos | curl mancuernas · curl barra · curl martillo · tríceps polea V · tríceps cuerda · extensión sobre la cabeza | S3x10-12 · 1:00 |
| Empuje | banca mancuernas · inclinado mancuernas · inclinado barra · press hombro mancuernas de pie · laterales | S3x8 · 2:00 (inclinado barra S5x5 · 3:00) |
| Espalda | remo barra · remo mancuerna 1 mano · remo polea baja · face pull | remo barra S5x5 · 3:00; resto S3x8-12 · 1:00-1:30 |
| Pierna | prensa · peso muerto rumano · hip thrust · zancadas mancuernas · gemelos | S3x8-10 · 1:30-2:00 |

Básicos existentes con apertura en Fuerza para usuarios sin historial: banca,
militar, peso muerto (S5x3), back/front squat (S5x5 · 3:00); máquinas S3x12 ·
1:00; jalón S3x10 · 1:30; press mancuernas sentado S3x8 · 2:00.

Nuevos músculos en el vocabulario de vectores: `side_delt`, `rear_delt`,
`calves`. Nuevas familias: `elbow_flexion`, `elbow_extension`, `incline_press`,
`shoulder_isolation`, `barbell_row`, `db_row`, `cable_row`, `shoulder_health`,
`leg_press`, `hip_thrust`, `lunge`, `calves` (todas con id-meta; la familia solo
agrupa).

## Sync a Sheets

La hoja de marcas exporta `scheme`, `total_reps`, `e1rm_kg`, carga, esfuerzo…
de una marca S sin cambios; `sets`/`rest_seconds`/`reps_done` viajan en el blob
de estado completo (backup íntegro), no en columnas propias.

## Pendiente

- ~~Esquema **MAX**~~ hecho (ver abajo). Rutinas reutilizables: ver `rutinas.md`. Antes:
  `plan-tests-calibracion.md`; con el modo S ya existe el sitio natural (S1xMAX).
- Analytics: gráfica de e1RM por ejercicio ya mezcla dense y S (misma unidad);
  falta etiquetar el formato en el historial largo.

## Esquema MAX — serie única al fallo (sep 2026)

- Formato **Máx (serie única)** en el selector de Formato de cualquier ejercicio dinámico
  (peso corporal / carga) o isométrico. Esquema `MAX`, `scheme_base: "MAX"`,
  `scheme_type: "max"`, campos `max_reps` / `max_hold_seconds`. Esfuerzo por defecto VH
  (RIR 0); nunca cuenta como marca fallida. Con carga → e1RM por Epley (mismo `e1rm_kg`).
- **Multiplicador personal por bloque** (`denseMaxMultiplier`): prior `DENSE_MAX_PRIOR`
  (2D 0,55 · 5D 0,37 · 10D 0,20 · 20D 0,17 — dato real del usuario) mezclado con cada
  par {MAX ↔ bloque cerca del fallo (H/VH/fallo) a ≤ 21 días}: `(prior + Σobs)/(1+n)`.
- **Máx deducible** (`denseEstimatedMax`): sin test dedicado, el último bloque casi al
  fallo dividido por el multiplicador da un "máx estimado". Un máx real siembra los
  bloques (`denseMaxSeedRpm/Hold`) cuando no hay historial de densidad; fuente "Desde
  tu máx" en la tarjeta (`denseTargetSource` kind `max`, se trata como test).
- Sugerencia en formato MAX (`denseMaxSuggestion`): superar el mejor (+4 %) o confirmar
  el estimado. El siguiente registro del ejercicio NO abre en MAX (`denseDefaultScheme`
  ignora las marcas MAX); la racha de estancamiento tampoco las cuenta.
- Detalle del ejercicio: sección **Máximos** (máx real · máx estimado · ritmo aprendido
  por bloque) y **Niveles de fuerza** por benchmarks (`DENSE_STRENGTH_BENCHMARKS`):
  e1RM/peso corporal en barra, e1RM del sistema o reps máximas en dominadas/fondos,
  reps/hold máximos en flexiones, pistol, OAC, handstand, L-sit, palancas. Escalera
  Base · Sólido · Fuerte · Élite con "tu nivel" y "siguiente".
