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
    railSpacing: { type: 'number', default: 2.4 },
    switchDuration: { type: 'number', default: 280 },
    hopHeight: { type: 'number', default: 0.8 }
  },

  init() {
    this.keys = new Set();
    this.speed = this.data.startSpeed;
    this.currentRail = 1;
    this.targetRail = 1;
    this.switchElapsed = 0;
    this.switchStartX = this.getRailX(this.currentRail);
    this.switchTargetX = this.switchStartX;
    this.wasLeftPressed = false;
    this.wasRightPressed = false;

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
    const seconds = delta / 1000;
    const position = this.el.object3D.position;
    const leftPressed = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
    const rightPressed = this.keys.has('KeyD') || this.keys.has('ArrowRight');

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) {
      this.speed += this.data.acceleration * seconds;
    } else if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) {
      this.speed -= this.data.brake * seconds;
    } else {
      this.speed -= this.data.drag * seconds;
    }

    this.speed = THREE.MathUtils.clamp(this.speed, this.data.minSpeed, this.data.maxSpeed);
    window.dispatchEvent(new CustomEvent('game-speed', { detail: { speed: this.speed } }));

    if (leftPressed && !this.wasLeftPressed) {
      this.switchRail(0);
    }

    if (rightPressed && !this.wasRightPressed) {
      this.switchRail(1);
    }

    this.wasLeftPressed = leftPressed;
    this.wasRightPressed = rightPressed;
    position.z -= this.speed * seconds;

    if (position.z < -48) {
      position.z = 18;
    }

    this.updateRailSwitch(delta);
  },

  getRailX(rail) {
    return rail === 0 ? -this.data.railSpacing / 2 : this.data.railSpacing / 2;
  },

  switchRail(nextRail) {
    if (nextRail === this.targetRail) {
      return;
    }

    this.currentRail = this.targetRail;
    this.targetRail = nextRail;
    this.switchElapsed = 0;
    this.switchStartX = this.el.object3D.position.x;
    this.switchTargetX = this.getRailX(nextRail);
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
    }
  }
});
