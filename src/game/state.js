import { SAVE_KEY, SLOTS } from './data.js';

/** @typedef {'title'|'create'|'hire'|'plan'|'logistics'|'dev'|'event'|'launch'|'score'|'sales'|'monthReport'|'bust'} Phase */

export function emptySlots() {
  return Object.fromEntries(SLOTS.map((s) => [s.id, { progress: 0, comment: '尚未动手' }]));
}

export function createNewGame(companyName) {
  return {
    version: 1,
    phase: /** @type {Phase} */ ('hire'),
    companyName,
    generation: 1,
    month: 1,
    cash: 160,
    faith: 50,
    hype: 0,
    reputation: 50,
    staff: [],
    product: null,
    supplierId: null,
    stockId: 'normal',
    slots: emptySlots(),
    monthsLeft: 4,
    eventLog: [],
    lastEventId: null,
    pendingEvent: null,
    launchPrepIds: [],
    launchBeatIndex: 0,
    launchScore: 0,
    mediaScore: 0,
    userScore: 0,
    headline: '',
    salesResult: null,
    monthDelta: 0,
    tip: '底部大按钮一路点下去就能发售；想微操再点高级。',
    bustReason: '',
  };
}

export function saveGame(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    // migrate old phases
    if (data.phase === 'supplier' || data.phase === 'stock') data.phase = 'logistics';
    if (data.phase === 'launchPrep') data.phase = 'launch';
    return data;
  } catch {
    return null;
  }
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}

export function hasSave() {
  return !!localStorage.getItem(SAVE_KEY);
}
