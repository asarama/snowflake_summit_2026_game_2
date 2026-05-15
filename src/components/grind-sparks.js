import AFRAME from 'aframe';

const { THREE } = AFRAME;

AFRAME.registerComponent('grind-sparks', {
  schema: {
    count: { type: 'number', default: 32 },
    spread: { type: 'number', default: 0.45 },
    lifetime: { type: 'number', default: 420 },
    railY: { type: 'number', default: 0.05 },
    mediumSpeed: { type: 'number', default: 5 },
    highSpeed: { type: 'number', default: 9 }
  },

  init() {
    this.sparks = [];
    this.spawnCursor = 0;
    this.spawnTimer = 0;
    this.speed = 0;
    this.sparkTier = 0;
    this.boomAge = 1000;
    this.boomLifetime = 520;

    this.onSpeed = (event) => {
      this.speed = event.detail.speed;
    };

    window.addEventListener('game-speed', this.onSpeed);

    for (let index = 0; index < this.data.count; index += 1) {
      const spark = document.createElement('a-sphere');
      spark.setAttribute('radius', '0.035');
      spark.setAttribute('material', 'color: #ffd166; emissive: #ff8c00; emissiveIntensity: 1.4; shader: standard');
      spark.object3D.visible = false;
      this.el.appendChild(spark);

      this.sparks.push({
        entity: spark,
        age: this.data.lifetime,
        velocity: new THREE.Vector3()
      });
    }

    this.boom = document.createElement('a-torus');
    this.boom.setAttribute('position', '0 0.55 0.15');
    this.boom.setAttribute('rotation', '90 0 0');
    this.boom.setAttribute('radius', '0.08');
    this.boom.setAttribute('radius-tubular', '0.018');
    this.boom.setAttribute('material', 'color: #ffffff; emissive: #8be9fd; emissiveIntensity: 1.6; transparent: true; opacity: 0.85');
    this.boom.object3D.visible = false;
    this.el.appendChild(this.boom);
  },

  remove() {
    window.removeEventListener('game-speed', this.onSpeed);
  },

  tick(_time, delta) {
    const nextTier = this.getSparkTier();

    if (nextTier > this.sparkTier) {
      this.triggerSonicBoom();
    }

    this.sparkTier = nextTier;
    if (this.isOnRail()) {
      this.spawnTimer += delta;

      const spawnInterval = this.getSpawnInterval();

      while (this.spawnTimer > spawnInterval) {
        this.spawnTimer -= spawnInterval;
        this.spawnSpark(nextTier);
      }
    } else {
      this.spawnTimer = 0;
    }

    this.sparks.forEach((spark) => {
      if (spark.age >= this.data.lifetime) {
        spark.entity.object3D.visible = false;
        return;
      }

      spark.age += delta;

      const seconds = delta / 1000;
      const position = spark.entity.object3D.position;
      position.addScaledVector(spark.velocity, seconds);
      spark.velocity.y -= 4.5 * seconds;

      const progress = spark.age / this.data.lifetime;
      const scale = 1 - progress;
      spark.entity.object3D.scale.setScalar(Math.max(scale, 0.08));
      spark.entity.object3D.visible = progress < 1;
    });

    this.updateSonicBoom(delta);
  },

  getSparkTier() {
    if (this.speed >= this.data.highSpeed) {
      return 2;
    }

    if (this.speed >= this.data.mediumSpeed) {
      return 1;
    }

    return 0;
  },

  isOnRail() {
    return this.el.object3D.position.y <= 0.02;
  },

  getSpawnInterval() {
    if (this.sparkTier === 2) {
      return 9;
    }

    if (this.sparkTier === 1) {
      return 28;
    }

    return 90;
  },

  spawnSpark(tier) {
    const spark = this.sparks[this.spawnCursor];
    const side = Math.random() > 0.5 ? 1 : -1;
    const force = 0.7 + tier * 0.45;

    spark.age = 0;
    spark.entity.object3D.visible = true;
    spark.entity.setAttribute('material', this.getSparkMaterial(tier));
    spark.entity.object3D.position.set(
      (Math.random() - 0.5) * this.data.spread,
      this.data.railY,
      0.35 + Math.random() * 0.35
    );
    spark.entity.object3D.scale.setScalar(1);
    spark.velocity.set(
      side * (0.9 + Math.random() * 1.5) * force,
      (0.8 + Math.random() * 1.1) * force,
      (1.8 + Math.random() * 2.2) * force
    );

    this.spawnCursor = (this.spawnCursor + 1) % this.sparks.length;
  },

  getSparkMaterial(tier) {
    if (tier === 2) {
      const purple = Math.random() > 0.35;
      const color = purple ? '#bd93f9' : '#ff79c6';
      const emissive = purple ? '#8b5cf6' : '#ff2ea6';

      return `color: ${color}; emissive: ${emissive}; emissiveIntensity: 1.9; shader: standard`;
    }

    if (tier === 1 && Math.random() > 0.55) {
      return 'color: #ff5555; emissive: #ff2d00; emissiveIntensity: 1.7; shader: standard';
    }

    return 'color: #ffd166; emissive: #ff8c00; emissiveIntensity: 1.4; shader: standard';
  },

  triggerSonicBoom() {
    this.boomAge = 0;
    this.boom.object3D.visible = true;
    this.boom.object3D.scale.setScalar(0.2);
  },

  updateSonicBoom(delta) {
    if (this.boomAge >= this.boomLifetime) {
      this.boom.object3D.visible = false;
      return;
    }

    this.boomAge += delta;

    const progress = THREE.MathUtils.clamp(this.boomAge / this.boomLifetime, 0, 1);
    const scale = THREE.MathUtils.lerp(0.2, 6, THREE.MathUtils.smoothstep(progress, 0, 1));
    const opacity = 1 - progress;

    this.boom.object3D.scale.setScalar(scale);
    this.boom.setAttribute('material', 'opacity', opacity);
    this.boom.object3D.visible = progress < 1;
  }
});
