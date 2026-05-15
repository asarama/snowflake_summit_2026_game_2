import 'aframe';
import './styles.css';
import './components/player-controls.js';
import './components/collectible.js';
import './components/spawner.js';

const app = document.querySelector('#app');

app.innerHTML = `
  <main class="hud">
    <section class="panel">
      <p class="eyebrow">A-Frame Playground</p>
      <h1>Snowflake Summit Game Prototype</h1>
      <p>Move with WASD, look with the mouse, and collect the glowing crystals.</p>
      <p class="score">Score: <span id="score">0</span></p>
    </section>
  </main>

  <a-scene
    background="color: #07111f"
    renderer="antialias: true; colorManagement: true"
    spawner="target: #collectibles; count: 12; radius: 9"
  >
    <a-assets>
      <a-mixin id="crystalMaterial" material="color: #8be9fd; emissive: #35d6ff; emissiveIntensity: 0.7; metalness: 0.1; roughness: 0.25"></a-mixin>
    </a-assets>

    <a-entity id="rig" position="0 0 7" player-controls="speed: 5">
      <a-box position="0 0.6 0" width="0.8" height="1.2" depth="0.8" material="color: #ffb86c; metalness: 0.15; roughness: 0.45"></a-box>
      <a-camera position="0 3.2 6" rotation="-24 0 0" wasd-controls-enabled="false" look-controls="enabled: false">
        <a-cursor raycaster="objects: .collectible" material="color: #ffffff; shader: flat"></a-cursor>
      </a-camera>
    </a-entity>

    <a-entity light="type: ambient; intensity: 0.5; color: #b9d9ff"></a-entity>
    <a-entity light="type: directional; intensity: 1.2; color: #ffffff" position="-3 6 4"></a-entity>
    <a-entity light="type: point; intensity: 1.6; color: #66e8ff; distance: 18" position="0 4 0"></a-entity>

    <a-ring position="0 0.02 0" rotation="-90 0 0" radius-inner="2" radius-outer="10" material="color: #14365c; roughness: 0.9"></a-ring>
    <a-cylinder position="0 -0.03 0" radius="10" height="0.08" material="color: #0d2038"></a-cylinder>
    <a-torus position="0 0.15 0" rotation="90 0 0" radius="10" radius-tubular="0.03" material="color: #53d8fb; emissive: #2ec7f0; emissiveIntensity: 0.6"></a-torus>

    <a-entity id="collectibles"></a-entity>

    <a-box position="0 1 -4" width="3" height="2" depth="0.25" material="color: #1f6feb; metalness: 0.2; roughness: 0.35"></a-box>
    <a-text value="Build your game here" align="center" color="#ffffff" position="0 2.35 -4.16" scale="1.3 1.3 1.3"></a-text>
  </a-scene>
`;

window.addEventListener('game-score', (event) => {
  const score = document.querySelector('#score');
  score.textContent = event.detail.score;
});
