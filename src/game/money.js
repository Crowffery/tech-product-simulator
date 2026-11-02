/**
 * 金额显示：游戏内 1 点现金 = ¥100 万
 *   29 → ¥2,900 万 · 250 → ¥2.5 亿 · -40 → -¥4,000 万
 */
export function money(v, { sign = false } = {}) {
  const n = Math.round(Number(v) || 0);
  const s = n < 0 ? '-' : sign && n > 0 ? '+' : '';
  const a = Math.abs(n);
  if (a >= 100) {
    const yi = a / 100;
    return `${s}¥${yi >= 100 ? Math.round(yi).toLocaleString('en-US') : yi.toFixed(yi >= 10 ? 1 : 2).replace(/\.?0+$/, '')} 亿`;
  }
  return `${s}¥${(a * 100).toLocaleString('en-US')} 万`;
}

/** HUD 用的短格式：¥2.5亿 / ¥2900万 */
export function moneyShort(v) {
  const n = Math.round(Number(v) || 0);
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 100) return `${s}${(a / 100).toFixed(a >= 1000 ? 0 : 1)}亿`;
  return `${s}${a * 100}万`;
}
