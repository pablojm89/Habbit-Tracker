# Propuesta de evolución de BitTracker

Fecha: 10 de septiembre de 2026. Base revisada: `20260906-plan-coherente-45`.
Documento de propuesta; las funciones descritas como futuras no están implementadas.

Estado: aparcada como alternativa futura para clientes. Para el uso personal de
Pablo se ha priorizado el editor libre con historial compartido descrito en
[estudio.md](estudio.md).

## La apuesta

Convertir BitTracker en una app que conecta lo que quieres conseguir con tu siguiente
sesión y con la evidencia de tu progreso. Su ventaja está en entender tus modalidades:
calistenia, lastre, fuerza y densidad. La experiencia debe poner ese conocimiento al
alcance de una mano durante el entrenamiento.

El circuito de producto sería: **elegir objetivo → preparar hoy → entrenar → aprender**.
La planificación sigue siendo opcional y modificable.

## Qué comprobé

- Catálogo de 180 ejercicios al ejecutar esta versión en un navegador aislado.
- Motor existente: progresión por esquema, transferencias, rangos de incertidumbre,
  máximos, fuerza clásica, estancamiento, rutinas y calibración.
- El formulario de dominadas 5D alcanzó unos 1.350 px de contenido a 390 × 844 px.
  Esta medida corresponde a un escenario sintético concreto, no a todos los registros.
- `denseTestSuggestions` ordena las sugerencias por el porcentaje de mejora inferida,
  con filtros por antigüedad, relación y familia. No incluye un objetivo personal.
- `denseCalibrationRows` comprueba anclas de kits prefijados y su antigüedad.
- `render()` vuelve a generar vistas de entrenamiento y vistas heredadas de hábitos.
  No he medido latencia en un iPhone real; esto es una oportunidad técnica, no una
  regresión de rendimiento demostrada.
- Las capturas usaron historial sintético y red externa bloqueada. No se leyó el
  historial personal ni se contactó con Sheets.

El plan maestro de julio ya describía algunas de estas necesidades. Sus apartados de
diagnóstico no son todos vigentes: rutinas, marcas de test, rangos, deload y snapshots
versionados ya existen. Esta propuesta parte de esas implementaciones.

## 1. Hoy: una sesión que encaja en tu día

Elegir tiempo disponible, material y sensación del día. La app propone una sesión
explicable con duración aproximada que incluye preparación, trabajo, descansos y
transiciones. Se pueden fijar ejercicios para que los reajustes los respeten.

Ejemplo de experiencia: «Hoy tengo 20 minutos y solo barra». La propuesta conserva el
trabajo prioritario para el objetivo y señala lo que queda fuera. Con poco historial,
parte de una rutina elegida y pide confirmar objetivos desconocidos.

**Lo nuevo:** organizar la sesión completa según restricciones. Hoy ya existen rutinas,
readiness y objetivos por ejercicio, pero no un compositor con presupuesto de tiempo.

**Implementación:** catálogo de material, intención de sesión, prioridades y candidatos
producidos por el resolutor actual. No inventar conversiones entre esquemas: todo cambio
de formato vuelve a consultar el motor y presenta su fuente y confianza.

**Aceptación:** respeta ejercicios fijados y material disponible; expone qué cambió;
permite deshacer; nunca cambia una entrada ya registrada. La duración se muestra como
estimación y se contrasta con tiempos reales cuando haya sesiones registradas.

## 2. Entrenamiento en curso: menos formulario, más continuidad

Una pantalla dedicada al ejercicio activo, con objetivo, serie o ronda actual,
cronómetro y registro rápido. Tras completar una serie, basta confirmar lo realizado
o modificar la excepción. La configuración completa queda disponible para editar.

Separar «registrar después» de «entrenar ahora»: ambos flujos conservan su utilidad.
Añadir sesión con inicio, pausa, fin y recuperación tras cerrar la PWA. Guardar un
borrador no debe contabilizar una marca ni iniciar una sincronización de datos ficticios.

**Lo nuevo:** el ciclo continuo de ejecución y captura. Ya hay cronómetro y casillas
por serie, pero el registro principal sigue siendo un formulario de configuración.

**Implementación:** sesión y borrador persistentes, marcas enlazadas a sesión, reloj
basado en timestamps y guardado idempotente. La UI puede actualizar el reloj sin
reconstruir todas las vistas. No prometer alarmas con el iPhone bloqueado sin verificar
el comportamiento real de Safari y la PWA.

**Aceptación:** objetivo de diseño de dos toques para confirmar una serie preconfigurada;
recarga sin pérdida de borrador; deshacer la última confirmación; cerrar y reabrir sin
duplicar marcas; distinguir tiempo activo, descanso y pausas.

## 3. Una ruta personal hacia tus habilidades

Elegir uno o dos objetivos: por ejemplo un front lever con duración definida o una
dominada lastrada con carga y repeticiones concretas. Mostrar la marca demostrada,
las variantes que estás trabajando y el siguiente hito verificable.

Una estimación de una variante difícil se representa como hipótesis pendiente de test,
no como habilidad desbloqueada. Las rutas pueden bifurcarse según preferencias y
material; no deben fingir que todos los atletas siguen una escalera idéntica.

**Lo nuevo:** que tus objetivos personales organicen el motor y la interfaz. Ya existen
familias, relaciones y benchmarks en el detalle de cada ejercicio.

**Implementación:** objetos de objetivo con modalidad, métrica, umbral, esquema y
criterio técnico opcional. Reutilizar las relaciones del catálogo. Añadir calidad
técnica declarada y condiciones comparables antes de certificar hitos de skills.

**Aceptación:** ninguna transferencia desbloquea una marca real; no calcular «73 % de
front lever» ni fechas garantizadas. Eliminar un objetivo no modifica el historial.

## 4. Reorganizar sin perder el propósito

«Hoy no puedo», «me quedan 10 minutos» o «este aparato está ocupado» se convierten en
acciones sobre la sesión o la semana. La app presenta una alternativa y el motivo:
qué prioridad conserva, qué trabajo aplaza y qué estímulo cambia.

**Lo nuevo:** adaptación de la planificación ante imprevistos, reutilizando rutinas y
planes existentes. Una sustitución no es necesariamente una equivalencia fisiológica:
el patrón compartido ayuda a encontrar candidatos, pero no demuestra igual dificultad.

**Implementación:** ventanas de entrenamiento, ejercicios fijados y un resumen de
cambios antes de aplicar. Nueva prescripción resuelta para el ejercicio sustituto;
marcar test si no hay evidencia propia suficiente.

**Aceptación:** no acumular automáticamente sesiones perdidas en el siguiente día;
respetar restricciones y decisiones manuales; deshacer una reorganización completa.

## 5. El test que más te ayuda a decidir

Priorizar la calibración por su utilidad para tu objetivo y tus ejercicios habituales:
relevancia, incertidumbre actual, evidencia que falta y coste de introducir el test.
Presentar el motivo: «Falta una marca directa en esta variante para ajustar tu objetivo».

**Lo nuevo:** evolucionar el ranking actual por mejora inferida y los kits de anclas
hacia una selección personal. El mayor incremento estimado no siempre es el test de
mayor utilidad para la sesión que quieres preparar.

**Implementación:** comenzar con una puntuación heurística transparente. Evaluarla
con simulaciones y reejecución cronológica del historial, sin usar datos futuros.
No prometer porcentajes de reducción de incertidumbre antes de validarlos.

**Aceptación:** poder explicar cada sugerencia; limitar frecuencia; permitir posponer;
comparar error posterior y cantidad de tests frente al ranking actual. Un primer test
fija evidencia sobre el objetivo probado, no demuestra por sí solo todas las transferencias.

## 6. Tu historial convertido en decisiones comprobables

Un cierre breve tras entrenar: qué has demostrado, qué estimación se revisó y qué
objetivo se propone para la próxima sesión. Desde cada afirmación se pueden abrir las
marcas que la sustentan.

Ejemplos de contenido, no conclusiones sobre Pablo:

- «Mismo bloque, mismas repeticiones, menor esfuerzo declarado».
- «La última estimación superó tu resultado; el siguiente objetivo se ha ajustado».
- «Falta historial comparable para concluir si esta variante está mejorando».

Más adelante, comparar sesiones equivalentes por modalidad, esquema, carga y técnica,
mostrando tamaño de muestra y diferencias de contexto. Las asociaciones observadas
no justifican afirmar que un ejercicio ha causado otro progreso.

**Lo nuevo:** sintetizar la analítica en decisiones con trazabilidad. Ya existen
tendencias, PRs y sugerencias; falta conectarlos en una lectura breve de cada sesión.

**Implementación:** conservar prescripción original y fuente al empezar; guardar el
resultado aparte. Un evaluador cronológico permite medir si las propuestas mejoran.
El texto inicial puede generarse con reglas locales. Un modelo externo sería opcional
y no debería inventar cargas ni acceder al historial sin una decisión del usuario.

**Aceptación:** cada conclusión apunta a evidencia; mezclar modalidades no fabrica
progresos; sin datos comparables se declara la limitación.

## Orden de construcción

| Entrega | Resultado visible | Dependencias | Complejidad relativa |
| --- | --- | --- | --- |
| 1 | Registro rápido y sesión que se puede retomar | Borrador, identidad de sesión, guardado idempotente | Media-alta |
| 2 | Objetivo personal y propuesta de Hoy | Objetivos, material, duración, resolutor actual | Alta |
| 3 | Reorganización de sesión y semana | Entrega 2, planes y rutinas | Media-alta |
| 4 | Ruta de habilidades y cierre con evidencia | Objetivos, criterios técnicos, sesiones | Media-alta |
| 5 | Calibración personal y evaluación histórica | Trazabilidad de prescripciones, historial suficiente | Alta |

Son tamaños relativos, no plazos comprometidos. Antes de fechar entregas hace falta
medir la adaptación del estado y los flujos reales en iPhone.

En la primera entrega mantendría el estilo oscuro y lima, con jerarquía más clara,
superficies legibles y una única acción principal. «Hoy», «Progreso» y «Biblioteca»
pueden reemplazar las denominaciones actuales sin ampliar la navegación principal.
Durante una sesión, el entrenamiento ocupa el primer plano y la biblioteca sigue
accesible desde el cambio de ejercicio.

## Trabajo técnico que lo hace sostenible

- Extraer gradualmente resolutores puros y persistencia cuando se toquen esos módulos,
  conservando vanilla JS y módulos nativos. No hace falta migrar de framework.
- Renderizar la vista activa y actualizar reloj/serie de forma localizada.
- Versionar las nuevas entidades y probar migración de estados anteriores.
- Conservar los mecanismos de backup existentes y añadir restauración visible solo
  donde una nueva entidad la necesite. Los snapshots versionados ya están hechos.
- Ampliar QA sobre los nuevos contratos: propuesta → sesión → marca, pausa/recarga,
  cambios de modalidad, deshacer y reejecución histórica sin filtración de datos futuros.
- Verificar gestos, teclado, legibilidad y reanudación en Safari/PWA de iPhone real.

## Referencias de producto

[Hevy: registro de entrenamiento](https://www.hevyapp.com/features/track-workouts/)
y [temporizador de descanso](https://www.hevyapp.com/features/workout-rest-timer/)
sirven como referencia del flujo de ejecución y registro.
[Fitbod: personalización de sesiones](https://fitbod.me/blog/fitbod-algorithm/)
sirve como referencia de selección según objetivo, material e historial.

La apuesta propia de BitTracker es conectar esas necesidades con su motor de
calistenia y densidad, sus rangos de incertidumbre y su historial local verificable.

## Alcance de esta entrega

Análisis del código, inspección móvil aislada y propuesta interactiva con datos de
ejemplo. La propuesta visual simula interacciones; no ejecuta el motor de entrenamiento
ni guarda marcas en BitTracker. No se ha cambiado el funcionamiento de la app.
