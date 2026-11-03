/** v0.12+：按键包黑名单 + EraPack；v0.15 编年门闩 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { KEYPAD_BANNED, keypadPack, packOf, productEraOf } from '../src/game/eras/index.js';
import {
  TIMELINES,
  worldEraIdOf,
  formUnlockMonth,
  eraAllowsEvent,
  modeOf,
} from '../src/game/eras/timeline.js';
import { physical, tier, partOrderOf } from '../src/studio/parts.js';
import { runMonths } from '../src/game/market.js';
import { createNewGame } from '../src/game/state.js';
import { formTimeline, formUnlocked, defaultFormId } from '../src/game/forms.js';
import { MARKET_EVENTS, EVENTS } from '../src/game/data.js';
import { shouldTriggerRevolution, applyRevolutionChoice } from '../src/game/eras/revolution.js';
import { marketMod } from '../src/game/logic.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0;
const ok = (name, cond, detail = '') => {
  if (cond) console.log('✓', name);
  else {
    fails++;
    console.error('✗', name, detail);
  }
};

ok('productEraOf feature/elder=keypad', productEraOf('feature') === 'keypad' && productEraOf('elder') === 'keypad');
ok('productEraOf thick/bar=smart', productEraOf('thick') === 'smart' && productEraOf('bar') === 'smart');
ok('packOf feature 有按键价位', packOf('feature').priceBands.some((b) => b.price <= 299));
ok('packOf thick 仍是现代价', packOf('thick').priceBands.some((b) => b.price >= 1999));

const dFeat = {
  formFactor: 'feature',
  parts: { chip: 1, screen: 1, camera: 0, battery: 1, material: 0, size: 1, keyboard: 0, ringtone: 1, network: 0 },
  concepts: [],
  color: '#3a3d46',
};
const phys = physical(dFeat);
ok('feature BOM 落在 ¥150–600', phys.unitCost >= 150 && phys.unitCost <= 600, `unitCost=${phys.unitCost}`);
ok('feature 无跑分读数', !phys.bench || phys.bench === 0, `bench=${phys.bench}`);
ok('feature partOrder 含 keyboard/ringtone/network', partOrderOf(dFeat).includes('keyboard') && partOrderOf(dFeat).includes('network'));
ok('feature 芯片文案非跑分', !/跑分|Pro|Max/.test(tier(dFeat, 'chip').label + tier(dFeat, 'chip').note));

const dSmart = {
  formFactor: 'bar',
  parts: { chip: 1, screen: 1, camera: 1, battery: 1, material: 1, size: 1 },
  concepts: [],
  color: '#333',
  screenForm: 'punch',
  layout: 'island',
  chipGen: 1,
  chipSeries: '蜂鸟',
};
const ps = physical(dSmart);
ok('smart BOM 仍是千元级+', ps.unitCost > 1000, `unitCost=${ps.unitCost}`);

const blobs = [];
blobs.push(JSON.stringify(keypadPack.positioning));
blobs.push(JSON.stringify(keypadPack.sellPoints));
blobs.push(JSON.stringify(keypadPack.priceBands));
blobs.push(JSON.stringify(keypadPack.parts));
blobs.push(JSON.stringify(keypadPack.rivals));
blobs.push(readFileSync(join(root, 'src/launch/keynote-keypad.js'), 'utf8'));
blobs.push(readFileSync(join(root, 'src/studio/featureOS.js'), 'utf8'));
const joined = blobs.join('\n');
const hit = joined.match(KEYPAD_BANNED);
ok('按键包黑名单 0 命中', !hit, hit ? hit[0] : '');

const phone3d = readFileSync(join(root, 'src/studio/phone3d.js'), 'utf8');
ok('phone3d 按键走 createScreenFor/FeatureOS', phone3d.includes('createScreenFor') && phone3d.includes('isKeypadForm(ff)'));

const ui = readFileSync(join(root, 'src/ui.js'), 'utf8');
ok('企划形态前移 plan-form', ui.includes('plan-form') && ui.includes('formCardsHtml'));
ok('创立可选编年模式', ui.includes('set-mode') && ui.includes('完整编年'));
ok('HUD 时代徽章', ui.includes('era-badge') && ui.includes('worldEraOf'));

ok('productEraOf flip=keypad', productEraOf('flip') === 'keypad');
const dFlip = { formFactor: 'flip', parts: { chip: 1, screen: 1, camera: 0, battery: 1, material: 0, size: 1, keyboard: 0, ringtone: 1, network: 0 }, concepts: [], color: '#444' };
ok('flip BOM 按键价', physical(dFlip).unitCost >= 150 && physical(dFlip).unitCost <= 700, `unitCost=${physical(dFlip).unitCost}`);
const kn = readFileSync(join(root, 'src/launch/keynote-keypad.js'), 'utf8');
ok('keynote 含核桃/营业厅', kn.includes('核桃') && kn.includes('营业厅'));
ok('films-keypad 注册', readFileSync(join(root, 'src/launch/films-keypad.js'), 'utf8').includes('kp_drop'));
ok('films.js 合入按键短片', readFileSync(join(root, 'src/launch/films.js'), 'utf8').includes('makeKeypadFilms'));
ok('bench 按键测试项', readFileSync(join(root, 'src/bench.js'), 'utf8').includes('KEYPAD_SUBS') && readFileSync(join(root, 'src/bench.js'), 'utf8').includes('跌落测试'));
ok('crowd 论坛/短信', readFileSync(join(root, 'src/launch/crowd.js'), 'utf8').includes('CM_KEYPAD') && readFileSync(join(root, 'src/launch/crowd.js'), 'utf8').includes('buildKeypadComments'));
ok('scenes/share 形态', readFileSync(join(root, 'src/scenes.js'), 'utf8').includes("ff === 'elder'"));

// v0.15
ok('chronicle 时间轴 60 月四段', TIMELINES.chronicle.length === 4 && TIMELINES.chronicle.at(-1).to === 60);
ok('quick 时间轴 36 月三段', TIMELINES.quick.length === 3 && TIMELINES.quick.at(-1).to === 36);
ok('worldEra 编年第1月=keypad', worldEraIdOf(1, 'chronicle') === 'keypad');
ok('worldEra 编年第19月=smart_dawn', worldEraIdOf(19, 'chronicle') === 'smart_dawn');
ok('worldEra 编年第49月=fold', worldEraIdOf(49, 'chronicle') === 'fold');
ok('worldEra 快速第10月=smart', worldEraIdOf(10, 'quick') === 'smart');
ok('编年 thick 第19月解锁', formUnlockMonth('thick', 'chronicle') === 19);
ok('编年 bar 第31月解锁', formUnlockMonth('bar', 'chronicle') === 31);
ok('快速 thick 第1月解锁', formUnlockMonth('thick', 'quick') === 1);
ok('快速 fold_s 第22月', formUnlockMonth('fold_s', 'quick') === 22);

const stC = createNewGame('编年社', '蜂鸟', 'chronicle');
ok('新局编年 version4', stC.mode === 'chronicle' && stC.version === 4 && runMonths(stC) === 60);
ok('编年开局默认功能机', defaultFormId(stC) === 'feature');
ok('编年开局无厚直板', !formUnlocked('thick', stC));
ok('编年形态卡功能机解锁', !!formTimeline(stC).forms.find((f) => f.id === 'feature')?.unlocked);

const stQ = createNewGame('快速社', '蜂鸟', 'quick');
ok('快速局 36 月', stQ.mode === 'quick' && runMonths(stQ) === 36);
ok('快速开局 thick 解锁', formUnlocked('thick', stQ));

ok('国补事件标了 smart eras', !!MARKET_EVENTS.find((e) => e.id === 'subsidy')?.eras?.includes('smart'));
ok('运营商事件属 keypad', !!MARKET_EVENTS.find((e) => e && e.id === 'carrier_deal')?.eras?.includes('keypad'));
ok('keypad 时代滤掉国补', !eraAllowsEvent(['smart', 'fold', 'smart_dawn'], 'keypad'));
ok('keypad 时代放行运营商', eraAllowsEvent(['keypad', 'smart_dawn'], 'keypad'));

stC.month = 19;
ok('第19月应触发革命', shouldTriggerRevolution(stC));
applyRevolutionChoice(stC, 'pivot');
ok('革命后 flags.revolution', stC.flags.revolution === 'pivot');
ok('革命后不再触发', !shouldTriggerRevolution(stC));
stC.design = { formFactor: 'feature' };
stC.month = 25;
const mul = marketMod(stC, 'demand', { formFactor: 'feature' });
ok('按键需求衰减已生效', mul < 0.9 && mul >= 0.25, `mul=${mul}`);
const mulE = marketMod(stC, 'demand', { formFactor: 'elder' });
ok('老年机不吃按键衰减 mod', mulE === 1, `mulE=${mulE}`);
ok('EVENTS 池存在', EVENTS.length >= 3);
ok('modeOf chronicle', modeOf(stC) === 'chronicle');

// ═══════════ 生成式检查：实际生成玩家会看到的文字，再扫现代词（防「测试全绿但游戏出戏」） ═══════════
{
  const { buildKeynote } = await import('../src/launch/keynote.js');
  const { danmakuLines, buildComments } = await import('../src/launch/crowd.js');
  const { commentFor, KEYPAD_LAUNCH_STYLES, KEYPAD_LAUNCH_OPT_FIELDS, launchOptFieldsFor } = await import('../src/game/logic.js');
  const { conceptsFor, hasAppeared, sellPointChecks, wow, marketNews } = await import('../src/studio/parts.js');
  const { FORM_FACTORS } = await import('../src/game/forms.js');
  const { REVOLUTION_EVENT } = await import('../src/game/eras/revolution.js');
  // 按键局里不该出现的现代 / 今天视角的词
  const MODERN = /跑分|芯片|高刷|\d+\s*Hz|大底|三摄|全面屏|挖孔|潜望|模组|快充|\d+W\b|AI|NPU|GPU|5G|钛|折叠|铰链|遥遥领先|Are you OK|Only .+ can do|热搜|弹幕|App|直播|带货|种草|首销|开售|流片|彩蛋|年代感|真香|旗舰|影像|续航|生态|Pro\b|Max\b|全网|朋友圈|微博|抖音|二维码|扫码|蓝牙耳机|触屏|智能机/;
  const texts = [];
  const add = (src, t) => {
    if (t == null) return;
    const str = String(typeof t === 'function' ? '' : t).replace(/<[^>]+>/g, '');
    if (str) texts.push([src, str]);
  };
  const forms = ['feature', 'elder', 'flip', 'slider', 'swivel'];
  let n = 0;
  for (const ff of forms)
    for (const screen of [0, 1, 2])
      for (const ringtone of [0, 1, 2])
        for (const material of [0, 1, 2])
          for (const camera of [0, 2]) {
            const d = {
              formFactor: ff, modelName: '像素 1', company: '像素工坊', color: '#3a3d46',
              parts: { chip: 1, screen, camera, battery: 1, material, size: 1, keyboard: n % 3, ringtone, network: n % 4 },
              concepts: [['dualsim', 'mp3'], ['torch', 'fm'], ['marquee'], []][n % 4],
            };
            n++;
            const seg = buildKeynote({ d, phys: physical(d), price: 399 + n, fair: 450, points: ['standby', 'chord', 'tough'], promises: [{ id: 'chord', ok: n % 2 === 0 }], firsts: n % 5 ? [] : ['双卡双待'], launchOpts: { openTone: ['formal', 'ringtone', 'rugged'][n % 3] } });
            for (const sl of seg) {
              add(`keynote:${sl.key}:sub`, sl.sub);
              add(`keynote:${sl.key}:filmSub`, sl.filmSub);
              add(`keynote:${sl.key}:chap`, sl.chap);
              (sl.react || []).forEach((r) => add(`keynote:${sl.key}:react`, r));
              if (sl.kpi) add(`keynote:${sl.key}:kpi`, `${sl.kpi.label} ${sl.kpi.text || ''}`);
            }
            danmakuLines(d, {}, 14).forEach((t) => add('sms', t));
            buildComments({ design: d, priceRatio: [0.8, 1, 1.3][n % 3], gen: 1, promisesBroken: n % 4 ? [] : ['和弦铃声'] }).forEach((c) => { add('bbs', c.t); add('bbs:who', c.who); });
            sellPointChecks(d, ['standby', 'loud', 'tough', 'chord', 'camphone', 'dualsim', 'value']).forEach((c) => add('checks', `${c.name} ${c.why}`));
            add('headline', wow(d, []).headline);
          }
  for (const id of ['perf', 'design', 'camera', 'battery', 'os']) for (let p = 0; p <= 100; p += 20) add('slotComment', commentFor(id, p, 'keypad'));
  conceptsFor({ formFactor: 'feature' }).forEach((c) => add(`concept:${c.id}`, `${c.name} ${c.desc}`));
  KEYPAD_LAUNCH_STYLES.forEach((x) => add('launchStyle', `${x.label} ${x.desc}`));
  Object.values(KEYPAD_LAUNCH_OPT_FIELDS).flat().forEach((x) => add('launchOpt', `${x.label} ${x.hint}`));
  keypadPack.positioning.forEach((x) => add('positioning', `${x.name} ${x.who} ${x.desc}`));
  keypadPack.sellPoints.forEach((x) => add('sellPoint', `${x.name} ${x.desc}`));
  keypadPack.slots.forEach((x) => add('slot', `${x.name} ${x.blurb}`));
  Object.values(keypadPack.parts).forEach((P) => P.tiers.forEach((t) => add(`part:${P.name}`, `${t.label} ${t.note}`)));
  FORM_FACTORS.filter((f) => productEraOf(f.id) === 'keypad').forEach((f) => add(`form:${f.id}`, `${f.name} ${f.tag} ${f.desc}`));
  add('marketNews', marketNews([], 'keypad').crowded.join(' '));
  ok('按键概念件池 ≥ 22 项', conceptsFor({ formFactor: 'feature' }).length >= 22, String(conceptsFor({ formFactor: 'feature' }).length));
  ok('按键创新池不混入现代件', !conceptsFor({ formFactor: 'feature' }).some((c) => ['lights', 'fastcharge', 'shutter', 'ai'].includes(c.id)));
  ok('现代件在按键时代不出现', !hasAppeared('lights', { month: 5, mode: 'chronicle', era: 'keypad', gen: 3 }));
  ok('launchOptFieldsFor 按键无 Are you OK', !JSON.stringify(launchOptFieldsFor({ formFactor: 'feature' })).includes('Are you OK'));
  const bad = texts.filter(([, t]) => MODERN.test(t));
  const uniqBad = [...new Map(bad.map(([src, t]) => [t, src])).entries()].slice(0, 12);
  ok(`按键局生成文本 ${texts.length} 条 · 0 条现代词`, bad.length === 0, uniqBad.map(([t, src]) => `\n    [${src}] ${t}  ← ${t.match(MODERN)[0]}`).join(''));
  // 同一场短信墙不重复
  const dd = { formFactor: 'elder', parts: { screen: 0, ringtone: 1, material: 0, camera: 0, battery: 2 }, concepts: ['torch'] };
  const lines = danmakuLines(dd, {}, 14);
  ok('短信墙同场不重复', new Set(lines).size === lines.length, lines.join('|'));
  // 革命事件文案不出现数值术语
  add('revolution', REVOLUTION_EVENT.body);
  ok('革命选项是玩家语言（无 +10 / −10% 这类数值）', !REVOLUTION_EVENT.choices.some((c) => /[+−-]\d+/.test(c.blurb)));
}

console.log(fails ? `\nFAILED ${fails}` : '\nALL ERA LINT PASSED');
process.exit(fails ? 1 : 0);
