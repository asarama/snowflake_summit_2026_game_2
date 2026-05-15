let playing = false;
let activeRailIndices = [1];

export const gameStateStore = {
  get isPlaying() {
    return playing;
  },
  set isPlaying(value) {
    playing = value;
  },
  get activeRailIndices() {
    return activeRailIndices;
  },
  set activeRailIndices(value) {
    activeRailIndices = value;
  },
  reset() {
    playing = false;
    activeRailIndices = [1];
  }
};
