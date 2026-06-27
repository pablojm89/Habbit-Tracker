# BitTracker

App personal para hábitos, registro DenseTraining, PRs, estimaciones cruzadas y sync a Google Sheets.

## Usar En Local

```bash
python3 -m http.server 4173
```

Abre:

```txt
http://localhost:4173/index.html
```

## Usar En El Móvil En La Misma Wi-Fi

Con el servidor local activo, abre en Safari/Chrome del móvil:

```bash
http://192.168.1.138:4173/index.html
```

En iPhone: compartir -> Añadir a pantalla de inicio.

## Publicar Con GitHub Pages

Importante: esta copia lleva el endpoint y token de Google Sheets preconfigurados en `app.js`.
Publica el repositorio como privado si quieres mantenerlo listo para usar sin exponer el token.
Si lo publicas como publico, cambia el token en Apps Script despues o deja el token vacio en la app y configuralo manualmente desde el movil.

1. Abre este proyecto con GitHub Desktop.
2. Publica el repositorio en GitHub.
3. En GitHub web: `Settings -> Pages`.
4. En `Build and deployment`, elige:

```txt
Source: Deploy from a branch
Branch: main
Folder: /root
```

5. Guarda.
6. Abre la URL de GitHub Pages en el móvil.
7. Añade a pantalla de inicio.

## Incluye

- Panel gamificado con XP, nivel, racha, score semanal/mensual y stats.
- Hábitos diarios con calidad `mínimo`, `base` y `heroico`.
- Editor de hábitos con icono, color, stat, XP, core y tolerancia.
- Mapa mensual por hábito.
- Registro DenseTraining con ejercicios propios.
- PR lab y estimaciones cruzadas.
- Logbook de marcas reales.
- Revisión semanal.
- Export, copy e import de backup JSON.
- Persistencia local en `localStorage`.
- Sync a Google Sheets mediante Apps Script (`bittracker-cloud-sync.md`).
- PWA básica: manifest, icono y service worker.

## Cloud sync

La app incluye el endpoint de Apps Script configurado y sync automático.

Lee:

```txt
bittracker-cloud-sync.md
google-sheets-apps-script.gs
```

La idea recomendada ahora es usar Google Sheets como fuente externa auditable y dejar `localStorage` solo como cache/fallback del navegador.

## Archivos Principales

```txt
index.html
app.js
styles.css
manifest.webmanifest
icon.svg
sw.js
google-sheets-apps-script.gs
```
