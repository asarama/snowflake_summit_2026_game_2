import 'aframe';
import './styles.css';
import './components/player-controls.js';
import './components/grind-sparks.js';
import './components/speed-camera.js';
import './components/collectible.js';
import './components/obstacle.js';
import './components/platform-generator.js';
import './components/rail-unlock.js';
import './components/game-state.js';
import splashImage from './assets/main_splash_screen.jpeg';

const app = document.querySelector('#app');

app.innerHTML = `
  <main class="hud">
    <section class="panel">
      <h1>Query Surfer</h1>
      <p>You are a stream of queries flying through the data lake. Collect crystals to increase your speed and avoid obstacles! Press w or up-arrow to jump. Make it far enough and you'll unlock new engines.</p>
      <p class="score">Score: <span id="score">0</span></p>
      <p class="score">Speed: <span id="speed">5.0</span> / Max: <span id="max-speed">30</span></p>
    </section>
  </main>

  <div class="timer hidden" id="timer">60</div>

  <div class="overlay active" id="start-screen">
    <div class="splash-left">
      <img src="${splashImage}" alt="Query Surfer" class="splash-hero" />
      <div class="particle-stream" aria-hidden="true">
        ${Array.from({ length: 20 }, (_, i) => {
          const top = Math.random() * 100;
          const delay = Math.random() * 8;
          const duration = 4 + Math.random() * 6;
          const size = 1 + Math.random() * 2;
          const opacity = 0.2 + Math.random() * 0.5;
          return `<div class="particle" style="top:${top}%;animation-delay:${delay}s;animation-duration:${duration}s;width:${size}px;height:${size}px;opacity:${opacity}"></div>`;
        }).join('')}
      </div>
    </div>
    <div class="splash-right">
      <div class="splash-brand">
        <h2 class="splash-title">Query Surfer</h2>
        <p class="splash-tagline">Avoid obstacles, collect crystals, and unlock new engines with Greybeam!</p>
      </div>
      <nav class="menu-nav" id="main-menu">
        <button class="menu-button" id="start-button">FLY</button>
        <button class="menu-button" id="engines-button">ENGINES</button>
        <button class="menu-button" id="settings-button">SETTINGS</button>
      </nav>
      <div class="menu-panel hidden" id="engines-panel">
        <h3>Engines</h3>
        <p class="engine-item active">DuckDB — Active</p>
        <p class="engine-item locked">Firebolt — Collect power-ups to unlock</p>
        <button class="menu-button menu-back">Back</button>
      </div>
      <div class="menu-panel hidden" id="settings-panel">
        <h3>Settings</h3>
        <label class="toggle-row">
          <input type="checkbox" id="skip-countdown">
          Skip countdown
        </label>
        <button class="menu-button menu-back">Back</button>
      </div>
    </div>
  </div>

  <div class="overlay countdown-overlay hidden" id="countdown-screen">
    <div class="overlay-content">
      <div class="countdown" id="countdown">3</div>
    </div>
  </div>

  <div class="overlay message-overlay hidden" id="unlock-message-screen">
    <div class="overlay-content">
      <div class="unlock-header">Greybeam Powerup!</div>
      <div class="unlock-message" id="unlock-message"></div>
      <div class="unlock-countdown" id="unlock-countdown">3</div>
    </div>
  </div>

  <div class="overlay hidden" id="game-over-screen">
    <div class="overlay-content game-over-content">
      <h2>Game Over</h2>
      <p>Final Score: <span id="final-score">0</span>m</p>
      <p>Max Speed: <span id="final-max-speed">0</span></p>
      <div class="save-score-form" id="save-score-form">
        <input type="email" id="email-input" placeholder="Enter your email" class="email-input" />
        <button class="start-button" id="save-score-button">Save Score</button>
      </div>
      <p class="personal-best hidden" id="personal-best"></p>
      <div class="leaderboard">
        <h3>Leaderboard</h3>
        <table class="leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Email</th>
              <th>Score</th>
              <th>Max Speed</th>
            </tr>
          </thead>
          <tbody id="leaderboard-body"></tbody>
        </table>
      </div>
      <button class="start-button" id="restart-button">Play Again</button>
    </div>
  </div>

  <a-scene
    background="color: #07111f"
    renderer="antialias: true; colorManagement: true"
    platform-generator="player: #rig; platformCount: 3; platformLength: 36; railCount: 3; railSpacing: 2.4; startZ: 18"
    rail-unlock-spawner="player: #rig;"
    game-state="gameDuration: 60"
  >
    <a-assets>
      <a-mixin id="crystalMaterial" material="color: #8be9fd; emissive: #35d6ff; emissiveIntensity: 0.7; metalness: 0.1; roughness: 0.25"></a-mixin>
    </a-assets>

    <a-entity id="rig" position="0 0 14" player-controls="startSpeed: 5; railCount: 3; railSpacing: 2.4" grind-sparks>
      <!-- UFO saucer -->
      <a-cylinder position="0 0.85 0" radius="0.6" height="0.18" segments-radial="16"
        material="color: #c0c0c0; metalness: 0.5; roughness: 0.3"></a-cylinder>
      <!-- UFO dome -->
      <a-sphere position="0 1.05 0" radius="0.3" scale="1 0.65 1"
        material="color: #8be9fd; emissive: #35d6ff; emissiveIntensity: 0.3; metalness: 0.1; roughness: 0.1; opacity: 0.75; transparent: true"></a-sphere>
      <!-- UFO bottom glow ring -->
      <a-torus position="0 0.75 0" radius="0.45" rotation="90 0 0" radius-tubular="0.04" arc="360"
        material="color: #50fa7b; emissive: #50fa7b; emissiveIntensity: 0.8"></a-torus>
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

