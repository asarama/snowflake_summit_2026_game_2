import AFRAME from 'aframe';
import { gameStateStore } from '../game-state-store.js';
import { RAIL_UNLOCKS } from '../config/rails.js';

const RAIL_SPACING = 2.4;

AFRAME.registerComponent('rail-unlock', {
  schema: {
    tier: { type: 'int', default: 0 }
  }
});

AFRAME.registerComponent('rail-unlock-spawner', {
  schema: {
    player: { type: 'selector' },
    spawnDistance: { type: 'number', default: 500 },
    railSpacing: { type: 'number', default: RAIL_SPACING }
  },

  init() {
    this.nextTier = 0;
    this.tierState = 'ready';
    this.entities = [];

    window.addEventListener('rail-unlock-collected', () => {
      this.nextTier += 1;
      this.tierState = 'ready';
      for (const entity of this.entities) {
        if (entity.parentNode) {
          entity.remove();
        }
      }
      this.entities = [];
    });

    window.addEventListener('game-reset', () => {
      this.nextTier = 0;
      this.tierState = 'ready';
      for (const entity of this.entities) {
        if (entity.parentNode) {
          entity.remove();
        }
      }
      this.entities = [];
    });
  },

  tick() {
    if (!gameStateStore.isPlaying) {
      return;
    }

    if (this.nextTier >= RAIL_UNLOCKS.length) {
      return;
    }

    if (this.tierState === 'spawned') {
      this.checkRespawn();
      return;
    }

    if (this.tierState !== 'ready') {
      return;
    }

    const playerZ = this.data.player.object3D.position.z;
    const spawnZ = playerZ - this.data.spawnDistance;
    this.spawnTier(this.nextTier, spawnZ);
    this.tierState = 'spawned';
  },

  checkRespawn() {
    if (this.entities.length === 0) {
      return;
    }

    const playerZ = this.data.player.object3D.position.z;
    const allPassed = this.entities.every((entity) => {
      const entityZ = entity.object3D.position.z;
      return playerZ < entityZ - 5;
    });

    if (!allPassed) {
      return;
    }

    for (const entity of this.entities) {
      if (entity.parentNode) {
        entity.remove();
      }
    }
    this.entities = [];
    this.tierState = 'ready';
  },

  spawnTier(tier, z) {
    const activeRails = gameStateStore.activeRailIndices;
    const tierColor = tier === 0 ? '#ffff00' : '#ff0000';

    for (const rail of activeRails) {
      const x = (rail - 1) * this.data.railSpacing;
      const entity = document.createElement('a-entity');

      const shape = document.createElement('a-icosahedron');
      shape.setAttribute('radius', 0.45);
      shape.setAttribute('material', `color: ${tierColor}; emissive: ${tierColor}; emissiveIntensity: 1.2; metalness: 0.1; roughness: 0.25`);
      shape.setAttribute('animation', 'property: rotation; to: 0 360 0; loop: true; dur: 2000; easing: linear');

      const collisionBox = document.createElement('a-box');
      collisionBox.classList.add('rail-unlock');
      collisionBox.setAttribute('rail-unlock', { tier });
      collisionBox.setAttribute('width', 1.2);
      collisionBox.setAttribute('height', 1.2);
      collisionBox.setAttribute('depth', 1.2);
      collisionBox.setAttribute('visible', 'false');

      entity.appendChild(shape);
      entity.appendChild(collisionBox);
      entity.setAttribute('position', { x, y: 1.5, z });

      this.el.appendChild(entity);
      this.entities.push(entity);
    }
  }
});
