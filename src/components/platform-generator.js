import AFRAME from 'aframe';

const PLATFORM_LENGTH = 100;
const RAIL_SPACING = 2.4;
const OBSTACLES = [
  { rail: 0, z: -8 },
  { rail: 1, z: -20 },
  { rail: 2, z: -32 }
];
const COLLECTIBLES = [
  { rail: 0, z: -12 },
  { rail: 2, z: -24 },
  { rail: 1, z: -36 }
];

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

    for (let index = 0; index < this.data.platformCount; index += 1) {
      this.createPlatform();
    }
  },

  tick() {
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

    platform.classList.add('platform');
    platform.setAttribute('position', '0 0 0');
    this.addGround(platform, centerZ);
    this.addRails(platform, centerZ);
    this.addObstacles(platform, startZ);
    this.addCollectibles(platform, startZ);
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
    for (let rail = 0; rail < this.data.railCount; rail += 1) {
      const railEntity = document.createElement('a-box');

      railEntity.setAttribute('position', { x: this.getRailX(rail), y: 0, z: centerZ });
      railEntity.setAttribute('width', 0.16);
      railEntity.setAttribute('height', 0.16);
      railEntity.setAttribute('depth', this.data.platformLength);
      railEntity.setAttribute('material', 'color: #8be9fd; emissive: #35d6ff; emissiveIntensity: 0.7; metalness: 0.65; roughness: 0.2');
      platform.appendChild(railEntity);
    }
  },

  addObstacles(platform, startZ) {
    for (const obstacleConfig of OBSTACLES) {
      const obstacle = document.createElement('a-box');

      obstacle.setAttribute('obstacle', '');
      obstacle.setAttribute('position', {
        x: this.getRailX(obstacleConfig.rail),
        y: 0.45,
        z: startZ + obstacleConfig.z
      });
      obstacle.setAttribute('width', 0.9);
      obstacle.setAttribute('height', 0.9);
      obstacle.setAttribute('depth', 0.8);
      obstacle.setAttribute('material', 'color: #ff5555; emissive: #7f1d1d; emissiveIntensity: 0.45; metalness: 0.2; roughness: 0.35');
      platform.appendChild(obstacle);
    }
  },

  addCollectibles(platform, startZ) {
    for (const collectibleConfig of COLLECTIBLES) {
      const collectibleGroup = document.createElement('a-entity');
      const collisionBox = document.createElement('a-box');
      const collectible = document.createElement('a-octahedron');

      collectibleGroup.classList.add('collectible-group');
      collectibleGroup.setAttribute('position', {
        x: this.getRailX(collectibleConfig.rail),
        y: 1.2,
        z: startZ + collectibleConfig.z
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

  getRailX(rail) {
    const centerRail = (this.data.railCount - 1) / 2;

    return (rail - centerRail) * this.data.railSpacing;
  }
});
