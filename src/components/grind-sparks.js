import AFRAME from 'aframe';
import { SPEED } from '../config/speed.js';

const { THREE } = AFRAME;

AFRAME.registerComponent('grind-sparks', {
  schema: {
    count: { type: 'number', default: 32 },
    spread: { type: 'number', default: 0.45 },
    lifetime: { type: 'number', default: 420 },
    railY: { type: 'number', default: 0.05 },
    minSparkSpeed: { type: 'number', default: 0.5 },
    mediumSpeed: { type: 'number', default: SPEED.mediumTier },
    highSpeed: { type: 'number', default: SPEED.highTier }
  },

  init() {
    this.sparks = [];
    this.spawnCursor = 0;
    this.spawnTimer = 0;
    this.speed = 0;
    this.sparkTier = 0;
    this.boomAge = 1000;
    this.boomLifetime = 520;
    this.impactAge = 1000;
    this.impactLifetime = 260;
    this.sparkRoot = document.createElement('a-entity');
    this.sparkRoot.setAttribute('id', 'spark-root');
    this.el.sceneEl.appendChild(this.sparkRoot);

    this.onSpeed = (event) => {
      this.speed = event.detail.speed;
    };

    this.onRailLand = (event) => this.triggerRailImpact(event.detail);
    this.onObstacleHit = (event) => this.triggerObstacleImpact(event.detail);

    window.addEventListener('game-speed', this.onSpeed);
    window.addEventListener('rail-land', this.onRailLand);
    window.addEventListener('obstacle-hit', this.onObstacleHit);

    for (let index = 0; index < this.data.count; index += 1) {
      const spark = document.createElement('a-sphere');
      spark.setAttribute('radius', '0.035');
      spark.setAttribute('material', 'color: #ffd166; emissive: #ff8c00; emissiveIntensity: 1.4; shader: standard');
      spark.object3D.visible = false;
      this.sparkRoot.appendChild(spark);

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
    this.sparkRoot.appendChild(this.boom);

    this.impact = document.createElement('a-torus');
    this.impact.setAttribute('position', '0 0.08 0');
    this.impact.setAttribute('rotation', '90 0 0');
    this.impact.setAttribute('radius', '0.12');
    this.impact.setAttribute('radius-tubular', '0.012');
    this.impact.setAttribute('material', 'color: #ffd166; emissive: #ff8c00; emissiveIntensity: 1.8; transparent: true; opacity: 0.9');
    this.impact.object3D.visible = false;
    this.sparkRoot.appendChild(this.impact);
  },

  remove() {
    window.removeEventListener('game-speed', this.onSpeed);
    window.removeEventListener('rail-land', this.onRailLand);
    window.removeEventListener('obstacle-hit', this.onObstacleHit);
    this.sparkRoot.remove();
  },

  tick(_time, delta) {
    const nextTier = this.getSparkTier();

    if (nextTier > this.sparkTier) {
      this.triggerSonicBoom();
    }

    this.sparkTier = nextTier;
    if (this.isOnRail() && nextTier >= 0) {
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
    this.updateRailImpact(delta);
  },

  getSparkTier() {
    const speed = Math.abs(this.speed);

    if (speed < this.data.minSparkSpeed) {
      return -1;
    }

    if (speed >= this.data.highSpeed) {
      return 2;
    }

    if (speed >= this.data.mediumSpeed) {
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
    const railPosition = this.getRailPosition();

    spark.age = 0;
    spark.entity.object3D.visible = true;
    spark.entity.setAttribute('material', this.getSparkMaterial(tier));
    spark.entity.object3D.position.set(
      railPosition.x + (Math.random() - 0.5) * this.data.spread,
      this.data.railY,
      railPosition.z + 0.35 + Math.random() * 0.35
    );
    spark.entity.object3D.scale.setScalar(1);
    spark.velocity.set(
      side * (0.9 + Math.random() * 1.5) * force,
      (0.8 + Math.random() * 1.1) * force,
      (1.8 + Math.random() * 2.2) * force
    );

    this.spawnCursor = (this.spawnCursor + 1) % this.sparks.length;
  },

  spawnImpactSpark(position, tier) {
    const spark = this.sparks[this.spawnCursor];
    const angle = Math.random() * Math.PI * 2;
    const force = 1.3 + tier * 0.35;
    const horizontalForce = 1.8 + Math.random() * 1.5;

    spark.age = 0;
    spark.entity.object3D.visible = true;
    spark.entity.setAttribute('material', this.getSparkMaterial(tier));
    spark.entity.object3D.position.set(
      position.x + (Math.random() - 0.5) * 0.18,
      this.data.railY,
      position.z + (Math.random() - 0.5) * 0.18
    );
    spark.entity.object3D.scale.setScalar(1.35);
    spark.velocity.set(
      Math.cos(angle) * horizontalForce * force,
      (1.2 + Math.random() * 1.2) * force,
      Math.sin(angle) * horizontalForce * force
    );

    this.spawnCursor = (this.spawnCursor + 1) % this.sparks.length;
  },

  getRailPosition() {
    const position = this.el.object3D.position;

    return {
      x: position.x,
      z: position.z
    };
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
    const railPosition = this.getRailPosition();

    this.boomAge = 0;
    this.boom.object3D.visible = true;
    this.boom.object3D.position.set(railPosition.x, 0.55, railPosition.z + 0.15);
    this.boom.object3D.scale.setScalar(0.2);
  },

  triggerRailImpact(detail) {
    const tier = Math.max(this.getSparkTier(), 0);
    const position = {
      x: detail.x,
      z: detail.z
    };
    const burstCount = 8 + tier * 4;

    this.impactAge = 0;
    this.impact.object3D.visible = true;
    this.impact.object3D.position.set(position.x, 0.08, position.z);
    this.impact.object3D.scale.setScalar(0.25);

    for (let index = 0; index < burstCount; index += 1) {
      this.spawnImpactSpark(position, tier);
    }
  },

  triggerObstacleImpact(detail) {
    const tier = Math.max(this.getSparkTier(), 0);
    const position = {
      x: detail.x,
      z: detail.z + 0.45
    };
    const burstCount = 14 + tier * 5;

    this.impactAge = 0;
    this.impact.object3D.visible = true;
    this.impact.object3D.position.set(position.x, 0.18, position.z);
    this.impact.object3D.scale.setScalar(0.35);

    for (let index = 0; index < burstCount; index += 1) {
      this.spawnImpactSpark(position, tier);
    }
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
  },

  updateRailImpact(delta) {
    if (this.impactAge >= this.impactLifetime) {
      this.impact.object3D.visible = false;
      return;
    }

    this.impactAge += delta;

    const progress = THREE.MathUtils.clamp(this.impactAge / this.impactLifetime, 0, 1);
    const scale = THREE.MathUtils.lerp(0.25, 2.1, THREE.MathUtils.smoothstep(progress, 0, 1));
    const opacity = 1 - progress;

    this.impact.object3D.scale.setScalar(scale);
    this.impact.setAttribute('material', 'opacity', opacity);
    this.impact.object3D.visible = progress < 1;
  }
});
