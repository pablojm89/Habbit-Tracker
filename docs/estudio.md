# Estudio: dos interfaces, un historial

Versión inicial: `20260911-estudio-46`.

El selector **Actual / Estudio** cambia la interfaz dentro del mismo documento y
proceso. `?experience=studio` permite abrir directamente Estudio. Sin ese parámetro
el arranque conserva la interfaz actual. No hay copias independientes del historial.

## Qué está implementado

- Editor por fecha con borradores A y B, objetivos manuales por modalidad, descanso
  personalizado en fuerza, duplicación, orden por arrastre o flechas y deshacer.
- Selección múltiple, grupos con nombre y cambios de esquema compatibles en bloque.
- Copiar el plan compartido al borrador y aplicar el borrador al día. Aplicar sustituye
  el plan de esa fecha, pero nunca modifica las marcas realizadas; se puede deshacer.
- Comparación A/B de bloques, objetivos y tiempo aproximado de trabajo.
- Guardar el borrador completo o una selección como rutina de la biblioteca común.
- Variantes personales del catálogo, condiciones escritas, edición y archivo.
- Referencia de la última marca comparable, la mejor o una sesión elegida.
- Técnica declarada opcional en el registro y consulta junto al resultado real.
- Experimentos personales con pregunta, ejercicio/modalidad/esquema/variante,
  fechas y observaciones. Registros anteriores y durante el periodo por separado.
- Registro, edición y cronómetro mediante los flujos y cálculos existentes.

## Datos compartidos

`state.denseTrainingEntries`, `denseDayPlans`, `denseRoutines`, `bodyweightLogs`,
favoritos y estimaciones son los mismos en ambas interfaces. Se guardan en la clave
existente `habbit-tracker-v2`, se exportan en el backup JSON y viajan en el mismo
snapshot completo de Google Sheets. No se requiere modificar Apps Script.

Campos nuevos compatibles:

- `state.denseStudio`: `version`, `drafts[fecha].A/B`, `variants`, `experiments`.
- Items de plan/rutina: `id`, `prescription`, `group`, `studio_variant_id`,
  `reference_mode`, `reference_id`. El normalizador de rutinas los conserva.
- Marcas: `plan_ref`, `studio_variant_id`, `studio_variant_name`,
  `studio_conditions`, `technique_quality`, `prescription_snapshot`.

Diseñar, copiar, comparar o guardar una rutina no crea marcas. Registrar desde un
borrador crea una marca normal. Registrar otra vez ese mismo bloque abre su edición.
La identidad `plan_ref` evita completar por error otro bloque del mismo ejercicio.

Los detalles de variantes y experimentos se gestionan en Estudio. Actual conserva
esos campos al editar y muestra las marcas bajo el ejercicio base. Las estimaciones
generales y PRs existentes continúan agrupándose por ejercicio base; no se ha creado
un motor independiente para cada variante. El historial comparable de Estudio sí
filtra por ejercicio, modalidad, esquema exacto y variante.
Renombrar una variante o editar sus condiciones no reescribe los detalles guardados
en marcas anteriores, tampoco al volver a editar esas marcas.

Los borradores son deliberadamente independientes del plan aplicado. Tras editar
el plan en Actual, el botón «Copiar plan del día al borrador» lo incorpora a Estudio.

Los eventos `storage` actualizan la memoria cuando otra pestaña del mismo origen
guarda cambios. No se implementa mezcla de ediciones simultáneas del mismo registro:
como en la app anterior, prevalece la última escritura. Entre dispositivos se mantiene
el mecanismo existente de sincronización/restauración por snapshots.

## Cálculos y límites

- Objetivos manuales llegan a tarjeta y formulario a través de
  `denseStudioApplyPrescription`; solo se aplican al mismo ejercicio/modalidad/esquema.
- Los cambios de modalidad o esquema descartan la prescripción anterior.
- En fuerza, el tiempo usa 3 segundos por repetición y el descanso entre series.
  Densidad conserva los minutos del esquema. MAX se indica sin duración estimada.
- La comparación excluye calentamiento y transiciones; agrupar bloques no supone
  ejecución simultánea ni descuenta descansos automáticamente.
- Los experimentos muestran evidencia comparable, no una conclusión causal.
- No se ha añadido un entrenador automático ni planes generados para clientes.

## Archivos y verificación

`studio-core.js`: normalización, contratos, objetivos y filtros de historial; se
carga antes de `app.js`. `studio.js`: interfaz y eventos; se carga después del motor.
`studio.css`: estilos acotados. El hook `window.bitTrackerStudio.render` actualiza la
vista al guardar o restaurar el estado común. Los tres assets están en el precache.

Cinco nuevos asserts del motor cubren borradores, objetivos, bloques repetidos,
rutinas y saneamiento. `tools/qa/run.sh studio` verifica el recorrido entre versiones,
edición sin duplicados, backup, variantes, experimentos, otra pestaña, objetivos por
modalidad, vistas a 320/390/1280 px y carga sin conexión con service worker.
Las pruebas usan contextos de navegador nuevos, datos sintéticos y bloquean Sheets.
La sincronización con la cuenta real no se ejecuta durante QA.
Resultado inicial: 103/103 self-tests, crawl y auditoría sin incidencias, 3.224
comprobaciones de plan/tarjeta/formulario y 63 comprobaciones de Estudio correctas.

La comprobación visual se hace en Chromium. Los gestos y comportamiento de Safari
en un iPhone físico quedan pendientes de uso real.

## Alternativa futura

La propuesta guiada para clientes está aparcada y documentada en
`PROPUESTA-EVOLUCION-2026-09.md`; no se mezcla con esta interfaz personal.
