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
- Static obstacles block rails, set player speed to a negative knockback value, reset max speed to default, bounce the player backward, create sparks, and shake the camera on collision.
- Grinding creates speed-dependent sparks and stops generating new grind sparks below `0.5` speed.
- Crossing speed tiers creates a sonic boom effect.
- Camera position, FOV, and shake respond to speed.
- The path is generated as platform segments containing rails, ground, and obstacles.
- Three platform segments exist at startup; when the player moves past the oldest segment, it is destroyed and a new segment is generated ahead.
- Game starts with a start screen overlay, then a 3-second countdown, then 60 seconds of gameplay.
- After 60 seconds, the game ends with a dimmed overlay showing the final score (distance traveled in meters) and a restart button.

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
  - Defines the HUD, player rig, camera, lights, collectibles container, and platform generator configuration.
  - Listens for `game-score` and `game-speed` events to update HUD text.
  - Score displays total distance traveled.

- **`src/config/speed.js`**
  - Shared speed configuration.
  - Currently exports `SPEED` with `start`, `min`, `max`, `mediumTier`, and `highTier`.
  - Components that care about speed thresholds should import from here instead of duplicating constants.

- **`src/components/player-controls.js`**
  - Owns player speed, braking/acceleration, continuous forward rail movement, rail switching, and score (distance traveled).
  - Tracks `totalDistance` and emits `game-score` every tick with `Math.floor(totalDistance)`.
  - Tracks `currentMaxSpeed` which starts at regular `maxSpeed` and increases with collectibles up to `collectibleMaxSpeed`.
  - Resets `currentMaxSpeed` to regular `maxSpeed` when speed drops (braking, drag, obstacle hit).
  - Checks static `.obstacle` entities with swept Z collision and sets speed to the obstacle knockback value on hit.
  - On obstacle collision, resets `currentMaxSpeed` back to the default `maxSpeed`.
  - Emits `obstacle-hit` and moves the player slightly backward after obstacle collisions.
  - Tracks only the currently active obstacle so static obstacles can repeatedly block the player after they are clear.
  - Emits `game-speed` events every tick with current speed and max speed.
  - Emits `rail-land` when a rail-switch hop finishes.
  - Uses `getWorldPosition()` for collectible collision detection because collectibles are nested in groups.
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
  - Listens for `collectible-collected` to create green spark burst.
  - Uses `SPEED.mediumTier` and `SPEED.highTier` as defaults.

- **`src/components/speed-camera.js`**
  - Listens to `game-speed`.
  - Moves the camera back/up and widens FOV as speed increases.
  - Adds a camera shake burst when crossing upward into a higher speed tier.
  - Adds a camera shake burst on `obstacle-hit`.
  - Adds subtle camera shake at 90%+ of top speed.
  - Uses shared speed min/max/tier defaults from `src/config/speed.js`.

- **`src/components/collectible.js`**
  - Handles collectible behavior and emits `collectible-collected` event on collection.
  - Collectibles are generated per platform on rails by `platform-generator`.
  - Collecting boosts player speed beyond the regular max speed.
  - The `.collectible` class is only added to the collision box entity, not the parent group.

- **`src/components/obstacle.js`**
  - Marks static rail blockers with the `.obstacle` class.
  - Defines simple X/Z collision radii used by `player-controls`.

- **`src/components/platform-generator.js`**
  - Generates platform segments made of ground, three rails, obstacles, and collectibles.
  - Maintains a rolling set of platform entities ahead of the player.
  - Removes the oldest platform after the player passes its end and appends a new platform farther forward.

- **`src/components/game-state.js`**
  - Manages game flow: start screen, 3-second countdown, 60-second timer, and game over screen.
  - Emits `game-start`, `game-end`, and `game-reset` events.
  - Tracks score and displays final score on game over.

- **`src/styles.css`**
  - HUD and page styling.
  - Overlay styles for start screen, countdown, timer, and game over.

## Current architecture notes

- The player rig is the entity with `id="rig"` in `src/main.js`.
- The camera is a child of the rig so it naturally follows the player.
- The rails are generated per platform as `a-box` entities positioned at `x = -2.4`, `x = 0`, and `x = 2.4`.
- Static obstacles are generated per platform as simple `a-box` entities with the `obstacle` component.
- `player-controls` uses `railCount` and `railSpacing` defaults/attributes to determine rail X positions.
- The game uses browser `CustomEvent`s for lightweight communication:
  - `game-speed` updates HUD, sparks, and camera.
  - `game-score` updates HUD score (total distance traveled from `player-controls`).
  - `game-start` enables player movement and begins gameplay.
  - `game-end` stops player movement and shows game over screen.
  - `game-reset` resets score and returns to start screen.
  - `collectible-collected` boosts player speed beyond regular max.
  - `rail-land` triggers landing impact visuals after rail switches.
  - `obstacle-hit` triggers obstacle impact sparks and camera shake.

## Development guidance

- Prefer small A-Frame components under `src/components` for new behavior.
- Keep shared gameplay constants in `src/config` when used by multiple components.
- Avoid duplicating speed tier thresholds; import `SPEED` from `src/config/speed.js`.
- Validate changes with `npm run build`.
- Be careful when changing camera transform logic because the camera is a child of the moving player rig.
- Be careful when changing spark parenting; sparks intentionally live in scene/world space so they do not follow player hops.
