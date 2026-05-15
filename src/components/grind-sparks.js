import AFRAME from 'aframe';

const { THREE } = AFRAME;

AFRAME.registerComponent('grind-sparks', {
  schema: {
    count: { type: 'number', default: 18 },
    spread: { type: 'number', default: 0.45 },
    lifetime: { type: 'number', default: 420 },
    railY: { type: 'number', default: 0.05 }
  },

  init() {
    this.sparks = [];
    this.spawnCursor = 0;
    this.spawnTimer = 0;

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
  },

  tick(_time, delta) {
    this.spawnTimer += delta;

    while (this.spawnTimer > 28) {
      this.spawnTimer -= 28;
      this.spawnSpark();
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
  },

  spawnSpark() {
    const spark = this.sparks[this.spawnCursor];
    const side = Math.random() > 0.5 ? 1 : -1;

    spark.age = 0;
    spark.entity.object3D.visible = true;
    spark.entity.object3D.position.set(
      (Math.random() - 0.5) * this.data.spread,
      this.data.railY,
      0.35 + Math.random() * 0.35
    );
    spark.entity.object3D.scale.setScalar(1);
    spark.velocity.set(
      side * (0.9 + Math.random() * 1.5),
      0.8 + Math.random() * 1.1,
      1.8 + Math.random() * 2.2
    );

    this.spawnCursor = (this.spawnCursor + 1) % this.sparks.length;
  }
});
