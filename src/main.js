import 'aframe';
import './styles.css';
import './components/player-controls.js';
import './components/grind-sparks.js';
import './components/speed-camera.js';
import './components/collectible.js';
import './components/obstacle.js';
import './components/platform-generator.js';
import './components/game-state.js';

const app = document.querySelector('#app');

app.innerHTML = `
  <main class="hud">
    <section class="panel">
      <p class="eyebrow">A-Frame Playground</p>
      <h1>Snowflake Summit Game Prototype</h1>
      <p>Grind the rails with A to hop left and D to hop right. Press W to jump over obstacles.</p>
      <p class="score">Score: <span id="score">0</span></p>
      <p class="score">Speed: <span id="speed">5.0</span> / Max: <span id="max-speed">30</span></p>
    </section>
  </main>

  <div class="timer hidden" id="timer">60</div>

  <div class="overlay active" id="start-screen">
    <div class="overlay-content">
      <h2>Snowflake Summit</h2>
      <p>Grind the rails, avoid obstacles, and collect crystals!</p>
      <label class="toggle-row">
        <input type="checkbox" id="skip-countdown">
        Skip countdown
      </label>
      <button class="start-button" id="start-button">Start Game</button>
    </div>
  </div>

  <div class="overlay countdown-overlay hidden" id="countdown-screen">
    <div class="overlay-content">
      <div class="countdown" id="countdown">3</div>
    </div>
  </div>

  <div class="overlay hidden" id="game-over-screen">
    <div class="overlay-content">
      <h2>Game Over</h2>
      <p>Final Score: <span id="final-score">0</span></p>
      <button class="start-button" id="restart-button">Play Again</button>
    </div>
  </div>

  <a-scene
    background="color: #07111f"
    renderer="antialias: true; colorManagement: true"
    platform-generator="player: #rig; platformCount: 3; platformLength: 36; railCount: 3; railSpacing: 2.4; startZ: 18"
    game-state="gameDuration: 60"
  >
    <a-assets>
      <a-mixin id="crystalMaterial" material="color: #8be9fd; emissive: #35d6ff; emissiveIntensity: 0.7; metalness: 0.1; roughness: 0.25"></a-mixin>
    </a-assets>

    <a-entity id="rig" position="0 0 14" player-controls="startSpeed: 5; railCount: 3; railSpacing: 2.4" grind-sparks>
      <a-box position="0 0.75 0" width="0.7" height="1.1" depth="0.7" material="color: #ffb86c; metalness: 0.15; roughness: 0.45"></a-box>
      <a-cone position="0 1.55 0" radius-bottom="0.32" radius-top="0.18" height="0.45" material="color: #f8f8f2; metalness: 0.1; roughness: 0.35"></a-cone>
      <a-camera position="0 3.4 3.5" rotation="-28 0 0" wasd-controls="enabled: false" look-controls="enabled: false" speed-camera>
        <a-cursor raycaster="objects: .collectible" material="color: #ffffff; shader: flat"></a-cursor>
      </a-camera>
    </a-entity>

    <a-entity light="type: ambient; intensity: 0.5; color: #b9d9ff"></a-entity>
    <a-entity light="type: directional; intensity: 1.2; color: #ffffff" position="-3 6 4"></a-entity>
    <a-entity light="type: point; intensity: 1.6; color: #66e8ff; distance: 18" position="0 4 0"></a-entity>

  </a-scene>
`;

const skipCountdownCheckbox = document.getElementById('skip-countdown');
if (skipCountdownCheckbox) {
  skipCountdownCheckbox.checked = localStorage.getItem('skipCountdown') === 'true';
  skipCountdownCheckbox.addEventListener('change', () => {
    localStorage.setItem('skipCountdown', skipCountdownCheckbox.checked);
  });
}

window.addEventListener('game-score', (event) => {
  const score = document.querySelector('#score');
  score.textContent = event.detail.score;
});

window.addEventListener('game-speed', (event) => {
  const speed = document.querySelector('#speed');
  const maxSpeed = document.querySelector('#max-speed');
  speed.textContent = event.detail.speed.toFixed(1);
  maxSpeed.textContent = event.detail.maxSpeed?.toFixed(1) ?? event.detail.maxSpeed;
});

