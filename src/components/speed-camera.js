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
    easing: { type: 'number', default: 5 }
  },

  init() {
    this.speed = this.data.minSpeed;

    this.onSpeed = (event) => {
      this.speed = event.detail.speed;
    };

    window.addEventListener('game-speed', this.onSpeed);
  },

  remove() {
    window.removeEventListener('game-speed', this.onSpeed);
  },

  tick(_time, delta) {
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

    position.y = THREE.MathUtils.lerp(position.y, targetY, alpha);
    position.z = THREE.MathUtils.lerp(position.z, targetZ, alpha);

    const camera = this.el.getObject3D('camera');

    if (camera) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, alpha);
      camera.updateProjectionMatrix();
    }
  }
});
