import { lsGet, lsSet, lsRemove } from './storage.js';
import { SAVE_KEY, SLOTS } from './data.js';


export function emptySlots() {
  return Object.fromEntries(SLOTS.map((s) => [s.id, { progress: 0, comment: '尚未动手' }]));
}

export function createNewGame(companyName, chipSeries = '蜂鸟') {
  return {
    version: 2,
    phase: 'plan',
    companyName,
    generation: 1,
    month: 1,
    cash: 160,
    faith: 50,
    hype: 0,
    reputation: 50,
    depts: { design: 1, rnd: 1, supply: 1, pr: 1 },
    rp: 0,
    lastRp: 0,
    unlocked: [],
    product: null,
    supplierId: null,
    stockId: 'normal',
    slots: emptySlots(),
    monthsLeft: 4,
    eventLog: [],
    lastEventId: null,
    pendingEvent: null,
    launchScore: 0,
    launchFlop: false,
    mediaScore: 0,
    userScore: 0,
    headline: '',
    salesResult: null,
    monthDelta: 0,
    bustReason: '',
    design: null,
    designDraft: null,
    models: [],
    wowResult: null,
    lastThumb: '',
    archived: false,
    notes: {},
    overstocks: 0,
    lastExp: 0,
    review: null,
    onSale: [],
    oldPolicy: 'keep',
    office: 1,
    tailTotal: 0,
    chip: { series: chipSeries, gen: 1, history: [{ gen: 1, bench: 720000, month: 1 }], research: null },
    tutorial: true,
    tutSeen: {},
  };
}

export function saveGame(state) {
  lsSet(SAVE_KEY, JSON.stringify(state));
}

export function loadGame() {
  try {
    const raw = lsGet(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 2) return null;
    // migrate old phases
    if (data.phase === 'supplier' || data.phase === 'stock') data.phase = 'logistics';
    if (data.phase === 'launchPrep') data.phase = 'launch';
    data.models ||= [];
    data.notes ||= {};
    data.onSale ||= [];
    data.office ||= 1;
    data.chip ||= { series: '蜂鸟', gen: 1, history: [{ gen: 1, bench: 720000, month: 1 }], research: null };
    data.tutSeen ||= {};
    if (data.design === undefined) data.design = null;
    if (data.designDraft === undefined) data.designDraft = null;
    return data;
  } catch {
    return null;
  }
}

export function clearSave() {
  lsRemove(SAVE_KEY);
}

export function hasSave() {
  return !!lsGet(SAVE_KEY);
}
