/**
 * 按键时代内容包 — ERA_PLAN §5.4
 * 只依赖 timeline.js（无循环引用）。
 */
import { networkWorldLevel } from './timeline.js';

export const KEYPAD_PARTS = {
  chip: {
    name: '基带平台',
    tiers: [
      { id: 0, label: '入门基带', cap: 60, cost: 3, heat: 0, bench: 0, standbyDays: 0, note: '菜单偶尔卡一下' },
      { id: 1, label: '增强基带', cap: 80, cost: 5, heat: 0, bench: 0, standbyDays: 0, note: '短信通话都流畅' },
      { id: 2, label: '多媒体平台', cap: 100, cost: 9, heat: 1, bench: 0, standbyDays: 0, note: '能放 MP3、玩 Java 小游戏' },
    ],
  },
  screen: {
    name: '屏幕',
    tiers: [
      { id: 0, label: '单色屏 1.5″', design: 0, os: 70, cost: 2, standbyDays: 0, note: '绿底黑字，最省电' },
      { id: 1, label: '6.5 万色彩屏 1.8″', design: 12, os: 85, cost: 5, standbyDays: -1, note: '能看彩信了' },
      { id: 2, label: '26 万色大彩屏 2.4″', design: 22, os: 100, cost: 9, standbyDays: -2, note: '这一年最好的屏幕' },
    ],
  },
  camera: {
    name: '摄像头',
    tiers: [
      { id: 0, label: '无摄像头', cap: 20, lenses: 0, cost: 0, weight: 0, bump: 0, note: '不能拍照，成本最低' },
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
      { id: 0, label: '工程塑料', cap: 70, cost: 1, density: 1.0, thick: 0, note: '耐摔，能砸核桃' },
      { id: 1, label: '钢琴烤漆', cap: 85, cost: 3, density: 1.05, thick: 0.2, note: '亮面显档次，就是怕摔' },
      { id: 2, label: '金属拉丝', cap: 100, cost: 6, density: 1.15, thick: 0, note: '商务感' },
    ],
  },
  size: {
    name: '机身尺寸',
    tiers: [
      { id: 0, label: '迷你', w: 44, h: 98, cost: -1, note: '放裤兜里没感觉' },
      { id: 1, label: '标准', w: 48, h: 108, cost: 0, note: '最常见的大小' },
      { id: 2, label: '大屏大键', w: 56, h: 118, cost: 2, note: '屏幕和按键都更大' },
    ],
  },
  keyboard: {
    name: '键盘',
    tiers: [
      { id: 0, label: '数字键', cost: 0, note: '标准九宫格' },
      { id: 1, label: '大字键', cost: 1, note: '按键更大，字更清楚' },
      { id: 2, label: '全键盘 QWERTY', cost: 3, thick: 0.8, note: '每个字母一个键，回短信快' },
    ],
  },
  ringtone: {
    name: '铃声',
    tiers: [
      { id: 0, label: '单音', cap: 50, cost: 0, note: '响亮的「嘀嘀」声' },
      { id: 1, label: '16 和弦', cap: 75, cost: 1, note: '能放一段完整旋律' },
      { id: 2, label: '64 和弦 · MP3', cap: 95, cost: 3, note: '外放像一支小乐队' },
    ],
  },
  network: {
    name: '网络制式',
    tiers: [
      { id: 0, label: 'GSM', cost: 0, note: '能打电话发短信' },
      { id: 1, label: 'GPRS', cost: 1, note: '能上简易 WAP' },
      { id: 2, label: 'EDGE', cost: 2, note: '彩信更快一点' },
      { id: 3, label: '3G', cost: 5, note: '能视频通话' },
    ],
  },
};

/** 按定位的推荐配置（制式会被限制在行业已有的档位内） */
export const KEYPAD_RECOMMENDED = {
  parents: { chip: 0, screen: 0, camera: 0, battery: 2, material: 0, size: 2, keyboard: 1, ringtone: 1, network: 0 },
  student: { chip: 1, screen: 1, camera: 1, battery: 1, material: 0, size: 1, keyboard: 0, ringtone: 2, network: 1 },
  biz: { chip: 1, screen: 1, camera: 0, battery: 2, material: 2, size: 1, keyboard: 2, ringtone: 1, network: 2 },
  fashion: { chip: 2, screen: 2, camera: 2, battery: 0, material: 1, size: 0, keyboard: 0, ringtone: 2, network: 2 },
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
  { id: 'parents', name: '父母刚需', exp: 0.85, cost: 0.8, months: 3, who: '给爸妈买机的子女、老年用户', desc: '子女买给爸妈，或者老人自己挑。要字大声大、待机久、按键好按，功能越简单越好。' },
  { id: 'student', name: '学生入门', exp: 0.9, cost: 0.85, months: 3, who: '第一次拥有手机的学生', desc: '第一次有自己的手机。要便宜、好看，能发短信、听歌。同学用什么，他们就想要什么。' },
  { id: 'biz', name: '商务', exp: 1.05, cost: 1.05, months: 4, who: '打电话发短信最多的上班族', desc: '电话短信一天几十条。信号要稳、键盘要快、待机要长，拿出来要体面。' },
  { id: 'fashion', name: '时尚', exp: 1.1, cost: 1.1, months: 4, who: '追潮流的年轻人', desc: '要彩屏、和弦铃声、能拍照，外观要新。贵一点也愿意买。' },
];

export const KEYPAD_SELL_POINTS = [
  { id: 'standby', name: '超长待机', desc: '一礼拜不用充电。要大一点的电池，研发时多花力气在「待机与耐用」上；彩屏越大越费电。' },
  { id: 'loud', name: '字大声大', desc: '不戴老花镜也看得清、听得见。要老年机或大字键，铃声和听筒要调得够响。' },
  { id: 'tough', name: '砸不坏', desc: '摔不坏、砸得了核桃。机身用工程塑料或金属，「待机与耐用」要做扎实；烤漆好看但怕摔。' },
  { id: 'chord', name: '和弦铃声', desc: '一响全车厢都回头。铃声要选 64 和弦，「铃声与功能」要调好。' },
  { id: 'camphone', name: '拍照手机', desc: '能拍照、能发彩信。要装摄像头，研发时「拍照」要过关。' },
  { id: 'dualsim', name: '双卡双待', desc: '一台手机两个号码。要装上「双卡双待」。' },
  { id: 'value', name: '性价比之王', desc: '同样的钱买到更好的手机。售价要明显低于用户心里的价位。' },
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

/**
 * 按键时代创新件（与现代 CONCEPTS 同一结构，era: 'keypad'）。
 * appear.kmonth：按编年第 1–18 月校准的出现时间（快速局自动换算）；needs：依赖的部件档位。
 */
export const KEYPAD_CONCEPTS = [
  // —— 实用功能（不占创新名额） ——
  { id: 'torch', era: 'keypad', cat: 'fun', tier: 1, appear: { kmonth: 1 }, name: '手电筒', icon: '🔦', desc: '顶部一颗 LED，停电走夜路用得上', cost: 1, thick: 0, weight: 1, caps: { battery: 1 }, buzz: 2, risk: 2, conflicts: [] },
  { id: 'fm', era: 'keypad', cat: 'fun', tier: 1, appear: { kmonth: 1 }, name: 'FM 收音机', icon: '📻', desc: '插上耳机就能听广播，耳机线当天线', cost: 1, thick: 0, weight: 1, caps: { os: 4 }, buzz: 3, risk: 2, conflicts: [] },
  { id: 'irda', era: 'keypad', cat: 'fun', tier: 1, appear: { kmonth: 1 }, name: '红外传输', icon: '🔴', desc: '两台手机头对头，传名片和铃声', cost: 1, thick: 0, weight: 0, caps: { os: 2 }, buzz: 1, risk: 2, conflicts: [] },
  { id: 'loudspeaker', era: 'keypad', cat: 'fun', tier: 1, appear: { kmonth: 1 }, name: '大音量外放', icon: '🔊', desc: '免提开会、外放铃声都够响', cost: 2, thick: 0.3, weight: 3, caps: { os: 4 }, buzz: 3, risk: 3, conflicts: [] },
  { id: 'superstandby', era: 'keypad', cat: 'power', tier: 1, appear: { kmonth: 1 }, name: '省电模式', icon: '🔋', desc: '关掉背光和铃声，待机再多几天', cost: 1, thick: 0, weight: 0, caps: { battery: 5 }, buzz: 2, risk: 2, conflicts: [] },
  { id: 'mms', era: 'keypad', cat: 'fun', tier: 1, appear: { kmonth: 3 }, needs: { screen: 1 }, name: '彩信', icon: '✉️', desc: '短信里能带图片和铃声（要彩屏）', cost: 1, thick: 0, weight: 0, caps: { os: 4 }, buzz: 3, risk: 3, conflicts: [] },
  { id: 'microsd', era: 'keypad', cat: 'fun', tier: 1, appear: { kmonth: 5 }, name: '存储卡扩展', icon: '💾', desc: '插一张卡，多存几百首歌和照片', cost: 1, thick: 0, weight: 0, caps: { os: 3 }, buzz: 2, risk: 2, conflicts: [] },
  { id: 'recorder', era: 'keypad', cat: 'fun', tier: 1, appear: { kmonth: 6 }, name: '通话录音', icon: '🎙️', desc: '跑业务的人都想要', cost: 1, thick: 0, weight: 0, caps: { os: 3 }, buzz: 2, risk: 2, conflicts: [] },
  { id: 'camflash', era: 'keypad', cat: 'cam', tier: 1, appear: { kmonth: 6 }, needs: { camera: 1 }, name: '补光灯', icon: '💡', desc: '晚上拍照也能看清脸（要有摄像头）', cost: 1, thick: 0, weight: 1, caps: { camera: 6 }, buzz: 2, risk: 2, conflicts: [] },
  // —— 创新（占名额，决定新颖度和话题） ——
  { id: 'dualsim', era: 'keypad', cat: 'fun', tier: 1, appear: { kmonth: 1 }, name: '双卡双待', icon: '📶', desc: '一台手机两个号码，工作和家里分开', cost: 2, thick: 0.2, weight: 2, caps: { os: 5 }, buzz: 6, risk: 5, conflicts: [] },
  { id: 'colorshell', era: 'keypad', cat: 'body', tier: 1, appear: { kmonth: 1 }, name: '可换彩壳', icon: '🎨', desc: '前后壳能换颜色，一台手机七种心情', cost: 1, thick: 0.1, weight: 2, caps: { design: 5 }, buzz: 5, risk: 4, conflicts: ['rugged'] },
  { id: 'whipant', era: 'keypad', cat: 'body', tier: 1, appear: { kmonth: 1 }, name: '拉杆天线', icon: '📡', desc: '信号差就拉出来，郊区山区也能打', cost: 1, thick: 0, weight: 2, caps: { battery: 2, design: -3 }, buzz: 4, risk: 3, conflicts: [] },
  { id: 'marquee', era: 'keypad', cat: 'body', tier: 1, appear: { kmonth: 3 }, name: '跑马灯', icon: '🌈', desc: '来电时机身边缘一圈彩灯转起来', cost: 2, thick: 0.1, weight: 2, caps: { design: 5, battery: -3 }, buzz: 7, risk: 5, conflicts: [] },
  { id: 'callflash', era: 'keypad', cat: 'body', tier: 1, appear: { kmonth: 3 }, name: '来电闪光', icon: '✨', desc: '天线头一闪一闪，来电一眼看见', cost: 1, thick: 0, weight: 1, caps: { design: 2 }, buzz: 4, risk: 3, conflicts: [] },
  { id: 'mp3', era: 'keypad', cat: 'fun', tier: 1, appear: { kmonth: 4 }, name: 'MP3 播放', icon: '🎵', desc: '一百首歌装进口袋，随身听可以退休了', cost: 3, thick: 0.1, weight: 2, caps: { os: 8 }, buzz: 7, risk: 6, conflicts: [] },
  { id: 'java', era: 'keypad', cat: 'fun', tier: 1, appear: { kmonth: 6 }, needs: { screen: 1 }, name: 'Java 游戏', icon: '🕹️', desc: '能下载小游戏，课间人手一局（要彩屏）', cost: 2, thick: 0, weight: 0, caps: { os: 6, perf: 3 }, buzz: 6, risk: 5, conflicts: [] },
  { id: 'bt', era: 'keypad', cat: 'fun', tier: 2, appear: { kmonth: 8 }, name: '蓝牙', icon: '🔵', desc: '无线耳机、无线传歌，不用头对头', cost: 2, thick: 0, weight: 1, caps: { os: 5 }, buzz: 5, risk: 5, conflicts: [] },
  { id: 'rugged', era: 'keypad', cat: 'body', tier: 2, appear: { kmonth: 8 }, name: '三防机身', icon: '🛡️', desc: '防水、防尘、防摔，工地矿山都能用', cost: 4, thick: 1.2, weight: 22, caps: { battery: 8, design: -5 }, buzz: 6, risk: 8, conflicts: ['colorshell'] },
  { id: 'kstylus', era: 'keypad', cat: 'form', tier: 2, appear: { kmonth: 10 }, name: '手写输入', icon: '✍️', desc: '不会拼音也能写短信，长辈最爱', cost: 3, thick: 0.2, weight: 3, caps: { os: 5, design: 2 }, buzz: 6, risk: 6, conflicts: [] },
  { id: 'swivelcam', era: 'keypad', cat: 'cam', tier: 2, appear: { kmonth: 10 }, needs: { camera: 1 }, name: '旋转摄像头', icon: '🔄', desc: '镜头能转 180 度，前后都能拍（要有摄像头）', cost: 3, thick: 0.3, weight: 4, caps: { camera: 6, design: 3 }, buzz: 7, risk: 7, conflicts: [] },
  { id: 'bizcard', era: 'keypad', cat: 'cam', tier: 2, appear: { kmonth: 10 }, needs: { camera: 1 }, name: '名片识别', icon: '📇', desc: '拍一下名片，号码自动存进通讯录', cost: 2, thick: 0, weight: 0, caps: { camera: 3, os: 4 }, buzz: 6, risk: 6, conflicts: [] },
  { id: 'mobiletv', era: 'keypad', cat: 'fun', tier: 3, appear: { kmonth: 12 }, needs: { screen: 2 }, name: '手机电视', icon: '📺', desc: '拉出天线就能看电视节目（要大彩屏）', cost: 5, thick: 0.4, weight: 6, caps: { os: 7, battery: -6 }, buzz: 9, risk: 10, conflicts: [] },
  { id: 'fingerprint', era: 'keypad', cat: 'fun', tier: 3, appear: { kmonth: 14 }, name: '指纹锁', icon: '👆', desc: '按一下才能开机，商务人士放心', cost: 4, thick: 0.1, weight: 2, caps: { os: 4 }, buzz: 8, risk: 10, conflicts: [] },
  { id: 'videocall', era: 'keypad', cat: 'cam', tier: 3, appear: { kmonth: 19 }, needs: { network: 3, camera: 1 }, name: '视频通话', icon: '🎥', desc: '前置摄像头 + 3G，打电话能看见脸', cost: 4, thick: 0.1, weight: 2, caps: { camera: 4, os: 6 }, buzz: 9, risk: 10, conflicts: [] },
];
export const KEYPAD_PRACTICAL = ['torch', 'fm', 'irda', 'loudspeaker', 'superstandby', 'mms', 'microsd', 'recorder', 'camflash'];

/** 按键时代的品类组合 */
export const KEYPAD_COMBOS = [
  { id: 'k-music', name: '音乐手机', test: (d) => (d.concepts || []).includes('mp3') && (d.parts?.ringtone ?? 0) === 2 },
  { id: 'k-elder', name: '孝心机', test: (d) => d.formFactor === 'elder' && (d.concepts || []).includes('torch') && (d.concepts || []).includes('fm') },
  { id: 'k-biz', name: '商务旗舰', test: (d) => (d.parts?.keyboard ?? 0) === 2 && (d.concepts || []).includes('dualsim') && (d.parts?.material ?? 0) === 2 },
  { id: 'k-cam', name: '拍照手机', test: (d) => (d.parts?.camera ?? 0) === 2 && (d.concepts || []).includes('camflash') },
  { id: 'k-tank', name: '砸不坏', test: (d) => (d.concepts || []).includes('rugged') && (d.parts?.battery ?? 0) === 2 },
  { id: 'k-fun', name: '学生娱乐机', test: (d) => (d.concepts || []).includes('java') && (d.concepts || []).includes('mp3') },
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
  qualityExp: { parents: 0.9, student: 1.0, biz: 1.2, fashion: 1.3 },
  priceRange: { floor: 99, step: 10, ref: 899 },
  recommendedPlan: { positioningId: 'student', pointIds: ['standby', 'value'], priceId: 'mid', bindEco: false },
  recommendedByForm: {
    feature: { positioningId: 'student', pointIds: ['standby', 'chord'], priceId: 'mid', bindEco: false },
    elder: { positioningId: 'parents', pointIds: ['loud', 'standby', 'tough'], priceId: 'entry', bindEco: false },
  },
  features: { cameraModule: false, screenForm: false, matSubs: false, chipLab: false, liveOS: 'feature' },
  concepts: KEYPAD_CONCEPTS,
  conceptIds: KEYPAD_CONCEPTS.map((c) => c.id),
  combos: KEYPAD_COMBOS,
  bannedWords: KEYPAD_BANNED,
  bom(costPts) {
    return Math.round(costPts * 15 + 60);
  },
  roundPrice: keypadRoundPrice,
  techRace: {
    kind: 'network',
    levels: ['GSM', 'GPRS', 'EDGE', '3G'],
    worldLevelAt: (month, mode = 'quick', flags = {}) => networkWorldLevel(month, mode, flags),
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
