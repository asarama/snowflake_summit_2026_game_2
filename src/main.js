import 'aframe';
import './styles.css';
import './components/player-controls.js';
import './components/grind-sparks.js';
import './components/collectible.js';
import './components/spawner.js';

const app = document.querySelector('#app');

app.innerHTML = `
  <main class="hud">
    <section class="panel">
      <p class="eyebrow">A-Frame Playground</p>
      <h1>Snowflake Summit Game Prototype</h1>
      <p>Grind the rails with W to accelerate, S to brake, A for the left rail, and D for the right rail.</p>
      <p class="score">Score: <span id="score">0</span></p>
      <p class="score">Speed: <span id="speed">5.0</span></p>
    </section>
  </main>

  <a-scene
    background="color: #07111f"
    renderer="antialias: true; colorManagement: true"
    spawner="target: #collectibles; count: 8; radius: 7"
  >
    <a-assets>
      <a-mixin id="crystalMaterial" material="color: #8be9fd; emissive: #35d6ff; emissiveIntensity: 0.7; metalness: 0.1; roughness: 0.25"></a-mixin>
    </a-assets>

    <a-entity id="rig" position="1.2 0 14" player-controls="startSpeed: 5; railSpacing: 2.4" grind-sparks>
      <a-box position="0 0.75 0" width="0.7" height="1.1" depth="0.7" material="color: #ffb86c; metalness: 0.15; roughness: 0.45"></a-box>
      <a-cone position="0 1.55 0" radius-bottom="0.32" radius-top="0.18" height="0.45" material="color: #f8f8f2; metalness: 0.1; roughness: 0.35"></a-cone>
      <a-camera position="0 4.4 6.5" rotation="-28 0 0" wasd-controls-enabled="false" look-controls="enabled: false">
        <a-cursor raycaster="objects: .collectible" material="color: #ffffff; shader: flat"></a-cursor>
      </a-camera>
    </a-entity>

    <a-entity light="type: ambient; intensity: 0.5; color: #b9d9ff"></a-entity>
    <a-entity light="type: directional; intensity: 1.2; color: #ffffff" position="-3 6 4"></a-entity>
    <a-entity light="type: point; intensity: 1.6; color: #66e8ff; distance: 18" position="0 4 0"></a-entity>

    <a-plane position="0 -0.18 -15" rotation="-90 0 0" width="16" height="80" material="color: #0d2038; roughness: 0.9"></a-plane>
    <a-box position="-1.2 0 -15" width="0.16" height="0.16" depth="74" material="color: #8be9fd; emissive: #35d6ff; emissiveIntensity: 0.7; metalness: 0.65; roughness: 0.2"></a-box>
    <a-box position="1.2 0 -15" width="0.16" height="0.16" depth="74" material="color: #8be9fd; emissive: #35d6ff; emissiveIntensity: 0.7; metalness: 0.65; roughness: 0.2"></a-box>
    <a-box position="0 -0.12 -15" width="3.2" height="0.08" depth="74" material="color: #14365c; roughness: 0.85"></a-box>
    <a-entity position="0 0 -15">
      <a-box position="0 -0.4 -28" width="3.3" height="0.35" depth="0.18" material="color: #1f6feb; metalness: 0.2; roughness: 0.35"></a-box>
      <a-box position="0 -0.4 -14" width="3.3" height="0.35" depth="0.18" material="color: #1f6feb; metalness: 0.2; roughness: 0.35"></a-box>
      <a-box position="0 -0.4 0" width="3.3" height="0.35" depth="0.18" material="color: #1f6feb; metalness: 0.2; roughness: 0.35"></a-box>
      <a-box position="0 -0.4 14" width="3.3" height="0.35" depth="0.18" material="color: #1f6feb; metalness: 0.2; roughness: 0.35"></a-box>
      <a-box position="0 -0.4 28" width="3.3" height="0.35" depth="0.18" material="color: #1f6feb; metalness: 0.2; roughness: 0.35"></a-box>
    </a-entity>

    <a-entity id="collectibles"></a-entity>

    <a-text value="Rail grind prototype" align="center" color="#ffffff" position="0 2.2 8" scale="1.2 1.2 1.2"></a-text>
  </a-scene>
`;

window.addEventListener('game-score', (event) => {
  const score = document.querySelector('#score');
  score.textContent = event.detail.score;
});

window.addEventListener('game-speed', (event) => {
  const speed = document.querySelector('#speed');
  speed.textContent = event.detail.speed.toFixed(1);
});
