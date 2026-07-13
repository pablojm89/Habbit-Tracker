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

## T1 — Tirón (pares: strict_pull · cuelgue) ← ÚNICA ACTIVA
| Test | Esquema sugerido | Para qué |
|---|---|---|
| Chin-up | 5D | ancla del eje (tu progresión principal) |
| Dominada negativa | 5D | **par** con chin (gap 0.35 de nivel → exponente strict_pull) |
| Archer chin-up | 5D (por lado) | ancla one_arm_chin |
| Cuelgue activo | 10D hold | ancla cuelgue |
| Cuelgue pasivo 1 mano | 10D hold | **par** con activo → exponente cuelgue |

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
