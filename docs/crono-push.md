# Cronometro y pausas push

Version local: `20260912-crono-push-48`. No cambia la interfaz habitual ni crea otra
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

## Pausas de cinco minutos

- Campana junto al cronometro, en Workout. `notifications.js` gestiona el permiso,
  suscripcion, horarios, prueba y baja. No pide permiso al abrir el panel.
- Entre 1 y 4 avisos diarios, de 08:00 a 21:59, separados al menos una hora. El
  formulario propone 11:00 y 17:00 (Europe/Madrid), pero no activa nada por defecto.
  Son horarios elegidos, no horas aleatorias; la seleccion de ejercicio si varia.
- Material inicial: suelo y anillas. Cuatro protocolos suaves en
  `micro-sessions.json`, filtrados por material/tipo y evitando repeticion inmediata
  cuando hay alternativas. No hay ejercicios maximos ni registro automatico.
- **Una pausa ahora** y su reloj funcionan sin emisor. Abrir el push lleva al
  protocolo mediante `?micro=<id>`. Si ya hay un formulario/reloj abierto, no lo
  sustituye: avisa de que hay una pausa disponible en la campana.
- Preferencias compartidas: `state.settings.microBreaks`. Credencial y dispositivo:
  `bittracker-push-device-v1`, solo local, fuera de snapshots y Sheets. Cada movil
  debe activar sus push; cambiar horarios afecta solo a ese dispositivo.
- En iPhone hace falta abrir la PWA instalada en pantalla de inicio y conceder el
  permiso desde el boton de activacion, con iOS/iPadOS 16.4 o posterior.
  [Documentacion de WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

## Emisor Pendiente De Activar

`services/push/` contiene un Cloudflare Worker con un Durable Object SQLite por
suscripcion. Usa `luxon` para zonas/cambios de hora y `web-push` para cifrado y VAPID.
No recibe entrenamientos: solo suscripcion, horarios, material, tipos de pausa y
hash del token del dispositivo. No se han creado recursos ni cargos en Cloudflare.

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
  `GET/DELETE /devices/:id`: estado/baja; `POST /devices/:id/test`: prueba.
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

- `tools/qa/run.sh all`: 111 self-tests, crawl/auditoria, plan dos pasadas,
  retirada de Estudio, timer y push. Capturas a 320/390/1280 px.
- `tools/qa/run.sh timer` (33 checks): tiempo simulado, caida, rondas automaticas, TUT, cero,
  recarga, edicion sin duplicados y amplitud/duracion de audio renderizado.
- `tools/qa/run.sh push` (22 checks): permisos y proveedor simulados; no es entrega fisica.
- `npm test` en `services/push/` (10 tests): horarios/DST, auth, cifrado, alarmas, bajas y SW.
- `npm run test:runtime`: build y Worker real local (Miniflare/workerd), SQLite,
  alta/lectura/baja y cifrado/envio a un proveedor simulado, sin trafico push real.
- Pendiente antes de afirmar push operativo: despliegue autorizado, prueba cerrada
  en iPhone y un aviso programado. Pendiente: confirmar si "reloj" era Apple Watch.
