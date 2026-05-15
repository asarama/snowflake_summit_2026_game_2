import AFRAME from 'aframe';
import { SPEED } from '../config/speed.js';

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
    switchDuration: { type: 'number', default: 280 },
    hopHeight: { type: 'number', default: 0.8 },
    obstacleSelector: { type: 'string', default: '.obstacle' },
    obstacleBounceDistance: { type: 'number', default: 1.25 },
    obstacleKnockbackSpeed: { type: 'number', default: -2 },
    collectibleBoost: { type: 'number', default: 8 },
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
    this.activeObstacle = null;
    this.isPlaying = false;
    this.totalDistance = 0;

    this.initialPosition = this.el.object3D.position.clone();
    this.initialRail = this.currentRail;

    this.onKeyDown = (event) => {
      if (!this.isPlaying) return;
      this.keys.add(event.code);
    };
    this.onKeyUp = (event) => {
      if (!this.isPlaying) return;
      this.keys.delete(event.code);
    };

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('game-start', () => {
      this.isPlaying = true;
      this.keys.clear();
    });
    window.addEventListener('game-end', () => {
      this.isPlaying = false;
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
    this.isPlaying = false;
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
    this.keys.clear();

    const position = this.el.object3D.position;
    position.copy(this.initialPosition);
    window.dispatchEvent(new CustomEvent('game-speed', { detail: { speed: this.speed, maxSpeed: this.currentMaxSpeed } }));
  },

  tick(_time, delta) {
    if (!this.isPlaying) {
      return;
    }

    const seconds = delta / 1000;
    const position = this.el.object3D.position;
    const leftPressed = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
    const rightPressed = this.keys.has('KeyD') || this.keys.has('ArrowRight');
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

    this.wasLeftPressed = leftPressed;
    this.wasRightPressed = rightPressed;
    position.z -= this.speed * seconds;
    this.totalDistance += Math.abs(this.speed) * seconds;

    window.dispatchEvent(new CustomEvent('game-score', {
      detail: { score: Math.floor(this.totalDistance) }
    }));

    this.updateRailSwitch(delta);
    this.checkObstacleCollisions(previousZ);
    this.checkCollectibleCollisions(previousZ);
  },

  getRailX(rail) {
    const centerRail = (this.data.railCount - 1) / 2;

    return (rail - centerRail) * this.data.railSpacing;
  },

  switchRail(nextRail) {
    const clampedRail = THREE.MathUtils.clamp(nextRail, 0, this.data.railCount - 1);

    if (clampedRail === this.targetRail) {
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
      position.y = 0;
      return;
    }

    this.switchElapsed += delta;

    const progress = THREE.MathUtils.clamp(this.switchElapsed / this.data.switchDuration, 0, 1);
    const eased = THREE.MathUtils.smoothstep(progress, 0, 1);
    const hop = Math.sin(progress * Math.PI) * this.data.hopHeight;

    position.x = THREE.MathUtils.lerp(this.switchStartX, this.switchTargetX, eased);
    position.y = hop;

    if (progress === 1) {
      this.currentRail = this.targetRail;
      position.x = this.switchTargetX;
      position.y = 0;
      window.dispatchEvent(new CustomEvent('rail-land', {
        detail: {
          rail: this.currentRail,
          x: position.x,
          z: position.z,
          speed: this.speed
        }
      }));
    }
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
  }
});
