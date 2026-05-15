# Agent Context

## Project overview

This is a simple A-Frame/Vite game prototype for a rail-grinding character.

The player starts on the center of three parallel rails and moves forward automatically. The current gameplay loop is:

- Press `W` to accelerate.
- Press `S` to brake.
- Press `A` to hop one rail to the left.
- Press `D` to hop one rail to the right.
- Switching rails creates a hop animation.
- Landing after a rail switch creates a short spark impact burst.
- Static obstacles block rails, set player speed to a negative knockback value, bounce the player backward, create sparks, and shake the camera on collision.
- Grinding creates speed-dependent sparks and stops generating new grind sparks below `0.5` speed.
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
  - Checks static `.obstacle` entities with swept Z collision and sets speed to the obstacle knockback value on hit.
  - Emits `obstacle-hit` and moves the player slightly backward after obstacle collisions.
  - Tracks only the currently active obstacle so static obstacles can repeatedly block the player after they are clear.
  - Emits `game-speed` events every tick with the current speed.
  - Emits `rail-land` when a rail-switch hop finishes.
  - Uses rig `position.y` for the rail-switch hop arc.
  - Uses `SPEED.start`, `SPEED.min`, and `SPEED.max` as defaults.

- **`src/components/grind-sparks.js`**
  - Creates and recycles spark entities.
  - Spark entities are parented to a scene-level `#spark-root`, not the player rig, so existing sparks stay in world/rail space during player hops.
  - Only spawns new grind sparks when the player is on the rail and moving at `0.5` speed or faster.
  - Uses speed tiers for spark density/color.
  - Creates the sonic boom visual when crossing upward into a higher speed tier.
  - Listens for `rail-land` to create a short landing impact burst and ring.
  - Listens for `obstacle-hit` to create a larger obstacle impact burst.
  - Uses `SPEED.mediumTier` and `SPEED.highTier` as defaults.

- **`src/components/speed-camera.js`**
  - Listens to `game-speed`.
  - Moves the camera back/up and widens FOV as speed increases.
  - Adds a camera shake burst when crossing upward into a higher speed tier.
  - Adds a camera shake burst on `obstacle-hit`.
  - Adds subtle camera shake at 90%+ of top speed.
  - Uses shared speed min/max/tier defaults from `src/config/speed.js`.

- **`src/components/collectible.js`**
  - Handles collectible behavior and scoring events.

- **`src/components/spawner.js`**
  - Spawns collectibles into the scene.

- **`src/components/obstacle.js`**
  - Marks static rail blockers with the `.obstacle` class.
  - Defines simple X/Z collision radii used by `player-controls`.

- **`src/styles.css`**
  - HUD and page styling.

## Current architecture notes

- The player rig is the entity with `id="rig"` in `src/main.js`.
- The camera is a child of the rig so it naturally follows the player.
- The rails are simple long `a-box` entities positioned at `x = -2.4`, `x = 0`, and `x = 2.4`.
- Static obstacles are simple `a-box` entities with the `obstacle` component.
- `player-controls` uses `railCount` and `railSpacing` defaults/attributes to determine rail X positions.
- The game uses browser `CustomEvent`s for lightweight communication:
  - `game-speed` updates HUD, sparks, and camera.
  - `game-score` updates HUD score.
  - `rail-land` triggers landing impact visuals after rail switches.
  - `obstacle-hit` triggers obstacle impact sparks and camera shake.

## Development guidance

- Prefer small A-Frame components under `src/components` for new behavior.
- Keep shared gameplay constants in `src/config` when used by multiple components.
- Avoid duplicating speed tier thresholds; import `SPEED` from `src/config/speed.js`.
- Validate changes with `npm run build`.
- Be careful when changing camera transform logic because the camera is a child of the moving player rig.
- Be careful when changing spark parenting; sparks intentionally live in scene/world space so they do not follow player hops.
