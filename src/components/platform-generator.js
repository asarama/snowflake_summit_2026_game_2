import AFRAME from 'aframe';
import { gameStateStore } from '../game-state-store.js';
import { RAIL_COLORS } from '../config/rails.js';

const PLATFORM_LENGTH = 100;
const RAIL_SPACING = 2.4;

const SPAWN = {
  minCount: 2,
  maxCount: 6,
  minSeparation: 10,
  obstacleChance: 0.5,
  minZ: 8,
  maxZOffset: 8
};

AFRAME.registerComponent('platform-generator', {
  schema: {
    player: { type: 'selector' },
    platformCount: { type: 'int', default: 3 },
    platformLength: { type: 'number', default: PLATFORM_LENGTH },
    railCount: { type: 'int', default: 3 },
    railSpacing: { type: 'number', default: RAIL_SPACING },
    startZ: { type: 'number', default: 18 }
  },

  init() {
    this.platforms = [];
    this.nextPlatformStartZ = this.data.startZ;
    this.initialStartZ = this.data.startZ;

    for (let index = 0; index < this.data.platformCount; index += 1) {
      this.createPlatform();
    }

    window.addEventListener('game-reset', () => this.resetPlatforms());
    window.addEventListener('rail-unlock', (event) => this.onRailUnlock(event));
  },

  onRailUnlock(event) {
    const { newRail } = event.detail;

    for (const platform of this.platforms) {
      const centerZ = platform.startZ - this.data.platformLength / 2;
      const existingRail = platform.el.querySelector(`[data-rail-index="${newRail}"]`);

      if (!existingRail) {
        this.createRail(platform.el, centerZ, newRail);
      }
    }
  },

  tick() {
    if (!gameStateStore.isPlaying) return;

    const player = this.data.player;

    if (!player || this.platforms.length === 0) {
      return;
    }

    const playerZ = player.object3D.position.z;
    const oldestPlatform = this.platforms[0];

    if (playerZ < oldestPlatform.endZ && !oldestPlatform.pendingRemoval) {
      oldestPlatform.pendingRemoval = true;
      setTimeout(() => {
        if (oldestPlatform.el && oldestPlatform.el.parentNode) {
          oldestPlatform.el.remove();
        }
        this.platforms.shift();
        this.createPlatform();
      }, 100);
    }
  },

  createPlatform() {
    const startZ = this.nextPlatformStartZ;
    const endZ = startZ - this.data.platformLength;
    const centerZ = startZ - this.data.platformLength / 2;
    const platform = document.createElement('a-entity');
    const activeRails = gameStateStore.activeRailIndices;
    const spawns = this.generateSpawns(activeRails);

    platform.classList.add('platform');
    platform.setAttribute('position', '0 0 0');
    this.addGround(platform, centerZ);
    this.addRails(platform, centerZ);
    this.addFoliage(platform, centerZ);
    this.addObstacles(platform, startZ, spawns);
    this.addCollectibles(platform, startZ, spawns);
    this.el.appendChild(platform);
    this.platforms.push({ el: platform, startZ, endZ });
    this.nextPlatformStartZ = endZ;
  },

  addGround(platform, centerZ) {
    const plane = document.createElement('a-plane');
    const ground = document.createElement('a-box');

    plane.setAttribute('position', { x: 0, y: -0.18, z: centerZ });
    plane.setAttribute('rotation', '-90 0 0');
    plane.setAttribute('width', 16);
    plane.setAttribute('height', this.data.platformLength);
    plane.setAttribute('material', 'color: #0d2038; roughness: 0.9');
    platform.appendChild(plane);

    ground.setAttribute('position', { x: 0, y: -0.12, z: centerZ });
    ground.setAttribute('width', 5.6);
    ground.setAttribute('height', 0.08);
    ground.setAttribute('depth', this.data.platformLength);
    ground.setAttribute('material', 'color: #14365c; roughness: 0.85');
    platform.appendChild(ground);
  },

  addRails(platform, centerZ) {
    const activeRails = gameStateStore.activeRailIndices;

    for (let rail = 0; rail < this.data.railCount; rail += 1) {
      if (!activeRails.includes(rail)) {
        continue;
      }

      this.createRail(platform, centerZ, rail);
    }
  },

  createRail(platform, centerZ, rail) {
    const railEntity = document.createElement('a-box');
    const colors = RAIL_COLORS[rail];

    railEntity.setAttribute('data-rail-index', rail);
    railEntity.setAttribute('position', { x: this.getRailX(rail), y: 0, z: centerZ });
    railEntity.setAttribute('width', 0.16);
    railEntity.setAttribute('height', 0.16);
    railEntity.setAttribute('depth', this.data.platformLength);
    railEntity.setAttribute('material', `color: ${colors.color}; emissive: ${colors.emissive}; emissiveIntensity: ${colors.emissiveIntensity}; metalness: 0.65; roughness: 0.2`);
    platform.appendChild(railEntity);
  },

  addFoliage(platform, centerZ) {
    const halfLength = this.data.platformLength / 2;
    const count = Math.floor(Math.random() * 6) + 5;

    const PALETTE = [
      { color: '#00f0ff', emissive: '#00f0ff' },
      { color: '#ff00aa', emissive: '#ff00aa' },
      { color: '#7b61ff', emissive: '#7b61ff' },
      { color: '#39ff14', emissive: '#39ff14' },
      { color: '#ffea00', emissive: '#ffea00' }
    ];

    for (let i = 0; i < count; i += 1) {
      const z = centerZ + (Math.random() - 0.5) * halfLength * 1.8;
      const side = Math.random() < 0.5 ? -1 : 1;
      const xMin = this.data.railSpacing * 1.6;
      const xMax = 7.2;
      const x = side * (xMin + Math.random() * (xMax - xMin));
      const typeRoll = Math.random();
      const tint = PALETTE[Math.floor(Math.random() * PALETTE.length)];

      if (typeRoll < 0.35) {
        // Data pillar — glowing translucent memory block / server rack
        const group = document.createElement('a-entity');
        group.setAttribute('position', { x, y: 0, z });

        const height = 0.8 + Math.random() * 1.4;
        const segments = Math.max(2, Math.floor(height * 2.5));
        const segHeight = height / segments;

        for (let s = 0; s < segments; s += 1) {
          const lit = Math.random() < 0.55;
          const box = document.createElement('a-box');
          box.setAttribute('position', { x: 0, y: segHeight / 2 + s * segHeight, z: 0 });
          box.setAttribute('width', 0.18 + Math.random() * 0.1);
          box.setAttribute('height', segHeight * 0.92);
          box.setAttribute('depth', 0.18 + Math.random() * 0.1);
          box.setAttribute('material', lit
            ? `color: ${tint.color}; emissive: ${tint.emissive}; emissiveIntensity: 0.6; opacity: 0.85; transparent: true; metalness: 0.4; roughness: 0.3`
            : `color: #0a0a14; emissive: #111122; emissiveIntensity: 0.15; opacity: 0.7; transparent: true; metalness: 0.5; roughness: 0.4`);
          group.appendChild(box);
        }

        platform.appendChild(group);
      } else if (typeRoll < 0.65) {
        // Floating packet — small glowing geometric shape
        const packet = document.createElement('a-octahedron');
        packet.setAttribute('position', { x, y: 0.5 + Math.random() * 1.2, z });
        const scale = 0.12 + Math.random() * 0.18;
        packet.setAttribute('scale', `${scale} ${scale} ${scale}`);
        packet.setAttribute('radius', 1);
        packet.setAttribute('material', `color: ${tint.color}; emissive: ${tint.emissive}; emissiveIntensity: 0.8; opacity: 0.9; transparent: true; metalness: 0.3; roughness: 0.2`);
        packet.setAttribute('animation', `property: rotation; to: ${Math.random() * 360} ${Math.random() * 360} ${Math.random() * 360}; dur: ${3000 + Math.random() * 4000}; easing: linear; loop: true`);
        platform.appendChild(packet);
      } else if (typeRoll < 0.85) {
        // Bit cluster — cubes arranged like a tiny binary fragment
        const group = document.createElement('a-entity');
        group.setAttribute('position', { x, y: 0.15 + Math.random() * 0.3, z });
        const bits = 3 + Math.floor(Math.random() * 4);
        for (let b = 0; b < bits; b += 1) {
          const cube = document.createElement('a-box');
          const bx = (Math.random() - 0.5) * 0.5;
          const by = (Math.random() - 0.5) * 0.3;
          const bz = (Math.random() - 0.5) * 0.5;
          cube.setAttribute('position', { x: bx, y: by, z: bz });
          const s = 0.06 + Math.random() * 0.08;
          cube.setAttribute('scale', `${s} ${s} ${s}`);
          const lit = Math.random() < 0.6;
          cube.setAttribute('material', lit
            ? `color: ${tint.color}; emissive: ${tint.emissive}; emissiveIntensity: 0.9; metalness: 0.1; roughness: 0.2`
            : `color: #050510; emissive: #0a0a18; emissiveIntensity: 0.1; metalness: 0.1; roughness: 0.8`);
          group.appendChild(cube);
        }
        platform.appendChild(group);
      } else {
        // Data stream — thin vertical beam
        const beam = document.createElement('a-cylinder');
        beam.setAttribute('position', { x, y: 0.5 + Math.random() * 0.8, z });
        beam.setAttribute('radius', 0.02 + Math.random() * 0.03);
        beam.setAttribute('height', 1.0 + Math.random() * 1.5);
        beam.setAttribute('material', `color: ${tint.color}; emissive: ${tint.emissive}; emissiveIntensity: 0.7; opacity: 0.6; transparent: true; metalness: 0.2; roughness: 0.3`);
        platform.appendChild(beam);
      }
    }
  },

  generateSpawns(activeRails) {
    const count = Math.floor(Math.random() * (SPAWN.maxCount - SPAWN.minCount + 1)) + SPAWN.minCount;
    const minZ = SPAWN.minZ;
    const maxZ = this.data.platformLength - SPAWN.maxZOffset;
    const positions = [];
    let attempts = 0;

    while (positions.length < count && attempts < 200) {
      attempts += 1;
      const z = minZ + Math.random() * (maxZ - minZ);
      const tooClose = positions.some((p) => Math.abs(p.z - z) < SPAWN.minSeparation);

      if (!tooClose) {
        const type = Math.random() < SPAWN.obstacleChance ? 'obstacle' : 'collectible';
        const rail = activeRails[Math.floor(Math.random() * activeRails.length)];
        positions.push({ z, type, rail });
      }
    }

    positions.sort((a, b) => a.z - b.z);
    return positions;
  },

  addObstacles(platform, startZ, spawns) {
    for (const spawn of spawns) {
      if (spawn.type !== 'obstacle') {
        continue;
      }

      const obstacle = document.createElement('a-box');

      obstacle.setAttribute('obstacle', '');
      obstacle.setAttribute('position', {
        x: this.getRailX(spawn.rail),
        y: 0.45,
        z: startZ - spawn.z
      });
      obstacle.setAttribute('width', 0.9);
      obstacle.setAttribute('height', 0.9);
      obstacle.setAttribute('depth', 0.8);
      obstacle.setAttribute('material', 'color: #ff5555; emissive: #7f1d1d; emissiveIntensity: 0.45; metalness: 0.2; roughness: 0.35');
      platform.appendChild(obstacle);
    }
  },

  addCollectibles(platform, startZ, spawns) {
    for (const spawn of spawns) {
      if (spawn.type !== 'collectible') {
        continue;
      }

      const collectibleGroup = document.createElement('a-entity');
      const collisionBox = document.createElement('a-box');
      const collectible = document.createElement('a-octahedron');

      collectibleGroup.classList.add('collectible-group');
      collectibleGroup.setAttribute('position', {
        x: this.getRailX(spawn.rail),
        y: 1.2,
        z: startZ - spawn.z
      });

      collisionBox.classList.add('collectible');
      collisionBox.setAttribute('collectible', '');
      collisionBox.setAttribute('position', '0 0 0');
      collisionBox.setAttribute('width', 0.8);
      collisionBox.setAttribute('height', 0.8);
      collisionBox.setAttribute('depth', 0.8);
      collisionBox.setAttribute('visible', 'false');
      collectibleGroup.appendChild(collisionBox);

      collectible.setAttribute('radius', 0.35);
      collectible.setAttribute('position', '0 0 0');
      collectible.setAttribute('material', 'color: #8be9fd; emissive: #35d6ff; emissiveIntensity: 0.7; metalness: 0.1; roughness: 0.25');
      collectibleGroup.appendChild(collectible);

      platform.appendChild(collectibleGroup);
    }
  },

  resetPlatforms() {
    for (const platform of this.platforms) {
      if (platform.el && platform.el.parentNode) {
        platform.el.remove();
      }
    }
    this.platforms = [];
    this.nextPlatformStartZ = this.initialStartZ;

    for (let index = 0; index < this.data.platformCount; index += 1) {
      this.createPlatform();
    }
  },

  getRailX(rail) {
    const centerRail = (this.data.railCount - 1) / 2;

    return (rail - centerRail) * this.data.railSpacing;
  }
});
