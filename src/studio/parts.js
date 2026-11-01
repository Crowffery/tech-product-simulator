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
  const thickness = +(6.6 + bat.thick + mat.thick + chip.heat * 0.15).toFixed(1);
  const volume = (size.w * size.h * thickness) / 1000; // cm³
  const weight = Math.round(volume * 1.75 * mat.density + bat.weight + cam.weight);
  const costPts = chip.cost + scr.cost + cam.cost + bat.cost + mat.cost + size.cost + form.cost;
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
  return [
    { id: 'perf', name: '性能', cap: c(chip.cap) },
    { id: 'design', name: '屏幕与外观', cap: c(mat.cap + scr.design - 10) },
    { id: 'camera', name: '影像', cap: c(cam.cap + (sz === 2 ? 5 : 0)) },
    { id: 'battery', name: '续航与稳定', cap: c(bat.cap - chip.heat * 5 + (sz === 2 ? 5 : sz === 0 ? -5 : 0)) },
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
  out.push('多少钱？', '等一个评测', '买了买了', '外观党狂喜', '再等等下一代');
  return out;
}
