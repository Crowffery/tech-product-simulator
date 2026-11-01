import { lsGet } from './game/storage.js';
import './style.css';
import { boot } from './ui.js';

if (lsGet('epdg-reduce-motion') === '1') {
  document.body.classList.add('reduce-motion');
}
boot();

// keep body class in sync
window.addEventListener('storage', () => {
  document.body.classList.toggle('reduce-motion', lsGet('epdg-reduce-motion') === '1');
});
