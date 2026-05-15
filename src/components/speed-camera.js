import AFRAME from 'aframe';
import { SPEED } from '../config/speed.js';
import { gameStateStore } from '../game-state-store.js';

const { THREE } = AFRAME;

AFRAME.registerComponent('speed-camera', {
  schema: {
    minSpeed: { type: 'number', default: SPEED.min },
    maxSpeed: { type: 'number', default: SPEED.max },
    baseY: { type: 'number', default: 3.4 },
    maxY: { type: 'number', default: 4.2 },
    baseZ: { type: 'number', default: 3.5 },
    maxZ: { type: 'number', default: 6.8 },
    baseFov: { type: 'number', default: 80 },
    maxFov: { type: 'number', default: 105 },
    mediumSpeed: { type: 'number', default: SPEED.mediumTier },
    highSpeed: { type: 'number', default: SPEED.highTier },
    veryHighSpeed: { type: 'number', default: SPEED.veryHighTier },
    extremeSpeed: { type: 'number', default: SPEED.extremeTier },
    boomShakeDuration: { type: 'number', default: 420 },
    boomShakeStrength: { type: 'number', default: 0.18 },
    obstacleShakeDuration: { type: 'number', default: 360 },
    obstacleShakeStrength: { type: 'number', default: 0.28 },
    topSpeedShakeStrength: { type: 'number', default: 0.055 },
    speedShakeMultiplier: { type: 'number', default: 3.5 },
    easing: { type: 'number', default: 15 }
  },

  init() {
    this.speed = this.data.minSpeed;
    this.speedTier = 0;
    this.boomShakeAge = this.data.boomShakeDuration;
    this.obstacleShakeAge = this.data.obstacleShakeDuration;

    this.onSpeed = (event) => {
      this.speed = event.detail.speed;
    };

    this.onObstacleHit = (event) => {
      this.obstacleShakeAge = 0;
      this.lastImpactSpeed = event.detail?.speed || this.data.mediumSpeed;
    };

    window.addEventListener('game-speed', this.onSpeed);
    window.addEventListener('obstacle-hit', this.onObstacleHit);
    window.addEventListener('game-reset', () => {
      this.speed = this.data.minSpeed;
      this.speedTier = 0;
      this.boomShakeAge = this.data.boomShakeDuration;
      this.obstacleShakeAge = this.data.obstacleShakeDuration;
      this.lastImpactSpeed = this.data.mediumSpeed;
    });
  },

  remove() {
    window.removeEventListener('game-speed', this.onSpeed);
    window.removeEventListener('obstacle-hit', this.onObstacleHit);
  },

  tick(_time, delta) {
    if (!gameStateStore.isPlaying) return;

    const nextTier = this.getSpeedTier();

    if (nextTier > this.speedTier) {
      this.boomShakeAge = 0;
    }

    this.speedTier = nextTier;

    const progress = THREE.MathUtils.clamp(
      (this.speed - this.data.minSpeed) / (this.data.maxSpeed - this.data.minSpeed),
      0,
      1
    );
    const eased = THREE.MathUtils.smoothstep(progress, 0, 1);
    const position = this.el.object3D.position;
    const targetY = THREE.MathUtils.lerp(this.data.baseY, this.data.maxY, eased);
    const targetZ = THREE.MathUtils.lerp(this.data.baseZ, this.data.maxZ, eased);
    const targetFov = THREE.MathUtils.lerp(this.data.baseFov, this.data.maxFov, eased);
    const alpha = 1 - Math.exp(-this.data.easing * (delta / 1000));
    const shake = this.getShakeOffset(delta);

    position.x = shake.x;
    position.y = THREE.MathUtils.lerp(position.y, targetY, alpha) + shake.y;
    position.z = THREE.MathUtils.lerp(position.z, targetZ, alpha);

    const camera = this.el.getObject3D('camera');

    if (camera) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, alpha);
      camera.updateProjectionMatrix();
    }
  },

  getSpeedTier() {
    if (this.speed >= this.data.extremeSpeed) {
      return 4;
    }

    if (this.speed >= this.data.veryHighSpeed) {
      return 3;
    }

    if (this.speed >= this.data.highSpeed) {
      return 2;
    }

    if (this.speed >= this.data.mediumSpeed) {
      return 1;
    }

    return 0;
  },

  getShakeOffset(delta) {
    this.boomShakeAge += delta;
    this.obstacleShakeAge += delta;

    const boomProgress = THREE.MathUtils.clamp(this.boomShakeAge / this.data.boomShakeDuration, 0, 1);
    const boomStrength = this.data.boomShakeStrength * (1 + this.speedTier * 0.35) * (1 - boomProgress);
    const obstacleProgress = THREE.MathUtils.clamp(this.obstacleShakeAge / this.data.obstacleShakeDuration, 0, 1);
    const impactFactor = Math.max(1, (this.lastImpactSpeed || this.data.mediumSpeed) / this.data.mediumSpeed);
    const obstacleStrength = this.data.obstacleShakeStrength * impactFactor * (1 - obstacleProgress);
    const speedProgress = THREE.MathUtils.clamp((this.speed - this.data.minSpeed) / (this.data.maxSpeed - this.data.minSpeed), 0, 1);
    const topSpeedStrength = this.data.topSpeedShakeStrength * (speedProgress * this.data.speedShakeMultiplier);
    const strength = boomStrength + obstacleStrength + topSpeedStrength;

    return {
      x: (Math.random() - 0.5) * strength,
      y: (Math.random() - 0.5) * strength
    };
  }
});
