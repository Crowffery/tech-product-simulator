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
  { id: 'design', name: '设计部', icon: '🎨', desc: ['每代 1 个概念件', '每代 2 个概念件 · 外观研发 +15%', '每代 3 个概念件 · 外观研发 +30%'], costs: [120, 240] },
  { id: 'rnd', name: '研发部', icon: '🔬', desc: ['人力 6 点/月', '人力 8 点/月 · 研发点 +1', '人力 10 点/月 · 研发点 +2'], costs: [140, 280] },
  { id: 'supply', name: '供应链', icon: '🏭', desc: ['事故率 ×1', '事故率 ×0.8 · 量产更快', '事故率 ×0.6 · 成本 -5%'], costs: [100, 220] },
  { id: 'pr', name: '公关部', icon: '📣', desc: ['发布会 +3', '发布会 +7 · 出圈 +20%', '发布会 +11 · 出圈 +40%'], costs: [100, 220] },
];

export const POSITIONING = [
  { id: 'flagship', name: '旗舰', exp: 1.25, cost: 1.25, months: 5, who: '不差钱的科技爱好者', desc: '性能、影像、续航、系统全都要强，用户最挑剔，但也愿意为好东西多掏钱。' },
  { id: 'mainstream', name: '主流', exp: 1.0, cost: 1.0, months: 4, who: '大多数普通用户', desc: '各项均衡，续航要好，价格要合理。市场最大，竞争也最激烈。' },
  { id: 'minimal', name: '轻巧', exp: 0.82, cost: 0.9, months: 4, who: '学生党、第一次买手机的人', desc: '小巧、好看、续航够用，性能够用就行。用户不挑配置，但很看重「值不值」。' },
  { id: 'pro', name: '专业', exp: 1.2, cost: 1.15, months: 5, who: '摄影师、重度玩家', desc: '影像和性能拉满，外观其次。人群小，但只要够强，贵也有人买。' },
];

export const SELL_POINTS = [
  { id: 'thin', name: '极致轻薄', desc: '机身做到 7.8mm 以内。大电池、大底多摄都会让机身变厚——想要轻薄就得取舍。' },
  { id: 'fast', name: '性能猛兽', desc: '研发里的「性能」做到 70 以上。' },
  { id: 'photo', name: '影像叙事', desc: '研发里的「影像」做到 70 以上。' },
  { id: 'battery', name: '续航焦虑终结者', desc: '研发里的「续航」做到 70 以上。大电池最省事，但机身会变厚。' },
  { id: 'eco', name: '生态闭环', desc: '和上一代产品互联互通：要勾选「绑定上代生态」，「系统」做到 60 以上。第一代做不了。' },
  { id: 'price', name: '性价比刺客', desc: '售价比用户心理价位低 8% 以上，让人觉得「这也太值了」。' },
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
        effect: { cash: -160, months: 0, slotPenalty: {} },
      },
      {
        label: '延期一个月',
        effect: { cash: 0, months: 1, slotPenalty: {} },
      },
      {
        label: '降规格换芯片',
        effect: { cash: -40, months: 0, slotPenalty: { perf: 8 } },
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
        effect: { cash: -140, months: 0, slotPenalty: {} },
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
        effect: { cash: -80, hype: -5, leak: 1 },
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
      { label: '换航天级合金（烧钱）', effect: { cash: -140, months: 0, slotPenalty: {} } },
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
      { label: '律师函警告', effect: { cash: -40, hype: 4, faith: 2 } },
      { label: '干脆提前官宣', effect: { cash: 0, hype: 8, faith: 3 } },
    ],
  },
  {
    id: 'remix',
    type: '鬼畜',
    when: (st) => st.generation > 1,
    title: '老板一句「Are you OK?」被剪成了鬼畜神曲',
    body: '上次发布会的开场白被网友配上了电音，播放量破千万。公关部在群里发了一排问号。',
    choices: [
      { label: '顺势自黑，老板亲自转发', effect: { cash: 0, hype: 16, faith: 3 } },
      { label: '花钱把热度推得更高', effect: { cash: -80, hype: 22 } },
      { label: '律师函警告', effect: { cash: -40, hype: -4, faith: -4 } },
    ],
  },
  {
    id: 'yyld',
    type: '友商',
    when: (st) => st.month >= 6,
    title: '友商发布会连说了 8 次「遥遥领先」',
    body: '对方大屏上的跑分柱子比你的高出一截。你们的论坛评论区开始沦陷。',
    choices: [
      { label: '闷声搞研发，性能组加班', effect: { cash: -60, slotPenalty: { perf: -10 } } },
      { label: '阴阳一句「领先的是 PPT」', effect: { cash: 0, hype: 10, faith: -2 } },
      { label: '不接招', effect: { cash: 0, hype: -3 } },
    ],
  },
  {
    id: 'stealth',
    type: '突袭',
    when: (st) => st.month >= 8,
    title: '友商没开发布会，新机直接悄悄开卖了',
    body: '凌晨上架，秒空。媒体标题全是「遥遥领先」，你的新机还在实验室里。',
    choices: [
      { label: '马上官宣发布会日期', effect: { cash: 0, hype: 8 } },
      { label: '加钱赶工', effect: { cash: -100, slotPenalty: { perf: -6, camera: -6 } } },
      { label: '稳住，按原计划', effect: { cash: 0, faith: 2, hype: -2 } },
    ],
  },
];

export function randomCompanyName() {
  return COMPANY_NAME_SEEDS[Math.floor(Math.random() * COMPANY_NAME_SEEDS.length)];
}

/**
 * 行业大事件：每代开局有概率出现（开罗式「打破平衡」）
 * effect 字段：cash / cashPct（按现金比例）/ rep / faith / hype
 *   mod: { key: 'demand'|'cost'|'extBan', val, months } 持续一段时间的市场修正
 *   gamble: { p, win: {...}, lose: {...} } 结果看运气
 */
export const MARKET_EVENTS = [
  {
    id: 'ban',
    icon: '🚫',
    title: '外购芯片被断供',
    body: '上游芯片厂收到出口限制，接下来一年外购芯片供不应求。自研的公司在偷笑。',
    when: (st) => st.month >= 8,
    choices: [
      { label: '花大钱囤一年的芯片', effect: { cash: -180 } },
      { label: '全力押注自研', effect: { mod: { key: 'extBan', val: true, months: 12 }, faith: 3 } },
      { label: '先观望', effect: { mod: { key: 'extBan', val: true, months: 12 } } },
    ],
  },
  {
    id: 'memory',
    icon: '💾',
    title: '内存和闪存全面涨价',
    body: '存储芯片厂集体减产，整机成本跟着上涨。',
    choices: [
      { label: '提前签长约锁价', effect: { cash: -120 } },
      { label: '接受涨价（成本 +8%，10 个月）', effect: { mod: { key: 'cost', val: 1.08, months: 10 } } },
    ],
  },
  {
    id: 'patent',
    icon: '⚖️',
    title: '专利流氓找上门',
    body: '一家只有律师没有产品的公司起诉你侵权，开口就要你一成多现金。你赚得越多，他们越来劲。',
    when: (st) => st.cash >= 400,
    choices: [
      { label: '花钱消灾（现金 -12%）', effect: { cashPct: -0.12 } },
      { label: '应诉到底（赢了只付律师费，输了更惨）', effect: { gamble: { p: 0.55, win: { cash: -40, rep: 3 }, lose: { cashPct: -0.25, rep: -2 } } } },
    ],
  },
  {
    id: 'tariff',
    icon: '🌐',
    title: '海外市场加征关税',
    body: '出口变贵了，海外销量要缩水一阵子。',
    when: (st) => st.month >= 10,
    choices: [
      { label: '在海外建组装厂', effect: { cash: -250 } },
      { label: '扛着（销量 -10%，8 个月）', effect: { mod: { key: 'demand', val: 0.9, months: 8 } } },
    ],
  },
  {
    id: 'rivalhit',
    icon: '💥',
    title: '友商出了一台现象级爆款',
    body: '全网都在聊它，你的潜在用户被分走了一大块。',
    choices: [
      { label: '砸营销正面硬刚', effect: { cash: -120, hype: 15 } },
      { label: '差异化，讲好自己的故事', effect: { mod: { key: 'demand', val: 0.88, months: 6 }, faith: 4 } },
      { label: '降价应战', effect: { mod: { key: 'demand', val: 1.0, months: 6 }, priceWar: 8, rep: -2 } },
    ],
  },
  {
    id: 'influencer',
    icon: '📱',
    title: '头部带货主播想合作',
    body: '一场直播能卖几十万台，但坑位费不便宜，翻车了也会连累你。',
    choices: [
      { label: '合作（销量 +15%，6 个月）', effect: { cash: -80, mod: { key: 'demand', val: 1.15, months: 6 } } },
      { label: '婉拒，靠产品说话', effect: { faith: 2 } },
    ],
  },
  {
    id: 'subsidy',
    icon: '🏛',
    title: '国补来了：买新手机有补贴',
    body: '政策刺激消费，接下来半年大家换机的意愿明显变高。',
    choices: [{ label: '好耶（销量 +12%，6 个月）', effect: { mod: { key: 'demand', val: 1.12, months: 6 } } }],
  },
];

/** 上一代产品带来的「物理代价」：堆料太狠会被现实打脸 */
export const AFTERMATH_EVENTS = [
  {
    id: 'heatgate',
    icon: '🔥',
    title: '上一代被曝「发热门」',
    body: '顶级芯片塞进薄机身又没有散热，测评博主用热成像仪拍出了 52°C。',
    test: (d, last) => d.parts.chip === 2 && !(d.concepts || []).includes('fan') && last.thickness <= 8.4,
    choices: [
      { label: '免费换修 + 公开道歉', effect: { cash: -150, rep: 2 } },
      { label: '推送系统更新悄悄降频', effect: { faith: -6, rep: -3 } },
      { label: '「这是正常现象」', effect: { rep: -8, hype: 6 } },
    ],
  },
  {
    id: 'recall',
    icon: '🔋',
    title: '用户反映电池鼓包',
    body: '便宜代工厂的电芯批次出了问题，社交媒体上已经有鼓包照片在传。',
    test: (d, last) => last.supplierId === 'cheap' && d.parts.battery === 2,
    choices: [
      { label: '全面召回', effect: { cash: -280, rep: 3 } },
      { label: '只换问题批次', effect: { cash: -90, rep: -4 } },
      { label: '否认到底', effect: { rep: -12, faith: -5 } },
    ],
  },
];

/**
 * 战略投资：后期的大钱花在哪里
 *   demand 销量倍率 · cost 单台成本倍率 · cap 产能倍率 · upkeep 每月运营费（¥100 万）
 *   need(state) 解锁条件，needText 条件说明
 */
export const EXPANSIONS = [
  { id: 'stores', icon: '🏬', name: '开线下体验店', cost: 400, upkeep: 4, demand: 1.08, faith: 5, desc: '销量 +8%，信仰 +5。用户能摸到真机。' },
  { id: 'sea', icon: '🌏', name: '进军东南亚', cost: 350, upkeep: 3, demand: 1.12, desc: '销量 +12%。性价比机型在那里很吃香。', need: (st) => st.generation >= 2, needText: '第 2 代起' },
  { id: 'fab', icon: '🏭', name: '自建工厂', cost: 1200, upkeep: 6, costMul: 0.93, cap: 1.5, desc: '单台成本 -7%，产能 +50%（爆款不再断货）。', need: (st) => (st.cumSold || 0) >= 80, needText: '累计卖出 80 万台' },
  { id: 'eu', icon: '🇪🇺', name: '进军欧洲', cost: 800, upkeep: 6, demand: 1.18, desc: '销量 +18%。欧洲用户看重口碑和环保。', need: (st) => st.reputation >= 55, needText: '口碑 ≥ 55' },
  { id: 'chiplab', icon: '🧬', name: '芯片设计中心', cost: 900, upkeep: 5, desc: '流片费用 -35%，流片时间 -1 个月。自研路线的护城河。', need: (st) => (st.chip?.gen || 1) >= 2, needText: '自研芯片到第 2 代' },
  { id: 'na', icon: '🗽', name: '进军北美', cost: 1600, upkeep: 10, demand: 1.25, desc: '销量 +25%，全球最赚钱的市场；但有被制裁的风险。', need: (st) => st.reputation >= 65 && (st.brand || 1) >= 1.05, needText: '口碑 ≥ 65 且品牌溢价 ≥ 1.05' },
];

/** 同期竞品的月出货量（万台），用来算市场份额 */
export const RIVAL_SHARE = [
  { brand: '青橙', base: 19, grow: 0.015, color: '#f39c12' },
  { brand: '极光', base: 17, grow: 0.014, color: '#27ae60' },
  { brand: '蓝莓', base: 14, grow: 0.018, color: '#5dade2' },
  { brand: '方块', base: 9, grow: 0.012, color: '#8e44ad' },
];
