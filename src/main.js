// main.js — bootstrap.
import { Game } from './game.js';
import { UI } from './ui.js';
import { Audio } from './audio.js';

function boot() {
  const canvas = document.getElementById('game');
  const ui = new UI();
  const game = new Game(canvas, ui);
  ui.bind(game);
  game.start();
  window.__game = game; // exposed for debugging / automated smoke tests

  // Hide the title screen on first interaction; coach new players once.
  const title = document.getElementById('title');
  let firstRun = false;
  try { firstRun = !localStorage.getItem('ganada_tutorial_done'); } catch (e) { /* ignore */ }
  const dismiss = () => {
    Audio.unlock();
    title.classList.add('hidden');
    window.removeEventListener('pointerdown', dismiss);
    game.begin();
    if (firstRun) game.startTutorial();
  };
  document.getElementById('startBtn').addEventListener('click', dismiss);

  // Register service worker for offline / installable play (optional).
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
