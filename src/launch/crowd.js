/**
 * 观众的嘴：发布会弹幕 + 评论区
 * 按「意图」组织：同一个意思有多种说法，同一场里同一句话绝不出现两次。
 */
import { physical, chipSpec } from '../studio/parts.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

/** 弹幕：短、口语、带情绪 */
const DM = {
  price: ['多少钱？', '价格呢价格呢', '先报价！', '钱包已就位', '求别太贵', '定价决定一切'],
  wait: ['等一个评测', '等老喵测完再说', '坐等拆机', '先观望一下', '等首批用户反馈', '不急，等口碑'],
  buy: ['买了买了', '已经在攒钱了', '冲！', '这台我要了', '今晚就下单', '钱包：我还能撑'],
  look: ['外观党狂喜', '颜值在线', '好看！', '这配色可以', '颜值即正义', '这设计我爱了'],
  next: ['再等等下一代', '明年再换', '旧手机还能再战', '等降价再说', '下一代肯定更香'],
  thin: ['好薄！能切西瓜', '薄到怀疑人生', '这也太薄了', '像一张卡片', '揣兜里没感觉吧'],
  thick: ['厚得像充电宝', '有点厚啊', '这厚度能防身', '握着应该挺扎实', '加厚版？'],
  heavy: ['砖头本砖', '这重量练手腕', '砸核桃神器', '口袋要被扯坏了'],
  bigcam: ['这镜头模组能煎蛋了', '镜头比我脸还大', '摄像头好凶', '这是背了台相机吧', '后摄有点密恐'],
  fast: ['{chip} 跑分破百万！', '{chip} 太猛了', '性能怪兽来了', '打游戏稳了', '这性能能开飞机'],
  chipok: ['{chip} 够用吗？', '{chip} 发热怎么样', '芯片挤牙膏了吗', '性能一般般？', '日常够用就行'],
  chiplag: ['芯片落后一代了吧', '还在用老芯片？', '友商都换新芯片了', '这芯片去年的吧', '性能要被吊打了'],
  chiplead: ['自研芯片领先了！', '这芯片比友商还新', '国产芯片站起来了', '芯片代差拉开了'],
  leather: ['终于有素皮了！', '素皮手感一定好', '素皮yyds'],
  metal: ['金属边框冷冷的，喜欢', '这金属光泽绝了', '金属机身有质感', '冰冰凉凉的高级感'],
  full: ['全面屏看片爽', '屏占比好高', '这边框窄得离谱'],
  bezel: ['边框能放下我的工资条', '这边框是认真的吗', '下巴有点宽'],
  glasses: ['后背在对我笑', '摄像头像一副眼镜'],
  diamond: ['菱形模组？有点东西', '这镜头排布好别致'],
  twotone: ['撞色好看诶', '拼色有点潮'],
};
const DM_CONCEPT = {
  clear: ['透明后盖！能看见电池！', '透明的！看见主板了'],
  subscreen: ['后置副屏自拍神器', '背面还有块屏？'],
  eink: ['墨水背屏可以看小说吗', '背面能当电子书'],
  lights: ['灯效闪瞎我', '后背会发光！', '赛博朋克味儿'],
  keyboard: ['键盘回来了！爷青回', '实体键盘打字爽'],
  shutter: ['快门键手感一定很好', '有快门键，拍照党狂喜'],
  sat: ['天线好可爱', '这天线是认真的？'],
  fan: ['风扇转起来了！', '手机里装风扇？', '散热拉满'],
  popup: ['镜头弹出来那一下好帅', '升降镜头回来了', '弹出来了！'],
  battswap: ['可换电池！回到十年前', '电池能拔？爷青回'],
  stylus: ['笔！是笔！', '抽出一支笔？'],
  slider: ['滑盖回来了啊啊啊', '滑盖手感想摸'],
  swivel: ['转起来了？？？', 'T 字形手机？'],
  fold: ['一折变平板', '折叠屏，钱包也折了', '折痕明显吗'],
  modular: ['乐高手机', '模块随便换？'],
  solar: ['晒太阳就能充电？', '光合作用手机'],
  chrome: ['会变色的后盖！', '一键换皮肤'],
  trifold: ['三折叠！这是什么怪物', '展开是平板了'],
  wrap: ['全身都是屏幕，怎么拿？', '环绕屏太科幻了'],
  rollable: ['屏幕从侧面卷出来了！', '卷轴屏好酷'],
  crystal: ['全透明，像水晶', '水晶手机！'],
  watch: ['后盖里有表芯在走', '机械表芯？浪漫'],
  projector: ['直接投到墙上看电影', '自带投影仪？'],
  holo: ['全息影像？？科幻成真', '浮出来了！'],
  pet: ['背面养了只小鸡！', '电子宠物回来了'],
  fastcharge: ['十分钟充一半？', '快充党狂喜'],
  ip68: ['能泡水？', '洗澡也能刷剧了'],
  ai: ['离线大模型？', 'AI 助手能写作业吗'],
  periscope: ['十倍变焦能拍月亮吗', '演唱会神器'],
  oneinch: ['一英寸大底！', '这是相机吧'],
  titanium: ['钛金属，轻了不少', '钛灰好看'],
};

/** 生成本场弹幕，按意图去重，保证句句不同 */
export function danmakuLines(design, ctx = {}, n = 10) {
  const p = physical(design);
  const cs = chipSpec(design);
  const C = new Set(design.concepts || []);
  const intents = ['price', 'wait', 'buy', 'look', 'next'];
  if (p.thickness <= 7.6) intents.push('thin');
  if (p.thickness >= 8.8) intents.push('thick');
  if (p.weight >= 230) intents.push('heavy');
  if (design.parts.camera === 2) intents.push('bigcam');
  intents.push(ctx.chipLag > 0 ? 'chiplag' : ctx.chipLead ? 'chiplead' : cs.bench >= 1000000 ? 'fast' : 'chipok');
  if (design.parts.material === 3) intents.push('leather');
  if (design.parts.material === 2) intents.push('metal');
  if (design.screenForm === 'full') intents.push('full');
  if (design.screenForm === 'bezel') intents.push('bezel');
  if (design.layout === 'glasses') intents.push('glasses');
  if (design.layout === 'diamond') intents.push('diamond');
  if (design.twoTone && design.twoTone !== 'none') intents.push('twotone');
  const pools = intents.map((k) => DM[k].map((t) => t.replace('{chip}', cs.label)));
  for (const id of C) if (DM_CONCEPT[id]) pools.unshift(DM_CONCEPT[id], DM_CONCEPT[id]); // 新东西被提到的概率更高
  const used = new Set();
  const out = [];
  let guard = 0;
  while (out.length < n && guard++ < 200) {
    const pool = pick(pools);
    const free = pool.filter((t) => !used.has(t));
    if (!free.length) continue;
    const t = pick(free);
    used.add(t);
    out.push(t);
  }
  return shuffle(out);
}

// ═════════════════════════ 评论区 ═════════════════════════

const NAMES = ['数码老炮', '夜景党', '续航焦虑患者', '学生党小林', '极客阿杰', '发烧友小美', '路过的蓝莓用户', '测评博主老喵', '理性消费者', '拆机狂魔', '首发党', '退休程序员', '手游玩家', '摄影爱好者', '钱包很瘦', '设计系学生'];
const AV = ['🧑', '👩', '🧔', '👨‍💻', '👩‍🎤', '🧑‍🔬', '👴', '👧', '🧑‍🎨', '🧑‍🔧', '👩‍💼', '🧑‍🚀'];

/** 每条：意图 → 多种说法；base 为期望点赞量级 */
const CM = {
  broken: { base: 1100, hot: true, t: ['说好的「{p}」呢？货不对板', '「{p}」？PPT 上是这么写的', '宣传「{p}」，实际就这？退了', '{p}只存在于发布会'] },
  pricy: { base: 800, hot: true, t: ['东西不错，就是太贵了，等降价', '这个价我选友商', '定价劝退，告辞', '价格刺客，钱包已阵亡'] },
  pricyAnchor: { base: 900, hot: true, t: ['怎么又涨价了？上一代才 ¥{last}', '一代比一代贵，老用户心凉', '涨价不涨配置？'] },
  cheap: { base: 700, t: ['这个价格是认真的吗？冲了', '良心价！友商睡不着了', '价格屠夫，买爆', '这价钱不买等什么'] },
  fair: { base: 300, t: ['价格还算合理', '定价中规中矩，看个人需求', '这价位竞争挺激烈的'] },
  flop: { base: 1300, hot: true, t: ['发布会翻车名场面已收藏', '演示机卡住那一下我笑出声', '现场 Demo 翻车，工程师今晚别睡了'] },
  buzz: { base: 2000, hot: true, t: ['#{m}# 是今年最离谱的手机（褒义）', '今年最有想法的一台，没有之一', '这才是我想要的创新'] },
  rough: { base: 700, hot: true, t: ['想法很好，做工像样机', '概念满分，完成度堪忧', '首批用户就是测试员吧'] },
  stale: { base: 750, t: ['又是挤牙膏，换个颜色就是新品？', '今年的升级在哪里？', '跟上一代找不同'] },
  chiplag: { base: 950, hot: true, t: ['芯片还是老一代，友商都换新了', '性能落后一代，这价格说不过去', '自研芯片该升级了吧'] },
  chiplead: { base: 850, t: ['自研芯片终于领先了，支持', '芯片领先一代，性能党狂喜', '这代芯片是真的强'] },
  extchip: { base: 260, t: ['用的外购芯片，性能还行就是没特色', '外购芯片稳是稳，就是不够独特'] },
  good: { base: 400, t: ['已下单，坐等发货', '颜值和手感都在线', '用了一周，挺满意的', '拍照比我想的好', '续航能撑一天半'] },
  meh: { base: 160, t: ['等一个详细评测', '看看首批用户怎么说', '再等等，不急', '还行吧，没惊喜'] },
  joke: { base: 380, t: ['主讲人那句「之一」我能笑一年', '我妈问我为什么半夜在看发布会', '钱包：你礼貌吗', '等等党永不为奴'] },
};

/**
 * ctx: { design, modelName, promisesBroken[], priceRatio, anchorLast, flop, buzz, completeness, novelty, chipLag, chipLead, extChip, gen }
 * 返回 [{ who, av, t, like(最终), hot, reply }]
 */
export function buildComments(ctx) {
  const used = new Set();
  const say = (k, vars = {}) => {
    const c = CM[k];
    const free = c.t.filter((t) => !used.has(t));
    if (!free.length) return null;
    const t0 = pick(free);
    used.add(t0);
    const t = t0.replace('{p}', vars.p || '').replace('{m}', ctx.modelName || '').replace('{last}', vars.last || '');
    return { t, like: Math.round(c.base * (0.6 + Math.random() * 0.8)), hot: !!c.hot };
  };
  const out = [];
  (ctx.promisesBroken || []).slice(0, 2).forEach((p) => out.push(say('broken', { p })));
  if (ctx.priceRatio >= 1.12) out.push(say('pricy'));
  if (ctx.anchorLast) out.push(say('pricyAnchor', { last: ctx.anchorLast }));
  if (ctx.priceRatio <= 0.88) out.push(say('cheap'), say('cheap'));
  else if (ctx.priceRatio < 1.12) out.push(say('fair'));
  if (ctx.flop) out.push(say('flop'));
  if (ctx.buzz >= 40) out.push(say('buzz'));
  if (ctx.completeness < 70) out.push(say('rough'));
  if (ctx.novelty < 25 && ctx.gen > 1) out.push(say('stale'));
  if (ctx.chipLag > 0) out.push(say('chiplag'));
  else if (ctx.chipLead) out.push(say('chiplead'));
  if (ctx.extChip) out.push(say('extchip'));
  out.push(say('good'), say('good'), say('meh'), say('meh'), say('joke'));
  // 弹幕里的短句也会出现在评论区（换成评论语气）
  danmakuLines(ctx.design, ctx, 3).forEach((t) => out.push({ t, like: Math.round(60 + Math.random() * 220), hot: false }));
  const list = out.filter(Boolean).slice(0, 11);
  const names = shuffle(NAMES);
  return list.map((c, i) => ({ ...c, who: names[i % names.length], av: AV[(i * 5 + (ctx.gen || 1)) % AV.length], reply: Math.round((c.like / 40) * Math.random()) }));
}
