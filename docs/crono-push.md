# Cronometro y pausas push

Version local: `20260913-pausas-equilibradas-50`. No cambia la interfaz habitual ni crea otra
version de la app. No se ha desplegado el emisor ni activado una suscripcion real.

## Cronometro

- `timer-core.js` calcula fases y rondas por tiempo transcurrido; `app.js` conecta
  el modal y el formulario. Isometricos: 5 s de preparacion, objetivo por minuto,
  descanso hasta el siguiente minuto. El limite del motor sigue siendo 55 s/ronda.
- Inicio, fin del aguante y fin del bloque tienen patrones distintos. El fin del
  aguante tiene tres pulsos; el metronomo no lo tapa. Volumen inicial 85%, prueba
  de sonido y ajuste en `state.settings.timerVolume`.
- **He caido** registra los segundos transcurridos de esa ronda (incluido cero).
  Sin pulsar, solo una ronda que alcanza su objetivo se considera completa.
- Los resultados se conservan como borrador local en `bittracker-quick-timer-v1`.
  Recargar recupera el reloj pausado; cerrar o salir de la app lo pausa. Se solicita
  mantener la pantalla encendida mientras corre, cuando el navegador lo permite.
- **Revisar y guardar** abre el formulario habitual con segundos por ronda.
  Las rondas no realizadas van a cero. Confirmar guarda una marca normal; repetir
  la operacion edita la misma gracias a `timer_session_id`.
- Campos nuevos de la marca: `hold_rounds` y `timer_session_id`; siguen el backup
  y Sheets existentes. `total_hold_seconds` es real; `hold_seconds_per_round` y
  `target_total_hold_seconds` son el objetivo. Una caida marca `failed`.
  `denseRecordedHoldPace` usa el desglose real al inferir maximos, incluso cero.
- Los segundos se pueden corregir en el formulario. Aumentar rondas con datos
  reales anade ceros; reducirlas solicita confirmacion si se descartan datos.

Limitaciones: el volumen fisico y la ruta de audio dependen del iPhone y sus
altavoces/auriculares. Falta la prueba acustica en ese dispositivo. El reloj no
promete sonar con la pantalla bloqueada; no es una app nativa de Apple Watch.
[Web Audio](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
y [Screen Wake Lock](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API).

## Pausas de dos y cinco minutos

- Campana junto al cronometro, en Workout. `notifications.js` gestiona el permiso,
  suscripcion, horarios, prueba y baja. No pide permiso al abrir el panel.
- Duraciones: casillas **2 minutos** y **5 minutos**; se puede elegir una o ambas.
  `state.settings.microBreaks.durations` guarda `[2]`, `[5]` o `[2, 5]` al guardar
  preferencias con el emisor. Sin emisor, **Guardar preferencias** y **Una pausa
  ahora** tambien conservan la seleccion local, sin activar notificaciones.
  Instalaciones nuevas proponen ambas; preferencias antiguas sin este campo
  conservan 5 minutos hasta que se cambien, tambien en el servidor.
- Entre 1 y 4 avisos diarios, de 08:00 a 21:59, separados al menos una hora. El
  formulario propone 11:00 y 17:00 (Europe/Madrid), pero no activa nada por defecto.
  Son horarios elegidos, no horas aleatorias; todos los dias, sin selector de
  dias de la semana. La seleccion de ejercicio y duracion permitida si varia.
- Material inicial: suelo y anillas; barra seleccionable. Ocho ejercicios con dos
  duraciones cada uno en `micro-sessions.json`: dieciseis protocolos. Dominadas
  admiten barra o anillas altas; toes to bar requiere barra. Se filtran por material,
  tipo, duracion y carga reciente, igual en la app sin conexion y en el emisor.
- Cada pausa es un solo ejercicio repetido durante 2 o 5 rondas de un minuto.
  El reloj arranca en 2:00 o 5:00; no mezcla ejercicios ni adapta la dosis al usuario.
  Estas pausas usan el crono por minutos: los 20 s/40 s de movilidad estan escritos
  en el protocolo, pero todavia no tienen avisos de fase propios.
- **Una pausa ahora** y su reloj funcionan sin emisor. Abrir el push lleva al
  protocolo mediante `?micro=<id>`. Si ya hay un formulario/reloj abierto, no lo
  sustituye: avisa de que hay una pausa disponible en la campana.
  Los enlaces anteriores conservan cinco minutos; las variantes cortas usan ids
  con sufijo `-2min`. La notificacion indica la duracion de su protocolo.
- Preferencias compartidas: `state.settings.microBreaks`. Credencial y dispositivo:
  `bittracker-push-device-v1`, solo local, fuera de snapshots y Sheets. Cada movil
  debe activar sus push; cambiar horarios afecta solo a ese dispositivo.
- En iPhone hace falta abrir la PWA instalada en pantalla de inicio y conceder el
  permiso desde el boton de activacion, con iOS/iPadOS 16.4 o posterior.
  [Documentacion de WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

### Catalogo actual

| Protocolo | Trabajo al inicio de cada minuto | Total en 2 min | Total en 5 min |
| --- | --- | --- | --- |
| Remo suave en anillas | 5 repeticiones faciles, cuerpo bastante vertical | 10 reps | 25 reps |
| Tiron en anillas con pies apoyados | 4 repeticiones asistidas con los pies | 8 reps | 20 reps |
| Dominadas | Hasta 2 comodas en barra o anillas altas | Hasta 4 reps | Hasta 10 reps |
| Flexiones en suelo | Hasta 5 faciles | Hasta 10 reps | Hasta 25 reps |
| Toes to bar estrictos | Hasta 2 controlados en barra | Hasta 4 reps | Hasta 10 reps |
| Sentadillas sin peso | Hasta 8 controladas | Hasta 16 reps | Hasta 40 reps |
| Apertura suave de cadera en cuadrupedia | 20 s suaves y 40 s fuera de la postura | 40 s de aguante | 100 s de aguante |
| Pancake suave | 20 s suaves y 40 s de descanso | 40 s de aguante | 100 s de aguante |

Tras las repeticiones se descansa el resto del minuto; en movilidad se evita forzar
el rango. Todas las dosis de reps son limites orientativos: reducirlas o cambiar
de pausa si no salen faciles. La seleccion se adapta; el numero de reps aun no.

### Como se elige la pausa

- `denseMicroBalanceSnapshot()` lee solo marcas realizadas de los ultimos **7 dias
  de calendario**, incluido hoy en la zona elegida. Ignora borrados, fechas futuras,
  marcas vacias y ceros. Usa reps o segundos reales (`hold_rounds` prevalece sobre
  el total antiguo), no planes ni notificaciones recibidas.
- Unidades = `denseEquivalentSets(entry) * min(1, real / objetivo) * esfuerzo / 5`.
  En densidad, cada minuto cuenta como ronda; en fuerza, cada serie. Sin objetivo
  registrado se usa la dosis real. Escala existente: VE=2, E=3, N=5, H=7, VH=9,
  fallo=10; esfuerzo ausente equivale a N. Ejemplo: 5 rondas completas faciles son
  3 unidades, las mismas rondas duras son 7. Es una **heuristica de reparto**, no
  una equivalencia fisiologica entre series, calorias ni un objetivo semanal.
- Empuje, tiron, piernas y core usan patrones y metadatos del catalogo. Las variantes
  con/sin lastre comparten patron; handstand aporta a empuje. Si un ejercicio tiene
  varios patrones principales, reparte sus unidades entre ellos. El tonelaje sigue
  disponible en el historial, pero no se comparan kg de dominadas con kg de flexiones.
- Primero se excluye activacion de patrones con H/VH/fallo hoy o ayer. Toes to bar
  comparte esta restriccion con tiron. Trabajo duro de anteayer anade 2 unidades al
  patron para reducir su prioridad. No es una medicion de recuperacion real.
- Se sortea entre patrones compatibles a no mas de 1 unidad del menos trabajado;
  dentro del tiron se favorece vertical/horizontal a no mas de 0,5 unidades del menor.
  Sin historial hay rotacion por patrones, sin favorecer tiron por tener mas variantes.
  Despues se sortea ejercicio y duracion; evita repetir el ejercicio anterior si hay
  otra opcion dentro de esa prioridad. La memoria manual dura hasta recargar la app.
- Si se eligen activacion y movilidad, hay 75% de activacion y 25% de movilidad
  cuando ambas son posibles; si toda la activacion esta bloqueada, sale movilidad.
  Solo activacion sin alternativa: no propone trabajo y el emisor omite ese aviso.
- Al abrir un enlace antiguo se revisan de nuevo carga y material antes de iniciar.
  **Otra pausa** solicita una alternativa. El panel muestra el reparto registrado,
  no afirma conocer ejercicio que hiciste sin registrarlo.

### Registro y sincronizacion

- Tras terminar una pausa de reps, **Registrar reps realizadas** abre el formulario
  Dense habitual, con las reps reales en blanco, esfuerzo E editable y sin marcar
  test. Guardar exige introducirlas. Menos reps en esta pausa flexible no implica
  fallo automatico; el usuario puede indicarlo con el esfuerzo.
- Se guarda en `state.denseTrainingEntries`, `source: micro_break`, con
  `timer_session_id` para reabrir/editar sin duplicar. Usa el backup/Sheets y motor
  normales. Ediciones o borrados cambian la siguiente prioridad. El borrador local
  del reloj conserva el protocolo y fecha al recargar, siempre pausado.
- Recibir un aviso o agotar el reloj **no guarda ninguna marca**. Las pausas de
  movilidad no tienen este registro rapido; el ejercicio se puede registrar desde
  el formulario habitual. No hay un segundo historial independiente de pausas.
- Al activar push se envia un resumen `{generatedAt, days:[{date, load, hard}]}`:
  hasta siete dias, con unidades y patrones de esfuerzo duro. No incluye ids de
  marcas, reps individuales, notas, pesos ni historial completo. El emisor almacena
  solo ese resumen junto a la suscripcion y usa el mismo `micro-core.js` que la app.
- `saveState` anuncia cambios; `queueMicroBalanceSync` los agrupa y envia el resumen
  si cambia, al volver a la app/conexion o abrir el panel. Al arrancar se carga la
  suscripcion ya existente. Se refresca a partir de 6 h cuando hay actividad en la
  app. Un error no bloquea el guardado del entrenamiento; el panel indica pendiente.
- El Worker descarta para el calculo resumenes de mas de **48 h** y fechas fuera de
  la ventana actual. Si no vuelves a abrir la app, retoma rotacion sin carga conocida,
  nunca asume que hiciste las pausas enviadas. Solo conoce los datos del ultimo
  resumen recibido, no entrenamientos todavia no sincronizados desde otro dispositivo.

### Aun no implementado

- Dosis individual desde tus maximos, objetivos por patron, molestias o recuperacion
  real; compensacion respecto a una linea base personal de varias semanas.
- Mas piernas/zonas de movilidad, editor, favoritos o exclusiones por ejercicio.
- Registro rapido de movilidad, pausas parciales, marcar omitida, rachas o estadisticas.
- Posponer 10/30 minutos, dias laborables/fines de semana, ventanas aleatorias.
- Avisos de cada tramo de trabajo/descanso en las pausas o un circuito mixto.
- Entrega push real: falta desplegar y configurar el emisor y probar el iPhone.

## Emisor Pendiente De Activar

`services/push/` contiene un Cloudflare Worker con un Durable Object SQLite por
suscripcion. Usa `luxon` para zonas/cambios de hora y `web-push` para cifrado y VAPID.
Recibe suscripcion, preferencias y el resumen agregado de carga descrito arriba,
ademas del hash del token. No se han creado recursos ni cargos en Cloudflare.

Requiere cuenta/autorizacion de Pablo, Node 22+ y configurar:

1. `npm ci` en `services/push/`; revisar `APP_URL` en `wrangler.jsonc`.
2. Autorizar Wrangler con `npx wrangler login` y desplegar con `npm run deploy`.
   El servicio responde 503 hasta completar los secretos.
3. Generar una pareja VAPID con `npx web-push generate-vapid-keys --json` y un codigo
   privado de activacion de 32 bytes aleatorios. Conservar las claves estables:
   cambiarlas exige desactivar y volver a suscribir los dispositivos.
4. Introducir mediante `npx wrangler secret put NOMBRE` los cuatro secretos:
   `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (URL HTTPS de contacto
   o mailto real) y `ENROLLMENT_TOKEN` (codigo privado, al menos 32 caracteres).
   Nunca ponerlos en Git ni en el JSON publico.
5. Anadir solo el origen HTTPS asignado al Worker a `push-config.json.serviceUrl`,
   subir la version de cache, pasar QA y publicar la app. La URL no lleva rutas.
6. En la PWA, elegir horarios/material, introducir el codigo, activar y enviar una
   prueba. Verificar recepcion con la app cerrada y baja desde el propio panel.

No hay infraestructura alternativa encubierta: sin URL/servidor/permiso, el panel
indica que no esta activo. No son avisos del calendario ni automatizaciones de Codex.

## Contrato Y Limites

- `GET /config`: clave publica; `PUT /devices/:sha256(endpoint)`: alta/horarios;
  `GET/DELETE /devices/:id`: estado/baja; `POST /devices/:id/test`: prueba;
  `POST /devices/:id/balance`: actualiza solo el resumen, sin mover las alarmas.
- CORS limitado al origen de la app. Bearer aleatorio por dispositivo, almacenado
  como SHA-256 en el emisor; el alta/recuperacion requiere el codigo privado.
  JSON <=8 KiB, proveedores HTTPS permitidos (Apple, FCM, Mozilla), sin redireccion
  automatica de envios, errores sin datos sensibles y logs desactivados.
- Una alarma persistente por dispositivo; reserva el siguiente horario antes de
  enviar para no repetir tras un reinicio. Si un envio falla o el proceso cae
  despues de reservar, se omite ese aviso y se mantiene el siguiente: no se promete
  entrega exactamente una vez ni reintento de ese aviso. TTL 5 min, avisos con mas
  de 5 min de retraso se omiten, 404/410 eliminan la suscripcion caducada.
- Prueba limitada a una por minuto/dispositivo. **Desactivar** elimina alarma y
  datos remotos antes de quitar la suscripcion local; sin red no muestra baja falsa.
- Un push aceptado por el proveedor no confirma que el movil lo haya mostrado.
  Los modos de concentracion, permisos y conectividad siguen aplicando.
- El codigo de activacion limita el alta, no es una plataforma multiusuario.
  Revisar cuotas de la cuenta antes de ampliar el numero de usuarios.
  [Alarmas de Durable Objects](https://developers.cloudflare.com/durable-objects/api/alarms/),
  [precios y limites](https://developers.cloudflare.com/durable-objects/platform/pricing/),
  [web-push](https://github.com/web-push-libs/web-push).

## Verificacion

- `tools/qa/run.sh all`: 117 self-tests, crawl/auditoria, plan dos pasadas,
  retirada de Estudio, timer y push. Capturas a 320/390/1280 px.
- `tools/qa/run.sh timer` (33 checks): tiempo simulado, caida, rondas automaticas, TUT, cero,
  recarga, edicion sin duplicados y amplitud/duracion de audio renderizado.
- `tools/qa/run.sh push`: duraciones, fin a 120/300 s, backup, prioridades, reps
  reales y edicion, recarga, resumen agregado, permisos/proveedor simulados.
- `npm test` en `services/push/` (20 tests): duraciones, horarios/DST, auth, cifrado,
  enlaces, no repeticion entre duraciones, alarmas, bajas y SW.
  Incluye seleccion por carga, fatiga compartida, resumen caducado, equipo, ventana
  de dias y distribucion por patron sin sesgo por numero de protocolos.
- `npm run test:runtime`: build y Worker real local (Miniflare/workerd), SQLite,
  alta/lectura/baja y cifrado/envio a un proveedor simulado, sin trafico push real.
- Pendiente antes de afirmar push operativo: despliegue autorizado, prueba cerrada
  en iPhone y un aviso programado. Pendiente: confirmar si "reloj" era Apple Watch.
