# Batería de tests de calibración — caso real n=1

> Propuesta del 13 jul 2026, previa a la S2 de catálogo. Objetivo: que el motor
> aprenda de TU caso real — exponentes de dificultad por familia
> (`denseFamilyEnduranceExp` necesita PARES de hermanas testeadas), multiplicadores
> de transferencia (`pairK`), sigma empírica y corrección de niveles curados.
> n=1 no es extrapolable al 100%, pero es exactamente lo que la app debe modelar: a ti.

## Cómo funciona (13 jul 2026 — ritmo pausado a petición del usuario)

**Solo está activa la T1 (tirón).** T2–T5 quedan en espera hasta hacer y revisar la
T1 juntos — sin agobios. La batería vive en este MD; los resultados se registran en
la app como marcas normales.

## Reglas de ejecución

1. Si al abrir el formulario aparece el toggle ámbar **"Sesión test"** (sale solo
   cuando el objetivo es estimado), déjalo activado. En ejercicios con historial
   directo no aparece: registra normal, el motor aprende igual.
2. **Empieza por el extremo bajo del rango** que proponga la tarjeta; si te quedas
   corto, mejor repetir otro día que ir al fallo.
3. Los **pares de la misma familia** (mismo día, frescura comparable) son lo valioso:
   dan tu curva real de dificultad. Anclas sueltas calibran e1RM y curva personal.

## T1 — Tirón (nivel avanzado: lastre + camino OAC) ← ÚNICA ACTIVA

> Rediseñada el 13 jul: las negativas fuera (a este nivel no discriminan nada).
> Notación: `5D` (bodyweight) = EMOM 5', eliges reps/min y las mantienes.
> `5D3` (lastre) = EMOM 5' con 3 reps fijas al minuto, mismo lastre todo el rato.

### Regla de dedo — de reps máximas a ritmo de densidad (corregida por el usuario)

En densidad solo descansas lo que sobra del minuto: el ritmo sostenible es MUCHO
más bajo de lo que parece. Dato real del usuario: **20 chins máximas → 5D7-8**
(~0.35-0.4×). Escalando con los ratios internos del motor:

| Bloque | rpm ≈ × reps máximas |
|---|---|
| 2D | ~0.55× |
| 5D | ~0.35-0.4× |
| 10D | ~0.2× |
| 20D | ~0.17× |

### Día A — eje sin lastre + camino OAC
| Test | Esquema exacto | Cómo |
|---|---|---|
| **Max reps chin-up** | **serie única al fallo técnico** | FRESCO, lo primero del día. Es EL ancla: fija tu ratio real máximas↔densidad. ⚠️ La app aún no tiene esquema de serie única — apúntalo en las notas de la sesión y en el registro de abajo (feature "MAX" pendiente) |
| — descanso 8-10 min — | | |
| Chin-up sin lastre | **5D** | en tu caso: **5D7 u 5D8** (tus 20 máximas × ~0.37). Clavar los 5 minutos, última ronda RPE 8-9. Puede salir un pelín corto tras el máx: anótalo |
| Archer chin-up | **5D por lado** | mismas cuentas con tus archers máximas por lado (p. ej. 5-6 máx → 5D2/lado) |
| OAC | **2D** | 1 rep/min por lado (2/lado en total); si va sobrado, 2/min. **Par archer↔OAC** → exponente real de la familia |

### Día B (48h después) — lastre (dibuja tu curva personal reps↔%1RM)
| Test | Esquema exacto | Cómo |
|---|---|---|
| Chin-up lastrada media | **5D3** | el lastre de tus series de 4-6 reps · 3/min × 5' = 15 reps con margen justo |
| Chin-up lastrada pesada | **5D1** | lastre cercano a tu 2-3RM · 5 singles EMOM. Junto al 5D3, estos dos puntos con rangos distintos calibran TU curva de fuerza |
| (opcional) Cuelgue activo | 10D hold | ancla cuelgue |
| (opcional) Cuelgue pasivo 1 mano | 10D hold | **par** con activo → exponente cuelgue |

Con esto la app aprende: exponente one_arm_chin (archer↔OAC), e1RM real de chin
lastrada + pendiente de tu curva (5D1 vs 5D3), unificación bodyweight↔lastre del
mismo ejercicio, y tu posición respecto a los hitos (+BW/6, +BW/3).

## T2 — Empuje (pares: pushup · hspu) — EN ESPERA hasta revisar T1
| Test | Esquema | Para qué |
|---|---|---|
| Flexiones en suelo | 5D | ancla pushup |
| Flexiones con palmada | 5D | **par** con suelo (0.75→0.9) |
| Pike push-up | 5D | ancla hspu |
| HeSPU nariz al suelo | 5D | **par** con pike (0.55→0.85) |
| Press banca | 5D5 | ancla e1RM + curva personal |

## T3 — Pierna (pares: knee_dominant · single_leg_squat · hinge_bodyweight)
| Test | Esquema | Para qué |
|---|---|---|
| Natural Leg Extension | 5D | ancla knee_dominant |
| Sissy squat | 5D | **par** con NLE — el caso que originó todo |
| Bulgarian split squat | 5D (por lado) | ancla single_leg |
| Pistol squat | 5D (por lado) | **par** con bulgarian |
| Nordic curl | 5D | **par** con single leg GM si te da la sesión |
| Back squat | 5D5 | ancla e1RM |

## T4 — Core y skills (pares: l_sit · front_lever · toes_to_bar)
| Test | Esquema | Para qué |
|---|---|---|
| Tuck L-sit | 10D hold | ancla l_sit |
| L-sit | 10D hold | **par** con tuck (0.5→0.72) |
| FL Tuck | 10D hold | ancla lever |
| FL Adv Tuck | 10D hold | **par** de palanca real |
| Toes to bar kip + estricto | 5D | **par** toes_to_bar |

## T5 — Barra y columna (anclas sueltas)
| Test | Esquema | Para qué |
|---|---|---|
| Peso muerto | 5D3 | ancla e1RM cadena posterior |
| Press militar | 5D5 | ancla empuje vertical con carga |
| Jefferson curl | 5D10 **suave** | baseline de escalada propia (sin transferencias; hito ⅓×BW) |
| Good morning sentado | 5D10 suave | ídem |

## Qué aprenderá la app con esto

- **Exponente real por familia** (strict_pull, cuelgue, pushup, hspu, knee_dominant,
  single_leg, l_sit, front_lever, toes_to_bar): sustituye al 2.2 genérico.
- **e1RM y curva personal** en los 4 básicos de barra.
- **Reconciliación pairK**: los boosts pendientes se contrastan con realidad.
- **Sigma empírica**: la confianza de las tarjetas pasa de fórmula a TU error real.
- Corrección de niveles curados donde tu ratio real discrepe (sissy/NLE, etc.).

## Feature pendiente (alta prioridad): esquema "MAX"

La app solo modela bloques de densidad; falta un formato de **serie única al fallo**
(reps máximas o hold máximo). Con él, el motor podría anclar la curva
máximas↔densidad POR EJERCICIO y aprender los multiplicadores personales
(hoy genéricos: 2D 0.9 · 5D 0.6 · 10D 0.33 · 20D 0.27 — el dato real del usuario
en chins es 5D ≈ 0.37× máx, casi la mitad del 0.6 genérico sobre máximas).
Diseñar en próxima sesión de motor: nuevo scheme "MAX", eje propio, sin tonnage
de densidad, alimentando bodyweight/isometric_capacity y la curva personal.

## Registro

Al completar cada batería, anotar aquí fecha y sorpresas (niveles que salieron muy
distintos del prior) para revisarlos juntos.

| Batería | Fecha | Notas |
|---|---|---|
| T1 | — | |
| T2 | — | |
| T3 | — | |
| T4 | — | |
| T5 | — | |
