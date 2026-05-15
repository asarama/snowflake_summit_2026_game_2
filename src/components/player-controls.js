import AFRAME from 'aframe';
import { SPEED } from '../config/speed.js';
import { RAIL_UNLOCKS } from '../config/rails.js';
import { gameStateStore } from '../game-state-store.js';

const { THREE } = AFRAME;

AFRAME.registerComponent('player-controls', {
  schema: {
    startSpeed: { type: 'number', default: SPEED.start },
    minSpeed: { type: 'number', default: SPEED.min },
    maxSpeed: { type: 'number', default: SPEED.max },
    acceleration: { type: 'number', default: 7 },
    brake: { type: 'number', default: 10 },
    drag: { type: 'number', default: 1.2 },
    railCount: { type: 'int', default: 3 },
    railSpacing: { type: 'number', default: 2.4 },
    switchDuration: { type: 'number', default: 200 },
    hopHeight: { type: 'number', default: 0.8 },
    jumpDuration: { type: 'number', default: 550 },
    jumpHeight: { type: 'number', default: 1.8 },
    obstacleSelector: { type: 'string', default: '.obstacle' },
    obstacleBounceDistance: { type: 'number', default: 1.25 },
    obstacleKnockbackSpeed: { type: 'number', default: -8 },
    collectibleBoost: { type: 'number', default: 1 },
    collectibleMaxSpeed: { type: 'number', default: 100 }
  },

  init() {
    this.keys = new Set();
    this.speed = this.data.startSpeed;
    this.currentMaxSpeed = this.data.maxSpeed;
    this.currentRail = Math.floor(this.data.railCount / 2);
    this.targetRail = this.currentRail;
    this.switchElapsed = 0;
    this.switchStartX = this.getRailX(this.currentRail);
    this.switchTargetX = this.switchStartX;
    this.wasLeftPressed = false;
    this.wasRightPressed = false;
    this.wasJumpPressed = false;
    this.isJumping = false;
    this.jumpElapsed = 0;
    this.activeObstacle = null;
    this.totalDistance = 0;

    this.initialPosition = this.el.object3D.position.clone();
    this.initialRail = this.currentRail;

    this.onKeyDown = (event) => {
      if (!gameStateStore.isPlaying) return;
      this.keys.add(event.code);
    };
    this.onKeyUp = (event) => {
      if (!gameStateStore.isPlaying) return;
      this.keys.delete(event.code);
    };

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('game-end', () => {
      this.speed = 0;
      this.currentMaxSpeed = this.data.maxSpeed;
      this.keys.clear();
    });
    window.addEventListener('game-reset', () => {
      this.resetPlayer();
    });
    window.addEventListener('collectible-collected', () => {
      this.speed = Math.min(this.speed + this.data.collectibleBoost, this.data.collectibleMaxSpeed);
      this.currentMaxSpeed = Math.min(this.currentMaxSpeed + this.data.collectibleBoost, this.data.collectibleMaxSpeed);
      window.dispatchEvent(new CustomEvent('game-speed', { detail: { speed: this.speed, maxSpeed: this.currentMaxSpeed } }));
    });
  },

  remove() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  },

  resetPlayer() {
    this.speed = this.data.startSpeed;
    this.currentMaxSpeed = this.data.maxSpeed;
    this.totalDistance = 0;
    this.currentRail = this.initialRail;
    this.targetRail = this.initialRail;
    this.switchElapsed = 0;
    this.switchStartX = this.getRailX(this.currentRail);
    this.switchTargetX = this.switchStartX;
    this.activeObstacle = null;
    this.wasLeftPressed = false;
    this.wasRightPressed = false;
    this.wasJumpPressed = false;
    this.isJumping = false;
    this.jumpElapsed = 0;
    this.keys.clear();
    gameStateStore.activeRailIndices = [1];

    const position = this.el.object3D.position;
    position.copy(this.initialPosition);
    window.dispatchEvent(new CustomEvent('game-speed', { detail: { speed: this.speed, maxSpeed: this.currentMaxSpeed } }));
  },

  tick(_time, delta) {
    if (!gameStateStore.isPlaying) {
      return;
    }

    const seconds = delta / 1000;
    const position = this.el.object3D.position;
    const leftPressed = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
    const rightPressed = this.keys.has('KeyD') || this.keys.has('ArrowRight');
    const jumpPressed = this.keys.has('KeyW') || this.keys.has('ArrowUp');
    const previousZ = position.z;
    const previousSpeed = this.speed;

    this.speed += this.data.acceleration * seconds;

    this.speed = THREE.MathUtils.clamp(
      this.speed,
      this.data.obstacleKnockbackSpeed,
      this.currentMaxSpeed
    );

    if (this.speed < previousSpeed && this.currentMaxSpeed > this.data.maxSpeed) {
      this.currentMaxSpeed = this.data.maxSpeed;
    }

    window.dispatchEvent(new CustomEvent('game-speed', { detail: { speed: this.speed, maxSpeed: this.currentMaxSpeed } }));

    if (leftPressed && !this.wasLeftPressed) {
      this.switchRail(this.targetRail - 1);
    }

    if (rightPressed && !this.wasRightPressed) {
      this.switchRail(this.targetRail + 1);
    }

    if (jumpPressed && !this.wasJumpPressed) {
      this.startJump();
    }

    this.wasLeftPressed = leftPressed;
    this.wasRightPressed = rightPressed;
    this.wasJumpPressed = jumpPressed;
    position.z -= this.speed * seconds;
    this.totalDistance += Math.abs(this.speed) * seconds;

    window.dispatchEvent(new CustomEvent('game-score', {
      detail: { score: Math.floor(this.totalDistance) }
    }));

    const switchY = this.updateRailSwitch(delta);
    const jumpY = this.updateJump(delta);
    position.y = Math.max(switchY, jumpY);
    this.checkObstacleCollisions(previousZ);
    this.checkCollectibleCollisions(previousZ);
    this.checkRailUnlockCollisions(previousZ);
  },

  getRailX(rail) {
    const centerRail = (this.data.railCount - 1) / 2;

    return (rail - centerRail) * this.data.railSpacing;
  },

  switchRail(nextRail) {
    const activeRails = gameStateStore.activeRailIndices;
    const minRail = Math.min(...activeRails);
    const maxRail = Math.max(...activeRails);
    const clampedRail = THREE.MathUtils.clamp(nextRail, minRail, maxRail);

    if (clampedRail === this.targetRail || !activeRails.includes(clampedRail)) {
      return;
    }

    this.currentRail = this.targetRail;
    this.targetRail = clampedRail;
    this.switchElapsed = 0;
    this.switchStartX = this.el.object3D.position.x;
    this.switchTargetX = this.getRailX(clampedRail);
  },

  updateRailSwitch(delta) {
    const position = this.el.object3D.position;

    if (position.x === this.switchTargetX) {
      return 0;
    }

    this.switchElapsed += delta;

    const progress = THREE.MathUtils.clamp(this.switchElapsed / this.data.switchDuration, 0, 1);
    const eased = THREE.MathUtils.smoothstep(progress, 0, 1);
    const hop = Math.sin(progress * Math.PI) * this.data.hopHeight;

    position.x = THREE.MathUtils.lerp(this.switchStartX, this.switchTargetX, eased);

    if (progress === 1) {
      this.currentRail = this.targetRail;
      position.x = this.switchTargetX;
      window.dispatchEvent(new CustomEvent('rail-land', {
        detail: {
          rail: this.currentRail,
          x: position.x,
          z: position.z,
          speed: this.speed
        }
      }));
    }

    return hop;
  },

  startJump() {
    if (this.isJumping) {
      return;
    }
    this.isJumping = true;
    this.jumpElapsed = 0;
  },

  updateJump(delta) {
    if (!this.isJumping) {
      return 0;
    }

    this.jumpElapsed += delta;

    const progress = THREE.MathUtils.clamp(this.jumpElapsed / this.data.jumpDuration, 0, 1);
    const hop = Math.sin(progress * Math.PI) * this.data.jumpHeight;

    if (progress === 1) {
      this.isJumping = false;
      this.jumpElapsed = 0;
      window.dispatchEvent(new CustomEvent('rail-land', {
        detail: {
          rail: this.currentRail,
          x: this.el.object3D.position.x,
          z: this.el.object3D.position.z,
          speed: this.speed
        }
      }));
    }

    return hop;
  },

  checkObstacleCollisions(previousZ) {
    const position = this.el.object3D.position;

    if (position.y > 0.05 || !this.el.sceneEl) {
      return;
    }

    const obstacles = this.el.sceneEl.querySelectorAll(this.data.obstacleSelector);

    for (const obstacle of obstacles) {
      const obstaclePosition = obstacle.object3D.position;
      const obstacleData = obstacle.components.obstacle?.data;
      const radiusX = obstacleData?.radiusX ?? 0.65;
      const radiusZ = obstacleData?.radiusZ ?? 0.8;
      const isSameRail = Math.abs(position.x - obstaclePosition.x) <= radiusX;
      const isSafelyInFront = position.z > obstaclePosition.z + radiusZ + this.data.obstacleBounceDistance * 0.5;

      if (this.activeObstacle === obstacle && (!isSameRail || isSafelyInFront)) {
        this.activeObstacle = null;
      }

      if (this.activeObstacle === obstacle) {
        continue;
      }

      const wasInFront = previousZ >= obstaclePosition.z - radiusZ;
      const isPastBack = position.z <= obstaclePosition.z + radiusZ;
      const isOverlappingZ = Math.abs(position.z - obstaclePosition.z) <= radiusZ;
      const isColliding = isSameRail && ((wasInFront && isPastBack) || isOverlappingZ);

      if (!isColliding) {
        continue;
      }

      const impactSpeed = this.speed;

      this.activeObstacle = obstacle;
      this.speed = this.data.obstacleKnockbackSpeed;
      this.currentMaxSpeed = this.data.maxSpeed;
      position.z = obstaclePosition.z + radiusZ + this.data.obstacleBounceDistance;
      window.dispatchEvent(new CustomEvent('game-speed', { detail: { speed: this.speed, maxSpeed: this.currentMaxSpeed } }));
      window.dispatchEvent(new CustomEvent('obstacle-hit', {
        detail: {
          x: obstaclePosition.x,
          z: obstaclePosition.z,
          speed: impactSpeed
        }
      }));
      break;
    }
  },

  checkCollectibleCollisions(previousZ) {
    const position = this.el.object3D.position;

    if (!this.el.sceneEl) {
      return;
    }

    const collectibles = this.el.sceneEl.querySelectorAll('.collectible');

    for (const collectible of collectibles) {
      const collectibleWorldPos = new THREE.Vector3();
      collectible.object3D.getWorldPosition(collectibleWorldPos);
      const collectibleData = collectible.components.collectible?.data;
      const radiusX = collectibleData?.radiusX ?? 0.5;
      const radiusZ = collectibleData?.radiusZ ?? 0.5;
      const isSameRail = Math.abs(position.x - collectibleWorldPos.x) <= radiusX;
      const wasInFront = previousZ >= collectibleWorldPos.z - radiusZ;
      const isPastBack = position.z <= collectibleWorldPos.z + radiusZ;
      const isOverlappingZ = Math.abs(position.z - collectibleWorldPos.z) <= radiusZ;
      const isColliding = isSameRail && ((wasInFront && isPastBack) || isOverlappingZ);

      if (!isColliding) {
        continue;
      }

      window.dispatchEvent(new CustomEvent('collectible-collected', {
        detail: { x: collectibleWorldPos.x, y: collectibleWorldPos.y, z: collectibleWorldPos.z }
      }));
      collectible.parentNode.remove();
      break;
    }
  },

  checkRailUnlockCollisions(previousZ) {
    const position = this.el.object3D.position;

    if (!this.el.sceneEl) {
      return;
    }

    const unlocks = this.el.sceneEl.querySelectorAll('.rail-unlock');

    for (const unlock of unlocks) {
      const unlockWorldPos = new THREE.Vector3();
      unlock.object3D.getWorldPosition(unlockWorldPos);
      const unlockData = unlock.components['rail-unlock']?.data;
      const radiusX = 0.7;
      const radiusZ = 0.7;
      const isSameRail = Math.abs(position.x - unlockWorldPos.x) <= radiusX;
      const wasInFront = previousZ >= unlockWorldPos.z - radiusZ;
      const isPastBack = position.z <= unlockWorldPos.z + radiusZ;
      const isOverlappingZ = Math.abs(position.z - unlockWorldPos.z) <= radiusZ;
      const isColliding = isSameRail && ((wasInFront && isPastBack) || isOverlappingZ);

      if (!isColliding) {
        continue;
      }

      const tier = unlockData?.tier ?? 0;
      const unlockConfig = RAIL_UNLOCKS[tier];

      if (unlockConfig && !gameStateStore.activeRailIndices.includes(unlockConfig.newRail)) {
        gameStateStore.activeRailIndices = unlockConfig.activeRailIndices;
        window.dispatchEvent(new CustomEvent('rail-unlock', {
          detail: { activeRailIndices: unlockConfig.activeRailIndices, newRail: unlockConfig.newRail }
        }));
      }

      window.dispatchEvent(new CustomEvent('rail-unlock-collected', {
        detail: { tier, x: unlockWorldPos.x, z: unlockWorldPos.z }
      }));
      break;
    }
  }
});
