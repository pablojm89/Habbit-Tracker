# BitTracker — reglas del repo

PWA de entrenamiento en vanilla JS sin build (`app.js`, `styles.css`, `index.html`,
`sw.js`). GitHub Pages sirve `main`; el usuario (Pablo, atleta avanzado de calistenia,
español) prueba en iPhone.

- **Flujo obligatorio** para cualquier cambio de código: skill `bittracker-ship`
  (`.claude/skills/bittracker-ship/SKILL.md`). Resumen: reproducir → cambio mínimo →
  `tools/qa/run.sh` (self-tests + crawl + auditoría) → subir `?v=` en `index.html` y
  `sw.js` → docs → commit → fast-forward a `main`.
- **Contexto entre sesiones**: `docs/ESTADO-SESIONES.md` (versión, nº de self-tests,
  trampas conocidas, trabajo reciente). Actualízalo en cada entrega.
- **Nunca** brace-matching sobre `app.js`; nunca `const` de render fuera del bloque de
  constantes (TDZ); `render()` inicial siempre al final del archivo.
- UI y commits en español. Sin identificadores de modelo en commits ni código.
