/**
 * 形态卡片：企划与设计台共用（v0.12 A5 形态前移）
 */
import { formTimeline } from '../game/forms.js';

/**
 * @param {number|object} monthOrState 游戏月或完整 state（含 mode）
 * @param {string} currentId
 * @param {string} act  data-act，如 plan-form
 */
export function formCardsHtml(monthOrState, currentId, act = 'plan-form') {
  const { forms } = formTimeline(monthOrState);
  // 只列出现在能做的形态，再预告下一种（不把整条时间轴的锁都摆出来）
  const open = forms.filter((f) => f.unlocked);
  const next = forms.filter((f) => !f.unlocked).sort((a, b) => (a.unlockMonth || 99) - (b.unlockMonth || 99))[0];
  const cur = forms.find((f) => f.id === currentId);
  return `<div class="form-cards chips" style="flex-wrap:wrap;gap:8px">
    ${open
      .map((f) => {
        const on = f.id === currentId ? 'on' : '';
        return `<button type="button" class="chip ${on}" data-act="${act}" data-id="${f.id}" title="${String(f.desc || f.tag || '').replace(/"/g, '&quot;')}">
          <span>${f.icon || ''} ${f.name}</span><small>${f.tag || ''}</small>
        </button>`;
      })
      .join('')}
  </div>
  ${cur?.desc ? `<p class="muted" style="margin:.35rem 0 0;font-size:12px">${cur.desc}</p>` : ''}
  ${next ? `<p class="muted" style="margin:.2rem 0 .6rem;font-size:12px;opacity:.8">🔒 下一种：${next.icon || ''} ${next.name}，约第 ${next.unlockMonth} 个月出现</p>` : ''}`;
}
