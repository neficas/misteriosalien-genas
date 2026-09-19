# Aural — Reproductor de música HiFi

PWA minimalista para escuchar tu música local en alta fidelidad, instalable en
Android como app nativa.

## Características

- **Biblioteca local privada**: importa MP3, FLAC, WAV, OGG/Opus, M4A/AAC.
  Los archivos se guardan en el dispositivo (IndexedDB) — nada se sube a
  ningún servidor, así que quedan disponibles para siempre sin conexión
  ("descargados" en el sentido real de la palabra).
- **Reproducción HiFi**: decodificación nativa del navegador sin
  recompresión, incluyendo FLAC/WAV sin pérdida (*bit-perfect passthrough*).
- **Ecualizador de 10 bandas** (31 Hz–16 kHz) con presets y ajuste manual vía
  Web Audio API.
- **Crossfade configurable** entre canciones (0–10 s).
- **Playlists**, álbumes y artistas organizados automáticamente por
  metadatos (ID3v2 / Vorbis Comments), con carátulas embebidas.
- **Controles en pantalla de bloqueo** (Media Session API): play/pausa/
  siguiente/anterior desde notificaciones y auriculares Bluetooth.
- **Instalable en Android**: manifest + service worker (`vite-plugin-pwa`)
  para "Añadir a pantalla de inicio", funciona 100% offline tras el primer
  uso.
- **UI minimalista** en modo oscuro, pensada para uso con una mano.

## Desarrollo

```bash
npm install
npm run dev
```

## Build & despliegue

```bash
npm run build   # genera dist/
npm run icons   # regenera los íconos PWA (requiere `canvas`)
```

El workflow de GitHub Actions (`.github/workflows/deploy.yml`) publica
`dist/` en GitHub Pages en cada push a la rama principal.

## Instalar en un teléfono Android

1. Abre la URL publicada en Chrome para Android.
2. Toca el menú ⋮ → **Instalar aplicación** (o **Añadir a pantalla de
   inicio**). También aparece un botón "Instalar en este teléfono" en
   Ajustes dentro de la app.
3. Importa tus canciones desde Biblioteca → **Importar música** para
   empezar a escuchar en HiFi, incluso sin conexión.
