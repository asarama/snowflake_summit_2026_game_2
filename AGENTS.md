# Agent Context

## Project overview

This is a simple A-Frame/Vite game prototype for a rail-grinding character.

The player starts on a single center rail and moves forward automatically. Additional rails unlock by collecting special power-ups that spawn on all active rails. The current gameplay loop is:

- Press `A` to hop one rail to the left (only when that rail is unlocked).
- Press `D` to hop one rail to the right (only when that rail is unlocked).
- Press `W` (or `ArrowUp`) to jump over obstacles.
- Collect the glowing power-up to unlock the next rail. Collecting any one removes all spawned power-ups.
- The first power-up unlocks a neon yellow rail and pauses gameplay to display a "Greybeam Powerup!" overlay with "DuckDB engine unlocked!".
- The second power-up unlocks a neon red rail and pauses gameplay to display a "Greybeam Powerup!" overlay with "Firebolt engine unlocked!".
- A 3-2-1 countdown is shown during the unlock pause so the player knows when gameplay will resume.
- Switching rails creates a hop animation.
- Jumping creates a higher hop arc and prevents obstacle collisions while airborne.
- Landing after a rail switch creates a short spark impact burst.
- Static obstacles block rails, set player speed to a negative knockback value, reset max speed to default, bounce the player backward, create sparks, and shake the camera on collision.
- Grinding creates speed-dependent sparks and stops generating new grind sparks below `0.5` speed.
- Crossing speed tiers creates a sonic boom effect.
- Camera position, FOV, and shake respond to speed.
- The path is generated as platform segments containing rails, ground, obstacles, and collectibles.
- Obstacles and collectibles are spawned procedurally per platform with randomized count (2-6), position, rail, and type.
- A minimum Z separation of 10 units ensures obstacles and collectibles never spawn too close to each other.
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

- **`src/game-state-store.js`**
  - Centralized shared module exporting `gameStateStore` with `isPlaying` boolean and `activeRailIndices` array getter/setter.
  - `activeRailIndices` starts at `[1]` (center rail only) and expands as the player reaches distance thresholds.
  - `game-state.js` is the sole writer to `isPlaying`; `player-controls` writes `activeRailIndices` when thresholds are crossed.
  - All gameplay components read from it to gate their `tick()` behavior and determine which rails to render/allow.

- **`src/main.js`**
  - Builds the A-Frame scene via `app.innerHTML`.
  - Imports all custom components.
  - Defines the HUD, player rig, camera, lights, collectibles container, and platform generator configuration.
  - Listens for `game-score` and `game-speed` events to update HUD text.
  - Score displays total distance traveled.

- **`src/config/speed.js`**
  - Shared speed configuration.
  - Exports `SPEED` with `start`, `min`, `max`, `mediumTier`, `highTier`, `veryHighTier`, and `extremeTier`.
  - Components that care about speed thresholds should import from here instead of duplicating constants.

- **`src/components/player-controls.js`**
  - Owns player speed, auto-acceleration, continuous forward rail movement, rail switching, jumping, and score (distance traveled).
  - Reads `gameStateStore.isPlaying` to gate its `tick()` and key handlers.
  - Tracks `totalDistance` and emits `game-score` every tick with `Math.floor(totalDistance)`.
  - Tracks `currentMaxSpeed` which starts at regular `maxSpeed` and increases with collectibles up to `collectibleMaxSpeed`.
  - Resets `currentMaxSpeed` to regular `maxSpeed` when speed drops (obstacle hit).
  - Checks static `.obstacle` entities with swept Z collision and sets speed to the obstacle knockback value on hit.
  - On obstacle collision, resets `currentMaxSpeed` back to the default `maxSpeed`.
  - Emits `obstacle-hit` and moves the player slightly backward after obstacle collisions.
  - Tracks only the currently active obstacle so static obstacles can repeatedly block the player after they are clear.
  - Checks `.rail-unlock` entities for power-up collection; collecting one updates `activeRailIndices`, emits `rail-unlock` and `rail-unlock-collected`, and unlocks the next rail.
  - Emits `game-speed` events every tick with current speed and max speed.
  - Emits `rail-land` when a rail-switch hop finishes or a jump lands.
  - Uses `getWorldPosition()` for collectible collision detection because collectibles are nested in groups.
  - Uses rig `position.y` as the maximum of the rail-switch hop arc and the jump arc.
  - Uses `SPEED.start`, `SPEED.min`, and `SPEED.max` as defaults.

- **`src/components/grind-sparks.js`**
  - Creates and recycles spark entities.
  - Spark entities are parented to a scene-level `#spark-root`, not the player rig, so existing sparks stay in world/rail space during player hops.
  - Reads `gameStateStore.isPlaying` to gate its `tick()`.
  - Only spawns new grind sparks when the player is on the rail and moving at `0.5` speed or faster.
  - Uses five speed tiers (0-4) for spark density, color, and force.
  - Spawn interval scales from 90ms at tier 0 down to 3ms at tier 4.
  - Sonic boom visual scales bigger with each higher tier crossed.
  - Rail-land and obstacle-hit impacts scale burst count and spark force with the triggering speed.
  - Listens for `rail-land` to create a short landing impact burst and ring.
  - Listens for `obstacle-hit` to create a larger obstacle impact burst.
  - Listens for `collectible-collected` to create green spark burst.
  - Uses `SPEED.mediumTier`, `highTier`, `veryHighTier`, and `extremeTier` as defaults.

- **`src/components/speed-camera.js`**
  - Reads `gameStateStore.isPlaying` to gate its `tick()`.
  - Listens to `game-speed`.
  - Moves the camera back/up and widens FOV as speed increases.
  - Adds a camera shake burst when crossing upward into a higher speed tier; shake strength scales with the tier reached.
  - Adds a camera shake burst on `obstacle-hit`; shake strength scales with the impact speed.
  - Adds continuous camera shake that gets progressively worse as speed increases (no longer gated to 90%+).
  - Uses shared speed min/max/tier defaults from `src/config/speed.js`.

- **`src/components/collectible.js`**
  - Handles collectible behavior and emits `collectible-collected` event on collection.
  - Collectibles are generated per platform on rails by `platform-generator`.
  - Collecting boosts player speed beyond the regular max speed.
  - The `.collectible` class is only added to the collision box entity, not the parent group.

- **`src/components/rail-unlock.js`**
  - `rail-unlock` component marks an entity as a rail-unlock power-up and stores its tier.
  - `rail-unlock-spawner` component spawns power-up entities on all active rails ahead of the player.
  - Each tier spawns once; if the player passes all spawned entities, they respawn further ahead.
  - Collecting any power-up removes all currently spawned power-ups and emits `rail-unlock-collected`.
  - Power-ups are scene-level entities, not children of platforms.
  - First tier power-ups glow yellow; second tier glow red.

- **`src/components/obstacle.js`**
  - Marks static rail blockers with the `.obstacle` class.
  - Defines simple X/Z collision radii used by `player-controls`.

- **`src/components/platform-generator.js`**
  - Generates platform segments made of ground, rails, obstacles, and collectibles.
  - Only generates rails, obstacles, and collectibles whose rail index is present in `gameStateStore.activeRailIndices`.
  - Rail colors are driven by `RAIL_COLORS`: center rail cyan, right rail neon yellow, left rail neon red.
  - Maintains a rolling set of platform entities ahead of the player.
  - Reads `gameStateStore.isPlaying` to gate its `tick()`.
  - Removes the oldest platform after the player passes its end and appends a new platform farther forward.
  - Listens for `rail-unlock` and retroactively adds the newly unlocked rail to existing visible platforms.
  - Obstacles and collectibles are spawned procedurally per platform with randomized count (2-6), position, rail, and type.
  - A minimum Z separation of 10 units ensures obstacles and collectibles never spawn too close to each other.

- **`src/components/game-state.js`**
  - Manages game flow: start screen, 3-second countdown, 60-second timer, and game over screen.
  - Is the **sole writer** to `gameStateStore.isPlaying`, setting it to `true` on begin and `false` on end/reset.
  - Temporarily pauses `isPlaying` and the timer for ~2.5 seconds when a `rail-unlock-collected` event is received.
  - Displays a transparent glassmorphism overlay with a static "Greybeam Powerup!" header and a dynamic engine-unlocked message (e.g., "DuckDB engine unlocked!" or "Firebolt engine unlocked!").
  - Shows a visible 3-2-1 countdown during the pause so the player knows exactly when gameplay resumes.
  - Emits `game-start`, `game-end`, and `game-reset` events.
  - Tracks score and displays final score on game over.

- **`src/styles.css`**
  - HUD and page styling.
  - Overlay styles for start screen, countdown, timer, and game over.
  - The unlock message overlay uses a transparent glassmorphism panel with a static header, dynamic engine message, and a 3-2-1 countdown.

## Current architecture notes

- The player rig is the entity with `id="rig"` in `src/main.js`.
- The camera is a child of the rig so it naturally follows the player.
- The rails are generated per platform as `a-box` entities positioned at `x = -2.4`, `x = 0`, and `x = 2.4`, but only the currently unlocked subset is rendered.
- Static obstacles are generated per platform as simple `a-box` entities with the `obstacle` component, filtered to only appear on unlocked rails.
  - `player-controls` clamps rail switching to `gameStateStore.activeRailIndices`, preventing hops to locked rails.
  - Emits `rail-unlock` event when the player crosses a distance threshold, updating `gameStateStore.activeRailIndices`.
  - Resets `gameStateStore.activeRailIndices` to `[1]` on `game-reset`.
- Rails unlock by collecting special power-ups, not by distance. The spawner places power-ups ahead on all active rails; collecting any one removes all and triggers the unlock.
- The first power-up unlocks the right rail (neon yellow). The second unlocks the left rail (neon red).
- Collecting a power-up pauses gameplay and the timer for ~2.5 seconds to display a transparent "Greybeam Powerup!" overlay with the unlocked engine name and a visible 3-2-1 countdown.
- The game uses browser `CustomEvent`s for lightweight communication:
  - `game-speed` updates HUD, sparks, and camera.
  - `game-score` updates HUD score (total distance traveled from `player-controls`).
  - `game-start` enables player movement and begins gameplay.
  - `game-end` stops player movement and shows game over screen.
  - `game-reset` resets score and returns to start screen.
  - `collectible-collected` boosts player speed beyond regular max.
  - `rail-land` triggers landing impact visuals after rail switches.
  - `obstacle-hit` triggers obstacle impact sparks and camera shake.
  - `rail-unlock` notifies that a new rail was unlocked, updating visible rails and switchable range.
  - `rail-unlock-collected` notifies that the player collected a rail-unlock power-up, triggering the pause overlay and next-tier spawn.

## Development guidance

- Prefer small A-Frame components under `src/components` for new behavior.
- Keep shared gameplay constants in `src/config/rails.js`
  - Exports `RAIL_UNLOCKS` array defining which rail indices become active at each unlock tier.
  - Exports `RAIL_COLORS` map from rail index to material properties (center rail cyan, right rail neon yellow, left rail neon red).
- Keep shared speed configuration in `src/config/speed.js`.
- Validate changes with `npm run build`.
- Be careful when changing camera transform logic because the camera is a child of the moving player rig.
- Be careful when changing spark parenting; sparks intentionally live in scene/world space so they do not follow player hops.
