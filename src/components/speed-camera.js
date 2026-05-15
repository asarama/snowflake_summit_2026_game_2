import AFRAME from 'aframe';

const { THREE } = AFRAME;

AFRAME.registerComponent('speed-camera', {
  schema: {
    minSpeed: { type: 'number', default: 1.5 },
    maxSpeed: { type: 'number', default: 13 },
    baseY: { type: 'number', default: 3.4 },
    maxY: { type: 'number', default: 4.2 },
    baseZ: { type: 'number', default: 3.5 },
    maxZ: { type: 'number', default: 6.8 },
    baseFov: { type: 'number', default: 80 },
    maxFov: { type: 'number', default: 105 },
    mediumSpeed: { type: 'number', default: 5 },
    highSpeed: { type: 'number', default: 9 },
    boomShakeDuration: { type: 'number', default: 420 },
    boomShakeStrength: { type: 'number', default: 0.18 },
    topSpeedShakeStrength: { type: 'number', default: 0.035 },
    easing: { type: 'number', default: 5 }
  },

  init() {
    this.speed = this.data.minSpeed;
    this.speedTier = 0;
    this.boomShakeAge = this.data.boomShakeDuration;

    this.onSpeed = (event) => {
      this.speed = event.detail.speed;
    };

    window.addEventListener('game-speed', this.onSpeed);
  },

  remove() {
    window.removeEventListener('game-speed', this.onSpeed);
  },

  tick(_time, delta) {
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

    const boomProgress = THREE.MathUtils.clamp(this.boomShakeAge / this.data.boomShakeDuration, 0, 1);
    const boomStrength = this.data.boomShakeStrength * (1 - boomProgress);
    const topSpeedProgress = THREE.MathUtils.clamp((this.speed - this.data.maxSpeed * 0.9) / (this.data.maxSpeed * 0.1), 0, 1);
    const topSpeedStrength = this.data.topSpeedShakeStrength * topSpeedProgress;
    const strength = boomStrength + topSpeedStrength;

    return {
      x: (Math.random() - 0.5) * strength,
      y: (Math.random() - 0.5) * strength
    };
  }
});
