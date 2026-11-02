/** 静态配置与文案 — 《电子产品发展国》原型（休闲口语） */

export const SAVE_KEY = 'epdg-prototype-v2';

export const SLOTS = [
  { id: 'perf', name: '好不好用', blurb: '点开 App 更顺了' },
  { id: 'design', name: '漂不漂亮', blurb: '拿出去有点面儿' },
  { id: 'camera', name: '拍不拍得好看', blurb: '朋友圈能发了' },
  { id: 'battery', name: '耐不耐用', blurb: '晚上不用到处找插座' },
  { id: 'os', name: '顺不顺手', blurb: '用着越来越顺' },
];

/** 部门：玩家只管大方向，升级部门而不是逐个招人 */
export const DEPTS = [
  { id: 'design', name: '设计部', icon: '🎨', desc: ['每代 1 个概念件', '每代 2 个概念件 · 外观研发 +15%', '每代 3 个概念件 · 外观研发 +30%'], costs: [30, 60] },
  { id: 'rnd', name: '研发部', icon: '🔬', desc: ['人力 6 点/月', '人力 8 点/月 · 研发点 +1', '人力 10 点/月 · 研发点 +2'], costs: [35, 70] },
  { id: 'supply', name: '供应链', icon: '🏭', desc: ['事故率 ×1', '事故率 ×0.8 · 量产更快', '事故率 ×0.6 · 成本 -5%'], costs: [25, 55] },
  { id: 'pr', name: '公关部', icon: '📣', desc: ['发布会 +3', '发布会 +7 · 出圈 +20%', '发布会 +11 · 出圈 +40%'], costs: [25, 55] },
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
  { id: 'low', name: '亲民带', price: 1999, demand: 2.2 },
  { id: 'mid', name: '主流带', price: 3999, demand: 1.0 },
  { id: 'high', name: '旗舰带', price: 6999, demand: 0.55 },
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
  {
    id: 'hinge',
    type: '铰链',
    when: (st) => (st.design?.concepts || []).some((c) => ['fold', 'trifold', 'rollable', 'slider', 'swivel'].includes(c)),
    title: '铰链测试机折了第 8 万次……然后断了',
    body: '可靠性实验室发来一段慢动作视频，配文：「它尽力了」。',
    choices: [
      { label: '换航天级合金（烧钱）', effect: { cash: -35, months: 0, slotPenalty: {} } },
      { label: '再磨一个月', effect: { cash: 0, months: 1, slotPenalty: {} } },
      { label: '发布会上不演示折叠', effect: { cash: 0, months: 0, slotPenalty: { design: 8 }, gambleFail: true } },
    ],
  },
  {
    id: 'spyshot',
    type: '谍照',
    when: (st) => (st.design?.concepts || []).length > 0,
    title: '路人拍到工程机：「这是什么黑科技？」',
    body: '模糊照片在社交网络疯传，评论区已经开始脑补发布会。',
    choices: [
      { label: '官方阴阳一句「敬请期待」', effect: { cash: 0, hype: 14 } },
      { label: '律师函警告', effect: { cash: -10, hype: 4, faith: 2 } },
      { label: '干脆提前官宣', effect: { cash: 0, hype: 8, faith: 3 } },
    ],
  },
];

export function randomCompanyName() {
  return COMPANY_NAME_SEEDS[Math.floor(Math.random() * COMPANY_NAME_SEEDS.length)];
}
