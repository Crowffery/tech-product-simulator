/**
 * 按键时代内容包（v0.12）— ERA_PLAN §5.4
 * 自包含，不反向依赖 studio/parts，避免循环引用。
 */

export const KEYPAD_PARTS = {
  chip: {
    name: '基带平台',
    tiers: [
      { id: 0, label: '入门基带', cap: 60, cost: 3, heat: 0, bench: 0, standbyDays: 0, note: '菜单偶尔卡一下' },
      { id: 1, label: '增强基带', cap: 80, cost: 5, heat: 0, bench: 0, standbyDays: 0, note: '短信通话都流畅' },
      { id: 2, label: '多媒体平台', cap: 100, cost: 9, heat: 1, bench: 0, standbyDays: 0, note: '能放 MP3 和短视频' },
    ],
  },
  screen: {
    name: '屏幕',
    tiers: [
      { id: 0, label: '单色屏 1.5″', design: 0, os: 70, cost: 2, standbyDays: 0, note: '绿底黑字，经典' },
      { id: 1, label: '6.5 万色彩屏 1.8″', design: 12, os: 85, cost: 5, standbyDays: -1, note: '能看彩信了' },
      { id: 2, label: '26 万色大彩屏 2.4″', design: 22, os: 100, cost: 9, standbyDays: -2, note: '彩屏旗舰感' },
    ],
  },
  camera: {
    name: '摄像头',
    tiers: [
      { id: 0, label: '无摄像头', cap: 20, lenses: 0, cost: 0, weight: 0, bump: 0, note: '拍照槽不需要' },
      { id: 1, label: '30 万像素', cap: 60, lenses: 1, cost: 3, weight: 3, bump: 0.4, note: '能认人就行' },
      { id: 2, label: '130 万像素', cap: 85, lenses: 1, cost: 6, weight: 5, bump: 0.6, note: '彩信能发清楚' },
    ],
  },
  battery: {
    name: '电池',
    tiers: [
      { id: 0, label: '800 mAh · 待机 7 天', cap: 60, thick: 0, weight: 0, cost: 1, standbyDays: 7, note: '一周一充' },
      { id: 1, label: '1000 mAh · 待机 12 天', cap: 80, thick: 0.6, weight: 6, cost: 2, standbyDays: 12, note: '出差不怕' },
      { id: 2, label: '1500 mAh · 待机 20 天', cap: 100, thick: 1.4, weight: 14, cost: 4, standbyDays: 20, note: '待机之王' },
    ],
  },
  material: {
    name: '机身材质',
    tiers: [
      { id: 0, label: '工程塑料', cap: 70, cost: 1, density: 1.0, thick: 0, note: '耐摔，砸核桃级' },
      { id: 1, label: '钢琴烤漆', cap: 85, cost: 3, density: 1.05, thick: 0.2, note: '亮面显档次，怕摔' },
      { id: 2, label: '金属拉丝', cap: 100, cost: 6, density: 1.15, thick: 0, note: '商务感' },
    ],
  },
  size: {
    name: '机身尺寸',
    tiers: [
      { id: 0, label: '迷你', w: 44, h: 98, cost: -1, note: '塞裤袋无感' },
      { id: 1, label: '标准', w: 48, h: 108, cost: 0, note: '按键机常见身材' },
      { id: 2, label: '大屏大键', w: 56, h: 118, cost: 2, note: '老年机友好' },
    ],
  },
  keyboard: {
    name: '键盘',
    tiers: [
      { id: 0, label: '数字键', cost: 0, note: '标准 T9' },
      { id: 1, label: '大字键', cost: 1, note: '父母刚需加分' },
      { id: 2, label: '全键盘 QWERTY', cost: 3, thick: 0.8, note: '商务短信利器' },
    ],
  },
  ringtone: {
    name: '铃声',
    tiers: [
      { id: 0, label: '单音', cap: 50, cost: 0, note: '哔哔哔' },
      { id: 1, label: '16 和弦', cap: 75, cost: 1, note: '有点音乐感' },
      { id: 2, label: '64 和弦 · MP3', cap: 95, cost: 3, note: '发布会铃声段炸场' },
    ],
  },
  network: {
    name: '网络制式',
    tiers: [
      { id: 0, label: 'GSM', cost: 0, note: '能打电话发短信' },
      { id: 1, label: 'GPRS', cost: 1, note: '能上简易 WAP' },
      { id: 2, label: 'EDGE', cost: 2, note: '彩信更快一点' },
      { id: 3, label: '3G', cost: 5, note: '领先一代，媒体加分' },
    ],
  },
};

export const KEYPAD_PART_ORDER = ['chip', 'screen', 'camera', 'battery', 'material', 'size', 'keyboard', 'ringtone', 'network'];

export const KEYPAD_SLOTS = [
  { id: 'perf', name: '流畅度', blurb: '菜单短信不卡了' },
  { id: 'design', name: '外观与屏幕', blurb: '机身键盘有质感' },
  { id: 'camera', name: '拍照', blurb: '彩信能看清脸' },
  { id: 'battery', name: '待机与耐用', blurb: '一周一充，砸不坏' },
  { id: 'os', name: '铃声与功能', blurb: '和弦、收音机、短信体验' },
];

export const KEYPAD_POSITIONING = [
  { id: 'parents', name: '父母刚需', exp: 0.85, cost: 0.8, months: 3, who: '给爸妈买机的子女、老年用户', desc: '字大声大、待机久、别花哨。用户最看重「会不会用」和「耐不耐用」。' },
  { id: 'student', name: '学生入门', exp: 0.9, cost: 0.85, months: 3, who: '第一次拥有手机的学生', desc: '便宜、好看一点、能发短信听音乐。不挑配置，但很看重「同学有没有」。' },
  { id: 'biz', name: '商务', exp: 1.05, cost: 1.05, months: 4, who: '打电话发短信最多的上班族', desc: '信号稳、键盘好按、双卡最好。外观要体面。' },
  { id: 'fashion', name: '时尚', exp: 1.1, cost: 1.1, months: 4, who: '追潮流的年轻人', desc: '彩屏、和弦铃声、拍照。贵一点也有人追。' },
];

export const KEYPAD_SELL_POINTS = [
  { id: 'standby', name: '超长待机', desc: '待机与耐用 ≥70，且电池至少中档。大彩屏会吃待机。' },
  { id: 'loud', name: '字大声大', desc: '大字键或老年机形态，且铃声与功能 ≥60。' },
  { id: 'tough', name: '砸不坏', desc: '待机与耐用 ≥75，材质为工程塑料或金属拉丝。烤漆好看但怕摔。' },
  { id: 'chord', name: '和弦铃声', desc: '铃声选 64 和弦，且铃声与功能 ≥70。' },
  { id: 'camphone', name: '拍照手机', desc: '有摄像头且拍照研发 ≥65。没摄像头别选。' },
  { id: 'dualsim', name: '双卡双待', desc: '装备「双卡双待」创新件。' },
  { id: 'value', name: '性价比之王', desc: '售价 ≤ 心理价位 × 0.92。' },
];

export const KEYPAD_PRICE_BANDS = [
  { id: 'entry', name: '入门', price: 299, demand: 2.8 },
  { id: 'mid', name: '主流', price: 899, demand: 1.2 },
  { id: 'high', name: '高端', price: 1999, demand: 0.55 },
];

export const KEYPAD_IDEAL = {
  parents: { perf: 10, design: 15, camera: 5, battery: 40, os: 30 },
  student: { perf: 20, design: 25, camera: 15, battery: 20, os: 20 },
  biz: { perf: 25, design: 20, camera: 5, battery: 30, os: 20 },
  fashion: { perf: 15, design: 35, camera: 20, battery: 10, os: 20 },
};

export const KEYPAD_POINT_RULES = {
  standby: {
    name: '超长待机',
    test: (st, phys) => st.slots.battery.progress >= 70 && (st.design?.parts?.battery ?? 0) >= 1,
  },
  loud: {
    name: '字大声大',
    test: (st) =>
      st.slots.os.progress >= 60 &&
      (st.design?.formFactor === 'elder' || (st.design?.parts?.keyboard ?? 0) >= 1),
  },
  tough: {
    name: '砸不坏',
    test: (st) => st.slots.battery.progress >= 75 && [0, 2].includes(st.design?.parts?.material ?? -1),
  },
  chord: {
    name: '和弦铃声',
    test: (st) => (st.design?.parts?.ringtone ?? 0) >= 2 && st.slots.os.progress >= 70,
  },
  camphone: {
    name: '拍照手机',
    test: (st) => (st.design?.parts?.camera ?? 0) >= 1 && st.slots.camera.progress >= 65,
  },
  dualsim: {
    name: '双卡双待',
    test: (st) => (st.design?.concepts || []).includes('dualsim'),
  },
  value: {
    name: '性价比之王',
    test: (st) => (st.product.price && st.product.fair ? st.product.price <= st.product.fair * 0.92 : st.product.priceId === 'entry'),
  },
};

export const KEYPAD_POS_BASE = { parents: 399, student: 599, biz: 1299, fashion: 1599 };

export const KEYPAD_CONCEPTS = [
  { id: 'dualsim', name: '双卡双待', cat: '实用', cost: 2, thick: 0.2, weight: 2, caps: { os: 6 }, buzz: 4, appear: { gen: 1 }, note: '两张卡同时在线' },
  { id: 'torch', name: '手电筒', cat: '实用', cost: 1, thick: 0, weight: 1, caps: { battery: 2 }, buzz: 1, appear: { gen: 1 }, note: '顶部 LED' },
  { id: 'fm', name: 'FM 收音机', cat: '娱乐', cost: 1, thick: 0, weight: 1, caps: { os: 8 }, buzz: 2, appear: { gen: 1 }, note: '耳机当天线' },
  { id: 'mp3', name: 'MP3 播放', cat: '娱乐', cost: 2, thick: 0, weight: 1, caps: { os: 10 }, buzz: 5, appear: { gen: 1 }, note: '走路听歌' },
  { id: 'microsd', name: '内存卡扩展', cat: '实用', cost: 1, thick: 0, weight: 0, caps: { os: 4 }, buzz: 2, appear: { gen: 1 }, note: '多存几首歌' },
  { id: 'bt', name: '蓝牙', cat: '互联', cost: 2, thick: 0, weight: 1, caps: { os: 6 }, buzz: 3, appear: { gen: 1 }, note: '无线传通讯录' },
  { id: 'irda', name: '红外传输', cat: '互联', cost: 1, thick: 0, weight: 0, caps: { os: 3 }, buzz: 1, appear: { gen: 1 }, note: '对一下就能传' },
  { id: 'loudspeaker', name: '超大外放喇叭', cat: '实用', cost: 2, thick: 0.4, weight: 4, caps: { os: 8, design: 2 }, buzz: 3, appear: { gen: 1 }, note: '免提开会够响' },
  { id: 'qwerty', name: '全键盘', cat: '外观', cost: 3, thick: 0.8, weight: 6, caps: { design: 6, os: 4 }, buzz: 4, appear: { gen: 1 }, note: '商务短信利器' },
  { id: 'whipant', name: '拉杆天线', cat: '彩蛋', cost: 1, thick: 0, weight: 2, caps: { battery: 2 }, buzz: 6, appear: { gen: 1 }, note: '复古信号桩' },
];

/** 现代词黑名单：按键包可见文案不得命中 */
export const KEYPAD_BANNED =
  /跑分|高刷|大底|全面屏|旗舰屏|钛合金|硅胶素皮|遥遥领先|Are you OK|Only .+ can do|mAh\s*6000|6000\s*mAh|影像叙事|性能猛兽|App\s*网格|挖孔|潜望|一英寸大底|蜂鸟跑分|蓝莓\s*15(?!\s*[BBEK])/;

export function keypadRoundPrice(v) {
  const n = Math.max(99, Math.round(v / 10) * 10 - 1);
  return n;
}

export const keypadPack = {
  id: 'keypad',
  name: '按键时代',
  parts: KEYPAD_PARTS,
  partOrder: KEYPAD_PART_ORDER,
  positioning: KEYPAD_POSITIONING,
  sellPoints: KEYPAD_SELL_POINTS,
  priceBands: KEYPAD_PRICE_BANDS,
  slots: KEYPAD_SLOTS,
  ideal: KEYPAD_IDEAL,
  pointRules: KEYPAD_POINT_RULES,
  posBasePrice: KEYPAD_POS_BASE,
  channelRate: 0.12,
  demandBase: 26,
  qualityExp: { parents: 1.1, student: 1.2, biz: 1.4, fashion: 1.5 },
  priceRange: { floor: 99, step: 10, ref: 899 },
  recommendedPlan: { positioningId: 'student', pointIds: ['standby', 'value'], priceId: 'mid', bindEco: false },
  recommendedByForm: {
    feature: { positioningId: 'student', pointIds: ['standby', 'chord'], priceId: 'mid', bindEco: false },
    elder: { positioningId: 'parents', pointIds: ['loud', 'standby', 'tough'], priceId: 'entry', bindEco: false },
  },
  features: { cameraModule: false, screenForm: false, matSubs: false, chipLab: false, liveOS: 'feature' },
  concepts: KEYPAD_CONCEPTS,
  conceptIds: KEYPAD_CONCEPTS.map((c) => c.id),
  bannedWords: KEYPAD_BANNED,
  bom(costPts) {
    return Math.round(costPts * 15 + 60);
  },
  roundPrice: keypadRoundPrice,
  techRace: {
    kind: 'network',
    levels: ['GSM', 'GPRS', 'EDGE', '3G'],
    worldLevelAt(month) {
      if (month >= 24) return 3;
      if (month >= 16) return 2;
      if (month >= 8) return 1;
      return 0;
    },
  },
  readoutsKind: 'standby',
  rivals: [
    { brand: '蓝莓科技', model: '蓝莓 B 系列翻盖', price: 1599 },
    { brand: '方块数码', model: '方块 K 系列全键盘', price: 1999 },
    { brand: '极光移动', model: '极光 E 系列音乐手机', price: 899 },
    { brand: '青橙', model: '青橙老人机', price: 299 },
  ],
  tests: ['跌落测试（1.5 米）', '待机测试', '通话音质', '信号强度', '按键寿命（10 万次）'],
};
