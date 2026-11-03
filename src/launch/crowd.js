import { productEraOf } from '../game/eras/index.js';
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
  fast: ['{chip} 跑分破百万！', '{chip} 太猛了', '性能怪兽来了', '打游戏稳了', '遥遥领先？', '不服跑个分'],
  chipok: ['{chip} 够用吗？', '{chip} 发热怎么样', '性能一般般？', '日常够用就行', '刷视频够了'],
  chipmid: ['{chip} 日常够用', '中杯芯片真香', '打游戏够不够？', '{chip} 能战三年'],
  valuechip: ['这价格还给 {chip}？真香', '{chip} 下放到这个价位了', '学生党狂喜', '性价比拉满', '这芯片配这价格，友商慌了'],
  weakchip: ['这价格就给 {chip}？', '旗舰价，入门芯？', '芯片拖后腿了', '{chip} 配这个价？'],
  chiplag: ['芯片落后一代了吧', '还在用老芯片？', '友商都换新芯片了', '这芯片去年的吧', '性能要被吊打了'],
  chiplead: ['自研芯片领先了！', '这芯片比友商还新', '遥遥领先！', '芯片代差拉开了'],
  meme: ['Are you OK?', '真香警告', '等等党永不为奴', '为发烧而生？', '友商：？', '这波在大气层', '爷青回', '求求了别挤牙膏'],
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
  fastcharge: ['十分钟充一半？', '快充党狂喜', '充电五分钟，通话两小时'],
  ip68: ['能泡水？', '洗澡也能刷剧了'],
  ai: ['离线大模型？', 'AI 助手能写作业吗'],
  periscope: ['十倍变焦能拍月亮吗', '演唱会神器', '这月亮是 P 的吧'],
  oneinch: ['一英寸大底！', '这是相机吧'],
  titanium: ['钛金属，轻了不少', '钛灰好看'],
};

const DM_KEYPAD = {
  price: ['多少钱？', '营业厅什么时候有货', '别超过一千就行', '有没有合约机', '预存话费送不送'],
  wait: ['等报纸上的测评', '先看看论坛怎么说', '等过年再换', '问问我爸意见'],
  buy: ['明天就去营业厅', '给我爸也带一台', '这台我要了', '学校门口那家店会有吗'],
  look: ['这颜色好看', '看着结实', '键盘手感怎么样', '能不能挂手机链'],
  mono: ['单色屏省电', '黑白屏够用了'],
  color: ['彩屏！', '能看彩信吗', '屏幕颜色真鲜'],
  standby: ['待机多久？', '一礼拜一充就够了', '出差不用带充电器了'],
  ring0: ['声音大不大', '在车上听得见吗'],
  chord: ['铃声能自己换吗', '能下载铃声吗', '这铃声好听'],
  tough: ['摔了会不会坏', '工地上用结实吗', '真能砸核桃？'],
  signal: ['信号怎么样', '电梯里有信号吗', '农村能用吗'],
  cam: ['能拍照？', '照片能传到电脑吗', '能发彩信吗'],
  elder: ['给我妈买一台', '字够大吗', '老人会用吗', '有收音机吗'],
  flip: ['翻盖帅', '翻盖的轴耐用吗'],
  dual: ['双卡好', '两个号一部机'],
  net: ['能上网？', '流量贵不贵', '能上 QQ 吗'],
  music: ['能听歌吗', '能存几首歌', '有收音机吗'],
};

const DM_KEYPAD_SENDER = () => `13${Math.floor(Math.random() * 10)}****${String(1000 + Math.floor(Math.random() * 9000)).slice(1)}`;
export { DM_KEYPAD_SENDER };

function keypadIntents(design) {
  const p = design.parts || {};
  const C = new Set(design.concepts || []);
  const out = ['price', 'wait', 'buy', 'look', 'standby', 'signal'];
  out.push((p.screen ?? 0) === 0 ? 'mono' : 'color');
  out.push((p.ringtone ?? 0) === 0 ? 'ring0' : 'chord');
  if ((p.material ?? 0) !== 1) out.push('tough');
  if ((p.camera ?? 0) >= 1) out.push('cam');
  if (design.formFactor === 'elder') out.push('elder', 'elder');
  if (design.formFactor === 'flip') out.push('flip');
  if (C.has('dualsim')) out.push('dual');
  if ((p.network ?? 0) >= 1) out.push('net');
  if (C.has('mp3') || C.has('fm')) out.push('music');
  return out;
}

/** 生成本场弹幕，按意图去重，保证句句不同 */
export function danmakuLines(design, ctx = {}, n = 10) {
  if (productEraOf(design) === 'keypad') {
    const used = new Set();
    const out = [];
    let guard = 0;
    while (out.length < n && guard++ < 200) {
      for (const intent of shuffle(keypadIntents(design))) {
        const pool = (DM_KEYPAD[intent] || []).filter((x) => !used.has(x));
        if (!pool.length) continue;
        const line = pick(pool);
        used.add(line);
        out.push(line);
        if (out.length >= n) break;
      }
      if (Object.values(DM_KEYPAD).every((pool) => pool.every((x) => used.has(x)))) break;
    }
    return out;
  }
  const p = physical(design);
  const cs = chipSpec(design);
  const C = new Set(design.concepts || []);
  const intents = ['price', 'wait', 'buy', 'look', 'next', 'meme'];
  if (p.thickness <= 7.6) intents.push('thin');
  if (p.thickness >= 8.8) intents.push('thick');
  if (p.weight >= 230) intents.push('heavy');
  if (design.parts.camera === 2) intents.push('bigcam');
  // 芯片评论要结合价位：低价给好芯片是惊喜，高价给弱芯片是槽点
  const tierId = design.parts.chip ?? 1;
  const price = ctx.price || 3999;
  intents.push(
    ctx.chipLag > 0 ? 'chiplag'
      : ctx.chipLead ? 'chiplead'
        : price <= 2999 && tierId >= 1 ? 'valuechip'
          : price >= 4500 && tierId === 0 ? 'weakchip'
            : tierId === 2 || cs.bench >= 1000000 ? 'fast'
              : tierId === 1 ? 'chipmid' : 'chipok',
  );
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
  flop: { base: 1300, hot: true, t: ['发布会翻车名场面已收藏', '演示机卡住那一下我笑出声', '现场演示翻车，工程师今晚别睡了'] },
  buzz: { base: 2000, hot: true, t: ['#{m}# 是今年最离谱的手机（褒义）', '今年最有想法的一台，没有之一', '这才是我想要的创新'] },
  rough: { base: 700, hot: true, t: ['想法很好，做工像样机', '概念满分，完成度堪忧', '首批用户就是测试员吧'] },
  stale: { base: 750, t: ['又是挤牙膏，换个颜色就是新品？', '今年的升级在哪里？', '跟上一代找不同'] },
  copy: { base: 1300, hot: true, t: ['这不就是上一代吗？换了个名字', '找不同游戏：我找了十分钟', '上一代用户表示：没有任何换机理由'] },
  valuechip: { base: 900, hot: true, t: ['{c} 下放到这个价，学生党狂喜', '这价格这芯片，友商今晚睡不着', '同价位没对手，闭眼入'] },
  weakchip: { base: 800, hot: true, t: ['这么贵还用 {c}？割韭菜', '价格旗舰，芯片入门', '芯片拖了后腿，等降价'] },
  chiplag: { base: 950, hot: true, t: ['芯片还是老一代，友商都换新了', '性能落后一代，这价格说不过去', '自研芯片该升级了吧'] },
  chiplead: { base: 850, t: ['自研芯片终于领先了，支持', '芯片领先一代，性能党狂喜', '这代芯片是真的强'] },
  extchip: { base: 260, t: ['用的外购芯片，性能还行就是没特色', '外购芯片稳是稳，就是不够独特'] },
  good: { base: 400, t: ['已下单，坐等发货', '颜值和手感都在线', '用了一周，挺满意的', '拍照比我想的好', '续航能撑一天半'] },
  meh: { base: 160, t: ['等一个详细评测', '看看首批用户怎么说', '再等等，不急', '还行吧，没惊喜'] },
  joke: { base: 380, t: ['主讲人那句「之一」我能笑一年', '我妈问我为什么半夜在看发布会', '钱包：你礼貌吗', '等等党永不为奴', 'Are you OK 的含金量还在上升', '已经开始期待鬼畜区二创了'] },
  yyld: { base: 1500, hot: true, t: ['遥遥领先（这次不是指 PPT）', '不服跑个分，跑完服了', '跑分截图已存，明天去友商评论区发'] },
  only: { base: 1200, hot: true, t: ['Only {m} can do，这次我认了', '「Only xx can do」这句被你们玩明白了', '首发黑科技，友商又要连夜改 PPT 了'] },
  flopMeme: { base: 1400, hot: true, t: ['「我不是为了输赢，我就是认真」已设为签名', '演示机：我也想休息一下', '翻车不可怕，可怕的是还挺可爱'] },
  pricyMeme: { base: 900, hot: true, t: ['价格也遥遥领先了属于是', 'Pro Max 的价格，Pro Mini 的体验', '这价格，肾：我先走了'] },
  cheapMeme: { base: 950, hot: true, t: ['不要 4999 不要 3999，这熟悉的配方', '交个朋友价，友商连夜开会', '厚道！这才叫为发烧而生'] },
};

/**
 * ctx: { design, modelName, promisesBroken[], priceRatio, anchorLast, flop, buzz, completeness, novelty, chipLag, chipLead, extChip, gen }
 * 返回 [{ who, av, t, like(最终), hot, reply }]
 */

const CM_KEYPAD = {
  broken: { base: 900, hot: true, t: ['海报上写着「{p}」，拿到手根本不是那么回事', '「{p}」？我在营业厅试了，没感觉出来'] },
  pricy: { base: 700, hot: true, t: ['这个价，我还不如去营业厅存话费送一台', '贵了。等过两个月降价再说', '同样的钱能买两台青橙'] },
  cheap: { base: 800, t: ['这个价真厚道，给家里一人一台', '学生也买得起，好评', '性价比没得说'] },
  fair: { base: 280, t: ['价格还算公道', '这个价可以接受'] },
  standby: { base: 600, t: ['出差一个礼拜，回来还剩一格电', '待机是真的长，充电器都找不着了'] },
  standbyShort: { base: 500, t: ['说好的待机呢？三天就没电了', '彩屏好看，就是太费电'] },
  tough: { base: 650, t: ['从自行车上掉下去好几次，一点事没有', '砸核桃实测，核桃碎了，手机没事'] },
  fragile: { base: 520, t: ['烤漆好看，就是摔了一下掉了块漆', '亮面机身，一礼拜全是指纹'] },
  chord: { base: 500, t: ['铃声一响，整个车厢都回头看', '下载了好几首和弦铃声，真好听'] },
  ring0: { base: 260, t: ['铃声是单音的，有点吵', '声音倒是够大'] },
  mono: { base: 300, t: ['单色屏太阳底下看得清楚', '黑白屏，省电是真省电'] },
  color: { base: 420, t: ['彩屏看彩信太舒服了', '屏幕颜色比我上一台鲜多了'] },
  cam: { base: 450, t: ['拍了张全家福当屏保', '照片小是小了点，能看清人'] },
  elder: { base: 700, hot: true, t: ['给我妈买的，字大声大，她自己就会用', '那个 SOS 键，我爸说用着安心', '我奶奶说比我那台好用'] },
  flip: { base: 550, t: ['翻盖一合「啪」的一声，开会都不好意思', '合上就护着屏幕，兜里不怕刮'] },
  slider: { base: 520, t: ['一推就是键盘，挺有意思', '滑盖手感顺，就怕时间长了松'] },
  dual: { base: 560, t: ['终于不用揣两部手机了', '双卡双待，做生意的人都懂'] },
  net: { base: 400, t: ['能上移动梦网看新闻，就是流量费心疼', '在公交上看小说，时间过得快'] },
  music: { base: 430, t: ['存了二十多首歌，上学路上听', '耳机一插能听广播，早上听新闻'] },
  good: { base: 350, t: ['已经在营业厅买了，手感不错', '按键回弹很清脆', '信号比我想的好，地下室也有一格'] },
  meh: { base: 150, t: ['再观望一下', '等报纸上的测评出来再说', '看看用了半年的人怎么说'] },
  bbs: { base: 400, t: ['沙发', '板凳', '顶一下', '楼主辛苦', '路过，帮顶'] },
};
const BBS_NAMES = ['老张在出差', '数码版主', '学生党小林', '给爸妈选机', '信号党', '铃声控', '营业厅小王', '路过的', '跑业务的', '退休教师', '工地老李', '大学宿舍长', '短信达人', '彩信爱好者', '县城代理'];
const BBS_AV = ['📟', '👴', '👩', '🧑', '📱', '☎️', '👨‍🔧', '👩‍🏫', '🧓', '👦'];

export function buildComments(ctx) {
  if (productEraOf(ctx.design) === 'keypad') {
    return buildKeypadComments(ctx);
  }
  const used = new Set();
  const say = (k, vars = {}) => {
    const c = CM[k];
    const free = c.t.filter((t) => !used.has(t));
    if (!free.length) return null;
    const t0 = pick(free);
    used.add(t0);
    const t = t0.replace('{c}', vars.c || '').replace('{p}', vars.p || '').replace('{m}', ctx.company || ctx.modelName || '').replace('{last}', vars.last || '');
    return { t, like: Math.round(c.base * (0.6 + Math.random() * 0.8)), hot: !!c.hot };
  };
  const out = [];
  (ctx.promisesBroken || []).slice(0, 2).forEach((p) => out.push(say('broken', { p })));
  if (ctx.priceRatio >= 1.12) out.push(say('pricy'), say('pricyMeme'));
  if (ctx.priceRatio <= 0.95) out.push(say('cheapMeme'));
  if (ctx.chipLead || ctx.benchFirst) out.push(say('yyld'));
  if (ctx.firsts) out.push(say('only'));
  if (ctx.flop) out.push(say('flopMeme'));
  if (ctx.anchorLast) out.push(say('pricyAnchor', { last: ctx.anchorLast }));
  if (ctx.priceRatio <= 0.88) out.push(say('cheap'), say('cheap'));
  else if (ctx.priceRatio < 1.12) out.push(say('fair'));
  if (ctx.flop) out.push(say('flop'));
  if (ctx.buzz >= 40) out.push(say('buzz'));
  if (ctx.completeness < 70) out.push(say('rough'));
  if ((ctx.stale || 0) >= 0.8) out.push(say('copy'));
  else if (ctx.novelty < 25 && ctx.gen > 1) out.push(say('stale'));
  const tierId = ctx.design?.parts?.chip ?? 1;
  if ((ctx.price || 3999) <= 2999 && tierId >= 1 && !(ctx.chipLag > 0)) out.push(say('valuechip', { c: chipSpec(ctx.design).label }));
  if ((ctx.price || 3999) >= 4500 && tierId === 0) out.push(say('weakchip', { c: chipSpec(ctx.design).label }));
  if (ctx.chipLag > 0) out.push(say('chiplag'));
  else if (ctx.chipLead) out.push(say('chiplead'));
  if (ctx.extChip) out.push(say('extchip'));
  out.push(say('good'), say('good'), say('meh'), say('meh'), say('joke'));
  // 弹幕里的短句也会出现在评论区（换成评论语气）
  danmakuLines(ctx.design, { ...ctx, price: ctx.price }, 3).forEach((t) => out.push({ t, like: Math.round(60 + Math.random() * 220), hot: false }));
  const list = out.filter(Boolean).slice(0, 12);
  const names = shuffle(NAMES);
  return list.map((c, i) => ({ ...c, who: names[i % names.length], av: AV[(i * 5 + (ctx.gen || 1)) % AV.length], reply: Math.round((c.like / 40) * Math.random()) }));
}


function buildKeypadComments(ctx) {
  const used = new Set();
  const d = ctx.design || {};
  const p = d.parts || {};
  const C = new Set(d.concepts || []);
  const say = (k, vars = {}) => {
    const c = CM_KEYPAD[k];
    if (!c) return null;
    const free = c.t.filter((x) => !used.has(x));
    if (!free.length) return null;
    const t0 = pick(free);
    used.add(t0);
    const t = t0.replace('{p}', vars.p || '').replace('{m}', ctx.company || ctx.modelName || '');
    return { t, like: Math.round(c.base * (0.6 + Math.random() * 0.8)), hot: !!c.hot, floor: true };
  };
  const out = [];
  const push = (x) => x && out.push(x);
  for (const pr of ctx.promisesBroken || []) push(say('broken', { p: pr }));
  if ((ctx.priceRatio || 1) > 1.1) push(say('pricy'));
  else if ((ctx.priceRatio || 1) < 0.92) push(say('cheap'));
  else push(say('fair'));
  const standbyDays = (ctx.standbyDays ?? 0) || [7, 12, 20][p.battery ?? 0] - [0, 1, 2][p.screen ?? 0];
  push(say(standbyDays >= 10 ? 'standby' : 'standbyShort'));
  push(say((p.material ?? 0) === 1 ? 'fragile' : 'tough'));
  push(say((p.ringtone ?? 0) >= 1 ? 'chord' : 'ring0'));
  push(say((p.screen ?? 0) === 0 ? 'mono' : 'color'));
  if ((p.camera ?? 0) >= 1) push(say('cam'));
  if (d.formFactor === 'elder') {
    push(say('elder'));
    push(say('elder'));
  }
  if (d.formFactor === 'flip') push(say('flip'));
  if (d.formFactor === 'slider') push(say('slider'));
  if (C.has('dualsim')) push(say('dual'));
  if ((p.network ?? 0) >= 1) push(say('net'));
  if (C.has('mp3') || C.has('fm')) push(say('music'));
  push(say('good'));
  push(say('meh'));
  const list = shuffle(out.filter(Boolean)).slice(0, 9);
  // 前三楼是论坛惯例的短回复，放在最前面
  const head = [say('bbs'), say('bbs')].filter(Boolean).map((x) => ({ ...x, like: Math.round(x.like * 0.2) }));
  const names = shuffle(BBS_NAMES);
  return [...head, ...list].map((x, i) => ({ ...x, who: names[i % names.length], av: BBS_AV[(i * 3 + (ctx.gen || 1)) % BBS_AV.length], reply: Math.round(Math.random() * 12) }));
}
