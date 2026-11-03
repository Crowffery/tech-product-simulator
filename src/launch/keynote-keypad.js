/**
 * 按键时代发布会节目单 —— 全部由玩家配置驱动，台词是主讲人在那个年代会说的话。
 * 每个产品段：先播全屏短片（film），再切回舞台（运镜 + LED 大屏 + 大数字 + 台下反应）。
 * 段落对象与现代节目单同构：{ key, chap, main, film, wall, kpi, sub, filmSub, react, mood, pose, screen, ms, sfx }
 */
import { CONCEPTS } from '../studio/parts.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const ease = (k) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);

function bg(g, W, H, a, b) {
  const grd = g.createLinearGradient(0, 0, W, H);
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
function small(g, str, x, y, size, color = '#d5d8dc') {
  g.fillStyle = color;
  g.font = `700 ${size}px "Noto Sans SC",sans-serif`;
  g.textAlign = 'center';
  g.fillText(str, x, y);
}
/** LED 大屏标准版式：大字 + 小字说明，大字有一个轻微放大入场 */
function slide(a, b, big, sub, color = '#ffe08a') {
  return (g, W, H, t) => {
    bg(g, W, H, a, b);
    const k = ease(t * 2);
    g.save();
    g.translate(W / 2, H / 2);
    g.scale(0.85 + k * 0.15, 0.85 + k * 0.15);
    title(g, big, 0, sub ? 4 : 9, big.length > 6 ? 20 : 26, color);
    g.restore();
    if (sub) small(g, sub, W / 2, H - 12, 9);
  };
}
function pose(view, shot, extra = {}) {
  return [view, shot, { spin: 0.08, push: 0.4, ...extra }];
}

const GREET = {
  formal: [
    { w: '各位来宾，各位媒体朋友', sub: '各位来宾、各位媒体朋友，晚上好。感谢大家冒着寒风来到现场。' },
    { w: '感谢各位的到来', sub: '感谢各位经销商朋友、媒体朋友的到来。今天，我们只讲一台手机。' },
  ],
  ringtone: [
    { w: '♪ ♪ ♪', sub: '（全场灯光熄灭，一段和弦铃声响起）……没错，这就是今天的主角。' },
  ],
  rugged: [
    { w: '先看一段录像', sub: '（大屏播放：一台手机从三楼掉下去）……它现在就在我手里，还能打电话。' },
  ],
};

/** 台下反应：那个年代的观众会说的话（不带表情符号、不用今天的网络用语） */
const R = {
  look: ['这个颜色好', '看着挺结实', '手感应该不错'],
  lookElder: ['键真大', '给我爸买一台', '这个我妈会用'],
  lookFlip: ['翻盖好看', '有派头', '开合的声音真脆'],
  mono: ['省电是真的', '太阳底下看得清', '实在'],
  color: ['彩屏！', '这颜色真鲜', '能看彩信了'],
  ring1: ['声音挺大', '菜市场也听得见'],
  ringChord: ['好听！', '这铃声我要了', '像音乐盒'],
  standby: ['一个礼拜一充？', '出差够用了', '这个厉害'],
  drop: ['真砸啊', '核桃碎了！', '这手机能当锤子'],
  camera: ['能拍照的手机', '拍得出人样', '发彩信给我看看'],
  dual: ['两个号一部机', '省得揣两部', '生意人要这个'],
  t9: ['打字快', '短信党福音'],
  qwerty: ['像电脑键盘', '回邮件方便', '商务范'],
  net: ['手机能上网？', '流量贵不贵', '能看新闻吗'],
  music: ['能听歌', '随身听可以扔了', '耳机自带？'],
  bigtext: ['我妈能看清', '贴心', '字真大'],
  sos: ['（全场安静了几秒）', '这个功能好', '给老人买就要这个'],
  torch: ['停电能用', '晚上遛弯带着', '实用'],
  price: { cheap: ['便宜！', '这个价真厚道', '明天就去营业厅'], ok: ['价格还行', '可以考虑', '等等合约机'], high: ['有点贵', '等降价', '这价能买两部'] },
};

function buildCore(ctx) {
  const d = ctx.d || {};
  const phys = ctx.phys || {};
  const parts = d.parts || {};
  const price = ctx.price || 399;
  const opts = ctx.launchOpts || {};
  const ff = d.formFactor || 'feature';
  const elder = ff === 'elder';
  const openKind = ['flip', 'slider', 'swivel'].includes(ff) ? ff : null;
  const C = new Set(d.concepts || []);
  const name = d.modelName || '新机';
  const standby = phys.standbyDays || 7;
  const scr = parts.screen ?? 0;
  const ring = parts.ringtone ?? 0;
  const cam = parts.camera ?? 0;
  const mat = parts.material ?? 0;
  const kb = parts.keyboard ?? 0;
  const net = parts.network ?? 0;
  const broke = new Set((ctx.promises || []).filter((p) => !p.ok).map((p) => p.id));
  const main = new Set(ctx.points || []);
  const firsts = ctx.firsts || [];
  const quick = !!ctx.quick;
  const out = [];

  // —— 开场 ——
  const tone = opts.openTone && GREET[opts.openTone] ? opts.openTone : 'formal';
  const g0 = pick(GREET[tone]);
  if (!quick)
    out.push({
      key: 'greet',
      chap: null,
      wall: slide('#141a14', '#26382a', g0.w, `${d.company || ''} 新品发布会`, '#c6e48b'),
      sub: g0.sub,
      react: tone === 'ringtone' ? ['这铃声好听', '是什么歌'] : tone === 'rugged' ? ['真的假的', '三楼？'] : ['开始了', '安静点'],
      mood: 'good',
      pose: pose('front', 'wide'),
      screen: 'boot',
      ms: 2800,
      sfx: tone === 'ringtone' ? 'ringtone' : undefined,
    });

  // —— 外观 ——
  const matName = ['工程塑料', '钢琴烤漆', '金属拉丝'][mat] || '机身';
  out.push({
    key: 'look',
    chap: '外观',
    film: quick ? null : { name: 'kp_material', ms: 3600 },
    filmSub: elder ? '我们把每一个按键都做大了一圈。' : mat === 1 ? '七层烤漆，手工打磨。' : mat === 2 ? '金属面板，拿在手里是凉的。' : '一体注塑机身，按键回弹清脆。',
    wall: slide('#1c1f26', '#383d48', name, `${matName} · ${phys.weight || 90} 克`),
    kpi: elder ? { label: '按键尺寸', text: '加大 60%', unit: '' } : { label: '整机重量', from: (phys.weight || 90) + 25, to: phys.weight || 90, dec: 0, unit: ' 克' },
    sub: `这就是 <b>${name}</b>。${elder ? '按键大，字也大，爸妈拿到手就会用。' : mat === 0 ? '不怕摔，不怕磨，装在兜里放心。' : mat === 1 ? '亮面机身，放在桌上就是一件摆设。' : '开会时往桌上一放，体面。'}`,
    react: elder ? R.lookElder : openKind === 'flip' ? R.lookFlip : R.look,
    mood: 'good',
    pose: pose('hero', 'push', { push: 1.2 }),
    screen: 'standby',
    shine: mat >= 1,
    ms: 3400,
  });

  // —— 翻盖 / 滑盖 / 旋转：开合 ——
  if (openKind && !quick) {
    out.push({
      key: 'open',
      chap: null,
      film: openKind === 'flip' ? { name: 'kp_flip', ms: 2600, sfx: 'click', sfxAt: 1300 } : null,
      wall: slide('#1a1428', '#2c2244', openKind === 'flip' ? '啪' : openKind === 'slider' ? '推' : '转', openKind === 'flip' ? '翻开就是接听' : openKind === 'slider' ? '一推，键盘出来' : '屏幕一转，横过来看'),
      sub: openKind === 'flip' ? '翻开就是接听，合上就是挂断。这个声音，大家听到了吗？' : openKind === 'slider' ? '平时是一块屏，一推，键盘就出来了。' : '屏幕转过来，就能横着看照片。',
      react: openKind === 'flip' ? ['啪！', '这声音好听', '有派头'] : ['顺滑', '酷', '再推一次'],
      mood: 'good',
      pose: pose('side', 'push', { push: 1.1 }),
      screen: 'standby',
      act: 'open',
      ms: 3000,
    });
  }

  // —— 屏幕 ——
  if (!quick || main.has('standby')) {
    out.push({
      key: 'screen',
      chap: '屏幕',
      film: quick ? null : { name: 'kp_screen', ms: 3800 },
      filmSub: scr === 0 ? '它只有两种颜色。但正因为这样——' : '以前的屏幕，只有黑和绿。今天——',
      wall: scr === 0 ? slide('#0f380f', '#306230', '单色屏', '省电 · 看得清', '#9bbc0f') : slide('#102030', '#2a1a40', scr === 2 ? '26 万色' : '6.5 万色', scr === 2 ? '2.4 英寸大彩屏' : '1.8 英寸彩屏'),
      kpi: scr === 0 ? { label: '屏幕', text: '单色', unit: '' } : { label: '色彩', from: 2, to: scr === 2 ? 26 : 6.5, dec: scr === 2 ? 0 : 1, unit: ' 万色' },
      sub: scr === 0 ? '单色屏，<b>太阳底下照样看得清</b>，也最省电。' : scr === 2 ? '<b>26 万色</b>大彩屏。彩信里的照片，和冲洗出来的一样。' : '<b>6.5 万色</b>彩屏，图标、铃声、彩信，一眼就分得清。',
      react: scr === 0 ? R.mono : R.color,
      mood: 'good',
      pose: pose('front', 'push', { push: 1.5 }),
      screen: 'menu',
      ms: 3200,
    });
  }

  // —— 铃声 ——
  if (!quick || main.has('chord')) {
    const bad = broke.has('chord');
    out.push({
      key: 'ringtone',
      chap: '铃声',
      main: main.has('chord'),
      film: quick ? null : { name: 'kp_ringtone', ms: 3800, sfx: 'ringtone', sfxAt: 500 },
      filmSub: '请大家安静十秒钟。',
      wall: slide('#2a1840', '#4a2860', ring === 2 ? '64 和弦' : ring === 1 ? '16 和弦' : '单音铃声', ring === 2 ? '外放像一支乐队' : ring === 1 ? '一首完整的歌' : '响亮、清楚', '#ffb0e0'),
      kpi: ring === 0 ? { label: '铃声', text: '单音', unit: '' } : { label: '铃声', from: 1, to: ring === 2 ? 64 : 16, dec: 0, unit: ' 和弦' },
      sub: bad ? '这是我们的和弦铃声……（音响里有一点破音）' : ring === 2 ? '这是我们的 <b>64 和弦</b>。在嘈杂的街上，你也能第一时间听到它。' : ring === 1 ? '<b>16 和弦</b>，一首完整的歌。' : '简单的单音，<b>声音够大</b>，菜市场里也听得见。',
      react: bad ? ['破音了', '音响的问题吧'] : ring >= 1 ? R.ringChord : R.ring1,
      mood: bad ? 'meh' : 'good',
      pose: pose('front', 'close', { spin: 0.12 }),
      screen: 'call',
      ms: 3200,
    });
  }

  // —— 待机 ——
  if (!quick || main.has('standby')) {
    const bad = broke.has('standby');
    out.push({
      key: 'standby',
      chap: '待机',
      main: main.has('standby'),
      film: quick ? null : { name: 'kp_standby', data: { days: standby }, ms: 3800 },
      filmSub: '我们做了一个测试：同样充满电，放在桌上，不关机。',
      wall: slide('#102030', '#1a4050', `待机 ${standby} 天`, '实验室数据 · 正常使用', '#7ec8ff'),
      kpi: { label: '待机', from: Math.max(2, standby - 6), to: standby, dec: 0, unit: ' 天' },
      sub: bad ? `待机……${standby} 天。（台下有人小声说：没说的那么久）` : `第 <b>${standby}</b> 天，它还有电。出一趟差，<b>充电器可以不带</b>。`,
      react: bad ? ['没说的那么久', '水分大'] : R.standby,
      mood: bad ? 'bad' : 'good',
      pose: pose('hero', 'wide'),
      screen: 'standby',
      ms: 3000,
    });
  }

  // —— 耐用（烤漆机身不讲摔，除非主打砸不坏） ——
  if ((!quick && mat !== 1) || main.has('tough')) {
    const bad = broke.has('tough');
    out.push({
      key: 'drop',
      chap: '耐用',
      main: main.has('tough'),
      film: quick ? null : { name: 'kp_drop', ms: 4600, sfx: 'boom', sfxAt: 950 },
      filmSub: '我们做了两个测试。第一个，有点暴力。',
      wall: slide('#2a2010', '#4a3820', bad ? '……' : '砸不坏', bad ? '' : '核桃碎了 · 手机还亮着', '#f5b041'),
      sub: bad ? '（主讲人举起手机准备再砸一次，又放下了）这个环节……我们跳过。' : '核桃碎了，<b>手机还亮着</b>。从 1.5 米掉下去，捡起来照常打电话。',
      react: bad ? ['不敢砸了？', '心虚'] : R.drop,
      mood: bad ? 'bad' : 'good',
      pose: pose('hero', 'macro'),
      screen: 'standby',
      ms: 3000,
    });
  }

  // —— 拍照 ——
  if (cam >= 1 && (!quick || main.has('camphone'))) {
    const bad = broke.has('camphone');
    out.push({
      key: 'camera',
      chap: '拍照',
      main: main.has('camphone'),
      film: quick ? null : { name: 'kp_camera', ms: 3600 },
      filmSub: '我刚才在台下，给前排的朋友拍了一张。',
      wall: slide('#1a2030', '#303848', cam === 2 ? '130 万像素' : '30 万像素', '拍下来 · 用彩信发出去', '#aed6f1'),
      kpi: { label: '摄像头', text: cam === 2 ? '130 万' : '30 万', unit: '像素' },
      sub: bad ? '照片有点糊……光线的问题。' : cam === 2 ? '<b>130 万像素</b>。拍下来，用彩信发给家里。' : '<b>30 万像素</b>。看得清是谁，看得清在笑。',
      react: bad ? ['糊了', '看不清是谁'] : R.camera,
      mood: bad ? 'bad' : 'good',
      pose: pose('back', 'close'),
      screen: 'camera',
      sfx: 'shutter',
      ms: 3000,
    });
  }

  // —— 键盘与短信 ——
  if (!quick && (kb === 2 || C.has('qwerty'))) {
    out.push({
      key: 'keys',
      chap: '键盘',
      film: { name: 'kp_t9', ms: 3600 },
      filmSub: '我们请一位经常出差的朋友，现场打一条短信。',
      wall: slide('#14202a', '#22384a', '全键盘', '每个字母都有自己的键'),
      sub: '<b>全键盘</b>：在路上回邮件、发通知，像在电脑前一样快。',
      react: R.qwerty,
      mood: 'good',
      pose: pose('front', 'close', { push: 1.3 }),
      screen: 'sms',
      ms: 3000,
    });
  }

  // —— 上网 ——
  if (!quick && net >= 1) {
    out.push({
      key: 'net',
      chap: '上网',
      film: { name: 'kp_network', ms: 3800 },
      filmSub: '这台手机，可以上网。',
      wall: slide('#0b1220', '#1c2c4a', ['GSM', 'GPRS', 'EDGE', '3G'][net], ['', '随时看新闻', '彩信秒发', '能视频通话'][net], '#7ec8ff'),
      sub: net === 3 ? '支持 <b>3G</b>。打电话的时候，能看见对方的脸。' : `支持 <b>${['GSM', 'GPRS', 'EDGE'][net]}</b>：新闻、天气、铃声下载，打开就有。`,
      react: R.net,
      mood: 'good',
      pose: pose('front', 'push', { push: 1.2 }),
      screen: 'signal',
      ms: 3000,
    });
  }

  // —— 听歌 ——
  if (!quick && (C.has('mp3') || C.has('fm'))) {
    out.push({
      key: 'music',
      chap: '音乐',
      film: { name: 'kp_music', ms: 3600 },
      filmSub: C.has('mp3') ? '它还是一台随身听。' : '插上耳机，就是一台收音机。',
      wall: slide('#1a0f28', '#3a1a50', C.has('mp3') ? 'MP3' : 'FM 收音机', C.has('mp3') ? '一百首歌装进口袋' : '耳机线就是天线', '#f5b041'),
      sub: C.has('mp3') ? '<b>MP3 播放</b>：上下班路上，耳机一戴。' : '<b>FM 收音机</b>：早上听新闻，晚上听评书。',
      react: R.music,
      mood: 'good',
      pose: pose('side', 'close'),
      screen: C.has('mp3') ? 'mp3' : 'radio',
      ms: 3000,
    });
  }

  // —— 双卡 ——
  if (C.has('dualsim') && (!quick || main.has('dualsim'))) {
    out.push({
      key: 'dualsim',
      chap: '双卡',
      main: main.has('dualsim'),
      film: quick ? null : { name: 'kp_dualsim', ms: 3400 },
      filmSub: '很多做生意的朋友，身上揣两部手机。',
      wall: slide('#182028', '#283040', '双卡双待', '工作和家里 · 两个号码', '#7ec8ff'),
      sub: '<b>双卡双待</b>。一个号码谈生意，一个号码打给家里，<b>两个都不会漏接</b>。',
      react: R.dual,
      mood: 'good',
      pose: pose('side', 'close'),
      screen: 'signal',
      ms: 2800,
    });
  }

  // —— 老年机专属 ——
  if (elder) {
    out.push({
      key: 'bigfont',
      chap: '大字',
      main: main.has('loud'),
      film: quick ? null : { name: 'kp_bigtext', ms: 3400 },
      filmSub: '我们请几位阿姨试用，第一句话都是：看不清。',
      wall: slide('#182018', '#283028', '字大 · 声大', '不戴老花镜也看得清', '#c6e48b'),
      sub: broke.has('loud') ? '字大了……但听筒声音还不够大。' : '字号放大三倍，听筒音量加大一倍。<b>不戴老花镜也看得清。</b>',
      react: broke.has('loud') ? ['声音还是小', '我爸听不见'] : R.bigtext,
      mood: broke.has('loud') ? 'meh' : 'good',
      pose: pose('front', 'close'),
      screen: 'bigfont',
      ms: 3000,
    });
    out.push({
      key: 'sos',
      chap: '求助',
      film: quick ? null : { name: 'kp_sos', ms: 3800 },
      filmSub: '最后这个功能，希望大家永远用不上。',
      wall: slide('#401818', '#602028', 'SOS', '按住三秒 · 打给家人', '#ff8a80'),
      sub: '背面这个红色按键，按住三秒，手机会<b>依次拨打三个亲人的电话</b>，同时发出求助短信。',
      react: R.sos,
      mood: 'good',
      pose: pose('side', 'macro'),
      screen: 'sos',
      ms: 3400,
    });
  }
  if (C.has('torch') && !quick) {
    out.push({
      key: 'torch',
      chap: null,
      film: { name: 'kp_torch', ms: 2800 },
      filmSub: '（主讲人：请把灯关一下。）',
      wall: slide('#050505', '#151515', '手电筒', '停电的晚上，它在', '#fffbe6'),
      sub: '顶部一颗 LED，<b>长按就亮</b>。',
      react: R.torch,
      mood: 'good',
      pose: pose('front', 'wide'),
      screen: 'standby',
      act: 'torch',
      ms: 2600,
    });
  }

  // —— 首发：还有一件事 ——
  const firstCs = firsts.map((n) => CONCEPTS.find((c) => c.name === n)).filter(Boolean);
  if (firstCs.length && !quick) {
    out.push({
      key: 'omt',
      chap: null,
      wall: slide('#000', '#111', '还有一件事', '', '#fff'),
      sub: '在结束之前，还有一件事。',
      react: ['还有？', '什么东西'],
      mood: 'meh',
      pose: pose('back', 'wide', { spin: 0 }),
      dim: true,
      ms: 2200,
    });
    firstCs.slice(0, 2).forEach((c) => {
      out.push({
        key: `f-${c.id}`,
        chap: null,
        first: true,
        film: { name: 'concept', data: { id: c.id, icon: c.icon, name: c.name, desc: c.desc, first: true }, ms: 3400 },
        filmSub: `国内第一台带${c.name}的手机。`,
        wall: slide('#3a1a00', '#7a3a00', c.name, '国内首发', '#ffd700'),
        kpi: { label: '国内首发', text: c.name, unit: '' },
        sub: `<b>${c.name}</b>：${c.desc}。在我们之前，没有一台国产手机做到。`,
        react: ['头一回见', '这个厉害', '国产也能做'],
        mood: 'good',
        fanfare: true,
        pose: pose('hero', 'push', { push: 1.3, spin: 0.18 }),
        screen: 'menu',
        ms: 3200,
      });
    });
  }

  // —— 价格 ——
  const fair = ctx.fair || price;
  const ratio = price / Math.max(1, fair);
  const verdict = ratio <= 0.9 ? 'cheap' : ratio <= 1.12 ? 'ok' : 'high';
  if (!quick)
    out.push({
      key: 'price-q',
      chap: '价格',
      wall: slide('#1a2030', '#303848', '多少钱？', '', '#f5b041'),
      sub: '我知道大家最关心的是什么。',
      react: ['说吧', '别太贵', '多少钱'],
      mood: 'meh',
      pose: pose('front', 'wide', { spin: 0 }),
      ms: 2200,
    });
  out.push({
    key: 'price',
    chap: quick ? '价格' : null,
    wall: (g, W, H, t) => {
      bg(g, W, H, '#1a2030', '#303848');
      const k = ease(t * 1.6);
      title(g, `¥${Math.round(price * (0.4 + 0.6 * k))}`, W / 2, H / 2 + 4, 32, '#f5b041');
      small(g, '各大运营商门店 · 卖场同步上市', W / 2, H - 10, 9, '#ffe08a');
    },
    kpi: { label: '零售价', from: Math.round(price * 1.6), to: price, dec: 0, unit: ' 元' },
    sub: `<b>${name}</b>，零售价 <b>${price} 元</b>。${verdict === 'cheap' ? '我们希望，每个人都用得起。' : verdict === 'ok' ? '这是一个对得起它的价格。' : '一分钱，一分货。'}`,
    react: R.price[verdict],
    mood: verdict === 'high' ? 'meh' : 'good',
    pose: pose('hero', 'high'),
    screen: 'standby',
    sfx: 'boom',
    ms: 3000,
  });

  return out;
}

// ═════════════ 按上市方案重组：没有演讲式发布会（见 docs/LAUNCH_HISTORY.md） ═════════════
export const CARRIER = '星联通信';
export const STORE = '数码港';
export const EXPO = '国际移动通信展';
export const MAGAZINE = '数码周刊';

const SLOGAN = {
  standby: '一周一充，说走就走。',
  tough: '摔不坏的，才是好伙伴。',
  chord: '一响，全场回头。',
  loud: '给爸妈的，要简单。',
  camphone: '随手一拍，马上发出去。',
  dualsim: '一台手机，两种生活。',
  value: '好手机，不必贵。',
};
const FILM_OF = { standby: 'kp_standby', tough: 'kp_drop', chord: 'kp_ringtone', loud: 'kp_bigtext', camphone: 'kp_camera', dualsim: 'kp_dualsim', value: 'kp_screen' };

export function buildKeypadKeynote(ctx) {
  const core = buildCore(ctx);
  const d = ctx.d || {};
  const name = d.modelName || '新机';
  const company = d.company || '我们';
  const opts = ctx.launchOpts || {};
  const channel = ['carrier', 'expo', 'retail'].includes(opts.style) ? opts.style : 'retail';
  const points = ctx.points || [];
  const quick = !!ctx.quick;
  const price = ctx.price || 399;
  const byKey = (k) => core.find((x) => x.key === k);
  const features = core.filter((x) => !['greet', 'price-q', 'price'].includes(x.key));
  // 主打卖点对应的段落排在前面
  const MAIN_KEY = { standby: 'standby', tough: 'drop', chord: 'ringtone', loud: 'bigfont', camphone: 'camera', dualsim: 'dualsim' };
  const mainKeys = new Set(points.map((p) => MAIN_KEY[p]).filter(Boolean));
  const ordered = [...features.filter((x) => x.key === 'look'), ...features.filter((x) => x.key !== 'look' && mainKeys.has(x.key)), ...features.filter((x) => x.key !== 'look' && !mainKeys.has(x.key))];
  const cap = quick ? 2 : channel === 'expo' ? 8 : channel === 'carrier' ? 5 : 4;
  const picked = ordered.slice(0, cap);
  const out = [];
  const pose = (view, shot, extra = {}) => [view, shot, { spin: 0.08, push: 0.4, ...extra }];

  if (channel === 'carrier') {
    out.push({
      key: 'sign-open',
      chap: null,
      wall: slide('#10223a', '#1d3d63', `${CARRIER} × ${company}`, '独家首发 · 合作签约仪式', '#9fd3ff'),
      sub: `${CARRIER}的副总裁先上台：「这台手机，我们独家首发。」`,
      react: ['大运营商站台', '这下好卖了'],
      mood: 'good',
      pose: pose('front', 'wide'),
      screen: 'boot',
      ms: 3000,
    });
    picked.forEach((x) => out.push(x));
    out.push({
      key: 'sign',
      chap: '签约',
      wall: slide('#10223a', '#1d3d63', '签约', `${CARRIER} 首批包销`, '#ffe08a'),
      kpi: ctx.stock ? { label: '首批订单', from: 0, to: ctx.stock, dec: 0, unit: ' 万台' } : null,
      sub: `双方在大屏前签字、握手。${ctx.stock ? `首批 <b>${ctx.stock} 万台</b>，${CARRIER}全部包下。` : ''}台下闪光灯一片。`,
      react: ['签了！', '大单', '握手照'],
      mood: 'good',
      sfx: 'shutter',
      pose: pose('hero', 'wide', { spin: 0.2 }),
      screen: 'standby',
      ms: 3200,
    });
    out.push({
      key: 'price',
      chap: '价格',
      wall: slide('#1a2030', '#303848', `¥${price}`, `${CARRIER}门店签约购机更优惠`, '#f5b041'),
      kpi: { label: '零售价', from: Math.round(price * 1.5), to: price, dec: 0, unit: ' 元' },
      sub: `<b>${name}</b>，零售价 <b>${price} 元</b>。在${CARRIER}门店签约，还能再便宜一截。`,
      react: ['签约更便宜', '可以考虑', '去门店看看'],
      mood: 'good',
      pose: pose('hero', 'high'),
      screen: 'standby',
      sfx: 'boom',
      ms: 2800,
    });
  } else if (channel === 'expo') {
    out.push({
      key: 'expo-open',
      chap: null,
      wall: slide('#14141c', '#26263a', EXPO, `${company} 展台`, '#ffe08a'),
      sub: '展馆开门半小时，你们的展台前已经围了一圈人。讲解员拿起样机，开始演示。',
      react: ['挤一挤', '这台是新的？', '让我看看'],
      mood: 'good',
      pose: pose('front', 'wide', { spin: 0.3 }),
      screen: 'boot',
      ms: 3000,
    });
    picked.forEach((x) => out.push(x));
    out.push({
      key: 'expo-press',
      chap: null,
      wall: slide('#14141c', '#26263a', '媒体围拍', `${MAGAZINE} · 现场报道`, '#ffffff'),
      sub: '几家杂志的记者挤到前排，闪光灯一直没停。有经销商当场留下名片要订货。',
      react: ['能拍一张吗', '什么时候上市', '经销商来了'],
      mood: 'good',
      sfx: 'shutter',
      pose: pose('hero', 'push', { push: 1.2, spin: 0.25 }),
      screen: 'menu',
      ms: 2800,
    });
    const pq = byKey('price-q');
    if (pq) out.push({ ...pq, sub: '一位经销商直接问：「多少钱？」' });
    const pr = byKey('price');
    if (pr) out.push({ ...pr, sub: `<b>${name}</b>，零售价 <b>${price} 元</b>，下个月起在各大运营商门店和卖场有售。` });
  } else {
    out.push({
      key: 'store-open',
      chap: null,
      wall: slide('#2a1a10', '#4a3018', `${STORE} · 新品开售`, name, '#ffe08a'),
      sub: `上午十点，${STORE}的卷帘门拉起来。柜台里摆着刚到的 <b>${name}</b>，店员拿起样机开始给顾客演示。`,
      react: ['新到的？', '拿出来看看', '有现货吗'],
      mood: 'good',
      pose: pose('front', 'wide'),
      screen: 'boot',
      ms: 3000,
    });
    picked.forEach((x) => out.push(x));
    out.push({
      key: 'price',
      chap: '价格',
      wall: slide('#2a1a10', '#4a3018', `¥${price}`, '价签已经摆上柜台', '#f5b041'),
      kpi: { label: '零售价', from: Math.round(price * 1.4), to: price, dec: 0, unit: ' 元' },
      sub: `店员把价签摆上柜台：<b>${price} 元</b>。`,
      react: price <= 599 ? ['不贵', '来一台', '开票吧'] : price <= 1299 ? ['还行', '再看看', '有赠品吗'] : ['有点贵', '等等降价', '再逛逛'],
      mood: price <= 1299 ? 'good' : 'meh',
      pose: pose('hero', 'high'),
      screen: 'standby',
      sfx: 'boom',
      ms: 2800,
    });
  }

  // —— 广告投放 ——
  if (opts.ad === 'tv' && !quick) {
    const pt = points.find((p) => SLOGAN[p]) || 'value';
    const slogan = SLOGAN[pt];
    out.push({ key: 'tv-1', chap: '电视广告', tv: true, film: { name: 'kp_material', ms: 2200 }, filmSub: '（当晚，电视上播出了 30 秒的广告）', wall: slide('#000', '#111', '', ''), sub: null, react: [], ms: 600, notap: true });
    out.push({ key: 'tv-2', chap: null, tv: true, film: { name: FILM_OF[pt] || 'kp_screen', ms: 2600 }, filmSub: slogan, wall: slide('#000', '#111', '', ''), sub: null, react: [], ms: 600, notap: true });
    out.push({
      key: 'tv-end',
      chap: null,
      tv: true,
      wall: slide('#0b1020', '#1c2540', name, `${slogan} 现已上市`, '#ffffff'),
      sub: `<b>${name}</b>　${slogan}　现已上市　¥${price}`,
      react: ['电视上看到了', '这广告好记'],
      mood: 'good',
      pose: pose('hero', 'wide', { spin: 0.35 }),
      screen: 'standby',
      ms: 2600,
    });
  } else if (opts.ad === 'print' && !quick) {
    out.push({
      key: 'print',
      chap: '杂志',
      wall: slide('#f4ecd8', '#e2d4b0', MAGAZINE, `本期整版：${name}`, '#3a2a10'),
      sub: `第二天的《${MAGAZINE}》用一整页刊登了 <b>${name}</b> 的广告，评测版面也给了它半页。`,
      react: ['杂志上看到了', '评测写得不错'],
      mood: 'good',
      pose: pose('front', 'push', { push: 1.1 }),
      screen: 'standby',
      ms: 2800,
    });
  }

  out.push({
    key: 'end',
    chap: null,
    wall: slide('#141c14', '#26382a', name, channel === 'carrier' ? `${CARRIER}独家首发` : '各大运营商门店和卖场有售', '#c6e48b'),
    sub: channel === 'carrier' ? `<b>${name}</b>，明天起在${CARRIER}门店独家首发。` : channel === 'expo' ? `展会第一天结束。<b>${name}</b>下个月起在各大运营商门店和卖场有售。` : '排在最前面的那位顾客，已经掏出了钱包。',
    react: channel === 'retail' ? ['开票', '下一位', '还有货吗'] : ['好！', '鼓掌', '回去等货'],
    mood: 'good',
    pose: pose('hero', 'wide', { spin: 0.4 }),
    screen: 'menu',
    fanfare: true,
    ms: 3000,
  });
  return out;
}

/** 按键时代现场插曲：按上市方案分 */
export const KEYPAD_MOMENTS_BY = {
  carrier: [
    { wall: slide('#10223a', '#1d3d63', '现场连线', ''), sub: `${CARRIER}的工程师当场拨通了台下记者的手机——铃声在会场另一头响了起来。`, react: ['真响了', '信号不错'], mood: 'good' },
  ],
  expo: [
    { wall: slide('#14141c', '#26263a', '隔壁展台', ''), sub: '隔壁展台突然放起音乐，人群被吸走了一半。讲解员提高了嗓门。', react: ['那边在干嘛', '回来回来'], mood: 'meh' },
    { wall: slide('#14141c', '#26263a', '老外客商', ''), sub: '一位外地来的客商比划着问能不能做他们那边的制式版本。', react: ['外贸单', '能做吗'], mood: 'good' },
  ],
  retail: [
    { wall: slide('#2a1a10', '#4a3018', '能听收音机吗？', ''), sub: '一位大爷凑过来问：「这个能听收音机吗？」店员笑着说：「能，买就送耳机。」', react: ['哈哈哈', '大爷问得好'], mood: 'good' },
    { wall: slide('#2a1a10', '#4a3018', '砸给你看', ''), sub: '店员把样机往柜台上一磕：「放心，结实。」', react: ['真敢砸', '结实'], mood: 'good' },
  ],
};
export const KEYPAD_MOMENTS = Object.values(KEYPAD_MOMENTS_BY).flat();

