import { gameStateStore } from '../game-state-store.js';
import { saveScore, getTopScores, getPersonalBest } from '../db.js';

AFRAME.registerComponent('game-state', {
  schema: {
    gameDuration: { type: 'number', default: 60 }
  },

  init() {
    this.state = 'start';
    this.timeRemaining = this.data.gameDuration;
    this.score = 0;
    this.maxSpeed = 0;

    this.startScreen = document.getElementById('start-screen');
    this.countdownScreen = document.getElementById('countdown-screen');
    this.gameOverScreen = document.getElementById('game-over-screen');
    this.pauseMenuScreen = document.getElementById('pause-menu-screen');
    this.unlockMessageScreen = document.getElementById('unlock-message-screen');
    this.countdownDisplay = document.getElementById('countdown');
    this.timerDisplay = document.getElementById('timer');
    this.finalScoreDisplay = document.getElementById('final-score');
    this.finalMaxSpeedDisplay = document.getElementById('final-max-speed');
    this.unlockMessageDisplay = document.getElementById('unlock-message');
    this.unlockCountdownDisplay = document.getElementById('unlock-countdown');
    this.leaderboardBody = document.getElementById('leaderboard-body');
    this.saveScoreForm = document.getElementById('save-score-form');
    this.emailInput = document.getElementById('email-input');
    this.saveScoreButton = document.getElementById('save-score-button');
    this.personalBestDisplay = document.getElementById('personal-best');

    this.startButton = document.getElementById('start-button');
    this.restartButton = document.getElementById('restart-button');
    this.resumeButton = document.getElementById('resume-button');
    this.exitMenuButton = document.getElementById('exit-menu-button');

    this.startButton?.addEventListener('click', () => this.startGame());
    this.restartButton?.addEventListener('click', () => this.restartGame());
    this.resumeButton?.addEventListener('click', () => this.resumeGame());
    this.exitMenuButton?.addEventListener('click', () => this.exitToMainMenu());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.togglePauseMenu();
      }
    });

    this.mainMenu = document.getElementById('main-menu');
    this.enginesPanel = document.getElementById('engines-panel');
    this.settingsPanel = document.getElementById('settings-panel');
    this.enginesButton = document.getElementById('engines-button');
    this.settingsButton = document.getElementById('settings-button');

    this.enginesButton?.addEventListener('click', () => this.showPanel('engines'));
    this.settingsButton?.addEventListener('click', () => this.showPanel('settings'));
    document.querySelectorAll('.menu-back').forEach(btn => {
      btn.addEventListener('click', () => this.showPanel('main'));
    });

    this.saveScoreButton?.addEventListener('click', () => this.handleSaveScore());
    this.emailInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleSaveScore();
    });

    window.addEventListener('game-score', (event) => {
      this.score = event.detail.score;
    });

    window.addEventListener('game-speed', (event) => {
      const speed = event.detail.speed;
      if (speed > this.maxSpeed) {
        this.maxSpeed = speed;
      }
    });

    window.addEventListener('rail-unlock-collected', (event) => {
      const tier = event.detail.tier;
      const message = tier === 0 ? 'DuckDB query path unlocked! Press left or right to switch engines.' : 'Firebolt engine unlocked!';
      this.showUnlockMessage(message);
    });
  },

  startGame() {
    const skipCountdown = document.getElementById('skip-countdown')?.checked;

    this.startScreen.classList.remove('active');
    this.startScreen.classList.add('hidden');

    if (skipCountdown) {
      this.beginGameplay();
      return;
    }

    this.state = 'countdown';
    this.countdownScreen.classList.remove('hidden');
    this.countdownScreen.classList.add('active');

    let countdown = 3;
    this.countdownDisplay.textContent = countdown;

    const countdownInterval = setInterval(() => {
      countdown -= 1;

      if (countdown <= 0) {
        clearInterval(countdownInterval);
        this.beginGameplay();
      } else {
        this.countdownDisplay.textContent = countdown;
      }
    }, 1000);
  },

  beginGameplay() {
    this.state = 'playing';
    this.countdownScreen.classList.remove('active');
    this.countdownScreen.classList.add('hidden');
    this.timerDisplay.classList.remove('hidden');
    gameStateStore.isPlaying = true;

    window.dispatchEvent(new CustomEvent('game-start'));
    this.startTimer();
  },

  startTimer() {
    this.gameInterval = setInterval(() => {
      this.timeRemaining -= 1;
      this.timerDisplay.textContent = this.timeRemaining;

      if (this.timeRemaining <= 0) {
        this.endGame();
      }
    }, 1000);
  },

  async endGame() {
    this.state = 'gameover';
    gameStateStore.isPlaying = false;
    clearInterval(this.gameInterval);

    this.timerDisplay.classList.add('hidden');
    this.gameOverScreen.classList.remove('hidden');
    this.gameOverScreen.classList.add('active');
    this.finalScoreDisplay.textContent = this.score;
    this.finalMaxSpeedDisplay.textContent = this.maxSpeed.toFixed(1);

    if (this.saveScoreForm) {
      this.saveScoreForm.classList.remove('hidden');
    }
    if (this.personalBestDisplay) {
      this.personalBestDisplay.classList.add('hidden');
      this.personalBestDisplay.textContent = '';
    }

    await this.renderLeaderboard();

    window.dispatchEvent(new CustomEvent('game-end'));
  },

  restartGame() {
    this.state = 'start';
    gameStateStore.reset();
    this.timeRemaining = this.data.gameDuration;
    this.score = 0;
    this.maxSpeed = 0;
    this.timerDisplay.textContent = this.data.gameDuration;

    this.gameOverScreen.classList.remove('active');
    this.gameOverScreen.classList.add('hidden');
    this.startScreen.classList.remove('hidden');
    this.startScreen.classList.add('active');
    this.showPanel('main');

    window.dispatchEvent(new CustomEvent('game-reset'));
  },

  async handleSaveScore() {
    const email = this.emailInput?.value.trim();
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }

    this.saveScoreButton.disabled = true;
    this.saveScoreButton.textContent = 'Saving...';

    try {
      await saveScore(email, this.score, this.maxSpeed);
      if (this.saveScoreForm) {
        this.saveScoreForm.classList.add('hidden');
      }
      const personalBest = await getPersonalBest(email);
      if (personalBest && this.personalBestDisplay) {
        this.personalBestDisplay.textContent = `Personal Best: ${personalBest.bestScore}m / ${personalBest.bestMaxSpeed} max speed`;
        this.personalBestDisplay.classList.remove('hidden');
      }
      await this.renderLeaderboard();
    } catch (err) {
      console.error('Failed to save score:', err);
      alert('Failed to save score. See console for details.');
    } finally {
      this.saveScoreButton.disabled = false;
      this.saveScoreButton.textContent = 'Save Score';
    }
  },

  async renderLeaderboard() {
    if (!this.leaderboardBody) return;

    try {
      const scores = await getTopScores(10);
      this.leaderboardBody.innerHTML = '';

      if (scores.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="4" class="leaderboard-empty">No scores yet. Be the first!</td>`;
        this.leaderboardBody.appendChild(row);
        return;
      }

      scores.forEach((entry, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${index + 1}</td>
          <td>${entry.email}</td>
          <td>${entry.score}</td>
          <td>${entry.maxSpeed}</td>
        `;
        this.leaderboardBody.appendChild(row);
      });
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    }
  },

  showUnlockMessage(message) {
    gameStateStore.isPlaying = false;
    clearInterval(this.gameInterval);
    clearInterval(this.unlockCountdownInterval);

    this.unlockMessageDisplay.textContent = message;
    let countdown = 3;
    this.unlockCountdownDisplay.textContent = countdown;
    this.unlockMessageScreen.classList.remove('hidden');
    this.unlockMessageScreen.classList.add('active');

    this.unlockCountdownInterval = setInterval(() => {
      countdown -= 1;
      if (countdown <= 0) {
        clearInterval(this.unlockCountdownInterval);
        this.unlockMessageScreen.classList.remove('active');
        this.unlockMessageScreen.classList.add('hidden');
        gameStateStore.isPlaying = true;
        this.startTimer();
      } else {
        this.unlockCountdownDisplay.textContent = countdown;
      }
    }, 1000);
  },

  togglePauseMenu() {
    if (this.state === 'paused') {
      this.resumeGame();
      return;
    }
    if (this.state !== 'playing') return;

    this.state = 'paused';
    gameStateStore.isPlaying = false;
    clearInterval(this.gameInterval);

    this.pauseMenuScreen.classList.remove('hidden');
    this.pauseMenuScreen.classList.add('active');
  },

  resumeGame() {
    if (this.state !== 'paused') return;

    this.pauseMenuScreen.classList.remove('active');
    this.pauseMenuScreen.classList.add('hidden');

    this.state = 'playing';
    gameStateStore.isPlaying = true;
    this.startTimer();
  },

  exitToMainMenu() {
    if (this.state !== 'paused') return;

    this.pauseMenuScreen.classList.remove('active');
    this.pauseMenuScreen.classList.add('hidden');
    this.restartGame();
  },

  showPanel(panel) {
    this.mainMenu?.classList.toggle('hidden', panel !== 'main');
    this.enginesPanel?.classList.toggle('hidden', panel !== 'engines');
    this.settingsPanel?.classList.toggle('hidden', panel !== 'settings');
  },

  remove() {
    clearInterval(this.gameInterval);
    clearInterval(this.unlockCountdownInterval);
  }
});
