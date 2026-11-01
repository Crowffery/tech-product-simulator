import './style.css';
import { boot } from './ui.js';

if (localStorage.getItem('epdg-reduce-motion') === '1') {
  document.body.classList.add('reduce-motion');
}
boot();

// keep body class in sync
window.addEventListener('storage', () => {
  document.body.classList.toggle('reduce-motion', localStorage.getItem('epdg-reduce-motion') === '1');
});
