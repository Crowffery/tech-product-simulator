/**
 * 形态卡片：企划与设计台共用（v0.12 A5 形态前移）
 */
import { formTimeline } from '../game/forms.js';

/**
 * @param {number} month
 * @param {string} currentId
 * @param {string} act  data-act，如 plan-form
 */
export function formCardsHtml(month, currentId, act = 'plan-form') {
  const { forms } = formTimeline(month);
  return `<div class="form-cards chips" style="flex-wrap:wrap;gap:8px">
    ${forms
      .map((f) => {
        const locked = !f.unlocked;
        const on = f.id === currentId ? 'on' : '';
        const tip = locked ? f.unlockText || f.hint || '未解锁' : f.desc || f.tag || '';
        return `<button type="button" class="chip ${on}" data-act="${act}" data-id="${f.id}" ${locked ? 'disabled' : ''} title="${String(tip).replace(/"/g, '&quot;')}">
          <span>${f.icon || ''} ${f.name}</span>
          ${locked ? `<small>🔒 ${f.unlockMonth}月</small>` : `<small>${f.tag || ''}</small>`}
        </button>`;
      })
      .join('')}
  </div>
  <p class="muted" style="margin:.35rem 0 .6rem;font-size:12px;opacity:.8">先定形态，再定定位与卖点——避免「旗舰影像」写在老年机上。</p>`;
}
