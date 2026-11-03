/** 外观台 Demo：部件档位、外观预设与计分（纯数据 + 纯函数，日后可并入正式游戏） */

export const POSITIONS = [
  { id: 'flagship', name: '旗舰', weightMax: 230, thickMax: 9.2 },
  { id: 'mainstream', name: '主流', weightMax: 200, thickMax: 8.8 },
  { id: 'minimal', name: '轻巧', weightMax: 180, thickMax: 8.2 },
  { id: 'pro', name: '专业', weightMax: 240, thickMax: 9.6 },
];

/** 配置台：每件 3 档（材质多一个素皮彩蛋） */
export const PARTS = {
  chip: {
    name: '芯片',
    tiers: [
      { id: 0, label: '标准', cap: 60, cost: 6, heat: 0, bench: 396000, note: '凉快，够用' },
      { id: 1, label: 'Pro', cap: 80, cost: 10, heat: 1, bench: 720000, note: '中杯真香' },
      { id: 2, label: 'Max', cap: 100, cost: 16, heat: 2, bench: 1260000, note: '跑分怪兽，略烫手' },
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

/**
 * 材质子类：金属 / 素皮下面还有细分，成本、重量、散热、质感都不一样
 *   cost 成本点（×70 元）· weight 克 · heat 续航上限修正（散热）· design 外观上限修正
 */
export const MAT_SUBS = {
  2: [
    { id: 'al', label: '铝合金', cost: 0, weight: 0, heat: 3, design: 0, note: '轻、散热好、最常见' },
    { id: 'steel', label: '不锈钢', cost: 2, weight: 18, heat: 0, design: 3, note: '镜面光泽，结实但沉' },
    { id: 'ti', label: '钛合金', cost: 5, weight: -10, heat: -4, design: 6, note: '轻又硬，最贵；导热差，散热不如铝' },
  ],
  3: [
    { id: 'fiber', label: '纤维素皮', cost: 0, weight: 0, heat: 0, design: 0, note: '仿皮质感，耐脏好打理' },
    { id: 'vegan', label: '硅胶素皮', cost: 1, weight: -2, heat: 0, design: 2, note: '更软更细腻，不易发黄' },
    { id: 'leather', label: '真皮', cost: 4, weight: 4, heat: -1, design: 5, note: '真皮会随使用养出包浆，最贵' },
  ],
};
export function matSub(design) {
  const list = MAT_SUBS[design.parts?.material];
  if (!list) return null;
  return list.find((x) => x.id === design.matSub) || list[0];
}

/** 屏幕开孔形态：影响成本，属于硬件配置 */
export const FORM_COST_NOTE = { bezel: '最便宜，边框宽', punch: '主流方案', center: '对称好看', full: '要更贵的屏幕和屏下方案' };

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

/**
 * 镜头模组：不只是造型。模组越大，能塞的东西越多，也越贵。
 *   big: 能放下潜望长焦 / 一英寸大底 · cost 成本点 · cam 影像上限修正
 */
export const LAYOUTS = [
  { id: 'vpill', label: '竖排胶囊', cost: 0, cam: 0, big: false, note: '最常见，空间够放三摄，但塞不下潜望和大底' },
  { id: 'square', label: '方形模组', cost: 2, cam: 2, big: true, note: '空间大：潜望长焦、一英寸大底都放得下' },
  { id: 'circle', label: '居中大圆', cost: 2, cam: 3, big: true, note: '影像旗舰的标志，最适合一英寸大底' },
  { id: 'hpill', label: '横向胶囊', cost: 1, cam: 0, big: false, note: '横排设计，能放潜望长焦，大底放不下' },
  { id: 'float', label: '悬浮独立', cost: 0, cam: -2, big: false, note: '每颗镜头单独开孔，最省空间也最省钱，堆不了料' },
  { id: 'glasses', label: '双圆眼镜', cost: 1, cam: 0, big: false, note: '辨识度高，适合双摄' },
  { id: 'diamond', label: '菱形模组', cost: 1, cam: 0, big: false, note: '小众造型，辨识度很高' },
];
export const layoutOf = (d) => LAYOUTS.find((l) => l.id === d.layout) || LAYOUTS[0];

/** 某些部件需要大模组才放得下 */
export const NEEDS_BIG = { periscope: ['square', 'circle', 'hpill'], oneinch: ['square', 'circle'] };
export function moduleFit(design) {
  const bad = (design.concepts || []).filter((id) => NEEDS_BIG[id] && !NEEDS_BIG[id].includes(design.layout));
  return bad;
}

export const TWO_TONE = [
  { id: 'none', label: '纯色' },
  { id: 'frame', label: '边框撞色' },
  { id: 'band', label: '上下拼色' },
  { id: 'vsplit', label: '左右拼色' },
  { id: 'diag', label: '斜切拼色' },
  { id: 'module', label: '镜头区异色' },
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
  minimal: { chip: 0, screen: 0, camera: 0, battery: 1, material: 1, size: 0 },
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
    chipGen: 1,
    chipSeries: '蜂鸟',
  };
}

export function tier(design, key) {
  if (key === 'chip') return chipSpec(design);
  return PARTS[key].tiers[design.parts[key]] || PARTS[key].tiers[0];
}

// ═════════════════════════ 自研芯片 ═════════════════════════

export const CHIP_SUFFIX = ['', ' Pro', ' Max'];
export const CHIP_SERIES_SEEDS = ['蜂鸟', '天枢', '星火', '玄鸟', '雷霆', '朱雀', '青龙', '白泽', '鲲鹏', '烛龙'];

export function chipName(series, gen, t) {
  return `${series || '蜂鸟'} X${gen}${CHIP_SUFFIX[t] || ''}`;
}

/** 跑分：每代约 +28%；Pro 为基准，标准 ×0.55，Max ×1.75 */
export function chipBench(gen, t) {
  return Math.round((720000 * Math.pow(1.28, gen - 1) * [0.55, 1, 1.75][t]) / 1000) * 1000;
}

/** 竞品同期芯片跑分（蓝莓的 A 系列式年更） */
export function rivalBench(month) {
  const year = Math.floor((month - 1) / 12);
  return Math.round((1150000 * Math.pow(1.22, year)) / 1000) * 1000;
}

/** 芯片规格：档位决定基础，代数决定性能上限与跑分 */
export function chipSpec(design) {
  const t = design.parts?.chip ?? 1;
  const base = PARTS.chip.tiers[t] || PARTS.chip.tiers[1];
  const gen = design.chipGen || 1;
  return {
    ...base,
    label: chipName(design.chipSeries, gen, t),
    cap: Math.min(100, base.cap - 10 + gen * 5),
    bench: chipBench(gen, t),
    gen,
  };
}

/** 形体与读数 */
export function physical(design) {
  const sub = matSub(design);
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
  const weight = Math.round(volume * 1.75 * mat.density + bat.weight + cam.weight + cWeight + (sub?.weight || 0));
  const costPts = chip.cost + scr.cost + cam.cost + bat.cost + mat.cost + size.cost + form.cost + cCost + (sub?.cost || 0) + layoutOf(design).cost;
  // 外购芯片：不用自己流片，但每台都要给芯片厂交钱
  const extChip = design.chipSrc === 'ext' ? 6 + chip.id * 3 : 0;
  // 真实 BOM 量级：部件 + 组装测试包装授权约 ¥250
  const unitCost = Math.round((costPts + extChip) * 70 + 250);
  const band = unitCost < 1700 ? '亲民带 ¥1999' : unitCost < 2900 ? '主流带 ¥3999' : '旗舰带 ¥6999';
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
  const sub = matSub(design);
  return [
    { id: 'perf', name: '性能', cap: c(chip.cap) },
    { id: 'design', name: '屏幕与外观', cap: c(mat.cap + scr.design - 10 + add('design') + (sub?.design || 0)) },
    // 模组塞不下的部件，影像加成只剩一半
    { id: 'camera', name: '影像', cap: c(cam.cap + (sz === 2 ? 5 : 0) + add('camera') + layoutOf(design).cam - moduleFit(design).reduce((a, id) => a + Math.round((CONCEPTS.find((x) => x.id === id)?.caps.camera || 0) / 2), 0)) },
    { id: 'battery', name: '续航与稳定', cap: c(bat.cap - (fan ? 0 : chip.heat * 5) + (sz === 2 ? 5 : sz === 0 ? -5 : 0) + add('battery') + (sub?.heat || 0)) },
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
    { name: '性能猛兽', ok: design.parts.chip === 2, why: '需 Max 档芯片' },
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
  const cs = chipSpec(design);
  if (cs.bench >= 1000000) out.push(`${cs.label} 跑分破百万了！`, `${cs.label} 太猛了`);
  else out.push(`${cs.label} 够用吗？`);
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
  const more = {
    popup: '镜头弹出来那一下好帅', battswap: '可换电池！回到十年前', stylus: '笔！是笔！', slider: '滑盖回来了啊啊啊',
    swivel: '转起来了？？？', fold: '一折变平板，钱包也折了', modular: '乐高手机', solar: '晒太阳就能充电？',
    chrome: '会变色的后盖！', trifold: '三折叠！这是什么怪物', wrap: '全身都是屏幕，怎么拿？', rollable: '屏幕从侧面卷出来了！',
    crystal: '全透明，像水晶', watch: '后盖里有表芯在走', projector: '直接投到墙上看电影', holo: '全息影像？？科幻成真',
    pet: '背面养了只小鸡！',
  };
  for (const [k, v] of Object.entries(more)) if (C.has(k)) out.push(v);
  out.push('多少钱？', '等一个评测', '买了买了', '外观党狂喜', '再等等下一代');
  return [...new Set(out)];
}

// ═════════════════════════ 创新层（v0.8）═════════════════════════

/**
 * 概念件（v0.9）：5 个科技层级，研发点解锁；部分需要「先发布过某概念」才能解锁。
 * group：同组互斥（back = 整块后盖，form = 形态）；buzz = 出圈度；risk = 首发完成度惩罚
 */
export const TIERS = [
  { tier: 1, name: '车库脑洞', cost: 0 },
  { tier: 2, name: '工程魔改', cost: 5 },
  { tier: 3, name: '形态实验', cost: 12 },
  { tier: 4, name: '未来原型', cost: 20 },
  { tier: 5, name: '科幻彩蛋', cost: 30 },
];

export const CONCEPTS = [
  // ── 1 车库脑洞 ──
  { id: 'lights', cat: 'body', appear: {gen:1}, tier: 1, name: '灯效后盖', icon: '💡', desc: '会呼吸的灯带', cost: 3, thick: 0.1, weight: 3, caps: { battery: -3 }, buzz: 3, risk: 6, conflicts: ['wrap', 'eink'] },
  { id: 'shutter', cat: 'cam', appear: {gen:1}, tier: 1, name: '相机控制键', icon: '📸', desc: '侧边实体键：按压拍照、轻滑变焦，海外版兼作 AI 键', cost: 1, thick: 0, weight: 2, caps: { camera: 5 }, buzz: 2, risk: 4, conflicts: [] },
  { id: 'keyboard', cat: 'form', appear: {gen:1}, tier: 1, name: '实体键盘', icon: '⌨️', desc: '正面下半是键盘', cost: 4, thick: 0.2, weight: 14, caps: { camera: -10, design: -5 }, buzz: 6, risk: 8, conflicts: ['fold', 'trifold', 'rollable', 'swivel', 'wrap'] },
  { id: 'clear', cat: 'body', appear: {gen:1}, tier: 1, name: '透明后盖', icon: '🔍', desc: '让内部元件当装饰', group: 'back', cost: 4, thick: 0, weight: 2, caps: { design: -5 }, buzz: 6, risk: 8, conflicts: [] },
  { id: 'subscreen', cat: 'form', appear: {gen:2}, tier: 1, name: '背部副屏', icon: '📟', desc: '背面一块小彩屏', cost: 5, thick: 0.3, weight: 8, caps: { battery: -5 }, buzz: 5, risk: 8, conflicts: ['eink', 'wrap', 'crystal', 'solar', 'modular', 'pet', 'watch'] },
  // ── 2 工程魔改 ──
  { id: 'eink', cat: 'form', appear: {gen:3}, tier: 2, name: '墨水背屏', icon: '📜', desc: '整块墨水屏后盖', group: 'back', cost: 6, thick: 0.4, weight: 10, caps: { battery: 5 }, buzz: 5, risk: 10, conflicts: ['fan', 'pet'] },
  { id: 'fan', cat: 'power', appear: {gen:3}, tier: 2, name: '主动散热风扇', icon: '🌀', desc: '背面会转的风扇', cost: 4, thick: 1.2, weight: 16, caps: {}, buzz: 5, risk: 8, conflicts: ['wrap', 'solar', 'modular', 'watch'] },
  { id: 'sat', cat: 'fun', appear: {gen:3}, tier: 2, name: '卫星通信', icon: '📡', desc: '没有基站信号也能发卫星短信，户外救命', cost: 5, thick: 0, weight: 6, caps: {}, buzz: 5, risk: 10, conflicts: [] },
  { id: 'popup', cat: 'cam', appear: {gen:3}, tier: 2, name: '升降镜头', icon: '🎚️', desc: '前摄藏在顶部，用时弹出', cost: 5, thick: 0.4, weight: 8, caps: { design: 5 }, buzz: 6, risk: 12, conflicts: [] },
  { id: 'battswap', cat: 'power', appear: {gen:3}, tier: 2, name: '可换电池', icon: '🔋', desc: '后盖一推，电池拔下来', cost: 3, thick: 0.6, weight: 10, caps: { battery: 6 }, buzz: 5, risk: 8, conflicts: ['crystal', 'wrap'] },
  { id: 'stylus', cat: 'fun', appear: {gen:3}, tier: 2, name: '内置手写笔', icon: '🖊️', desc: '底部抽出一支笔', cost: 4, thick: 0.2, weight: 6, caps: { os: 5 }, buzz: 4, risk: 8, conflicts: [] },
  // ── 3 形态实验 ──
  { id: 'slider', cat: 'form', appear: {month:16}, tier: 3, name: '滑盖', icon: '↕️', desc: '屏幕整片上滑，露出第二层', group: 'form', cost: 10, thick: 2.5, weight: 30, caps: { design: 5 }, buzz: 8, risk: 14, conflicts: [] },
  { id: 'swivel', cat: 'form', appear: {month:16}, tier: 3, name: '旋转屏', icon: '🔄', desc: '屏幕转 90° 变成 T 字', group: 'form', cost: 12, thick: 3, weight: 40, caps: { design: 8, battery: -5 }, buzz: 9, risk: 16, conflicts: [] },
  { id: 'fold', cat: 'form', appear: {month:16}, tier: 3, name: '折叠屏', icon: '📖', desc: '一折变平板', group: 'form', cost: 18, thick: 3.5, weight: 60, caps: { design: 15, battery: -10 }, buzz: 10, risk: 16, conflicts: [] },
  { id: 'modular', cat: 'body', appear: {month:18}, tier: 3, name: '模块化背板', icon: '🧩', desc: '磁吸模块随便换', group: 'back', cost: 8, thick: 1, weight: 20, caps: { battery: 5 }, buzz: 7, risk: 12, conflicts: [] },
  { id: 'solar', cat: 'power', appear: {month:18}, tier: 3, name: '太阳能背板', icon: '☀️', desc: '晒一晒多活两小时', group: 'back', cost: 5, thick: 0.3, weight: 6, caps: { battery: 10 }, buzz: 7, risk: 10, conflicts: [] },
  { id: 'chrome', cat: 'body', appear: {month:18}, tier: 3, name: '变色后盖', icon: '🦎', desc: '电致变色，一键换皮', group: 'back', cost: 6, thick: 0.2, weight: 4, caps: {}, buzz: 8, risk: 12, conflicts: [] },
  // ── 4 未来原型 ──
  { id: 'trifold', cat: 'form', appear: {after:'fold'}, tier: 4, name: '三折叠', icon: '🪭', desc: 'Z 字两折，展开是平板', group: 'form', cost: 28, thick: 5, weight: 90, caps: { design: 25, battery: -15 }, buzz: 14, risk: 22, conflicts: [], prereq: ['fold'] },
  { id: 'wrap', cat: 'form', appear: {after:'subscreen',month:22}, tier: 4, name: '环绕屏', icon: '🌐', desc: '正面、侧边、背面全是屏幕', group: 'back', cost: 20, thick: 0.4, weight: 12, caps: { design: 20, battery: -15 }, buzz: 14, risk: 20, conflicts: ['popup'], prereq: ['subscreen', 'fold'] },
  { id: 'rollable', cat: 'form', appear: {after:'fold'}, tier: 4, name: '卷轴屏', icon: '📜', desc: '屏幕从侧边卷出来', group: 'form', cost: 22, thick: 2, weight: 40, caps: { design: 15 }, buzz: 13, risk: 20, conflicts: [], prereq: ['fold', 'slider'] },
  { id: 'crystal', cat: 'body', appear: {after:'clear',gen:3}, tier: 4, name: '全透明机身', icon: '💎', desc: '中框、后盖全透明', group: 'back', cost: 15, thick: 0, weight: 6, caps: { design: -5 }, buzz: 13, risk: 18, conflicts: [], prereq: ['clear'] },
  { id: 'watch', cat: 'body', appear: {month:24}, tier: 4, name: '机械表芯后盖', icon: '⚙️', desc: '后盖里有齿轮在走', cost: 8, thick: 0.5, weight: 10, caps: {}, buzz: 9, risk: 12, conflicts: ['eink', 'solar', 'modular', 'wrap', 'pet'] },
  { id: 'projector', cat: 'fun', appear: {month:24}, tier: 4, name: '投影仪', icon: '📽️', desc: '顶部投出 80 寸', cost: 12, thick: 1, weight: 14, caps: { battery: -10 }, buzz: 11, risk: 16, conflicts: [] },
  // ── 5 科幻彩蛋 ──
  { id: 'holo', cat: 'fun', appear: {after:'projector'}, tier: 5, name: '全息投影', icon: '🛸', desc: '屏幕上方浮出 3D 影像', cost: 30, thick: 1, weight: 20, caps: { battery: -15 }, buzz: 18, risk: 26, conflicts: [], prereq: ['projector'] },
  { id: 'pet', cat: 'fun', appear: {after:'subscreen',month:20}, tier: 5, name: '电子宠物背屏', icon: '🐣', desc: '背面养一只像素宠物', cost: 5, thick: 0.3, weight: 6, caps: {}, buzz: 12, risk: 10, conflicts: [], prereq: ['subscreen', 'eink'] },
  // ── v1.3 行业部件 ──
  { id: 'fastcharge', cat: 'power', appear: {gen:1}, tier: 1, name: '百瓦快充', icon: '⚡', desc: '十分钟充一半', cost: 2, thick: 0, weight: 2, caps: { battery: 4 }, buzz: 4, risk: 4, conflicts: [] },
  { id: 'jack', cat: 'fun', appear: {gen:1}, tier: 1, name: '3.5mm 耳机孔', icon: '🎧', desc: '有线耳机党的执念', cost: 1, thick: 0, weight: 1, caps: {}, buzz: 3, risk: 3, conflicts: [] },
  { id: 'ip68', cat: 'body', appear: {gen:2}, tier: 1, name: 'IP68 防水', icon: '💧', desc: '泡水半小时没事', cost: 2, thick: 0, weight: 2, caps: { battery: 2 }, buzz: 2, risk: 4, conflicts: ['battswap'] },
  { id: 'ir', cat: 'fun', appear: {gen:2}, tier: 1, name: '红外遥控', icon: '📺', desc: '顶部一颗红外灯', cost: 1, thick: 0, weight: 1, caps: {}, buzz: 2, risk: 2, conflicts: [] },
  { id: 'haptics', cat: 'fun', appear: {gen:2}, tier: 1, name: '超大线性马达', icon: '📳', desc: '震感清脆', cost: 2, thick: 0.1, weight: 4, caps: { os: 4 }, buzz: 2, risk: 3, conflicts: [] },
  { id: 'sdcard', cat: 'fun', appear: {gen:2}, tier: 1, name: '存储卡槽', icon: '💾', desc: '容量自己加', cost: 1, thick: 0, weight: 1, caps: {}, buzz: 3, risk: 3, conflicts: [] },
  { id: 'ultrasonic', cat: 'fun', appear: {gen:2}, tier: 1, name: '超声波指纹', icon: '👆', desc: '湿手也能解锁', cost: 3, thick: 0, weight: 1, caps: { os: 3 }, buzz: 3, risk: 5, conflicts: [] },
  { id: 'reverse', cat: 'power', appear: {gen:2}, tier: 1, name: '无线反向充电', icon: '🔁', desc: '给耳机救急', cost: 2, thick: 0.1, weight: 3, caps: {}, buzz: 3, risk: 4, conflicts: [] },
  { id: 'periscope', cat: 'cam', appear: {gen:3}, tier: 2, name: '潜望长焦', icon: '🔭', desc: '10 倍光学变焦（要方形 / 圆形 / 横向模组才放得下）', cost: 6, thick: 0.4, weight: 8, caps: { camera: 8 }, buzz: 6, risk: 10, conflicts: [] },
  { id: 'gimbal', cat: 'cam', appear: {gen:3}, tier: 2, name: '微云台防抖', icon: '🎥', desc: '跑着拍也不晃', cost: 4, thick: 0.3, weight: 4, caps: { camera: 6 }, buzz: 5, risk: 8, conflicts: [] },
  { id: 'titanium', cat: 'body', appear: {gen:3}, tier: 2, name: '钛金属中框', icon: '🛡️', desc: '轻又硬，冷冷的灰', cost: 6, thick: 0, weight: -8, caps: { design: 6 }, buzz: 5, risk: 8, conflicts: ['crystal'] },
  { id: 'ceramic', cat: 'body', appear: {gen:3}, tier: 2, name: '陶瓷后盖', icon: '🏺', desc: '温润如玉，也更重', group: 'back', cost: 6, thick: 0.2, weight: 12, caps: { design: 8 }, buzz: 4, risk: 8, conflicts: [] },
  { id: 'sicarbon', cat: 'power', appear: {gen:3}, tier: 2, name: '硅碳电池', icon: '🔋', desc: '同样厚度多装 20% 电', cost: 4, thick: -0.3, weight: -4, caps: { battery: 8 }, buzz: 4, risk: 8, conflicts: [] },
  { id: 'magcharge', cat: 'power', appear: {gen:3}, tier: 2, name: '磁吸无线充', icon: '🧲', desc: '啪一下吸上去', cost: 3, thick: 0.2, weight: 6, caps: {}, buzz: 4, risk: 6, conflicts: ['wrap'] },
  { id: 'facelock', cat: 'fun', appear: {gen:3}, tier: 2, name: '3D 结构光', icon: '🙂', desc: '刷脸比指纹快', cost: 4, thick: 0, weight: 2, caps: { os: 4 }, buzz: 4, risk: 8, conflicts: ['udc'] },
  { id: 'paper', cat: 'form', appear: {month:14}, tier: 2, name: '类纸护眼屏', icon: '📄', desc: '磨砂屏，像纸一样', cost: 4, thick: 0, weight: 0, caps: { design: -3, battery: 3 }, buzz: 5, risk: 6, conflicts: [] },
  { id: 'privacy', cat: 'form', appear: {month:14}, tier: 2, name: '防窥屏', icon: '🕶️', desc: '一键防偷看', cost: 3, thick: 0, weight: 0, caps: {}, buzz: 4, risk: 6, conflicts: [] },
  { id: 'oneinch', cat: 'cam', appear: {month:18}, tier: 3, name: '一英寸大底', icon: '📷', desc: '主摄大得像相机（要方形或圆形模组）', cost: 10, thick: 0.6, weight: 14, caps: { camera: 14 }, buzz: 8, risk: 12, conflicts: [] },
  { id: 'udc', cat: 'cam', appear: {month:20}, tier: 3, name: '屏下摄像头', icon: '🫥', desc: '前摄藏在屏幕下面', cost: 8, thick: 0, weight: 2, caps: { design: 8, camera: -4 }, buzz: 8, risk: 14, conflicts: ['popup'] },
  { id: 'ai', cat: 'fun', appear: {chip:3}, tier: 3, name: '端侧 AI 芯片', icon: '🤖', desc: '离线大模型助手', cost: 8, thick: 0, weight: 2, caps: { os: 12, battery: -4 }, buzz: 9, risk: 12, conflicts: [] },
];
export const MAX_CONCEPTS = 3;

/** 实用功能：常规配置，不占「创新」名额 */
export const PRACTICAL = new Set(['jack', 'ir', 'sdcard', 'ip68', 'haptics', 'ultrasonic', 'reverse', 'fastcharge', 'shutter', 'facelock', 'magcharge', 'paper', 'privacy', 'sicarbon']);
export const innovCount = (ids = []) => ids.filter((id) => !PRACTICAL.has(id)).length;

export const CATS = [
  { id: 'cam', name: '影像', icon: '📷' },
  { id: 'form', name: '屏幕与形态', icon: '📱' },
  { id: 'power', name: '续航与充电', icon: '🔋' },
  { id: 'body', name: '机身与材质', icon: '💎' },
  { id: 'fun', name: '交互与黑科技', icon: '🧪' },
];

/**
 * 是否已经「出现」在行业里（逐步揭示，避免一次性信息爆炸）
 * ctx = { gen, month, models, chipGen }；ctx 为 null 表示沙盒（全部出现）
 */
export function hasAppeared(id, ctx) {
  const c = CONCEPTS.find((x) => x.id === id);
  if (!ctx || !c?.appear) return true;
  const a = c.appear;
  if (a.gen && (ctx.gen || 1) < a.gen) return false;
  if (a.month && (ctx.month || 1) < a.month) return false;
  if (a.chip && (ctx.chipGen || 1) < a.chip) return false;
  if (a.after) {
    const used = new Set((ctx.models || []).flatMap((m) => m.design.concepts || []));
    if (!used.has(a.after) && !((ctx.month || 1) >= 30)) return false;
  }
  return true;
}
const CBYID = Object.fromEntries(CONCEPTS.map((c) => [c.id, c]));

/** 两个概念是否互斥（同组或任一方声明冲突） */
export function conceptsConflict(a, b) {
  const A = CBYID[a];
  const B = CBYID[b];
  if (!A || !B || a === b) return false;
  if (A.group && A.group === B.group) return true;
  return A.conflicts.includes(b) || B.conflicts.includes(a);
}

/**
 * 解锁状态。ctx = { unlocked: string[] | null, models: [], rp }；unlocked 为 null 表示沙盒（全解锁）
 */
export function unlockStatus(id, ctx) {
  const c = CBYID[id];
  const cost = TIERS[c.tier - 1].cost;
  if (!ctx || ctx.unlocked == null || c.tier === 1 || ctx.unlocked.includes(id)) return { unlocked: true, cost, prereqOk: true, tier: c.tier };
  const used = new Set((ctx.models || []).flatMap((m) => m.design.concepts || []));
  const pre = c.prereq || [];
  const prereqOk = !pre.length || pre.some((p) => used.has(p));
  const prereqText = pre.length ? `需先发布过「${pre.map((p) => CBYID[p].name).join('」或「')}」` : '';
  return { unlocked: false, cost, prereqOk, prereqText, tier: c.tier, affordable: (ctx.rp || 0) >= cost };
}

/** 出圈度：越夸张、越首发，越容易被自发传播 */
export function buzzOf(design, museum) {
  const mem = marketMemory(museum);
  let b = 0;
  for (const id of design.concepts || []) {
    const c = CBYID[id];
    if (!c) continue;
    const m = mem[id];
    b += c.buzz * (!m ? 1.6 : m.first >= 0 && m.rivals === 0 ? 1.1 : 0.6);
  }
  for (const c of COMBOS) if (c.test(design) && !mem[c.id]) b += 4;
  return Math.round(b);
}

/** 品类创新：少见的组合（取舍层的创意） */
export const COMBOS = [
  { id: 'mini-flag', name: '小屏旗舰', test: (d) => d.parts.size === 0 && d.parts.chip === 2 },
  { id: 'mini-cam', name: '影像小钢炮', test: (d) => d.parts.size === 0 && d.parts.camera === 2 },
  { id: 'plastic-beast', name: '塑料性能刺客', test: (d) => d.parts.chip === 2 && d.parts.material === 0 },
  { id: 'twoweeks', name: '两周一充', test: (d) => d.parts.battery === 2 && hasC(d, 'eink') },
  { id: 'gamer', name: '电竞怪兽', test: (d) => d.parts.chip === 2 && hasC(d, 'fan') && hasC(d, 'lights') },
  { id: 'retro', name: '复古商务机', test: (d) => hasC(d, 'keyboard') && d.screenForm === 'bezel' },
  { id: 'xray', name: '透视旗舰', test: (d) => (hasC(d, 'clear') || hasC(d, 'crystal')) && d.parts.chip === 2 },
  { id: 'slide-kb', name: '复古滑盖王', test: (d) => hasC(d, 'slider') && hasC(d, 'keyboard') },
  { id: 'cinema', name: '口袋影院', test: (d) => hasC(d, 'projector') && (hasC(d, 'fold') || hasC(d, 'trifold')) },
  { id: 'cyberpet', name: '赛博宠物', test: (d) => hasC(d, 'holo') && hasC(d, 'pet') },
  { id: 'offgrid', name: '永不断电', test: (d) => hasC(d, 'solar') && hasC(d, 'battswap') },
  { id: 'ultimate', name: '全面屏终极形态', test: (d) => hasC(d, 'wrap') && d.screenForm === 'full' },
];

export function hasC(d, id) {
  return (d.concepts || []).includes(id);
}

/** 虚构竞品与其已发布的产品（市场记忆的初始值） */
export const RIVALS = [
  { brand: '蓝莓科技', style: '挤牙膏冠军', latest: '蓝莓 14 Pro Max Plus', concepts: [], combos: [], crowd: ['大底三摄', '方形模组'] },
  { brand: '方块数码', style: '电竞狂魔', latest: '方块 RedPlay 7', concepts: ['lights', 'fan'], combos: ['gamer'], crowd: ['灯效后盖', '散热风扇'] },
  { brand: '极光移动', style: '户外硬汉', latest: '极光 Trek 3', concepts: ['sat', 'shutter'], combos: [], crowd: ['卫星通信'] },
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
    const tierV = [26, 30, 34, 40, 45][(CBYID[id]?.tier || 1) - 1];
    if (!m) items.push({ label: `首发「${name}」`, v: tierV, first: true });
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
  if (prev && (design.chipGen || 1) > (prev.chipGen || 1)) items.push({ label: `首发新芯片 ${chipName(design.chipSeries, design.chipGen, 1).replace(/ Pro$/, '')}`, v: 8 });
  if (prev && isSqueeze(design, prev) && (design.chipGen || 1) <= (prev.chipGen || 1)) items.push({ label: '和上一代几乎一样', v: -10 });
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
    if (u === 0) items.push({ label: `「${conceptName(id)}」新工艺首发`, v: -(CBYID[id]?.risk ?? 10) });
    else if (u === 1) items.push({ label: `「${conceptName(id)}」第二代打磨`, v: -5 });
    else items.push({ label: `「${conceptName(id)}」工艺成熟`, v: 0 });
  }
  const n = (design.concepts || []).length;
  if (n >= 2) items.push({ label: `${n} 个概念件要一起调校`, v: -4 * (n - 1) });
  if (design.redesign === 'major' && museum.length) items.push({ label: '大改款新模具', v: -3 });
  if (hasC(design, 'fan') && design.parts.chip !== 2) items.push({ label: '风扇配小芯片：吹空气', v: -6 });
  const score = Math.max(30, Math.min(100, 100 + items.reduce((a, b) => a + b.v, 0)));
  return { score, items };
}

export function wow(design, museum) {
  const n = novelty(design, museum);
  const c = completeness(design, museum);
  const score = Math.round((Math.min(100, n.score * 1.3) * c.score) / 100);
  let headline;
  const bz = buzzOf(design, museum);
  if (bz >= 40 && c.score < 65) headline = '「做工翻车，但全网都在讨论」';
  else if (n.score >= 55 && c.score >= 85) headline = '「这才叫创新！」——科技媒体集体起立';
  else if (n.score >= 55) headline = '「概念满分，做工还差口气」';
  else if (n.score >= 30) headline = '「有新意，但不够炸」';
  else if (!museum.length) headline = '「中规中矩的首秀」——先活下来再说';
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

/**
 * 和上一代有多像（0～1）：配置、概念件、配色、造型都算
 * 一模一样的手机再卖一次，用户会审美疲劳
 */
export function similarity(a, b) {
  if (!a || !b) return 0;
  const keys = PART_ORDER;
  const parts = keys.filter((k) => a.parts?.[k] === b.parts?.[k]).length / keys.length;
  const ca = new Set(a.concepts || []);
  const cb = new Set(b.concepts || []);
  const uni = new Set([...ca, ...cb]);
  const concepts = uni.size ? [...ca].filter((x) => cb.has(x)).length / uni.size : 1;
  const look =
    [
      a.color?.toLowerCase() === b.color?.toLowerCase(),
      a.layout === b.layout,
      a.corner === b.corner,
      a.screenForm === b.screenForm,
      a.twoTone === b.twoTone,
      (a.matSub || '') === (b.matSub || ''),
      (a.camPos || 'tl') === (b.camPos || 'tl'),
      (a.finish || 'gloss') === (b.finish || 'gloss'),
      (a.ringColor || 'silver') === (b.ringColor || 'silver'),
    ].filter(Boolean).length / 9;
  const chip = (a.chipGen || 1) === (b.chipGen || 1) ? 1 : 0;
  return Math.round((parts * 0.3 + concepts * 0.3 + look * 0.25 + chip * 0.15) * 100) / 100;
}
