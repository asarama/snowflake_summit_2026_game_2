# A-Frame Game Playground

A small Vite + A-Frame playground for prototyping a browser-based 3D/WebXR game.

## Getting started

```bash
npm install
npm run dev
```

Open the local HTTPS URL Vite prints. Browser XR APIs generally require HTTPS, so the dev server uses a local self-signed certificate.

## Controls

- **Look:** Mouse
- **Move:** WASD or arrow keys
- **Collect:** Aim at a crystal and click

## Project layout

- `src/main.js` builds the scene and HUD.
- `src/components/player-controls.js` handles first-person movement.
- `src/components/collectible.js` handles collectible behavior and scoring.
- `src/components/spawner.js` creates starter collectibles around the arena.
- `src/styles.css` styles the overlay HUD.
