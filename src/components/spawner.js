import AFRAME from 'aframe';

AFRAME.registerComponent('spawner', {
  schema: {
    target: { type: 'selector' },
    count: { type: 'number', default: 8 },
    radius: { type: 'number', default: 7 }
  },

  init() {
    const target = this.data.target;

    if (!target) {
      return;
    }

    for (let index = 0; index < this.data.count; index += 1) {
      const angle = (index / this.data.count) * Math.PI * 2;
      const distance = 2.5 + Math.random() * (this.data.radius - 2.5);
      const crystal = document.createElement('a-octahedron');

      crystal.classList.add('collectible');
      crystal.setAttribute('collectible', 'points: 1');
      crystal.setAttribute('mixin', 'crystalMaterial');
      crystal.setAttribute('radius', '0.35');
      crystal.setAttribute('position', {
        x: Math.cos(angle) * distance,
        y: 1 + Math.random() * 1.5,
        z: Math.sin(angle) * distance
      });

      target.appendChild(crystal);
    }
  }
});
