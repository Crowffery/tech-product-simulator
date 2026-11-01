/** 静态配置与文案 — 《电子产品发展国》原型 */

export const SAVE_KEY = 'epdg-prototype-v1';

export const SLOTS = [
  { id: 'perf', name: '性能', blurb: '更流畅了' },
  { id: 'design', name: '屏幕与外观', blurb: '外形有点信仰' },
  { id: 'camera', name: '影像', blurb: '样张能发朋友圈了' },
  { id: 'battery', name: '续航与稳定', blurb: '半夜不用趴着充电' },
  { id: 'os', name: '系统与生态', blurb: '软硬一体有那么点意思' },
];

export const ROLES = [
  {
    id: 'id',
    title: '工业设计师',
    quirk: '坚持圆角必须「刚好」',
    stars: 3,
    cost: 10,
    boost: { design: 1.35 },
  },
  {
    id: 'pm',
    title: '硬件 PM',
    quirk: '日程表比芯片还密',
    stars: 3,
    cost: 11,
    boost: { perf: 1.15, battery: 1.15 },
  },
  {
    id: 'cam',
    title: '影像工程师',
    quirk: '开会必提「夜景」',
    stars: 2,
    cost: 12,
    boost: { camera: 1.4 },
  },
  {
    id: 'osdev',
    title: '系统体验',
    quirk: '动画少一帧都难受',
    stars: 3,
    cost: 13,
    boost: { os: 1.35 },
  },
  {
    id: 'supply',
    title: '供应链经理',
    quirk: '供应商饭局 survivors',
    stars: 2,
    cost: 15,
    boost: { eventLuck: 1 },
  },
  {
    id: 'pr',
    title: '公关 / 发布会',
    quirk: '幻灯片有呼吸感',
    stars: 2,
    cost: 14,
    boost: { launch: 1 },
  },
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
  { id: 'low', name: '亲民带', price: 1999, demand: 1.25 },
  { id: 'mid', name: '主流带', price: 3999, demand: 1.0 },
  { id: 'high', name: '旗舰带', price: 6999, demand: 0.75 },
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
];

export const LAUNCH_PREP = [
  {
    id: 'demo_stable',
    label: '加稳 Demo',
    desc: '少死机，少名场面',
    cost: 15,
    launch: 8,
  },
  {
    id: 'easter',
    label: '塞个彩蛋',
    desc: '媒体爱写，翻车也戏剧',
    cost: 10,
    launch: 6,
    risk: 0.15,
  },
  {
    id: 'spec_sheet',
    label: '堆参数稿',
    desc: '务实派点头，梦想派打哈欠',
    cost: 8,
    launch: 4,
  },
];

export const LAUNCH_BEATS = [
  {
    id: 'open',
    prompt: '开场怎么讲？',
    choices: [
      { label: '沉默走进来，只亮一灯', score: 6, risk: 0.1 },
      { label: '先念营收再念梦想', score: 2, risk: 0 },
      { label: '直接上真机上手环', score: 8, risk: 0.2 },
    ],
  },
  {
    id: 'demo',
    prompt: '现场 Demo：',
    choices: [
      { label: '安全预设流程', score: 5, risk: 0.05 },
      { label: '即兴夜景连拍', score: 10, risk: 0.35 },
      { label: '跳过 Demo 念 PPT', score: 1, risk: 0 },
    ],
  },
  {
    id: 'close',
    prompt: '压轴：',
    choices: [
      { label: '价格惊喜', score: 9, risk: 0.1 },
      { label: '「还有一件事」配件预告', score: 7, risk: 0.05 },
      { label: '务实结束，去摸机', score: 4, risk: 0 },
    ],
  },
];

export function randomCompanyName() {
  return COMPANY_NAME_SEEDS[Math.floor(Math.random() * COMPANY_NAME_SEEDS.length)];
}
