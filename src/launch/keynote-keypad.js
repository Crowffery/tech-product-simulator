/**
 * 按键时代完整节目单（v0.14）— 动态段落；零现代词。
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

export function buildKeypadKeynote(ctx) {
  const d = ctx.d || {};
  const phys = ctx.phys || {};
  const price = ctx.price || 899;
  const elder = d.formFactor === 'elder';
  const flip = d.formFactor === 'flip';
  const hasCam = (d.parts?.camera ?? 0) >= 1;
  const dual = (d.concepts || []).includes('dualsim');
  const name = d.modelName || '新机';
  const standby = phys.standbyDays || 12;
  const broke = new Set((ctx.promises || []).filter((p) => !p.ok).map((p) => p.id));
  const out = [];

  out.push({
    key: 'greet', chap: null,
    wall: (g, W, H) => { bg(g, W, H, '#1a2818', '#2a4030'); title(g, '各位来宾、各位媒体朋友', W / 2, H / 2, 18, '#c6e48b'); },
    sub: elder ? '今天，给家人交一台好手机' : '今天，重新定义按键体验',
    react: ['掌声', '期待', '👏'], mood: 'good', pose: pose('front', 'wide'), screen: 'boot', ms: 2600,
  });

  out.push({
    key: 'look', chap: '外观',
    wall: (g, W, H) => {
      bg(g, W, H, '#202428', '#3a4048');
      title(g, flip ? '翻盖 · 啪' : elder ? '大键 · SOS · 手电筒' : '实体键盘 · 听筒格栅', W / 2, H / 2, 18, '#ffe08a');
    },
    kpi: { label: '机身厚度', from: +(phys.thickness + 1.5 || 16).toFixed(1), to: phys.thickness || 14.5, dec: 1, unit: 'mm' },
    sub: flip ? `<b>${name}</b> · 合盖护屏，开盖有仪式感` : `<b>${name}</b> · ${elder ? '专为长辈设计的键程与字体' : '握在手里就知道，这是按键机'}`,
    react: flip ? ['这翻盖帅', '想听啪一声', '✨'] : elder ? ['给爸妈来一台', '键好大', '👍'] : ['实体键真香', '有年代感', '✨'],
    mood: 'good', pose: pose('hero', 'push', { push: 1.2 }), screen: 'standby', shine: true, ms: 3400, film: 'kp_material',
  });

  out.push({
    key: 'screen', chap: '屏幕',
    wall: (g, W, H) => { bg(g, W, H, '#0f380f', '#9bbc0f'); title(g, '彩屏时代', W / 2, H / 2, 22, '#0f380f'); },
    kpi: { label: '色彩', from: 2, to: 26, dec: 0, unit: ' 万色' },
    sub: '单色绿屏一格格点亮——变成 26 万色',
    react: ['彩屏！', '好鲜艳', '📱'], mood: 'good', pose: pose('front', 'close'), screen: 'menu', ms: 3200, film: 'kp_colorbloom',
  });

  out.push({
    key: 'ringtone', chap: '铃声',
    wall: (g, W, H) => { bg(g, W, H, '#2a1840', '#4a2860'); title(g, '64 和弦', W / 2, H / 2, 24, '#ffb0e0'); },
    kpi: { label: '铃声', from: 1, to: 64, dec: 0, unit: ' 和弦' },
    sub: broke.has('chord') ? '铃声……还在调校中' : '现场外放一段和弦——听得见的年代感',
    react: broke.has('chord') ? ['还行吧', '再练练'] : ['好听', '这铃声够响', '♪'],
    mood: broke.has('chord') ? 'meh' : 'good', pose: pose('front', 'close', { spin: 0.12 }), screen: 'call', ms: 3000, film: 'kp_ringtone',
  });

  out.push({
    key: 'standby', chap: '待机',
    wall: (g, W, H) => { bg(g, W, H, '#102030', '#1a4050'); title(g, `待机 ${standby} 天`, W / 2, H / 2, 26, '#7ec8ff'); },
    kpi: { label: '待机', from: Math.max(3, standby - 5), to: standby, dec: 0, unit: ' 天' },
    sub: broke.has('standby') ? '待机还没达到承诺……' : '日历翻到第 20 天，电量格只少一格',
    react: broke.has('standby') ? ['水分大了', '😅'] : ['待机之王', '一周一充？', '🔋'],
    mood: broke.has('standby') ? 'meh' : 'good', pose: pose('hero', 'wide'), screen: 'standby', ms: 3000, film: 'kp_standby',
  });

  out.push({
    key: 'drop', chap: '耐用',
    wall: (g, W, H) => { bg(g, W, H, '#2a2010', '#4a3820'); title(g, '砸核桃', W / 2, H / 2, 26, '#f5b041'); },
    sub: broke.has('tough') ? '耐用测试……有点悬' : '手机砸下，核桃裂开，手机完好——再来一次 1.5 米跌落',
    react: broke.has('tough') ? ['别砸了', '😱'] : ['能砸核桃！', '结实', '💪'],
    mood: broke.has('tough') ? 'meh' : 'good', pose: pose('hero', 'macro'), screen: 'standby', ms: 3200, film: 'kp_drop',
  });

  if (hasCam) {
    out.push({
      key: 'camera', chap: '拍照',
      wall: (g, W, H) => { bg(g, W, H, '#1a2030', '#303848'); title(g, '30 万像素', W / 2, H / 2, 22, '#aed6f1'); },
      sub: '像素马赛克逐渐清楚一点点——能看清是谁了',
      react: ['哈哈能看清', '拍照手机！', '📷'], mood: 'good', pose: pose('back', 'close'), screen: 'camera', ms: 2800, film: 'kp_camera',
    });
  }

  if (elder) {
    out.push({
      key: 'bigfont', chap: '大字',
      wall: (g, W, H) => { bg(g, W, H, '#182018', '#283028'); title(g, '字号 ×3', W / 2, H / 2, 28, '#c6e48b'); },
      sub: '普通字体 vs 超大字体——我妈能看清',
      react: ['我妈能看清', '贴心', '👵'], mood: 'good', pose: pose('front', 'close'), screen: 'bigfont', ms: 2600, film: 'kp_bigtext',
    });
    out.push({
      key: 'sos', chap: 'SOS',
      wall: (g, W, H) => { bg(g, W, H, '#401818', '#602028'); title(g, '一键求助', W / 2, H / 2, 26, '#ff8a80'); },
      sub: '按下 SOS → 正在呼叫：儿子',
      react: ['全场安静', '然后鼓掌', 'SOS'], mood: 'good', pose: pose('side', 'macro'), screen: 'sos', ms: 3000, film: 'kp_sos',
    });
  }

  if (dual) {
    out.push({
      key: 'dualsim', chap: '双卡',
      wall: (g, W, H) => { bg(g, W, H, '#182028', '#283040'); title(g, '双卡双待', W / 2, H / 2, 24, '#7ec8ff'); },
      sub: '两张卡，两个信号格，同时满格',
      react: ['工作生活分开了', '双卡！', '📶'], mood: 'good', pose: pose('side', 'close'), screen: 'signal', ms: 2400, film: 'kp_dualsim',
    });
  }

  out.push({
    key: 'price', chap: '价格',
    wall: (g, W, H) => { bg(g, W, H, '#1a2030', '#303848'); title(g, `¥${price}`, W / 2, H / 2 - 10, 32, '#f5b041'); title(g, '预存话费送手机', W / 2, H / 2 + 28, 14, '#ffe08a'); },
    sub: `营业厅同步开售——合约机 <b>¥${price}</b>`,
    react: price <= 599 ? ['便宜！', '冲营业厅', '👏'] : price <= 1299 ? ['合理', '可以考虑', '👍'] : ['有点贵', '等等看', '😅'],
    mood: price <= 1299 ? 'good' : 'meh', pose: pose('hero', 'high'), screen: 'sms', sfx: 'boom', ms: 2800,
  });

  out.push({
    key: 'end', chap: null,
    wall: (g, W, H) => { bg(g, W, H, '#182018', '#283028'); title(g, '全国营业厅同步上市', W / 2, H / 2, 18, '#c6e48b'); },
    sub: '谢谢大家', react: ['冲营业厅', '鼓掌', '🙌'], mood: 'good', pose: pose('front', 'wide'), screen: 'menu', ms: 2400,
  });

  return out;
}
