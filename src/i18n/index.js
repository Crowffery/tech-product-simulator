/**
 * 多语言底座（中文 / English）。
 *
 * 原则（见 docs/I18N_PLAN.md）：
 *  - 游戏不暴露具体是哪个市场：运营商、卖场、媒体、展会全部是虚构的通用名字；
 *  - 梗和口吻跟着语言走：中文版用中文语境的梗，英文版用英文语境的梗，同一个「梗位」各取各的；
 *  - 金额在游戏里统一存「点数」，显示时按语言换货币：中文 ¥，英文 $（汇率只是显示层）。
 *
 * 用法：
 *  tr('中文', 'English')       行内双语（便于逐步迁移）
 *  t('key', { n: 3 })         字典键（复用多的短语）
 *  meme('greet.redefine')     按语言取梗（数组时随机一条）
 *  price(3999)                按语言显示售价：¥3,999 / $599
 *  bigMoney(250)              大额：¥2.5 亿 / $38M
 */
const KEY = 'epdg-lang';

function detect() {
  try {
    const q = new URLSearchParams(globalThis.location?.search || '').get('lang');
    if (q === 'en' || q === 'zh') return q;
    const saved = globalThis.localStorage?.getItem(KEY);
    if (saved === 'en' || saved === 'zh') return saved;
  } catch {}
  return 'zh';
}

let lang = detect();
export const LANGS = [
  { id: 'zh', name: '中文' },
  { id: 'en', name: 'English' },
];
export const getLang = () => lang;
export function setLang(next) {
  if (next !== 'zh' && next !== 'en') return;
  lang = next;
  try {
    globalThis.localStorage?.setItem(KEY, next);
  } catch {}
}

/** 行内双语：英文缺失时回落中文 */
export const tr = (zh, en) => (lang === 'en' && en != null ? en : zh);

const DICT = { zh: {}, en: {} };
/** 注册一批字典（各模块注册自己的词条） */
export function register(zhMap, enMap) {
  Object.assign(DICT.zh, zhMap);
  Object.assign(DICT.en, enMap);
}
export function t(key, vars = {}) {
  const raw = DICT[lang][key] ?? DICT.zh[key] ?? key;
  return String(raw).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

/** 梗包：同一个梗位，各语言各自的说法 */
const MEMES = { zh: {}, en: {} };
export function registerMemes(zhMap, enMap) {
  Object.assign(MEMES.zh, zhMap);
  Object.assign(MEMES.en, enMap);
}
export function meme(key) {
  const v = MEMES[lang][key] ?? MEMES.zh[key];
  return Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : v ?? '';
}

/** 显示用货币：英文按约 1/6.5 换算，100 以上取「x9」尾数 */
const FX = { zh: { sym: '¥', k: 1 }, en: { sym: '$', k: 1 / 6.5 } };
export function price(v) {
  const f = FX[lang];
  let n = Math.round(Number(v) * f.k);
  if (lang === 'en' && n >= 100) n = Math.round(n / 10) * 10 - 1;
  return `${f.sym}${n.toLocaleString('en-US')}`;
}

/** 大额（游戏内 1 点 = ¥100 万）：中文 ¥2.5 亿 / 英文 $38M */
export function bigMoney(points, { sign = false } = {}) {
  const n = Math.round(Number(points) || 0);
  const s = n < 0 ? '-' : sign && n > 0 ? '+' : '';
  const a = Math.abs(n);
  if (lang === 'en') {
    const usd = (a * 1e6) / 6.5;
    if (usd >= 1e9) return `${s}$${(usd / 1e9).toFixed(usd >= 1e10 ? 0 : 1).replace(/\.0$/, '')}B`;
    return `${s}$${(usd / 1e6).toFixed(usd >= 1e7 ? 0 : 1).replace(/\.0$/, '')}M`;
  }
  if (a >= 100) {
    const yi = a / 100;
    return `${s}¥${yi >= 100 ? Math.round(yi).toLocaleString('en-US') : yi.toFixed(yi >= 10 ? 1 : 2).replace(/\.?0+$/, '')} 亿`;
  }
  return `${s}¥${(a * 100).toLocaleString('en-US')} 万`;
}
