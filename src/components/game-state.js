import { gameStateStore } from '../game-state-store.js';

AFRAME.registerComponent('game-state', {
  schema: {
    gameDuration: { type: 'number', default: 60 }
  },

  init() {
    this.state = 'start';
    this.timeRemaining = this.data.gameDuration;
    this.score = 0;

    this.startScreen = document.getElementById('start-screen');
    this.countdownScreen = document.getElementById('countdown-screen');
    this.gameOverScreen = document.getElementById('game-over-screen');
    this.countdownDisplay = document.getElementById('countdown');
    this.timerDisplay = document.getElementById('timer');
    this.finalScoreDisplay = document.getElementById('final-score');

    this.startButton = document.getElementById('start-button');
    this.restartButton = document.getElementById('restart-button');

    this.startButton?.addEventListener('click', () => this.startGame());
    this.restartButton?.addEventListener('click', () => this.restartGame());

    window.addEventListener('game-score', (event) => {
      this.score = event.detail.score;
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

    this.gameInterval = setInterval(() => {
      this.timeRemaining -= 1;
      this.timerDisplay.textContent = this.timeRemaining;

      if (this.timeRemaining <= 0) {
        this.endGame();
      }
    }, 1000);
  },

  endGame() {
    this.state = 'gameover';
    gameStateStore.isPlaying = false;
    clearInterval(this.gameInterval);

    this.timerDisplay.classList.add('hidden');
    this.gameOverScreen.classList.remove('hidden');
    this.gameOverScreen.classList.add('active');
    this.finalScoreDisplay.textContent = this.score;

    window.dispatchEvent(new CustomEvent('game-end'));
  },

  restartGame() {
    this.state = 'start';
    gameStateStore.reset();
    this.timeRemaining = this.data.gameDuration;
    this.score = 0;
    this.timerDisplay.textContent = this.data.gameDuration;

    this.gameOverScreen.classList.remove('active');
    this.gameOverScreen.classList.add('hidden');
    this.startScreen.classList.remove('hidden');
    this.startScreen.classList.add('active');

    window.dispatchEvent(new CustomEvent('game-reset'));
  },

  remove() {
    clearInterval(this.gameInterval);
  }
});
