# tools/qa — QA headless de BitTracker

Cinco scripts sobre Playwright + Chromium local (sin red externa: todo lo que no sea el
servidor estático se bloquea, así que los iconos Lucide no cargan en las capturas).

| Script | Qué hace | Éxito |
|---|---|---|
| `selftests.js` | Abre la app y ejecuta `runDenseSelfTests()` (motor: curvas, transferencias, S, MAX, peso, rutinas…) | `SELFTESTS: N/N OK`, exit 0 |
| `crawl.js` | Buscador (tildes/espacios), todos los ejercicios × modalidades × formatos, detalles, cronómetro, pantallas; busca NaN/undefined/desbordes | `QA DONE. findings=0` |
| `audit.js` | Arranque con cada pantalla persistida, click-crawl de todas las acciones, flujos plan → registro → edición → borrado, fugas | `AUDIT DONE. findings=0` |
| `plan.js` | Todo lo que propone un test/plan (sugerencias del Dashboard, kits de calibración, cada ejercicio × esquema × modalidad) debe llegar a la tarjeta y al formulario con el mismo esquema, modalidad compatible y objetivo = prefill. Dos pasadas: con historial sintético y `empty` | `checks=N issues=0` |
| `retirement.js` | Retirada de Estudio, enlaces antiguos, marcas/rutinas/borradores conservados, edición sin perder metadatos, cache anterior y uso offline | `RETIREMENT: N checks OK` |

Para revisar la vuelta a la interfaz habitual con iconos reales: `QA_ICONS=1 tools/qa/run.sh retirement` permite
únicamente el bundle Lucide fijado, además del servidor local. Sheets sigue bloqueado.

```bash
tools/qa/run.sh            # todo (instala playwright-core la primera vez, levanta el server)
tools/qa/run.sh selftests  # solo motor (≈5 s)
tools/qa/run.sh plan       # coherencia plan → tarjeta → formulario (≈1 min)
```

Variables: `QA_PORT` (4173), `QA_BASE`, `QA_CHROME` (si Chromium no está en `/opt/pw-browsers`).
Capturas en `tools/qa/shots/` (ignorado por git).

Para reproducir un bug concreto, copia `selftests.js` como plantilla: un `page.evaluate`
con las funciones globales de `app.js` (`openWorkoutExercisePickerModal()`, `state`,
`nodes`…) suele bastar. Recuerda que el botón del día existe en tres diapositivas del
carrusel: usa `.day-slide:not(.is-prev):not(.is-next) …`.
