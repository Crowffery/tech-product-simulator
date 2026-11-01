/** 外观台 Demo：部件档位、外观预设与计分（纯数据 + 纯函数，日后可并入正式游戏） */

export const POSITIONS = [
  { id: 'flagship', name: '旗舰', weightMax: 230, thickMax: 9.2 },
  { id: 'mainstream', name: '主流', weightMax: 200, thickMax: 8.8 },
  { id: 'minimal', name: '极简', weightMax: 180, thickMax: 8.2 },
  { id: 'pro', name: '专业', weightMax: 240, thickMax: 9.6 },
];

/** 配置台：每件 3 档（材质多一个素皮彩蛋） */
export const PARTS = {
  chip: {
    name: '芯片',
    tiers: [
      { id: 0, label: '蜂鸟 S1', cap: 60, cost: 6, heat: 0, bench: 382000, note: '凉快，够用' },
      { id: 1, label: '蜂鸟 S3', cap: 80, cost: 10, heat: 1, bench: 726000, note: '中杯真香' },
      { id: 2, label: '蜂鸟 S5', cap: 100, cost: 16, heat: 2, bench: 1268000, note: '跑分怪兽，略烫手' },
    ],
  },
  screen: {
    name: '屏幕',
    tiers: [
      { id: 0, label: '普通屏', design: 0, os: 70, cost: 4, note: '能亮就行' },
      { id: 1, label: '高刷屏', design: 10, os: 85, cost: 7, note: '划起来顺' },
      { id: 2, label: '旗舰屏', design: 20, os: 100, cost: 11, note: '亮瞎实验室' },
    ],
  },
  camera: {
    name: '主摄',
    tiers: [
      { id: 0, label: '单摄', cap: 60, lenses: 1, cost: 4, weight: 4, bump: 0.8, note: '记录生活' },
      { id: 1, label: '双摄', cap: 80, lenses: 2, cost: 8, weight: 9, bump: 1.3, note: '夜景能看' },
      { id: 2, label: '大底三摄', cap: 100, lenses: 3, cost: 14, weight: 18, bump: 2.1, note: '模组凸成电磁炉' },
    ],
  },
  battery: {
    name: '电池',
    tiers: [
      { id: 0, label: '小 · 3800', cap: 60, thick: 0, weight: 0, cost: 2, note: '下午找插座' },
      { id: 1, label: '中 · 4800', cap: 80, thick: 0.9, weight: 12, cost: 3, note: '能撑一天' },
      { id: 2, label: '大 · 6000', cap: 100, thick: 2.0, weight: 28, cost: 5, note: '续航焦虑终结者' },
    ],
  },
  material: {
    name: '机身材质',
    tiers: [
      { id: 0, label: '塑料', cap: 60, cost: 2, density: 1.0, thick: 0, note: '耐摔，亲民' },
      { id: 1, label: '玻璃', cap: 80, cost: 5, density: 1.12, thick: 0.2, note: '反光有质感' },
      { id: 2, label: '金属', cap: 100, cost: 9, density: 1.2, thick: 0, note: '冷冷的高级' },
      { id: 3, label: '素皮', cap: 85, cost: 6, density: 0.95, thick: 0.4, note: '彩蛋：手感温润' },
    ],
  },
  size: {
    name: '机身尺寸',
    tiers: [
      { id: 0, label: '小', w: 66, h: 140, cost: -1, note: '单手党狂喜' },
      { id: 1, label: '标准', w: 72, h: 152, cost: 0, note: '大众身材' },
      { id: 2, label: '大', w: 77, h: 163, cost: 2, note: '看片利器' },
    ],
  },
};

export const PART_ORDER = ['chip', 'screen', 'camera', 'battery', 'material', 'size'];

export const CORNERS = [
  { id: 0, label: '方', r: 4.5, bevel: 0.7 },
  { id: 1, label: '圆', r: 9, bevel: 1.6 },
  { id: 2, label: '很圆', r: 13, bevel: 2.6 },
];

export const SCREEN_FORMS = [
  { id: 'bezel', label: '宽边框', bezel: 4.2, cost: 0 },
  { id: 'punch', label: '角落挖孔', bezel: 1.8, cost: 1 },
  { id: 'center', label: '居中小孔', bezel: 1.6, cost: 1 },
  { id: 'full', label: '全面屏', bezel: 1.1, cost: 3 },
];

export const LAYOUTS = [
  { id: 'vpill', label: '竖排胶囊' },
  { id: 'square', label: '方形模组' },
  { id: 'circle', label: '居中大圆' },
  { id: 'hpill', label: '横向胶囊' },
  { id: 'float', label: '悬浮独立' },
  { id: 'glasses', label: '双圆眼镜' },
  { id: 'diamond', label: '菱形模组' },
];

export const TWO_TONE = [
  { id: 'none', label: '纯色' },
  { id: 'frame', label: '边框撞色' },
  { id: 'band', label: '上下拼色' },
];

/** 像素色板（虚构色名） */
export const PALETTE = [
  { id: 'midnight', name: '午夜黑', hex: '#23242c' },
  { id: 'pearl', name: '珍珠白', hex: '#eeeae0' },
  { id: 'silver', name: '星光银', hex: '#c9ccd1' },
  { id: 'titan', name: '钛灰', hex: '#7d8086' },
  { id: 'mint', name: '薄荷绿', hex: '#8fd3b6' },
  { id: 'lake', name: '湖水蓝', hex: '#5aa9d6' },
  { id: 'deep', name: '深海蓝', hex: '#2b4a7a' },
  { id: 'sakura', name: '樱花粉', hex: '#f2b8c6' },
  { id: 'sunset', name: '落日橙', hex: '#f08a4b' },
  { id: 'lemon', name: '柠檬黄', hex: '#f2d45c' },
  { id: 'grape', name: '葡萄紫', hex: '#7a5ea8' },
  { id: 'forest', name: '森林绿', hex: '#3f6f4f' },
  { id: 'brick', name: '砖红', hex: '#b4483a' },
  { id: 'milktea', name: '奶茶棕', hex: '#c49a6c' },
  { id: 'cyber', name: '赛博青', hex: '#33e0d0' },
  { id: 'lava', name: '熔岩红', hex: '#e0453a' },
];

export function paletteName(hex) {
  const p = PALETTE.find((c) => c.hex.toLowerCase() === String(hex).toLowerCase());
  return p ? p.name : '自定义色';
}

/** 材质 × 定位 加减分 */
const MAT_FIT = {
  flagship: [-15, 8, 12, 6],
  mainstream: [0, 6, 6, 4],
  minimal: [2, 4, 2, 12],
  pro: [-10, 6, 12, 4],
};

/** 推荐 = 稳但平庸（每个定位的默认件） */
export const RECOMMENDED = {
  flagship: { chip: 2, screen: 1, camera: 2, battery: 1, material: 1, size: 1 },
  mainstream: { chip: 1, screen: 1, camera: 1, battery: 1, material: 0, size: 1 },
  minimal: { chip: 0, screen: 0, camera: 0, battery: 1, material: 0, size: 0 },
  pro: { chip: 2, screen: 2, camera: 2, battery: 2, material: 2, size: 2 },
};

export function defaultDesign() {
  return {
    position: 'mainstream',
    parts: { ...RECOMMENDED.mainstream },
    corner: 1,
    screenForm: 'punch',
    layout: 'vpill',
    color: '#5aa9d6',
    color2: '#eeeae0',
    twoTone: 'none',
    modelName: '回路 1',
    company: '回路工作室',
    concepts: [],
    redesign: 'major',
  };
}

export function tier(design, key) {
  return PARTS[key].tiers[design.parts[key]] || PARTS[key].tiers[0];
}

/** 形体与读数 */
export function physical(design) {
  const size = tier(design, 'size');
  const bat = tier(design, 'battery');
  const mat = tier(design, 'material');
  const cam = tier(design, 'camera');
  const chip = tier(design, 'chip');
  const scr = tier(design, 'screen');
  const form = SCREEN_FORMS.find((f) => f.id === design.screenForm) || SCREEN_FORMS[0];
  const cs = (design.concepts || []).map((id) => CONCEPTS.find((c) => c.id === id)).filter(Boolean);
  const cThick = cs.reduce((a, c) => a + c.thick, 0);
  const cWeight = cs.reduce((a, c) => a + c.weight, 0);
  const cCost = cs.reduce((a, c) => a + c.cost, 0);
  const thickness = +(6.6 + bat.thick + mat.thick + chip.heat * 0.15 + cThick).toFixed(1);
  const volume = (size.w * size.h * (thickness - cThick)) / 1000; // cm³
  const weight = Math.round(volume * 1.75 * mat.density + bat.weight + cam.weight + cWeight);
  const costPts = chip.cost + scr.cost + cam.cost + bat.cost + mat.cost + size.cost + form.cost + cCost;
  const unitCost = costPts * 70;
  const band = unitCost < 1800 ? '亲民带 ¥1999' : unitCost < 3000 ? '主流带 ¥3999' : '旗舰带 ¥6999';
  return { w: size.w, h: size.h, thickness, weight, bench: chip.bench, unitCost, band, bump: cam.bump };
}

/** 各研发槽上限（配置台定上限） */
export function slotCaps(design) {
  const chip = tier(design, 'chip');
  const scr = tier(design, 'screen');
  const cam = tier(design, 'camera');
  const bat = tier(design, 'battery');
  const mat = tier(design, 'material');
  const sz = design.parts.size;
  const c = (v) => Math.max(20, Math.min(100, Math.round(v)));
  const cs = (design.concepts || []).map((id) => CONCEPTS.find((x) => x.id === id)).filter(Boolean);
  const add = (k) => cs.reduce((a, x) => a + (x.caps[k] || 0), 0);
  const fan = cs.some((x) => x.id === 'fan');
  return [
    { id: 'perf', name: '性能', cap: c(chip.cap) },
    { id: 'design', name: '屏幕与外观', cap: c(mat.cap + scr.design - 10 + add('design')) },
    { id: 'camera', name: '影像', cap: c(cam.cap + (sz === 2 ? 5 : 0) + add('camera')) },
    { id: 'battery', name: '续航与稳定', cap: c(bat.cap - (fan ? 0 : chip.heat * 5) + (sz === 2 ? 5 : sz === 0 ? -5 : 0) + add('battery')) },
    { id: 'os', name: '系统与生态', cap: c(scr.os) },
  ];
}

/** 卖点承诺检查（部件层） */
export function sellPointChecks(design) {
  const p = physical(design);
  return [
    { name: '极致轻薄', ok: p.thickness <= 7.6 && p.weight <= 175, why: `需 ≤7.6mm 且 ≤175g（现 ${p.thickness}mm / ${p.weight}g）` },
    { name: '续航焦虑终结者', ok: design.parts.battery === 2, why: '需大电池' },
    { name: '影像叙事', ok: design.parts.camera === 2, why: '需大底三摄' },
    { name: '性能猛兽', ok: design.parts.chip === 2, why: '需蜂鸟 S5' },
  ];
}

export function randomTrend() {
  const c = PALETTE[Math.floor(Math.random() * PALETTE.length)];
  const l = LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)];
  return { color: c.hex, colorName: c.name, layout: l.id, layoutName: l.label };
}

/**
 * 外观计分：不评判「好不好看」，只看材质×定位、趋势、形体、屏幕形态
 * @returns {{score:number, items:{label:string, v:number}[], tags:string[]}}
 */
export function appearanceScore(design, trend, prev) {
  const pos = POSITIONS.find((p) => p.id === design.position) || POSITIONS[1];
  const phys = physical(design);
  const caps = slotCaps(design);
  const items = [];
  const base = Math.round(caps[1].cap * 0.6);
  items.push({ label: `外观底子（材质+屏幕上限 ${caps[1].cap}）`, v: base });
  const matFit = MAT_FIT[pos.id][design.parts.material];
  items.push({ label: `${tier(design, 'material').label} × ${pos.name}`, v: matFit });
  if (trend) {
    if (design.color.toLowerCase() === trend.color.toLowerCase()) items.push({ label: `命中流行色「${trend.colorName}」`, v: 6 });
    if (design.layout === trend.layout) items.push({ label: `命中流行模组「${trend.layoutName}」`, v: 6 });
  }
  if (design.screenForm === 'full') items.push({ label: '全面屏', v: 4 });
  if (design.screenForm === 'bezel' && pos.id !== 'minimal') items.push({ label: '宽边框有点复古', v: -6 });
  const overT = phys.thickness - pos.thickMax;
  if (overT > 0) items.push({ label: `比${pos.name}舒适厚度多 ${overT.toFixed(1)}mm`, v: -Math.round(overT * 6) });
  const overW = phys.weight - pos.weightMax;
  if (overW > 0) items.push({ label: `比${pos.name}舒适重量多 ${overW}g`, v: -Math.round(overW * 0.3) });

  const tags = [];
  if (prev) {
    const sameLayout = prev.layout === design.layout;
    const sameMat = prev.parts?.material === design.parts.material;
    if (sameLayout && sameMat) tags.push('延续上代设计语言 → 信仰 +');
    else if (!sameLayout && !sameMat) tags.push('大改设计 → 话题 +，但有「丑哭了」风险');
    else tags.push('小改款：稳');
  }
  const score = Math.max(0, Math.min(100, items.reduce((a, b) => a + b.v, 0)));
  return { score, items, tags };
}

/** 发布会弹幕 */
export function danmaku(design, trend) {
  const p = physical(design);
  const out = [];
  if (design.parts.camera === 2) out.push('这镜头模组能煎蛋了吧');
  if (p.thickness >= 8.8) out.push('厚得像充电宝');
  if (p.thickness <= 7.4) out.push('好薄！能切西瓜');
  if (p.weight >= 230) out.push('砖头本砖');
  if (design.parts.material === 3) out.push('终于有素皮了！');
  if (design.parts.material === 2) out.push('金属边框冷冷的，喜欢');
  if (trend && design.color.toLowerCase() === trend.color.toLowerCase()) out.push(`${trend.colorName}今年真的火`);
  if (design.layout === 'glasses') out.push('后背在对我笑');
  if (design.layout === 'diamond') out.push('菱形模组？有点东西');
  if (design.screenForm === 'full') out.push('全面屏看片爽');
  if (design.screenForm === 'bezel') out.push('边框能放下我的工资条');
  if (design.parts.chip === 2) out.push('跑分破百万了！');
  if (design.twoTone !== 'none') out.push('撞色好看诶');
  const C = new Set(design.concepts || []);
  if (C.has('clear')) out.push('透明后盖！能看见电池！');
  if (C.has('subscreen')) out.push('后置副屏自拍神器');
  if (C.has('eink')) out.push('墨水背屏可以看小说吗');
  if (C.has('lights')) out.push('灯效闪瞎我');
  if (C.has('keyboard')) out.push('键盘回来了！爷青回');
  if (C.has('shutter')) out.push('快门键手感一定很好');
  if (C.has('sat')) out.push('天线好可爱');
  if (C.has('fan')) out.push(design.parts.chip === 2 ? '风扇转起来了！' : '风扇在吹空气吗');
  out.push('多少钱？', '等一个评测', '买了买了', '外观党狂喜', '再等等下一代');
  return out;
}

// ═════════════════════════ 创新层（v0.8）═════════════════════════

/** 概念件：每代最多 2 个（大改款） */
export const CONCEPTS = [
  { id: 'clear', name: '透明后盖', icon: '🔍', desc: '让内部元件当装饰', cost: 4, thick: 0, weight: 2, caps: { design: -5 }, conflicts: ['eink'] },
  { id: 'subscreen', name: '背部副屏', icon: '📟', desc: '背面一块小彩屏', cost: 5, thick: 0.3, weight: 8, caps: { battery: -5 }, conflicts: ['eink'] },
  { id: 'eink', name: '墨水背屏', icon: '📜', desc: '整块墨水屏后盖', cost: 6, thick: 0.4, weight: 10, caps: {}, conflicts: ['clear', 'subscreen', 'fan'] },
  { id: 'lights', name: '灯效后盖', icon: '💡', desc: '会呼吸的灯带', cost: 3, thick: 0.1, weight: 3, caps: { battery: -3 }, conflicts: [] },
  { id: 'keyboard', name: '实体键盘', icon: '⌨️', desc: '正面下半是键盘', cost: 4, thick: 0.2, weight: 14, caps: { camera: -10, design: -5 }, conflicts: [] },
  { id: 'shutter', name: '机械快门键', icon: '📸', desc: '侧边橙色快门', cost: 1, thick: 0, weight: 2, caps: { camera: 5 }, conflicts: [] },
  { id: 'sat', name: '卫星天线', icon: '📡', desc: '顶部翻折小天线', cost: 5, thick: 0, weight: 6, caps: {}, conflicts: [] },
  { id: 'fan', name: '主动散热风扇', icon: '🌀', desc: '背面会转的风扇', cost: 4, thick: 1.2, weight: 16, caps: {}, conflicts: ['eink'] },
];
export const MAX_CONCEPTS = 2;

/** 品类创新：少见的组合（取舍层的创意） */
export const COMBOS = [
  { id: 'mini-flag', name: '小屏旗舰', test: (d) => d.parts.size === 0 && d.parts.chip === 2 },
  { id: 'mini-cam', name: '影像小钢炮', test: (d) => d.parts.size === 0 && d.parts.camera === 2 },
  { id: 'plastic-beast', name: '塑料性能刺客', test: (d) => d.parts.chip === 2 && d.parts.material === 0 },
  { id: 'twoweeks', name: '两周一充', test: (d) => d.parts.battery === 2 && hasC(d, 'eink') },
  { id: 'gamer', name: '电竞怪兽', test: (d) => d.parts.chip === 2 && hasC(d, 'fan') && hasC(d, 'lights') },
  { id: 'retro', name: '复古商务机', test: (d) => hasC(d, 'keyboard') && d.screenForm === 'bezel' },
  { id: 'xray', name: '透视旗舰', test: (d) => hasC(d, 'clear') && d.parts.chip === 2 },
];

export function hasC(d, id) {
  return (d.concepts || []).includes(id);
}

/** 虚构竞品与其已发布的产品（市场记忆的初始值） */
export const RIVALS = [
  { brand: '蓝莓科技', style: '挤牙膏冠军', latest: '蓝莓 14 Pro Max Plus', concepts: [], combos: [], crowd: ['大底三摄', '方形模组'] },
  { brand: '方块数码', style: '电竞狂魔', latest: '方块 RedPlay 7', concepts: ['lights', 'fan'], combos: ['gamer'], crowd: ['灯效后盖'] },
  { brand: '极光移动', style: '户外硬汉', latest: '极光 Trek 3', concepts: ['sat', 'shutter'], combos: [], crowd: ['卫星天线'] },
];

export function conceptName(id) {
  return CONCEPTS.find((c) => c.id === id)?.name || COMBOS.find((c) => c.id === id)?.name || id;
}

/**
 * 市场记忆：每个概念 / 组合 → { mine: 我首发过的代数下标或 -1, myUses: 我用过几代, rivals: 已跟进的竞品数 }
 * 抄袭规则：我首发后，每过 1 代多 1 家竞品跟进（最多 2 家）
 */
export function marketMemory(museum) {
  const mem = {};
  const get = (id) => (mem[id] ||= { first: -1, myUses: 0, rivals: 0, copiedBy: [] });
  for (const r of RIVALS) {
    for (const id of [...r.concepts, ...r.combos]) {
      const m = get(id);
      m.rivals += 1;
      m.seed = true;
    }
  }
  museum.forEach((entry, i) => {
    const d = entry.design;
    const ids = [...(d.concepts || []), ...COMBOS.filter((c) => c.test(d)).map((c) => c.id)];
    for (const id of ids) {
      const m = get(id);
      if (m.first < 0 && m.rivals === 0) m.first = i;
      m.myUses += 1;
    }
  });
  const copycats = RIVALS.map((r) => r.brand);
  for (const [, m] of Object.entries(mem)) {
    if (m.first >= 0) {
      const elapsed = museum.length - m.first;
      const n = Math.min(2, Math.max(0, elapsed - 1)); // 下一代仍独家，再往后被跟进
      m.copiedBy = copycats.slice(0, n);
      m.rivals += n;
    }
  }
  return mem;
}

/** 新颖度：只问「新不新」，不问「好不好看」 */
export function novelty(design, museum) {
  const mem = marketMemory(museum);
  const items = [];
  const prev = museum.length ? museum[museum.length - 1].design : null;
  if (design.redesign === 'major') items.push({ label: prev ? '大改款：新模具、新设计' : '新品首发', v: prev ? 10 : 12 });
  else items.push({ label: '小改款', v: 3 });
  for (const id of design.concepts || []) {
    const m = mem[id];
    const name = conceptName(id);
    if (!m) items.push({ label: `首发「${name}」`, v: 30, first: true });
    else if (m.first >= 0 && m.rivals === 0) items.push({ label: `独家「${name}」`, v: 14 });
    else if (m.rivals === 1) items.push({ label: `「${name}」已有 1 家在做`, v: 10 });
    else items.push({ label: `「${name}」已经烂大街`, v: 3 });
  }
  for (const c of COMBOS) {
    if (!c.test(design)) continue;
    const m = mem[c.id];
    if (!m) items.push({ label: `品类首创「${c.name}」`, v: 15, first: true });
    else if (m.first >= 0 && m.rivals === 0) items.push({ label: `独家组合「${c.name}」`, v: 6 });
    else items.push({ label: `组合「${c.name}」已有人做`, v: m.rivals >= 2 ? 1 : 4 });
  }
  if (prev && isSqueeze(design, prev)) items.push({ label: '和上一代几乎一样', v: -10 });
  const minors = trailingMinors(museum) + (design.redesign === 'minor' ? 1 : 0);
  if (minors >= 3) items.push({ label: `连续 ${minors} 代小改`, v: -10 });
  const score = Math.max(0, Math.min(100, items.reduce((a, b) => a + b.v, 0)));
  return { score, items };
}

function isSqueeze(d, p) {
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  return same(d.parts, p.parts) && same((d.concepts || []).slice().sort(), (p.concepts || []).slice().sort()) && d.layout === p.layout;
}

function trailingMinors(museum) {
  let n = 0;
  for (let i = museum.length - 1; i >= 0; i--) {
    if (museum[i].design.redesign === 'minor') n++;
    else break;
  }
  return n;
}

/** 完成度预估（正式游戏中由研发进度决定；Demo 里按工艺成熟度估算） */
export function completeness(design, museum) {
  const items = [];
  const uses = (id) => museum.filter((e) => (e.design.concepts || []).includes(id)).length;
  for (const id of design.concepts || []) {
    const u = uses(id);
    if (u === 0) items.push({ label: `「${conceptName(id)}」新工艺首发`, v: -10 });
    else if (u === 1) items.push({ label: `「${conceptName(id)}」第二代打磨`, v: -5 });
    else items.push({ label: `「${conceptName(id)}」工艺成熟`, v: 0 });
  }
  if ((design.concepts || []).length >= 2) items.push({ label: '两个概念件要一起调校', v: -4 });
  if (design.redesign === 'major' && museum.length) items.push({ label: '大改款新模具', v: -3 });
  if (hasC(design, 'fan') && design.parts.chip !== 2) items.push({ label: '风扇配小芯片：吹空气', v: -6 });
  const score = Math.max(40, Math.min(100, 100 + items.reduce((a, b) => a + b.v, 0)));
  return { score, items };
}

export function wow(design, museum) {
  const n = novelty(design, museum);
  const c = completeness(design, museum);
  const score = Math.round((Math.min(100, n.score * 1.3) * c.score) / 100);
  let headline;
  if (n.score >= 55 && c.score >= 85) headline = '「这才叫创新！」——科技媒体集体起立';
  else if (n.score >= 55) headline = '「概念满分，做工还差口气」';
  else if (n.score >= 30) headline = '「有新意，但不够炸」';
  else if (c.score >= 80) headline = '「稳，但又是挤牙膏的一年」';
  else headline = '「既不新，也不稳」——评论区沉默了';
  const firsts = n.items.filter((i) => i.first).map((i) => i.label.replace(/^.*「|」$/g, ''));
  return { score, novelty: n, completeness: c, headline, firsts };
}

/** 年度新闻：告诉玩家哪里已是红海 */
export function marketNews(museum) {
  const mem = marketMemory(museum);
  const crowded = RIVALS.flatMap((r) => r.crowd);
  const copied = Object.entries(mem)
    .filter(([, m]) => m.first >= 0 && m.copiedBy.length)
    .map(([id, m]) => `${m.copiedBy[m.copiedBy.length - 1]} 跟进了你的「${conceptName(id)}」`);
  return { crowded: [...new Set(crowded)].slice(0, 3), copied };
}

export function wowGrade(score) {
  return score >= 70 ? 'S' : score >= 55 ? 'A' : score >= 40 ? 'B' : 'C';
}
