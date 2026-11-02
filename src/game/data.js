/** 静态配置与文案 — 《电子产品发展国》 */

export const SAVE_KEY = 'epdg-prototype-v2';

export const SLOTS = [
  { id: 'perf', name: '性能', blurb: '更流畅了' },
  { id: 'design', name: '屏幕与外观', blurb: '外形有点信仰' },
  { id: 'camera', name: '影像', blurb: '样张能发朋友圈了' },
  { id: 'battery', name: '续航与稳定', blurb: '半夜不用趴着充电' },
  { id: 'os', name: '系统与生态', blurb: '软硬一体有那么点意思' },
];

/** 部门：玩家只管大方向，升级部门而不是逐个招人 */
export const DEPTS = [
  { id: 'design', name: '设计部', icon: '🎨', desc: ['每代 1 个概念件', '每代 2 个概念件 · 外观研发 +15%', '每代 3 个概念件 · 外观研发 +30%'], costs: [30, 60] },
  { id: 'rnd', name: '研发部', icon: '🔬', desc: ['人力 6 点/月', '人力 8 点/月 · 研发点 +1', '人力 10 点/月 · 研发点 +2'], costs: [35, 70] },
  { id: 'supply', name: '供应链', icon: '🏭', desc: ['事故率 ×1', '事故率 ×0.8 · 量产更快', '事故率 ×0.6 · 成本 -5%'], costs: [25, 55] },
  { id: 'pr', name: '公关部', icon: '📣', desc: ['发布会 +3', '发布会 +7 · 出圈 +20%', '发布会 +11 · 出圈 +40%'], costs: [25, 55] },
];

export const POSITIONING = [
  { id: 'flagship', name: '旗舰', exp: 1.2, cost: 1.25, months: 5 },
  { id: 'mainstream', name: '主流', exp: 1.0, cost: 1.0, months: 4 },
  { id: 'minimal', name: '极简', exp: 0.95, cost: 0.9, months: 4 },
  { id: 'pro', name: '专业', exp: 1.15, cost: 1.15, months: 5 },
];

export const SELL_POINTS = [
  { id: 'thin', name: '极致轻薄' },
  { id: 'fast', name: '性能猛兽' },
  { id: 'photo', name: '影像叙事' },
  { id: 'battery', name: '续航焦虑终结者' },
  { id: 'eco', name: '生态闭环' },
  { id: 'price', name: '性价比刺客' },
];

export const PRICE_BANDS = [
  { id: 'low', name: '亲民带', price: 1999, demand: 2.2 },
  { id: 'mid', name: '主流带', price: 3999, demand: 1.0 },
  { id: 'high', name: '旗舰带', price: 6999, demand: 0.55 },
];

export const SUPPLIERS = [
  {
    id: 'cheap',
    name: '便宜不稳',
    desc: '报价香，但事故多',
    costMul: 0.85,
    eventChance: 0.55,
    quality: 0.9,
  },
  {
    id: 'balanced',
    name: '均衡之选',
    desc: '中庸即正义',
    costMul: 1.0,
    eventChance: 0.35,
    quality: 1.0,
  },
  {
    id: 'premium',
    name: '贵但稳',
    desc: '钱包瘦了，良率胖了',
    costMul: 1.2,
    eventChance: 0.18,
    quality: 1.12,
  },
];

export const STOCK_OPTS = [
  { id: 'safe', name: '保守', mul: 0.7, note: '宁缺毋滥' },
  { id: 'normal', name: '正常', mul: 1.0, note: '按直觉备' },
  { id: 'aggressive', name: '激进', mul: 1.4, note: '仓库赌徒' },
];

export const COMPANY_NAME_SEEDS = [
  '键程实验室',
  '像素工坊',
  '北桥电子',
  '清河智造',
  '蜂鸟硬件社',
  '回路工作室',
  '星轨终端',
  '青瓷数码',
];

/** 事件卡：缺芯 / 良率 / 泄露 */
export const EVENTS = [
  {
    id: 'chip_short',
    type: '缺芯',
    title: '晶圆厂说「下个月一定有」',
    body: '主芯片交期跳票。论坛已经开始复读「又跳票」。',
    choices: [
      {
        label: '加钱插队',
        effect: { cash: -40, months: 0, slotPenalty: {} },
      },
      {
        label: '延期一个月',
        effect: { cash: 0, months: 1, slotPenalty: {} },
      },
      {
        label: '降规格换芯片',
        effect: { cash: -10, months: 0, slotPenalty: { perf: 8 } },
      },
    ],
  },
  {
    id: 'yield',
    type: '良率',
    title: '良率曲线画成了滑雪道',
    body: '试产线良率扑街。供应链经理的咖啡因超标了。',
    choices: [
      {
        label: '加急治具（烧钱）',
        effect: { cash: -35, months: 0, slotPenalty: {} },
      },
      {
        label: '接受延期',
        effect: { cash: 0, months: 1, slotPenalty: {} },
      },
      {
        label: '赌一把继续',
        effect: { cash: 0, months: 0, slotPenalty: { battery: 6, design: 4 }, gambleFail: true },
      },
    ],
  },
  {
    id: 'leak',
    type: '泄露',
    title: '工程机出现在二手群',
    body: '模糊真机图配上「内部人士」——热度来了，惊喜没了。',
    choices: [
      {
        label: '公关降温',
        effect: { cash: -20, hype: -5, leak: 1 },
      },
      {
        label: '顺势预热',
        effect: { cash: 0, hype: 12, leak: 1 },
      },
      {
        label: '装作没看见',
        effect: { cash: 0, hype: 4, faith: -4, leak: 1 },
      },
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
