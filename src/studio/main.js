import { createStudio } from './studio.js';

document.body.classList.add('studio-page');
createStudio(document.getElementById('app'), { mode: 'page' });
