import AFRAME from 'aframe';

const { THREE } = AFRAME;

AFRAME.registerComponent('player-controls', {
  schema: {
    speed: { type: 'number', default: 4 }
  },

  init() {
    this.keys = new Set();
    this.direction = new THREE.Vector3();
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();

    this.onKeyDown = (event) => this.keys.add(event.code);
    this.onKeyUp = (event) => this.keys.delete(event.code);

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  },

  remove() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  },

  tick(_time, delta) {
    this.direction.set(0, 0, 0);

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) this.direction.z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) this.direction.z += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) this.direction.x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) this.direction.x += 1;

    if (this.direction.lengthSq() === 0) {
      return;
    }

    this.direction.normalize();
    this.el.object3D.getWorldDirection(this.forward);
    this.forward.y = 0;
    this.forward.normalize();
    this.right.crossVectors(this.forward, new THREE.Vector3(0, 1, 0)).normalize();

    const distance = this.data.speed * (delta / 1000);
    const position = this.el.object3D.position;

    position.addScaledVector(this.forward, -this.direction.z * distance);
    position.addScaledVector(this.right, this.direction.x * distance);
  }
});
