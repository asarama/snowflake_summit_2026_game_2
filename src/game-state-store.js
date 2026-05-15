let playing = false;

export const gameStateStore = {
  get isPlaying() {
    return playing;
  },
  set isPlaying(value) {
    playing = value;
  },
  reset() {
    playing = false;
  }
};
