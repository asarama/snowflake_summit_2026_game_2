import AFRAME from 'aframe';

AFRAME.registerComponent('collectible', {
  schema: {
    points: { type: 'number', default: 1 },
    radiusX: { type: 'number', default: 0.5 },
    radiusZ: { type: 'number', default: 0.5 }
  },

  init() {
    this.baseY = this.el.object3D.position.y;
    this.el.classList.add('collectible');
    this.onClick = () => this.collect();
    this.el.addEventListener('click', this.onClick);
  },

  remove() {
    this.el.removeEventListener('click', this.onClick);
  },

  tick(time) {
    this.el.object3D.rotation.y += 0.018;
    this.el.object3D.position.y = this.baseY + Math.sin(time / 350) * 0.16;
  },

  collect() {
    const position = this.el.object3D.position;
    window.dispatchEvent(new CustomEvent('collectible-collected', {
      detail: { x: position.x, y: position.y, z: position.z }
    }));
    this.el.parentNode.parentNode.removeChild(this.el.parentNode);
  }
});
