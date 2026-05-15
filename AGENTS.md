# Agent Context

## Project overview

This is a simple A-Frame/Vite game prototype for a rail-grinding character.

The player starts on the center of three parallel rails and moves forward automatically. The current gameplay loop is:

- Press `W` to accelerate.
- Press `S` to brake.
- Press `A` to hop one rail to the left.
- Press `D` to hop one rail to the right.
- Switching rails creates a hop animation.
- Grinding creates speed-dependent sparks.
- Crossing speed tiers creates a sonic boom effect.
- Camera position, FOV, and shake respond to speed.

## Important commands

- **Run dev server**: `npm run dev`
- **Production build**: `npm run build`
- **Preview build**: `npm run preview`

Use `npm run build` after code changes to validate the project still bundles.

## Agent maintenance note

When making future changes, update this `AGENTS.md` file if the change affects gameplay behavior, architecture, component responsibilities, shared config, commands, or important development guidance.

## Key files

- **`src/main.js`**
  - Builds the A-Frame scene via `app.innerHTML`.
  - Imports all custom components.
  - Defines the HUD, player rig, camera, rails, lights, collectibles container, and environment geometry.
  - Listens for `game-score` and `game-speed` events to update HUD text.

- **`src/config/speed.js`**
  - Shared speed configuration.
  - Currently exports `SPEED` with `start`, `min`, `max`, `mediumTier`, and `highTier`.
  - Components that care about speed thresholds should import from here instead of duplicating constants.

- **`src/components/player-controls.js`**
  - Owns player speed, braking/acceleration, forward rail movement, wrapping, and rail switching.
  - Emits `game-speed` events every tick with the current speed.
  - Uses rig `position.y` for the rail-switch hop arc.
  - Uses `SPEED.start`, `SPEED.min`, and `SPEED.max` as defaults.

- **`src/components/grind-sparks.js`**
  - Creates and recycles spark entities.
  - Spark entities are parented to a scene-level `#spark-root`, not the player rig, so existing sparks stay in world/rail space during player hops.
  - Only spawns new sparks when the player is on the rail.
  - Uses speed tiers for spark density/color.
  - Creates the sonic boom visual when crossing upward into a higher speed tier.
  - Uses `SPEED.mediumTier` and `SPEED.highTier` as defaults.

- **`src/components/speed-camera.js`**
  - Listens to `game-speed`.
  - Moves the camera back/up and widens FOV as speed increases.
  - Adds a camera shake burst when crossing upward into a higher speed tier.
  - Adds subtle camera shake at 90%+ of top speed.
  - Uses shared speed min/max/tier defaults from `src/config/speed.js`.

- **`src/components/collectible.js`**
  - Handles collectible behavior and scoring events.

- **`src/components/spawner.js`**
  - Spawns collectibles into the scene.

- **`src/styles.css`**
  - HUD and page styling.

## Current architecture notes

- The player rig is the entity with `id="rig"` in `src/main.js`.
- The camera is a child of the rig so it naturally follows the player.
- The rails are simple long `a-box` entities positioned at `x = -2.4`, `x = 0`, and `x = 2.4`.
- `player-controls` uses `railCount` and `railSpacing` defaults/attributes to determine rail X positions.
- The game uses browser `CustomEvent`s for lightweight communication:
  - `game-speed` updates HUD, sparks, and camera.
  - `game-score` updates HUD score.

## Development guidance

- Prefer small A-Frame components under `src/components` for new behavior.
- Keep shared gameplay constants in `src/config` when used by multiple components.
- Avoid duplicating speed tier thresholds; import `SPEED` from `src/config/speed.js`.
- Validate changes with `npm run build`.
- Be careful when changing camera transform logic because the camera is a child of the moving player rig.
- Be careful when changing spark parenting; sparks intentionally live in scene/world space so they do not follow player hops.
