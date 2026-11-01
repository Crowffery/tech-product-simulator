/** 静态配置与文案 — 《电子产品发展国》原型（休闲口语） */

export const SAVE_KEY = 'epdg-prototype-v1';

export const SLOTS = [
  { id: 'perf', name: '好不好用', blurb: '点开 App 更顺了' },
  { id: 'design', name: '漂不漂亮', blurb: '拿出去有点面儿' },
  { id: 'camera', name: '拍不拍得好看', blurb: '朋友圈能发了' },
  { id: 'battery', name: '耐不耐用', blurb: '晚上不用到处找插座' },
  { id: 'os', name: '顺不顺手', blurb: '用着越来越顺' },
];

export const ROLES = [
  {
    id: 'id',
    title: '外观达人',
    quirk: '圆角差一毫米都要重来',
    stars: 3,
    cost: 10,
    boost: { design: 1.35 },
  },
  {
    id: 'pm',
    title: '进度队长',
    quirk: '日历比人还忙',
    stars: 3,
    cost: 11,
    boost: { perf: 1.15, battery: 1.15 },
  },
  {
    id: 'cam',
    title: '拍照狂魔',
    quirk: '开会必提夜景',
    stars: 2,
    cost: 12,
    boost: { camera: 1.4 },
  },
  {
    id: 'osdev',
    title: '手感调教师',
    quirk: '动画卡一下就难受',
    stars: 3,
    cost: 13,
    boost: { os: 1.35 },
  },
  {
    id: 'supply',
    title: '进货高手',
    quirk: '专治零件迟到',
    stars: 2,
    cost: 15,
    boost: { eventLuck: 1 },
  },
  {
    id: 'pr',
    title: '发布会主持',
    quirk: '幻灯片自带气氛组',
    stars: 2,
    cost: 14,
    boost: { launch: 1 },
  },
];

export const POSITIONING = [
  { id: 'flagship', name: '高高在上款', exp: 1.2, cost: 1.25, months: 5 },
  { id: 'mainstream', name: '大众都买款', exp: 1.0, cost: 1.0, months: 4 },
  { id: 'minimal', name: '极简干净款', exp: 0.95, cost: 0.9, months: 4 },
  { id: 'pro', name: '专业干活款', exp: 1.15, cost: 1.15, months: 5 },
];

export const SELL_POINTS = [
  { id: 'thin', name: '薄到离谱' },
  { id: 'fast', name: '快到飞起' },
  { id: 'photo', name: '拍照好看' },
  { id: 'battery', name: '特别耐用' },
  { id: 'eco', name: '全家桶联动' },
  { id: 'price', name: '价格真香' },
];

export const PRICE_BANDS = [
  { id: 'low', name: '便宜点卖', price: 1999, demand: 1.25 },
  { id: 'mid', name: '正常价', price: 3999, demand: 1.0 },
  { id: 'high', name: '贵一点卖', price: 6999, demand: 0.75 },
];

export const SUPPLIERS = [
  {
    id: 'cheap',
    name: '便宜厂',
    desc: '省钱，但爱出幺蛾子',
    costMul: 0.85,
    eventChance: 0.55,
    quality: 0.9,
  },
  {
    id: 'balanced',
    name: '稳妥厂',
    desc: '不翻车也不最贵',
    costMul: 1.0,
    eventChance: 0.35,
    quality: 1.0,
  },
  {
    id: 'premium',
    name: '贵贵厂',
    desc: '贵，但省心',
    costMul: 1.2,
    eventChance: 0.18,
    quality: 1.12,
  },
];

export const STOCK_OPTS = [
  { id: 'safe', name: '少备一点', mul: 0.7, note: '怕压货' },
  { id: 'normal', name: '正常备货', mul: 1.0, note: '跟着感觉走' },
  { id: 'aggressive', name: '多备猛卖', mul: 1.4, note: '赌会爆单' },
];

export const COMPANY_NAME_SEEDS = [
  '键程小作坊',
  '像素玩具屋',
  '北桥小厂',
  '清河电电',
  '蜂鸟硬件社',
  '回路工作室',
  '星轨终端',
  '青瓷数码',
];

/** 事件卡：零件迟到 / 做好做坏 / 提前漏光 */
export const EVENTS = [
  {
    id: 'chip_short',
    type: '零件迟到',
    title: '关键零件又鸽了',
    body: '说好这周到的零件没影了。论坛开始复读「又延期」。',
    choices: [
      { label: '加钱插队', effect: { cash: -40, months: 0, slotPenalty: {} } },
      { label: '认栽，晚发一个月', effect: { cash: 0, months: 1, slotPenalty: {} } },
      { label: '换差一点的先顶上', effect: { cash: -10, months: 0, slotPenalty: { perf: 8 } } },
    ],
  },
  {
    id: 'yield',
    type: '做好做坏',
    title: '试产机合格的太少了',
    body: '流水线抽检一片惨淡。进货高手的咖啡续上了第三杯。',
    choices: [
      { label: '砸钱抢修产线', effect: { cash: -35, months: 0, slotPenalty: {} } },
      { label: '接受晚点发布', effect: { cash: 0, months: 1, slotPenalty: {} } },
      { label: '赌一把继续冲', effect: { cash: 0, months: 0, slotPenalty: { battery: 6, design: 4 }, gambleFail: true } },
    ],
  },
  {
    id: 'leak',
    type: '提前漏光',
    title: '真机照片跑进群里了',
    body: '糊成马赛克的真机图配「内部消息」——热度有了，惊喜没了。',
    choices: [
      { label: '花钱降温', effect: { cash: -20, hype: -5, leak: 1 } },
      { label: '顺势炒热', effect: { cash: 0, hype: 12, leak: 1 } },
      { label: '装作没看见', effect: { cash: 0, hype: 4, faith: -4, leak: 1 } },
    ],
  },
];

export const LAUNCH_PREP = [
  { id: 'demo_stable', label: '彩排稳一点', desc: '少死机', cost: 15, launch: 8 },
  { id: 'easter', label: '塞个小惊喜', desc: '媒体爱写', cost: 10, launch: 6, risk: 0.15 },
  { id: 'spec_sheet', label: '把卖点念清楚', desc: '务实派点头', cost: 8, launch: 4 },
];

export const LAUNCH_BEATS = [
  {
    id: 'open',
    prompt: '开场怎么讲？',
    choices: [
      { label: '安静上场，只开一盏灯', score: 6, risk: 0.1 },
      { label: '先吹牛再上真机', score: 2, risk: 0 },
      { label: '直接上手给大家看', score: 8, risk: 0.2 },
    ],
  },
  {
    id: 'demo',
    prompt: '现场演示：',
    choices: [
      { label: '走一遍安全流程', score: 5, risk: 0.05 },
      { label: '现场即兴连拍', score: 10, risk: 0.35 },
      { label: '跳过演示念稿', score: 1, risk: 0 },
    ],
  },
  {
    id: 'close',
    prompt: '压轴：',
    choices: [
      { label: '价格给个惊喜', score: 9, risk: 0.1 },
      { label: '预告还有配件', score: 7, risk: 0.05 },
      { label: '收工，去摸机', score: 4, risk: 0 },
    ],
  },
];

export function randomCompanyName() {
  return COMPANY_NAME_SEEDS[Math.floor(Math.random() * COMPANY_NAME_SEEDS.length)];
}
