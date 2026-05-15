import AFRAME from 'aframe';

AFRAME.registerComponent('obstacle', {
  schema: {
    radiusX: { type: 'number', default: 0.65 },
    radiusZ: { type: 'number', default: 0.8 }
  },

  init() {
    this.el.classList.add('obstacle');
  }
});
