/**
 * 按键时代过渡节目单（v0.12）
 * 返回与 buildSmartKeynote 相同的段落数组结构；文案零现代词。
 */

function bg(g, W, H, a, b) {
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, a);
  grd.addColorStop(1, b);
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
}

function title(g, str, x, y, size, color) {
  g.fillStyle = color;
  g.font = `900 ${size}px "ZCOOL KuaiLe","Noto Sans SC",sans-serif`;
  g.textAlign = 'center';
  g.fillText(str, x, y);
}

function pose(view, shot, extra = {}) {
  return { view, shot, spin: 0.08, push: 0.4, ...extra };
}

/**
 * @param {object} ctx
 * @returns {object[]}
 */
export function buildKeypadKeynote(ctx) {
  const d = ctx.d || {};
  const phys = ctx.phys || {};
  const price = ctx.price || 899;
  const elder = d.formFactor === 'elder';
  const name = d.modelName || '新机';
  const standby = phys.standbyDays || 12;
  const out = [];

  out.push({
    key: 'greet',
    chap: null,
    wall: (g, W, H) => {
      bg(g, W, H, '#1a2818', '#2a4030');
      title(g, elder ? '给家人的好手机' : '按键，也能讲究', W / 2, H / 2 + 8, 22, '#c6e48b');
    },
    sub: elder ? '字大声大，待机够久' : '小屏 · 实体键 · 信号扎实',
    react: ['期待', '来了', '👏'],
    mood: 'good',
    pose: pose('front', 'wide'),
    screen: 'standby',
    ms: 2400,
  });

  out.push({
    key: 'look',
    chap: '外观',
    wall: (g, W, H) => {
      bg(g, W, H, '#202428', '#3a4048');
      title(g, elder ? '大键 · 求助键 · 手电筒' : '数字键盘 · 听筒格栅', W / 2, H / 2, 18, '#ffe08a');
    },
    kpi: { label: '机身厚度', from: +(phys.thickness + 1.5 || 16).toFixed(1), to: phys.thickness || 14.5, dec: 1, unit: 'mm' },
    sub: `<b>${name}</b> · ${elder ? '专为长辈设计的键程与字体' : '握在手里就知道，这是按键机'}`,
    react: elder ? ['给爸妈来一台', '键好大', '👍'] : ['实体键真香', '有年代感', '✨'],
    mood: 'good',
    pose: pose('hero', 'push', { push: 1.2 }),
    screen: 'standby',
    ms: 3400,
  });

  out.push({
    key: 'screen',
    chap: '屏幕',
    wall: (g, W, H) => {
      bg(g, W, H, '#0f380f', '#9bbc0f');
      title(g, '彩屏时代', W / 2, H / 2, 22, '#0f380f');
    },
    kpi: { label: '色彩', from: 2, to: 26, dec: 0, unit: ' 万色' },
    sub: '从单色绿屏，到 26 万色彩屏——一格格亮起来',
    react: ['彩屏！', '好鲜艳', '📱'],
    mood: 'good',
    pose: pose('front', 'close'),
    screen: 'menu',
    ms: 3200,
  });

  out.push({
    key: 'standby',
    chap: '待机',
    wall: (g, W, H) => {
      bg(g, W, H, '#102030', '#1a4050');
      title(g, `待机 ${standby} 天`, W / 2, H / 2, 26, '#7ec8ff');
    },
    kpi: { label: '待机', from: Math.max(3, standby - 5), to: standby, dec: 0, unit: ' 天' },
    sub: '充一次电，用很久。出差也不慌。',
    react: ['待机之王', '省心', '🔋'],
    mood: 'good',
    pose: pose('hero', 'wide'),
    screen: 'standby',
    ms: 3000,
  });

  out.push({
    key: 'ringtone',
    chap: '铃声',
    wall: (g, W, H) => {
      bg(g, W, H, '#2a1840', '#4a2860');
      title(g, '64 和弦', W / 2, H / 2, 24, '#ffb0e0');
    },
    kpi: { label: '铃声', from: 1, to: 64, dec: 0, unit: ' 和弦' },
    sub: '来电不再是哔哔哔——是一段能哼的旋律',
    react: ['好听', '换铃声！', '♪'],
    mood: 'good',
    pose: pose('front', 'close', { spin: 0.12 }),
    screen: 'call',
    ms: 3000,
  });

  out.push({
    key: 'price',
    chap: '价格',
    wall: (g, W, H) => {
      bg(g, W, H, '#1a2030', '#303848');
      title(g, `¥${price}`, W / 2, H / 2, 32, '#f5b041');
    },
    sub: `营业厅同步开售——<b>¥${price}</b>`,
    react: price <= 599 ? ['太便宜了', '买！', '👏'] : price <= 1299 ? ['合理', '可以考虑', '👍'] : ['有点贵', '等等看', '😅'],
    mood: price <= 1299 ? 'good' : 'meh',
    pose: pose('hero', 'high'),
    screen: 'sms',
    sfx: 'boom',
    ms: 2600,
  });

  out.push({
    key: 'end',
    chap: null,
    wall: (g, W, H) => {
      bg(g, W, H, '#182018', '#283028');
      title(g, '谢谢', W / 2, H / 2, 28, '#c6e48b');
    },
    sub: '新品已在路上',
    react: ['鼓掌', '期待开售', '🙌'],
    mood: 'good',
    pose: pose('front', 'wide'),
    screen: 'menu',
    ms: 2200,
  });

  return out;
}
