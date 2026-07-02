# Documentación del motor de cargas y transferencias — BitTracker

Guía para que cualquier persona (o IA) pueda seguir trabajando sobre el motor sin
romperlo. Todo el motor vive en **`app.js`** (vanilla JS, sin build, un solo fichero
~8000 líneas). No hay dependencias ni tests externos: la suite de auto-tests está
dentro de la propia app (ver abajo).

## Mapa de documentos

| Documento | Contenido |
|---|---|
| [gestion-cargas.md](gestion-cargas.md) | Esquemas dense (2D/5D/10D/20D), curva %1RM↔reps, e1RM, capacidades, sugerencia de progresión, readiness, autorregulación por fatiga |
| [motor-transferencias.md](motor-transferencias.md) | Relaciones entre ejercicios: vectores de patrones/músculos, coeficientes, propagación de boosts, maestría técnica, reconciliación personal, incertidumbre |
| [anadir-ejercicios.md](anadir-ejercicios.md) | **Checklist para añadir ejercicios nuevos sin colapsar nada** |

## Conceptos en 60 segundos

- **Esquema dense**: `<minutos>D<reps por minuto>`. Ej.: `5D10` = 5 minutos, 10 reps/min
  EMOM. Los esquemas sin número de reps (`2D`, `5D`, `10D`, `20D`) son de peso corporal
  (máximas reps por minuto). La "base" de un esquema es su prefijo: `denseSchemeBase("5D10") === "5D"`.
- **e1RM de sistema**: 1RM estimado del sistema completo (peso corporal + lastre, o carga
  externa). Es la moneda común: cualquier marca dinámica se convierte a e1RM y desde ahí
  se estima cualquier otro esquema.
- **Capacidad**: para peso corporal, `reps_por_minuto / bodyweightMultipliers[base]`
  (normaliza las bases entre sí). Para isométricos igual pero con segundos de hold/min.
- **Boost de transferencia**: mejora indirecta (%) que una marca en un ejercicio aplica a
  ejercicios relacionados. Se guarda en `state.transfer.boosts` pero **es estado derivado**:
  se recalcula entero desde el historial con `rebuildTransferState()` (fold determinista).

## Invariantes que NUNCA se pueden romper

1. **`state.transfer` es derivable, no fuente de verdad.** Cualquier edición/borrado de
   marcas debe pasar por `rebuildTransferState()`. Nunca mutar `state.transfer` a mano
   fuera de `denseTransferStep`/`denseReconcileTransfers`.
2. **Los deltas solo se comparan dentro del mismo eje** (`denseScoreType`: `e1rm` / `iso` /
   `cap` / `other`). Comparar un e1RM (~198) con una capacidad (~13) fabrica mejoras del
   +1000%. La primera marca en un eje nuevo es calibración: no propaga.
3. **Topes duros de propagación**: +3% por evento (`0.03` en `denseTransferStep`), +12%
   acumulado por ejercicio (`0.12` en `denseTransferBoost`), delta origen cap al 25%.
   Coeficiente de transferencia clamp `[0, 0.9]`. `pairK` clamp `[0.3, 2]`.
4. **TDZ (error clásico ya sufrido 2 veces)**: cualquier `const` de nivel superior que use
   el render inicial debe declararse en el **bloque de constantes de arriba** (cerca de
   `const bodyweightSchemes`, ~línea 100–220). Si lo declaras después de las funciones que
   lo usan y el render corre antes, revienta con "Cannot access X before initialization".
5. **Cache busting**: al tocar `app.js` o `styles.css` hay que subir la versión
   `?v=20260701-cloud-pull-NN` en **`index.html` y `sw.js` a la vez** (mismo string), o el
   service worker sirve el código viejo.
6. **iOS/WebKit**: nunca combinar `mask-image` en un contenedor scrolleable dentro de un
   ancestro con `backdrop-filter` — renderiza negro (bug real sufrido en el picker).

## Auto-tests

`runDenseSelfTests()` (~línea 1965) — 17 asserts sobre curva, coeficientes, técnica,
propagación, cross-modalidad, fold y reconciliación. Se ejecutan abriendo la app con
**`?selftest=1`** (resultado en consola y toast). **Correr siempre tras tocar el motor.**
Usa un estado sintético y restaura el real al terminar.

## Persistencia

- `localStorage` (clave del estado principal) + sync a Google Sheets vía Apps Script
  (`google-sheets-apps-script.gs`, desplegado como web app). El snapshot va comprimido
  (`gz1:` gzip+base64) y troceado en 4 columnas; auth fail-closed con Script Property
  `BITTRACKER_SYNC_TOKEN`.
- `state.transfer.events` (máx. 150) y `pairK` se exportan a las hojas `TransferEvents` y
  `TransferPairK`, solo para visibilidad — la app siempre reconstruye desde las marcas.
